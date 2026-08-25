import { describe, it, expect } from 'vitest';
import {
  calculateAnalyticalStatus,
  calculateScenarioSignals,
  generatePolitixInsight,
} from './analyticsEngine';
import type { CandidateRankingItem, ExecutiveCockpitMetrics, ElectoralPoll } from './types';

function mockRanking(): { realCandidates: CandidateRankingItem[]; nonCandidates: CandidateRankingItem[] } {
  return {
    realCandidates: [
      { candidateName: 'Celina Leão', percentage: 34.0, isLeader: true },
      { candidateName: 'José Roberto Arruda', percentage: 22.0, isLeader: false },
      { candidateName: 'Leandro Grass', percentage: 15.0, isLeader: false },
    ],
    nonCandidates: [
      { candidateName: 'Branco/Nulo', percentage: 14.0, isLeader: false },
      { candidateName: 'Indecisos', percentage: 15.0, isLeader: false },
    ],
  };
}

function mockMetrics(overrides: Partial<ExecutiveCockpitMetrics> = {}): ExecutiveCockpitMetrics {
  return {
    intencaoMaisRecente: { candidateName: 'Celina Leão', percentage: 34.0, pollDate: '2026-03-20', instituto: 'Real Time' },
    runnerUpResult: { candidateName: 'José Roberto Arruda', percentage: 22.0 },
    gapConcorrente: { gap: 12.0, leader: 'Celina Leão', runnerUp: 'José Roberto Arruda' },
    variacaoAnterior: { diff: 0.6, candidateName: 'Celina Leão', previousPollDate: '2026-03-15' },
    maximoPeriodo: { percentage: 34.0, candidateName: 'Celina Leão', pollDate: '2026-03-20' },
    minimoPeriodo: { percentage: 32.4, candidateName: 'Celina Leão', pollDate: '2026-03-10' },
    referenceCandidate: null,
    analyzedCandidateResult: null,
    totalPollsInSlice: 3,
    pollsWithResultsCount: 3,
    pesquisasComparaveisCount: 3,
    comparableOtherPollsCount: 2,
    trendPollsCount: 3,
    lastUpdateDate: '2026-03-20',
    hasSufficientSeries: true,
    leaderMovement: 'UP',
    runnerUpMovement: 'STABLE',
    gapBehavior: 'EXPANDING',
    volatility: 'BAIXA',
    instituteConsistency: 'CONVERGENTE',
    ...overrides,
  };
}

describe('analyticsEngine.ts — Testes do Engine Determinístico de Inteligência (PESQUISAS-04)', () => {
  it('retorna ESTÁVEL quando o líder possui vantagem confortável e estabilidade', () => {
    const ranking = mockRanking();
    const metrics = mockMetrics();

    const status = calculateAnalyticalStatus(ranking, metrics);
    expect(status.status).toBe('ESTÁVEL');
    expect(status.reason).toContain('Liderança consolidada');
  });

  it('retorna ATENÇÃO quando o líder oscila negativamente com margem estreita', () => {
    const ranking = {
      realCandidates: [
        { candidateName: 'Celina Leão', percentage: 30.0, isLeader: true },
        { candidateName: 'José Roberto Arruda', percentage: 27.0, isLeader: false },
      ],
      nonCandidates: [],
    };
    const metrics = mockMetrics({
      gapConcorrente: { gap: 3.0, leader: 'Celina Leão', runnerUp: 'José Roberto Arruda' },
      variacaoAnterior: { diff: -2.0, candidateName: 'Celina Leão', previousPollDate: '2026-03-15' },
    });

    const status = calculateAnalyticalStatus(ranking, metrics);
    expect(status.status).toBe('ATENÇÃO');
  });

  it('retorna CRÍTICO quando a distância cai drasticamente ou o vice-líder cola', () => {
    const ranking = {
      realCandidates: [
        { candidateName: 'Candidato A', percentage: 31.0, isLeader: true },
        { candidateName: 'Candidato B', percentage: 29.5, isLeader: false },
      ],
      nonCandidates: [],
    };
    const metrics = mockMetrics({
      gapConcorrente: { gap: 1.5, leader: 'Candidato A', runnerUp: 'Candidato B' },
      variacaoAnterior: { diff: -4.0, candidateName: 'Candidato A', previousPollDate: '2026-03-15' },
    });

    const status = calculateAnalyticalStatus(ranking, metrics, 'Candidato B');
    expect(status.status).toBe('CRÍTICO');
  });

  it('gera sinais determinísticos de crescimento, gap e estabilidade', () => {
    const ranking = mockRanking();
    const metrics = mockMetrics();

    const signals = calculateScenarioSignals(metrics, [], ranking);
    expect(signals.some((s) => s.type === 'growth')).toBe(true);
  });

  it('gera síntese executiva factual (Politix IA) sem opiniões subjetivas', () => {
    const ranking = mockRanking();
    const metrics = mockMetrics();
    const latestPoll: ElectoralPoll = {
      id: 'p1',
      tseRegistrationNumber: 'DF123',
      source: 'TSE',
      sourceUrl: null,
      sourceDataset: 'pesquisas-2026',
      electionYear: 2026,
      uf: 'DF',
      municipio: null,
      cargo: 'Governador',
      abrangencia: 'DF',
      instituto: 'Real Time Big Data',
      contratante: null,
      pagante: null,
      valor: null,
      metodologia: null,
      dataRegistro: '2026-03-20',
      campoInicio: null,
      campoFim: null,
      amostra: 1000,
      margemErro: 2.5,
      nivelConfianca: 95,
      ingestedAt: '2026-08-19T12:00:00Z',
      createdAt: '2026-08-19T12:00:00Z',
      updatedAt: '2026-08-19T12:00:00Z',
    };

    const insight = generatePolitixInsight('Governador — DF', metrics, latestPoll, [], ranking);

    expect(insight.fact).toContain('Celina Leão lidera');
    expect(insight.fact).toContain('34%');
    expect(insight.interpretation).toContain('Vantagem de 12 p.p.');
    expect(insight.supportingPollsCount).toBe(3);
  });
});
