import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  discoverResources,
  selectResourceForYear,
  fetchAnnualCsv,
  parseCrimesViolentosCsv,
  SegurancaSourceError,
  type CkanResource,
} from './seguranca-mg-client';

const originalFetch = global.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('discoverResources', () => {
  it('lista os recursos do catálogo CKAN a partir de package_show', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        result: {
          resources: [
            { id: 'r2025', name: 'Crimes Violentos 2025', format: 'CSV', url: 'https://dados.mg.gov.br/x/2025.csv', last_modified: '2026-01-01' },
            { id: 'r2026', name: 'Crimes Violentos 2026', format: 'CSV', url: 'https://dados.mg.gov.br/x/2026.csv', last_modified: '2026-07-29' },
          ],
        },
      })
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    const resources = await discoverResources('crimes-violentos');
    expect(resources).toHaveLength(2);
    expect(resources[1].name).toBe('Crimes Violentos 2026');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('package_show?id=crimes-violentos'),
      expect.any(Object)
    );
  });

  it('lança erro explícito quando o CKAN retorna success:false', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: false })) as unknown as typeof fetch;
    await expect(discoverResources('crimes-violentos')).rejects.toThrow(SegurancaSourceError);
  });

  it('lança erro explícito quando a resposta não é JSON válido', async () => {
    global.fetch = vi.fn().mockResolvedValue(textResponse('<html>não é json</html>')) as unknown as typeof fetch;
    await expect(discoverResources('crimes-violentos')).rejects.toThrow(SegurancaSourceError);
  });
});

describe('selectResourceForYear', () => {
  const resources: CkanResource[] = [
    { id: 'r2025', name: 'Crimes Violentos 2025', format: 'CSV', url: 'https://x/2025.csv', last_modified: null },
    { id: 'r2026', name: 'Crimes Violentos 2026', format: 'CSV', url: 'https://x/2026.csv', last_modified: null },
    { id: 'rjson', name: 'datapackage.json', format: 'JSON', url: 'https://x/datapackage.json', last_modified: null },
  ];

  it('seleciona o CSV correto pelo ano', () => {
    expect(selectResourceForYear(resources, 2025).id).toBe('r2025');
    expect(selectResourceForYear(resources, 2026).id).toBe('r2026');
  });

  it('falha explicitamente (sem fallback) quando não encontra recurso para o ano', () => {
    expect(() => selectResourceForYear(resources, 2019)).toThrow(SegurancaSourceError);
    try {
      selectResourceForYear(resources, 2019);
    } catch (err) {
      expect((err as SegurancaSourceError).kind).toBe('resource_not_found');
    }
  });

  it('falha explicitamente quando mais de um recurso CSV corresponde ao ano (ambíguo)', () => {
    const dup = [...resources, { id: 'r2025b', name: 'Crimes Violentos 2025 (revisão)', format: 'CSV', url: 'https://x/2025b.csv', last_modified: null }];
    expect(() => selectResourceForYear(dup, 2025)).toThrow(SegurancaSourceError);
  });
});

describe('fetchAnnualCsv', () => {
  it('baixa o texto do CSV', async () => {
    global.fetch = vi.fn().mockResolvedValue(textResponse('a;b\n1;2')) as unknown as typeof fetch;
    const text = await fetchAnnualCsv('https://x/2026.csv');
    expect(text).toBe('a;b\n1;2');
  });

  it('lança erro explícito para arquivo vazio', async () => {
    global.fetch = vi.fn().mockResolvedValue(textResponse('')) as unknown as typeof fetch;
    await expect(fetchAnnualCsv('https://x/2026.csv')).rejects.toThrow(SegurancaSourceError);
  });
});

describe('parseCrimesViolentosCsv', () => {
  const header = 'registros;natureza;municipio;cod_municipio;mes;ano;risp;rmbh';

  it('faz parse de um CSV real (formato SEJUSP-MG)', () => {
    const csv = `${header}\n10;ESTUPRO CONSUMADO;CONTAGEM;311860;1;2026;RISP 2 - CONTAGEM;SIM\n0;ROUBO CONSUMADO;ABADIA DOS DOURADOS;310010;1;2026;RISP 10 - PATOS DE MINAS;NAO`;
    const rows = parseCrimesViolentosCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      registros: 10,
      natureza: 'ESTUPRO CONSUMADO',
      municipio: 'CONTAGEM',
      cod_municipio: '311860',
      mes: 1,
      ano: 2026,
      risp: 'RISP 2 - CONTAGEM',
      rmbh: 'SIM',
    });
  });

  it('tolera BOM no início do arquivo', () => {
    const csv = `﻿${header}\n1;ROUBO CONSUMADO;CONTAGEM;311860;1;2026;RISP 2 - CONTAGEM;SIM`;
    const rows = parseCrimesViolentosCsv(csv);
    expect(rows).toHaveLength(1);
  });

  it('resolve colunas pelo nome do cabeçalho, tolerando reordenação', () => {
    const reordered = 'natureza;registros;ano;mes;cod_municipio;municipio;rmbh;risp';
    const csv = `${reordered}\nROUBO CONSUMADO;5;2026;1;311860;CONTAGEM;SIM;RISP 2 - CONTAGEM`;
    const rows = parseCrimesViolentosCsv(csv);
    expect(rows[0]).toMatchObject({ natureza: 'ROUBO CONSUMADO', registros: 5, ano: 2026, mes: 1, cod_municipio: '311860' });
  });

  it('lança erro explícito quando falta uma coluna obrigatória', () => {
    const csv = 'registros;natureza;municipio;mes;ano;risp;rmbh\n1;ROUBO CONSUMADO;CONTAGEM;1;2026;RISP 2;SIM';
    expect(() => parseCrimesViolentosCsv(csv)).toThrow(SegurancaSourceError);
  });

  it('lança erro explícito para arquivo vazio (sem nenhuma linha)', () => {
    expect(() => parseCrimesViolentosCsv('')).toThrow(SegurancaSourceError);
  });

  it('lança erro explícito para arquivo com apenas cabeçalho (sem dados)', () => {
    expect(() => parseCrimesViolentosCsv(header)).toThrow(SegurancaSourceError);
  });

  it('lança erro explícito para CSV malformado (linha com colunas faltando)', () => {
    const csv = `${header}\n10;ESTUPRO CONSUMADO;CONTAGEM;311860;1;2026`;
    expect(() => parseCrimesViolentosCsv(csv)).toThrow(SegurancaSourceError);
  });

  it('lança erro explícito quando "registros"/"mes"/"ano" não são numéricos', () => {
    const csv = `${header}\nabc;ESTUPRO CONSUMADO;CONTAGEM;311860;1;2026;RISP 2;SIM`;
    expect(() => parseCrimesViolentosCsv(csv)).toThrow(SegurancaSourceError);
  });
});
