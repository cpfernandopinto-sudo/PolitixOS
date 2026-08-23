import type { FacebookCommentContentType, FacebookNormalizedComment, FacebookProviderComment } from './types';

const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;
const integer = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
};
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\s\u200D\uFE0F])+$/u;

export function classifyFacebookCommentContent(raw: FacebookProviderComment, message: string | null): FacebookCommentContentType {
  if (message) return EMOJI_ONLY.test(message) ? 'EMOJI_ONLY' : 'TEXTUAL';
  if (raw.is_sticker === true || raw.sticker) return 'STICKER';
  if (raw.is_gif === true || raw.gif) return 'GIF';
  if (raw.image || raw.video) return 'IMAGE_ONLY';
  return 'EMPTY';
}

export function normalizeFacebookComment(raw: FacebookProviderComment, externalPostId: string): FacebookNormalizedComment | null {
  const externalCommentId = text(raw.comment_id);
  if (!externalCommentId || !externalPostId) return null;
  const message = text(raw.message);
  const author = record(raw.author);
  const epoch = integer(raw.created_time);
  return {
    externalCommentId,
    legacyCommentId: text(raw.legacy_comment_id),
    externalPostId,
    parentCommentExternalId: text(raw.parent_comment_id),
    depth: integer(raw.depth) ?? 0,
    text: message,
    publishedAt: epoch === null ? null : new Date(epoch * 1000).toISOString(),
    // Minimização de dados: authorProfileUrl/authorProfileImage nunca são
    // usados analiticamente em nenhum ponto do pipeline (sampling, prompt do
    // Gemini, UI) — auditado e confirmado sem consumidor. authorName é
    // preservado porque `sampling.ts` o usa para limitar comentários por
    // autor. Não coletamos gênero (nunca esteve no schema).
    authorId: text(author.id), authorName: text(author.name), authorProfileUrl: null, authorProfileImage: null,
    reactionsCount: integer(raw.reactions_count), repliesCount: integer(raw.replies_count),
    contentType: classifyFacebookCommentContent(raw, message), rawJson: { ...raw },
  };
}

export function normalizeFacebookComments(raw: FacebookProviderComment[], externalPostId: string): FacebookNormalizedComment[] {
  return [...new Map(raw.map((item) => normalizeFacebookComment(item, externalPostId)).filter((item): item is FacebookNormalizedComment => item !== null).map((item) => [item.externalCommentId, item])).values()];
}
