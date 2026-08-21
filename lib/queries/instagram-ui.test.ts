import { describe, expect, it } from 'vitest';
import { intersectInstagramTargetScope } from './instagram-ui';

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
});
