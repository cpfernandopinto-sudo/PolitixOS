import { cache } from 'react';
import { createClient } from '@/lib/supabaseClient';

export interface InstagramFilters {
  period?: string | null;
  sentiment?: string | null;
  risk?: string | null;
  topic?: string | null;
  post?: string | null;
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

export const fetchInstagramData = cache(async (filters?: InstagramFilters) => {
  const client = createClient();

  // 1. Posts Fetch
  let pQuery = client.from('social_posts').select('*').eq('platform', 'instagram');
  if (filters?.period) {
    const days = parseInt(filters.period, 10);
    if (days > 0) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      pQuery = pQuery.gte('taken_at', from.toISOString());
    }
  }
  const { data: rawPosts } = await pQuery.order('taken_at', { ascending: false }).limit(200);
  let postsData = rawPosts || [];
  
  // 2. Comments Fetch (to ensure we have comments)
  let cQuery = client.from('instagram_comments').select('*');
  if (filters?.period) {
    const days = parseInt(filters.period, 10);
    if (days > 0) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      cQuery = cQuery.gte('created_at_instagram', from.toISOString());
    }
  }
  const { data: rawComments } = await cQuery.order('created_at_instagram', { ascending: false }).limit(1000);
  const commentsData = rawComments || [];

  // 3. Ensure we have all posts for the fetched comments
  const postIdsFromPosts = new Set(postsData.map(p => p.id));
  const missingPostIds = [...new Set(commentsData.map(c => c.post_id))].filter(id => id && !postIdsFromPosts.has(id));

  if (missingPostIds.length > 0) {
    const { data: missingPosts } = await client.from('social_posts').select('*').eq('platform', 'instagram').in('id', missingPostIds);
    if (missingPosts) {
      postsData.push(...missingPosts);
    }
  }

  const allPostIds = [...new Set(postsData.map(p => p.id))];

  // 4. Fetch AI Analysis strictly for POSTS
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

  // 5. Map Posts and AI Analysis
  let posts = postsData.map(p => {
    const ai = aiMap.get(p.id);
    return {
      id: p.id,
      text: p.caption || '',
      created_at: p.taken_at,
      like_count: p.like_count || 0,
      comment_count: p.comment_count || 0,
      url: p.post_url || '#',
      image_url: p.thumbnail_url || p.media_url || null,
      sentiment: ai?.sentiment || 'Sem análise',
      risk: ai?.risk_level || 'Sem análise',
      topic: (parseJsonField(ai?.ai_topics))[0] || 'Sem análise',
      topics: parseJsonField(ai?.ai_topics),
      riskReason: ai?.risk_reason || 'Sem análise',
      summary: ai?.summary || 'Sem análise',
      recommendedAction: ai?.recommended_action || 'Sem análise',
    };
  });

  // Apply Filters on Posts (AI filters apply only to posts)
  if (filters?.sentiment) {
    posts = posts.filter(p => p.sentiment?.toLowerCase() === filters.sentiment!.toLowerCase());
  }
  if (filters?.risk) {
    posts = posts.filter(p => p.risk?.toLowerCase() === filters.risk!.toLowerCase());
  }
  if (filters?.topic) {
    posts = posts.filter(p => p.topics.includes(filters.topic!));
  }
  if (filters?.post) {
    posts = posts.filter(p => p.id === filters.post);
  }

  const filteredPostIds = new Set(posts.map(p => p.id));
  const postsMap = new Map();
  for (const p of posts) postsMap.set(p.id, p);

  // Ordenação: Engajamento DESC ou Data DESC
  posts.sort((a, b) => {
    const engA = a.like_count + a.comment_count;
    const engB = b.like_count + b.comment_count;
    if (engB !== engA) return engB - engA;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  // 6. Map Comments and relate to filtered posts
  // If the post was filtered out (by sentiment/risk/topic), its comments should not appear.
  let comments = commentsData
    .filter(c => filteredPostIds.has(c.post_id))
    .map(c => {
      const p = postsMap.get(c.post_id);
      return {
        id: c.id,
        text: c.comment_text,
        created_at: c.created_at_instagram,
        like_count: c.like_count || 0,
        post_id: c.post_id,
        post_url: p?.url || '#',
        post_caption: p?.text || 'Post'
      };
    });

  return { posts, comments };
});

export async function getInstagramKPIs(filters?: InstagramFilters) {
  const { posts, comments } = await fetchInstagramData(filters);
  const totalPosts = posts.length;
  const totalComments = comments.length;
  
  const postLikes = posts.reduce((acc, p) => acc + p.like_count + p.comment_count, 0);
  const commentLikes = comments.reduce((acc, c) => acc + c.like_count, 0);
  const engajamento = postLikes + commentLikes;

  const positivos = posts.filter(d => d.sentiment === 'positivo').length;
  const negativos = posts.filter(d => d.sentiment === 'negativo').length;
  const altoRisco = posts.filter(d => d.risk === 'alto').length;

  return [
    { title: 'Posts Monitorados', value: totalPosts },
    { title: 'Total Comentários', value: totalComments },
    { title: 'Engajamento Total', value: engajamento },
    { title: 'Posts Positivos', value: positivos },
    { title: 'Posts Negativos', value: negativos },
    { title: 'Posts c/ Risco Alto', value: altoRisco },
  ];
}

export async function getInstagramAlerts(filters?: InstagramFilters) {
  const { posts } = await fetchInstagramData(filters);
  const alerts = [];
  
  const altoRisco = posts.filter(p => p.risk === 'alto').length;
  if (altoRisco > 0) {
    alerts.push({ tipo: 'risco' as const, nivel: 'critico' as const, mensagem: 'Post de alto risco detectado.' });
  }
  
  const negativos = posts.filter(p => p.sentiment === 'negativo').length;
  if (negativos > 0 && negativos / (posts.length || 1) > 0.4) {
    alerts.push({ tipo: 'sentimento' as const, nivel: 'alto' as const, mensagem: 'Aumento de posts com sentimento negativo.' });
  }
  
  return alerts;
}

export async function getInstagramChartData(filters?: InstagramFilters) {
  const { posts, comments } = await fetchInstagramData(filters);
  
  const sentimentData = [
    { name: 'Positivo', value: posts.filter(d => d.sentiment === 'positivo').length, itemStyle: { color: '#22C55E' } },
    { name: 'Neutro', value: posts.filter(d => d.sentiment === 'neutro' || d.sentiment === 'misto').length, itemStyle: { color: '#2563EB' } },
    { name: 'Negativo', value: posts.filter(d => d.sentiment === 'negativo').length, itemStyle: { color: '#FF3B3B' } },
  ];

  const riskData = [
    { name: 'Baixo', value: posts.filter(d => d.risk === 'baixo').length, itemStyle: { color: '#22C55E' } },
    { name: 'Médio', value: posts.filter(d => d.risk === 'medio').length, itemStyle: { color: '#EAB308' } },
    { name: 'Alto', value: posts.filter(d => d.risk === 'alto').length, itemStyle: { color: '#FF3B3B' } },
  ];

  const sortedByEng = [...posts].sort((a,b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count)).slice(0, 5);
  const topEng = sortedByEng.length > 0 
    ? sortedByEng.map(p => ({ name: (p.text || '').substring(0,25) || 'Post', value: p.like_count + p.comment_count }))
    : [{ name: 'Sem posts', value: 0 }];

  const sortedByRisk = [...posts].filter(p => p.risk === 'alto' || p.risk === 'medio').sort((a,b) => (b.risk === 'alto' ? 1 : 0) - (a.risk === 'alto' ? 1 : 0)).slice(0, 5);
  const topRisk = sortedByRisk.length > 0
    ? sortedByRisk.map(p => ({ name: (p.text || '').substring(0,25) || 'Post', value: p.risk === 'alto' ? 100 : 50 }))
    : [{ name: 'Sem posts de risco', value: 0 }];

  const byDayMap: Record<string, number> = {};
  for (const c of comments) {
    if (!c.created_at) continue;
    const date = new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    byDayMap[date] = (byDayMap[date] || 0) + 1;
  }
  const byDay = Object.keys(byDayMap).length > 0 
    ? Object.entries(byDayMap).map(([date, count]) => ({ date, count })) 
    : [{ date: 'Sem dados', count: 0 }];

  return { sentimentData, riskData, topEng, topRisk, byDay };
}

export async function getInstagramFiltersOptions() {
  const { posts } = await fetchInstagramData();
  const topics = new Set<string>();
  
  for (const p of posts) p.topics.forEach((t: string) => topics.add(t));

  return {
    topics: Array.from(topics).sort(),
    posts: posts.map(p => ({ id: p.id, label: (p.text || '').substring(0, 30) || 'Post' })),
  };
}
