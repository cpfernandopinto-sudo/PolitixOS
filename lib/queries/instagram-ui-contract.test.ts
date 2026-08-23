import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/dal', () => ({
  getAllowedTargetIds: vi.fn().mockResolvedValue(null),
  getActiveClientId: vi.fn().mockResolvedValue(null),
}));

/**
 * Stub encadeável mínimo do client Supabase — cada método devolve `this` e o
 * objeto é "thenable" (implementa `.then`), resolvendo para o resultado
 * configurado para aquela tabela/seleção. Só o suficiente para exercitar
 * getInstagramUiContract de ponta a ponta sem um banco real.
 */
function makeChain(result: { data: unknown[] | null; error: { message: string } | null; count?: number | null }) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    gte: () => chain,
    range: () => chain,
    limit: () => chain,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

function makeSupabaseStub(options: {
  targets?: Array<{ id: string; candidate_name: string; client_id: string | null }>;
  posts?: Array<Record<string, unknown>>;
  postsCount?: number;
  analyses?: Array<Record<string, unknown>>;
  comments?: Array<Record<string, unknown>>;
  postsError?: { message: string } | null;
  analysisError?: { message: string } | null;
  commentsError?: { message: string } | null;
  rawJsonDelayMs?: number;
  rawJsonByPostId?: Map<string, unknown>;
}) {
  const posts = options.posts ?? [];
  const postsCount = options.postsCount ?? posts.length;
  const analyses = options.analyses ?? [];
  const comments = options.comments ?? [];

  const from = vi.fn((table: string) => {
    if (table === 'targets') {
      return makeChain({ data: options.targets ?? [], error: null });
    }
    if (table === 'social_posts') {
      // select() é chamado antes de sabermos se é a busca principal (com
      // like_count/comment_count) ou a busca acessória de raw_json — por
      // isso o próprio select() decide qual cadeia devolver.
      return {
        select: (columns: string) => {
          if (columns === 'id,raw_json') {
            const rawChain: Record<string, unknown> = {
              in: (_col: string, ids: string[]) => {
                const delay = options.rawJsonDelayMs ?? 0;
                const data = ids.map((id) => ({ id, raw_json: options.rawJsonByPostId?.get(id) ?? { view_count: 42 } }));
                return {
                  then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
                    new Promise((r) => setTimeout(r, delay)).then(() => resolve({ data, error: null })),
                };
              },
            };
            return rawChain;
          }
          return makeChain({ data: options.postsError ? null : posts, error: options.postsError ?? null, count: postsCount });
        },
      };
    }
    if (table === 'ai_analysis') {
      return makeChain({ data: options.analysisError ? null : analyses, error: options.analysisError ?? null });
    }
    if (table === 'instagram_comments') {
      return makeChain({ data: options.commentsError ? null : comments, error: options.commentsError ?? null, count: comments.length });
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { from };
}

function post(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    target_id: 'target-1',
    client_id: 'client-1',
    platform: 'instagram',
    caption: `post ${id}`,
    content_type: 'IMAGE',
    media_type: 'IMAGE',
    media_url: null,
    post_url: `https://instagram.com/${id}`,
    taken_at: '2026-08-20T00:00:00Z',
    collected_at: '2026-08-20T00:00:00Z',
    like_count: 10,
    comment_count: 2,
    ...overrides,
  };
}

describe('getInstagramUiContract — timeout do raw_json nunca trava a página (TESTE de regressão)', () => {
  it('CAUSA RAIZ: com raw_json disponível dentro do orçamento, enriquece normalmente (plays/views preenchidos)', async () => {
    vi.resetModules();
    const stub = makeSupabaseStub({
      targets: [{ id: 'target-1', candidate_name: 'Fulano', client_id: 'client-1' }],
      posts: [post('p1')],
      analyses: [{ content_id: 'p1', sentiment: 'positivo', risk_level: 'baixo' }],
      comments: [],
      rawJsonByPostId: new Map([['p1', { view_count: 999 }]]),
      rawJsonDelayMs: 10,
    });
    vi.doMock('@/lib/supabaseClient', () => ({ createAdminClient: () => stub }));
    const { getInstagramUiContract } = await import('./instagram-ui');

    const contract = await getInstagramUiContract({ page: 1, pageSize: 20 });

    expect(contract.summary.posts).toBe(1);
    const [mappedPost] = contract.recentPosts;
    expect(mappedPost.metrics.views).toMatchObject({ value: 999, availability: 'AVAILABLE', source: 'raw_json' });
  });

  it('CAUSA RAIZ CORRIGIDA: raw_json além do orçamento nunca trava a página — renderiza com dados, enrichment fica UNAVAILABLE', async () => {
    vi.resetModules();
    const stub = makeSupabaseStub({
      targets: [{ id: 'target-1', candidate_name: 'Fulano', client_id: 'client-1' }],
      posts: [post('p1')],
      analyses: [{ content_id: 'p1', sentiment: 'positivo', risk_level: 'baixo' }],
      comments: [],
      rawJsonDelayMs: 50_000, // nunca chega a resolver dentro do orçamento de teste
    });
    vi.doMock('@/lib/supabaseClient', () => ({ createAdminClient: () => stub }));
    const { getInstagramUiContract } = await import('./instagram-ui');

    const t0 = Date.now();
    const contract = await getInstagramUiContract({ page: 1, pageSize: 20 });
    const elapsed = Date.now() - t0;

    // A função real usa RAW_JSON_FETCH_BUDGET_MS=3500 — aqui confirmamos que o
    // tempo total fica preso a ESSE orçamento (mais alguma margem de
    // execução), nunca aos 50s do delay configurado.
    expect(elapsed).toBeLessThan(10_000);
    expect(contract.summary.posts).toBe(1);
    const [mappedPost] = contract.recentPosts;
    expect(mappedPost.caption).toBe('post p1');
    expect(mappedPost.metrics.likes).toMatchObject({ value: 10, availability: 'AVAILABLE' }); // estrutural — nunca depende de raw_json
    expect(mappedPost.metrics.views).toMatchObject({ availability: 'UNAVAILABLE' }); // degradado, não travado
  }, 15_000);

  it('INSTAGRAM_QUERY_ERROR: erro na busca de raw_json não derruba a página (é engolido, não propagado)', async () => {
    vi.resetModules();
    const stub = makeSupabaseStub({
      targets: [{ id: 'target-1', candidate_name: 'Fulano', client_id: 'client-1' }],
      posts: [post('p1')],
      analyses: [],
      comments: [],
    });
    const originalFrom = stub.from;
    stub.from = vi.fn((table: string) => {
      if (table === 'social_posts') {
        return {
          select: (columns: string) => {
            if (columns === 'id,raw_json') {
              return { in: () => ({ then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve({ data: null, error: { message: 'boom' } })) }) };
            }
            return (originalFrom('social_posts') as { select: (c: string) => unknown }).select(columns);
          },
        };
      }
      return originalFrom(table);
    });
    vi.doMock('@/lib/supabaseClient', () => ({ createAdminClient: () => stub }));
    const { getInstagramUiContract } = await import('./instagram-ui');

    const contract = await getInstagramUiContract({ page: 1, pageSize: 20 });
    expect(contract.summary.posts).toBe(1);
  });

  it('INSTAGRAM_EMPTY_DATA: sem posts, renderiza contrato vazio (nunca loading infinito)', async () => {
    vi.resetModules();
    const stub = makeSupabaseStub({ targets: [], posts: [], analyses: [], comments: [] });
    vi.doMock('@/lib/supabaseClient', () => ({ createAdminClient: () => stub }));
    const { getInstagramUiContract } = await import('./instagram-ui');

    const contract = await getInstagramUiContract({ page: 1, pageSize: 20 });
    expect(contract.summary.posts).toBe(0);
  });

  it('INSTAGRAM_QUERY_ERROR (posts): erro na busca principal de posts propaga um erro controlado, não trava', async () => {
    vi.resetModules();
    const stub = makeSupabaseStub({ targets: [], posts: [], analyses: [], comments: [], postsError: { message: 'db down' } });
    vi.doMock('@/lib/supabaseClient', () => ({ createAdminClient: () => stub }));
    const { getInstagramUiContract } = await import('./instagram-ui');

    await expect(getInstagramUiContract({ page: 1, pageSize: 20 })).rejects.toThrow('Instagram posts query failed');
  });

  it('INSTAGRAM_PERIOD_CHANGE: trocar período não trava — nova chamada resolve normalmente', async () => {
    vi.resetModules();
    const stub = makeSupabaseStub({
      targets: [{ id: 'target-1', candidate_name: 'Fulano', client_id: 'client-1' }],
      posts: [post('p1')],
      analyses: [{ content_id: 'p1', sentiment: 'positivo', risk_level: 'baixo' }],
      comments: [],
    });
    vi.doMock('@/lib/supabaseClient', () => ({ createAdminClient: () => stub }));
    const { getInstagramUiContract } = await import('./instagram-ui');

    const first = await getInstagramUiContract({ page: 1, pageSize: 20, periodDays: 30 });
    const second = await getInstagramUiContract({ page: 1, pageSize: 20, periodDays: 7 });
    expect(first.summary.posts).toBe(1);
    expect(second.summary.posts).toBe(1);
  });
});
