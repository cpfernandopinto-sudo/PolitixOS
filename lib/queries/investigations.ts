import { createAdminClient } from '@/lib/supabaseClient'
import type {
  Investigation,
  InvestigationSource,
  InvestigationEntity,
  InvestigationTimeline,
  InvestigationQuery,
} from '@/lib/types/investigations'

export async function getInvestigations(): Promise<Investigation[]> {
  const client = createAdminClient()
  const { data, error } = await client
    .from('investigations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Investigação] Erro ao buscar investigações:', error.message)
    return []
  }
  return (data ?? []) as Investigation[]
}

export async function getInvestigationById(id: string): Promise<Investigation | null> {
  const client = createAdminClient()
  console.info('[Investigação] Buscando dossiê por id:', id)
  const { data, error } = await client
    .from('investigations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[Investigação] Erro Supabase ao buscar investigação:', {
      id,
      message: error.message,
      code: error.code,
    })
    return null
  }
  console.info('[Investigação] Resultado da consulta investigations:', {
    id: data?.id,
    status: data?.status,
    hasExecutiveSummary: Boolean(data?.executive_summary),
    hasFullReport: data?.full_report != null,
  })
  return data as Investigation
}

export async function getInvestigationSources(investigationId: string): Promise<InvestigationSource[]> {
  const client = createAdminClient()
  const { data, error } = await client
    .from('investigation_sources')
    .select('*')
    .eq('investigation_id', investigationId)
    .order('relevance_score', { ascending: false })

  if (error) {
    console.error('[Investigação] Erro ao buscar fontes:', error.message)
    return []
  }
  return (data ?? []) as InvestigationSource[]
}

export async function getInvestigationEntities(investigationId: string): Promise<InvestigationEntity[]> {
  const client = createAdminClient()
  const { data, error } = await client
    .from('investigation_entities')
    .select('*')
    .eq('investigation_id', investigationId)

  if (error) {
    console.error('[Investigação] Erro ao buscar entidades:', error.message)
    return []
  }
  return (data ?? []) as InvestigationEntity[]
}

export async function getInvestigationTimeline(investigationId: string): Promise<InvestigationTimeline[]> {
  const client = createAdminClient()
  const { data, error } = await client
    .from('investigation_timeline')
    .select('*')
    .eq('investigation_id', investigationId)
    .order('event_datetime', { ascending: true, nullsFirst: false })
    .order('event_date', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('[Investigação] Erro ao buscar linha do tempo:', error.message)
    return []
  }
  return (data ?? []) as InvestigationTimeline[]
}

export async function getInvestigationQueries(investigationId: string): Promise<InvestigationQuery[]> {
  const client = createAdminClient()
  const { data, error } = await client
    .from('investigation_queries')
    .select('*')
    .eq('investigation_id', investigationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Investigação] Erro ao buscar queries:', error.message)
    return []
  }
  return (data ?? []) as InvestigationQuery[]
}
