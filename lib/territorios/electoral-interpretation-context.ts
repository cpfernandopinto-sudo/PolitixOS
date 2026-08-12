import type { ElectionTerritoryYearAnalysis } from './electoral-analytics';
import type { ElectoralIntelligenceProvenance, ElectoralSignal, ElectoralTerritoryIntelligence } from './electoral-intelligence';

export const ELECTORAL_CONTEXT_SCHEMA_VERSION = 'electoral-context-v1' as const;
export const ELECTORAL_CONTEXT_UNIVERSE = 'homologated-six-municipality-sample' as const;
export const ELECTORAL_CONTEXT_UNIVERSE_LABEL = 'amostra homologada de seis municípios' as const;

export type ElectoralAssertionClass = 'FACT' | 'INTERPRETATION' | 'RECOMMENDATION';

export interface ElectoralContextFact {
  assertionClass: 'FACT';
  year: number;
  electorate: number | null;
  turnout: number | null;
  turnoutRate: number | null;
  abstention: number | null;
  abstentionRate: number | null;
  validVotes: number | null;
  winner: string | null;
  winnerParty: string | null;
  runnerUp: string | null;
  runnerUpParty: string | null;
  marginVotes: number | null;
  marginPercentagePoints: number | null;
  decisiveRound: number | null;
  officialStatus: string | null;
  provenance: ElectoralIntelligenceProvenance;
}

export interface ElectoralContextBenchmark {
  assertionClass: 'FACT';
  metric: string;
  year: number;
  comparisonUniverse: typeof ELECTORAL_CONTEXT_UNIVERSE;
  comparisonUniverseLabel: typeof ELECTORAL_CONTEXT_UNIVERSE_LABEL;
  sampleAverage: number;
  municipalityValue: number;
  deltaToSample: number;
  signalType: ElectoralSignal['signalType'];
  provenance: ElectoralIntelligenceProvenance;
}

export interface ElectoralInterpretationContext {
  schemaVersion: typeof ELECTORAL_CONTEXT_SCHEMA_VERSION;
  territory: ElectoralTerritoryIntelligence['territory'] & {
    comparisonUniverse: typeof ELECTORAL_CONTEXT_UNIVERSE;
    comparisonUniverseLabel: typeof ELECTORAL_CONTEXT_UNIVERSE_LABEL;
  };
  scope: { from: 2016; to: 2024; years: [2016, 2020, 2024]; sourceSignalCount: number };
  elections: ElectoralContextFact[];
  currentSnapshot: ElectoralContextFact | null;
  historicalEvolution: ElectoralContextFact[];
  participation: Array<{ year: number; turnoutRate: number | null; abstentionRate: number | null }>;
  competition: Array<{ year: number; marginVotes: number | null; marginPercentagePoints: number | null }>;
  winnerHistory: Array<{ year: number; winner: string | null }>;
  partyHistory: Array<{ year: number; party: string | null }>;
  decisionRoundHistory: Array<{ year: number; decisiveRound: number | null }>;
  benchmark: ElectoralContextBenchmark[];
  signals: ElectoralSignal[];
  keyChanges: ElectoralSignal[];
  provenance: ElectoralIntelligenceProvenance;
  sourcesUsed: { datasets: string[]; evidenceHashes: string[] };
  limitations: string[];
  missingData: Array<{ year: number; fields: string[] }>;
  interpretationGuardrails: { allowed: string[]; prohibited: string[] };
  assertions: { facts: Array<{ section: string; count: number }>; interpretations: []; recommendations: [] };
}

const LIMITATIONS = [
  'benchmark limitado à amostra homologada de seis municípios',
  'pleitos disponíveis: 2016, 2020 e 2024',
  'classificação ideológica ausente',
  'pesquisa de opinião ausente',
  'previsão eleitoral ausente',
  'causalidade não estabelecida',
  'sinais exclusivamente matemáticos e determinísticos',
  'interpretação não executada',
] as const;

const ALLOWED = [
  'descrever evolução registrada',
  'comparar valores presentes no contexto',
  'destacar mudanças observadas',
  'interpretar sinais com linguagem qualificada',
  'relacionar fatos presentes no contexto',
] as const;

const PROHIBITED = [
  'inventar causa',
  'afirmar intenção do eleitor',
  'inferir opinião individual',
  'criar pesquisa inexistente',
  'inferir ideologia não fornecida',
  'prever resultado eleitoral como fato',
  'transformar correlação em causalidade',
  'criar número inexistente',
  'omitir limitações relevantes',
  'apresentar benchmark da amostra como RMBH, Minas Gerais ou Brasil',
] as const;

function cloneProvenance(value: ElectoralIntelligenceProvenance): ElectoralIntelligenceProvenance {
  return { territoryId: value.territoryId, years: [...value.years], metricKeys: [...value.metricKeys], datasets: [...value.datasets], evidenceHashes: [...value.evidenceHashes] };
}

function provenanceOfElection(election: ElectionTerritoryYearAnalysis): ElectoralIntelligenceProvenance {
  return {
    territoryId: election.provenance.territoryId,
    years: [election.year],
    metricKeys: [...election.provenance.metricKeys],
    datasets: [...election.provenance.datasets],
    evidenceHashes: [...election.provenance.evidenceHashes],
  };
}

function fact(election: ElectionTerritoryYearAnalysis): ElectoralContextFact {
  return {
    assertionClass: 'FACT', year: election.year, electorate: election.electorate, turnout: election.turnout,
    turnoutRate: election.turnoutRate, abstention: election.abstention, abstentionRate: election.abstentionRate,
    validVotes: election.validVotes, winner: election.winner, winnerParty: election.winnerParty,
    runnerUp: election.runnerUp, runnerUpParty: election.runnerUpParty, marginVotes: election.marginVotes,
    marginPercentagePoints: election.marginPercentagePoints, decisiveRound: election.decisiveRound,
    officialStatus: election.winnerStatus, provenance: provenanceOfElection(election),
  };
}

function missing(facts: ElectoralContextFact[]): ElectoralInterpretationContext['missingData'] {
  const fields = ['electorate', 'turnout', 'turnoutRate', 'abstention', 'abstentionRate', 'validVotes', 'winner', 'winnerParty', 'runnerUp', 'runnerUpParty', 'marginVotes', 'marginPercentagePoints', 'decisiveRound', 'officialStatus'] as const;
  return facts.map((item) => ({ year: item.year, fields: fields.filter((field) => item[field] === null) })).filter((item) => item.fields.length > 0);
}

function cloneSignal(signal: ElectoralSignal): ElectoralSignal {
  return { ...signal, period: { ...signal.period }, provenance: cloneProvenance(signal.provenance) };
}

export function buildElectoralInterpretationContext(intelligence: ElectoralTerritoryIntelligence): ElectoralInterpretationContext {
  const facts = [...intelligence.facts].sort((a, b) => a.year - b.year).map(fact);
  const current = facts.at(-1) ?? null;
  const recentSignals = intelligence.signals.filter((signal) => signal.period.fromYear === 2020 && signal.period.toYear === 2024).map(cloneSignal);
  const currentBenchmarks = intelligence.benchmarkSignals.filter((signal) => signal.period.toYear === 2024).map(cloneSignal);
  const selectedSignals = [...recentSignals, ...currentBenchmarks];
  const benchmark = currentBenchmarks.flatMap((signal): ElectoralContextBenchmark[] =>
    typeof signal.value === 'number' && typeof signal.comparison === 'number' && signal.delta !== null ? [{
      assertionClass: 'FACT', metric: signal.metric, year: signal.period.toYear,
      comparisonUniverse: ELECTORAL_CONTEXT_UNIVERSE, comparisonUniverseLabel: ELECTORAL_CONTEXT_UNIVERSE_LABEL,
      sampleAverage: signal.comparison, municipalityValue: signal.value, deltaToSample: signal.delta,
      signalType: signal.signalType, provenance: cloneProvenance(signal.provenance),
    }] : []);
  return {
    schemaVersion: ELECTORAL_CONTEXT_SCHEMA_VERSION,
    territory: { ...intelligence.territory, comparisonUniverse: ELECTORAL_CONTEXT_UNIVERSE, comparisonUniverseLabel: ELECTORAL_CONTEXT_UNIVERSE_LABEL },
    scope: { ...intelligence.period, years: [...intelligence.period.years], sourceSignalCount: intelligence.signals.length },
    elections: facts,
    currentSnapshot: current,
    historicalEvolution: facts.filter((item) => item.year < (current?.year ?? Infinity)),
    participation: facts.map(({ year, turnoutRate, abstentionRate }) => ({ year, turnoutRate, abstentionRate })),
    competition: facts.map(({ year, marginVotes, marginPercentagePoints }) => ({ year, marginVotes, marginPercentagePoints })),
    winnerHistory: facts.map(({ year, winner }) => ({ year, winner })),
    partyHistory: facts.map(({ year, winnerParty: party }) => ({ year, party })),
    decisionRoundHistory: facts.map(({ year, decisiveRound }) => ({ year, decisiveRound })),
    benchmark,
    signals: selectedSignals,
    keyChanges: recentSignals,
    provenance: cloneProvenance(intelligence.provenance),
    sourcesUsed: {
      datasets: [...new Set(intelligence.provenance.datasets)].sort(),
      evidenceHashes: [...new Set(intelligence.provenance.evidenceHashes)].sort(),
    },
    limitations: [...LIMITATIONS],
    missingData: missing(facts),
    interpretationGuardrails: { allowed: [...ALLOWED], prohibited: [...PROHIBITED] },
    assertions: { facts: [{ section: 'elections', count: facts.length }, { section: 'signals', count: selectedSignals.length }, { section: 'benchmark', count: benchmark.length }], interpretations: [], recommendations: [] },
  };
}

export function canonicalizeElectoralInterpretationContext(context: ElectoralInterpretationContext): string {
  return JSON.stringify(context);
}
