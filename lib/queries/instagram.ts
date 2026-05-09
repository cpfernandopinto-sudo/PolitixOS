import { createClient } from '@/lib/supabaseClient';
// NOTA: React.cache() foi REMOVIDO propositalmente.
// O cache do React deduplicava chamadas com objetos diferentes de filtros,
// causando retorno de dados sem restrição quando getInstagramFiltersOptions()
// chamava fetchInstagramData() sem allowedTargetIds antes das chamadas filtradas.

export interface InstagramFilters {
  period?: string | null;
  sentiment?: string | null;
  risk?: string | null;
  topic?: string | null;
  post?: string | null;
  candidate?: string | null;
  /**
   * IDs de targets permitidos.
   * null  = admin (sem restrição, vê tudo).
   * []    = sem acesso a nenhum candidato (retorna vazio).
   * [...] = restringir aos target_ids listados.
   *
   * Se undefined: campo não foi informado — tratar como sem restrição
   * (só deve acontecer em contextos puramente internos sem usuário logado).
   */
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

// ─────────────────────────────────────────────────────────────────────────────
// fetchInstagramData — fetch central, SEM cache() do React.
// Todos os outros helpers (getInstagramKPIs, getInstagramChartData, etc.)
// recebem o mesmo objeto `filters` e chamam esta função diretamente.
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchInstagramData(filters?: InstagramFilters) {
  console.log('[fetchInstagramData] filters:', JSON.stringify({
    allowedTargetIds: filters?.allowedTargetIds,
    candidate: filters?.candidate,
    period: filters?.period,
  }));

  const client = createClient();

  // ── Aplicar restrição de targets ANTES de qualquer query ─────────────────
  // Regras:
  //   allowedTargetIds === null → admin, sem filtro
  //   allowedTargetIds === []   → usuário sem candidato vinculado → retorna vazio
  //   allowedTargetIds === [...] → filtrar apenas esses target_ids
  //   allowedTargetIds === undefined → contexto interno sem usuário (sem restrição)
  const restricted = filters?.allowedTargetIds !== null && filters?.allowedTargetIds !== undefined;
  if (restricted && (filters!.allowedTargetIds!.length === 0)) {
    console.log('[fetchInstagramData] allowedTargetIds vazio → retornando vazio');
    return { posts: [], comments: [] };
  }

  // 1. Build targets map for candidate_name lookup
  // Sempre busca todos (para mapear IDs → nomes), mas filtramos posts depois.
  const { data: targetsAll } = await client.from('targets').select('id, candidate_name');
  const targetsMap = new Map<string, string>();
  for (const t of targetsAll || []) targetsMap.set(t.id, t.candidate_name);

  // 2. Posts Fetch — filtrar por allowedTargetIds + candidate
  let pQuery = client.from('social_posts').select('*').eq('platform', 'instagram');

  // Restrição de acesso: aplica .in() apenas para não-admin com targets definidos
  if (restricted && filters!.allowedTargetIds!.length > 0) {
    pQuery = pQuery.in('target_id', filters!.allowedTargetIds!);
  }

  // Filtro adicional de candidato selecionado pelo usuário via UI
  if (filters?.candidate) {
    // Se também está restrito, o candidate precisa estar dentro dos allowed
    if (restricted && !filters!.allowedTargetIds!.includes(filters.candidate)) {
      // Usuário tentou selecionar candidato não permitido → vazio
      console.log('[fetchInstagramData] candidato selecionado fora dos permitidos → retornando vazio');
      return { posts: [], comments: [] };
    }
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

  const { data: rawPosts, error: pError } = await pQuery.order('taken_at', { ascending: false }).limit(200);
  if (pError) console.error('[fetchInstagramData] Error fetching posts:', pError.message);
  let postsData = rawPosts || [];
  console.log(`[fetchInstagramData] Fetched ${postsData.length} posts from social_posts`);

  // 3. Comments Fetch — ligados aos posts já filtrados
  // Estratégia: buscar comentários apenas dos posts que temos (via post_ids)
  // Isso garante que comentários de outros candidatos nunca vazam.
  let commentsData: ReturnType<typeof Array.prototype.map> = [];

  if (postsData.length > 0) {
    const postIds = postsData.map(p => p.id);
    let cQuery = client
      .from('instagram_comments')
      .select('*')
      .in('post_id', postIds); // ← restrição por post_id dos posts filtrados

    if (filters?.period) {
      const days = parseInt(filters.period, 10);
      if (!isNaN(days) && days > 0) {
        const from = new Date();
        from.setDate(from.getDate() - days);
        cQuery = cQuery.gte('created_at_instagram', from.toISOString());
      }
    }

    const { data: rawComments, error: cError } = await cQuery
      .order('created_at_instagram', { ascending: false })
      .limit(1000);
    if (cError) console.error('[fetchInstagramData] Error fetching comments:', cError.message);
    commentsData = rawComments || [];
  }

  console.log(`[fetchInstagramData] Fetched ${commentsData.length} comments`);

  const allPostIds = [...new Set(postsData.map(p => p.id))];

  // 4. AI Analysis para os posts filtrados
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

  // 5. Map Posts + AI + candidate_name
  let posts = postsData.map(p => {
    const ai = aiMap.get(p.id);
    return {
      id: p.id,
      target_id: p.target_id || null,
      candidate_name: targetsMap.get(p.target_id) || '—',
      text: p.caption || '',
      created_at: p.taken_at,
      like_count: p.like_count || 0,
      comment_count: p.comment_count || 0,
      url: p.post_url || '#',
      image_url: p.media_url || p.thumbnail_url || null,
      video_url: p.video_url || null,
      thumbnail_url: p.thumbnail_url || null,
      media_type: p.media_type || null,
      sentiment: ai?.sentiment || 'Sem análise',
      risk: ai?.risk_level || 'Sem análise',
      topic: (parseJsonField(ai?.ai_topics))[0] || 'Sem análise',
      topics: parseJsonField(ai?.ai_topics),
      riskReason: ai?.risk_reason || 'Sem análise',
      summary: ai?.summary || 'Sem análise',
      recommendedAction: ai?.recommended_action || 'Sem análise',
    };
  });

  // 6. Filtros em memória (sentimento, risco, tópico, post específico)
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

  // Sort: engajamento DESC, data DESC
  posts.sort((a, b) => {
    const engA = a.like_count + a.comment_count;
    const engB = b.like_count + b.comment_count;
    if (engB !== engA) return engB - engA;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  // 7. Map Comments — somente dos posts filtrados
  const comments = (commentsData as any)
    .filter((c: { post_id: string }) => filteredPostIds.has(c.post_id))
    .map((c: { id: string; comment_text: string; created_at_instagram: string; like_count: number; post_id: string }) => {
      const p = postsMap.get(c.post_id);
      return {
        id: c.id,
        text: c.comment_text,
        created_at: c.created_at_instagram,
        like_count: c.like_count || 0,
        post_id: c.post_id,
        post_url: p?.url || '#',
        post_caption: p?.text || 'Post',
      };
    });

  console.log(`[fetchInstagramData] Final: ${posts.length} posts, ${comments.length} comments`);
  return { posts, comments };
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

export async function getInstagramKPIs(filters?: InstagramFilters) {
  const { posts, comments } = await fetchInstagramData(filters);
  const totalPosts = posts.length;
  const totalComments = comments.length;

  const postLikes = posts.reduce((acc: number, p: any) => acc + p.like_count + p.comment_count, 0);
  const commentLikes = comments.reduce((acc: number, c: any) => acc + c.like_count, 0);
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

// ─── Alertas ─────────────────────────────────────────────────────────────────

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

// ─── Chart Data ──────────────────────────────────────────────────────────────

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

  const sortedByEng = [...posts]
    .sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count))
    .slice(0, 5);
  const topEng = sortedByEng.length > 0
    ? sortedByEng.map(p => ({ name: (p.text || '').substring(0, 25) || 'Post', value: p.like_count + p.comment_count }))
    : [{ name: 'Sem posts', value: 0 }];

  const sortedByRisk = [...posts]
    .filter(p => p.risk === 'alto' || p.risk === 'medio')
    .sort((a, b) => (b.risk === 'alto' ? 1 : 0) - (a.risk === 'alto' ? 1 : 0))
    .slice(0, 5);
  const topRisk = sortedByRisk.length > 0
    ? sortedByRisk.map(p => ({ name: (p.text || '').substring(0, 25) || 'Post', value: p.risk === 'alto' ? 100 : 50 }))
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

// ─── Opções de filtro — respeitam allowedTargetIds ───────────────────────────
/**
 * Retorna as opções de filtro (candidatos, tópicos, posts).
 * Candidatos: restringidos por allowedTargetIds quando não-admin.
 * Tópicos/Posts: extraídos dos posts já filtrados.
 */
export async function getInstagramFiltersOptions(allowedTargetIds?: string[] | null) {
  const client = createClient();

  // Candidatos visíveis: respeitar allowedTargetIds
  let targetsQuery = client.from('targets').select('id, candidate_name').order('candidate_name');
  if (allowedTargetIds !== null && allowedTargetIds !== undefined && allowedTargetIds.length > 0) {
    targetsQuery = targetsQuery.in('id', allowedTargetIds) as typeof targetsQuery;
  } else if (allowedTargetIds !== null && allowedTargetIds !== undefined && allowedTargetIds.length === 0) {
    // sem acesso a nenhum candidato
    return { topics: [], posts: [], candidates: [] };
  }
  // null = admin = sem filtro (retorna todos)

  const { data: targetsData } = await targetsQuery;
  const candidates = (targetsData || []).map(t => ({ id: t.id, name: t.candidate_name as string }));

  // Tópicos e posts: extraídos dos dados filtrados (passa allowedTargetIds)
  const { posts } = await fetchInstagramData({ allowedTargetIds });
  const topics = new Set<string>();
  for (const p of posts) p.topics.forEach((t: string) => topics.add(t));

  return {
    topics: Array.from(topics).sort(),
    posts: posts.map(p => ({ id: p.id, label: (p.text || '').substring(0, 30) || 'Post' })),
    candidates,
  };
}
