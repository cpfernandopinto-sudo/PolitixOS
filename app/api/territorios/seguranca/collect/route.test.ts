import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockRunSecurityCollection } = vi.hoisted(() => ({ mockRunSecurityCollection: vi.fn() }));
vi.mock('@/lib/territorios/seguranca-collector', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/territorios/seguranca-collector')>();
  return { ...actual, runSecurityCollection: mockRunSecurityCollection };
});

vi.mock('@/lib/supabaseClient', () => ({
  createAdminClient: () => ({ from: vi.fn() }),
}));

import { POST } from './route';
import { SecurityCollectionError } from '@/lib/territorios/seguranca-collector';
import { SegurancaSourceError } from '@/lib/territorios/seguranca-mg-client';

const SECRET = 'segredo-de-teste-territorios-seguranca';

function requestWith(body: unknown, headers: Record<string, string> = { 'x-territorios-seguranca-secret': SECRET }) {
  return new NextRequest('http://localhost/api/territorios/seguranca/collect', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function baseResult(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'r1',
    mode: 'single',
    source: 'SEJUSP-MG',
    dataset: 'crimes-violentos',
    monthsRequested: 12,
    window: { from: { year: 2025, month: 8 }, to: { year: 2026, month: 7 } },
    territoriesExpected: 1,
    territoriesProcessed: 1,
    indicatorsPersisted: 5,
    rowsReceived: 10,
    rowsDiscarded: 0,
    unknownNatures: [],
    excludedOutOfScopeNatures: [],
    unmatchedMunicipalities: [],
    errors: [],
    overallStatus: 'completed',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TERRITORIOS_SEGURANCA_CALLBACK_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.TERRITORIOS_SEGURANCA_CALLBACK_SECRET;
});

describe('POST /api/territorios/seguranca/collect — autenticação máquina-a-máquina', () => {
  it('503 quando o segredo não está configurado no servidor', async () => {
    delete process.env.TERRITORIOS_SEGURANCA_CALLBACK_SECRET;
    const res = await POST(requestWith({ mode: 'single', codigo_ibge: '3118601' }));
    expect(res.status).toBe(503);
  });

  it('401 quando o header do segredo está ausente', async () => {
    const res = await POST(requestWith({ mode: 'single', codigo_ibge: '3118601' }, {}));
    expect(res.status).toBe(401);
    expect(mockRunSecurityCollection).not.toHaveBeenCalled();
  });

  it('401 quando o segredo enviado está incorreto', async () => {
    const res = await POST(requestWith({ mode: 'single', codigo_ibge: '3118601' }, { 'x-territorios-seguranca-secret': 'errado' }));
    expect(res.status).toBe(401);
    expect(mockRunSecurityCollection).not.toHaveBeenCalled();
  });

  it('não aceita o header/nome de secret do Motor IBGE — endpoint próprio, sem reuso', async () => {
    const res = await POST(requestWith({ mode: 'single', codigo_ibge: '3118601' }, { 'x-territorios-secret': SECRET }));
    expect(res.status).toBe(401);
  });

  it('aceita a requisição quando o segredo confere', async () => {
    mockRunSecurityCollection.mockResolvedValue(baseResult());
    const res = await POST(requestWith({ mode: 'single', codigo_ibge: '3118601' }));
    expect(res.status).toBe(200);
    expect(mockRunSecurityCollection).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/territorios/seguranca/collect — validação de payload', () => {
  it('400 quando "mode" está ausente ou é inválido', async () => {
    const res1 = await POST(requestWith({}));
    expect(res1.status).toBe(400);
    const res2 = await POST(requestWith({ mode: 'brasil-inteiro' }));
    expect(res2.status).toBe(400);
  });

  it('400 quando mode=single sem "codigo_ibge"', async () => {
    const res = await POST(requestWith({ mode: 'single' }));
    expect(res.status).toBe(400);
  });

  it('aceita mode=mg sem "codigo_ibge"', async () => {
    mockRunSecurityCollection.mockResolvedValue(baseResult({ mode: 'mg', territoriesExpected: 853 }));
    const res = await POST(requestWith({ mode: 'mg' }));
    expect(res.status).toBe(200);
  });

  it('400 para JSON inválido no corpo', async () => {
    const req = new NextRequest('http://localhost/api/territorios/seguranca/collect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-territorios-seguranca-secret': SECRET },
      body: '{invalido',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('400 quando "months" está fora do intervalo permitido', async () => {
    const res1 = await POST(requestWith({ mode: 'single', codigo_ibge: '3118601', months: 0 }));
    expect(res1.status).toBe(400);
    const res2 = await POST(requestWith({ mode: 'single', codigo_ibge: '3118601', months: 25 }));
    expect(res2.status).toBe(400);
    const res3 = await POST(requestWith({ mode: 'single', codigo_ibge: '3118601', months: 3.5 }));
    expect(res3.status).toBe(400);
    expect(mockRunSecurityCollection).not.toHaveBeenCalled();
  });

  it('usa months=12 como default quando omitido', async () => {
    mockRunSecurityCollection.mockResolvedValue(baseResult());
    await POST(requestWith({ mode: 'single', codigo_ibge: '3118601' }));
    expect(mockRunSecurityCollection).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ months: 12 }));
  });
});

describe('POST /api/territorios/seguranca/collect — resultado', () => {
  it('200 com o contrato adaptado ao domínio Segurança (não copia o do IBGE)', async () => {
    mockRunSecurityCollection.mockResolvedValue(
      baseResult({ unknownNatures: ['X'], excludedOutOfScopeNatures: ['FEMINICIDIO TENTADO'], unmatchedMunicipalities: ['999999'] })
    );
    const res = await POST(requestWith({ mode: 'single', codigo_ibge: '3118601' }));
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      source: 'SEJUSP-MG',
      dataset: 'crimes-violentos',
      unknown_natures: ['X'],
      excluded_out_of_scope_natures: ['FEMINICIDIO TENTADO'],
      unmatched_municipalities: ['999999'],
      overall_status: 'completed',
    });
  });

  it('404 quando o território não é encontrado (mode=single)', async () => {
    mockRunSecurityCollection.mockRejectedValue(new SecurityCollectionError('territory_not_found', 'não encontrado'));
    const res = await POST(requestWith({ mode: 'single', codigo_ibge: '9999999' }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('TERRITORY_NOT_FOUND');
  });

  it('502 quando a fonte SEJUSP-MG falha (download/parse)', async () => {
    mockRunSecurityCollection.mockRejectedValue(new SegurancaSourceError('server_error', 'SEJUSP-MG indisponível'));
    const res = await POST(requestWith({ mode: 'single', codigo_ibge: '3118601' }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe('SOURCE_FETCH_FAILED');
  });

  it('502 para erro desconhecido no coletor', async () => {
    mockRunSecurityCollection.mockRejectedValue(new Error('falha inesperada'));
    const res = await POST(requestWith({ mode: 'single', codigo_ibge: '3118601' }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe('SEGURANCA_COLLECTION_FAILED');
  });
});
