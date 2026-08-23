/**
 * Contrato analítico do Facebook — normaliza uma linha de
 * `facebook_posts_pending_analysis` (ou `social_posts` bruta) para um formato
 * que o consumidor de IA lê sem precisar conhecer `raw_json.reactions_count`
 * ou a ausência intencional de `like_count`.
 *
 * Semântica obrigatória (Bloco 4, Fase Semântica Facebook):
 * - likes: sempre null. Facebook não expõe "curtidas" isoladas de forma
 *   semanticamente equivalente ao like do Instagram/X; reactions_count é a
 *   soma de todas as reações, não um proxy de likes.
 * - reactionsTotal: raw_json.reactions_count.
 * - reactionsBreakdown: raw_json.reactions (like/love/care/haha/wow/sad/angry).
 * - comments: contagem conhecida, texto dos comentários não coletado — nunca
 *   simulado (Fase 9).
 */

export interface FacebookReactionBreakdown {
  like: number | null;
  love: number | null;
  care: number | null;
  haha: number | null;
  wow: number | null;
  sad: number | null;
  angry: number | null;
}

export interface FacebookAnalyticsComments {
  count: number | null;
  textAvailable: false;
}

export interface FacebookAnalyticsEngagement {
  likes: null;
  reactionsTotal: number | null;
  reactionsBreakdown: FacebookReactionBreakdown;
  comments: FacebookAnalyticsComments;
  shares: number | null;
}

export interface FacebookAnalyticsPost {
  id: string;
  clientId: string | null;
  targetId: string | null;
  platform: 'facebook';
  contentOrigin: string | null;
  contentType: string | null;
  text: string | null;
  publishedAt: string | null;
  url: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
  engagement: FacebookAnalyticsEngagement;
}

export interface FacebookAnalyticsSourceRow {
  id: string;
  client_id?: string | null;
  target_id?: string | null;
  content_origin?: string | null;
  content_type?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  caption?: string | null;
  taken_at?: string | null;
  post_url?: string | null;
  platform_post_id?: string | null;
  comment_count?: number | null;
  raw_json?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function toVisualAssetUrl(value: unknown): string | null {
  const url = toText(value);
  if (!url) return null;
  return /^https?:\/\/(?:www\.)?facebook\.com\/reel(?:\/|$)/i.test(url) ? null : url;
}

function reactionsBreakdown(raw: Record<string, unknown>): FacebookReactionBreakdown {
  const reactions = asRecord(raw.reactions);
  return {
    like: toNumber(reactions.like),
    love: toNumber(reactions.love),
    care: toNumber(reactions.care),
    haha: toNumber(reactions.haha),
    wow: toNumber(reactions.wow),
    sad: toNumber(reactions.sad),
    angry: toNumber(reactions.angry),
  };
}

/** Normaliza uma linha de social_posts/facebook_posts_pending_analysis para o contrato analítico. Nunca converte ausência em zero. */
export function toFacebookAnalyticsContract(row: FacebookAnalyticsSourceRow): FacebookAnalyticsPost {
  const raw = asRecord(row.raw_json);
  const payload = asRecord(raw.payload);
  const payloadImage = asRecord(payload.image);

  const mediaUrl =
    toVisualAssetUrl(row.media_url) ??
    toVisualAssetUrl(raw.media_url) ??
    toVisualAssetUrl(payload.image_url) ??
    toVisualAssetUrl(payload.media_url) ??
    toText(payloadImage.uri) ??
    toText(payloadImage.url) ??
    toText(payloadImage.src) ??
    toText(payload.image) ??
    null;

  const thumbnailUrl =
    toText(raw.thumbnail_url) ??
    toText(payload.thumbnail_url) ??
    toText(payload.video_thumbnail) ??
    toText(payload.profile_picture_url) ??
    null;

  const mediaType =
    toText(row.media_type) ??
    toText(raw.post_type) ??
    toText(payload.type) ??
    (mediaUrl ? 'image' : null);

  return {
    id: row.id,
    clientId: row.client_id ?? null,
    targetId: row.target_id ?? null,
    platform: 'facebook',
    contentOrigin: row.content_origin ?? null,
    contentType: row.content_type ?? null,
    text: toText(row.caption),
    publishedAt: row.taken_at ?? null,
    url: row.post_url ?? null,
    mediaUrl,
    mediaType,
    thumbnailUrl,
    engagement: {
      likes: null,
      reactionsTotal: toNumber(raw.reactions_count),
      reactionsBreakdown: reactionsBreakdown(raw),
      comments: { count: toNumber(raw.comments_count) ?? toNumber((row as { comment_count?: unknown }).comment_count), textAvailable: false },
      shares: toNumber((row as { share_count?: unknown }).share_count) ?? toNumber(raw.shares_count),
    },
  };
}

/**
 * engagementTotal = reactionsTotal + comments + shares (Fase 3).
 * NÃO é sentimento — é apenas um agregado comportamental. Retorna null
 * somente quando as três parcelas são desconhecidas; parcelas ausentes
 * individualmente contam como 0 na soma (documentado, nunca oculto).
 */
export function computeFacebookEngagementTotal(post: FacebookAnalyticsPost): number | null {
  const { reactionsTotal, comments, shares } = post.engagement;
  if (reactionsTotal === null && comments.count === null && shares === null) return null;
  return (reactionsTotal ?? 0) + (comments.count ?? 0) + (shares ?? 0);
}
