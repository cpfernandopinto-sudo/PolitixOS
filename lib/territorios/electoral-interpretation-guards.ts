import type { ElectoralInterpretationContext } from './electoral-interpretation-context';

export interface GuardableInterpretation {
  id: string;
  statement: string;
  basedOnFacts: string[];
  basedOnSignals: string[];
  evidenceRefs: string[];
}

export interface ElectoralGuardResult {
  valid: boolean;
  errors: Array<{ interpretationId: string; guard: 'TRACEABILITY' | 'NUMBER' | 'ENTITY' | 'CAUSALITY' | 'PREDICTION' | 'RECOMMENDATION' | 'IDEOLOGY'; value: string }>;
}

const CAUSALITY = [' porque ', ' causou ', ' provocou ', ' resultado de ', ' devido a '];
const PREDICTION = ['vai vencer', 'deve vencer', 'favorito', 'probabilidade de vitória', 'tendência de vitória', 'chance de'];
const RECOMMENDATION = ['o candidato deve', 'a campanha deve', 'é preciso atacar', 'deve explorar', 'deve focar', 'estratégia recomendada'];
const IDEOLOGY = ['esquerda', 'direita', 'centro', 'conservador', 'progressista'];

function normalize(value: string): string {
  return ` ${value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')} `;
}

function supportedNumbers(context: ElectoralInterpretationContext): number[] {
  const values: number[] = [];
  const visit = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) values.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit({ elections: context.elections, signals: context.signals, benchmark: context.benchmark });
  return values;
}

function extractedNumbers(statement: string): number[] {
  return [...statement.matchAll(/(?<![\p{L}\d])[-+]?\d+(?:[.,]\d+)?/gu)].map((match) => Number(match[0].replace(',', '.'))).filter(Number.isFinite);
}

function numberSupported(value: number, supported: number[]): boolean {
  return supported.some((candidate) => Math.abs(candidate - value) < 1e-9 || Math.abs(Number(candidate.toFixed(3)) - value) < 1e-9 || Math.abs(Number(candidate.toFixed(2)) - value) < 1e-9 || Math.abs(Number(candidate.toFixed(1)) - value) < 1e-9);
}

function knownEntities(context: ElectoralInterpretationContext): string[] {
  const electionEntities = context.elections
    .flatMap((item) => [item.winner, item.winnerParty, item.runnerUp, item.runnerUpParty])
    .filter((item): item is string => Boolean(item));
  return [...new Set([context.territory.municipio, ...electionEntities])];
}

export function validateElectoralInterpretations(context: ElectoralInterpretationContext, interpretations: GuardableInterpretation[]): ElectoralGuardResult {
  const errors: ElectoralGuardResult['errors'] = [];
  const numbers = supportedNumbers(context);
  const entities = knownEntities(context);
  const evidence = new Set(context.sourcesUsed.evidenceHashes);
  for (const item of interpretations) {
    const normalized = normalize(item.statement);
    if (item.basedOnFacts.length + item.basedOnSignals.length === 0 || item.evidenceRefs.length === 0 || item.evidenceRefs.some((ref) => !evidence.has(ref))) errors.push({ interpretationId: item.id, guard: 'TRACEABILITY', value: 'suporte ou evidência ausente' });
    for (const value of extractedNumbers(item.statement)) if (!numberSupported(value, numbers)) errors.push({ interpretationId: item.id, guard: 'NUMBER', value: String(value) });
    const capitalized = [...item.statement.matchAll(/\b[\p{Lu}][\p{L}À-ÖØ-öø-ÿ.]+(?:\s+[\p{Lu}][\p{L}À-ÖØ-öø-ÿ.]+)+\b/gu)].map((match) => match[0]);
    for (const entity of capitalized) if (!entities.some((known) => normalize(known).trim() === normalize(entity).trim())) errors.push({ interpretationId: item.id, guard: 'ENTITY', value: entity });
    for (const phrase of CAUSALITY) if (normalized.includes(phrase) && !normalized.includes('nao permitem determinar a causa')) errors.push({ interpretationId: item.id, guard: 'CAUSALITY', value: phrase.trim() });
    for (const phrase of PREDICTION) if (normalized.includes(phrase)) errors.push({ interpretationId: item.id, guard: 'PREDICTION', value: phrase });
    for (const phrase of RECOMMENDATION) if (normalized.includes(phrase)) errors.push({ interpretationId: item.id, guard: 'RECOMMENDATION', value: phrase });
    for (const phrase of IDEOLOGY) if (new RegExp(`\\b${phrase}\\b`, 'u').test(normalized)) errors.push({ interpretationId: item.id, guard: 'IDEOLOGY', value: phrase });
  }
  return { valid: errors.length === 0, errors };
}

export function assertValidElectoralInterpretations(context: ElectoralInterpretationContext, interpretations: GuardableInterpretation[]): void {
  const result = validateElectoralInterpretations(context, interpretations);
  if (!result.valid) throw new Error(`ELECTORAL_INTERPRETATION_REJECTED:${JSON.stringify(result.errors)}`);
}
