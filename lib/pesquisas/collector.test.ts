import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/lib/supabaseClient', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const mocks = vi.hoisted(() => ({ parse: vi.fn(), open: vi.fn() }));
vi.mock('csv-parse/sync', () => ({ parse: mocks.parse }));
vi.mock('unzipper', () => ({ default: { Open: { buffer: mocks.open } } }));

import { runPesquisasCollector, upsertPolls } from './collector';

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.insert = vi.fn(self);
  c.update = vi.fn(self);
  c.upsert = vi.fn(() => Promise.resolve({ ...result, count: Array.isArray(result.data) ? result.data.length : 1 }));
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.order = vi.fn(self);
  c.limit = vi.fn(self);
  c.single = vi.fn(() => Promise.resolve(result));
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockFrom.mockReset();
  mockFrom.mockReturnValue(chain({ data: { id: 'run-1' }, error: null }));
});

describe('runPesquisasCollector — falha honesta, nunca inventa dado', () => {
  it('403 do TSE → status failed, reason BLOCKED_BY_SOURCE_ACCESS, nenhuma pesquisa inserida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const result = await runPesquisasCollector();

    expect(result.status).toBe('failed');
    expect(result.reason).toBe('BLOCKED_BY_SOURCE_ACCESS');
    expect(result.pollsInserted).toBe(0);
  });

  it('erro de rede (timeout/DNS) → status failed, reason NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    const result = await runPesquisasCollector();

    expect(result.status).toBe('failed');
    expect(result.reason).toBe('NETWORK_ERROR');
    expect(result.pollsInserted).toBe(0);
  });

  it('download bem-sucedido mas sem recurso "BRASIL" (rollup nacional) → não ingere, reason CANONICAL_RESOURCE_NOT_FOUND', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => Buffer.from('zip-bytes') }));
    mocks.open.mockResolvedValue({
      files: [{ path: 'pesquisa_eleitoral_2026_MG.csv', type: 'File', buffer: async () => Buffer.from('csv') }],
    });
    mocks.parse.mockReturnValue([{ CAMPO_DESCONHECIDO_1: 'x', CAMPO_DESCONHECIDO_2: 'y' }]);

    const result = await runPesquisasCollector();

    expect(result.status).toBe('partial');
    expect(result.reason).toBe('CANONICAL_RESOURCE_NOT_FOUND');
    expect(result.pollsInserted).toBe(0);
    expect(result.discoveredResources).toEqual([
      { fileName: 'pesquisa_eleitoral_2026_MG.csv', headers: ['CAMPO_DESCONHECIDO_1', 'CAMPO_DESCONHECIDO_2'], rowCount: 1 },
    ]);
  });

  it('recurso BRASIL presente → normaliza e grava via upsert, status completed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => Buffer.from('zip-bytes') }));
    mocks.open.mockResolvedValue({
      files: [{ path: 'pesquisa_eleitoral_2026_BRASIL.csv', type: 'File', buffer: async () => Buffer.from('csv') }],
    });
    mocks.parse.mockReturnValue([
      { NR_PROTOCOLO_REGISTRO: 'MG000012026', AA_ELEICAO: '2026', SG_UF: 'MG', DS_CARGO: 'Governador', QT_ENTREVISTADO: '1000' },
      { NR_PROTOCOLO_REGISTRO: '#NULO#', AA_ELEICAO: '2026' }, // sem identidade oficial — deve ser descartada
    ]);
    const insertChain = chain({ data: { id: 'run-1' }, error: null });
    const upsertChain = chain({ data: [{ id: 'poll-1' }], error: null });
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'electoral_polls') return upsertChain;
      callCount += 1;
      return insertChain;
    });

    const result = await runPesquisasCollector();

    expect(result.status).toBe('completed');
    expect(result.pollsInserted).toBe(1); // só a linha com registro válido
    expect(upsertChain.upsert).toHaveBeenCalledTimes(1);
    const [rows] = (upsertChain.upsert as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0].tse_registration_number).toBe('MG000012026');
  });

  it('ZIP corrompido/inesperado → status failed, reason ZIP_OR_CSV_PARSE_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => Buffer.from('not-a-zip') }));
    mocks.open.mockRejectedValue(new Error('invalid zip'));

    const result = await runPesquisasCollector();

    expect(result.status).toBe('failed');
    expect(result.reason).toBe('ZIP_OR_CSV_PARSE_ERROR');
  });

  it('toda execução (sucesso ou falha) registra início e fim em source_collection_runs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    const insertChain = chain({ data: { id: 'run-1' }, error: null });
    const updateChain = chain({ data: null, error: null });
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount += 1;
      return callCount === 1 ? insertChain : updateChain;
    });

    await runPesquisasCollector();

    expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({ source: 'TSE/PESQUISA_ELEITORAL', status: 'running' }));
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });
});

describe('upsertPolls — idempotência (PARTE 4: nunca duplicar pesquisa já ingerida)', () => {
  const samplePoll = {
    tseRegistrationNumber: 'BR-2026-00001',
    source: 'TSE/PesqEle',
    sourceUrl: null,
    sourceDataset: 'pesquisas-eleitorais-2026',
    electionYear: 2026,
    uf: 'MG',
    municipio: null,
    cargo: 'Governador',
    abrangencia: 'Estadual',
    instituto: 'Instituto Fixture',
    contratante: null,
    pagante: null,
    valor: null,
    metodologia: null,
    dataRegistro: '2026-01-01',
    campoInicio: null,
    campoFim: null,
    amostra: 1000,
    margemErro: 2,
    nivelConfianca: 95,
    ingestedAt: '2026-01-01T00:00:00.000Z',
  };

  it('lista vazia não chama o banco', async () => {
    const c = chain({ data: [], error: null });
    mockFrom.mockReturnValue(c);
    const result = await upsertPolls({ from: mockFrom } as never, []);
    expect(result.upserted).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('usa onConflict em tse_registration_number — inserir a mesma pesquisa 2x não duplica', async () => {
    const c = chain({ data: [samplePoll], error: null });
    mockFrom.mockReturnValue(c);

    await upsertPolls({ from: mockFrom } as never, [samplePoll]);
    await upsertPolls({ from: mockFrom } as never, [samplePoll]);

    expect(c.upsert).toHaveBeenCalledTimes(2);
    for (const call of (c.upsert as ReturnType<typeof vi.fn>).mock.calls) {
      const [rows, options] = call;
      expect(options).toMatchObject({ onConflict: 'tse_registration_number', ignoreDuplicates: false });
      expect(rows[0].tse_registration_number).toBe('BR-2026-00001');
    }
  });
});
