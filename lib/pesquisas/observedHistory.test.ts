import { describe, it, expect } from 'vitest';
import { getObservedHistory } from './observedHistory';
import type { ElectoralPoll, ElectoralPollResultWithPoll } from './types';

function poll(id: string, overrides: Partial<ElectoralPoll> = {}): ElectoralPoll {
  return {
    id,
    tseRegistrationNumber: `REG-${id}`,
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

function res(
  overrides: Partial<ElectoralPollResultWithPoll> & { candidateName: string; percentage: number; cenario: string; pollId: string },
  pollObj: ElectoralPoll
): ElectoralPollResultWithPoll {
  return {
    id: `${overrides.pollId}-${overrides.candidateName}-${overrides.cenario}`,
    turno: 1,
    tipoPergunta: 'estimulada',
    office: 'Governador',
    resultType: 'STIMULATED',
    candidateId: null,
    sourceName: 'Genial/Quaest',
    sourceUrl: null,
    sourceDate: '2026-07-26',
    collectedAt: '2026-08-19T00:00:00Z',
    provenance: {},
    verified: true,
    poll: pollObj,
    ...overrides,
  };
}

describe('getObservedHistory — caso real MG034902026 (jul/26) + MG086462026 (abr/26)', () => {
  const julho = poll('mg-jul', { dataRegistro: '2026-07-22', campoInicio: '2026-07-22', campoFim: '2026-07-26' });
  const abril = poll('mg-abr', { dataRegistro: '2026-04-22', campoInicio: '2026-04-22', campoFim: '2026-04-26' });

  const results: ElectoralPollResultWithPoll[] = [
    // Julho — 1º turno, 2 cenários (com/sem Cleitinho)
    res({ pollId: 'mg-jul', candidateName: 'Cleitinho', percentage: 35, cenario: 'Cenário 1 (com Cleitinho)' }, julho),
    res({ pollId: 'mg-jul', candidateName: 'Alexandre Kalil', percentage: 12, cenario: 'Cenário 1 (com Cleitinho)' }, julho),
    res({ pollId: 'mg-jul', candidateName: 'Alexandre Kalil', percentage: 15, cenario: 'Cenário 4 (sem Cleitinho)' }, julho),
    // Julho — 2º turno (fora do escopo "1º turno" que o chamador tipicamente filtraria antes)
    res({ pollId: 'mg-jul', candidateName: 'Cleitinho', percentage: 46, cenario: 'Cleitinho vs. Kalil', turno: 2 }, julho),
    // Abril — 1º turno, 3 cenários pareados
    res({ pollId: 'mg-abr', candidateName: 'Cleitinho', percentage: 30, cenario: 'Cenário 1 (Cleitinho x Kalil x Pacheco)' }, abril),
    res({ pollId: 'mg-abr', candidateName: 'Cleitinho', percentage: 35, cenario: 'Cenário 2 (Cleitinho x Pacheco)' }, abril),
    res({ pollId: 'mg-abr', candidateName: 'Cleitinho', percentage: 37, cenario: 'Cenário 3 (Cleitinho x Kalil)' }, abril),
  ];

  it('inclui TODOS os pontos, mesmo os não comparáveis — nunca esconde', () => {
    const history = getObservedHistory(results, 'Cleitinho');
    expect(history.points).toHaveLength(5); // 35 (jul c/), 46 (jul 2ºT), 30/35/37 (abr)
  });

  it('marca a pesquisa mais recente (julho, Cenário 1 com Cleitinho) como REFERENCIA', () => {
    const history = getObservedHistory(results, 'Cleitinho');
    const ref = history.points.find((p) => p.pollId === 'mg-jul' && p.cenario === 'Cenário 1 (com Cleitinho)');
    expect(ref?.comparability).toBe('REFERENCIA');
    expect(history.referencePollId).toBe('mg-jul');
    expect(history.referenceCenario).toBe('Cenário 1 (com Cleitinho)');
  });

  it('marca os cenários de abril como NAO_COMPARAVEL (conjuntos de candidatos diferentes do cenário de referência)', () => {
    const history = getObservedHistory(results, 'Cleitinho');
    const abrilPoints = history.points.filter((p) => p.pollId === 'mg-abr');
    expect(abrilPoints).toHaveLength(3);
    for (const p of abrilPoints) {
      expect(p.comparability).toBe('NAO_COMPARAVEL');
    }
  });

  it('marca o 2º turno de julho como NAO_COMPARAVEL ao cenário de referência de 1º turno', () => {
    const history = getObservedHistory(results, 'Cleitinho');
    const segundoTurno = history.points.find((p) => p.turno === 2);
    expect(segundoTurno?.comparability).toBe('NAO_COMPARAVEL');
    expect(segundoTurno?.comparabilityReason).toMatch(/turno/i);
  });

  it('faixa observada (min/max) reflete TODOS os pontos do candidato, não só os comparáveis', () => {
    const history = getObservedHistory(results, 'Cleitinho');
    expect(history.minPercentage).toBe(30);
    expect(history.maxPercentage).toBe(46);
  });

  it('faixa observada só de 1º turno/estimulada, quando o chamador já filtrou por turno antes de passar os resultados', () => {
    const soTurno1 = results.filter((r) => r.turno === 1);
    const history = getObservedHistory(soTurno1, 'Cleitinho');
    expect(history.minPercentage).toBe(30);
    expect(history.maxPercentage).toBe(37);
  });

  it('sem candidateName, retorna pontos de todos os candidatos reais', () => {
    const history = getObservedHistory(results);
    expect(history.points.some((p) => p.candidateName === 'Alexandre Kalil')).toBe(true);
    expect(history.points.some((p) => p.candidateName === 'Cleitinho')).toBe(true);
  });

  it('sem resultados → estrutura vazia, nunca erro', () => {
    const history = getObservedHistory([], 'Cleitinho');
    expect(history.points).toEqual([]);
    expect(history.referencePollId).toBeNull();
    expect(history.minPercentage).toBeNull();
  });
});
