import { describe, it, expect } from 'vitest';
import {
  calculateAnalyticalStatus,
  calculateScenarioSignals,
  deriveTrendStatus,
  generateDiagnosticoPolitix,
} from './analyticsEngine';
import type { ObservedHistoryResult } from './observedHistory';
import type { CandidateRankingItem, ExecutiveCockpitMetrics } from './types';

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
    intencaoMaisRecente: { candidateName: 'Celina Leão', percentage: 34.0, pollDate: '2026-03-20', instituto: 'Real Time', cenario: 'Cenário 1', tseRegistrationNumber: 'DF078492026' },
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

  it('P0.4 da auditoria MG/Governador: sem série comparável (0 pares), retorna INCONCLUSIVO — nunca ESTÁVEL por ausência de evidência', () => {
    const ranking = mockRanking();
    const metrics = mockMetrics({
      hasSufficientSeries: false,
      variacaoAnterior: null,
      comparableOtherPollsCount: 0,
      pollsWithResultsCount: 2,
    });

    const status = calculateAnalyticalStatus(ranking, metrics);
    expect(status.status).toBe('INCONCLUSIVO');
    expect(status.status).not.toBe('ESTÁVEL');
    expect(status.reason).toContain('não há levantamentos metodologicamente comparáveis suficientes');
  });

  it('sem série comparável, o vice-líder colado ainda dispara CRÍTICO (gap não depende de série temporal)', () => {
    const ranking = {
      realCandidates: [
        { candidateName: 'Candidato A', percentage: 31.0, isLeader: true },
        { candidateName: 'Candidato B', percentage: 29.5, isLeader: false },
      ],
      nonCandidates: [],
    };
    const metrics = mockMetrics({
      hasSufficientSeries: false,
      variacaoAnterior: null,
      gapConcorrente: { gap: 1.5, leader: 'Candidato A', runnerUp: 'Candidato B' },
    });

    const status = calculateAnalyticalStatus(ranking, metrics, 'Candidato B');
    expect(status.status).toBe('CRÍTICO');
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

  it('deriveTrendStatus: INCONCLUSIVA sem série comparável, mesmo com resultados históricos existentes (caso MG)', () => {
    const metrics = mockMetrics({ hasSufficientSeries: false, variacaoAnterior: null, pollsWithResultsCount: 2 });
    const trend = deriveTrendStatus(metrics);
    expect(trend.status).toBe('INCONCLUSIVA');
    expect(trend.reason).toContain('Existem resultados históricos');
  });

  it('deriveTrendStatus: INCONCLUSIVA com motivo diferente quando não há nenhum resultado', () => {
    const metrics = mockMetrics({ hasSufficientSeries: false, variacaoAnterior: null, pollsWithResultsCount: 0 });
    const trend = deriveTrendStatus(metrics);
    expect(trend.status).toBe('INCONCLUSIVA');
    expect(trend.reason).toContain('Ainda não há resultados integrados');
  });

  it('deriveTrendStatus: CRESCIMENTO/QUEDA/ESTABILIDADE só com série suficiente, mesmo threshold de leaderMovement (±0.5pp)', () => {
    const crescendo = mockMetrics({ hasSufficientSeries: true, variacaoAnterior: { diff: 2.0, candidateName: 'Celina Leão', previousPollDate: '2026-03-15' } });
    expect(deriveTrendStatus(crescendo).status).toBe('CRESCIMENTO');

    const caindo = mockMetrics({ hasSufficientSeries: true, variacaoAnterior: { diff: -1.5, candidateName: 'Celina Leão', previousPollDate: '2026-03-15' } });
    expect(deriveTrendStatus(caindo).status).toBe('QUEDA');

    const estavel = mockMetrics({ hasSufficientSeries: true, variacaoAnterior: { diff: 0.2, candidateName: 'Celina Leão', previousPollDate: '2026-03-15' } });
    expect(deriveTrendStatus(estavel).status).toBe('ESTABILIDADE');
  });

  it('generateDiagnosticoPolitix: caso real MG/Cleitinho — FATO nunca inventa número, TENDÊNCIA reflete deriveTrendStatus', () => {
    const metrics = mockMetrics({
      intencaoMaisRecente: { candidateName: 'Cleitinho', percentage: 35, pollDate: '2026-07-22', instituto: 'QUAEST', cenario: 'Cenário 1 (com Cleitinho)', tseRegistrationNumber: 'MG034902026' },
      runnerUpResult: { candidateName: 'Alexandre Kalil', percentage: 12 },
      gapConcorrente: { gap: 23, leader: 'Cleitinho', runnerUp: 'Alexandre Kalil' },
      hasSufficientSeries: false,
      variacaoAnterior: null,
      referenceCandidate: null,
      analyzedCandidateResult: null,
    });
    const observedHistory: ObservedHistoryResult = {
      points: [],
      referencePollId: 'mg-jul',
      referenceCenario: 'Cenário 1 (com Cleitinho)',
      minPercentage: 30,
      maxPercentage: 37,
    };

    const diag = generateDiagnosticoPolitix(metrics, observedHistory);

    expect(diag.fatos).toEqual([
      'Cleitinho lidera a pesquisa de referência com 35%.',
      'Alexandre Kalil aparece em segundo com 12%.',
      'A vantagem atual é de 23 p.p.',
      'Os resultados observados de Cleitinho estão entre 30% e 37%.',
    ]);
    expect(diag.trend.status).toBe('INCONCLUSIVA');
    expect(diag.interpretacao.join(' ')).toContain('não há levantamentos metodologicamente comparáveis');
  });

  it('generateDiagnosticoPolitix: candidato analisado não-líder usa distância até o líder, não até o 2º', () => {
    const metrics = mockMetrics({
      intencaoMaisRecente: { candidateName: 'Cleitinho', percentage: 35, pollDate: '2026-07-22', instituto: 'QUAEST', cenario: 'Cenário 1 (com Cleitinho)', tseRegistrationNumber: 'MG034902026' },
      referenceCandidate: 'Alexandre Kalil',
      analyzedCandidateResult: { candidateName: 'Alexandre Kalil', percentage: 12, rank: 2, gapToLeader: 23 },
      hasSufficientSeries: false,
      variacaoAnterior: null,
    });
    const diag = generateDiagnosticoPolitix(metrics, { points: [], referencePollId: null, referenceCenario: null, minPercentage: null, maxPercentage: null });

    expect(diag.fatos[0]).toContain('Alexandre Kalil ocupa a 2ª posição com 12%');
    expect(diag.fatos[1]).toContain('a 23 p.p. de distância');
  });

  it('generateDiagnosticoPolitix: sem nenhum resultado, nunca inventa fato', () => {
    // Invariante real de calculateCockpitMetrics: sem intencaoMaisRecente, hasSufficientSeries
    // também é sempre false (early-return de "results.length === 0") — reproduzido aqui.
    const metrics = mockMetrics({
      intencaoMaisRecente: null,
      runnerUpResult: null,
      gapConcorrente: null,
      hasSufficientSeries: false,
      variacaoAnterior: null,
    });
    const diag = generateDiagnosticoPolitix(metrics, { points: [], referencePollId: null, referenceCenario: null, minPercentage: null, maxPercentage: null });
    expect(diag.fatos[0]).toContain('Ainda não há resultados');
    expect(diag.trend.status).toBe('INCONCLUSIVA');
  });

  it('gera sinais determinísticos de crescimento, gap e estabilidade', () => {
    const ranking = mockRanking();
    const metrics = mockMetrics();

    const signals = calculateScenarioSignals(metrics, [], ranking);
    expect(signals.some((s) => s.type === 'growth')).toBe(true);
  });

});
