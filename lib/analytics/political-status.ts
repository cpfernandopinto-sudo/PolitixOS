/**
 * Classificação do estado político — função pura e testável.
 *
 * Reaproveita EXATAMENTE os thresholds já usados em
 * lib/queries/overview.ts (getCrisisOverview): score > 75 → crítico,
 * > 50 → tensão elevada (antes "quente"), > 25 → atenção (antes "morno"),
 * caso contrário → estável (antes "frio"). Só os rótulos mudam — a regra
 * de negócio não é reinventada aqui.
 */

export type PoliticalStatus = 'estavel' | 'atencao' | 'tensao_elevada' | 'critico';
export type PoliticalSeverity = 'baixo' | 'medio' | 'alto' | 'critico';

export const POLITICAL_STATUS_THRESHOLDS = {
  critico: 75,
  tensaoElevada: 50,
  atencao: 25,
} as const;

export const POLITICAL_STATUS_LABEL: Record<PoliticalStatus, string> = {
  estavel: 'Estável',
  atencao: 'Atenção',
  tensao_elevada: 'Tensão elevada',
  critico: 'Crítico',
};

export interface PoliticalStatusInput {
  /** Score de crise consolidado (0–100), já calculado por getCrisisOverview. */
  crisisScore: number;
  /** Volume total de itens monitorados no período — 0 significa "sem dados". */
  volumeTotal: number;
  criticalAlertCount: number;
  highAlertCount: number;
  predominantSentiment: 'positivo' | 'negativo' | 'neutro' | 'misto' | null;
  predominantRisk: 'critico' | 'alto' | 'medio' | 'baixo' | null;
  /**
   * Variação real de volume vs. período anterior (mesma métrica já usada em
   * getTrendOverview). Passar `null` quando não houver comparação real —
   * nunca fabricar uma direção/percentual.
   */
  volumeTrend: { direcao: 'up' | 'down' | 'stable'; variacaoPercentual: number } | null;
}

export interface PoliticalStatusResult {
  status: PoliticalStatus;
  label: string;
  severidade: PoliticalSeverity;
  score: number;
  semDados: boolean;
  fatores: string[];
  justificativa: string;
  variacao: { direcao: 'up' | 'down' | 'stable'; variacaoPercentual: number; metrica: string } | null;
}

export function classifyPoliticalStatus(input: PoliticalStatusInput): PoliticalStatusResult {
  if (input.volumeTotal <= 0) {
    return {
      status: 'estavel',
      label: 'Sem dados suficientes',
      severidade: 'baixo',
      score: 0,
      semDados: true,
      fatores: [],
      justificativa: 'Não há volume de menções suficiente no período e filtros selecionados para calcular o estado político.',
      variacao: null,
    };
  }

  let status: PoliticalStatus;
  let severidade: PoliticalSeverity;
  if (input.crisisScore > POLITICAL_STATUS_THRESHOLDS.critico) {
    status = 'critico';
    severidade = 'critico';
  } else if (input.crisisScore > POLITICAL_STATUS_THRESHOLDS.tensaoElevada) {
    status = 'tensao_elevada';
    severidade = 'alto';
  } else if (input.crisisScore > POLITICAL_STATUS_THRESHOLDS.atencao) {
    status = 'atencao';
    severidade = 'medio';
  } else {
    status = 'estavel';
    severidade = 'baixo';
  }

  const fatores: string[] = [];
  if (input.criticalAlertCount > 0) fatores.push(`${input.criticalAlertCount} alerta(s) crítico(s) ativo(s)`);
  if (input.highAlertCount > 0) fatores.push(`${input.highAlertCount} alerta(s) de risco alto ativo(s)`);
  if (input.predominantSentiment) fatores.push(`Sentimento predominante: ${input.predominantSentiment}`);
  if (input.predominantRisk) fatores.push(`Risco predominante: ${input.predominantRisk}`);
  if (fatores.length === 0) fatores.push('Nenhum fator de destaque adicional identificado no período.');

  const justificativa = `Score de crise consolidado em ${Math.round(input.crisisScore)}/100, combinando notícias (peso 50%), X (peso 30%) e Instagram (peso 20%).`;

  const variacao = input.volumeTrend
    ? { direcao: input.volumeTrend.direcao, variacaoPercentual: input.volumeTrend.variacaoPercentual, metrica: 'volume de menções' }
    : null;

  return {
    status,
    label: POLITICAL_STATUS_LABEL[status],
    severidade,
    score: input.crisisScore,
    semDados: false,
    fatores,
    justificativa,
    variacao,
  };
}
