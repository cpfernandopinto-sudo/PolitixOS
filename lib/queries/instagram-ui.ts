import 'server-only';

import { getActiveClientId, getAllowedTargetIds } from '@/lib/auth/dal';
import { buildInstagramUiContract, normalizeInstagramContentTypeFilter, type InstagramUiRawAnalysis, type InstagramUiRawComment } from '@/lib/instagram/ui-contract';
import { createAdminClient } from '@/lib/supabaseClient';
import type {
  InstagramExternalKpis,
  InstagramExternalPost,
  InstagramExternalUiContract,
  InstagramUiContract,
  InstagramUiQuery,
} from '@/lib/types/instagram-ui';
import type { InstagramContentType } from '@/lib/instagram/content-type';

export const ANALYTICS_POST_BATCH_SIZE = 500;
export const MAX_ANALYTICS_POSTS = 10_000;
const MAX_RECENT_COMMENTS = 500;
const POSTGREST_IN_BATCH_SIZE = 150;
// Medido nesta investigação (produção, 665 posts): buscar `raw_json` junto do
// lote principal de posts custa ~10-13s sozinho — TOAST/payload do Postgres,
// não round-trip de rede (confirmado: chunking em lotes menores NÃO reduz o
// tempo total, só adiciona overhead). Isso, somado às demais etapas
// (~6-7s), ultrapassava o teto rígido de 10s de execução do plano Hobby da
// Vercel, matando a função no meio do stream e deixando o skeleton de
// loading.tsx congelado para sempre — sem erro, sem timeout visível, sem
// dado nenhum chegando para substituí-lo. `raw_json` só alimenta métricas
// SECUNDÁRIAS (plays/views/reach/impressions/shares/saves/carrossel) — likes,
// comentários, sentimento, risco e ordenação usam colunas estruturadas e
// nunca dependem dele (ver mapInstagramPost/engagementValue). Por isso é
// seguro buscá-lo com orçamento de tempo limitado: dentro do orçamento, tudo
// funciona como sempre; se ultrapassar, essas métricas ficam
// `UNAVAILABLE` — caminho já existente e testado (post sem raw_json nunca
// foi um erro) — em vez de travar a página inteira.
const RAW_JSON_FETCH_BUDGET_MS = 3500;
// Medido nesta investigação (produção): `topPostIds` (usado para prefetch de
// comentários de posts prioritários) é ordenado por risco e depois por
// like_count+comment_count — por desenho, quase sempre inclui os posts com
// MAIS comentários (alguns com 1.000-2.000+). Sem índice em
// `created_at_instagram`, ordenar esse conjunto por data exigiu um Sort real
// sobre milhares de linhas (confirmado via EXPLAIN), estourando o
// statement_timeout do Postgres (8s) e derrubando a página inteira sem
// nenhum handling. Mesmo princípio de orçamento do raw_json: dentro do
// tempo, comportamento idêntico; além dele, a página renderiza sem esses
// comentários em vez de travar.
const COMMENTS_FETCH_BUDGET_MS = 4000;

const POST_FIELDS = 'id,target_id,client_id,platform,caption,content_type,media_type,media_url,post_url,taken_at,collected_at,like_count,comment_count';
const COMMENT_FIELDS = 'id,instagram_comment_id,post_id,parent_comment_id,comment_user,comment_text,like_count,created_at_instagram,collected_at,client_id,target_id';
const ANALYSIS_FIELDS = 'content_id,sentiment,risk_level,ai_topics,summary,risk_reason,recommended_action,engagement_quality,polarization_level,client_id,target_id';

/**
 * Busca `raw_json` de todos os posts em lotes (mesmo padrão de
 * fetchInstagramAnalyses), mas nunca espera além de `budgetMs` no total —
 * estourado o orçamento, resolve com o que já tiver sido coletado até ali
 * (posts restantes ficam com enrichment UNAVAILABLE, nunca um erro).
 */
async function fetchInstagramRawJsonMap(client: ReturnType<typeof createAdminClient>, postIds: string[], budgetMs: number): Promise<Map<string, unknown>> {
  const byId = new Map<string, unknown>();
  const chunks = chunkInstagramPostIds(postIds);
  let timedOut = false;
  const timer = new Promise<void>((resolve) => setTimeout(() => { timedOut = true; resolve(); }, budgetMs));

  const collect = (async () => {
    for (let index = 0; index < chunks.length && !timedOut; index += 4) {
      const results = await Promise.all(
        chunks.slice(index, index + 4).map((batch) => client.from('social_posts').select('id,raw_json').in('id', batch)),
      );
      for (const result of results) {
        if (result.error) return; // não trava a página por causa de um erro nesta busca acessória — enrichment fica UNAVAILABLE.
        for (const row of result.data ?? []) byId.set(row.id, row.raw_json);
      }
    }
  })();

  await Promise.race([collect, timer]);
  return byId;
}

/**
 * Busca comentários com orçamento de tempo — estourado, resolve com lista
 * vazia (a página renderiza sem esses comentários) em vez de deixar o
 * statement_timeout do Postgres derrubar a requisição inteira sem handling.
 */
async function fetchInstagramCommentsWithBudget(
  client: ReturnType<typeof createAdminClient>,
  postIds: string[],
  activeClientId: string | null,
  targetIds: string[] | null,
  budgetMs: number,
): Promise<InstagramUiRawComment[]> {
  const run = (async () => {
    let commentsQuery = client.from('instagram_comments').select(COMMENT_FIELDS).in('post_id', postIds).order('created_at_instagram', { ascending: false }).limit(MAX_RECENT_COMMENTS);
    if (activeClientId) commentsQuery = commentsQuery.eq('client_id', activeClientId);
    if (targetIds) commentsQuery = commentsQuery.in('target_id', targetIds);
    const result = await commentsQuery;
    if (result.error) return [];
    return result.data ?? [];
  })();

  const timer = new Promise<InstagramUiRawComment[]>((resolve) => setTimeout(() => resolve([]), budgetMs));
  return Promise.race([run, timer]);
}

export function instagramAnalyticsRanges(totalAvailable: number, limit = MAX_ANALYTICS_POSTS, batchSize = ANALYTICS_POST_BATCH_SIZE) {
  const totalLoaded = Math.min(Math.max(0, totalAvailable), Math.max(0, limit));
  const safeBatchSize = Math.max(1, Math.floor(batchSize));
  const ranges: Array<{ from: number; to: number }> = [];
  for (let from = 0; from < totalLoaded; from += safeBatchSize) {
    ranges.push({ from, to: Math.min(totalLoaded - 1, from + safeBatchSize - 1) });
  }
  return ranges;
}

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
  const contentTypes = normalizeInstagramContentTypeFilter(query.contentTypes);
  const periodFrom = query.periodDays && Number.isFinite(query.periodDays) && query.periodDays > 0
    ? new Date(Date.now() - Math.floor(query.periodDays) * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const createPostsQuery = (from: number, to: number, withCount = false) => {
    let scoped = client
      .from('social_posts')
      .select(POST_FIELDS, withCount ? { count: 'exact' } : undefined)
      .eq('platform', 'instagram')
      .or('content_origin.eq.OWNED,content_origin.is.null')
      .order('taken_at', { ascending: false })
      .order('id', { ascending: false });
    if (activeClientId) scoped = scoped.eq('client_id', activeClientId);
    if (targetIds) scoped = scoped.in('target_id', targetIds);
    if (contentTypes.length) scoped = scoped.in('content_type', contentTypes);
    if (periodFrom) scoped = scoped.gte('taken_at', periodFrom);
    return scoped.range(from, to);
  };

  // availableTargetsQuery (nomes de candidato) e firstPostsResult (primeira
  // página de posts) são independentes entre si — paralelizados em vez de
  // sequenciais (nenhum dos dois depende do resultado do outro).
  const [availableTargetsResult, firstPostsResult] = await Promise.all([
    availableTargetsQuery,
    createPostsQuery(0, ANALYTICS_POST_BATCH_SIZE - 1, true),
  ]);
  if (availableTargetsResult.error) throw new Error(`Instagram targets query failed: ${availableTargetsResult.error.message}`);
  const targetNames = new Map((availableTargetsResult.data ?? []).map((target) => [target.id, target.candidate_name ?? null]).filter((entry): entry is [string, string] => Boolean(entry[1])));
  if (firstPostsResult.error) throw new Error(`Instagram posts query failed: ${firstPostsResult.error.message}`);
  const postsCount = firstPostsResult.count ?? firstPostsResult.data?.length ?? 0;
  const ranges = instagramAnalyticsRanges(postsCount).slice(1);
  const posts = [...(firstPostsResult.data ?? [])];
  for (let index = 0; index < ranges.length; index += 4) {
    const results = await Promise.all(ranges.slice(index, index + 4).map(({ from, to }) => createPostsQuery(from, to)));
    const error = results.find((result) => result.error)?.error;
    if (error) throw new Error(`Instagram posts query failed: ${error.message}`);
    posts.push(...results.flatMap((result) => result.data ?? []));
  }
  const postIds = posts.map((post) => post.id);
  if (postIds.length === 0) return emptyContract(query, targetNames);

  const fetchAnalyses = async (): Promise<InstagramUiRawAnalysis[]> => {
    const analyses: InstagramUiRawAnalysis[] = [];
    const analysisBatches = chunkInstagramPostIds(postIds);
    for (let index = 0; index < analysisBatches.length; index += 4) {
      const results = await Promise.all(analysisBatches.slice(index, index + 4).map((batch) => {
        let batchQuery = client.from('ai_analysis').select(ANALYSIS_FIELDS).eq('content_type', 'post').in('content_id', batch);
        if (activeClientId) batchQuery = batchQuery.eq('client_id', activeClientId);
        return batchQuery;
      }));
      const error = results.find((result) => result.error)?.error;
      if (error) throw new Error(`Instagram analysis query failed: ${error.message}`);
      analyses.push(...results.flatMap((result) => result.data ?? []));
    }
    return analyses;
  };

  // ai_analysis (obrigatório — sentimento/risco/tópicos) e raw_json (acessório
  // — enrichment de reel/carrossel) são independentes entre si: rodam em
  // paralelo, e raw_json nunca segura a página além do próprio orçamento.
  const [analyses, rawJsonById] = await Promise.all([
    fetchAnalyses(),
    fetchInstagramRawJsonMap(client, postIds, RAW_JSON_FETCH_BUDGET_MS),
  ]);
  for (const post of posts) (post as { raw_json?: unknown }).raw_json = rawJsonById.get(post.id) ?? null;

  const normalizedRisk = query.risk?.trim().toLocaleLowerCase('pt-BR') ?? '';
  const normalizedSentiment = query.sentiment?.trim().toLocaleLowerCase('pt-BR') ?? '';
  const normalizedTopic = query.topic?.trim().toLocaleLowerCase('pt-BR') ?? '';
  const hasAnalysisFilter = Boolean(normalizedRisk || normalizedSentiment || normalizedTopic);
  const matchingAnalysisIds = hasAnalysisFilter
    ? new Set(analyses.filter((analysis) => {
        if (normalizedRisk && analysis.risk_level?.trim().toLocaleLowerCase('pt-BR') !== normalizedRisk) return false;
        if (normalizedSentiment && analysis.sentiment?.trim().toLocaleLowerCase('pt-BR') !== normalizedSentiment) return false;
        if (normalizedTopic) {
          const topics = Array.isArray(analysis.ai_topics)
            ? analysis.ai_topics
            : typeof analysis.ai_topics === 'string'
              ? (() => { try { return JSON.parse(analysis.ai_topics); } catch { return []; } })()
              : [];
          if (!topics.some((topic: unknown) => typeof topic === 'string' && topic.trim().toLocaleLowerCase('pt-BR') === normalizedTopic)) return false;
        }
        return true;
      }).map((analysis) => analysis.content_id))
    : null;
  const filteredPosts = matchingAnalysisIds ? posts.filter((post) => matchingAnalysisIds.has(post.id)) : posts;
  const filteredPostIds = filteredPosts.map((post) => post.id);
  if (filteredPostIds.length === 0) return emptyContract(query, targetNames);

  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(query.pageSize ?? 20)));
  const pagePostIds = filteredPosts.slice((page - 1) * pageSize, page * pageSize).map((post) => post.id);
  const analysisByPost = new Map(analyses.map((analysis) => [analysis.content_id, analysis]));
  const riskWeight = (postId: string) => /crít|crit|alto/i.test(analysisByPost.get(postId)?.risk_level ?? '') ? 3 : /médio|medio/i.test(analysisByPost.get(postId)?.risk_level ?? '') ? 2 : /baixo/i.test(analysisByPost.get(postId)?.risk_level ?? '') ? 1 : 0;
  const topPostIds = [...filteredPosts]
    .sort((left, right) => riskWeight(right.id) - riskWeight(left.id) || ((right.like_count ?? 0) + (right.comment_count ?? 0)) - ((left.like_count ?? 0) + (left.comment_count ?? 0)))
    .slice(0, 10)
    .map((post) => post.id);
  const commentPostIds = [...new Set([...pagePostIds, ...topPostIds])];
  // `topPostIds` é ordenado por (risco, depois like_count+comment_count) —
  // ou seja, por desenho, quase sempre inclui os posts com MAIS comentários.
  // Medido em produção: alguns posts têm 1.000-2.000+ comentários; sem índice
  // em `created_at_instagram`, ordenar esse conjunto por data custa um Sort
  // sobre milhares de linhas (confirmado via EXPLAIN real) — o suficiente
  // para estourar o statement_timeout do Postgres (8s, papel `authenticator`
  // usado por baixo do service role via PostgREST). Isso já derrubava a
  // requisição com um throw (existe app/dashboard/instagram/error.tsx, mas
  // seu botão "tentar novamente" usava um prop inexistente, `unstable_retry`,
  // corrigido nesta mesma correção para `reset`). `count: 'exact'` foi
  // removido — fazia um segundo scan completo do mesmo conjunto só para um
  // número exibido de forma informativa. A busca em si segue com orçamento
  // de tempo: dentro dele, comportamento idêntico; além dele, a página
  // renderiza sem esses comentários em vez de depender do timeout do
  // Postgres — mesmo princípio já aplicado ao raw_json.
  const comments = await fetchInstagramCommentsWithBudget(client, commentPostIds, activeClientId, targetIds, COMMENTS_FETCH_BUDGET_MS);

  const contract = buildInstagramUiContract({
    posts: filteredPosts,
    comments,
    analyses,
    targetNames,
    // O contador global usa `comment_count` dos posts. A consulta de
    // `instagram_comments` permanece uma janela operacional para UI/drawer.
    totalComments: filteredPosts.reduce((sum, post) => sum + (post.comment_count ?? 0), 0),
    totalAvailable: hasAnalysisFilter && posts.length >= postsCount ? filteredPosts.length : postsCount,
    commentsTotalAvailable: comments.length,
    analyticsLimit: MAX_ANALYTICS_POSTS,
    page: query.page,
    pageSize: query.pageSize,
  });

  // `postsCount` pode superar o teto analítico no futuro. A paginação nunca
  // afirma uma cobertura maior que o conjunto efetivamente mapeado.
  if (postsCount > MAX_ANALYTICS_POSTS) {
    contract.pagination.hasNextPage = true;
  }
  return contract;
}

export function resolveExternalAuthor(rawJson: unknown): { username: string; fullName: string | null } {
  const raw = (rawJson && typeof rawJson === 'object' ? rawJson : {}) as Record<string, any>;
  const user = raw.user || raw.owner || raw.author || {};
  const username = user.username || raw.username || 'desconhecido';
  const fullName = user.full_name || user.name || null;
  return { username, fullName };
}

export function resolveExternalDiscovery(target?: { match_type?: string | null; discovery_source?: string | null; match_term?: string | null }): {
  source: string;
  label: string;
  matchType: string;
  matchTerm: string | null;
  explanation: string;
} {
  const source = target?.discovery_source || 'unknown';
  const matchType = target?.match_type || 'unknown';
  const matchTerm = target?.match_term || null;

  if (source === 'mention' || matchType === 'mention_of_target') {
    return {
      source: 'mention',
      label: 'Marcou o candidato',
      matchType,
      matchTerm,
      explanation: matchTerm
        ? `Este perfil marcou diretamente o candidato (@${matchTerm.replace(/^@/, '')}).`
        : 'Este perfil marcou diretamente o perfil do candidato no Instagram.',
    };
  }

  if (source === 'search' || matchType === 'search') {
    return {
      source: 'search',
      label: 'Descoberta externa',
      matchType,
      matchTerm,
      explanation: matchTerm
        ? `Publicação identificada pelo monitoramento de termos externos ("${matchTerm}") e classificada pela IA como relevante para o candidato.`
        : 'Publicação identificada pelo monitoramento externo e classificada pela IA como relacionada ao candidato.',
    };
  }

  return {
    source,
    label: 'Menção externa',
    matchType,
    matchTerm,
    explanation: 'Publicação externa associada ao candidato pelo monitoramento de redes.',
  };
}

export function emptyExternalContract(query: InstagramUiQuery = {}): InstagramExternalUiContract {
  return {
    kpis: {
      total: 0,
      positive: 0,
      positivePct: 0,
      negative: 0,
      negativePct: 0,
      highOrCriticalRisk: 0,
      highOrCriticalRiskPct: 0,
    },
    posts: [],
    filterOptions: {
      formats: ['REEL', 'IMAGE', 'CAROUSEL'],
      risks: ['baixo', 'médio', 'alto', 'crítico'],
      sentiments: ['positivo', 'neutro', 'negativo'],
      origins: [
        { value: 'mention', label: 'Marcou o candidato' },
        { value: 'search', label: 'Descoberta externa' },
      ],
    },
    pagination: {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
    },
  };
}

export async function getInstagramExternalUiContract(query: InstagramUiQuery = {}): Promise<InstagramExternalUiContract> {
  const [allowedTargetIds, activeClientId] = await Promise.all([
    getAllowedTargetIds(),
    getActiveClientId(),
  ]);
  const targetIds = intersectInstagramTargetScope(query.candidateIds, allowedTargetIds);
  if (targetIds?.length === 0) return emptyExternalContract(query);

  const client = createAdminClient();

  // 1. Fetch external posts from social_posts
  const contentTypes = normalizeInstagramContentTypeFilter(query.contentTypes);
  const periodFrom = query.periodDays && Number.isFinite(query.periodDays) && query.periodDays > 0
    ? new Date(Date.now() - Math.floor(query.periodDays) * 24 * 60 * 60 * 1000).toISOString()
    : null;

  let postsQuery = client
    .from('social_posts')
    .select('id, target_id, client_id, platform, content_origin, caption, content_type, media_type, media_url, post_url, taken_at, collected_at, like_count, comment_count, raw_json')
    .eq('platform', 'instagram')
    .eq('content_origin', 'EXTERNAL')
    .order('taken_at', { ascending: false });

  if (activeClientId) postsQuery = postsQuery.eq('client_id', activeClientId);
  if (periodFrom) postsQuery = postsQuery.gte('taken_at', periodFrom);
  if (contentTypes.length) postsQuery = postsQuery.in('content_type', contentTypes);

  const { data: rawExternalPosts, error: postsError } = await postsQuery;
  if (postsError) throw new Error(`Instagram external posts query failed: ${postsError.message}`);
  if (!rawExternalPosts || rawExternalPosts.length === 0) return emptyExternalContract(query);

  const externalPostIds = rawExternalPosts.map((p) => p.id);

  // 2. Fetch social_post_targets for these external posts matching the scoped target(s)
  let targetsQuery = client
    .from('social_post_targets')
    .select('id, post_id, target_id, client_id, match_type, match_term, discovery_source')
    .in('post_id', externalPostIds);

  if (activeClientId) targetsQuery = targetsQuery.eq('client_id', activeClientId);
  if (targetIds) targetsQuery = targetsQuery.in('target_id', targetIds);

  const { data: postTargets, error: targetsError } = await targetsQuery;
  if (targetsError) throw new Error(`Instagram external post targets query failed: ${targetsError.message}`);
  if (!postTargets || postTargets.length === 0) return emptyExternalContract(query);

  const matchingPostIds = new Set(postTargets.map((t) => t.post_id));
  const postsData = rawExternalPosts.filter((p) => matchingPostIds.has(p.id));
  if (postsData.length === 0) return emptyExternalContract(query);

  const targetIdsForNames = Array.from(new Set(postTargets.map((t) => t.target_id).filter(Boolean)));
  let candidateNamesQuery = client.from('targets').select('id, candidate_name').in('id', targetIdsForNames);
  if (activeClientId) candidateNamesQuery = candidateNamesQuery.eq('client_id', activeClientId);
  const { data: candidateRows } = await candidateNamesQuery;

  const candidateNames = new Map((candidateRows ?? []).map((c) => [c.id, c.candidate_name ?? 'Candidato']));
  const targetByPostId = new Map(postTargets.map((t) => [t.post_id, t]));

  // 3. Fetch analyses for these posts
  const postIds = postsData.map((p) => p.id);
  let analysesQuery = client
    .from('ai_analysis')
    .select('content_id, sentiment, risk_level, ai_topics, summary, risk_reason, recommended_action, engagement_quality, polarization_level, confidence_score, client_id, target_id')
    .eq('content_type', 'post')
    .in('content_id', postIds);
  if (activeClientId) analysesQuery = analysesQuery.eq('client_id', activeClientId);

  const { data: analysesData, error: analysesError } = await analysesQuery;
  if (analysesError) throw new Error(`Instagram external analyses query failed: ${analysesError.message}`);

  const analysisByPostId = new Map((analysesData ?? []).map((a) => [a.content_id, a]));

  // 4. Map posts and apply filters
  const normalizedRisk = query.risk?.trim().toLocaleLowerCase('pt-BR') ?? '';
  const normalizedSentiment = query.sentiment?.trim().toLocaleLowerCase('pt-BR') ?? '';
  const normalizedTopic = query.topic?.trim().toLocaleLowerCase('pt-BR') ?? '';
  const normalizedOrigin = query.origin?.trim().toLocaleLowerCase('pt-BR') ?? '';

  const allExternalPosts: InstagramExternalPost[] = [];

  for (const post of postsData) {
    const target = targetByPostId.get(post.id);
    const analysis = analysisByPostId.get(post.id);
    const author = resolveExternalAuthor(post.raw_json);
    const discovery = resolveExternalDiscovery(target);

    // Topics parsing
    const rawTopics = analysis?.ai_topics;
    const themes: string[] = Array.isArray(rawTopics)
      ? rawTopics.filter((t): t is string => typeof t === 'string')
      : typeof rawTopics === 'string'
        ? (() => { try { return JSON.parse(rawTopics); } catch { return []; } })()
        : [];

    // Filter checks
    if (normalizedRisk && (analysis?.risk_level?.trim().toLocaleLowerCase('pt-BR') !== normalizedRisk)) {
      continue;
    }
    if (normalizedSentiment && (analysis?.sentiment?.trim().toLocaleLowerCase('pt-BR') !== normalizedSentiment)) {
      continue;
    }
    if (normalizedTopic && !themes.some((t) => t.trim().toLocaleLowerCase('pt-BR') === normalizedTopic)) {
      continue;
    }
    if (normalizedOrigin && discovery.source.toLowerCase() !== normalizedOrigin && discovery.matchType.toLowerCase() !== normalizedOrigin) {
      continue;
    }

    const likesCount = typeof post.like_count === 'number' ? post.like_count : null;
    const commentsCount = typeof post.comment_count === 'number' ? post.comment_count : null;
    const rawViews = (post.raw_json as any)?.view_count ?? (post.raw_json as any)?.views?.count ?? null;
    const viewsCount = rawViews !== null ? Number(rawViews) : null;

    allExternalPosts.push({
      id: post.id,
      targetId: target?.target_id || post.target_id || '',
      candidateName: target?.target_id ? (candidateNames.get(target.target_id) ?? null) : null,
      author,
      discovery,
      contentType: (post.content_type || 'IMAGE') as InstagramContentType,
      caption: post.caption || '',
      publishedAt: post.taken_at || null,
      collectedAt: post.collected_at || new Date().toISOString(),
      url: post.post_url || null,
      mediaUrl: post.media_url || null,
      metrics: {
        likes: {
          value: likesCount,
          availability: likesCount !== null ? 'AVAILABLE' : 'UNAVAILABLE',
          source: 'structured',
        },
        comments: {
          value: commentsCount,
          availability: commentsCount !== null ? 'AVAILABLE' : 'UNAVAILABLE',
          source: 'structured',
        },
        views: {
          value: Number.isFinite(viewsCount) ? viewsCount : null,
          availability: Number.isFinite(viewsCount) ? 'AVAILABLE' : 'UNAVAILABLE',
          source: 'raw_json',
        },
      },
      analysis: {
        sentiment: analysis?.sentiment || null,
        risk: analysis?.risk_level || null,
        riskReason: analysis?.risk_reason || null,
        themes,
        summary: analysis?.summary || null,
        recommendedAction: analysis?.recommended_action || null,
        confidence: analysis?.confidence_score !== null && analysis?.confidence_score !== undefined
          ? (analysis.confidence_score <= 1 ? Math.round(analysis.confidence_score * 100) : analysis.confidence_score)
          : null,
        engagementQuality: {
          value: analysis?.engagement_quality || null,
          availability: analysis?.engagement_quality ? 'AVAILABLE' : 'UNAVAILABLE',
        },
        polarizationLevel: {
          value: analysis?.polarization_level || null,
          availability: analysis?.polarization_level ? 'AVAILABLE' : 'UNAVAILABLE',
        },
      },
    });
  }

  // 5. Calculate External KPIs (exclusively on external posts)
  const total = allExternalPosts.length;
  const positive = allExternalPosts.filter((p) => p.analysis.sentiment?.toLowerCase() === 'positivo').length;
  const positivePct = total > 0 ? Math.round((positive / total) * 100) : 0;
  const negative = allExternalPosts.filter((p) => p.analysis.sentiment?.toLowerCase() === 'negativo').length;
  const negativePct = total > 0 ? Math.round((negative / total) * 100) : 0;
  const highOrCriticalRisk = allExternalPosts.filter((p) => /alto|crít|crit/i.test(p.analysis.risk ?? '')).length;
  const highOrCriticalRiskPct = total > 0 ? Math.round((highOrCriticalRisk / total) * 100) : 0;

  // 6. Pagination
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(query.pageSize ?? 20)));
  const totalPages = Math.ceil(total / pageSize);
  const pagedPosts = allExternalPosts.slice((page - 1) * pageSize, page * pageSize);

  // Available filter options
  const riskSet = new Set<string>();
  const sentimentSet = new Set<string>();
  for (const post of allExternalPosts) {
    if (post.analysis.risk) riskSet.add(post.analysis.risk.toLowerCase());
    if (post.analysis.sentiment) sentimentSet.add(post.analysis.sentiment.toLowerCase());
  }

  return {
    kpis: {
      total,
      positive,
      positivePct,
      negative,
      negativePct,
      highOrCriticalRisk,
      highOrCriticalRiskPct,
    },
    posts: pagedPosts,
    filterOptions: {
      formats: ['REEL', 'IMAGE', 'CAROUSEL'],
      risks: Array.from(riskSet),
      sentiments: Array.from(sentimentSet),
      origins: [
        { value: 'mention', label: 'Marcou o candidato' },
        { value: 'search', label: 'Descoberta externa' },
      ],
    },
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    },
  };
}
