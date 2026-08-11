import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockDiscoverResources,
  mockSelectResourceForYear,
  mockFetchAnnualCsv,
  mockParseCrimesViolentosCsv,
  mockResolveTerritoriesMapForUf,
} = vi.hoisted(() => ({
  mockDiscoverResources: vi.fn(),
  mockSelectResourceForYear: vi.fn(),
  mockFetchAnnualCsv: vi.fn(),
  mockParseCrimesViolentosCsv: vi.fn(),
  mockResolveTerritoriesMapForUf: vi.fn(),
}));

vi.mock('./seguranca-mg-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./seguranca-mg-client')>();
  return {
    ...actual,
    discoverResources: mockDiscoverResources,
    selectResourceForYear: mockSelectResourceForYear,
    fetchAnnualCsv: mockFetchAnnualCsv,
    parseCrimesViolentosCsv: mockParseCrimesViolentosCsv,
  };
});

vi.mock('./seguranca-territory-resolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./seguranca-territory-resolver')>();
  return { ...actual, resolveTerritoriesMapForUf: mockResolveTerritoriesMapForUf };
});

import { runSecurityCollection, computeWindow, SecurityCollectionError } from './seguranca-collector';
import { SegurancaSourceError } from './seguranca-mg-client';

// ─── Helpers de mock do client Supabase (mesmo estilo de ibge-collector.test.ts) ──

function territoriesLookupChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  return c;
}
function selectMaybeSingleChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
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

const NO_EXISTING = { data: null, error: null };
const OK = { data: { id: 'x' }, error: null };
const CONTAGEM = { id: 'territory-contagem', codigo_ibge: '3118601', municipio: 'Contagem', uf: 'MG' };

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    registros: 1,
    natureza: 'ROUBO CONSUMADO',
    municipio: 'CONTAGEM',
    cod_municipio: '311860',
    mes: 7,
    ano: 2026,
    risp: 'RISP 2 - CONTAGEM',
    rmbh: 'SIM',
    ...overrides,
  };
}

const REFERENCE_DATE = new Date('2026-08-11T12:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  mockDiscoverResources.mockResolvedValue([
    { id: 'r2025', name: 'Crimes Violentos 2025', format: 'CSV', url: 'https://x/2025.csv', last_modified: null },
    { id: 'r2026', name: 'Crimes Violentos 2026', format: 'CSV', url: 'https://x/2026.csv', last_modified: null },
  ]);
  mockSelectResourceForYear.mockImplementation((resources: Array<{ name: string }>, year: number) => {
    const found = resources.find((r) => r.name.includes(String(year)));
    if (!found) throw new SegurancaSourceError('resource_not_found', `sem recurso para ${year}`);
    return found;
  });
  mockFetchAnnualCsv.mockResolvedValue('csv-mock');
});

describe('computeWindow', () => {
  it('calcula os últimos N meses completos, sem incluir o mês corrente', () => {
    const w = computeWindow(12, REFERENCE_DATE);
    expect(w).toHaveLength(12);
    expect(w[0]).toEqual({ year: 2025, month: 8 });
    expect(w[w.length - 1]).toEqual({ year: 2026, month: 7 });
  });

  it('janela de 1 mês atravessando virada de ano', () => {
    const w = computeWindow(2, new Date('2026-01-15T00:00:00Z'));
    expect(w).toEqual([
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
    ]);
  });
});

describe('runSecurityCollection — validação de entrada', () => {
  it('rejeita months fora do intervalo permitido, sem tocar o banco', async () => {
    const mockFrom = vi.fn();
    await expect(
      runSecurityCollection({ from: mockFrom } as never, { mode: 'single', codigoIbge: '3118601', months: 0, referenceDate: REFERENCE_DATE })
    ).rejects.toBeInstanceOf(SecurityCollectionError);
    await expect(
      runSecurityCollection({ from: mockFrom } as never, { mode: 'single', codigoIbge: '3118601', months: 25, referenceDate: REFERENCE_DATE })
    ).rejects.toBeInstanceOf(SecurityCollectionError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejeita mode=single sem codigoIbge', async () => {
    const mockFrom = vi.fn();
    await expect(
      runSecurityCollection({ from: mockFrom } as never, { mode: 'single', referenceDate: REFERENCE_DATE })
    ).rejects.toBeInstanceOf(SecurityCollectionError);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('runSecurityCollection — mode: single (Contagem)', () => {
  it('persiste 2 indicadores núcleo + índice derivado, exclui feminicídio (fora do núcleo), reporta natureza desconhecida e ignora linha de outro município', async () => {
    mockParseCrimesViolentosCsv.mockReturnValue([
      row({ natureza: 'ROUBO CONSUMADO', registros: 5 }),
      row({ natureza: 'HOMICIDIO CONSUMADO (REGISTROS)', registros: 2 }),
      row({ natureza: 'FEMINICIDIO TENTADO', registros: 1 }),
      row({ natureza: 'NATUREZA_NUNCA_VISTA', registros: 9 }),
      row({ cod_municipio: '999999', municipio: 'OUTRO MUNICIPIO', natureza: 'ROUBO CONSUMADO', registros: 100 }),
    ]);

    const mockFrom = vi.fn();
    mockFrom
      .mockReturnValueOnce(territoriesLookupChain({ data: CONTAGEM, error: null })) // territories (single lookup)
      .mockReturnValueOnce(selectMaybeSingleChain(NO_EXISTING)) // roubo_consumado: select
      .mockReturnValueOnce(insertChain(OK)) // roubo_consumado: insert
      .mockReturnValueOnce(selectMaybeSingleChain(NO_EXISTING)) // homicidio_consumado: select
      .mockReturnValueOnce(insertChain(OK)) // homicidio_consumado: insert
      .mockReturnValueOnce(selectMaybeSingleChain(NO_EXISTING)) // indice_crimes_violentos: select
      .mockReturnValueOnce(insertChain(OK)) // indice_crimes_violentos: insert
      .mockReturnValueOnce(insertChain(OK)); // collection_run

    const result = await runSecurityCollection({ from: mockFrom } as never, {
      mode: 'single',
      codigoIbge: '3118601',
      months: 1,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.territoriesExpected).toBe(1);
    expect(result.territoriesProcessed).toBe(1);
    expect(result.indicatorsPersisted).toBe(3); // roubo + homicidio + índice
    expect(result.rowsReceived).toBe(4); // 5 linhas menos a de outro município (filtrada antes de normalizar)
    expect(result.rowsDiscarded).toBe(2); // 1 desconhecida + 1 fora do núcleo (feminicídio)
    expect(result.unknownNatures).toEqual(['NATUREZA_NUNCA_VISTA']);
    expect(result.excludedOutOfScopeNatures).toEqual(['FEMINICIDIO TENTADO']);
    expect(result.unmatchedMunicipalities).toEqual([]);
    expect(result.overallStatus).toBe('completed');

    // resource discovery: 1 único ano necessário para janela de 1 mês (jul/2026)
    expect(mockDiscoverResources).toHaveBeenCalledTimes(1);
    expect(mockFetchAnnualCsv).toHaveBeenCalledTimes(1);
    expect(mockResolveTerritoriesMapForUf).not.toHaveBeenCalled(); // mode=single não precisa do mapa completo da UF

    // índice = soma dos núcleos (5 + 2 = 7)
    const indiceInsertCall = (mockFrom.mock.results[6].value as { insert: ReturnType<typeof vi.fn> }).insert.mock.calls[0][0];
    expect(indiceInsertCall).toMatchObject({ indicador: 'indice_crimes_violentos', valor: 7, categoria: 'seguranca_publica', fonte: 'SEJUSP-MG', source_dataset: 'crimes-violentos' });
  });

  it('território não encontrado → erro explícito, nada é persistido', async () => {
    const mockFrom = vi.fn().mockReturnValueOnce(territoriesLookupChain({ data: null, error: null }));

    await expect(
      runSecurityCollection({ from: mockFrom } as never, { mode: 'single', codigoIbge: '9999999', months: 1, referenceDate: REFERENCE_DATE })
    ).rejects.toMatchObject({ kind: 'territory_not_found' });
  });

  it('propaga falha de download da fonte (sem persistir nada)', async () => {
    mockFetchAnnualCsv.mockRejectedValue(new SegurancaSourceError('server_error', 'SEJUSP-MG indisponível'));
    const mockFrom = vi.fn().mockReturnValueOnce(territoriesLookupChain({ data: CONTAGEM, error: null }));

    await expect(
      runSecurityCollection({ from: mockFrom } as never, { mode: 'single', codigoIbge: '3118601', months: 1, referenceDate: REFERENCE_DATE })
    ).rejects.toThrow('SEJUSP-MG indisponível');
  });

  it('idempotência: 1ª execução insere, 2ª execução (linha já existente) atualiza — não duplica', async () => {
    mockParseCrimesViolentosCsv.mockReturnValue([row({ natureza: 'ROUBO CONSUMADO', registros: 5 })]);

    // 1ª execução: roubo_consumado + índice (mesma natureza única = mesmo valor do índice)
    const insert1 = insertChain(OK);
    const insert2 = insertChain(OK);
    const mockFrom1 = vi.fn();
    mockFrom1
      .mockReturnValueOnce(territoriesLookupChain({ data: CONTAGEM, error: null }))
      .mockReturnValueOnce(selectMaybeSingleChain(NO_EXISTING))
      .mockReturnValueOnce(insert1)
      .mockReturnValueOnce(selectMaybeSingleChain(NO_EXISTING))
      .mockReturnValueOnce(insert2)
      .mockReturnValueOnce(insertChain(OK));

    await runSecurityCollection({ from: mockFrom1 } as never, { mode: 'single', codigoIbge: '3118601', months: 1, referenceDate: REFERENCE_DATE });
    expect(insert1.insert).toHaveBeenCalledTimes(1);
    expect(insert2.insert).toHaveBeenCalledTimes(1);

    // 2ª execução: agora o SELECT encontra linhas já existentes → UPDATE, não INSERT
    const update1 = updateEqChain(OK);
    const update2 = updateEqChain(OK);
    const mockFrom2 = vi.fn();
    mockFrom2
      .mockReturnValueOnce(territoriesLookupChain({ data: CONTAGEM, error: null }))
      .mockReturnValueOnce(selectMaybeSingleChain({ data: { id: 'ind-1' }, error: null }))
      .mockReturnValueOnce(update1)
      .mockReturnValueOnce(selectMaybeSingleChain({ data: { id: 'ind-2' }, error: null }))
      .mockReturnValueOnce(update2)
      .mockReturnValueOnce(insertChain(OK));

    const result2 = await runSecurityCollection({ from: mockFrom2 } as never, { mode: 'single', codigoIbge: '3118601', months: 1, referenceDate: REFERENCE_DATE });

    expect(update1.update).toHaveBeenCalledTimes(1);
    expect(update2.update).toHaveBeenCalledTimes(1);
    expect(result2.indicatorsPersisted).toBe(2);
  });
});

describe('runSecurityCollection — janela atravessando dois anos', () => {
  it('baixa no máximo 1 arquivo por ano necessário (nunca por município)', async () => {
    mockParseCrimesViolentosCsv.mockReturnValue([]); // sem linhas relevantes — só testando o fetch de recursos

    const mockFrom = vi.fn().mockReturnValueOnce(territoriesLookupChain({ data: CONTAGEM, error: null })).mockReturnValueOnce(insertChain(OK));

    await runSecurityCollection({ from: mockFrom } as never, {
      mode: 'single',
      codigoIbge: '3118601',
      months: 12, // ago/2025 .. jul/2026 → precisa de 2025 e 2026
      referenceDate: REFERENCE_DATE,
    });

    expect(mockDiscoverResources).toHaveBeenCalledTimes(1); // catálogo consultado 1x só
    expect(mockFetchAnnualCsv).toHaveBeenCalledTimes(2); // 1 download por ano (2025, 2026) — nunca 853 downloads
    expect(mockFetchAnnualCsv).toHaveBeenNthCalledWith(1, 'https://x/2025.csv');
    expect(mockFetchAnnualCsv).toHaveBeenNthCalledWith(2, 'https://x/2026.csv');
  });
});

describe('runSecurityCollection — mode: mg', () => {
  it('processa todos os municípios encontrados, reporta município do CSV sem território correspondente', async () => {
    mockParseCrimesViolentosCsv.mockReturnValue([
      row({ cod_municipio: '311860', municipio: 'CONTAGEM', natureza: 'ROUBO CONSUMADO', registros: 3 }),
      row({ cod_municipio: '999999', municipio: 'MUNICIPIO_FANTASMA', natureza: 'ROUBO CONSUMADO', registros: 7 }),
    ]);
    mockResolveTerritoriesMapForUf.mockResolvedValue({
      map: new Map([['311860', CONTAGEM]]),
      ambiguous: new Map(),
    });

    const mockFrom = vi.fn();
    mockFrom
      .mockReturnValueOnce(selectMaybeSingleChain(NO_EXISTING)) // roubo_consumado (Contagem): select
      .mockReturnValueOnce(insertChain(OK)) // insert
      .mockReturnValueOnce(selectMaybeSingleChain(NO_EXISTING)) // indice (Contagem): select
      .mockReturnValueOnce(insertChain(OK)) // insert
      .mockReturnValueOnce(insertChain(OK)); // collection_run (Contagem)

    const result = await runSecurityCollection({ from: mockFrom } as never, { mode: 'mg', months: 1, referenceDate: REFERENCE_DATE });

    expect(result.territoriesExpected).toBe(1); // só 1 território no mapa mockado
    expect(result.territoriesProcessed).toBe(1);
    expect(result.unmatchedMunicipalities).toEqual(['999999']);
    expect(result.overallStatus).toBe('partial'); // município não resolvido degrada para partial
  });
});
