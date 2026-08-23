import { describe, expect, it, vi } from 'vitest';
import { FacebookCommentsProvider } from './provider';
import { normalizeFacebookComment } from './normalizer';
import { collectFacebookComments } from './pagination';
import { sampleFacebookComments } from './sampling';
import { persistFacebookComments } from './persistence';

describe('Facebook comments pipeline', () => {
  it('chama o endpoint homologado com post_id/cursor e autenticação server-side', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ comment_id: 'c1' }], cursor: 'next' }), { status: 200 }));
    const provider = new FacebookCommentsProvider({ apiKey: 'secret', host: 'facebook-scraper3.p.rapidapi.com' }, fetcher);
    const page = await provider.getPostComments({ postId: 'p1', cursor: 'cur' });
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toContain('/post/comments?post_id=p1&cursor=cur');
    expect(init.headers).toMatchObject({ 'X-RapidAPI-Key': 'secret' });
    expect(page).toMatchObject({ cursor: 'next', comments: [{ comment_id: 'c1' }] });
  });

  it('normaliza epoch, inteiros string, null, sticker e emoji sem inventar texto', () => {
    expect(normalizeFacebookComment({ comment_id: 'c1', created_time: 1_700_000_000, message: '😀', reactions_count: '7', replies_count: '2', depth: 0, parent_comment_id: null }, 'p1')).toMatchObject({ text: '😀', contentType: 'EMOJI_ONLY', reactionsCount: 7, repliesCount: 2, publishedAt: '2023-11-14T22:13:20.000Z' });
    expect(normalizeFacebookComment({ comment_id: 'c2', message: null, is_sticker: true, sticker: { label: 'ok' } }, 'p1')).toMatchObject({ text: null, contentType: 'STICKER' });
  });

  it('minimização de dados: nunca persiste foto de perfil nem URL de perfil do autor do comentário (sem uso analítico em todo o pipeline)', () => {
    const comment = normalizeFacebookComment({ comment_id: 'c1', message: 'texto', author: { id: 'a1', name: 'Fulano', url: 'https://facebook.com/fulano', profile_image: 'https://cdn.example/avatar.jpg' } }, 'p1');
    expect(comment).toMatchObject({ authorId: 'a1', authorName: 'Fulano', authorProfileUrl: null, authorProfileImage: null });
  });

  it('pagina, deduplica e para no limite', async () => {
    const getPostComments = vi.fn()
      .mockResolvedValueOnce({ comments: [{ comment_id: '1' }, { comment_id: '2' }], cursor: 'a', raw: {} })
      .mockResolvedValueOnce({ comments: [{ comment_id: '2' }, { comment_id: '3' }], cursor: 'b', raw: {} });
    const result = await collectFacebookComments({ getPostComments }, { postId: 'p', maxComments: 3 });
    expect(result).toMatchObject({ pagesFetched: 2, requestsUsed: 2, termination: 'LIMIT' });
    expect(result.comments.map((c) => c.comment_id)).toEqual(['1','2','3']);
  });

  it('amostra top + recentes + distribuição, deduplicando texto e limitando autor', () => {
    const comments = Array.from({ length: 20 }, (_, i) => ({ externalCommentId: `c${i}`, legacyCommentId: null, externalPostId: 'p', parentCommentExternalId: null, depth: 0, text: i === 19 ? 'duplicado' : `texto ${i}`, publishedAt: new Date(1_700_000_000_000 + i * 1000).toISOString(), authorId: i < 5 ? 'same' : `a${i}`, authorName: null, authorProfileUrl: null, authorProfileImage: null, reactionsCount: i, repliesCount: 0, contentType: 'TEXTUAL' as const, rawJson: {} }));
    const sample = sampleFacebookComments([...comments, { ...comments[0], externalCommentId: 'dup', text: 'texto 0' }], 10);
    expect(sample).toHaveLength(10); expect(new Set(sample.map((c) => c.text)).size).toBe(10);
    expect(sample.filter((c) => c.authorId === 'same').length).toBeLessThanOrEqual(3);
  });

  it('faz upsert idempotente tenant-aware', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const db = { from: vi.fn(() => ({ upsert })) };
    const comment = normalizeFacebookComment({ comment_id: 'c1', message: 'real' }, 'p1')!;
    await persistFacebookComments(db, [comment, comment], { clientId: 'cl', targetId: 't', socialPostId: 'sp', externalPostId: 'p1' });
    expect(upsert.mock.calls[0][0]).toHaveLength(1);
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: 'client_id,external_comment_id' });
  });
});
