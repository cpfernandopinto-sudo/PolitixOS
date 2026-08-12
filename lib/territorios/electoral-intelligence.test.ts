import { describe, expect, it } from 'vitest';
import type { ElectionTerritoryAnalysis, ElectionTerritoryYearAnalysis, ElectoralSampleBenchmark } from './electoral-analytics';
import { buildElectoralSampleRankings, buildElectoralTerritoryIntelligence } from './electoral-intelligence';

const forbidden = ['esquerda', 'direita', 'centro', 'polarização', 'hegemonia', 'rejeição', 'favoritismo', 'risco eleitoral', 'oportunidade eleitoral', 'força política', 'fraqueza política', 'tendência de vitória', 'probabilidade eleitoral', 'recomendação', 'estratégia', 'narrativa'];

function election(year: number, values: Partial<ElectionTerritoryYearAnalysis> = {}): ElectionTerritoryYearAnalysis {
  return {
    year, decisiveRound: 1, electorate: 1000, turnout: 800, abstention: 200,
    turnoutRate: 80, abstentionRate: 20, validVotes: 760, winner: `Pessoa ${year}`,
    winnerParty: `P${year}`, winnerVotes: 500, winnerStatus: 'ELEITO', runnerUp: `Segundo ${year}`,
    runnerUpParty: 'ZZ', runnerUpVotes: 260, marginVotes: 240, marginPercentagePoints: 30,
    electorateIdentityValid: true,
    provenance: { territoryId: 'territory-1', year, metricKeys: [`metric-${year}`], datasets: [`dataset-${year}`], evidenceHashes: [`hash-${year}`] },
    ...values,
  };
}

function analysis(elections: ElectionTerritoryYearAnalysis[], municipio = 'Contagem', codigoIbge = '3118601'): ElectionTerritoryAnalysis {
  return {
    territory: { id: 'territory-1', codigoIbge, municipio, uf: 'MG' }, elections,
    latestElection: elections.at(-1) ?? null, historicalEvolution: [], electoralParticipation: [], electoralCompetition: [],
    partyHistory: { sequence: elections.map(({ year, winnerParty: party }) => ({ year, party })), winnerPartyChanges: 0 },
    winnerHistory: { sequence: elections.map(({ year, winner }) => ({ year, winner })), winnerChanges: 0 },
    decisiveRounds: { firstRound: 0, secondRound: 0, unavailable: 0 },
    provenance: { territoryId: 'territory-1', year: 0, metricKeys: ['all'], datasets: ['all'], evidenceHashes: ['all'] },
  };
}

function benchmarks(rows: ElectionTerritoryYearAnalysis[]): ElectoralSampleBenchmark[] {
  return rows.map((row) => ({
    year: row.year, sampleLabel: 'amostra homologada de seis municípios',
    averages: { turnoutRate: 75, abstentionRate: 25, marginVotes: 200, marginPercentagePoints: 20, electorate: 1000, validVotes: 700, decisiveRound: 1 },
    territories: [{ codigoIbge: '3118601', municipio: 'Contagem', turnoutRate: row.turnoutRate, abstentionRate: row.abstentionRate, marginVotes: row.marginVotes, marginPercentagePoints: row.marginPercentagePoints, electorate: row.electorate, validVotes: row.validVotes, decisiveRound: row.decisiveRound }],
  }));
}

const find = (result: ReturnType<typeof buildElectoralTerritoryIntelligence>, type: string, fromYear?: number, toYear?: number) =>
  result.signals.find((item) => item.signalType === type && (fromYear === undefined || item.period.fromYear === fromYear) && (toYear === undefined || item.period.toYear === toYear));

describe('inteligência eleitoral territorial determinística', () => {
  it('calcula deltas de participação, abstenção, eleitorado e margem para os três intervalos', () => {
    const rows = [election(2024, { electorate: 1200, turnoutRate: 70, abstentionRate: 30, marginPercentagePoints: 25 }), election(2016), election(2020, { electorate: 1100, turnoutRate: 80, abstentionRate: 20, marginPercentagePoints: 10 })];
    const result = buildElectoralTerritoryIntelligence(analysis(rows), benchmarks(rows));
    expect(result.facts.map((item) => item.year)).toEqual([2016, 2020, 2024]);
    expect(find(result, 'ELECTORATE_INCREASED', 2016, 2020)).toMatchObject({ delta: 100, comparison: 1000, value: 1100 });
    expect(find(result, 'PARTICIPATION_DECREASED', 2020, 2024)?.delta).toBe(-10);
    expect(find(result, 'ABSTENTION_INCREASED', 2020, 2024)?.delta).toBe(10);
    expect(find(result, 'MARGIN_NARROWED', 2016, 2020)?.delta).toBe(-20);
    expect(find(result, 'MARGIN_EXPANDED', 2020, 2024)?.delta).toBe(15);
    expect(result.comparisons).toHaveLength(12);
    expect(result.comparisons.find((item) => item.metric === 'electorate' && item.fromYear === 2016 && item.toYear === 2024)?.relativeDelta).toBe(20);
  });

  it('usa UNCHANGED_EXACTLY sem threshold arbitrário', () => {
    const rows = [election(2016), election(2020), election(2024)];
    const result = buildElectoralTerritoryIntelligence(analysis(rows), benchmarks(rows));
    expect(find(result, 'PARTICIPATION_UNCHANGED_EXACTLY', 2016, 2020)).toBeTruthy();
    expect(find(result, 'MARGIN_UNCHANGED_EXACTLY', 2020, 2024)).toBeTruthy();
  });

  it('distingue vencedor de partido e detecta mudança/manutenção de turno', () => {
    const rows = [
      election(2016, { winner: 'A', winnerParty: 'P1', decisiveRound: 2 }),
      election(2020, { winner: 'A', winnerParty: 'P2', decisiveRound: 2 }),
      election(2024, { winner: 'B', winnerParty: 'P2', decisiveRound: 1 }),
    ];
    const result = buildElectoralTerritoryIntelligence(analysis(rows), benchmarks(rows));
    expect(find(result, 'WINNER_MAINTAINED', 2016, 2020)).toBeTruthy();
    expect(find(result, 'WINNING_PARTY_CHANGED', 2016, 2020)).toBeTruthy();
    expect(find(result, 'WINNER_CHANGED', 2020, 2024)).toBeTruthy();
    expect(find(result, 'WINNING_PARTY_MAINTAINED', 2020, 2024)).toBeTruthy();
    expect(find(result, 'DECISION_ROUND_UNCHANGED', 2016, 2020)).toBeTruthy();
    expect(find(result, 'DECISION_MOVED_TO_FIRST_ROUND', 2020, 2024)).toBeTruthy();
  });

  it('compara somente métricas úteis com o benchmark rotulado', () => {
    const rows = [election(2016), election(2020), election(2024, { turnoutRate: 76, abstentionRate: 24, marginPercentagePoints: 20 })];
    const result = buildElectoralTerritoryIntelligence(analysis(rows), benchmarks(rows));
    expect(find(result, 'ABOVE_SAMPLE_PARTICIPATION', undefined, 2024)?.delta).toBe(1);
    expect(find(result, 'BELOW_SAMPLE_ABSTENTION', undefined, 2024)?.delta).toBe(-1);
    expect(find(result, 'AT_SAMPLE_MARGIN', undefined, 2024)?.delta).toBe(0);
    expect(result.benchmarkSignals.some((item) => item.metric === 'electorate')).toBe(false);
  });

  it('produz highest/lowest factual em 2024 e desempata por IBGE', () => {
    const benchmark: ElectoralSampleBenchmark = { year: 2024, sampleLabel: 'amostra homologada de seis municípios', averages: { turnoutRate: 75, abstentionRate: 25, marginVotes: 10, marginPercentagePoints: 10, electorate: 1, validVotes: 1, decisiveRound: 1 }, territories: [
      { codigoIbge: '2', municipio: 'B', turnoutRate: 70, abstentionRate: 30, marginVotes: 5, marginPercentagePoints: 5, electorate: 1, validVotes: 1, decisiveRound: 1 },
      { codigoIbge: '1', municipio: 'A', turnoutRate: 80, abstentionRate: 20, marginVotes: 7, marginPercentagePoints: 20, electorate: 1, validVotes: 1, decisiveRound: 1 },
    ] };
    const ranking = buildElectoralSampleRankings(benchmark);
    expect(ranking).toHaveLength(3);
    expect(ranking[0]).toMatchObject({ year: 2024, sampleLabel: 'amostra homologada de seis municípios', highest: { municipio: 'A' }, lowest: { municipio: 'B' } });
    expect(ranking[1]).toMatchObject({ highest: { municipio: 'B' }, lowest: { municipio: 'A' } });
    expect(buildElectoralSampleRankings({ ...benchmark, year: 2020 })).toEqual([]);
  });

  it('não emite sinal com valor ausente ou provenance incompleta', () => {
    const rows = [election(2016), election(2020, { turnoutRate: null }), election(2024, { provenance: { territoryId: 'territory-1', year: 2024, metricKeys: [], datasets: [], evidenceHashes: [] } })];
    const result = buildElectoralTerritoryIntelligence(analysis(rows), benchmarks(rows));
    expect(result.signals.some((item) => item.period.toYear === 2024)).toBe(false);
    expect(result.comparisons.some((item) => item.metric === 'turnoutRate' && item.toYear === 2020)).toBe(false);
    expect(result.signals.every((item) => item.provenance.territoryId && item.provenance.metricKeys.length && item.provenance.datasets.length && item.provenance.evidenceHashes.length)).toBe(true);
  });

  it('não muta a entrada, é determinístico e não produz interpretação proibida', () => {
    const rows = [election(2016), election(2020), election(2024)];
    const input = analysis(rows);
    const snapshot = structuredClone(input);
    const first = buildElectoralTerritoryIntelligence(input, benchmarks(rows));
    const second = buildElectoralTerritoryIntelligence(input, benchmarks(rows));
    expect(input).toEqual(snapshot);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    const serialized = JSON.stringify(first).toLocaleLowerCase('pt-BR');
    expect(forbidden.filter((term) => serialized.includes(term))).toEqual([]);
    expect(first.signals.every((item) => item.origin === 'COMPARATIVE_SIGNAL')).toBe(true);
  });

  it('regride Contagem: participação, margem, vencedor, partido e turno', () => {
    const rows = [
      election(2016, { electorate: 456931, turnout: 361858, abstention: 95073, turnoutRate: 79.193, abstentionRate: 20.807, winner: 'ALEX DE FREITAS', winnerParty: 'PSDB', marginPercentagePoints: 45.918, decisiveRound: 2 }),
      election(2020, { electorate: 427575, turnout: 329489, abstention: 98086, turnoutRate: 77.060, abstentionRate: 22.940, winner: 'MARÍLIA', winnerParty: 'PT', marginPercentagePoints: 2.704, decisiveRound: 2 }),
      election(2024, { electorate: 459110, turnout: 352354, abstention: 106756, turnoutRate: 76.747, abstentionRate: 23.253, winner: 'MARÍLIA', winnerParty: 'PT', marginPercentagePoints: 21.753, decisiveRound: 1 }),
    ];
    const result = buildElectoralTerritoryIntelligence(analysis(rows), benchmarks(rows));
    expect(find(result, 'PARTICIPATION_DECREASED', 2016, 2020)).toBeTruthy();
    expect(find(result, 'PARTICIPATION_DECREASED', 2020, 2024)).toBeTruthy();
    expect(find(result, 'WINNING_PARTY_CHANGED', 2016, 2020)).toBeTruthy();
    expect(find(result, 'WINNING_PARTY_MAINTAINED', 2020, 2024)).toBeTruthy();
    expect(find(result, 'WINNER_CHANGED', 2016, 2020)).toBeTruthy();
    expect(find(result, 'WINNER_MAINTAINED', 2020, 2024)).toBeTruthy();
    expect(find(result, 'MARGIN_NARROWED', 2016, 2020)?.delta).toBeCloseTo(-43.214, 6);
    expect(find(result, 'MARGIN_EXPANDED', 2020, 2024)?.delta).toBeCloseTo(19.049, 6);
    expect(find(result, 'DECISION_MOVED_TO_FIRST_ROUND', 2020, 2024)).toBeTruthy();
  });

  it('regride Belo Horizonte distinguindo candidato e partido', () => {
    const rows = [election(2016, { winner: 'KALIL', winnerParty: 'PHS', marginPercentagePoints: 5.964, decisiveRound: 2 }), election(2020, { winner: 'KALIL', winnerParty: 'PSD', marginPercentagePoints: 53.410, decisiveRound: 1 }), election(2024, { winner: 'FUAD NOMAN', winnerParty: 'PSD', marginPercentagePoints: 7.454, decisiveRound: 2 })];
    const result = buildElectoralTerritoryIntelligence(analysis(rows, 'Belo Horizonte', '3106200'), benchmarks(rows));
    expect(find(result, 'WINNER_CHANGED', 2020, 2024)).toBeTruthy();
    expect(find(result, 'WINNING_PARTY_MAINTAINED', 2020, 2024)).toBeTruthy();
    expect(find(result, 'DECISION_MOVED_TO_RUNOFF', 2020, 2024)).toBeTruthy();
  });

  it('regride Betim distinguindo manutenção do vencedor e mudança partidária', () => {
    const rows = [election(2016, { winner: 'VITTORIO MEDIOLI', winnerParty: 'PHS', marginPercentagePoints: 46.199 }), election(2020, { winner: 'VITTORIO MEDIOLI', winnerParty: 'PSD', marginPercentagePoints: 61.934 }), election(2024, { winner: 'HERON GUIMARAES', winnerParty: 'UNIÃO', marginPercentagePoints: 14.236 })];
    const result = buildElectoralTerritoryIntelligence(analysis(rows, 'Betim', '3106705'), benchmarks(rows));
    expect(find(result, 'WINNER_MAINTAINED', 2016, 2020)).toBeTruthy();
    expect(find(result, 'WINNING_PARTY_CHANGED', 2016, 2020)).toBeTruthy();
    expect(find(result, 'WINNER_CHANGED', 2020, 2024)).toBeTruthy();
    expect(find(result, 'WINNING_PARTY_CHANGED', 2020, 2024)).toBeTruthy();
  });
});
