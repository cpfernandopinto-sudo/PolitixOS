import { describe, expect, it, vi } from 'vitest';
import { collectFacebookPages, evaluateFacebookDateFilter } from './pagination';

const response = (ids: string[], cursor: string | null, timestamp = '2026-08-10T12:00:00Z') => ({
  posts: ids.map((post_id) => ({ post_id, timestamp })), cursor, raw: { results: ids, cursor },
});

describe('Facebook cursor pagination', () => {
  it('pagina até cursor null, deduplica sobreposição e preserva IDs', async () => {
    const getPagePosts = vi.fn()
      .mockResolvedValueOnce(response(['1', '2'], 'a'))
      .mockResolvedValueOnce(response(['2', '3'], 'b'))
      .mockResolvedValueOnce(response([], null));
    const result = await collectFacebookPages({ getPagePosts }, { pageId: 'page-1', maxPages: 10 });
    expect(result).toMatchObject({ pagesFetched: 3, cursorsSeen: 2, termination: 'EMPTY_RESULTS' });
    expect(result.posts.map((post) => post.externalPostId)).toEqual(['1', '2', '3']);
  });

  it('interrompe em cursor null', async () => {
    const result = await collectFacebookPages({ getPagePosts: vi.fn().mockResolvedValue(response(['1'], null)) }, { pageId: 'page-1' });
    expect(result.termination).toBe('CURSOR_NULL');
  });

  it('bloqueia cursor repetido antes de criar loop', async () => {
    const getPagePosts = vi.fn().mockResolvedValueOnce(response(['1'], 'same')).mockResolvedValueOnce(response(['2'], 'same'));
    await expect(collectFacebookPages({ getPagePosts }, { pageId: 'page-1' })).rejects.toThrow('FACEBOOK_CURSOR_LOOP');
  });

  it('classifica filtro temporal por timestamps reais', () => {
    const normalized = (timestamp: string | null) => ({
      externalPostId: timestamp ?? 'none', postType: null, authorExternalId: null, authorName: null, authorUrl: null,
      message: null, messageRich: null, permalink: null, publishedAt: timestamp, commentsCount: null, reactionsCount: null,
      sharesCount: null, reactions: { like: null, love: null, care: null, haha: null, wow: null, sad: null, angry: null },
      mediaType: null, mediaUrl: null, thumbnailUrl: null, sourcePageId: 'page', contentOrigin: 'OWNED' as const, rawPayload: {},
    });
    expect(evaluateFacebookDateFilter([normalized('2026-08-10T12:00:00Z')], { startDate: '2026-08-01', endDate: '2026-08-20' })).toBe('WORKING');
    expect(evaluateFacebookDateFilter([normalized('2026-07-01T12:00:00Z')], { startDate: '2026-08-01', endDate: '2026-08-20' })).toBe('IGNORED');
    expect(evaluateFacebookDateFilter([normalized(null)], { startDate: '2026-08-01' })).toBe('UNKNOWN');
  });
});
