import { describe, expect, it, vi } from 'vitest';

const from = vi.fn((table: string) => {
  if (table === 'targets') return { select: vi.fn().mockResolvedValue({ data: [{ id: 'target-1', candidate_name: 'Fulano' }], error: null }) };
  throw new Error(`unexpected table ${table}`);
});

vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: () => ({ from }) }));

const fetchFacebookDataMock = vi.fn();
vi.mock('./facebook', () => ({ fetchFacebookData: (...args: unknown[]) => fetchFacebookDataMock(...args) }));

const post1 = {
  id: 'post-1',
  client_id: 'client-1',
  target_id: 'target-1',
  post_url: 'https://facebook.com/post-1',
  caption: 'Texto do post',
  taken_at: '2026-08-22T00:00:00Z',
  comment_count: 24,
  share_count: 4,
  raw_json: { reactions_count: 19, reactions: { like: 17 }, comments_count: 24 },
};

describe('fetchFacebookOverviewPosts', () => {
  it('achata post+analysis para o mesmo formato plano de Instagram/X (text/created_at/sentiment/risk/topic)', async () => {
    fetchFacebookDataMock.mockResolvedValueOnce({
      items: [{ post: post1, analysis: { sentiment: 'positivo', risk_level: 'baixo', ai_topic: 'Segurança', recommended_action: 'Monitorar' } }],
      accounts: [],
      completeness: 'COMPLETE',
    });

    const { fetchFacebookOverviewPosts } = await import('./facebook-overview-adapter');
    const posts = await fetchFacebookOverviewPosts({ candidateIds: ['target-1'], period: '30', allowedTargetIds: null });

    expect(posts).toEqual([{
      id: 'post-1',
      target_id: 'target-1',
      candidate_name: 'Fulano',
      text: 'Texto do post',
      created_at: '2026-08-22T00:00:00Z',
      like_count: null,
      comment_count: 24,
      share_count: 4,
      engagement_total: 19 + 24 + 4,
      url: 'https://facebook.com/post-1',
      sentiment: 'positivo',
      risk: 'baixo',
      topic: 'Segurança',
      recommendedAction: 'Monitorar',
    }]);
  });

  it('nunca converte like_count ausente em zero — permanece null no formato achatado', async () => {
    fetchFacebookDataMock.mockResolvedValueOnce({ items: [{ post: post1, analysis: null }], accounts: [], completeness: 'MISSING' });
    const { fetchFacebookOverviewPosts } = await import('./facebook-overview-adapter');
    const [post] = await fetchFacebookOverviewPosts({});
    expect(post.like_count).toBeNull();
  });

  it('usa "Sem análise" quando não há linha de ai_analysis, mesma convenção do Instagram', async () => {
    fetchFacebookDataMock.mockResolvedValueOnce({ items: [{ post: post1, analysis: null }], accounts: [], completeness: 'MISSING' });
    const { fetchFacebookOverviewPosts } = await import('./facebook-overview-adapter');
    const [post] = await fetchFacebookOverviewPosts({});
    expect(post.sentiment).toBe('Sem análise');
    expect(post.risk).toBe('Sem análise');
    expect(post.topic).toBe('Sem análise');
  });

  it('não consulta targets quando não há posts (lista vazia)', async () => {
    fetchFacebookDataMock.mockResolvedValueOnce({ items: [], accounts: [], completeness: 'MISSING' });
    from.mockClear();
    const { fetchFacebookOverviewPosts } = await import('./facebook-overview-adapter');
    const posts = await fetchFacebookOverviewPosts({});
    expect(posts).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('retorna vazio sem consultar nada quando allowedTargetIds=[] (defesa em profundidade, redundante com resolveFacebookTargetScope — ver comentário no adapter)', async () => {
    from.mockClear();
    fetchFacebookDataMock.mockClear();
    const { fetchFacebookOverviewPosts } = await import('./facebook-overview-adapter');
    const posts = await fetchFacebookOverviewPosts({ allowedTargetIds: [] });
    expect(posts).toEqual([]);
    expect(fetchFacebookDataMock).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it('allowedTargetIds=null (admin, sem restrição) continua consultando normalmente', async () => {
    fetchFacebookDataMock.mockResolvedValueOnce({ items: [], accounts: [], completeness: 'MISSING' });
    const { fetchFacebookOverviewPosts } = await import('./facebook-overview-adapter');
    await fetchFacebookOverviewPosts({ allowedTargetIds: null });
    expect(fetchFacebookDataMock).toHaveBeenCalled();
  });

  it('repassa candidateIds/period/allowedTargetIds para fetchFacebookData sem inventar escopo', async () => {
    fetchFacebookDataMock.mockResolvedValueOnce({ items: [], accounts: [], completeness: 'MISSING' });
    const { fetchFacebookOverviewPosts } = await import('./facebook-overview-adapter');
    await fetchFacebookOverviewPosts({ candidateIds: ['t1'], period: '7', allowedTargetIds: ['t1', 't2'] });
    expect(fetchFacebookDataMock).toHaveBeenCalledWith({ candidateIds: ['t1'], period: '7', allowedTargetIds: ['t1', 't2'] });
  });
});
