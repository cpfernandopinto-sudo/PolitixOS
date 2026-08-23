export const X_PIPELINE_MODES = ['posts', 'replies', 'ai', 'reprocess', 'full'] as const;
export type XPipelineMode = (typeof X_PIPELINE_MODES)[number];

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMITS: Record<XPipelineMode, number> = { posts: 5, replies: 5, ai: 1, reprocess: 1, full: 1 };
const rateLimitBuckets = new Map<string, number[]>();

export function consumeRateLimit(userId: string, mode: XPipelineMode, now = Date.now()): boolean {
  const key = `${userId}:${mode}`;
  const recent = (rateLimitBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMITS[mode]) return false;
  rateLimitBuckets.set(key, [...recent, now]);
  return true;
}

export function __resetXTriggerRateLimitForTests() {
  rateLimitBuckets.clear();
}
