/**
 * INTEL-01 — Guardrails cross-domain.
 *
 * Generaliza `electoral-interpretation-guards.ts` (já provado e testado no domínio
 * eleitoral) para qualquer domínio. Aplica-se igualmente a interpretações produzidas
 * por regra determinística, por humano ou — no futuro — por LLM: o validador não sabe
 * nem precisa saber a origem do texto, apenas se ele é rastreável e numericamente
 * consistente com o contexto fornecido.
 *
 * Não chama LLM. Não gera interpretação real. Apenas valida.
 */

import type { ConfidenceClass, Limitation } from './contracts';

export interface GuardableStatement {
  id: string;
  statement: string;
  basedOnFacts?: string[];
  basedOnSignals?: string[];
  evidenceRefs: string[];
}

export interface GuardrailContext {
  /** Todos os números realmente presentes no contexto (evidências, sinais, indicadores derivados) — qualquer número no texto deve corresponder a um destes. */
  supportedNumbers: number[];
  /** Entidades nomeadas conhecidas (município, nomes/partidos quando aplicável ao domínio) — nomes próprios no texto devem corresponder a uma destas. */
  knownEntities: string[];
  /** Hashes de evidência realmente presentes no contexto. */
  knownEvidenceHashes: string[];
}

export type GuardType = 'TRACEABILITY' | 'NUMBER' | 'ENTITY' | 'CAUSALITY' | 'PREDICTION' | 'RECOMMENDATION_LEAK' | 'IDEOLOGY' | 'SENSITIVE_INFERENCE';

export interface GuardError {
  statementId: string;
  guard: GuardType;
  value: string;
}

export interface GuardResult {
  valid: boolean;
  errors: GuardError[];
}

// Seção 44 — princípios de segurança política / neutralidade, cross-domain (generaliza a lista eleitoral).
const CAUSALITY_PHRASES = [' porque ', ' causou ', ' provocou ', ' resultado de ', ' devido a ', ' em razão de '];
const PREDICTION_PHRASES = ['vai vencer', 'deve vencer', 'favorito', 'probabilidade de', 'tendência de vitória', 'chance de', 'vai crescer', 'vai cair'];
const RECOMMENDATION_LEAK_PHRASES = ['deve fazer', 'é preciso', 'deve atacar', 'deve explorar', 'deve focar', 'estratégia recomendada', 'recomenda-se'];
const IDEOLOGY_PHRASES = ['esquerda', 'direita', 'centro', 'conservador', 'progressista'];
const SENSITIVE_INFERENCE_PHRASES = ['o eleitor pensa', 'a população acredita', 'a intenção de voto', 'provavelmente vai votar', 'é corrupto', 'cometeu corrupção', 'está corrompido'];

const CAUSALITY_DISCLAIMER = 'nao permitem determinar a causa';

function normalize(value: string): string {
  return ` ${value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR')} `;
}

function extractedNumbers(statement: string): number[] {
  return [...statement.matchAll(/(?<![\p{L}\d])[-+]?\d+(?:[.,]\d+)?/gu)].map((match) => Number(match[0].replace(',', '.'))).filter(Number.isFinite);
}

function numberSupported(value: number, supported: number[]): boolean {
  return supported.some((candidate) => Math.abs(candidate - value) < 1e-9 || Math.abs(Number(candidate.toFixed(3)) - value) < 1e-9 || Math.abs(Number(candidate.toFixed(2)) - value) < 1e-9 || Math.abs(Number(candidate.toFixed(1)) - value) < 1e-9);
}

// INTEL-03C (seção 17-19 do gate) — palavras função (artigos/contrações) que só ficam
// maiúsculas por estarem no início da frase, nunca por serem parte de um nome próprio.
// Achado real: "No VAB de serviços..." era capturado como suposta entidade desconhecida
// ("No VAB") só porque "No" (contração de "em o") abre a frase. Removendo palavras
// função do início do candidato antes de contar palavras, uma entidade real como
// "O Instituto Fiscal Independente" continua detectada (sobra "Instituto Fiscal
// Independente", 3 palavras) — só o par função+sigla isolado deixa de disparar.
const LEADING_FUNCTION_WORDS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'no', 'na', 'nos', 'nas', 'do', 'da', 'dos', 'das', 'ao', 'aos', 'de', 'em', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'e', 'ou', 'à', 'às']);

function stripLeadingFunctionWords(words: string[]): string[] {
  let start = 0;
  while (start < words.length - 1 && LEADING_FUNCTION_WORDS.has(words[start].normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR'))) start++;
  return words.slice(start);
}

function extractedProperNouns(statement: string): string[] {
  const rawMatches = [...statement.matchAll(/\b[\p{Lu}][\p{L}À-ÖØ-öø-ÿ.]+(?:\s+[\p{Lu}][\p{L}À-ÖØ-öø-ÿ.]+)+\b/gu)].map((match) => match[0]);
  const result: string[] = [];
  for (const match of rawMatches) {
    const remaining = stripLeadingFunctionWords(match.split(/\s+/));
    if (remaining.length >= 2) result.push(remaining.join(' '));
  }
  return result;
}

/**
 * Valida uma lista de afirmações (Interpretation/Implication/Recommendation) contra um contexto.
 * Independente da origem do texto (regra, humano ou modelo futuro) — sempre aplicável antes
 * de qualquer afirmação ser aceita no pipeline (seção 42–43, structured output + hallucination control).
 */
export function validateGuardableStatements(context: GuardrailContext, statements: GuardableStatement[]): GuardResult {
  const errors: GuardError[] = [];
  const evidenceSet = new Set(context.knownEvidenceHashes);
  for (const item of statements) {
    const normalized = normalize(item.statement);
    const supportCount = (item.basedOnFacts?.length ?? 0) + (item.basedOnSignals?.length ?? 0);
    if (supportCount === 0 || item.evidenceRefs.length === 0 || item.evidenceRefs.some((ref) => !evidenceSet.has(ref))) {
      errors.push({ statementId: item.id, guard: 'TRACEABILITY', value: 'suporte ou evidência ausente/não reconhecida' });
    }
    for (const value of extractedNumbers(item.statement)) {
      if (!numberSupported(value, context.supportedNumbers)) errors.push({ statementId: item.id, guard: 'NUMBER', value: String(value) });
    }
    for (const entity of extractedProperNouns(item.statement)) {
      const normalizedEntity = normalize(entity).trim();
      // INTEL-03C.2 — além da igualdade exata, aceita quando o candidato é um
      // FRAGMENTO de um knownEntity mais longo (ex.: "Saúde Públicas" dentro de
      // "Administração, Defesa, Educação, Saúde Públicas e Seguridade Social"). Nunca
      // o inverso (um knownEntity não pode ser apenas um fragmento do candidato) —
      // isso impediria que um candidato fabricado maior ("Instituto X Nacional")
      // passasse só por conter um trecho de um nome legítimo mais curto.
      const known = context.knownEntities.some((candidate) => {
        const normalizedKnown = normalize(candidate);
        return normalizedKnown.trim() === normalizedEntity || normalizedKnown.includes(` ${normalizedEntity} `);
      });
      if (!known) errors.push({ statementId: item.id, guard: 'ENTITY', value: entity });
    }
    for (const phrase of CAUSALITY_PHRASES) {
      if (normalized.includes(phrase) && !normalized.includes(CAUSALITY_DISCLAIMER)) errors.push({ statementId: item.id, guard: 'CAUSALITY', value: phrase.trim() });
    }
    for (const phrase of PREDICTION_PHRASES) if (normalized.includes(phrase)) errors.push({ statementId: item.id, guard: 'PREDICTION', value: phrase });
    for (const phrase of RECOMMENDATION_LEAK_PHRASES) if (normalized.includes(phrase)) errors.push({ statementId: item.id, guard: 'RECOMMENDATION_LEAK', value: phrase });
    for (const phrase of IDEOLOGY_PHRASES) if (new RegExp(`\\b${phrase}\\b`, 'u').test(normalized)) errors.push({ statementId: item.id, guard: 'IDEOLOGY', value: phrase });
    for (const phrase of SENSITIVE_INFERENCE_PHRASES) if (normalized.includes(normalize(phrase).trim())) errors.push({ statementId: item.id, guard: 'SENSITIVE_INFERENCE', value: phrase });
  }
  return { valid: errors.length === 0, errors };
}

export function assertValidGuardableStatements(context: GuardrailContext, statements: GuardableStatement[]): void {
  const result = validateGuardableStatements(context, statements);
  if (!result.valid) throw new Error(`INTELLIGENCE_STATEMENT_REJECTED:${JSON.stringify(result.errors)}`);
}

// Seção 41 — guardrails declarativos que devem viajar com o contexto de qualquer futuro provider (regra ou LLM).
export const INTELLIGENCE_ALLOWED_ACTIONS = [
  'descrever evolução registrada',
  'comparar valores presentes no contexto',
  'destacar mudanças observadas',
  'interpretar sinais com linguagem qualificada',
  'relacionar fatos presentes no contexto',
  'declarar insuficiência de evidência quando aplicável',
] as const;

export const INTELLIGENCE_PROHIBITED_ACTIONS = [
  'inventar causa',
  'inferir intenção do eleitor',
  'inferir opinião individual',
  'criar pesquisa inexistente',
  'inferir ideologia não fornecida',
  'prever resultado eleitoral ou econômico como fato',
  'transformar correlação em causalidade',
  'criar número inexistente',
  'omitir limitações relevantes',
  'inferir corrupção ou má conduta sem evidência direta',
  'inferir característica sensível de indivíduo',
  'fabricar consenso onde há sinais conflitantes',
  'criar fatos sobre candidatos/adversários não presentes na evidência',
  'alterar valor numérico de uma evidência',
  'criar fonte ou evento inexistente',
] as const;

export function confidenceFromEvidenceCount(evidenceRefCount: number, signalCount: number): ConfidenceClass {
  if (evidenceRefCount === 0) throw new Error('INSUFFICIENT_EVIDENCE');
  if (signalCount <= 1) return 'DIRECTLY_SUPPORTED';
  return 'MULTI_SIGNAL_SUPPORTED';
}

export function limitation(code: string, description: string, domain?: string): Limitation {
  return domain ? { code, description, domain } : { code, description };
}
