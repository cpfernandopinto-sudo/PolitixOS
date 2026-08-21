import type { InstagramContentType } from '@/lib/instagram/content-type';

export type InstagramMetricAvailability = 'AVAILABLE' | 'UNAVAILABLE';

export interface InstagramMetric {
  value: number | null;
  availability: InstagramMetricAvailability;
  source: 'structured' | 'raw_json' | null;
}

export interface InstagramUiMediaChild {
  id: string | null;
  mediaType: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
}

export interface InstagramUiEnrichment {
  available: boolean;
  playCount: InstagramMetric;
  durationSeconds: InstagramMetric;
  hasAudio: boolean | null;
  audioAttribution: string | null;
}

export interface InstagramUiPost {
  id: string;
  targetId: string;
  candidateName: string | null;
  contentType: InstagramContentType;
  caption: string;
  publishedAt: string | null;
  collectedAt: string;
  url: string | null;
  mediaUrl: string | null;
  metrics: {
    likes: InstagramMetric;
    comments: InstagramMetric;
    plays: InstagramMetric;
    views: InstagramMetric;
    reach: InstagramMetric;
    impressions: InstagramMetric;
    shares: InstagramMetric;
    saves: InstagramMetric;
  };
  analysis: {
    sentiment: string | null;
    risk: string | null;
    themes: string[];
    summary: string | null;
    riskReason: string | null;
    recommendedAction: string | null;
  };
  reel: InstagramUiEnrichment | null;
  carousel: {
    childCount: number | null;
    children: InstagramUiMediaChild[];
  } | null;
  enrichment: InstagramUiEnrichment;
}

export interface InstagramUiComment {
  id: string;
  providerId: string;
  postId: string;
  parentCommentId: string | null;
  author: string | null;
  text: string;
  likeCount: InstagramMetric;
  publishedAt: string | null;
  collectedAt: string;
  repliesAvailable: boolean;
  postCaption: string | null;
  postUrl: string | null;
  candidateName: string | null;
}

export interface InstagramUiContract {
  filterOptions: {
    candidates: Array<{ id: string; name: string }>;
    formats: Array<'IMAGE' | 'REEL' | 'CAROUSEL'>;
    risks: string[];
  };
  summary: {
    posts: number;
    comments: number;
    analyzedPosts: number;
  };
  contentTypes: Array<{ type: InstagramContentType; count: number }>;
  performanceByType: Array<{
    type: InstagramContentType;
    posts: number;
    likes: InstagramMetric;
    comments: InstagramMetric;
    plays: InstagramMetric;
    postsWithPlayData: number;
  }>;
  recentPosts: InstagramUiPost[];
  topPosts: {
    items: InstagramUiPost[];
    criterion: 'likes_desc_then_comments_desc';
  };
  sentiment: Array<{ label: string; count: number }>;
  risk: Array<{ label: string; count: number }>;
  themes: Array<{ label: string; count: number }>;
  comments: {
    recent: InstagramUiComment[];
    relevant: InstagramUiComment[];
    relevanceCriterion: 'like_count' | null;
    repliesPresent: boolean;
  };
  collectionFreshness: {
    lastCollectedAt: string | null;
    state: 'EMPTY' | 'FRESH' | 'STALE';
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  availability: {
    reach: boolean;
    impressions: boolean;
    shares: boolean;
    saves: boolean;
    transcript: false;
  };
}

export interface InstagramUiQuery {
  contentTypes?: InstagramContentType[];
  candidateIds?: string[];
  periodDays?: number | null;
  page?: number;
  pageSize?: number;
  risk?: string | null;
}
