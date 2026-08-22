import type { FacebookCollectionContext, FacebookNormalizedPost } from './types';

type SelectChain = {
  eq(column: string, value: unknown): SelectChain;
  in(column: string, values: unknown[]): Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>;
};

type PersistenceClient = {
  from(table: string): {
    select(columns: string): SelectChain;
    upsert(rows: unknown[], options: { onConflict: string; ignoreDuplicates: boolean }): Promise<{ error: { message: string } | null }>;
  };
};

export function facebookPostRow(post: FacebookNormalizedPost, context: FacebookCollectionContext, collectionRunId: string, collectedAt: string) {
  if (!context.clientId || !context.targetId || !context.socialAccountId) throw new Error('FACEBOOK_TENANT_CONTEXT_MISSING');
  return {
    client_id: context.clientId,
    target_id: context.targetId,
    social_account_id: context.socialAccountId,
    platform: 'facebook',
    platform_post_id: post.externalPostId,
    post_url: post.permalink,
    caption: post.message,
    media_type: post.mediaType,
    media_url: post.mediaUrl,
    // Facebook reactions are not semantically equivalent to likes.
    like_count: null,
    comment_count: post.commentsCount,
    share_count: post.sharesCount,
    taken_at: post.publishedAt,
    collected_at: collectedAt,
    content_origin: post.contentOrigin,
    raw_json: {
      provider: 'rapidapi-facebook-scraper3',
      contract_version: 'facebook-v1',
      source_page_id: post.sourcePageId,
      post_type: post.postType,
      author: { external_id: post.authorExternalId, name: post.authorName, url: post.authorUrl },
      message_rich: post.messageRich,
      reactions_count: post.reactionsCount,
      reactions: post.reactions,
      thumbnail_url: post.thumbnailUrl,
      collection_run_id: collectionRunId,
      payload: post.rawPayload,
    },
  };
}

export async function persistFacebookPosts(client: PersistenceClient, posts: FacebookNormalizedPost[], context: FacebookCollectionContext, collectionRunId: string, collectedAt = new Date().toISOString()): Promise<number> {
  if (!posts.length) return 0;
  const ids = [...new Set(posts.map((post) => post.externalPostId))];
  const existing = await client.from('social_posts').select('platform_post_id,client_id').eq('platform', 'facebook').in('platform_post_id', ids);
  if (existing.error) throw new Error(`FACEBOOK_EXISTING_POSTS_QUERY_FAILED: ${existing.error.message}`);
  for (const row of existing.data ?? []) {
    if (row.client_id !== context.clientId) throw new Error('FACEBOOK_CROSS_TENANT_POST_CONFLICT');
  }
  const rows = [...new Map(posts.map((post) => [post.externalPostId, facebookPostRow(post, context, collectionRunId, collectedAt)])).values()];
  const result = await client.from('social_posts').upsert(rows, { onConflict: 'platform,platform_post_id', ignoreDuplicates: false });
  if (result.error) throw new Error(`FACEBOOK_POSTS_UPSERT_FAILED: ${result.error.message}`);
  return rows.length;
}
