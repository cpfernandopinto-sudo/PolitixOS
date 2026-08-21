import { describe, expect, it } from 'vitest';
import { classifyRetry, retryTelemetry } from './instagram-retry-policy.mjs';

describe('Instagram RapidAPI selective retry policy', () => {
  it.each([400, 401, 403, 404])('does not retry permanent HTTP %s', (statusCode) => {
    expect(classifyRetry({ statusCode, attempt: 1, maxAttempts: 3 })).toMatchObject({ success: false, retryable: false });
  });

  it.each([408, 429, 500, 502, 503, 504])('retries transient HTTP %s within the limit', (statusCode) => {
    expect(classifyRetry({ statusCode, attempt: 1, maxAttempts: 3 })).toMatchObject({ success: false, retryable: true, exhausted: false });
    expect(classifyRetry({ statusCode, attempt: 3, maxAttempts: 3 })).toMatchObject({ success: false, retryable: false, exhausted: true });
  });

  it('does not retry HTTP 200', () => {
    expect(classifyRetry({ statusCode: 200, attempt: 1, maxAttempts: 3 })).toEqual({ success: true, retryable: false, exhausted: false, status: 'success' });
  });

  it('keeps call telemetry mathematically coherent', () => {
    expect(retryTelemetry(1)).toEqual({ logicalCalls: 1, physicalAttempts: 1, retryAttempts: 0 });
    expect(retryTelemetry(3)).toEqual({ logicalCalls: 1, physicalAttempts: 3, retryAttempts: 2 });
  });
});
