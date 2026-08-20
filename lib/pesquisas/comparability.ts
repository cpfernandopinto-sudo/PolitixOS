import type { ElectoralPoll, ElectoralPollResult } from './types';
import { isRealCandidate } from './types';

export function arePollsComparable(
  a: Pick<ElectoralPoll, 'cargo' | 'abrangencia'> & { uf?: string | null },
  b: Pick<ElectoralPoll, 'cargo' | 'abrangencia'> & { uf?: string | null }
): boolean {
  if (!a.cargo || !b.cargo) return false;
  const cargoMatch =
    a.cargo.toLowerCase().trim() === b.cargo.toLowerCase().trim() ||
    a.cargo.toLowerCase().includes(b.cargo.toLowerCase()) ||
    b.cargo.toLowerCase().includes(a.cargo.toLowerCase());
  const ufA = a.uf ?? a.abrangencia ?? 'BR';
  const ufB = b.uf ?? b.abrangencia ?? 'BR';
  return cargoMatch && ufA === ufB;
}

export function areScenariosEquivalent(resultsA: ElectoralPollResult[], resultsB: ElectoralPollResult[]): boolean {
  const setA = new Set(resultsA.filter((r) => isRealCandidate(r.candidateName)).map((r) => r.candidateName.toLowerCase().trim()));
  const setB = new Set(resultsB.filter((r) => isRealCandidate(r.candidateName)).map((r) => r.candidateName.toLowerCase().trim()));

  if (setA.size === 0 || setB.size === 0) return false;
  if (setA.size !== setB.size) return false;

  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}

export function areResultsComparable(
  a: Pick<ElectoralPollResult, 'cenario' | 'turno' | 'tipoPergunta'> & { office?: string | null },
  b: Pick<ElectoralPollResult, 'cenario' | 'turno' | 'tipoPergunta'> & { office?: string | null }
): boolean {
  if (a.office && b.office && a.office.toLowerCase().trim() !== b.office.toLowerCase().trim()) {
    return false;
  }
  return a.cenario === b.cenario && a.turno === b.turno && a.tipoPergunta === b.tipoPergunta;
}

export function explainComparabilityReason(
  anchorPoll: ElectoralPoll | null,
  targetPoll: ElectoralPoll,
  anchorResults: ElectoralPollResult[],
  targetResults: ElectoralPollResult[]
): { isComparable: boolean; reason: string } {
  if (!anchorPoll) {
    return { isComparable: false, reason: 'Sem pesquisa de referência para comparação' };
  }

  if (anchorResults.length === 0 || targetResults.length === 0) {
    return { isComparable: false, reason: 'Ausência de resultados integrados nesta pesquisa' };
  }

  if (!arePollsComparable(anchorPoll, targetPoll)) {
    return { isComparable: false, reason: `Cargo/UF incompatível (${targetPoll.cargo} / ${targetPoll.uf ?? targetPoll.abrangencia})` };
  }

  const officeA = anchorResults[0]?.office;
  const officeB = targetResults[0]?.office;
  if (officeA && officeB && officeA.toLowerCase().trim() !== officeB.toLowerCase().trim()) {
    return { isComparable: false, reason: `Cargo do resultado incompatível (${officeA} vs ${officeB})` };
  }

  const turnA = anchorResults[0]?.turno;
  const turnB = targetResults[0]?.turno;
  if (turnA !== turnB) {
    return { isComparable: false, reason: `Turnos diferentes (${turnA}º Turno vs ${turnB}º Turno)` };
  }

  const typeA = anchorResults[0]?.tipoPergunta;
  const typeB = targetResults[0]?.tipoPergunta;
  if (typeA !== typeB) {
    return { isComparable: false, reason: `Tipo de pergunta diferente (${typeA} vs ${typeB})` };
  }

  const isEquiv = areScenariosEquivalent(anchorResults, targetResults);
  if (!isEquiv) {
    return { isComparable: false, reason: 'Cenário com conjunto de candidatos diferente' };
  }

  return { isComparable: true, reason: 'Pesquisa comparável (mesmo cargo, UF, turno, tipo e candidatos)' };
}

export function filterComparablePolls(polls: ElectoralPoll[]): ElectoralPoll[] {
  if (polls.length === 0) return [];
  const anchor = polls[0];
  return polls.filter((p) => arePollsComparable(anchor, p));
}

export function filterComparableResults(results: ElectoralPollResult[]): ElectoralPollResult[] {
  if (results.length === 0) return [];
  const anchor = results[0];
  return results.filter((r) => areResultsComparable(anchor, r));
}
