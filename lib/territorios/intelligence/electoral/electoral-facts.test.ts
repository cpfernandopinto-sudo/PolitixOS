import { describe, expect, it } from 'vitest';
import type { ElectionTerritoryAnalysis, ElectionTerritoryYearAnalysis } from '../../electoral-analytics';
import { buildElectoralTerritoryIntelligence, type ElectoralTerritoryIntelligence } from '../../electoral-intelligence';
import { buildElectoralFacts } from './electoral-facts';

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

function fact(facts: ReturnType<typeof buildElectoralFacts>, key: string, period?: string) {
  return facts.find((item) => item.key === key && (period === undefined || item.period === period));
}

// `buildElectoralTerritoryIntelligence` exige exatamente 3 eleições (pares fixos
// 2016/2020/2024) — não é uma trilha válida para o caso "sem eleição nenhuma". Para esse
// caso negativo, construímos o `ElectoralTerritoryIntelligence` vazio diretamente, já que
// `buildElectoralFacts` só itera `facts`/`comparisons`, sem depender de como foram gerados.
function emptyIntelligence(): ElectoralTerritoryIntelligence {
  return {
    territory: { id: 'territory-1', codigoIbge: '3118601', municipio: 'Contagem', uf: 'MG' },
    period: { from: 2016, to: 2024, years: [2016, 2020, 2024] },
    facts: [], signals: [], comparisons: [], historicalPatterns: [],
    partyPatterns: { sequence: [], changes: 0 }, participationPatterns: [], competitionPatterns: [],
    benchmarkSignals: [],
    provenance: { territoryId: 'territory-1', years: [], metricKeys: [], datasets: [], evidenceHashes: [] },
  };
}

describe('buildElectoralFacts — INTEL-DOMAIN-02 Missão B', () => {
  it('array de eleições vazio produz nenhum fact, sem erro (caso negativo — sem dado nenhum)', () => {
    expect(buildElectoralFacts(emptyIntelligence())).toHaveLength(0);
  });

  it('projeta comparecimento/abstenção/votos válidos/margem/vencedor por eleição, sempre supported quando a proveniência é completa', () => {
    const rows = [election(2016), election(2020), election(2024)];
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), []);
    const facts = buildElectoralFacts(intelligence);
    expect(fact(facts, 'turnout_rate', '2024')?.value).toBe(80);
    expect(fact(facts, 'turnout_rate', '2024')?.supported).toBe(true);
    expect(fact(facts, 'abstention_rate', '2024')?.value).toBe(20);
    expect(fact(facts, 'valid_votes', '2024')?.value).toBe(760);
    expect(fact(facts, 'margin_percentage_points', '2024')?.value).toBe(30);
    expect(fact(facts, 'winner', '2024')?.value).toBe('Pessoa 2024');
    expect(fact(facts, 'winner_party', '2024')?.value).toBe('P2024');
  });

  it('CASO NEGATIVO — proveniência incompleta (sem dataset/evidenceHashes) marca o fact como supported:false, value:null, nunca fabrica um número', () => {
    const rows = [election(2016), election(2020), election(2024, { provenance: { territoryId: 'territory-1', year: 2024, metricKeys: [], datasets: [], evidenceHashes: [] } })];
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), []);
    const facts = buildElectoralFacts(intelligence);
    const turnout = fact(facts, 'turnout_rate', '2024');
    expect(turnout?.supported).toBe(false);
    expect(turnout?.value).toBeNull();
    expect(turnout?.evidenceRefs).toEqual([]);
    expect(turnout?.limitations.length).toBeGreaterThan(0);
  });

  it('CASO NEGATIVO — métrica ausente (null na fonte) nunca vira 0 ou string vazia fabricada', () => {
    const rows = [election(2016), election(2020), election(2024, { marginPercentagePoints: null, winner: null })];
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), []);
    const facts = buildElectoralFacts(intelligence);
    expect(fact(facts, 'margin_percentage_points', '2024')?.supported).toBe(false);
    expect(fact(facts, 'margin_percentage_points', '2024')?.value).toBeNull();
    expect(fact(facts, 'winner', '2024')?.supported).toBe(false);
  });

  it('projeta mudanças entre eleições (comparisons) com o delta real já calculado, nunca recalculado aqui', () => {
    const rows = [election(2016, { electorate: 1000 }), election(2020, { electorate: 1100 }), election(2024, { electorate: 1200 })];
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), []);
    const facts = buildElectoralFacts(intelligence);
    const change = facts.find((item) => item.key === 'electorate_change' && item.period === '2016-2020');
    expect(change?.value).toBe(100);
    expect(change?.supported).toBe(true);
    expect(change?.evidenceRefs.length).toBe(2);
  });

  it('nunca produz um fact de votos brancos/nulos — a fonte determinística não rastreia esse dado (limitação real, não fabricação)', () => {
    const rows = [election(2016), election(2020), election(2024)];
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), []);
    const facts = buildElectoralFacts(intelligence);
    expect(facts.some((item) => /branco|nulo/i.test(item.key))).toBe(false);
  });

  it('todo fact tem ao menos 1 evidenceRef quando supported=true (rastreabilidade nunca vazia)', () => {
    const rows = [election(2016), election(2020), election(2024)];
    const intelligence = buildElectoralTerritoryIntelligence(analysis(rows), []);
    for (const item of buildElectoralFacts(intelligence)) {
      if (item.supported) expect(item.evidenceRefs.length).toBeGreaterThan(0);
    }
  });
});
