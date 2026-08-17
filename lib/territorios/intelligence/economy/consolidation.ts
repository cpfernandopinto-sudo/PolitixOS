/**
 * INTEL-02C — Consolidação determinística de sinais CHANGE consecutivos (seção 26-34 do gate).
 *
 * RAW ANALYTICAL DETECTION (AnalyticalSignal individual, ex.: "CHANGE 2019→2020")
 * vs.
 * CONSOLIDATED ANALYTICAL SIGNAL (sequência coerente, ex.: "CHANGE UP 2019→2022, eventCount=3").
 *
 * NÃO é interpretação (L4): "VAB industrial apresentou 4 mudanças consecutivas acima
 * do threshold entre 2019 e 2022" é uma descrição factual e reprodutível de uma
 * sequência de eventos já detectados — não uma leitura qualitativa nova.
 *
 * Os Raw Signals NUNCA são removidos da saída (seção 29 do gate) — a consolidação é
 * uma camada adicional em `EconomicIntelligenceResult.consolidatedSignals`.
 */

import type { ThresholdFamily } from './thresholds';

export const ECON_CONSOLIDATION_V1 = 'ECON_CONSOLIDATION_V1';

export interface ChangeEvent {
  fromYear: number;
  toYear: number;
  direction: 'up' | 'down';
  evidenceRefs: string[];
  /** Um ou mais DerivedIndicator.id — OFFICIAL_SHARE referencia 2 (fromYear/toYear); FISCAL/PIB_VAB referencia 1 (intervalo). */
  derivedIndicatorRefs: string[];
  rawSignalId: string;
}

export interface ConsolidatedSignal {
  id: string;
  territoryId: string;
  family: ThresholdFamily;
  indicator: string;
  signalType: 'CHANGE';
  direction: 'up' | 'down';
  startPeriod: string;
  endPeriod: string;
  eventCount: number;
  constituentSignalRefs: string[];
  derivedIndicatorRefs: string[];
  evidenceRefs: string[];
  methodId: typeof ECON_CONSOLIDATION_V1;
  methodVersion: 'v1';
}

/**
 * Agrupa eventos CHANGE consecutivos (mesmo território/família/indicador/direção,
 * toYear[i] === fromYear[i+1]) em sequências. Um evento isolado vira uma sequência de
 * eventCount=1 — cobertura uniforme de 100% dos CHANGE brutos, não apenas das sequências
 * de 2+ (seção 61 do gate: "1 evento" é um caso de teste explícito).
 * Determinístico independente da ordem de entrada (ordena por fromYear antes de agrupar).
 */
export function consolidateChangeEvents(
  territoryId: string,
  family: ThresholdFamily,
  indicator: string,
  events: ChangeEvent[],
): ConsolidatedSignal[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a.fromYear - b.fromYear);
  const runs: ChangeEvent[][] = [];
  let current: ChangeEvent[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = current.at(-1)!;
    if (sorted[i].fromYear === prev.toYear && sorted[i].direction === prev.direction) current.push(sorted[i]);
    else { runs.push(current); current = [sorted[i]]; }
  }
  runs.push(current);

  return runs.map((run) => {
    const startPeriod = String(run[0].fromYear);
    const endPeriod = String(run.at(-1)!.toYear);
    return {
      id: `consolidated:${territoryId}:${family}:${indicator}:CHANGE:${run[0].direction}:${startPeriod}-${endPeriod}`,
      territoryId,
      family,
      indicator,
      signalType: 'CHANGE',
      direction: run[0].direction,
      startPeriod,
      endPeriod,
      eventCount: run.length,
      constituentSignalRefs: run.map((event) => event.rawSignalId),
      derivedIndicatorRefs: [...new Set(run.flatMap((event) => event.derivedIndicatorRefs))],
      evidenceRefs: [...new Set(run.flatMap((event) => event.evidenceRefs))],
      methodId: ECON_CONSOLIDATION_V1,
      methodVersion: 'v1',
    };
  });
}
