import type { ElectoralPoll, ElectoralPollResult } from './types';

/**
 * PARTE 20 do briefing PESQUISAS-01A: nunca comparar cegamente pesquisas com
 * cargo/abrangência diferentes, nem resultados com cenário/turno/tipo de
 * pergunta diferentes (espontânea vs. estimulada, 1º vs. 2º turno).
 */
export function arePollsComparable(
  a: Pick<ElectoralPoll, 'cargo' | 'abrangencia'>,
  b: Pick<ElectoralPoll, 'cargo' | 'abrangencia'>
): boolean {
  if (!a.cargo || !b.cargo) return false;
  return a.cargo === b.cargo && a.abrangencia === b.abrangencia;
}

export function areResultsComparable(
  a: Pick<ElectoralPollResult, 'cenario' | 'turno' | 'tipoPergunta'>,
  b: Pick<ElectoralPollResult, 'cenario' | 'turno' | 'tipoPergunta'>
): boolean {
  return a.cenario === b.cenario && a.turno === b.turno && a.tipoPergunta === b.tipoPergunta;
}

/** Maior subconjunto comparável entre si, ancorado na primeira pesquisa da lista. */
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
