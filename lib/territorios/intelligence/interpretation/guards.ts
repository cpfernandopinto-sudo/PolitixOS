/**
 * INTEL-03A — Guards específicos do domínio Economia para L4 (seções 17-24, 30-38 do
 * gate).
 *
 * Complementa `../guardrails.ts` (TRACEABILITY/NUMBER/ENTITY/CAUSALITY/PREDICTION/
 * RECOMMENDATION_LEAK/IDEOLOGY/SENSITIVE_INFERENCE, já cross-domain e reutilizados sem
 * alteração — ver `validator.ts`). Este arquivo só adiciona o que é específico de
 * L4-econômico e não existe no guard genérico: normatividade, atribuição política
 * (extensão do CAUSALITY genérico), nominalidade, semântica de PIB per capita e
 * fidelidade temporal.
 */

import type { AnalyticalSignal } from '../contracts';
import type { ConsolidatedSignal } from '../economy/consolidation';
import { friendlyNameForIndicator } from './indicator-labels';
import type { InterpretationClaim, InterpretationInputContext, InterpretationUnit } from './types';

export interface EconomyGuardError {
  code: 'NORMATIVE_CLAIM' | 'POLITICAL_ATTRIBUTION_CLAIM' | 'NOMINALITY_VIOLATION' | 'PIB_PER_CAPITA_SEMANTIC_VIOLATION' | 'TEMPORAL_MISREPRESENTATION' | 'FORECAST_CLAIM';
  claimId: string;
  detail: string;
}

function normalize(value: string): string {
  return ` ${value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR')} `;
}

function containsPhrase(normalized: string, phrase: string): boolean {
  return normalized.includes(normalize(phrase).trim());
}

// Seção 19 — bloqueia juízo de valor sem metodologia explícita que o sustente.
const NORMATIVE_PHRASES = ['bom', 'ruim', 'otimo', 'pessimo', 'eficiente', 'ineficiente', 'fracasso', 'sucesso', 'melhor gestao', 'pior gestao', 'ma gestao', 'boa gestao', 'adequado', 'inadequado', 'positivo para', 'negativo para'];

// Seção 20 — bloqueia atribuição política/administrativa sem evidência de atribuição.
const POLITICAL_ATTRIBUTION_PHRASES = ['o prefeito', 'a prefeita', 'prefeito causou', 'prefeita causou', 'gestao e responsavel', 'gestao causou', 'gestao municipal causou', 'partido gerou', 'a oposicao', 'o governo municipal causou', 'administracao causou'];

// Seção 18 — previsão de futuro, complementa PREDICTION genérico de ../guardrails.ts
// (que só cobre "vai crescer"/"vai cair" e vocabulário eleitoral). Disjunto daquela
// lista para nunca duplicar o mesmo erro em dois guards diferentes.
const FORECAST_PHRASES = ['vai piorar', 'vai melhorar', 'deve piorar', 'deve melhorar', 'deve crescer', 'deve cair', 'deve aumentar', 'deve diminuir', 'tende a piorar', 'tende a melhorar', 'tende a crescer', 'tende a cair', 'vai aumentar', 'vai diminuir', 'vai subir', 'vai descer', 'tende a vencer'];

// Seção 32 — nunca "real"/"poder de compra" sobre valor nominal.
const NOMINALITY_FORBIDDEN_PHRASES = ['crescimento real', 'ganho real', 'expansao real', 'aumento real', 'queda real', 'reducao real', 'em termos reais', 'poder de compra', 'variacao real'];

// Seção 33 — PIB per capita não é renda/riqueza individual.
const PIB_PER_CAPITA_FORBIDDEN_PHRASES = ['renda media', 'salario medio', 'riqueza individual', 'renda per capita da populacao', 'quanto cada habitante ganha', 'renda de cada morador'];

// Seção 30-31 — imediatismo nunca é correto para dado anual/mensal defasado (sempre passado).
const TEMPORAL_IMMEDIACY_PHRASES = ['atualmente', 'hoje', 'agora', 'neste momento', 'no momento atual', 'nos dias de hoje'];

function wordBoundaryMatch(normalized: string, phrase: string): boolean {
  const escaped = normalize(phrase).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'u').test(normalized);
}

function unitById(units: InterpretationUnit[]): Map<string, InterpretationUnit> {
  return new Map(units.map((unit) => [unit.id, unit]));
}

/** FISCAL/PIB_VAB_MONETARY via ECON_VAR_YOY_V1 é sempre nominal (seção 32); OFFICIAL_SHARE é p.p., nunca "real". */
export function unitIsNominal(unit: InterpretationUnit): boolean {
  if (unit.kind === 'RAW_SIGNAL') return (unit.signal as AnalyticalSignal).limitations.some((limitation) => limitation.code === 'NOMINAL_VALUE');
  return unit.family === 'FISCAL' || unit.family === 'PIB_VAB_MONETARY';
}

export function unitIndicators(unit: InterpretationUnit): string[] {
  if (unit.kind === 'CONSOLIDATED_SIGNAL') return [(unit.signal as ConsolidatedSignal).indicator];
  const refs = unit.derivedIndicatorRefs.map((ref) => ref.split(':')).filter((parts) => parts.length === 5).map((parts) => parts[2]);
  return [...new Set(refs)];
}

/**
 * INTEL-03C.2 (Etapa 2 do gate) — deriva `knownEntities` (para o guard ENTITY genérico,
 * `../guardrails.ts`) exclusivamente dos indicadores REALMENTE presentes nas unidades
 * selecionadas deste contexto, traduzidos para nome por extenso via o catálogo fechado
 * `indicator-labels.ts`. Nunca inclui uma fonte/instituição/entidade externa — o
 * catálogo só conhece os 19 indicadores do motor econômico (`../economy/engine.ts`).
 * Uma entidade fabricada (ex.: "Instituto Fiscal Independente") nunca aparece aqui,
 * porque nunca é um indicador do motor — continua sendo rejeitada pelo guard ENTITY,
 * sem nenhum afrouxamento (seção "Guardrails" do gate).
 */
export function deriveKnownEntitiesFromContext(context: InterpretationInputContext): string[] {
  const names = new Set<string>();
  for (const unit of context.units) {
    for (const indicator of unitIndicators(unit)) {
      const friendly = friendlyNameForIndicator(indicator);
      if (friendly) names.add(friendly);
    }
  }
  return [...names];
}

function claimUnits(claim: InterpretationClaim, units: InterpretationUnit[]): InterpretationUnit[] {
  const index = unitById(units);
  return claim.signalRefs.map((ref) => index.get(ref)).filter((unit): unit is InterpretationUnit => Boolean(unit));
}

function extractedYears(text: string): number[] {
  return [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0]));
}

/**
 * INTEL-ELECTORAL-01 — achado de auditoria: para períodos mensais no formato YYYYMM
 * (ex.: CAGED, "202506"), o split original nunca produzia um token de 4 dígitos (a
 * string inteira tem 6 dígitos e nenhum separador não-numérico), então `validYears`
 * ficava sempre vazio e o guard de TEMPORAL_MISREPRESENTATION era silenciosamente
 * pulado (`validYears.size > 0` nunca era verdadeiro) para qualquer unidade CAGED.
 * Extrai também o ano de um token de 6 dígitos puro (YYYYMM), sem alterar nenhum
 * comportamento existente para período anual "AAAA" ou intervalos "AAAA-AAAA".
 */
function periodYears(period: string): number[] {
  const tokens = period.split(/[^0-9]+/);
  const years = tokens.filter((token) => /^\d{4}$/.test(token)).map(Number);
  const monthTokens = tokens.filter((token) => /^\d{6}$/.test(token)).map((token) => Number(token.slice(0, 4)));
  return [...new Set([...years, ...monthTokens])];
}

/**
 * Valida os guards específicos de Economia, claim a claim (seção 45 do gate — não
 * apenas o texto global da Interpretation). Não decide sozinho: `validator.ts`
 * combina isto com `../guardrails.ts` para o resultado final.
 */
export function validateEconomyGuards(context: InterpretationInputContext, claims: InterpretationClaim[]): EconomyGuardError[] {
  const errors: EconomyGuardError[] = [];
  for (const claim of claims) {
    const normalized = normalize(claim.text);
    const units = claimUnits(claim, context.units);

    for (const phrase of NORMATIVE_PHRASES) if (wordBoundaryMatch(normalized, phrase)) errors.push({ code: 'NORMATIVE_CLAIM', claimId: claim.id, detail: phrase });
    for (const phrase of POLITICAL_ATTRIBUTION_PHRASES) if (containsPhrase(normalized, phrase)) errors.push({ code: 'POLITICAL_ATTRIBUTION_CLAIM', claimId: claim.id, detail: phrase });
    for (const phrase of TEMPORAL_IMMEDIACY_PHRASES) if (wordBoundaryMatch(normalized, phrase)) errors.push({ code: 'TEMPORAL_MISREPRESENTATION', claimId: claim.id, detail: `imediatismo proibido: "${phrase}"` });
    for (const phrase of FORECAST_PHRASES) if (containsPhrase(normalized, phrase)) errors.push({ code: 'FORECAST_CLAIM', claimId: claim.id, detail: phrase });

    if (units.some(unitIsNominal)) {
      for (const phrase of NOMINALITY_FORBIDDEN_PHRASES) if (containsPhrase(normalized, phrase)) errors.push({ code: 'NOMINALITY_VIOLATION', claimId: claim.id, detail: phrase });
    }

    const indicators = units.flatMap(unitIndicators);
    if (indicators.includes('pib_per_capita_precos_correntes')) {
      for (const phrase of PIB_PER_CAPITA_FORBIDDEN_PHRASES) if (containsPhrase(normalized, phrase)) errors.push({ code: 'PIB_PER_CAPITA_SEMANTIC_VIOLATION', claimId: claim.id, detail: phrase });
    }

    const validYears = new Set(units.flatMap((unit) => periodYears(unit.period)));
    for (const year of extractedYears(claim.text)) {
      if (validYears.size > 0 && !validYears.has(year)) errors.push({ code: 'TEMPORAL_MISREPRESENTATION', claimId: claim.id, detail: `ano citado (${year}) fora dos períodos das unidades referenciadas (${[...validYears].sort().join(', ')})` });
    }
  }
  return errors;
}
