import { describe, expect, it } from 'vitest';
import { validateFacebookAccountIdentity } from './collector';
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
