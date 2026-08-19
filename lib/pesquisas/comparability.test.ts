import { describe, it, expect } from 'vitest';
import { arePollsComparable, areResultsComparable, filterComparablePolls, filterComparableResults } from './comparability';
import type { ElectoralPoll, ElectoralPollResult } from './types';

function poll(overrides: Partial<Pick<ElectoralPoll, 'cargo' | 'abrangencia'>> = {}) {
  return { cargo: 'Governador', abrangencia: 'Estadual', ...overrides };
}

function result(overrides: Partial<Pick<ElectoralPollResult, 'cenario' | 'turno' | 'tipoPergunta'>> = {}) {
  return { cenario: 'Cenário 1', turno: 1, tipoPergunta: 'estimulada' as const, ...overrides };
}

describe('arePollsComparable — PARTE 20: nunca comparar cargos/abrangências diferentes', () => {
  it('mesmo cargo e abrangência → comparável', () => {
    expect(arePollsComparable(poll(), poll())).toBe(true);
  });

  it('cargos diferentes → não comparável', () => {
    expect(arePollsComparable(poll({ cargo: 'Governador' }), poll({ cargo: 'Presidente' }))).toBe(false);
  });

  it('abrangências diferentes → não comparável mesmo com mesmo cargo', () => {
    expect(arePollsComparable(poll({ abrangencia: 'Estadual' }), poll({ abrangencia: 'Municipal' }))).toBe(false);
  });

  it('cargo ausente (null) nunca é comparável — não assumir', () => {
    expect(arePollsComparable(poll({ cargo: null }), poll())).toBe(false);
  });
});

describe('areResultsComparable — nunca misturar cenário/turno/tipo de pergunta', () => {
  it('mesmo cenário/turno/tipo → comparável', () => {
    expect(areResultsComparable(result(), result())).toBe(true);
  });

  it('1º turno vs 2º turno → não comparável', () => {
    expect(areResultsComparable(result({ turno: 1 }), result({ turno: 2 }))).toBe(false);
  });

  it('espontânea vs estimulada → não comparável', () => {
    expect(areResultsComparable(result({ tipoPergunta: 'espontanea' }), result({ tipoPergunta: 'estimulada' }))).toBe(false);
  });

  it('cenários diferentes → não comparável', () => {
    expect(areResultsComparable(result({ cenario: 'Cenário 1' }), result({ cenario: 'Cenário 2' }))).toBe(false);
  });
});

describe('filterComparablePolls / filterComparableResults', () => {
  it('mantém só os itens comparáveis com o primeiro (âncora)', () => {
    const polls = [poll({ cargo: 'Governador' }), poll({ cargo: 'Governador' }), poll({ cargo: 'Presidente' })];
    expect(filterComparablePolls(polls as ElectoralPoll[])).toHaveLength(2);
  });

  it('lista vazia retorna vazia', () => {
    expect(filterComparablePolls([])).toEqual([]);
    expect(filterComparableResults([])).toEqual([]);
  });

  it('resultados: descarta 2º turno quando âncora é 1º turno', () => {
    const results = [result({ turno: 1 }), result({ turno: 1 }), result({ turno: 2 })];
    expect(filterComparableResults(results as ElectoralPollResult[])).toHaveLength(2);
  });
});
