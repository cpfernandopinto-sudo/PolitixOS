/**
 * INTEL-03A — Compõe uma `ValidatedInterpretation` a partir de um `InterpretationDraft`
 * já validado (seção 12-13 do gate).
 *
 * Nunca chamado para um draft inválido (ver `pipeline.ts`). Reutiliza o contrato
 * canônico `Interpretation` sem alterá-lo — `claims`/`temporalScope` são extensão
 * aditiva, mesmo padrão já usado por `EconomicIntelligenceResult` (INTEL-02B) para
 * estender Coverage/TemporalCoverage sem tocar o contrato cross-domain do INTEL-01.
 */

import type { InterpretationDraft, InterpretationValidationResult, ValidatedInterpretation } from './types';

const DRAFT_ORIGIN_TO_CANONICAL = { rule: 'rule', model_mock: 'model', model: 'model' } as const;

export function buildValidatedInterpretation(draft: InterpretationDraft, validation: Extract<InterpretationValidationResult, { valid: true }>): ValidatedInterpretation {
  const evidenceRefs = [...new Set(draft.claims.flatMap((claim) => claim.evidenceRefs))].sort();
  const basedOnSignals = [...new Set(draft.claims.flatMap((claim) => claim.signalRefs))].sort();

  return {
    id: draft.id,
    territoryId: draft.territoryId,
    assertionClass: 'INTERPRETATION',
    statement: draft.statement,
    domains: [...draft.domains],
    origin: DRAFT_ORIGIN_TO_CANONICAL[draft.origin],
    // INTEL-03B seção 46: populado com dados reais quando o draft vem de um provider de
    // LLM real (origin 'model'); permanece null para 'rule'/'model_mock' (nunca inventado).
    modelProvenance: draft.modelProvenance ?? null,
    basedOnSignals,
    evidenceRefs,
    confidence: validation.confidence,
    caveats: [...draft.caveats],
    // Não resolvido neste gate (seção 29): preservar conflito, não escolher lado.
    contradicts: [],
    claims: draft.claims,
    temporalScope: draft.temporalScope,
    reviewStatus: 'not_reviewed',
  };
}
