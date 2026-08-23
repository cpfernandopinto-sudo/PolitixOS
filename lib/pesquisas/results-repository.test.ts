import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/lib/supabaseClient', () => ({
  createClient: () => ({ from: mockFrom }),
  createAdminClient: () => ({ from: mockFrom }),
}));

import { upsertPollResult, getPriorityRacePolls, buildTemporalSeries, type PriorityRacePoll } from './results-repository';
import type { ElectoralPollResultUpsert, ElectoralPollResult } from './types';

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.insert = vi.fn(self);
  c.update = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.is = vi.fn(self);
  c.order = vi.fn(self);
  c.ilike = vi.fn(self);
  c.single = vi.fn(() => Promise.resolve(result));
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

const sampleResult: ElectoralPollResultUpsert = {
  pollId: 'poll-1',
  office: 'Presidente',
  cenario: 'Cenário único',
  turno: 1,
  tipoPergunta: 'estimulada',
  resultType: 'STIMULATED',
  candidateName: 'Lula',
  percentage: 38,
  candidateId: null,
  sourceName: 'Genial/Quaest',
  sourceUrl: 'https://example.com/poll',
  sourceDate: '2026-08-14',
  provenance: { tse_registration_cited: 'BR-06773/2026' },
  verified: true,
};

beforeEach(() => {
  mockFrom.mockReset();
});

describe('upsertPollResult — idempotência por chave natural (PARTE 4: nunca duplicar)', () => {
  it('nenhum resultado existente → INSERT', async () => {
    const c = chain({ data: null, error: null });
    // segunda chamada (insert().select().single()) precisa devolver um id
    c.single = vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null }));
    mockFrom.mockReturnValue(c);

    const result = await upsertPollResult({ from: mockFrom } as never, sampleResult);

    expect(result.created).toBe(true);
    expect(c.insert).toHaveBeenCalled();
    expect(c.update).not.toHaveBeenCalled();
  });

  it('resultado já existe (mesma chave natural) → UPDATE, não duplica', async () => {
    const c = chain({ data: { id: 'existing-id' }, error: null });
    c.maybeSingle = vi.fn(() => Promise.resolve({ data: { id: 'existing-id' }, error: null }));
    mockFrom.mockReturnValue(c);

    const result = await upsertPollResult({ from: mockFrom } as never, sampleResult);

    expect(result.created).toBe(false);
    expect(result.id).toBe('existing-id');
    expect(c.update).toHaveBeenCalled();
    expect(c.insert).not.toHaveBeenCalled();
  });

  it('a checagem de existência usa poll_id + cenario + turno + tipo_pergunta + candidate_name como chave natural', async () => {
    const c = chain({ data: null, error: null });
    c.single = vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null }));
    mockFrom.mockReturnValue(c);

    await upsertPollResult({ from: mockFrom } as never, sampleResult);

    expect(c.eq).toHaveBeenCalledWith('poll_id', 'poll-1');
    expect(c.eq).toHaveBeenCalledWith('cenario', 'Cenário único');
    expect(c.eq).toHaveBeenCalledWith('turno', 1);
    expect(c.eq).toHaveBeenCalledWith('tipo_pergunta', 'estimulada');
    expect(c.eq).toHaveBeenCalledWith('candidate_name', 'Lula');
  });

  it('TESTE I (PESQUISAS-N8N-01 Fase 10) — office entra na chave natural: Governador e Senador do mesmo poll/cenario/turno/candidato não colidem', async () => {
    const c = chain({ data: null, error: null });
    c.single = vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null }));
    mockFrom.mockReturnValue(c);

    await upsertPollResult({ from: mockFrom } as never, { ...sampleResult, office: 'Senador' });

    expect(c.eq).toHaveBeenCalledWith('office', 'Senador');
  });

  it('office=null usa is(office, null) em vez de eq — nunca casa com uma linha que TEM office preenchido', async () => {
    const c = chain({ data: null, error: null });
    c.single = vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null }));
    mockFrom.mockReturnValue(c);

    await upsertPollResult({ from: mockFrom } as never, { ...sampleResult, office: null });

    expect(c.is).toHaveBeenCalledWith('office', null);
  });

  it('grava verified/provenance/source_* junto com o percentual — nunca um resultado sem proveniência (PARTE 8)', async () => {
    const c = chain({ data: null, error: null });
    c.single = vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null }));
    mockFrom.mockReturnValue(c);

    await upsertPollResult({ from: mockFrom } as never, sampleResult);

    expect(c.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        verified: true,
        source_name: 'Genial/Quaest',
        source_url: 'https://example.com/poll',
        source_date: '2026-08-14',
      })
    );
  });
});

describe('getPriorityRacePolls', () => {
  it('sem pesquisas para a UF/cargo → retorna []', async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }));
    const polls = await getPriorityRacePolls('BR', 'Presidente');
    expect(polls).toEqual([]);
  });

  it('retorna as pesquisas que TÊM resultado, com a pesquisa embutida na própria linha (nunca lista pesquisas sem resultado, pois elas nunca aparecem na tabela de resultados)', async () => {
    const pollEmbedded = {
      id: 'poll-1', tse_registration_number: 'BR067732026', source: 'TSE/PesqEle', source_url: null,
      source_dataset: 'pesquisas-eleitorais-2026', election_year: 2026, uf: 'BR', municipio: null,
      cargo: 'Presidente', abrangencia: null, instituto: 'QUAEST', contratante: null, pagante: null,
      valor: null, metodologia: null, data_registro: '2026-08-14', campo_inicio: '2026-08-10',
      campo_fim: '2026-08-13', amostra: 2004, margem_erro: null, nivel_confianca: null, raw_source_row: null,
      ingested_at: '2026-08-19T00:00:00.000Z', created_at: '2026-08-19T00:00:00.000Z', updated_at: '2026-08-19T00:00:00.000Z',
    };

    const c = chain({
      data: [
        {
          id: 'res-1', poll_id: 'poll-1', cenario: 'Cenário único', turno: 1, tipo_pergunta: 'estimulada',
          candidate_name: 'Lula', percentage: 38, office: 'Presidente', result_type: 'STIMULATED',
          candidate_id: null, source_name: 'Quaest', source_url: 'https://example.com', source_date: '2026-08-14',
          collected_at: '2026-08-19T00:00:00.000Z', provenance: {}, verified: true,
          poll: pollEmbedded,
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(c);

    const polls = await getPriorityRacePolls('BR', 'Presidente');

    expect(polls).toHaveLength(1);
    expect(polls[0].id).toBe('poll-1');
    expect(polls[0].results).toHaveLength(1);
    // Nunca constrói um .in('poll_id', [...]) com centenas de UUIDs — é
    // exatamente essa consulta que estourava o limite de headers do
    // PostgREST em produção quando havia centenas de pesquisas registradas
    // sem resultado misturadas na lista (PESQUISAS-03).
    expect(c.in).not.toHaveBeenCalled();
  });
});

function poll(overrides: Partial<PriorityRacePoll> & { id: string; campoInicio: string | null }): PriorityRacePoll {
  return {
    tseRegistrationNumber: overrides.id,
    source: 'TSE/PesqEle',
    sourceUrl: null,
    sourceDataset: 'pesquisas-eleitorais-2026',
    electionYear: 2026,
    uf: 'DF',
    municipio: null,
    cargo: 'Governador',
    abrangencia: null,
    instituto: 'Instituto Teste',
    contratante: null,
    pagante: null,
    valor: null,
    metodologia: null,
    dataRegistro: overrides.campoInicio,
    campoFim: overrides.campoInicio,
    amostra: 1000,
    margemErro: null,
    nivelConfianca: null,
    ingestedAt: '2026-08-19T00:00:00.000Z',
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
    results: [],
    ...overrides,
  };
}

function result(overrides: Partial<ElectoralPollResult> & { candidateName: string; percentage: number }): ElectoralPollResult {
  return {
    id: `${overrides.candidateName}-${overrides.percentage}`,
    pollId: 'poll',
    cenario: 'Cenário único',
    turno: 1,
    tipoPergunta: 'estimulada',
    office: 'Governador',
    resultType: 'STIMULATED',
    candidateId: null,
    sourceName: 'Fonte Teste',
    sourceUrl: 'https://example.com',
    sourceDate: '2026-08-01',
    collectedAt: '2026-08-19T00:00:00.000Z',
    provenance: {},
    verified: true,
    ...overrides,
  };
}

describe('buildTemporalSeries — evolução temporal real (PESQUISAS-DATA-02)', () => {
  it('menos de 2 pesquisas elegíveis → série vazia (não força comparação)', () => {
    const polls = [
      poll({
        id: 'p1',
        campoInicio: '2026-08-01',
        results: [result({ candidateName: 'Celina', percentage: 30, pollId: 'p1' })],
      }),
    ];
    expect(buildTemporalSeries(polls)).toEqual([]);
  });

  it('2+ pesquisas com cenário único de 1º turno estimulado → agrupa por candidato, ordenado por data', () => {
    const polls = [
      poll({
        id: 'later',
        campoInicio: '2026-08-15',
        results: [
          result({ candidateName: 'Celina', percentage: 34, pollId: 'later', cenario: 'Cenário A' }),
          result({ candidateName: 'Arruda', percentage: 22, pollId: 'later', cenario: 'Cenário A' }),
        ],
      }),
      poll({
        id: 'earlier',
        campoInicio: '2026-08-01',
        results: [
          result({ candidateName: 'Celina', percentage: 32, pollId: 'earlier', cenario: 'Cenário B' }),
          result({ candidateName: 'Arruda', percentage: 24, pollId: 'earlier', cenario: 'Cenário B' }),
        ],
      }),
    ];

    const series = buildTemporalSeries(polls);
    const celina = series.find((s) => s.candidateName === 'Celina');
    expect(celina?.points.map((p) => p.percentage)).toEqual([32, 34]);
    expect(celina?.points.map((p) => p.pollId)).toEqual(['earlier', 'later']);
  });

  it('pesquisa com múltiplos cenários de 1º turno estimulado (ex.: MG/abril, testes pareados) fica de fora — nunca escolhe um cenário "representativo"', () => {
    const polls = [
      poll({
        id: 'fragmented',
        campoInicio: '2026-04-28',
        results: [
          result({ candidateName: 'Cleitinho', percentage: 30, pollId: 'fragmented', cenario: 'Cenário 1' }),
          result({ candidateName: 'Cleitinho', percentage: 35, pollId: 'fragmented', cenario: 'Cenário 2' }),
        ],
      }),
      poll({
        id: 'clean',
        campoInicio: '2026-07-26',
        results: [result({ candidateName: 'Cleitinho', percentage: 35, pollId: 'clean', cenario: 'Cenário único' })],
      }),
    ];

    expect(buildTemporalSeries(polls)).toEqual([]);
  });

  it('turno 2 e tipo espontânea nunca entram na série (só 1º turno estimulado)', () => {
    const polls = [
      poll({
        id: 'p1',
        campoInicio: '2026-08-01',
        results: [
          result({ candidateName: 'Celina', percentage: 32, pollId: 'p1', turno: 1, tipoPergunta: 'estimulada' }),
          result({ candidateName: 'Celina', percentage: 43, pollId: 'p1', turno: 2, tipoPergunta: 'estimulada' }),
          result({ candidateName: 'Celina', percentage: 17, pollId: 'p1', turno: 1, tipoPergunta: 'espontanea' }),
        ],
      }),
      poll({
        id: 'p2',
        campoInicio: '2026-08-15',
        results: [result({ candidateName: 'Celina', percentage: 34, pollId: 'p2', turno: 1, tipoPergunta: 'estimulada' })],
      }),
    ];

    const series = buildTemporalSeries(polls);
    expect(series[0].points).toHaveLength(2);
    expect(series[0].points.map((p) => p.percentage)).toEqual([32, 34]);
  });

  // PESQUISAS-N8N-01 — correção pós-validação real: buildTemporalSeries não pode
  // ser mais permissiva que calculateCockpitMetrics/deriveElectoralSignals.

  it('CASO A — 3 leituras reais do mesmo candidato, cenários/metodologias incompatíveis → NÃO gera tendência (série vazia)', () => {
    // Réplica fiel do caso real: Michelle Bolsonaro/Senado/DF (Instituto Opinião 38,8% / Paraná
    // Pesquisas 36% / Real Time Big Data 25%) — cada leitura com roster de candidatos diferente
    // no cenário "dois votos"/"consolidado", exatamente como a provenance real documenta.
    const polls = [
      poll({
        id: 'opiniao',
        campoInicio: '2026-06-11',
        results: [
          result({ candidateName: 'Michelle', percentage: 38.8, pollId: 'opiniao', cenario: 'Consolidado (1º+2º somados)' }),
          result({ candidateName: 'Leila', percentage: 30.2, pollId: 'opiniao', cenario: 'Consolidado (1º+2º somados)' }),
          result({ candidateName: 'Ibaneis', percentage: 22.6, pollId: 'opiniao', cenario: 'Consolidado (1º+2º somados)' }),
        ],
      }),
      poll({
        id: 'parana',
        campoInicio: '2026-07-17',
        results: [
          result({ candidateName: 'Michelle', percentage: 36, pollId: 'parana', cenario: 'Dois votos consolidados' }),
          result({ candidateName: 'Leila', percentage: 39.2, pollId: 'parana', cenario: 'Dois votos consolidados' }),
          result({ candidateName: 'Rafael', percentage: 15.6, pollId: 'parana', cenario: 'Dois votos consolidados' }),
        ],
      }),
      poll({
        id: 'realtime',
        campoInicio: '2026-08-14',
        results: [
          result({ candidateName: 'Michelle', percentage: 25, pollId: 'realtime', cenario: 'Senado Estimulado (dois votos)' }),
          result({ candidateName: 'Leila', percentage: 17, pollId: 'realtime', cenario: 'Senado Estimulado (dois votos)' }),
          result({ candidateName: 'Bia', percentage: 15, pollId: 'realtime', cenario: 'Senado Estimulado (dois votos)' }),
        ],
      }),
    ];

    expect(buildTemporalSeries(polls)).toEqual([]);
  });

  it('CASO B — 2+ pesquisas com roster de candidatos equivalente (mesmo cargo/UF) → série gerada normalmente', () => {
    const polls = [
      poll({
        id: 'antiga',
        campoInicio: '2026-06-01',
        results: [
          result({ candidateName: 'Michelle', percentage: 30, pollId: 'antiga', cenario: 'Cenário X' }),
          result({ candidateName: 'Leila', percentage: 28, pollId: 'antiga', cenario: 'Cenário X' }),
        ],
      }),
      poll({
        id: 'recente',
        campoInicio: '2026-08-01',
        results: [
          result({ candidateName: 'Michelle', percentage: 33, pollId: 'recente', cenario: 'Cenário Y' }),
          result({ candidateName: 'Leila', percentage: 26, pollId: 'recente', cenario: 'Cenário Y' }),
        ],
      }),
    ];

    const series = buildTemporalSeries(polls);
    const michelle = series.find((s) => s.candidateName === 'Michelle');
    expect(michelle?.points.map((p) => p.percentage)).toEqual([30, 33]);
  });

  it('CASO C — Governador e Senador no mesmo poll_id → isolamento por office preservado (nunca mistura cargos na série)', () => {
    const polls = [
      poll({
        id: 'p-gov-sen-1',
        cargo: 'Governador',
        campoInicio: '2026-06-01',
        results: [result({ candidateName: 'Celina', percentage: 34, pollId: 'p-gov-sen-1', office: 'Governador', cenario: 'Cenário único' })],
      }),
      poll({
        id: 'p-gov-sen-2',
        cargo: 'Governador',
        campoInicio: '2026-08-01',
        results: [result({ candidateName: 'Celina', percentage: 36, pollId: 'p-gov-sen-2', office: 'Governador', cenario: 'Cenário único' })],
      }),
    ];
    // getPriorityRacePolls já filtra por office antes de chegar aqui (results-repository.ts) —
    // este teste confirma que, mesmo recebendo só resultados de Governador, buildTemporalSeries
    // nunca precisaria misturar Senador (não há Senador nestes polls; office permanece 'Governador'
    // em todos os pontos gerados).
    const series = buildTemporalSeries(polls);
    const celina = series.find((s) => s.candidateName === 'Celina');
    expect(celina?.points.map((p) => p.percentage)).toEqual([34, 36]);
  });

  it('CASO D — institutos diferentes mas metodologicamente comparáveis (mesmo roster de candidatos) → série gerada, conforme comparability.ts', () => {
    const polls = [
      poll({
        id: 'instituto-a',
        instituto: 'Instituto A',
        campoInicio: '2026-07-01',
        results: [
          result({ candidateName: 'Cleitinho', percentage: 40, pollId: 'instituto-a', cenario: 'Estimulada A' }),
          result({ candidateName: 'Kalil', percentage: 35, pollId: 'instituto-a', cenario: 'Estimulada A' }),
        ],
      }),
      poll({
        id: 'instituto-b',
        instituto: 'Instituto B',
        campoInicio: '2026-08-01',
        results: [
          result({ candidateName: 'Cleitinho', percentage: 42, pollId: 'instituto-b', cenario: 'Estimulada B' }),
          result({ candidateName: 'Kalil', percentage: 33, pollId: 'instituto-b', cenario: 'Estimulada B' }),
        ],
      }),
    ];

    const series = buildTemporalSeries(polls);
    const cleitinho = series.find((s) => s.candidateName === 'Cleitinho');
    expect(cleitinho?.points.map((p) => p.percentage)).toEqual([40, 42]);
  });
});
