import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockRunTseCollection } = vi.hoisted(() => ({ mockRunTseCollection: vi.fn() }));
vi.mock('@/lib/territorios/tse-collector', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/territorios/tse-collector')>();
  return { ...actual, runTseCollection: mockRunTseCollection };
});
vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: () => ({ from: vi.fn() }) }));

import { POST } from './route';

const SECRET = 'segredo-tse-teste';
function requestWith(body: unknown, headers: Record<string, string> = { 'x-territorios-tse-secret': SECRET }) {
  return new NextRequest('http://localhost/api/territorios/tse/collect', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TERRITORIOS_TSE_CALLBACK_SECRET = SECRET;
});
afterEach(() => delete process.env.TERRITORIOS_TSE_CALLBACK_SECRET);

describe('POST /api/territorios/tse/collect', () => {
  it('protege o coletor por segredo de máquina', async () => {
    expect((await POST(requestWith({ codigo_ibge: '3118601' }, {}))).status).toBe(401);
    expect(mockRunTseCollection).not.toHaveBeenCalled();
  });

  it('valida código, anos e request id no contrato', async () => {
    expect((await POST(requestWith({}))).status).toBe(400);
    expect((await POST(requestWith({ codigo_ibge: '3118601', years: ['2024'] }))).status).toBe(400);
  });

  it('executa apenas o município solicitado', async () => {
    mockRunTseCollection.mockResolvedValue({
      requestId: '00000000-0000-4000-8000-000000000001',
      territory: { codigoIbge: '3118601' },
      dataset: { metadata: { referenceYears: [2016, 2020, 2024] }, totals: [], results: [], parties: [] },
      indicatorsPersisted: 0, evidencePersisted: 0, overallStatus: 'completed', errors: [],
    });
    const response = await POST(requestWith({ codigo_ibge: '3118601', years: [2016, 2020, 2024] }));
    expect(response.status).toBe(200);
    expect(mockRunTseCollection).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ codigoIbge: '3118601', years: [2016, 2020, 2024] }));
  });
});
