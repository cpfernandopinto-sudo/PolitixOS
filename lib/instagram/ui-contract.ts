import {
  INSTAGRAM_CONTENT_TYPES,
  withCanonicalContentType,
  type InstagramContentType,
} from '@/lib/instagram/content-type';
import type {
  InstagramMetric,
  InstagramUiComment,
  InstagramUiContract,
  InstagramUiEnrichment,
  InstagramUiMediaChild,
  InstagramUiPost,
} from '@/lib/types/instagram-ui';

type UnknownRecord = Record<string, unknown>;

export interface InstagramUiRawPost extends UnknownRecord {
  id: string;
  target_id: string;
  client_id?: string | null;
  platform: string;
  caption?: string | null;
  content_type?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  post_url?: string | null;
  taken_at?: string | null;
  collected_at: string;
  like_count?: number | null;
  comment_count?: number | null;
  raw_json?: unknown;
}

export interface InstagramUiRawComment extends UnknownRecord {
  id: string;
  instagram_comment_id: string;
  post_id: string;
  parent_comment_id?: string | null;
  comment_user?: string | null;
  comment_text?: string | null;
  like_count?: number | null;
  created_at_instagram?: string | null;
  collected_at: string;
}

export interface InstagramUiRawAnalysis extends UnknownRecord {
  content_id: string;
  sentiment?: string | null;
  risk_level?: string | null;
  ai_topics?: unknown;
  summary?: string | null;
  risk_reason?: string | null;
  recommended_action?: string | null;
  engagement_quality?: unknown;
  polarization_level?: unknown;
}

export interface InstagramUiBuildInput {
  posts: InstagramUiRawPost[];
  comments: InstagramUiRawComment[];
  analyses: InstagramUiRawAnalysis[];
  targetNames?: Map<string, string>;
  totalComments?: number;
  totalAvailable?: number;
  commentsTotalAvailable?: number;
  analyticsLimit?: number | null;
  page?: number;
  pageSize?: number;
  now?: Date;
}

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function available(value: number, source: InstagramMetric['source']): InstagramMetric {
  return { value, availability: 'AVAILABLE', source };
}

export function unavailableMetric(): InstagramMetric {
  return { value: null, availability: 'UNAVAILABLE', source: null };
}

function metricFromStructured(value: unknown): InstagramMetric {
  const parsed = numberValue(value);
  return parsed === null ? unavailableMetric() : available(parsed, 'structured');
}

function metricFromRaw(raw: UnknownRecord | null, keys: string[]): InstagramMetric {
  for (const key of keys) {
    if (!raw || !Object.prototype.hasOwnProperty.call(raw, key)) continue;
    const parsed = numberValue(raw[key]);
    if (parsed !== null) return available(parsed, 'raw_json');
  }
  return unavailableMetric();
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function analyticSignal(value: unknown) {
  const normalized = stringValue(value);
  return normalized
    ? { value: normalized, availability: 'AVAILABLE' as const }
    : { value: null, availability: 'UNAVAILABLE' as const };
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
  if (typeof value === 'string') {
    try {
      return stringArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function mapCarouselChildren(raw: UnknownRecord | null): InstagramUiMediaChild[] {
  const children = raw?.carousel_media;
  if (!Array.isArray(children)) return [];
  return children.map((child): InstagramUiMediaChild => {
    const item = record(child);
    const images = record(item?.image_versions2);
    const candidates = Array.isArray(images?.candidates) ? images.candidates : [];
    const firstImage = record(candidates[0]);
    const videos = Array.isArray(item?.video_versions) ? item.video_versions : [];
    const firstVideo = record(videos[0]);
    return {
      id: stringValue(item?.id) ?? stringValue(item?.pk),
      mediaType: stringValue(item?.media_type),
      imageUrl: stringValue(firstImage?.url) ?? stringValue(item?.display_uri),
      videoUrl: stringValue(firstVideo?.url),
    };
  });
}

function extractAudioAttribution(raw: UnknownRecord | null): string | null {
  const music = record(raw?.music_metadata);
  if (!music) return null;
  return stringValue(music.display_artist)
    ?? stringValue(music.music_canonical_id)
    ?? stringValue(music.title);
}

export function mapInstagramEnrichment(rawJson: unknown): InstagramUiEnrichment {
  const raw = record(rawJson);
  const v2 = record(raw?._v2_enrichment);
  const source = v2 ?? raw;
  const playCount = metricFromRaw(source, ['play_count', 'ig_play_count']);
  const durationSeconds = metricFromRaw(source, ['video_duration', 'duration']);
  const hasAudio = typeof source?.has_audio === 'boolean' ? source.has_audio : null;
  const audioAttribution = extractAudioAttribution(source);
  return {
    available: Boolean(v2) || playCount.availability === 'AVAILABLE' || durationSeconds.availability === 'AVAILABLE' || hasAudio !== null || audioAttribution !== null,
    playCount,
    durationSeconds,
    hasAudio,
    audioAttribution,
  };
}

export function mapInstagramPost(
  post: InstagramUiRawPost,
  analysis?: InstagramUiRawAnalysis,
  candidateName?: string,
): InstagramUiPost | null {
  if (post.platform.toLowerCase() !== 'instagram') return null;
  const canonical = withCanonicalContentType(post);
  const contentType = canonical.content_type ?? 'OUTRO';
  const raw = record(post.raw_json);
  const enrichment = mapInstagramEnrichment(post.raw_json);
  const children = contentType === 'CAROUSEL' ? mapCarouselChildren(raw) : [];
  return {
    id: post.id,
    targetId: post.target_id,
    candidateName: candidateName ?? null,
    contentType,
    caption: post.caption ?? '',
    publishedAt: post.taken_at ?? null,
    collectedAt: post.collected_at,
    url: post.post_url ?? null,
    mediaUrl: post.media_url ?? null,
    metrics: {
      likes: metricFromStructured(post.like_count),
      comments: metricFromStructured(post.comment_count),
      plays: enrichment.playCount,
      views: metricFromRaw(raw, ['view_count']),
      reach: metricFromRaw(raw, ['reach']),
      impressions: metricFromRaw(raw, ['impressions']),
      shares: metricFromRaw(raw, ['share_count']),
      saves: metricFromRaw(raw, ['save_count']),
    },
    analysis: {
      sentiment: analysis?.sentiment ?? null,
      risk: analysis?.risk_level ?? null,
      themes: stringArray(analysis?.ai_topics),
      summary: analysis?.summary ?? null,
      riskReason: analysis?.risk_reason ?? null,
      recommendedAction: analysis?.recommended_action ?? null,
      engagementQuality: analyticSignal(analysis?.engagement_quality),
      polarizationLevel: analyticSignal(analysis?.polarization_level),
    },
    reel: contentType === 'REEL' ? enrichment : null,
    carousel: contentType === 'CAROUSEL' ? { childCount: children.length || null, children } : null,
    enrichment,
  };
}

export function mapInstagramComments(comments: InstagramUiRawComment[], posts: InstagramUiPost[] = []): InstagramUiComment[] {
  const parentIds = new Set(comments.map((comment) => comment.parent_comment_id).filter((id): id is string => Boolean(id)));
  const postById = new Map(posts.map((post) => [post.id, post]));
  return comments.map((comment) => ({
    id: comment.id,
    providerId: comment.instagram_comment_id,
    postId: comment.post_id,
    parentCommentId: comment.parent_comment_id ?? null,
    author: comment.comment_user ?? null,
    text: comment.comment_text ?? '',
    likeCount: metricFromStructured(comment.like_count),
    publishedAt: comment.created_at_instagram ?? null,
    collectedAt: comment.collected_at,
    repliesAvailable: parentIds.has(comment.id),
    postCaption: postById.get(comment.post_id)?.caption ?? null,
    postUrl: postById.get(comment.post_id)?.url ?? null,
    candidateName: postById.get(comment.post_id)?.candidateName ?? null,
  }));
}

function countLabels(values: Array<string | null>): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function sumMetrics(metrics: InstagramMetric[]): InstagramMetric {
  const present = metrics.filter((metric) => metric.availability === 'AVAILABLE');
  return present.length ? available(present.reduce((sum, metric) => sum + (metric.value ?? 0), 0), present.every((metric) => metric.source === 'structured') ? 'structured' : 'raw_json') : unavailableMetric();
}

function engagementValue(post: InstagramUiPost): number {
  return (post.metrics.likes.value ?? 0) + (post.metrics.comments.value ?? 0);
}

function riskPriority(risk: string | null): number {
  const normalized = risk?.toLocaleLowerCase('pt-BR') ?? '';
  if (/crít|crit|alto/.test(normalized)) return 3;
  if (/médio|medio/.test(normalized)) return 2;
  if (/baixo/.test(normalized)) return 1;
  return 0;
}

function buildSocialPressure(posts: InstagramUiPost[]) {
  const days = new Map<string, { comments: number; engagement: number }>();
  for (const post of posts) {
    const timestamp = post.publishedAt ?? post.collectedAt;
    const date = timestamp?.slice(0, 10);
    if (!date) continue;
    const current = days.get(date) ?? { comments: 0, engagement: 0 };
    if (post.metrics.comments.availability === 'AVAILABLE') current.comments += post.metrics.comments.value ?? 0;
    if (post.metrics.likes.availability === 'AVAILABLE') current.engagement += post.metrics.likes.value ?? 0;
    if (post.metrics.comments.availability === 'AVAILABLE') current.engagement += post.metrics.comments.value ?? 0;
    days.set(date, current);
  }
  return [...days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => ({ date, ...values }));
}

export function buildInstagramUiContract({
  posts,
  comments,
  analyses,
  targetNames = new Map(),
  totalComments = comments.length,
  totalAvailable = posts.length,
  commentsTotalAvailable = comments.length,
  analyticsLimit = null,
  page = 1,
  pageSize = 20,
  now = new Date(),
}: InstagramUiBuildInput): InstagramUiContract {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const analysisByPost = new Map(analyses.map((analysis) => [analysis.content_id, analysis]));
  const mappedPosts = posts.map((post) => mapInstagramPost(post, analysisByPost.get(post.id), targetNames.get(post.target_id))).filter((post): post is InstagramUiPost => Boolean(post));
  mappedPosts.sort((a, b) => new Date(b.publishedAt ?? b.collectedAt).getTime() - new Date(a.publishedAt ?? a.collectedAt).getTime());
  const offset = (safePage - 1) * safePageSize;
  const recentPosts = mappedPosts.slice(offset, offset + safePageSize);
  const mappedComments = mapInstagramComments(comments, mappedPosts).sort((a, b) => new Date(b.publishedAt ?? b.collectedAt).getTime() - new Date(a.publishedAt ?? a.collectedAt).getTime());
  const types = INSTAGRAM_CONTENT_TYPES.map((type) => ({ type, posts: mappedPosts.filter((post) => post.contentType === type) })).filter((group) => group.posts.length > 0);
  const freshnessValue = mappedPosts.reduce<string | null>((latest, post) => !latest || post.collectedAt > latest ? post.collectedAt : latest, null);
  const freshnessAge = freshnessValue ? now.getTime() - new Date(freshnessValue).getTime() : null;
  return {
    completeness: {
      totalAvailable,
      totalLoaded: posts.length,
      isComplete: posts.length >= totalAvailable,
      limit: posts.length < totalAvailable ? analyticsLimit : null,
    },
    filterOptions: {
      candidates: [...targetNames.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      formats: ['IMAGE', 'REEL', 'CAROUSEL'],
      risks: [...new Set(mappedPosts.map((post) => post.analysis.risk).filter((risk): risk is string => Boolean(risk)))].sort(),
      sentiments: [...new Set(mappedPosts.map((post) => post.analysis.sentiment).filter((sentiment): sentiment is string => Boolean(sentiment)))].sort(),
    },
    summary: { posts: mappedPosts.length, comments: totalComments, analyzedPosts: mappedPosts.filter((post) => post.analysis.sentiment || post.analysis.risk || post.analysis.themes.length).length },
    contentTypes: types.map((group) => ({ type: group.type, count: group.posts.length })),
    performanceByType: types.map((group) => ({
      type: group.type,
      posts: group.posts.length,
      likes: sumMetrics(group.posts.map((post) => post.metrics.likes)),
      comments: sumMetrics(group.posts.map((post) => post.metrics.comments)),
      plays: sumMetrics(group.posts.map((post) => post.metrics.plays)),
      postsWithPlayData: group.posts.filter((post) => post.metrics.plays.availability === 'AVAILABLE').length,
    })),
    recentPosts,
    topPosts: {
      items: [...mappedPosts].sort((a, b) => (b.metrics.likes.value ?? 0) - (a.metrics.likes.value ?? 0) || (b.metrics.comments.value ?? 0) - (a.metrics.comments.value ?? 0)).slice(0, 10),
      criterion: 'likes_desc_then_comments_desc',
    },
    priorityPosts: {
      items: [...mappedPosts].sort((a, b) => riskPriority(b.analysis.risk) - riskPriority(a.analysis.risk) || engagementValue(b) - engagementValue(a)).slice(0, 10),
      criterion: 'risk_desc_then_engagement_desc',
    },
    socialPressure: buildSocialPressure(mappedPosts),
    sentiment: countLabels(mappedPosts.map((post) => post.analysis.sentiment)),
    risk: countLabels(mappedPosts.map((post) => post.analysis.risk)),
    themes: countLabels(mappedPosts.flatMap((post) => post.analysis.themes)),
    comments: {
      recent: mappedComments.slice(0, 50),
      relevant: mappedComments.filter((comment) => comment.likeCount.availability === 'AVAILABLE').sort((a, b) => (b.likeCount.value ?? 0) - (a.likeCount.value ?? 0)).slice(0, 20),
      relevanceCriterion: mappedComments.some((comment) => comment.likeCount.availability === 'AVAILABLE') ? 'like_count' : null,
      repliesPresent: mappedComments.some((comment) => comment.parentCommentId !== null),
      totalAvailable: commentsTotalAvailable,
      totalLoaded: comments.length,
      isComplete: comments.length >= commentsTotalAvailable,
    },
    collectionFreshness: { lastCollectedAt: freshnessValue, state: freshnessAge === null ? 'EMPTY' : freshnessAge <= 24 * 60 * 60 * 1000 ? 'FRESH' : 'STALE' },
    pagination: { page: safePage, pageSize: safePageSize, total: mappedPosts.length, totalPages: Math.ceil(mappedPosts.length / safePageSize), hasNextPage: offset + safePageSize < mappedPosts.length },
    availability: {
      reach: mappedPosts.some((post) => post.metrics.reach.availability === 'AVAILABLE'),
      impressions: mappedPosts.some((post) => post.metrics.impressions.availability === 'AVAILABLE'),
      shares: mappedPosts.some((post) => post.metrics.shares.availability === 'AVAILABLE'),
      saves: mappedPosts.some((post) => post.metrics.saves.availability === 'AVAILABLE'),
      transcript: false,
    },
  };
}

export function normalizeInstagramContentTypeFilter(values?: string[]): InstagramContentType[] {
  if (!values) return [];
  return [...new Set(values.map((value) => value.toUpperCase()).filter((value): value is InstagramContentType => INSTAGRAM_CONTENT_TYPES.includes(value as InstagramContentType)))];
}
