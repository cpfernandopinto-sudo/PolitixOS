import type { FacebookNormalizedComment } from './types';

const normalizedText = (value: string | null) => value?.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim() ?? '';

export function sampleFacebookComments(comments: FacebookNormalizedComment[], limit = 50): FacebookNormalizedComment[] {
  const cap = Math.max(1, Math.min(limit, 100));
  const useful = comments.filter((comment) => comment.contentType === 'TEXTUAL' || comment.contentType === 'EMOJI_ONLY');
  const unique: FacebookNormalizedComment[] = [];
  const texts = new Set<string>(); const authors = new Map<string, number>();
  const ranked = [...useful].sort((a, b) => (b.reactionsCount ?? 0) - (a.reactionsCount ?? 0) || (Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0));
  const spread = useful.filter((_, index) => index % Math.max(1, Math.floor(useful.length / Math.max(1, Math.ceil(cap / 3)))) === 0);
  const recent = [...useful].sort((a, b) => (Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0));
  for (const candidate of [...ranked.slice(0, Math.ceil(cap / 3)), ...recent.slice(0, Math.ceil(cap / 3)), ...spread, ...ranked]) {
    const key = normalizedText(candidate.text); const author = candidate.authorId ?? candidate.authorName ?? '';
    if (!key || texts.has(key) || (author && (authors.get(author) ?? 0) >= 3)) continue;
    texts.add(key); if (author) authors.set(author, (authors.get(author) ?? 0) + 1); unique.push(candidate);
    if (unique.length >= cap) break;
  }
  return unique;
}
