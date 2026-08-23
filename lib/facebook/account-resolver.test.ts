import { describe, expect, it, vi } from 'vitest';
import { resolveFacebookSocialAccount } from './account-resolver';

function query(result: { data: Record<string, unknown> | null; error: { message: string } | null }) {
  const chain = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue(result) };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

const account = {
  id: 'account-1', client_id: 'client-1', target_id: 'target-1', platform: 'facebook',
  handle: 'page', profile_url: 'https://facebook.com/page', is_active: true,
  platform_account_id: '100064348075846',
};

describe('Facebook social account resolver', () => {
  it('resolve Page ID e ownership somente de contexto ativo e coerente', async () => {
    const accountQuery = query({ data: account, error: null });
    const targetQuery = query({ data: { id: 'target-1', client_id: 'client-1', is_active: true }, error: null });
    const client = { from: vi.fn((table: string) => table === 'social_accounts' ? accountQuery : targetQuery) };
    await expect(resolveFacebookSocialAccount(client as never, {
      socialAccountId: 'account-1', expectedClientId: 'client-1', allowedTargetIds: ['target-1'],
    })).resolves.toMatchObject({ clientId: 'client-1', targetId: 'target-1', pageId: '100064348075846' });
  });

  it('exige Page ID configurado', async () => {
    const accountQuery = query({ data: { ...account, platform_account_id: null }, error: null });
    const targetQuery = query({ data: { id: 'target-1', client_id: 'client-1', is_active: true }, error: null });
    const client = { from: vi.fn((table: string) => table === 'social_accounts' ? accountQuery : targetQuery) };
    await expect(resolveFacebookSocialAccount(client as never, { socialAccountId: 'account-1' })).rejects.toThrow('FACEBOOK_PAGE_ID_REQUIRED');
  });

  it.each([
    { expectedClientId: 'other-client' },
    { allowedTargetIds: ['other-target'] },
    { allowedTargetIds: [] },
  ])('falha fechada fora do escopo autorizado', async (scope) => {
    const client = { from: vi.fn(() => query({ data: account, error: null })) };
    await expect(resolveFacebookSocialAccount(client as never, { socialAccountId: 'account-1', ...scope })).rejects.toThrow('FACEBOOK_SOCIAL_ACCOUNT_CONTEXT_INVALID');
  });

  it('rejeita social_account inativo (ex.: desativado manualmente ao cadastrar outro candidato)', async () => {
    const accountQuery = query({ data: { ...account, is_active: false }, error: null });
    const targetQuery = query({ data: { id: 'target-1', client_id: 'client-1', is_active: true }, error: null });
    const client = { from: vi.fn((table: string) => table === 'social_accounts' ? accountQuery : targetQuery) };
    await expect(resolveFacebookSocialAccount(client as never, { socialAccountId: 'account-1' })).rejects.toThrow('FACEBOOK_SOCIAL_ACCOUNT_CONTEXT_INVALID');
  });

  it('rejeita quando o target (candidato) associado está inativo', async () => {
    const accountQuery = query({ data: account, error: null });
    const targetQuery = query({ data: { id: 'target-1', client_id: 'client-1', is_active: false }, error: null });
    const client = { from: vi.fn((table: string) => table === 'social_accounts' ? accountQuery : targetQuery) };
    await expect(resolveFacebookSocialAccount(client as never, { socialAccountId: 'account-1' })).rejects.toThrow('FACEBOOK_SOCIAL_ACCOUNT_CONTEXT_INVALID');
  });
});
