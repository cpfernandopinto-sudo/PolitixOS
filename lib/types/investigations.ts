export interface Investigation {
  id: string
  mention_id: string | null
  candidate_id: string | null
  candidate_name: string | null
  original_title: string | null
  original_summary: string | null
  investigation_topic: string | null
  source_url: string | null
  source: string | null
  city: string | null
  published_at: string | null
  status: 'running' | 'completed' | 'error'
  risk_level: 'low' | 'medium' | 'high' | 'critical' | null
  crisis_potential: string | null
  executive_summary: string | null
  strategic_reading: string | null
  recommended_actions: string | null
  full_report: unknown
  created_at: string
  updated_at: string | null
}

export interface InvestigationSource {
  id: string
  investigation_id: string
  source_title: string | null
  source_url: string | null
  source_type: string | null
  relevance_score: number | null
  snippet: string | null
  fetched_at: string | null
  created_at: string | null
}

export interface InvestigationEntity {
  id: string
  investigation_id: string
  entity_name: string | null
  entity_type: string | null
  entity_role: string | null
  relevance: string | null
  sentiment: string | null
  notes: string | null
  created_at: string | null
}

export interface InvestigationTimeline {
  id: string
  investigation_id: string
  event_date: string | null
  event_datetime: string | null
  event_title: string | null
  event_description: string | null
  event_type: string | null
  impact_level: string | null
  source_url: string | null
  created_at: string | null
}

export interface InvestigationQuery {
  id: string
  investigation_id: string
  query_text: string | null
  query_type: string | null
  query_provider: string | null
  response_summary: string | null
  tokens_used: number | null
  duration_ms: number | null
  status: string | null
  error_message: string | null
  created_at: string | null
}

export interface StartInvestigationPayload {
  mention_id: string
  candidate_id: string
  candidate_name: string
  source_url: string
  original_title: string
  original_summary: string
  published_at: string
  source: string
  city: string
}

export interface StartInvestigationResponse {
  success: boolean
  already_exists?: boolean
  investigation_id?: string
  status?: string
  risk_level?: string
  crisis_potential?: string
  executive_summary?: string
  error?: string
  message?: string
  code?: string
  statusCode?: number
  missing_env?: string[]
  n8n_status?: number
  n8n_status_text?: string
  n8n_response?: unknown
  details?: unknown
}
