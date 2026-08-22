import { normalizeFacebookPost } from './normalizer';
import type { FacebookDateWindow, FacebookNormalizedPost, FacebookProviderPage } from './types';

export interface FacebookPageSource {
  getPagePosts(input: { pageId: string; cursor?: string | null } & FacebookDateWindow): Promise<FacebookProviderPage>;
}

export interface FacebookPaginationResult {
  posts: FacebookNormalizedPost[];
  pagesFetched: number;
  cursorsSeen: number;
  termination: 'CURSOR_NULL' | 'EMPTY_RESULTS' | 'MAX_PAGES';
}

export async function collectFacebookPages(provider: FacebookPageSource, input: { pageId: string; maxPages?: number } & FacebookDateWindow): Promise<FacebookPaginationResult> {
  const maxPages = Math.max(1, Math.min(input.maxPages ?? 10, 100));
  const cursors = new Set<string>();
  const posts = new Map<string, FacebookNormalizedPost>();
  let cursor: string | null = null;
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const page = await provider.getPagePosts({ pageId: input.pageId, cursor, startDate: input.startDate, endDate: input.endDate });
    for (const raw of page.posts) {
      const normalized = normalizeFacebookPost(raw, input.pageId, 'OWNED');
      posts.set(normalized.externalPostId, normalized);
    }
    if (page.posts.length === 0) return { posts: [...posts.values()], pagesFetched: pageIndex + 1, cursorsSeen: cursors.size, termination: 'EMPTY_RESULTS' };
    if (!page.cursor) return { posts: [...posts.values()], pagesFetched: pageIndex + 1, cursorsSeen: cursors.size, termination: 'CURSOR_NULL' };
    if (cursors.has(page.cursor)) throw new Error('FACEBOOK_CURSOR_LOOP');
    cursors.add(page.cursor);
    cursor = page.cursor;
  }
  return { posts: [...posts.values()], pagesFetched: maxPages, cursorsSeen: cursors.size, termination: 'MAX_PAGES' };
}

export function evaluateFacebookDateFilter(posts: FacebookNormalizedPost[], window: FacebookDateWindow): 'WORKING' | 'PARTIAL' | 'IGNORED' | 'UNKNOWN' {
  if (!window.startDate && !window.endDate) return 'UNKNOWN';
  const dated = posts.filter((post): post is FacebookNormalizedPost & { publishedAt: string } => Boolean(post.publishedAt));
  if (!dated.length) return 'UNKNOWN';
  const start = window.startDate ? Date.parse(`${window.startDate}T00:00:00.000Z`) : -Infinity;
  const end = window.endDate ? Date.parse(`${window.endDate}T23:59:59.999Z`) : Infinity;
  const inside = dated.filter((post) => { const timestamp = Date.parse(post.publishedAt); return timestamp >= start && timestamp <= end; }).length;
  if (inside === dated.length) return dated.length === posts.length ? 'WORKING' : 'PARTIAL';
  return inside === 0 ? 'IGNORED' : 'PARTIAL';
}
