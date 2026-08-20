import type {
  ElectoralPoll,
  ElectoralPollResultWithPoll,
  ExecutiveCockpitMetrics,
  CandidateRankingItem,
  InstituteComparisonPoint,
} from './types';
import { isRealCandidate } from './types';
import { arePollsComparable, areResultsComparable, areScenariosEquivalent } from './comparability';

export function getLatestResultPoll(results: ElectoralPollResultWithPoll[]): ElectoralPoll | null {
  if (results.length === 0) return null;
  const pollMap = new Map<string, ElectoralPoll>();
  for (const r of results) {
    if (r.poll) pollMap.set(r.poll.id, r.poll);
  }
  const pollList = Array.from(pollMap.values()).sort((a, b) => (b.dataRegistro ?? '').localeCompare(a.dataRegistro ?? ''));
  return pollList[0] ?? null;
}

export function getRaceCandidates(results: ElectoralPollResultWithPoll[]): string[] {
  const set = new Set<string>();
  for (const r of results) {
    if (r.candidateName && isRealCandidate(r.candidateName)) {
      set.add(r.candidateName);
    }
  }
  return Array.from(set).sort();
}

export function calculateCockpitMetrics(
  polls: ElectoralPoll[],
  results: ElectoralPollResultWithPoll[],
  referenceCandidateName?: string | null
): ExecutiveCockpitMetrics {
  const totalPollsInSlice = polls.length;
  const fallbackLastUpdate = polls.length > 0 && polls[0].dataRegistro ? polls[0].dataRegistro : null;

  if (results.length === 0) {
    return {
      intencaoMaisRecente: null,
      runnerUpResult: null,
      referenceCandidate: referenceCandidateName ?? null,
      analyzedCandidateResult: null,
      gapConcorrente: null,
      variacaoAnterior: null,
      maximoPeriodo: null,
      minimoPeriodo: null,
      totalPollsInSlice,
      pollsWithResultsCount: 0,
      pesquisasComparaveisCount: 0,
      trendPollsCount: 0,
      lastUpdateDate: fallbackLastUpdate,
      hasSufficientSeries: false,
      leaderMovement: 'UNAVAILABLE',
      runnerUpMovement: 'UNAVAILABLE',
      gapBehavior: 'UNAVAILABLE',
      volatility: 'UNAVAILABLE',
      instituteConsistency: 'UNAVAILABLE',
    };
  }

  const pollMap = new Map<string, ElectoralPoll>();
  const resultsByPoll = new Map<string, ElectoralPollResultWithPoll[]>();

  for (const res of results) {
    const list = resultsByPoll.get(res.pollId) ?? [];
    list.push(res);
    resultsByPoll.set(res.pollId, list);

    if (res.poll && !pollMap.has(res.pollId)) {
      pollMap.set(res.pollId, res.poll);
    }
  }

  for (const p of polls) {
    if (resultsByPoll.has(p.id) && !pollMap.has(p.id)) {
      pollMap.set(p.id, p);
    }
  }

  const pollsWithResults = Array.from(pollMap.values()).sort(
    (a, b) => (b.dataRegistro ?? '').localeCompare(a.dataRegistro ?? '')
  );

  const pollsWithResultsCount = pollsWithResults.length;

  if (pollsWithResults.length === 0) {
    return {
      intencaoMaisRecente: null,
      runnerUpResult: null,
      referenceCandidate: referenceCandidateName ?? null,
      analyzedCandidateResult: null,
      gapConcorrente: null,
      variacaoAnterior: null,
      maximoPeriodo: null,
      minimoPeriodo: null,
      totalPollsInSlice,
      pollsWithResultsCount: 0,
      pesquisasComparaveisCount: 0,
      trendPollsCount: 0,
      lastUpdateDate: fallbackLastUpdate,
      hasSufficientSeries: false,
      leaderMovement: 'UNAVAILABLE',
      runnerUpMovement: 'UNAVAILABLE',
      gapBehavior: 'UNAVAILABLE',
      volatility: 'UNAVAILABLE',
      instituteConsistency: 'UNAVAILABLE',
    };
  }

  const latestPoll = pollsWithResults[0];
  const latestPollAllResults = resultsByPoll.get(latestPoll.id) ?? [];
  const primaryCenario = latestPollAllResults[0]?.cenario ?? null;
  const latestResults = latestPollAllResults
    .filter((r) => r.cenario === primaryCenario)
    .sort((a, b) => b.percentage - a.percentage);

  const realCandidateResults = latestResults.filter((r) => isRealCandidate(r.candidateName));
  const topCandidateResult = realCandidateResults[0] ?? null;
  const runnerUpCandidateResult = realCandidateResults[1] ?? null;

  const intencaoMaisRecente = topCandidateResult
    ? {
        candidateName: topCandidateResult.candidateName,
        percentage: topCandidateResult.percentage,
        pollDate: latestPoll.dataRegistro,
        instituto: latestPoll.instituto ?? 'Instituto não informado',
      }
    : null;

  const runnerUpResult = runnerUpCandidateResult
    ? {
        candidateName: runnerUpCandidateResult.candidateName,
        percentage: runnerUpCandidateResult.percentage,
      }
    : null;

  const gapConcorrente = topCandidateResult && runnerUpCandidateResult
    ? {
        gap: Number((topCandidateResult.percentage - runnerUpCandidateResult.percentage).toFixed(2)),
        leader: topCandidateResult.candidateName,
        runnerUp: runnerUpCandidateResult.candidateName,
      }
    : null;

  // Analisa se um candidato específico foi selecionado no filtro (referenceCandidate)
  let referenceCandidate: string | null = null;
  let analyzedCandidateResult: ExecutiveCockpitMetrics['analyzedCandidateResult'] = null;

  if (referenceCandidateName) {
    const matchIdx = realCandidateResults.findIndex(
      (r) => r.candidateName.toLowerCase() === referenceCandidateName.toLowerCase()
    );
    if (matchIdx >= 0) {
      const matchObj = realCandidateResults[matchIdx];
      referenceCandidate = matchObj.candidateName;
      if (topCandidateResult && matchObj.candidateName !== topCandidateResult.candidateName) {
        analyzedCandidateResult = {
          candidateName: matchObj.candidateName,
          percentage: matchObj.percentage,
          rank: matchIdx + 1,
          gapToLeader: Number((topCandidateResult.percentage - matchObj.percentage).toFixed(2)),
        };
      }
    }
  }

  // Comparabilidade inteligente por cenário
  const comparablePolls = pollsWithResults.filter((p) => {
    if (!arePollsComparable(latestPoll, p)) return false;
    const pResults = resultsByPoll.get(p.id) ?? [];
    if (pResults.length === 0) return false;

    const cenariosInP = Array.from(new Set(pResults.map((r) => r.cenario)));
    for (const cen of cenariosInP) {
      const cenResults = pResults.filter((r) => r.cenario === cen);
      if (areScenariosEquivalent(latestResults, cenResults)) {
        return true;
      }
    }
    return false;
  });

  const hasSufficientSeries = comparablePolls.length >= 2;
  const trendPollsCount = comparablePolls.length;

  let variacaoAnterior: ExecutiveCockpitMetrics['variacaoAnterior'] = null;
  let maximoPeriodo: ExecutiveCockpitMetrics['maximoPeriodo'] = null;
  let minimoPeriodo: ExecutiveCockpitMetrics['minimoPeriodo'] = null;

  let leaderMovement: ExecutiveCockpitMetrics['leaderMovement'] = 'UNAVAILABLE';
  let runnerUpMovement: ExecutiveCockpitMetrics['runnerUpMovement'] = 'UNAVAILABLE';
  let gapBehavior: ExecutiveCockpitMetrics['gapBehavior'] = 'UNAVAILABLE';
  let volatility: ExecutiveCockpitMetrics['volatility'] = 'BAIXA';
  let instituteConsistency: ExecutiveCockpitMetrics['instituteConsistency'] = 'CONVERGENTE';

  // Candidato alvo para cálculo de variação: se houver um candidato analisado não-líder, calcula para ele; caso contrário, para o líder.
  const targetForVariation = analyzedCandidateResult ? analyzedCandidateResult.candidateName : topCandidateResult?.candidateName;

  if (targetForVariation) {
    const candidateName = targetForVariation;
    const candidateSeries: { percentage: number; pollDate: string | null }[] = [];
    const runnerUpSeries: { percentage: number; pollDate: string | null }[] = [];

    for (const poll of comparablePolls) {
      const pollResList = resultsByPoll.get(poll.id) ?? [];
      const matchLeader = pollResList.find(
        (r) => r.candidateName.toLowerCase() === candidateName.toLowerCase()
      );
      if (matchLeader) {
        candidateSeries.push({ percentage: matchLeader.percentage, pollDate: poll.dataRegistro });
      }

      if (runnerUpCandidateResult) {
        const matchRunner = pollResList.find(
          (r) => r.candidateName.toLowerCase() === runnerUpCandidateResult.candidateName.toLowerCase()
        );
        if (matchRunner) {
          runnerUpSeries.push({ percentage: matchRunner.percentage, pollDate: poll.dataRegistro });
        }
      }
    }

    if (candidateSeries.length >= 2) {
      const latestVal = candidateSeries[0].percentage;
      const prevVal = candidateSeries[1].percentage;
      const diff = Number((latestVal - prevVal).toFixed(2));

      variacaoAnterior = {
        diff,
        candidateName,
        previousPollDate: candidateSeries[1].pollDate,
      };

      leaderMovement = diff > 0.5 ? 'UP' : diff < -0.5 ? 'DOWN' : 'STABLE';

      if (runnerUpSeries.length >= 2) {
        const latestRunner = runnerUpSeries[0].percentage;
        const prevRunner = runnerUpSeries[1].percentage;
        const runnerDiff = Number((latestRunner - prevRunner).toFixed(2));

        runnerUpMovement = runnerDiff > 0.5 ? 'UP' : runnerDiff < -0.5 ? 'DOWN' : 'STABLE';

        const prevGap = prevVal - prevRunner;
        const currGap = latestVal - latestRunner;
        const gapDiff = currGap - prevGap;

        gapBehavior = gapDiff > 0.5 ? 'EXPANDING' : gapDiff < -0.5 ? 'NARROWING' : 'STABLE';
      }

      const pcts = candidateSeries.map((s) => s.percentage);
      const maxVal = Math.max(...pcts);
      const minVal = Math.min(...pcts);
      const range = maxVal - minVal;

      volatility = range > 4.0 ? 'ALTA' : range > 2.0 ? 'MODERADA' : 'BAIXA';
      instituteConsistency = range <= 3.0 ? 'CONVERGENTE' : range <= 5.0 ? 'MODERADA' : 'DIVERGENTE';

      const maxItem = candidateSeries.find((s) => s.percentage === maxVal);
      const minItem = candidateSeries.find((s) => s.percentage === minVal);

      maximoPeriodo = {
        percentage: maxVal,
        candidateName,
        pollDate: maxItem?.pollDate ?? null,
      };

      minimoPeriodo = {
        percentage: minVal,
        candidateName,
        pollDate: minItem?.pollDate ?? null,
      };
    }
  }

  return {
    intencaoMaisRecente,
    runnerUpResult,
    referenceCandidate,
    analyzedCandidateResult,
    gapConcorrente,
    variacaoAnterior,
    maximoPeriodo,
    minimoPeriodo,
    totalPollsInSlice,
    pollsWithResultsCount,
    pesquisasComparaveisCount: comparablePolls.length,
    trendPollsCount,
    lastUpdateDate: latestPoll.dataRegistro ?? fallbackLastUpdate,
    hasSufficientSeries,
    leaderMovement,
    runnerUpMovement,
    gapBehavior,
    volatility,
    instituteConsistency,
  };
}

export function getCandidateRanking(
  results: ElectoralPollResultWithPoll[],
  activePollId?: string
): { realCandidates: CandidateRankingItem[]; nonCandidates: CandidateRankingItem[] } {
  if (results.length === 0) return { realCandidates: [], nonCandidates: [] };

  let targetResults = results;
  if (activePollId) {
    targetResults = results.filter((r) => r.pollId === activePollId);
    const primaryCenario = targetResults[0]?.cenario ?? null;
    targetResults = targetResults.filter((r) => r.cenario === primaryCenario);
  }

  const realList = targetResults.filter((r) => isRealCandidate(r.candidateName)).sort((a, b) => b.percentage - a.percentage);
  const nonCandidateList = targetResults.filter((r) => !isRealCandidate(r.candidateName)).sort((a, b) => b.percentage - a.percentage);

  const maxRealPct = realList[0]?.percentage ?? 0;

  const realCandidates = realList.map((r) => ({
    candidateName: r.candidateName,
    percentage: r.percentage,
    candidateId: r.candidateId,
    isLeader: r.percentage === maxRealPct && maxRealPct > 0,
  }));

  const nonCandidates = nonCandidateList.map((r) => ({
    candidateName: r.candidateName,
    percentage: r.percentage,
    candidateId: r.candidateId,
    isLeader: false,
  }));

  return { realCandidates, nonCandidates };
}

export function getInstituteComparisonPoints(
  results: ElectoralPollResultWithPoll[]
): InstituteComparisonPoint[] {
  if (results.length === 0) return [];

  const byPollAndScenario = new Map<string, { poll: ElectoralPoll | null; cenario: string | null; results: ElectoralPollResultWithPoll[] }>();

  for (const r of results) {
    const key = `${r.pollId}::${r.cenario}`;
    const existing = byPollAndScenario.get(key) ?? { poll: r.poll ?? null, cenario: r.cenario ?? null, results: [] };
    existing.results.push(r);
    byPollAndScenario.set(key, existing);
  }

  const comparisonPoints: InstituteComparisonPoint[] = [];

  for (const [key, data] of byPollAndScenario) {
    if (!data.poll) continue;
    const pollId = key.split('::')[0];
    comparisonPoints.push({
      institute: data.poll.instituto ?? 'Instituto não informado',
      pollId,
      registrationNumber: data.poll.tseRegistrationNumber,
      fieldDate: data.poll.campoFim ?? data.poll.dataRegistro,
      sampleSize: data.poll.amostra,
      cenario: data.cenario,
      results: data.results.map((r) => ({ candidateName: r.candidateName, percentage: r.percentage })),
    });
  }

  return comparisonPoints;
}
