import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockFetchEstadoBySigla,
  mockFetchMunicipiosByUf,
  mockFetchMunicipioByCodigo,
  mockFetchPopulacaoByUfId,
  mockFetchPopulacaoByCodigo,
} = vi.hoisted(() => ({
  mockFetchEstadoBySigla: vi.fn(),
  mockFetchMunicipiosByUf: vi.fn(),
  mockFetchMunicipioByCodigo: vi.fn(),
  mockFetchPopulacaoByUfId: vi.fn(),
  mockFetchPopulacaoByCodigo: vi.fn(),
}));

vi.mock('./ibge-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ibge-client')>();
  return {
    ...actual,
    fetchEstadoBySigla: mockFetchEstadoBySigla,
    fetchMunicipiosByUf: mockFetchMunicipiosByUf,
    fetchMunicipioByCodigo: mockFetchMunicipioByCodigo,
    fetchPopulacaoByUfId: mockFetchPopulacaoByUfId,
    fetchPopulacaoByCodigo: mockFetchPopulacaoByCodigo,
  };
});

import { runIbgeCollection } from './ibge-collector';

// ─── Helpers de mock do client Supabase (encadeamento por chamada, na ordem
// exata em que o coletor chama `.from(...)`) ────────────────────────────────

function upsertSelectSingleChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.upsert = vi.fn(() => c);
  c.select = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve(result));
  return c;
}
function selectMaybeSingleChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.is = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  return c;
}
function updateEqChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.update = vi.fn(() => c);
  c.eq = vi.fn(() => Promise.resolve(result));
  return c;
}
function insertChain(result: { data: unknown; error: unknown }) {
  return { insert: vi.fn(() => Promise.resolve(result)) };
}

function municipio(codigo: string, nome: string, uf = 'MG') {
  return {
    id: Number(codigo),
    nome,
    microrregiao: { id: 1, nome: 'x', mesorregiao: { id: 1, nome: 'y', UF: { id: 31, sigla: uf, nome: 'Minas Gerais', regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' } } } },
  };
}

const NO_EXISTING = { data: null, error: null };
const OK = { data: { id: 'x' }, error: null };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runIbgeCollection — mode: single', () => {
  it('persiste território + indicador de população (Contagem/MG) e cria 1 collection_run', async () => {
    mockFetchMunicipioByCodigo.mockResolvedValue(municipio('3118601', 'Contagem'));
    mockFetchPopulacaoByCodigo.mockResolvedValue({ codigoIbge: '3118601', valor: 651718, periodo: '2025', unidade: 'Pessoas' });

    const mockFrom = vi.fn();
    mockFrom
      .mockReturnValueOnce(upsertSelectSingleChain({ data: { id: 'territory-1' }, error: null })) // territories upsert
      .mockReturnValueOnce(selectMaybeSingleChain(NO_EXISTING)) // indicador: sem linha existente
      .mockReturnValueOnce(insertChain(OK)) // indicador: insert
      .mockReturnValueOnce(insertChain(OK)); // collection_run

    const client = { from: mockFrom } as never;
    const result = await runIbgeCollection(client, { mode: 'single', codigoIbge: '3118601' });

    expect(result.mode).toBe('single');
    expect(result.itemsReceived).toBe(1);
    expect(result.itemsPersisted).toBe(1);
    expect(result.itemsFailed).toBe(0);
    expect(result.outcomes[0]).toMatchObject({ codigo_ibge: '3118601', municipio: 'Contagem', status: 'completed', indicatorUpserted: true });
    expect(mockFrom).toHaveBeenCalledWith('territories');
    expect(mockFrom).toHaveBeenCalledWith('territory_indicators');
    expect(mockFrom).toHaveBeenCalledWith('territory_collection_runs');
  });
});

describe('runIbgeCollection — idempotência do indicador (upsert em 2 execuções)', () => {
  it('1ª execução sem linha existente → INSERT; 2ª execução com linha existente → UPDATE (não duplica)', async () => {
    mockFetchMunicipioByCodigo.mockResolvedValue(municipio('3118601', 'Contagem'));
    mockFetchPopulacaoByCodigo.mockResolvedValue({ codigoIbge: '3118601', valor: 651718, periodo: '2025', unidade: 'Pessoas' });

    // 1ª execução
    const insertChainFn = insertChain(OK);
    const mockFrom1 = vi.fn();
    mockFrom1
      .mockReturnValueOnce(upsertSelectSingleChain({ data: { id: 'territory-1' }, error: null }))
      .mockReturnValueOnce(selectMaybeSingleChain(NO_EXISTING))
      .mockReturnValueOnce(insertChainFn)
      .mockReturnValueOnce(insertChain(OK));

    await runIbgeCollection({ from: mockFrom1 } as never, { mode: 'single', codigoIbge: '3118601' });
    expect(insertChainFn.insert).toHaveBeenCalledTimes(1);

    // 2ª execução — desta vez o SELECT encontra a linha já criada
    const updateChainFn = updateEqChain(OK);
    const mockFrom2 = vi.fn();
    mockFrom2
      .mockReturnValueOnce(upsertSelectSingleChain({ data: { id: 'territory-1' }, error: null }))
      .mockReturnValueOnce(selectMaybeSingleChain({ data: { id: 'indicator-1' }, error: null }))
      .mockReturnValueOnce(updateChainFn)
      .mockReturnValueOnce(insertChain(OK));

    const result2 = await runIbgeCollection({ from: mockFrom2 } as never, { mode: 'single', codigoIbge: '3118601' });

    expect(updateChainFn.update).toHaveBeenCalledTimes(1);
    expect(result2.outcomes[0].indicatorUpserted).toBe(true);
  });
});

describe('runIbgeCollection — mode: uf', () => {
  it('processa todos os municípios recebidos, correlacionados pelo mesmo request_id', async () => {
    mockFetchEstadoBySigla.mockResolvedValue({ id: 31, sigla: 'MG', nome: 'Minas Gerais', regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' } });
    mockFetchMunicipiosByUf.mockResolvedValue([municipio('3118601', 'Contagem'), municipio('3106200', 'Belo Horizonte')]);
    mockFetchPopulacaoByUfId.mockResolvedValue(
      new Map([
        ['3118601', { codigoIbge: '3118601', valor: 651718, periodo: '2025', unidade: 'Pessoas' }],
        ['3106200', { codigoIbge: '3106200', valor: 2315560, periodo: '2025', unidade: 'Pessoas' }],
      ])
    );

    const mockFrom = vi.fn();
    for (let i = 0; i < 2; i++) {
      mockFrom
        .mockReturnValueOnce(upsertSelectSingleChain({ data: { id: `territory-${i}` }, error: null }))
        .mockReturnValueOnce(selectMaybeSingleChain(NO_EXISTING))
        .mockReturnValueOnce(insertChain(OK))
        .mockReturnValueOnce(insertChain(OK));
    }

    const result = await runIbgeCollection({ from: mockFrom } as never, { mode: 'uf', uf: 'MG', requestId: 'req-1' });

    expect(result.uf).toBe('MG');
    expect(result.itemsReceived).toBe(2);
    expect(result.itemsPersisted).toBe(2);
    expect(result.requestId).toBe('req-1');
    // request_id enviado em todas as chamadas de insert de collection_run
    const collectionRunInserts = mockFrom.mock.calls.filter(([table]) => table === 'territory_collection_runs');
    expect(collectionRunInserts.length).toBe(2);
  });

  it('uma falha pontual (item incompleto) não corrompe os demais — resultado fica "partial", não aborta o lote', async () => {
    mockFetchEstadoBySigla.mockResolvedValue({ id: 31, sigla: 'MG', nome: 'Minas Gerais', regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' } });
    mockFetchMunicipiosByUf.mockResolvedValue([
      { id: 999, nome: 'Sem UF' }, // item incompleto — normalizeMunicipio real vai lançar
      municipio('3118601', 'Contagem'),
    ]);
    mockFetchPopulacaoByUfId.mockResolvedValue(new Map([['3118601', { codigoIbge: '3118601', valor: 651718, periodo: '2025', unidade: 'Pessoas' }]]));

    const mockFrom = vi.fn();
    mockFrom
      .mockReturnValueOnce(upsertSelectSingleChain({ data: { id: 'territory-ok' }, error: null }))
      .mockReturnValueOnce(selectMaybeSingleChain(NO_EXISTING))
      .mockReturnValueOnce(insertChain(OK))
      .mockReturnValueOnce(insertChain(OK));

    const result = await runIbgeCollection({ from: mockFrom } as never, { mode: 'uf', uf: 'MG' });

    expect(result.itemsReceived).toBe(2);
    expect(result.itemsFailed).toBe(1);
    expect(result.itemsPersisted).toBe(1);
    expect(result.outcomes.find((o) => o.status === 'failed')).toBeDefined();
    expect(result.outcomes.find((o) => o.codigo_ibge === '3118601')?.status).toBe('completed');
  });
});

describe('runIbgeCollection — mode: national (bloqueado)', () => {
  it('recusa executar carga nacional por padrão, sem tocar o banco', async () => {
    delete process.env.TERRITORIOS_ALLOW_NATIONAL_LOAD;
    const mockFrom = vi.fn();

    const result = await runIbgeCollection({ from: mockFrom } as never, { mode: 'national' });

    expect(result.blocked).toBe(true);
    expect(result.itemsPersisted).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockFetchMunicipiosByUf).not.toHaveBeenCalled();
  });
});
