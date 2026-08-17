/**
 * INTEL-03C — Testes da política de fallback (Parte G do gate, seções 58-63).
 */

import { describe, expect, it } from 'vitest';
import { generateWithFallback } from './fallback';
import { InterpretationProviderError } from './provider-errors';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import type { InterpretationGenerationResult, InterpretationInputContext, InterpretationProvider } from './types';

const result = buildFixtureEconomicIntelligenceResult();
const context = selectInterpretationInput(result);

const EMPTY_RESULT: InterpretationGenerationResult = { drafts: [], executionMetadata: [] };

function stubProvider(id: string, impl: (context: InterpretationInputContext) => Promise<InterpretationGenerationResult>): InterpretationProvider {
  return { id, generateInterpretations: impl };
}

describe('generateWithFallback — seções 58-63 do gate', () => {
  it('default responde normalmente: usedProvider="default", fallbackReason=null, fallback nunca chamado', async () => {
    let fallbackCalled = false;
    const primary = stubProvider('primary', async () => EMPTY_RESULT);
    const fallback = stubProvider('fallback', async () => { fallbackCalled = true; return EMPTY_RESULT; });

    const outcome = await generateWithFallback(context, primary, fallback);

    expect(outcome.usedProvider).toBe('default');
    expect(outcome.fallbackReason).toBeNull();
    expect(fallbackCalled).toBe(false);
  });

  it('default lança InterpretationProviderError: aciona fallback, registra fallbackReason', async () => {
    const primary = stubProvider('primary', async () => { throw new InterpretationProviderError('PROVIDER_TIMEOUT', 'timeout simulado'); });
    const fallback = stubProvider('fallback', async () => EMPTY_RESULT);

    const outcome = await generateWithFallback(context, primary, fallback);

    expect(outcome.usedProvider).toBe('fallback');
    expect(outcome.fallbackReason).toBe('PROVIDER_TIMEOUT');
  });

  it('default lança erro de provider e NENHUM fallback está configurado: propaga o erro original', async () => {
    const primary = stubProvider('primary', async () => { throw new InterpretationProviderError('PROVIDER_AUTH_ERROR', 'auth simulado'); });

    await expect(generateWithFallback(context, primary, null)).rejects.toMatchObject({ code: 'PROVIDER_AUTH_ERROR' });
  });

  it('default lança um erro que NÃO é InterpretationProviderError (inesperado): nunca aciona fallback, propaga o erro original', async () => {
    let fallbackCalled = false;
    const primary = stubProvider('primary', async () => { throw new Error('bug inesperado, não é erro de provider'); });
    const fallback = stubProvider('fallback', async () => { fallbackCalled = true; return EMPTY_RESULT; });

    await expect(generateWithFallback(context, primary, fallback)).rejects.toThrow('bug inesperado');
    expect(fallbackCalled).toBe(false);
  });

  it('fallback também falha: o erro do fallback é o que se propaga, nunca mascarado pelo erro original', async () => {
    const primary = stubProvider('primary', async () => { throw new InterpretationProviderError('PROVIDER_TIMEOUT', 'timeout do primary'); });
    const fallback = stubProvider('fallback', async () => { throw new InterpretationProviderError('PROVIDER_RATE_LIMIT', 'rate limit do fallback'); });

    await expect(generateWithFallback(context, primary, fallback)).rejects.toMatchObject({ code: 'PROVIDER_RATE_LIMIT' });
  });
});
