/**
 * INTEL-03C — Segundo provider real de LLM para a camada L4 (Parte C do gate):
 * `GeminiInterpretationProvider`, usando o SDK oficial `@google/genai` (v2.17.1 — única
 * dependência nova deste gate, nenhum SDK concorrente/desnecessário instalado, ver
 * auditoria de infra na seção 20).
 *
 * Mesma arquitetura do `AnthropicInterpretationProvider` (INTEL-03B) — mesmo contrato
 * `InterpretationProvider`, mesmo `buildFamilyScopedContext`/`serializeInterpretationContext`,
 * mesmo `validateInterpretationDraft`, mesma `caveatsForFamily`, mesmo registry de
 * prompt (`./prompt-registry`), mesma taxonomia de erro (`InterpretationProviderErrorCode`,
 * classificada por `classifyGeminiError`). O core (`pipeline.ts`) não sabe, e não precisa
 * saber, se está falando com Anthropic ou Gemini (seção 22 do gate).
 *
 * Structured output nativo do Gemini: `responseMimeType: 'application/json'` +
 * `responseJsonSchema` — a mesma função `buildOutputSchema` (JSON Schema padrão) do
 * registry de prompt é aceita diretamente pela API do Gemini (`responseJsonSchema`
 * documentado como aceitando JSON Schema padrão), sem nenhuma tradução de schema
 * proprietária. Ainda assim, `validateInterpretationDraft` continua soberano — o schema
 * nativo nunca é o único validador (mesmo princípio do INTEL-03B, seção 28 do gate).
 *
 * `thinkingConfig: { thinkingBudget: 0 }` desliga o "thinking" do Gemini por padrão
 * (seção 32 do gate: "não habilitar raciocínio caro sem necessidade") — a tarefa é
 * síntese estruturada sobre evidência fechada, não um problema de raciocínio aberto, e
 * desligar reduz custo/latência sem reduzir segurança (o validador continua soberano
 * independentemente do quanto o modelo "pensou").
 */

import { GoogleGenAI, type Content } from '@google/genai';
import type { ModelProvenance } from '../contracts';
import type { ThresholdFamily } from '../economy/thresholds';
import { classifyGeminiError, InterpretationProviderError } from './provider-errors';
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

export const INTEL_INTERPRETATION_GEMINI_PROVIDER_METHOD_VERSION = 'INTEL_INTERPRETATION_GEMINI_PROVIDER_V1';

const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Preço USD/1M tokens — confirmado via https://ai.google.dev/gemini-api/docs/pricing
 * nesta sessão (16/08/2026), nunca inventado. Modelo fora desta tabela: custo não
 * estimado (null), mesma política do Anthropic provider (seção 44 do gate).
 */
const MODEL_PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
};

export interface GeminiInterpretationProviderOptions {
  apiKey?: string;
  model?: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
  /** Máximo de tentativas por família (schema + semântico combinados). Pequeno, sem loop infinito (mesma política do Anthropic provider). */
  maxAttempts?: number;
  now?: () => string;
  /** Injeção para testes — nunca chama a rede real quando fornecido (testes unitários não gastam tokens). */
  client?: GoogleGenAI;
  promptVersion?: InterpretationPromptVersion;
  /** Seção 32 do gate: thinking desligado por padrão (custo/latência) — pode ser reativado explicitamente se necessário no futuro. */
  thinkingBudget?: number;
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
    methodVersion: INTEL_INTERPRETATION_GEMINI_PROVIDER_METHOD_VERSION,
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
    supportStatus: 'SUPPORTED',
  }));
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
    methodVersion: INTEL_INTERPRETATION_GEMINI_PROVIDER_METHOD_VERSION,
    modelProvenance,
  };
}

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const pricing = MODEL_PRICING_USD_PER_MTOK[model];
  if (!pricing) return null;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

/** finishReason que indicam bloqueio/recusa de conteúdo — nunca tratados como falha de schema (seção 29 do gate). */
const REFUSAL_FINISH_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'RECITATION', 'SPII']);

function tryParseJson(text: string | undefined): RawInterpretationDraftPayload | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as RawInterpretationDraftPayload;
  } catch {
    return null;
  }
}

/**
 * Provider real de LLM (Google Gemini) para a camada L4. Uma chamada por família
 * presente no contexto; validação/aceitação continuam 100% sob controle do pipeline
 * (`pipeline.ts`), nunca decididas aqui — mesma disciplina do Anthropic provider.
 */
export class GeminiInterpretationProvider implements InterpretationProvider {
  readonly id = 'gemini-interpretation-v1';

  private readonly model: string;
  private readonly maxOutputTokens: number;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly now: () => string;
  private readonly thinkingBudget: number;
  private readonly client: GoogleGenAI | null;
  private readonly promptModule: ReturnType<typeof resolvePromptModule>;

  constructor(options: GeminiInterpretationProviderOptions = {}) {
    this.model = options.model ?? process.env.INTEL_LLM_MODEL ?? DEFAULT_MODEL;
    this.maxOutputTokens = options.maxOutputTokens ?? 8192;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxAttempts = options.maxAttempts ?? 2;
    this.now = options.now ?? (() => new Date().toISOString());
    this.thinkingBudget = options.thinkingBudget ?? 0;
    this.promptModule = resolvePromptModule(options.promptVersion ?? process.env.INTEL_LLM_PROMPT);
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? null;
    this.client = options.client ?? (apiKey ? new GoogleGenAI({ apiKey, httpOptions: { timeout: this.timeoutMs } }) : null);
  }

  async generateInterpretations(context: InterpretationInputContext): Promise<InterpretationGenerationResult> {
    if (!this.client) {
      throw new InterpretationProviderError('PROVIDER_CREDENTIAL_MISSING', 'GEMINI_API_KEY ausente — GeminiInterpretationProvider não pode ser executado (mesma política BLOCKED_BY_CREDENTIAL do INTEL-03B, nunca inventar resultado).');
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
    const contents: Content[] = [{ role: 'user', parts: [{ text: firstUserMessage }] }];

    const startedAt = performance.now();
    let attempts = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let modelEcho: string | null = null;
    let lastDraft: InterpretationDraft | null = null;
    let generatedAtIso = this.now();

    while (attempts < this.maxAttempts) {
      attempts++;
      let response: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>;
      try {
        response = await this.client!.models.generateContent({
          model: this.model,
          contents,
          config: {
            systemInstruction: prompt.systemPrompt,
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            maxOutputTokens: this.maxOutputTokens,
            thinkingConfig: { thinkingBudget: this.thinkingBudget },
          },
        });
      } catch (error) {
        throw classifyGeminiError(error);
      }

      modelEcho = response.modelVersion ?? this.model;
      inputTokens += response.usageMetadata?.promptTokenCount ?? 0;
      outputTokens += response.usageMetadata?.candidatesTokenCount ?? 0;
      generatedAtIso = this.now();

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason && REFUSAL_FINISH_REASONS.has(finishReason)) {
        throw new InterpretationProviderError('PROVIDER_REFUSAL', `Provider recusou/bloqueou output para a família ${family} em ${fullContext.territoryId} (finishReason: ${finishReason}).`);
      }

      const responseText = response.text;
      contents.push({ role: 'model', parts: [{ text: responseText ?? '' }] });

      const modelProvenance: ModelProvenance = {
        provider: 'gemini',
        model: this.model,
        modelVersion: modelEcho,
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        generatedAt: generatedAtIso,
      };

      const parsed = tryParseJson(responseText);
      if (!parsed) {
        if (attempts >= this.maxAttempts) break;
        contents.push({ role: 'user', parts: [{ text: prompt.buildSchemaRetryMessage() }] });
        continue;
      }

      const candidateDraft = assembleDraft(fullContext, familyContext, family, parsed, modelProvenance);
      lastDraft = candidateDraft;
      const validation = validateInterpretationDraft(candidateDraft, fullContext);
      if (validation.valid) break;

      if (attempts >= this.maxAttempts) break;
      contents.push({ role: 'user', parts: [{ text: prompt.buildSemanticRetryMessage([...new Set(validation.errors.map((error) => error.code))]) }] });
    }

    const finalModelProvenance: ModelProvenance = {
      provider: 'gemini',
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
      provider: 'gemini',
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
