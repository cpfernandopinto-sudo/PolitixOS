/**
 * INTEL-01 — Contrato canônico da Inteligência Política Territorial (L0–L6).
 *
 * Generaliza, entre domínios, o padrão já provado e testado em produção para o domínio
 * eleitoral (`electoral-intelligence.ts` → `electoral-interpretation-context.ts` →
 * `electoral-interpretation.ts` → `electoral-briefing.ts`). Não substitui esses arquivos:
 * eles permanecem a implementação de referência do domínio eleitoral. Este módulo define
 * o contrato cross-domain para que Segurança, Saúde, Economia, Demografia e futuros
 * domínios possam alimentar o mesmo pipeline sem reimplementar a arquitetura.
 *
 * Independente de React. Não persiste, não chama LLM, não analisa município real.
 */

// ---------------------------------------------------------------------------
// Camadas L0–L6 (documentação formal do modelo — ver seção 5 do relatório)
// ---------------------------------------------------------------------------

export type IntelligenceLayer =
  | 'L0_SOURCE_DATA'
  | 'L1_EVIDENCE'
  | 'L2_DERIVED_INDICATOR'
  | 'L3_ANALYTICAL_SIGNAL'
  | 'L4_INTERPRETATION'
  | 'L5_IMPLICATION'
  | 'L6_RECOMMENDATION';

export type IntelligenceDomain = 'demografia' | 'eleitoral' | 'seguranca' | 'saude' | 'economia' | (string & {});

// ---------------------------------------------------------------------------
// Provenance / Lineage (generaliza ElectoralIntelligenceProvenance)
// ---------------------------------------------------------------------------

/** Referência estável e resolvível a um dado real já persistido — nunca uma cópia do valor. */
export interface IntelligenceProvenance {
  territoryId: string;
  domains: IntelligenceDomain[];
  periods: string[];
  indicatorKeys: string[];
  datasets: string[];
  evidenceHashes: string[];
}

// ---------------------------------------------------------------------------
// Temporalidade / Freshness (seções 8–9)
// ---------------------------------------------------------------------------

export interface TemporalCoverage {
  periodStart: string;
  periodEnd: string;
  referencePeriodLabel: string;
  sourceReferencePeriods: Partial<Record<IntelligenceDomain, string | null>>;
}

export interface Freshness {
  referencePeriod: string;
  collectedAt: string | null;
  sourceUpdatedAt: string | null;
  analysisGeneratedAt: string;
}

// ---------------------------------------------------------------------------
// Coverage (seção 10) — deliberadamente distinto de Confidence (seção 11)
// ---------------------------------------------------------------------------

export type DomainAvailability = 'available' | 'partial' | 'unavailable';

export interface Coverage {
  byDomain: Partial<Record<IntelligenceDomain, DomainAvailability>>;
  domainsAvailable: number;
  domainsExpected: number;
  missingData: Array<{ domain: IntelligenceDomain; period: string; fields: string[] }>;
}

// ---------------------------------------------------------------------------
// Confidence (seção 11) — classe qualitativa por força evidencial, nunca score fabricado.
// Generaliza ElectoralConfidenceClass. INSUFFICIENT_EVIDENCE não é um nível de confiança:
// é o estado que impede a camada de produzir uma conclusão (ver seção 14).
// ---------------------------------------------------------------------------

export type ConfidenceClass = 'DIRECTLY_SUPPORTED' | 'MULTI_SIGNAL_SUPPORTED' | 'LIMITED_CONTEXT';

export const CONFIDENCE_RANK: Record<ConfidenceClass, number> = {
  DIRECTLY_SUPPORTED: 0,
  MULTI_SIGNAL_SUPPORTED: 1,
  LIMITED_CONTEXT: 2,
};

/** Regra de agregação: a confiança consolidada de um conjunto é sempre a mais fraca do conjunto (generaliza ElectoralBriefing.confidence). */
export function consolidateConfidence(classes: ConfidenceClass[]): ConfidenceClass {
  return classes.reduce<ConfidenceClass>((lowest, current) => (CONFIDENCE_RANK[current] > CONFIDENCE_RANK[lowest] ? current : lowest), 'DIRECTLY_SUPPORTED');
}

// ---------------------------------------------------------------------------
// Limitations / Contradictions / Insufficient evidence (seções 12–14)
// ---------------------------------------------------------------------------

export interface Limitation {
  code: string;
  description: string;
  domain?: IntelligenceDomain;
}

export type EvidenceSufficiency = 'SUFFICIENT' | 'INSUFFICIENT_EVIDENCE';

// ---------------------------------------------------------------------------
// L1 — Evidence: referência rastreável, nunca cópia integral do dado bruto.
// ---------------------------------------------------------------------------

export interface Evidence {
  id: string;
  territoryId: string;
  domain: IntelligenceDomain;
  indicator: string;
  value: number | string | null;
  unit: string | null;
  period: string;
  source: string;
  dataset: string;
  evidenceHash: string | null;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Fact (INTEL-DOMAIN-02, seção "Princípio" do gate): ponte legível entre L1/L2 e L3.
// Um Fact é uma leitura factual única e autocontida (ex.: "saldo atual", "melhor mês",
// "setor líder") — nunca uma interpretação, nunca um julgamento de magnitude/threshold
// (isso é papel do AnalyticalSignal). Todo Fact é rastreável 1:1 a Evidence/DerivedIndicator
// reais; `supported=false` sinaliza explicitamente quando o dado disponível NÃO sustenta
// matematicamente o fact (nunca omitido silenciosamente — ver seção 14 do INTEL-01).
// Aditivo ao contrato canônico: não substitui nem altera Evidence/DerivedIndicator/
// AnalyticalSignal, apenas empacota-os de forma consumível por L3 (detecção de signal)
// e L4 (prompt).
// ---------------------------------------------------------------------------

export interface Fact {
  id: string;
  territoryId: string;
  domain: IntelligenceDomain;
  /** Chave estável do fact dentro do domínio (ex.: 'current_balance', 'best_month', 'sector_leader') — nunca um texto livre. */
  key: string;
  /** Rótulo humano/LLM-legível, nunca um identificador técnico (regra 18 do Prompt V2/V3). */
  label: string;
  value: number | string | null;
  unit: string | null;
  period: string;
  evidenceRefs: string[];
  derivedIndicatorRefs: string[];
  /** Falso quando o dado disponível é matematicamente insuficiente para sustentar este fact (ex.: MoM sem mês anterior) — o fact ainda existe no registro, mas nunca deve ser exposto como afirmação. */
  supported: boolean;
  limitations: Limitation[];
}

// ---------------------------------------------------------------------------
// L2 — DerivedIndicator: resultado determinístico. NUNCA é interpretação política.
// ---------------------------------------------------------------------------

export interface DerivedIndicator {
  id: string;
  territoryId: string;
  domain: IntelligenceDomain;
  indicator: string;
  methodId: string;
  methodVersion: string;
  inputs: Array<{ evidenceRef: string; role: string }>;
  result: number | string | null;
  unit: string | null;
  period: string;
  formulaDescription: string;
  limitations: Limitation[];
}

// ---------------------------------------------------------------------------
// L3 — AnalyticalSignal: padrão/condição identificada, quantitativa e descritiva.
// Deliberadamente NÃO inclui 'risk'/'opportunity' — ver seção 16 do relatório
// para a justificativa metodológica dessa decisão.
// ---------------------------------------------------------------------------

export type SignalType = 'TREND' | 'CHANGE' | 'PRESSURE' | 'CONCENTRATION' | 'DIVERGENCE' | 'ANOMALY' | 'ATTENTION';
export type SignalPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
/** Severidade = magnitude do fenômeno observado. Priority = importância para decisão. Eixos independentes (seção 18). */
export type SignalSeverity = 'HIGH' | 'MODERATE' | 'LOW';
export type SignalStatus = 'ACTIVE' | 'INSUFFICIENT_EVIDENCE';

export interface AnalyticalSignal {
  id: string;
  territoryId: string;
  domains: IntelligenceDomain[];
  type: SignalType;
  priority: SignalPriority | null;
  severity: SignalSeverity | null;
  title: string;
  summary: string;
  evidenceRefs: string[];
  derivedIndicatorRefs: string[];
  period: string;
  status: SignalStatus;
  confidence: ConfidenceClass | null;
  limitations: Limitation[];
  methodId: string;
  methodVersion: string;
}

// ---------------------------------------------------------------------------
// L4 — Interpretation: camada qualitativa. Origem sempre declarada (seção 4/26).
// ---------------------------------------------------------------------------

export type AssertionClass = 'FACT' | 'SIGNAL' | 'INTERPRETATION' | 'IMPLICATION' | 'RECOMMENDATION';
export type InterpretationOrigin = 'rule' | 'model' | 'human' | 'hybrid';

export interface ModelProvenance {
  provider: string;
  model: string;
  modelVersion: string | null;
  promptId: string;
  promptVersion: string;
  generatedAt: string;
}

export interface Interpretation {
  id: string;
  territoryId: string;
  assertionClass: 'INTERPRETATION';
  statement: string;
  domains: IntelligenceDomain[];
  origin: InterpretationOrigin;
  modelProvenance: ModelProvenance | null;
  basedOnSignals: string[];
  evidenceRefs: string[];
  confidence: ConfidenceClass;
  caveats: string[];
  contradicts: string[];
}

// ---------------------------------------------------------------------------
// L5 — Implication: "por que isso importa?". Nunca gerada sem lineage de Interpretation.
// ---------------------------------------------------------------------------

export type ImplicationDimension = 'gestao' | 'agenda_publica' | 'percepcao' | 'territorio' | 'campanha' | 'comunicacao' | 'politica_publica' | 'visita' | 'mobilizacao';

export interface Implication {
  id: string;
  territoryId: string;
  assertionClass: 'IMPLICATION';
  statement: string;
  dimension: ImplicationDimension;
  origin: InterpretationOrigin;
  modelProvenance: ModelProvenance | null;
  basedOnInterpretations: string[];
  confidence: ConfidenceClass;
  caveats: string[];
}

// ---------------------------------------------------------------------------
// L6 — Recommendation: nunca órfã (seção 6) — exige lineage de Implication OU Interpretation.
// ---------------------------------------------------------------------------

export interface Recommendation {
  id: string;
  territoryId: string;
  assertionClass: 'RECOMMENDATION';
  action: string;
  priority: SignalPriority;
  justification: string;
  origin: InterpretationOrigin;
  modelProvenance: ModelProvenance | null;
  basedOnImplications: string[];
  basedOnInterpretations: string[];
  evidenceRefs: string[];
  caveats: string[];
  validUntil: string | null;
  reviewStatus: ReviewStatus;
}

export type ReviewStatus = 'not_reviewed' | 'reviewed' | 'approved' | 'rejected' | 'edited';

// ---------------------------------------------------------------------------
// Explainability (seção 33) — nunca chain-of-thought, sempre evidência + método.
// ---------------------------------------------------------------------------

export interface Explainability {
  evidenceRefs: string[];
  sourceRefs: string[];
  methodology: string;
  coverage: Coverage;
  limitations: Limitation[];
}

// ---------------------------------------------------------------------------
// Executive summary (seção 31) — estruturado, cada afirmação referenciando um item real.
// ---------------------------------------------------------------------------

export interface ExecutiveSummary {
  headline: string;
  summary: string[];
  keySignals: string[];
  risks: string[];
  opportunities: string[];
  attentionPoints: string[];
  coverage: Coverage;
  limitations: Limitation[];
}

// ---------------------------------------------------------------------------
// Agenda territorial (seção 32) — estrutura própria, referenciando Recommendation/Implication.
// ---------------------------------------------------------------------------

export interface TerritorialAgendaItem {
  id: string;
  title: string;
  rationale: string;
  basedOnRecommendations: string[];
  basedOnImplications: string[];
}

// ---------------------------------------------------------------------------
// Briefing canônico (seção 30) — serializável diretamente em territory_briefings.content (jsonb).
// ---------------------------------------------------------------------------

export type BriefingFreshnessStatus = 'fresh' | 'stale' | 'partial' | 'needs_reanalysis';

export interface TerritorialPoliticalIntelligenceBriefing {
  schemaVersion: string;
  id: string;
  territoryId: string;
  generatedAt: string;
  referenceDate: string;
  coverage: Coverage;
  temporalCoverage: TemporalCoverage;
  freshnessStatus: BriefingFreshnessStatus;
  executiveSummary: ExecutiveSummary;
  signals: AnalyticalSignal[];
  crossDomainSignals: AnalyticalSignal[];
  interpretations: Interpretation[];
  implications: Implication[];
  recommendations: Recommendation[];
  agenda: TerritorialAgendaItem[];
  limitations: Limitation[];
  evidenceIndex: Record<string, Evidence>;
  methodology: { methodId: string; methodVersion: string; description: string };
  explainability: Explainability;
  reviewStatus: ReviewStatus;
  guardrails: { mode: 'FAIL_CLOSED'; assertionClassesUsed: AssertionClass[] };
}
