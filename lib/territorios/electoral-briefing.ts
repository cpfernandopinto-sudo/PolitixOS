import type { ElectoralInterpretationContext } from './electoral-interpretation-context';
import type { ElectoralConfidenceClass, ElectoralInterpretationItem, ElectoralInterpretationResult } from './electoral-interpretation';
import { assertValidElectoralBriefing } from './electoral-briefing-guards';

export const ELECTORAL_BRIEFING_SCHEMA_VERSION = 'electoral-briefing-v1' as const;

export interface ElectoralBriefingCoverage {
  elections: number[];
  availableYears: number[];
  missingYears: number[];
  sections: { results: boolean; participation: boolean; candidates: boolean; parties: boolean; winner: boolean; benchmark: boolean };
  missingData: ElectoralInterpretationContext['missingData'];
}

export interface ElectoralBriefing {
  schemaVersion: typeof ELECTORAL_BRIEFING_SCHEMA_VERSION;
  generatedAt: string;
  territory: { municipio: string; uf: string; codigoIbge: string; scope: 'MUNICIPAL'; electionsCovered: number[]; sourceContract: 'electoral-interpretation-v1' };
  coverage: ElectoralBriefingCoverage;
  executiveSummary: { headline: string; headlineRef: 'executive-reading:0'; keyPoints: Array<{ text: string; interpretationRef: string }>; confidence: ElectoralConfidenceClass; references: string[] };
  electoralProfile: { currentYear: number | null; participation: ElectoralInterpretationContext['participation']; competition: ElectoralInterpretationContext['competition']; winnerHistory: ElectoralInterpretationContext['winnerHistory']; partyHistory: ElectoralInterpretationContext['partyHistory']; decisionRoundHistory: ElectoralInterpretationContext['decisionRoundHistory']; signalRefs: string[] };
  historicalEvolution: ElectoralInterpretationContext['elections'];
  continuityAndChange: { continuities: string[]; changes: string[] };
  benchmark: Array<{ interpretationRef: string; metric: string; year: number; comparisonUniverse: 'homologated-six-municipality-sample'; comparisonUniverseLabel: 'amostra homologada de seis municípios'; confidence: ElectoralConfidenceClass }>;
  tensions: string[];
  interpretations: ElectoralInterpretationItem[];
  limitations: string[];
  evidence: { hashes: string[]; datasets: string[] };
  provenance: { contextVersion: 'electoral-context-v1'; interpretationVersion: 'electoral-interpretation-v1'; territoryId: string; interpretationRefs: string[]; factRefs: string[]; signalRefs: string[] };
  confidence: { consolidated: ElectoralConfidenceClass; classesPresent: ElectoralConfidenceClass[]; rule: 'LOWEST_CONFIDENCE_WINS' };
  guardrails: { mode: 'FAIL_CLOSED'; assertionClasses: ['FACT', 'SIGNAL', 'INTERPRETATION']; recommendations: [] };
}

const signalRef = (signal: ElectoralInterpretationContext['signals'][number]) => `signal:${signal.signalType}:${signal.period.fromYear ?? 'current'}:${signal.period.toYear}`;
const rank: Record<ElectoralConfidenceClass, number> = { DIRECTLY_SUPPORTED: 0, MULTI_SIGNAL_SUPPORTED: 1, LIMITED_CONTEXT: 2 };

export function buildElectoralBriefing(context: ElectoralInterpretationContext, interpretation: ElectoralInterpretationResult): ElectoralBriefing {
  if (context.schemaVersion !== 'electoral-context-v1' || interpretation.schemaVersion !== 'electoral-interpretation-v1') throw new Error('UNSUPPORTED_SOURCE_CONTRACT');
  if (context.territory.codigoIbge !== interpretation.territory.codigoIbge) throw new Error('TERRITORY_MISMATCH');
  const years = context.elections.map((item) => item.year).sort((a, b) => a - b);
  const missingYears = context.scope.years.filter((year) => !years.includes(year));
  const classes = [...new Set(interpretation.interpretations.map((item) => item.confidenceClass))].sort((a, b) => rank[a] - rank[b]);
  const consolidated = classes.reduce<ElectoralConfidenceClass>((lowest, current) => rank[current] > rank[lowest] ? current : lowest, 'DIRECTLY_SUPPORTED');
  const keyPoints = interpretation.interpretations.slice(0, 6).map((item) => ({ text: item.statement, interpretationRef: item.id }));
  const briefing: ElectoralBriefing = {
    schemaVersion: ELECTORAL_BRIEFING_SCHEMA_VERSION,
    generatedAt: `${years.at(-1) ?? context.scope.to}-12-31T00:00:00.000Z`,
    territory: { municipio: context.territory.municipio, uf: context.territory.uf, codigoIbge: context.territory.codigoIbge, scope: 'MUNICIPAL', electionsCovered: years, sourceContract: interpretation.schemaVersion },
    coverage: { elections: years, availableYears: years, missingYears, sections: { results: context.elections.length > 0, participation: context.participation.length > 0, candidates: context.elections.some((item) => item.winner !== null || item.runnerUp !== null), parties: context.elections.some((item) => item.winnerParty !== null || item.runnerUpParty !== null), winner: context.elections.some((item) => item.winner !== null), benchmark: context.benchmark.length > 0 }, missingData: structuredClone(context.missingData) },
    executiveSummary: { headline: interpretation.executiveReading[0] ?? 'Contexto insuficiente para síntese executiva.', headlineRef: 'executive-reading:0', keyPoints, confidence: consolidated, references: keyPoints.map((item) => item.interpretationRef) },
    electoralProfile: { currentYear: context.currentSnapshot?.year ?? null, participation: structuredClone(context.participation), competition: structuredClone(context.competition), winnerHistory: structuredClone(context.winnerHistory), partyHistory: structuredClone(context.partyHistory), decisionRoundHistory: structuredClone(context.decisionRoundHistory), signalRefs: context.signals.map(signalRef) },
    historicalEvolution: structuredClone(context.elections),
    continuityAndChange: { continuities: interpretation.continuities.map((item) => item.id), changes: interpretation.changes.map((item) => item.id) },
    benchmark: interpretation.benchmarkReadings.map((item) => { const source = context.benchmark.find((entry) => item.basedOnSignals.some((ref) => ref.startsWith(`signal:${entry.signalType}:`) && ref.endsWith(`:${entry.year}`))); if (!source) throw new Error(`BROKEN_BENCHMARK_REFERENCE:${item.id}`); return { interpretationRef: item.id, metric: source.metric, year: source.year, comparisonUniverse: source.comparisonUniverse, comparisonUniverseLabel: source.comparisonUniverseLabel, confidence: item.confidenceClass }; }),
    tensions: interpretation.contradictions.map((item) => item.id),
    interpretations: structuredClone(interpretation.interpretations),
    limitations: [...new Set([...context.limitations, ...interpretation.limitations])],
    evidence: { hashes: [...context.sourcesUsed.evidenceHashes], datasets: [...context.sourcesUsed.datasets] },
    provenance: { contextVersion: context.schemaVersion, interpretationVersion: interpretation.schemaVersion, territoryId: context.territory.id, interpretationRefs: interpretation.interpretations.map((item) => item.id), factRefs: context.elections.map((item) => `fact:${item.year}`), signalRefs: context.signals.map(signalRef) },
    confidence: { consolidated, classesPresent: classes, rule: 'LOWEST_CONFIDENCE_WINS' },
    guardrails: { mode: 'FAIL_CLOSED', assertionClasses: ['FACT', 'SIGNAL', 'INTERPRETATION'], recommendations: [] },
  };
  assertValidElectoralBriefing(context, interpretation, briefing);
  return briefing;
}
