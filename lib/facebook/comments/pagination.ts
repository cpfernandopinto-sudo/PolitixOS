import type { FacebookCommentsPage, FacebookProviderComment } from './types';

export interface FacebookCommentsPageSource { getPostComments(input: { postId: string; cursor?: string | null }): Promise<FacebookCommentsPage>; }
export interface FacebookCommentsCollectionResult { comments: FacebookProviderComment[]; pagesFetched: number; requestsUsed: number; termination: 'LIMIT'|'CURSOR_NULL'|'EMPTY_RESULTS'|'MAX_PAGES'; }

export async function collectFacebookComments(source: FacebookCommentsPageSource, input: { postId: string; maxComments?: number; maxPages?: number }): Promise<FacebookCommentsCollectionResult> {
  const maxComments = Math.max(1, Math.min(input.maxComments ?? 50, 100));
  const maxPages = Math.max(1, Math.min(input.maxPages ?? 5, 10));
  const comments = new Map<string, FacebookProviderComment>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const page = await source.getPostComments({ postId: input.postId, cursor });
    for (const comment of page.comments) {
      const id = typeof comment.comment_id === 'string' ? comment.comment_id : null;
      if (id && !comments.has(id)) comments.set(id, comment);
      if (comments.size >= maxComments) return { comments: [...comments.values()].slice(0, maxComments), pagesFetched: pageIndex + 1, requestsUsed: pageIndex + 1, termination: 'LIMIT' };
    }
    if (!page.comments.length) return { comments: [...comments.values()], pagesFetched: pageIndex + 1, requestsUsed: pageIndex + 1, termination: 'EMPTY_RESULTS' };
    if (!page.cursor) return { comments: [...comments.values()], pagesFetched: pageIndex + 1, requestsUsed: pageIndex + 1, termination: 'CURSOR_NULL' };
    if (cursors.has(page.cursor)) throw new Error('FACEBOOK_COMMENTS_CURSOR_LOOP');
    cursors.add(page.cursor); cursor = page.cursor;
  }
  return { comments: [...comments.values()], pagesFetched: maxPages, requestsUsed: maxPages, termination: 'MAX_PAGES' };
}
