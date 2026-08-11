// Tipos do módulo Politix Territórios (Bloco 2 — Fundação).
// Espelham as tabelas de supabase_migration_territories_foundation.sql
// (migration ainda NÃO aplicada — ver docs/RELATORIO_TERRITORIOS_BLOCO2_BANCO_FUNDACAO.md).

export interface Territory {
  id: string
  codigo_ibge: string
  uf: string
  municipio: string
  regiao: string | null
  geometria: unknown | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TerritoryIndicator {
  id: string
  territory_id: string
  categoria: string
  indicador: string
  valor: number | null
  valor_texto: string | null
  unidade: string | null
  periodo_inicio: string | null
  periodo_fim: string | null
  granularidade: string
  fonte: string
  source_dataset: string | null
  source_record_id: string | null
  source_updated_at: string | null
  metodologia: string | null
  metadata: Record<string, unknown>
  collected_at: string
  updated_at: string
}

export interface TerritoryEvidence {
  id: string
  territory_id: string
  source_type: string
  source_name: string | null
  source_url: string | null
  source_external_id: string | null
  source_hash: string
  published_at: string | null
  collected_at: string
  tema: string | null
  subtema: string | null
  title: string | null
  summary: string | null
  raw_reference: unknown | null
  confidence: number | null
  metadata: Record<string, unknown>
  created_at: string
}

/** Estados de execução de um motor de coleta territorial (n8n). */
export type CollectionRunStatus = 'pending' | 'running' | 'partial' | 'completed' | 'failed'

export interface TerritoryCollectionRun {
  id: string
  territory_id: string
  request_id: string
  source: string
  status: CollectionRunStatus
  workflow_name: string | null
  workflow_version: string | null
  started_at: string | null
  finished_at: string | null
  items_collected: number
  items_processed: number
  items_discarded: number
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/** Estados do briefing territorial, conforme Seção 14/18 do briefing do Bloco 1. */
export type TerritoryBriefingStatus =
  | 'nao_iniciado'
  | 'coletando'
  | 'processando'
  | 'analisando'
  | 'concluido'
  | 'parcial'
  | 'erro'

export interface TerritoryBriefing {
  id: string
  territory_id: string
  target_id: string | null
  requested_by: string | null
  request_id: string
  status: TerritoryBriefingStatus
  content: unknown | null
  model: string | null
  prompt_version: string | null
  generated_at: string | null
  expires_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface CreateTerritoryInput {
  codigo_ibge: string
  uf: string
  municipio: string
  regiao?: string | null
}

export interface CreateBriefingInput {
  codigo_ibge: string
  /** Candidato para o qual o briefing é gerado. null = briefing genérico do território. */
  target_id?: string | null
}

export interface TerritoryFilters {
  uf?: string | null
  search?: string | null
}

/** Código IBGE de município: sempre 7 dígitos numéricos (ex.: 3118601 = Contagem/MG). */
export function isValidIbgeCode(codigoIbge: string): boolean {
  return /^\d{7}$/.test(codigoIbge)
}
