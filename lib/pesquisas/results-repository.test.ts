import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/lib/supabaseClient', () => ({
  createClient: () => ({ from: mockFrom }),
  createAdminClient: () => ({ from: mockFrom }),
}));

import { upsertPollResult, getPriorityRacePolls } from './results-repository';
import type { ElectoralPollResultUpsert } from './types';

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.insert = vi.fn(self);
  c.update = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
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

  it('filtra para só as pesquisas que TÊM resultado (não lista pesquisas registradas sem resultado integrado)', async () => {
    const pollRow = {
      id: 'poll-1', tse_registration_number: 'BR067732026', source: 'TSE/PesqEle', source_url: null,
      source_dataset: 'pesquisas-eleitorais-2026', election_year: 2026, uf: 'BR', municipio: null,
      cargo: 'Presidente', abrangencia: null, instituto: 'QUAEST', contratante: null, pagante: null,
      valor: null, metodologia: null, data_registro: '2026-08-14', campo_inicio: '2026-08-10',
      campo_fim: '2026-08-13', amostra: 2004, margem_erro: null, nivel_confianca: null, raw_source_row: null,
      ingested_at: '2026-08-19T00:00:00.000Z', created_at: '2026-08-19T00:00:00.000Z', updated_at: '2026-08-19T00:00:00.000Z',
    };
    const pollRow2 = { ...pollRow, id: 'poll-2', tse_registration_number: 'BR000002026' }; // sem resultado

    let call = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'electoral_polls') return chain({ data: [pollRow, pollRow2], error: null });
      // electoral_poll_results: só poll-1 tem resultado
      return chain({
        data: [
          {
            id: 'res-1', poll_id: 'poll-1', cenario: 'Cenário único', turno: 1, tipo_pergunta: 'estimulada',
            candidate_name: 'Lula', percentage: 38, office: 'Presidente', result_type: 'STIMULATED',
            candidate_id: null, source_name: 'Quaest', source_url: 'https://example.com', source_date: '2026-08-14',
            collected_at: '2026-08-19T00:00:00.000Z', provenance: {}, verified: true,
          },
        ],
        error: null,
      });
    });

    const polls = await getPriorityRacePolls('BR', 'Presidente');

    expect(polls).toHaveLength(1);
    expect(polls[0].id).toBe('poll-1');
    expect(polls[0].results).toHaveLength(1);
  });
});
