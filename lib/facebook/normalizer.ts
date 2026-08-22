import type { FacebookNormalizedPost, FacebookProviderPost, FacebookReactionBreakdown } from './types';

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' ? String(value) : null;
const count = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
};

export function normalizeFacebookTimestamp(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const milliseconds = value < 10_000_000_000 ? value * 1000 : value;
    return new Date(milliseconds).toISOString();
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && /^\d+(\.\d+)?$/.test(value.trim())) return normalizeFacebookTimestamp(numeric);
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function firstAuthor(post: FacebookProviderPost) {
  const direct = object(post.author);
  if (Object.keys(direct).length) return direct;
  if (Array.isArray(post.authors)) return object(post.authors[0]);
  return {};
}

function reactionBreakdown(value: unknown): FacebookReactionBreakdown {
  const reactions = object(value);
  return {
    like: count(reactions.like), love: count(reactions.love), care: count(reactions.care),
    haha: count(reactions.haha), wow: count(reactions.wow), sad: count(reactions.sad), angry: count(reactions.angry),
  };
}

function media(post: FacebookProviderPost) {
  const image = object(post.image);
  const video = object(post.video);
  const media = object(post.media);
  const directImage = text(post.image);
  const directVideo = text(post.video);
  const mediaUrl = directVideo ?? text(video.url) ?? text(video.playable_url) ?? directImage ?? text(image.url) ?? text(image.uri) ?? text(media.url);
  const thumbnailUrl = text(video.thumbnail) ?? text(image.thumbnail) ?? text(media.thumbnail);
  const declaredType = text(post.type)?.toLowerCase() ?? text(media.type)?.toLowerCase();
  const mediaType = declaredType?.includes('reel') ? 'reel'
    : declaredType?.includes('video') || directVideo || Object.keys(video).length ? 'video'
    : declaredType?.includes('photo') || declaredType?.includes('image') || directImage || Object.keys(image).length ? 'image'
    : declaredType ?? null;
  return { mediaType, mediaUrl, thumbnailUrl };
}

export function normalizeFacebookPost(post: FacebookProviderPost, sourcePageId: string, contentOrigin: 'OWNED' | 'EXTERNAL' = 'OWNED'): FacebookNormalizedPost {
  const externalPostId = text(post.post_id) ?? text(post.id);
  if (!externalPostId) throw new Error('FACEBOOK_POST_ID_MISSING');
  if (!sourcePageId.trim()) throw new Error('FACEBOOK_SOURCE_PAGE_ID_MISSING');
  const author = firstAuthor(post);
  const normalizedMedia = media(post);
  return {
    externalPostId,
    postType: text(post.type),
    authorExternalId: text(author.id) ?? text(author.author_id) ?? text(author.profile_id),
    authorName: text(author.name),
    authorUrl: text(author.url) ?? text(author.profile_url),
    message: text(post.message),
    messageRich: text(post.message_rich),
    permalink: text(post.url),
    publishedAt: normalizeFacebookTimestamp(post.timestamp),
    commentsCount: count(post.comments_count),
    reactionsCount: count(post.reactions_count),
    sharesCount: count(post.reshare_count) ?? count(post.shares_count),
    reactions: reactionBreakdown(post.reactions),
    mediaType: normalizedMedia.mediaType,
    mediaUrl: normalizedMedia.mediaUrl,
    thumbnailUrl: normalizedMedia.thumbnailUrl,
    sourcePageId,
    contentOrigin,
    rawPayload: { ...post },
  };
}
