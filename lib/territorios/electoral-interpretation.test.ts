import { describe, expect, it } from 'vitest';
import type { ElectoralInterpretationContext } from './electoral-interpretation-context';
import { interpretElectoralContext, validateElectoralInterpretationResult } from './electoral-interpretation';
import { validateElectoralInterpretations } from './electoral-interpretation-guards';

function context(overrides: Partial<ElectoralInterpretationContext> = {}): ElectoralInterpretationContext {
  const provenance = { territoryId: 't1', years: [2020, 2024], metricKeys: ['m'], datasets: ['d'], evidenceHashes: ['h'] };
  const sig = (signalType: ElectoralInterpretationContext['signals'][number]['signalType'], metric: string, value: number | string, comparison: number | string, delta: number | null) => ({ signalType, origin: 'COMPARATIVE_SIGNAL' as const, metric, period: { fromYear: 2020, toYear: 2024 }, value, comparison, delta, provenance });
  const signals = [sig('ELECTORATE_INCREASED', 'electorate', 1100, 1000, 100), sig('PARTICIPATION_DECREASED', 'turnoutRate', 77, 78, -1), sig('ABSTENTION_INCREASED', 'abstentionRate', 23, 22, 1), sig('MARGIN_EXPANDED', 'marginPercentagePoints', 30, 20, 10), sig('WINNER_MAINTAINED', 'winner', 'MARÍLIA', 'MARÍLIA', null), sig('WINNING_PARTY_MAINTAINED', 'winnerParty', 'PT', 'PT', null), sig('DECISION_MOVED_TO_FIRST_ROUND', 'decisiveRound', 1, 2, null)];
  const facts = [2016, 2020, 2024].map((year) => ({ assertionClass: 'FACT' as const, year, electorate: 1000, turnout: 800, turnoutRate: year === 2016 ? 79 : year === 2020 ? 78 : 77, abstention: 200, abstentionRate: year === 2016 ? 21 : year === 2020 ? 22 : 23, validVotes: 750, winner: year === 2016 ? 'ALEX DE FREITAS' : 'MARÍLIA', winnerParty: year === 2016 ? 'PSDB' : 'PT', runnerUp: 'SEGUNDO', runnerUpParty: 'PL', marginVotes: 200, marginPercentagePoints: year === 2016 ? 40 : year === 2020 ? 20 : 30, decisiveRound: year === 2024 ? 1 : 2, officialStatus: 'ELEITO', provenance }));
  const benchmarkSignals = ['turnoutRate', 'abstentionRate', 'marginPercentagePoints'].map((metric, index) => ({ ...sig(index === 0 ? 'BELOW_SAMPLE_PARTICIPATION' : index === 1 ? 'ABOVE_SAMPLE_ABSTENTION' : 'ABOVE_SAMPLE_MARGIN', metric, index === 0 ? 77 : index === 1 ? 23 : 30, index === 0 ? 79 : index === 1 ? 21 : 25, index === 0 ? -2 : index === 1 ? 2 : 5), period: { toYear: 2024 } }));
  return { schemaVersion: 'electoral-context-v1', territory: { id: 't1', codigoIbge: '3118601', municipio: 'Contagem', uf: 'MG', comparisonUniverse: 'homologated-six-municipality-sample', comparisonUniverseLabel: 'amostra homologada de seis municípios' }, scope: { from: 2016, to: 2024, years: [2016, 2020, 2024], sourceSignalCount: 27 }, elections: facts, currentSnapshot: facts[2], historicalEvolution: facts.slice(0, 2), participation: facts.map((f) => ({ year: f.year, turnoutRate: f.turnoutRate, abstentionRate: f.abstentionRate })), competition: facts.map((f) => ({ year: f.year, marginVotes: f.marginVotes, marginPercentagePoints: f.marginPercentagePoints })), winnerHistory: facts.map((f) => ({ year: f.year, winner: f.winner })), partyHistory: facts.map((f) => ({ year: f.year, party: f.winnerParty })), decisionRoundHistory: facts.map((f) => ({ year: f.year, decisiveRound: f.decisiveRound })), benchmark: benchmarkSignals.map((s) => ({ assertionClass: 'FACT', metric: s.metric, year: 2024, comparisonUniverse: 'homologated-six-municipality-sample', comparisonUniverseLabel: 'amostra homologada de seis municípios', sampleAverage: Number(s.comparison), municipalityValue: Number(s.value), deltaToSample: s.delta!, signalType: s.signalType, provenance })), signals: [...signals, ...benchmarkSignals], keyChanges: signals, provenance, sourcesUsed: { datasets: ['d'], evidenceHashes: ['h'] }, limitations: ['apenas pleitos 2016/2020/2024', 'ausência de causalidade', 'ausência de previsão'], missingData: [], interpretationGuardrails: { allowed: ['comparar'], prohibited: ['prever'] }, assertions: { facts: [], interpretations: [], recommendations: [] }, ...overrides };
}

describe('motor de interpretação eleitoral controlada', () => {
  it('valida input/output, classes, categorias e confidence classes', () => {
    const result = interpretElectoralContext(context());
    expect(result.schemaVersion).toBe('electoral-interpretation-v1');
    expect(result.contextVersion).toBe('electoral-context-v1');
    expect(result.interpretations.every((item) => item.assertionClass === 'INTERPRETATION')).toBe(true);
    expect(new Set(result.interpretations.map((item) => item.confidenceClass)).size).toBeGreaterThan(1);
    expect(result.quality.recommendations).toEqual([]);
  });

  it('produz leitura executiva concisa, participação, abstenção, margem, vencedor, partido e turno', () => {
    const result = interpretElectoralContext(context());
    expect(result.executiveReading).toHaveLength(3);
    expect(result.interpretations.map((item) => item.category)).toEqual(expect.arrayContaining(['PARTICIPATION', 'ABSTENTION', 'COMPETITION', 'WINNER_CONTINUITY', 'PARTY_CONTINUITY', 'DECISION_ROUND']));
    expect(result.interpretations.every((item) => item.basedOnFacts.length + item.basedOnSignals.length > 0 && item.evidenceRefs.length > 0)).toBe(true);
  });

  it('interpreta benchmark sempre com universo explícito', () => {
    const result = interpretElectoralContext(context());
    expect(result.benchmarkReadings).toHaveLength(3);
    expect(result.benchmarkReadings.every((item) => item.statement.includes('amostra homologada de seis municípios'))).toBe(true);
  });

  it('detecta tensão sem inferir causalidade e organiza continuities/changes', () => {
    const result = interpretElectoralContext(context());
    expect(result.contradictions).toHaveLength(1);
    expect(result.contradictions[0].statement).toContain('não permitem determinar a causa');
    expect(result.continuities.length).toBeGreaterThan(0);
    expect(result.changes.length).toBeGreaterThan(0);
  });

  it('retorna INSUFFICIENT_CONTEXT sem completar informação ausente', () => {
    const input = context({ elections: [], currentSnapshot: null });
    const result = interpretElectoralContext(input);
    expect(result.quality.status).toBe('INSUFFICIENT_CONTEXT');
    expect(result.interpretations).toEqual([]);
  });

  it('rejeita output malformado/órfão e evidência inexistente', () => {
    const result = validateElectoralInterpretations(context(), [{ id: 'bad', statement: 'Leitura sem suporte.', basedOnFacts: [], basedOnSignals: [], evidenceRefs: ['fake'] }]);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.guard)).toContain('TRACEABILITY');
  });

  it('falha fechado para saída malformada ou recomendações do provedor', () => {
    expect(() => validateElectoralInterpretationResult(context(), { schemaVersion: 'electoral-interpretation-v1' })).toThrow('MALFORMED_PROVIDER_OUTPUT');
    const unsafe = interpretElectoralContext(context());
    unsafe.quality.recommendations = ['direcionar campanha'] as never;
    expect(() => validateElectoralInterpretationResult(context(), unsafe)).toThrow('UNSAFE_PROVIDER_OUTPUT');
  });

  it('number guard rejeita número inventado e aceita arredondamento permitido', () => {
    const bad = validateElectoralInterpretations(context(), [{ id: 'bad', statement: 'O valor foi 999,9.', basedOnFacts: ['fact:2024'], basedOnSignals: [], evidenceRefs: ['h'] }]);
    const good = validateElectoralInterpretations(context(), [{ id: 'good', statement: 'A participação registrada foi 77.', basedOnFacts: ['fact:2024'], basedOnSignals: [], evidenceRefs: ['h'] }]);
    expect(bad.errors.map((e) => e.guard)).toContain('NUMBER');
    expect(good.valid).toBe(true);
  });

  it('entity guard rejeita candidato inventado', () => {
    const result = validateElectoralInterpretations(context(), [{ id: 'bad', statement: 'FERNANDO SILVA venceu.', basedOnFacts: ['fact:2024'], basedOnSignals: [], evidenceRefs: ['h'] }]);
    expect(result.errors.map((e) => e.guard)).toContain('ENTITY');
  });

  it('guards rejeitam causalidade, previsão, recomendação e ideologia', () => {
    const statements = ['A queda ocorreu porque houve rejeição.', 'MARÍLIA vai vencer.', 'O candidato deve focar em bairros.', 'O partido é de esquerda.'];
    const guards = statements.flatMap((statement, index) => validateElectoralInterpretations(context(), [{ id: String(index), statement, basedOnFacts: ['fact:2024'], basedOnSignals: [], evidenceRefs: ['h'] }]).errors.map((e) => e.guard));
    expect(guards).toEqual(expect.arrayContaining(['CAUSALITY', 'PREDICTION', 'RECOMMENDATION', 'IDEOLOGY']));
  });

  it('regride Contagem com continuidade de vencedor/partido e mudança de turno', () => {
    const result = interpretElectoralContext(context());
    expect(result.interpretations.find((i) => i.category === 'WINNER_CONTINUITY')).toBeTruthy();
    expect(result.interpretations.find((i) => i.category === 'PARTY_CONTINUITY')).toBeTruthy();
    expect(result.interpretations.find((i) => i.category === 'DECISION_ROUND')?.statement).toContain('segundo turno');
  });

  it('regride Belo Horizonte distinguindo vencedor e partido', () => {
    const input = context();
    input.territory = { ...input.territory, codigoIbge: '3106200', municipio: 'Belo Horizonte' };
    input.keyChanges = input.keyChanges.map((s): typeof s => s.metric === 'winner' ? { ...s, signalType: 'WINNER_CHANGED' } : s);
    const result = interpretElectoralContext(input);
    expect(result.interpretations.find((i) => i.id === 'winner-recent')?.category).toBe('ELECTORAL_CHANGE');
    expect(result.interpretations.find((i) => i.id === 'party-recent')?.category).toBe('PARTY_CONTINUITY');
  });

  it('regride Betim reconhecendo mudança recente de vencedor e partido', () => {
    const input = context();
    input.territory = { ...input.territory, codigoIbge: '3106705', municipio: 'Betim' };
    input.keyChanges = input.keyChanges.map((s): typeof s => s.metric === 'winner' ? { ...s, signalType: 'WINNER_CHANGED' } : s).map((s): typeof s => s.metric === 'winnerParty' ? { ...s, signalType: 'WINNING_PARTY_CHANGED' } : s);
    const result = interpretElectoralContext(input);
    expect(result.interpretations.filter((i) => i.category === 'ELECTORAL_CHANGE')).toHaveLength(2);
  });

  it('é determinístico e não muta contexto', () => {
    const input = context();
    const snapshot = structuredClone(input);
    expect(interpretElectoralContext(input)).toEqual(interpretElectoralContext(input));
    expect(input).toEqual(snapshot);
  });
});
