/**
 * INTEL-ELECTORAL-01 (Missão B) — discriminated union mínima para o harness
 * provider-agnostic aceitar mais de um domínio, sem forçar Eleitoral no schema
 * econômico (`InterpretationInputContext` é intrinsecamente FISCAL/PIB_VAB/
 * OFFICIAL_SHARE — ver `../economy/types.ts`).
 *
 * Puramente aditivo: nenhum arquivo existente (`config.ts`, `provider.ts`,
 * `fallback.ts`, `pipeline.ts`) foi alterado para consumir isto. Este arquivo só
 * declara o contrato de tipos que uma futura orquestração (fora do escopo deste
 * gate) usaria para despachar por domínio — ex.: `if (input.domain === 'economy')
 * runInterpretationPipeline(input.context, ...) else runElectoralLlmEnrichment(...)`.
 */

import type { InterpretationInputContext } from './types';
import type { ElectoralBriefing } from '../../electoral-briefing';

export type InterpretationDomain = 'economy' | 'electoral';

export type DomainInterpretationInput =
  | { domain: 'economy'; context: InterpretationInputContext }
  | { domain: 'electoral'; briefing: ElectoralBriefing };

export function isEconomyInput(input: DomainInterpretationInput): input is { domain: 'economy'; context: InterpretationInputContext } {
  return input.domain === 'economy';
}

export function isElectoralInput(input: DomainInterpretationInput): input is { domain: 'electoral'; briefing: ElectoralBriefing } {
  return input.domain === 'electoral';
}
