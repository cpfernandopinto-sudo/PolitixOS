import { fetchMencoes, getGaugeScore as getNoticiasGauge } from './noticias';
import { fetchInstagramData, getInstagramChartData } from './instagram';
import { fetchXData, getXChartData } from './x';
import { createClient } from '@/lib/supabaseClient';

export interface OverviewFilters {
  candidate?: string | null;
  city?: string | null;
  period?: string | null; // '1' | '7' | '30'
  allowedTargetIds?: string[] | null;
}

/**
 * Busca dados consolidados de todos os radares
 */
export async function fetchOverviewData(filters?: OverviewFilters) {
  const allowedTargetIds = filters?.allowedTargetIds ?? null;
  console.log("[overview filter]", {
    allowedTargetIds,
    mode: allowedTargetIds === null ? "admin_all_data" : "restricted"
  });

  // Padronizar filtros para as funções específicas
  const period = filters?.period || '7';

  const [noticias, instagram, x] = await Promise.all([
    fetchMencoes({
      candidateId: filters?.candidate,
      city: filters?.city,
      period: period === '1' ? '24h' : period === '7' ? '7d' : '30d',
      allowedTargetIds: filters?.allowedTargetIds
    }),
    fetchInstagramData({
      candidate: filters?.candidate,
      period: period,
      allowedTargetIds: filters?.allowedTargetIds
    }),
    fetchXData({
      candidate: filters?.candidate,
      period: period,
      allowedTargetIds: filters?.allowedTargetIds
    })
  ]);

  const newsData = noticias.map(n => ({ ...n, source: "noticias" }));
  const instagramData = instagram.posts.map(p => ({ ...p, source: "instagram" }));
  const xData = x.posts.map(p => ({ ...p, source: "x" }));

  const baseData = [
    ...newsData,
    ...instagramData,
    ...xData
  ];

  console.log("[OVERVIEW X CHECK]", {
    rawX: x.posts?.length,
    mappedX: xData?.length,
    finalBaseX: baseData.filter(i => i.source === "x").length,
    period
  });

  return { noticias, instagram, x, baseData };
}

/**
 * 2. KPIs EXECUTIVOS
 */
export async function getOverviewKPIs(filters?: OverviewFilters) {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  // Total Volume
  const volumeTotal = noticias.length + instagram.posts.length + x.posts.length;

  // Alertas Ativos (Risco Alto/Crítico)
  const alertasNoticias = noticias.filter(n => n.local_relevance && n.local_relevance > 80).length;
  const alertasInstagram = instagram.posts.filter(p => p.risk === 'alto').length;
  const alertasX = x.posts.filter(p => p.risk === 'alto' || p.risk === 'critico').length;
  const alertasAtivos = alertasNoticias + alertasInstagram + alertasX;

  // Score Geral (0-100)
  // Calculado como a média de saúde dos canais (100 - risco)
  const noticiasScore = 100 - getNoticiasGauge(noticias).score;

  const xData = await getXChartData({ ...filters, period: filters?.period || '7' });
  const xScore = 100 - (xData.crisisScore || 0);

  const instaData = await getInstagramChartData({ ...filters, period: filters?.period || '7' });
  const instaRisk = instaData.riskData.find(r => r.name === 'Alto')?.value || 0;
  const instaScore = Math.max(0, 100 - (instaRisk * 10)); // Proxy simples para insta

  const score_geral = Math.round((noticiasScore * 0.5) + (xScore * 0.3) + (instaScore * 0.2));

  // Temperatura Geral
  let temperatura_geral = 'fria';
  const maxCrisis = Math.max(getNoticiasGauge(noticias).score, xData.crisisScore || 0);
  if (maxCrisis > 70) temperatura_geral = 'crítica';
  else if (maxCrisis > 40) temperatura_geral = 'quente';
  else if (maxCrisis > 20) temperatura_geral = 'morna';

  // Tendência (Simulada ou comparativa se houver tempo, aqui baseada no score)
  const tendencia = score_geral > 60 ? 'subindo' : score_geral < 40 ? 'caindo' : 'estável';

  return {
    score_geral,
    temperatura_geral,
    tendencia,
    alertas_ativos: alertasAtivos,
    volume_total: volumeTotal
  };
}

/**
 * 3. TERMÔMETRO DE CRISE (MASTER)
 */
export async function getCrisisOverview(filters?: OverviewFilters) {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  const nGauge = getNoticiasGauge(noticias);
  const xChart = await getXChartData({ ...filters, period: filters?.period || '7' });

  // Instagram risk proxy
  const instaPosts = instagram.posts;
  const instaAlto = instaPosts.filter(p => p.risk === 'alto').length;
  const instaScore = instaPosts.length > 0 ? (instaAlto / instaPosts.length) * 100 : 0;

  const score = Math.round(
    (nGauge.score * 0.5) +
    ((xChart.crisisScore || 0) * 0.3) +
    (instaScore * 0.2)
  );

  let status = 'frio';
  if (score > 75) status = 'crítico';
  else if (score > 50) status = 'quente';
  else if (score > 25) status = 'morno';

  return {
    score,
    status,
    breakdown: {
      noticias: nGauge.score,
      x: xChart.crisisScore || 0,
      instagram: Math.round(instaScore)
    }
  };
}

/**
 * 4. DISTRIBUIÇÃO POR CANAL
 */
export async function getChannelDistribution(filters?: OverviewFilters) {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  // Notícias
  const nSent = noticias.reduce((acc, n) => acc + (n.ai_sentiment || 0), 0) / (noticias.length || 1);
  const nRisk = noticias.filter(n => n.local_relevance && n.local_relevance > 70).length / (noticias.length || 1);

  // Instagram
  const iSentMap: Record<string, number> = { 'positivo': 1, 'neutro': 0, 'misto': 0, 'negativo': -1 };
  const iSent = instagram.posts.reduce((acc, p) => acc + (iSentMap[p.sentiment?.toLowerCase()] || 0), 0) / (instagram.posts.length || 1);
  const iRisk = instagram.posts.filter(p => p.risk === 'alto').length / (instagram.posts.length || 1);
  const iEng = instagram.posts.reduce((acc, p) => acc + p.like_count + p.comment_count, 0);

  // X
  const xSent = x.posts.reduce((acc, p) => acc + (iSentMap[p.sentiment?.toLowerCase()] || 0), 0) / (x.posts.length || 1);
  const xRisk = x.posts.filter(p => p.risk === 'alto' || p.risk === 'critico').length / (x.posts.length || 1);
  const xPol = x.posts.filter(p => p.polarizationLevel?.toLowerCase() === 'alto').length / (x.posts.length || 1);

  const channelDistribution = {
    noticias: {
      sentimento_medio: nSent,
      risco_medio: nRisk,
      volume: noticias.length
    },
    instagram: {
      sentimento_medio: iSent,
      risco_medio: iRisk,
      engajamento: iEng,
      volume: instagram.posts.length
    },
    x: {
      sentimento_medio: xSent,
      risco_medio: xRisk,
      polarização: xPol,
      volume: x.posts.length,
      posts: x.posts
    }
  };

  console.log("[OVERVIEW CHANNELS CHECK]", channelDistribution);

  return channelDistribution;
}

/**
 * 5. ALERTAS PRIORITÁRIOS
 */
export async function getPriorityAlerts(filters?: OverviewFilters) {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  const alerts: any[] = [];

  // Notícias
  noticias.forEach(n => {
    if ((n.local_relevance || 0) > 70) {
      alerts.push({
        canal: 'Notícias',
        resumo: n.title,
        risco: n.local_relevance || 50,
        impacto: (n.local_relevance || 50) * 1.2,
        data: n.published_at,
        url: n.url
      });
    }
  });

  // Instagram
  instagram.posts.forEach(p => {
    if (p.risk === 'alto') {
      alerts.push({
        canal: 'Instagram',
        resumo: p.text.substring(0, 100),
        risco: 85,
        impacto: (p.like_count + p.comment_count) / 10,
        data: p.created_at,
        url: p.url
      });
    }
  });

  // X
  x.posts.forEach(p => {
    if (p.risk === 'alto' || p.risk === 'critico') {
      alerts.push({
        canal: 'X (Twitter)',
        resumo: p.text.substring(0, 100),
        risco: p.risk === 'critico' ? 100 : 80,
        impacto: p.impactScore || 50,
        data: p.created_at,
        url: p.url
      });
    }
  });

  return alerts
    .sort((a, b) => b.risco - a.risco || b.impacto - a.impacto || new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5);
}

/**
 * 6. TEMAS DOMINANTES
 */
export async function getDominantTopics(filters?: OverviewFilters) {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  const topics: Record<string, { count: number, sentiment: number }> = {};

  const process = (topic: string, sentiment: number) => {
    if (!topic || topic === 'Sem análise') return;
    if (!topics[topic]) topics[topic] = { count: 0, sentiment: 0 };
    topics[topic].count++;
    topics[topic].sentiment += sentiment;
  };

  const iSentMap: Record<string, number> = { 'positivo': 1, 'neutro': 0, 'misto': 0, 'negativo': -1 };

  noticias.forEach(n => {
    const tArray = Array.isArray(n.ai_topics) ? n.ai_topics : [];
    tArray.forEach((t: any) => process(t, n.ai_sentiment || 0));
  });

  instagram.posts.forEach(p => process(p.topic, iSentMap[p.sentiment?.toLowerCase()] || 0));
  x.posts.forEach(p => process(p.topic, iSentMap[p.sentiment?.toLowerCase()] || 0));

  return Object.entries(topics)
    .map(([tema, data]) => ({
      tema,
      frequencia: data.count,
      sentimento: data.sentiment / data.count
    }))
    .sort((a, b) => b.frequencia - a.frequencia)
    .slice(0, 10);
}

/**
 * 7. SENTIMENTO CONSOLIDADO
 */
export async function getSentimentOverview(filters?: OverviewFilters) {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  const stats = { positivo: 0, negativo: 0, neutro: 0, misto: 0 };

  const add = (sent: string | number | null) => {
    if (typeof sent === 'number') {
      if (sent > 0.2) stats.positivo++;
      else if (sent < -0.2) stats.negativo++;
      else stats.neutro++;
    } else {
      const s = sent?.toLowerCase();
      if (s === 'positivo') stats.positivo++;
      else if (s === 'negativo') stats.negativo++;
      else if (s === 'misto') stats.misto++;
      else stats.neutro++;
    }
  };

  noticias.forEach(n => add(n.ai_sentiment));
  instagram.posts.forEach(p => add(p.sentiment));
  x.posts.forEach(p => add(p.sentiment));

  return stats;
}

/**
 * 8. RISCO CONSOLIDADO
 */
export async function getRiskOverview(filters?: OverviewFilters) {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  const stats = { critico: 0, alto: 0, medio: 0, baixo: 0 };

  noticias.forEach(n => {
    const r = n.local_relevance || 0;
    if (r > 85) stats.critico++;
    else if (r > 70) stats.alto++;
    else if (r > 40) stats.medio++;
    else stats.baixo++;
  });

  instagram.posts.forEach(p => {
    const r = p.risk?.toLowerCase();
    if (r === 'alto') stats.alto++;
    else if (r === 'medio' || r === 'médio') stats.medio++;
    else stats.baixo++;
  });

  x.posts.forEach(p => {
    const r = p.risk?.toLowerCase();
    if (r === 'critico') stats.critico++;
    else if (r === 'alto') stats.alto++;
    else if (r === 'medio' || r === 'médio') stats.medio++;
    else stats.baixo++;
  });

  return stats;
}

/**
 * 9. TENDÊNCIA
 */
export async function getTrendOverview(filters?: OverviewFilters) {
  // Simplificação: compara volume atual vs base 7 dias
  const { volume_total } = await getOverviewKPIs(filters);
  const baseline = 100; // Mock de baseline ou buscar período anterior se necessário

  const varPct = volume_total > 0 ? ((volume_total - baseline) / baseline) * 100 : 0;

  return {
    direção: varPct > 5 ? 'up' : varPct < -5 ? 'down' : 'stable',
    variação: Math.round(varPct)
  };
}

/**
 * 10. MAPA DE AÇÃO (IA)
 */
export async function getStrategicActions(filters?: OverviewFilters) {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  const actions: any[] = [];

  // Coleta as recomendações de IA dos itens mais críticos
  const allItems = [
    ...noticias.map(n => ({ ...n, canal: 'Notícias', type: 'news', riskVal: n.local_relevance || 0 })),
    ...instagram.posts.map(p => ({ ...p, canal: 'Instagram', type: 'insta', riskVal: p.risk === 'alto' ? 80 : 40 })),
    ...x.posts.map(p => ({ ...p, canal: 'X', type: 'x', riskVal: p.risk === 'critico' ? 100 : p.risk === 'alto' ? 80 : 40 }))
  ].sort((a, b) => b.riskVal - a.riskVal);

  const topItems = allItems.slice(0, 3);

  topItems.forEach((item: any) => {
    actions.push({
      ação: item.recommendedAction || 'Monitorar evolução da narrativa',
      justificativa: `Baseado em ${item.type === 'news' ? 'menção na imprensa' : 'post de rede social'} com risco ${item.riskVal}%`,
      canal: item.canal
    });
  });

  if (actions.length === 0) {
    actions.push({
      ação: 'Manter monitoramento ativo',
      justificativa: 'Nenhum risco imediato detectado nos canais.',
      canal: 'Todos'
    });
  }

  return actions;
}

/**
 * 11. TABELA EXECUTIVA
 */
export async function getExecutiveTable(filters?: OverviewFilters) {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  const rows: any[] = [];

  noticias.slice(0, 10).forEach(n => {
    rows.push({
      candidato: n.candidate_name || 'Geral',
      canal: 'Notícias',
      sentimento: n.ai_sentiment && n.ai_sentiment > 0 ? 'Positivo' : n.ai_sentiment && n.ai_sentiment < 0 ? 'Negativo' : 'Neutro',
      risco: n.local_relevance && n.local_relevance > 70 ? 'Alto' : 'Baixo',
      impacto: 'Médio',
      ação: 'Ver Clipping'
    });
  });

  instagram.posts.slice(0, 10).forEach(p => {
    rows.push({
      candidato: p.candidate_name,
      canal: 'Instagram',
      sentimento: p.sentiment,
      risco: p.risk,
      impacto: p.like_count > 500 ? 'Alto' : 'Médio',
      ação: 'Ver Post'
    });
  });

  x.posts.slice(0, 10).forEach(p => {
    rows.push({
      candidato: p.candidate_name,
      canal: 'X (Twitter)',
      sentimento: p.sentiment,
      risco: p.risk,
      impacto: p.impactScore > 70 ? 'Alto' : 'Médio',
      ação: 'Ver Análise'
    });
  });

  return rows.sort((a, b) => {
    const riskVal = (r: string) => r?.toLowerCase() === 'alto' || r?.toLowerCase() === 'crítico' ? 2 : 1;
    return riskVal(b.risco) - riskVal(a.risco);
  }).slice(0, 20);
}

/**
 * Filtros de Candidatos para o Overview
 */
export async function getOverviewFiltersOptions(allowedTargetIds?: string[] | null) {
  const client = createClient();
  let q = client.from('targets').select('id, candidate_name').order('candidate_name');

  if (allowedTargetIds !== null && allowedTargetIds !== undefined) {
    if (allowedTargetIds.length === 0) return [];
    q = q.in('id', allowedTargetIds);
  }

  const { data } = await q;
  return (data || []).map(t => ({ id: t.id, name: t.candidate_name }));
}
