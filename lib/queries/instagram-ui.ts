import 'server-only';

import { getActiveClientId, getAllowedTargetIds } from '@/lib/auth/dal';
import { buildInstagramUiContract, normalizeInstagramContentTypeFilter } from '@/lib/instagram/ui-contract';
import { createAdminClient } from '@/lib/supabaseClient';
import type { InstagramUiContract, InstagramUiQuery } from '@/lib/types/instagram-ui';

const MAX_ANALYTICS_POSTS = 2_000;
const MAX_RECENT_COMMENTS = 500;
const POSTGREST_IN_BATCH_SIZE = 150;

const POST_FIELDS = 'id,target_id,client_id,platform,caption,content_type,media_type,media_url,post_url,taken_at,collected_at,like_count,comment_count,raw_json';
const COMMENT_FIELDS = 'id,instagram_comment_id,post_id,parent_comment_id,comment_user,comment_text,like_count,created_at_instagram,collected_at,client_id,target_id';
const ANALYSIS_FIELDS = 'content_id,sentiment,risk_level,ai_topics,summary,risk_reason,client_id,target_id';

export function chunkInstagramPostIds(ids: string[], size = POSTGREST_IN_BATCH_SIZE): string[][] {
  const safeSize = Math.max(1, Math.floor(size));
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += safeSize) chunks.push(ids.slice(index, index + safeSize));
  return chunks;
}

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

function emptyContract(query: InstagramUiQuery, targetNames = new Map<string, string>()): InstagramUiContract {
  return buildInstagramUiContract({
    posts: [],
    comments: [],
    analyses: [],
    totalComments: 0,
    page: query.page,
    pageSize: query.pageSize,
    targetNames,
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
  let availableTargetsQuery = client.from('targets').select('id,candidate_name,client_id');
  if (activeClientId) availableTargetsQuery = availableTargetsQuery.eq('client_id', activeClientId);
  if (allowedTargetIds) availableTargetsQuery = availableTargetsQuery.in('id', allowedTargetIds);
  const availableTargetsResult = await availableTargetsQuery;
  if (availableTargetsResult.error) throw new Error(`Instagram targets query failed: ${availableTargetsResult.error.message}`);
  const targetNames = new Map((availableTargetsResult.data ?? []).map((target) => [target.id, target.candidate_name ?? null]).filter((entry): entry is [string, string] => Boolean(entry[1])));
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
  if (postIds.length === 0) return emptyContract(query, targetNames);

  const analysesResults = await Promise.all(chunkInstagramPostIds(postIds).map((batch) => {
    let batchQuery = client.from('ai_analysis').select(ANALYSIS_FIELDS).eq('content_type', 'post').in('content_id', batch);
    if (activeClientId) batchQuery = batchQuery.eq('client_id', activeClientId);
    return batchQuery;
  }));
  const analysesError = analysesResults.find((result) => result.error)?.error;
  if (analysesError) throw new Error(`Instagram analysis query failed: ${analysesError.message}`);
  const analyses = analysesResults.flatMap((result) => result.data ?? []);
  const normalizedRisk = query.risk?.trim().toLocaleLowerCase('pt-BR') ?? '';
  const matchingAnalysisIds = normalizedRisk
    ? new Set(analyses.filter((analysis) => analysis.risk_level?.trim().toLocaleLowerCase('pt-BR') === normalizedRisk).map((analysis) => analysis.content_id))
    : null;
  const filteredPosts = matchingAnalysisIds ? posts.filter((post) => matchingAnalysisIds.has(post.id)) : posts;
  const filteredPostIds = filteredPosts.map((post) => post.id);
  if (filteredPostIds.length === 0) return emptyContract(query, targetNames);

  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(query.pageSize ?? 20)));
  const pagePostIds = filteredPosts.slice((page - 1) * pageSize, page * pageSize).map((post) => post.id);
  const topPostIds = [...filteredPosts]
    .sort((left, right) => (right.like_count ?? 0) - (left.like_count ?? 0) || (right.comment_count ?? 0) - (left.comment_count ?? 0))
    .slice(0, 10)
    .map((post) => post.id);
  const commentPostIds = [...new Set([...pagePostIds, ...topPostIds])];
  let commentsQuery = client.from('instagram_comments').select(COMMENT_FIELDS).in('post_id', commentPostIds).order('created_at_instagram', { ascending: false }).limit(MAX_RECENT_COMMENTS);
  if (activeClientId) commentsQuery = commentsQuery.eq('client_id', activeClientId);
  if (targetIds) commentsQuery = commentsQuery.in('target_id', targetIds);
  const commentsResult = await commentsQuery;
  if (commentsResult.error) throw new Error(`Instagram comments query failed: ${commentsResult.error.message}`);
  const comments = commentsResult.data ?? [];

  const contract = buildInstagramUiContract({
    posts: filteredPosts,
    comments,
    analyses,
    targetNames,
    // Este contrato é uma janela operacional limitada, não um COUNT global.
    // Evita uma varredura exata cara na tabela de comentários em cada request.
    totalComments: comments.length,
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
