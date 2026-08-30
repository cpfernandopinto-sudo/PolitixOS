/**
 * Sprint 13 — WhatsApp Intelligence V1
 * Contrato canônico e DTOs oficiais definidos pelo Codex (Seções 2, 3, 5 e 6).
 */

export type WhatsAppMessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'DOCUMENT'
  | 'STICKER'
  | 'LOCATION'
  | 'CONTACT'
  | 'SYSTEM'
  | 'UNKNOWN';

export type WhatsAppChatType = 'GROUP' | 'DIRECT' | 'BROADCAST' | 'UNKNOWN';

export type WhatsAppAnalysisStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'FAILED';

export type WhatsAppSentiment =
  | 'POSITIVE'
  | 'NEUTRAL'
  | 'NEGATIVE'
  | 'MIXED'
  | 'UNKNOWN';

export type WhatsAppRiskLevel =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'NONE'
  | 'UNKNOWN';

export type WhatsAppRelevance = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type WhatsAppIntent =
  | 'INFORMATION'
  | 'OPINION'
  | 'QUESTION'
  | 'REQUEST'
  | 'COMPLAINT'
  | 'PRAISE'
  | 'MOBILIZATION'
  | 'DENUNCIATION'
  | 'MISINFORMATION_POSSIBLE'
  | 'OTHER'
  | 'UNKNOWN';

export type WhatsAppEntityType =
  | 'PERSON'
  | 'ORGANIZATION'
  | 'GOVERNMENT'
  | 'PARTY'
  | 'MOVEMENT'
  | 'EVENT'
  | 'OTHER';

export type WhatsAppLocationType =
  | 'COUNTRY'
  | 'STATE'
  | 'CITY'
  | 'NEIGHBORHOOD'
  | 'ADDRESS'
  | 'LANDMARK'
  | 'OTHER';

export interface WhatsAppMediaDTO {
  url?: string | null;
  mime_type?: string | null;
  file_name?: string | null;
  size_bytes?: number | null;
}

export interface WhatsAppChatDTO {
  id: string;
  name: string | null;
  type: WhatsAppChatType;
}

export interface WhatsAppSenderDTO {
  id: string | null;
  name: string | null;
}

export interface WhatsAppMentionedCandidateDTO {
  name: string;
  normalized_name?: string;
  target_id?: string | null;
}

export interface WhatsAppMentionedEntityDTO {
  name: string;
  type: WhatsAppEntityType | string;
}

export interface WhatsAppMentionedLocationDTO {
  name: string;
  type?: WhatsAppLocationType | string;
  state?: string | null;
  city?: string | null;
}

export interface WhatsAppAnalysisDTO {
  theme: string | null;
  subtheme: string | null;
  sentiment: WhatsAppSentiment | null;
  sentiment_score: number | null; // -1 to 1
  relevance: WhatsAppRelevance | null;
  summary: string | null;
  intent: WhatsAppIntent | null;
  risk_level: WhatsAppRiskLevel | null;
  mentioned_candidates: WhatsAppMentionedCandidateDTO[];
  mentioned_entities: WhatsAppMentionedEntityDTO[];
  mentioned_locations: WhatsAppMentionedLocationDTO[];
  confidence?: number | null; // 0 to 1
  schema_version?: string;
  prompt_version?: string;
  analyzed_at?: string;
  risk_reason?: string | null;
  recommended_action: string | null;
}

export interface WhatsAppMessageDTO {
  id: string;
  occurred_at: string; // ISO 8601 UTC
  chat: WhatsAppChatDTO;
  sender: WhatsAppSenderDTO;
  message_type: WhatsAppMessageType;
  text: string | null;
  caption: string | null;
  media: WhatsAppMediaDTO | null;
  from_me: boolean;
  analysis_status: WhatsAppAnalysisStatus;
  analysis: WhatsAppAnalysisDTO | null;
}

export interface WhatsAppSummaryTotalsDTO {
  messages: number;
  groups: number;
  unique_senders: number;
  analyzed: number;
  pending: number;
  failed: number;
  high_or_critical_risk: number;
}

export interface WhatsAppSummaryDTO {
  totals: WhatsAppSummaryTotalsDTO;
  sentiment: Array<{ key: WhatsAppSentiment; count: number; percentage: number }>;
  risk: Array<{ key: WhatsAppRiskLevel; count: number; percentage: number }>;
  relevance: Array<{ key: WhatsAppRelevance; count: number; percentage: number }>;
  top_themes: Array<{ theme: string; count: number }>;
  freshness: {
    last_message_at: string | null;
    last_analysis_at: string | null;
  };
}

export interface WhatsAppMessagesResponseDTO {
  items: WhatsAppMessageDTO[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface WhatsAppGroupItemDTO {
  id: string;
  name: string;
  type: WhatsAppChatType;
  is_active: boolean;
  message_count: number;
  unique_senders: number;
  last_message_at: string;
}

export interface WhatsAppGroupsResponseDTO {
  items: WhatsAppGroupItemDTO[];
}

export interface WhatsAppFilterOptionDTO<T = string> {
  value: T;
  label?: string;
  count?: number;
}

export interface WhatsAppFiltersResponseDTO {
  groups: Array<{ value: string; label: string }>;
  sentiments: Array<{ value: WhatsAppSentiment; count: number }>;
  risk_levels: Array<{ value: WhatsAppRiskLevel; count: number }>;
  relevance_levels: Array<{ value: WhatsAppRelevance; count: number }>;
  themes: Array<{ value: string; count: number }>;
  message_types: Array<{ value: WhatsAppMessageType; count: number }>;
}

export interface WhatsAppAnalyticsVolumeItemDTO {
  bucket: string;
  messages: number;
  analyzed: number;
}

export interface WhatsAppAnalyticsResponseDTO {
  volume_over_time: WhatsAppAnalyticsVolumeItemDTO[];
  themes: Array<{ key: string; count: number }>;
  sentiment: Array<{ key: WhatsAppSentiment; count: number }>;
  risk: Array<{ key: WhatsAppRiskLevel; count: number }>;
  top_groups: Array<{ chat_id: string; name: string; count: number }>;
  top_candidates: Array<{ name: string; count: number }>;
  top_entities: Array<{ name: string; type: string; count: number }>;
  top_locations: Array<{ name: string; type: string; count: number }>;
}

export interface WhatsAppQueryFilters {
  from?: string | null;
  to?: string | null;
  period?: string | null;
  instance_id?: string | null;
  chat_id?: string | null;
  group?: string | null;
  sender?: string | null;
  theme?: string | null;
  topic?: string | null;
  sentiment?: WhatsAppSentiment | string | null;
  risk_level?: WhatsAppRiskLevel | string | null;
  risk?: WhatsAppRiskLevel | string | null;
  relevance?: WhatsAppRelevance | string | null;
  message_type?: WhatsAppMessageType | string | null;
  type?: WhatsAppMessageType | string | null;
  analysis_status?: WhatsAppAnalysisStatus | string | null;
  q?: string | null;
  search?: string | null;
  candidate?: string | null;
  location?: string | null;
  from_me?: boolean | null;
  cursor?: string | null;
  page_size?: number;
  sort?: string;
  clientId?: string | null;
  allowedTargetIds?: string[] | null;
}
