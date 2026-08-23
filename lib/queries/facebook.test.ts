import { describe, expect, it, vi } from 'vitest';

const order = vi.fn().mockResolvedValue({ data: [{ id: 'row-1', platform_post_id: 'post-1' }], error: null });
const postsChain = { eq: vi.fn(), gte: vi.fn(), lt: vi.fn(), order };
postsChain.eq.mockReturnValue(postsChain);
postsChain.gte.mockReturnValue(postsChain);
postsChain.lt.mockReturnValue(postsChain);

const aiIn = vi.fn().mockResolvedValue({ data: [{ content_id: 'row-1', sentiment: 'positivo' }], error: null });
const aiChain = { eq: vi.fn(), in: aiIn };
aiChain.eq.mockReturnValue(aiChain);

const from = vi.fn((table: string) => {
  if (table === 'social_posts') return { select: vi.fn().mockReturnValue(postsChain) };
  if (table === 'ai_analysis') return { select: vi.fn().mockReturnValue(aiChain) };
  throw new Error(`unexpected table ${table}`);
});

vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: () => ({ from }) }));

describe('Facebook backend read', () => {
  it('filtra por plataforma, tenant, target, conta e período exclusivo', async () => {
    const { fetchFacebookPosts } = await import('./facebook');
    await expect(fetchFacebookPosts({ clientId: 'client-1', targetId: 'target-1', socialAccountId: 'account-1', startDate: '2026-08-21', endDate: '2026-08-23' })).resolves.toEqual([{ id: 'row-1', platform_post_id: 'post-1' }]);
    expect(postsChain.eq.mock.calls).toEqual([
      ['platform', 'facebook'], ['client_id', 'client-1'], ['target_id', 'target-1'], ['social_account_id', 'account-1'],
    ]);
    expect(postsChain.gte).toHaveBeenCalledWith('taken_at', '2026-08-21');
    expect(postsChain.lt).toHaveBeenCalledWith('taken_at', '2026-08-23');
  });

  it('falha fechada com escopo ou janela inválida', async () => {
    const { fetchFacebookPosts } = await import('./facebook');
    await expect(fetchFacebookPosts({ clientId: '', targetId: 'target-1', socialAccountId: 'account-1', startDate: '2026-08-23', endDate: '2026-08-21' })).rejects.toThrow('FACEBOOK_READ_SCOPE_INVALID');
  });
});

describe('fetchFacebookPostsWithAnalysis (Bloco 4, backend readiness)', () => {
  it('junta o post normalizado (contrato analítico) com a linha correspondente de ai_analysis, pelo mesmo padrão de Instagram/X', async () => {
    const { fetchFacebookPostsWithAnalysis } = await import('./facebook');
    const result = await fetchFacebookPostsWithAnalysis({ clientId: 'client-1', targetId: 'target-1', socialAccountId: 'account-1', startDate: '2026-08-21', endDate: '2026-08-23' });

    expect(aiChain.eq).toHaveBeenCalledWith('content_type', 'post');
    expect(aiIn).toHaveBeenCalledWith('content_id', ['row-1']);
    expect(result).toEqual([{
      post: expect.objectContaining({ id: 'row-1', platform: 'facebook' }),
      analysis: { content_id: 'row-1', sentiment: 'positivo' },
    }]);
  });

  it('não consulta ai_analysis quando não há posts (evita query vazia desnecessária)', async () => {
    order.mockResolvedValueOnce({ data: [], error: null });
    aiIn.mockClear();
    const { fetchFacebookPostsWithAnalysis } = await import('./facebook');
    await expect(fetchFacebookPostsWithAnalysis({ clientId: 'client-1', targetId: 'target-1', socialAccountId: 'account-1', startDate: '2026-08-21', endDate: '2026-08-23' })).resolves.toEqual([]);
    expect(aiIn).not.toHaveBeenCalled();
  });
});
