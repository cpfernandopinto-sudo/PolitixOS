import type {
  ElectionTerritoryAnalysis,
  ElectionTerritoryYearAnalysis,
  ElectoralProvenance,
  ElectoralSampleBenchmark,
} from './electoral-analytics';

export type ElectoralSignalType =
  | 'PARTICIPATION_INCREASED' | 'PARTICIPATION_DECREASED' | 'PARTICIPATION_UNCHANGED_EXACTLY'
  | 'ABSTENTION_INCREASED' | 'ABSTENTION_DECREASED' | 'ABSTENTION_UNCHANGED_EXACTLY'
  | 'ELECTORATE_INCREASED' | 'ELECTORATE_DECREASED' | 'ELECTORATE_UNCHANGED_EXACTLY'
  | 'MARGIN_EXPANDED' | 'MARGIN_NARROWED' | 'MARGIN_UNCHANGED_EXACTLY'
  | 'WINNER_CHANGED' | 'WINNER_MAINTAINED'
  | 'WINNING_PARTY_CHANGED' | 'WINNING_PARTY_MAINTAINED'
  | 'DECISION_MOVED_TO_RUNOFF' | 'DECISION_MOVED_TO_FIRST_ROUND' | 'DECISION_ROUND_UNCHANGED'
  | 'ABOVE_SAMPLE_PARTICIPATION' | 'BELOW_SAMPLE_PARTICIPATION' | 'AT_SAMPLE_PARTICIPATION'
  | 'ABOVE_SAMPLE_ABSTENTION' | 'BELOW_SAMPLE_ABSTENTION' | 'AT_SAMPLE_ABSTENTION'
  | 'ABOVE_SAMPLE_MARGIN' | 'BELOW_SAMPLE_MARGIN' | 'AT_SAMPLE_MARGIN';

export type ElectoralSignalOrigin = 'COMPARATIVE_SIGNAL';
export type HistoricalDirection = 'INCREASE' | 'DECREASE' | 'UNCHANGED_EXACTLY';

export interface ElectoralIntelligenceProvenance {
  territoryId: string;
  years: number[];
  metricKeys: string[];
  datasets: string[];
  evidenceHashes: string[];
}

export interface ElectoralHistoricalChange {
  metric: 'electorate' | 'turnoutRate' | 'abstentionRate' | 'marginPercentagePoints';
  fromYear: number;
  toYear: number;
  fromValue: number;
  toValue: number;
  absoluteDelta: number;
  relativeDelta: number | null;
  direction: HistoricalDirection;
  provenance: ElectoralIntelligenceProvenance;
}

export interface ElectoralSignal {
  signalType: ElectoralSignalType;
  origin: ElectoralSignalOrigin;
  metric: string;
  period: { fromYear?: number; toYear: number };
  value: number | string;
  delta: number | null;
  comparison: number | string | null;
  provenance: ElectoralIntelligenceProvenance;
}

export interface ElectoralSampleRanking {
  year: 2024;
  sampleLabel: 'amostra homologada de seis municípios';
  metric: 'turnoutRate' | 'abstentionRate' | 'marginPercentagePoints';
  highest: { codigoIbge: string; municipio: string; value: number } | null;
  lowest: { codigoIbge: string; municipio: string; value: number } | null;
}

export interface ElectoralTerritoryIntelligence {
  territory: ElectionTerritoryAnalysis['territory'];
  period: { from: 2016; to: 2024; years: [2016, 2020, 2024] };
  facts: ElectionTerritoryYearAnalysis[];
  signals: ElectoralSignal[];
  comparisons: ElectoralHistoricalChange[];
  historicalPatterns: ElectoralHistoricalChange[];
  partyPatterns: { sequence: Array<{ year: number; party: string | null }>; changes: number };
  participationPatterns: ElectoralHistoricalChange[];
  competitionPatterns: ElectoralHistoricalChange[];
  benchmarkSignals: ElectoralSignal[];
  provenance: ElectoralIntelligenceProvenance;
}

function mergedProvenance(...items: ElectoralProvenance[]): ElectoralIntelligenceProvenance {
  return {
    territoryId: items[0]?.territoryId ?? '',
    years: [...new Set(items.map((item) => item.year).filter(Boolean))].sort((a, b) => a - b),
    metricKeys: [...new Set(items.flatMap((item) => item.metricKeys))].sort(),
    datasets: [...new Set(items.flatMap((item) => item.datasets))].sort(),
    evidenceHashes: [...new Set(items.flatMap((item) => item.evidenceHashes))].sort(),
  };
}

function complete(provenance: ElectoralIntelligenceProvenance): boolean {
  return Boolean(provenance.territoryId && provenance.metricKeys.length && provenance.datasets.length && provenance.evidenceHashes.length);
}

function completeSource(provenance: ElectoralProvenance): boolean {
  return complete(mergedProvenance(provenance));
}

function direction(delta: number): HistoricalDirection {
  return delta > 0 ? 'INCREASE' : delta < 0 ? 'DECREASE' : 'UNCHANGED_EXACTLY';
}

function change(
  metric: ElectoralHistoricalChange['metric'],
  from: ElectionTerritoryYearAnalysis,
  to: ElectionTerritoryYearAnalysis
): ElectoralHistoricalChange | null {
  const fromValue = from[metric];
  const toValue = to[metric];
  if (fromValue === null || toValue === null || !completeSource(from.provenance) || !completeSource(to.provenance)) return null;
  const absoluteDelta = toValue - fromValue;
  const provenance = mergedProvenance(from.provenance, to.provenance);
  if (!complete(provenance)) return null;
  return {
    metric, fromYear: from.year, toYear: to.year, fromValue, toValue, absoluteDelta,
    relativeDelta: fromValue === 0 ? null : (absoluteDelta / Math.abs(fromValue)) * 100,
    direction: direction(absoluteDelta), provenance,
  };
}

function metricSignal(item: ElectoralHistoricalChange): ElectoralSignal {
  const map = {
    electorate: ['ELECTORATE_INCREASED', 'ELECTORATE_DECREASED', 'ELECTORATE_UNCHANGED_EXACTLY'],
    turnoutRate: ['PARTICIPATION_INCREASED', 'PARTICIPATION_DECREASED', 'PARTICIPATION_UNCHANGED_EXACTLY'],
    abstentionRate: ['ABSTENTION_INCREASED', 'ABSTENTION_DECREASED', 'ABSTENTION_UNCHANGED_EXACTLY'],
    marginPercentagePoints: ['MARGIN_EXPANDED', 'MARGIN_NARROWED', 'MARGIN_UNCHANGED_EXACTLY'],
  } as const;
  const index = item.direction === 'INCREASE' ? 0 : item.direction === 'DECREASE' ? 1 : 2;
  return {
    signalType: map[item.metric][index], origin: 'COMPARATIVE_SIGNAL', metric: item.metric,
    period: { fromYear: item.fromYear, toYear: item.toYear }, value: item.toValue,
    delta: item.absoluteDelta, comparison: item.fromValue, provenance: item.provenance,
  };
}

function identitySignal(
  metric: 'winner' | 'winnerParty' | 'decisiveRound',
  from: ElectionTerritoryYearAnalysis,
  to: ElectionTerritoryYearAnalysis
): ElectoralSignal | null {
  const fromValue = from[metric];
  const toValue = to[metric];
  if (fromValue === null || toValue === null || !completeSource(from.provenance) || !completeSource(to.provenance)) return null;
  const provenance = mergedProvenance(from.provenance, to.provenance);
  if (!complete(provenance)) return null;
  let signalType: ElectoralSignalType;
  if (metric === 'winner') signalType = fromValue === toValue ? 'WINNER_MAINTAINED' : 'WINNER_CHANGED';
  else if (metric === 'winnerParty') signalType = fromValue === toValue ? 'WINNING_PARTY_MAINTAINED' : 'WINNING_PARTY_CHANGED';
  else signalType = fromValue === toValue ? 'DECISION_ROUND_UNCHANGED' : toValue === 2 ? 'DECISION_MOVED_TO_RUNOFF' : 'DECISION_MOVED_TO_FIRST_ROUND';
  return { signalType, origin: 'COMPARATIVE_SIGNAL', metric, period: { fromYear: from.year, toYear: to.year }, value: toValue, delta: null, comparison: fromValue, provenance };
}

function benchmarkSignal(
  metric: 'turnoutRate' | 'abstentionRate' | 'marginPercentagePoints',
  election: ElectionTerritoryYearAnalysis,
  average: number | null
): ElectoralSignal | null {
  const value = election[metric];
  const provenance = mergedProvenance(election.provenance);
  if (value === null || average === null || !complete(provenance)) return null;
  const delta = value - average;
  const names = {
    turnoutRate: ['ABOVE_SAMPLE_PARTICIPATION', 'BELOW_SAMPLE_PARTICIPATION', 'AT_SAMPLE_PARTICIPATION'],
    abstentionRate: ['ABOVE_SAMPLE_ABSTENTION', 'BELOW_SAMPLE_ABSTENTION', 'AT_SAMPLE_ABSTENTION'],
    marginPercentagePoints: ['ABOVE_SAMPLE_MARGIN', 'BELOW_SAMPLE_MARGIN', 'AT_SAMPLE_MARGIN'],
  } as const;
  const index = delta > 0 ? 0 : delta < 0 ? 1 : 2;
  return { signalType: names[metric][index], origin: 'COMPARATIVE_SIGNAL', metric, period: { toYear: election.year }, value, delta, comparison: average, provenance };
}

export function buildElectoralTerritoryIntelligence(
  analysis: ElectionTerritoryAnalysis,
  benchmarks: ElectoralSampleBenchmark[]
): ElectoralTerritoryIntelligence {
  const elections = [...analysis.elections].sort((a, b) => a.year - b.year);
  const pairs = [[elections[0], elections[1]], [elections[1], elections[2]], [elections[0], elections[2]]] as const;
  const comparisons = pairs.flatMap(([from, to]) =>
    (['electorate', 'turnoutRate', 'abstentionRate', 'marginPercentagePoints'] as const)
      .map((metric) => change(metric, from, to)).filter((item): item is ElectoralHistoricalChange => item !== null));
  const historicalSignals = comparisons.map(metricSignal);
  const identitySignals = pairs.slice(0, 2).flatMap(([from, to]) =>
    (['winner', 'winnerParty', 'decisiveRound'] as const)
      .map((metric) => identitySignal(metric, from, to)).filter((item): item is ElectoralSignal => item !== null));
  const benchmarkSignals = elections.flatMap((election) => {
    const benchmark = benchmarks.find((item) => item.year === election.year);
    if (!benchmark || benchmark.sampleLabel !== 'amostra homologada de seis municípios') return [];
    return [
      benchmarkSignal('turnoutRate', election, benchmark.averages.turnoutRate),
      benchmarkSignal('abstentionRate', election, benchmark.averages.abstentionRate),
      benchmarkSignal('marginPercentagePoints', election, benchmark.averages.marginPercentagePoints),
    ].filter((item): item is ElectoralSignal => item !== null);
  });
  return {
    territory: { ...analysis.territory }, period: { from: 2016, to: 2024, years: [2016, 2020, 2024] },
    facts: elections.map((item) => ({ ...item })),
    signals: [...historicalSignals, ...identitySignals, ...benchmarkSignals], comparisons,
    historicalPatterns: comparisons,
    partyPatterns: { sequence: analysis.partyHistory.sequence.map((item) => ({ ...item })), changes: analysis.partyHistory.winnerPartyChanges },
    participationPatterns: comparisons.filter((item) => ['electorate', 'turnoutRate', 'abstentionRate'].includes(item.metric)),
    competitionPatterns: comparisons.filter((item) => item.metric === 'marginPercentagePoints'),
    benchmarkSignals,
    provenance: mergedProvenance(...elections.map((item) => item.provenance)),
  };
}

export function buildElectoralSampleRankings(benchmark: ElectoralSampleBenchmark): ElectoralSampleRanking[] {
  if (benchmark.year !== 2024) return [];
  return (['turnoutRate', 'abstentionRate', 'marginPercentagePoints'] as const).map((metric) => {
    const values = benchmark.territories
      .map((item) => ({ codigoIbge: item.codigoIbge, municipio: item.municipio, value: item[metric] }))
      .filter((item): item is { codigoIbge: string; municipio: string; value: number } => item.value !== null)
      .sort((a, b) => b.value - a.value || a.codigoIbge.localeCompare(b.codigoIbge));
    return { year: 2024, sampleLabel: benchmark.sampleLabel, metric, highest: values[0] ?? null, lowest: values.at(-1) ?? null };
  });
}
