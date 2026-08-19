import type {
  ElectoralPoll,
  ElectoralPollResultWithPoll,
  ExecutiveCockpitMetrics,
  CandidateRankingItem,
  InstituteComparisonPoint,
} from './types';
import { arePollsComparable, areResultsComparable } from './comparability';

// Categorias que não são candidatos reais — nunca devem ser tratadas como
// "líder" ou entrar no ranking/gap (mesmo critério de app/dashboard/pesquisas/executivo/page.tsx).
const NON_CANDIDATE_LABELS = new Set([
  'branco/nulo', 'branco/nulo/não vai votar', 'branco/nulo/nenhum', 'nulo/branco',
  'indecisos', 'indecisos/brancos/nulos', 'não sabe/não respondeu', 'outros',
]);
function isRealCandidate(name: string): boolean {
  return !NON_CANDIDATE_LABELS.has(name.toLowerCase());
}

/**
 * Uma pesquisa só entra em comparação temporal/liderança quando tem
 * exatamente 1 cenário para o turno/tipo de pergunta filtrado — pesquisas
 * com cenários fragmentados (ex.: MG/abril testando Cleitinho contra um
 * adversário por vez, ou MG/julho com "com Cleitinho"/"sem Cleitinho")
 * nunca têm um cenário "escolhido automaticamente" (PESQUISAS-03).
 */
function hasUnambiguousScenario(results: ElectoralPollResultWithPoll[]): boolean {
  const cenarios = new Set(results.map((r) => r.cenario));
  return cenarios.size === 1;
}

export function calculateCockpitMetrics(
  polls: ElectoralPoll[],
  results: ElectoralPollResultWithPoll[]
): ExecutiveCockpitMetrics {
  const lastUpdateDate = polls.length > 0 && polls[0].dataRegistro ? polls[0].dataRegistro : null;

  if (results.length === 0) {
    return {
      intencaoMaisRecente: null,
      gapConcorrente: null,
      variacaoAnterior: null,
      maximoPeriodo: null,
      minimoPeriodo: null,
      pesquisasComparaveisCount: polls.length,
      lastUpdateDate,
      hasSufficientSeries: false,
    };
  }

  // Group results by poll ID
  const resultsByPoll = new Map<string, ElectoralPollResultWithPoll[]>();
  for (const res of results) {
    const list = resultsByPoll.get(res.pollId) ?? [];
    list.push(res);
    resultsByPoll.set(res.pollId, list);
  }

  // Get list of polls that have results, sorted by date descending
  const pollsWithResults = polls
    .filter((p) => resultsByPoll.has(p.id))
    .sort((a, b) => (b.dataRegistro ?? '').localeCompare(a.dataRegistro ?? ''));

  if (pollsWithResults.length === 0) {
    return {
      intencaoMaisRecente: null,
      gapConcorrente: null,
      variacaoAnterior: null,
      maximoPeriodo: null,
      minimoPeriodo: null,
      pesquisasComparaveisCount: polls.length,
      lastUpdateDate,
      hasSufficientSeries: false,
    };
  }

  const latestPoll = pollsWithResults[0];
  const latestPollAllResults = resultsByPoll.get(latestPoll.id) ?? [];
  // Ranking/líder nunca mistura cenários dentro da mesma pesquisa (ex.: MG
  // tem "com Cleitinho" e "sem Cleitinho" no mesmo turno/tipo de pergunta) —
  // usa apenas o primeiro cenário retornado, mesmo critério do executivo/page.tsx.
  const primaryCenario = latestPollAllResults[0]?.cenario ?? null;
  const latestResults = latestPollAllResults
    .filter((r) => r.cenario === primaryCenario)
    .sort((a, b) => b.percentage - a.percentage);

  const realCandidateResults = latestResults.filter((r) => isRealCandidate(r.candidateName));
  const topCandidateResult = realCandidateResults[0] ?? null;
  const runnerUpResult = realCandidateResults[1] ?? null;

  const intencaoMaisRecente = topCandidateResult
    ? {
        candidateName: topCandidateResult.candidateName,
        percentage: topCandidateResult.percentage,
        pollDate: latestPoll.dataRegistro,
        instituto: latestPoll.instituto ?? 'Instituto não informado',
      }
    : null;

  const gapConcorrente = topCandidateResult && runnerUpResult
    ? {
        gap: Number((topCandidateResult.percentage - runnerUpResult.percentage).toFixed(2)),
        leader: topCandidateResult.candidateName,
        runnerUp: runnerUpResult.candidateName,
      }
    : null;

  // Filter comparable polls to latestPoll — exige, além de cargo/abrangência
  // iguais, que a própria pesquisa tenha um único cenário (sem fragmentação)
  // para o turno/tipo de pergunta já filtrado; caso contrário não há como
  // saber qual cenário comparar, e a resposta correta é excluir a pesquisa.
  const comparablePolls = pollsWithResults.filter((p) => {
    if (!arePollsComparable(latestPoll, p)) return false;
    return hasUnambiguousScenario(resultsByPoll.get(p.id) ?? []);
  });
  const hasSufficientSeries = comparablePolls.length >= 2;

  let variacaoAnterior: ExecutiveCockpitMetrics['variacaoAnterior'] = null;
  let maximoPeriodo: ExecutiveCockpitMetrics['maximoPeriodo'] = null;
  let minimoPeriodo: ExecutiveCockpitMetrics['minimoPeriodo'] = null;

  if (topCandidateResult) {
    const candidateName = topCandidateResult.candidateName;

    // Collect percentages for this candidate across comparable polls
    const candidateSeries: { percentage: number; pollDate: string | null }[] = [];

    for (const poll of comparablePolls) {
      const pollResList = resultsByPoll.get(poll.id) ?? [];
      const match = pollResList.find(
        (r) => r.candidateName.toLowerCase() === candidateName.toLowerCase() && areResultsComparable(topCandidateResult, r)
      );
      if (match) {
        candidateSeries.push({ percentage: match.percentage, pollDate: poll.dataRegistro });
      }
    }

    if (candidateSeries.length >= 2) {
      const latestVal = candidateSeries[0].percentage;
      const prevVal = candidateSeries[1].percentage;
      variacaoAnterior = {
        diff: Number((latestVal - prevVal).toFixed(2)),
        candidateName,
        previousPollDate: candidateSeries[1].pollDate,
      };

      const pcts = candidateSeries.map((s) => s.percentage);
      const maxVal = Math.max(...pcts);
      const minVal = Math.min(...pcts);

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
    gapConcorrente,
    variacaoAnterior,
    maximoPeriodo,
    minimoPeriodo,
    pesquisasComparaveisCount: comparablePolls.length,
    lastUpdateDate,
    hasSufficientSeries,
  };
}

export function getCandidateRanking(
  results: ElectoralPollResultWithPoll[],
  activePollId?: string
): CandidateRankingItem[] {
  if (results.length === 0) return [];

  let targetResults = results;
  if (activePollId) {
    targetResults = results.filter((r) => r.pollId === activePollId);
    // Uma pesquisa pode ter mais de um cenário no mesmo turno/tipo de
    // pergunta (ex.: MG "com Cleitinho"/"sem Cleitinho") — o ranking nunca
    // mistura os dois; usa apenas o primeiro cenário encontrado, mesmo
    // critério de calculateCockpitMetrics (PESQUISAS-03).
    const primaryCenario = targetResults[0]?.cenario ?? null;
    targetResults = targetResults.filter((r) => r.cenario === primaryCenario);
  }

  const sorted = [...targetResults].sort((a, b) => b.percentage - a.percentage);
  // "Líder" nunca é uma categoria não-candidato (Indecisos/Branco/Nulo) —
  // essas linhas continuam listadas (transparência), só não recebem o badge.
  const maxRealCandidatePct = sorted.find((r) => isRealCandidate(r.candidateName))?.percentage ?? 0;

  return sorted.map((r) => ({
    candidateName: r.candidateName,
    percentage: r.percentage,
    candidateId: r.candidateId,
    isLeader: isRealCandidate(r.candidateName) && r.percentage === maxRealCandidatePct && maxRealCandidatePct > 0,
  }));
}

export function getInstituteComparisonPoints(
  results: ElectoralPollResultWithPoll[]
): InstituteComparisonPoint[] {
  if (results.length === 0) return [];

  // Agrupa por (pollId + cenario), nunca só por pollId — uma pesquisa com
  // cenários múltiplos (ex.: MG "com Cleitinho"/"sem Cleitinho") vira uma
  // linha por cenário, para nunca colapsar dois percentuais incompatíveis
  // do mesmo candidato numa única célula (PESQUISAS-03).
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
