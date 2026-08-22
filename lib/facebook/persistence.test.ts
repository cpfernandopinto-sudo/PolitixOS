import { describe, expect, it, vi } from 'vitest';
import { facebookPostRow, persistFacebookPosts } from './persistence';
import { normalizeFacebookPost } from './normalizer';

const context = { clientId: 'client-1', targetId: 'target-1', socialAccountId: 'account-1', sourcePageId: 'page-1' };
const post = normalizeFacebookPost({ post_id: 'post-1', message: 'Olá', reactions_count: 5 }, 'page-1');

function mockClient(data: unknown = 1, error: { message: string; details?: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc }, rpc };
}

describe('Facebook tenant-safe persistence', () => {
  it('mapeia social_posts e preserva breakdown/lineage em raw_json', () => {
    expect(facebookPostRow(post, context, 'run-1', '2026-08-22T00:00:00Z')).toMatchObject({
      client_id: 'client-1', target_id: 'target-1', social_account_id: 'account-1', platform: 'facebook',
      platform_post_id: 'post-1', caption: 'Olá', like_count: null, content_origin: 'OWNED',
      raw_json: { contract_version: 'facebook-v1', source_page_id: 'page-1', collection_run_id: 'run-1', reactions_count: 5 },
    });
  });

  it('persiste o lote deduplicado pela RPC atômica', async () => {
    const { client, rpc } = mockClient();
    expect(await persistFacebookPosts(client as never, [post, post], context, 'run-1')).toBe(1);
    expect(rpc).toHaveBeenCalledWith('persist_facebook_social_posts', expect.objectContaining({
      p_client_id: 'client-1', p_target_id: 'target-1', p_social_account_id: 'account-1', p_rows: [expect.objectContaining({ platform_post_id: 'post-1' })],
    }));
  });

  it('propaga deterministicamente conflito cross-tenant da RPC', async () => {
    const { client } = mockClient(null, { message: 'database exception', details: 'FACEBOOK_CROSS_TENANT_POST_CONFLICT' });
    await expect(persistFacebookPosts(client as never, [post], context, 'run-1')).rejects.toThrow('FACEBOOK_CROSS_TENANT_POST_CONFLICT');
  });

  it('falha fechada para mesmo cliente com target ou conta diferentes', async () => {
    const { client } = mockClient(null, { message: 'FACEBOOK_POST_CONTEXT_CONFLICT' });
    await expect(persistFacebookPosts(client as never, [post], context, 'run-1')).rejects.toThrow('FACEBOOK_POST_CONTEXT_CONFLICT');
  });

  it('falha fechada se a RPC não confirmar o lote completo', async () => {
    const { client } = mockClient(0);
    await expect(persistFacebookPosts(client as never, [post], context, 'run-1')).rejects.toThrow('FACEBOOK_POSTS_RPC_COUNT_MISMATCH');
  });

  it('exige contexto tenant completo', () => {
    expect(() => facebookPostRow(post, { ...context, clientId: '' }, 'run-1', new Date().toISOString())).toThrow('FACEBOOK_TENANT_CONTEXT_MISSING');
  });
});
