import 'server-only';

import { createAdminClient } from '@/lib/supabaseClient';
import { deduplicateXPosts, getXAICompleteness, mapXPost, mapXReply, type XAnalysisRow, type XOrigin, type XPostRow, type XReplyRow, type XTargetAssociationRow } from '@/lib/x/v2-contract';

export const X_ANALYTICS_LIMIT = 10_000;
export const X_VISUAL_LIMIT = 300;
export const X_REPLY_ANALYTICS_LIMIT = 20_000;
const QUERY_BATCH_SIZE = 500;
const IN_BATCH_SIZE = 150;

export interface XFilters {
  period?: string | null; sentiment?: string | null; risk?: string | null; topic?: string | null;
  candidate?: string | null; candidateIds?: string[] | null; search?: string | null;
  allowedTargetIds?: string[] | null; clientId?: string | null;
  origin?: 'ALL' | XOrigin | null; matchedTerm?: string | null; offset?: number; limit?: number;
}

type TargetRow = { id: string; candidate_name: string | null; client_id: string | null };
type AssociationDbRow = { post_id: string; target_id: string; client_id: string; match_type: string | null; match_term: string | null; discovery_source: string | null };
type Completeness = { totalAvailable: number; totalLoaded: number; isComplete: boolean };
// The legacy dashboard contract is intentionally open while X V2 remains backward-compatible.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XApplicationPost = Record<string, any> & {
  id: string;
  created_at: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sentiment?: any;
  risk: string | null;
  crisisScore: number;
};

const EMPTY_VALUES = new Set(['', 'todos', 'todas', 'all', 'null', 'undefined']);
export function cleanFilter(v: string | string[] | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const value = Array.isArray(v) ? v[0] ?? '' : v;
  return EMPTY_VALUES.has(value.toLowerCase()) ? null : value || null;
}

function parseJsonField(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return [];
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []; }
  catch { return []; }
}

const normalized = (value: string | null | undefined) => (value ?? '').trim().toLocaleLowerCase('pt-BR');
const normalizeRisk = (value: string | null | undefined) => normalized(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const unique = <T,>(values: T[]) => [...new Set(values)];
const chunks = <T,>(values: T[], size = IN_BATCH_SIZE) => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));

export function intersectXTargetScope(requested: string[] | null | undefined, allowed: string[] | null | undefined): string[] | null {
  if (allowed === null || allowed === undefined) return requested?.length ? unique(requested) : null;
  if (allowed.length === 0) return [];
  if (!requested?.length) return unique(allowed);
  const allowedSet = new Set(allowed);
  return unique(requested.filter((id) => allowedSet.has(id)));
}

function crisisTemperatureScore(value: string | number | null): number | null {
  if (typeof value === 'number') return value;
  return { fria: 15, morna: 45, quente: 75, critica: 100, crítica: 100 }[normalized(value)] ?? null;
}

function strategicInsights(post: Record<string, unknown>, maxEngagement: number) {
  if (post.aiCompleteness === 'MISSING') {
    return { impactScore: 0, crisisScore: 0, divergenceFlag: false, divergenceType: null, priorityLevel: null, recommendedAction: null };
  }
  const engagement = maxEngagement > 0 ? (Number(post.totalEngagement ?? 0) / maxEngagement) * 100 : 0;
  const risk = normalizeRisk(String(post.risk ?? ''));
  const riskValue = { critico: 100, alto: 75, medio: 50, baixo: 25 }[risk] ?? 0;
  const polarizationValue = { alto: 100, alta: 100, medio: 60, media: 60, baixo: 30, baixa: 30 }[normalizeRisk(String(post.polarizationLevel ?? ''))] ?? 0;
  const negativity = { contraria: 90, dividida: 50, favoravel: 10, irrelevante: 20 }[normalizeRisk(String(post.publicReaction ?? ''))] ?? 0;
  const impactScore = Math.round(engagement * 0.3 + riskValue * 0.3 + polarizationValue * 0.2 + negativity * 0.2);
  const crisisScore = Math.round(negativity * 0.4 + polarizationValue * 0.3 + riskValue * 0.3);
  const authorTone = typeof post.authorTone === 'string' ? post.authorTone : null;
  const publicReaction = typeof post.publicReaction === 'string' ? post.publicReaction : null;
  const divergenceFlag = Boolean(authorTone && publicReaction && authorTone !== publicReaction);
  let priorityLevel = 'Baixa';
  if (impactScore > 70 || crisisScore > 70) priorityLevel = 'Alta'; else if (impactScore > 40) priorityLevel = 'Média';
  const recommendedAction = typeof post.recommendedAction === 'string' ? post.recommendedAction : null;
  return { impactScore, crisisScore, divergenceFlag, divergenceType: divergenceFlag ? 'Desconexão com o público' : 'Nenhum', priorityLevel, recommendedAction };
}

export function buildXApplicationPosts(input: { rows: XPostRow[]; associations: AssociationDbRow[]; analyses: XAnalysisRow[]; targets: TargetRow[]; filters?: XFilters }): XApplicationPost[] {
  const associationsByPost = new Map<string, AssociationDbRow[]>();
  for (const association of input.associations) associationsByPost.set(association.post_id, [...(associationsByPost.get(association.post_id) ?? []), association]);
  const analysisByPost = new Map(input.analyses.map((analysis) => [String(analysis.content_id), analysis]));
  const targetNames = new Map(input.targets.map((target) => [target.id, target.candidate_name ?? '—']));
  const canonical = deduplicateXPosts(input.rows.map((row) => {
    const associations = (associationsByPost.get(row.id) ?? []).map((association): XTargetAssociationRow => ({
      targetId: association.target_id,
      matchType: association.match_type,
      matchTerm: association.match_term,
      discoverySource: association.discovery_source,
    }));
    return mapXPost(row, analysisByPost.get(row.id), associations);
  }));
  const maxEngagement = Math.max(1, ...canonical.map((post) => (post.metrics.likes.value ?? 0) + (post.metrics.replies.value ?? 0) + (post.metrics.reposts.value ?? 0)));
  let posts = canonical.map((post) => {
    const analysis = post.analysis;
    const names = unique(post.targetIds.map((id) => targetNames.get(id)).filter((name): name is string => Boolean(name && name !== '—')));
    const totalEngagement = (post.metrics.likes.value ?? 0) + (post.metrics.replies.value ?? 0) + (post.metrics.reposts.value ?? 0);
    const rawAnalysis = analysisByPost.get(post.id);
    const base = {
      id: post.id, externalId: post.externalId, source: 'x', clientId: post.clientId, origin: post.origin,
      target_id: post.targetIds[0] ?? null, targetIds: post.targetIds, targetAssociations: post.targetAssociations, matchedTerms: post.matchedTerms,
      candidate_name: names.join(' • ') || '—', candidate_names: names, author: post.author, text: post.text, created_at: post.publishedAt,
      like_count: post.metrics.likes.value ?? 0, reply_count: post.metrics.replies.value ?? 0, share_count: post.metrics.reposts.value ?? 0,
      retweet_count: post.metrics.reposts.value ?? 0, quote_count: post.metrics.quotes.value, view_count: post.metrics.views.value,
      bookmark_count: post.metrics.bookmarks.value, metrics: post.metrics, media: post.media, url: post.url ?? '#',
      sentiment: analysis?.sentiment ?? null, risk: analysis?.risk ?? null, riskReason: analysis?.riskReason ?? null,
      topic: analysis?.topics[0] ?? null, ai_topic: analysis?.topics[0] ?? null,
      ai_topics: analysis?.topics ?? [], keywords: parseJsonField(rawAnalysis?.ai_keywords).join(', ') || null, summary: analysis?.summary ?? null,
      recommendedAction: analysis?.recommendedAction ?? null, authorTone: analysis?.authorTone ?? null, publicReaction: analysis?.publicReaction ?? null,
      public_reaction: analysis?.publicReaction ?? null, crisisTemperature: crisisTemperatureScore(analysis?.crisisTemperature ?? null),
      crisis_temperature: analysis?.crisisTemperature ?? null, polarizationLevel: analysis?.polarizationLevel ?? null, polarization_level: analysis?.polarizationLevel ?? null,
      strategicReading: analysis?.strategicReading ?? null, engagementQuality: analysis?.engagementQuality ?? null,
      confidenceScore: analysis?.confidenceScore ?? null, aiAnalysis: analysis, aiCompleteness: getXAICompleteness(rawAnalysis), totalEngagement, engagement: totalEngagement,
    };
    return { ...base, ...strategicInsights(base, maxEngagement) };
  });
  const filters = input.filters;
  if (filters?.origin && filters.origin !== 'ALL') posts = posts.filter((post) => post.origin === filters.origin);
  if (filters?.matchedTerm) posts = posts.filter((post) => post.matchedTerms.some((term) => normalized(term).includes(normalized(filters.matchedTerm))));
  if (filters?.sentiment) posts = posts.filter((post) => normalized(post.sentiment) === normalized(filters.sentiment));
  if (filters?.risk) posts = posts.filter((post) => normalizeRisk(post.risk) === normalizeRisk(filters.risk));
  if (filters?.topic) posts = posts.filter((post) => normalized(post.topic) === normalized(filters.topic));
  if (filters?.search) { const term = normalized(filters.search); posts = posts.filter((post) => [post.text, post.author.username, post.author.displayName, ...post.matchedTerms].some((value) => normalized(value).includes(term))); }
  return posts;
}

async function fetchRanges<T>(createQuery: (from: number, to: number, count: boolean) => PromiseLike<{ data: T[] | null; error: { message: string } | null; count?: number | null }>, cap: number, label: string) {
  const first = await createQuery(0, QUERY_BATCH_SIZE - 1, true);
  if (first.error) throw new Error(`${label}: ${first.error.message}`);
  const totalAvailable = first.count ?? first.data?.length ?? 0;
  const totalToLoad = Math.min(totalAvailable, cap);
  const rows = [...(first.data ?? [])].slice(0, totalToLoad);
  for (let from = QUERY_BATCH_SIZE; from < totalToLoad; from += QUERY_BATCH_SIZE) {
    const result = await createQuery(from, Math.min(totalToLoad - 1, from + QUERY_BATCH_SIZE - 1), false);
    if (result.error) throw new Error(`${label}: ${result.error.message}`);
    rows.push(...(result.data ?? []));
  }
  return { rows, completeness: { totalAvailable, totalLoaded: rows.length, isComplete: rows.length >= totalAvailable } satisfies Completeness };
}

export async function fetchXData(filters: XFilters = {}) {
  const restricted = filters.allowedTargetIds !== null && filters.allowedTargetIds !== undefined;
  if (restricted && filters.allowedTargetIds?.length === 0) return emptyXData();
  const client = createAdminClient();
  const requested = filters.candidateIds ?? (filters.candidate ? [filters.candidate] : null);
  const targetScope = intersectXTargetScope(requested, filters.allowedTargetIds);
  let targetsQuery = client.from('targets').select('id,candidate_name,client_id').order('candidate_name');
  if (filters.clientId) targetsQuery = targetsQuery.eq('client_id', filters.clientId);
  if (filters.allowedTargetIds) targetsQuery = targetsQuery.in('id', filters.allowedTargetIds);
  const targetsResult = await targetsQuery;
  if (targetsResult.error) throw new Error(`X targets query failed: ${targetsResult.error.message}`);
  const targets = (targetsResult.data ?? []) as TargetRow[];
  const authorizedTargetSet = new Set(targets.map((target) => target.id));
  const effectiveTargetIds = targetScope === null ? null : targetScope.filter((id) => authorizedTargetSet.has(id));
  if (effectiveTargetIds?.length === 0) return emptyXData(targets);
  const clientIds = unique(targets.map((target) => target.client_id).filter((id): id is string => Boolean(id)));

  const relationsResult = await fetchRanges<AssociationDbRow>((from, to, count) => {
    let query = client.from('social_post_targets').select('post_id,target_id,client_id,match_type,match_term,discovery_source', count ? { count: 'exact' } : undefined);
    if (filters.clientId) query = query.eq('client_id', filters.clientId); else if (restricted && clientIds.length) query = query.in('client_id', clientIds);
    if (effectiveTargetIds) query = query.in('target_id', effectiveTargetIds);
    if (filters.matchedTerm) query = query.ilike('match_term', `%${filters.matchedTerm}%`);
    return query.order('created_at', { ascending: false }).range(from, to);
  }, X_ANALYTICS_LIMIT, 'X associations query failed');
  const relatedPostIds = unique(relationsResult.rows.map((row) => row.post_id));
  const periodDays = Number.parseInt(filters.period ?? '', 10);
  const periodFrom = Number.isFinite(periodDays) && periodDays > 0 ? new Date(Date.now() - periodDays * 86_400_000).toISOString() : null;
  const basePostsQuery = (count = false) => {
    let query = client.from('social_posts').select('*', count ? { count: 'exact' } : undefined).or('platform.ilike.x,platform.ilike.twitter');
    if (filters.clientId) query = query.eq('client_id', filters.clientId); else if (restricted && clientIds.length) query = query.in('client_id', clientIds);
    if (periodFrom) query = query.gte('taken_at', periodFrom);
    return query;
  };
  const postResults: Array<{ rows: XPostRow[]; completeness: Completeness }> = [];
  if (effectiveTargetIds === null) {
    postResults.push(await fetchRanges<XPostRow>((from, to, count) => basePostsQuery(count).order('taken_at', { ascending: false }).range(from, to), X_ANALYTICS_LIMIT, 'X posts query failed'));
  } else {
    postResults.push(await fetchRanges<XPostRow>((from, to, count) => basePostsQuery(count).in('target_id', effectiveTargetIds).or('content_origin.neq.EXTERNAL,content_origin.is.null').order('taken_at', { ascending: false }).range(from, to), X_ANALYTICS_LIMIT, 'X owned posts query failed'));
    for (const ids of chunks(relatedPostIds)) {
      const result = await basePostsQuery().in('id', ids);
      if (result.error) throw new Error(`X related posts query failed: ${result.error.message}`);
      postResults.push({ rows: (result.data ?? []) as XPostRow[], completeness: { totalAvailable: result.data?.length ?? 0, totalLoaded: result.data?.length ?? 0, isComplete: true } });
    }
  }
  const rawRows = [...new Map(postResults.flatMap((result) => result.rows).map((row) => [row.id, row])).values()];
  const analyses: XAnalysisRow[] = [];
  for (const ids of chunks(rawRows.map((row) => row.id))) {
    let query = client.from('ai_analysis').select('*').eq('content_type', 'post').in('content_id', ids);
    if (filters.clientId) query = query.eq('client_id', filters.clientId);
    const result = await query;
    if (result.error) throw new Error(`X AI query failed: ${result.error.message}`);
    analyses.push(...(result.data ?? []));
  }
  const analyticsPosts = buildXApplicationPosts({ rows: rawRows, associations: relationsResult.rows, analyses, targets, filters });
  const replyRows: XReplyRow[] = [];
  let repliesComplete = true;
  let repliesAvailable = 0;
  for (const ids of chunks(analyticsPosts.map((post) => post.id))) {
    const remaining = Math.max(0, X_REPLY_ANALYTICS_LIMIT - replyRows.length);
    if (remaining === 0) { repliesComplete = false; break; }
    const result = await fetchRanges<XReplyRow>((from, to, count) => {
      let query = client.from('tweet_replies').select('*', count ? { count: 'exact' } : undefined).in('post_id', ids);
      if (filters.clientId) query = query.eq('client_id', filters.clientId); else if (restricted && clientIds.length) query = query.in('client_id', clientIds);
      return query.order('created_at_twitter', { ascending: false }).range(from, to);
    }, remaining, 'X replies query failed');
    replyRows.push(...result.rows); repliesAvailable += result.completeness.totalAvailable; repliesComplete &&= result.completeness.isComplete;
  }
  const postsById = new Map(analyticsPosts.map((post) => [post.id, post]));
  const analyticsReplies = replyRows.map((row) => {
    const post = postsById.get(row.post_id);
    const mapped = mapXReply(row, post ? { clientId: post.clientId, targetIds: post.targetIds } : undefined);
    return { id: mapped.id, externalId: mapped.externalId, post_id: mapped.postId, clientId: mapped.clientId, targetIds: mapped.targetIds,
      parentReplyExternalId: row.parent_reply_external_id ?? null, parentReplyId: mapped.parentReplyId, conversationId: mapped.conversationId,
      author: mapped.author, text: mapped.text, user: mapped.author.username, created_at: mapped.publishedAt,
      like_count: mapped.metrics.likes.value ?? 0, reply_count: mapped.metrics.replies.value ?? 0, retweet_count: mapped.metrics.reposts.value ?? 0, metrics: mapped.metrics };
  });
  const offset = Math.max(0, Math.floor(filters.offset ?? 0));
  const limit = Math.min(X_VISUAL_LIMIT, Math.max(1, Math.floor(filters.limit ?? X_VISUAL_LIMIT)));
  const posts = analyticsPosts.slice(offset, offset + limit);
  const visualPostIds = new Set(posts.map((post) => post.id));
  const replies = analyticsReplies.filter((reply) => visualPostIds.has(reply.post_id));
  const sourcesComplete = relationsResult.completeness.isComplete && postResults.every((result) => result.completeness.isComplete);
  return { posts, replies, analyticsPosts, analyticsReplies, completeness: {
    posts: { totalAvailable: sourcesComplete ? analyticsPosts.length : Math.max(analyticsPosts.length, ...postResults.map((result) => result.completeness.totalAvailable)), totalLoaded: analyticsPosts.length, isComplete: sourcesComplete },
    visualPosts: { totalAvailable: analyticsPosts.length, totalLoaded: posts.length, isComplete: offset + posts.length >= analyticsPosts.length },
    replies: { totalAvailable: repliesAvailable, totalLoaded: analyticsReplies.length, isComplete: repliesComplete },
  } };
}

function emptyXData(targets: TargetRow[] = []) {
  const complete = { totalAvailable: 0, totalLoaded: 0, isComplete: true };
  return { posts: [], replies: [], analyticsPosts: [], analyticsReplies: [], completeness: { posts: complete, visualPosts: complete, replies: complete }, targets };
}

type XPosts = Awaited<ReturnType<typeof fetchXData>>['posts'];
type XReplies = Awaited<ReturnType<typeof fetchXData>>['replies'];

export function computeXKPIs(posts: XPosts, replies: XReplies) {
  const canonical = [...new Map(posts.map((post) => [post.id, post])).values()];
  return [
    { title: 'Posts Monitorados', value: canonical.length },
    { title: 'Replies Coletadas', value: new Set(replies.map((reply) => reply.id)).size },
    { title: 'Engajamento Total', value: canonical.reduce((sum, post) => sum + post.totalEngagement, 0) },
    { title: 'Posts Positivos', value: canonical.filter((post) => post.sentiment === 'positivo').length },
    { title: 'Posts Negativos', value: canonical.filter((post) => post.sentiment === 'negativo').length },
    { title: 'Posts c/ Risco Alto', value: canonical.filter((post) => post.risk === 'alto' || post.risk === 'critico').length },
  ];
}
export async function getXKPIs(filters?: XFilters) { const data = await fetchXData(filters); return computeXKPIs(data.analyticsPosts, data.analyticsReplies); }

export function computeXChartData(posts: XPosts, replies: XReplies) {
  void replies;
  const canonical = [...new Map(posts.map((post) => [post.id, post])).values()];
  const sentimentData = [
    { name: 'Positivo', value: canonical.filter((post) => post.sentiment === 'positivo').length, itemStyle: { color: '#22C55E' } },
    { name: 'Neutro', value: canonical.filter((post) => post.sentiment === 'neutro').length, itemStyle: { color: '#2563EB' } },
    { name: 'Negativo', value: canonical.filter((post) => post.sentiment === 'negativo').length, itemStyle: { color: '#FF3B3B' } },
    { name: 'Misto', value: canonical.filter((post) => post.sentiment === 'misto').length, itemStyle: { color: '#EAB308' } },
  ];
  const riskData = [
    { name: 'Baixo', value: canonical.filter((post) => post.risk === 'baixo').length, itemStyle: { color: '#22C55E' } },
    { name: 'Médio', value: canonical.filter((post) => normalizeRisk(post.risk) === 'medio').length, itemStyle: { color: '#EAB308' } },
    { name: 'Alto', value: canonical.filter((post) => post.risk === 'alto').length, itemStyle: { color: '#F97316' } },
    { name: 'Crítico', value: canonical.filter((post) => normalizeRisk(post.risk) === 'critico').length, itemStyle: { color: '#FF3B3B' } },
  ];
  const themeCounts = new Map<string, number>();
  for (const post of canonical) if (post.topic) themeCounts.set(post.topic, (themeCounts.get(post.topic) ?? 0) + 1);
  const themes = [...themeCounts].map(([name, value]) => ({ name, value })).sort((left, right) => right.value - left.value).slice(0, 10);
  const topImpact = [...canonical].sort((left, right) => right.totalEngagement - left.totalEngagement).slice(0, 5);
  const riskWeight = (risk: string | null) => ({ critico: 4, alto: 3, medio: 2, baixo: 1 }[normalizeRisk(risk)] ?? 0);
  const topRisk = [...canonical].sort((left, right) => riskWeight(right.risk) - riskWeight(left.risk)).slice(0, 5);
  const postsWithCrisisTemperature = canonical.filter((post) => post.crisisTemperature !== null);
  const crisisScore = postsWithCrisisTemperature.length ? Math.round(postsWithCrisisTemperature.reduce((sum, post) => sum + post.crisisTemperature, 0) / postsWithCrisisTemperature.length) : 0;
  return { sentimentData, riskData, themes, topImpact, topRisk, crisisScore };
}
export async function getXChartData(filters?: XFilters) { const data = await fetchXData(filters); return computeXChartData(data.analyticsPosts, data.analyticsReplies); }
export function computeXAlert(posts: XPosts) { return [...new Map(posts.map((post) => [post.id, post])).values()].filter((post) => post.risk === 'alto' || post.risk === 'critico').sort((left, right) => right.totalEngagement - left.totalEngagement || new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime())[0] ?? null; }
export async function getXAlert(filters?: XFilters) { const data = await fetchXData(filters); return computeXAlert(data.analyticsPosts); }

export async function getXFiltersOptions(allowedTargetIds?: string[] | null, clientId?: string | null) {
  const data = await fetchXData({ allowedTargetIds, clientId });
  const client = createAdminClient();
  let query = client.from('targets').select('id,candidate_name,client_id').order('candidate_name');
  if (clientId) query = query.eq('client_id', clientId);
  if (allowedTargetIds) query = query.in('id', allowedTargetIds);
  const result = await query;
  if (result.error) throw new Error(`X filter targets query failed: ${result.error.message}`);
  return { candidates: (result.data ?? []).map((target) => ({ id: target.id, name: target.candidate_name })), topics: unique(data.analyticsPosts.map((post) => post.topic).filter((topic): topic is string => typeof topic === 'string' && topic.length > 0)).sort() };
}
