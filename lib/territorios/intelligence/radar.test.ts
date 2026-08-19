import { describe, expect, it } from 'vitest';
import { buildTerritoryRadar } from './radar';
import { buildCagedFacts } from './economy/caged-facts';
import { buildCagedEmploymentSignals } from './economy/caged-employment-signals';
import type { CagedAdapterPoint } from './economy/caged-adapter';
import type { AnalyticalSignal } from './contracts';

function point(referenceMonth: string, balance: number): CagedAdapterPoint {
  return { referenceMonth, admissions: 1000, dismissals: 1000 - balance, balance, metadata: { aggregate_hash: `hash-${referenceMonth}` } };
}

const ACCELERATING_SERIES: CagedAdapterPoint[] = [
  point('202506', 50), point('202507', -20), point('202508', 10), point('202509', 40),
  point('202510', 30), point('202511', -10), point('202512', -200), point('202601', 20),
  point('202602', 60), point('202603', 80), point('202604', 100), point('202605', 300), point('202606', 700),
];

describe('buildTerritoryRadar — INTEL-DOMAIN-02 Missão F', () => {
  it('array de signals vazio produz radar vazio, sem erro', () => {
    expect(buildTerritoryRadar('t1', [])).toHaveLength(0);
  });

  it('cada item do radar nasce de um signal real, com headline igual ao title do signal (nunca texto genérico)', () => {
    const facts = buildCagedFacts('t1', ACCELERATING_SERIES);
    const signals = buildCagedEmploymentSignals('t1', facts);
    const radar = buildTerritoryRadar('t1', signals);
    expect(radar.length).toBe(signals.length);
    for (const item of radar) {
      const source = signals.find((s) => s.id === item.signalId)!;
      expect(item.headline).toBe(source.title);
      expect(item.evidenceRefs).toEqual(source.evidenceRefs);
      expect(item.id).toBe(`radar:${source.id}`);
    }
  });

  it('CASO NEGATIVO — signal com status diferente de ACTIVE nunca vira item de radar', () => {
    const insufficient: AnalyticalSignal = {
      id: 'signal:economia:employment_accelerating:t1:202606', territoryId: 't1', domains: ['economia'],
      type: 'TREND', priority: null, severity: null, title: 'x', summary: 'x', evidenceRefs: ['ev:1'],
      derivedIndicatorRefs: [], period: '202606', status: 'INSUFFICIENT_EVIDENCE', confidence: null, limitations: [],
      methodId: 'm', methodVersion: 'v1',
    };
    expect(buildTerritoryRadar('t1', [insufficient])).toHaveLength(0);
  });

  it('CASO NEGATIVO — signal ACTIVE mas sem evidenceRefs nunca vira item de radar (sem lastro)', () => {
    const noEvidence: AnalyticalSignal = {
      id: 'signal:economia:employment_accelerating:t1:202606', territoryId: 't1', domains: ['economia'],
      type: 'TREND', priority: null, severity: null, title: 'x', summary: 'x', evidenceRefs: [],
      derivedIndicatorRefs: [], period: '202606', status: 'ACTIVE', confidence: 'DIRECTLY_SUPPORTED', limitations: [],
      methodId: 'm', methodVersion: 'v1',
    };
    expect(buildTerritoryRadar('t1', [noEvidence])).toHaveLength(0);
  });
});
