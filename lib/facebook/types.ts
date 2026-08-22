export type FacebookContentOrigin = 'OWNED' | 'EXTERNAL';
export type FacebookCapabilityStatus = 'CONFIRMED' | 'PARTIAL' | 'NOT_AVAILABLE' | 'FAILED' | 'NOT_TESTED';

export interface FacebookReactionBreakdown {
  like: number | null;
  love: number | null;
  care: number | null;
  haha: number | null;
  wow: number | null;
  sad: number | null;
  angry: number | null;
}

export interface FacebookProviderPost {
  post_id?: unknown;
  id?: unknown;
  type?: unknown;
  url?: unknown;
  message?: unknown;
  message_rich?: unknown;
  timestamp?: unknown;
  comments_count?: unknown;
  reactions_count?: unknown;
  reshare_count?: unknown;
  shares_count?: unknown;
  reactions?: unknown;
  author?: unknown;
  authors?: unknown;
  image?: unknown;
  media?: unknown;
  video?: unknown;
  comments_id?: unknown;
  shares_id?: unknown;
  [key: string]: unknown;
}

export interface FacebookPagePostsResponse {
  results?: unknown;
  cursor?: unknown;
  [key: string]: unknown;
}

export interface FacebookNormalizedPost {
  externalPostId: string;
  postType: string | null;
  authorExternalId: string | null;
  authorName: string | null;
  authorUrl: string | null;
  message: string | null;
  messageRich: string | null;
  permalink: string | null;
  publishedAt: string | null;
  commentsCount: number | null;
  reactionsCount: number | null;
  sharesCount: number | null;
  reactions: FacebookReactionBreakdown;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  sourcePageId: string;
  contentOrigin: FacebookContentOrigin;
  rawPayload: Record<string, unknown>;
}

export interface FacebookCollectionContext {
  clientId: string;
  targetId: string;
  socialAccountId: string;
  sourcePageId: string;
  contentOrigin?: FacebookContentOrigin;
}

export interface FacebookDateWindow {
  startDate?: string;
  endDate?: string;
}

export interface FacebookProviderPage {
  posts: FacebookProviderPost[];
  cursor: string | null;
  raw: FacebookPagePostsResponse;
}
