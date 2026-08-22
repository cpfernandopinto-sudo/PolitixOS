import { describe, expect, it } from 'vitest';
import { normalizeFacebookPost, normalizeFacebookTimestamp } from './normalizer';

describe('Facebook V1 normalizer', () => {
  it('normaliza payload observado com imagem e breakdown de reações', () => {
    const post = normalizeFacebookPost({
      post_id: 'stable-1', type: 'photo', url: 'https://facebook.example/posts/1',
      message: 'Mensagem', message_rich: '<p>Mensagem</p>', timestamp: 1_787_400_000,
      comments_count: '4', reactions_count: 10, reshare_count: 2,
      reactions: { like: 5, love: 2, care: 1, haha: 1, wow: 1, sad: 0, angry: 0 },
      author: { id: 'author-1', name: 'Página', url: 'https://facebook.example/page' },
      image: { url: 'https://cdn.example/image.jpg', thumbnail: 'https://cdn.example/thumb.jpg' },
    }, 'page-1');
    expect(post).toMatchObject({
      externalPostId: 'stable-1', mediaType: 'image', mediaUrl: 'https://cdn.example/image.jpg',
      commentsCount: 4, reactionsCount: 10, sharesCount: 2, authorExternalId: 'author-1',
      reactions: { like: 5, love: 2, care: 1, haha: 1, wow: 1, sad: 0, angry: 0 },
    });
    expect(post.publishedAt).toBe(new Date(1_787_400_000_000).toISOString());
  });

  it('preserva post sem imagem e campos ausentes como null', () => {
    const post = normalizeFacebookPost({ post_id: 'text-1', type: 'status', message: 'Texto' }, 'page-1');
    expect(post).toMatchObject({ mediaUrl: null, thumbnailUrl: null, commentsCount: null, reactionsCount: null, publishedAt: null });
  });

  it('normaliza vídeo e timestamp ISO', () => {
    const post = normalizeFacebookPost({ post_id: 'video-1', type: 'video', timestamp: '2026-08-20T12:00:00Z', video: { url: 'https://cdn.example/video.mp4' } }, 'page-1');
    expect(post).toMatchObject({ mediaType: 'video', mediaUrl: 'https://cdn.example/video.mp4', publishedAt: '2026-08-20T12:00:00.000Z' });
  });

  it('falha fechada sem post_id estável', () => {
    expect(() => normalizeFacebookPost({ message: 'sem id' }, 'page-1')).toThrow('FACEBOOK_POST_ID_MISSING');
  });

  it('rejeita timestamp inválido', () => {
    expect(normalizeFacebookTimestamp('data-inválida')).toBeNull();
  });
});
