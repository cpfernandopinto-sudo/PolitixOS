import { fetchMencoes } from './noticias';
import { fetchInstagramData } from './instagram';
import { fetchXData } from './x';
import { ALERT_RULES, SEVERITY_ORDER, type AlertSeverity } from '@/lib/config/alert-thresholds';
import type { MencaoRow } from '@/lib/types/noticias';

export interface AlertsFilters {
  period?: string | null; // 'all' | '1' | '7' | '30'
  severity?: AlertSeverity | null;
  type?: string | null; // canal: 'noticias' | 'instagram' | 'x'
  target?: string | null; // target_id / candidato
  allowedTargetIds?: string[] | null;
}

export interface UnifiedAlert {
  id: string;
  ruleId: string;
  nome: string;
  origem: 'noticias' | 'instagram' | 'x';
  severidade: AlertSeverity;
  entidade: string;
  titulo: string;
  descricao: string;
  metricaAtual: string;
  referencia: string;
  data: string | null;
  url: string | null;
}

/**
 * Encapsula a checagem "allowedTargetIds vazio → sem acesso a nada" para que
 * seja uma função pura testável, em vez de repetir a checagem em cada
 * chamada. Os fetchers (fetchMencoes/fetchInstagramData/fetchXData) já fazem
 * essa checagem internamente — chamar isto antes é apenas uma proteção
 * redundante e barata, não substitui a checagem deles.
 */
export function shouldReturnEmptyForAccess(allowedTargetIds?: string[] | null): boolean {
  return allowedTargetIds !== null && allowedTargetIds !== undefined && allowedTargetIds.length === 0;
}

function parseJsonField(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string') as string[];
    } catch { /* ignora */ }
  }
  return [];
}

const CRISE_FLAGS = new Set([
  'crise_politica', 'crise_financeira', 'crise_economica',
  'corrupcao', 'crime_acusacao', 'processo_judicial',
  'Gestão de Crise', 'Acusação',
]);

/**
 * Regras por item (notícia individual de alto/crítico risco).
 * Pura: não faz I/O, recebe as linhas já buscadas/filtradas.
 */
export function evaluateNoticiaItemAlerts(rows: MencaoRow[]): UnifiedAlert[] {
  const alerts: UnifiedAlert[] = [];

  for (const r of rows) {
    const relevance = r.local_relevance ?? 0;
    if (relevance > 85) {
      alerts.push({
        id: `noticia_risco_critico:${r.id}`,
        ruleId: ALERT_RULES.noticia_risco_critico.id,
        nome: ALERT_RULES.noticia_risco_critico.nome,
        origem: 'noticias',
        severidade: 'critico',
        entidade: r.candidate_name || 'Geral',
        titulo: r.title || 'Notícia sem título',
        descricao: ALERT_RULES.noticia_risco_critico.descricao,
        metricaAtual: `local_relevance = ${relevance}`,
        referencia: ALERT_RULES.noticia_risco_critico.threshold,
        data: r.published_at,
        url: r.url,
      });
    } else if (relevance > 80) {
      alerts.push({
        id: `noticia_risco_alto:${r.id}`,
        ruleId: ALERT_RULES.noticia_risco_alto.id,
        nome: ALERT_RULES.noticia_risco_alto.nome,
        origem: 'noticias',
        severidade: 'alto',
        entidade: r.candidate_name || 'Geral',
        titulo: r.title || 'Notícia sem título',
        descricao: ALERT_RULES.noticia_risco_alto.descricao,
        metricaAtual: `local_relevance = ${relevance}`,
        referencia: ALERT_RULES.noticia_risco_alto.threshold,
        data: r.published_at,
        url: r.url,
      });
    }
  }

  return alerts;
}

/**
 * Regras agregadas de notícias (pico de volume, concentração de negativas,
 * concentração de temas sensíveis) — mesma lógica de getCrisisAlerts em
 * lib/queries/noticias.ts, centralizada e testável isoladamente aqui.
 */
export function evaluateNoticiaAggregateAlerts(rows: MencaoRow[]): UnifiedAlert[] {
  const alerts: UnifiedAlert[] = [];
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;
  const last7d = now - 7 * 24 * 60 * 60 * 1000;

  const rows24h = rows.filter((r) => r.published_at && new Date(r.published_at).getTime() >= last24h);
  const rows7dAnterior = rows.filter(
    (r) => r.published_at && new Date(r.published_at).getTime() >= last7d && new Date(r.published_at).getTime() < last24h
  );

  const volume24h = rows24h.length;
  const avg7d = rows7dAnterior.length / 7;
  if (avg7d > 0 && volume24h > avg7d * 1.5) {
    alerts.push({
      id: 'noticia_volume_anormal:24h',
      ruleId: ALERT_RULES.noticia_volume_anormal.id,
      nome: ALERT_RULES.noticia_volume_anormal.nome,
      origem: 'noticias',
      severidade: 'alto',
      entidade: 'Geral',
      titulo: ALERT_RULES.noticia_volume_anormal.nome,
      descricao: ALERT_RULES.noticia_volume_anormal.descricao,
      metricaAtual: `${volume24h} notícias nas últimas 24h`,
      referencia: `média/dia (7d anteriores) = ${avg7d.toFixed(1)}`,
      data: new Date().toISOString(),
      url: null,
    });
  }

  if (rows24h.length > 0) {
    const analisados = rows24h.filter((r) => r.ai_sentiment !== null);
    const negativos = analisados.filter((r) => (r.ai_sentiment ?? 0) < 0).length;
    const pctNegativo = analisados.length > 0 ? (negativos / analisados.length) * 100 : 0;
    if (pctNegativo > 40) {
      alerts.push({
        id: 'noticia_sentimento_negativo:24h',
        ruleId: ALERT_RULES.noticia_sentimento_negativo.id,
        nome: ALERT_RULES.noticia_sentimento_negativo.nome,
        origem: 'noticias',
        severidade: 'alto',
        entidade: 'Geral',
        titulo: ALERT_RULES.noticia_sentimento_negativo.nome,
        descricao: ALERT_RULES.noticia_sentimento_negativo.descricao,
        metricaAtual: `${pctNegativo.toFixed(0)}% negativas nas últimas 24h`,
        referencia: ALERT_RULES.noticia_sentimento_negativo.threshold,
        data: new Date().toISOString(),
        url: null,
      });
    }
  }

  const criticos = rows24h.filter((r) => {
    const flags = parseJsonField(r.ai_risk_flags);
    return flags.length >= 2 || flags.some((f) => CRISE_FLAGS.has(f));
  });
  if (criticos.length > 3) {
    alerts.push({
      id: 'noticia_temas_sensiveis:24h',
      ruleId: ALERT_RULES.noticia_temas_sensiveis.id,
      nome: ALERT_RULES.noticia_temas_sensiveis.nome,
      origem: 'noticias',
      severidade: 'critico',
      entidade: 'Geral',
      titulo: ALERT_RULES.noticia_temas_sensiveis.nome,
      descricao: ALERT_RULES.noticia_temas_sensiveis.descricao,
      metricaAtual: `${criticos.length} notícias com temas sensíveis nas últimas 24h`,
      referencia: ALERT_RULES.noticia_temas_sensiveis.threshold,
      data: new Date().toISOString(),
      url: null,
    });
  }

  return alerts;
}

interface InstagramPostLike {
  id: string;
  candidate_name?: string | null;
  text?: string | null;
  risk?: string | null;
  sentiment?: string | null;
  created_at?: string | null;
  url?: string | null;
}

export function evaluateInstagramItemAlerts(posts: InstagramPostLike[]): UnifiedAlert[] {
  const alerts: UnifiedAlert[] = [];

  for (const p of posts) {
    if (p.risk?.toLowerCase() === 'alto') {
      alerts.push({
        id: `instagram_risco_alto:${p.id}`,
        ruleId: ALERT_RULES.instagram_risco_alto.id,
        nome: ALERT_RULES.instagram_risco_alto.nome,
        origem: 'instagram',
        severidade: 'alto',
        entidade: p.candidate_name || 'Geral',
        titulo: (p.text || 'Post sem legenda').slice(0, 120),
        descricao: ALERT_RULES.instagram_risco_alto.descricao,
        metricaAtual: `risk_level = ${p.risk}`,
        referencia: ALERT_RULES.instagram_risco_alto.threshold,
        data: p.created_at ?? null,
        url: p.url ?? null,
      });
    }
  }

  const negativos = posts.filter((p) => p.sentiment?.toLowerCase() === 'negativo').length;
  const pct = posts.length > 0 ? (negativos / posts.length) * 100 : 0;
  if (posts.length > 0 && pct > 40) {
    alerts.push({
      id: 'instagram_sentimento_negativo:periodo',
      ruleId: ALERT_RULES.instagram_sentimento_negativo.id,
      nome: ALERT_RULES.instagram_sentimento_negativo.nome,
      origem: 'instagram',
      severidade: 'alto',
      entidade: 'Geral',
      titulo: ALERT_RULES.instagram_sentimento_negativo.nome,
      descricao: ALERT_RULES.instagram_sentimento_negativo.descricao,
      metricaAtual: `${pct.toFixed(0)}% de posts negativos no período`,
      referencia: ALERT_RULES.instagram_sentimento_negativo.threshold,
      data: new Date().toISOString(),
      url: null,
    });
  }

  return alerts;
}

interface XPostLike {
  id: string;
  candidate_name?: string | null;
  text?: string | null;
  risk?: string | null;
  crisisScore?: number;
  created_at?: string | null;
  url?: string | null;
}

function normalizeRisk(value: string | null | undefined) {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function evaluateXItemAlerts(posts: XPostLike[]): UnifiedAlert[] {
  const alerts: UnifiedAlert[] = [];

  for (const p of posts) {
    const risk = normalizeRisk(p.risk);
    if (risk === 'alto' || risk === 'critico') {
      alerts.push({
        id: `x_risco_alto:${p.id}`,
        ruleId: ALERT_RULES.x_risco_alto.id,
        nome: ALERT_RULES.x_risco_alto.nome,
        origem: 'x',
        severidade: risk === 'critico' ? 'critico' : 'alto',
        entidade: p.candidate_name || 'Geral',
        titulo: (p.text || 'Post sem texto').slice(0, 120),
        descricao: ALERT_RULES.x_risco_alto.descricao,
        metricaAtual: `risk_level = ${p.risk}`,
        referencia: ALERT_RULES.x_risco_alto.threshold,
        data: p.created_at ?? null,
        url: p.url ?? null,
      });
    } else if ((p.crisisScore ?? 0) > 75) {
      alerts.push({
        id: `x_crise_score_alto:${p.id}`,
        ruleId: ALERT_RULES.x_crise_score_alto.id,
        nome: ALERT_RULES.x_crise_score_alto.nome,
        origem: 'x',
        severidade: 'critico',
        entidade: p.candidate_name || 'Geral',
        titulo: (p.text || 'Post sem texto').slice(0, 120),
        descricao: ALERT_RULES.x_crise_score_alto.descricao,
        metricaAtual: `crisisScore = ${p.crisisScore}`,
        referencia: ALERT_RULES.x_crise_score_alto.threshold,
        data: p.created_at ?? null,
        url: p.url ?? null,
      });
    }
  }

  return alerts;
}

/**
 * Ordena por severidade → recência (mais recente primeiro). Não há campo de
 * "confiança" nos dados reais do projeto, então esse critério (citado como
 * opcional na especificação) não é aplicado.
 */
export function sortAlerts(alerts: UnifiedAlert[]): UnifiedAlert[] {
  return [...alerts].sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[b.severidade] - SEVERITY_ORDER[a.severidade];
    if (sevDiff !== 0) return sevDiff;
    const dateA = a.data ? new Date(a.data).getTime() : 0;
    const dateB = b.data ? new Date(b.data).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Orquestrador: busca os três canais em paralelo (Promise.allSettled — uma
 * falha em um canal não derruba os demais) e aplica as regras da Central de
 * Alertas. Reaproveita os fetchers já existentes e memoizados/filtrados por
 * allowedTargetIds (fetchMencoes tem React.cache(); fetchInstagramData e
 * fetchXData não têm cache por decisão documentada em instagram.ts, e isso é
 * respeitado aqui — cada chamada usa um objeto de filtro próprio).
 */
export async function getUnifiedAlerts(filters: AlertsFilters): Promise<{
  alerts: UnifiedAlert[];
  errors: Array<{ origem: string; message: string }>;
}> {
  if (shouldReturnEmptyForAccess(filters.allowedTargetIds)) {
    return { alerts: [], errors: [] };
  }

  const period = filters.period || 'all';
  const isAllPeriod = period === 'all';
  const daysParam = isAllPeriod ? undefined : period;

  const [noticiasResult, instagramResult, xResult] = await Promise.allSettled([
    fetchMencoes({
      candidateId: filters.target,
      period: isAllPeriod ? undefined : (period === '1' ? '24h' : period === '7' ? '7d' : '30d'),
      allowedTargetIds: filters.allowedTargetIds,
    }),
    fetchInstagramData({
      candidate: filters.target,
      period: daysParam,
      allowedTargetIds: filters.allowedTargetIds,
    }),
    fetchXData({
      candidate: filters.target,
      period: daysParam,
      allowedTargetIds: filters.allowedTargetIds,
    }),
  ]);

  const errors: Array<{ origem: string; message: string }> = [];
  let alerts: UnifiedAlert[] = [];

  if (!filters.type || filters.type === 'noticias') {
    if (noticiasResult.status === 'fulfilled') {
      alerts = alerts.concat(
        evaluateNoticiaItemAlerts(noticiasResult.value),
        evaluateNoticiaAggregateAlerts(noticiasResult.value)
      );
    } else {
      errors.push({ origem: 'noticias', message: String(noticiasResult.reason) });
    }
  }

  if (!filters.type || filters.type === 'instagram') {
    if (instagramResult.status === 'fulfilled') {
      alerts = alerts.concat(evaluateInstagramItemAlerts(instagramResult.value.posts));
    } else {
      errors.push({ origem: 'instagram', message: String(instagramResult.reason) });
    }
  }

  if (!filters.type || filters.type === 'x') {
    if (xResult.status === 'fulfilled') {
      alerts = alerts.concat(evaluateXItemAlerts(xResult.value.posts));
    } else {
      errors.push({ origem: 'x', message: String(xResult.reason) });
    }
  }

  if (filters.severity) {
    alerts = alerts.filter((a) => a.severidade === filters.severity);
  }

  return { alerts: sortAlerts(alerts), errors };
}
