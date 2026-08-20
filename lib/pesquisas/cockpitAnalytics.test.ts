import { describe, it, expect } from 'vitest';
import type { ElectoralPoll, ElectoralPollResultWithPoll } from './types';
import {
  calculateCockpitMetrics,
  getCandidateRanking,
  getLatestResultPoll,
  getRaceCandidates,
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

describe('cockpitAnalytics.ts — PESQUISAS-03A Consistência de Dados e Testes Obrigatórios', () => {
  it('seleciona latestResultPoll (com resultado) mesmo se houver pesquisa registrada mais recente sem resultado', () => {
    const pollSemResultado = mockPoll('p-sem-resultado', { dataRegistro: '2026-04-01', instituto: 'INSTITUTO VERITA' });
    const pollComResultado = mockPoll('p-com-resultado', { dataRegistro: '2026-03-20', instituto: 'REAL TIME BIG DATA' });

    const result = mockResult('r1', 'p-com-resultado', 'Celina Leão', 34.0, { poll: pollComResultado });

    const latestResultPoll = getLatestResultPoll([result]);
    expect(latestResultPoll?.id).toBe('p-com-resultado');
    expect(latestResultPoll?.instituto).toBe('REAL TIME BIG DATA');

    // Métrica deve usar poll com resultado, não a sem resultado
    const metrics = calculateCockpitMetrics([pollSemResultado, pollComResultado], [result]);
    expect(metrics.intencaoMaisRecente?.instituto).toBe('REAL TIME BIG DATA');
    expect(metrics.intencaoMaisRecente?.candidateName).toBe('Celina Leão');
  });

  it('DF: 3 pesquisas comparáveis ativam a série histórica (hasSufficientSeries = true)', () => {
    const p1 = mockPoll('df1', { dataRegistro: '2026-03-20', instituto: 'Real Time' });
    const p2 = mockPoll('df2', { dataRegistro: '2026-03-15', instituto: 'Opinião' });
    const p3 = mockPoll('df3', { dataRegistro: '2026-03-10', instituto: 'Instituto Gazeta' });

    const results = [
      mockResult('r1', 'df1', 'Celina Leão', 34.0, { poll: p1 }),
      mockResult('r2', 'df1', 'José Roberto Arruda', 22.0, { poll: p1 }),

      mockResult('r3', 'df2', 'Celina Leão', 33.4, { poll: p2 }),
      mockResult('r4', 'df2', 'José Roberto Arruda', 23.7, { poll: p2 }),

      mockResult('r5', 'df3', 'Celina Leão', 32.4, { poll: p3 }),
      mockResult('r6', 'df3', 'José Roberto Arruda', 24.0, { poll: p3 }),
    ];

    const metrics = calculateCockpitMetrics([p1, p2, p3], results);

    expect(metrics.pesquisasComparaveisCount).toBe(3);
    expect(metrics.hasSufficientSeries).toBe(true);
    expect(metrics.intencaoMaisRecente?.percentage).toBe(34.0);
    expect(metrics.gapConcorrente?.gap).toBe(12.0); // 34 - 22
    expect(metrics.variacaoAnterior?.diff).toBe(0.6); // 34.0 - 33.4
  });

  it('Presidente: 2 pesquisas comparáveis ativam a série histórica (hasSufficientSeries = true)', () => {
    const p1 = mockPoll('br1', { uf: 'BR', cargo: 'Presidente', dataRegistro: '2026-03-20' });
    const p2 = mockPoll('br2', { uf: 'BR', cargo: 'Presidente', dataRegistro: '2026-03-10' });

    const results = [
      mockResult('r1', 'br1', 'Lula', 38.0, { poll: p1 }),
      mockResult('r2', 'br1', 'Flávio Bolsonaro', 31.0, { poll: p1 }),

      mockResult('r3', 'br2', 'Lula', 39.0, { poll: p2 }),
      mockResult('r4', 'br2', 'Flávio Bolsonaro', 30.0, { poll: p2 }),
    ];

    const metrics = calculateCockpitMetrics([p1, p2], results);

    expect(metrics.pesquisasComparaveisCount).toBe(2);
    expect(metrics.hasSufficientSeries).toBe(true);
  });

  it('MG: com pesquisas incompatíveis/fragmentadas, desativa a série histórica (hasSufficientSeries = false)', () => {
    const p1 = mockPoll('mg1', { uf: 'MG', cargo: 'Governador', dataRegistro: '2026-03-20' });
    const p2 = mockPoll('mg2', { uf: 'MG', cargo: 'Governador', dataRegistro: '2026-03-10' });

    // p2 tem cenários fragmentados (2 cenários no mesmo turno/tipoPergunta)
    const results = [
      mockResult('r1', 'mg1', 'Candidato A', 40.0, { poll: p1 }),
      mockResult('r1b', 'mg1', 'Candidato C', 20.0, { poll: p1 }),

      mockResult('r2', 'mg2', 'Candidato A', 38.0, { poll: p2, cenario: 'Cenário 1' }),
      mockResult('r3', 'mg2', 'Candidato B', 35.0, { poll: p2, cenario: 'Cenário 2' }),
    ];

    const metrics = calculateCockpitMetrics([p1, p2], results);

    expect(metrics.hasSufficientSeries).toBe(false);
    expect(metrics.variacaoAnterior).toBeNull();
  });

  it('exclui categorias não-candidato do ranking principal de liderança e do filtro de candidatos', () => {
    const p1 = mockPoll('p1');
    const r1 = mockResult('r1', 'p1', 'Celina Leão', 34.0, { poll: p1 });
    const r2 = mockResult('r2', 'p1', 'Branco/Nulo', 15.0, { poll: p1 });
    const r3 = mockResult('r3', 'p1', 'Indecisos', 10.0, { poll: p1 });

    const ranking = getCandidateRanking([r1, r2, r3]);

    expect(ranking.realCandidates.length).toBe(1);
    expect(ranking.realCandidates[0].candidateName).toBe('Celina Leão');

    expect(ranking.nonCandidates.length).toBe(2);

    const candidatesList = getRaceCandidates([r1, r2, r3]);
    expect(candidatesList).toEqual(['Celina Leão']);
  });
});
