import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockResolve, mockCollect } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockCollect: vi.fn(),
}));
vi.mock('./account-resolver', () => ({ resolveFacebookSocialAccount: mockResolve }));
vi.mock('./collector', () => ({ runFacebookOwnedCollection: mockCollect }));

import { runFacebookCollectionForSocialAccount } from './operational';

beforeEach(() => {
  vi.clearAllMocks();
  mockResolve.mockResolvedValue({
    clientId: 'client-1', targetId: 'target-1', socialAccountId: 'account-1',
    pageId: 'page-1', handle: 'page', profileUrl: null,
  });
  mockCollect.mockResolvedValue({
    runId: 'run-1', pagesFetched: 3, postsReceived: 7, posts: [{}, {}, {}, {}, {}, {}],
    postsPersisted: 6, termination: 'CURSOR_NULL', collectionComplete: true,
  });
});

describe('Facebook operational orchestrator', () => {
  it('resolve cadastro e retorna contrato operacional completo', async () => {
    const dates = [new Date('2026-08-22T10:00:00Z'), new Date('2026-08-22T10:00:02Z')];
    const result = await runFacebookCollectionForSocialAccount({} as never, {
      socialAccountId: 'account-1', startDate: '2026-08-21', endDate: '2026-08-23',
      expectedClientId: 'client-1', allowedTargetIds: ['target-1'], maxPagesSafety: 20,
    }, { provider: { getPagePosts: vi.fn() }, now: () => dates.shift()! });
    expect(result).toEqual({
      runId: 'run-1', platform: 'facebook', clientId: 'client-1', targetId: 'target-1',
      socialAccountId: 'account-1', pageId: 'page-1', startDate: '2026-08-21',
      endDate: '2026-08-23', pagesFetched: 3, postsReceived: 7, postsUnique: 6,
      postsPersisted: 6, termination: 'CURSOR_NULL', collectionComplete: true,
      startedAt: '2026-08-22T10:00:00.000Z', finishedAt: '2026-08-22T10:00:02.000Z',
      durationMs: 2000, errors: [],
    });
    expect(mockCollect).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({
      sourcePageId: 'page-1', clientId: 'client-1',
    }), expect.objectContaining({ maxPages: 20 }));
  });

  it('rejeita janela ou safety cap inválidos antes da coleta', async () => {
    await expect(runFacebookCollectionForSocialAccount({} as never, {
      socialAccountId: 'account-1', startDate: '2026-08-23', endDate: '2026-08-21',
    }, { provider: { getPagePosts: vi.fn() } })).rejects.toThrow();
    await expect(runFacebookCollectionForSocialAccount({} as never, {
      socialAccountId: 'account-1', startDate: '2026-08-21', endDate: '2026-08-23', maxPagesSafety: 101,
    }, { provider: { getPagePosts: vi.fn() } })).rejects.toThrow('FACEBOOK_MAX_PAGES_SAFETY_INVALID');
  });
});
