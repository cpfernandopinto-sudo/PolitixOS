/**
 * INTEL-03A — Seleção determinística de input para L4 (seções 2-11 do gate).
 *
 * DECISÃO DOCUMENTADA (seção 2 do gate): Raw Signals = audit trail/drill-down;
 * Consolidated Signals = input primário de L4 para o tipo CHANGE. Critério: todo
 * AnalyticalSignal CHANGE bruto é coberto por exatamente um ConsolidatedSignal
 * (INTEL-02C garante cobertura de 100%, inclusive sequências de tamanho 1 — ver
 * `consolidation.ts`), então enviar os dois seria redundância pura, não input
 * adicional. Para os demais tipos (TREND, PRESSURE, CONCENTRATION, DIVERGENCE,
 * ANOMALY, ATTENTION) não existe camada de consolidação — o Raw Signal É o input
 * primário porque é o único que existe. `constituentRawSignalRefs` preserva o
 * caminho de volta ao raw signal para quem quiser auditar/expandir (seção 55).
 *
 * Não usa `priority` (sempre null no motor econômico — seção 5). Severity ajuda a
 * ordenar mas não é regra única (seção 6-7): dentro de cada família, unidades são
 * ordenadas por severity e, para sequências consolidadas, por tamanho da sequência
 * (eventCount) — nunca por prioridade política, nunca por recência isolada (seção 75).
 */

import type { AnalyticalSignal, Coverage, DomainAvailability, Evidence, Limitation, TemporalCoverage } from '../contracts';
import type { ConsolidatedSignal } from '../economy/consolidation';
import { ECO01_MONETARY_INDICATORS, ECO02B_ACTIVITY_MONETARY_INDICATORS, ECO02B_OFFICIAL_SHARE_INDICATORS } from '../economy/engine';
import { ECON_THRESHOLDS, type CalibrationStatus, type ThresholdFamily } from '../economy/thresholds';
import type { EconomicIntelligenceResult } from '../economy/types';
import type { InterpretationInputContext, InterpretationUnit, SelectionPolicyMetadata } from './types';

export const INTEL_INPUT_SELECTION_V1_ID = 'INTEL_INPUT_SELECTION_V1' as const;

/** Máximo de unidades candidatas retidas por família após ANOMALY (seção 57 do gate — não arbitrário: ver justificativa no relatório INTEL-03A, avaliada contra os 3 municípios reais do INTEL-02C). */
const DEFAULT_MAX_UNITS_PER_FAMILY = 6;

const SELECTION_CRITERIA = [
  'ACTIVE only (nunca INSUFFICIENT_EVIDENCE)',
  'lineage completa (evidenceRefs/derivedIndicatorRefs resolvem)',
  'consolidated preferido sobre raw para CHANGE (não-redundância)',
  'ANOMALY sempre retida, sem cap por família',
  'diversidade de família via cap por família (nunca força família unavailable)',
  'severity + tamanho de sequência ordenam dentro da família, não decidem sozinhos',
] as const;

// ---------------------------------------------------------------------------
// Derivação de família a partir de um Raw Signal (ConsolidatedSignal já carrega
// `family` diretamente). Um Raw Signal não tem campo `family` no contrato canônico
// L3 (deliberado — L3 é cross-domain); esta é uma inferência read-only, específica
// da Economia, a partir do nome do indicador embutido em derivedIndicatorRefs.
// ---------------------------------------------------------------------------

function indicatorFromDerivedRef(ref: string): string | null {
  const parts = ref.split(':');
  return parts.length === 5 ? parts[2] : null;
}

function familyOfIndicator(indicator: string): ThresholdFamily {
  if ((ECO02B_OFFICIAL_SHARE_INDICATORS as readonly string[]).includes(indicator)) return 'OFFICIAL_SHARE';
  if ((ECO02B_ACTIVITY_MONETARY_INDICATORS as readonly string[]).includes(indicator)) return 'PIB_VAB_MONETARY';
  if ((ECO01_MONETARY_INDICATORS as readonly string[]).includes(indicator)) return 'FISCAL';
  // Participação FISCAL calculada (ECON_SHARE_V1) usa nome composto "numerador-em-denominador";
  // no catálogo padrão do motor, sharePairs só existe para a família FISCAL (seção 100 ECO-01/INTEL-02).
  if (indicator.includes('-em-')) return 'FISCAL';
  return 'GENERAL';
}

function deriveFamilyFromSignal(signal: AnalyticalSignal): ThresholdFamily {
  for (const ref of signal.derivedIndicatorRefs) {
    const indicator = indicatorFromDerivedRef(ref);
    if (indicator) return familyOfIndicator(indicator);
  }
  return 'GENERAL';
}

// ---------------------------------------------------------------------------
// Ordenação dentro da família (seção 6-7, 74-75 do gate).
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<string, number> = { HIGH: 0, MODERATE: 1, LOW: 2 };

function unitSeverityRank(unit: InterpretationUnit): number {
  if (unit.kind === 'RAW_SIGNAL') return SEVERITY_RANK[(unit.signal as AnalyticalSignal).severity ?? ''] ?? 3;
  return 1; // ConsolidatedSignal não carrega severity — tratado como MODERATE-equivalente, desempatado por eventCount abaixo.
}

function unitEventCount(unit: InterpretationUnit): number {
  return unit.kind === 'CONSOLIDATED_SIGNAL' ? (unit.signal as ConsolidatedSignal).eventCount : 1;
}

function compareUnitsForRetention(a: InterpretationUnit, b: InterpretationUnit): number {
  const severityDelta = unitSeverityRank(a) - unitSeverityRank(b);
  if (severityDelta !== 0) return severityDelta;
  const eventCountDelta = unitEventCount(b) - unitEventCount(a);
  if (eventCountDelta !== 0) return eventCountDelta;
  return a.id.localeCompare(b.id);
}

// ---------------------------------------------------------------------------
// Construção das unidades candidatas a partir do resultado real do motor.
// ---------------------------------------------------------------------------

function unitFromConsolidated(signal: ConsolidatedSignal): InterpretationUnit {
  return {
    kind: 'CONSOLIDATED_SIGNAL',
    id: signal.id,
    family: signal.family,
    signal,
    constituentRawSignalRefs: signal.constituentSignalRefs,
    evidenceRefs: signal.evidenceRefs,
    derivedIndicatorRefs: signal.derivedIndicatorRefs,
    period: `${signal.startPeriod}-${signal.endPeriod}`,
  };
}

function unitFromRaw(signal: AnalyticalSignal): InterpretationUnit {
  return {
    kind: 'RAW_SIGNAL',
    id: signal.id,
    family: deriveFamilyFromSignal(signal),
    signal,
    constituentRawSignalRefs: [signal.id],
    evidenceRefs: signal.evidenceRefs,
    derivedIndicatorRefs: signal.derivedIndicatorRefs,
    period: signal.period,
  };
}

function calibrationStatusOf(family: ThresholdFamily): CalibrationStatus | null {
  switch (family) {
    case 'FISCAL': return ECON_THRESHOLDS.CHANGE_YOY_THRESHOLD_PCT_FISCAL.calibration;
    case 'PIB_VAB_MONETARY': return ECON_THRESHOLDS.CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_STANDARD.calibration;
    case 'OFFICIAL_SHARE': return ECON_THRESHOLDS.CHANGE_PP_THRESHOLD_OFFICIAL_SHARE.calibration;
    default: return null;
  }
}

export interface SelectInterpretationInputOptions {
  maxUnitsPerFamily?: number;
  now?: () => string;
}

/**
 * Seleção determinística — mesmo `EconomicIntelligenceResult` de entrada produz
 * exatamente o mesmo `units`/`excludedUnitIds` (seção 92 do gate), independentemente
 * da ordem de `signals`/`consolidatedSignals` recebida (já ordenados deterministicamente
 * pelo motor, mas esta função não depende disso — reordena por conta própria).
 */
export function selectInterpretationInput(result: EconomicIntelligenceResult, options: SelectInterpretationInputOptions = {}): InterpretationInputContext {
  const maxUnitsPerFamily = options.maxUnitsPerFamily ?? DEFAULT_MAX_UNITS_PER_FAMILY;
  const now = options.now ?? (() => new Date().toISOString());

  const coveredRawIds = new Set(result.consolidatedSignals.flatMap((item) => item.constituentSignalRefs));
  const consolidatedUnits = result.consolidatedSignals.map(unitFromConsolidated);
  const orphanChangeUnits = result.signals
    .filter((signal) => signal.status === 'ACTIVE' && signal.type === 'CHANGE' && !coveredRawIds.has(signal.id))
    .map(unitFromRaw);
  const nonChangeUnits = result.signals
    .filter((signal) => signal.status === 'ACTIVE' && signal.type !== 'CHANGE')
    .map(unitFromRaw);

  const allCandidates = [...consolidatedUnits, ...orphanChangeUnits, ...nonChangeUnits];

  const byFamily = new Map<ThresholdFamily, InterpretationUnit[]>();
  for (const unit of allCandidates) {
    const bucket = byFamily.get(unit.family) ?? [];
    bucket.push(unit);
    byFamily.set(unit.family, bucket);
  }

  const selected: InterpretationUnit[] = [];
  const excluded: InterpretationUnit[] = [];
  for (const bucket of byFamily.values()) {
    const anomalies = bucket.filter((unit) => unit.kind === 'RAW_SIGNAL' && (unit.signal as AnalyticalSignal).type === 'ANOMALY');
    const rest = bucket.filter((unit) => !anomalies.includes(unit)).sort(compareUnitsForRetention);
    const keptRest = rest.slice(0, maxUnitsPerFamily);
    const droppedRest = rest.slice(maxUnitsPerFamily);
    selected.push(...anomalies, ...keptRest);
    excluded.push(...droppedRest);
  }
  selected.sort((a, b) => a.family.localeCompare(b.family) || a.id.localeCompare(b.id));

  const evidenceIds = new Set(selected.flatMap((unit) => unit.evidenceRefs));
  const evidenceIndex: Record<string, Evidence> = {};
  for (const id of evidenceIds) if (result.evidenceIndex[id]) evidenceIndex[id] = result.evidenceIndex[id];

  const familiesPresent = [...new Set(selected.map((unit) => unit.family))];
  const calibrationStatusByFamily: Partial<Record<ThresholdFamily, CalibrationStatus>> = {};
  for (const family of familiesPresent) {
    const status = calibrationStatusOf(family);
    if (status) calibrationStatusByFamily[family] = status;
  }

  const selectionPolicy: SelectionPolicyMetadata = { id: INTEL_INPUT_SELECTION_V1_ID, maxUnitsPerFamily, criteria: SELECTION_CRITERIA };

  const coverage: Coverage = result.coverage;
  const coverageByFamily: Record<ThresholdFamily, DomainAvailability> = result.coverageByFamily;
  const temporalCoverage: TemporalCoverage = result.temporalCoverage;
  const limitations: Limitation[] = result.limitations;

  return {
    mode: 'CLOSED_EVIDENCE',
    territoryId: result.territoryId,
    generatedAt: now(),
    selectionPolicy,
    units: selected,
    excludedUnitIds: excluded.map((unit) => unit.id),
    coverage,
    coverageByFamily,
    temporalCoverage,
    temporalCoverageByFamily: result.temporalCoverageByFamily,
    limitations,
    calibrationStatusByFamily,
    evidenceIndex,
    methodology: result.methodology,
  };
}
