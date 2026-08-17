/**
 * INTEL-02 / INTEL-02B — Motor Determinístico de Inteligência Econômica.
 *
 * PURE CORE (seção 71 do gate INTEL-02): recebe apenas `Evidence[]` já persistida/normalizada.
 * Não consulta SICONFI, não consulta IBGE, não faz fetch, não conhece n8n, não
 * conhece API externa, não conhece React, não persiste nada. Reprocessável a
 * qualquer momento a partir de um novo `Evidence[]` — sem estado oculto.
 *
 * Evidence[] -> DerivedIndicator[] -> AnalyticalSignal[] (L1 -> L2 -> L3).
 * NÃO produz Interpretation/Implication/Recommendation (L4-L6).
 *
 * INTEL-02B (seção 4 do gate) separa três famílias de indicador econômico:
 *   FISCAL            — SICONFI/DCA (ECO-01): finanças públicas municipais.
 *   PIB_VAB_MONETARY  — IBGE/SIDRA 5938 + base oficial (ECO-02B): atividade econômica.
 *   OFFICIAL_SHARE    — participações setoriais já oficiais do IBGE, nunca recalculadas.
 * Nenhum DerivedIndicator cross-source (SICONFI x PIB) é criado — seção 28/49.
 */

import type { AnalyticalSignal, Coverage, DerivedIndicator, DomainAvailability, Evidence, Limitation, TemporalCoverage } from '../contracts';
import {
  ECON_OFFICIAL_SHARE_SERIES_V1, ECON_SHARE_V1, ECON_VAR_YOY_V1,
  calculateNominalYoyVariations, calculatePercentagePointChanges, calculatePercentageShares, derivedIndicatorId, officialShareSeries,
} from './derived-indicators';
import {
  detectAnomaly, detectAttention, detectChange, detectConcentration, detectDivergence,
  detectOfficialShareAttention, detectOfficialShareChange, detectOfficialShareConcentration, detectOfficialShareTrend,
  detectPressure, detectTrend, evidenceExists, insufficientEvidenceSignal,
} from './signals';
import { ECON_THRESHOLDS, pibVabChangeThresholdFor, type ThresholdFamily } from './thresholds';
import { consolidateChangeEvents, type ChangeEvent, type ConsolidatedSignal } from './consolidation';
import type { EconomicIntelligenceResult } from './types';
import { EconomyEngineError } from './types';

export { type ThresholdFamily } from './thresholds';

export const ECONOMY_ENGINE_VERSION = 'intel02b-economy-engine-v1';

// ---------------------------------------------------------------------------
// Configuração FISCAL — ECO-01/SICONFI (default, inalterada desde o INTEL-02).
// ---------------------------------------------------------------------------

export const ECO01_MONETARY_INDICATORS = [
  'receita_total_bruta_realizada',
  'receita_corrente_bruta_realizada',
  'receita_tributaria_bruta_realizada',
  'transferencias_correntes_brutas_realizadas',
  'despesa_corrente_empenhada',
  'despesa_capital_empenhada',
  'investimento_empenhado',
] as const;

export interface SharePairConfig { numerator: string; denominator: string }
export interface PairConfig { a: string; b: string }

export const ECO01_SHARE_PAIRS: readonly SharePairConfig[] = [
  { numerator: 'receita_tributaria_bruta_realizada', denominator: 'receita_corrente_bruta_realizada' },
  { numerator: 'transferencias_correntes_brutas_realizadas', denominator: 'receita_corrente_bruta_realizada' },
  { numerator: 'investimento_empenhado', denominator: 'despesa_capital_empenhada' },
];

export const ECO01_PRESSURE_PAIR: { revenue: string; expense: string } = { revenue: 'receita_corrente_bruta_realizada', expense: 'despesa_corrente_empenhada' };
export const ECO01_DIVERGENCE_PAIR: PairConfig = { a: 'receita_corrente_bruta_realizada', b: 'despesa_corrente_empenhada' };

// ---------------------------------------------------------------------------
// Configuração PIB_VAB_MONETARY / OFFICIAL_SHARE — ECO-02B/IBGE (novo, INTEL-02B).
// Nenhuma dependência de código do ECO-02B: apenas nomes de indicador como string
// (seção 2 do gate — "não alterar ECO-02B", "INTEL-02B deve consumir evidências").
// ---------------------------------------------------------------------------

export const ECO02B_ACTIVITY_MONETARY_INDICATORS = [
  'pib_municipal_precos_correntes',
  'impostos_liquidos_subsidios_produtos_precos_correntes',
  'vab_total_precos_correntes',
  'vab_agropecuaria_precos_correntes',
  'vab_industria_precos_correntes',
  'vab_servicos_exceto_setor_publico_ampliado_precos_correntes',
  'vab_administracao_defesa_educacao_saude_publicas_seguridade_precos_correntes',
  'pib_per_capita_precos_correntes',
] as const;

/** Participações setoriais OFICIAIS do IBGE — nunca passam por ECON_SHARE_V1 (seção 7/44 do gate). */
export const ECO02B_OFFICIAL_SHARE_INDICATORS = [
  'participacao_vab_agropecuaria',
  'participacao_vab_industria',
  'participacao_vab_servicos_exceto_setor_publico_ampliado',
  'participacao_vab_administracao_defesa_educacao_saude_publicas_seguridade',
] as const;

/** Pares intra-atividade-econômica válidos para DIVERGENCE (seção 35 do gate) — nunca cruza FISCAL x PIB_VAB. */
export const ECO02B_DIVERGENCE_PAIRS: readonly PairConfig[] = [
  { a: 'pib_municipal_precos_correntes', b: 'vab_industria_precos_correntes' },
  { a: 'pib_municipal_precos_correntes', b: 'vab_servicos_exceto_setor_publico_ampliado_precos_correntes' },
];

export interface EconomyEngineConfig {
  /** Indicadores monetários fiscais (ECO-01/SICONFI): TREND/CHANGE/ANOMALY via threshold FISCAL. Default: catálogo ECO-01. */
  fiscalMonetaryIndicators?: readonly string[];
  /** Indicadores monetários de atividade econômica (ECO-02B/PIB-VAB): TREND/CHANGE/ANOMALY via threshold PIB_VAB_MONETARY. Default: catálogo ECO-02B. */
  activityMonetaryIndicators?: readonly string[];
  /** Participações setoriais oficiais (ECO-02B): TREND/CHANGE/CONCENTRATION/ATTENTION em p.p., via ECON_OFFICIAL_SHARE_SERIES_V1 (nunca ECON_SHARE_V1). Default: catálogo ECO-02B. */
  officialShareIndicators?: readonly string[];
  /** Pares numerador/denominador FISCAIS para participação calculada (CONCENTRATION/ATTENTION via ECON_SHARE_V1). Default: ECO-01. */
  sharePairs?: readonly SharePairConfig[];
  /** Par receita/despesa correntes para PRESSURE (exclusivamente fiscal — seção 27 do gate). Default: ECO-01. Passe `null` para desativar. */
  pressurePair?: { revenue: string; expense: string } | null;
  /** Pares de indicadores para DIVERGENCE — fiscal (ECO-01) + intra-atividade (ECO-02B). Nunca cruza as duas famílias (seção 28/49). Default: ECO-01 + ECO-02B. */
  divergencePairs?: readonly PairConfig[];
}

const DEFAULT_CONFIG: Required<EconomyEngineConfig> = {
  fiscalMonetaryIndicators: ECO01_MONETARY_INDICATORS,
  activityMonetaryIndicators: ECO02B_ACTIVITY_MONETARY_INDICATORS,
  officialShareIndicators: ECO02B_OFFICIAL_SHARE_INDICATORS,
  sharePairs: ECO01_SHARE_PAIRS,
  pressurePair: ECO01_PRESSURE_PAIR,
  divergencePairs: [ECO01_DIVERGENCE_PAIR, ...ECO02B_DIVERGENCE_PAIRS],
};

// ---------------------------------------------------------------------------
// Ordenação determinística (seção 47 do gate INTEL-02): priority -> severity -> type -> id.
// Priority é sempre null neste gate (seção 36); severity governa na prática.
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<string, number> = { HIGH: 0, MODERATE: 1, LOW: 2 };
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function compareSignals(a: AnalyticalSignal, b: AnalyticalSignal): number {
  const priorityDelta = (PRIORITY_RANK[a.priority ?? ''] ?? 99) - (PRIORITY_RANK[b.priority ?? ''] ?? 99);
  if (priorityDelta !== 0) return priorityDelta;
  const severityDelta = (SEVERITY_RANK[a.severity ?? ''] ?? 99) - (SEVERITY_RANK[b.severity ?? ''] ?? 99);
  if (severityDelta !== 0) return severityDelta;
  const typeDelta = a.type.localeCompare(b.type);
  if (typeDelta !== 0) return typeDelta;
  return a.id.localeCompare(b.id);
}

/** Deduplicação por ID (seção 48 do gate INTEL-02) — defensivo; as regras já produzem IDs estáveis por fenômeno/período. */
function deduplicateSignals(signals: AnalyticalSignal[]): AnalyticalSignal[] {
  const byId = new Map<string, AnalyticalSignal>();
  for (const signal of signals) byId.set(signal.id, signal);
  return [...byId.values()];
}

// ---------------------------------------------------------------------------
// Evidence -> DerivedIndicator (canônico)
// ---------------------------------------------------------------------------

function toYoyDerivedIndicators(territoryId: string, indicator: string, evidence: Evidence[]): DerivedIndicator[] {
  return calculateNominalYoyVariations(evidence, indicator).map((variation) => ({
    id: derivedIndicatorId(indicator, ECON_VAR_YOY_V1, `${variation.fromYear}-${variation.toYear}`, territoryId),
    territoryId,
    domain: 'economia',
    indicator: `variacao_nominal_interanual:${indicator}`,
    methodId: ECON_VAR_YOY_V1,
    methodVersion: 'v1',
    inputs: [
      { evidenceRef: variation.evidenceRefs[0], role: `valor_${variation.fromYear}` },
      { evidenceRef: variation.evidenceRefs[1], role: `valor_${variation.toYear}` },
    ],
    result: Number(variation.variationPct.toFixed(4)),
    unit: '%',
    period: `${variation.fromYear}-${variation.toYear}`,
    formulaDescription: '(valor_t - valor_t-1) / |valor_t-1| * 100 — variação nominal, sem deflator.',
    limitations: variation.limitations,
  }));
}

function toShareDerivedIndicators(territoryId: string, pair: SharePairConfig, evidence: Evidence[]): DerivedIndicator[] {
  return calculatePercentageShares(evidence, pair.numerator, pair.denominator).map((share) => ({
    id: derivedIndicatorId(`${pair.numerator}-em-${pair.denominator}`, ECON_SHARE_V1, String(share.year), territoryId),
    territoryId,
    domain: 'economia',
    indicator: `participacao_percentual:${pair.numerator}-em-${pair.denominator}`,
    methodId: ECON_SHARE_V1,
    methodVersion: 'v1',
    inputs: [
      { evidenceRef: share.evidenceRefs[0], role: 'numerador' },
      { evidenceRef: share.evidenceRefs[1], role: 'denominador' },
    ],
    result: Number(share.sharePct.toFixed(4)),
    unit: '%',
    period: String(share.year),
    formulaDescription: `${pair.numerator} / ${pair.denominator} * 100`,
    limitations: share.limitations,
  }));
}

/** Participação OFICIAL consumida diretamente — nunca recalculada (seção 7/24/44 do gate INTEL-02B). */
function toOfficialShareDerivedIndicators(territoryId: string, indicator: string, evidence: Evidence[]): DerivedIndicator[] {
  return officialShareSeries(evidence, indicator).map((item) => ({
    id: derivedIndicatorId(indicator, ECON_OFFICIAL_SHARE_SERIES_V1, String(item.year), territoryId),
    territoryId,
    domain: 'economia',
    indicator,
    methodId: ECON_OFFICIAL_SHARE_SERIES_V1,
    methodVersion: 'v1',
    inputs: [{ evidenceRef: item.evidenceRef, role: 'valor_oficial' }],
    result: Number(item.sharePct.toFixed(4)),
    unit: '%',
    period: String(item.year),
    formulaDescription: 'Valor oficial publicado pelo IBGE — consumo direto, sem cálculo de razão.',
    limitations: item.limitations,
  }));
}

// ---------------------------------------------------------------------------
// ChangeEvent (INTEL-02C — seção 26-34 do gate): extrai os eventos CHANGE que
// cruzaram o threshold para alimentar `consolidateChangeEvents`. Espelha
// exatamente o mesmo filtro/id/derivedIndicatorRef usado por `detectChange` e
// `detectOfficialShareChange` em signals.ts — nenhum evento novo é inventado,
// apenas os já detectados são reorganizados em sequências.
// ---------------------------------------------------------------------------

function changeEventsFromYoyVariations(territoryId: string, variations: ReturnType<typeof calculateNominalYoyVariations>, threshold: number): ChangeEvent[] {
  return variations
    .filter((item) => Math.abs(item.variationPct) >= threshold)
    .map((item) => ({
      fromYear: item.fromYear,
      toYear: item.toYear,
      direction: item.variationPct > 0 ? 'up' : 'down',
      evidenceRefs: [...item.evidenceRefs],
      derivedIndicatorRefs: [`derived:${territoryId}:${item.indicatorId}:ECON_VAR_YOY_V1:${item.fromYear}-${item.toYear}`],
      rawSignalId: `signal:economia:change:${item.indicatorId}:${item.fromYear}-${item.toYear}`,
    }));
}

// ECON_OFFICIAL_SHARE_SERIES_V1 indexa DerivedIndicator por ANO único (consumo direto da
// série oficial, sem cálculo de intervalo) — por isso um ChangeEvent aqui referencia os dois
// anos-extremidade (fromYear/toYear), nunca um período composto "fromYear-toYear" que não
// existe no catálogo (espelha o mesmo ajuste feito em detectOfficialShareChange, signals.ts).
function changeEventsFromPercentagePointChanges(territoryId: string, changes: ReturnType<typeof calculatePercentagePointChanges>, thresholdPp: number): ChangeEvent[] {
  return changes
    .filter((item) => Math.abs(item.changePp) >= thresholdPp)
    .map((item) => ({
      fromYear: item.fromYear,
      toYear: item.toYear,
      direction: item.changePp > 0 ? 'up' : 'down',
      evidenceRefs: [...item.evidenceRefs],
      derivedIndicatorRefs: [
        `derived:${territoryId}:${item.indicatorId}:ECON_OFFICIAL_SHARE_SERIES_V1:${item.fromYear}`,
        `derived:${territoryId}:${item.indicatorId}:ECON_OFFICIAL_SHARE_SERIES_V1:${item.toYear}`,
      ],
      rawSignalId: `signal:economia:change:${item.indicatorId}:${item.fromYear}-${item.toYear}`,
    }));
}

// ---------------------------------------------------------------------------
// Coverage / TemporalCoverage (seção 20/29 do gate INTEL-02B: preservar detalhe por
// família sem alterar o contrato canônico — extensão em economy/types.ts).
// ---------------------------------------------------------------------------

function familyAvailability(evidence: Evidence[], indicators: readonly string[]): DomainAvailability {
  if (indicators.length === 0) return 'unavailable';
  const present = indicators.filter((indicator) => evidenceExists(evidence, indicator));
  return present.length === 0 ? 'unavailable' : present.length === indicators.length ? 'available' : 'partial';
}

function buildCoverage(evidence: Evidence[], allIndicators: readonly string[]): Coverage {
  const availability = familyAvailability(evidence, allIndicators);
  const missingData = allIndicators
    .filter((indicator) => !evidenceExists(evidence, indicator))
    .map((indicator) => ({ domain: 'economia', period: 'N/A', fields: [indicator] }));
  return {
    byDomain: { economia: availability },
    domainsAvailable: availability === 'unavailable' ? 0 : 1,
    domainsExpected: 1,
    missingData,
  };
}

function familyPeriodRange(evidence: Evidence[], indicators: readonly string[]): { periodStart: string; periodEnd: string } | null {
  const years = evidence
    .filter((item) => indicators.includes(item.indicator))
    .map((item) => Number(item.period))
    .filter((year) => Number.isFinite(year) && String(year).length === 4);
  if (years.length === 0) return null;
  return { periodStart: String(Math.min(...years)), periodEnd: String(Math.max(...years)) };
}

function buildTemporalCoverage(evidence: Evidence[]): TemporalCoverage {
  const years = evidence.map((item) => Number(item.period)).filter((year) => Number.isFinite(year) && String(year).length === 4);
  if (years.length === 0) return { periodStart: 'N/A', periodEnd: 'N/A', referencePeriodLabel: 'Sem evidência com período anual reconhecível.', sourceReferencePeriods: { economia: null } };
  const periodStart = String(Math.min(...years));
  const periodEnd = String(Math.max(...years));
  return {
    periodStart,
    periodEnd,
    referencePeriodLabel: periodStart === periodEnd ? periodStart : `${periodStart}-${periodEnd}`,
    sourceReferencePeriods: { economia: periodEnd },
  };
}

// ---------------------------------------------------------------------------
// Orquestração principal
// ---------------------------------------------------------------------------

export function runEconomicIntelligenceEngine(territoryId: string, evidence: Evidence[], config: EconomyEngineConfig = {}): EconomicIntelligenceResult {
  if (!territoryId) throw new EconomyEngineError('INVALID_INPUT', 'territoryId ausente.');
  if (evidence.some((item) => item.territoryId !== territoryId)) throw new EconomyEngineError('INVALID_INPUT', 'evidence contém territoryId divergente do território solicitado.');
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const derivedIndicators: DerivedIndicator[] = [];
  const signals: AnalyticalSignal[] = [];
  const limitations: Limitation[] = [];
  const consolidatedSignals: ConsolidatedSignal[] = [];

  // --- FISCAL (ECO-01/SICONFI) — threshold CHANGE_YOY_THRESHOLD_PCT_FISCAL, inalterado desde INTEL-02.
  for (const indicator of cfg.fiscalMonetaryIndicators) {
    if (!evidenceExists(evidence, indicator)) {
      signals.push(insufficientEvidenceSignal(territoryId, indicator, `Nenhuma evidência disponível para ${indicator} — não é possível calcular variação nominal interanual.`));
      continue;
    }
    derivedIndicators.push(...toYoyDerivedIndicators(territoryId, indicator, evidence));
    const variations = calculateNominalYoyVariations(evidence, indicator);
    const threshold = ECON_THRESHOLDS.CHANGE_YOY_THRESHOLD_PCT_FISCAL.value;
    signals.push(...detectTrend(territoryId, variations, threshold));
    signals.push(...detectChange(territoryId, variations, threshold));
    signals.push(...detectAnomaly(territoryId, variations));
    consolidatedSignals.push(...consolidateChangeEvents(territoryId, 'FISCAL', indicator, changeEventsFromYoyVariations(territoryId, variations, threshold)));
  }

  // --- PIB_VAB_MONETARY (ECO-02B/IBGE) — threshold por indicador, pilot-calibrado (seção 10-13 do gate INTEL-02C).
  for (const indicator of cfg.activityMonetaryIndicators) {
    if (!evidenceExists(evidence, indicator)) {
      signals.push(insufficientEvidenceSignal(territoryId, indicator, `Nenhuma evidência disponível para ${indicator} — não é possível calcular variação nominal interanual.`));
      continue;
    }
    derivedIndicators.push(...toYoyDerivedIndicators(territoryId, indicator, evidence));
    const variations = calculateNominalYoyVariations(evidence, indicator);
    const threshold = pibVabChangeThresholdFor(indicator);
    signals.push(...detectTrend(territoryId, variations, threshold));
    signals.push(...detectChange(territoryId, variations, threshold));
    signals.push(...detectAnomaly(territoryId, variations));
    consolidatedSignals.push(...consolidateChangeEvents(territoryId, 'PIB_VAB_MONETARY', indicator, changeEventsFromYoyVariations(territoryId, variations, threshold)));
  }

  // --- OFFICIAL_SHARE (ECO-02B/IBGE) — consumo direto, mudança em p.p. CONCENTRATION agora exige
  // share>=threshold E distância ao segundo colocado (seção 17 do gate INTEL-02C) — por isso as
  // séries de TODOS os indicadores configurados são coletadas antes de detectar concentração uma
  // única vez (não mais por indicador isoladamente).
  const officialShareSeriesByIndicator: ReturnType<typeof officialShareSeries>[] = [];
  for (const indicator of cfg.officialShareIndicators) {
    if (!evidenceExists(evidence, indicator)) {
      signals.push(insufficientEvidenceSignal(territoryId, indicator, `Nenhuma evidência disponível para ${indicator} — participação setorial oficial indisponível.`));
      continue;
    }
    derivedIndicators.push(...toOfficialShareDerivedIndicators(territoryId, indicator, evidence));
    const series = officialShareSeries(evidence, indicator);
    officialShareSeriesByIndicator.push(series);
    const changes = calculatePercentagePointChanges(evidence, indicator);
    const thresholdPp = ECON_THRESHOLDS.CHANGE_PP_THRESHOLD_OFFICIAL_SHARE.value;
    signals.push(...detectOfficialShareTrend(territoryId, changes));
    signals.push(...detectOfficialShareChange(territoryId, changes));
    signals.push(...detectOfficialShareAttention(territoryId, series));
    consolidatedSignals.push(...consolidateChangeEvents(territoryId, 'OFFICIAL_SHARE', indicator, changeEventsFromPercentagePointChanges(territoryId, changes, thresholdPp)));
  }
  signals.push(...detectOfficialShareConcentration(territoryId, officialShareSeriesByIndicator));

  // --- Participação FISCAL calculada (ECON_SHARE_V1) — inalterado desde INTEL-02.
  for (const pair of cfg.sharePairs) {
    if (!evidenceExists(evidence, pair.numerator) || !evidenceExists(evidence, pair.denominator)) {
      signals.push(insufficientEvidenceSignal(territoryId, `${pair.numerator}-em-${pair.denominator}`, `Evidência insuficiente para calcular participação de ${pair.numerator} em ${pair.denominator}.`));
      continue;
    }
    derivedIndicators.push(...toShareDerivedIndicators(territoryId, pair, evidence));
    const shares = calculatePercentageShares(evidence, pair.numerator, pair.denominator);
    signals.push(...detectConcentration(territoryId, shares, ECON_THRESHOLDS.CONCENTRATION_SHARE_THRESHOLD_PCT_FISCAL.value));
    signals.push(...detectAttention(territoryId, shares));
  }

  if (cfg.pressurePair && evidenceExists(evidence, cfg.pressurePair.revenue) && evidenceExists(evidence, cfg.pressurePair.expense)) {
    const revenueVariations = calculateNominalYoyVariations(evidence, cfg.pressurePair.revenue);
    const expenseVariations = calculateNominalYoyVariations(evidence, cfg.pressurePair.expense);
    signals.push(...detectPressure(territoryId, revenueVariations, expenseVariations));
  }

  for (const pair of cfg.divergencePairs) {
    if (!evidenceExists(evidence, pair.a) || !evidenceExists(evidence, pair.b)) continue;
    const seriesA = calculateNominalYoyVariations(evidence, pair.a);
    const seriesB = calculateNominalYoyVariations(evidence, pair.b);
    signals.push(...detectDivergence(territoryId, seriesA, seriesB));
  }

  const allMonetaryAndShareIndicators = [...cfg.fiscalMonetaryIndicators, ...cfg.activityMonetaryIndicators, ...cfg.officialShareIndicators];
  const coverage = buildCoverage(evidence, allMonetaryAndShareIndicators);
  if (coverage.byDomain.economia === 'partial') limitations.push({ code: 'PARTIAL_COVERAGE', description: 'Cobertura parcial: nem todos os indicadores configurados possuem evidência disponível.', domain: 'economia' });

  const familyCoverage: Record<ThresholdFamily, DomainAvailability> = {
    FISCAL: familyAvailability(evidence, cfg.fiscalMonetaryIndicators),
    PIB_VAB_MONETARY: familyAvailability(evidence, cfg.activityMonetaryIndicators),
    OFFICIAL_SHARE: familyAvailability(evidence, cfg.officialShareIndicators),
    GENERAL: 'unavailable',
  };
  const temporalCoverageByFamily: EconomicIntelligenceResult['temporalCoverageByFamily'] = {
    FISCAL: familyPeriodRange(evidence, cfg.fiscalMonetaryIndicators),
    PIB_VAB_MONETARY: familyPeriodRange(evidence, cfg.activityMonetaryIndicators),
    OFFICIAL_SHARE: familyPeriodRange(evidence, cfg.officialShareIndicators),
  };
  const familyRangeEntries = (Object.entries(temporalCoverageByFamily) as Array<[keyof typeof temporalCoverageByFamily, { periodStart: string; periodEnd: string } | null]>).filter((entry): entry is [keyof typeof temporalCoverageByFamily, { periodStart: string; periodEnd: string }] => Boolean(entry[1]));
  const distinctRanges = new Set(familyRangeEntries.map(([, range]) => `${range.periodStart}-${range.periodEnd}`));
  if (distinctRanges.size > 1) {
    const description = familyRangeEntries.map(([family, range]) => `${family} ${range.periodStart}-${range.periodEnd}`).join(', ');
    limitations.push({ code: 'MULTI_PERIOD_COVERAGE', description: `Cobertura temporal difere por família: ${description} — nunca tratar como um único período simultâneo.`, domain: 'economia' });
  }

  const evidenceIndex = Object.fromEntries(evidence.map((item) => [item.id, item]));

  return {
    territoryId,
    engineVersion: ECONOMY_ENGINE_VERSION,
    derivedIndicators: [...derivedIndicators].sort((a, b) => a.id.localeCompare(b.id)),
    signals: deduplicateSignals(signals).sort(compareSignals),
    consolidatedSignals: [...consolidatedSignals].sort((a, b) => a.id.localeCompare(b.id)),
    coverage,
    coverageByFamily: familyCoverage,
    temporalCoverage: buildTemporalCoverage(evidence),
    temporalCoverageByFamily,
    limitations,
    methodology: { methodId: ECONOMY_ENGINE_VERSION, methodVersion: 'v1', description: 'Motor determinístico de indicadores derivados e sinais analíticos econômicos (FISCAL/ECO-01/SICONFI + PIB_VAB_MONETARY/OFFICIAL_SHARE/ECO-02B/IBGE), sem interpretação, LLM ou recomendação.' },
    evidenceIndex,
  };
}
