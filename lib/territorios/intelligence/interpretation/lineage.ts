/**
 * INTEL-03A — Lineage da camada L4 (seções 84-86 do gate).
 *
 * Estende o padrão de `../lineage.ts` (INTEL-01: `assertLineageResolves`,
 * `resolveRecommendationToEvidence`) para o caso novo introduzido pelo INTEL-02C que
 * o INTEL-01 não previa: uma `Interpretation` pode se basear em um `ConsolidatedSignal`,
 * que por sua vez resume um ou mais `AnalyticalSignal` brutos (seção 85 — "Consolidated
 * -> Raw Signals -> Derived -> Evidence").
 *
 * Não duplica `../lineage.ts` — reexporta os erros de lá para manter um único tipo de
 * exceção de lineage em toda a árvore L0-L4.
 */

import { BrokenLineageError } from '../lineage';
import type { ValidatedInterpretation } from './types';

export { BrokenLineageError };

/**
 * Confirma que toda referência de uma ValidatedInterpretation resolve até um
 * AnalyticalSignal/ConsolidatedSignal e até uma Evidence reais do contexto que a
 * originou. Usado no POC real (seção 86 do gate) para provar "zero refs quebradas".
 */
export function assertInterpretationLineageResolves(interpretation: ValidatedInterpretation, resolvableSignalIds: Set<string>, evidenceIndex: Record<string, unknown>): void {
  for (const ref of interpretation.basedOnSignals) if (!resolvableSignalIds.has(ref)) throw new BrokenLineageError('interpretation->signal', ref);
  for (const ref of interpretation.evidenceRefs) if (!evidenceIndex[ref]) throw new BrokenLineageError('interpretation->evidence', ref);
  for (const claim of interpretation.claims) {
    for (const ref of claim.signalRefs) if (!resolvableSignalIds.has(ref)) throw new BrokenLineageError('claim->signal', ref);
    for (const ref of claim.evidenceRefs) if (!evidenceIndex[ref]) throw new BrokenLineageError('claim->evidence', ref);
  }
}
