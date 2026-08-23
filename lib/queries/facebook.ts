import 'server-only';
import { createAdminClient } from '@/lib/supabaseClient';
import { toFacebookAnalyticsContract, type FacebookAnalyticsSourceRow } from '@/lib/facebook/analytics-contract';
import { toFacebookAudienceReadModel, type FacebookAudienceReadModel } from '@/lib/facebook/comments/read-model';

export interface FacebookPostsQuery {
  clientId?: string | null;
  targetId?: string;
  socialAccountId?: string;
  startDate?: string;
  endDate?: string;
  period?: string | null;
  sentiment?: string | null;
  risk?: string | null;
  topic?: string | null;
  candidateIds?: string[] | null;
  allowedTargetIds?: string[] | null;
  search?: string | null;
}

export interface FacebookDashboardPost {
  id: string;
  client_id: string | null;
  target_id: string | null;
  social_account_id: string | null;
  platform: 'facebook';
  platform_post_id: string | null;
  post_url: string | null;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  taken_at: string | null;
  like_count: number | null;
  comment_count: number | null;
  /** Quantos comentários o PolitixOS de fato coletou — nunca confundir com comment_count (número público do Facebook). Opcional para não quebrar construtores existentes que não conheciam este campo. */
  comments_collected?: number;
  share_count: number | null;
  total_engagement: number;
  raw_json?: Record<string, unknown> | null;
}

export interface FacebookPostWithAnalysis {
  post: FacebookDashboardPost;
  /**
   * Audience intelligence (comentários individuais + Gemini) — null quando o
   * post ainda não foi processado por essa fila (lib/facebook/comments),
   * independente do estado da análise de sentimento em `analysis` abaixo.
   * `comments_collected` no post acima é o denominador real (quantos
   * comentários o PolitixOS de fato coletou) — nunca confundir com
   * `comment_count` (número público informado pelo Facebook). Opcional para
   * não quebrar construtores existentes que não conheciam este campo.
   */
  audience?: FacebookAudienceReadModel | null;
  analysis: {
    id?: string;
    sentiment?: string | null;
    risk_level?: string | null;
    risk_reason?: string | null;
    ai_topic?: string | null;
    ai_topics?: string[] | null;
    ai_entities?: string[] | null;
    ai_keywords?: string[] | null;
    summary?: string | null;
    recommended_action?: string | null;
    author_tone?: string | null;
    public_reaction?: string | null;
    polarization_level?: string | null;
    crisis_temperature?: number | string | null;
    strategic_reading?: string | null;
    engagement_quality?: string | null;
    confidence_score?: number | null;
    raw_ai_response?: Record<string, unknown> | null;
  } | null;
}

export function cleanFilter(val: string | string[] | undefined): string | null {
  if (!val) return null;
  const str = Array.isArray(val) ? val[0] : val;
  if (!str || str === 'all' || str === 'TODOS' || str === '—') return null;
  return str.trim();
}

/**
 * Resolve o escopo final de targets sem permitir que uma selecao de UI amplie
 * a autorizacao do usuario. `null` representa o contrato legado sem restricao;
 * `[]` representa negacao explicita e deve encerrar a leitura sem I/O.
 */
export function resolveFacebookTargetScope(
  candidateIds?: string[] | null,
  allowedTargetIds?: string[] | null,
): string[] | null {
  const selected = Array.from(new Set(candidateIds ?? []));

  if (allowedTargetIds === null || allowedTargetIds === undefined) {
    return selected.length > 0 ? selected : null;
  }

  const allowed = Array.from(new Set(allowedTargetIds));
  if (allowed.length === 0) return [];
  if (selected.length === 0) return allowed;

  const allowedSet = new Set(allowed);
  return selected.filter((targetId) => allowedSet.has(targetId));
}

export async function fetchFacebookPosts(input: FacebookPostsQuery) {
  const effectiveTargets = resolveFacebookTargetScope(input.candidateIds, input.allowedTargetIds);
  if (effectiveTargets?.length === 0) return [];

  const client = createAdminClient();
  let query = client
    .from('social_posts')
    .select('*')
    .eq('platform', 'facebook');

  if (input.clientId) {
    query = query.eq('client_id', input.clientId);
  }
  if (input.targetId) {
    query = query.eq('target_id', input.targetId);
  }
  if (input.socialAccountId) {
    query = query.eq('social_account_id', input.socialAccountId);
  }

  if (effectiveTargets) {
    query = query.in('target_id', effectiveTargets);
  }

  if (input.startDate) {
    query = query.gte('taken_at', input.startDate);
  }
  if (input.endDate) {
    query = query.lt('taken_at', input.endDate);
  }

  if (input.period && input.period !== 'all') {
    const days = Number.parseInt(input.period, 10);
    if (!Number.isNaN(days) && days > 0) {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      query = query.gte('taken_at', since);
    }
  }

  query = query.order('taken_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`FACEBOOK_BACKEND_READ_FAILED: ${error.message}`);
  return data ?? [];
}

export async function fetchFacebookPostsWithAnalysis(input: FacebookPostsQuery): Promise<FacebookPostWithAnalysis[]> {
  const posts = await fetchFacebookPosts(input);
  if (posts.length === 0) return [];

  const client = createAdminClient();
  const postIds = posts.map((post) => (post as { id: string }).id);
  // As três consultas são independentes entre si (nenhuma usa o resultado da
  // outra) — paralelizadas em vez de sequenciais.
  const [
    { data: analysisRows, error },
    { data: audienceRows, error: audienceError },
    { data: commentRows, error: commentsError },
  ] = await Promise.all([
    client.from('ai_analysis').select('*').eq('content_type', 'post').in('content_id', postIds),
    client.from('facebook_audience_analysis').select('*').in('social_post_id', postIds),
    client.from('facebook_comments').select('social_post_id').in('social_post_id', postIds),
  ]);

  if (error) throw new Error(`FACEBOOK_BACKEND_READ_FAILED: ${error.message}`);
  if (audienceError) throw new Error(`FACEBOOK_BACKEND_READ_FAILED: ${audienceError.message}`);
  if (commentsError) throw new Error(`FACEBOOK_BACKEND_READ_FAILED: ${commentsError.message}`);

  const analysisByPostId = new Map<string, Record<string, unknown>>();
  for (const row of (analysisRows ?? []) as Array<Record<string, unknown>>) {
    analysisByPostId.set(row.content_id as string, row);
  }

  const audienceByPostId = new Map<string, Record<string, unknown>>();
  for (const row of (audienceRows ?? []) as Array<Record<string, unknown>>) {
    audienceByPostId.set(row.social_post_id as string, row);
  }

  const commentsCollectedByPostId = new Map<string, number>();
  for (const row of (commentRows ?? []) as Array<{ social_post_id: string }>) {
    commentsCollectedByPostId.set(row.social_post_id, (commentsCollectedByPostId.get(row.social_post_id) ?? 0) + 1);
  }

  let items: FacebookPostWithAnalysis[] = posts.map((post) => {
    const rawPost = post as FacebookAnalyticsSourceRow & {
      social_account_id?: string | null;
      like_count?: number | null;
      share_count?: number | null;
      thumbnail_url?: string | null;
    };
    const normalizedPost = toFacebookAnalyticsContract(rawPost);
    const rawJson = rawPost.raw_json !== null && typeof rawPost.raw_json === 'object' && !Array.isArray(rawPost.raw_json)
      ? rawPost.raw_json as Record<string, unknown>
      : null;
    return {
      post: {
        id: normalizedPost.id,
        client_id: normalizedPost.clientId,
        target_id: normalizedPost.targetId,
        social_account_id: rawPost.social_account_id ?? null,
        platform: 'facebook',
        platform_post_id: rawPost.platform_post_id ?? null,
        post_url: normalizedPost.url,
        caption: normalizedPost.text,
        media_type: normalizedPost.mediaType ?? rawPost.media_type ?? null,
        media_url: normalizedPost.mediaUrl ?? rawPost.media_url ?? null,
        thumbnail_url: normalizedPost.thumbnailUrl ?? rawPost.thumbnail_url ?? null,
        taken_at: normalizedPost.publishedAt,
        like_count: rawPost.like_count ?? null,
        comment_count: rawPost.comment_count ?? null,
        comments_collected: commentsCollectedByPostId.get(rawPost.id) ?? 0,
        share_count: rawPost.share_count ?? null,
        total_engagement: (rawPost.like_count ?? 0) + (rawPost.comment_count ?? 0) + (rawPost.share_count ?? 0),
        raw_json: rawJson,
      },
      audience: audienceByPostId.has(rawPost.id) ? toFacebookAudienceReadModel(audienceByPostId.get(rawPost.id) ?? null) : null,
      analysis: (analysisByPostId.get(rawPost.id) as FacebookPostWithAnalysis['analysis']) ?? null,
    };
  });

  // Client-side filtering for sentiment, risk, topic, search
  if (input.sentiment) {
    const targetSentiment = input.sentiment.toLowerCase();
    items = items.filter((item) => (item.analysis?.sentiment ?? '').toLowerCase() === targetSentiment);
  }

  if (input.risk) {
    const targetRisk = input.risk.toLowerCase();
    items = items.filter((item) => (item.analysis?.risk_level ?? '').toLowerCase().includes(targetRisk));
  }

  if (input.topic) {
    const targetTopic = input.topic.toLowerCase();
    items = items.filter((item) => (item.analysis?.ai_topic ?? '').toLowerCase().includes(targetTopic));
  }

  if (input.search) {
    const term = input.search.toLowerCase();
    items = items.filter((item) =>
      (item.post.caption ?? '').toLowerCase().includes(term) ||
      (item.analysis?.summary ?? '').toLowerCase().includes(term) ||
      (item.analysis?.ai_topic ?? '').toLowerCase().includes(term)
    );
  }

  return items;
}

export async function fetchFacebookData(input: FacebookPostsQuery) {
  const effectiveTargets = resolveFacebookTargetScope(input.candidateIds, input.allowedTargetIds);
  if (effectiveTargets?.length === 0) {
    return { items: [], accounts: [], completeness: 'MISSING' };
  }

  const client = createAdminClient();
  let accountsQuery = client
    .from('social_accounts')
    .select('id, target_id, platform, handle, platform_account_id, is_active')
    .eq('platform', 'facebook')
    .eq('is_active', true);

  if (input.clientId) {
    accountsQuery = accountsQuery.eq('client_id', input.clientId);
  }
  if (effectiveTargets) {
    accountsQuery = accountsQuery.in('target_id', effectiveTargets);
  }

  // accountsQuery não depende de `items` (posts+análise) — antes era buscado
  // sequencialmente depois deles; paralelizado porque as duas consultas são
  // independentes (mesmo padrão já aplicado em fetchInstagramData/fetchXData).
  const [items, { data: accounts }] = await Promise.all([
    fetchFacebookPostsWithAnalysis(input),
    accountsQuery,
  ]);

  return {
    items,
    accounts: accounts ?? [],
    completeness: items.length > 0 && items.some((i) => i.analysis !== null) ? 'COMPLETE' : 'MISSING',
  };
}

export function computeFacebookKPIs(items: FacebookPostWithAnalysis[]) {
  const totalPosts = items.length;
  const analyzedPosts = items.filter((i) => i.analysis !== null).length;

  let totalEngagement = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let highRiskCount = 0;

  const sentimentMap: Record<string, number> = { positivo: 0, neutro: 0, misto: 0, negativo: 0 };

  items.forEach((item) => {
    const post = item.post;
    const likes = post.like_count ?? 0;
    const comments = post.comment_count ?? 0;
    const shares = post.share_count ?? 0;

    totalLikes += likes;
    totalComments += comments;
    totalShares += shares;
    totalEngagement += likes + comments + shares;

    const sentiment = (item.analysis?.sentiment ?? '').toLowerCase();
    if (sentimentMap[sentiment] !== undefined) {
      sentimentMap[sentiment]++;
    }

    const risk = (item.analysis?.risk_level ?? '').toLowerCase();
    if (risk.includes('alto') || risk.includes('crít')) {
      highRiskCount++;
    }
  });

  let dominantSentiment = '—';
  let maxCount = 0;
  Object.entries(sentimentMap).forEach(([sent, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantSentiment = sent;
    }
  });

  const avgEngagement = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;

  return {
    totalPosts,
    analyzedPosts,
    totalEngagement,
    totalLikes,
    totalComments,
    totalShares,
    dominantSentiment,
    highRiskCount,
    avgEngagement,
    sentimentMap,
  };
}

export function computeFacebookCharts(items: FacebookPostWithAnalysis[]) {
  const sentimentDistribution = {
    positivo: 0,
    neutro: 0,
    misto: 0,
    negativo: 0,
  };

  const reactionsBreakdown: Record<string, number> = {
    Like: 0,
    Love: 0,
    Haha: 0,
    Wow: 0,
    Sad: 0,
    Angry: 0,
    Care: 0,
  };

  const topicsMap = new Map<string, number>();

  items.forEach((item) => {
    const sentiment = (item.analysis?.sentiment ?? '').toLowerCase();
    if (sentiment in sentimentDistribution) {
      sentimentDistribution[sentiment as keyof typeof sentimentDistribution]++;
    }

    const topic = item.analysis?.ai_topic;
    if (topic && topic !== 'Sem análise' && topic !== '—') {
      topicsMap.set(topic, (topicsMap.get(topic) ?? 0) + 1);
    }

    // Extract reactions breakdown if available in raw_json
    const rawJson = item.post.raw_json;
    if (rawJson && typeof rawJson === 'object' && rawJson.reactions_breakdown) {
      const breakdown = rawJson.reactions_breakdown;
      Object.entries(breakdown).forEach(([r, c]) => {
        if (typeof c === 'number') {
          reactionsBreakdown[r] = (reactionsBreakdown[r] ?? 0) + c;
        }
      });
    }
  });

  const topTopics = Array.from(topicsMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    sentimentDistribution,
    reactionsBreakdown,
    topTopics,
  };
}

export function computeFacebookAlert(items: FacebookPostWithAnalysis[]) {
  const highRiskItem = items.find((item) => {
    const risk = (item.analysis?.risk_level ?? '').toLowerCase();
    return risk.includes('alto') || risk.includes('crít');
  });

  if (!highRiskItem) return null;

  return {
    postId: highRiskItem.post.id,
    title: highRiskItem.analysis?.summary ?? highRiskItem.post.caption ?? 'Publicação monitorada',
    riskLevel: highRiskItem.analysis?.risk_level ?? 'Alto',
    riskReason: highRiskItem.analysis?.risk_reason ?? 'Publicação sob monitoramento de risco.',
    recommendedAction: highRiskItem.analysis?.recommended_action ?? 'Monitorar comentários e engajamento.',
    takenAt: highRiskItem.post.taken_at ?? '',
    postUrl: highRiskItem.post.post_url ?? '',
  };
}

export async function getFacebookFilterOptions(allowedTargetIds?: string[] | null, clientId?: string | null) {
  if (allowedTargetIds !== null && allowedTargetIds !== undefined && allowedTargetIds.length === 0) {
    return { accounts: [], topics: [], sentiments: [], risks: [] };
  }

  const client = createAdminClient();

  let query = client
    .from('social_accounts')
    .select('id, target_id, handle, platform')
    .eq('platform', 'facebook')
    .eq('is_active', true);

  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  if (allowedTargetIds) {
    query = query.in('target_id', allowedTargetIds);
  }

  let analysisQuery = client
    .from('ai_analysis')
    .select('ai_topic, sentiment, risk_level')
    .eq('platform', 'facebook');

  if (clientId) {
    analysisQuery = analysisQuery.eq('client_id', clientId);
  }
  if (allowedTargetIds) {
    analysisQuery = analysisQuery.in('target_id', allowedTargetIds);
  }

  // As duas consultas são independentes (analysisQuery não usa `accounts`) —
  // paralelizadas em vez de sequenciais, mesmo padrão do restante desta auditoria.
  const [{ data: accounts }, { data: analysisRows }] = await Promise.all([query, analysisQuery]);

  const topics = new Set<string>();
  const sentiments = new Set<string>();
  const risks = new Set<string>();

  (analysisRows ?? []).forEach((row: Record<string, unknown>) => {
    if (typeof row.ai_topic === 'string' && row.ai_topic !== 'Sem análise' && row.ai_topic !== '—') topics.add(row.ai_topic);
    if (typeof row.sentiment === 'string') sentiments.add(row.sentiment);
    if (typeof row.risk_level === 'string') risks.add(row.risk_level);
  });

  return {
    accounts: accounts ?? [],
    topics: Array.from(topics),
    sentiments: Array.from(sentiments),
    risks: Array.from(risks),
  };
}
