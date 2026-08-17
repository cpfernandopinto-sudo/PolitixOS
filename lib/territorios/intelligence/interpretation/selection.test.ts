import { describe, expect, it } from 'vitest';
import type { AnalyticalSignal } from '../contracts';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import type { InterpretationUnit } from './types';

function raw(unit: InterpretationUnit): AnalyticalSignal {
  return unit.signal as AnalyticalSignal;
}

describe('selectInterpretationInput — INTEL_INPUT_SELECTION_V1', () => {
  const result = buildFixtureEconomicIntelligenceResult();

  it('nunca inclui um raw CHANGE já coberto por um ConsolidatedSignal (não-redundância, seção 2/4)', () => {
    const context = selectInterpretationInput(result);
    const coveredRawIds = new Set(result.consolidatedSignals.flatMap((item) => item.constituentSignalRefs));
    const rawChangeUnitIds = context.units.filter((unit) => unit.kind === 'RAW_SIGNAL' && raw(unit).type === 'CHANGE').map((unit) => unit.id);
    for (const id of rawChangeUnitIds) expect(coveredRawIds.has(id)).toBe(false);
  });

  it('inclui ConsolidatedSignal como unidade para CHANGE (input primário)', () => {
    const context = selectInterpretationInput(result);
    const consolidatedUnits = context.units.filter((unit) => unit.kind === 'CONSOLIDATED_SIGNAL');
    expect(consolidatedUnits.length).toBeGreaterThan(0);
  });

  it('retém ANOMALY sempre, independente do cap por família (seção 4)', () => {
    const context = selectInterpretationInput(result, { maxUnitsPerFamily: 1 });
    const anomalyUnits = context.units.filter((unit) => unit.kind === 'RAW_SIGNAL' && raw(unit).type === 'ANOMALY');
    const anomalyInResult = result.signals.filter((signal) => signal.type === 'ANOMALY' && signal.status === 'ACTIVE');
    expect(anomalyUnits.length).toBe(anomalyInResult.length);
  });

  it('nunca seleciona sinal INSUFFICIENT_EVIDENCE', () => {
    const context = selectInterpretationInput(result);
    for (const unit of context.units) {
      if (unit.kind === 'RAW_SIGNAL') expect(raw(unit).status).toBe('ACTIVE');
    }
  });

  it('cap por família é respeitado para unidades não-ANOMALY', () => {
    const context = selectInterpretationInput(result, { maxUnitsPerFamily: 2 });
    const byFamily = new Map<string, number>();
    for (const unit of context.units) {
      const isAnomaly = unit.kind === 'RAW_SIGNAL' && raw(unit).type === 'ANOMALY';
      if (isAnomaly) continue;
      byFamily.set(unit.family, (byFamily.get(unit.family) ?? 0) + 1);
    }
    for (const count of byFamily.values()) expect(count).toBeLessThanOrEqual(2);
  });

  it('nunca força diversidade contra família unavailable (seção 8)', () => {
    const context = selectInterpretationInput(result);
    expect(context.coverageByFamily.GENERAL).toBe('unavailable');
    expect(context.units.some((unit) => unit.family === 'GENERAL')).toBe(false);
  });

  it('coverage/temporalCoverage/limitations nunca são escondidos (seção 9-10)', () => {
    const context = selectInterpretationInput(result);
    expect(context.coverage).toEqual(result.coverage);
    expect(context.coverageByFamily).toEqual(result.coverageByFamily);
    expect(context.temporalCoverage).toEqual(result.temporalCoverage);
    expect(context.temporalCoverageByFamily).toEqual(result.temporalCoverageByFamily);
    expect(context.limitations).toEqual(result.limitations);
  });

  it('preserva calibration status por família, nunca "national" travestido (seção 11)', () => {
    const context = selectInterpretationInput(result);
    expect(context.calibrationStatusByFamily.FISCAL).toBe('CALIBRATED');
    expect(context.calibrationStatusByFamily.PIB_VAB_MONETARY).toBe('THRESHOLD_PILOT_CALIBRATED');
    expect(context.calibrationStatusByFamily.OFFICIAL_SHARE).toBe('THRESHOLD_PILOT_CALIBRATED');
  });

  it('evidenceIndex contém apenas evidência referenciada pelas unidades selecionadas (compressão, seção 53)', () => {
    const context = selectInterpretationInput(result);
    const referenced = new Set(context.units.flatMap((unit) => unit.evidenceRefs));
    expect(Object.keys(context.evidenceIndex).sort()).toEqual([...referenced].sort());
  });

  it('determinístico: mesmo EconomicIntelligenceResult produz o mesmo conjunto de unidades (seção 92)', () => {
    const contextA = selectInterpretationInput(result, { now: () => '2026-01-01T00:00:00Z' });
    const contextB = selectInterpretationInput(result, { now: () => '2026-01-01T00:00:00Z' });
    expect(contextA).toEqual(contextB);
  });

  it('determinístico independente da ordem de signals/consolidatedSignals de entrada (seção 93)', () => {
    const shuffled = { ...result, signals: [...result.signals].reverse(), consolidatedSignals: [...result.consolidatedSignals].reverse() };
    const contextOriginal = selectInterpretationInput(result, { now: () => '2026-01-01T00:00:00Z' });
    const contextShuffled = selectInterpretationInput(shuffled, { now: () => '2026-01-01T00:00:00Z' });
    expect(contextShuffled.units).toEqual(contextOriginal.units);
    expect(contextShuffled.excludedUnitIds.sort()).toEqual(contextOriginal.excludedUnitIds.sort());
  });

  it('unidade insuficiente (sem sinais elegíveis) produz contexto com units vazio, não erro', () => {
    const empty = { ...result, signals: result.signals.map((signal) => ({ ...signal, status: 'INSUFFICIENT_EVIDENCE' as const })), consolidatedSignals: [] };
    const context = selectInterpretationInput(empty);
    expect(context.units).toHaveLength(0);
  });

  it('política de seleção é versionada e viaja com o contexto (seção 7)', () => {
    const context = selectInterpretationInput(result);
    expect(context.selectionPolicy.id).toBe('INTEL_INPUT_SELECTION_V1');
    expect(context.selectionPolicy.criteria.length).toBeGreaterThan(0);
  });
});
