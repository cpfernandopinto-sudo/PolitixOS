import type { FacebookNormalizedPost, FacebookProviderPost, FacebookReactionBreakdown } from './types';

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' ? String(value) : null;
const visualAssetUrl = (value: unknown): string | null => {
  const url = text(value);
  if (!url) return null;
  return /^https?:\/\/(?:www\.)?facebook\.com\/reel(?:\/|$)/i.test(url) ? null : url;
};
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
    like: count(reactions.like),
    love: count(reactions.love),
    care: count(reactions.care),
    haha: count(reactions.haha),
    wow: count(reactions.wow),
    sad: count(reactions.sad),
    angry: count(reactions.angry),
  };
}

function media(post: FacebookProviderPost) {
  const image = object(post.image);
  const video = object(post.video);
  const mediaObj = object(post.media);

  const directImage = text(post.image);
  const directVideo = text(post.video);
  const directImageUrl = text(post.image_url);
  const directMediaUrl = visualAssetUrl(post.media_url);
  const directThumbnailUrl = text(post.thumbnail_url) ?? text(post.video_thumbnail);

  // Extrai de album_preview se for um array de fotos/vídeos
  let albumImage: string | null = null;
  if (Array.isArray(post.album_preview) && post.album_preview.length > 0) {
    const firstAlbum = object(post.album_preview[0]);
    albumImage =
      text(firstAlbum.image_file_uri) ??
      text(firstAlbum.uri) ??
      text(firstAlbum.url) ??
      text(object(firstAlbum.image).uri) ??
      text(object(firstAlbum.image).url);
  }

  // Extrai de attachments se houver
  let attachmentImage: string | null = null;
  if (Array.isArray(post.attachments) && post.attachments.length > 0) {
    const firstAtt = object(post.attachments[0]);
    const attMedia = object(firstAtt.media);
    const attImage = object(attMedia.image);
    attachmentImage = text(attImage.src) ?? text(attImage.uri) ?? text(attImage.url) ?? text(firstAtt.url);
  }

  // IMPORTANTE: mediaUrl é usado como <img src> pela UI. `post.video` como
  // STRING (visto em Reels reais do provider) é a URL da PÁGINA do Reel
  // (ex. https://www.facebook.com/reel/<id>/), não um arquivo de imagem —
  // usá-la quebra a renderização e nunca cai no fallback de thumbnailUrl
  // (abaixo), já que continuaria não-nulo. `post.video` como OBJETO com um
  // `.url`/`.playable_url` de arquivo de vídeo real é um caso diferente,
  // preservado (ver teste "normaliza vídeo").
  const mediaUrl =
    visualAssetUrl(video.url) ??
    visualAssetUrl(video.playable_url) ??
    directImage ??
    text(image.url) ??
    text(image.uri) ??
    text(image.src) ??
    directImageUrl ??
    directMediaUrl ??
    albumImage ??
    attachmentImage ??
    text(mediaObj.url) ??
    text(mediaObj.uri) ??
    text(mediaObj.image_uri) ??
    null;

  const thumbnailUrl =
    directThumbnailUrl ??
    text(video.thumbnail) ??
    text(video.thumbnail_url) ??
    text(image.thumbnail) ??
    text(mediaObj.thumbnail) ??
    text(post.profile_picture_url) ??
    null;

  const declaredType = text(post.type)?.toLowerCase() ?? text(mediaObj.type)?.toLowerCase();
  const mediaType = declaredType?.includes('reel')
    ? 'reel'
    : declaredType?.includes('video') || directVideo || Object.keys(video).length > 0
    ? 'video'
    : declaredType?.includes('photo') ||
      declaredType?.includes('image') ||
      directImage ||
      albumImage ||
      attachmentImage ||
      Object.keys(image).length > 0
    ? 'image'
    : declaredType ?? (mediaUrl ? 'image' : null);

  return { mediaType, mediaUrl, thumbnailUrl };
}

export function normalizeFacebookPost(
  post: FacebookProviderPost,
  sourcePageId: string,
  contentOrigin: 'OWNED' | 'EXTERNAL' = 'OWNED'
): FacebookNormalizedPost {
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
    // video_files (video_hd_file/video_sd_file) nunca são lidos por nenhum
    // consumidor (auditado: grep em todo o repositório) — são URLs assinadas
    // temporárias e pesadas do provider; persisti-las seria desperdício de
    // payload sem função (seção "Posts — validar ingestão" da auditoria do
    // pipeline de comentários). Demais campos do payload bruto preservados.
    rawPayload: Object.fromEntries(Object.entries(post).filter(([key]) => key !== 'video_files')),
  };
}
