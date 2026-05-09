import { cache } from 'react'
import { createClient } from '@/lib/supabaseClient'
import type { KPI, GaugeScore, Noticia, MencaoRow, NoticiasFilters } from '@/lib/types/noticias'

export type { KPI, Noticia }

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseJsonField(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string') as string[]
    } catch { /* ignora parse inválido */ }
  }
  return []
}

function sentimentoLabel(sentiment: number | null): 'positivo' | 'neutro' | 'negativo' {
  if (sentiment === null || sentiment === undefined) return 'neutro'
  if (sentiment > 0) return 'positivo'
  if (sentiment < 0) return 'negativo'
  return 'neutro'
}

function riscoLabel(flags: string[]): 'baixo' | 'médio' | 'alto' {
  if (flags.length === 0) return 'baixo'
  if (flags.length === 1) return 'médio'
  return 'alto'
}

const CRISE_FLAGS = new Set([
  'crise_politica', 'crise_financeira', 'crise_economica',
  'corrupcao', 'crime_acusacao', 'processo_judicial',
  'Gestão de Crise', 'Acusação',
])

function isCrise(flags: string[]): boolean {
  return flags.length >= 2 || flags.some((f) => CRISE_FLAGS.has(f))
}

const RISK_LABELS: Record<string, string> = {
  processo_judicial: 'Processo Judicial',
  crise_politica: 'Crise Política',
  crise_financeira: 'Crise Financeira',
  crise_economica: 'Crise Econômica',
  corrupcao: 'Corrupção',
  acusacao_politica: 'Acusação Política',
  ataque_pessoal: 'Ataque Pessoal',
  desinformacao: 'Desinformação',
  crime_acusacao: 'Crime/Acusação',
  gestao_publica_controversia: 'Gestão Controversa',
  gestao_financeira_critica: 'Gestão Financeira Crítica',
  risco_eleitoral: 'Risco Eleitoral',
  campanha_eleitoral: 'Campanha Eleitoral',
  'Gestão de Crise': 'Gestão de Crise',
  Acusação: 'Acusação',
}

function labelRiskFlag(flag: string): string {
  return RISK_LABELS[flag] || flag
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function weekLabel(iso: string): string {
  const date = new Date(iso)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date)
  monday.setDate(diff)
  return monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function countByKey(items: string[]): { categories: string[]; values: number[] } {
  const counts: Record<string, number> = {}
  for (const k of items) {
    if (k) counts[k] = (counts[k] || 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return {
    categories: sorted.map(([k]) => k),
    values: sorted.map(([, v]) => v),
  }
}

// ─── Fetch central com cache React ──────────────────────────────────────────
// React.cache() deduplica chamadas com o MESMO objeto filters dentro de 1 render.
// Todas as funções de query recebem o mesmo filters ref passado pela page.

const fetchMencoes = cache(async (filters?: NoticiasFilters): Promise<MencaoRow[]> => {
  const client = createClient()

  // ── Resolver allowedTargetIds → candidate_names ───────────────────────────
  // null = admin (sem restrição). Array vazio = sem acesso a nada.
  let allowedCandidateNames: string[] | null = null
  if (filters?.allowedTargetIds !== null && filters?.allowedTargetIds !== undefined) {
    if (filters.allowedTargetIds.length === 0) {
      return [] // usuário sem nenhum target vinculado
    }
    const { data: targetRows } = await client
      .from('targets')
      .select('candidate_name')
      .in('id', filters.allowedTargetIds)
    allowedCandidateNames = (targetRows || []).map((r: { candidate_name: string }) => r.candidate_name)
    if (allowedCandidateNames.length === 0) return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = client
    .from('mentions')
    .select(
      'id, hash, published_at, source, title, url, summary, ai_takeaways, ' +
      'ai_sentiment, ai_topics, ai_entities, ai_risk_flags, ' +
      'local_relevance, is_about, candidate_name, city'
    )

  // ── Filtro de acesso por candidato (server-side, não apenas frontend) ─────
  if (allowedCandidateNames !== null) {
    q = q.in('candidate_name', allowedCandidateNames)
  }

  // Filtros aplicados no Supabase (não em memória)
  if (filters?.candidate) q = q.eq('candidate_name', filters.candidate)
  if (filters?.city) q = q.eq('city', filters.city)
  if (filters?.source) q = q.eq('source', filters.source)

  if (filters?.sentiment) {
    if (filters.sentiment === 'positivo') q = q.gt('ai_sentiment', 0)
    else if (filters.sentiment === 'negativo') q = q.lt('ai_sentiment', 0)
    else if (filters.sentiment === 'neutro') q = q.eq('ai_sentiment', 0)
  }

  if (filters?.period) {
    const days = parseInt(filters.period, 10)
    if (!isNaN(days) && days > 0) {
      const from = new Date()
      from.setDate(from.getDate() - days)
      q = q.gte('published_at', from.toISOString())
    }
  }

  if (filters?.search) {
    // busca parcial em title, source e candidate_name
    const s = filters.search.replace(/%/g, '\\%').replace(/_/g, '\\_')
    q = q.or(
      `title.ilike.%${s}%,source.ilike.%${s}%,candidate_name.ilike.%${s}%`
    )
  }

  const { data, error } = await q.order('published_at', { ascending: false })

  if (error) {
    console.error('[fetchMencoes]', error.message)
    return []
  }
  return (data ?? []) as unknown as MencaoRow[]
})

// ─── KPIs ────────────────────────────────────────────────────────────────────

export async function getKPIs(filters?: NoticiasFilters): Promise<KPI[]> {
  const rows = await fetchMencoes(filters)
  if (rows.length === 0) return kpisFallback()

  const total = rows.length
  const sobreCandidato = rows.filter((r) => r.is_about === true).length
  const fontes = new Set(rows.map((r) => r.source).filter(Boolean)).size
  const analisados = rows.filter((r) => r.local_relevance !== null)
  const relevanciaMedia =
    analisados.length > 0
      ? analisados.reduce((s, r) => s + (r.local_relevance ?? 0), 0) / analisados.length
      : 0
  const alertas = rows.filter((r) => parseJsonField(r.ai_risk_flags).length > 0).length

  return [
    { title: 'Total de Notícias', value: total },
    { title: 'Sobre a Candidata', value: sobreCandidato },
    { title: 'Fontes Monitoradas', value: fontes },
    {
      title: 'Relevância Média',
      value: `${(relevanciaMedia / 10).toFixed(1)}/10`,
      status: relevanciaMedia >= 80 ? 'success' : relevanciaMedia >= 50 ? 'warning' : 'neutral',
    },
    {
      title: 'Alertas Ativos',
      value: alertas,
      status: alertas > 10 ? 'danger' : alertas > 3 ? 'warning' : 'neutral',
    },
  ]
}

function kpisFallback(): KPI[] {
  return [
    { title: 'Total de Notícias', value: 0 },
    { title: 'Sobre a Candidata', value: 0 },
    { title: 'Fontes Monitoradas', value: 0 },
    { title: 'Relevância Média', value: '—/10' },
    { title: 'Alertas Ativos', value: 0 },
  ]
}

// ─── Gauge ───────────────────────────────────────────────────────────────────

export async function getGaugeScore(filters?: NoticiasFilters): Promise<GaugeScore> {
  const rows = await fetchMencoes(filters)
  if (rows.length === 0) return { score: 0, statusText: 'Sem dados', level: 'success' }

  const analisados = rows.filter((r) => r.ai_sentiment !== null)
  const negativos = analisados.filter((r) => (r.ai_sentiment ?? 0) < 0).length
  const comRisco = rows.filter((r) => parseJsonField(r.ai_risk_flags).length > 0).length

  const negativoPct = analisados.length > 0 ? negativos / analisados.length : 0
  const riscoPct = rows.length > 0 ? comRisco / rows.length : 0
  const score = Math.min(100, Math.round(negativoPct * 60 + riscoPct * 40))

  let level: GaugeScore['level']
  let statusText: string
  if (score >= 60) { level = 'danger'; statusText = 'Crítico' }
  else if (score >= 30) { level = 'warning'; statusText = 'Atenção' }
  else { level = 'success'; statusText = 'Estável' }

  return { score, statusText, level }
}

// ─── Evolução da Relevância (semanal) ────────────────────────────────────────

export async function getNoticiasPorTempo(
  filters?: NoticiasFilters
): Promise<{ dates: string[]; values: number[] }> {
  const rows = await fetchMencoes(filters)
  const comData = rows.filter((r) => r.published_at && r.local_relevance !== null)
  if (comData.length === 0) return { dates: [], values: [] }

  const weekMap: Record<string, { sum: number; count: number }> = {}
  for (const r of comData) {
    const label = weekLabel(r.published_at!)
    if (!weekMap[label]) weekMap[label] = { sum: 0, count: 0 }
    weekMap[label].sum += r.local_relevance ?? 0
    weekMap[label].count += 1
  }

  const sorted = Object.entries(weekMap).sort((a, b) => {
    const [da, ma] = a[0].split('/').map(Number)
    const [db, mb] = b[0].split('/').map(Number)
    return ma !== mb ? ma - mb : da - db
  })

  return {
    dates: sorted.map(([k]) => k),
    values: sorted.map(([, v]) => Math.round(v.sum / v.count / 10)),
  }
}

// ─── Sentimento ───────────────────────────────────────────────────────────────

export async function getSentimento(
  filters?: NoticiasFilters
): Promise<{ name: string; value: number; itemStyle: { color: string } }[]> {
  const rows = await fetchMencoes(filters)
  const analisados = rows.filter((r) => r.ai_sentiment !== null)
  if (analisados.length === 0) return sentimentoFallback()

  return [
    { name: 'Positivo', value: analisados.filter((r) => (r.ai_sentiment ?? 0) > 0).length, itemStyle: { color: '#22C55E' } },
    { name: 'Neutro', value: analisados.filter((r) => r.ai_sentiment === 0).length, itemStyle: { color: '#2563EB' } },
    { name: 'Negativo', value: analisados.filter((r) => (r.ai_sentiment ?? 0) < 0).length, itemStyle: { color: '#FF3B3B' } },
  ]
}

function sentimentoFallback() {
  return [
    { name: 'Positivo', value: 0, itemStyle: { color: '#22C55E' } },
    { name: 'Neutro', value: 0, itemStyle: { color: '#2563EB' } },
    { name: 'Negativo', value: 0, itemStyle: { color: '#FF3B3B' } },
  ]
}

// ─── Volume por Fonte (top 8) ─────────────────────────────────────────────────

export async function getFontes(
  filters?: NoticiasFilters
): Promise<{ categories: string[]; values: number[] }> {
  const rows = await fetchMencoes(filters)
  const result = countByKey(rows.map((r) => r.source).filter(Boolean) as string[])
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Riscos por Fonte (top 8) ─────────────────────────────────────────────────

export async function getRiscosPorFonte(
  filters?: NoticiasFilters
): Promise<{ categories: string[]; values: number[] }> {
  const rows = await fetchMencoes(filters)
  const comRisco = rows.filter((r) => parseJsonField(r.ai_risk_flags).length > 0)
  const result = countByKey(comRisco.map((r) => r.source).filter(Boolean) as string[])
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Temas Mais Citados (top 8) ───────────────────────────────────────────────

export async function getTemas(
  filters?: NoticiasFilters
): Promise<{ categories: string[]; values: number[] }> {
  const rows = await fetchMencoes(filters)
  const all: string[] = []
  for (const r of rows) all.push(...parseJsonField(r.ai_topics))
  if (all.length === 0) return { categories: [], values: [] }
  const result = countByKey(all)
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Entidades Mais Citadas (top 8) ───────────────────────────────────────────

export async function getEntidades(
  filters?: NoticiasFilters
): Promise<{ categories: string[]; values: number[] }> {
  const rows = await fetchMencoes(filters)
  const all: string[] = []
  for (const r of rows) all.push(...parseJsonField(r.ai_entities))
  if (all.length === 0) return { categories: [], values: [] }
  const result = countByKey(all)
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Riscos Mais Recorrentes (top 8) ──────────────────────────────────────────

export async function getRiscos(
  filters?: NoticiasFilters
): Promise<{ categories: string[]; values: number[] }> {
  const rows = await fetchMencoes(filters)
  const all: string[] = []
  for (const r of rows) all.push(...parseJsonField(r.ai_risk_flags).map(labelRiskFlag))
  if (all.length === 0) return { categories: [], values: [] }
  const result = countByKey(all)
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Evolução do Risco por Semana ────────────────────────────────────────────

export async function getRiscoTempo(
  filters?: NoticiasFilters
): Promise<{ dates: string[]; baixo: number[]; medio: number[]; alto: number[] }> {
  const rows = await fetchMencoes(filters)
  const comData = rows.filter((r) => r.published_at)
  if (comData.length === 0) return { dates: [], baixo: [], medio: [], alto: [] }

  const weekMap: Record<string, { baixo: number; medio: number; alto: number }> = {}
  for (const r of comData) {
    const label = weekLabel(r.published_at!)
    if (!weekMap[label]) weekMap[label] = { baixo: 0, medio: 0, alto: 0 }
    const nivel = riscoLabel(parseJsonField(r.ai_risk_flags))
    if (nivel === 'baixo') weekMap[label].baixo += 1
    else if (nivel === 'médio') weekMap[label].medio += 1
    else weekMap[label].alto += 1
  }

  const sorted = Object.entries(weekMap).sort((a, b) => {
    const [da, ma] = a[0].split('/').map(Number)
    const [db, mb] = b[0].split('/').map(Number)
    return ma !== mb ? ma - mb : da - db
  })

  return {
    dates: sorted.map(([k]) => k),
    baixo: sorted.map(([, v]) => v.baixo),
    medio: sorted.map(([, v]) => v.medio),
    alto: sorted.map(([, v]) => v.alto),
  }
}

// ─── Feed de Notícias (50 mais recentes) ──────────────────────────────────────

export async function getFeedNoticias(filters?: NoticiasFilters): Promise<Noticia[]> {
  const rows = await fetchMencoes(filters)
  return rows.slice(0, 50).map((r): Noticia => {
    const flags = parseJsonField(r.ai_risk_flags)
    return {
      id: r.id || r.hash,
      data: formatDate(r.published_at),
      fonte: r.source ?? '—',
      titulo: r.title ?? 'Sem título',
      resumo: r.ai_takeaways ?? r.summary ?? r.title ?? '—',
      link: r.url ?? '#',
      sentimento: sentimentoLabel(r.ai_sentiment),
      risco: riscoLabel(flags),
      crise: isCrise(flags),
      relevancia: r.local_relevance !== null ? r.local_relevance / 10 : 0,
    }
  })
}

// ─── Opções para selects dos filtros ─────────────────────────────────────────

export async function getCandidateOptions(): Promise<string[]> {
  const client = createClient()
  const { data } = await client
    .from('mentions')
    .select('candidate_name')
    .not('candidate_name', 'is', null)
  if (!data) return []
  return [...new Set(data.map((r) => r.candidate_name as string))].sort()
}

export async function getCityOptions(): Promise<string[]> {
  const client = createClient()
  const { data } = await client
    .from('mentions')
    .select('city')
    .not('city', 'is', null)
  if (!data) return []
  return [...new Set(data.map((r) => r.city as string))].sort()
}

export async function getSourceOptions(): Promise<string[]> {
  const client = createClient()
  const { data } = await client
    .from('mentions')
    .select('source')
    .not('source', 'is', null)
  if (!data) return []
  return [...new Set(data.map((r) => r.source as string))].sort()
}

// ─── Alertas de Crise ─────────────────────────────────────────────────────────

export interface CrisisAlert {
  tipo: 'volume' | 'sentimento' | 'risco';
  nivel: 'alto' | 'critico';
  mensagem: string;
}

export async function getCrisisAlerts(filters?: NoticiasFilters): Promise<CrisisAlert[]> {
  const rows = await fetchMencoes(filters)

  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const rows24h = rows.filter((r) => r.published_at && new Date(r.published_at) >= last24h)
  const rows7d = rows.filter((r) => r.published_at && new Date(r.published_at) >= last7d && new Date(r.published_at) < last24h)

  const alerts: CrisisAlert[] = []

  // Regra 1: Volume > média dos últimos 7 dias * 1.5
  const volume24h = rows24h.length
  const avg7d = rows7d.length / 7
  if (avg7d > 0 && volume24h > avg7d * 1.5) {
    alerts.push({
      tipo: 'volume',
      nivel: 'alto',
      mensagem: 'Aumento anormal de menções nas últimas 24h',
    })
  }

  // Regra 2: Sentimento negativo > 40%
  if (rows24h.length > 0) {
    const analisados = rows24h.filter((r) => r.ai_sentiment !== null)
    const negativos = analisados.filter((r) => (r.ai_sentiment ?? 0) < 0).length
    const pctNegativo = analisados.length > 0 ? (negativos / analisados.length) * 100 : 0

    if (pctNegativo > 40) {
      alerts.push({
        tipo: 'sentimento',
        nivel: 'alto',
        mensagem: 'Alto volume de notícias negativas',
      })
    }
  }

  // Regra 3: Risco (mais de 3 notícias com tema crítico)
  const criticos = rows24h.filter((r) => {
    const flags = parseJsonField(r.ai_risk_flags)
    return isCrise(flags) || flags.some((f) => CRISE_FLAGS.has(f))
  })

  if (criticos.length > 3) {
    alerts.push({
      tipo: 'risco',
      nivel: 'critico',
      mensagem: 'Múltiplas citações a temas sensíveis',
    })
  }

  return alerts
}
