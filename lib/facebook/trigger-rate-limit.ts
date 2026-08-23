const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitBuckets = new Map<string, number>();

export function consumeTriggerRateLimit(key: string, now = Date.now()): boolean {
  const previous = rateLimitBuckets.get(key);
  if (previous && now - previous < RATE_LIMIT_WINDOW_MS) return false;
  rateLimitBuckets.set(key, now);
  return true;
}

export function __resetFacebookTriggerRateLimitForTests() {
  rateLimitBuckets.clear();
}
