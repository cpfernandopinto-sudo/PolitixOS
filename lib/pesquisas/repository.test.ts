import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/lib/supabaseClient', () => ({
  createClient: () => ({ from: mockFrom }),
  createAdminClient: () => ({ from: mockFrom }),
}));

import { listPolls, getPollById, getPollResults, getPesquisasKpis } from './repository';

function chain(result: { data: unknown; error: unknown; count?: number }) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.not = vi.fn(self);
  c.gte = vi.fn(self);
  c.order = vi.fn(self);
  c.limit = vi.fn(self);
  c.single = vi.fn(() => Promise.resolve(result));
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

const pollRow = {
  id: 'poll-1',
  tse_registration_number: 'BR-2026-00001',
  source: 'TSE/PesqEle',
  source_url: null,
  source_dataset: 'pesquisas-eleitorais-2026',
  election_year: 2026,
  uf: 'MG',
  municipio: null,
  cargo: 'Governador',
  abrangencia: 'Estadual',
  instituto: 'Instituto Fixture',
  contratante: null,
  pagante: null,
  valor: null,
  metodologia: null,
  data_registro: '2026-01-01',
  campo_inicio: null,
  campo_fim: null,
  amostra: 1000,
  margem_erro: 2,
  nivel_confianca: 95,
  ingested_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  mockFrom.mockReset();
});

describe('listPolls', () => {
  it('mapeia colunas snake_case do banco para o modelo camelCase', async () => {
    mockFrom.mockReturnValue(chain({ data: [pollRow], error: null }));
    const [poll] = await listPolls();
    expect(poll.tseRegistrationNumber).toBe('BR-2026-00001');
    expect(poll.electionYear).toBe(2026);
  });

  it('erro do banco retorna [] em vez de propagar exceção para a UI', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'boom' } }));
    expect(await listPolls()).toEqual([]);
  });

  it('aplica filtros de UF/cargo/instituto quando informados', async () => {
    const c = chain({ data: [], error: null });
    mockFrom.mockReturnValue(c);
    await listPolls({ uf: 'MG', cargo: 'Governador', instituto: 'X' });
    expect(c.eq).toHaveBeenCalledWith('uf', 'MG');
    expect(c.eq).toHaveBeenCalledWith('cargo', 'Governador');
    expect(c.eq).toHaveBeenCalledWith('instituto', 'X');
  });
});

describe('getPollById', () => {
  it('retorna null quando não encontrado (nunca lança)', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'not found' } }));
    expect(await getPollById('inexistente')).toBeNull();
  });

  it('retorna a pesquisa mapeada quando encontrada', async () => {
    mockFrom.mockReturnValue(chain({ data: pollRow, error: null }));
    const poll = await getPollById('poll-1');
    expect(poll?.instituto).toBe('Instituto Fixture');
  });
});

describe('getPollResults', () => {
  it('tabela vazia (nenhum resultado ainda integrado) retorna []', async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }));
    expect(await getPollResults('poll-1')).toEqual([]);
  });
});

describe('getPesquisasKpis — honesto sobre ausência de dado (PARTE 32)', () => {
  it('banco vazio + coletor nunca executado → sourceStatus NEVER_RUN, não "0 silencioso"', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'source_collection_runs') return chain({ data: null, error: null });
      return chain({ data: [], error: null, count: 0 });
    });

    const kpis = await getPesquisasKpis();

    expect(kpis.totalPolls).toBe(0);
    expect(kpis.sourceStatus).toBe('NEVER_RUN');
  });

  it('última execução falhou (bloqueio de fonte) → sourceStatus BLOCKED_BY_SOURCE_ACCESS', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'source_collection_runs') {
        return chain({ data: { status: 'failed', finished_at: '2026-08-19T00:00:00.000Z', metadata: { reason: 'BLOCKED_BY_SOURCE_ACCESS' } }, error: null });
      }
      return chain({ data: [], error: null, count: 0 });
    });

    const kpis = await getPesquisasKpis();

    expect(kpis.sourceStatus).toBe('BLOCKED_BY_SOURCE_ACCESS');
    expect(kpis.lastSyncAt).toBe('2026-08-19T00:00:00.000Z');
  });
});
