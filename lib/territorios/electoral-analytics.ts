export const ELECTORAL_ANALYTICS_YEARS = [2016, 2020, 2024] as const;

export interface ElectoralAnalyticsIndicator {
  territory_id: string;
  indicador: string;
  valor: number | string | null;
  unidade: string | null;
  source_dataset: string | null;
  source_record_id: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ElectoralAnalyticsEvidence {
  territory_id: string;
  source_hash: string;
  source_external_id: string;
}

export interface ElectoralAnalyticsTerritory {
  id: string;
  codigoIbge: string;
  municipio: string;
  uf: string;
}

export interface ElectoralProvenance {
  territoryId: string;
  year: number;
  metricKeys: string[];
  datasets: string[];
  evidenceHashes: string[];
}

export interface ElectionTerritoryYearAnalysis {
  year: number;
  decisiveRound: number | null;
  electorate: number | null;
  turnout: number | null;
  abstention: number | null;
  turnoutRate: number | null;
  abstentionRate: number | null;
  validVotes: number | null;
  winner: string | null;
  winnerParty: string | null;
  winnerVotes: number | null;
  winnerStatus: string | null;
  runnerUp: string | null;
  runnerUpParty: string | null;
  runnerUpVotes: number | null;
  marginVotes: number | null;
  marginPercentagePoints: number | null;
  electorateIdentityValid: boolean | null;
  provenance: ElectoralProvenance;
}

export interface ElectoralHistoricalPoint {
  year: number;
  electorate: number | null;
  turnout: number | null;
  abstention: number | null;
  turnoutRate: number | null;
  marginVotes: number | null;
  marginPercentagePoints: number | null;
  electorateChange: number | null;
  turnoutChange: number | null;
  abstentionChange: number | null;
  turnoutRateChange: number | null;
  marginVotesChange: number | null;
  marginPercentagePointsChange: number | null;
}

export interface ElectionTerritoryAnalysis {
  territory: ElectoralAnalyticsTerritory;
  elections: ElectionTerritoryYearAnalysis[];
  latestElection: ElectionTerritoryYearAnalysis | null;
  historicalEvolution: ElectoralHistoricalPoint[];
  electoralParticipation: Array<{ year: number; turnoutRate: number | null; abstentionRate: number | null }>;
  electoralCompetition: Array<{ year: number; marginVotes: number | null; marginPercentagePoints: number | null }>;
  partyHistory: { sequence: Array<{ year: number; party: string | null }>; winnerPartyChanges: number };
  winnerHistory: { sequence: Array<{ year: number; winner: string | null }>; winnerChanges: number };
  decisiveRounds: { firstRound: number; secondRound: number; unavailable: number };
  provenance: ElectoralProvenance;
}

export interface ElectoralSampleBenchmark {
  year: number;
  sampleLabel: 'amostra homologada de seis municípios';
  averages: {
    turnoutRate: number | null;
    abstentionRate: number | null;
    marginVotes: number | null;
    marginPercentagePoints: number | null;
    electorate: number | null;
    validVotes: number | null;
    decisiveRound: number | null;
  };
  territories: Array<{
    codigoIbge: string;
    municipio: string;
    turnoutRate: number | null;
    abstentionRate: number | null;
    marginVotes: number | null;
    marginPercentagePoints: number | null;
    electorate: number | null;
    validVotes: number | null;
    decisiveRound: number | null;
  }>;
}

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function metaNumber(row: ElectoralAnalyticsIndicator, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = finite(row.metadata?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function metaText(row: ElectoralAnalyticsIndicator, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = text(row.metadata?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function yearOf(row: ElectoralAnalyticsIndicator): number | null {
  return metaNumber(row, 'year', 'ano') ?? finite(row.periodo_inicio?.slice(0, 4));
}

function isMayor(row: ElectoralAnalyticsIndicator): boolean {
  return metaText(row, 'office', 'cargo')?.toLocaleLowerCase('pt-BR') === 'prefeito';
}

function total(rows: ElectoralAnalyticsIndicator[], prefix: string, year: number, round: number): ElectoralAnalyticsIndicator | undefined {
  return rows.find((row) => row.indicador.startsWith(`${prefix}_${year}_t${round}_c11`) && isMayor(row));
}

function divide(numerator: number | null, denominator: number | null): number | null {
  return numerator === null || denominator === null || denominator <= 0 ? null : (numerator / denominator) * 100;
}

function delta(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : current - previous;
}

function provenance(
  territoryId: string,
  year: number,
  rows: ElectoralAnalyticsIndicator[],
  evidence: ElectoralAnalyticsEvidence[]
): ElectoralProvenance {
  const metricKeys = [...new Set(rows.map((row) => row.indicador))].sort();
  const datasets = [...new Set(rows.map((row) => row.source_dataset).filter((value): value is string => Boolean(value)))].sort();
  const evidenceHashes = [...new Set(evidence
    .filter((item) => item.territory_id === territoryId && datasets.includes(item.source_external_id))
    .map((item) => item.source_hash))].sort();
  return { territoryId, year, metricKeys, datasets, evidenceHashes };
}

export function analyzeElectionYear(
  territoryId: string,
  rows: ElectoralAnalyticsIndicator[],
  evidence: ElectoralAnalyticsEvidence[],
  year: number
): ElectionTerritoryYearAnalysis {
  const yearRows = rows.filter((row) => yearOf(row) === year);
  const candidates = yearRows.filter((row) => row.indicador.startsWith(`resultado_candidato_${year}_`) && isMayor(row));
  const rounds = candidates.map((row) => metaNumber(row, 'round', 'turno')).filter((value): value is number => value !== null);
  const decisiveRound = rounds.length ? Math.max(...rounds) : null;
  const decisiveCandidates = decisiveRound === null ? [] : candidates
    .filter((row) => metaNumber(row, 'round', 'turno') === decisiveRound)
    .sort((a, b) => (finite(b.valor) ?? -1) - (finite(a.valor) ?? -1) || a.indicador.localeCompare(b.indicador));
  const winner = decisiveCandidates[0];
  const runnerUp = decisiveCandidates[1];
  const sourceRows = decisiveRound === null ? yearRows : [
    ...yearRows.filter((row) => row.indicador.includes(`_${year}_t${decisiveRound}_c11`)),
    ...decisiveCandidates.slice(0, 2),
  ];
  const electorateRow = decisiveRound === null ? undefined : total(rows, 'eleitorado_total', year, decisiveRound);
  const turnoutRow = decisiveRound === null ? undefined : total(rows, 'comparecimento_total', year, decisiveRound);
  const abstentionRow = decisiveRound === null ? undefined : total(rows, 'abstencao_total', year, decisiveRound);
  const validRow = decisiveRound === null ? undefined : total(rows, 'votos_validos_total', year, decisiveRound);
  const electorate = finite(electorateRow?.valor);
  const turnout = finite(turnoutRow?.valor);
  const abstention = finite(abstentionRow?.valor);
  const winnerVotes = finite(winner?.valor);
  const runnerUpVotes = finite(runnerUp?.valor);
  const winnerPercentage = winner ? metaNumber(winner, 'percentage') : null;
  const runnerPercentage = runnerUp ? metaNumber(runnerUp, 'percentage') : null;
  return {
    year,
    decisiveRound,
    electorate,
    turnout,
    abstention,
    turnoutRate: divide(turnout, electorate),
    abstentionRate: divide(abstention, electorate),
    validVotes: finite(validRow?.valor),
    winner: winner ? metaText(winner, 'ballotName', 'candidateName') : null,
    winnerParty: winner ? metaText(winner, 'party') : null,
    winnerVotes,
    winnerStatus: winner ? metaText(winner, 'status') : null,
    runnerUp: runnerUp ? metaText(runnerUp, 'ballotName', 'candidateName') : null,
    runnerUpParty: runnerUp ? metaText(runnerUp, 'party') : null,
    runnerUpVotes,
    marginVotes: winnerVotes === null || runnerUpVotes === null ? null : winnerVotes - runnerUpVotes,
    marginPercentagePoints: winnerPercentage === null || runnerPercentage === null ? null : winnerPercentage - runnerPercentage,
    electorateIdentityValid: electorate === null || turnout === null || abstention === null ? null : turnout + abstention === electorate,
    provenance: provenance(territoryId, year, sourceRows, evidence),
  };
}

export function buildElectionTerritoryAnalysis(
  territory: ElectoralAnalyticsTerritory,
  rows: ElectoralAnalyticsIndicator[],
  evidence: ElectoralAnalyticsEvidence[]
): ElectionTerritoryAnalysis {
  const elections = ELECTORAL_ANALYTICS_YEARS.map((year) => analyzeElectionYear(territory.id, rows, evidence, year));
  const historicalEvolution = elections.map((item, index) => {
    const previous = elections[index - 1];
    return {
      year: item.year,
      electorate: item.electorate,
      turnout: item.turnout,
      abstention: item.abstention,
      turnoutRate: item.turnoutRate,
      marginVotes: item.marginVotes,
      marginPercentagePoints: item.marginPercentagePoints,
      electorateChange: previous ? delta(item.electorate, previous.electorate) : null,
      turnoutChange: previous ? delta(item.turnout, previous.turnout) : null,
      abstentionChange: previous ? delta(item.abstention, previous.abstention) : null,
      turnoutRateChange: previous ? delta(item.turnoutRate, previous.turnoutRate) : null,
      marginVotesChange: previous ? delta(item.marginVotes, previous.marginVotes) : null,
      marginPercentagePointsChange: previous ? delta(item.marginPercentagePoints, previous.marginPercentagePoints) : null,
    };
  });
  const partySequence = elections.map((item) => ({ year: item.year, party: item.winnerParty }));
  const winnerSequence = elections.map((item) => ({ year: item.year, winner: item.winner }));
  const transitions = <T>(values: Array<T | null>) => values.slice(1).reduce((count, value, index) =>
    value !== null && values[index] !== null && value !== values[index] ? count + 1 : count, 0);
  const allRows = rows.filter((row) => ELECTORAL_ANALYTICS_YEARS.includes(yearOf(row) as (typeof ELECTORAL_ANALYTICS_YEARS)[number]));
  return {
    territory: { ...territory },
    elections,
    latestElection: [...elections].reverse().find((item) => item.electorate !== null || item.winner !== null) ?? null,
    historicalEvolution,
    electoralParticipation: elections.map((item) => ({ year: item.year, turnoutRate: item.turnoutRate, abstentionRate: item.abstentionRate })),
    electoralCompetition: elections.map((item) => ({ year: item.year, marginVotes: item.marginVotes, marginPercentagePoints: item.marginPercentagePoints })),
    partyHistory: { sequence: partySequence, winnerPartyChanges: transitions(partySequence.map((item) => item.party)) },
    winnerHistory: { sequence: winnerSequence, winnerChanges: transitions(winnerSequence.map((item) => item.winner)) },
    decisiveRounds: {
      firstRound: elections.filter((item) => item.decisiveRound === 1).length,
      secondRound: elections.filter((item) => item.decisiveRound === 2).length,
      unavailable: elections.filter((item) => item.decisiveRound === null).length,
    },
    provenance: provenance(territory.id, 0, allRows, evidence),
  };
}

function average(values: Array<number | null>): number | null {
  const available = values.filter((value): value is number => value !== null);
  return available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null;
}

export function buildElectoralSampleBenchmarks(analyses: ElectionTerritoryAnalysis[]): ElectoralSampleBenchmark[] {
  return ELECTORAL_ANALYTICS_YEARS.map((year) => {
    const territories = analyses.map((analysis) => {
      const election = analysis.elections.find((item) => item.year === year);
      return {
        codigoIbge: analysis.territory.codigoIbge,
        municipio: analysis.territory.municipio,
        turnoutRate: election?.turnoutRate ?? null,
        abstentionRate: election?.abstentionRate ?? null,
        marginVotes: election?.marginVotes ?? null,
        marginPercentagePoints: election?.marginPercentagePoints ?? null,
        electorate: election?.electorate ?? null,
        validVotes: election?.validVotes ?? null,
        decisiveRound: election?.decisiveRound ?? null,
      };
    }).sort((a, b) => a.codigoIbge.localeCompare(b.codigoIbge));
    return {
      year,
      sampleLabel: 'amostra homologada de seis municípios',
      averages: {
        turnoutRate: average(territories.map((item) => item.turnoutRate)),
        abstentionRate: average(territories.map((item) => item.abstentionRate)),
        marginVotes: average(territories.map((item) => item.marginVotes)),
        marginPercentagePoints: average(territories.map((item) => item.marginPercentagePoints)),
        electorate: average(territories.map((item) => item.electorate)),
        validVotes: average(territories.map((item) => item.validVotes)),
        decisiveRound: average(territories.map((item) => item.decisiveRound)),
      },
      territories,
    };
  });
}
