/**
 * INTEL-03A — Pipeline completo de interpretação (seção 76-77 do gate).
 *
 * EconomicIntelligenceResult -> selectInterpretationInput -> InterpretationInputContext
 *   -> serializeInterpretationContext (determinístico, sem prompt)
 *   -> provider.generateInterpretations (SEM LLM neste gate)
 *   -> validateInterpretationDraft (claim a claim)
 *   -> buildValidatedInterpretation (aceito) OU RejectedInterpretationDraft (rejeitado)
 *
 * Draft inválido nunca vira Interpretation (seção 77) — fica apenas em `rejected`,
 * nunca persistido, nunca com side effect algum (interpretations ficam em memória —
 * seção 61 do gate).
 */

import type { EconomicIntelligenceResult } from '../economy/types';
import { buildValidatedInterpretation } from './build';
import { selectInterpretationInput, type SelectInterpretationInputOptions } from './selection';
import { serializeInterpretationContext } from './serializer';
import type { InterpretationPipelineResult, InterpretationProvider, RejectedInterpretationDraft, ValidatedInterpretation } from './types';
import { validateInterpretationDraft } from './validator';

export const INTEL_INTERPRETATION_SELECTION_METHOD_VERSION = 'INTEL_INTERPRETATION_SELECTION_V1';
export const INTEL_INTERPRETATION_VALIDATION_METHOD_VERSION = 'INTEL_INTERPRETATION_VALIDATION_V1';

export async function runInterpretationPipeline(result: EconomicIntelligenceResult, provider: InterpretationProvider, options: SelectInterpretationInputOptions = {}): Promise<InterpretationPipelineResult> {
  const context = selectInterpretationInput(result, options);

  if (context.units.length === 0) {
    return { status: 'NO_INTERPRETATION', reason: 'Nenhuma unidade elegível após seleção — evidência insuficiente para qualquer interpretação (seção 27 do gate).', context };
  }

  // Serialização determinística — o mock provider consome `context` diretamente, mas o
  // provider real (INTEL-03B, `AnthropicInterpretationProvider`) consome exatamente esta
  // serialização (escopada por família) como `PromptInputModel`; garante que o contexto
  // é canonicalizável de forma estável (mesmo hash para o mesmo input).
  serializeInterpretationContext(context);

  const { drafts, executionMetadata } = await provider.generateInterpretations(context);
  const accepted: ValidatedInterpretation[] = [];
  const rejected: RejectedInterpretationDraft[] = [];

  for (const draft of drafts) {
    const validation = validateInterpretationDraft(draft, context);
    if (validation.valid) accepted.push(buildValidatedInterpretation(draft, validation));
    else rejected.push({ draft, errors: validation.errors });
  }

  return { status: 'COMPLETED', context, accepted, rejected, executionMetadata };
}
