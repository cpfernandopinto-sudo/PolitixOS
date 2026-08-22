import { describe, expect, it, vi } from 'vitest';

const order = vi.fn().mockResolvedValue({ data: [{ platform_post_id: 'post-1' }], error: null });
const chain = { eq: vi.fn(), gte: vi.fn(), lt: vi.fn(), order };
chain.eq.mockReturnValue(chain);
chain.gte.mockReturnValue(chain);
chain.lt.mockReturnValue(chain);
const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: () => ({ from }) }));

describe('Facebook backend read', () => {
  it('filtra por plataforma, tenant, target, conta e período exclusivo', async () => {
    const { fetchFacebookPosts } = await import('./facebook');
    await expect(fetchFacebookPosts({ clientId: 'client-1', targetId: 'target-1', socialAccountId: 'account-1', startDate: '2026-08-21', endDate: '2026-08-23' })).resolves.toEqual([{ platform_post_id: 'post-1' }]);
    expect(chain.eq.mock.calls).toEqual([
      ['platform', 'facebook'], ['client_id', 'client-1'], ['target_id', 'target-1'], ['social_account_id', 'account-1'],
    ]);
    expect(chain.gte).toHaveBeenCalledWith('taken_at', '2026-08-21');
    expect(chain.lt).toHaveBeenCalledWith('taken_at', '2026-08-23');
  });

  it('falha fechada com escopo ou janela inválida', async () => {
    const { fetchFacebookPosts } = await import('./facebook');
    await expect(fetchFacebookPosts({ clientId: '', targetId: 'target-1', socialAccountId: 'account-1', startDate: '2026-08-23', endDate: '2026-08-21' })).rejects.toThrow('FACEBOOK_READ_SCOPE_INVALID');
  });
});
