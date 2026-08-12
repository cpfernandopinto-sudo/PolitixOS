import type { TseSourceDescriptor } from './tse-client';

export interface TseTerritoryKey {
  codigoIbge: string;
  codigoTse: string;
  municipio: string;
  uf: string;
}

export interface TseElectionTotals {
  year: number;
  electionType: string;
  round: number;
  officeCode: string;
  office: string;
  electorate: number;
  turnout: number;
  abstention: number;
  validVotes: number;
  blankVotes: number;
  nullVotes: number;
  sourceRecordIds: string[];
}

export interface TseCandidateResult {
  year: number;
  round: number;
  officeCode: string;
  office: string;
  candidateId: string;
  candidateNumber: string;
  candidateName: string;
  ballotName: string;
  partyNumber: string;
  party: string;
  partyName: string;
  votes: number;
  validVotes: number;
  percentage: number;
  statusCode: string;
  status: string;
}

export interface TsePartyResult {
  year: number;
  round: number;
  officeCode: string;
  office: string;
  partyNumber: string;
  party: string;
  partyName: string;
  nominalVotes: number;
  legendVotes: number;
  totalVotes: number;
}

export interface TseCouncilComposition {
  year: number;
  party: string;
  seats: number;
  percentage: number;
}

export interface TseMayoralOutcome {
  year: number;
  decisiveRound: number;
  winner: TseCandidateResult;
  runnerUp: TseCandidateResult;
  marginVotes: number;
  marginPercentagePoints: number;
  officialStatusValidated: boolean;
}

export interface TerritorialElectionDataset {
  metadata: {
    engine: 'TSE';
    version: string;
    collectedAt: string;
    referenceYears: number[];
    sourceMode: 'REAL';
  };
  territory: TseTerritoryKey;
  sources: TseSourceDescriptor[];
  totals: TseElectionTotals[];
  results: TseCandidateResult[];
  parties: TsePartyResult[];
  councilComposition: TseCouncilComposition[];
}

function number(row: Record<string, string>, key: string): number {
  const value = Number(row[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function sameTerritory(row: Record<string, string>, territory: TseTerritoryKey): boolean {
  return row.SG_UF === territory.uf && row.CD_MUNICIPIO === territory.codigoTse;
}

function key(row: Record<string, string>, parts: string[]): string {
  return parts.map((part) => row[part] ?? '').join('|');
}

export function aggregateElectionTotals(rows: Record<string, string>[], territory: TseTerritoryKey): TseElectionTotals[] {
  const aggregate = new Map<string, TseElectionTotals>();
  for (const row of rows) {
    if (!sameTerritory(row, territory)) continue;
    const aggregateKey = key(row, ['ANO_ELEICAO', 'NR_TURNO', 'CD_CARGO']);
    const current = aggregate.get(aggregateKey) ?? {
      year: number(row, 'ANO_ELEICAO'),
      electionType: row.DS_ELEICAO || row.NM_TIPO_ELEICAO,
      round: number(row, 'NR_TURNO'),
      officeCode: row.CD_CARGO,
      office: row.DS_CARGO,
      electorate: 0,
      turnout: 0,
      abstention: 0,
      validVotes: 0,
      blankVotes: 0,
      nullVotes: 0,
      sourceRecordIds: [],
    };
    current.electorate += number(row, 'QT_APTOS');
    current.turnout += number(row, 'QT_COMPARECIMENTO');
    current.abstention += number(row, 'QT_ABSTENCOES');
    current.validVotes += number(row, 'QT_TOTAL_VOTOS_VALIDOS');
    current.blankVotes += number(row, 'QT_VOTOS_BRANCOS');
    current.nullVotes += number(row, 'QT_TOTAL_VOTOS_NULOS') || number(row, 'QT_VOTOS_NULOS');
    current.sourceRecordIds.push(`${row.CD_MUNICIPIO}:${row.NR_ZONA}:${row.CD_CARGO}:${row.NR_TURNO}`);
    aggregate.set(aggregateKey, current);
  }
  return [...aggregate.values()].sort((a, b) => a.year - b.year || a.round - b.round || a.office.localeCompare(b.office));
}

export function aggregateCandidateResults(
  rows: Record<string, string>[],
  territory: TseTerritoryKey,
  validVotesByOffice: Map<string, number>
): TseCandidateResult[] {
  const aggregate = new Map<string, TseCandidateResult>();
  for (const row of rows) {
    if (!sameTerritory(row, territory)) continue;
    const aggregateKey = key(row, ['ANO_ELEICAO', 'NR_TURNO', 'CD_CARGO', 'SQ_CANDIDATO']);
    const officeKey = key(row, ['ANO_ELEICAO', 'NR_TURNO', 'CD_CARGO']);
    const validVotes = validVotesByOffice.get(officeKey) ?? 0;
    const current = aggregate.get(aggregateKey) ?? {
      year: number(row, 'ANO_ELEICAO'),
      round: number(row, 'NR_TURNO'),
      officeCode: row.CD_CARGO,
      office: row.DS_CARGO,
      candidateId: row.SQ_CANDIDATO,
      candidateNumber: row.NR_CANDIDATO,
      candidateName: row.NM_CANDIDATO,
      ballotName: row.NM_URNA_CANDIDATO,
      partyNumber: row.NR_PARTIDO,
      party: row.SG_PARTIDO,
      partyName: row.NM_PARTIDO,
      votes: 0,
      validVotes,
      percentage: 0,
      statusCode: row.CD_SIT_TOT_TURNO,
      status: row.DS_SIT_TOT_TURNO,
    };
    current.votes += number(row, 'QT_VOTOS_NOMINAIS_VALIDOS') || number(row, 'QT_VOTOS_NOMINAIS');
    aggregate.set(aggregateKey, current);
  }
  return [...aggregate.values()]
    .map((result) => ({ ...result, percentage: result.validVotes > 0 ? (result.votes / result.validVotes) * 100 : 0 }))
    .sort((a, b) => a.year - b.year || a.round - b.round || a.office.localeCompare(b.office) || b.votes - a.votes);
}

export function aggregatePartyResults(rows: Record<string, string>[], territory: TseTerritoryKey): TsePartyResult[] {
  const aggregate = new Map<string, TsePartyResult>();
  for (const row of rows) {
    if (!sameTerritory(row, territory)) continue;
    const aggregateKey = key(row, ['ANO_ELEICAO', 'NR_TURNO', 'CD_CARGO', 'NR_PARTIDO']);
    const current = aggregate.get(aggregateKey) ?? {
      year: number(row, 'ANO_ELEICAO'),
      round: number(row, 'NR_TURNO'),
      officeCode: row.CD_CARGO,
      office: row.DS_CARGO,
      partyNumber: row.NR_PARTIDO,
      party: row.SG_PARTIDO,
      partyName: row.NM_PARTIDO,
      nominalVotes: 0,
      legendVotes: 0,
      totalVotes: 0,
    };
    current.nominalVotes += number(row, 'QT_VOTOS_NOMINAIS_VALIDOS');
    current.legendVotes += number(row, 'QT_TOTAL_VOTOS_LEG_VALIDOS') || number(row, 'QT_VOTOS_LEGENDA_VALIDOS');
    current.totalVotes = current.nominalVotes + current.legendVotes;
    aggregate.set(aggregateKey, current);
  }
  return [...aggregate.values()].sort((a, b) => a.year - b.year || a.office.localeCompare(b.office) || b.totalVotes - a.totalVotes);
}

export function buildCouncilComposition(results: TseCandidateResult[], year: number): TseCouncilComposition[] {
  const elected = results.filter(
    (result) =>
      result.year === year &&
      result.office.toLowerCase() === 'vereador' &&
      /^ELEITO(?:$|\s)/i.test(result.status.trim())
  );
  const seats = new Map<string, number>();
  for (const result of elected) seats.set(result.party, (seats.get(result.party) ?? 0) + 1);
  const total = elected.length;
  return [...seats.entries()]
    .map(([party, count]) => ({ year, party, seats: count, percentage: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.seats - a.seats || a.party.localeCompare(b.party));
}

export function deriveMayoralOutcome(results: TseCandidateResult[], year: number): TseMayoralOutcome | null {
  const mayoral = results.filter((result) => result.year === year && result.office.toLocaleLowerCase('pt-BR') === 'prefeito');
  if (!mayoral.length) return null;
  const decisiveRound = Math.max(...mayoral.map((result) => result.round));
  const ranked = mayoral.filter((result) => result.round === decisiveRound).sort((a, b) => b.votes - a.votes || a.candidateId.localeCompare(b.candidateId));
  if (ranked.length < 2) return null;
  const elected = ranked.filter((result) => /^ELEITO(?:$|\s)/i.test(result.status.trim()));
  return {
    year,
    decisiveRound,
    winner: ranked[0],
    runnerUp: ranked[1],
    marginVotes: ranked[0].votes - ranked[1].votes,
    marginPercentagePoints: ranked[0].percentage - ranked[1].percentage,
    officialStatusValidated: elected.length === 1 && elected[0].candidateId === ranked[0].candidateId,
  };
}
