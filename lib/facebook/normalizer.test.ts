import { describe, expect, it } from 'vitest';
import runtimeFixture from './fixtures/page-posts.runtime.sanitized.json';
import { normalizeFacebookPost, normalizeFacebookTimestamp } from './normalizer';

describe('Facebook V1 normalizer', () => {
  it('normaliza a fixture sanitizada capturada do facebook-scraper3', () => {
    const post = normalizeFacebookPost(runtimeFixture.results[0], '100064348075846');
    expect(post).toMatchObject({
      externalPostId: '1507432994744955',
      postType: 'post',
      authorExternalId: '100064348075846',
      mediaType: 'image',
      mediaUrl: 'https://sanitized.invalid/image.jpg',
      publishedAt: '2026-08-22T16:21:18.000Z',
      commentsCount: 23,
      reactionsCount: 18,
      sharesCount: 0,
      reactions: { angry: 0, care: 0, haha: 0, like: 16, love: 2, sad: 0, wow: 0 },
    });
  });

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

  it('Reel real: post.video é a URL DA PÁGINA do Reel (string), nunca deve virar mediaUrl (quebraria o <img>) — usa video_thumbnail', () => {
    const post = normalizeFacebookPost({
      post_id: 'reel-1', type: 'post', timestamp: 1_787_400_000,
      video: 'https://www.facebook.com/reel/1877133286597772/',
      video_thumbnail: 'https://scontent.example/thumb.jpg',
      video_files: { video_hd_file: 'https://video.example/hd.mp4', video_sd_file: 'https://video.example/sd.mp4' },
    }, 'page-1');
    expect(post.mediaUrl).toBeNull();
    expect(post.thumbnailUrl).toBe('https://scontent.example/thumb.jpg');
    expect(post.mediaType).toBe('video');
  });

  it('Reel real: também rejeita URL da página quando o provider a envia em media_url', () => {
    const post = normalizeFacebookPost({
      post_id: 'reel-media-url', type: 'reel',
      media_url: 'https://www.facebook.com/reel/1877133286597772/',
      video_thumbnail: 'https://scontent.example/reel-thumb.jpg',
    }, 'page-1');
    expect(post.mediaUrl).toBeNull();
    expect(post.thumbnailUrl).toBe('https://scontent.example/reel-thumb.jpg');
    expect(post.mediaType).toBe('reel');
  });

  it('minimização de payload: nunca persiste video_files (URLs assinadas temporárias e pesadas, sem consumidor) em rawPayload', () => {
    const post = normalizeFacebookPost({
      post_id: 'reel-2', type: 'post', timestamp: 1_787_400_000,
      video: 'https://www.facebook.com/reel/999/', video_thumbnail: 'https://scontent.example/thumb2.jpg',
      video_files: { video_hd_file: 'https://video.example/hd2.mp4', video_sd_file: 'https://video.example/sd2.mp4' },
      message: 'legenda preservada',
    }, 'page-1');
    expect(post.rawPayload).not.toHaveProperty('video_files');
    expect(post.rawPayload.message).toBe('legenda preservada');
  });

  it('falha fechada sem post_id estável', () => {
    expect(() => normalizeFacebookPost({ message: 'sem id' }, 'page-1')).toThrow('FACEBOOK_POST_ID_MISSING');
  });

  it('rejeita timestamp inválido', () => {
    expect(normalizeFacebookTimestamp('data-inválida')).toBeNull();
  });
});
