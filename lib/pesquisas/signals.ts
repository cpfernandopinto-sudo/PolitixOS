import type { ExecutiveCockpitMetrics, CandidateRankingItem, InstituteComparisonPoint } from './types';
import { isRealCandidate } from './types';

export type ElectoralSignalType =
  | 'POLL_RISE'
  | 'POLL_DROP'
  | 'LEAD_CHANGE'
  | 'GAP_OPENING'
  | 'GAP_CLOSING'
  | 'HIGH_VOLATILITY'
  | 'STABLE_LEAD'
  | 'INSTITUTE_DIVERGENCE'
  | 'LOW_CONFIDENCE_DATA';

/**
 * PESQUISAS-N8N-01 Fase 21 — nunca afirmar significância estatística sem
 * conhecer a margem de erro. OBSERVADO = variação em 1 única leitura (não é
 * série); CONSISTENTE = 2+ leituras comparáveis na mesma direção mas dentro
 * (ou sem informação) de margem de erro; RELEVANTE = CONSISTENTE E diferença
 * maior que a margem de erro conhecida da pesquisa mais recente.
 */
export type MovementTier = 'OBSERVADO' | 'CONSISTENTE' | 'RELEVANTE';

export interface ElectoralSignal {
  type: ElectoralSignalType;
  candidateName: string | null;
  movementTier: MovementTier | null;
  description: string;
}

export interface DeriveSignalsInput {
  metrics: ExecutiveCockpitMetrics;
  /** Ranking de candidatos reais na pesquisa mais recente (já ordenado por percentual desc). */
  currentRanking: CandidateRankingItem[];
  /** Ranking da pesquisa comparável anterior mais próxima, quando existir série suficiente. */
  previousRanking: CandidateRankingItem[] | null;
  /** Pontos de comparação entre institutos para o mesmo cargo/UF/cenário (getInstituteComparisonPoints). */
  instituteComparison: InstituteComparisonPoint[];
  /** Margem de erro (p.p.) da pesquisa mais recente, quando conhecida (extraída ou estruturada). */
  marginOfErrorPct: number | null;
}

function movementTier(diffPp: number, comparablePollsCount: number, marginOfErrorPct: number | null): MovementTier {
  if (comparablePollsCount < 2) return 'OBSERVADO';
  if (marginOfErrorPct !== null && Math.abs(diffPp) > marginOfErrorPct) return 'RELEVANTE';
  return 'CONSISTENTE';
}

/**
 * Deriva sinais eleitorais determinísticos a partir de métricas JÁ
 * calculadas por cockpitAnalytics.ts — nenhum sinal aqui recomputa
 * percentuais ou inventa threshold sem base em dado real (Fase 20: "não
 * criar sinal artificial"). Retorna [] quando não há dado suficiente para
 * nenhum sinal, nunca um sinal "vazio".
 */
export function deriveElectoralSignals(input: DeriveSignalsInput): ElectoralSignal[] {
  const { metrics, currentRanking, previousRanking, instituteComparison, marginOfErrorPct } = input;
  const signals: ElectoralSignal[] = [];

  if (!metrics.hasSufficientSeries) {
    signals.push({
      type: 'LOW_CONFIDENCE_DATA',
      candidateName: null,
      movementTier: null,
      description: `Apenas ${metrics.pesquisasComparaveisCount} pesquisa(s) comparável(is) na série — insuficiente para tendência consolidada.`,
    });
  }

  if (metrics.variacaoAnterior) {
    const { diff, candidateName } = metrics.variacaoAnterior;
    if (diff > 0) {
      signals.push({
        type: 'POLL_RISE',
        candidateName,
        movementTier: movementTier(diff, metrics.trendPollsCount, marginOfErrorPct),
        description: `${candidateName} subiu ${diff} p.p. na leitura comparável mais recente.`,
      });
    } else if (diff < 0) {
      signals.push({
        type: 'POLL_DROP',
        candidateName,
        movementTier: movementTier(diff, metrics.trendPollsCount, marginOfErrorPct),
        description: `${candidateName} caiu ${Math.abs(diff)} p.p. na leitura comparável mais recente.`,
      });
    }
  }

  if (previousRanking && previousRanking.length > 0 && currentRanking.length > 0) {
    const currentLeader = currentRanking[0];
    const previousLeader = previousRanking[0];
    if (
      currentLeader &&
      previousLeader &&
      isRealCandidate(currentLeader.candidateName) &&
      isRealCandidate(previousLeader.candidateName) &&
      currentLeader.candidateName.toLowerCase().trim() !== previousLeader.candidateName.toLowerCase().trim()
    ) {
      const gap = Number((currentLeader.percentage - previousLeader.percentage).toFixed(2));
      signals.push({
        type: 'LEAD_CHANGE',
        candidateName: currentLeader.candidateName,
        movementTier: movementTier(gap, metrics.trendPollsCount, marginOfErrorPct),
        description: `${currentLeader.candidateName} assumiu a liderança, antes ocupada por ${previousLeader.candidateName}.`,
      });
    }
  }

  if (metrics.gapConcorrente && metrics.gapBehavior !== 'UNAVAILABLE') {
    if (metrics.gapBehavior === 'EXPANDING') {
      signals.push({
        type: 'GAP_OPENING',
        candidateName: metrics.gapConcorrente.leader,
        movementTier: movementTier(metrics.gapConcorrente.gap, metrics.trendPollsCount, marginOfErrorPct),
        description: `Vantagem de ${metrics.gapConcorrente.leader} sobre ${metrics.gapConcorrente.runnerUp} está se ampliando (${metrics.gapConcorrente.gap} p.p.).`,
      });
    } else if (metrics.gapBehavior === 'NARROWING') {
      signals.push({
        type: 'GAP_CLOSING',
        candidateName: metrics.gapConcorrente.runnerUp,
        movementTier: movementTier(metrics.gapConcorrente.gap, metrics.trendPollsCount, marginOfErrorPct),
        description: `${metrics.gapConcorrente.runnerUp} está reduzindo a distância para ${metrics.gapConcorrente.leader} (gap atual: ${metrics.gapConcorrente.gap} p.p.).`,
      });
    }
  }

  if (metrics.volatility === 'ALTA') {
    signals.push({
      type: 'HIGH_VOLATILITY',
      candidateName: metrics.variacaoAnterior?.candidateName ?? null,
      movementTier: null,
      description: 'Variação percentual ampla entre as pesquisas comparáveis do período (volatilidade alta).',
    });
  }

  if (
    metrics.hasSufficientSeries &&
    metrics.leaderMovement === 'STABLE' &&
    metrics.gapBehavior !== 'NARROWING' &&
    metrics.gapConcorrente
  ) {
    signals.push({
      type: 'STABLE_LEAD',
      candidateName: metrics.gapConcorrente.leader,
      movementTier: null,
      description: `Liderança de ${metrics.gapConcorrente.leader} estável nas leituras comparáveis do período.`,
    });
  }

  if (metrics.instituteConsistency === 'DIVERGENTE') {
    signals.push({
      type: 'INSTITUTE_DIVERGENCE',
      candidateName: metrics.variacaoAnterior?.candidateName ?? null,
      movementTier: null,
      description: `Resultados entre institutos divergem além do esperado para a mesma corrida (${instituteComparison.length} pontos de comparação analisados).`,
    });
  }

  return signals;
}
