import { createAdminClient } from '@/lib/supabaseClient'
import type {
  Investigation,
  InvestigationSource,
  InvestigationEntity,
  InvestigationTimeline,
  InvestigationQuery,
} from '@/lib/types/investigations'

/**
 * `allowedTargetIds`: null = admin (sem restrição). [] = nenhum candidato
 * permitido (retorna vazio/nega). [...] = restringe a investigações cujo
 * `candidate_id` esteja na lista. Investigações com `candidate_id` nulo
 * (não vinculadas a um candidato específico) são excluídas para não-admin —
 * fail-closed, já que não há como verificar a quem pertencem.
 */
export async function getInvestigations(allowedTargetIds?: string[] | null): Promise<Investigation[]> {
  const client = createAdminClient()
  let query = client
    .from('investigations')
    .select('*')
    .order('created_at', { ascending: false })

  if (allowedTargetIds !== null && allowedTargetIds !== undefined) {
    if (allowedTargetIds.length === 0) return []
    query = query.in('candidate_id', allowedTargetIds)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Investigação] Erro ao buscar investigações:', error.message)
    return []
  }
  return (data ?? []) as Investigation[]
}

export async function getInvestigationById(
  id: string,
  allowedTargetIds?: string[] | null
): Promise<Investigation | null> {
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

  if (
    allowedTargetIds !== null &&
    allowedTargetIds !== undefined &&
    (!data?.candidate_id || !allowedTargetIds.includes(data.candidate_id))
  ) {
    console.warn('[Investigação] Acesso negado — candidato fora das permissões:', { id, candidateId: data?.candidate_id })
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
