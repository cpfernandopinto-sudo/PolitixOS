/**
 * INTEL-01 — Lineage / Provenance helpers.
 *
 * Mecanismo escolhido (seção 7 do relatório): referências por ID em arrays simples
 * (mesmo padrão já usado em `electoral-briefing.ts`: `interpretationRefs`, `factRefs`,
 * `signalRefs`), não um grafo genérico nem cópia integral da árvore em cada objeto.
 * O frontend resolve uma referência via `evidenceIndex`/índices equivalentes, sem
 * reconstruir a lógica de derivação.
 *
 * Não persiste, não analisa município real.
 */

import type { AnalyticalSignal, Evidence, Implication, Interpretation, Recommendation } from './contracts';

export class OrphanRecommendationError extends Error {
  constructor(recommendationId: string) {
    super(`ORPHAN_RECOMMENDATION:${recommendationId}`);
  }
}

export class BrokenLineageError extends Error {
  constructor(kind: string, ref: string) {
    super(`BROKEN_LINEAGE:${kind}:${ref}`);
  }
}

/** Regra: uma Recommendation nunca existe sem lineage de Implication OU Interpretation (seção 6). */
export function assertRecommendationNotOrphan(recommendation: Recommendation): void {
  if (recommendation.basedOnImplications.length === 0 && recommendation.basedOnInterpretations.length === 0) {
    throw new OrphanRecommendationError(recommendation.id);
  }
}

/** Confirma que toda referência declarada por uma Recommendation resolve para um item real fornecido. */
export function assertLineageResolves(params: {
  recommendation: Recommendation;
  implications: Implication[];
  interpretations: Interpretation[];
  signals: AnalyticalSignal[];
  evidenceIndex: Record<string, Evidence>;
}): void {
  assertRecommendationNotOrphan(params.recommendation);
  const implicationIds = new Set(params.implications.map((item) => item.id));
  const interpretationIds = new Set(params.interpretations.map((item) => item.id));
  const signalIds = new Set(params.signals.map((item) => item.id));

  for (const ref of params.recommendation.basedOnImplications) if (!implicationIds.has(ref)) throw new BrokenLineageError('recommendation->implication', ref);
  for (const ref of params.recommendation.basedOnInterpretations) if (!interpretationIds.has(ref)) throw new BrokenLineageError('recommendation->interpretation', ref);
  for (const ref of params.recommendation.evidenceRefs) if (!params.evidenceIndex[ref]) throw new BrokenLineageError('recommendation->evidence', ref);

  for (const implication of params.implications) {
    for (const ref of implication.basedOnInterpretations) if (!interpretationIds.has(ref)) throw new BrokenLineageError('implication->interpretation', ref);
  }
  for (const interpretation of params.interpretations) {
    for (const ref of interpretation.basedOnSignals) if (!signalIds.has(ref)) throw new BrokenLineageError('interpretation->signal', ref);
    for (const ref of interpretation.evidenceRefs) if (!params.evidenceIndex[ref]) throw new BrokenLineageError('interpretation->evidence', ref);
  }
  for (const signal of params.signals) {
    for (const ref of signal.evidenceRefs) if (!params.evidenceIndex[ref]) throw new BrokenLineageError('signal->evidence', ref);
  }
}

/** Resolve a cadeia completa até a fonte oficial (evidence), para responder "como uma recomendação volta até a fonte oficial?" (critério de sucesso #7). */
export function resolveRecommendationToEvidence(params: {
  recommendation: Recommendation;
  implications: Implication[];
  interpretations: Interpretation[];
  evidenceIndex: Record<string, Evidence>;
}): Evidence[] {
  const implicationById = new Map(params.implications.map((item) => [item.id, item]));
  const interpretationById = new Map(params.interpretations.map((item) => [item.id, item]));
  const evidenceIds = new Set<string>(params.recommendation.evidenceRefs);

  const interpretationsFromImplications = params.recommendation.basedOnImplications.flatMap((id) => implicationById.get(id)?.basedOnInterpretations ?? []);
  const allInterpretationIds = new Set([...params.recommendation.basedOnInterpretations, ...interpretationsFromImplications]);
  for (const id of allInterpretationIds) {
    const interpretation = interpretationById.get(id);
    if (interpretation) for (const ref of interpretation.evidenceRefs) evidenceIds.add(ref);
  }
  return [...evidenceIds].map((id) => params.evidenceIndex[id]).filter((item): item is Evidence => Boolean(item));
}
