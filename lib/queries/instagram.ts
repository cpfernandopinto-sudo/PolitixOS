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

  // 1. Fetch Comments
  let cQuery = client.from('instagram_comments').select('id, post_id, comment_text, created_at_instagram, like_count');
  
  if (filters?.period) {
    const days = parseInt(filters.period, 10);
    if (!isNaN(days) && days > 0) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      cQuery = cQuery.gte('created_at_instagram', from.toISOString());
    }
  }

  const { data: comments, error: cErr } = await cQuery.order('created_at_instagram', { ascending: false }).limit(1000);
  if (cErr || !comments || comments.length === 0) return [];

  const commentIds = comments.map(c => c.id);
  const postIds = [...new Set(comments.map(c => c.post_id))];

  // 2. Fetch AI Analysis for these comments
  const { data: aiData } = await client
    .from('ai_analysis')
    .select('content_id, sentiment, risk_level, ai_topics')
    .in('content_type', ['instagram_comment', 'comment'])
    .in('content_id', commentIds);

  const aiMap = new Map();
  if (aiData) {
    for (const a of aiData) {
      aiMap.set(a.content_id, a);
    }
  }

  // 3. Fetch Posts for these comments
  const { data: postsData } = await client
    .from('instagram_posts')
    .select('id, url, caption')
    .in('id', postIds);

  const postsMap = new Map();
  if (postsData) {
    for (const p of postsData) {
      postsMap.set(p.id, p);
    }
  }

  // 4. JOIN in memory
  let joined = comments.map(c => {
    const ai = aiMap.get(c.id);
    const p = postsMap.get(c.post_id);
    return {
      id: c.id,
      text: c.comment_text,
      created_at: c.created_at_instagram,
      like_count: c.like_count || 0,
      post_id: c.post_id,
      post_url: p?.url || '#',
      post_caption: p?.caption || 'Post',
      sentiment: ai?.sentiment || 'neutro',
      risk: ai?.risk_level || 'baixo',
      topics: parseJsonField(ai?.ai_topics),
    };
  });

  // 5. Apply JS Filters
  if (filters?.sentiment) {
    joined = joined.filter(j => j.sentiment.toLowerCase() === filters.sentiment!.toLowerCase());
  }
  if (filters?.risk) {
    joined = joined.filter(j => j.risk.toLowerCase() === filters.risk!.toLowerCase());
  }
  if (filters?.topic) {
    joined = joined.filter(j => j.topics.includes(filters.topic!));
  }
  if (filters?.post) {
    joined = joined.filter(j => j.post_id === filters.post);
  }

  return joined;
});

// KPIs
export async function getInstagramKPIs(filters?: InstagramFilters) {
  const data = await fetchInstagramData(filters);
  const total = data.length;
  const positivos = data.filter(d => d.sentiment === 'positivo').length;
  const negativos = data.filter(d => d.sentiment === 'negativo').length;
  const altoRisco = data.filter(d => d.risk === 'alto').length;
  const engajamento = data.reduce((acc, d) => acc + d.like_count, 0) + total;

  return [
    { title: 'Total Comentários', value: total },
    { title: 'Positivos', value: positivos },
    { title: 'Negativos', value: negativos },
    { title: 'Risco Alto', value: altoRisco },
    { title: 'Engajamento', value: engajamento },
  ];
}

// Alertas
export async function getInstagramAlerts(filters?: InstagramFilters) {
  const data = await fetchInstagramData(filters);
  const total = data.length;
  if (total === 0) return [];

  const negativos = data.filter(d => d.sentiment === 'negativo').length;
  const altoRisco = data.filter(d => d.risk === 'alto').length;

  const alerts = [];
  if (negativos / total > 0.4) {
    alerts.push({ tipo: 'sentimento' as const, nivel: 'alto' as const, mensagem: 'Aumento de comentários negativos detectado.' });
  }
  if (altoRisco > 5) {
    alerts.push({ tipo: 'risco' as const, nivel: 'critico' as const, mensagem: 'Aumento de risco alto nos comentários.' });
  }
  return alerts;
}

export async function getInstagramChartData(filters?: InstagramFilters) {
  const data = await fetchInstagramData(filters);
  
  // comments by day
  const byDayMap: Record<string, number> = {};
  for (const d of data) {
    if (!d.created_at) continue;
    const date = new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    byDayMap[date] = (byDayMap[date] || 0) + 1;
  }

  const byDay = Object.keys(byDayMap).length > 0 
    ? Object.entries(byDayMap).map(([date, count]) => ({ date, count })) 
    : [{ date: 'Sem dados', count: 0 }];

  const sentimentData = [
    { name: 'Positivo', value: data.filter(d => d.sentiment === 'positivo').length, itemStyle: { color: '#22C55E' } },
    { name: 'Neutro', value: data.filter(d => d.sentiment === 'neutro' || d.sentiment === 'misto').length, itemStyle: { color: '#2563EB' } },
    { name: 'Negativo', value: data.filter(d => d.sentiment === 'negativo').length, itemStyle: { color: '#FF3B3B' } },
  ];

  const riskData = [
    { name: 'Baixo', value: data.filter(d => d.risk === 'baixo').length, itemStyle: { color: '#22C55E' } },
    { name: 'Médio', value: data.filter(d => d.risk === 'medio').length, itemStyle: { color: '#EAB308' } },
    { name: 'Alto', value: data.filter(d => d.risk === 'alto').length, itemStyle: { color: '#FF3B3B' } },
  ];

  const topicsMap: Record<string, number> = {};
  for (const d of data) {
    for (const t of d.topics) {
      topicsMap[t] = (topicsMap[t] || 0) + 1;
    }
  }
  const topTopics = Object.keys(topicsMap).length > 0 
    ? Object.entries(topicsMap).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))
    : [{ name: 'Nenhum tema', value: 0 }];

  const postsCount: Record<string, { title: string; count: number }> = {};
  for (const d of data) {
    if (!postsCount[d.post_id]) {
      postsCount[d.post_id] = { title: d.post_caption.substring(0, 30), count: 0 };
    }
    postsCount[d.post_id].count++;
  }
  const topPosts = Object.keys(postsCount).length > 0
    ? Object.entries(postsCount).sort((a,b) => b[1].count - a[1].count).slice(0, 5).map(([id, info]) => ({ name: info.title, value: info.count }))
    : [{ name: 'Sem posts', value: 0 }];

  return { byDay, sentimentData, riskData, topTopics, topPosts };
}

export async function getInstagramFiltersOptions() {
  const data = await fetchInstagramData();
  const topics = new Set<string>();
  const posts = new Map<string, string>();

  for (const d of data) {
    d.topics.forEach(t => topics.add(t));
    if (d.post_caption) {
      posts.set(d.post_id, d.post_caption.substring(0, 30) + '...');
    }
  }

  return {
    topics: Array.from(topics).sort(),
    posts: Array.from(posts.entries()).map(([id, label]) => ({ id, label })),
  };
}
