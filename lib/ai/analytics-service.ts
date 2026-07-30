import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import {
  AnalyticsContextSchema,
  AnalyticsInsightOutputSchema,
  type AnalyticsContext,
  type AnalyticsInsightOutput,
  type AssistedInsightResult,
} from './analytics-schema';
import { hashAnalyticsContext, METHODOLOGY_VERSION } from './analytics-context';
import { SYSTEM_PROMPT, buildUserPrompt, PROMPT_VERSION } from './analytics-prompt';

/**
 * Serviço de geração da Leitura Analítica Assistida (Sprint 4).
 *
 * Arquitetura:
 * - Roda exclusivamente no servidor (`import 'server-only'` — falha o build
 *   se importado de um Client Component).
 * - Cache em memória por hash do contexto (MVP — ver nota sobre persistência
 *   em docs/METODOLOGIA_IA_ANALITICA.md e a migration preparada em
 *   `supabase_migration_executive_ai_insights.sql`, NÃO aplicada).
 * - Nunca lança para o chamador: todo caminho de erro retorna um
 *   `AssistedInsightResult` com `status` apropriado — a Visão Geral nunca
 *   trava esperando a IA.
 */

const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 1400;
const TIMEOUT_MS = 20_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_CALLS = 10; // global, MVP — ver limitações no doc de metodologia

// ─── Cache em memória (por processo) ────────────────────────────────────────

interface CacheEntry {
  result: AssistedInsightResult;
  cachedAt: number;
}
const insightCache = new Map<string, CacheEntry>();

export function clearInsightCacheForTests(): void {
  insightCache.clear();
}

// ─── Rate limit (função pura + estado do módulo) ────────────────────────────

export interface RateLimitState {
  calls: number[];
}

export function checkRateLimit(
  state: RateLimitState,
  now: number,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
  maxCalls: number = RATE_LIMIT_MAX_CALLS
): { allowed: boolean; nextState: RateLimitState } {
  const recent = state.calls.filter((t) => now - t < windowMs);
  if (recent.length >= maxCalls) {
    return { allowed: false, nextState: { calls: recent } };
  }
  return { allowed: true, nextState: { calls: [...recent, now] } };
}

let rateLimitState: RateLimitState = { calls: [] };
export function resetRateLimitForTests(): void {
  rateLimitState = { calls: [] };
}

// ─── Extração/validação da saída do modelo (funções puras) ─────────────────

/** Extrai JSON de uma resposta de texto, tolerando cercas de código markdown. */
export function extractJsonFromModelText(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    return null;
  }
}

/**
 * Remove qualquer `evidenciaId` citado pelo modelo que não exista no
 * contexto fornecido — a IA nunca pode "inventar" uma evidência.
 */
export function stripUnknownEvidenceIds(
  output: AnalyticsInsightOutput,
  knownIds: ReadonlySet<string>
): AnalyticsInsightOutput {
  const filterIds = (ids: string[]) => ids.filter((id) => knownIds.has(id));
  return {
    ...output,
    riscosInterpretados: output.riscosInterpretados.map((r) => ({ ...r, evidenciaIds: filterIds(r.evidenciaIds) })),
    oportunidadesInterpretadas: output.oportunidadesInterpretadas.map((o) => ({ ...o, evidenciaIds: filterIds(o.evidenciaIds) })),
    hipoteses: output.hipoteses.map((h) => ({ ...h, evidenciaIds: filterIds(h.evidenciaIds) })),
    evidenciasCitadas: filterIds(output.evidenciasCitadas),
  };
}

function unavailableResult(contextHash: string, error: string | null, status: AssistedInsightResult['status']): AssistedInsightResult {
  return {
    status,
    output: null,
    contextHash,
    generatedAt: null,
    model: null,
    promptVersion: PROMPT_VERSION,
    methodologyVersion: METHODOLOGY_VERSION,
    error,
  };
}

// ─── Orquestrador ────────────────────────────────────────────────────────────

export async function getOrGenerateInsight(
  rawContext: AnalyticsContext,
  options: { forceRefresh?: boolean } = {}
): Promise<AssistedInsightResult> {
  const parseResult = AnalyticsContextSchema.safeParse(rawContext);
  if (!parseResult.success) {
    return unavailableResult('invalid', 'Contexto inválido — não foi possível preparar a leitura analítica.', 'erro');
  }
  const context = parseResult.data;
  const contextHash = hashAnalyticsContext(context);

  if (context.estadoPolitico.semDados) {
    return unavailableResult(contextHash, null, 'dados_insuficientes');
  }

  if (!options.forceRefresh) {
    const cached = insightCache.get(contextHash);
    if (cached) return cached.result;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return unavailableResult(
      contextHash,
      'Provedor de IA não configurado neste ambiente (ANTHROPIC_API_KEY ausente).',
      'indisponivel'
    );
  }

  const { allowed, nextState } = checkRateLimit(rateLimitState, Date.now());
  rateLimitState = nextState;
  if (!allowed) {
    return unavailableResult(contextHash, 'Limite de gerações atingido — tente novamente em instantes.', 'erro');
  }

  try {
    const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(context) }],
    });

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
    if (!textBlock) {
      return unavailableResult(contextHash, 'Resposta do modelo sem conteúdo de texto.', 'erro');
    }

    const parsedJson = extractJsonFromModelText(textBlock.text);
    if (parsedJson === null) {
      return unavailableResult(contextHash, 'Resposta do modelo não é um JSON válido.', 'erro');
    }

    const validated = AnalyticsInsightOutputSchema.safeParse(parsedJson);
    if (!validated.success) {
      return unavailableResult(contextHash, 'Resposta do modelo não passou na validação de schema.', 'erro');
    }

    const knownIds = new Set(context.evidenciasDisponiveis.map((e) => e.id));
    const output = stripUnknownEvidenceIds(validated.data, knownIds);

    const result: AssistedInsightResult = {
      status: 'disponivel',
      output,
      contextHash,
      generatedAt: new Date().toISOString(),
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      methodologyVersion: METHODOLOGY_VERSION,
      error: null,
    };
    insightCache.set(contextHash, { result, cachedAt: Date.now() });
    return result;
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Tempo limite excedido ao gerar a leitura analítica.'
        : 'Falha ao gerar a leitura analítica.';
    console.error('[analytics-service] Falha ao gerar leitura assistida:', err instanceof Error ? err.message : err);
    return unavailableResult(contextHash, message, 'erro');
  }
}
