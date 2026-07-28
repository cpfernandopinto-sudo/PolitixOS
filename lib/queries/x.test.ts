import { describe, it, expect } from 'vitest';
import { cleanFilter } from './x';

describe('cleanFilter (X)', () => {
  it('retorna null para valores "vazios" conhecidos', () => {
    expect(cleanFilter('todos')).toBeNull();
    expect(cleanFilter('all')).toBeNull();
    expect(cleanFilter('')).toBeNull();
  });

  it('preserva um valor real', () => {
    expect(cleanFilter('critico')).toBe('critico');
  });

  it('usa o primeiro item quando recebe um array', () => {
    expect(cleanFilter(['critico', 'alto'])).toBe('critico');
  });

  it('retorna null para undefined', () => {
    expect(cleanFilter(undefined)).toBeNull();
  });
});
