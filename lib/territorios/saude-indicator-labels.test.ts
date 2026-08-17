import { describe, expect, it } from 'vitest';
import { getCnesTypeIndicatorLabel } from './saude-indicator-labels';

const CURRENT_PERSISTED_CODES = [2, 4, 5, 7, 16, 22, 36, 39, 40, 42, 43, 50, 60, 62, 68, 69, 70, 73, 75, 76, 77, 79, 81, 83, 84, 85];

describe('CNES health indicator labels', () => {
  it.each(CURRENT_PERSISTED_CODES)('labels persisted CNES type %i deterministically', (code) => {
    const indicator = `estabelecimentos_tipo_unidade_${code}`;
    const first = getCnesTypeIndicatorLabel(indicator);
    expect(first).not.toBeNull();
    expect(first?.code).toBe(code);
    expect(first?.label.length).toBeGreaterThan(3);
    expect(getCnesTypeIndicatorLabel(indicator)).toEqual(first);
  });

  it('does not invent a label for unknown or unrelated indicators', () => {
    expect(getCnesTypeIndicatorLabel('estabelecimentos_tipo_unidade_999')).toBeNull();
    expect(getCnesTypeIndicatorLabel('estabelecimentos_total')).toBeNull();
  });
});

