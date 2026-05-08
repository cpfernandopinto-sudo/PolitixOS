import { cache } from 'react'
import { createClient } from '@/lib/supabaseClient'
import type { KPI, GaugeScore, Noticia, MencaoRow } from '@/lib/types/noticias'

// Re-exportações para compatibilidade retroativa (DataTable importa Noticia daqui)
export type { KPI, Noticia }

// ─── Helpers ────────────────────────────────────────────────────────────────

// ai_risk_flags é armazenado como string JSON no banco ("[]", '["flag"]')
// ai_topics/ai_entities são arrays JSON normais — trata os dois casos
function parseJsonField(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string') as string[]
    } catch {
      // silencia parse inválido
    }
  }
  return []
}

function sentimentoLabel(sentiment: number | null): 'positivo' | 'neutro' | 'negativo' {
  if (sentiment === null || sentiment === undefined) return 'neutro'
  if (sentiment > 0) return 'positivo'
  if (sentiment < 0) return 'negativo'
  return 'neutro'
}

// 0 flags → baixo | 1 flag → médio | 2+ flags → alto
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// Retorna a segunda-feira da semana no formato dd/mm
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

// ─── Fetch central com cache React (chamado 1x por render) ──────────────────

const fetchMencoes = cache(async (): Promise<MencaoRow[]> => {
  const client = createClient()
  const { data, error } = await client
    .from('mentions')
    .select(
      'id, hash, published_at, source, title, url, summary, ai_takeaways, ' +
      'ai_sentiment, ai_topics, ai_entities, ai_risk_flags, ' +
      'local_relevance, is_about, candidate_name, city'
    )
    .order('published_at', { ascending: false })

  if (error) {
    console.error('[fetchMencoes]', error.message)
    return []
  }
  return (data ?? []) as unknown as MencaoRow[]
})

// ─── KPIs ────────────────────────────────────────────────────────────────────

export async function getKPIs(): Promise<KPI[]> {
  const rows = await fetchMencoes()
  if (rows.length === 0) return kpisFallback()

  const total = rows.length
  const sobreCandidato = rows.filter((r) => r.is_about === true).length
  const fontes = new Set(rows.map((r) => r.source).filter(Boolean)).size
  const analisados = rows.filter((r) => r.local_relevance !== null)
  const relevanciaMedia =
    analisados.length > 0
      ? analisados.reduce((sum, r) => sum + (r.local_relevance ?? 0), 0) / analisados.length
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
    { title: 'Total de Notícias', value: '—' },
    { title: 'Sobre a Candidata', value: '—' },
    { title: 'Fontes Monitoradas', value: '—' },
    { title: 'Relevância Média', value: '—' },
    { title: 'Alertas Ativos', value: '—' },
  ]
}

// ─── Gauge / Termômetro ──────────────────────────────────────────────────────

export async function getGaugeScore(): Promise<GaugeScore> {
  const rows = await fetchMencoes()
  if (rows.length === 0) return { score: 0, statusText: 'Sem dados', level: 'success' }

  const analisados = rows.filter((r) => r.ai_sentiment !== null)
  const negativos = analisados.filter((r) => (r.ai_sentiment ?? 0) < 0).length
  const comRisco = rows.filter((r) => parseJsonField(r.ai_risk_flags).length > 0).length

  const negativoPct = analisados.length > 0 ? negativos / analisados.length : 0
  const riscoPct = rows.length > 0 ? comRisco / rows.length : 0

  // Score: 60% peso sentimento negativo + 40% peso risco
  const score = Math.min(100, Math.round(negativoPct * 60 + riscoPct * 40))

  let level: GaugeScore['level']
  let statusText: string
  if (score >= 60) {
    level = 'danger'
    statusText = 'Crítico'
  } else if (score >= 30) {
    level = 'warning'
    statusText = 'Atenção'
  } else {
    level = 'success'
    statusText = 'Estável'
  }

  return { score, statusText, level }
}

// ─── Evolução da Relevância no Tempo (agrupada por semana) ──────────────────

export async function getNoticiasPorTempo(): Promise<{ dates: string[]; values: number[] }> {
  const rows = await fetchMencoes()
  const comData = rows.filter((r) => r.published_at && r.local_relevance !== null)
  if (comData.length === 0) return { dates: [], values: [] }

  const weekMap: Record<string, { sum: number; count: number }> = {}
  for (const r of comData) {
    const label = weekLabel(r.published_at!)
    if (!weekMap[label]) weekMap[label] = { sum: 0, count: 0 }
    weekMap[label].sum += r.local_relevance ?? 0
    weekMap[label].count += 1
  }

  // Ordena semanas cronologicamente (formato dd/mm, ano implícito 2026)
  const sorted = Object.entries(weekMap).sort((a, b) => {
    const [da, ma] = a[0].split('/').map(Number)
    const [db, mb] = b[0].split('/').map(Number)
    if (ma !== mb) return ma - mb
    return da - db
  })

  return {
    dates: sorted.map(([k]) => k),
    values: sorted.map(([, v]) => Math.round(v.sum / v.count / 10)), // escala 0–10
  }
}

// ─── Sentimento ──────────────────────────────────────────────────────────────

export async function getSentimento(): Promise<
  { name: string; value: number; itemStyle: { color: string } }[]
> {
  const rows = await fetchMencoes()
  const analisados = rows.filter((r) => r.ai_sentiment !== null)
  if (analisados.length === 0) return sentimentoFallback()

  const positivo = analisados.filter((r) => (r.ai_sentiment ?? 0) > 0).length
  const neutro = analisados.filter((r) => r.ai_sentiment === 0).length
  const negativo = analisados.filter((r) => (r.ai_sentiment ?? 0) < 0).length

  return [
    { name: 'Positivo', value: positivo, itemStyle: { color: '#22C55E' } },
    { name: 'Neutro', value: neutro, itemStyle: { color: '#2563EB' } },
    { name: 'Negativo', value: negativo, itemStyle: { color: '#FF3B3B' } },
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

export async function getFontes(): Promise<{ categories: string[]; values: number[] }> {
  const rows = await fetchMencoes()
  const sources = rows.map((r) => r.source).filter(Boolean) as string[]
  const result = countByKey(sources)
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Riscos por Fonte (top 8 com risk flags) ─────────────────────────────────

export async function getRiscosPorFonte(): Promise<{ categories: string[]; values: number[] }> {
  const rows = await fetchMencoes()
  const comRisco = rows.filter((r) => parseJsonField(r.ai_risk_flags).length > 0)
  const sources = comRisco.map((r) => r.source).filter(Boolean) as string[]
  const result = countByKey(sources)
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Temas Mais Citados (top 8) ───────────────────────────────────────────────

export async function getTemas(): Promise<{ categories: string[]; values: number[] }> {
  const rows = await fetchMencoes()
  const allTopics: string[] = []
  for (const r of rows) {
    allTopics.push(...parseJsonField(r.ai_topics))
  }
  if (allTopics.length === 0) return { categories: [], values: [] }
  const result = countByKey(allTopics)
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Entidades Mais Citadas (top 8) ───────────────────────────────────────────

export async function getEntidades(): Promise<{ categories: string[]; values: number[] }> {
  const rows = await fetchMencoes()
  const allEntities: string[] = []
  for (const r of rows) {
    allEntities.push(...parseJsonField(r.ai_entities))
  }
  if (allEntities.length === 0) return { categories: [], values: [] }
  const result = countByKey(allEntities)
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Riscos Mais Recorrentes (top 8) ──────────────────────────────────────────

export async function getRiscos(): Promise<{ categories: string[]; values: number[] }> {
  const rows = await fetchMencoes()
  const allFlags: string[] = []
  for (const r of rows) {
    allFlags.push(...parseJsonField(r.ai_risk_flags).map(labelRiskFlag))
  }
  if (allFlags.length === 0) return { categories: [], values: [] }
  const result = countByKey(allFlags)
  return { categories: result.categories.slice(0, 8), values: result.values.slice(0, 8) }
}

// ─── Evolução do Risco por Semana ────────────────────────────────────────────

export async function getRiscoTempo(): Promise<{
  dates: string[]
  baixo: number[]
  medio: number[]
  alto: number[]
}> {
  const rows = await fetchMencoes()
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
    if (ma !== mb) return ma - mb
    return da - db
  })

  return {
    dates: sorted.map(([k]) => k),
    baixo: sorted.map(([, v]) => v.baixo),
    medio: sorted.map(([, v]) => v.medio),
    alto: sorted.map(([, v]) => v.alto),
  }
}

// ─── Feed de Notícias (50 mais recentes) ──────────────────────────────────────

export async function getFeedNoticias(): Promise<Noticia[]> {
  const rows = await fetchMencoes()
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
