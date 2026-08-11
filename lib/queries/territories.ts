import { createClient } from '@/lib/supabaseClient'
import type { Territory, TerritoryFilters } from '@/lib/types/territories'

// ---------------------------------------------------------------------------
// Leitura do catálogo territorial (GLOBAL — não filtrado por allowedTargetIds).
//
// Todas as funções seguem o mesmo padrão de tolerância a falha já usado em
// lib/queries/investigations.ts: erro do Supabase é logado e a função
// retorna [] / null em vez de lançar. Isso cobre também o caso da migration
// de supabase_migration_territories_foundation.sql ainda não ter sido
// aplicada (a tabela não existe ainda) — a tela consome essas funções e
// trata a lista vazia como "base territorial ainda não inicializada",
// sem quebrar a aplicação.
// ---------------------------------------------------------------------------

export async function getTerritories(filters: TerritoryFilters = {}): Promise<Territory[]> {
  const client = createClient()
  let query = client.from('territories').select('*').order('municipio', { ascending: true })

  if (filters.uf) {
    query = query.eq('uf', filters.uf.toUpperCase())
  }
  if (filters.search) {
    query = query.ilike('municipio', `%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getTerritories] Erro:', error.message)
    return []
  }
  return (data ?? []) as Territory[]
}

export async function getTerritoriesByUf(uf: string): Promise<Territory[]> {
  return getTerritories({ uf })
}

export async function getTerritoryByIbgeCode(codigoIbge: string): Promise<Territory | null> {
  const client = createClient()
  const { data, error } = await client
    .from('territories')
    .select('*')
    .eq('codigo_ibge', codigoIbge)
    .maybeSingle()

  if (error) {
    console.error('[getTerritoryByIbgeCode] Erro:', error.message)
    return null
  }
  return (data ?? null) as Territory | null
}

export async function getTerritoryById(id: string): Promise<Territory | null> {
  const client = createClient()
  const { data, error } = await client
    .from('territories')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[getTerritoryById] Erro:', error.message)
    return null
  }
  return (data ?? null) as Territory | null
}

/**
 * Lista de UFs distintas presentes no catálogo territorial já carregado.
 * Não é uma lista hardcoded de estados brasileiros — reflete apenas o que
 * já existe em `territories`. Enquanto a base estiver vazia, retorna [].
 */
export async function getAvailableUfs(): Promise<string[]> {
  const client = createClient()
  const { data, error } = await client.from('territories').select('uf').order('uf', { ascending: true })

  if (error) {
    console.error('[getAvailableUfs] Erro:', error.message)
    return []
  }
  const ufs = new Set((data ?? []).map((row: { uf: string }) => row.uf))
  return Array.from(ufs)
}
