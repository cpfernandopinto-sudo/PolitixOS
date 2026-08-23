import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetSession, mockRun, mockFrom } = vi.hoisted(() => ({
  mockGetSession: vi.fn(), mockRun: vi.fn(), mockFrom: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/lib/facebook/analysis-runner', () => ({ runFacebookAnalysis: mockRun }));
vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: () => ({ from: mockFrom }) }));

import { __resetFacebookAnalyzeRateLimitForTests, POST } from './route';

const clientId = '11111111-1111-4111-8111-111111111111';
const targetId = '22222222-2222-4222-8222-222222222222';
const gestor = { userId: 'user-1', role: 'gestor', permissions: ['automacoes'], allowedTargetIds: [targetId], clientId };

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/automations/facebook/analyze', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost', ...headers }, body: JSON.stringify(body),
  });
}

function targetChain(found = true, error: { message: string } | null = null) {
  const chain = { eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: found ? { id: targetId } : null, error }) };
  chain.eq.mockReturnValue(chain);
  return { select: vi.fn().mockReturnValue(chain) };
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetFacebookAnalyzeRateLimitForTests();
  delete process.env.FACEBOOK_COLLECTION_WEBHOOK_SECRET;
  mockGetSession.mockResolvedValue(gestor);
  mockFrom.mockReturnValue(targetChain());
  mockRun.mockResolvedValue({ eligible: 1, processed: 1, success: 1, failed: 0, skipped: 0, items: [{ postId: 'post-1', outcome: 'success' }] });
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('POST /api/automations/facebook/analyze', () => {
  it('rejeita autenticação ausente ou segredo inválido', async () => {
    mockGetSession.mockResolvedValue(null);
    expect((await POST(request({ clientId, targetId }))).status).toBe(401);
    process.env.FACEBOOK_COLLECTION_WEBHOOK_SECRET = 'correct';
    expect((await POST(request({ clientId, targetId }, { 'x-webhook-secret': 'wrong' }))).status).toBe(401);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it.each([
    [null], [{ targetId }], [{ clientId }],
    [{ clientId: 'invalid', targetId }], [{ clientId, targetId: 'invalid' }],
    [{ clientId, targetId, maxPosts: 0 }], [{ clientId, targetId, maxPosts: 21 }],
    [{ clientId, targetId, maxPosts: 1.5 }], [{ clientId, targetId, extra: true }],
  ])('rejeita payload inválido %#', async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('impede gestor de selecionar outro tenant ou target', async () => {
    expect((await POST(request({ clientId: '33333333-3333-4333-8333-333333333333', targetId }))).status).toBe(403);
    expect((await POST(request({ clientId, targetId: '44444444-4444-4444-8444-444444444444' }))).status).toBe(403);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('valida no banco que target ativo pertence ao client', async () => {
    mockFrom.mockReturnValue(targetChain(false));
    const response = await POST(request({ clientId, targetId }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, code: 'TARGET_SCOPE_INVALID' });
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('chama o runner real por contrato e retorna SUCCESS estruturado', async () => {
    const response = await POST(request({ clientId, targetId, maxPosts: 5 }, { 'x-correlation-id': 'n8n-run-1' }));
    expect(response.status).toBe(200);
    expect(mockRun).toHaveBeenCalledWith(expect.objectContaining({ clientId, targetId, maxPosts: 5, db: expect.anything() }));
    expect(await response.json()).toEqual(expect.objectContaining({
      ok: true, status: 'SUCCESS', platform: 'facebook', clientId, targetId,
      correlationId: 'n8n-run-1', eligible: 1, processed: 1, success: 1, failed: 0,
      skipped: 0, analysisComplete: true, termination: 'COMPLETED',
    }));
  });

  it('não aceita correlation id capaz de injetar conteúdo nos logs', async () => {
    const response = await POST(request({ clientId, targetId }, { 'x-correlation-id': 'bad correlation' }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('trata eligible=0 como NOTHING_TO_PROCESS sem erro HTTP', async () => {
    mockRun.mockResolvedValue({ eligible: 0, processed: 0, success: 0, failed: 0, skipped: 0, items: [] });
    const response = await POST(request({ clientId, targetId }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, status: 'NOTHING_TO_PROCESS', analysisComplete: true, termination: 'NOTHING_TO_PROCESS' });
  });

  it('mantém falha parcial como execução válida e sanitiza motivos internos', async () => {
    mockRun.mockResolvedValue({
      eligible: 2, processed: 2, success: 1, failed: 1, skipped: 0,
      items: [{ postId: 'post-1', outcome: 'success' }, { postId: 'post-2', outcome: 'failed', reason: 'provider secret stack' }],
    });
    const response = await POST(request({ clientId, targetId }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, status: 'SUCCESS_WITH_FAILURES', failed: 1, analysisComplete: false, termination: 'COMPLETED_WITH_FAILURES' });
    expect(body.items[1].reason).toBe('ANALYSIS_FAILED');
  });

  it('retorna falha HTTP sanitizada quando o runner lança', async () => {
    mockRun.mockRejectedValue(new Error('database stack with secret'));
    const response = await POST(request({ clientId, targetId }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ ok: false, status: 'FAILED', code: 'FACEBOOK_ANALYSIS_FAILED' });
  });

  it('aplica rate limit por client/target e contém chamadas simultâneas no mesmo runtime', async () => {
    expect((await POST(request({ clientId, targetId }))).status).toBe(200);
    const response = await POST(request({ clientId, targetId }));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('aceita n8n server-to-server apenas com o segredo compartilhado correto', async () => {
    process.env.FACEBOOK_COLLECTION_WEBHOOK_SECRET = 'server-secret';
    const response = await POST(request({ clientId, targetId }, { 'x-webhook-secret': 'server-secret' }));
    expect(response.status).toBe(200);
    expect(mockGetSession).not.toHaveBeenCalled();
  });
});
