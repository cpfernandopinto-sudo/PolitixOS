import { describe, it, expect } from 'vitest';
import { getInitials, getAvatarColorClass } from './avatar';

describe('getInitials', () => {
  it('usa a primeira letra do primeiro e do último nome', () => {
    expect(getInitials('Flávio Bolsonaro')).toBe('FB');
  });

  it('usa as duas primeiras letras quando há apenas uma palavra', () => {
    expect(getInitials('Michelle')).toBe('MI');
  });

  it('ignora espaços extras', () => {
    expect(getInitials('  Luiz Inácio Lula da Silva  ')).toBe('LS');
  });

  it('retorna "?" para nome vazio, em vez de fabricar uma inicial', () => {
    expect(getInitials('')).toBe('?');
  });
});

describe('getAvatarColorClass', () => {
  it('é determinística: o mesmo nome sempre recebe a mesma cor', () => {
    expect(getAvatarColorClass('Flávio Bolsonaro')).toBe(getAvatarColorClass('Flávio Bolsonaro'));
  });

  it('sempre retorna uma classe não vazia', () => {
    expect(getAvatarColorClass('Qualquer Nome').length).toBeGreaterThan(0);
  });
});
