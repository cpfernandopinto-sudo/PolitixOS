import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetSession, mockCreateAdminClient } = vi.hoisted(() => ({ mockGetSession: vi.fn(), mockCreateAdminClient: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: mockCreateAdminClient }));

import { __resetXTriggerRateLimitForTests, POST } from './route';

const admin = { userId: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin', permissions: [], allowedTargetIds: [], clientId: null, expiresAt: '2099-01-01' };
const gestor = { userId: 'user-1', name: 'Gestor', email: 'gestor@example.com', role: 'gestor', permissions: ['x'], allowedTargetIds: ['target-1'], clientId: 'client-1', expiresAt: '2099-01-01' };

function request(body: unknown, origin = 'http://localhost') {
  return new NextRequest('http://localhost/api/automations/x/trigger', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) });
}

function mockAuthorizedHandles(handles = [{ handle: '@Mi_Bolsonaro', target_id: 'target-1' }]) {
  const chain = { select: vi.fn(), in: vi.fn(), eq: vi.fn() };
  chain.select.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.eq.mockResolvedValue({ data: handles, error: null });
  mockCreateAdminClient.mockReturnValue({ from: vi.fn(() => chain) });
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetXTriggerRateLimitForTests();
  process.env.N8N_X_PIPELINE_V2_WEBHOOK_URL = 'https://n8n.example/webhook/x-pipeline-v2-trigger';
  process.env.N8N_X_PIPELINE_WEBHOOK_SECRET = 'test-secret';
  mockGetSession.mockResolvedValue(admin);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.N8N_X_PIPELINE_V2_WEBHOOK_URL;
  delete process.env.N8N_X_PIPELINE_WEBHOOK_SECRET;
});

describe('POST /api/automations/x/trigger', () => {
  it('rejeita usuário não autenticado', async () => {
    mockGetSession.mockResolvedValue(null);
    expect((await POST(request({ mode: 'posts' }))).status).toBe(401);
  });

  it('rejeita usuário sem permissão X', async () => {
    mockGetSession.mockResolvedValue({ ...gestor, permissions: [] });
    expect((await POST(request({ mode: 'posts' }))).status).toBe(403);
  });

  it('não permite execução cara para role visualizador', async () => {
    mockGetSession.mockResolvedValue({ ...gestor, role: 'visualizador', permissions: ['x'] });
    expect((await POST(request({ mode: 'posts' }))).status).toBe(403);
  });

  it('rejeita mode inválido', async () => {
    expect((await POST(request({ mode: 'anything' }))).status).toBe(400);
  });

  for (const mode of ['posts', 'replies', 'ai', 'reprocess', 'full'] as const) {
    it(`envia mode ${mode} e retorna accepted`, async () => {
      const response = await POST(request({ mode }));
      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({ ok: true, status: 'accepted', mode });
      const init = vi.mocked(fetch).mock.calls[0][1];
      expect(JSON.parse(String(init?.body))).toMatchObject({ mode, source: 'politixos_manual' });
    });
  }

  it('deriva tenant e target_allowlist no servidor para não-admin', async () => {
    mockGetSession.mockResolvedValue(gestor);
    mockAuthorizedHandles();
    await POST(request({ mode: 'posts', clientId: 'forged', target_allowlist: ['attacker'], ai_enabled: true }));
    const payload = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(payload).toMatchObject({ clientId: 'client-1', target_allowlist: ['Mi_Bolsonaro'], mode: 'posts' });
    expect(payload).not.toHaveProperty('ai_enabled');
  });

  it('preserva ai_enabled=false em mode ai para no-op controlado', async () => {
    const response = await POST(request({ mode: 'ai', ai_enabled: false }));
    expect(response.status).toBe(202);
    const payload = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(payload).toMatchObject({ mode: 'ai', ai_enabled: false });
  });

  it('usa ai_enabled=false como default fail-safe dos modes de IA', async () => {
    await POST(request({ mode: 'ai' }));
    const payload = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(payload).toMatchObject({ mode: 'ai', ai_enabled: false });
  });

  it('restringe full a admin', async () => {
    mockGetSession.mockResolvedValue(gestor);
    expect((await POST(request({ mode: 'full' }))).status).toBe(403);
  });

  it('rejeita origem cross-site', async () => {
    expect((await POST(request({ mode: 'posts' }, 'https://attacker.example'))).status).toBe(403);
  });

  it('trata ausência da URL e do secret sem expor valores', async () => {
    delete process.env.N8N_X_PIPELINE_V2_WEBHOOK_URL;
    let response = await POST(request({ mode: 'posts' }));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('test-secret');
    __resetXTriggerRateLimitForTests();
    process.env.N8N_X_PIPELINE_V2_WEBHOOK_URL = 'https://n8n.example/webhook/x';
    delete process.env.N8N_X_PIPELINE_WEBHOOK_SECRET;
    response = await POST(request({ mode: 'posts' }));
    expect(response.status).toBe(503);
  });

  it('trata timeout', async () => {
    vi.mocked(fetch).mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const response = await POST(request({ mode: 'ai' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'N8N_TIMEOUT' });
  });

  it('sanitiza falha n8n 500 como 502', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('internal stack secret', { status: 500 }));
    const response = await POST(request({ mode: 'posts' }));
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain('internal stack');
  });

  it('aplica rate limit por usuário e mode', async () => {
    expect((await POST(request({ mode: 'ai' }))).status).toBe(202);
    const response = await POST(request({ mode: 'ai' }));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
  });

  it('envia segredo somente no header server-side', async () => {
    await POST(request({ mode: 'posts' }));
    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(new Headers(init?.headers).get('X-Webhook-Secret')).toBe('test-secret');
    expect(new Headers(init?.headers).has('N8N_X_PIPELINE_WEBHOOK_SECRET')).toBe(false);
    expect(String(init?.body)).not.toContain('test-secret');
  });
});
