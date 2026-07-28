import { describe, it, expect } from 'vitest';
import { resolveViewPreference } from './viewPreference';

describe('resolveViewPreference', () => {
  it('retorna "feed" quando não há valor salvo (padrão)', () => {
    expect(resolveViewPreference(null)).toBe('feed');
  });

  it('retorna o valor salvo quando é válido', () => {
    expect(resolveViewPreference('table')).toBe('table');
    expect(resolveViewPreference('feed')).toBe('feed');
  });

  it('ignora valor salvo inválido e usa o padrão', () => {
    expect(resolveViewPreference('grid')).toBe('feed');
    expect(resolveViewPreference('')).toBe('feed');
  });

  it('respeita um fallback customizado', () => {
    expect(resolveViewPreference(null, 'table')).toBe('table');
    expect(resolveViewPreference('invalido', 'table')).toBe('table');
  });
});
