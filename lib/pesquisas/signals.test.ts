import { describe, expect, it } from 'vitest';
import { deriveElectoralSignals } from './signals';
import type { ExecutiveCockpitMetrics, CandidateRankingItem } from './types';

function baseMetrics(overrides: Partial<ExecutiveCockpitMetrics> = {}): ExecutiveCockpitMetrics {
  return {
    intencaoMaisRecente: { candidateName: 'Cleitinho Azevedo', percentage: 34, pollDate: '2026-08-01', instituto: 'X' },
    runnerUpResult: { candidateName: 'Kalil', percentage: 30 },
    referenceCandidate: null,
    analyzedCandidateResult: null,
    gapConcorrente: { gap: 4, leader: 'Cleitinho Azevedo', runnerUp: 'Kalil' },
    variacaoAnterior: null,
    maximoPeriodo: null,
    minimoPeriodo: null,
    totalPollsInSlice: 3,
    pollsWithResultsCount: 3,
    pesquisasComparaveisCount: 2,
    comparableOtherPollsCount: 1,
    trendPollsCount: 2,
    lastUpdateDate: '2026-08-01',
    hasSufficientSeries: true,
    leaderMovement: 'STABLE',
    runnerUpMovement: 'STABLE',
    gapBehavior: 'STABLE',
    volatility: 'BAIXA',
    instituteConsistency: 'CONVERGENTE',
    ...overrides,
  };
}

const ranking = (names: string[]): CandidateRankingItem[] =>
  names.map((n, i) => ({ candidateName: n, percentage: 40 - i * 5, isLeader: i === 0 }));

describe('deriveElectoralSignals — sinais determinísticos sobre métricas já calculadas', () => {
  it('LOW_CONFIDENCE_DATA quando série insuficiente', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics({ hasSufficientSeries: false, pesquisasComparaveisCount: 0 }),
      currentRanking: ranking(['Cleitinho Azevedo']),
      previousRanking: null,
      instituteComparison: [],
      marginOfErrorPct: null,
    });
    expect(signals.map((s) => s.type)).toContain('LOW_CONFIDENCE_DATA');
  });

  it('POLL_RISE com tier RELEVANTE quando diferença excede a margem de erro conhecida', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics({ variacaoAnterior: { diff: 3, candidateName: 'Cleitinho Azevedo', previousPollDate: '2026-07-01' } }),
      currentRanking: ranking(['Cleitinho Azevedo', 'Kalil']),
      previousRanking: ranking(['Cleitinho Azevedo', 'Kalil']),
      instituteComparison: [],
      marginOfErrorPct: 2.2,
    });
    const rise = signals.find((s) => s.type === 'POLL_RISE');
    expect(rise?.movementTier).toBe('RELEVANTE');
  });

  it('POLL_DROP com tier CONSISTENTE quando diferença NÃO excede a margem de erro (ou margem desconhecida)', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics({ variacaoAnterior: { diff: -1, candidateName: 'Cleitinho Azevedo', previousPollDate: '2026-07-01' } }),
      currentRanking: ranking(['Cleitinho Azevedo', 'Kalil']),
      previousRanking: ranking(['Cleitinho Azevedo', 'Kalil']),
      instituteComparison: [],
      marginOfErrorPct: null,
    });
    const drop = signals.find((s) => s.type === 'POLL_DROP');
    expect(drop?.movementTier).toBe('CONSISTENTE');
  });

  it('movementTier nunca é RELEVANTE com 1 única leitura (OBSERVADO), mesmo com margem de erro conhecida', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics({
        trendPollsCount: 1,
        variacaoAnterior: { diff: 10, candidateName: 'Cleitinho Azevedo', previousPollDate: null },
      }),
      currentRanking: ranking(['Cleitinho Azevedo']),
      previousRanking: null,
      instituteComparison: [],
      marginOfErrorPct: 2,
    });
    const rise = signals.find((s) => s.type === 'POLL_RISE');
    expect(rise?.movementTier).toBe('OBSERVADO');
  });

  it('LEAD_CHANGE quando o líder muda entre a pesquisa atual e a anterior comparável', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics({ gapConcorrente: { gap: 2, leader: 'Kalil', runnerUp: 'Cleitinho Azevedo' } }),
      currentRanking: ranking(['Kalil', 'Cleitinho Azevedo']),
      previousRanking: ranking(['Cleitinho Azevedo', 'Kalil']),
      instituteComparison: [],
      marginOfErrorPct: null,
    });
    expect(signals.some((s) => s.type === 'LEAD_CHANGE' && s.candidateName === 'Kalil')).toBe(true);
  });

  it('sem LEAD_CHANGE quando o líder é o mesmo nas duas leituras', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics(),
      currentRanking: ranking(['Cleitinho Azevedo', 'Kalil']),
      previousRanking: ranking(['Cleitinho Azevedo', 'Kalil']),
      instituteComparison: [],
      marginOfErrorPct: null,
    });
    expect(signals.some((s) => s.type === 'LEAD_CHANGE')).toBe(false);
  });

  it('GAP_OPENING quando gapBehavior=EXPANDING', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics({ gapBehavior: 'EXPANDING' }),
      currentRanking: ranking(['Cleitinho Azevedo', 'Kalil']),
      previousRanking: null,
      instituteComparison: [],
      marginOfErrorPct: null,
    });
    expect(signals.some((s) => s.type === 'GAP_OPENING')).toBe(true);
  });

  it('GAP_CLOSING quando gapBehavior=NARROWING', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics({ gapBehavior: 'NARROWING' }),
      currentRanking: ranking(['Cleitinho Azevedo', 'Kalil']),
      previousRanking: null,
      instituteComparison: [],
      marginOfErrorPct: null,
    });
    expect(signals.some((s) => s.type === 'GAP_CLOSING')).toBe(true);
  });

  it('HIGH_VOLATILITY quando volatility=ALTA', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics({ volatility: 'ALTA' }),
      currentRanking: ranking(['Cleitinho Azevedo']),
      previousRanking: null,
      instituteComparison: [],
      marginOfErrorPct: null,
    });
    expect(signals.some((s) => s.type === 'HIGH_VOLATILITY')).toBe(true);
  });

  it('STABLE_LEAD quando líder estável e gap não estreitando', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics({ leaderMovement: 'STABLE', gapBehavior: 'STABLE' }),
      currentRanking: ranking(['Cleitinho Azevedo', 'Kalil']),
      previousRanking: null,
      instituteComparison: [],
      marginOfErrorPct: null,
    });
    expect(signals.some((s) => s.type === 'STABLE_LEAD')).toBe(true);
  });

  it('INSTITUTE_DIVERGENCE quando instituteConsistency=DIVERGENTE', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics({ instituteConsistency: 'DIVERGENTE' }),
      currentRanking: ranking(['Cleitinho Azevedo']),
      previousRanking: null,
      instituteComparison: [{ institute: 'X', pollId: 'p1', registrationNumber: 'MG1', fieldDate: null, sampleSize: null, cenario: 'c', results: [] }],
      marginOfErrorPct: null,
    });
    expect(signals.some((s) => s.type === 'INSTITUTE_DIVERGENCE')).toBe(true);
  });

  it('sem série suficiente e sem variação → apenas LOW_CONFIDENCE_DATA, nenhum sinal inventado', () => {
    const signals = deriveElectoralSignals({
      metrics: baseMetrics({
        hasSufficientSeries: false,
        variacaoAnterior: null,
        gapBehavior: 'UNAVAILABLE',
        volatility: 'UNAVAILABLE',
        instituteConsistency: 'UNAVAILABLE',
        leaderMovement: 'UNAVAILABLE',
      }),
      currentRanking: ranking(['Cleitinho Azevedo']),
      previousRanking: null,
      instituteComparison: [],
      marginOfErrorPct: null,
    });
    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe('LOW_CONFIDENCE_DATA');
  });
});
