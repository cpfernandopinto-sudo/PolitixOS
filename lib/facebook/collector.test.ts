import { describe, expect, it, vi } from 'vitest';
import { runFacebookOwnedCollection, validateFacebookAccountIdentity } from './collector';
import type { FacebookNormalizedPost } from './types';

const post = (authorExternalId: string | null): FacebookNormalizedPost => ({
  externalPostId: 'post-1', postType: 'post', authorExternalId, authorName: null, authorUrl: null,
  message: null, messageRich: null, permalink: null, publishedAt: '2026-08-22T00:00:00.000Z',
  commentsCount: 0, reactionsCount: 0, sharesCount: 0,
  reactions: { like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
  mediaType: null, mediaUrl: null, thumbnailUrl: null, sourcePageId: 'page-1', contentOrigin: 'OWNED', rawPayload: {},
});

describe('Facebook account identity', () => {
  it('aceita somente quando todos os autores correspondem ao Page ID', () => {
    expect(() => validateFacebookAccountIdentity([post('page-1'), post('page-1')], 'page-1')).not.toThrow();
  });

  it.each([[[]], [[post(null)]], [[post('other-page')]]])('falha fechada sem evidência ou com mismatch', (posts) => {
    expect(() => validateFacebookAccountIdentity(posts as FacebookNormalizedPost[], 'page-1')).toThrow('FACEBOOK_ACCOUNT_IDENTITY_MISMATCH');
  });
});

describe('Facebook collection telemetry', () => {
  it('registra MAX_PAGES como sucesso parcial sem mascarar completude', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const finishEq2 = vi.fn().mockResolvedValue({ error: null });
    const finishEq1 = vi.fn().mockReturnValue({ eq: finishEq2 });
    const update = vi.fn().mockReturnValue({ eq: finishEq1 });
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    const client = { from: vi.fn(() => ({ insert, update })), rpc };
    const provider = { getPagePosts: vi.fn().mockResolvedValue({
      posts: [{ post_id: 'post-1', author: { id: 'page-1' }, timestamp: '2026-08-22T00:00:00Z' }],
      cursor: 'next', raw: {},
    }) };
    const result = await runFacebookOwnedCollection(client as never, provider, {
      clientId: 'client-1', targetId: 'target-1', socialAccountId: 'account-1', sourcePageId: 'page-1',
    }, { maxPages: 1, startDate: '2026-08-21', endDate: '2026-08-23', runId: '11111111-1111-4111-8111-111111111111' });
    expect(result).toMatchObject({ termination: 'MAX_PAGES', collectionComplete: false, postsPersisted: 1 });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      metadata: expect.objectContaining({ termination: 'MAX_PAGES', collection_complete: false, outcome: 'SUCCESS_PARTIAL' }),
    }));
  });
});
