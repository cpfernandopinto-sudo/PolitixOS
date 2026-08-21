import { describe, expect, it } from 'vitest';
import {
  buildInstagramUiContract,
  mapInstagramComments,
  mapInstagramEnrichment,
  mapInstagramPost,
  normalizeInstagramContentTypeFilter,
} from './ui-contract';

const basePost = (overrides: Record<string, unknown> = {}) => ({
  id: 'post-1',
  target_id: 'target-a',
  client_id: 'client-a',
  platform: 'instagram',
  caption: 'Legenda',
  content_type: 'IMAGE',
  media_type: 'image',
  media_url: 'https://cdn.example/image.jpg',
  post_url: 'https://instagram.com/p/ABC/',
  taken_at: '2026-08-20T12:00:00.000Z',
  collected_at: '2026-08-21T12:00:00.000Z',
  like_count: 10,
  comment_count: 2,
  raw_json: {},
  ...overrides,
});

describe('Instagram UI data contract', () => {
  it('normaliza somente content types canônicos e remove duplicatas', () => {
    expect(normalizeInstagramContentTypeFilter(['reel', 'REEL', 'story', 'carousel'])).toEqual(['REEL', 'CAROUSEL']);
  });

  it('recusa posts de X sem alterar sua semântica', () => {
    expect(mapInstagramPost(basePost({ platform: 'x', content_type: null }))).toBeNull();
  });

  it('distingue zero real de métrica indisponível', () => {
    const mapped = mapInstagramPost(basePost({ like_count: 0, comment_count: 0, raw_json: {} }));
    expect(mapped?.metrics.likes).toMatchObject({ value: 0, availability: 'AVAILABLE' });
    expect(mapped?.metrics.plays).toMatchObject({ value: null, availability: 'UNAVAILABLE' });
    expect(mapped?.metrics.reach).toMatchObject({ value: null, availability: 'UNAVAILABLE' });
  });

  it('mapeia Reel sem confundir plays com views e sem inventar áudio', () => {
    const mapped = mapInstagramPost(basePost({
      content_type: 'REEL',
      media_type: 'video',
      raw_json: { product_type: 'clips', play_count: 123, video_duration: 8.5, has_audio: true, music_metadata: null },
    }));
    expect(mapped?.reel).toMatchObject({ hasAudio: true, audioAttribution: null });
    expect(mapped?.metrics.plays).toMatchObject({ value: 123, availability: 'AVAILABLE' });
    expect(mapped?.metrics.views).toMatchObject({ value: null, availability: 'UNAVAILABLE' });
  });

  it('mantém um carrossel como um post e expõe children sem multiplicar métricas', () => {
    const mapped = mapInstagramPost(basePost({
      content_type: 'CAROUSEL',
      media_type: 'carousel',
      raw_json: { carousel_media: [{ id: 'slide-1', media_type: 'image' }, { id: 'slide-2', media_type: 'video' }] },
    }));
    expect(mapped?.carousel?.childCount).toBe(2);
    expect(mapped?.carousel?.children).toHaveLength(2);
    expect(mapped?.metrics.likes.value).toBe(10);
  });

  it('mapeia comentários, parent_comment_id e disponibilidade real de replies', () => {
    const comments = mapInstagramComments([
      { id: 'c1', instagram_comment_id: 'ig-1', post_id: 'post-1', comment_text: 'Pai', like_count: 0, collected_at: '2026-08-21T10:00:00Z' },
      { id: 'c2', instagram_comment_id: 'ig-2', post_id: 'post-1', parent_comment_id: 'c1', comment_text: 'Resposta', like_count: 1, collected_at: '2026-08-21T11:00:00Z' },
    ]);
    expect(comments[0]).toMatchObject({ repliesAvailable: true, parentCommentId: null });
    expect(comments[1]).toMatchObject({ repliesAvailable: false, parentCommentId: 'c1' });
  });

  it('extrai somente enrichment funcional e não devolve raw_json', () => {
    const mapped = mapInstagramEnrichment({ _v2_enrichment: { play_count: 45, video_duration: 12, has_audio: false, provider_debug: 'omit' } });
    expect(mapped).toEqual({
      available: true,
      playCount: { value: 45, availability: 'AVAILABLE', source: 'raw_json' },
      durationSeconds: { value: 12, availability: 'AVAILABLE', source: 'raw_json' },
      hasAudio: false,
      audioAttribution: null,
    });
    expect(JSON.stringify(mapped)).not.toContain('provider_debug');
  });

  it('produz empty state e paginação determinísticos', () => {
    const empty = buildInstagramUiContract({ posts: [], comments: [], analyses: [], page: 2, pageSize: 10 });
    expect(empty.summary).toEqual({ posts: 0, comments: 0, analyzedPosts: 0 });
    expect(empty.collectionFreshness.state).toBe('EMPTY');
    expect(empty.pagination).toMatchObject({ page: 2, pageSize: 10, total: 0, totalPages: 0, hasNextPage: false });
  });

  it('pagina posts sem N+1 e preserva totais do conjunto', () => {
    const posts = Array.from({ length: 25 }, (_, index) => basePost({ id: `post-${index}`, taken_at: new Date(Date.UTC(2026, 7, index + 1)).toISOString() }));
    const contract = buildInstagramUiContract({ posts, comments: [], analyses: [], page: 2, pageSize: 10 });
    expect(contract.recentPosts).toHaveLength(10);
    expect(contract.summary.posts).toBe(25);
    expect(contract.pagination).toMatchObject({ total: 25, totalPages: 3, hasNextPage: true });
  });

  it('usa like_count como critério explícito de comentário relevante', () => {
    const contract = buildInstagramUiContract({
      posts: [basePost()],
      comments: [
        { id: 'c1', instagram_comment_id: 'ig-1', post_id: 'post-1', comment_text: 'A', like_count: 1, collected_at: '2026-08-21T10:00:00Z' },
        { id: 'c2', instagram_comment_id: 'ig-2', post_id: 'post-1', comment_text: 'B', like_count: 9, collected_at: '2026-08-21T11:00:00Z' },
      ],
      analyses: [],
    });
    expect(contract.comments.relevanceCriterion).toBe('like_count');
    expect(contract.comments.relevant[0].id).toBe('c2');
    expect(contract.comments.relevant[0]).toMatchObject({ postCaption: 'Legenda', postUrl: 'https://instagram.com/p/ABC/' });
  });

  it('expõe filtros permitidos e recomendação sem vazar payload bruto', () => {
    const contract = buildInstagramUiContract({
      posts: [basePost()], comments: [],
      analyses: [{ content_id: 'post-1', risk_level: 'alto', recommended_action: 'Monitorar resposta' }],
      targetNames: new Map([['target-a', 'Candidata A'], ['target-b', 'Candidato B']]),
    });
    expect(contract.filterOptions.candidates).toEqual([{ id: 'target-a', name: 'Candidata A' }, { id: 'target-b', name: 'Candidato B' }]);
    expect(contract.filterOptions.risks).toEqual(['alto']);
    expect(contract.recentPosts[0].analysis.recommendedAction).toBe('Monitorar resposta');
    expect(JSON.stringify(contract)).not.toContain('raw_json');
  });

  it('mantém métricas distintas na agregação por tipo', () => {
    const contract = buildInstagramUiContract({
      posts: [
        basePost({ id: 'r1', content_type: 'REEL', media_type: 'video', like_count: 5, comment_count: 2, raw_json: { product_type: 'clips', play_count: 100 } }),
        basePost({ id: 'r2', content_type: 'REEL', media_type: 'video', like_count: 3, comment_count: 1, raw_json: { product_type: 'clips' } }),
      ],
      comments: [],
      analyses: [],
    });
    expect(contract.performanceByType[0]).toMatchObject({
      type: 'REEL',
      likes: { value: 8 },
      comments: { value: 3 },
      plays: { value: 100 },
      postsWithPlayData: 1,
    });
    expect(contract.topPosts.criterion).toBe('likes_desc_then_comments_desc');
    expect(contract.availability).toMatchObject({ reach: false, impressions: false, shares: false, saves: false, transcript: false });
  });

  it('constrói pressão temporal com todo o recorte, não somente a página atual', () => {
    const contract = buildInstagramUiContract({
      posts: [
        basePost({ id: 'p1', taken_at: '2026-08-19T12:00:00Z', like_count: 10, comment_count: 2 }),
        basePost({ id: 'p2', taken_at: '2026-08-20T12:00:00Z', like_count: 20, comment_count: 3 }),
      ],
      comments: [], analyses: [], page: 2, pageSize: 1,
    });
    expect(contract.recentPosts).toHaveLength(1);
    expect(contract.socialPressure).toEqual([
      { date: '2026-08-19', comments: 2, engagement: 12 },
      { date: '2026-08-20', comments: 3, engagement: 23 },
    ]);
  });

  it('prioriza risco antes do engajamento e expõe apenas sentimentos suportados pelo recorte', () => {
    const contract = buildInstagramUiContract({
      posts: [
        basePost({ id: 'baixo', like_count: 999, comment_count: 50 }),
        basePost({ id: 'alto', like_count: 5, comment_count: 1 }),
      ],
      comments: [],
      analyses: [
        { content_id: 'baixo', risk_level: 'baixo', sentiment: 'positivo' },
        { content_id: 'alto', risk_level: 'alto', sentiment: 'negativo' },
      ],
    });
    expect(contract.priorityPosts.items.map((post) => post.id)).toEqual(['alto', 'baixo']);
    expect(contract.priorityPosts.criterion).toBe('risk_desc_then_engagement_desc');
    expect(contract.filterOptions.sentiments).toEqual(['negativo', 'positivo']);
  });
});
