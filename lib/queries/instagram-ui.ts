import 'server-only';

import { getActiveClientId, getAllowedTargetIds } from '@/lib/auth/dal';
import { buildInstagramUiContract, normalizeInstagramContentTypeFilter } from '@/lib/instagram/ui-contract';
import { createAdminClient } from '@/lib/supabaseClient';
import type { InstagramUiContract, InstagramUiQuery } from '@/lib/types/instagram-ui';

const MAX_ANALYTICS_POSTS = 2_000;
const MAX_RECENT_COMMENTS = 500;

const POST_FIELDS = 'id,target_id,client_id,platform,caption,content_type,media_type,media_url,post_url,taken_at,collected_at,like_count,comment_count,raw_json';
const COMMENT_FIELDS = 'id,instagram_comment_id,post_id,parent_comment_id,comment_user,comment_text,like_count,created_at_instagram,collected_at,client_id,target_id';
const ANALYSIS_FIELDS = 'content_id,sentiment,risk_level,ai_topics,summary,risk_reason,client_id,target_id';

export function intersectInstagramTargetScope(
  requested: string[] | undefined,
  allowed: string[] | null,
): string[] | null {
  if (allowed === null) return requested?.length ? [...new Set(requested)] : null;
  if (allowed.length === 0) return [];
  if (!requested?.length) return [...new Set(allowed)];
  const allowedSet = new Set(allowed);
  return [...new Set(requested.filter((id) => allowedSet.has(id)))];
}

function emptyContract(query: InstagramUiQuery): InstagramUiContract {
  return buildInstagramUiContract({
    posts: [],
    comments: [],
    analyses: [],
    totalComments: 0,
    page: query.page,
    pageSize: query.pageSize,
  });
}

/**
 * Fundação server-side da futura página Instagram.
 *
 * O escopo de tenant vem exclusivamente da sessão. `client_id` nunca é
 * aceito em `query`, e o client admin permanece restrito ao servidor.
 */
export async function getInstagramUiContract(query: InstagramUiQuery = {}): Promise<InstagramUiContract> {
  const [allowedTargetIds, activeClientId] = await Promise.all([
    getAllowedTargetIds(),
    getActiveClientId(),
  ]);
  const targetIds = intersectInstagramTargetScope(query.candidateIds, allowedTargetIds);
  if (targetIds?.length === 0) return emptyContract(query);

  const client = createAdminClient();
  const contentTypes = normalizeInstagramContentTypeFilter(query.contentTypes);
  let postsQuery = client
    .from('social_posts')
    .select(POST_FIELDS, { count: 'exact' })
    .eq('platform', 'instagram')
    .order('taken_at', { ascending: false })
    .limit(MAX_ANALYTICS_POSTS);

  if (activeClientId) postsQuery = postsQuery.eq('client_id', activeClientId);
  if (targetIds) postsQuery = postsQuery.in('target_id', targetIds);
  if (contentTypes.length) postsQuery = postsQuery.in('content_type', contentTypes);
  if (query.periodDays && Number.isFinite(query.periodDays) && query.periodDays > 0) {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - Math.floor(query.periodDays));
    postsQuery = postsQuery.gte('taken_at', from.toISOString());
  }

  const { data: postsData, error: postsError, count: postsCount } = await postsQuery;
  if (postsError) throw new Error(`Instagram posts query failed: ${postsError.message}`);
  const posts = postsData ?? [];
  const postIds = posts.map((post) => post.id);
  if (postIds.length === 0) return emptyContract(query);

  let commentsQuery = client
    .from('instagram_comments')
    .select(COMMENT_FIELDS, { count: 'exact' })
    .in('post_id', postIds)
    .order('created_at_instagram', { ascending: false })
    .limit(MAX_RECENT_COMMENTS);
  let analysesQuery = client
    .from('ai_analysis')
    .select(ANALYSIS_FIELDS)
    .eq('content_type', 'post')
    .in('content_id', postIds);
  let targetsQuery = client
    .from('targets')
    .select('id,candidate_name,client_id')
    .in('id', [...new Set(posts.map((post) => post.target_id))]);

  if (activeClientId) {
    commentsQuery = commentsQuery.eq('client_id', activeClientId);
    analysesQuery = analysesQuery.eq('client_id', activeClientId);
    targetsQuery = targetsQuery.eq('client_id', activeClientId);
  }
  if (targetIds) commentsQuery = commentsQuery.in('target_id', targetIds);

  const [commentsResult, analysesResult, targetsResult] = await Promise.all([
    commentsQuery,
    analysesQuery,
    targetsQuery,
  ]);
  if (commentsResult.error) throw new Error(`Instagram comments query failed: ${commentsResult.error.message}`);
  if (analysesResult.error) throw new Error(`Instagram analysis query failed: ${analysesResult.error.message}`);
  if (targetsResult.error) throw new Error(`Instagram targets query failed: ${targetsResult.error.message}`);

  const targetNames = new Map((targetsResult.data ?? []).map((target) => [target.id, target.candidate_name ?? null]).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const contract = buildInstagramUiContract({
    posts,
    comments: commentsResult.data ?? [],
    analyses: analysesResult.data ?? [],
    targetNames,
    totalComments: commentsResult.count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  });

  // `postsCount` pode superar o teto analítico no futuro. A paginação nunca
  // afirma uma cobertura maior que o conjunto efetivamente mapeado.
  if ((postsCount ?? posts.length) > MAX_ANALYTICS_POSTS) {
    contract.pagination.hasNextPage = true;
  }
  return contract;
}
