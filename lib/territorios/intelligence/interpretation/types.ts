/**
 * INTEL-03A — Fundação da camada L4 (Interpretation), domínio Economia.
 *
 * Contrato de tipos do harness de interpretação. NÃO chama LLM (seção "SEM LLM NESTE
 * GATE" do gate). Reutiliza o contrato canônico `Interpretation` de `../contracts.ts`
 * sem alterá-lo nem duplicá-lo (seção 12 do gate) — este arquivo só define o que é
 * específico do harness de seleção/validação/composição que antecede uma Interpretation
 * canônica válida.
 *
 * L4 NÃO É resumo livre. L4 responde: "o que este conjunto de sinais pode significar,
 * dentro das evidências disponíveis?" — bounded, traceable, evidence-backed, temporally
 * explicit, non-causal salvo evidência de causalidade, non-prescriptive, non-electoral.
 */

import type { ConfidenceClass, Evidence, Interpretation, Limitation, ModelProvenance } from '../contracts';
import type { AnalyticalSignal } from '../contracts';
import type { ConsolidatedSignal } from '../economy/consolidation';
import type { ThresholdFamily } from '../economy/thresholds';
import type { CalibrationStatus } from '../economy/thresholds';
import type { Coverage, DomainAvailability, TemporalCoverage } from '../contracts';

// ---------------------------------------------------------------------------
// Modo de operação (seção 25-26 do gate): único modo suportado neste gate.
// ---------------------------------------------------------------------------

/**
 * CLOSED_EVIDENCE é o único modo implementado no INTEL-03A/03B (seção 25 do gate:
 * "recomendação: NÃO no primeiro INTEL-03B" para conhecimento externo). Um futuro modo
 * que permita conhecimento externo do modelo exigiria um novo gate explícito — nunca
 * uma mudança silenciosa deste enum.
 */
export type InterpretationMode = 'CLOSED_EVIDENCE';

// ---------------------------------------------------------------------------
// Unidade de interpretação (seção 2-3 do gate): Raw Signal OU Consolidated Signal,
// nunca ambos para o mesmo fenômeno (ver decisão documentada em selection.ts).
// ---------------------------------------------------------------------------

export type InterpretationUnitKind = 'RAW_SIGNAL' | 'CONSOLIDATED_SIGNAL';

export interface InterpretationUnit {
  kind: InterpretationUnitKind;
  id: string;
  family: ThresholdFamily;
  signal: AnalyticalSignal | ConsolidatedSignal;
  /** Para CONSOLIDATED_SIGNAL: os AnalyticalSignal.id brutos que a sequência resume (seção 55, 85 do gate). */
  constituentRawSignalRefs: string[];
  evidenceRefs: string[];
  derivedIndicatorRefs: string[];
  period: string;
}

// ---------------------------------------------------------------------------
// Política de seleção versionada (seção 7 do gate).
// ---------------------------------------------------------------------------

export interface SelectionPolicyMetadata {
  id: 'INTEL_INPUT_SELECTION_V1';
  maxUnitsPerFamily: number;
  criteria: readonly string[];
}

// ---------------------------------------------------------------------------
// Contexto de input para interpretação (seção 3, 9-11 do gate) — o que entra na
// camada L4. Nunca esconde ausência (seção 9): coverage/temporalCoverage sempre
// completos, mesmo quando `unavailable`.
// ---------------------------------------------------------------------------

export interface InterpretationInputContext {
  mode: InterpretationMode;
  territoryId: string;
  generatedAt: string;
  selectionPolicy: SelectionPolicyMetadata;
  units: InterpretationUnit[];
  /** unidades descartadas pela seleção, só para auditoria — nunca alimentam o provider (seção 4). */
  excludedUnitIds: string[];
  coverage: Coverage;
  coverageByFamily: Record<ThresholdFamily, DomainAvailability>;
  temporalCoverage: TemporalCoverage;
  temporalCoverageByFamily: Record<'FISCAL' | 'PIB_VAB_MONETARY' | 'OFFICIAL_SHARE', { periodStart: string; periodEnd: string } | null>;
  limitations: Limitation[];
  /** Status de calibração de cada família presente nas unidades selecionadas (seção 11 do gate) — nunca "pilot" travestido de "national". */
  calibrationStatusByFamily: Partial<Record<ThresholdFamily, CalibrationStatus>>;
  /** Somente a evidência realmente referenciada pelas unidades selecionadas (seção 53 — compressão, não despejo). */
  evidenceIndex: Record<string, Evidence>;
  methodology: { methodId: string; methodVersion: string; description: string };
}

// ---------------------------------------------------------------------------
// Claim-level traceability (seção 14-16 do gate).
// ---------------------------------------------------------------------------

/**
 * Taxonomia fechada de claim. Deliberadamente NÃO inclui POLITICAL_RISK, OPPORTUNITY
 * nem RECOMMENDATION (seção 16 do gate) — a união TS fecha essa possibilidade por
 * construção, sem depender de disciplina de quem escreve o draft.
 */
export type ClaimType =
  | 'OBSERVED_PATTERN'
  | 'COMPARATIVE_READING'
  | 'TEMPORAL_READING'
  | 'STRUCTURAL_READING'
  | 'MIXED_SIGNAL_READING'
  | 'METHODOLOGICAL_CAVEAT';

export type ClaimSupportStatus = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED';

export interface InterpretationClaim {
  id: string;
  text: string;
  signalRefs: string[];
  evidenceRefs: string[];
  claimType: ClaimType;
  /**
   * Preenchido pelo autor do draft (regra/provider), mas SEMPRE recomputado pelo
   * validador (seção 15) — nunca aceito por confiança. Um claim substantivo (todo
   * claimType exceto METHODOLOGICAL_CAVEAT) sem refs resolvíveis é UNSUPPORTED por
   * definição, e nenhum UNSUPPORTED pode compor uma Interpretation válida.
   */
  supportStatus: ClaimSupportStatus;
}

// ---------------------------------------------------------------------------
// Draft — payload estruturado intermediário (seção 13 do gate), pré-validação.
// ---------------------------------------------------------------------------

export interface InterpretationTemporalScope {
  periodStart: string;
  periodEnd: string;
  label: string;
}

export interface InterpretationDraft {
  id: string;
  territoryId: string;
  domains: readonly ['economia'];
  statement: string;
  claims: InterpretationClaim[];
  caveats: string[];
  temporalScope: InterpretationTemporalScope;
  /**
   * 'model_mock' = RuleBasedMockProvider (INTEL-03A, template determinístico, nunca uma
   * chamada real). 'model' = provider real de LLM (INTEL-03B) — distinção honesta
   * preservada no draft para permitir a comparação mock vs LLM (Parte F do gate), mesmo
   * que ambos colapsem no mesmo `InterpretationOrigin` canônico ('model') em `build.ts`.
   */
  origin: 'rule' | 'model_mock' | 'model';
  methodVersion: string;
  /** Só presente para origin === 'model' — nunca inventado, nunca para draft de regra/mock (seção 46 do gate). */
  modelProvenance?: ModelProvenance | null;
}

// ---------------------------------------------------------------------------
// Validação (seção 43-46 do gate).
// ---------------------------------------------------------------------------

export type InterpretationValidationErrorCode =
  | 'UNSUPPORTED_SIGNAL_REF'
  | 'UNSUPPORTED_EVIDENCE_REF'
  | 'UNSUPPORTED_NUMBER'
  | 'CAUSAL_CLAIM'
  | 'FORECAST_CLAIM'
  | 'NORMATIVE_CLAIM'
  | 'POLITICAL_ATTRIBUTION_CLAIM'
  | 'SENSITIVE_INFERENCE_CLAIM'
  | 'IDEOLOGY_CLAIM'
  | 'RECOMMENDATION_LEAK_CLAIM'
  | 'TEMPORAL_MISREPRESENTATION'
  | 'NOMINALITY_VIOLATION'
  | 'PIB_PER_CAPITA_SEMANTIC_VIOLATION'
  | 'UNKNOWN_SOURCE'
  | 'INSUFFICIENT_SUPPORT'
  | 'EMPTY_STATEMENT'
  | 'NO_CLAIMS';

export interface InterpretationValidationError {
  code: InterpretationValidationErrorCode;
  claimId: string | null;
  detail: string;
}

export type InterpretationValidationResult =
  | { valid: true; errors: []; warnings: InterpretationValidationError[]; confidence: ConfidenceClass }
  | { valid: false; errors: InterpretationValidationError[]; warnings: InterpretationValidationError[]; confidence: null };

// ---------------------------------------------------------------------------
// Draft validado, pronto para virar Interpretation canônica — extensão aditiva
// (mesmo padrão de EconomicIntelligenceResult estendendo Coverage/TemporalCoverage
// sem alterar o contrato canônico INTEL-01, ver INTEL-02B seção 20/29).
// ---------------------------------------------------------------------------

export interface ValidatedInterpretation extends Interpretation {
  /** Extensão aditiva, não faz parte do contrato canônico `Interpretation` — preserva claim-level traceability para auditoria (seção 14). */
  claims: InterpretationClaim[];
  temporalScope: InterpretationTemporalScope;
  reviewStatus: 'not_reviewed';
}

export interface RejectedInterpretationDraft {
  draft: InterpretationDraft;
  errors: InterpretationValidationError[];
}

// ---------------------------------------------------------------------------
// Provider (seção 47-50 do gate, estendida no INTEL-03B seção 8): interface técnica,
// permite rule | LLM | human | hybrid — nunca específica de um fornecedor de modelo.
// Assíncrona desde o INTEL-03B para suportar um provider real que faz chamada de rede
// (o RuleBasedMockProvider do INTEL-03A permanece síncrono por dentro, apenas envolto
// em Promise — nenhuma mudança de comportamento).
// ---------------------------------------------------------------------------

export interface InterpretationProviderMetadata {
  provider: string;
  promptVersion: string | null;
  generatedAt: string;
}

/** Observabilidade por chamada de geração (seção 41-46 do gate) — nunca inclui chain-of-thought (seção 10). */
export interface InterpretationExecutionMetadata {
  provider: string;
  model: string;
  modelVersion: string | null;
  promptId: string;
  promptVersion: string;
  generatedAt: string;
  latencyMs: number;
  attempts: number;
  /** contextHash do `SerializedInterpretationContext` (família-escopado) desta chamada — reusa serializer.ts, nunca recalculado por conta própria. */
  contextHash: string;
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
  /** Custo estimado em USD, quando calculável de forma determinística a partir de tokenUsage; null quando não calculável (nunca inventado). */
  estimatedCostUsd: number | null;
}

export interface InterpretationGenerationResult {
  drafts: InterpretationDraft[];
  /** Uma entrada por chamada real ao provider (ex.: uma por família) — vazio para providers locais (mock). */
  executionMetadata: InterpretationExecutionMetadata[];
}

export interface InterpretationProvider {
  readonly id: string;
  generateInterpretations(context: InterpretationInputContext): Promise<InterpretationGenerationResult>;
}

// ---------------------------------------------------------------------------
// Taxonomia de erro de provider (seção 38-40 do gate) — distingue falha operacional
// (rede, auth, rate limit, timeout, output inválido) de draft semanticamente inválido
// (que é tratado pelo validador normal, não por esta taxonomia).
// ---------------------------------------------------------------------------

export type InterpretationProviderErrorCode =
  | 'PROVIDER_CREDENTIAL_MISSING'
  | 'PROVIDER_AUTH_ERROR'
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_NETWORK_ERROR'
  | 'PROVIDER_OVERLOADED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_REFUSAL'
  | 'PROVIDER_INVALID_OUTPUT'
  | 'PROVIDER_CONTEXT_LIMIT_EXCEEDED'
  | 'PROVIDER_UNKNOWN_ERROR';

// ---------------------------------------------------------------------------
// Resultado do pipeline completo (seção 76-77 do gate).
// ---------------------------------------------------------------------------

export type InterpretationPipelineResult =
  | { status: 'NO_INTERPRETATION'; reason: string; context: InterpretationInputContext }
  | { status: 'COMPLETED'; context: InterpretationInputContext; accepted: ValidatedInterpretation[]; rejected: RejectedInterpretationDraft[]; executionMetadata: InterpretationExecutionMetadata[] };
