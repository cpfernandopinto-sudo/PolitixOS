import { describe, expect, it, vi } from 'vitest';
import { facebookPostRow, persistFacebookPosts } from './persistence';
import { normalizeFacebookPost } from './normalizer';

const context = { clientId: 'client-1', targetId: 'target-1', socialAccountId: 'account-1', sourcePageId: 'page-1' };
const post = normalizeFacebookPost({ post_id: 'post-1', message: 'Olá', reactions_count: 5 }, 'page-1');

function mockClient(existing: Array<Record<string, unknown>> = []) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const inFn = vi.fn().mockResolvedValue({ data: existing, error: null });
  const chain: { eq: ReturnType<typeof vi.fn>; in: ReturnType<typeof vi.fn> } = { eq: vi.fn(), in: inFn };
  chain.eq.mockReturnValue(chain);
  const select = vi.fn().mockReturnValue(chain);
  return { client: { from: vi.fn(() => ({ select, upsert })) }, upsert };
}

describe('Facebook tenant-safe persistence', () => {
  it('mapeia social_posts e preserva breakdown/lineage em raw_json', () => {
    expect(facebookPostRow(post, context, 'run-1', '2026-08-22T00:00:00Z')).toMatchObject({
      client_id: 'client-1', target_id: 'target-1', social_account_id: 'account-1', platform: 'facebook',
      platform_post_id: 'post-1', caption: 'Olá', like_count: null, content_origin: 'OWNED',
      raw_json: { contract_version: 'facebook-v1', source_page_id: 'page-1', collection_run_id: 'run-1', reactions_count: 5 },
    });
  });

  it('faz upsert idempotente pela chave consolidada', async () => {
    const { client, upsert } = mockClient([{ platform_post_id: 'post-1', client_id: 'client-1' }]);
    expect(await persistFacebookPosts(client as never, [post, post], context, 'run-1')).toBe(1);
    expect(upsert).toHaveBeenCalledWith(expect.any(Array), { onConflict: 'platform,platform_post_id', ignoreDuplicates: false });
  });

  it('falha fechada em conflito cross-tenant', async () => {
    const { client, upsert } = mockClient([{ platform_post_id: 'post-1', client_id: 'other-client' }]);
    await expect(persistFacebookPosts(client as never, [post], context, 'run-1')).rejects.toThrow('FACEBOOK_CROSS_TENANT_POST_CONFLICT');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('exige contexto tenant completo', () => {
    expect(() => facebookPostRow(post, { ...context, clientId: '' }, 'run-1', new Date().toISOString())).toThrow('FACEBOOK_TENANT_CONTEXT_MISSING');
  });
});
