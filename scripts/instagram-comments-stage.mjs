export function persistenceKey(row) {
  if (!row?.client_id || !row?.platform || !row?.platform_post_id) return null;
  return `${row.client_id}::${row.platform}::${row.platform_post_id}`;
}

export function reconcilePersistedPosts(normalizedPosts, persistenceRows) {
  const originals = new Map(
    normalizedPosts
      .map((row) => [persistenceKey(row), row])
      .filter(([key]) => key),
  );

  return persistenceRows.flatMap((persisted) => {
    if (!persisted?.id || persisted?.error || Number(persisted?.statusCode) >= 400) return [];
    const key = persistenceKey(persisted);
    const original = key ? originals.get(key) : null;
    if (!original || original.client_id !== persisted.client_id) return [];
    return [{ ...original, ...persisted, shortcode: persisted.shortcode || original.shortcode || null }];
  });
}

export function commentsEligibility(posts) {
  const eligible = posts.filter((post) => post?.id && post?.client_id && post?.shortcode);
  return {
    eligible,
    skipped: posts.length - eligible.length,
    skipReason: eligible.length ? null : 'NO_ELIGIBLE_POSTS',
  };
}

export function commentsFetchTelemetry(responses) {
  if (!responses.length) {
    return {
      postsEligible: 0,
      logicalCalls: 0,
      physicalAttempts: 0,
      retryAttempts: 0,
      commentsReturned: 0,
      errorsCount: 0,
      outcome: 'NOT_CALLED',
    };
  }
  const rows = responses.map((response) => {
    const body = response?.response_body || {};
    const comments = body.comments || body.items || body.data?.comments || body.data?.items || body.data || [];
    return { response, comments: Array.isArray(comments) ? comments : [] };
  });
  const logicalCalls = rows.reduce((n, row) => n + Number(row.response?.logical_calls || 0), 0);
  const physicalAttempts = rows.reduce((n, row) => n + Number(row.response?.physical_attempts || 0), 0);
  const retryAttempts = rows.reduce((n, row) => n + Number(row.response?.retry_attempts || 0), 0);
  const errorsCount = rows.filter((row) => row.response?.status !== 'success').length;
  const commentsReturned = rows.reduce((n, row) => n + row.comments.length, 0);
  return {
    postsEligible: rows.length,
    logicalCalls,
    physicalAttempts,
    retryAttempts,
    commentsReturned,
    errorsCount,
    outcome: errorsCount
      ? commentsReturned ? 'PARTIAL' : 'ERROR'
      : commentsReturned ? 'SUCCESS_WITH_RESULTS' : 'SUCCESS_ZERO_RESULTS',
  };
}

export function uniqueComments(comments) {
  return [...new Map(comments.filter((row) => row?.instagram_comment_id).map((row) => [row.instagram_comment_id, row])).values()];
}

export function normalizeProviderTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric > 1e12 ? numeric : numeric * 1000)
    : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
