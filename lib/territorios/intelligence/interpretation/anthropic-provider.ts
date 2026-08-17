/**
 * INTEL-03B — Primeiro provider real de LLM para a camada L4 (Partes A-D do gate).
 *
 * `InterpretationProvider` real que chama a API da Anthropic (`@anthropic-ai/sdk`, já
 * instalada — nenhuma dependência nova, ver auditoria de infra na seção 5-6 do gate).
 * Modelo/efeito configuráveis via env (`INTEL_LLM_MODEL`, `INTEL_LLM_EFFORT`), nunca
 * hardcoded como segredo. Uma chamada por família presente no contexto (nunca
 * cross-family — seção 58 do gate); cada chamada usa exclusivamente o contexto
 * serializado e escopado àquela família (`buildFamilyScopedContext` + `serializeInterpretationContext`
 * já homologado, sem segundo serializer).
 *
 * O LLM NUNCA é a autoridade final: toda saída, mesmo já validada estruturalmente pelo
 * `output_config.format` do provider, é revalidada por `validateInterpretationDraft`
 * (mesma função usada pelo `RuleBasedMockProvider`) — tanto aqui, para decidir se vale a
 * pena tentar de novo, quanto de novo em `pipeline.ts`, que é quem de fato decide
 * accepted/rejected (zero bypass, seção 20 do gate).
 *
 * Retry: no máximo `maxAttempts` tentativas (padrão 2) por família, cobrindo dois
 * motivos distintos e nunca misturados no mesmo texto de retry — falha de schema/JSON
 * (`buildSchemaRetryMessage`) e falha semântica do validador (`buildSemanticRetryMessage`,
 * que reenvia só os códigos de erro estruturados, nunca raciocínio interno). Erros de
 * provider (auth/rede/rate limit/timeout/refusal) NUNCA viram retry semântico — são
 * classificados por `classifyAnthropicError` e relançados imediatamente (seção 38-40).
 * Se todas as tentativas falharem em produzir JSON parseável, um draft estrutural vazio
 * é retornado para fluir pelo validador normal (`EMPTY_STATEMENT`/`NO_CLAIMS`) — nunca
 * aceitação forçada (seção 36 do gate).
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ModelProvenance } from '../contracts';
import type { ThresholdFamily } from '../economy/thresholds';
import { classifyAnthropicError, InterpretationProviderError } from './provider-errors';
import { caveatsForFamily } from './provider';
import { buildFamilyScopedContext, type RawInterpretationDraftPayload } from './prompt';
import { resolvePromptModule, type InterpretationPromptVersion } from './prompt-registry';
import { validateInterpretationDraft } from './validator';
import type {
  InterpretationClaim,
  InterpretationDraft,
  InterpretationExecutionMetadata,
  InterpretationGenerationResult,
  InterpretationInputContext,
  InterpretationProvider,
} from './types';

export const INTEL_INTERPRETATION_LLM_PROVIDER_METHOD_VERSION = 'INTEL_INTERPRETATION_LLM_PROVIDER_V1';

const DEFAULT_MODEL = 'claude-opus-5';
const DEFAULT_EFFORT: NonNullable<Anthropic.Messages.OutputConfig['effort']> = 'medium';
const VALID_EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);

/**
 * Preço USD/1M tokens dos modelos correntes (tabela cacheada do provider — nunca
 * autoritativa para faturamento real). Modelo fora desta tabela: custo não estimado
 * (registrado como null), nunca inventado (seção 44 do gate).
 */
const MODEL_PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5.0, output: 25.0 },
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'claude-opus-4-6': { input: 5.0, output: 25.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
};

export interface AnthropicInterpretationProviderOptions {
  apiKey?: string;
  model?: string;
  effort?: NonNullable<Anthropic.Messages.OutputConfig['effort']>;
  maxTokens?: number;
  timeoutMs?: number;
  /** Máximo de tentativas por família (schema + semântico combinados). Pequeno, sem loop infinito (seção 34 do gate). */
  maxAttempts?: number;
  now?: () => string;
  /** Injeção para testes — nunca chama a rede real quando fornecido (seção 96-97 do gate: testes unitários não gastam tokens). */
  client?: Anthropic;
  /** INTEL-03C: qual versão do prompt usar (registry único, seção 5-7 do gate). Default: resolvido pelo registry (v2). */
  promptVersion?: InterpretationPromptVersion;
}

function resolveEffort(value: string | undefined): NonNullable<Anthropic.Messages.OutputConfig['effort']> {
  return value && VALID_EFFORTS.has(value) ? (value as NonNullable<Anthropic.Messages.OutputConfig['effort']>) : DEFAULT_EFFORT;
}

function buildEmptyDraft(context: InterpretationInputContext, family: ThresholdFamily, modelProvenance: ModelProvenance): InterpretationDraft {
  return {
    id: `interpretation-draft:${context.territoryId}:${family}`,
    territoryId: context.territoryId,
    domains: ['economia'],
    statement: '',
    claims: [],
    caveats: [],
    temporalScope: { periodStart: '', periodEnd: '', label: `${family} — provider não produziu output estruturado válido após ${modelProvenance.generatedAt}` },
    origin: 'model',
    methodVersion: INTEL_INTERPRETATION_LLM_PROVIDER_METHOD_VERSION,
    modelProvenance,
  };
}

function assembleDraft(fullContext: InterpretationInputContext, familyContext: InterpretationInputContext, family: ThresholdFamily, raw: RawInterpretationDraftPayload, modelProvenance: ModelProvenance): InterpretationDraft {
  const periods = [...familyContext.units.map((unit) => unit.period)].sort();
  const claims: InterpretationClaim[] = raw.claims.map((claim, index) => ({
    id: `claim:${fullContext.territoryId}:${family}:${index}`,
    text: claim.text,
    signalRefs: [...new Set(claim.signalRefs)],
    evidenceRefs: [...new Set(claim.evidenceRefs)],
    claimType: claim.claimType,
    // Recomputado por validateInterpretationDraft — nunca aceito por confiança do LLM (seção 27 do gate).
    supportStatus: 'SUPPORTED',
  }));
  // Caveats determinísticos (defasagem/nominalidade/calibração) sempre presentes,
  // independentemente do que o LLM tenha lembrado de mencionar — mescla com os caveats
  // que o próprio modelo gerou (deduplicados), nunca os substitui (seção 25 do gate).
  const deterministicCaveats = caveatsForFamily(fullContext, family, familyContext.units);
  const modelCaveats = raw.caveats.map((caveat) => caveat.trim()).filter(Boolean);
  const caveats = [...new Set([...modelCaveats, ...deterministicCaveats])];

  return {
    id: `interpretation-draft:${fullContext.territoryId}:${family}`,
    territoryId: fullContext.territoryId,
    domains: ['economia'],
    statement: raw.statement,
    claims,
    caveats,
    temporalScope: { periodStart: periods[0] ?? '', periodEnd: periods.at(-1) ?? '', label: `${family} — ${periods[0] ?? '?'} a ${periods.at(-1) ?? '?'}` },
    origin: 'model',
    methodVersion: INTEL_INTERPRETATION_LLM_PROVIDER_METHOD_VERSION,
    modelProvenance,
  };
}

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const pricing = MODEL_PRICING_USD_PER_MTOK[model];
  if (!pricing) return null;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

/**
 * Provider real de LLM (Anthropic Claude) para a camada L4. Uma chamada por família
 * presente no contexto; validação/aceitação continuam 100% sob controle do pipeline
 * (`pipeline.ts`), nunca decididas aqui.
 */
export class AnthropicInterpretationProvider implements InterpretationProvider {
  readonly id = 'anthropic-interpretation-v1';

  private readonly model: string;
  private readonly effort: NonNullable<Anthropic.Messages.OutputConfig['effort']>;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly now: () => string;
  private readonly client: Anthropic | null;
  private readonly promptModule: ReturnType<typeof resolvePromptModule>;

  constructor(options: AnthropicInterpretationProviderOptions = {}) {
    this.model = options.model ?? process.env.INTEL_LLM_MODEL ?? DEFAULT_MODEL;
    this.effort = options.effort ?? resolveEffort(process.env.INTEL_LLM_EFFORT);
    this.maxTokens = options.maxTokens ?? 8192;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxAttempts = options.maxAttempts ?? 2;
    this.now = options.now ?? (() => new Date().toISOString());
    this.promptModule = resolvePromptModule(options.promptVersion ?? process.env.INTEL_LLM_PROMPT);
    const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? null;
    this.client = options.client ?? (apiKey ? new Anthropic({ apiKey, timeout: this.timeoutMs }) : null);
  }

  async generateInterpretations(context: InterpretationInputContext): Promise<InterpretationGenerationResult> {
    if (!this.client) {
      throw new InterpretationProviderError('PROVIDER_CREDENTIAL_MISSING', 'ANTHROPIC_API_KEY ausente — AnthropicInterpretationProvider não pode ser executado (INTEL-03B seção 12: classificar como BLOCKED_BY_CREDENTIAL, nunca inventar resultado).');
    }

    const families = [...new Set(context.units.map((unit) => unit.family))].sort();
    const drafts: InterpretationDraft[] = [];
    const executionMetadata: InterpretationExecutionMetadata[] = [];

    for (const family of families) {
      const familyContext = buildFamilyScopedContext(context, family);
      if (familyContext.units.length === 0) continue;
      const { draft, metadata } = await this.generateForFamily(context, familyContext, family);
      drafts.push(draft);
      executionMetadata.push(metadata);
    }

    return { drafts, executionMetadata };
  }

  private async generateForFamily(fullContext: InterpretationInputContext, familyContext: InterpretationInputContext, family: ThresholdFamily): Promise<{ draft: InterpretationDraft; metadata: InterpretationExecutionMetadata }> {
    const prompt = this.promptModule;
    const schema = prompt.buildOutputSchema(familyContext);
    const { message: firstUserMessage, serialized } = prompt.buildUserMessage(familyContext, family);
    const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: firstUserMessage }];

    const startedAt = performance.now();
    let attempts = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let modelEcho: string | null = null;
    let lastDraft: InterpretationDraft | null = null;
    let generatedAtIso = this.now();

    while (attempts < this.maxAttempts) {
      attempts++;
      let response: Anthropic.Messages.Message & { parsed_output: RawInterpretationDraftPayload | null };
      try {
        response = await this.client!.messages.parse({
          model: this.model,
          max_tokens: this.maxTokens,
          system: prompt.systemPrompt,
          messages,
          output_config: { format: { type: 'json_schema', schema }, effort: this.effort },
        });
      } catch (error) {
        throw classifyAnthropicError(error);
      }

      modelEcho = response.model;
      inputTokens += response.usage.input_tokens;
      outputTokens += response.usage.output_tokens;
      generatedAtIso = this.now();

      if (response.stop_reason === 'refusal') {
        throw new InterpretationProviderError('PROVIDER_REFUSAL', `Provider recusou gerar output estruturado para a família ${family} em ${fullContext.territoryId}.`);
      }

      messages.push({ role: 'assistant', content: response.content });

      const modelProvenance: ModelProvenance = {
        provider: 'anthropic',
        model: this.model,
        modelVersion: modelEcho,
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        generatedAt: generatedAtIso,
      };

      if (!response.parsed_output) {
        // Falha de schema/JSON — nunca reenvia raciocínio, só pede JSON válido de novo.
        if (attempts >= this.maxAttempts) break;
        messages.push({ role: 'user', content: prompt.buildSchemaRetryMessage() });
        continue;
      }

      const candidateDraft = assembleDraft(fullContext, familyContext, family, response.parsed_output, modelProvenance);
      lastDraft = candidateDraft;
      const validation = validateInterpretationDraft(candidateDraft, fullContext);
      if (validation.valid) break;

      if (attempts >= this.maxAttempts) break;
      // Falha semântica — reenvia só códigos de erro estruturados do validador (nunca texto livre de raciocínio).
      messages.push({ role: 'user', content: prompt.buildSemanticRetryMessage([...new Set(validation.errors.map((error) => error.code))]) });
    }

    const finalModelProvenance: ModelProvenance = {
      provider: 'anthropic',
      model: this.model,
      modelVersion: modelEcho,
      promptId: prompt.promptId,
      promptVersion: prompt.promptVersion,
      generatedAt: generatedAtIso,
    };

    const draft = lastDraft ?? buildEmptyDraft(fullContext, family, finalModelProvenance);
    const latencyMs = performance.now() - startedAt;
    const totalTokens = inputTokens + outputTokens;

    const metadata: InterpretationExecutionMetadata = {
      provider: 'anthropic',
      model: this.model,
      modelVersion: modelEcho,
      promptId: prompt.promptId,
      promptVersion: prompt.promptVersion,
      generatedAt: generatedAtIso,
      latencyMs,
      attempts,
      contextHash: serialized.contextHash,
      tokenUsage: totalTokens > 0 ? { inputTokens, outputTokens, totalTokens } : null,
      estimatedCostUsd: totalTokens > 0 ? estimateCostUsd(this.model, inputTokens, outputTokens) : null,
    };

    return { draft, metadata };
  }
}
