import type { ElectoralInterpretationContext } from './electoral-interpretation-context';
import { assertValidElectoralInterpretations } from './electoral-interpretation-guards';

type ContextSignal = ElectoralInterpretationContext['signals'][number];

export const ELECTORAL_INTERPRETATION_SCHEMA_VERSION = 'electoral-interpretation-v1' as const;

export type ElectoralInterpretationCategory = 'PARTICIPATION' | 'ABSTENTION' | 'COMPETITION' | 'WINNER_CONTINUITY' | 'PARTY_CONTINUITY' | 'ELECTORAL_CHANGE' | 'DECISION_ROUND' | 'BENCHMARK' | 'HISTORICAL_PATTERN';
export type ElectoralConfidenceClass = 'DIRECTLY_SUPPORTED' | 'MULTI_SIGNAL_SUPPORTED' | 'LIMITED_CONTEXT';

export interface ElectoralInterpretationItem {
  id: string;
  category: ElectoralInterpretationCategory;
  statement: string;
  assertionClass: 'INTERPRETATION';
  basedOnFacts: string[];
  basedOnSignals: string[];
  evidenceRefs: string[];
  confidenceClass: ElectoralConfidenceClass;
  caveats: string[];
}

export interface ElectoralInterpretationResult {
  schemaVersion: typeof ELECTORAL_INTERPRETATION_SCHEMA_VERSION;
  contextVersion: 'electoral-context-v1';
  territory: ElectoralInterpretationContext['territory'];
  executiveReading: string[];
  interpretations: ElectoralInterpretationItem[];
  contradictions: ElectoralInterpretationItem[];
  continuities: ElectoralInterpretationItem[];
  changes: ElectoralInterpretationItem[];
  benchmarkReadings: ElectoralInterpretationItem[];
  limitations: string[];
  provenance: string[];
  quality: { mode: 'DETERMINISTIC'; status: 'PASS' | 'INSUFFICIENT_CONTEXT'; guardValidation: 'PASS'; recommendations: [] };
}

export interface ElectoralInterpretationProvider {
  interpret(context: ElectoralInterpretationContext): ElectoralInterpretationResult | Promise<ElectoralInterpretationResult>;
}

const factRef = (year: number) => `fact:${year}`;
const signalRef = (signal: ContextSignal) => `signal:${signal.signalType}:${signal.period.fromYear ?? 'current'}:${signal.period.toYear}`;
const evidence = (context: ElectoralInterpretationContext, signals: ContextSignal[]) => [...new Set(signals.flatMap((item) => item.provenance.evidenceHashes).filter((hash) => context.sourcesUsed.evidenceHashes.includes(hash)))].sort();

function item(context: ElectoralInterpretationContext, id: string, category: ElectoralInterpretationCategory, statement: string, signals: ContextSignal[], confidenceClass: ElectoralConfidenceClass = 'DIRECTLY_SUPPORTED'): ElectoralInterpretationItem {
  return { id, category, statement, assertionClass: 'INTERPRETATION', basedOnFacts: [...new Set(signals.flatMap((signal) => [signal.period.fromYear, signal.period.toYear]).filter((year): year is number => year !== undefined).map(factRef))], basedOnSignals: signals.map(signalRef), evidenceRefs: evidence(context, signals), confidenceClass, caveats: ['não é possível concluir causalidade com o contexto disponível'] };
}

const find = (context: ElectoralInterpretationContext, metric: string) => context.keyChanges.find((signal) => signal.metric === metric);

export function interpretElectoralContext(context: ElectoralInterpretationContext): ElectoralInterpretationResult {
  if (context.schemaVersion !== 'electoral-context-v1') throw new Error('UNSUPPORTED_CONTEXT_VERSION');
  const current = context.currentSnapshot;
  if (!current || context.elections.length < 2) return { schemaVersion: ELECTORAL_INTERPRETATION_SCHEMA_VERSION, contextVersion: context.schemaVersion, territory: { ...context.territory }, executiveReading: ['Contexto insuficiente para interpretação eleitoral controlada.'], interpretations: [], contradictions: [], continuities: [], changes: [], benchmarkReadings: [], limitations: [...context.limitations], provenance: [...context.sourcesUsed.evidenceHashes], quality: { mode: 'DETERMINISTIC', status: 'INSUFFICIENT_CONTEXT', guardValidation: 'PASS', recommendations: [] } };
  const interpretations: ElectoralInterpretationItem[] = [];
  const participation = find(context, 'turnoutRate');
  const abstention = find(context, 'abstentionRate');
  const margin = find(context, 'marginPercentagePoints');
  const winner = find(context, 'winner');
  const party = find(context, 'winnerParty');
  const round = find(context, 'decisiveRound');
  if (participation) interpretations.push(item(context, 'participation-recent', 'PARTICIPATION', participation.signalType === 'PARTICIPATION_INCREASED' ? 'No período mais recente analisado, a participação eleitoral registrada aumentou.' : participation.signalType === 'PARTICIPATION_DECREASED' ? 'No período mais recente analisado, a participação eleitoral registrada diminuiu.' : 'No período mais recente analisado, a participação eleitoral registrada permaneceu exatamente igual.', [participation]));
  if (abstention) interpretations.push(item(context, 'abstention-recent', 'ABSTENTION', abstention.signalType === 'ABSTENTION_INCREASED' ? 'No período mais recente analisado, a taxa de abstenção registrada aumentou.' : abstention.signalType === 'ABSTENTION_DECREASED' ? 'No período mais recente analisado, a taxa de abstenção registrada diminuiu.' : 'No período mais recente analisado, a taxa de abstenção registrada permaneceu exatamente igual.', [abstention]));
  if (margin) interpretations.push(item(context, 'competition-recent', 'COMPETITION', margin.signalType === 'MARGIN_EXPANDED' ? 'A distância registrada entre o primeiro e o segundo colocados aumentou no pleito mais recente.' : margin.signalType === 'MARGIN_NARROWED' ? 'A distância registrada entre o primeiro e o segundo colocados diminuiu no pleito mais recente.' : 'A distância registrada entre o primeiro e o segundo colocados permaneceu exatamente igual.', [margin]));
  if (winner) interpretations.push(item(context, 'winner-recent', winner.signalType === 'WINNER_MAINTAINED' ? 'WINNER_CONTINUITY' : 'ELECTORAL_CHANGE', winner.signalType === 'WINNER_MAINTAINED' ? 'O pleito mais recente manteve o mesmo vencedor nominal registrado no pleito anterior.' : 'O vencedor nominal mudou entre os dois pleitos mais recentes.', [winner]));
  if (party) interpretations.push(item(context, 'party-recent', party.signalType === 'WINNING_PARTY_MAINTAINED' ? 'PARTY_CONTINUITY' : 'ELECTORAL_CHANGE', party.signalType === 'WINNING_PARTY_MAINTAINED' ? 'O partido vencedor permaneceu o mesmo entre os dois pleitos mais recentes.' : 'O partido vencedor mudou entre os dois pleitos mais recentes.', [party]));
  if (round) interpretations.push(item(context, 'round-recent', 'DECISION_ROUND', round.signalType === 'DECISION_MOVED_TO_FIRST_ROUND' ? 'A disputa passou de definição no segundo turno para definição no primeiro turno no pleito mais recente.' : round.signalType === 'DECISION_MOVED_TO_RUNOFF' ? 'A disputa passou de definição no primeiro turno para definição no segundo turno no pleito mais recente.' : 'O turno decisivo permaneceu o mesmo entre os dois pleitos mais recentes.', [round]));
  const benchmarkReadings = context.benchmark.map((benchmark) => item(context, `benchmark-${benchmark.metric}`, 'BENCHMARK', `O valor municipal de ${benchmark.metric} ficou ${benchmark.deltaToSample > 0 ? 'acima' : benchmark.deltaToSample < 0 ? 'abaixo' : 'exatamente na média'} em relação à amostra homologada de seis municípios.`, [context.signals.find((signal) => signal.signalType === benchmark.signalType && signal.period.toYear === benchmark.year)!], 'LIMITED_CONTEXT'));
  interpretations.push(...benchmarkReadings);
  const contradictions: ElectoralInterpretationItem[] = [];
  if (participation && margin && participation.signalType === 'PARTICIPATION_DECREASED' && margin.signalType === 'MARGIN_EXPANDED') contradictions.push(item(context, 'tension-participation-margin', 'HISTORICAL_PATTERN', 'Enquanto a participação registrada diminuiu, a margem entre primeiro e segundo colocados aumentou no pleito mais recente. Os movimentos são simultaneamente observáveis, mas os dados não permitem determinar a causa.', [participation, margin], 'MULTI_SIGNAL_SUPPORTED'));
  const continuities = interpretations.filter((entry) => ['WINNER_CONTINUITY', 'PARTY_CONTINUITY'].includes(entry.category) || entry.statement.includes('permaneceu'));
  const changes = interpretations.filter((entry) => entry.category === 'ELECTORAL_CHANGE' || entry.category === 'DECISION_ROUND');
  const output: ElectoralInterpretationResult = { schemaVersion: ELECTORAL_INTERPRETATION_SCHEMA_VERSION, contextVersion: context.schemaVersion, territory: { ...context.territory }, executiveReading: [
    `Os resultados observados de ${context.territory.municipio} permitem uma leitura descritiva do pleito mais recente.`,
    [...interpretations.slice(0, 6), ...contradictions].map((entry) => entry.statement).join(' '),
    'As conclusões permanecem limitadas aos pleitos e ao universo comparativo explicitamente presentes no contexto.',
  ], interpretations: [...interpretations, ...contradictions], contradictions, continuities, changes, benchmarkReadings, limitations: [...context.limitations], provenance: [...context.sourcesUsed.evidenceHashes], quality: { mode: 'DETERMINISTIC', status: 'PASS', guardValidation: 'PASS', recommendations: [] } };
  assertValidElectoralInterpretations(context, output.interpretations);
  return validateElectoralInterpretationResult(context, output);
}

export function validateElectoralInterpretationResult(context: ElectoralInterpretationContext, candidate: unknown): ElectoralInterpretationResult {
  if (!candidate || typeof candidate !== 'object') throw new Error('MALFORMED_PROVIDER_OUTPUT');
  const output = candidate as Partial<ElectoralInterpretationResult>;
  if (!Array.isArray(output.interpretations) || !Array.isArray(output.executiveReading) || !Array.isArray(output.provenance) || !output.quality) throw new Error('MALFORMED_PROVIDER_OUTPUT');
  if (output.schemaVersion !== ELECTORAL_INTERPRETATION_SCHEMA_VERSION || output.contextVersion !== context.schemaVersion) throw new Error('UNSUPPORTED_PROVIDER_OUTPUT_VERSION');
  if (output.quality.mode !== 'DETERMINISTIC' || output.quality.guardValidation !== 'PASS' || !Array.isArray(output.quality.recommendations) || output.quality.recommendations.length > 0) throw new Error('UNSAFE_PROVIDER_OUTPUT');
  for (const entry of output.interpretations) {
    if (!entry || entry.assertionClass !== 'INTERPRETATION' || typeof entry.id !== 'string' || typeof entry.statement !== 'string' || !Array.isArray(entry.basedOnFacts) || !Array.isArray(entry.basedOnSignals) || !Array.isArray(entry.evidenceRefs)) throw new Error('MALFORMED_PROVIDER_OUTPUT');
  }
  assertValidElectoralInterpretations(context, output.interpretations);
  return output as ElectoralInterpretationResult;
}

export class DeterministicElectoralInterpretationProvider implements ElectoralInterpretationProvider {
  interpret(context: ElectoralInterpretationContext): ElectoralInterpretationResult { return interpretElectoralContext(context); }
}
