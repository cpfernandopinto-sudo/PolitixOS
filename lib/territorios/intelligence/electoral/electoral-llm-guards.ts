/**
 * INTEL-ELECTORAL-01 (Missão B) — guardrails para o futuro enriquecimento LLM sobre
 * `ElectoralBriefing`. Aplica estruturalmente as duas regras absolutas do gate:
 *  1. "Toda conclusão factual precisa ser rastreável ao payload determinístico"
 *  2. "LLM nunca pode... transformar LIMITED_CONTEXT em fato"
 * Reusa `CONFIDENCE_RANK`/`ConfidenceClass` de `../contracts.ts` (mesmo ranking já
 * usado por Economia) — não reinventa uma escala de confiança nova.
 */

import { CONFIDENCE_RANK, type ConfidenceClass } from '../contracts';
import type { ElectoralBriefing } from '../../electoral-briefing';
import type { ElectoralInterpretationClaim, ElectoralInterpretationDraft } from './electoral-prompt-v1';

export interface ElectoralLlmGuardError {
  code: 'UNRESOLVED_REFERENCE' | 'EMPTY_REFERENCE' | 'CONFIDENCE_UPGRADE' | 'INVENTED_ELECTION_YEAR' | 'RECOMMENDATION_LEAK';
  claimId: string;
  detail: string;
}

const RECOMMENDATION_PHRASES = ['deveria', 'recomend', 'é preciso investir', 'a campanha deve', 'sugerimos'];

function resolvableIds(briefing: ElectoralBriefing): Map<string, ConfidenceClass | null> {
  const map = new Map<string, ConfidenceClass | null>();
  for (const item of briefing.interpretations) map.set(item.id, item.confidenceClass as ConfidenceClass);
  for (const year of briefing.historicalEvolution.map((item) => item.year)) map.set(`fact:${year}`, null);
  for (const item of briefing.benchmark) map.set(item.interpretationRef, item.confidence as ConfidenceClass);
  return map;
}

function extractedYears(text: string): number[] {
  return [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0]));
}

/**
 * Valida cada claim de um `ElectoralInterpretationDraft` contra o `ElectoralBriefing`
 * que efetivamente o originou — nunca contra um briefing diferente, nunca por confiança
 * do provider. Puro, síncrono, sem side effects (mesmo padrão de `validateEconomyGuards`).
 */
export function validateElectoralLlmDraft(draft: ElectoralInterpretationDraft, briefing: ElectoralBriefing): ElectoralLlmGuardError[] {
  const resolvable = resolvableIds(briefing);
  const validYears = new Set(briefing.territory.electionsCovered);
  const errors: ElectoralLlmGuardError[] = [];

  for (const claim of draft.claims) {
    errors.push(...validateClaim(claim, resolvable, validYears));
  }
  return errors;
}

function validateClaim(claim: ElectoralInterpretationClaim, resolvable: Map<string, ConfidenceClass | null>, validYears: Set<number>): ElectoralLlmGuardError[] {
  const errors: ElectoralLlmGuardError[] = [];

  if (claim.basedOnInterpretationIds.length === 0) {
    errors.push({ code: 'EMPTY_REFERENCE', claimId: claim.id, detail: 'Claim sem nenhuma referência a interpretations/elections/benchmark do briefing.' });
    return errors;
  }

  const referencedClasses: ConfidenceClass[] = [];
  for (const ref of claim.basedOnInterpretationIds) {
    if (!resolvable.has(ref)) {
      errors.push({ code: 'UNRESOLVED_REFERENCE', claimId: claim.id, detail: `Referência "${ref}" não existe no briefing determinístico — possível fato inventado.` });
      continue;
    }
    const confidence = resolvable.get(ref);
    if (confidence) referencedClasses.push(confidence);
  }

  // Regra 2 do gate: LIMITED_CONTEXT nunca pode virar fato. Se a base do claim é
  // exclusivamente LIMITED_CONTEXT (o pior caso, rank mais alto), o texto não pode
  // soar como afirmação direta — detectado aqui por ausência de qualificador de
  // incerteza quando a confiança consolidada dos itens referenciados é LIMITED_CONTEXT.
  if (referencedClasses.length > 0) {
    const weakest = referencedClasses.reduce((worst, current) => (CONFIDENCE_RANK[current] > CONFIDENCE_RANK[worst] ? current : worst), referencedClasses[0]);
    if (weakest === 'LIMITED_CONTEXT' && !/contexto limitado|dado insuficiente|não é possível afirmar com certeza|evidência limitada/i.test(claim.text)) {
      errors.push({ code: 'CONFIDENCE_UPGRADE', claimId: claim.id, detail: 'Claim baseado em interpretação LIMITED_CONTEXT sem qualificador de incerteza no texto — risco de apresentar contexto limitado como fato direto.' });
    }
  }

  for (const year of extractedYears(claim.text)) {
    if (!validYears.has(year)) errors.push({ code: 'INVENTED_ELECTION_YEAR', claimId: claim.id, detail: `Ano citado (${year}) fora das eleições cobertas pelo briefing (${[...validYears].join(', ')}).` });
  }

  const normalized = claim.text.toLocaleLowerCase('pt-BR');
  for (const phrase of RECOMMENDATION_PHRASES) {
    if (normalized.includes(phrase)) { errors.push({ code: 'RECOMMENDATION_LEAK', claimId: claim.id, detail: `"${phrase}" — o briefing eleitoral declara guardrails.recommendations=[]; enriquecimento LLM não pode introduzir recomendação.` }); break; }
  }

  return errors;
}
