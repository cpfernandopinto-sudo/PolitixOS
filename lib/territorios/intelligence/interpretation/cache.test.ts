/**
 * INTEL-03C — Testes do contrato de cache L4 (Parte F do gate, seções 48-57).
 */

import { describe, expect, it } from 'vitest';
import { buildInterpretationCacheKey, InMemoryInterpretationCache, isMaterialChange } from './cache';
import type { ValidatedInterpretation } from './types';

const KEY_A = { contextHash: 'hash-a', provider: 'anthropic', model: 'claude-opus-5', promptVersion: 'v2' };
const KEY_B = { contextHash: 'hash-b', provider: 'anthropic', model: 'claude-opus-5', promptVersion: 'v2' };

const FAKE_INTERPRETATION: ValidatedInterpretation = {
  id: 'interpretation:test', territoryId: 'fixture', assertionClass: 'INTERPRETATION', statement: 'teste',
  domains: ['economia'], origin: 'model', modelProvenance: null, basedOnSignals: [], evidenceRefs: [],
  confidence: 'DIRECTLY_SUPPORTED', caveats: [], contradicts: [], claims: [], temporalScope: { periodStart: '2020', periodEnd: '2021', label: 'teste' }, reviewStatus: 'not_reviewed',
};

describe('buildInterpretationCacheKey — seção 49 do gate', () => {
  it('é determinística: mesmas partes produzem sempre a mesma chave', () => {
    expect(buildInterpretationCacheKey(KEY_A)).toBe(buildInterpretationCacheKey({ ...KEY_A }));
  });

  it('contextHash diferente produz chave diferente', () => {
    expect(buildInterpretationCacheKey(KEY_A)).not.toBe(buildInterpretationCacheKey(KEY_B));
  });

  it('provider/model/promptVersion diferentes produzem chaves diferentes mesmo com o mesmo contextHash', () => {
    const base = buildInterpretationCacheKey(KEY_A);
    expect(buildInterpretationCacheKey({ ...KEY_A, provider: 'gemini' })).not.toBe(base);
    expect(buildInterpretationCacheKey({ ...KEY_A, model: 'gemini-2.5-flash' })).not.toBe(base);
    expect(buildInterpretationCacheKey({ ...KEY_A, promptVersion: 'v1' })).not.toBe(base);
  });
});

describe('isMaterialChange — seção 52-53 do gate', () => {
  it('mesmo contextHash: não é mudança material', () => {
    expect(isMaterialChange('hash-x', 'hash-x')).toBe(false);
  });

  it('contextHash diferente: é sempre mudança material', () => {
    expect(isMaterialChange('hash-x', 'hash-y')).toBe(true);
  });

  it('sem contextHash anterior (null): é tratado como mudança material (primeira geração)', () => {
    expect(isMaterialChange(null, 'hash-x')).toBe(true);
  });
});

describe('InMemoryInterpretationCache — seção 54 do gate (in-memory/test, nunca produção)', () => {
  it('miss em chave nunca escrita', () => {
    const cache = new InMemoryInterpretationCache();
    expect(cache.has(KEY_A)).toBe(false);
    expect(cache.get(KEY_A)).toBeUndefined();
  });

  it('set seguido de get retorna a mesma entrada (hit)', () => {
    const cache = new InMemoryInterpretationCache();
    cache.set(KEY_A, [FAKE_INTERPRETATION], () => '2026-08-16T00:00:00Z');
    expect(cache.has(KEY_A)).toBe(true);
    const entry = cache.get(KEY_A);
    expect(entry?.interpretations).toEqual([FAKE_INTERPRETATION]);
    expect(entry?.cachedAt).toBe('2026-08-16T00:00:00Z');
  });

  it('chaves diferentes não colidem', () => {
    const cache = new InMemoryInterpretationCache();
    cache.set(KEY_A, [FAKE_INTERPRETATION]);
    expect(cache.has(KEY_B)).toBe(false);
  });
});
