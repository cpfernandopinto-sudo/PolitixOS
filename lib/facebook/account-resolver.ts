import 'server-only';

type AdminClient = ReturnType<typeof import('@/lib/supabaseClient').createAdminClient>;

export interface FacebookAccountScope {
  socialAccountId: string;
  expectedClientId?: string | null;
  allowedTargetIds?: string[] | null;
}

export interface ResolvedFacebookAccount {
  clientId: string;
  targetId: string;
  socialAccountId: string;
  pageId: string;
  handle: string;
  profileUrl: string | null;
}

export async function resolveFacebookSocialAccount(client: AdminClient, scope: FacebookAccountScope): Promise<ResolvedFacebookAccount> {
  if (!scope.socialAccountId) throw new Error('FACEBOOK_SOCIAL_ACCOUNT_ID_REQUIRED');

  const accountResult = await client
    .from('social_accounts')
    .select('id,client_id,target_id,platform,handle,profile_url,is_active,platform_account_id')
    .eq('id', scope.socialAccountId)
    .maybeSingle();
  if (accountResult.error) throw new Error('FACEBOOK_SOCIAL_ACCOUNT_LOOKUP_FAILED');

  const account = accountResult.data;
  if (!account || account.platform !== 'facebook' || account.is_active !== true || !account.client_id || !account.target_id) {
    throw new Error('FACEBOOK_SOCIAL_ACCOUNT_CONTEXT_INVALID');
  }
  if (scope.expectedClientId && account.client_id !== scope.expectedClientId) {
    throw new Error('FACEBOOK_SOCIAL_ACCOUNT_CONTEXT_INVALID');
  }
  if (scope.allowedTargetIds && !scope.allowedTargetIds.includes(account.target_id)) {
    throw new Error('FACEBOOK_SOCIAL_ACCOUNT_CONTEXT_INVALID');
  }

  const targetResult = await client
    .from('targets')
    .select('id,client_id,is_active')
    .eq('id', account.target_id)
    .eq('client_id', account.client_id)
    .maybeSingle();
  if (targetResult.error) throw new Error('FACEBOOK_TARGET_LOOKUP_FAILED');
  if (!targetResult.data || targetResult.data.is_active !== true) {
    throw new Error('FACEBOOK_SOCIAL_ACCOUNT_CONTEXT_INVALID');
  }

  const pageId = typeof account.platform_account_id === 'string' ? account.platform_account_id.trim() : '';
  if (!pageId) throw new Error('FACEBOOK_PAGE_ID_REQUIRED');

  return {
    clientId: account.client_id,
    targetId: account.target_id,
    socialAccountId: account.id,
    pageId,
    handle: account.handle,
    profileUrl: account.profile_url,
  };
}
