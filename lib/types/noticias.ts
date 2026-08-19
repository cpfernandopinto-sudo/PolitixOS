export interface KPI {
  title: string
  value: string | number
  status?: 'success' | 'warning' | 'danger' | 'neutral'
}

export interface GaugeScore {
  score: number
  statusText: string
  level: 'success' | 'warning' | 'danger'
}

export interface Noticia {
  id: string
  data: string
  fonte: string
  candidato: string | null
  titulo: string
  resumo: string
  link: string
  sentimento: 'positivo' | 'neutro' | 'negativo'
  risco: 'baixo' | 'médio' | 'alto'
  crise: boolean
  relevancia: number // 0–10 (convertido de 0–100 do banco)
}

// Filtros do dashboard — mapeiam direto para URL search params
export interface NoticiasFilters {
  /** @deprecated use `candidateIds` */
  candidateId?: string | null
  /** @deprecated use `candidateIds` */
  candidate?: string | null
  /** Candidatos selecionados no GlobalContextBar (multi-select, ids de `targets`). Tem precedência sobre `candidate`/`candidateId` quando presente. */
  candidateIds?: string[] | null
  city?: string | null
  source?: string | null
  sentiment?: string | null   // 'positivo' | 'neutro' | 'negativo'
  period?: string | null      // '24h' | '7d' | '30d' | 'custom'
  startDate?: string | null
  endDate?: string | null
  search?: string | null
  /**
   * IDs de targets permitidos para o usuário atual.
   * null = sem restrição (admin). [] = nenhum acesso.
   * Quando definido, filtra por candidate_name dos targets permitidos.
   */
  allowedTargetIds?: string[] | null
}

// Linha crua retornada pelo Supabase
export interface MencaoRow {
  id: string
  hash: string
  published_at: string | null
  source: string | null
  title: string | null
  url: string | null
  summary: string | null
  ai_takeaways: string | null
  ai_sentiment: number | null
  // ai_topics/entities/risk_flags: JSON armazenado como string no banco
  ai_topics: unknown
  ai_entities: unknown
  ai_risk_flags: unknown
  local_relevance: number | null
  is_about: boolean | null
  candidate_name: string | null
  city: string | null
}
