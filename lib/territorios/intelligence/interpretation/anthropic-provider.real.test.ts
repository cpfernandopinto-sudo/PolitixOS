/**
 * INTEL-03B — Teste de integração REAL do `AnthropicInterpretationProvider` (Parte M do
 * gate: "testes que consomem a API real devem ser separados atrás de um env gate").
 *
 * Só executa quando `RUN_REAL_INTEL_LLM=1` E `ANTHROPIC_API_KEY` estão presentes —
 * `vitest run` normal NUNCA chama a rede nem gasta tokens (o describe inteiro é pulado
 * via `describe.skipIf`, nenhum teste sequer é coletado quando o gate está fechado).
 */

import { describe, expect, it } from 'vitest';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import { buildFamilyScopedContext } from './prompt';
import { AnthropicInterpretationProvider } from './anthropic-provider';
import { validateInterpretationDraft } from './validator';

const gateOpen = process.env.RUN_REAL_INTEL_LLM === '1' && Boolean(process.env.ANTHROPIC_API_KEY);

describe.skipIf(!gateOpen)('AnthropicInterpretationProvider — integração REAL (gated por RUN_REAL_INTEL_LLM=1 + ANTHROPIC_API_KEY)', () => {
  it('gera um draft estruturalmente válido para uma família real, sem bypass do validador', async () => {
    const result = buildFixtureEconomicIntelligenceResult();
    const context = buildFamilyScopedContext(selectInterpretationInput(result), 'FISCAL');
    const provider = new AnthropicInterpretationProvider();

    const { drafts, executionMetadata } = await provider.generateInterpretations(context);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.origin).toBe('model');
    expect(drafts[0]!.modelProvenance?.provider).toBe('anthropic');
    expect(executionMetadata).toHaveLength(1);
    expect(executionMetadata[0]!.tokenUsage).not.toBeNull();

    const validation = validateInterpretationDraft(drafts[0]!, context);
    console.log('[real LLM] validation:', JSON.stringify(validation), '\n[real LLM] metadata:', JSON.stringify(executionMetadata[0]));
    // Não força validation.valid===true: o objetivo deste teste é provar que a chamada
    // real funciona e passa pelo validador de verdade, nunca que o LLM acerta sempre.
  }, 60_000);
});
