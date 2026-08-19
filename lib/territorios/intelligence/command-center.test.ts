import { describe, expect, it } from 'vitest';
import { buildTerritoryExecutiveSignals } from './command-center';
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

describe('buildTerritoryExecutiveSignals — INTEL-DOMAIN-02 Missão D', () => {
  it('domínio com sinais reais fica AVAILABLE, com headline/direction/period/evidenceRefs reais', () => {
    const facts = buildCagedFacts('t1', ACCELERATING_SERIES);
    const economySignals = buildCagedEmploymentSignals('t1', facts);
    const result = buildTerritoryExecutiveSignals('t1', { economySignals, electoralSignals: [], securitySignals: [] });
    expect(result.economy.status).toBe('AVAILABLE');
    expect(result.economy.headline.length).toBeGreaterThan(0);
    expect(result.economy.evidenceRefs.length).toBeGreaterThan(0);
    expect(result.economy.period).toBe('202606');
    expect(result.economy.direction).toBe('RISING');
  });

  it('CASO NEGATIVO — domínio sem nenhum sinal fica INSUFFICIENT_DATA, nunca fabrica um headline', () => {
    const result = buildTerritoryExecutiveSignals('t1', { economySignals: [], electoralSignals: [], securitySignals: [] });
    expect(result.electoral.status).toBe('INSUFFICIENT_DATA');
    expect(result.electoral.confidence).toBeNull();
    expect(result.electoral.evidenceRefs).toEqual([]);
    expect(result.security.status).toBe('INSUFFICIENT_DATA');
  });

  it('CASO NEGATIVO — signal ACTIVE mas sem evidenceRefs é ignorado na seleção (nunca vira o "top signal")', () => {
    const orphan: AnalyticalSignal = {
      id: 'signal:economia:employment_accelerating:t1:202606', territoryId: 't1', domains: ['economia'],
      type: 'TREND', priority: null, severity: null, title: 'x', summary: 'x', evidenceRefs: [],
      derivedIndicatorRefs: [], period: '202606', status: 'ACTIVE', confidence: 'DIRECTLY_SUPPORTED', limitations: [],
      methodId: 'm', methodVersion: 'v1',
    };
    const result = buildTerritoryExecutiveSignals('t1', { economySignals: [orphan], electoralSignals: [], securitySignals: [] });
    expect(result.economy.status).toBe('INSUFFICIENT_DATA');
  });

  it('escolhe o signal do período mais recente quando há mais de um', () => {
    const facts = buildCagedFacts('t1', ACCELERATING_SERIES);
    const economySignals = buildCagedEmploymentSignals('t1', facts);
    const olderCopy = { ...economySignals[0], id: `${economySignals[0].id}:older`, period: '202601' };
    const result = buildTerritoryExecutiveSignals('t1', { economySignals: [olderCopy, ...economySignals], electoralSignals: [], securitySignals: [] });
    expect(result.economy.period).toBe('202606');
  });
});
