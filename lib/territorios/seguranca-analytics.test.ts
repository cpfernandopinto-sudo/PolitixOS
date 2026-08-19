import { describe, expect, it } from 'vitest';
import { SECURITY_INDICATOR_CATALOG, summarizeSecuritySeries } from './seguranca-analytics';

describe('security analytics contract', () => {
  it('cobre as 14 chaves realmente persistidas e não inventa furto', () => {
    expect(SECURITY_INDICATOR_CATALOG).toHaveLength(14);
    expect(SECURITY_INDICATOR_CATALOG.some((item) => item.indicatorKey.includes('furto'))).toBe(false);
  });
  it('calcula current, previous, delta, trend, extremos e média', () => {
    expect(summarizeSecuritySeries([{ period: '2026-01', value: 2 }, { period: '2026-02', value: 5 }, { period: '2026-03', value: 4 }])).toEqual({ current: 4, previous: 5, delta: -1, trend: 'down', peak: { period: '2026-02', value: 5 }, low: { period: '2026-01', value: 2 }, average: 3.6667 });
  });
});
