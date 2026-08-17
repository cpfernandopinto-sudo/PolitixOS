/**
 * INTEL-02 — Catálogo e cálculo de DerivedIndicators (L2) do domínio Economia.
 *
 * Determinístico, puro, sem side-effects. Nenhuma chamada de rede/banco.
 * Toda variação monetária é sempre NOMINAL (fonte a preços correntes, sem deflator —
 * seção 11 do gate). Nunca converte ausência de dado em zero (seção 14).
 */

import type { Evidence, Limitation } from '../contracts';
import type { EconomyDerivedIndicatorCatalogEntry } from './types';
import { EconomyEngineError } from './types';

// ---------------------------------------------------------------------------
// Catálogo formal (seção 9 do gate) — priorizado, não exaustivo.
// ---------------------------------------------------------------------------

export const ECON_VAR_YOY_V1 = 'ECON_VAR_YOY_V1';
export const ECON_SHARE_V1 = 'ECON_SHARE_V1';
export const ECON_OFFICIAL_SHARE_SERIES_V1 = 'ECON_OFFICIAL_SHARE_SERIES_V1';

export const ECONOMY_DERIVED_INDICATOR_CATALOG: readonly EconomyDerivedIndicatorCatalogEntry[] = [
  {
    id: 'variacao_nominal_interanual',
    name: 'Variação nominal interanual',
    domain: 'economia',
    description: 'Variação percentual nominal de um indicador monetário entre dois exercícios anuais consecutivos e comparáveis, a preços correntes.',
    formula: '(valor_t - valor_t-1) / |valor_t-1| * 100',
    inputs: ['evidence(indicador, ano_t)', 'evidence(indicador, ano_t-1)'],
    unit: '%',
    comparability: 'Exige ambos os períodos anuais completos (AAAA-01-01..AAAA-12-31) e consecutivos (ano_t = ano_t-1 + 1).',
    limitations: ['Valor nominal, sem deflator — não representa poder de compra real.'],
    methodId: ECON_VAR_YOY_V1,
    methodVersion: 'v1',
  },
  {
    id: 'participacao_percentual',
    name: 'Participação percentual (razão entre grandezas)',
    domain: 'economia',
    description: 'Razão percentual entre um componente e sua categoria agregadora, no mesmo período.',
    formula: 'componente / agregador * 100',
    inputs: ['evidence(componente, ano)', 'evidence(agregador, ano)'],
    unit: '%',
    comparability: 'Exige ambos os indicadores no mesmo período exato.',
    limitations: ['Participação alta não implica dependência causal.'],
    methodId: ECON_SHARE_V1,
    methodVersion: 'v1',
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers de série (Evidence[] -> série ordenada por período)
// ---------------------------------------------------------------------------

export interface YearlyObservation {
  year: number;
  value: number;
  evidenceRef: string;
}

function isFourDigitYear(period: string): boolean {
  return /^\d{4}$/.test(period);
}

/** Extrai a série de um indicador específico a partir de Evidence[], ordenada por ano — determinística independente da ordem de entrada (seção 57 do gate). */
export function seriesForIndicator(evidence: Evidence[], indicator: string): YearlyObservation[] {
  return evidence
    .filter((item) => item.indicator === indicator && typeof item.value === 'number' && isFourDigitYear(item.period))
    .map((item) => ({ year: Number(item.period), value: item.value as number, evidenceRef: item.id }))
    .sort((a, b) => a.year - b.year);
}

function periodsComparable(yearA: number, yearB: number): boolean {
  return yearB === yearA + 1;
}

// ---------------------------------------------------------------------------
// ECON_VAR_YOY_V1 — variação nominal interanual
// ---------------------------------------------------------------------------

export interface NominalYoyVariation {
  indicatorId: string;
  fromYear: number;
  toYear: number;
  fromValue: number;
  toValue: number;
  variationPct: number;
  evidenceRefs: [string, string];
  methodId: typeof ECON_VAR_YOY_V1;
  methodVersion: 'v1';
  limitations: Limitation[];
}

/**
 * Calcula todas as variações nominais interanuais comparáveis de um indicador.
 * NUNCA compara períodos não consecutivos silenciosamente — pares não consecutivos são
 * simplesmente omitidos (não geram erro, pois a ausência de um ano intermediário é uma
 * condição válida de missing data, não uma falha de input — seção 12/14 do gate).
 */
export function calculateNominalYoyVariations(evidence: Evidence[], indicator: string): NominalYoyVariation[] {
  const series = seriesForIndicator(evidence, indicator);
  const results: NominalYoyVariation[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const curr = series[i];
    if (!periodsComparable(prev.year, curr.year)) continue; // ano intermediário ausente: não compara 2020 com 2022 como se fossem consecutivos.
    if (prev.value === 0) continue; // divisão por zero: sem base de comparação válida, não fabrica Infinity/NaN.
    const variationPct = ((curr.value - prev.value) / Math.abs(prev.value)) * 100;
    results.push({
      indicatorId: indicator,
      fromYear: prev.year,
      toYear: curr.year,
      fromValue: prev.value,
      toValue: curr.value,
      variationPct,
      evidenceRefs: [prev.evidenceRef, curr.evidenceRef],
      methodId: ECON_VAR_YOY_V1,
      methodVersion: 'v1',
      limitations: [{ code: 'NOMINAL_VALUE', description: 'Variação nominal, sem deflator; não representa poder de compra real.', domain: 'economia' }],
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// ECON_SHARE_V1 — participação percentual (razão entre grandezas no mesmo período)
// ---------------------------------------------------------------------------

export interface PercentageShare {
  numeratorIndicator: string;
  denominatorIndicator: string;
  year: number;
  numeratorValue: number;
  denominatorValue: number;
  sharePct: number;
  evidenceRefs: [string, string];
  methodId: typeof ECON_SHARE_V1;
  methodVersion: 'v1';
  limitations: Limitation[];
}

/** Calcula a participação percentual (numerador/denominador) para todo período em que ambos existem. */
export function calculatePercentageShares(evidence: Evidence[], numeratorIndicator: string, denominatorIndicator: string): PercentageShare[] {
  const numeratorSeries = new Map(seriesForIndicator(evidence, numeratorIndicator).map((item) => [item.year, item]));
  const denominatorSeries = seriesForIndicator(evidence, denominatorIndicator);
  const results: PercentageShare[] = [];
  for (const denom of denominatorSeries) {
    const num = numeratorSeries.get(denom.year);
    if (!num) continue; // ausência de um dos dois no mesmo período: não calcula, não fabrica.
    if (denom.value === 0) continue; // sem denominador válido.
    results.push({
      numeratorIndicator,
      denominatorIndicator,
      year: denom.year,
      numeratorValue: num.value,
      denominatorValue: denom.value,
      sharePct: (num.value / denom.value) * 100,
      evidenceRefs: [num.evidenceRef, denom.evidenceRef],
      methodId: ECON_SHARE_V1,
      methodVersion: 'v1',
      limitations: [{ code: 'PARTICIPATION_NOT_CAUSATION', description: 'Participação alta não implica dependência causal.', domain: 'economia' }],
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// ECON_OFFICIAL_SHARE_SERIES_V1 — participação setorial OFICIAL (IBGE), consumida
// diretamente. NUNCA recalculada via ECON_SHARE_V1 (seção 7/24/44 do gate INTEL-02B):
// o valor já é a evidência primária publicada pelo IBGE, não uma razão derivada.
// ---------------------------------------------------------------------------

export interface OfficialShareObservation {
  indicatorId: string;
  year: number;
  sharePct: number;
  evidenceRef: string;
  methodId: typeof ECON_OFFICIAL_SHARE_SERIES_V1;
  methodVersion: 'v1';
  limitations: Limitation[];
}

/** Lê a série de participação oficial diretamente da Evidence — nenhuma divisão, nenhum recálculo. */
export function officialShareSeries(evidence: Evidence[], indicator: string): OfficialShareObservation[] {
  return seriesForIndicator(evidence, indicator).map((item) => ({
    indicatorId: indicator,
    year: item.year,
    sharePct: item.value,
    evidenceRef: item.evidenceRef,
    methodId: ECON_OFFICIAL_SHARE_SERIES_V1,
    methodVersion: 'v1',
    limitations: [{ code: 'OFFICIAL_SHARE', description: 'Participação setorial oficial publicada pelo IBGE, consumida diretamente — não recalculada a partir dos VABs monetários.', domain: 'economia' }],
  }));
}

export interface PercentagePointChange {
  indicatorId: string;
  fromYear: number;
  toYear: number;
  fromSharePct: number;
  toSharePct: number;
  changePp: number;
  evidenceRefs: [string, string];
  methodId: typeof ECON_OFFICIAL_SHARE_SERIES_V1;
  methodVersion: 'v1';
  limitations: Limitation[];
}

/**
 * Mudança em pontos percentuais (não variação relativa — seção 9 do gate INTEL-02B):
 * indústria 30% -> 35% é "+5 p.p.", nunca "+16,67%".
 */
export function calculatePercentagePointChanges(evidence: Evidence[], indicator: string): PercentagePointChange[] {
  const series = officialShareSeries(evidence, indicator);
  const results: PercentagePointChange[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const curr = series[i];
    if (!periodsComparable(prev.year, curr.year)) continue;
    results.push({
      indicatorId: indicator,
      fromYear: prev.year,
      toYear: curr.year,
      fromSharePct: prev.sharePct,
      toSharePct: curr.sharePct,
      changePp: curr.sharePct - prev.sharePct,
      evidenceRefs: [prev.evidenceRef, curr.evidenceRef],
      methodId: ECON_OFFICIAL_SHARE_SERIES_V1,
      methodVersion: 'v1',
      limitations: [{ code: 'OFFICIAL_SHARE', description: 'Mudança em pontos percentuais de participação oficial IBGE; não é variação relativa nem recálculo.', domain: 'economia' }],
    });
  }
  return results;
}

/** ID determinístico (seção 45 do gate): mesmos inputs + método + período => mesma identidade. */
export function derivedIndicatorId(indicatorId: string, methodId: string, period: string, territoryId: string): string {
  return `derived:${territoryId}:${indicatorId}:${methodId}:${period}`;
}

export function assertKnownIndicator(indicatorId: string, known: readonly string[]): void {
  if (!known.includes(indicatorId)) throw new EconomyEngineError('MISSING_REQUIRED_INDICATOR', indicatorId);
}
