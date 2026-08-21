import { describe, expect, it } from 'vitest';
import { chunkInstagramPostIds, intersectInstagramTargetScope } from './instagram-ui';

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
});
