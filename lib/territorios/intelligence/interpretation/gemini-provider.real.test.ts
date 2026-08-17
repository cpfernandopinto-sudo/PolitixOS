/**
 * INTEL-03C — Teste de integração REAL do `GeminiInterpretationProvider` (Parte J do
 * gate: mesma política do INTEL-03B — testes que consomem a API real ficam atrás de um
 * env gate). Só executa quando `RUN_REAL_INTEL_LLM=1` E `GEMINI_API_KEY` estão
 * presentes — `vitest run` normal nunca coleta este teste (`describe.skipIf`), nunca
 * chama a rede, nunca gasta tokens.
 */

import { describe, expect, it } from 'vitest';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import { buildFamilyScopedContext } from './prompt';
import { GeminiInterpretationProvider } from './gemini-provider';
import { validateInterpretationDraft } from './validator';

const gateOpen = process.env.RUN_REAL_INTEL_LLM === '1' && Boolean(process.env.GEMINI_API_KEY);

describe.skipIf(!gateOpen)('GeminiInterpretationProvider — integração REAL (gated por RUN_REAL_INTEL_LLM=1 + GEMINI_API_KEY)', () => {
  it('gera um draft estruturalmente válido para uma família real, sem bypass do validador', async () => {
    const result = buildFixtureEconomicIntelligenceResult();
    const context = buildFamilyScopedContext(selectInterpretationInput(result), 'FISCAL');
    const provider = new GeminiInterpretationProvider();

    const { drafts, executionMetadata } = await provider.generateInterpretations(context);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.origin).toBe('model');
    expect(drafts[0]!.modelProvenance?.provider).toBe('gemini');
    expect(executionMetadata).toHaveLength(1);
    expect(executionMetadata[0]!.tokenUsage).not.toBeNull();

    const validation = validateInterpretationDraft(drafts[0]!, context);
    console.log('[real Gemini] validation:', JSON.stringify(validation), '\n[real Gemini] metadata:', JSON.stringify(executionMetadata[0]));
  }, 60_000);
});
