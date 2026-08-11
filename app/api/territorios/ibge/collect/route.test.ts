import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockRunIbgeCollection } = vi.hoisted(() => ({ mockRunIbgeCollection: vi.fn() }));
vi.mock('@/lib/territorios/ibge-collector', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/territorios/ibge-collector')>();
  return { ...actual, runIbgeCollection: mockRunIbgeCollection };
});

vi.mock('@/lib/supabaseClient', () => ({
  createAdminClient: () => ({ from: vi.fn() }),
}));

import { POST } from './route';

const SECRET = 'segredo-de-teste-territorios-ibge';

function requestWith(body: unknown, headers: Record<string, string> = { 'x-territorios-secret': SECRET }) {
  return new NextRequest('http://localhost/api/territorios/ibge/collect', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TERRITORIOS_IBGE_CALLBACK_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.TERRITORIOS_IBGE_CALLBACK_SECRET;
});

describe('POST /api/territorios/ibge/collect — autenticação máquina-a-máquina', () => {
  it('503 quando o segredo não está configurado no servidor', async () => {
    delete process.env.TERRITORIOS_IBGE_CALLBACK_SECRET;
    const res = await POST(requestWith({ mode: 'uf', uf: 'MG' }));
    expect(res.status).toBe(503);
  });

  it('401 quando o header do segredo está ausente', async () => {
    const res = await POST(requestWith({ mode: 'uf', uf: 'MG' }, {}));
    expect(res.status).toBe(401);
    expect(mockRunIbgeCollection).not.toHaveBeenCalled();
  });

  it('401 quando o segredo enviado está incorreto', async () => {
    const res = await POST(requestWith({ mode: 'uf', uf: 'MG' }, { 'x-territorios-secret': 'errado' }));
    expect(res.status).toBe(401);
    expect(mockRunIbgeCollection).not.toHaveBeenCalled();
  });

  it('aceita a requisição quando o segredo confere', async () => {
    mockRunIbgeCollection.mockResolvedValue({
      requestId: 'r1', mode: 'uf', uf: 'MG', blocked: false,
      itemsExpected: 1, itemsReceived: 1, itemsPersisted: 1, itemsDiscarded: 0, itemsFailed: 0, errors: [], outcomes: [],
    });
    const res = await POST(requestWith({ mode: 'uf', uf: 'MG' }));
    expect(res.status).toBe(200);
    expect(mockRunIbgeCollection).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/territorios/ibge/collect — validação de payload', () => {
  it('400 quando "mode" está ausente ou é inválido', async () => {
    const res1 = await POST(requestWith({}));
    expect(res1.status).toBe(400);
    const res2 = await POST(requestWith({ mode: 'brasil-inteiro' }));
    expect(res2.status).toBe(400);
  });

  it('400 quando mode=uf sem "uf"', async () => {
    const res = await POST(requestWith({ mode: 'uf' }));
    expect(res.status).toBe(400);
  });

  it('400 quando mode=single sem "codigo_ibge"', async () => {
    const res = await POST(requestWith({ mode: 'single' }));
    expect(res.status).toBe(400);
  });

  it('400 para JSON inválido no corpo', async () => {
    const req = new NextRequest('http://localhost/api/territorios/ibge/collect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-territorios-secret': SECRET },
      body: '{invalido',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/territorios/ibge/collect — resultado', () => {
  it('403 quando o coletor recusa carga nacional (mode=national bloqueado)', async () => {
    mockRunIbgeCollection.mockResolvedValue({
      requestId: 'r1', mode: 'national', uf: null, blocked: true, blockedReason: 'bloqueado',
      itemsExpected: 0, itemsReceived: 0, itemsPersisted: 0, itemsDiscarded: 0, itemsFailed: 0, errors: [], outcomes: [],
    });
    const res = await POST(requestWith({ mode: 'national' }));
    expect(res.status).toBe(403);
  });

  it('502 quando o coletor lança erro (IBGE indisponível)', async () => {
    mockRunIbgeCollection.mockRejectedValue(new Error('IBGE indisponível'));
    const res = await POST(requestWith({ mode: 'uf', uf: 'MG' }));
    expect(res.status).toBe(502);
  });
});
