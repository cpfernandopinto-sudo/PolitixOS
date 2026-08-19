/**
 * INTEL-DOMAIN-02 (Missão B) — Signals eleitorais (L3), PROJEÇÃO pura sobre
 * `ElectoralSignal[]` já computado por `../../electoral-intelligence.ts`
 * (`buildElectoralTerritoryIntelligence`). NUNCA recalcula direção/delta/benchmark —
 * apenas traduz o `ElectoralSignalType` já existente (que já cobre, com nome próprio,
 * tudo que o gate sugeriu como TURNOUT_RISING/FALLING, ABSTENTION_RISING/FALLING e
 * COMPETITIVENESS_SHIFT) para o contrato cross-domain `AnalyticalSignal`
 * (`../contracts.ts`), do mesmo jeito que `../economy/caged-employment-signals.ts`
 * projeta os signals de emprego.
 *
 * `evidenceRefs` de cada `AnalyticalSignal` é resolvido a partir dos `Fact[]` já
 * construídos por `./electoral-facts.ts` para os mesmos território/métrica/ano — nunca
 * um id sintetizado à parte, para não criar uma segunda fonte de verdade de evidência
 * (mesma disciplina de `caged-employment-signals.ts`, que reusa `fact.evidenceRefs`).
 *
 * ELECTORAL_FRAGMENTATION / ELECTORAL_CONCENTRATION (sugeridos pelo gate) NÃO são
 * implementados: `ElectionTerritoryYearAnalysis` só rastreia vencedor e segundo
 * colocado (`winner`/`runnerUp`), nunca a distribuição de votos entre todos os
 * candidatos — não existe definição matemática documentável de fragmentação/concentração
 * partidária com o dado disponível. Implementar um desses sinais exigiria inventar uma
 * distribuição de votos que a fonte não fornece, violando a regra do gate ("só
 * implementar quando houver definição matemática documentável"). `MARGIN_EXPANDED`/
 * `MARGIN_NARROWED` já cobre a leitura de competitividade (COMPETITIVENESS_SHIFT) com
 * os dois candidatos realmente disponíveis.
 */

import type { ElectoralSignal, ElectoralSignalType } from '../../electoral-intelligence';
import type { AnalyticalSignal, ConfidenceClass, Fact, SignalType } from '../contracts';

const METHOD_ID = 'ELECTORAL_SIGNALS_PROJECTION_V1';
const METHOD_VERSION = 'intel-domain-02-v1';

/** Métrica do `ElectoralSignal` -> chave do `Fact` correspondente em `electoral-facts.ts`. */
const METRIC_TO_FACT_KEY: Record<string, string> = {
  electorate: 'electorate',
  turnoutRate: 'turnout_rate',
  abstentionRate: 'abstention_rate',
  marginPercentagePoints: 'margin_percentage_points',
  winner: 'winner',
  winnerParty: 'winner_party',
  decisiveRound: 'decisive_round',
};

const SIGNAL_KIND: Record<ElectoralSignalType, SignalType> = {
  PARTICIPATION_INCREASED: 'TREND', PARTICIPATION_DECREASED: 'TREND', PARTICIPATION_UNCHANGED_EXACTLY: 'TREND',
  ABSTENTION_INCREASED: 'TREND', ABSTENTION_DECREASED: 'TREND', ABSTENTION_UNCHANGED_EXACTLY: 'TREND',
  ELECTORATE_INCREASED: 'TREND', ELECTORATE_DECREASED: 'TREND', ELECTORATE_UNCHANGED_EXACTLY: 'TREND',
  MARGIN_EXPANDED: 'TREND', MARGIN_NARROWED: 'TREND', MARGIN_UNCHANGED_EXACTLY: 'TREND',
  WINNER_CHANGED: 'CHANGE', WINNER_MAINTAINED: 'CHANGE',
  WINNING_PARTY_CHANGED: 'CHANGE', WINNING_PARTY_MAINTAINED: 'CHANGE',
  DECISION_MOVED_TO_RUNOFF: 'CHANGE', DECISION_MOVED_TO_FIRST_ROUND: 'CHANGE', DECISION_ROUND_UNCHANGED: 'CHANGE',
  ABOVE_SAMPLE_PARTICIPATION: 'DIVERGENCE', BELOW_SAMPLE_PARTICIPATION: 'DIVERGENCE', AT_SAMPLE_PARTICIPATION: 'DIVERGENCE',
  ABOVE_SAMPLE_ABSTENTION: 'DIVERGENCE', BELOW_SAMPLE_ABSTENTION: 'DIVERGENCE', AT_SAMPLE_ABSTENTION: 'DIVERGENCE',
  ABOVE_SAMPLE_MARGIN: 'DIVERGENCE', BELOW_SAMPLE_MARGIN: 'DIVERGENCE', AT_SAMPLE_MARGIN: 'DIVERGENCE',
};

const SIGNAL_TITLES: Record<ElectoralSignalType, string> = {
  PARTICIPATION_INCREASED: 'Comparecimento eleitoral subiu', PARTICIPATION_DECREASED: 'Comparecimento eleitoral caiu', PARTICIPATION_UNCHANGED_EXACTLY: 'Comparecimento eleitoral manteve-se exatamente igual',
  ABSTENTION_INCREASED: 'Abstenção subiu', ABSTENTION_DECREASED: 'Abstenção caiu', ABSTENTION_UNCHANGED_EXACTLY: 'Abstenção manteve-se exatamente igual',
  ELECTORATE_INCREASED: 'Eleitorado apto cresceu', ELECTORATE_DECREASED: 'Eleitorado apto diminuiu', ELECTORATE_UNCHANGED_EXACTLY: 'Eleitorado apto manteve-se exatamente igual',
  MARGIN_EXPANDED: 'Margem de vitória se ampliou (eleição menos competitiva)', MARGIN_NARROWED: 'Margem de vitória diminuiu (eleição mais competitiva)', MARGIN_UNCHANGED_EXACTLY: 'Margem de vitória manteve-se exatamente igual',
  WINNER_CHANGED: 'O candidato vencedor mudou entre as eleições', WINNER_MAINTAINED: 'O mesmo candidato venceu novamente',
  WINNING_PARTY_CHANGED: 'O partido vencedor mudou entre as eleições', WINNING_PARTY_MAINTAINED: 'O mesmo partido venceu novamente',
  DECISION_MOVED_TO_RUNOFF: 'A decisão passou a depender de segundo turno', DECISION_MOVED_TO_FIRST_ROUND: 'A decisão passou a ser definida no primeiro turno', DECISION_ROUND_UNCHANGED: 'O turno decisivo permaneceu o mesmo',
  ABOVE_SAMPLE_PARTICIPATION: 'Comparecimento acima da média da amostra homologada de seis municípios', BELOW_SAMPLE_PARTICIPATION: 'Comparecimento abaixo da média da amostra homologada de seis municípios', AT_SAMPLE_PARTICIPATION: 'Comparecimento igual à média da amostra homologada de seis municípios',
  ABOVE_SAMPLE_ABSTENTION: 'Abstenção acima da média da amostra homologada de seis municípios', BELOW_SAMPLE_ABSTENTION: 'Abstenção abaixo da média da amostra homologada de seis municípios', AT_SAMPLE_ABSTENTION: 'Abstenção igual à média da amostra homologada de seis municípios',
  ABOVE_SAMPLE_MARGIN: 'Margem de vitória acima da média da amostra homologada de seis municípios', BELOW_SAMPLE_MARGIN: 'Margem de vitória abaixo da média da amostra homologada de seis municípios', AT_SAMPLE_MARGIN: 'Margem de vitória igual à média da amostra homologada de seis municípios',
};

function factEvidenceRefs(facts: Fact[], metric: string, year: number | undefined): string[] {
  if (year === undefined) return [];
  const key = METRIC_TO_FACT_KEY[metric];
  if (!key) return [];
  const fact = facts.find((item) => item.key === key && item.period === String(year) && item.supported);
  return fact ? fact.evidenceRefs : [];
}

function summaryFor(signal: ElectoralSignal): string {
  const from = signal.period.fromYear ? `${signal.period.fromYear} -> ` : '';
  return `${SIGNAL_TITLES[signal.signalType]} (${from}${signal.period.toYear}). Valor: ${signal.value}${signal.delta !== null ? `, variação: ${signal.delta}` : ''}${signal.comparison !== null ? `, referência de comparação: ${signal.comparison}` : ''}.`;
}

/**
 * Deriva `AnalyticalSignal[]` a partir dos `ElectoralSignal[]` já computados
 * (`ElectoralTerritoryIntelligence.signals`) e dos `Fact[]` já construídos por
 * `buildElectoralFacts` para o mesmo território — nunca recalcula nada, apenas projeta
 * formato e resolve evidência contra os facts reais.
 */
export function buildElectoralAnalyticalSignals(territoryId: string, electoralSignals: ElectoralSignal[], facts: Fact[]): AnalyticalSignal[] {
  return electoralSignals.map((signal) => {
    const evidenceRefsFrom = factEvidenceRefs(facts, signal.metric, signal.period.fromYear);
    const evidenceRefsTo = factEvidenceRefs(facts, signal.metric, signal.period.toYear);
    const evidenceRefs = [...new Set([...evidenceRefsFrom, ...evidenceRefsTo])];
    const confidence: ConfidenceClass | null = evidenceRefs.length > 0 ? 'DIRECTLY_SUPPORTED' : null;
    const period = signal.period.fromYear ? `${signal.period.fromYear}-${signal.period.toYear}` : String(signal.period.toYear);
    return {
      id: `signal:eleitoral:${signal.signalType.toLowerCase()}:${territoryId}:${period}`,
      territoryId, domains: ['eleitoral'], type: SIGNAL_KIND[signal.signalType],
      priority: null, severity: null,
      title: SIGNAL_TITLES[signal.signalType], summary: summaryFor(signal),
      evidenceRefs, derivedIndicatorRefs: [], period,
      status: evidenceRefs.length > 0 ? 'ACTIVE' : 'INSUFFICIENT_EVIDENCE',
      confidence, limitations: evidenceRefs.length > 0 ? [] : [{ code: 'INSUFFICIENT_PERIODS', description: 'Nenhum fact correspondente encontrado para resolver evidência deste signal.', domain: 'eleitoral' }],
      methodId: METHOD_ID, methodVersion: METHOD_VERSION,
    };
  });
}
