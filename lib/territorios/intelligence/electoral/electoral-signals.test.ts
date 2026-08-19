import { describe, expect, it } from 'vitest';
import type { ElectionTerritoryAnalysis, ElectionTerritoryYearAnalysis } from '../../electoral-analytics';
import { buildElectoralTerritoryIntelligence } from '../../electoral-intelligence';
import { buildElectoralFacts } from './electoral-facts';
import { buildElectoralAnalyticalSignals } from './electoral-signals';

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

function analysis(elections: ElectionTerritoryYearAnalysis[]): ElectionTerritoryAnalysis {
  return {
    territory: { id: 'territory-1', codigoIbge: '3118601', municipio: 'Contagem', uf: 'MG' }, elections,
    latestElection: elections.at(-1) ?? null, historicalEvolution: [], electoralParticipation: [], electoralCompetition: [],
    partyHistory: { sequence: elections.map(({ year, winnerParty: party }) => ({ year, party })), winnerPartyChanges: 0 },
    winnerHistory: { sequence: elections.map(({ year, winner }) => ({ year, winner })), winnerChanges: 0 },
    decisiveRounds: { firstRound: 0, secondRound: 0, unavailable: 0 },
    provenance: { territoryId: 'territory-1', year: 0, metricKeys: ['all'], datasets: ['all'], evidenceHashes: ['all'] },
  };
}

describe('buildElectoralAnalyticalSignals — INTEL-DOMAIN-02 Missão B', () => {
  it('array de signals vazio produz nenhum AnalyticalSignal, sem erro (caso negativo — missing evidence)', () => {
    expect(buildElectoralAnalyticalSignals('territory-1', [], [])).toHaveLength(0);
  });

  it('projeta PARTICIPATION_DECREASED/ABSTENTION_INCREASED/MARGIN_NARROWED como TREND com evidenceRefs resolvidos contra os Facts reais', () => {
    const rows = [election(2016), election(2020), election(2024, { electorate: 1200, turnoutRate: 70, abstentionRate: 30, marginPercentagePoints: 10 })];
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), []);
    const facts = buildElectoralFacts(intelligence);
    const signals = buildElectoralAnalyticalSignals('territory-1', intelligence.signals, facts);

    const participation = signals.find((s) => s.id.includes('participation_decreased'));
    expect(participation?.type).toBe('TREND');
    expect(participation?.confidence).toBe('DIRECTLY_SUPPORTED');
    expect(participation?.status).toBe('ACTIVE');
    expect(participation!.evidenceRefs.length).toBeGreaterThan(0);

    const abstention = signals.find((s) => s.id.includes('abstention_increased'));
    expect(abstention?.type).toBe('TREND');

    const margin = signals.find((s) => s.id.includes('margin_narrowed'));
    expect(margin?.type).toBe('TREND');
  });

  it('projeta WINNER_CHANGED/WINNING_PARTY_CHANGED/DECISION_MOVED_TO_* como CHANGE', () => {
    const rows = [
      election(2016, { winner: 'A', winnerParty: 'P1', decisiveRound: 2 }),
      election(2020, { winner: 'A', winnerParty: 'P2', decisiveRound: 2 }),
      election(2024, { winner: 'B', winnerParty: 'P2', decisiveRound: 1 }),
    ];
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), []);
    const facts = buildElectoralFacts(intelligence);
    const signals = buildElectoralAnalyticalSignals('territory-1', intelligence.signals, facts);
    expect(signals.find((s) => s.id.includes('winner_changed'))?.type).toBe('CHANGE');
    expect(signals.find((s) => s.id.includes('decision_moved_to_first_round'))?.type).toBe('CHANGE');
  });

  it('projeta ABOVE/BELOW_SAMPLE_* (benchmark) como DIVERGENCE', () => {
    const rows = [election(2016), election(2020), election(2024, { turnoutRate: 76, abstentionRate: 24, marginPercentagePoints: 20 })];
    const benchmarks = rows.map((row) => ({
      year: row.year, sampleLabel: 'amostra homologada de seis municípios' as const,
      averages: { turnoutRate: 75, abstentionRate: 25, marginVotes: 200, marginPercentagePoints: 20, electorate: 1000, validVotes: 700, decisiveRound: 1 },
      territories: [{ codigoIbge: '3118601', municipio: 'Contagem', turnoutRate: row.turnoutRate, abstentionRate: row.abstentionRate, marginVotes: row.marginVotes, marginPercentagePoints: row.marginPercentagePoints, electorate: row.electorate, validVotes: row.validVotes, decisiveRound: row.decisiveRound }],
    }));
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), benchmarks);
    const facts = buildElectoralFacts(intelligence);
    const signals = buildElectoralAnalyticalSignals('territory-1', intelligence.signals, facts);
    expect(signals.find((s) => s.id.includes('above_sample_participation'))?.type).toBe('DIVERGENCE');
  });

  it('CASO NEGATIVO — signal sem fact correspondente (ex.: metric desconhecida) fica INSUFFICIENT_EVIDENCE, confidence null, nunca DIRECTLY_SUPPORTED fabricado', () => {
    const orphanSignal = {
      signalType: 'PARTICIPATION_INCREASED' as const, origin: 'COMPARATIVE_SIGNAL' as const, metric: 'turnoutRate',
      period: { fromYear: 1999, toYear: 2003 }, value: 10, delta: 5, comparison: 5,
      provenance: { territoryId: 'territory-1', years: [1999, 2003], metricKeys: ['m'], datasets: ['d'], evidenceHashes: ['h'] },
    };
    const signals = buildElectoralAnalyticalSignals('territory-1', [orphanSignal], []);
    expect(signals).toHaveLength(1);
    expect(signals[0].status).toBe('INSUFFICIENT_EVIDENCE');
    expect(signals[0].confidence).toBeNull();
    expect(signals[0].evidenceRefs).toEqual([]);
    expect(signals[0].limitations.length).toBeGreaterThan(0);
  });

  it('nunca produz ELECTORAL_FRAGMENTATION/ELECTORAL_CONCENTRATION — a fonte não rastreia votos além de vencedor/segundo colocado', () => {
    const rows = [election(2016), election(2020), election(2024)];
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), []);
    const facts = buildElectoralFacts(intelligence);
    const signals = buildElectoralAnalyticalSignals('territory-1', intelligence.signals, facts);
    expect(signals.some((s) => /fragmentation|concentration/i.test(s.id))).toBe(false);
  });
});
