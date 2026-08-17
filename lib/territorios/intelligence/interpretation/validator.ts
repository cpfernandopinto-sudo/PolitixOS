/**
 * INTEL-03A — Validador de `InterpretationDraft` (seções 43-46 do gate).
 *
 * Combina, sem duplicar:
 *  - `../guardrails.ts` (INTEL-01, cross-domain): TRACEABILITY, NUMBER, ENTITY,
 *    CAUSALITY, PREDICTION, RECOMMENDATION_LEAK, IDEOLOGY, SENSITIVE_INFERENCE;
 *  - `./guards.ts` (INTEL-03A, específico de Economia): NORMATIVE, POLITICAL_ATTRIBUTION,
 *    NOMINALITY_VIOLATION, PIB_PER_CAPITA_SEMANTIC_VIOLATION, TEMPORAL_MISREPRESENTATION;
 *  - lineage claim-a-claim contra o `InterpretationInputContext` (incluindo resolução
 *    Consolidated -> Raw da seção 85 do gate);
 *  - suporte recomputado por claim, nunca aceito por confiança do autor (seção 15).
 *
 * Função pura. Não persiste, não chama LLM, não decide por confiança do autor do draft.
 */

import { consolidateConfidence, type ConfidenceClass } from '../contracts';
import { confidenceFromEvidenceCount, validateGuardableStatements, type GuardType } from '../guardrails';
import { deriveKnownEntitiesFromContext, validateEconomyGuards } from './guards';
import type {
  InterpretationClaim,
  InterpretationDraft,
  InterpretationInputContext,
  InterpretationValidationError,
  InterpretationValidationErrorCode,
  InterpretationValidationResult,
} from './types';

const GENERIC_GUARD_TO_CODE: Record<GuardType, InterpretationValidationErrorCode> = {
  TRACEABILITY: 'INSUFFICIENT_SUPPORT',
  NUMBER: 'UNSUPPORTED_NUMBER',
  ENTITY: 'UNKNOWN_SOURCE',
  CAUSALITY: 'CAUSAL_CLAIM',
  PREDICTION: 'FORECAST_CLAIM',
  RECOMMENDATION_LEAK: 'RECOMMENDATION_LEAK_CLAIM',
  IDEOLOGY: 'IDEOLOGY_CLAIM',
  SENSITIVE_INFERENCE: 'SENSITIVE_INFERENCE_CLAIM',
};

function extractNumbersFromText(text: string): number[] {
  return [...text.matchAll(/(?<![\p{L}\d])[-+]?\d+(?:[.,]\d+)?/gu)].map((match) => Number(match[0].replace(',', '.'))).filter(Number.isFinite);
}

function buildSupportedNumbers(context: InterpretationInputContext, draft: InterpretationDraft): number[] {
  const fromEvidence = Object.values(context.evidenceIndex).map((item) => item.value).filter((value): value is number => typeof value === 'number');
  const fromUnitText = context.units.flatMap((unit) => {
    if (unit.kind === 'CONSOLIDATED_SIGNAL') return [(unit.signal as { eventCount: number }).eventCount, ...extractNumbersFromText(`${unit.period}`)];
    const signal = unit.signal as { title: string; summary: string };
    return extractNumbersFromText(`${signal.title} ${signal.summary}`);
  });
  // Números estruturais legítimos: contagens sobre o próprio draft (ex.: "N sinais nesta
  // interpretação"), nunca uma estatística econômica — não vêm de evidência, mas também
  // não são um número inventado sobre a economia, apenas um fato sobre a composição do draft.
  const structural = [draft.claims.length];
  return [...new Set([...fromEvidence, ...fromUnitText, ...structural])];
}

function resolvableSignalRefIds(context: InterpretationInputContext): Set<string> {
  const ids = new Set<string>();
  for (const unit of context.units) {
    ids.add(unit.id);
    for (const rawRef of unit.constituentRawSignalRefs) ids.add(rawRef);
  }
  return ids;
}

/** Recomputa o suporte de um claim ignorando qualquer rótulo fornecido pelo autor (seção 15 do gate). */
function computeSupportStatus(claim: InterpretationClaim, resolvableSignals: Set<string>, evidenceIndex: InterpretationInputContext['evidenceIndex']): 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED' {
  if (claim.claimType === 'METHODOLOGICAL_CAVEAT') return 'SUPPORTED';
  const signalsOk = claim.signalRefs.length > 0 && claim.signalRefs.every((ref) => resolvableSignals.has(ref));
  const evidenceOk = claim.evidenceRefs.length > 0 && claim.evidenceRefs.every((ref) => Boolean(evidenceIndex[ref]));
  if (signalsOk && evidenceOk) return 'SUPPORTED';
  const signalsSome = claim.signalRefs.some((ref) => resolvableSignals.has(ref));
  const evidenceSome = claim.evidenceRefs.some((ref) => Boolean(evidenceIndex[ref]));
  if (signalsSome || evidenceSome) return 'PARTIALLY_SUPPORTED';
  return 'UNSUPPORTED';
}

export function validateInterpretationDraft(draft: InterpretationDraft, context: InterpretationInputContext): InterpretationValidationResult {
  const errors: InterpretationValidationError[] = [];
  const warnings: InterpretationValidationError[] = [];

  if (draft.statement.trim().length === 0) errors.push({ code: 'EMPTY_STATEMENT', claimId: null, detail: 'statement vazio' });
  if (draft.claims.length === 0) errors.push({ code: 'NO_CLAIMS', claimId: null, detail: 'draft sem nenhum claim' });

  const resolvableSignals = resolvableSignalRefIds(context);
  const evidenceIndex = context.evidenceIndex;

  // Lineage claim a claim — inclui resolução Consolidated -> Raw (seção 85 do gate):
  // um claim pode referenciar tanto o id de uma ConsolidatedSignal quanto o id de um
  // AnalyticalSignal bruto que ela resume, ambos aceitos como referência válida.
  for (const claim of draft.claims) {
    for (const ref of claim.signalRefs) if (!resolvableSignals.has(ref)) errors.push({ code: 'UNSUPPORTED_SIGNAL_REF', claimId: claim.id, detail: ref });
    for (const ref of claim.evidenceRefs) if (!evidenceIndex[ref]) errors.push({ code: 'UNSUPPORTED_EVIDENCE_REF', claimId: claim.id, detail: ref });
  }

  // Suporte recomputado — nenhum claim substantivo UNSUPPORTED pode compor uma Interpretation válida (seção 15).
  const recomputedSupport = new Map(draft.claims.map((claim) => [claim.id, computeSupportStatus(claim, resolvableSignals, evidenceIndex)]));
  for (const claim of draft.claims) {
    if (recomputedSupport.get(claim.id) === 'UNSUPPORTED') errors.push({ code: 'INSUFFICIENT_SUPPORT', claimId: claim.id, detail: `claim "${claim.claimType}" sem signalRefs/evidenceRefs resolvíveis` });
  }

  // O `statement` de topo é síntese dos claims — validado com o mesmo rigor, nunca
  // como texto livre isento de guardrail (a rastreabilidade do statement é a união
  // dos claims que ele sintetiza).
  const allClaimSignalRefs = [...new Set(draft.claims.flatMap((claim) => claim.signalRefs))];
  const allClaimEvidenceRefs = [...new Set(draft.claims.flatMap((claim) => claim.evidenceRefs))];
  const statementAsClaim: InterpretationClaim = { id: `${draft.id}:statement`, text: draft.statement, signalRefs: allClaimSignalRefs, evidenceRefs: allClaimEvidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
  const guardableStatements = [statementAsClaim, ...draft.claims].map((claim) => ({ id: claim.id, statement: claim.text, basedOnSignals: claim.signalRefs, evidenceRefs: claim.evidenceRefs }));

  // Guardrails genéricos INTEL-01 (reuso, não duplicação). TRACEABILITY é ignorada para
  // claims METHODOLOGICAL_CAVEAT (seção 67 — caveat não exige evidência própria; o
  // suporte já foi decidido de forma explícita e correta por `computeSupportStatus`).
  const caveatClaimIds = new Set(draft.claims.filter((claim) => claim.claimType === 'METHODOLOGICAL_CAVEAT').map((claim) => claim.id));
  // INTEL-03C.2 (Etapa 2 do gate) — knownEntities agora deriva dos indicadores
  // realmente presentes no contexto (catálogo fechado), nunca uma lista vazia por
  // padrão nem uma lista aberta: nomes de indicador por extenso deixam de ser
  // sinalizados como fonte desconhecida; qualquer entidade fora do catálogo (fabricada
  // ou não) continua sendo rejeitada normalmente.
  const guardContext = { supportedNumbers: buildSupportedNumbers(context, draft), knownEntities: deriveKnownEntitiesFromContext(context), knownEvidenceHashes: Object.keys(evidenceIndex) };
  const genericResult = validateGuardableStatements(guardContext, guardableStatements);
  for (const error of genericResult.errors) {
    if (error.guard === 'TRACEABILITY' && caveatClaimIds.has(error.statementId)) continue;
    errors.push({ code: GENERIC_GUARD_TO_CODE[error.guard], claimId: error.statementId === statementAsClaim.id ? null : error.statementId, detail: error.value });
  }

  // Guardrails específicos de Economia (INTEL-03A) — inclui o statement de topo.
  for (const error of validateEconomyGuards(context, [statementAsClaim, ...draft.claims])) errors.push({ code: error.code, claimId: error.claimId === statementAsClaim.id ? null : error.claimId, detail: error.detail });

  if (errors.length > 0) return { valid: false, errors, warnings, confidence: null };

  // Confidence recomputada (seção 39-40) — nunca herdada do draft, nunca percentual.
  const supportedClaims = draft.claims.filter((claim) => recomputedSupport.get(claim.id) !== 'UNSUPPORTED');
  const allSignalRefs = new Set(supportedClaims.flatMap((claim) => claim.signalRefs));
  const allEvidenceRefs = new Set(supportedClaims.flatMap((claim) => claim.evidenceRefs));
  const baseConfidence: ConfidenceClass = allSignalRefs.size === 0 ? 'LIMITED_CONTEXT' : confidenceFromEvidenceCount(allEvidenceRefs.size, allSignalRefs.size);

  const hasMixedSignal = draft.claims.some((claim) => claim.claimType === 'MIXED_SIGNAL_READING');
  const referencedFamilies = new Set(context.units.filter((unit) => supportedClaims.some((claim) => claim.signalRefs.includes(unit.id))).map((unit) => unit.family));
  const hasPartialCoverageFamily = [...referencedFamilies].some((family) => context.coverageByFamily[family] === 'partial');
  const confidence = hasMixedSignal || hasPartialCoverageFamily ? consolidateConfidence([baseConfidence, 'LIMITED_CONTEXT']) : baseConfidence;

  return { valid: true, errors: [], warnings, confidence };
}
