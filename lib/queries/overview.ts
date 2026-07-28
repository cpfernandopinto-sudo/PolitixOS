import { cache } from 'react';
import { fetchMencoes, getGaugeScore as getNoticiasGauge } from './noticias';
import { fetchInstagramData } from './instagram';
import { fetchXData } from './x';
import { createClient } from '@/lib/supabaseClient';
import {
  evaluateNoticiaItemAlerts,
  evaluateNoticiaAggregateAlerts,
  evaluateInstagramItemAlerts,
  evaluateXItemAlerts,
  sortAlerts,
} from './alerts';
import {
  splitByPeriod,
  computeSentimentShares,
  deriveRisksFromAlerts,
  evaluateOpportunities,
  selectKeyChanges,
  rankEntities,
  rankThemes,
  composeExecutiveSynthesis,
} from '@/lib/analytics/executive-summary';
import { classifyPoliticalStatus } from '@/lib/analytics/political-status';

export interface OverviewFilters {
  candidate?: string | null;
  city?: string | null;
  period?: string | null; // 'all' | '1' | '7' | '30'
  allowedTargetIds?: string[] | null;
}

function normalizeLabel(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function riskScore(value: string | null | undefined) {
  const risk = normalizeLabel(value);
  if (risk === 'critico') return 100;
  if (risk === 'alto') return 75;
  if (risk === 'medio') return 50;
  return 0;
}

function isHighRisk(value: string | null | undefined) {
  return riskScore(value) >= 75;
}

function isCriticalRisk(value: string | null | undefined) {
  return riskScore(value) === 100;
}

function averageRiskScore(items: Array<{ risk?: string | null }>) {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + riskScore(item.risk), 0) / items.length;
}

function weightedAverage(entries: Array<{ value: number; weight: number; count: number }>) {
  const available = entries.filter(entry => entry.count > 0);
  const totalWeight = available.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight === 0) return 0;
  return available.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight;
}

function compareTrend(current: number, previous: number): { direção: 'up' | 'down' | 'stable'; variação: number } {
  if (previous === 0) return { direção: 'stable', variação: 0 };

  const varPct = ((current - previous) / previous) * 100;
  return {
    direção: varPct > 5 ? 'up' : varPct < -5 ? 'down' : 'stable',
    variação: Math.round(varPct)
  };
}

function getItemTimestamp(item: { published_at?: string | null; created_at?: string | null }) {
  const rawDate = item.published_at || item.created_at;
  if (!rawDate) return null;

  const timestamp = new Date(rawDate).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function calculateTrend(
  data: Awaited<ReturnType<typeof fetchOverviewData>>,
  period: string | null | undefined
): { direção: 'up' | 'down' | 'stable'; variação: number } {
  const timestamps = [
    ...data.noticias.map(getItemTimestamp),
    ...data.instagram.posts.map(getItemTimestamp),
    ...data.x.posts.map(getItemTimestamp)
  ].filter((timestamp): timestamp is number => timestamp !== null);

  if (timestamps.length < 2) return { direção: 'stable', variação: 0 };

  if (period === 'all' || !period) {
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    if (max <= min) return { direção: 'stable', variação: 0 };

    const midpoint = min + ((max - min) / 2);
    const previous = timestamps.filter(timestamp => timestamp < midpoint).length;
    const current = timestamps.filter(timestamp => timestamp >= midpoint).length;
    return compareTrend(current, previous);
  }

  const periodDays = parseInt(period, 10);
  if (isNaN(periodDays) || periodDays <= 0) return { direção: 'stable', variação: 0 };

  const now = Date.now();
  const periodMs = periodDays * 24 * 60 * 60 * 1000;
  const currentStart = now - periodMs;
  const previousStart = currentStart - periodMs;

  const current = timestamps.filter(timestamp => timestamp >= currentStart && timestamp <= now).length;
  const previous = timestamps.filter(timestamp => timestamp >= previousStart && timestamp < currentStart).length;
  return compareTrend(current, previous);
}

/**
 * Busca dados consolidados de todos os radares.
 *
 * Memoizada com React.cache(): todas as funções abaixo (getOverviewKPIs,
 * getCrisisOverview, getChannelDistribution, etc.) recebem o MESMO objeto
 * `filters` vindo da página e chamam esta função — o cache por referência do
 * React garante que as ~9 chamadas por carregamento resultem em 1 única
 * execução real (3 subconsultas: notícias, Instagram, X), não 9.
 *
 * Importante: nunca passar um objeto `filters` diferente (ou mutado) para
 * esta função a partir de um contexto que deveria reaproveitar o cache —
 * isso já causou um bug de segurança em `fetchInstagramData` (ver nota em
 * lib/queries/instagram.ts) quando uma chamada sem `allowedTargetIds` foi
 * cacheada e reaproveitada por engano para uma chamada restrita.
 */
export const fetchOverviewData = cache(async (filters?: OverviewFilters) => {
  // Padronizar filtros para as funções específicas
  // period='all' = sem filtro de data (todo período)
  const period = filters?.period || 'all';
  const isAllPeriod = period === 'all';

  const [noticias, instagram, x] = await Promise.all([
    fetchMencoes({
      candidateId: filters?.candidate,
      city: filters?.city,
      period: isAllPeriod ? undefined : (period === '1' ? '24h' : period === '7' ? '7d' : '30d'),
      allowedTargetIds: filters?.allowedTargetIds
    }),
    fetchInstagramData({
      candidate: filters?.candidate,
      period: isAllPeriod ? undefined : period,
      allowedTargetIds: filters?.allowedTargetIds
    }),
    fetchXData({
      candidate: filters?.candidate,
      period: isAllPeriod ? undefined : period,
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

  return { noticias, instagram, x, baseData };
});

/**
 * 2. KPIs EXECUTIVOS
 */
export async function getOverviewKPIs(filters?: OverviewFilters) {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  // Volume Total
  const volumeTotal = noticias.length + instagram.posts.length + x.posts.length;

  // Alertas Ativos (Risco Alto/Crítico)
  const alertasNoticias = noticias.filter(n => n.local_relevance && n.local_relevance > 80).length;
  const alertasInstagram = instagram.posts.filter(p => isHighRisk(p.risk)).length;
  const alertasX = x.posts.filter(p => isHighRisk(p.risk)).length;
  const alertasAtivos = alertasNoticias + alertasInstagram + alertasX;

  const noticiasGauge = getNoticiasGauge(noticias);
  const xCrisisScore = averageRiskScore(x.posts);
  const instaCrisisScore = averageRiskScore(instagram.posts);
  const weightedRisk = weightedAverage([
    { value: noticiasGauge.score, weight: 0.5, count: noticias.length },
    { value: xCrisisScore, weight: 0.3, count: x.posts.length },
    { value: instaCrisisScore, weight: 0.2, count: instagram.posts.length }
  ]);
  const score_geral = volumeTotal > 0 ? Math.round(100 - weightedRisk) : 0;

  let temperatura_geral = volumeTotal > 0 ? 'fria' : 'Sem dados';
  const maxCrisis = Math.max(noticiasGauge.score, xCrisisScore, instaCrisisScore);
  if (volumeTotal > 0 && maxCrisis > 70) temperatura_geral = 'crítica';
  else if (volumeTotal > 0 && maxCrisis > 40) temperatura_geral = 'quente';
  else if (volumeTotal > 0 && maxCrisis > 20) temperatura_geral = 'morna';

  const trend = await getTrendOverview(filters);
  const tendencia = trend.direção === 'up' ? 'subindo' : trend.direção === 'down' ? 'caindo' : 'estável';

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
  const xCrisisScore = averageRiskScore(x.posts);
  const instaScore = averageRiskScore(instagram.posts);
  const volumeTotal = noticias.length + instagram.posts.length + x.posts.length;
  const score = Math.round(weightedAverage([
    { value: nGauge.score, weight: 0.5, count: noticias.length },
    { value: xCrisisScore, weight: 0.3, count: x.posts.length },
    { value: instaScore, weight: 0.2, count: instagram.posts.length }
  ]));

  let status = volumeTotal > 0 ? 'frio' : 'Sem dados';
  if (score > 75) status = 'crítico';
  else if (score > 50) status = 'quente';
  else if (score > 25) status = 'morno';

  return {
    score,
    status,
    breakdown: {
      noticias: nGauge.score,
      x: Math.round(xCrisisScore),
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
  const iRisk = instagram.posts.filter(p => isHighRisk(p.risk)).length / (instagram.posts.length || 1);
  const iEng = instagram.posts.reduce((acc, p) => acc + p.like_count + p.comment_count, 0);

  // X
  const xSent = x.posts.reduce((acc, p) => acc + (iSentMap[p.sentiment?.toLowerCase()] || 0), 0) / (x.posts.length || 1);
  const xRisk = x.posts.filter(p => isHighRisk(p.risk)).length / (x.posts.length || 1);
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
    if (isHighRisk(p.risk)) {
      alerts.push({
        canal: 'Instagram',
        resumo: p.text.substring(0, 100),
        risco: riskScore(p.risk),
        impacto: (p.like_count + p.comment_count) / 10,
        data: p.created_at,
        url: p.url
      });
    }
  });

  // X
  x.posts.forEach(p => {
    if (isHighRisk(p.risk)) {
      alerts.push({
        canal: 'X (Twitter)',
        resumo: p.text.substring(0, 100),
        risco: isCriticalRisk(p.risk) ? 100 : 80,
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

export interface TimelineEvent {
  id: string;
  canal: 'Notícias' | 'Instagram' | 'X';
  titulo: string;
  data: string;
  severidade: 'alta' | 'media';
  url: string | null;
  /** Primeiro tema/tópico associado (para o modo agrupado da timeline) — `null` quando não há análise de tema. */
  tema: string | null;
  /** Candidato/target associado — `null` quando não identificado. */
  entidade: string | null;
  /** Sentimento normalizado — `null` quando não há análise de sentimento. */
  sentimento: 'positivo' | 'negativo' | 'neutro' | null;
}

const TIMELINE_LIMIT = 40;

interface TimelineSourceNoticia {
  id: string;
  title: string | null;
  published_at: string | null;
  local_relevance: number | null;
  url: string | null;
  candidate_name?: string | null;
  ai_topics?: unknown;
  ai_sentiment?: number | null;
}

interface TimelineSourcePost {
  id: string;
  text?: string | null;
  created_at?: string | null;
  risk?: string | null;
  url?: string | null;
  candidate_name?: string | null;
  topic?: string | null;
  sentiment?: string | null;
}

function firstTopic(value: unknown): string | null {
  if (Array.isArray(value)) {
    const first = value.find((v) => typeof v === 'string');
    return typeof first === 'string' ? first : null;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const first = parsed.find((v) => typeof v === 'string');
        return typeof first === 'string' ? first : null;
      }
    } catch { /* ignora */ }
  }
  return null;
}

function normalizeSentimentLabel(sentiment: string | null | undefined, numericSentiment?: number | null): 'positivo' | 'negativo' | 'neutro' | null {
  if (typeof numericSentiment === 'number') {
    return numericSentiment > 0 ? 'positivo' : numericSentiment < 0 ? 'negativo' : 'neutro';
  }
  const s = sentiment?.toLowerCase();
  if (s === 'positivo' || s === 'negativo' || s === 'neutro') return s;
  return null;
}

/**
 * Monta e deduplica os eventos da timeline a partir dos itens já buscados
 * (nenhum I/O aqui — função pura, testável isoladamente). Usa os mesmos
 * critérios de "item notável" já usados em getPriorityAlerts, mas ordena
 * cronologicamente (não por risco) e não limita a 5, pois aqui o objetivo é
 * a linha do tempo, não o topo de prioridades.
 *
 * Deduplicação: cada evento é identificado por `${canal}:${id}` da linha de
 * origem (notícia/post) — um mesmo item nunca aparece duas vezes na
 * timeline, mesmo que satisfaça mais de um critério.
 */
export function buildTimelineEvents(source: {
  noticias: TimelineSourceNoticia[];
  instagramPosts: TimelineSourcePost[];
  xPosts: TimelineSourcePost[];
}): TimelineEvent[] {
  const seen = new Set<string>();
  const events: TimelineEvent[] = [];

  const pushEvent = (event: TimelineEvent) => {
    const key = `${event.canal}:${event.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    events.push(event);
  };

  source.noticias.forEach((n) => {
    if ((n.local_relevance || 0) > 70 && n.published_at) {
      pushEvent({
        id: n.id,
        canal: 'Notícias',
        titulo: n.title || 'Notícia sem título',
        data: n.published_at,
        severidade: (n.local_relevance || 0) > 85 ? 'alta' : 'media',
        url: n.url,
        tema: firstTopic(n.ai_topics),
        entidade: n.candidate_name ?? null,
        sentimento: normalizeSentimentLabel(null, n.ai_sentiment ?? null),
      });
    }
  });

  source.instagramPosts.forEach((p) => {
    if (isHighRisk(p.risk) && p.created_at) {
      pushEvent({
        id: p.id,
        canal: 'Instagram',
        titulo: (p.text || 'Post sem legenda').substring(0, 140),
        data: p.created_at,
        severidade: isCriticalRisk(p.risk) ? 'alta' : 'media',
        url: p.url ?? null,
        tema: p.topic && p.topic !== 'Sem análise' ? p.topic : null,
        entidade: p.candidate_name ?? null,
        sentimento: normalizeSentimentLabel(p.sentiment, null),
      });
    }
  });

  source.xPosts.forEach((p) => {
    if (isHighRisk(p.risk) && p.created_at) {
      pushEvent({
        id: p.id,
        canal: 'X',
        titulo: (p.text || 'Post sem texto').substring(0, 140),
        data: p.created_at,
        severidade: isCriticalRisk(p.risk) ? 'alta' : 'media',
        url: p.url ?? null,
        tema: p.topic && p.topic !== 'Sem análise' ? p.topic : null,
        entidade: p.candidate_name ?? null,
        sentimento: normalizeSentimentLabel(p.sentiment, null),
      });
    }
  });

  return events
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, TIMELINE_LIMIT);
}

/**
 * Timeline consolidada da Visão Geral: reaproveita o MESMO fetchOverviewData
 * já cacheado (React.cache()) por esta requisição — não dispara nenhuma
 * consulta nova.
 */
export async function getTimelineEvents(filters?: OverviewFilters): Promise<TimelineEvent[]> {
  const { noticias, instagram, x } = await fetchOverviewData(filters);
  return buildTimelineEvents({ noticias, instagramPosts: instagram.posts, xPosts: x.posts });
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
    const r = normalizeLabel(p.risk);
    if (r === 'critico') stats.critico++;
    else if (r === 'alto') stats.alto++;
    else if (r === 'medio') stats.medio++;
    else stats.baixo++;
  });

  x.posts.forEach(p => {
    const r = normalizeLabel(p.risk);
    if (r === 'critico') stats.critico++;
    else if (r === 'alto') stats.alto++;
    else if (r === 'medio') stats.medio++;
    else stats.baixo++;
  });

  return stats;
}

/**
 * Busca o conjunto "período completo" (sem filtro de data), usado tanto por
 * getTrendOverview quanto por getExecutiveOverviewData para comparação
 * período-atual-vs-anterior. Memoizada com React.cache() e chamada com o
 * `filters` ORIGINAL (não um spread novo) — é isso que permite as duas
 * chamadas deduplicarem entre si. Antes desta função existir, cada uma
 * construía seu próprio `{ ...filters, period: 'all' }` (referências
 * diferentes) e disparava uma consulta "período completo" separada —
 * confirmado via log em `fetchInstagramData` durante a validação visual do
 * Sprint 4 (múltiplas chamadas repetidas com os mesmos filtros).
 */
const getAllPeriodOverviewData = cache(async (filters?: OverviewFilters) => {
  return fetchOverviewData({ ...filters, period: 'all' });
});

/**
 * 9. TENDÊNCIA
 *
 * Memoizada com React.cache(): é chamada tanto diretamente pela página
 * quanto internamente por getOverviewKPIs(), ambas com o mesmo `filters`
 * vindo da página — sem cache, isso executava a consulta 2x.
 */
export const getTrendOverview = cache(async (filters?: OverviewFilters) => {
  const allData = await getAllPeriodOverviewData(filters);
  return calculateTrend(allData, filters?.period || 'all');
});

/**
 * 10. MAPA DE AÇÃO (IA)
 */
export async function getStrategicActions(filters?: OverviewFilters) {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  const actions: any[] = [];

  // Coleta as recomendações de IA dos itens mais críticos
  const allItems = [
    ...noticias.map(n => ({ ...n, canal: 'Notícias', type: 'news', riskVal: n.local_relevance || 0 })),
    ...instagram.posts.map(p => ({ ...p, canal: 'Instagram', type: 'insta', riskVal: riskScore(p.risk) })),
    ...x.posts.map(p => ({ ...p, canal: 'X', type: 'x', riskVal: riskScore(p.risk) }))
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
      ação: 'Ver Clipping',
      url: n.url
    });
  });

  instagram.posts.slice(0, 10).forEach(p => {
    rows.push({
      candidato: p.candidate_name,
      canal: 'Instagram',
      sentimento: p.sentiment,
      risco: p.risk,
      impacto: p.like_count > 500 ? 'Alto' : 'Médio',
      ação: 'Ver Post',
      url: p.url
    });
  });

  x.posts.slice(0, 10).forEach(p => {
    rows.push({
      candidato: p.candidate_name,
      canal: 'X (Twitter)',
      sentimento: p.sentiment,
      risco: p.risk,
      impacto: p.impactScore > 70 ? 'Alto' : 'Médio',
      ação: 'Ver Análise',
      url: p.url
    });
  });

  return rows.sort((a, b) => {
    const riskVal = (r: string) => r?.toLowerCase() === 'alto' || r?.toLowerCase() === 'crítico' ? 2 : 1;
    return riskVal(b.risco) - riskVal(a.risco);
  }).slice(0, 20);
}

function pickMax<K extends string>(counts: Record<K, number>): K | null {
  const entries = Object.entries(counts) as Array<[K, number]>;
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * 12. CENTRO EXECUTIVO (Sprint 3)
 *
 * Orquestrador de I/O para a síntese executiva da Visão Geral. Reaproveita:
 * - `fetchOverviewData(filters)` — já cacheado, mesma referência de
 *   `filters` usada pelos outros blocos da página (dedup por React.cache()).
 * - `fetchOverviewData({ ...filters, period: 'all' })` — MESMA consulta já
 *   feita por `getTrendOverview` (não é uma consulta nova de um tipo
 *   diferente), agora também usada para a comparação período-atual vs.
 *   período-anterior de Riscos/Oportunidades/Mudanças Relevantes.
 * - `getCrisisOverview`, `getSentimentOverview`, `getRiskOverview`,
 *   `getTrendOverview`, `getDominantTopics` — todas já existentes,
 *   memoizadas via `fetchOverviewData`.
 * - As regras de alerta de `lib/queries/alerts.ts` são reaproveitadas como
 *   FUNÇÕES PURAS (evaluate*ItemAlerts) aplicadas diretamente sobre os dados
 *   já buscados acima — não chama `getUnifiedAlerts` (que faria 3 consultas
 *   novas via seu próprio `fetchMencoes`/`fetchInstagramData`/`fetchXData`
 *   com um objeto de filtro diferente, fora do cache desta requisição).
 *
 * Único custo real além do que a Visão Geral já pagava: a consulta de
 * "período completo" acima, que já existia para `getTrendOverview`.
 *
 * Memoizada com React.cache(): a página renderiza vários blocos
 * independentes (síntese, estado político, riscos/oportunidades, mudanças,
 * entidades/temas) em Suspense boundaries separados, todos chamando esta
 * função com o MESMO objeto `filters` — sem cache(), isso re-executaria
 * todo o orquestrador (incluindo a consulta de período completo) uma vez
 * por bloco.
 */
export const getExecutiveOverviewData = cache(async (filters?: OverviewFilters) => {
  const { noticias, instagram, x } = await fetchOverviewData(filters);

  const alerts = sortAlerts([
    ...evaluateNoticiaItemAlerts(noticias),
    ...evaluateNoticiaAggregateAlerts(noticias),
    ...evaluateInstagramItemAlerts(instagram.posts),
    ...evaluateXItemAlerts(x.posts),
  ]);
  const criticalAlertCount = alerts.filter((a) => a.severidade === 'critico').length;
  const highAlertCount = alerts.filter((a) => a.severidade === 'alto').length;

  const [crisis, sentiment, risk, trend, topics] = await Promise.all([
    getCrisisOverview(filters),
    getSentimentOverview(filters),
    getRiskOverview(filters),
    getTrendOverview(filters),
    getDominantTopics(filters),
  ]);

  const volumeTotal = noticias.length + instagram.posts.length + x.posts.length;

  const politicalStatus = classifyPoliticalStatus({
    crisisScore: crisis.score,
    volumeTotal,
    criticalAlertCount,
    highAlertCount,
    predominantSentiment: pickMax(sentiment),
    predominantRisk: pickMax(risk),
    volumeTrend: volumeTotal > 0 ? { direcao: trend.direção, variacaoPercentual: trend.variação } : null,
  });

  // Comparação período atual vs. anterior — reaproveita a MESMA consulta de
  // "período completo" que getTrendOverview já faz (getAllPeriodOverviewData
  // é cache()-deduplicada entre as duas chamadas, mesma referência `filters`).
  const allPeriodData = await getAllPeriodOverviewData(filters);
  const period = filters?.period || 'all';
  const getNoticiaTimestamp = (n: { published_at: string | null }) => (n.published_at ? new Date(n.published_at).getTime() : null);
  const getPostTimestamp = (p: { created_at: string | null }) => (p.created_at ? new Date(p.created_at).getTime() : null);

  const noticiasSplit = splitByPeriod(allPeriodData.noticias, getNoticiaTimestamp, period);
  const instaSplit = splitByPeriod(allPeriodData.instagram.posts, getPostTimestamp, period);
  const xSplit = splitByPeriod(allPeriodData.x.posts, getPostTimestamp, period);

  const currentShares = computeSentimentShares(noticiasSplit.current, instaSplit.current, xSplit.current);
  const hasPreviousWindow = noticiasSplit.previous.length + instaSplit.previous.length + xSplit.previous.length > 0;
  const previousShares = hasPreviousWindow
    ? computeSentimentShares(noticiasSplit.previous, instaSplit.previous, xSplit.previous)
    : null;

  const entities = rankEntities(noticias, instagram.posts, x.posts, alerts);
  const themes = rankThemes(topics);
  const risks = deriveRisksFromAlerts(alerts, 10);
  const opportunities = evaluateOpportunities(currentShares, previousShares, entities, 10);
  const keyChanges = selectKeyChanges(currentShares, previousShares, volumeTotal > 0 ? { direcao: trend.direção, variacaoPercentual: trend.variação } : null);

  const synthesis = composeExecutiveSynthesis({ politicalStatus, risks, opportunities, themes, entities, keyChanges });

  return { politicalStatus, risks, opportunities, keyChanges, entities, themes, synthesis, alertCounts: { critico: criticalAlertCount, alto: highAlertCount } };
});

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
