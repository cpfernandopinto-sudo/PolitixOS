import { describe, expect, it } from 'vitest';
import type { ElectoralInterpretationContext } from '../../electoral-interpretation-context';
import { interpretElectoralContext } from '../../electoral-interpretation';
import { buildElectoralBriefing } from '../../electoral-briefing';
import { validateElectoralLlmDraft } from './electoral-llm-guards';
import { buildElectoralOutputSchema, buildElectoralUserMessage, serializeElectoralContext } from './electoral-prompt-v1';
import type { ElectoralInterpretationDraft } from './electoral-prompt-v1';

function source(): ElectoralInterpretationContext {
  const provenance = { territoryId: 't1', years: [2016, 2020, 2024], metricKeys: ['election'], datasets: ['TSE'], evidenceHashes: ['h1'] };
  const facts = [2016, 2020, 2024].map((year) => ({
    assertionClass: 'FACT' as const, year, electorate: 1000, turnout: 770, turnoutRate: year === 2024 ? 77 : 78,
    abstention: 230, abstentionRate: year === 2024 ? 23 : 22, validVotes: 750,
    winner: year === 2016 ? 'ANA LIMA' : 'MARIA SILVA', winnerParty: year === 2016 ? 'PSDB' : 'PT',
    runnerUp: 'JOAO SOUZA', runnerUpParty: 'PL', marginVotes: year === 2024 ? 300 : 200,
    marginPercentagePoints: year === 2024 ? 30 : 20, decisiveRound: year === 2024 ? 1 : 2,
    officialStatus: 'ELEITO', provenance,
  }));
  const make = (signalType: ElectoralInterpretationContext['signals'][number]['signalType'], metric: string, value: number | string, comparison: number | string, delta: number | null, fromYear: number | undefined = 2020) =>
    ({ signalType, origin: 'COMPARATIVE_SIGNAL' as const, metric, period: { fromYear, toYear: 2024 }, value, comparison, delta, provenance });
  const keyChanges = [
    make('PARTICIPATION_DECREASED', 'turnoutRate', 77, 78, -1),
    make('WINNER_MAINTAINED', 'winner', 'MARIA SILVA', 'MARIA SILVA', null),
  ];
  const benchmarkSignals = [make('BELOW_SAMPLE_PARTICIPATION', 'turnoutRate', 77, 79, -2, undefined)];
  return {
    schemaVersion: 'electoral-context-v1',
    territory: { id: 't1', codigoIbge: '3118601', municipio: 'Contagem', uf: 'MG', comparisonUniverse: 'homologated-six-municipality-sample', comparisonUniverseLabel: 'amostra homologada de seis municípios' },
    scope: { from: 2016, to: 2024, years: [2016, 2020, 2024], sourceSignalCount: 3 },
    elections: facts, currentSnapshot: facts[2], historicalEvolution: facts.slice(0, 2),
    participation: facts.map(({ year, turnoutRate, abstentionRate }) => ({ year, turnoutRate, abstentionRate })),
    competition: facts.map(({ year, marginVotes, marginPercentagePoints }) => ({ year, marginVotes, marginPercentagePoints })),
    winnerHistory: facts.map(({ year, winner }) => ({ year, winner })),
    partyHistory: facts.map(({ year, winnerParty: party }) => ({ year, party })),
    decisionRoundHistory: facts.map(({ year, decisiveRound }) => ({ year, decisiveRound })),
    benchmark: benchmarkSignals.map((signal) => ({ assertionClass: 'FACT' as const, metric: signal.metric, year: 2024, comparisonUniverse: 'homologated-six-municipality-sample' as const, comparisonUniverseLabel: 'amostra homologada de seis municípios' as const, sampleAverage: Number(signal.comparison), municipalityValue: Number(signal.value), deltaToSample: signal.delta!, signalType: signal.signalType, provenance })),
    signals: [...keyChanges, ...benchmarkSignals], keyChanges, provenance,
    sourcesUsed: { datasets: ['TSE'], evidenceHashes: ['h1'] },
    limitations: ['benchmark limitado à amostra homologada de seis municípios', 'causalidade não estabelecida'],
    missingData: [], interpretationGuardrails: { allowed: ['descrever'], prohibited: ['prever'] },
    assertions: { facts: [], interpretations: [], recommendations: [] },
  };
}

function buildBriefing() {
  const context = source();
  const interpretation = interpretElectoralContext(context);
  return buildElectoralBriefing(context, interpretation);
}

function draft(claims: ElectoralInterpretationDraft['claims']): ElectoralInterpretationDraft {
  return { claims };
}

describe('electoral-prompt-v1 — contrato de prompt, sem chamada externa', () => {
  it('serializa o briefing determinístico, sem reconstruir dado', () => {
    const briefing = buildBriefing();
    const serialized = serializeElectoralContext(briefing);
    expect(serialized.canonicalJson).toBe(JSON.stringify(briefing));
    expect(serialized.interpretationCount).toBe(briefing.interpretations.length);
  });

  it('buildElectoralUserMessage inclui o município real e o JSON completo do briefing', () => {
    const briefing = buildBriefing();
    const { message } = buildElectoralUserMessage(briefing);
    expect(message).toContain('Contagem/MG');
    expect(message).toContain(JSON.stringify(briefing));
  });

  it('buildElectoralOutputSchema exige basedOnInterpretationIds não-vazio', () => {
    const schema = buildElectoralOutputSchema() as { properties: { claims: { items: { required: string[] } } } };
    expect(schema.properties.claims.items.required).toContain('basedOnInterpretationIds');
  });
});

describe('validateElectoralLlmDraft — rastreabilidade + nunca upgrade de LIMITED_CONTEXT', () => {
  it('aceita claim que referencia uma interpretation real do briefing', () => {
    const briefing = buildBriefing();
    const realId = briefing.interpretations[0].id;
    const errors = validateElectoralLlmDraft(draft([{ id: 'c1', text: 'Texto descritivo baseado no dado real.', basedOnInterpretationIds: [realId] }]), briefing);
    expect(errors).toHaveLength(0);
  });

  it('EMPTY_REFERENCE: rejeita claim sem nenhuma referência', () => {
    const briefing = buildBriefing();
    const errors = validateElectoralLlmDraft(draft([{ id: 'c1', text: 'Algo aconteceu.', basedOnInterpretationIds: [] }]), briefing);
    expect(errors.some((error) => error.code === 'EMPTY_REFERENCE')).toBe(true);
  });

  it('UNRESOLVED_REFERENCE: rejeita claim que referencia um id inexistente no briefing (fato inventado)', () => {
    const briefing = buildBriefing();
    const errors = validateElectoralLlmDraft(draft([{ id: 'c1', text: 'Texto qualquer.', basedOnInterpretationIds: ['interpretation:inventado:999'] }]), briefing);
    expect(errors.some((error) => error.code === 'UNRESOLVED_REFERENCE')).toBe(true);
  });

  it('CONFIDENCE_UPGRADE: rejeita texto que apresenta uma interpretation LIMITED_CONTEXT como fato direto', () => {
    const briefing = buildBriefing();
    const limited = briefing.interpretations.find((item) => item.confidenceClass === 'LIMITED_CONTEXT');
    expect(limited).toBeDefined();
    const errors = validateElectoralLlmDraft(draft([{ id: 'c1', text: 'Isso certamente aconteceu, sem dúvida.', basedOnInterpretationIds: [limited!.id] }]), briefing);
    expect(errors.some((error) => error.code === 'CONFIDENCE_UPGRADE')).toBe(true);
  });

  it('CONFIDENCE_UPGRADE: não dispara quando o texto qualifica a incerteza de um item LIMITED_CONTEXT', () => {
    const briefing = buildBriefing();
    const limited = briefing.interpretations.find((item) => item.confidenceClass === 'LIMITED_CONTEXT');
    const errors = validateElectoralLlmDraft(draft([{ id: 'c1', text: 'Com evidência limitada, é possível notar um padrão, mas não é possível afirmar com certeza.', basedOnInterpretationIds: [limited!.id] }]), briefing);
    expect(errors.some((error) => error.code === 'CONFIDENCE_UPGRADE')).toBe(false);
  });

  it('INVENTED_ELECTION_YEAR: rejeita ano fora das eleições cobertas pelo briefing', () => {
    const briefing = buildBriefing();
    const realId = briefing.interpretations[0].id;
    const errors = validateElectoralLlmDraft(draft([{ id: 'c1', text: 'Em 2018, o comparecimento caiu.', basedOnInterpretationIds: [realId] }]), briefing);
    expect(errors.some((error) => error.code === 'INVENTED_ELECTION_YEAR')).toBe(true);
  });

  it('RECOMMENDATION_LEAK: rejeita claim que introduz recomendação (briefing declara recommendations=[])', () => {
    const briefing = buildBriefing();
    const realId = briefing.interpretations[0].id;
    const errors = validateElectoralLlmDraft(draft([{ id: 'c1', text: 'A campanha deve investir mais em mobilização.', basedOnInterpretationIds: [realId] }]), briefing);
    expect(errors.some((error) => error.code === 'RECOMMENDATION_LEAK')).toBe(true);
  });

  it('aceita referência a fact:{ano} e a benchmark.interpretationRef reais', () => {
    const briefing = buildBriefing();
    const factRef = `fact:${briefing.historicalEvolution[0].year}`;
    const errors = validateElectoralLlmDraft(draft([{ id: 'c1', text: 'Descrição do histórico eleitoral.', basedOnInterpretationIds: [factRef] }]), briefing);
    expect(errors.some((error) => error.code === 'UNRESOLVED_REFERENCE')).toBe(false);
  });
});
