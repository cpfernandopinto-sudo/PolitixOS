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
    // Fase 4 da auditoria: "comparáveis" para a UX nunca deve contar a pesquisa mais recente como
    // comparável consigo mesma — são as OUTRAS 2 que batem com ela.
    expect(metrics.comparableOtherPollsCount).toBe(2);
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
    expect(metrics.comparableOtherPollsCount).toBe(1);
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
    // Fase 4/5: MG tem só 1 pesquisa realmente comparável a si própria (mg2 fica de fora, cenários
    // fragmentados) — "Comparáveis" na UX deve mostrar 0, não 1.
    expect(metrics.comparableOtherPollsCount).toBe(0);
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

  it('TESTE OBRIGATÓRIO (Requisito 8) — impede contaminação entre cargos numa pesquisa multi-cargo', () => {
    const multiPoll = mockPoll('multi-1', {
      uf: 'DF',
      cargo: 'Governador, Senador',
      tseRegistrationNumber: 'DF078492026',
    });

    const allResults = [
      // Governador
      mockResult('r1', 'multi-1', 'Candidato A', 40.0, { poll: multiPoll, office: 'Governador', cenario: 'Cenário 1 — Governador' }),
      mockResult('r2', 'multi-1', 'Candidato B', 30.0, { poll: multiPoll, office: 'Governador', cenario: 'Cenário 1 — Governador' }),
      // Senador
      mockResult('r3', 'multi-1', 'Candidato C', 25.0, { poll: multiPoll, office: 'Senador', cenario: 'Cenário 1 — Senador' }),
      mockResult('r4', 'multi-1', 'Candidato D', 20.0, { poll: multiPoll, office: 'Senador', cenario: 'Cenário 1 — Senador' }),
    ];

    // Helper de filtragem idêntico ao do componente
    const matchesCargo = (r: ElectoralPollResultWithPoll, targetCargo: string) => {
      const target = targetCargo.toLowerCase().trim();
      if (r.office) {
        const resOffice = r.office.toLowerCase().trim();
        return resOffice.includes(target) || target.includes(resOffice);
      }
      return r.poll?.cargo ? r.poll.cargo.toLowerCase().includes(target) : true;
    };

    // 1. Filtro Governador
    const govResults = allResults.filter((r) => matchesCargo(r, 'Governador'));
    const govCandidates = getRaceCandidates(govResults);
    const govRanking = getCandidateRanking(govResults, multiPoll.id);

    expect(govCandidates).toEqual(['Candidato A', 'Candidato B']);
    expect(govRanking.realCandidates.map((c) => c.candidateName)).toEqual(['Candidato A', 'Candidato B']);
    expect(govRanking.realCandidates[0].percentage).toBe(40.0);
    expect(govRanking.realCandidates[1].percentage).toBe(30.0);
    expect(govCandidates.includes('Candidato C')).toBe(false);
    expect(govCandidates.includes('Candidato D')).toBe(false);

    // 2. Filtro Senador
    const senResults = allResults.filter((r) => matchesCargo(r, 'Senador'));
    const senCandidates = getRaceCandidates(senResults);
    const senRanking = getCandidateRanking(senResults, multiPoll.id);

    expect(senCandidates).toEqual(['Candidato C', 'Candidato D']);
    expect(senRanking.realCandidates.map((c) => c.candidateName)).toEqual(['Candidato C', 'Candidato D']);
    expect(senRanking.realCandidates[0].percentage).toBe(25.0);
    expect(senRanking.realCandidates[1].percentage).toBe(20.0);
    expect(senCandidates.includes('Candidato A')).toBe(false);
    expect(senCandidates.includes('Candidato B')).toBe(false);
  });

  it('valida alternância DF + Senador (Michelle 25%) vs DF + Governador (Celina 34%)', () => {
    const realTimePoll = mockPoll('rt-df', {
      uf: 'DF',
      cargo: 'Governador, Senador',
      tseRegistrationNumber: 'DF078492026',
      instituto: 'REAL TIME MIDIA LTDA',
    });

    const results = [
      // Scenario Governador
      mockResult('g1', 'rt-df', 'Celina Leão', 34.0, { poll: realTimePoll, office: 'Governador', cenario: 'Cenário 1 — Governador' }),
      mockResult('g2', 'rt-df', 'José Roberto Arruda', 22.0, { poll: realTimePoll, office: 'Governador', cenario: 'Cenário 1 — Governador' }),
      mockResult('g3', 'rt-df', 'Leandro Grass', 18.0, { poll: realTimePoll, office: 'Governador', cenario: 'Cenário 1 — Governador' }),

      // Scenario Senador
      mockResult('s1', 'rt-df', 'Michelle Bolsonaro', 25.0, { poll: realTimePoll, office: 'Senador', cenario: 'Cenário 1 — Senador' }),
      mockResult('s2', 'rt-df', 'Leila do Vôlei', 17.0, { poll: realTimePoll, office: 'Senador', cenario: 'Cenário 1 — Senador' }),
      mockResult('s3', 'rt-df', 'Bia Kicis', 15.0, { poll: realTimePoll, office: 'Senador', cenario: 'Cenário 1 — Senador' }),
      mockResult('s4', 'rt-df', 'Erika Kokay', 15.0, { poll: realTimePoll, office: 'Senador', cenario: 'Cenário 1 — Senador' }),
    ];

    const matchesCargo = (r: ElectoralPollResultWithPoll, targetCargo: string) => {
      const target = targetCargo.toLowerCase().trim();
      return r.office ? r.office.toLowerCase().includes(target) : r.poll?.cargo?.toLowerCase().includes(target) ?? true;
    };

    // Teste A: Senador
    const senadorSlice = results.filter((r) => matchesCargo(r, 'Senador'));
    const senadorMetrics = calculateCockpitMetrics([realTimePoll], senadorSlice);
    const senadorCandidates = getRaceCandidates(senadorSlice);

    expect(senadorMetrics.intencaoMaisRecente?.candidateName).toBe('Michelle Bolsonaro');
    expect(senadorMetrics.intencaoMaisRecente?.percentage).toBe(25.0);
    expect(senadorCandidates).toEqual(['Bia Kicis', 'Erika Kokay', 'Leila do Vôlei', 'Michelle Bolsonaro']);
    expect(senadorCandidates.includes('Celina Leão')).toBe(false);
    expect(senadorCandidates.includes('José Roberto Arruda')).toBe(false);

    // Teste B: Governador
    const govSlice = results.filter((r) => matchesCargo(r, 'Governador'));
    const govMetrics = calculateCockpitMetrics([realTimePoll], govSlice);
    const govCandidates = getRaceCandidates(govSlice);

    expect(govMetrics.intencaoMaisRecente?.candidateName).toBe('Celina Leão');
    expect(govMetrics.intencaoMaisRecente?.percentage).toBe(34.0);
    expect(govCandidates).toEqual(['Celina Leão', 'José Roberto Arruda', 'Leandro Grass']);
    expect(govCandidates.includes('Michelle Bolsonaro')).toBe(false);
  });

  it('TESTE OBRIGATÓRIO (Base de Pesquisas / PesquisasListView) — determina Líder Atual com filtro de office/cargo', () => {
    const realTimePoll = mockPoll('rt-df', {
      uf: 'DF',
      cargo: 'Governador, Senador',
      tseRegistrationNumber: 'DF078492026',
      instituto: 'REAL TIME MIDIA LTDA',
    });

    const allPollResults = [
      mockResult('g1', 'rt-df', 'Celina Leão', 34.0, { poll: realTimePoll, office: 'Governador', cenario: 'Cenário 1 — Governador' }),
      mockResult('g2', 'rt-df', 'José Roberto Arruda', 22.0, { poll: realTimePoll, office: 'Governador', cenario: 'Cenário 1 — Governador' }),
      mockResult('s1', 'rt-df', 'Michelle Bolsonaro', 25.0, { poll: realTimePoll, office: 'Senador', cenario: 'Cenário 1 — Senador' }),
      mockResult('s2', 'rt-df', 'Leila do Vôlei', 17.0, { poll: realTimePoll, office: 'Senador', cenario: 'Cenário 1 — Senador' }),
    ];

    const matchesCargo = (r: ElectoralPollResultWithPoll, targetCargo?: string | null) => {
      if (!targetCargo || targetCargo === 'all') return true;
      const target = targetCargo.toLowerCase().trim();
      if (r.office) {
        const resOffice = r.office.toLowerCase().trim();
        return resOffice.includes(target) || target.includes(resOffice);
      }
      return r.poll?.cargo ? r.poll.cargo.toLowerCase().includes(target) : true;
    };

    const getEnrichedLeader = (targetCargo: string) => {
      const filteredResults = allPollResults.filter((r) => matchesCargo(r, targetCargo));
      const ranking = getCandidateRanking(filteredResults, realTimePoll.id);
      return {
        leaderName: ranking.realCandidates[0]?.candidateName ?? null,
        leaderPct: ranking.realCandidates[0]?.percentage ?? null,
      };
    };

    // Governador => Celina Leão 34%
    const govEnriched = getEnrichedLeader('Governador');
    expect(govEnriched.leaderName).toBe('Celina Leão');
    expect(govEnriched.leaderPct).toBe(34.0);

    // Senador => Michelle Bolsonaro 25%
    const senEnriched = getEnrichedLeader('Senador');
    expect(senEnriched.leaderName).toBe('Michelle Bolsonaro');
    expect(senEnriched.leaderPct).toBe(25.0);
  });
});
