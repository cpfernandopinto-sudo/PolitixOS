import type { FacebookNormalizedComment } from './types';

export interface FacebookCommentsDb {
  from(table: string): {
    upsert(rows: Record<string, unknown>[], options: { onConflict: string }): Promise<{ data?: unknown; error: { message: string } | null; count?: number | null }>;
  };
}

export interface FacebookCommentScope { clientId: string; targetId: string; socialPostId: string; externalPostId: string; }

export function facebookCommentRow(comment: FacebookNormalizedComment, scope: FacebookCommentScope) {
  if (!scope.clientId || !scope.targetId || !scope.socialPostId || comment.externalPostId !== scope.externalPostId) throw new Error('FACEBOOK_COMMENT_TENANT_CONTEXT_INVALID');
  return {
    client_id: scope.clientId, target_id: scope.targetId, social_post_id: scope.socialPostId, platform: 'facebook',
    external_post_id: comment.externalPostId, external_comment_id: comment.externalCommentId, legacy_comment_id: comment.legacyCommentId,
    parent_comment_external_id: comment.parentCommentExternalId, depth: comment.depth, text: comment.text,
    author_id: comment.authorId, author_name: comment.authorName, author_profile_url: comment.authorProfileUrl,
    author_profile_image: comment.authorProfileImage, published_at: comment.publishedAt, reactions_count: comment.reactionsCount,
    replies_count: comment.repliesCount, content_type: comment.contentType, raw_json: comment.rawJson, updated_at: new Date().toISOString(),
  };
}

export async function persistFacebookComments(db: FacebookCommentsDb, comments: FacebookNormalizedComment[], scope: FacebookCommentScope): Promise<number> {
  if (!comments.length) return 0;
  const rows = [...new Map(comments.map((comment) => [comment.externalCommentId, facebookCommentRow(comment, scope)])).values()];
  const { error } = await db.from('facebook_comments').upsert(rows, { onConflict: 'client_id,external_comment_id' });
  if (error) throw new Error(`FACEBOOK_COMMENTS_PERSIST_FAILED: ${error.message}`);
  return rows.length;
}
