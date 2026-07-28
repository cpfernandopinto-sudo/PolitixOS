/**
 * Funções puras que compõem a síntese executiva da Visão Geral (Sprint 3).
 *
 * Nenhuma função aqui faz I/O — todas recebem dados já buscados (pelo
 * fetchOverviewData cacheado em lib/queries/overview.ts) e devolvem
 * estruturas prontas para os componentes renderizarem. Isso é o que torna
 * tudo aqui testável sem mock de Supabase.
 *
 * Regra do projeto: todo campo pode ser `null` quando não houver dado
 * confiável — nunca fabricar um valor para preencher a lacuna.
 */

import { OPPORTUNITY_RULES } from '@/lib/config/opportunity-thresholds';
import type { UnifiedAlert } from '@/lib/queries/alerts';
import type { AlertSeverity } from '@/lib/config/alert-thresholds';
import type { PoliticalStatusResult } from './political-status';

// ─── Evidências ───────────────────────────────────────────────────────────

export interface EvidenceRef {
  tipo: 'alerta' | 'noticia' | 'post' | 'tema' | 'entidade';
  id: string;
  url: string | null;
  descricao: string;
}

// ─── Divisão de período (reaproveita a técnica já usada em calculateTrend) ─

/**
 * Divide uma lista de itens em "período atual" e "período anterior" com a
 * MESMA técnica já usada em lib/queries/overview.ts#calculateTrend:
 * - period 'all' (ou vazio): divide o intervalo observado ao meio.
 * - period numérico (dias): compara os últimos N dias com os N dias
 *   imediatamente anteriores.
 *
 * Retorna `previous: []` quando não há base real de comparação (menos de
 * 2 timestamps válidos) — nunca inventa uma janela anterior.
 */
export function splitByPeriod<T>(
  items: T[],
  getTimestamp: (item: T) => number | null,
  period: string | null | undefined
): { current: T[]; previous: T[] } {
  const timestamps = items.map(getTimestamp).filter((t): t is number => t !== null);
  if (timestamps.length < 2) return { current: items, previous: [] };

  if (!period || period === 'all') {
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    if (max <= min) return { current: items, previous: [] };
    const midpoint = min + (max - min) / 2;
    return {
      current: items.filter((i) => {
        const t = getTimestamp(i);
        return t !== null && t >= midpoint;
      }),
      previous: items.filter((i) => {
        const t = getTimestamp(i);
        return t !== null && t < midpoint;
      }),
    };
  }

  const days = parseInt(period, 10);
  if (isNaN(days) || days <= 0) return { current: items, previous: [] };

  const now = Date.now();
  const periodMs = days * 24 * 60 * 60 * 1000;
  const currentStart = now - periodMs;
  const previousStart = currentStart - periodMs;

  return {
    current: items.filter((i) => {
      const t = getTimestamp(i);
      return t !== null && t >= currentStart && t <= now;
    }),
    previous: items.filter((i) => {
      const t = getTimestamp(i);
      return t !== null && t >= previousStart && t < currentStart;
    }),
  };
}

// ─── Sentimento agregado (para comparação de janelas) ──────────────────────

export interface SentimentWindowStats {
  total: number;
  positivoCount: number;
  negativoCount: number;
  positivoShare: number;
  negativoShare: number;
}

interface NoticiaSentimentSource {
  ai_sentiment: number | null;
}
interface PostSentimentSource {
  sentiment?: string | null;
}

export function computeSentimentShares(
  noticias: NoticiaSentimentSource[],
  instagramPosts: PostSentimentSource[],
  xPosts: PostSentimentSource[]
): SentimentWindowStats {
  let total = 0;
  let positivo = 0;
  let negativo = 0;

  noticias.forEach((n) => {
    if (n.ai_sentiment === null || n.ai_sentiment === undefined) return;
    total++;
    if (n.ai_sentiment > 0) positivo++;
    else if (n.ai_sentiment < 0) negativo++;
  });

  const bumpPost = (p: PostSentimentSource) => {
    const s = p.sentiment?.toLowerCase();
    if (!s || s === 'sem análise') return;
    total++;
    if (s === 'positivo') positivo++;
    else if (s === 'negativo') negativo++;
  };
  instagramPosts.forEach(bumpPost);
  xPosts.forEach(bumpPost);

  return {
    total,
    positivoCount: positivo,
    negativoCount: negativo,
    positivoShare: total > 0 ? positivo / total : 0,
    negativoShare: total > 0 ? negativo / total : 0,
  };
}

// ─── Riscos ─────────────────────────────────────────────────────────────────

export interface RiskCard {
  id: string;
  tipo: string;
  entidade: string;
  descricao: string;
  metricaAtual: string;
  referencia: string;
  periodo: string;
  severidade: AlertSeverity;
  evidencia: EvidenceRef | null;
}

/** Deriva os cards de risco a partir dos alertas unificados já ordenados. */
export function deriveRisksFromAlerts(alerts: UnifiedAlert[], limit = 3): RiskCard[] {
  return alerts
    .filter((a) => a.severidade === 'critico' || a.severidade === 'alto')
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      tipo: a.nome,
      entidade: a.entidade,
      descricao: a.titulo,
      metricaAtual: a.metricaAtual,
      referencia: a.referencia,
      periodo: 'Período selecionado',
      severidade: a.severidade,
      evidencia: a.url ? { tipo: 'alerta', id: a.id, url: a.url, descricao: a.titulo } : null,
    }));
}

export function selectPrimaryRisk(risks: RiskCard[]): RiskCard | null {
  return risks[0] ?? null;
}

// ─── Oportunidades ──────────────────────────────────────────────────────────

export interface OpportunityCard {
  id: string;
  tipo: string;
  entidade: string;
  descricao: string;
  metricaAtual: string;
  referencia: string;
  periodo: string;
  prioridade: 'alta' | 'media';
  evidencia: EvidenceRef | null;
}

const OPPORTUNITY_SHARE_DELTA_THRESHOLD = 0.1; // 10 pontos percentuais
const OPPORTUNITY_TOP_N_EXPOSURE = 3;

export function evaluateOpportunities(
  current: SentimentWindowStats,
  previous: SentimentWindowStats | null,
  topEntities: EntityRankItem[],
  limit = 3
): OpportunityCard[] {
  const opportunities: OpportunityCard[] = [];

  if (previous && previous.total > 0 && current.total > 0) {
    const negDelta = current.negativoShare - previous.negativoShare;
    if (negDelta <= -OPPORTUNITY_SHARE_DELTA_THRESHOLD) {
      const rule = OPPORTUNITY_RULES.queda_negatividade;
      opportunities.push({
        id: rule.id,
        tipo: rule.nome,
        entidade: 'Geral',
        descricao: rule.descricao,
        metricaAtual: `${Math.round(current.negativoShare * 100)}% de menções negativas`,
        referencia: `${Math.round(previous.negativoShare * 100)}% no período anterior`,
        periodo: 'Período atual vs. período anterior',
        prioridade: 'alta',
        evidencia: null,
      });
    }

    const posDelta = current.positivoShare - previous.positivoShare;
    if (posDelta >= OPPORTUNITY_SHARE_DELTA_THRESHOLD) {
      const rule = OPPORTUNITY_RULES.crescimento_sentimento_positivo;
      opportunities.push({
        id: rule.id,
        tipo: rule.nome,
        entidade: 'Geral',
        descricao: rule.descricao,
        metricaAtual: `${Math.round(current.positivoShare * 100)}% de menções positivas`,
        referencia: `${Math.round(previous.positivoShare * 100)}% no período anterior`,
        periodo: 'Período atual vs. período anterior',
        prioridade: 'alta',
        evidencia: null,
      });
    }
  }

  const rule = OPPORTUNITY_RULES.alta_exposicao_baixo_risco;
  topEntities
    .slice(0, OPPORTUNITY_TOP_N_EXPOSURE)
    .filter((e) => e.alertas === 0 && (e.riscoPredominante === null || e.riscoPredominante === 'baixo'))
    .forEach((e) => {
      opportunities.push({
        id: `${rule.id}:${e.nome}`,
        tipo: rule.nome,
        entidade: e.nome,
        descricao: rule.descricao,
        metricaAtual: `${e.volume} menções, 0 alertas`,
        referencia: 'Top 3 em volume, sem alertas críticos/altos',
        periodo: 'Período selecionado',
        prioridade: 'media',
        evidencia: null,
      });
    });

  return opportunities.slice(0, limit);
}

export function selectPrimaryOpportunity(opportunities: OpportunityCard[]): OpportunityCard | null {
  return opportunities[0] ?? null;
}

// ─── Mudanças relevantes (Key Changes) ─────────────────────────────────────

export interface KeyChange {
  id: string;
  label: string;
  metrica: string;
  valorAtual: number;
  valorAnterior: number;
  diferencaAbsoluta: number;
  diferencaPercentual: number;
  periodo: string;
  interpretacao: 'favoravel' | 'desfavoravel' | 'neutro';
}

const KEY_CHANGE_SHARE_DELTA_THRESHOLD = 0.05; // 5 pontos percentuais

/**
 * Só gera uma mudança quando há comparação real (`previous` com dados).
 * Sem isso, retorna lista vazia — nunca mostra "0%" fabricado.
 */
export function selectKeyChanges(
  current: SentimentWindowStats,
  previous: SentimentWindowStats | null,
  volumeTrend: { direcao: 'up' | 'down' | 'stable'; variacaoPercentual: number } | null
): KeyChange[] {
  const changes: KeyChange[] = [];

  if (volumeTrend && volumeTrend.direcao !== 'stable') {
    changes.push({
      id: 'volume',
      label: 'Volume de menções',
      metrica: 'variação percentual de volume',
      valorAtual: volumeTrend.variacaoPercentual,
      valorAnterior: 0,
      diferencaAbsoluta: volumeTrend.variacaoPercentual,
      diferencaPercentual: volumeTrend.variacaoPercentual / 100,
      periodo: 'Período atual vs. período anterior',
      // Volume subir ou cair não é intrinsecamente bom ou ruim — depende do
      // contexto (mais cobertura pode ser positiva ou negativa).
      interpretacao: 'neutro',
    });
  }

  if (previous && previous.total > 0 && current.total > 0) {
    const negDelta = current.negativoShare - previous.negativoShare;
    if (Math.abs(negDelta) >= KEY_CHANGE_SHARE_DELTA_THRESHOLD) {
      changes.push({
        id: 'sentimento_negativo',
        label: 'Sentimento negativo',
        metrica: '% de menções negativas',
        valorAtual: Math.round(current.negativoShare * 100),
        valorAnterior: Math.round(previous.negativoShare * 100),
        diferencaAbsoluta: Math.round((current.negativoShare - previous.negativoShare) * 100),
        diferencaPercentual: negDelta,
        periodo: 'Período atual vs. período anterior',
        // Aumento de menções negativas é desfavorável; redução é favorável.
        interpretacao: negDelta > 0 ? 'desfavoravel' : 'favoravel',
      });
    }

    const posDelta = current.positivoShare - previous.positivoShare;
    if (Math.abs(posDelta) >= KEY_CHANGE_SHARE_DELTA_THRESHOLD) {
      changes.push({
        id: 'sentimento_positivo',
        label: 'Sentimento positivo',
        metrica: '% de menções positivas',
        valorAtual: Math.round(current.positivoShare * 100),
        valorAnterior: Math.round(previous.positivoShare * 100),
        diferencaAbsoluta: Math.round((current.positivoShare - previous.positivoShare) * 100),
        diferencaPercentual: posDelta,
        periodo: 'Período atual vs. período anterior',
        interpretacao: posDelta > 0 ? 'favoravel' : 'desfavoravel',
      });
    }
  }

  return changes;
}

// ─── Ranking de entidades e temas ──────────────────────────────────────────

export interface EntityRankItem {
  nome: string;
  volume: number;
  sentimentoPredominante: string | null;
  riscoPredominante: string | null;
  alertas: number;
  temaPrincipal: string | null;
  /**
   * ID do target (para permitir filtrar a Visão Geral pela entidade).
   * Só disponível quando a entidade tem posts de Instagram/X vinculados
   * a um `target_id` — notícias não carregam esse ID, então entidades
   * conhecidas apenas por notícias ficam com `targetId: null` (sem ação
   * de filtro fabricada).
   */
  targetId: string | null;
}

interface NoticiaEntitySource {
  candidate_name: string | null;
  ai_sentiment: number | null;
  local_relevance: number | null;
  ai_topics: unknown;
}
interface PostEntitySource {
  candidate_name?: string | null;
  sentiment?: string | null;
  risk?: string | null;
  topic?: string | null;
  target_id?: string | null;
}

function parseTopicsField(value: unknown): string[] {
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

function pickMostFrequent(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Ranqueia entidades (candidatos/targets) por volume de menções, cruzando
 * notícias + Instagram + X + contagem de alertas. Não faz nenhuma consulta —
 * opera sobre os dados que a Visão Geral já buscou.
 */
export function rankEntities(
  noticias: NoticiaEntitySource[],
  instagramPosts: PostEntitySource[],
  xPosts: PostEntitySource[],
  alerts: UnifiedAlert[],
  limit = 5
): EntityRankItem[] {
  const byEntity = new Map<
    string,
    { volume: number; sentimentCounts: Record<string, number>; riskCounts: Record<string, number>; topicCounts: Record<string, number>; targetId: string | null }
  >();

  const bump = (name: string | null | undefined, sentiment: string | null, risk: string | null, topic: string | null, targetId?: string | null) => {
    if (!name || name === '—' || name === 'Geral') return;
    if (!byEntity.has(name)) byEntity.set(name, { volume: 0, sentimentCounts: {}, riskCounts: {}, topicCounts: {}, targetId: null });
    const entry = byEntity.get(name)!;
    entry.volume++;
    if (sentiment) entry.sentimentCounts[sentiment] = (entry.sentimentCounts[sentiment] || 0) + 1;
    if (risk) entry.riskCounts[risk] = (entry.riskCounts[risk] || 0) + 1;
    if (topic) entry.topicCounts[topic] = (entry.topicCounts[topic] || 0) + 1;
    if (targetId && !entry.targetId) entry.targetId = targetId;
  };

  noticias.forEach((n) => {
    const sentiment = n.ai_sentiment === null ? null : n.ai_sentiment > 0 ? 'positivo' : n.ai_sentiment < 0 ? 'negativo' : 'neutro';
    const risk = n.local_relevance === null ? null : n.local_relevance > 80 ? 'alto' : n.local_relevance > 40 ? 'medio' : 'baixo';
    const topics = parseTopicsField(n.ai_topics);
    bump(n.candidate_name, sentiment, risk, topics[0] ?? null);
  });

  const bumpPost = (p: PostEntitySource) =>
    bump(p.candidate_name, p.sentiment?.toLowerCase() || null, p.risk?.toLowerCase() || null, p.topic || null, p.target_id);
  instagramPosts.forEach(bumpPost);
  xPosts.forEach(bumpPost);

  const alertCounts = new Map<string, number>();
  alerts.forEach((a) => {
    if (a.entidade && a.entidade !== 'Geral') alertCounts.set(a.entidade, (alertCounts.get(a.entidade) || 0) + 1);
  });

  return Array.from(byEntity.entries())
    .map(([nome, data]) => ({
      nome,
      volume: data.volume,
      sentimentoPredominante: pickMostFrequent(data.sentimentCounts),
      riscoPredominante: pickMostFrequent(data.riskCounts),
      alertas: alertCounts.get(nome) || 0,
      temaPrincipal: pickMostFrequent(data.topicCounts),
      targetId: data.targetId,
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

export interface ThemeRankItem {
  tema: string;
  frequencia: number;
  sentimento: number;
}

/** Reordena/limita os temas já calculados por getDominantTopics — não recalcula frequência. */
export function rankThemes(topics: ThemeRankItem[], limit = 5): ThemeRankItem[] {
  return [...topics].sort((a, b) => b.frequencia - a.frequencia).slice(0, limit);
}

// ─── Síntese executiva ──────────────────────────────────────────────────────

export interface ExecutiveSynthesisField<T = string> {
  valor: T | null;
  justificativa: string;
  evidenceRefs: EvidenceRef[];
  limitacoes?: string;
  semDados: boolean;
}

export interface ExecutiveSynthesis {
  estadoGeral: ExecutiveSynthesisField;
  principalRisco: ExecutiveSynthesisField;
  principalOportunidade: ExecutiveSynthesisField;
  temaEmDestaque: ExecutiveSynthesisField;
  maiorExposicao: ExecutiveSynthesisField;
  mudancaRelevante: ExecutiveSynthesisField;
}

/**
 * Compõe a síntese executiva final. Determinística: a mesma entrada sempre
 * produz a mesma saída (sem `Date.now()`/`Math.random()` aqui dentro).
 */
export function composeExecutiveSynthesis(input: {
  politicalStatus: PoliticalStatusResult;
  risks: RiskCard[];
  opportunities: OpportunityCard[];
  themes: ThemeRankItem[];
  entities: EntityRankItem[];
  keyChanges: KeyChange[];
}): ExecutiveSynthesis {
  const { politicalStatus, risks, opportunities, themes, entities, keyChanges } = input;

  const estadoGeral: ExecutiveSynthesisField = politicalStatus.semDados
    ? { valor: null, justificativa: politicalStatus.justificativa, evidenceRefs: [], semDados: true }
    : { valor: politicalStatus.label, justificativa: politicalStatus.justificativa, evidenceRefs: [], semDados: false };

  const topRisk = selectPrimaryRisk(risks);
  const principalRisco: ExecutiveSynthesisField = topRisk
    ? {
        valor: `${topRisk.entidade}: ${topRisk.descricao}`,
        justificativa: `${topRisk.metricaAtual} (referência: ${topRisk.referencia}).`,
        evidenceRefs: topRisk.evidencia ? [topRisk.evidencia] : [],
        semDados: false,
      }
    : { valor: null, justificativa: 'Nenhum risco prioritário identificado no período e filtros selecionados.', evidenceRefs: [], semDados: true };

  const topOpportunity = selectPrimaryOpportunity(opportunities);
  const principalOportunidade: ExecutiveSynthesisField = topOpportunity
    ? {
        valor: `${topOpportunity.entidade}: ${topOpportunity.descricao}`,
        justificativa: `${topOpportunity.metricaAtual} (referência: ${topOpportunity.referencia}).`,
        evidenceRefs: topOpportunity.evidencia ? [topOpportunity.evidencia] : [],
        semDados: false,
      }
    : { valor: null, justificativa: 'Nenhuma oportunidade com regra objetiva identificada no período e filtros selecionados.', evidenceRefs: [], semDados: true };

  const topTheme = themes[0] ?? null;
  const temaEmDestaque: ExecutiveSynthesisField = topTheme
    ? {
        valor: topTheme.tema,
        justificativa: `${topTheme.frequencia} menções no período — maior volume entre os temas identificados.`,
        evidenceRefs: [],
        limitacoes: 'Reflete apenas volume no período atual; crescimento do tema não é mensurável nesta versão.',
        semDados: false,
      }
    : { valor: null, justificativa: 'Nenhum tema identificado no período e filtros selecionados.', evidenceRefs: [], semDados: true };

  const topEntity = entities[0] ?? null;
  const maiorExposicao: ExecutiveSynthesisField = topEntity
    ? {
        valor: topEntity.nome,
        justificativa: `${topEntity.volume} menções no período — maior volume entre as entidades monitoradas.`,
        evidenceRefs: [],
        semDados: false,
      }
    : { valor: null, justificativa: 'Nenhuma entidade identificada no período e filtros selecionados.', evidenceRefs: [], semDados: true };

  const topChange = keyChanges[0] ?? null;
  const mudancaRelevante: ExecutiveSynthesisField = topChange
    ? {
        valor: `${topChange.label} ${topChange.diferencaAbsoluta > 0 ? 'aumentou' : 'caiu'} ${Math.abs(topChange.diferencaAbsoluta)} pontos percentuais`,
        justificativa: `${topChange.metrica}: ${topChange.valorAnterior} → ${topChange.valorAtual} (${topChange.periodo}).`,
        evidenceRefs: [],
        semDados: false,
      }
    : { valor: null, justificativa: 'Sem comparação temporal real disponível para o período selecionado.', evidenceRefs: [], semDados: true };

  return { estadoGeral, principalRisco, principalOportunidade, temaEmDestaque, maiorExposicao, mudancaRelevante };
}
