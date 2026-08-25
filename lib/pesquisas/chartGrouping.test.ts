import { describe, it, expect } from 'vitest';
import { buildCenarioPollGroups } from './chartGrouping';
import type { ElectoralPollResultWithPoll, ElectoralPoll } from './types';

function makePoll(overrides: Partial<ElectoralPoll> = {}): ElectoralPoll {
  return {
    id: 'poll-mg-jul',
    tseRegistrationNumber: 'MG034902026',
    source: 'TSE/PesqEle',
    sourceUrl: null,
    sourceDataset: 'pesquisas-eleitorais-2026',
    electionYear: 2026,
    uf: 'MG',
    municipio: null,
    cargo: 'Governador, Senador',
    abrangencia: 'MINAS GERAIS',
    instituto: 'QUAEST',
    contratante: null,
    pagante: null,
    valor: null,
    metodologia: null,
    dataRegistro: '2026-07-22',
    campoInicio: '2026-07-22',
    campoFim: '2026-07-26',
    amostra: 1482,
    margemErro: null,
    nivelConfianca: null,
    rawSourceRow: null,
    ingestedAt: '2026-08-19T00:00:00Z',
    createdAt: '2026-08-19T00:00:00Z',
    updatedAt: '2026-08-19T00:00:00Z',
    ...overrides,
  };
}

function makeResult(
  overrides: Partial<ElectoralPollResultWithPoll> & { candidateName: string; percentage: number; cenario: string },
  poll: ElectoralPoll
): ElectoralPollResultWithPoll {
  return {
    id: `${overrides.candidateName}-${overrides.cenario}`,
    pollId: poll.id,
    turno: 1,
    tipoPergunta: 'estimulada',
    office: 'Governador',
    resultType: 'STIMULATED',
    candidateId: null,
    sourceName: null,
    sourceUrl: null,
    sourceDate: null,
    collectedAt: '2026-08-19T00:00:00Z',
    provenance: {},
    verified: true,
    poll,
    ...overrides,
  };
}

describe('buildCenarioPollGroups', () => {
  it('CASO: mesma pesquisa/data com múltiplos cenários não mistura candidatos entre grupos', () => {
    const poll = makePoll();
    const results: ElectoralPollResultWithPoll[] = [
      makeResult({ candidateName: 'Cleitinho', percentage: 35, cenario: 'Cenário 1 (com Cleitinho)' }, poll),
      makeResult({ candidateName: 'Alexandre Kalil', percentage: 12, cenario: 'Cenário 1 (com Cleitinho)' }, poll),
      makeResult({ candidateName: 'Alexandre Kalil', percentage: 15, cenario: 'Cenário 4 (sem Cleitinho)' }, poll),
      makeResult({ candidateName: 'Patrus Ananias', percentage: 13, cenario: 'Cenário 4 (sem Cleitinho)' }, poll),
      makeResult({ candidateName: 'Cleitinho', percentage: 46, cenario: 'Cleitinho vs. Ananias' }, poll),
      makeResult({ candidateName: 'Patrus Ananias', percentage: 31, cenario: 'Cleitinho vs. Ananias' }, poll),
    ];

    const groups = buildCenarioPollGroups(results);

    // 3 cenários distintos da mesma pesquisa/data viram 3 grupos, nunca 1 só.
    expect(groups).toHaveLength(3);

    const cenario1 = groups.find((g) => g.cenario === 'Cenário 1 (com Cleitinho)')!;
    const cenario4 = groups.find((g) => g.cenario === 'Cenário 4 (sem Cleitinho)')!;
    const segundoTurno = groups.find((g) => g.cenario === 'Cleitinho vs. Ananias')!;

    // Cenário 4 (sem Cleitinho) nunca deve conter Cleitinho — grupos não se misturam.
    expect(cenario4.results.map((r) => r.candidateName)).not.toContain('Cleitinho');
    expect(cenario4.results.map((r) => r.candidateName).sort()).toEqual(['Alexandre Kalil', 'Patrus Ananias']);

    // Cenário 1 tem Cleitinho e Kalil, cada um com seu próprio percentual daquele cenário.
    expect(cenario1.results).toEqual(
      expect.arrayContaining([
        { candidateName: 'Cleitinho', percentage: 35 },
        { candidateName: 'Alexandre Kalil', percentage: 12 },
      ])
    );

    // 2º turno isolado, com seu próprio percentual (46), não herda o 35 do 1º turno.
    expect(segundoTurno.results).toEqual(
      expect.arrayContaining([
        { candidateName: 'Cleitinho', percentage: 46 },
        { candidateName: 'Patrus Ananias', percentage: 31 },
      ])
    );
  });

  it('CASO: mesmo candidato pode aparecer em cenários diferentes, mas nunca duplicado dentro do mesmo cenário', () => {
    const poll = makePoll();
    const results: ElectoralPollResultWithPoll[] = [
      makeResult({ candidateName: 'Cleitinho', percentage: 35, cenario: 'Cenário 1 (com Cleitinho)' }, poll),
      // Linha duplicada por engano na fonte: mesmo poll+cenario+candidato+office.
      makeResult({ candidateName: 'Cleitinho', percentage: 35, cenario: 'Cenário 1 (com Cleitinho)' }, poll),
      makeResult({ candidateName: 'Cleitinho', percentage: 46, cenario: 'Cleitinho vs. Ananias' }, poll),
    ];

    const groups = buildCenarioPollGroups(results);
    const cenario1 = groups.find((g) => g.cenario === 'Cenário 1 (com Cleitinho)')!;
    const segundoTurno = groups.find((g) => g.cenario === 'Cleitinho vs. Ananias')!;

    // Dentro do mesmo poll_id+cenario+office, Cleitinho aparece só 1 vez.
    expect(cenario1.results.filter((r) => r.candidateName === 'Cleitinho')).toHaveLength(1);
    // Mas ele pode legitimamente aparecer em outro cenário (2º turno), com outro percentual.
    expect(segundoTurno.results.filter((r) => r.candidateName === 'Cleitinho')).toHaveLength(1);
    expect(segundoTurno.results[0].percentage).toBe(46);
  });

  it('CASO: office isolation — mesmo cenário textual em offices diferentes não colide', () => {
    const poll = makePoll({ cargo: 'Governador, Senador' });
    const results: ElectoralPollResultWithPoll[] = [
      makeResult({ candidateName: 'Fulano', percentage: 20, cenario: 'Cenário 1', office: 'Governador' }, poll),
      makeResult({ candidateName: 'Fulano', percentage: 8, cenario: 'Cenário 1', office: 'Senador' }, poll),
    ];

    const groups = buildCenarioPollGroups(results);

    expect(groups).toHaveLength(2);
    const gov = groups.find((g) => g.office === 'Governador')!;
    const sen = groups.find((g) => g.office === 'Senador')!;
    expect(gov.results[0].percentage).toBe(20);
    expect(sen.results[0].percentage).toBe(8);
  });

  it('ignora resultados sem poll vinculado ou não-candidatos (branco/nulo/indecisos)', () => {
    const poll = makePoll();
    const results: ElectoralPollResultWithPoll[] = [
      makeResult({ candidateName: 'Cleitinho', percentage: 35, cenario: 'Cenário 1' }, poll),
      makeResult({ candidateName: 'Indecisos', percentage: 15, cenario: 'Cenário 1' }, poll),
      { ...makeResult({ candidateName: 'Fulano', percentage: 5, cenario: 'Cenário 1' }, poll), poll: null },
    ];

    const groups = buildCenarioPollGroups(results);
    expect(groups).toHaveLength(1);
    expect(groups[0].results.map((r) => r.candidateName)).toEqual(['Cleitinho']);
  });
});
