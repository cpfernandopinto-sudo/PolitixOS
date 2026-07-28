import { describe, it, expect } from 'vitest';
import { cleanFilter } from './instagram';

describe('cleanFilter (Instagram)', () => {
  it('retorna null para valores "vazios" conhecidos (todos, all, etc.)', () => {
    expect(cleanFilter('todos')).toBeNull();
    expect(cleanFilter('all')).toBeNull();
    expect(cleanFilter('')).toBeNull();
    expect(cleanFilter('null')).toBeNull();
    expect(cleanFilter('undefined')).toBeNull();
  });

  it('é case-insensitive para os valores vazios', () => {
    expect(cleanFilter('TODOS')).toBeNull();
    expect(cleanFilter('Todas')).toBeNull();
  });

  it('retorna null para undefined', () => {
    expect(cleanFilter(undefined)).toBeNull();
  });

  it('preserva um valor real', () => {
    expect(cleanFilter('alto')).toBe('alto');
  });

  it('usa o primeiro item quando recebe um array (searchParams pode repetir a chave)', () => {
    expect(cleanFilter(['alto', 'medio'])).toBe('alto');
  });

  it('trata array vazio como vazio', () => {
    expect(cleanFilter([])).toBeNull();
  });
});
