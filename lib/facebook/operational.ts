import 'server-only';

import { resolveFacebookSocialAccount } from './account-resolver';
import { runFacebookOwnedCollection } from './collector';
import { FacebookScraperProvider, facebookProviderConfigFromEnv, validateFacebookDateWindow } from './provider';
import type { FacebookPageSource } from './pagination';

type AdminClient = ReturnType<typeof import('@/lib/supabaseClient').createAdminClient>;

export interface FacebookOperationalCollectionInput {
  socialAccountId: string;
  startDate: string;
  endDate: string;
  expectedClientId?: string | null;
  allowedTargetIds?: string[] | null;
  maxPagesSafety?: number;
}

export interface FacebookOperationalDependencies {
  provider?: FacebookPageSource;
  now?: () => Date;
}

function maxPagesSafety(input?: number): number {
  const configured = Number(process.env.FACEBOOK_MAX_PAGES_SAFETY ?? 100);
  const value = input ?? configured;
  if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error('FACEBOOK_MAX_PAGES_SAFETY_INVALID');
  return value;
}

export async function runFacebookCollectionForSocialAccount(
  client: AdminClient,
  input: FacebookOperationalCollectionInput,
  dependencies: FacebookOperationalDependencies = {}
) {
  validateFacebookDateWindow({ startDate: input.startDate, endDate: input.endDate });
  if (!input.startDate || !input.endDate || input.startDate >= input.endDate) throw new Error('FACEBOOK_OPERATIONAL_WINDOW_INVALID');

  const now = dependencies.now ?? (() => new Date());
  const startedAtDate = now();
  const account = await resolveFacebookSocialAccount(client, {
    socialAccountId: input.socialAccountId,
    expectedClientId: input.expectedClientId,
    allowedTargetIds: input.allowedTargetIds,
  });
  const provider = dependencies.provider ?? new FacebookScraperProvider(facebookProviderConfigFromEnv());
  const collection = await runFacebookOwnedCollection(client, provider, {
    clientId: account.clientId,
    targetId: account.targetId,
    socialAccountId: account.socialAccountId,
    sourcePageId: account.pageId,
    contentOrigin: 'OWNED',
  }, {
    startDate: input.startDate,
    endDate: input.endDate,
    maxPages: maxPagesSafety(input.maxPagesSafety),
  });
  const finishedAtDate = now();

  return {
    runId: collection.runId,
    platform: 'facebook' as const,
    clientId: account.clientId,
    targetId: account.targetId,
    socialAccountId: account.socialAccountId,
    pageId: account.pageId,
    startDate: input.startDate,
    endDate: input.endDate,
    pagesFetched: collection.pagesFetched,
    postsReceived: collection.postsReceived,
    postsUnique: collection.posts.length,
    postsPersisted: collection.postsPersisted,
    termination: collection.termination,
    collectionComplete: collection.collectionComplete,
    startedAt: startedAtDate.toISOString(),
    finishedAt: finishedAtDate.toISOString(),
    durationMs: Math.max(0, finishedAtDate.getTime() - startedAtDate.getTime()),
    errors: [] as string[],
  };
}
