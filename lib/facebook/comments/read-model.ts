import type { FacebookAudienceIntelligence } from './audience-intelligence';

export interface FacebookAudienceReadModel {
  audienceSentiment: FacebookAudienceIntelligence['audienceSentiment'] | null;
  audienceSentimentScore: number | null;
  supportLevel: string | null; rejectionLevel: string | null; polarizationLevel: string | null;
  commentsAnalyzed: number; dominantAudienceThemes: string[]; messageAudienceDivergence: string | null;
}

export function toFacebookAudienceReadModel(row: Record<string, unknown> | null): FacebookAudienceReadModel {
  return {
    audienceSentiment: (row?.audience_sentiment as FacebookAudienceReadModel['audienceSentiment']) ?? null,
    audienceSentimentScore: typeof row?.audience_sentiment_score === 'number' ? row.audience_sentiment_score : row?.audience_sentiment_score == null ? null : Number(row.audience_sentiment_score),
    supportLevel: typeof row?.support_level === 'string' ? row.support_level : null,
    rejectionLevel: typeof row?.rejection_level === 'string' ? row.rejection_level : null,
    polarizationLevel: typeof row?.polarization_level === 'string' ? row.polarization_level : null,
    commentsAnalyzed: typeof row?.comments_analyzed === 'number' ? row.comments_analyzed : Number(row?.comments_analyzed ?? 0),
    dominantAudienceThemes: Array.isArray(row?.dominant_audience_themes) ? row.dominant_audience_themes.filter((item): item is string => typeof item === 'string') : [],
    messageAudienceDivergence: typeof row?.message_audience_divergence === 'string' ? row.message_audience_divergence : null,
  };
}
