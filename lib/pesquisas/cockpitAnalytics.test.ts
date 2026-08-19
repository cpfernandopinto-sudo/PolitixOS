import { describe, it, expect } from 'vitest';
import type { ElectoralPoll, ElectoralPollResultWithPoll } from './types';
import {
  calculateCockpitMetrics,
  getCandidateRanking,
  getInstituteComparisonPoints,
} from './cockpitAnalytics';

function mockPoll(id: string, overrides: Partial<ElectoralPoll> = {}): ElectoralPoll {
  return {
    id,
    tseRegistrationNumber: `REG-${id}`,
    source: 'TSE/PesqEle',
    sourceUrl: 'https://tse.jus.br',
    sourceDataset: 'pesquisas-eleitorais-2026',
    electionYear: 2026,
    uf: 'DF',
    municipio: null,
    cargo: 'Governador',
    abrangencia: 'DISTRITO FEDERAL',
    instituto: 'DATA TEMPO',
    contratante: null,
    pagante: null,
    valor: 100000,
    metodologia: 'Survey quantitativo',
    dataRegistro: '2026-03-20',
    campoInicio: '2026-03-15',
    campoFim: '2026-03-18',
    amostra: 1500,
    margemErro: 2.5,
    nivelConfianca: 95,
    ingestedAt: '2026-08-19T12:00:00Z',
    createdAt: '2026-08-19T12:00:00Z',
    updatedAt: '2026-08-19T12:00:00Z',
    ...overrides,
  };
}

function mockResult(id: string, pollId: string, candidateName: string, percentage: number, overrides: Partial<ElectoralPollResultWithPoll> = {}): ElectoralPollResultWithPoll {
  return {
    id,
    pollId,
    cenario: 'Cenário 1',
    turno: 1,
    tipoPergunta: 'estimulada',
    candidateName,
    percentage,
    office: 'Governador',
    resultType: 'STIMULATED',
    candidateId: null,
    sourceName: 'TSE',
    sourceUrl: null,
    sourceDate: '2026-03-20',
    collectedAt: '2026-08-19T12:00:00Z',
    provenance: {},
    verified: true,
    ...overrides,
  };
}

describe('cockpitAnalytics.ts — Métricas do Cockpit Executivo', () => {
  it('retorna métricas nulas e "Sem histórico suficiente" quando não há resultados no banco', () => {
    const polls = [mockPoll('p1')];
    const metrics = calculateCockpitMetrics(polls, []);

    expect(metrics.intencaoMaisRecente).toBeNull();
    expect(metrics.gapConcorrente).toBeNull();
    expect(metrics.variacaoAnterior).toBeNull();
    expect(metrics.maximoPeriodo).toBeNull();
    expect(metrics.minimoPeriodo).toBeNull();
    expect(metrics.hasSufficientSeries).toBe(false);
    expect(metrics.pesquisasComparaveisCount).toBe(1);
  });

  it('calcula intenção mais recente e gap para o concorrente com 1 pesquisa', () => {
    const p1 = mockPoll('p1');
    const r1 = mockResult('r1', 'p1', 'Celina Leão', 35.0, { poll: p1 });
    const r2 = mockResult('r2', 'p1', 'Arruda', 28.5, { poll: p1 });

    const metrics = calculateCockpitMetrics([p1], [r1, r2]);

    expect(metrics.intencaoMaisRecente?.candidateName).toBe('Celina Leão');
    expect(metrics.intencaoMaisRecente?.percentage).toBe(35.0);
    expect(metrics.gapConcorrente?.gap).toBe(6.5);
    expect(metrics.gapConcorrente?.leader).toBe('Celina Leão');
    expect(metrics.gapConcorrente?.runnerUp).toBe('Arruda');
    // Variação e máximo/mínimo devem ser NULL pois há apenas 1 pesquisa (não há série histórica)
    expect(metrics.variacaoAnterior).toBeNull();
    expect(metrics.hasSufficientSeries).toBe(false);
  });

  it('calcula variação anterior e máximo/mínimo quando existem 2 pesquisas comparáveis', () => {
    const p1 = mockPoll('p1', { dataRegistro: '2026-03-20' });
    const p2 = mockPoll('p2', { dataRegistro: '2026-03-10' });

    const r1 = mockResult('r1', 'p1', 'Celina Leão', 38.0, { poll: p1 });
    const r2 = mockResult('r2', 'p1', 'Arruda', 25.0, { poll: p1 });

    const r3 = mockResult('r3', 'p2', 'Celina Leão', 32.0, { poll: p2 });
    const r4 = mockResult('r4', 'p2', 'Arruda', 27.0, { poll: p2 });

    const metrics = calculateCockpitMetrics([p1, p2], [r1, r2, r3, r4]);

    expect(metrics.hasSufficientSeries).toBe(true);
    expect(metrics.variacaoAnterior?.diff).toBe(6.0); // 38.0 - 32.0
    expect(metrics.variacaoAnterior?.candidateName).toBe('Celina Leão');
    expect(metrics.maximoPeriodo?.percentage).toBe(38.0);
    expect(metrics.minimoPeriodo?.percentage).toBe(32.0);
  });

  it('ordena o ranking de candidatos por percentual decrescente', () => {
    const p1 = mockPoll('p1');
    const r1 = mockResult('r1', 'p1', 'Arruda', 25.0, { poll: p1 });
    const r2 = mockResult('r2', 'p1', 'Celina Leão', 35.0, { poll: p1 });

    const ranking = getCandidateRanking([r1, r2]);

    expect(ranking[0].candidateName).toBe('Celina Leão');
    expect(ranking[0].isLeader).toBe(true);
    expect(ranking[1].candidateName).toBe('Arruda');
    expect(ranking[1].isLeader).toBe(false);
  });

  it('agrupa pontos de comparação entre institutos', () => {
    const p1 = mockPoll('p1', { instituto: 'Instituto A' });
    const p2 = mockPoll('p2', { instituto: 'Instituto B' });

    const r1 = mockResult('r1', 'p1', 'Celina Leão', 34.0, { poll: p1 });
    const r2 = mockResult('r2', 'p2', 'Celina Leão', 36.0, { poll: p2 });

    const comparison = getInstituteComparisonPoints([r1, r2]);

    expect(comparison.length).toBe(2);
    expect(comparison.map((c) => c.institute)).toContain('Instituto A');
    expect(comparison.map((c) => c.institute)).toContain('Instituto B');
  });
});

describe('cockpitAnalytics.ts — PESQUISAS-03: nunca misturar cenários incompatíveis (caso MG)', () => {
  it('pesquisa com 2 cenários no mesmo turno/tipo de pergunta (ex.: "com Cleitinho"/"sem Cleitinho") não entra em hasSufficientSeries mesmo tendo par de pesquisas com mesmo cargo/abrangência', () => {
    const pJulho = mockPoll('julho', { dataRegistro: '2026-07-28' });
    const pAbril = mockPoll('abril', { dataRegistro: '2026-04-28' });

    const julhoComCleitinho = [
      mockResult('r1', 'julho', 'Cleitinho', 35.0, { poll: pJulho, cenario: 'Cenário 1 (com Cleitinho)' }),
      mockResult('r2', 'julho', 'Kalil', 12.0, { poll: pJulho, cenario: 'Cenário 1 (com Cleitinho)' }),
    ];
    const julhoSemCleitinho = [
      mockResult('r3', 'julho', 'Kalil', 15.0, { poll: pJulho, cenario: 'Cenário 4 (sem Cleitinho)' }),
      mockResult('r4', 'julho', 'Indecisos', 27.0, { poll: pJulho, cenario: 'Cenário 4 (sem Cleitinho)' }),
    ];
    const abril = [
      mockResult('r5', 'abril', 'Cleitinho', 30.0, { poll: pAbril, cenario: 'Cenário 1' }),
      mockResult('r6', 'abril', 'Kalil', 14.0, { poll: pAbril, cenario: 'Cenário 1' }),
    ];

    const metrics = calculateCockpitMetrics([pJulho, pAbril], [...julhoComCleitinho, ...julhoSemCleitinho, ...abril]);

    // Julho tem 2 cenários no mesmo turno/tipo de pergunta -> fragmentado -> excluído da série,
    // mesmo Abril (sozinho, sem fragmentação) sendo elegível — nunca chega a 2 pesquisas comparáveis.
    expect(metrics.hasSufficientSeries).toBe(false);
    expect(metrics.variacaoAnterior).toBeNull();
    expect(metrics.pesquisasComparaveisCount).toBe(1);
  });

  it('líder/gap nunca mistura percentuais de dois cenários da mesma pesquisa (nunca escolhe "representante" entre eles)', () => {
    const pJulho = mockPoll('julho', { dataRegistro: '2026-07-28' });
    const results = [
      mockResult('r1', 'julho', 'Cleitinho', 35.0, { poll: pJulho, cenario: 'Cenário 1 (com Cleitinho)' }),
      mockResult('r2', 'julho', 'Kalil', 12.0, { poll: pJulho, cenario: 'Cenário 1 (com Cleitinho)' }),
      // "sem Cleitinho" tem Indecisos mais alto que qualquer candidato do cenário "com Cleitinho" —
      // se o código somar tudo teria Indecisos(27) como 2º colocado, cruzando dois cenários distintos.
      mockResult('r3', 'julho', 'Kalil', 15.0, { poll: pJulho, cenario: 'Cenário 4 (sem Cleitinho)' }),
      mockResult('r4', 'julho', 'Indecisos', 27.0, { poll: pJulho, cenario: 'Cenário 4 (sem Cleitinho)' }),
    ];

    const metrics = calculateCockpitMetrics([pJulho], results);

    // Líder/gap devem vir só do primeiro cenário encontrado (Cenário 1) — nunca misturar com o Cenário 4.
    expect(metrics.intencaoMaisRecente?.candidateName).toBe('Cleitinho');
    expect(metrics.intencaoMaisRecente?.percentage).toBe(35.0);
    expect(metrics.gapConcorrente?.runnerUp).toBe('Kalil');
    expect(metrics.gapConcorrente?.gap).toBe(23.0); // 35 - 12, nunca 35 - 27 (Indecisos do outro cenário)
  });

  it('ranking de uma pesquisa ativa nunca mistura 2 cenários dela mesma (caso MG "com/sem Cleitinho")', () => {
    const pJulho = mockPoll('julho');
    const results = [
      mockResult('r1', 'julho', 'Cleitinho', 35.0, { poll: pJulho, cenario: 'Cenário 1 (com Cleitinho)' }),
      mockResult('r2', 'julho', 'Kalil', 12.0, { poll: pJulho, cenario: 'Cenário 1 (com Cleitinho)' }),
      mockResult('r3', 'julho', 'Kalil', 15.0, { poll: pJulho, cenario: 'Cenário 4 (sem Cleitinho)' }),
      mockResult('r4', 'julho', 'Indecisos', 27.0, { poll: pJulho, cenario: 'Cenário 4 (sem Cleitinho)' }),
    ];

    const ranking = getCandidateRanking(results, 'julho');

    // Só o Cenário 1 (o primeiro encontrado) entra no ranking — 2 itens, não 4
    expect(ranking).toHaveLength(2);
    expect(ranking.map((r) => r.candidateName).sort()).toEqual(['Cleitinho', 'Kalil']);
  });

  it('ranking nunca marca uma categoria não-candidato (Indecisos/Branco/Nulo) como líder', () => {
    const p1 = mockPoll('p1');
    const results = [
      mockResult('r1', 'p1', 'Indecisos', 40.0, { poll: p1 }),
      mockResult('r2', 'p1', 'Celina Leão', 35.0, { poll: p1 }),
    ];

    const ranking = getCandidateRanking(results);

    const indecisos = ranking.find((r) => r.candidateName === 'Indecisos');
    const celina = ranking.find((r) => r.candidateName === 'Celina Leão');
    expect(indecisos?.isLeader).toBe(false);
    expect(celina?.isLeader).toBe(true);
  });

  it('comparação entre institutos nunca colapsa 2 cenários da mesma pesquisa numa única célula — vira uma linha por cenário', () => {
    const pAbril = mockPoll('abril', { instituto: 'Genial/Quaest' });
    const results = [
      mockResult('r1', 'abril', 'Cleitinho', 30.0, { poll: pAbril, cenario: 'Cenário 1' }),
      mockResult('r2', 'abril', 'Cleitinho', 35.0, { poll: pAbril, cenario: 'Cenário 2' }),
      mockResult('r3', 'abril', 'Cleitinho', 37.0, { poll: pAbril, cenario: 'Cenário 3' }),
    ];

    const comparison = getInstituteComparisonPoints(results);

    // 3 cenários distintos -> 3 linhas, nunca 1 linha com um valor "vencedor" arbitrário
    expect(comparison).toHaveLength(3);
    const percentages = comparison.map((c) => c.results.find((r) => r.candidateName === 'Cleitinho')?.percentage).sort();
    expect(percentages).toEqual([30.0, 35.0, 37.0]);
  });
});
