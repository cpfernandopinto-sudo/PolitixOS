export type XOrigin = 'OWNED' | 'EXTERNAL' | 'QUOTE' | 'REPOST' | 'UNKNOWN';

export interface XMetric {
  value: number | null;
  available: boolean;
}

export interface XMetrics {
  likes: XMetric;
  replies: XMetric;
  reposts: XMetric;
  quotes: XMetric;
  views: XMetric;
  bookmarks: XMetric;
}

export interface XAuthor {
  externalUserId: string | null;
  username: string | null;
  displayName: string | null;
  followers: number | null;
  verified: boolean | null;
}

export interface XMedia {
  type: string | null;
  url: string | null;
}

export interface XAIAnalysis {
  sentiment: string | null;
  risk: string | null;
  riskReason: string | null;
  topics: string[];
  summary: string | null;
  recommendedAction: string | null;
  publicReaction: string | null;
  authorTone: string | null;
  polarizationLevel: string | null;
  crisisTemperature: number | null;
  strategicReading: string | null;
  engagementQuality: string | null;
  confidenceScore: number | null;
}

export interface XPost {
  id: string;
  externalId: string;
  clientId: string | null;
  targetIds: string[];
  origin: XOrigin;
  author: XAuthor;
  text: string;
  publishedAt: string | null;
  url: string | null;
  metrics: XMetrics;
  media: XMedia[];
  matchedTerms: string[];
  quotePosts: null;
  analysis: XAIAnalysis | null;
}

export interface XReply {
  id: string;
  externalId: string;
  postId: string;
  clientId: string | null;
  targetIds: string[];
  parentReplyId: string | null;
  conversationId: string | null;
  author: XAuthor;
  text: string;
  publishedAt: string | null;
  metrics: Pick<XMetrics, 'likes' | 'replies' | 'reposts' | 'quotes' | 'views' | 'bookmarks'>;
}

export interface XCompleteness {
  totalAvailable: number;
  totalLoaded: number;
  isComplete: boolean;
}

export interface XPage<T> extends XCompleteness {
  items: T[];
  offset: number;
  limit: number;
}

export type XPostRow = Record<string, unknown> & {
  id: string;
  platform_post_id: string;
  client_id?: string | null;
  target_id?: string | null;
  caption?: string | null;
  taken_at?: string | null;
  post_url?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  share_count?: number | null;
  view_count?: number | null;
  raw_json?: unknown;
};

export type XReplyRow = Record<string, unknown> & {
  id: string;
  tweet_reply_id: string;
  post_id: string;
  target_id?: string | null;
  reply_user?: string | null;
  reply_text?: string | null;
  created_at_twitter?: string | null;
  like_count?: number | null;
  reply_count?: number | null;
  retweet_count?: number | null;
  view_count?: number | null;
  is_verified?: boolean | null;
  raw_json?: unknown;
};

export type XAnalysisRow = Record<string, unknown>;

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function path(value: unknown, ...keys: string[]): unknown {
  let current: unknown = value;
  for (const key of keys) current = object(current)[key];
  return current;
}

const text = (value: unknown): string | null => typeof value === 'string' && value.length > 0 ? value : null;
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const boolean = (value: unknown): boolean | null => typeof value === 'boolean' ? value : null;
const unique = (values: Array<string | null | undefined>) => [...new Set(values.filter((v): v is string => Boolean(v)))];

function metric(...candidates: unknown[]): XMetric {
  for (const candidate of candidates) {
    const value = number(candidate);
    if (value !== null) return { value, available: true };
  }
  return { value: null, available: false };
}

function author(raw: unknown, fallbackUsername?: unknown, fallbackVerified?: unknown): XAuthor {
  return {
    externalUserId: text(path(raw, 'core', 'user_results', 'result', 'rest_id')),
    username: text(path(raw, 'core', 'user_results', 'result', 'legacy', 'screen_name')) ?? text(fallbackUsername),
    displayName: text(path(raw, 'core', 'user_results', 'result', 'legacy', 'name')),
    followers: number(path(raw, 'core', 'user_results', 'result', 'legacy', 'followers_count')),
    verified: boolean(path(raw, 'core', 'user_results', 'result', 'is_blue_verified')) ?? boolean(fallbackVerified),
  };
}

function origin(value: unknown): XOrigin {
  const normalized = text(value)?.toUpperCase();
  return normalized === 'OWNED' || normalized === 'EXTERNAL' || normalized === 'QUOTE' || normalized === 'REPOST'
    ? normalized
    : 'UNKNOWN';
}

function topics(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

export function mapXPost(row: XPostRow, analysis?: XAnalysisRow | null, associations: Array<{ targetId: string; matchedTerm?: string | null }> = []): XPost {
  const raw = object(row.raw_json);
  const legacy = object(raw.legacy);
  const targetIds = unique([text(row.target_id), ...associations.map(item => item.targetId)]);
  const matchedTerms = unique(associations.map(item => item.matchedTerm));
  const originValue = row.content_origin ?? row.origin ?? row.source_type;
  const ai = analysis ? {
    sentiment: text(analysis.sentiment), risk: text(analysis.risk_level), riskReason: text(analysis.risk_reason),
    topics: topics(analysis.ai_topics), summary: text(analysis.summary), recommendedAction: text(analysis.recommended_action),
    publicReaction: text(analysis.public_reaction), authorTone: text(analysis.author_tone),
    polarizationLevel: text(analysis.polarization_level), crisisTemperature: number(analysis.crisis_temperature),
    strategicReading: text(analysis.strategic_reading), engagementQuality: text(analysis.engagement_quality),
    confidenceScore: number(analysis.confidence_score),
  } : null;

  return {
    id: row.id,
    externalId: row.platform_post_id,
    clientId: text(row.client_id),
    targetIds,
    origin: origin(originValue),
    author: author(raw),
    text: text(row.caption) ?? text(legacy.full_text) ?? '',
    publishedAt: text(row.taken_at),
    url: text(row.post_url) ?? text(raw.url),
    metrics: {
      likes: metric(row.like_count, legacy.favorite_count), replies: metric(row.comment_count, legacy.reply_count),
      reposts: metric(row.share_count, legacy.retweet_count), quotes: metric(legacy.quote_count),
      views: metric(row.view_count, path(raw, 'views', 'count')), bookmarks: metric(legacy.bookmark_count),
    },
    media: row.media_url ? [{ type: text(row.media_type), url: text(row.media_url) }] : [],
    matchedTerms,
    quotePosts: null,
    analysis: ai,
  };
}

export function mapXReply(row: XReplyRow, post?: Pick<XPost, 'clientId' | 'targetIds'>): XReply {
  const raw = object(row.raw_json);
  const legacy = object(raw.legacy);
  return {
    id: row.id, externalId: row.tweet_reply_id, postId: row.post_id,
    clientId: post?.clientId ?? text(row.client_id),
    targetIds: post?.targetIds ?? unique([text(row.target_id)]),
    parentReplyId: text(row.parent_reply_id) ?? text(legacy.in_reply_to_status_id_str),
    conversationId: text(row.conversation_id) ?? text(legacy.conversation_id_str),
    author: author(raw, row.reply_user, row.is_verified),
    text: text(row.reply_text) ?? text(legacy.full_text) ?? '',
    publishedAt: text(row.created_at_twitter),
    metrics: {
      likes: metric(row.like_count, legacy.favorite_count), replies: metric(row.reply_count, legacy.reply_count),
      reposts: metric(row.retweet_count, legacy.retweet_count), quotes: metric(legacy.quote_count),
      views: metric(row.view_count, path(raw, 'views', 'count')), bookmarks: metric(legacy.bookmark_count),
    },
  };
}

export function deduplicateXPosts(posts: XPost[]): XPost[] {
  const result = new Map<string, XPost>();
  for (const post of posts) {
    const key = `x:${post.externalId}`;
    const previous = result.get(key);
    result.set(key, previous ? {
      ...previous,
      targetIds: unique([...previous.targetIds, ...post.targetIds]),
      matchedTerms: unique([...previous.matchedTerms, ...post.matchedTerms]),
      origin: previous.origin === 'UNKNOWN' ? post.origin : previous.origin,
      analysis: previous.analysis ?? post.analysis,
    } : post);
  }
  return [...result.values()];
}

export function pageOf<T>(items: T[], totalAvailable: number, offset: number, limit: number): XPage<T> {
  const pageItems = items.slice(offset, offset + limit);
  return { items: pageItems, offset, limit, totalAvailable, totalLoaded: pageItems.length, isComplete: offset + pageItems.length >= totalAvailable };
}
