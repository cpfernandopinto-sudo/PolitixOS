import { describe, expect, it, vi } from 'vitest';
import {
  computeFacebookKPIs,
  computeFacebookCharts,
  computeFacebookAlert,
  cleanFilter,
  type FacebookDashboardPost,
  type FacebookPostWithAnalysis,
} from './facebook';

function mockPost(overrides: Partial<FacebookDashboardPost>): FacebookDashboardPost {
  return {
    id: 'post', client_id: null, target_id: null, social_account_id: null, platform: 'facebook',
    platform_post_id: null, post_url: null, caption: null, media_type: null, media_url: null,
    thumbnail_url: null, taken_at: null, like_count: null, comment_count: null, share_count: null,
    total_engagement: 0, ...overrides,
  };
}

const order = vi.fn().mockResolvedValue({ data: [{ id: 'row-1', platform_post_id: 'post-1' }], error: null });
const postsChain = { eq: vi.fn(), gte: vi.fn(), lt: vi.fn(), in: vi.fn(), order };
postsChain.eq.mockReturnValue(postsChain);
postsChain.gte.mockReturnValue(postsChain);
postsChain.lt.mockReturnValue(postsChain);
postsChain.in.mockReturnValue(postsChain);

const aiIn = vi.fn().mockResolvedValue({ data: [{ content_id: 'row-1', sentiment: 'positivo' }], error: null });
const aiChain = { eq: vi.fn(), in: aiIn };
aiChain.eq.mockReturnValue(aiChain);

const accountsChain = { eq: vi.fn(), in: vi.fn() };
accountsChain.eq.mockResolvedValue({ data: [{ id: 'account-1', handle: 'pagina' }], error: null });

const emptyIn = vi.fn().mockResolvedValue({ data: [], error: null });

const from = vi.fn((table: string) => {
  if (table === 'social_posts') return { select: vi.fn().mockReturnValue(postsChain) };
  if (table === 'ai_analysis') return { select: vi.fn().mockReturnValue(aiChain) };
  if (table === 'social_accounts') return { select: vi.fn().mockReturnValue(accountsChain) };
  // facebook_audience_analysis/facebook_comments: consultadas em paralelo com
  // ai_analysis em fetchFacebookPostsWithAnalysis (comments coverage —
  // auditoria do pipeline de comentários); vazias por padrão nos testes que
  // não testam essa cobertura especificamente.
  if (table === 'facebook_audience_analysis' || table === 'facebook_comments') return { select: vi.fn().mockReturnValue({ in: emptyIn }) };
  throw new Error(`unexpected table ${table}`);
});

vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: () => ({ from }) }));

describe('cleanFilter helper', () => {
  it('sanitiza corretamente valores de filtro', () => {
    expect(cleanFilter('all')).toBeNull();
    expect(cleanFilter('TODOS')).toBeNull();
    expect(cleanFilter('—')).toBeNull();
    expect(cleanFilter(undefined)).toBeNull();
    expect(cleanFilter('  positivo  ')).toBe('positivo');
  });
});

describe('computeFacebookKPIs', () => {
  it('calcula métricas executivas corretamente a partir dos posts e análises', () => {
    const mockItems: FacebookPostWithAnalysis[] = [
      {
        post: {
          id: 'p1',
          client_id: 'c1',
          target_id: 't1',
          social_account_id: 'a1',
          platform: 'facebook',
          platform_post_id: '101',
          post_url: 'https://fb.com/101',
          caption: 'Post 1',
          media_type: null,
          media_url: null,
          thumbnail_url: null,
          taken_at: '2026-08-22T10:00:00Z',
          like_count: 100,
          comment_count: 20,
          share_count: 5,
          total_engagement: 125,
        },
        analysis: {
          sentiment: 'positivo',
          risk_level: 'baixo',
        },
      },
      {
        post: {
          id: 'p2',
          client_id: 'c1',
          target_id: 't1',
          social_account_id: 'a1',
          platform: 'facebook',
          platform_post_id: '102',
          post_url: 'https://fb.com/102',
          caption: 'Post 2 com risco',
          media_type: null,
          media_url: null,
          thumbnail_url: null,
          taken_at: '2026-08-22T11:00:00Z',
          like_count: 50,
          comment_count: 10,
          share_count: 2,
          total_engagement: 62,
        },
        analysis: {
          sentiment: 'negativo',
          risk_level: 'alto',
        },
      },
    ];

    const kpis = computeFacebookKPIs(mockItems);

    expect(kpis.totalPosts).toBe(2);
    expect(kpis.analyzedPosts).toBe(2);
    expect(kpis.totalLikes).toBe(150);
    expect(kpis.totalComments).toBe(30);
    expect(kpis.totalShares).toBe(7);
    expect(kpis.totalEngagement).toBe(187);
    expect(kpis.highRiskCount).toBe(1);
    expect(kpis.avgEngagement).toBe(94);
  });
});

describe('computeFacebookCharts', () => {
  it('agrupa sentimentos e tópicos corretamente', () => {
    const mockItems: FacebookPostWithAnalysis[] = [
      {
        post: mockPost({ id: 'p1' }),
        analysis: { sentiment: 'positivo', ai_topic: 'Saúde Pública' },
      },
      {
        post: mockPost({ id: 'p2' }),
        analysis: { sentiment: 'positivo', ai_topic: 'Saúde Pública' },
      },
      {
        post: mockPost({ id: 'p3' }),
        analysis: { sentiment: 'negativo', ai_topic: 'Economia' },
      },
    ];

    const charts = computeFacebookCharts(mockItems);

    expect(charts.sentimentDistribution.positivo).toBe(2);
    expect(charts.sentimentDistribution.negativo).toBe(1);
    expect(charts.topTopics).toEqual([
      { name: 'Saúde Pública', count: 2 },
      { name: 'Economia', count: 1 },
    ]);
  });
});

describe('computeFacebookAlert', () => {
  it('identifica post de alto risco para o card de alerta', () => {
    const mockItems: FacebookPostWithAnalysis[] = [
      {
        post: mockPost({ id: 'p1', caption: 'Post normal', taken_at: '2026-08-22T10:00:00Z', post_url: 'https://fb.com/1' }),
        analysis: { risk_level: 'baixo' },
      },
      {
        post: mockPost({ id: 'p2', caption: 'Post crítico', taken_at: '2026-08-22T11:00:00Z', post_url: 'https://fb.com/2' }),
        analysis: { risk_level: 'crítico', risk_reason: 'Crise de reputação', recommended_action: 'Ação rápida' },
      },
    ];

    const alert = computeFacebookAlert(mockItems);

    expect(alert).not.toBeNull();
    expect(alert?.postId).toBe('p2');
    expect(alert?.riskLevel).toBe('crítico');
    expect(alert?.riskReason).toBe('Crise de reputação');
  });

  it('retorna null se não houver posts de alto risco', () => {
    const mockItems: FacebookPostWithAnalysis[] = [
      {
        post: mockPost({ id: 'p1' }),
        analysis: { risk_level: 'baixo' },
      },
    ];

    expect(computeFacebookAlert(mockItems)).toBeNull();
  });
});

describe('fetchFacebookPostsWithAnalysis read model', () => {
  it('expõe caption do banco no contrato consumido por card, drawer e busca', async () => {
    order.mockResolvedValueOnce({
      data: [{
        id: 'row-caption',
        client_id: 'client-1',
        target_id: 'target-1',
        social_account_id: 'account-1',
        platform_post_id: 'post-caption',
        caption: 'Texto original da publicação',
        taken_at: '2026-08-22T10:00:00Z',
        post_url: 'https://facebook.com/post-caption',
        raw_json: {},
      }],
      error: null,
    });
    aiIn.mockResolvedValueOnce({ data: [], error: null });

    const { fetchFacebookPostsWithAnalysis } = await import('./facebook');
    const result = await fetchFacebookPostsWithAnalysis({ clientId: 'client-1' });

    expect(result[0].post).toMatchObject({
      id: 'row-caption',
      caption: 'Texto original da publicação',
      taken_at: '2026-08-22T10:00:00Z',
      post_url: 'https://facebook.com/post-caption',
    });
  });

  it('expõe comments_collected (real) e audience (Gemini) — nunca confundindo com comment_count (público)', async () => {
    order.mockResolvedValueOnce({
      data: [{
        id: 'row-audience', client_id: 'client-1', target_id: 'target-1', social_account_id: 'account-1',
        platform_post_id: 'post-audience', caption: 'texto', taken_at: '2026-08-22T10:00:00Z',
        post_url: 'https://facebook.com/post-audience', comment_count: 1114, raw_json: {},
      }],
      error: null,
    });
    aiIn.mockResolvedValueOnce({ data: [], error: null });
    const audienceIn = vi.fn().mockResolvedValueOnce({
      data: [{ social_post_id: 'row-audience', audience_sentiment: 'NEGATIVE', audience_sentiment_score: -0.6, support_level: 'baixo', rejection_level: 'alto', polarization_level: 'alta', comments_analyzed: 50, dominant_audience_themes: ['tema-x'], message_audience_divergence: 'audiencia diverge do post' }],
      error: null,
    });
    const commentsIn = vi.fn().mockResolvedValueOnce({
      data: Array.from({ length: 300 }, () => ({ social_post_id: 'row-audience' })),
      error: null,
    });
    (from as ReturnType<typeof vi.fn>).mockImplementationOnce((table: string) => table === 'social_posts' ? { select: vi.fn().mockReturnValue(postsChain) } : (() => { throw new Error('unexpected'); })())
      .mockImplementationOnce((table: string) => table === 'ai_analysis' ? { select: vi.fn().mockReturnValue(aiChain) } : (() => { throw new Error('unexpected'); })())
      .mockImplementationOnce((table: string) => table === 'facebook_audience_analysis' ? { select: vi.fn().mockReturnValue({ in: audienceIn }) } : (() => { throw new Error('unexpected'); })())
      .mockImplementationOnce((table: string) => table === 'facebook_comments' ? { select: vi.fn().mockReturnValue({ in: commentsIn }) } : (() => { throw new Error('unexpected'); })());

    const { fetchFacebookPostsWithAnalysis } = await import('./facebook');
    const result = await fetchFacebookPostsWithAnalysis({ clientId: 'client-1' });

    expect(result[0].post.comment_count).toBe(1114); // número público do Facebook — inalterado
    expect(result[0].post.comments_collected).toBe(300); // quantidade real coletada pelo PolitixOS — bem menor, e é esperado
    expect(result[0].audience).toMatchObject({ audienceSentiment: 'NEGATIVE', commentsAnalyzed: 50, supportLevel: 'baixo', rejectionLevel: 'alto' });
  });

  it('audience é null quando o post ainda não tem facebook_audience_analysis (fila de comentários ainda não processou)', async () => {
    order.mockResolvedValueOnce({
      data: [{ id: 'row-pending', client_id: 'client-1', target_id: 'target-1', social_account_id: 'account-1', platform_post_id: 'post-pending', caption: 'texto', taken_at: '2026-08-22T10:00:00Z', post_url: 'https://facebook.com/post-pending', raw_json: {} }],
      error: null,
    });
    aiIn.mockResolvedValueOnce({ data: [], error: null });
    const { fetchFacebookPostsWithAnalysis } = await import('./facebook');
    const result = await fetchFacebookPostsWithAnalysis({ clientId: 'client-1' });
    expect(result[0].audience).toBeNull();
    expect(result[0].post.comments_collected).toBe(0);
  });
});
