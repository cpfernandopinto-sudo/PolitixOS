export const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
export const PERMANENT_STATUS_CODES = new Set([400, 401, 403, 404]);

export function classifyRetry({ statusCode, attempt = 1, maxAttempts = 3 }) {
  const status = Number(statusCode);
  const success = Number.isFinite(status) && status >= 200 && status < 300;
  const retryableStatus = RETRYABLE_STATUS_CODES.has(status);
  const permanent = PERMANENT_STATUS_CODES.has(status);
  const retryable = !success && !permanent && retryableStatus && attempt < maxAttempts;
  return {
    success,
    retryable,
    exhausted: retryableStatus && attempt >= maxAttempts,
    status: success ? 'success' : 'error',
  };
}

export function retryTelemetry(attempts) {
  const physicalAttempts = Math.max(1, Number(attempts) || 1);
  return { logicalCalls: 1, physicalAttempts, retryAttempts: physicalAttempts - 1 };
}
