/**
 * Espelho em TypeScript de classify_social_content_type (branch Facebook),
 * definida em supabase_migration_facebook_content_type_contract.sql. Mesma
 * lógica, mesmo domínio de valores (IMAGE/REEL/CAROUSEL/VIDEO/OUTRO) — usado
 * para construir o contrato analítico sem round-trip ao banco e para testar a
 * classificação isoladamente.
 *
 * Somente tipos comprovados pelo provider são classificados (image/video/reel
 * observados; album/carousel suportado por analogia ao Instagram, ainda não
 * observado nos dados reais). Fallback: 'OUTRO'.
 */

export type FacebookContentType = 'IMAGE' | 'REEL' | 'CAROUSEL' | 'VIDEO' | 'OUTRO';

export interface FacebookContentClassificationInput {
  mediaType?: unknown;
  rawJson?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalized(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const result = value.trim().toLowerCase();
  return result || null;
}

export function classifyFacebookContentType({ mediaType, rawJson }: FacebookContentClassificationInput): FacebookContentType {
  const raw = asRecord(rawJson);
  const effectiveMediaType = normalized(mediaType) ?? normalized(raw.media_type) ?? normalized(raw.mediaType);

  if (effectiveMediaType === 'image' || effectiveMediaType === 'photo') return 'IMAGE';
  if (effectiveMediaType === 'reel') return 'REEL';
  if (effectiveMediaType === 'album' || effectiveMediaType === 'carousel') return 'CAROUSEL';
  if (effectiveMediaType === 'video') return 'VIDEO';
  return 'OUTRO';
}
