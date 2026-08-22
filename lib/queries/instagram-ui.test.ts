import { describe, expect, it } from 'vitest';
import { chunkInstagramPostIds, instagramAnalyticsRanges, intersectInstagramTargetScope } from './instagram-ui';

describe('Instagram UI server scope', () => {
  it('não permite candidato fora de allowedTargetIds', () => {
    expect(intersectInstagramTargetScope(['target-b'], ['target-a'])).toEqual([]);
  });

  it('intersecta seleção com allowedTargetIds sem confiar no frontend', () => {
    expect(intersectInstagramTargetScope(['target-a', 'target-b'], ['target-a', 'target-c'])).toEqual(['target-a']);
  });

  it('admin preserva escopo global ou seleção explícita', () => {
    expect(intersectInstagramTargetScope(undefined, null)).toBeNull();
    expect(intersectInstagramTargetScope(['target-a'], null)).toEqual(['target-a']);
  });

  it('divide listas grandes em lotes seguros sem perder ou duplicar IDs', () => {
    const ids = Array.from({ length: 652 }, (_, index) => `post-${index}`);
    const chunks = chunkInstagramPostIds(ids, 150);
    expect(chunks.map((chunk) => chunk.length)).toEqual([150, 150, 150, 150, 52]);
    expect(chunks.flat()).toEqual(ids);
  });

  it.each([
    { total: 1999, expectedLoaded: 1999, expectedComplete: true },
    { total: 2000, expectedLoaded: 2000, expectedComplete: true },
    { total: 3800, expectedLoaded: 3800, expectedComplete: true },
    { total: 12000, expectedLoaded: 10000, expectedComplete: false },
  ])('pagina universo analítico de $total sem truncamento silencioso', ({ total, expectedLoaded, expectedComplete }) => {
    const ranges = instagramAnalyticsRanges(total);
    const loaded = ranges.reduce((sum, range) => sum + range.to - range.from + 1, 0);
    expect(loaded).toBe(expectedLoaded);
    expect(loaded === total).toBe(expectedComplete);
    expect(ranges.every((range) => range.to - range.from < 500)).toBe(true);
  });
});
