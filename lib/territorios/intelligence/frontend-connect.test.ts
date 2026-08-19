import { describe, expect, it } from 'vitest';
import type { ElectionTerritoryAnalysis, ElectionTerritoryYearAnalysis } from '../electoral-analytics';
import { buildElectoralTerritoryIntelligence } from '../electoral-intelligence';
import { buildTerritoryExecutiveBriefing } from './briefing';
import { buildTerritoryExecutiveSignals } from './command-center';
import type { AnalyticalSignal } from './contracts';
import { buildCagedEmploymentSignals } from './economy/caged-employment-signals';
import { buildCagedFacts } from './economy/caged-facts';
import { buildElectoralFacts } from './electoral/electoral-facts';
import { buildElectoralAnalyticalSignals } from './electoral/electoral-signals';
import { buildTerritoryRadar } from './radar';
import { buildSecurityFacts } from './security/security-facts';
import { buildSecurityIndicatorSignals } from './security/security-signals';

const territoryId = 'territory-contagem';
const cagedBalances = [50, -20, 10, 40, 30, -10, -200, 20, 60, 80, 100, 300, 700];
const cagedMonths = ['202506', '202507', '202508', '202509', '202510', '202511', '202512', '202601', '202602', '202603', '202604', '202605', '202606'];
const cagedPoints = cagedMonths.map((referenceMonth, index) => ({ referenceMonth, admissions: 1000, dismissals: 1000 - cagedBalances[index], balance: cagedBalances[index], metadata: { aggregate_hash: `caged-${index}` } }));
const securityPoints = Array.from({ length: 11 }, (_, index) => ({ period: `2025-${String(index + 1).padStart(2, '0')}`, value: index < 7 ? 20 : 30 + index * 10 }));

function election(year: number, turnoutRate: number): ElectionTerritoryYearAnalysis {
  return {
    year, decisiveRound: 1, electorate: 1000, turnout: turnoutRate * 10, abstention: 1000 - turnoutRate * 10,
    turnoutRate, abstentionRate: 100 - turnoutRate, validVotes: 700, winner: `Pessoa ${year}`, winnerParty: `P${year}`,
    winnerVotes: 500, winnerStatus: 'ELEITO', runnerUp: 'Segundo', runnerUpParty: 'ZZ', runnerUpVotes: 200,
    marginVotes: 300, marginPercentagePoints: 30, electorateIdentityValid: true,
    provenance: { territoryId, year, metricKeys: [`metric-${year}`], datasets: [`dataset-${year}`], evidenceHashes: [`hash-${year}`] },
  };
}

function electoralAnalysis(rows: ElectionTerritoryYearAnalysis[]): ElectionTerritoryAnalysis {
  return {
    territory: { id: territoryId, codigoIbge: '3118601', municipio: 'Contagem', uf: 'MG' }, elections: rows,
    latestElection: rows.at(-1)!, historicalEvolution: [], electoralParticipation: [], electoralCompetition: [],
    partyHistory: { sequence: rows.map((row) => ({ year: row.year, party: row.winnerParty })), winnerPartyChanges: 2 },
    winnerHistory: { sequence: rows.map((row) => ({ year: row.year, winner: row.winner })), winnerChanges: 2 },
    decisiveRounds: { firstRound: 3, secondRound: 0, unavailable: 0 },
    provenance: { territoryId, year: 2024, metricKeys: ['all'], datasets: ['all'], evidenceHashes: ['all'] },
  };
}

describe('INTELLIGENCE-FRONT-CONNECT-02 — contrato integrado', () => {
  it('conecta Economy/Electoral/Security Facts aos sinais executivos, briefing e radar', () => {
    const economyFacts = buildCagedFacts(territoryId, cagedPoints);
    const economySignals = buildCagedEmploymentSignals(territoryId, economyFacts);
    const intelligence = buildElectoralTerritoryIntelligence(electoralAnalysis([election(2016, 80), election(2020, 75), election(2024, 70)]), []);
    const electoralFacts = buildElectoralFacts(intelligence);
    const electoralSignals = buildElectoralAnalyticalSignals(territoryId, intelligence.signals, electoralFacts);
    const securityFacts = buildSecurityFacts(territoryId, 'indice_crimes_violentos', 'Índice de crimes violentos', securityPoints);
    const securitySignals = buildSecurityIndicatorSignals(territoryId, 'Índice de crimes violentos', securityFacts);
    const allFacts = [...economyFacts, ...electoralFacts, ...securityFacts];
    const allSignals = [...economySignals, ...electoralSignals, ...securitySignals];

    const executive = buildTerritoryExecutiveSignals(territoryId, { economySignals, electoralSignals, securitySignals });
    expect(executive.economy.status).toBe('AVAILABLE');
    expect(executive.electoral.status).toBe('AVAILABLE');
    expect(executive.security.status).toBe('AVAILABLE');
    expect(buildTerritoryExecutiveBriefing(territoryId, allFacts, allSignals).topSignals.length).toBeGreaterThan(0);
    expect(buildTerritoryRadar(territoryId, allSignals).length).toBeGreaterThan(0);
  });

  it('sem sinais ou com evidência ausente mostra estados vazios e não exige LLM', () => {
    const orphan: AnalyticalSignal = { id: 'orphan', territoryId, domains: ['economia'], type: 'TREND', priority: 'HIGH', severity: 'HIGH', title: 'Órfão', summary: 'Sem lastro', evidenceRefs: [], derivedIndicatorRefs: [], period: '2026-01', status: 'ACTIVE', confidence: null, limitations: [], methodId: 'test', methodVersion: '1' };
    const executive = buildTerritoryExecutiveSignals(territoryId, { economySignals: [orphan], electoralSignals: [], securitySignals: [] });
    expect(executive.economy.status).toBe('INSUFFICIENT_DATA');
    expect(buildTerritoryRadar(territoryId, [orphan])).toEqual([]);
    const briefing = buildTerritoryExecutiveBriefing(territoryId, [], [orphan]);
    expect(briefing.topSignals).toEqual([]);
    expect(briefing.llmSynthesis).toBeNull();
  });

  it('mantém funcionamento parcial quando apenas um domínio tem dados', () => {
    const facts = buildCagedFacts('territory-betim', cagedPoints);
    const signals = buildCagedEmploymentSignals('territory-betim', facts);
    const executive = buildTerritoryExecutiveSignals('territory-betim', { economySignals: signals, electoralSignals: [], securitySignals: [] });
    expect(executive.economy.status).toBe('AVAILABLE');
    expect(executive.electoral.status).toBe('INSUFFICIENT_DATA');
    expect(executive.security.status).toBe('INSUFFICIENT_DATA');
  });
});
