import { describe, it, expect } from 'vitest';
import {
  parseGlobalFilters,
  serializeGlobalFilters,
  getEffectiveCandidateIds,
  toLegacyNoticiasBucket,
  DEFAULT_GLOBAL_FILTERS,
} from './global';

describe('parseGlobalFilters', () => {
  it('sem parâmetros → ALL_ALLOWED, período "all"', () => {
    expect(parseGlobalFilters(new URLSearchParams(''))).toEqual(DEFAULT_GLOBAL_FILTERS);
  });

  it('formato canônico: candidates + mode=selected', () => {
    const state = parseGlobalFilters(new URLSearchParams('candidates=a,b&mode=selected&period=7'));
    expect(state).toEqual({ candidateMode: 'SELECTED', candidateIds: ['a', 'b'], period: '7' });
  });

  it('mode=all_allowed ignora candidates residual (ex.: usuário voltou para "Todos")', () => {
    const state = parseGlobalFilters(new URLSearchParams('candidates=a&mode=all_allowed'));
    expect(state.candidateMode).toBe('ALL_ALLOWED');
    expect(state.candidateIds).toEqual([]);
  });

  it('alias legado `candidate` (singular) infere SELECTED com 1 id', () => {
    const state = parseGlobalFilters(new URLSearchParams('candidate=abc123'));
    expect(state).toEqual({ candidateMode: 'SELECTED', candidateIds: ['abc123'], period: 'all' });
  });

  it('alias legado `candidateId` também é aceito', () => {
    const state = parseGlobalFilters(new URLSearchParams('candidateId=xyz'));
    expect(state.candidateIds).toEqual(['xyz']);
  });

  it('`candidates` tem precedência sobre os aliases legados quando ambos presentes', () => {
    const state = parseGlobalFilters(new URLSearchParams('candidates=a,b&candidate=c'));
    expect(state.candidateIds).toEqual(['a', 'b']);
  });

  it('período inválido cai para "all"', () => {
    expect(parseGlobalFilters(new URLSearchParams('period=2024-R12')).period).toBe('all');
  });

  it('ids com espaços e vazios são normalizados', () => {
    const state = parseGlobalFilters(new URLSearchParams('candidates=' + encodeURIComponent(' a , ,b ')));
    expect(state.candidateIds).toEqual(['a', 'b']);
  });
});

describe('serializeGlobalFilters', () => {
  it('ALL_ALLOWED remove candidates/mode e aliases legados', () => {
    const params = serializeGlobalFilters(
      DEFAULT_GLOBAL_FILTERS,
      new URLSearchParams('candidate=old&candidateId=old2&target=old3&foo=bar')
    );
    expect(params.get('candidates')).toBeNull();
    expect(params.get('mode')).toBeNull();
    expect(params.get('candidate')).toBeNull();
    expect(params.get('candidateId')).toBeNull();
    expect(params.get('target')).toBeNull();
    expect(params.get('foo')).toBe('bar'); // parâmetros não-relacionados preservados
  });

  it('SELECTED grava formato canônico', () => {
    const params = serializeGlobalFilters(
      { candidateMode: 'SELECTED', candidateIds: ['a', 'b'], period: '7' },
      new URLSearchParams('')
    );
    expect(params.get('candidates')).toBe('a,b');
    expect(params.get('mode')).toBe('selected');
    expect(params.get('period')).toBe('7');
  });

  it('período "all" não é gravado na URL (mantém URLs limpas)', () => {
    const params = serializeGlobalFilters(DEFAULT_GLOBAL_FILTERS, new URLSearchParams(''));
    expect(params.get('period')).toBeNull();
  });

  it('não muta o URLSearchParams recebido', () => {
    const existing = new URLSearchParams('candidate=old');
    serializeGlobalFilters(DEFAULT_GLOBAL_FILTERS, existing);
    expect(existing.get('candidate')).toBe('old');
  });
});

describe('getEffectiveCandidateIds', () => {
  it('admin (allowedTargetIds=null) + ALL_ALLOWED → null (sem filtro)', () => {
    expect(getEffectiveCandidateIds(DEFAULT_GLOBAL_FILTERS, null)).toBeNull();
  });

  it('admin + SELECTED → retorna a seleção como está (admin pode escolher qualquer um)', () => {
    const state = { candidateMode: 'SELECTED' as const, candidateIds: ['a', 'b'], period: 'all' as const };
    expect(getEffectiveCandidateIds(state, null)).toEqual(['a', 'b']);
  });

  it('não-admin + ALL_ALLOWED → retorna a lista de permitidos completa ("Todos" = todos os PERMITIDOS)', () => {
    expect(getEffectiveCandidateIds(DEFAULT_GLOBAL_FILTERS, ['x', 'y'])).toEqual(['x', 'y']);
  });

  it('não-admin + SELECTED dentro dos permitidos → interseção = seleção', () => {
    const state = { candidateMode: 'SELECTED' as const, candidateIds: ['x'], period: 'all' as const };
    expect(getEffectiveCandidateIds(state, ['x', 'y'])).toEqual(['x']);
  });

  it('não-admin + SELECTED com candidato fora da permissão → excluído (fail-closed)', () => {
    const state = { candidateMode: 'SELECTED' as const, candidateIds: ['x', 'forbidden'], period: 'all' as const };
    expect(getEffectiveCandidateIds(state, ['x', 'y'])).toEqual(['x']);
  });

  it('candidato revogado enquanto selecionado → seleção sanitizada para array vazio, não para "todos"', () => {
    const state = { candidateMode: 'SELECTED' as const, candidateIds: ['revoked'], period: 'all' as const };
    expect(getEffectiveCandidateIds(state, ['x', 'y'])).toEqual([]);
  });

  it('usuário sem nenhum candidato permitido ([]) + ALL_ALLOWED → []', () => {
    expect(getEffectiveCandidateIds(DEFAULT_GLOBAL_FILTERS, [])).toEqual([]);
  });
});

describe('toLegacyNoticiasBucket', () => {
  it('mapeia dia-contagem para os buckets nomeados que NoticiasFilters espera', () => {
    expect(toLegacyNoticiasBucket('1')).toBe('24h');
    expect(toLegacyNoticiasBucket('7')).toBe('7d');
    expect(toLegacyNoticiasBucket('30')).toBe('30d');
    expect(toLegacyNoticiasBucket('all')).toBeUndefined();
  });
});
