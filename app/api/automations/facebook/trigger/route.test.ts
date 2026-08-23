import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetSession, mockRun } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRun: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/lib/facebook/operational', () => ({ runFacebookCollectionForSocialAccount: mockRun }));
vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: () => ({ kind: 'admin' }) }));

import { POST } from './route';
import { __resetFacebookTriggerRateLimitForTests } from '@/lib/facebook/trigger-rate-limit';

const gestor = {
  userId: 'user-1', role: 'gestor', permissions: ['automacoes'],
  allowedTargetIds: ['target-1'], clientId: '11111111-1111-4111-8111-111111111111',
};
const payload = {
  socialAccountId: '22222222-2222-4222-8222-222222222222',
  startDate: '2026-08-21', endDate: '2026-08-23',
};

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/automations/facebook/trigger', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetFacebookTriggerRateLimitForTests();
  delete process.env.FACEBOOK_COLLECTION_WEBHOOK_SECRET;
  mockGetSession.mockResolvedValue(gestor);
  mockRun.mockResolvedValue({ runId: 'run-1', collectionComplete: true, termination: 'CURSOR_NULL' });
});

describe('POST /api/automations/facebook/trigger', () => {
  it('rejeita chamada sem autenticação', async () => {
    mockGetSession.mockResolvedValue(null);
    expect((await POST(request(payload))).status).toBe(401);
  });

  it('deriva tenant e targets da sessão sem aceitar IDs do browser', async () => {
    const response = await POST(request({ ...payload, clientId: 'forged', targetId: 'forged' }));
    expect(response.status).toBe(400);

    const accepted = await POST(request(payload));
    expect(accepted.status).toBe(200);
    expect(mockRun).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      expectedClientId: gestor.clientId,
      allowedTargetIds: gestor.allowedTargetIds,
    }));
  });

  it('rejeita usuário sem permissão operacional', async () => {
    mockGetSession.mockResolvedValue({ ...gestor, permissions: [] });
    expect((await POST(request(payload))).status).toBe(403);
  });

  it('aceita autenticação server-to-server somente com segredo correto', async () => {
    process.env.FACEBOOK_COLLECTION_WEBHOOK_SECRET = 'server-secret';
    expect((await POST(request(payload, { 'x-webhook-secret': 'wrong' }))).status).toBe(401);
    const response = await POST(request(payload, { 'x-webhook-secret': 'server-secret' }));
    expect(response.status).toBe(200);
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ expectedClientId: null, allowedTargetIds: null }));
  });

  it('aplica rate limit antes da segunda coleta', async () => {
    expect((await POST(request(payload))).status).toBe(200);
    expect((await POST(request(payload))).status).toBe(429);
  });

  it('expõe status estruturado de completude sem quebrar o resultado existente', async () => {
    const complete = await POST(request(payload));
    expect(await complete.json()).toMatchObject({
      ok: true,
      status: 'SUCCESS_COMPLETE',
      result: { collectionComplete: true, termination: 'CURSOR_NULL' },
    });

    __resetFacebookTriggerRateLimitForTests();
    mockRun.mockResolvedValue({ runId: 'run-2', collectionComplete: false, termination: 'MAX_PAGES', postsPersisted: 3 });
    const partial = await POST(request(payload));
    expect(await partial.json()).toMatchObject({
      ok: true,
      status: 'SUCCESS_PARTIAL',
      result: { collectionComplete: false, termination: 'MAX_PAGES', postsPersisted: 3 },
    });
  });

  it('não expõe mensagem interna desconhecida', async () => {
    mockRun.mockRejectedValue(new Error('database stack with secret'));
    const response = await POST(request(payload));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, code: 'FACEBOOK_OPERATIONAL_FAILED' });
  });
});
