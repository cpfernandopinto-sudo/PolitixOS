import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockDiscoverResources,
  mockSelectResourceForYear,
  mockFetchAnnualCsv,
  mockParseCrimesViolentosCsv,
  mockResolveTerritoriesMapForUf,
  mockResolveTerritoriesByCodigosIbge,
} = vi.hoisted(() => ({
  mockDiscoverResources: vi.fn(),
  mockSelectResourceForYear: vi.fn(),
  mockFetchAnnualCsv: vi.fn(),
  mockParseCrimesViolentosCsv: vi.fn(),
  mockResolveTerritoriesMapForUf: vi.fn(),
  mockResolveTerritoriesByCodigosIbge: vi.fn(),
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
  return {
    ...actual,
    resolveTerritoriesMapForUf: mockResolveTerritoriesMapForUf,
    resolveTerritoriesByCodigosIbge: mockResolveTerritoriesByCodigosIbge,
  };
});

import { runSecurityCollection, computeWindow, SecurityCollectionError, MAX_BATCH_SIZE } from './seguranca-collector';
import { SegurancaSourceError } from './seguranca-mg-client';
import type { ResolvedTerritory } from './seguranca-territory-resolver';

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
/** Bulk select de `persistTerritoryIndicators` (Bloco 4.5, Fase 6) — `.select().eq()...` é "thenable" em
 *  qualquer ponto da cadeia (mesmo comportamento do PostgrestFilterBuilder real), já que não termina em
 *  `.maybeSingle()`. */
function selectManyChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.then = (resolve: (v: unknown) => void) => resolve(result);
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
const NO_EXISTING_MANY = { data: [], error: null };
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
      .mockReturnValueOnce(selectManyChain(NO_EXISTING_MANY)) // bulk select de indicadores já existentes (nenhum)
      .mockReturnValueOnce(insertChain(OK)) // bulk insert (roubo + homicidio + índice, em 1 chamada)
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

    // índice = soma dos núcleos (5 + 2 = 7) — todas as 3 linhas vão em 1 único insert em lote
    const insertedRows = (mockFrom.mock.results[2].value as { insert: ReturnType<typeof vi.fn> }).insert.mock.calls[0][0] as Record<
      string,
      unknown
    >[];
    expect(insertedRows).toHaveLength(3);
    const indiceRow = insertedRows.find((r) => r.indicador === 'indice_crimes_violentos');
    expect(indiceRow).toMatchObject({ indicador: 'indice_crimes_violentos', valor: 7, categoria: 'seguranca_publica', fonte: 'SEJUSP-MG', source_dataset: 'crimes-violentos' });
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

    // 1ª execução: roubo_consumado + índice (mesma natureza única = mesmo valor do índice),
    // ambos novos → 1 SELECT em lote (vazio) + 1 INSERT em lote (2 linhas).
    const insert1 = insertChain(OK);
    const mockFrom1 = vi.fn();
    mockFrom1
      .mockReturnValueOnce(territoriesLookupChain({ data: CONTAGEM, error: null }))
      .mockReturnValueOnce(selectManyChain(NO_EXISTING_MANY))
      .mockReturnValueOnce(insert1)
      .mockReturnValueOnce(insertChain(OK));

    await runSecurityCollection({ from: mockFrom1 } as never, { mode: 'single', codigoIbge: '3118601', months: 1, referenceDate: REFERENCE_DATE });
    expect(insert1.insert).toHaveBeenCalledTimes(1);
    expect((insert1.insert.mock.calls[0] as unknown[])[0]).toHaveLength(2);

    // 2ª execução: agora o SELECT em lote encontra as 2 linhas já existentes → UPDATE, não INSERT
    const update1 = updateEqChain(OK);
    const update2 = updateEqChain(OK);
    const mockFrom2 = vi.fn();
    mockFrom2
      .mockReturnValueOnce(territoriesLookupChain({ data: CONTAGEM, error: null }))
      .mockReturnValueOnce(
        selectManyChain({
          data: [
            { id: 'ind-1', indicador: 'roubo_consumado', periodo_inicio: '2026-07-01', periodo_fim: '2026-07-31' },
            { id: 'ind-2', indicador: 'indice_crimes_violentos', periodo_inicio: '2026-07-01', periodo_fim: '2026-07-31' },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(update1)
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
      .mockReturnValueOnce(selectManyChain(NO_EXISTING_MANY)) // bulk select indicadores existentes (Contagem)
      .mockReturnValueOnce(insertChain(OK)) // bulk insert (roubo + índice, Contagem)
      .mockReturnValueOnce(insertChain(OK)); // collection_run (Contagem)

    const result = await runSecurityCollection({ from: mockFrom } as never, { mode: 'mg', months: 1, referenceDate: REFERENCE_DATE });

    expect(result.territoriesExpected).toBe(1); // só 1 território no mapa mockado
    expect(result.territoriesProcessed).toBe(1);
    expect(result.unmatchedMunicipalities).toEqual(['999999']);
    expect(result.overallStatus).toBe('partial'); // município não resolvido degrada para partial
  });
});

// ─── mode: batch (Bloco 4.5) ───────────────────────────────────────────────

function makeTerritory(codigoIbge: string, municipio: string): ResolvedTerritory {
  return { id: `territory-${codigoIbge}`, codigo_ibge: codigoIbge, municipio, uf: 'MG' };
}

/** 3 chamadas `.from()` por território (Bloco 4.5, Fase 6 — persistência em lote):
 *  1 select em lote (indicadores já existentes, nenhum) + 1 insert em lote (todas as linhas novas) + 1 insert (collection_run). */
function queueTerritoryPersistence(mockFrom: ReturnType<typeof vi.fn>) {
  mockFrom
    .mockReturnValueOnce(selectManyChain(NO_EXISTING_MANY))
    .mockReturnValueOnce(insertChain(OK))
    .mockReturnValueOnce(insertChain(OK));
}

describe('runSecurityCollection — mode: batch', () => {
  it('rejeita lote vazio, sem tocar o banco nem baixar nada', async () => {
    const mockFrom = vi.fn();
    await expect(
      runSecurityCollection({ from: mockFrom } as never, { mode: 'batch', codigosIbge: [], referenceDate: REFERENCE_DATE })
    ).rejects.toBeInstanceOf(SecurityCollectionError);
    await expect(
      runSecurityCollection({ from: mockFrom } as never, { mode: 'batch', referenceDate: REFERENCE_DATE })
    ).rejects.toBeInstanceOf(SecurityCollectionError);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockDiscoverResources).not.toHaveBeenCalled();
  });

  it('rejeita lote acima de MAX_BATCH_SIZE, sem tocar o banco nem baixar nada', async () => {
    const mockFrom = vi.fn();
    const tooMany = Array.from({ length: MAX_BATCH_SIZE + 1 }, (_, i) => `310000${i}`);
    await expect(
      runSecurityCollection({ from: mockFrom } as never, { mode: 'batch', codigosIbge: tooMany, referenceDate: REFERENCE_DATE })
    ).rejects.toMatchObject({ kind: 'invalid_input' });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockDiscoverResources).not.toHaveBeenCalled();
  });

  it('batch de 1 território produz o mesmo resultado que mode=single equivalente', async () => {
    const contagem = makeTerritory('3118601', 'Contagem');
    mockResolveTerritoriesByCodigosIbge.mockResolvedValue({
      byCod6: new Map([['311860', contagem]]),
      byCodigoIbge: new Map([['3118601', contagem]]),
      notFound: [],
    });
    mockParseCrimesViolentosCsv.mockReturnValue([row({ cod_municipio: '311860', natureza: 'ROUBO CONSUMADO', registros: 5 })]);

    const mockFrom = vi.fn();
    queueTerritoryPersistence(mockFrom);

    const result = await runSecurityCollection({ from: mockFrom } as never, {
      mode: 'batch',
      codigosIbge: ['3118601'],
      months: 1,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.territoriesExpected).toBe(1);
    expect(result.territoriesProcessed).toBe(1);
    expect(result.indicatorsPersisted).toBe(2); // natureza núcleo + índice
    expect(result.territoryResults).toEqual([
      { codigoIbge: '3118601', status: 'completed', requestId: result.requestId, indicatorsPersisted: 2, error: null, durationMs: expect.any(Number) },
    ]);
    expect(result.overallStatus).toBe('completed');
    expect(mockDiscoverResources).toHaveBeenCalledTimes(1);
    expect(mockFetchAnnualCsv).toHaveBeenCalledTimes(1);
    expect(result.filesDownloaded).toBe(1);
  });

  it('download único: 5 municípios no mesmo lote geram exatamente 1 download (não 5)', async () => {
    const territorios = [
      makeTerritory('3166600', 'Serra da Saudade'),
      makeTerritory('3135308', 'Japaraíba'),
      makeTerritory('3119500', 'Coronel Murta'),
      makeTerritory('3139201', 'Malacacheta'),
      makeTerritory('3106200', 'Belo Horizonte'),
    ];
    const byCod6 = new Map(territorios.map((t) => [t.codigo_ibge.slice(0, 6), t]));
    mockResolveTerritoriesByCodigosIbge.mockResolvedValue({
      byCod6,
      byCodigoIbge: new Map(territorios.map((t) => [t.codigo_ibge, t])),
      notFound: [],
    });
    mockParseCrimesViolentosCsv.mockReturnValue(
      territorios.map((t) => row({ cod_municipio: t.codigo_ibge.slice(0, 6), natureza: 'ROUBO CONSUMADO', registros: 1 }))
    );

    const mockFrom = vi.fn();
    for (let i = 0; i < territorios.length; i++) queueTerritoryPersistence(mockFrom);

    const result = await runSecurityCollection({ from: mockFrom } as never, {
      mode: 'batch',
      codigosIbge: territorios.map((t) => t.codigo_ibge),
      months: 1,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.territoriesExpected).toBe(5);
    expect(result.territoriesProcessed).toBe(5);
    expect(result.territoryResults).toHaveLength(5);
    // A prova central do Bloco 4.5: 5 municípios != 5 downloads.
    expect(mockDiscoverResources).toHaveBeenCalledTimes(1);
    expect(mockFetchAnnualCsv).toHaveBeenCalledTimes(1);
    expect(result.filesDownloaded).toBe(1);
  });

  it('download único: 10 municípios (MAX_BATCH_SIZE) no mesmo lote também geram exatamente 1 download', async () => {
    const codigos = ['3115904', '3136108', '3164100', '3131000', '3119500', '3102100', '3132206', '3133501', '3112307', '3106200'];
    const territorios = codigos.map((c) => makeTerritory(c, `Municipio ${c}`));
    const byCod6 = new Map(territorios.map((t) => [t.codigo_ibge.slice(0, 6), t]));
    mockResolveTerritoriesByCodigosIbge.mockResolvedValue({
      byCod6,
      byCodigoIbge: new Map(territorios.map((t) => [t.codigo_ibge, t])),
      notFound: [],
    });
    mockParseCrimesViolentosCsv.mockReturnValue(
      territorios.map((t) => row({ cod_municipio: t.codigo_ibge.slice(0, 6), natureza: 'ROUBO CONSUMADO', registros: 1 }))
    );

    const mockFrom = vi.fn();
    for (let i = 0; i < territorios.length; i++) queueTerritoryPersistence(mockFrom);

    const result = await runSecurityCollection({ from: mockFrom } as never, {
      mode: 'batch',
      codigosIbge: codigos,
      months: 1,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.territoriesExpected).toBe(10);
    expect(result.territoriesProcessed).toBe(10);
    expect(mockDiscoverResources).toHaveBeenCalledTimes(1);
    expect(mockFetchAnnualCsv).toHaveBeenCalledTimes(1);
  });

  it('isolamento: código inexistente no lote vira falha isolada, sem invalidar os demais', async () => {
    const contagem = makeTerritory('3118601', 'Contagem');
    mockResolveTerritoriesByCodigosIbge.mockResolvedValue({
      byCod6: new Map([['311860', contagem]]),
      byCodigoIbge: new Map([['3118601', contagem]]),
      notFound: ['9999999'],
    });
    mockParseCrimesViolentosCsv.mockReturnValue([row({ cod_municipio: '311860', natureza: 'ROUBO CONSUMADO', registros: 5 })]);

    const mockFrom = vi.fn();
    queueTerritoryPersistence(mockFrom);

    const result = await runSecurityCollection({ from: mockFrom } as never, {
      mode: 'batch',
      codigosIbge: ['3118601', '9999999'],
      months: 1,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.territoriesExpected).toBe(2);
    expect(result.territoriesProcessed).toBe(1); // só Contagem foi processado
    expect(result.overallStatus).toBe('partial'); // 1 sucesso + 1 falha isolada, não "failed" total
    const contagemOutcome = result.territoryResults.find((t) => t.codigoIbge === '3118601');
    const missingOutcome = result.territoryResults.find((t) => t.codigoIbge === '9999999');
    expect(contagemOutcome).toMatchObject({ status: 'completed', indicatorsPersisted: 2 });
    expect(missingOutcome).toMatchObject({ status: 'failed', indicatorsPersisted: 0 });
    expect(missingOutcome?.error).toContain('não encontrado');
  });

  it('mistura válido + inválido não impede a persistência do válido', async () => {
    const contagem = makeTerritory('3118601', 'Contagem');
    const bh = makeTerritory('3106200', 'Belo Horizonte');
    mockResolveTerritoriesByCodigosIbge.mockResolvedValue({
      byCod6: new Map([
        ['311860', contagem],
        ['310620', bh],
      ]),
      byCodigoIbge: new Map([
        ['3118601', contagem],
        ['3106200', bh],
      ]),
      notFound: ['0000000'],
    });
    mockParseCrimesViolentosCsv.mockReturnValue([
      row({ cod_municipio: '311860', natureza: 'ROUBO CONSUMADO', registros: 5 }),
      row({ cod_municipio: '310620', natureza: 'ROUBO CONSUMADO', registros: 8 }),
    ]);

    const mockFrom = vi.fn();
    queueTerritoryPersistence(mockFrom);
    queueTerritoryPersistence(mockFrom);

    const result = await runSecurityCollection({ from: mockFrom } as never, {
      mode: 'batch',
      codigosIbge: ['3118601', '3106200', '0000000'],
      months: 1,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.territoriesExpected).toBe(3);
    expect(result.territoriesProcessed).toBe(2);
    expect(result.territoryResults.filter((t) => t.status === 'completed')).toHaveLength(2);
    expect(result.territoryResults.filter((t) => t.status === 'failed')).toHaveLength(1);
  });

  it('erro parcial: falha ao persistir um indicador de um território não invalida os demais territórios do lote', async () => {
    const contagem = makeTerritory('3118601', 'Contagem');
    const bh = makeTerritory('3106200', 'Belo Horizonte');
    mockResolveTerritoriesByCodigosIbge.mockResolvedValue({
      byCod6: new Map([
        ['311860', contagem],
        ['310620', bh],
      ]),
      byCodigoIbge: new Map([
        ['3118601', contagem],
        ['3106200', bh],
      ]),
      notFound: [],
    });
    mockParseCrimesViolentosCsv.mockReturnValue([
      row({ cod_municipio: '311860', natureza: 'ROUBO CONSUMADO', registros: 5 }),
      row({ cod_municipio: '310620', natureza: 'ROUBO CONSUMADO', registros: 8 }),
    ]);

    const mockFrom = vi.fn();
    // Contagem: as 2 entradas (roubo_consumado + índice) já existem → caminho de UPDATE (que
    // continua individual, mesmo com a persistência em lote — só o INSERT é agrupado). O 1º update
    // (roubo) falha, o 2º (índice) segue OK → partial isolado a Contagem, sem afetar Belo Horizonte.
    mockFrom
      .mockReturnValueOnce(
        selectManyChain({
          data: [
            { id: 'existing-roubo', indicador: 'roubo_consumado', periodo_inicio: '2026-07-01', periodo_fim: '2026-07-31' },
            { id: 'existing-indice', indicador: 'indice_crimes_violentos', periodo_inicio: '2026-07-01', periodo_fim: '2026-07-31' },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(updateEqChain({ data: null, error: { message: 'falha de rede' } })) // roubo: update falha
      .mockReturnValueOnce(updateEqChain(OK)) // índice: update OK
      .mockReturnValueOnce(insertChain(OK)); // collection_run (Contagem, partial)
    queueTerritoryPersistence(mockFrom); // Belo Horizonte: tudo OK

    const result = await runSecurityCollection({ from: mockFrom } as never, {
      mode: 'batch',
      codigosIbge: ['3118601', '3106200'],
      months: 1,
      referenceDate: REFERENCE_DATE,
    });

    const contagemOutcome = result.territoryResults.find((t) => t.codigoIbge === '3118601');
    const bhOutcome = result.territoryResults.find((t) => t.codigoIbge === '3106200');
    expect(contagemOutcome?.status).toBe('partial');
    expect(bhOutcome?.status).toBe('completed');
    expect(result.territoriesProcessed).toBe(2); // ambos tiveram ao menos 1 indicador persistido
    expect(result.overallStatus).toBe('partial');
  });

  it('idempotência do batch: reexecutar o mesmo lote atualiza (não duplica)', async () => {
    const contagem = makeTerritory('3118601', 'Contagem');
    mockResolveTerritoriesByCodigosIbge.mockResolvedValue({
      byCod6: new Map([['311860', contagem]]),
      byCodigoIbge: new Map([['3118601', contagem]]),
      notFound: [],
    });
    mockParseCrimesViolentosCsv.mockReturnValue([row({ cod_municipio: '311860', natureza: 'ROUBO CONSUMADO', registros: 5 })]);

    const mockFrom1 = vi.fn();
    queueTerritoryPersistence(mockFrom1);
    await runSecurityCollection({ from: mockFrom1 } as never, { mode: 'batch', codigosIbge: ['3118601'], months: 1, referenceDate: REFERENCE_DATE });

    const mockFrom2 = vi.fn();
    mockFrom2
      .mockReturnValueOnce(
        selectManyChain({
          data: [
            { id: 'ind-1', indicador: 'roubo_consumado', periodo_inicio: '2026-07-01', periodo_fim: '2026-07-31' },
            { id: 'ind-2', indicador: 'indice_crimes_violentos', periodo_inicio: '2026-07-01', periodo_fim: '2026-07-31' },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(updateEqChain(OK))
      .mockReturnValueOnce(updateEqChain(OK))
      .mockReturnValueOnce(insertChain(OK));

    const result2 = await runSecurityCollection({ from: mockFrom2 } as never, {
      mode: 'batch',
      codigosIbge: ['3118601'],
      months: 1,
      referenceDate: REFERENCE_DATE,
    });

    expect(result2.indicatorsPersisted).toBe(2);
    expect(result2.overallStatus).toBe('completed');
  });

  it('observabilidade: expõe timings e filesDownloaded', async () => {
    const contagem = makeTerritory('3118601', 'Contagem');
    mockResolveTerritoriesByCodigosIbge.mockResolvedValue({
      byCod6: new Map([['311860', contagem]]),
      byCodigoIbge: new Map([['3118601', contagem]]),
      notFound: [],
    });
    mockParseCrimesViolentosCsv.mockReturnValue([row({ cod_municipio: '311860', natureza: 'ROUBO CONSUMADO', registros: 5 })]);

    const mockFrom = vi.fn();
    queueTerritoryPersistence(mockFrom);

    const result = await runSecurityCollection({ from: mockFrom } as never, {
      mode: 'batch',
      codigosIbge: ['3118601'],
      months: 1,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.timings.downloadMs).toBeGreaterThanOrEqual(0);
    expect(result.timings.parseMs).toBeGreaterThanOrEqual(0);
    expect(result.timings.normalizationMs).toBeGreaterThanOrEqual(0);
    expect(result.timings.processingMs).toBeGreaterThanOrEqual(0);
    expect(result.timings.persistenceMs).toBeGreaterThanOrEqual(0);
    expect(result.timings.totalMs).toBeGreaterThanOrEqual(0);
    expect(result.filesDownloaded).toBe(1);
  });
});
