export const INSTAGRAM_CONTENT_TYPES = ['IMAGE', 'REEL', 'CAROUSEL', 'VIDEO', 'OUTRO'] as const;

export type InstagramContentType = (typeof INSTAGRAM_CONTENT_TYPES)[number];

export interface InstagramContentClassificationInput {
  platform?: unknown;
  mediaType?: unknown;
  productType?: unknown;
  rawJson?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalized(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const result = value.trim().toLowerCase();
  return result || null;
}

/**
 * Contrato canônico de formato do Instagram.
 *
 * Prioriza os campos estruturados e usa o payload bruto apenas como fallback.
 * Não classifica outros canais e não infere Story ou Highlight.
 */
export function classifyInstagramContentType({
  platform = 'instagram',
  mediaType,
  productType,
  rawJson,
}: InstagramContentClassificationInput): InstagramContentType | null {
  if (normalized(platform) !== 'instagram') return null;

  const raw = asRecord(rawJson);
  const effectiveMediaType = normalized(mediaType)
    ?? normalized(raw?.media_type)
    ?? normalized(raw?.mediaType);
  const effectiveProductType = normalized(productType)
    ?? normalized(raw?.product_type)
    ?? normalized(raw?.productType);

  if (effectiveMediaType === 'image' || effectiveMediaType === 'photo' || effectiveMediaType === '1') {
    return 'IMAGE';
  }

  if (
    effectiveMediaType === 'carousel'
    || effectiveMediaType === 'carousel_container'
    || effectiveMediaType === '8'
  ) {
    return 'CAROUSEL';
  }

  if (effectiveMediaType === 'video' || effectiveMediaType === '2') {
    return effectiveProductType === 'clips' ? 'REEL' : 'VIDEO';
  }

  return 'OUTRO';
}

/**
 * Acrescenta a classificação sem alterar identidade, tenant ou payload bruto.
 * Um payload de carrossel continua sendo um único post pai.
 */
export function withCanonicalContentType<T extends {
  platform?: unknown;
  media_type?: unknown;
  product_type?: unknown;
  raw_json?: unknown;
  content_type?: unknown;
}>(post: T): T & { content_type: InstagramContentType | null } {
  const persisted = typeof post.content_type === 'string'
    && INSTAGRAM_CONTENT_TYPES.includes(post.content_type as InstagramContentType)
    ? post.content_type as InstagramContentType
    : null;

  return {
    ...post,
    content_type: persisted ?? classifyInstagramContentType({
      platform: post.platform,
      mediaType: post.media_type,
      productType: post.product_type,
      rawJson: post.raw_json,
    }),
  };
}
