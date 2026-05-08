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

  let pQuery = client.from('instagram_posts').select('*');
  if (filters?.period) {
    const days = parseInt(filters.period, 10);
    if (days > 0) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      pQuery = pQuery.gte('created_at_instagram', from.toISOString());
    }
  }
  const { data: rawPosts } = await pQuery.order('created_at_instagram', { ascending: false }).limit(200);
  const postsData = rawPosts || [];
  
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

  const postIds = [...new Set(postsData.map(p => p.id))];
  const commentIds = [...new Set(commentsData.map(c => c.id))];
  const missingPostIds = [...new Set(commentsData.map(c => c.post_id))].filter(id => !postIds.includes(id));

  if (missingPostIds.length > 0) {
    const { data: extraPosts } = await client.from('instagram_posts').select('*').in('id', missingPostIds);
    if (extraPosts) {
      postsData.push(...extraPosts);
      postIds.push(...extraPosts.map(p => p.id));
    }
  }

  const aiContentIds = [...postIds, ...commentIds];
  
  const aiMap = new Map();
  if (aiContentIds.length > 0) {
    // Batched request or simple IN since limits are small
    const { data: aiData } = await client
      .from('ai_analysis')
      .select('content_id, sentiment, risk_level, ai_topics, summary, risk_reason')
      .in('content_type', ['instagram_post', 'post', 'instagram_comment', 'comment'])
      .in('content_id', aiContentIds);

    if (aiData) {
      for (const a of aiData) aiMap.set(a.content_id, a);
    }
  }

  const postsMap = new Map();
  for (const p of postsData) {
    const ai = aiMap.get(p.id);
    postsMap.set(p.id, {
      id: p.id,
      text: p.caption || '',
      created_at: p.created_at_instagram,
      like_count: p.like_count || 0,
      comment_count: p.comment_count || 0,
      url: p.url || '#',
      sentiment: ai?.sentiment || 'neutro',
      risk: ai?.risk_level || 'baixo',
      topics: parseJsonField(ai?.ai_topics),
      ai_summary: ai?.summary || '',
      ai_risk_reason: ai?.risk_reason || '',
    });
  }

  let posts = Array.from(postsMap.values());
  let comments = commentsData.map(c => {
    const ai = aiMap.get(c.id);
    const p = postsMap.get(c.post_id);
    return {
      id: c.id,
      text: c.comment_text,
      created_at: c.created_at_instagram,
      like_count: c.like_count || 0,
      post_id: c.post_id,
      post_url: p?.url || '#',
      post_caption: p?.text || 'Post',
      sentiment: ai?.sentiment || 'neutro',
      risk: ai?.risk_level || 'baixo',
      topics: parseJsonField(ai?.ai_topics),
    };
  });

  if (filters?.sentiment) {
    posts = posts.filter(p => p.sentiment.toLowerCase() === filters.sentiment!.toLowerCase());
    comments = comments.filter(c => c.sentiment.toLowerCase() === filters.sentiment!.toLowerCase());
  }
  if (filters?.risk) {
    posts = posts.filter(p => p.risk.toLowerCase() === filters.risk!.toLowerCase());
    comments = comments.filter(c => c.risk.toLowerCase() === filters.risk!.toLowerCase());
  }
  if (filters?.topic) {
    posts = posts.filter(p => p.topics.includes(filters.topic!));
    comments = comments.filter(c => c.topics.includes(filters.topic!));
  }
  if (filters?.post) {
    posts = posts.filter(p => p.id === filters.post);
    comments = comments.filter(c => c.post_id === filters.post);
  }

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
  const { posts, comments } = await fetchInstagramData(filters);
  const alerts = [];
  
  if (posts.filter(p => p.risk === 'alto').length > 0) {
    alerts.push({ tipo: 'risco' as const, nivel: 'critico' as const, mensagem: 'Post de alto risco detectado.' });
  }
  
  const totalC = comments.length;
  if (totalC > 0) {
    const negs = comments.filter(c => c.sentiment === 'negativo').length;
    if (negs / totalC > 0.4 && negs > 10) {
      alerts.push({ tipo: 'sentimento' as const, nivel: 'alto' as const, mensagem: 'Volume crítico de comentários negativos.' });
    }
  }
  
  return alerts;
}

export async function getInstagramChartData(filters?: InstagramFilters) {
  const { posts } = await fetchInstagramData(filters);
  
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

  return { sentimentData, riskData, topEng, topRisk };
}

export async function getInstagramFiltersOptions() {
  const { posts, comments } = await fetchInstagramData();
  const topics = new Set<string>();
  
  for (const p of posts) p.topics.forEach((t: string) => topics.add(t));
  for (const c of comments) c.topics.forEach((t: string) => topics.add(t));

  return {
    topics: Array.from(topics).sort(),
    posts: posts.map(p => ({ id: p.id, label: (p.text || '').substring(0, 30) || 'Post' })),
  };
}
