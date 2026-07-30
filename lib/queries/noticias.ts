import { cache } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { withTiming } from '@/lib/perf/timing'
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
  let allowedCandidateNames: string[] | null = null
  if (filters?.allowedTargetIds !== null && filters?.allowedTargetIds !== undefined) {
    if (filters.allowedTargetIds.length === 0) {
      return []
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

  // ── Filtro de acesso por candidato ─────
  if (allowedCandidateNames !== null) {
    q = q.in('candidate_name', allowedCandidateNames)
  }

  // Filtros Globais
  if (filters?.candidate) q = q.eq('candidate_name', filters.candidate)
  // Se vier candidateId, podemos resolver para nome se necessário, mas mantendo compatibilidade:
  if (filters?.candidateId) {
    const { data: t } = await client.from('targets').select('candidate_name').eq('id', filters.candidateId).single()
    if (t) q = q.eq('candidate_name', t.candidate_name)
  }

  if (filters?.city) q = q.eq('city', filters.city)
  if (filters?.source) q = q.eq('source', filters.source)

  if (filters?.sentiment) {
    if (filters.sentiment === 'positivo') q = q.gt('ai_sentiment', 0)
    else if (filters.sentiment === 'negativo') q = q.lt('ai_sentiment', 0)
    else if (filters.sentiment === 'neutro') q = q.eq('ai_sentiment', 0)
  }

  // Período e Datas
  if (filters?.period && filters.period !== 'custom') {
    const from = new Date()
    if (filters.period === '24h') from.setHours(from.getHours() - 24)
    else if (filters.period === '7d') from.setDate(from.getDate() - 7)
    else if (filters.period === '30d') from.setDate(from.getDate() - 30)
    else {
      const days = parseInt(filters.period, 10)
      if (!isNaN(days)) from.setDate(from.getDate() - days)
    }
    q = q.gte('published_at', from.toISOString())
  } else if (filters?.startDate) {
    q = q.gte('published_at', new Date(filters.startDate).toISOString())
    if (filters.endDate) {
      q = q.lte('published_at', new Date(filters.endDate).toISOString())
    }
  }

  if (filters?.search) {
    const s = filters.search.replace(/%/g, '\\%').replace(/_/g, '\\_')
    q = q.or(`title.ilike.%${s}%,source.ilike.%${s}%,candidate_name.ilike.%${s}%`)
  }

  const { data, error } = await withTiming(
    `fetchMencoes(period=${filters?.period ?? 'all'}, candidate=${filters?.candidate ?? filters?.candidateId ?? '—'})`,
    (): Promise<{ data: MencaoRow[] | null; error: { message: string } | null }> =>
      q.order('published_at', { ascending: false }),
    (r) => r.data?.length ?? 0
  )

  if (error) {
    console.error('[fetchMencoes]', error.message)
    return []
  }
  return (data ?? []) as unknown as MencaoRow[]
})

// ─── KPIs ────────────────────────────────────────────────────────────────────

export function getKPIs(rows: MencaoRow[]): KPI[] {
  if (rows.length === 0) return kpisFallback()

  const total = rows.length
  const fontes = new Set(rows.map((r) => r.source).filter(Boolean)).size
  const analisados = rows.filter((r) => r.local_relevance !== null)
  const relevanciaMedia =
    analisados.length > 0
      ? analisados.reduce((s, r) => s + (r.local_relevance ?? 0), 0) / analisados.length
      : 0
  const alertas = rows.filter((r) => parseJsonField(r.ai_risk_flags).length > 0).length

  // Crescimento 24h
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const prev24h = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  const countLast24h = rows.filter(r => r.published_at && new Date(r.published_at) >= last24h).length
  const countPrev24h = rows.filter(r => r.published_at && new Date(r.published_at) >= prev24h && new Date(r.published_at) < last24h).length

  let growth = 0
  if (countPrev24h > 0) {
    growth = Math.round(((countLast24h - countPrev24h) / countPrev24h) * 100)
  } else if (countLast24h > 0) {
    growth = 100
  }

  return [
    {
      title: 'Alertas Ativos',
      value: alertas,
      status: alertas > 10 ? 'danger' : alertas > 3 ? 'warning' : 'neutral',
    },
    {
      title: 'Crescimento 24h',
      value: `${growth > 0 ? '+' : ''}${growth}%`,
      status: growth > 20 ? 'warning' : 'neutral',
    },
    { title: 'Volume de Menções', value: total, status: 'success' },
    { title: 'Fontes Monitoradas', value: fontes, status: 'warning' },
    {
      title: 'Relevância Média',
      value: `${(relevanciaMedia / 10).toFixed(1)}/10`,
      status: relevanciaMedia >= 80 ? 'success' : relevanciaMedia >= 50 ? 'warning' : 'neutral',
    },
  ]
}

function kpisFallback(): KPI[] {
  return [
    { title: 'Alertas Ativos', value: 0, status: 'danger' },
    { title: 'Crescimento 24h', value: '0%', status: 'neutral' },
    { title: 'Volume de Menções', value: 0, status: 'success' },
    { title: 'Fontes Monitoradas', value: 0, status: 'warning' },
    { title: 'Relevância Média', value: '—/10', status: 'neutral' },
  ]
}

export function getGaugeScore(rows: MencaoRow[]): GaugeScore {
  if (rows.length === 0) return { score: 0, statusText: 'Sem dados', level: 'success' }

  // Fallback: se não houver análise de sentimento, consideramos como 0 (neutro)
  // Para o cálculo do termômetro, focamos em negativos e riscos detectados
  const analisados = rows.filter((r) => r.ai_sentiment !== null)
  const negativos = analisados.filter((r) => (r.ai_sentiment ?? 0) < 0).length

  // Proporção de negativos (se nada analisado, assume base de 5% de ruído)
  const negativoPct = analisados.length > 0 ? negativos / analisados.length : 0.05

  // Risco: flags de IA OU relevância local muito alta (proxy de risco se não houver IA)
  const comRisco = rows.filter((r) => {
    const flags = parseJsonField(r.ai_risk_flags)
    return flags.length > 0 || (r.local_relevance !== null && r.local_relevance > 80)
  }).length

  const riscoPct = rows.length > 0 ? comRisco / rows.length : 0

  // Score final ponderado (60% sentiment, 40% risco)
  const score = Math.min(100, Math.round(negativoPct * 60 + riscoPct * 40))

  let level: GaugeScore['level']
  let statusText: string
  if (score >= 60) { level = 'danger'; statusText = 'Crítico' }
  else if (score >= 30) { level = 'warning'; statusText = 'Atenção' }
  else { level = 'success'; statusText = 'Estável' }

  return { score, statusText, level }
}

// ─── Evolução da Relevância (semanal) ────────────────────────────────────────

export function getNoticiasPorTempo(
  rows: MencaoRow[]
): { dates: string[]; values: number[] } {
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

export function getSentimento(
  rows: MencaoRow[]
): { name: string; value: number; itemStyle: { color: string } }[] {
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

export function getFontes(
  rows: MencaoRow[]
): { categories: string[]; values: number[] } {
  const result = countByKey(rows.map((r) => r.source).filter(Boolean) as string[])
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Riscos por Fonte (top 8) ─────────────────────────────────────────────────

export function getRiscosPorFonte(
  rows: MencaoRow[]
): { categories: string[]; values: number[] } {
  const comRisco = rows.filter((r) => parseJsonField(r.ai_risk_flags).length > 0)
  const result = countByKey(comRisco.map((r) => r.source).filter(Boolean) as string[])
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Temas Mais Citados (top 8) ───────────────────────────────────────────────

export function getTemas(
  rows: MencaoRow[]
): { categories: string[]; values: number[] } {
  const all: string[] = []
  for (const r of rows) all.push(...parseJsonField(r.ai_topics))
  if (all.length === 0) return { categories: [], values: [] }
  const result = countByKey(all)
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Entidades Mais Citadas (top 8) ───────────────────────────────────────────

export function getEntidades(
  rows: MencaoRow[]
): { categories: string[]; values: number[] } {
  const all: string[] = []
  for (const r of rows) all.push(...parseJsonField(r.ai_entities))
  if (all.length === 0) return { categories: [], values: [] }
  const result = countByKey(all)
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Riscos Mais Recorrentes (top 8) ──────────────────────────────────────────

export function getRiscos(
  rows: MencaoRow[]
): { categories: string[]; values: number[] } {
  const all: string[] = []
  for (const r of rows) all.push(...parseJsonField(r.ai_risk_flags).map(labelRiskFlag))
  if (all.length === 0) return { categories: [], values: [] }
  const result = countByKey(all)
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Evolução do Risco por Semana ────────────────────────────────────────────

export function getRiscoTempo(
  rows: MencaoRow[]
): { dates: string[]; baixo: number[]; medio: number[]; alto: number[] } {
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

export function getFeedNoticias(rows: MencaoRow[], limit = 50): Noticia[] {
  return rows.slice(0, limit).map((r): Noticia => {
    const flags = parseJsonField(r.ai_risk_flags)
    return {
      id: r.id || r.hash,
      data: formatDate(r.published_at),
      fonte: r.source ?? '—',
      candidato: r.candidate_name,
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

export function getRealTimeStatus(rows: MencaoRow[]) {
  if (rows.length === 0) return null

  const now = new Date()
  const critical = rows.filter(r => isCrise(parseJsonField(r.ai_risk_flags)))
  const lastCritical = critical[0]

  let timeSinceLastCritical = '—'
  if (lastCritical?.published_at) {
    const diff = now.getTime() - new Date(lastCritical.published_at).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) timeSinceLastCritical = `${minutes}min`
    else timeSinceLastCritical = `${Math.floor(minutes / 60)}h`
  }

  // Fonte mais ativa
  const sourceCounts: Record<string, number> = {}
  rows.forEach(r => { if (r.source) sourceCounts[r.source] = (sourceCounts[r.source] || 0) + 1 })
  const mostActiveSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  // Tema dominante
  const themeCounts: Record<string, number> = {}
  rows.forEach(r => {
    parseJsonField(r.ai_topics).forEach(t => { themeCounts[t] = (themeCounts[t] || 0) + 1 })
  })
  const dominantTheme = Object.entries(themeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  // Velocidade (mensagens por hora na última 6h)
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)
  const recentRows = rows.filter(r => r.published_at && new Date(r.published_at) >= sixHoursAgo)
  const velocity = (recentRows.length / 6).toFixed(1)

  return {
    lastCriticalTitle: lastCritical?.title || 'Nenhuma crise detectada',
    timeSinceLastCritical,
    dominantSource: mostActiveSource,
    dominantTheme,
    mostActiveSource,
    velocity: `${velocity} menções/h`,
    hasRecentPeak: recentRows.length > (rows.length / (24 * 7)) * 12 // Simplificação de pico
  }
}

export function getNegativeThemesPareto(rows: MencaoRow[]) {
  const negativeRows = rows.filter(r => (r.ai_sentiment ?? 0) < 0 || isCrise(parseJsonField(r.ai_risk_flags)))

  const themeCounts: Record<string, number> = {}
  negativeRows.forEach(r => {
    parseJsonField(r.ai_topics).forEach(t => { themeCounts[t] = (themeCounts[t] || 0) + 1 })
  })

  const sorted = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // Pega mais no Pareto para permitir filtro local topN

  const total = sorted.reduce((acc, [, v]) => acc + v, 0)

  return sorted.map(([theme, count]) => ({
    name: theme,
    value: count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0
  }))
}

export function getImpactSources(rows: MencaoRow[]) {
  const sourceImpact: Record<string, number> = {}

  rows.forEach(r => {
    if (!r.source) return
    const riskCount = parseJsonField(r.ai_risk_flags).length
    const impact = (r.local_relevance || 0) * (1 + riskCount) * ((r.ai_sentiment || 0) < 0 ? 1.5 : 1)
    sourceImpact[r.source] = (sourceImpact[r.source] || 0) + impact
  })

  const sorted = Object.entries(sourceImpact)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // Pega mais para filtro local

  const maxImpact = sorted[0]?.[1] || 1

  return sorted.map(([source, impact]) => ({
    name: source,
    score: Math.round((impact / maxImpact) * 100)
  }))
}

export function getCrisisTimeline24h(rows: MencaoRow[]) {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const hours = Array.from({ length: 24 }).map((_, i) => {
    const d = new Date(last24h.getTime() + i * 60 * 60 * 1000)
    return d.getHours().toString().padStart(2, '0') + ':00'
  })

  const hourlyData = hours.map(h => ({
    hour: h,
    risk: 0,
    sentiment: 0,
    count: 0,
    topNews: null as MencaoRow | null
  }))

  rows.filter(r => r.published_at && new Date(r.published_at) >= last24h).forEach(r => {
    const d = new Date(r.published_at!)
    const h = d.getHours().toString().padStart(2, '0') + ':00'
    const idx = hourlyData.findIndex(item => item.hour === h)
    if (idx !== -1) {
      const risk = parseJsonField(r.ai_risk_flags).length
      hourlyData[idx].risk += risk
      hourlyData[idx].sentiment += (r.ai_sentiment || 0)
      hourlyData[idx].count += 1
      if (!hourlyData[idx].topNews || risk > parseJsonField(hourlyData[idx].topNews.ai_risk_flags).length) {
        hourlyData[idx].topNews = r
      }
    }
  })

  return hourlyData.map(d => ({
    ...d,
    status: d.risk > 5 ? 'red' : d.risk > 2 ? 'yellow' : 'green'
  }))
}

// ─── Opções para selects dos filtros ─────────────────────────────────────────

export async function getCandidateOptions(
  allowedTargetIds?: string[] | null
): Promise<{ id: string; name: string }[]> {
  const client = createClient()

  let q = client.from('targets').select('id, candidate_name').order('candidate_name')

  if (allowedTargetIds !== null && allowedTargetIds !== undefined) {
    if (allowedTargetIds.length === 0) return []
    q = q.in('id', allowedTargetIds)
  }

  const { data } = await q
  if (!data) return []
  return data.map((r: { id: string; candidate_name: string }) => ({
    id: r.id,
    name: r.candidate_name
  }))
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

export function getCrisisAlerts(rows: MencaoRow[]): CrisisAlert[] {
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

// Exportação para o Server Component usar inicialmente
export { fetchMencoes }
