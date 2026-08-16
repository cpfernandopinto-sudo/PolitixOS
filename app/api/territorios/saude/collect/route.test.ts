import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockRunHealthCollection } = vi.hoisted(() => ({ mockRunHealthCollection: vi.fn() }));
vi.mock('@/lib/territorios/saude-collector', () => ({ runHealthCollection: mockRunHealthCollection }));
vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: () => ({ from: vi.fn() }) }));

import { POST } from './route';

const SECRET = 'segredo-saude-teste';
function requestWith(body: unknown, headers: Record<string, string> = { 'x-territorios-saude-secret': SECRET }) {
  return new NextRequest('http://localhost/api/territorios/saude/collect', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}

beforeEach(() => { vi.clearAllMocks(); process.env.TERRITORIOS_SAUDE_CALLBACK_SECRET = SECRET; });
afterEach(() => delete process.env.TERRITORIOS_SAUDE_CALLBACK_SECRET);

describe('POST /api/territorios/saude/collect', () => {
  it('exige credential dedicada do Motor Saúde', async () => {
    expect((await POST(requestWith({ codigo_ibge: '3118601' }, {}))).status).toBe(401);
    expect(mockRunHealthCollection).not.toHaveBeenCalled();
  });

  it('valida o contrato externo', async () => {
    expect((await POST(requestWith({}))).status).toBe(400);
    expect((await POST(requestWith({ codigo_ibge: '311860', force_refresh: false }))).status).toBe(400);
    expect((await POST(requestWith({ codigo_ibge: '3118601', force_refresh: 'não' }))).status).toBe(400);
  });

  it('retorna envelope comum em cache hit', async () => {
    mockRunHealthCollection.mockResolvedValue({ engine: 'datasus-cnes-health-v1', status: 'completed', codigoIbge: '3118601', requestId: 'req-1', inserted: 0, updated: 0, recordsPersisted: 0, lastUpdated: '2026-08-15T10:00:00.000Z', coverage: { dataset: 'CNES_ESTABELECIMENTOS', referenceDate: '2026-08-15', rawRecords: 1044, pages: 53 }, cacheHit: true, error: null });
    const response = await POST(requestWith({ codigo_ibge: '3118601', force_refresh: false }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ engine: 'saude', status: 'completed', codigo_ibge: '3118601', updated: false, recordsPersisted: 0, cacheHit: true, error: null });
  });

  it('propaga force_refresh e compatibilidade interna codigoIbge', async () => {
    mockRunHealthCollection.mockResolvedValue({ engine: 'datasus-cnes-health-v1', status: 'completed', codigoIbge: '3118601', requestId: 'req-2', inserted: 0, updated: 32, recordsPersisted: 32, lastUpdated: '2026-08-15T12:00:00.000Z', coverage: {}, cacheHit: false, error: null });
    await POST(requestWith({ codigoIbge: '3118601', force_refresh: true }));
    expect(mockRunHealthCollection).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ codigoIbge: '3118601', forceRefresh: true }));
  });
});
