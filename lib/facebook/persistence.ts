import type { FacebookCollectionContext, FacebookNormalizedPost } from './types';

type PersistenceClient = {
  rpc(name: string, params: Record<string, unknown>): Promise<{
    data: unknown;
    error: { message: string; details?: string; hint?: string; code?: string } | null;
  }>;
};

function includesDatabaseError(error: { message: string; details?: string; hint?: string; code?: string }, marker: string) {
  return [error.message, error.details, error.hint, error.code].some((value) => value?.includes(marker));
}

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
  const rows = [...new Map(posts.map((post) => [post.externalPostId, facebookPostRow(post, context, collectionRunId, collectedAt)])).values()];
  const result = await client.rpc('persist_facebook_social_posts', {
    p_client_id: context.clientId,
    p_target_id: context.targetId,
    p_social_account_id: context.socialAccountId,
    p_rows: rows,
  });
  if (result.error) {
    if (includesDatabaseError(result.error, 'FACEBOOK_CROSS_TENANT_POST_CONFLICT')) throw new Error('FACEBOOK_CROSS_TENANT_POST_CONFLICT');
    if (includesDatabaseError(result.error, 'FACEBOOK_POST_CONTEXT_CONFLICT')) throw new Error('FACEBOOK_POST_CONTEXT_CONFLICT');
    throw new Error(`FACEBOOK_POSTS_RPC_FAILED: ${result.error.message}`);
  }
  if (result.data !== rows.length) throw new Error('FACEBOOK_POSTS_RPC_COUNT_MISMATCH');
  return rows.length;
}
