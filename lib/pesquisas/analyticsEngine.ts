import type {
  ElectoralPollResultWithPoll,
  ExecutiveCockpitMetrics,
  CandidateRankingItem,
} from './types';
import { isRealCandidate } from './types';
import type { TemporalSeriesEntry } from './results-repository';
import type { ObservedHistoryResult } from './observedHistory';

export type AnalyticalStatusType = 'ESTÁVEL' | 'ATENÇÃO' | 'CRÍTICO' | 'INCONCLUSIVO' | 'SEM CLASSIFICAÇÃO';

/**
 * Sprint 2A, item 4 da rodada de correção (P0.4 da auditoria) — direção de
 * movimento isolada da "Situação Analítica" (que também pesa o tamanho do
 * gap). Só existe CRESCIMENTO/QUEDA/ESTABILIDADE quando
 * `hasSufficientSeries=true`; caso contrário é sempre INCONCLUSIVA, nunca
 * inferida por ausência de dado.
 */
export type TrendStatus = 'CRESCIMENTO' | 'QUEDA' | 'ESTABILIDADE' | 'INCONCLUSIVA';

export interface TrendStatusResult {
  status: TrendStatus;
  reason: string;
}

/**
 * Deriva o status de tendência a partir de métricas JÁ calculadas
 * (`calculateCockpitMetrics`) — nunca recalcula percentuais ou refaz a
 * checagem de comparabilidade. Mesmo threshold (±0.5 p.p.) já usado por
 * `leaderMovement`/`gapBehavior` dentro de `calculateCockpitMetrics` — não
 * inventa um novo corte.
 */
export function deriveTrendStatus(metrics: ExecutiveCockpitMetrics): TrendStatusResult {
  if (!metrics.hasSufficientSeries || !metrics.variacaoAnterior) {
    return {
      status: 'INCONCLUSIVA',
      reason:
        metrics.pollsWithResultsCount > 0
          ? 'Existem resultados históricos, porém não há levantamentos metodologicamente comparáveis suficientes para determinar tendência.'
          : 'Ainda não há resultados integrados para esta corrida.',
    };
  }

  const { diff, candidateName } = metrics.variacaoAnterior;

  if (diff > 0.5) {
    return { status: 'CRESCIMENTO', reason: `${candidateName} avançou +${diff} p.p. na leitura comparável mais recente.` };
  }
  if (diff < -0.5) {
    return { status: 'QUEDA', reason: `${candidateName} recuou ${diff} p.p. na leitura comparável mais recente.` };
  }
  return {
    status: 'ESTABILIDADE',
    reason: `${candidateName} manteve-se estável (${diff >= 0 ? '+' : ''}${diff} p.p.) na leitura comparável mais recente.`,
  };
}

export interface AnalyticalStatusResult {
  status: AnalyticalStatusType;
  reason: string;
  candidateName: string | null;
  gap: number | null;
  previousGap: number | null;
  diff: number | null;
}

export interface ScenarioSignal {
  id: string;
  type: 'growth' | 'drop' | 'stability' | 'gap_reduction' | 'leadership_loss' | 'divergence' | 'insufficient_data';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'alert' | 'success';
}

export function calculateAnalyticalStatus(
  ranking: { realCandidates: CandidateRankingItem[]; nonCandidates: CandidateRankingItem[] },
  metrics: ExecutiveCockpitMetrics,
  targetCandidateName?: string | null
): AnalyticalStatusResult {
  const realCandidates = ranking.realCandidates;

  if (realCandidates.length === 0) {
    return {
      status: 'SEM CLASSIFICAÇÃO',
      reason: 'Aguardando dados de resultados integrados nesta corrida.',
      candidateName: null,
      gap: null,
      previousGap: null,
      diff: null,
    };
  }

  const leader = realCandidates[0];
  const candidateName = targetCandidateName ?? leader.candidateName;
  const candidateItem = realCandidates.find((c) => c.candidateName.toLowerCase() === candidateName.toLowerCase()) ?? leader;

  const isLeader = candidateItem.candidateName === leader.candidateName;
  const runnerUp = isLeader ? realCandidates[1] ?? null : leader;

  const currentGap = runnerUp ? Math.round(Math.abs(candidateItem.percentage - runnerUp.percentage) * 10) / 10 : null;
  const diff = metrics.variacaoAnterior?.candidateName === candidateItem.candidateName ? metrics.variacaoAnterior.diff : null;

  if (!isLeader && currentGap !== null && currentGap <= 3.0) {
    return {
      status: 'CRÍTICO',
      reason: `Vice-líder a apenas ${currentGap} p.p. da liderança (${runnerUp.candidateName} com ${runnerUp.percentage}%).`,
      candidateName: candidateItem.candidateName,
      gap: currentGap,
      previousGap: null,
      diff,
    };
  }

  if (diff !== null && diff <= -3.0) {
    return {
      status: 'CRÍTICO',
      reason: `Recuo relevante de ${Math.abs(diff)} p.p. comparado ao levantamento anterior.`,
      candidateName: candidateItem.candidateName,
      gap: currentGap,
      previousGap: null,
      diff,
    };
  }

  if (diff !== null && diff < 0 && isLeader && currentGap !== null && currentGap <= 5.0) {
    return {
      status: 'ATENÇÃO',
      reason: `Liderança sob pressão com recuo de ${Math.abs(diff)} p.p. e margem estreita de ${currentGap} p.p.`,
      candidateName: candidateItem.candidateName,
      gap: currentGap,
      previousGap: null,
      diff,
    };
  }

  if (diff !== null && diff < 0) {
    return {
      status: 'ATENÇÃO',
      reason: `Oscilação negativa de ${Math.abs(diff)} p.p. frente à pesquisa anterior.`,
      candidateName: candidateItem.candidateName,
      gap: currentGap,
      previousGap: null,
      diff,
    };
  }

  // Fase 1/P0.4 da auditoria: sem série comparável (diff === null sempre que
  // hasSufficientSeries === false — ver metrics.comparablePolls), "ausência
  // de evidência de queda" NÃO é o mesmo que "estabilidade confirmada".
  // ESTÁVEL só pode ser afirmado quando há uma leitura comparável anterior
  // que sustente essa leitura.
  if (!metrics.hasSufficientSeries) {
    return {
      status: 'INCONCLUSIVO',
      reason: isLeader
        ? `Lidera com ${candidateItem.percentage}%, mas não há levantamentos metodologicamente comparáveis suficientes para confirmar estabilidade.`
        : `Ocupa a posição atual com ${candidateItem.percentage}%, mas não há levantamentos metodologicamente comparáveis suficientes para confirmar tendência.`,
      candidateName: candidateItem.candidateName,
      gap: currentGap,
      previousGap: null,
      diff,
    };
  }

  if (isLeader) {
    return {
      status: 'ESTÁVEL',
      reason: `Liderança consolidada com ${candidateItem.percentage}% e vantagem de ${currentGap ?? 0} p.p.`,
      candidateName: candidateItem.candidateName,
      gap: currentGap,
      previousGap: null,
      diff,
    };
  }

  return {
    status: 'ESTÁVEL',
    reason: `Posição estável no cenário eleitoral com ${candidateItem.percentage}%.`,
    candidateName: candidateItem.candidateName,
    gap: currentGap,
    previousGap: null,
    diff,
  };
}

export function calculateScenarioSignals(
  metrics: ExecutiveCockpitMetrics,
  temporalSeries: TemporalSeriesEntry[],
  ranking: { realCandidates: CandidateRankingItem[] }
): ScenarioSignal[] {
  const signals: ScenarioSignal[] = [];

  if (ranking.realCandidates.length === 0) {
    signals.push({
      id: 'no_data',
      type: 'insufficient_data',
      title: 'Aguardando Resultados',
      description: 'Ainda não há resultados de intenção de voto integrados para esta corrida.',
      severity: 'info',
    });
    return signals;
  }

  const leader = ranking.realCandidates[0];
  const runnerUp = ranking.realCandidates[1] ?? null;

  if (metrics.variacaoAnterior && metrics.variacaoAnterior.diff > 0) {
    signals.push({
      id: 'growth',
      type: 'growth',
      title: 'Tendência de Crescimento',
      description: `${metrics.variacaoAnterior.candidateName} avançou +${metrics.variacaoAnterior.diff} p.p. na leitura comparável mais recente.`,
      severity: 'success',
    });
  } else if (metrics.variacaoAnterior && metrics.variacaoAnterior.diff < 0) {
    signals.push({
      id: 'drop',
      type: 'drop',
      title: 'Oscilação Negativa',
      description: `${metrics.variacaoAnterior.candidateName} recuou ${metrics.variacaoAnterior.diff} p.p. em relação à pesquisa anterior.`,
      severity: 'warning',
    });
  } else if (metrics.hasSufficientSeries) {
    signals.push({
      id: 'stability',
      type: 'stability',
      title: 'Estabilidade Eleitoral',
      description: 'Intenções de voto permanecem estáveis dentro da margem nas leituras recentes.',
      severity: 'info',
    });
  }

  if (metrics.gapConcorrente && metrics.gapConcorrente.gap <= 5.0 && runnerUp) {
    signals.push({
      id: 'gap_close',
      type: 'gap_reduction',
      title: 'Vantagem Apertada',
      description: `Diferença de apenas ${metrics.gapConcorrente.gap} p.p. entre ${leader.candidateName} e ${runnerUp.candidateName}.`,
      severity: 'alert',
    });
  }

  if (!metrics.hasSufficientSeries) {
    signals.push({
      id: 'no_series',
      type: 'insufficient_data',
      title: 'Série Temporal Indisponível',
      description: 'Necessário ao menos 2 pesquisas metodologicamente comparáveis no mesmo cenário para traçar tendência.',
      severity: 'info',
    });
  }

  return signals;
}

export interface DiagnosticoPolitixResult {
  fatos: string[];
  interpretacao: string[];
  trend: TrendStatusResult;
}

/**
 * Sprint 2B, Bloco 4 — "DIAGNÓSTICO POLITIX", camada FATO/INTERPRETAÇÃO.
 * Cada string de `fatos` é derivada diretamente de um campo já calculado
 * (metrics/observedHistory) — nunca inventa número, nunca chama um LLM.
 * `interpretacao` é texto qualitativo determinístico (sempre a mesma frase
 * para a mesma combinação de status), não uma síntese gerada por IA.
 */
export function generateDiagnosticoPolitix(
  metrics: ExecutiveCockpitMetrics,
  observedHistory: ObservedHistoryResult
): DiagnosticoPolitixResult {
  const trend = deriveTrendStatus(metrics);

  if (!metrics.intencaoMaisRecente) {
    return {
      fatos: ['Ainda não há resultados de intenção de voto integrados para esta corrida.'],
      interpretacao: ['Acompanhar o calendário de divulgação das pesquisas registradas no TSE.'],
      trend,
    };
  }

  const leaderName = metrics.intencaoMaisRecente.candidateName;
  const leaderPct = metrics.intencaoMaisRecente.percentage;
  const isAnalyzedNonLeader = metrics.analyzedCandidateResult !== null;
  const subjectName = isAnalyzedNonLeader ? metrics.referenceCandidate! : leaderName;

  const fatos: string[] = [];

  if (isAnalyzedNonLeader && metrics.analyzedCandidateResult) {
    fatos.push(
      `${subjectName} ocupa a ${metrics.analyzedCandidateResult.rank}ª posição com ${metrics.analyzedCandidateResult.percentage}% na pesquisa de referência.`
    );
    fatos.push(`${leaderName} lidera com ${leaderPct}%, a ${metrics.analyzedCandidateResult.gapToLeader} p.p. de distância.`);
  } else {
    fatos.push(`${leaderName} lidera a pesquisa de referência com ${leaderPct}%.`);
    if (metrics.runnerUpResult) {
      fatos.push(`${metrics.runnerUpResult.candidateName} aparece em segundo com ${metrics.runnerUpResult.percentage}%.`);
    }
    if (metrics.gapConcorrente) {
      fatos.push(`A vantagem atual é de ${metrics.gapConcorrente.gap} p.p.`);
    }
  }

  if (observedHistory.minPercentage !== null && observedHistory.maxPercentage !== null) {
    fatos.push(`Os resultados observados de ${subjectName} estão entre ${observedHistory.minPercentage}% e ${observedHistory.maxPercentage}%.`);
  }

  const interpretacao: string[] = [];
  if (trend.status === 'INCONCLUSIVA') {
    interpretacao.push(
      isAnalyzedNonLeader
        ? `A posição atual de ${subjectName} reflete o levantamento mais recente disponível.`
        : `A liderança atual é ${metrics.gapConcorrente && metrics.gapConcorrente.gap > 10 ? 'ampla' : 'apertada'} no levantamento mais recente.`
    );
    interpretacao.push(trend.reason);
  } else if (trend.status === 'CRESCIMENTO') {
    interpretacao.push(`${subjectName} apresenta crescimento nas leituras comparáveis do período.`);
  } else if (trend.status === 'QUEDA') {
    interpretacao.push(`${subjectName} apresenta recuo nas leituras comparáveis do período.`);
  } else {
    interpretacao.push(`${subjectName} mantém posição estável nas leituras comparáveis do período.`);
  }

  return { fatos, interpretacao, trend };
}
