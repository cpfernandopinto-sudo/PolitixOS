import { createAdminClient } from '@/lib/supabaseClient';
import type { ElectoralPollUpsert, ElectoralPollResult, ElectoralPollResultWithPoll } from './types';
import { isRealCandidate } from './types';
import { getPollMonitoringTargets, matchPollToTargets, matchCandidateNameToTarget } from './targetMatcher';
import {
  upsertPollResult,
  getPriorityRacePolls,
  buildTemporalSeries,
  resolveCandidateRaceContext,
  countRegisteredPolls,
  type PriorityRacePoll,
} from './results-repository';
import { calculateCockpitMetrics, getCandidateRanking, getInstituteComparisonPoints } from './cockpitAnalytics';
import { extractMarginOfError } from './parser';
import { deriveElectoralSignals, type ElectoralSignal } from './signals';

type AdminClient = ReturnType<typeof createAdminClient>;

// ─── Coleta seletiva de pesquisas (registro/metodologia) ───────────────────

export interface MonitoredCollectionCounters {
  pollsDiscovered: number;
  pollsRelevant: number;
  pollsInserted: number;
  pollsUpdated: number;
  duplicatesSkipped: number;
  errors: number;
}

/**
 * PESQUISAS-N8N-01 Fase 5/25 — "pesquisa descoberta ≠ pesquisa persistida".
 * Filtra ANTES de gravar: só chama upsertPolls() para pesquisas com pelo
 * menos 1 target com `poll_monitoring_enabled=true` cujo UF+cargo casem
 * (targetMatcher.matchPollToTargets). Zero targets monitorados → zero
 * gravação, mesmo com pesquisas descobertas no CSV (Fase 1: nunca liga
 * coleta nacional indiscriminada por omissão).
 *
 * "unchanged" não é diferenciado de "updated" aqui: o upsert do Postgres
 * sempre executa a escrita independente de o conteúdo ter mudado — para
 * saber se o conteúdo realmente mudou seria necessário comparar campo a
 * campo antes do upsert, o que não existe hoje e fica como backlog (não é
 * um bloqueador: os contadores de inserted/updated já respondem "pesquisa
 * nova vs. pesquisa já importada", que é a pergunta de idempotência real).
 */
/**
 * `upsertPollsFn` é injetado (em vez de importado de `./collector`) para
 * evitar import circular — `collector.ts` é quem chama esta função e já
 * exporta `upsertPolls`; `monitoring.ts` não precisa depender de volta dele.
 */
export async function runMonitoredPollIngestion(
  client: AdminClient,
  normalizedPolls: ElectoralPollUpsert[],
  upsertPollsFn: (client: AdminClient, polls: ElectoralPollUpsert[]) => Promise<{ upserted: number }>,
  /** Escopa a 1 (ou alguns) targets — usado pelo endpoint de automação quando `targetId` vem no payload. Omitido = todos os targets monitorados. */
  targetIds?: string[]
): Promise<MonitoredCollectionCounters> {
  const counters: MonitoredCollectionCounters = {
    pollsDiscovered: normalizedPolls.length,
    pollsRelevant: 0,
    pollsInserted: 0,
    pollsUpdated: 0,
    duplicatesSkipped: 0,
    errors: 0,
  };

  const targets = await getPollMonitoringTargets(client, targetIds);
  if (targets.length === 0) {
    counters.duplicatesSkipped = normalizedPolls.length;
    return counters;
  }

  const relevantPolls = normalizedPolls.filter((p) => matchPollToTargets(p, targets).length > 0);
  counters.pollsRelevant = relevantPolls.length;
  counters.duplicatesSkipped = normalizedPolls.length - relevantPolls.length;

  for (const poll of relevantPolls) {
    try {
      const { data: existing } = await client
        .from('electoral_polls')
        .select('id')
        .eq('tse_registration_number', poll.tseRegistrationNumber)
        .maybeSingle();

      const { upserted } = await upsertPollsFn(client, [poll]);
      if (upserted > 0) {
        if (existing?.id) counters.pollsUpdated += 1;
        else counters.pollsInserted += 1;
      }
    } catch (error) {
      console.error('[monitoring] Falha ao gravar pesquisa monitorada:', poll.tseRegistrationNumber, error);
      counters.errors += 1;
    }
  }

  return counters;
}

// ─── Ingestão de corrida completa (resultados de intenção de voto) ─────────

export interface RaceResultInput {
  cenario: string;
  turno: number;
  tipoPergunta: ElectoralPollResult['tipoPergunta'];
  candidateName: string;
  percentage: number;
  resultType?: ElectoralPollResult['resultType'];
  sourceName: string | null;
  sourceUrl: string | null;
  sourceDate: string | null;
  provenance: Record<string, unknown>;
  /** Fase 9/17: nunca default true — só propaga o que o chamador já confirmou manualmente. */
  verified?: boolean;
}

export interface IngestRaceResultsSummary {
  resultsInserted: number;
  resultsUpdated: number;
  errors: number;
}

/**
 * PESQUISAS-N8N-01 Fase 6/9 — quando uma pesquisa é considerada relevante,
 * persiste a CORRIDA COMPLETA (todos os concorrentes, branco/nulo,
 * indecisos), nunca só o candidato monitorado — são esses dados que
 * ranking/gap/liderança/segundo-turno precisam. `office` é obrigatório e
 * igual para todos os resultados desta chamada (uma corrida = 1 cargo).
 * `candidate_id` é resolvido via targetMatcher só quando há match seguro —
 * nunca força um match duvidoso.
 */
export async function ingestRaceResults(
  client: AdminClient,
  pollId: string,
  office: string,
  results: RaceResultInput[]
): Promise<IngestRaceResultsSummary> {
  const summary: IngestRaceResultsSummary = { resultsInserted: 0, resultsUpdated: 0, errors: 0 };
  const targets = await getPollMonitoringTargets(client);

  for (const r of results) {
    try {
      const matchedTarget = isRealCandidate(r.candidateName) ? matchCandidateNameToTarget(r.candidateName, targets) : null;

      const { created } = await upsertPollResult(client, {
        pollId,
        cenario: r.cenario,
        turno: r.turno,
        tipoPergunta: r.tipoPergunta,
        candidateName: r.candidateName,
        percentage: r.percentage,
        office,
        resultType: r.resultType ?? null,
        candidateId: matchedTarget?.id ?? null,
        sourceName: r.sourceName,
        sourceUrl: r.sourceUrl,
        sourceDate: r.sourceDate,
        provenance: r.provenance,
        verified: r.verified ?? false,
      });

      if (created) summary.resultsInserted += 1;
      else summary.resultsUpdated += 1;
    } catch (error) {
      console.error('[monitoring] Falha ao gravar resultado de corrida:', pollId, r.candidateName, error);
      summary.errors += 1;
    }
  }

  return summary;
}

// ─── Resumo eleitoral para o Politix IA global ─────────────────────────────

export interface ElectoralSignalSummary {
  candidate: string;
  office: string;
  currentPercentage: number | null;
  previousPercentage: number | null;
  movementPp: number | null;
  leader: string | null;
  gap: number | null;
  trend: string;
  pollCount: number;
  comparability: 'sufficient' | 'insufficient';
  confidence: 'baixa' | 'media' | 'alta';
  /** Pesquisas TSE registradas para esta uf+cargo (não só as que têm resultado) — Fase 3/8. */
  registeredPollsCount: number;
  /** Pesquisas desta uf+cargo que já têm resultado integrado. */
  pollsWithResultsCount: number;
  signals: ElectoralSignal[];
}

function toResultsWithPoll(polls: PriorityRacePoll[]): ElectoralPollResultWithPoll[] {
  const flat: ElectoralPollResultWithPoll[] = [];
  for (const poll of polls) {
    const { results, ...pollFields } = poll;
    for (const r of results) flat.push({ ...r, poll: pollFields });
  }
  return flat;
}

/**
 * PESQUISAS-N8N-01 Fase 24 — resumo compacto e determinístico para
 * lib/ai/analytics-context.ts e para o card de Pesquisas da Visão Geral.
 *
 * Fase 1 da auditoria MG/Governador (2026-08-24): a resolução da corrida
 * (uf/cargo) agora tenta primeiro `resolveCandidateRaceContext(candidateId)`
 * — direto de `electoral_poll_results.candidate_id`, a mesma verdade de
 * dados que o Cockpit usa. Só cai para o matcher por nome/monitoramento
 * (`matchCandidateNameToTarget` + `targets.poll_monitoring_*`) quando o
 * candidato ainda não tem nenhum resultado com `candidate_id` vinculado —
 * nesse caso `poll_monitoring_*` funciona como estava (regra de
 * elegibilidade), não como uma segunda fonte de verdade concorrente.
 * `candidateId` é opcional para não quebrar o único outro chamador
 * (`lib/actions/analytics-insight.ts`), que hoje só tem o nome.
 */
export async function getElectoralSignalsSummaryForCandidate(
  client: AdminClient,
  candidateName: string,
  candidateId?: string | null
): Promise<ElectoralSignalSummary[]> {
  let raceContext = candidateId ? await resolveCandidateRaceContext(candidateId) : null;
  let resolvedCandidateName = candidateName;

  if (!raceContext) {
    const targets = await getPollMonitoringTargets(client);
    const target = matchCandidateNameToTarget(candidateName, targets);
    if (!target || !target.office) return [];
    raceContext = { uf: target.state ?? 'BR', cargo: target.office };
    resolvedCandidateName = target.candidateName;
  }

  const [polls, registeredPollsCount] = await Promise.all([
    getPriorityRacePolls(raceContext.uf, raceContext.cargo),
    countRegisteredPolls(raceContext.uf, raceContext.cargo),
  ]);
  if (polls.length === 0) return [];

  const resultsWithPoll = toResultsWithPoll(polls);
  const metrics = calculateCockpitMetrics(polls, resultsWithPoll, resolvedCandidateName);
  if (!metrics.intencaoMaisRecente) return [];

  const ranking = getCandidateRanking(resultsWithPoll, polls[0].id);
  const temporalSeries = buildTemporalSeries(polls);
  const comparablePolls = temporalSeries.length > 0 ? new Set(temporalSeries[0].points.map((p) => p.pollId)).size : 0;

  let previousRanking = null as ReturnType<typeof getCandidateRanking>['realCandidates'] | null;
  if (metrics.hasSufficientSeries && polls.length > 1) {
    const previousPollId = polls[1].id;
    previousRanking = getCandidateRanking(resultsWithPoll, previousPollId).realCandidates;
  }

  const instituteComparison = getInstituteComparisonPoints(resultsWithPoll);
  const marginOfError = extractMarginOfError(polls[0])?.value ?? null;

  const signals = deriveElectoralSignals({
    metrics,
    currentRanking: ranking.realCandidates,
    previousRanking,
    instituteComparison,
    marginOfErrorPct: marginOfError,
  });

  // Resolve o percentual do PRÓPRIO candidato por candidate_id quando disponível — exato, não
  // depende de bater string de nome (ex.: "Cleitinho" no resultado vs. "Cleitinho Azevedo" no
  // target, que fazia `analyzedCandidateResult` ficar null mesmo com dado real disponível). Cai
  // para o fluxo anterior por nome quando não há candidate_id ou o candidato não está entre os
  // resultados da pesquisa mais recente.
  let currentPercentage: number | null = null;
  if (candidateId) {
    const ownResult = polls[0].results.find((r) => r.candidateId === candidateId);
    if (ownResult) currentPercentage = ownResult.percentage;
  }
  const targetResult = metrics.analyzedCandidateResult ?? metrics.intencaoMaisRecente;
  if (currentPercentage === null) {
    currentPercentage = targetResult?.percentage ?? null;
  }

  const previousPercentage =
    metrics.variacaoAnterior && metrics.variacaoAnterior.candidateName.toLowerCase() === resolvedCandidateName.toLowerCase()
      ? Number((currentPercentage! - metrics.variacaoAnterior.diff).toFixed(2))
      : null;

  return [
    {
      candidate: resolvedCandidateName,
      office: raceContext.cargo,
      currentPercentage,
      previousPercentage,
      movementPp:
        metrics.variacaoAnterior && metrics.variacaoAnterior.candidateName.toLowerCase() === resolvedCandidateName.toLowerCase()
          ? metrics.variacaoAnterior.diff
          : null,
      leader: metrics.intencaoMaisRecente?.candidateName ?? null,
      gap: metrics.gapConcorrente?.gap ?? null,
      trend: metrics.hasSufficientSeries ? metrics.gapBehavior : 'UNAVAILABLE',
      pollCount: comparablePolls || metrics.pollsWithResultsCount,
      comparability: metrics.hasSufficientSeries ? 'sufficient' : 'insufficient',
      confidence: metrics.hasSufficientSeries ? (metrics.instituteConsistency === 'CONVERGENTE' ? 'alta' : 'media') : 'baixa',
      registeredPollsCount,
      pollsWithResultsCount: metrics.pollsWithResultsCount,
      signals,
    },
  ];
}
