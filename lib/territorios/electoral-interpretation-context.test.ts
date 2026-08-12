import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { ElectionTerritoryYearAnalysis } from './electoral-analytics';
import type { ElectoralSignal, ElectoralTerritoryIntelligence } from './electoral-intelligence';
import { buildElectoralInterpretationContext, canonicalizeElectoralInterpretationContext } from './electoral-interpretation-context';

function election(year: number, values: Partial<ElectionTerritoryYearAnalysis> = {}): ElectionTerritoryYearAnalysis {
  return { year, decisiveRound: 1, electorate: 1000, turnout: 800, abstention: 200, turnoutRate: 80, abstentionRate: 20, validVotes: 750, winner: `W${year}`, winnerParty: `P${year}`, winnerVotes: 500, winnerStatus: 'ELEITO', runnerUp: `R${year}`, runnerUpParty: 'R', runnerUpVotes: 250, marginVotes: 250, marginPercentagePoints: 30, electorateIdentityValid: true, provenance: { territoryId: 't1', year, metricKeys: [`m${year}`], datasets: [`d${year}`], evidenceHashes: [`h${year}`] }, ...values };
}

function signal(signalType: ElectoralSignal['signalType'], metric: string, fromYear: number | undefined, toYear: number, value: number | string, comparison: number | string, delta: number | null): ElectoralSignal {
  return { signalType, origin: 'COMPARATIVE_SIGNAL', metric, period: { fromYear, toYear }, value, comparison, delta, provenance: { territoryId: 't1', years: fromYear ? [fromYear, toYear] : [toYear], metricKeys: ['m'], datasets: ['d'], evidenceHashes: ['h'] } };
}

function intelligence(rows = [election(2016), election(2020), election(2024)]): ElectoralTerritoryIntelligence {
  const signals = [
    signal('PARTICIPATION_DECREASED', 'turnoutRate', 2016, 2020, 78, 80, -2),
    signal('PARTICIPATION_DECREASED', 'turnoutRate', 2020, 2024, 77, 78, -1),
    signal('MARGIN_EXPANDED', 'marginPercentagePoints', 2020, 2024, 40, 20, 20),
    signal('WINNER_MAINTAINED', 'winner', 2020, 2024, 'W', 'W', null),
    signal('WINNING_PARTY_MAINTAINED', 'winnerParty', 2020, 2024, 'P', 'P', null),
    signal('DECISION_MOVED_TO_FIRST_ROUND', 'decisiveRound', 2020, 2024, 1, 2, null),
    signal('BELOW_SAMPLE_PARTICIPATION', 'turnoutRate', undefined, 2024, 77, 79, -2),
    signal('ABOVE_SAMPLE_ABSTENTION', 'abstentionRate', undefined, 2024, 23, 21, 2),
    signal('ABOVE_SAMPLE_MARGIN', 'marginPercentagePoints', undefined, 2024, 40, 30, 10),
  ];
  return { territory: { id: 't1', codigoIbge: '3118601', municipio: 'Contagem', uf: 'MG' }, period: { from: 2016, to: 2024, years: [2016, 2020, 2024] }, facts: rows, signals, comparisons: [], historicalPatterns: [], partyPatterns: { sequence: [], changes: 0 }, participationPatterns: [], competitionPatterns: [], benchmarkSignals: signals.filter((item) => item.period.fromYear === undefined), provenance: { territoryId: 't1', years: [2016, 2020, 2024], metricKeys: ['m1', 'm2'], datasets: ['d1', 'd2', 'd1'], evidenceHashes: ['h1', 'h2', 'h1'] } };
}

describe('contrato de contexto para interpretação eleitoral', () => {
  it('versiona o schema, identifica território e universo correto', () => {
    const result = buildElectoralInterpretationContext(intelligence());
    expect(result.schemaVersion).toBe('electoral-context-v1');
    expect(result.territory).toMatchObject({ codigoIbge: '3118601', municipio: 'Contagem', uf: 'MG', comparisonUniverse: 'homologated-six-municipality-sample', comparisonUniverseLabel: 'amostra homologada de seis municípios' });
  });

  it('gera snapshot atual e histórico em ordem cronológica sem depender da entrada', () => {
    const rows = [election(2024, { winner: 'ATUAL' }), election(2016), election(2020)];
    const result = buildElectoralInterpretationContext(intelligence(rows));
    expect(result.elections.map((item) => item.year)).toEqual([2016, 2020, 2024]);
    expect(result.currentSnapshot).toMatchObject({ assertionClass: 'FACT', year: 2024, winner: 'ATUAL' });
    expect(result.historicalEvolution.map((item) => item.year)).toEqual([2016, 2020]);
  });

  it('seleciona deterministicamente mudanças recentes e benchmark atual reutilizando sinais', () => {
    const source = intelligence();
    const result = buildElectoralInterpretationContext(source);
    expect(result.keyChanges).toHaveLength(5);
    expect(result.keyChanges.every((item) => item.period.fromYear === 2020 && item.period.toYear === 2024)).toBe(true);
    expect(result.signals).toHaveLength(8);
    expect(result.signals.map((item) => item.signalType)).toEqual(source.signals.filter((item) => item.period.fromYear === 2020 || (item.period.fromYear === undefined && item.period.toYear === 2024)).map((item) => item.signalType));
  });

  it('carrega benchmark completo, provenance e fontes consolidadas sem criar fontes', () => {
    const result = buildElectoralInterpretationContext(intelligence());
    expect(result.benchmark[0]).toMatchObject({ assertionClass: 'FACT', comparisonUniverse: 'homologated-six-municipality-sample', comparisonUniverseLabel: 'amostra homologada de seis municípios', sampleAverage: 79, municipalityValue: 77, deltaToSample: -2 });
    expect(result.benchmark.every((item) => item.provenance.evidenceHashes.length > 0)).toBe(true);
    expect(result.sourcesUsed).toEqual({ datasets: ['d1', 'd2'], evidenceHashes: ['h1', 'h2'] });
  });

  it('expõe limitations, guardrails e somente assertions FACT', () => {
    const result = buildElectoralInterpretationContext(intelligence());
    expect(result.limitations).toHaveLength(8);
    expect(result.interpretationGuardrails.allowed).toHaveLength(5);
    expect(result.interpretationGuardrails.prohibited).toHaveLength(10);
    expect(result.assertions.interpretations).toEqual([]);
    expect(result.assertions.recommendations).toEqual([]);
    expect(result.elections.every((item) => item.assertionClass === 'FACT')).toBe(true);
  });

  it('registra dados ausentes sem inventar zero ou texto', () => {
    const result = buildElectoralInterpretationContext(intelligence([election(2016), election(2020), election(2024, { runnerUp: null, marginPercentagePoints: null })]));
    expect(result.currentSnapshot?.runnerUp).toBeNull();
    expect(result.missingData).toEqual([{ year: 2024, fields: ['runnerUp', 'marginPercentagePoints'] }]);
  });

  it('é determinístico, possui hash canônico e não muta a entrada', () => {
    const input = intelligence();
    const snapshot = structuredClone(input);
    const first = buildElectoralInterpretationContext(input);
    const second = buildElectoralInterpretationContext(input);
    const hash = (value: typeof first) => createHash('sha256').update(canonicalizeElectoralInterpretationContext(value)).digest('hex');
    expect(input).toEqual(snapshot);
    expect(first).toEqual(second);
    expect(hash(first)).toBe(hash(second));
  });

  it('regride Contagem preservando snapshot e mudanças recentes', () => {
    const rows = [election(2016, { winner: 'ALEX DE FREITAS', winnerParty: 'PSDB', turnoutRate: 79.193, marginPercentagePoints: 45.918, decisiveRound: 2 }), election(2020, { winner: 'MARÍLIA', winnerParty: 'PT', turnoutRate: 77.060, marginPercentagePoints: 2.704, decisiveRound: 2 }), election(2024, { winner: 'MARÍLIA', winnerParty: 'PT', turnoutRate: 76.747, marginPercentagePoints: 21.753, decisiveRound: 1 })];
    const result = buildElectoralInterpretationContext(intelligence(rows));
    expect(result.participation.map((item) => item.turnoutRate)).toEqual([79.193, 77.060, 76.747]);
    expect(result.currentSnapshot).toMatchObject({ winner: 'MARÍLIA', winnerParty: 'PT', marginPercentagePoints: 21.753, decisiveRound: 1 });
    expect(result.keyChanges.map((item) => item.signalType)).toContain('DECISION_MOVED_TO_FIRST_ROUND');
  });

  it('regride Belo Horizonte mantendo distinção winner/party', () => {
    const source = intelligence();
    source.territory = { ...source.territory, codigoIbge: '3106200', municipio: 'Belo Horizonte' };
    source.signals = source.signals.map((item): ElectoralSignal => item.period.fromYear === 2020 && item.metric === 'winner' ? { ...item, signalType: 'WINNER_CHANGED' } : item);
    const result = buildElectoralInterpretationContext(source);
    expect(result.keyChanges.find((item) => item.metric === 'winner')?.signalType).toBe('WINNER_CHANGED');
    expect(result.keyChanges.find((item) => item.metric === 'winnerParty')?.signalType).toBe('WINNING_PARTY_MAINTAINED');
  });

  it('regride Betim preservando continuidade e ruptura entre períodos', () => {
    const source = intelligence();
    source.territory = { ...source.territory, codigoIbge: '3106705', municipio: 'Betim' };
    source.signals.unshift(signal('WINNER_MAINTAINED', 'winner', 2016, 2020, 'VITTORIO MEDIOLI', 'VITTORIO MEDIOLI', null), signal('WINNING_PARTY_CHANGED', 'winnerParty', 2016, 2020, 'PSD', 'PHS', null));
    source.signals = source.signals.map((item): ElectoralSignal => item.period.fromYear === 2020 && item.metric === 'winner' ? { ...item, signalType: 'WINNER_CHANGED' } : item).map((item): ElectoralSignal => item.period.fromYear === 2020 && item.metric === 'winnerParty' ? { ...item, signalType: 'WINNING_PARTY_CHANGED' } : item);
    const result = buildElectoralInterpretationContext(source);
    expect(source.signals.filter((item) => item.period.fromYear === 2016).map((item) => item.signalType)).toEqual(expect.arrayContaining(['WINNER_MAINTAINED', 'WINNING_PARTY_CHANGED']));
    expect(result.keyChanges.map((item) => item.signalType)).toEqual(expect.arrayContaining(['WINNER_CHANGED', 'WINNING_PARTY_CHANGED']));
  });

  it('não produz narrativa, interpretação, recomendação, ideologia ou previsão', () => {
    const output = JSON.stringify(buildElectoralInterpretationContext(intelligence())).toLocaleLowerCase('pt-BR');
    const prohibitedPhrases = ['demonstra consolidação', 'eleitorado está insatisfeito', 'há oportunidade', 'o candidato deve', 'indica rejeição', 'partido está forte', 'tendência de vitória'];
    expect(prohibitedPhrases.filter((phrase) => output.includes(phrase))).toEqual([]);
  });
});
