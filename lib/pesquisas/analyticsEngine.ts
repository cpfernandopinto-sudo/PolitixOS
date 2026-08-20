import type {
  ElectoralPollResultWithPoll,
  ElectoralPoll,
  ExecutiveCockpitMetrics,
  CandidateRankingItem,
} from './types';
import { isRealCandidate } from './types';
import type { TemporalSeriesEntry } from './results-repository';

export type AnalyticalStatusType = 'ESTÁVEL' | 'ATENÇÃO' | 'CRÍTICO' | 'SEM CLASSIFICAÇÃO';

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

export interface PolitixAiInsight {
  narrative: string;
  fact: string;
  trend: string;
  interpretation: string;
  timestamp: string;
  supportingPollsCount: number;

  // SPRINT FINAL: 4 Dimensões Estratégicas para Leitura Executiva Eleitoral
  cenarioAtual: string;
  principalMovimento: string;
  riscoOportunidade: string;
  orientacaoEstrategica: string;
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

export function generatePolitixInsight(
  raceLabel: string,
  metrics: ExecutiveCockpitMetrics,
  latestPoll: ElectoralPoll | null,
  temporalSeries: TemporalSeriesEntry[],
  ranking: { realCandidates: CandidateRankingItem[] }
): PolitixAiInsight {
  const leader = ranking.realCandidates[0] ?? null;
  const runnerUp = ranking.realCandidates[1] ?? null;
  const thirdPlace = ranking.realCandidates[2] ?? null;
  const nowIso = new Date().toISOString();

  if (!leader || !latestPoll) {
    return {
      narrative: `A corrida de ${raceLabel} possui registros no TSE, mas ainda aguarda a homologação de resultados de intenção de voto integrados.`,
      fact: `Sem resultados verificados no momento para ${raceLabel}.`,
      trend: 'Não há pesquisas comparáveis suficientes para determinar tendência.',
      interpretation: 'Acompanhar o calendário de divulgação no TSE.',
      timestamp: nowIso,
      supportingPollsCount: 0,
      cenarioAtual: `Sem resultados verificados integrados no momento para ${raceLabel}.`,
      principalMovimento: 'Não há pesquisas comparáveis suficientes no período para determinar tendência.',
      riscoOportunidade: 'Aguardando publicação oficial de levantamentos com resultados no TSE.',
      orientacaoEstrategica: 'Acompanhar o calendário de divulgação das pesquisas registradas.',
    };
  }

  const leaderName = leader.candidateName;
  const leaderPct = leader.percentage;
  const runnerName = runnerUp ? runnerUp.candidateName : 'demais concorrentes';
  const runnerPct = runnerUp ? `${runnerUp.percentage}%` : 'N/A';
  const gapStr = metrics.gapConcorrente ? `${metrics.gapConcorrente.gap} p.p.` : 'N/A';
  const institutoName = latestPoll.instituto ?? 'TSE/PesqEle';

  const isAnalyzedNonLeader = metrics.analyzedCandidateResult !== null;
  const analyzedCandName = metrics.referenceCandidate ?? leaderName;

  // 1. CENÁRIO ATUAL
  let cenarioAtualText = '';
  if (isAnalyzedNonLeader && metrics.analyzedCandidateResult) {
    cenarioAtualText = `${analyzedCandName} ocupa a ${metrics.analyzedCandidateResult.rank}ª posição com ${metrics.analyzedCandidateResult.percentage}%, a ${metrics.analyzedCandidateResult.gapToLeader} p.p. da líder ${leaderName} (${leaderPct}%), no levantamento mais recente de ${institutoName}.`;
  } else {
    cenarioAtualText = `${leaderName} lidera o cenário com ${leaderPct}%, seguida por ${runnerName} com ${runnerPct}${thirdPlace ? ` e ${thirdPlace.candidateName} com ${thirdPlace.percentage}%` : ''}, estabelecendo vantagem de ${gapStr} no levantamento mais recente (${institutoName}).`;
  }

  // 2. PRINCIPAL MOVIMENTO
  let principalMovimentoText = '';
  if (metrics.hasSufficientSeries && metrics.variacaoAnterior) {
    const diff = metrics.variacaoAnterior.diff;
    const candVarName = metrics.variacaoAnterior.candidateName;
    const varSign = diff > 0 ? `+${diff}` : `${diff}`;
    const gapBehaviorText = metrics.gapBehavior === 'EXPANDING' ? 'ampliando' : metrics.gapBehavior === 'NARROWING' ? 'reduzindo' : 'estável';

    principalMovimentoText = `Nas leituras comparáveis do período, ${candVarName} apresentou variação de ${varSign} p.p., enquanto a diferença entre os primeiros colocados manteve-se com tendência de gap ${gapBehaviorText}.`;
  } else {
    principalMovimentoText = 'Não existem levantamentos metodologicamente comparáveis suficientes no período para caracterizar tendência consolidada.';
  }

  // 3. RISCO / OPORTUNIDADE
  let riscoOportunidadeText = '';
  if (!metrics.hasSufficientSeries) {
    riscoOportunidadeText = `Base comparável reduzida (${metrics.pesquisasComparaveisCount} pesquisas comparáveis). Os dados disponíveis sugerem cautela na interpretação de oscilações isoladas.`;
  } else if (metrics.gapConcorrente && metrics.gapConcorrente.gap <= 5.0) {
    riscoOportunidadeText = `Liderança sob pressão competitiva com margem estreita de ${gapStr} frente a ${runnerName}, indicando cenário aberto e suscetível a pequenas variações.`;
  } else {
    riscoOportunidadeText = `Liderança com margem de ${gapStr}, apresentando consistência entre institutos e baixa volatilidade no período analisado.`;
  }

  // 4. ORIENTAÇÃO ESTRATÉGICA
  let orientacaoEstrategicaText = '';
  if (!metrics.hasSufficientSeries) {
    orientacaoEstrategicaText = `Evitar interpretar a oscilação isolada como tendência consolidada até a divulgação de novos levantamentos metodologicamente comparáveis no TSE.`;
  } else if (isAnalyzedNonLeader) {
    orientacaoEstrategicaText = `Priorizar o monitoramento da distância para a liderança, verificando se a variação de ${metrics.variacaoAnterior?.diff ?? 0} p.p. se confirma em novas pesquisas comparáveis.`;
  } else {
    orientacaoEstrategicaText = `Preservar a vantagem de ${gapStr} e acompanhar com atenção a trajetória de ${runnerName} nos próximos levantamentos comparáveis.`;
  }

  const factText = `${leaderName} lidera com ${leaderPct}%, seguida por ${runnerName} com ${runnerPct}.`;
  const narrativeText = `${cenarioAtualText} ${principalMovimentoText} ${orientacaoEstrategicaText}`;

  return {
    narrative: narrativeText,
    fact: factText,
    trend: principalMovimentoText,
    interpretation: `Vantagem de ${gapStr} (${metrics.gapBehavior === 'EXPANDING' ? 'gap ampliando' : metrics.gapBehavior === 'NARROWING' ? 'gap reduzindo' : 'gap estável'}).`,
    timestamp: nowIso,
    supportingPollsCount: metrics.pesquisasComparaveisCount,
    cenarioAtual: cenarioAtualText,
    principalMovimento: principalMovimentoText,
    riscoOportunidade: riscoOportunidadeText,
    orientacaoEstrategica: orientacaoEstrategicaText,
  };
}
