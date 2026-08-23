import { beforeEach, describe, expect, it, vi } from 'vitest';

const order = vi.fn();
const postsChain = {
  eq: vi.fn(),
  gte: vi.fn(),
  lt: vi.fn(),
  in: vi.fn(),
  order,
};

for (const method of [postsChain.eq, postsChain.gte, postsChain.lt, postsChain.in]) {
  method.mockReturnValue(postsChain);
}

const from = vi.fn((table: string) => {
  if (table === 'social_posts') return { select: vi.fn().mockReturnValue(postsChain) };
  throw new Error(`unexpected table ${table}`);
});

vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: () => ({ from }) }));

import { fetchFacebookData, fetchFacebookPosts, resolveFacebookTargetScope } from './facebook';

describe('Facebook target authorization scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postsChain.eq.mockReturnValue(postsChain);
    postsChain.gte.mockReturnValue(postsChain);
    postsChain.lt.mockReturnValue(postsChain);
    postsChain.in.mockReturnValue(postsChain);
    order.mockResolvedValue({ data: [{ id: 'post-1' }], error: null });
  });

  it('retorna vazio sem consultar quando allowedTargetIds e vazio', async () => {
    await expect(fetchFacebookPosts({ allowedTargetIds: [] })).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('restringe aos targets permitidos quando nao ha selecao', async () => {
    await fetchFacebookPosts({ allowedTargetIds: ['A', 'B'] });
    expect(postsChain.in).toHaveBeenCalledWith('target_id', ['A', 'B']);
  });

  it('mantem somente o candidato selecionado e permitido', async () => {
    await fetchFacebookPosts({ allowedTargetIds: ['A', 'B'], candidateIds: ['A'] });
    expect(postsChain.in).toHaveBeenCalledWith('target_id', ['A']);
  });

  it('nega selecao totalmente fora da autorizacao sem consultar', async () => {
    await expect(fetchFacebookPosts({ allowedTargetIds: ['A', 'B'], candidateIds: ['C'] })).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('usa somente a intersecao entre candidatos selecionados e permitidos', async () => {
    await fetchFacebookPosts({ allowedTargetIds: ['A', 'B'], candidateIds: ['A', 'C'] });
    expect(postsChain.in).toHaveBeenCalledWith('target_id', ['A']);
  });

  it.each([undefined, null])('preserva ausencia de restricao para allowedTargetIds=%s', async (allowedTargetIds) => {
    await fetchFacebookPosts({ allowedTargetIds });
    expect(postsChain.in).not.toHaveBeenCalled();
    expect(order).toHaveBeenCalled();
  });

  it('mantem candidateIds como filtro quando allowedTargetIds nao foi informado', async () => {
    await fetchFacebookPosts({ candidateIds: ['A'] });
    expect(postsChain.in).toHaveBeenCalledWith('target_id', ['A']);
  });

  it('aplica isolamento por client_id quando fornecido', async () => {
    await fetchFacebookPosts({ clientId: 'client-1', allowedTargetIds: ['A'] });
    expect(postsChain.eq).toHaveBeenCalledWith('client_id', 'client-1');
  });

  it('fecha tambem o agregado do dashboard antes de consultar posts ou contas', async () => {
    await expect(fetchFacebookData({ allowedTargetIds: [] })).resolves.toEqual({
      items: [],
      accounts: [],
      completeness: 'MISSING',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('resolve a intersecao de forma deterministica e sem ampliar autorizacao', () => {
    expect(resolveFacebookTargetScope(['A', 'C', 'A'], ['A', 'B'])).toEqual(['A']);
  });
});
