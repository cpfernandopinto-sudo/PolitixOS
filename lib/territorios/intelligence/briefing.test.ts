import { describe, expect, it } from 'vitest';
import { buildTerritoryExecutiveBriefing } from './briefing';
import { buildCagedFacts } from './economy/caged-facts';
import { buildCagedEmploymentSignals } from './economy/caged-employment-signals';
import type { CagedAdapterPoint } from './economy/caged-adapter';
import type { ElectionTerritoryAnalysis, ElectionTerritoryYearAnalysis } from '../electoral-analytics';
import { buildElectoralTerritoryIntelligence } from '../electoral-intelligence';
import { buildElectoralFacts } from './electoral/electoral-facts';
import { buildElectoralAnalyticalSignals } from './electoral/electoral-signals';

function point(referenceMonth: string, balance: number): CagedAdapterPoint {
  return { referenceMonth, admissions: 1000, dismissals: 1000 - balance, balance, metadata: { aggregate_hash: `hash-${referenceMonth}` } };
}

const ACCELERATING_SERIES: CagedAdapterPoint[] = [
  point('202506', 50), point('202507', -20), point('202508', 10), point('202509', 40),
  point('202510', 30), point('202511', -10), point('202512', -200), point('202601', 20),
  point('202602', 60), point('202603', 80), point('202604', 100), point('202605', 300), point('202606', 700),
];

function election(year: number, values: Partial<ElectionTerritoryYearAnalysis> = {}): ElectionTerritoryYearAnalysis {
  return {
    year, decisiveRound: 1, electorate: 1000, turnout: 800, abstention: 200,
    turnoutRate: 80, abstentionRate: 20, validVotes: 760, winner: `Pessoa ${year}`,
    winnerParty: `P${year}`, winnerVotes: 500, winnerStatus: 'ELEITO', runnerUp: `Segundo ${year}`,
    runnerUpParty: 'ZZ', runnerUpVotes: 260, marginVotes: 240, marginPercentagePoints: 30,
    electorateIdentityValid: true,
    provenance: { territoryId: 't1', year, metricKeys: [`metric-${year}`], datasets: [`dataset-${year}`], evidenceHashes: [`hash-${year}`] },
    ...values,
  };
}

function analysis(elections: ElectionTerritoryYearAnalysis[]): ElectionTerritoryAnalysis {
  return {
    territory: { id: 't1', codigoIbge: '3118601', municipio: 'Contagem', uf: 'MG' }, elections,
    latestElection: elections.at(-1) ?? null, historicalEvolution: [], electoralParticipation: [], electoralCompetition: [],
    partyHistory: { sequence: elections.map(({ year, winnerParty: party }) => ({ year, party })), winnerPartyChanges: 0 },
    winnerHistory: { sequence: elections.map(({ year, winner }) => ({ year, winner })), winnerChanges: 0 },
    decisiveRounds: { firstRound: 0, secondRound: 0, unavailable: 0 },
    provenance: { territoryId: 't1', year: 0, metricKeys: ['all'], datasets: ['all'], evidenceHashes: ['all'] },
  };
}

describe('buildTerritoryExecutiveBriefing — INTEL-DOMAIN-02 Missão E', () => {
  it('nenhum fact/signal produz um briefing vazio, sem erro e com llmSynthesis explicitamente null', () => {
    const briefing = buildTerritoryExecutiveBriefing('t1', [], []);
    expect(briefing.topSignals).toHaveLength(0);
    expect(briefing.whatChanged).toHaveLength(0);
    expect(briefing.attention).toHaveLength(0);
    expect(briefing.llmSynthesis).toBeNull();
  });

  it('sinal de desaceleração econômica entra em attention como RISK (nunca como OPPORTUNITY)', () => {
    // deltas: 507-506=-400, 508-507=-400, 509-508=-100 -> últimos dois deltas mesmo sinal (negativo), magnitude caindo (400 -> 100) => "desacelerando".
    const decelerating = [point('202506', 700), point('202507', 300), point('202508', -100), point('202509', -200)];
    const facts = buildCagedFacts('t1', decelerating);
    const signals = buildCagedEmploymentSignals('t1', facts);
    const briefing = buildTerritoryExecutiveBriefing('t1', facts, signals);
    const risk = briefing.attention.find((item) => item.signalId.includes('deterioration') || item.signalId.includes('decelerating'));
    expect(risk?.category).toBe('RISK');
    expect(briefing.attention.some((item) => item.category === 'OPPORTUNITY' && (item.signalId.includes('deterioration') || item.signalId.includes('decelerating')))).toBe(false);
  });

  it('sinal de aceleração econômica entra em attention como OPPORTUNITY', () => {
    const facts = buildCagedFacts('t1', ACCELERATING_SERIES);
    const signals = buildCagedEmploymentSignals('t1', facts);
    const briefing = buildTerritoryExecutiveBriefing('t1', facts, signals);
    const opportunity = briefing.attention.find((item) => item.signalId.includes('accelerating'));
    expect(opportunity?.category).toBe('OPPORTUNITY');
  });

  it('topSignals nunca excede 3 e whatChanged inclui os signals TREND/CHANGE', () => {
    const facts = buildCagedFacts('t1', ACCELERATING_SERIES);
    const signals = buildCagedEmploymentSignals('t1', facts);
    const briefing = buildTerritoryExecutiveBriefing('t1', facts, signals);
    expect(briefing.topSignals.length).toBeLessThanOrEqual(3);
    expect(briefing.whatChanged.length).toBe(signals.filter((s) => s.status === 'ACTIVE' && s.evidenceRefs.length > 0).length);
  });

  it('REGRA CRÍTICA — sinal eleitoral NUNCA entra em attention como RISK ou OPPORTUNITY, só como MONITOR quando factualmente relevante (mudança de vencedor)', () => {
    const rows = [
      election(2016, { winner: 'A', winnerParty: 'P1' }),
      election(2020, { winner: 'A', winnerParty: 'P1' }),
      election(2024, { winner: 'B', winnerParty: 'P2' }),
    ];
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), []);
    const facts = buildElectoralFacts(intelligence);
    const signals = buildElectoralAnalyticalSignals('t1', intelligence.signals, facts);
    const briefing = buildTerritoryExecutiveBriefing('t1', facts, signals);
    expect(briefing.attention.every((item) => item.category !== 'RISK' && item.category !== 'OPPORTUNITY')).toBe(true);
    expect(briefing.attention.some((item) => item.category === 'MONITOR' && item.signalId.includes('winner_changed'))).toBe(true);
  });

  it('REGRA CRÍTICA — sinal eleitoral de participação (comparecimento subiu/caiu) nunca entra em attention (não tem polaridade política)', () => {
    const rows = [election(2016), election(2020), election(2024, { turnoutRate: 60, abstentionRate: 40 })];
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), []);
    const facts = buildElectoralFacts(intelligence);
    const signals = buildElectoralAnalyticalSignals('t1', intelligence.signals, facts);
    const briefing = buildTerritoryExecutiveBriefing('t1', facts, signals);
    expect(briefing.attention.some((item) => item.signalId.includes('participation'))).toBe(false);
    expect(briefing.attention.some((item) => item.signalId.includes('abstention'))).toBe(false);
  });
});
