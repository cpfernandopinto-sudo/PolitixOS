import type { ElectoralPollResultWithPoll, ElectoralPoll } from './types';
import { isRealCandidate } from './types';
import { buildCenarioPollGroups } from './chartGrouping';
import { explainComparabilityReason } from './comparability';
import { selectPrimaryCenario } from './scenarioSelection';

export type CenarioComparabilityStatus = 'REFERENCIA' | 'COMPARAVEL' | 'NAO_COMPARAVEL';

export interface ObservedHistoryPoint {
  pollId: string;
  cenario: string;
  turno: number;
  tipoPergunta: string;
  office: string | null;
  candidateName: string;
  percentage: number;
  instituto: string;
  tseRegistrationNumber: string;
  date: string | null;
  amostra: number | null;
  comparability: CenarioComparabilityStatus;
  comparabilityReason: string;
}

export interface ObservedHistoryResult {
  points: ObservedHistoryPoint[];
  referencePollId: string | null;
  referenceCenario: string | null;
  minPercentage: number | null;
  maxPercentage: number | null;
}

/**
 * Sprint 2A, item 3 — HISTÓRICO OBSERVADO (Bloco 4 do briefing): todos os
 * pontos reais do candidato (ou de todos os candidatos reais, se
 * `candidateName` for omitido) na corrida, INCLUINDO os que não são
 * comparáveis entre si — nunca escondidos.
 *
 * Deliberadamente separada de `buildTemporalSeries`: esta função não decide
 * comparabilidade "para dentro" (nunca filtra um ponto para fora), só ANOTA
 * cada ponto com seu status de comparabilidade em relação ao cenário de
 * referência (a pesquisa mais recente com resultado, cujo cenário é
 * escolhido por `selectPrimaryCenario` — nunca por ordem de array). Reusa
 * `explainComparabilityReason` (a mesma regra já usada pelo badge de
 * "Pesquisas Explicam o Cenário") — não reimplementa
 * `arePollsComparable`/`areScenariosEquivalent`.
 *
 * HISTÓRICO OBSERVADO nunca vira tendência aqui — quem decide isso continua
 * sendo `buildTemporalSeries`, intocada.
 */
export function getObservedHistory(
  results: ElectoralPollResultWithPoll[],
  candidateName?: string | null
): ObservedHistoryResult {
  const empty: ObservedHistoryResult = {
    points: [],
    referencePollId: null,
    referenceCenario: null,
    minPercentage: null,
    maxPercentage: null,
  };

  const realResults = results.filter((r) => r.poll && isRealCandidate(r.candidateName));
  if (realResults.length === 0) return empty;

  const pollById = new Map<string, ElectoralPoll>();
  for (const r of realResults) {
    if (r.poll && !pollById.has(r.pollId)) pollById.set(r.pollId, r.poll);
  }

  const pollsSorted = Array.from(pollById.values()).sort(
    (a, b) => (b.dataRegistro ?? '').localeCompare(a.dataRegistro ?? '')
  );
  const referencePoll = pollsSorted[0] ?? null;
  const referencePollResults = referencePoll ? realResults.filter((r) => r.pollId === referencePoll.id) : [];
  const referenceCenario = selectPrimaryCenario(referencePollResults, candidateName);
  const referenceGroupResults = referencePollResults.filter((r) => r.cenario === referenceCenario);

  const groups = buildCenarioPollGroups(realResults);
  const points: ObservedHistoryPoint[] = [];
  let min: number | null = null;
  let max: number | null = null;

  for (const group of groups) {
    const isReferenceGroup =
      !!referencePoll && group.pollId === referencePoll.id && group.cenario === referenceCenario;

    let comparability: CenarioComparabilityStatus;
    let comparabilityReason: string;

    if (isReferenceGroup) {
      comparability = 'REFERENCIA';
      comparabilityReason = 'Pesquisa/cenário de referência (leitura mais recente).';
    } else if (referencePoll && referenceGroupResults.length > 0) {
      const groupPoll = pollById.get(group.pollId)!;
      const targetGroupResults = realResults.filter(
        (r) => r.pollId === group.pollId && r.cenario === group.cenario
      );
      const explanation = explainComparabilityReason(referencePoll, groupPoll, referenceGroupResults, targetGroupResults);
      comparability = explanation.isComparable ? 'COMPARAVEL' : 'NAO_COMPARAVEL';
      comparabilityReason = explanation.reason;
    } else {
      comparability = 'NAO_COMPARAVEL';
      comparabilityReason = 'Sem pesquisa de referência para comparação.';
    }

    for (const r of group.results) {
      if (candidateName && r.candidateName.toLowerCase().trim() !== candidateName.toLowerCase().trim()) continue;

      points.push({
        pollId: group.pollId,
        cenario: group.cenario,
        turno: group.turno,
        tipoPergunta: group.tipoPergunta,
        office: group.office,
        candidateName: r.candidateName,
        percentage: r.percentage,
        instituto: group.instituto,
        tseRegistrationNumber: group.tseReg,
        date: group.dataRegistro,
        amostra: group.amostra,
        comparability,
        comparabilityReason,
      });

      if (min === null || r.percentage < min) min = r.percentage;
      if (max === null || r.percentage > max) max = r.percentage;
    }
  }

  points.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  return {
    points,
    referencePollId: referencePoll?.id ?? null,
    referenceCenario,
    minPercentage: min,
    maxPercentage: max,
  };
}
