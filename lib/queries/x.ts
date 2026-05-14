import { createClient } from '@/lib/supabaseClient';

export interface XFilters {
  period?: string | null;
  sentiment?: string | null;
  risk?: string | null;
  topic?: string | null;
  candidate?: string | null;
  search?: string | null;
  allowedTargetIds?: string[] | null;
}

function parseJsonField(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(v => typeof v === 'string');
    } catch { /* ignore */ }
  }
  return [];
}

const EMPTY_VALUES = new Set(['', 'todos', 'todas', 'all', 'null', 'undefined']);
export function cleanFilter(v: string | string[] | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = Array.isArray(v) ? v[0] ?? '' : v;
  if (EMPTY_VALUES.has(s.toLowerCase())) return null;
  return s || null;
}

export async function fetchXData(filters?: XFilters) {
  const client = createClient();

  const restricted = filters?.allowedTargetIds !== null && filters?.allowedTargetIds !== undefined;
  if (restricted && (filters!.allowedTargetIds!.length === 0)) {
    return { posts: [], replies: [] };
  }

  // 1. Targets map
  const { data: targetsAll } = await client.from('targets').select('id, candidate_name');
  const targetsMap = new Map<string, string>();
  for (const t of targetsAll || []) targetsMap.set(t.id, t.candidate_name);

  // 2. Posts Fetch
  let pQuery = client.from('social_posts').select('*').eq('platform', 'x');

  if (restricted && filters!.allowedTargetIds!.length > 0) {
    pQuery = pQuery.in('target_id', filters!.allowedTargetIds!);
  }

  if (filters?.candidate) {
    pQuery = pQuery.eq('target_id', filters.candidate);
  }

  if (filters?.period) {
    const days = parseInt(filters.period, 10);
    if (!isNaN(days) && days > 0) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      pQuery = pQuery.gte('taken_at', from.toISOString());
    }
  }

  if (filters?.search) {
    pQuery = pQuery.ilike('caption', `%${filters.search}%`);
  }

  const { data: rawPosts, error: pError } = await pQuery.order('taken_at', { ascending: false }).limit(300);
  if (pError) console.error('[fetchXData] Error fetching posts:', pError.message);
  let postsData = rawPosts || [];

  const allPostIds = [...new Set(postsData.map(p => p.id))];

  // 3. AI Analysis
  const aiMap = new Map();
  if (allPostIds.length > 0) {
    const { data: aiData } = await client
      .from('ai_analysis')
      .select('*')
      .eq('content_type', 'post')
      .in('content_id', allPostIds);

    if (aiData) {
      for (const a of aiData) aiMap.set(a.content_id, a);
    }
  }

  // 4. Replies Fetch
  let repliesData: any[] = [];
  if (allPostIds.length > 0) {
    let rQuery = client.from('tweet_replies').select('*').in('post_id', allPostIds);
    const { data: rawReplies, error: rError } = await rQuery.order('created_at_twitter', { ascending: false }).limit(1000);
    if (rError) console.error('[fetchXData] Error fetching replies:', rError.message);
    repliesData = rawReplies || [];
  }

  // 5. Strategic Insights Helper
  const getStrategicInsights = (p: any, maxEng: number) => {
    // 1.1 Impact Score
    const engNormalizado = maxEng > 0 ? ((p.totalEngagement || 0) / maxEng) * 100 : 0;

    // Map risk to numeric
    const riskMap: Record<string, number> = { 'critico': 100, 'alto': 75, 'medio': 50, 'médio': 50, 'baixo': 25 };
    const riskVal = riskMap[p.risk?.toLowerCase()] || 0;

    // Map polarization to numeric
    const polMap: Record<string, number> = { 'alto': 100, 'medio': 60, 'médio': 60, 'baixo': 30 };
    const polVal = polMap[p.polarizationLevel?.toLowerCase()] || 30;

    // Negatividade proxy via publicReaction
    const reactMap: Record<string, number> = { 'contraria': 90, 'dividida': 50, 'favoravel': 10, 'irrelevante': 20 };
    const negativityVal = reactMap[p.publicReaction?.toLowerCase()] || 30;

    const impactScore = Math.round(
      (engNormalizado * 0.3) +
      (riskVal * 0.3) +
      (polVal * 0.2) +
      (negativityVal * 0.2)
    );

    // 1.2 Crisis Score
    const crisisScore = Math.round(
      (negativityVal * 0.4) +
      (polVal * 0.3) +
      (riskVal * 0.3)
    );

    // 1.3 Divergence Detection
    const divergenceFlag = p.authorTone !== p.publicReaction && p.authorTone !== 'Neutro' && p.publicReaction !== 'Neutro';
    let divergenceType = 'Nenhum';
    if (divergenceFlag) {
      if (p.authorTone === 'Agressivo' && p.publicReaction === 'favoravel') divergenceType = 'Aceitação inesperada';
      else if (p.authorTone === 'Conciliador' && p.publicReaction === 'contraria') divergenceType = 'Rejeição inesperada';
      else divergenceType = 'Desconexão com o público';
    }

    // 1.4 Priority Level
    let priorityLevel = 'Baixa';
    if (impactScore > 70 || crisisScore > 70) priorityLevel = 'Alta';
    else if (impactScore > 40) priorityLevel = 'Média';

    // 1.5 Recommended Action
    let recommendedAction = p.recommendedAction;
    if ((p.risk === 'alto' || p.risk === 'critico') && p.sentiment === 'negativo') {
      recommendedAction = 'Mitigar crise imediatamente';
    } else if (engNormalizado > 50 && p.sentiment === 'positivo') {
      recommendedAction = 'Amplificar narrativa';
    } else if (divergenceFlag) {
      recommendedAction = 'Reavaliar comunicação';
    } else if (polVal > 70) {
      recommendedAction = 'Monitorar escalada';
    }

    return {
      impactScore,
      crisisScore,
      divergenceFlag,
      divergenceType,
      priorityLevel,
      recommendedAction
    };
  };

  const maxEng = Math.max(...postsData.map(p => (p.like_count || 0) + (p.comment_count || 0) + (p.share_count || 0)), 1);

  // 6. Map Posts + AI
  let posts = postsData.map(p => {
    const ai = aiMap.get(p.id);
    const totalEngagement = (p.like_count || 0) + (p.comment_count || 0) + (p.share_count || 0);

    // Basic fields first
    const basePost = {
      id: p.id,
      target_id: p.target_id || null,
      candidate_name: targetsMap.get(p.target_id) || '—',
      text: p.caption || '',
      created_at: p.taken_at,
      like_count: p.like_count || 0,
      reply_count: p.comment_count || 0,
      share_count: p.share_count || 0,
      retweet_count: p.share_count || 0,
      url: p.post_url || '#',
      sentiment: ai?.sentiment || 'Sem análise',
      risk: ai?.risk_level || 'Sem análise',
      topic: ai?.ai_topic || (parseJsonField(ai?.ai_topics))[0] || 'Sem análise',
      keywords: ai?.ai_keywords || (parseJsonField(ai?.ai_entities)).join(', ') || 'Sem análise',
      recommendedAction: ai?.recommended_action || 'Sem análise',
      authorTone: ai?.author_tone || 'Neutro',
      publicReaction: ai?.public_reaction || 'Neutro',
      crisisTemperature: ai?.crisis_temperature || 0,
      polarizationLevel: ai?.polarization_level || 'Baixo',
      strategicReading: ai?.strategic_reading || 'Sem análise',
      totalEngagement
    };

    // Add strategic insights
    const insights = getStrategicInsights(basePost, maxEng);
    return { ...basePost, ...insights };
  });

  // 7. Memory Filters
  if (filters?.sentiment) {
    posts = posts.filter(p => p.sentiment?.toLowerCase() === filters.sentiment!.toLowerCase());
  }
  if (filters?.risk) {
    posts = posts.filter(p => p.risk?.toLowerCase() === filters.risk!.toLowerCase());
  }
  if (filters?.topic) {
    posts = posts.filter(p => p.topic?.toLowerCase() === filters.topic!.toLowerCase());
  }

  const filteredPostIds = new Set(posts.map(p => p.id));
  const replies = repliesData.filter(r => filteredPostIds.has(r.post_id)).map(r => ({
    id: r.id,
    post_id: r.post_id,
    text: r.reply_text,
    user: r.reply_user,
    created_at: r.created_at_twitter,
    like_count: r.like_count || 0,
    reply_count: r.reply_count || 0,
    retweet_count: r.retweet_count || 0,
  }));

  return { posts, replies };
}

export async function getXKPIs(filters?: XFilters) {
  const { posts, replies } = await fetchXData(filters);
  const totalPosts = posts.length;
  const totalReplies = replies.length;
  const totalEng = posts.reduce((acc, p) => acc + p.totalEngagement, 0);
  const positivos = posts.filter(p => p.sentiment === 'positivo').length;
  const negativos = posts.filter(p => p.sentiment === 'negativo').length;
  const altoRisco = posts.filter(p => p.risk === 'alto' || p.risk === 'critico').length;

  return [
    { title: 'Posts Monitorados', value: totalPosts },
    { title: 'Replies Coletadas', value: totalReplies },
    { title: 'Engajamento Total', value: totalEng },
    { title: 'Posts Positivos', value: positivos },
    { title: 'Posts Negativos', value: negativos },
    { title: 'Posts c/ Risco Alto', value: altoRisco },
  ];
}

export async function getXChartData(filters?: XFilters) {
  const { posts, replies } = await fetchXData(filters);

  // Sentiment Distribution
  const sentimentData = [
    { name: 'Positivo', value: posts.filter(d => d.sentiment === 'positivo').length, itemStyle: { color: '#22C55E' } },
    { name: 'Neutro', value: posts.filter(d => d.sentiment === 'neutro').length, itemStyle: { color: '#2563EB' } },
    { name: 'Negativo', value: posts.filter(d => d.sentiment === 'negativo').length, itemStyle: { color: '#FF3B3B' } },
    { name: 'Misto', value: posts.filter(d => d.sentiment === 'misto').length, itemStyle: { color: '#EAB308' } },
  ];

  // Risk Distribution
  const riskData = [
    { name: 'Baixo', value: posts.filter(d => d.risk === 'baixo').length, itemStyle: { color: '#22C55E' } },
    { name: 'Médio', value: posts.filter(d => d.risk === 'medio' || d.risk === 'médio').length, itemStyle: { color: '#EAB308' } },
    { name: 'Alto', value: posts.filter(d => d.risk === 'alto').length, itemStyle: { color: '#F97316' } },
    { name: 'Crítico', value: posts.filter(d => d.risk === 'critico' || d.risk === 'crítico').length, itemStyle: { color: '#FF3B3B' } },
  ];

  // Dominant Themes
  const themeCounts: Record<string, number> = {};
  posts.forEach(p => {
    if (p.topic && p.topic !== 'Sem análise') {
      themeCounts[p.topic] = (themeCounts[p.topic] || 0) + 1;
    }
  });
  const themes = Object.entries(themeCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Top Posts by Impact
  const topImpact = [...posts]
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
    .slice(0, 5);

  // Top Posts by Risk
  const topRisk = [...posts]
    .sort((a, b) => {
      const riskVal = (r: string) => r === 'critico' ? 4 : r === 'alto' ? 3 : r === 'medio' ? 2 : 1;
      return riskVal(b.risk) - riskVal(a.risk);
    })
    .slice(0, 5);

  // Crisis Thermometer Calculation
  const avgTemp = posts.length > 0
    ? posts.reduce((acc, p) => acc + (p.crisisTemperature || 0), 0) / posts.length
    : 0;

  // polarization level
  const polCounts: Record<string, number> = {};
  posts.forEach(p => polCounts[p.polarizationLevel] = (polCounts[p.polarizationLevel] || 0) + 1);

  return { sentimentData, riskData, themes, topImpact, topRisk, crisisScore: Math.round(avgTemp) };
}

export async function getXAlert(filters?: XFilters) {
  const { posts } = await fetchXData(filters);
  const critical = [...posts]
    .filter(p => p.risk === 'alto' || p.risk === 'critico')
    .sort((a, b) => b.totalEngagement - a.totalEngagement || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  return critical || null;
}

export async function getXFiltersOptions(allowedTargetIds?: string[] | null) {
  const client = createClient();
  let targetsQuery = client.from('targets').select('id, candidate_name').order('candidate_name');
  if (allowedTargetIds !== null && allowedTargetIds !== undefined) {
    targetsQuery = targetsQuery.in('id', allowedTargetIds);
  }
  const { data: targetsData } = await targetsQuery;
  const candidates = (targetsData || []).map(t => ({ id: t.id, name: t.candidate_name }));

  const { posts } = await fetchXData({ allowedTargetIds });
  const topics = new Set<string>();
  posts.forEach(p => { if (p.topic && p.topic !== 'Sem análise') topics.add(p.topic); });

  return { candidates, topics: Array.from(topics).sort() };
}
