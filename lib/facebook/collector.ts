import { randomUUID } from 'node:crypto';
import { collectFacebookPages } from './pagination';
import { persistFacebookPosts } from './persistence';
import type { FacebookCollectionContext, FacebookDateWindow } from './types';
import type { FacebookPageSource } from './pagination';

type AdminClient = ReturnType<typeof import('@/lib/supabaseClient').createAdminClient>;

export async function runFacebookOwnedCollection(client: AdminClient, provider: FacebookPageSource, context: FacebookCollectionContext, options: FacebookDateWindow & { maxPages?: number; runId?: string } = {}) {
  const runId = options.runId ?? randomUUID();
  const startedAt = new Date().toISOString();
  const log = await client.from('collection_logs').insert({
    id: runId, client_id: context.clientId, target_id: context.targetId, social_account_id: context.socialAccountId,
    platform: 'facebook', started_at: startedAt, status: 'running', posts_collected: 0, comments_collected: 0,
    metadata: { pipeline_version: 'facebook-v1', source_page_id: context.sourcePageId, content_origin: context.contentOrigin ?? 'OWNED' },
  });
  if (log.error) throw new Error(`FACEBOOK_COLLECTION_LOG_START_FAILED: ${log.error.message}`);
  try {
    const result = await collectFacebookPages(provider, { pageId: context.sourcePageId, startDate: options.startDate, endDate: options.endDate, maxPages: options.maxPages });
    const persisted = await persistFacebookPosts(client as never, result.posts, { ...context, contentOrigin: context.contentOrigin ?? 'OWNED' }, runId);
    const finish = await client.from('collection_logs').update({
      status: 'success', finished_at: new Date().toISOString(), posts_collected: persisted,
      metadata: { pipeline_version: 'facebook-v1', source_page_id: context.sourcePageId, pages_fetched: result.pagesFetched, cursors_seen: result.cursorsSeen, termination: result.termination, normalized: result.posts.length, persisted },
    }).eq('id', runId).eq('client_id', context.clientId);
    if (finish.error) throw new Error(`FACEBOOK_COLLECTION_LOG_FINISH_FAILED: ${finish.error.message}`);
    return { runId, persisted, ...result };
  } catch (error) {
    await client.from('collection_logs').update({ status: 'error', finished_at: new Date().toISOString(), error_message: error instanceof Error ? error.message : 'FACEBOOK_COLLECTION_FAILED' }).eq('id', runId).eq('client_id', context.clientId);
    throw error;
  }
}
