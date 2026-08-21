import { describe, expect, it } from 'vitest';
import { classifyRetry } from './instagram-retry-policy.mjs';
import {
  commentsEligibility,
  commentsFetchTelemetry,
  normalizeProviderTimestamp,
  reconcilePersistedPosts,
  uniqueComments,
} from './instagram-comments-stage.mjs';

const post = (overrides = {}) => ({
  client_id: 'tenant-a', platform: 'instagram', platform_post_id: 'p1', shortcode: 'ABC', ...overrides,
});

describe('Instagram comments stage', () => {
  it('T1: persisted post with shortcode is eligible', () => {
    const rows = reconcilePersistedPosts([post()], [{ ...post(), id: 'db-1' }]);
    expect(commentsEligibility(rows).eligible).toHaveLength(1);
  });

  it('T2: persisted post without shortcode is explicitly skipped', () => {
    const rows = reconcilePersistedPosts([post({ shortcode: null })], [{ ...post({ shortcode: null }), id: 'db-1' }]);
    expect(commentsEligibility(rows)).toMatchObject({ eligible: [], skipped: 1, skipReason: 'NO_ELIGIBLE_POSTS' });
  });

  it('T3: persistence failure never becomes eligible', () => {
    expect(reconcilePersistedPosts([post()], [{ ...post(), statusCode: 500, error: 'failed' }])).toEqual([]);
  });

  it('T4: multiple posts reconcile by stable key, not array position', () => {
    const p2 = post({ platform_post_id: 'p2', shortcode: 'DEF' });
    const rows = reconcilePersistedPosts([post(), p2], [{ ...p2, id: 'db-2' }, { ...post(), id: 'db-1' }]);
    expect(rows.map((row: Record<string, unknown>) => [row.id, row.shortcode])).toEqual([['db-2', 'DEF'], ['db-1', 'ABC']]);
  });

  it('T5: tenant A cannot consume tenant B persistence', () => {
    expect(reconcilePersistedPosts([post()], [{ ...post({ client_id: 'tenant-b' }), id: 'db-b' }])).toEqual([]);
  });

  it('T6: rerun deduplicates comments by provider id', () => {
    expect(uniqueComments([{ instagram_comment_id: 'c1' }, { instagram_comment_id: 'c1' }])).toHaveLength(1);
  });

  it('T7: called endpoint with zero rows is SUCCESS_ZERO_RESULTS', () => {
    expect(commentsFetchTelemetry([{ status: 'success', logical_calls: 1, physical_attempts: 1, response_body: { comments: [] } }])).toMatchObject({ outcome: 'SUCCESS_ZERO_RESULTS', postsEligible: 1, commentsReturned: 0 });
  });

  it('T8: no endpoint call is distinguishable from zero results', () => {
    expect(commentsFetchTelemetry([])).toMatchObject({ postsEligible: 0, logicalCalls: 0, outcome: 'NOT_CALLED' });
  });

  it.each([429, 500, 502, 503, 504])('T9: transient comments status %i uses retry policy', (status) => {
    expect(classifyRetry({ statusCode: status, attempt: 1, maxAttempts: 3 })).toMatchObject({ retryable: true });
  });

  it.each([400, 401, 403, 404])('T10: permanent comments status %i does not retry', (status) => {
    expect(classifyRetry({ statusCode: status, attempt: 1, maxAttempts: 3 })).toMatchObject({ retryable: false });
  });

  it('normalizes seconds, milliseconds and ISO timestamps without inventing invalid dates', () => {
    expect(normalizeProviderTimestamp(1_700_000_000)).toBe('2023-11-14T22:13:20.000Z');
    expect(normalizeProviderTimestamp(1_700_000_000_000)).toBe('2023-11-14T22:13:20.000Z');
    expect(normalizeProviderTimestamp('2023-11-14T22:13:20Z')).toBe('2023-11-14T22:13:20.000Z');
    expect(normalizeProviderTimestamp('not-a-date')).toBeNull();
  });
});
