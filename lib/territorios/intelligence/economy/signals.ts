/**
 * INTEL-02 — Regras de AnalyticalSignal (L3) do domínio Economia.
 *
 * Cada regra é uma função pura e determinística: mesmos DerivedIndicators/Evidence
 * de entrada produzem exatamente os mesmos sinais de saída, na mesma ordem canônica
 * (definida em `engine.ts`, não aqui).
 *
 * Nenhuma regra usa RISK/OPPORTUNITY como SignalType (proibido pelo contrato — seção 20
 * do gate). Nenhuma regra julga governo ("economia boa/ruim") — apenas descreve o
 * fenômeno observado (seção 38 do gate).
 */

import type { AnalyticalSignal, Limitation } from '../contracts';
import { ECON_THRESHOLDS } from './thresholds';
import type { NominalYoyVariation, OfficialShareObservation, PercentagePointChange, PercentageShare } from './derived-indicators';
import type { Evidence } from '../contracts';

const ENGINE_METHOD_VERSION = 'v1';

function nominalLimitation(): Limitation {
  return { code: 'NOMINAL_VALUE', description: 'Sinal derivado de valores nominais, sem deflator; não representa poder de compra real.', domain: 'economia' };
}

function baseSignal(partial: Omit<AnalyticalSignal, 'status' | 'confidence' | 'methodVersion'> & { methodVersion?: string }): AnalyticalSignal {
  return { status: 'ACTIVE', confidence: 'DIRECTLY_SUPPORTED', methodVersion: ENGINE_METHOD_VERSION, ...partial };
}

// ---------------------------------------------------------------------------
// TREND — trajetória persistente (mínimo 3 intervalos consecutivos, mesmo sentido)
// ---------------------------------------------------------------------------

export function detectTrend(territoryId: string, variations: NominalYoyVariation[], changeThresholdPct: number = ECON_THRESHOLDS.CHANGE_YOY_THRESHOLD_PCT_FISCAL.value): AnalyticalSignal[] {
  const minPeriods = ECON_THRESHOLDS.TREND_MIN_CONSECUTIVE_PERIODS.value;
  if (variations.length < minPeriods) return [];
  // Precisa ser uma cadeia verdadeiramente consecutiva (toYear[i] === fromYear[i+1]), não apenas N variações quaisquer.
  const chains: NominalYoyVariation[][] = [];
  let current: NominalYoyVariation[] = [variations[0]];
  for (let i = 1; i < variations.length; i++) {
    if (variations[i].fromYear === current.at(-1)!.toYear) current.push(variations[i]);
    else { chains.push(current); current = [variations[i]]; }
  }
  chains.push(current);

  const signals: AnalyticalSignal[] = [];
  for (const chain of chains) {
    if (chain.length < minPeriods) continue;
    const window = chain.slice(-minPeriods);
    const sign = Math.sign(window[0].variationPct);
    if (sign === 0) continue;
    const allSameSign = window.every((item) => Math.sign(item.variationPct) === sign);
    if (!allSameSign) continue;
    const direction = sign > 0 ? 'crescente' : 'decrescente';
    const fromYear = window[0].fromYear;
    const toYear = window.at(-1)!.toYear;
    signals.push(baseSignal({
      id: `signal:economia:trend:${variations[0].indicatorId}:${fromYear}-${toYear}`,
      territoryId,
      domains: ['economia'],
      type: 'TREND',
      priority: null,
      severity: window.every((item) => Math.abs(item.variationPct) >= changeThresholdPct) ? 'HIGH' : 'MODERATE',
      title: `Trajetória ${direction} de ${window[0].indicatorId}`,
      summary: `${window[0].indicatorId} apresentou variação nominal ${direction} em ${window.length} intervalos anuais consecutivos comparáveis, de ${fromYear} a ${toYear}.`,
      evidenceRefs: [...new Set(window.flatMap((item) => item.evidenceRefs))],
      derivedIndicatorRefs: window.map((item) => `derived:${territoryId}:${item.indicatorId}:ECON_VAR_YOY_V1:${item.fromYear}-${item.toYear}`),
      period: `${fromYear}-${toYear}`,
      limitations: [nominalLimitation()],
      methodId: 'ECON_SIGNAL_TREND_V1',
    }));
  }
  return signals;
}

// ---------------------------------------------------------------------------
// CHANGE — variação pontual acima do threshold
// ---------------------------------------------------------------------------

export function detectChange(territoryId: string, variations: NominalYoyVariation[], threshold: number = ECON_THRESHOLDS.CHANGE_YOY_THRESHOLD_PCT_FISCAL.value): AnalyticalSignal[] {
  return variations
    .filter((item) => Math.abs(item.variationPct) >= threshold)
    .map((item) => baseSignal({
      id: `signal:economia:change:${item.indicatorId}:${item.fromYear}-${item.toYear}`,
      territoryId,
      domains: ['economia'],
      type: 'CHANGE',
      priority: null,
      severity: Math.abs(item.variationPct) >= threshold * 2 ? 'HIGH' : 'MODERATE',
      title: `Mudança relevante em ${item.indicatorId} (${item.fromYear}→${item.toYear})`,
      summary: `${item.indicatorId} variou ${item.variationPct.toFixed(1)}% (nominal) entre ${item.fromYear} e ${item.toYear}, acima do limiar de ${threshold}%.`,
      evidenceRefs: [...item.evidenceRefs],
      derivedIndicatorRefs: [`derived:${territoryId}:${item.indicatorId}:ECON_VAR_YOY_V1:${item.fromYear}-${item.toYear}`],
      period: `${item.fromYear}-${item.toYear}`,
      limitations: [nominalLimitation()],
      methodId: 'ECON_SIGNAL_CHANGE_V1',
    }));
}

// ---------------------------------------------------------------------------
// PRESSURE — despesa crescendo persistentemente acima da receita (mesma categoria "corrente")
// ---------------------------------------------------------------------------

export function detectPressure(territoryId: string, revenueVariations: NominalYoyVariation[], expenseVariations: NominalYoyVariation[]): AnalyticalSignal[] {
  const revenueByPeriod = new Map(revenueVariations.map((item) => [`${item.fromYear}-${item.toYear}`, item]));
  const paired = expenseVariations
    .map((expense) => ({ expense, revenue: revenueByPeriod.get(`${expense.fromYear}-${expense.toYear}`) }))
    .filter((item): item is { expense: NominalYoyVariation; revenue: NominalYoyVariation } => Boolean(item.revenue))
    .sort((a, b) => a.expense.toYear - b.expense.toYear);

  const recent = paired.slice(-3);
  if (recent.length < ECON_THRESHOLDS.PRESSURE_MIN_PERSISTENT_INTERVALS.value) return [];
  const pressureIntervals = recent.filter((item) => item.expense.variationPct > item.revenue.variationPct);
  if (pressureIntervals.length < ECON_THRESHOLDS.PRESSURE_MIN_PERSISTENT_INTERVALS.value) return [];

  const fromYear = recent[0].expense.fromYear;
  const toYear = recent.at(-1)!.expense.toYear;
  return [baseSignal({
    id: `signal:economia:pressure:despesa-corrente-vs-receita-corrente:${fromYear}-${toYear}`,
    territoryId,
    domains: ['economia'],
    type: 'PRESSURE',
    priority: null,
    severity: pressureIntervals.length === recent.length ? 'HIGH' : 'MODERATE',
    title: 'Despesa corrente crescendo persistentemente acima da receita corrente',
    summary: `Em ${pressureIntervals.length} de ${recent.length} intervalos anuais comparáveis recentes (${fromYear}-${toYear}), a variação nominal da despesa corrente superou a da receita corrente.`,
    evidenceRefs: [...new Set(pressureIntervals.flatMap((item) => [...item.expense.evidenceRefs, ...item.revenue.evidenceRefs]))],
    derivedIndicatorRefs: pressureIntervals.flatMap((item) => [
      `derived:${territoryId}:${item.expense.indicatorId}:ECON_VAR_YOY_V1:${item.expense.fromYear}-${item.expense.toYear}`,
      `derived:${territoryId}:${item.revenue.indicatorId}:ECON_VAR_YOY_V1:${item.revenue.fromYear}-${item.revenue.toYear}`,
    ]),
    period: `${fromYear}-${toYear}`,
    limitations: [nominalLimitation(), { code: 'NO_CAUSALITY', description: 'Não estabelece causa da pressão nem prevê insolvência; apenas descreve trajetória comparativa nominal.', domain: 'economia' }],
    methodId: 'ECON_SIGNAL_PRESSURE_V1',
  })];
}

// ---------------------------------------------------------------------------
// CONCENTRATION — participação de um componente acima do threshold no período mais recente
// ---------------------------------------------------------------------------

export function detectConcentration(territoryId: string, shares: PercentageShare[], threshold: number = ECON_THRESHOLDS.CONCENTRATION_SHARE_THRESHOLD_PCT_FISCAL.value): AnalyticalSignal[] {
  if (shares.length === 0) return [];
  const latest = shares.at(-1)!;
  if (latest.sharePct < threshold) return [];
  return [baseSignal({
    id: `signal:economia:concentration:${latest.numeratorIndicator}-em-${latest.denominatorIndicator}:${latest.year}`,
    territoryId,
    domains: ['economia'],
    type: 'CONCENTRATION',
    priority: null,
    severity: latest.sharePct >= 90 ? 'HIGH' : 'MODERATE',
    title: `${latest.numeratorIndicator} concentra a maior parte de ${latest.denominatorIndicator}`,
    summary: `Em ${latest.year}, ${latest.numeratorIndicator} representou ${latest.sharePct.toFixed(1)}% de ${latest.denominatorIndicator}, acima do limiar de concentração de ${threshold}%.`,
    evidenceRefs: [...latest.evidenceRefs],
    derivedIndicatorRefs: [`derived:${territoryId}:${latest.numeratorIndicator}-em-${latest.denominatorIndicator}:ECON_SHARE_V1:${latest.year}`],
    period: String(latest.year),
    limitations: [{ code: 'PARTICIPATION_NOT_CAUSATION', description: 'Concentração não implica dependência causal nem julgamento sobre qualidade do gasto.', domain: 'economia' }],
    methodId: 'ECON_SIGNAL_CONCENTRATION_V1',
  })];
}

// ---------------------------------------------------------------------------
// DIVERGENCE — dois indicadores relacionados variando em sentidos opostos no mesmo período
// ---------------------------------------------------------------------------

export function detectDivergence(territoryId: string, seriesA: NominalYoyVariation[], seriesB: NominalYoyVariation[]): AnalyticalSignal[] {
  const byPeriodB = new Map(seriesB.map((item) => [`${item.fromYear}-${item.toYear}`, item]));
  const signals: AnalyticalSignal[] = [];
  for (const a of seriesA) {
    const b = byPeriodB.get(`${a.fromYear}-${a.toYear}`);
    if (!b) continue;
    const signA = Math.sign(a.variationPct);
    const signB = Math.sign(b.variationPct);
    if (signA === 0 || signB === 0 || signA === signB) continue;
    signals.push(baseSignal({
      id: `signal:economia:divergence:${a.indicatorId}-vs-${b.indicatorId}:${a.fromYear}-${a.toYear}`,
      territoryId,
      domains: ['economia'],
      type: 'DIVERGENCE',
      priority: null,
      severity: 'MODERATE',
      title: `${a.indicatorId} e ${b.indicatorId} moveram-se em sentidos opostos`,
      summary: `Entre ${a.fromYear} e ${a.toYear}, ${a.indicatorId} variou ${a.variationPct.toFixed(1)}% enquanto ${b.indicatorId} variou ${b.variationPct.toFixed(1)}% — movimentos em sentidos opostos no mesmo intervalo.`,
      evidenceRefs: [...new Set([...a.evidenceRefs, ...b.evidenceRefs])],
      derivedIndicatorRefs: [
        `derived:${territoryId}:${a.indicatorId}:ECON_VAR_YOY_V1:${a.fromYear}-${a.toYear}`,
        `derived:${territoryId}:${b.indicatorId}:ECON_VAR_YOY_V1:${b.fromYear}-${b.toYear}`,
      ],
      period: `${a.fromYear}-${a.toYear}`,
      limitations: [nominalLimitation(), { code: 'NO_CAUSALITY', description: 'Divergência simultânea não estabelece relação causal entre os dois indicadores.', domain: 'economia' }],
      methodId: 'ECON_SIGNAL_DIVERGENCE_V1',
    }));
  }
  return signals;
}

// ---------------------------------------------------------------------------
// Sinais de PARTICIPAÇÃO SETORIAL OFICIAL (INTEL-02B) — sempre em pontos percentuais
// (p.p.), nunca variação relativa. Nunca usam ECON_SHARE_V1 (seção 7/44 do gate).
// ---------------------------------------------------------------------------

function officialShareLimitation(): Limitation {
  return { code: 'OFFICIAL_SHARE', description: 'Participação setorial oficial (IBGE), consumida diretamente; mudança expressa em pontos percentuais, não variação relativa.', domain: 'economia' };
}

/** TREND de participação setorial: mesma lógica de janela consecutiva do TREND monetário, mas sobre p.p. */
export function detectOfficialShareTrend(territoryId: string, changes: PercentagePointChange[]): AnalyticalSignal[] {
  const minPeriods = ECON_THRESHOLDS.TREND_MIN_CONSECUTIVE_PERIODS.value;
  if (changes.length < minPeriods) return [];
  const chains: PercentagePointChange[][] = [];
  let current: PercentagePointChange[] = [changes[0]];
  for (let i = 1; i < changes.length; i++) {
    if (changes[i].fromYear === current.at(-1)!.toYear) current.push(changes[i]);
    else { chains.push(current); current = [changes[i]]; }
  }
  chains.push(current);

  const signals: AnalyticalSignal[] = [];
  for (const chain of chains) {
    if (chain.length < minPeriods) continue;
    const window = chain.slice(-minPeriods);
    const sign = Math.sign(window[0].changePp);
    if (sign === 0) continue;
    if (!window.every((item) => Math.sign(item.changePp) === sign)) continue;
    const direction = sign > 0 ? 'crescente' : 'decrescente';
    const fromYear = window[0].fromYear;
    const toYear = window.at(-1)!.toYear;
    signals.push(baseSignal({
      id: `signal:economia:trend:${window[0].indicatorId}:${fromYear}-${toYear}`,
      territoryId,
      domains: ['economia'],
      type: 'TREND',
      priority: null,
      severity: window.every((item) => Math.abs(item.changePp) >= ECON_THRESHOLDS.CHANGE_PP_THRESHOLD_OFFICIAL_SHARE.value) ? 'HIGH' : 'MODERATE',
      title: `Trajetória ${direction} de participação de ${window[0].indicatorId}`,
      summary: `${window[0].indicatorId} apresentou mudança ${direction} em pontos percentuais em ${window.length} intervalos anuais consecutivos comparáveis, de ${fromYear} a ${toYear}.`,
      evidenceRefs: [...new Set(window.flatMap((item) => item.evidenceRefs))],
      // ECON_OFFICIAL_SHARE_SERIES_V1 produz um DerivedIndicator por ANO (consumo direto,
      // sem cálculo de intervalo — ver toOfficialShareDerivedIndicators em engine.ts), nunca
      // por intervalo fromYear-toYear; a referência precisa apontar para cada ano observado
      // na janela, não para um período composto que não existe no catálogo.
      derivedIndicatorRefs: [...new Set(window.flatMap((item) => [item.fromYear, item.toYear]))].map((year) => `derived:${territoryId}:${window[0].indicatorId}:ECON_OFFICIAL_SHARE_SERIES_V1:${year}`),
      period: `${fromYear}-${toYear}`,
      limitations: [officialShareLimitation()],
      methodId: 'ECON_SIGNAL_TREND_OFFICIAL_SHARE_V1',
    }));
  }
  return signals;
}

/** CHANGE de participação setorial: threshold em p.p. (seção 10 do gate), nunca reutiliza o threshold percentual fiscal. */
export function detectOfficialShareChange(territoryId: string, changes: PercentagePointChange[], thresholdPp: number = ECON_THRESHOLDS.CHANGE_PP_THRESHOLD_OFFICIAL_SHARE.value): AnalyticalSignal[] {
  return changes
    .filter((item) => Math.abs(item.changePp) >= thresholdPp)
    .map((item) => baseSignal({
      id: `signal:economia:change:${item.indicatorId}:${item.fromYear}-${item.toYear}`,
      territoryId,
      domains: ['economia'],
      type: 'CHANGE',
      priority: null,
      severity: Math.abs(item.changePp) >= thresholdPp * 2 ? 'HIGH' : 'MODERATE',
      title: `Mudança estrutural em ${item.indicatorId} (${item.fromYear}→${item.toYear})`,
      summary: `${item.indicatorId} mudou ${item.changePp >= 0 ? '+' : ''}${item.changePp.toFixed(2)} p.p. entre ${item.fromYear} e ${item.toYear} (de ${item.fromSharePct.toFixed(1)}% para ${item.toSharePct.toFixed(1)}%), acima do limiar de ${thresholdPp} p.p.`,
      evidenceRefs: [...item.evidenceRefs],
      // Ver nota em detectOfficialShareTrend: ECON_OFFICIAL_SHARE_SERIES_V1 indexa por ano
      // único, então uma mudança pontual referencia os dois anos-extremidade, não um intervalo.
      derivedIndicatorRefs: [
        `derived:${territoryId}:${item.indicatorId}:ECON_OFFICIAL_SHARE_SERIES_V1:${item.fromYear}`,
        `derived:${territoryId}:${item.indicatorId}:ECON_OFFICIAL_SHARE_SERIES_V1:${item.toYear}`,
      ],
      period: `${item.fromYear}-${item.toYear}`,
      limitations: [officialShareLimitation()],
      methodId: 'ECON_SIGNAL_CHANGE_OFFICIAL_SHARE_V1',
    }));
}

/**
 * CONCENTRATION setorial (INTEL-02C — seção 17 do gate): exige AMBOS
 *   (a) share do setor líder >= threshold, E
 *   (b) distância ao segundo colocado >= gapThreshold.
 * Antes do INTEL-02C, apenas (a) era exigido, o que fazia o sinal disparar
 * quase permanentemente em economias de serviços (ex.: 20/20 anos em BH) —
 * achado empírico documentado, não escondido (ver thresholds.ts).
 * Recebe as séries de TODOS os setores oficiais (mesmo denominador) para
 * poder calcular a distância ao segundo colocado no mesmo ano.
 */
export function detectOfficialShareConcentration(
  territoryId: string,
  allSectorSeries: OfficialShareObservation[][],
  threshold: number = ECON_THRESHOLDS.CONCENTRATION_SHARE_THRESHOLD_PCT_OFFICIAL_SHARE.value,
  gapThreshold: number = ECON_THRESHOLDS.CONCENTRATION_GAP_TO_SECOND_PCT_OFFICIAL_SHARE.value,
): AnalyticalSignal[] {
  const nonEmpty = allSectorSeries.filter((series) => series.length > 0);
  if (nonEmpty.length < 2) return []; // precisa de pelo menos 2 setores para comparar distância ao segundo.
  const latestYear = Math.min(...nonEmpty.map((series) => series.at(-1)!.year));
  const atLatestYear = nonEmpty.map((series) => series.find((item) => item.year === latestYear)).filter((item): item is OfficialShareObservation => Boolean(item));
  if (atLatestYear.length < 2) return [];
  const ranked = [...atLatestYear].sort((a, b) => b.sharePct - a.sharePct);
  const leader = ranked[0];
  const runnerUp = ranked[1];
  const gap = leader.sharePct - runnerUp.sharePct;
  if (leader.sharePct < threshold || gap < gapThreshold) return [];
  return [baseSignal({
    id: `signal:economia:concentration:${leader.indicatorId}:${leader.year}`,
    territoryId,
    domains: ['economia'],
    type: 'CONCENTRATION',
    priority: null,
    severity: leader.sharePct >= 65 ? 'HIGH' : 'MODERATE',
    title: `${leader.indicatorId} concentra a maior parte da estrutura produtiva`,
    summary: `Em ${leader.year}, ${leader.indicatorId} representou ${leader.sharePct.toFixed(1)}% do VAB total, ${gap.toFixed(1)} p.p. à frente do segundo colocado (${runnerUp.indicatorId}, ${runnerUp.sharePct.toFixed(1)}%) — acima dos limiares de share (${threshold}%) e de distância (${gapThreshold}pp).`,
    evidenceRefs: [leader.evidenceRef],
    derivedIndicatorRefs: [`derived:${territoryId}:${leader.indicatorId}:ECON_OFFICIAL_SHARE_SERIES_V1:${leader.year}`],
    period: String(leader.year),
    limitations: [officialShareLimitation(), { code: 'THRESHOLD_PRELIMINARY', description: 'Threshold pilot-calibrado com 3 municípios de MG — não é calibração nacional (ver seção 40 do gate INTEL-02C).', domain: 'economia' }],
    methodId: 'ECON_SIGNAL_CONCENTRATION_OFFICIAL_SHARE_V1',
  })];
}

/** ATTENTION setorial: participação recente fora da janela histórica própria (mesma lógica do ATTENTION fiscal, sobre série oficial). */
export function detectOfficialShareAttention(territoryId: string, series: OfficialShareObservation[]): AnalyticalSignal[] {
  const window = ECON_THRESHOLDS.BASELINE_WINDOW_YEARS.value;
  if (series.length < window + 1) return [];
  const latest = series.at(-1)!;
  const baseline = series.slice(-(window + 1), -1);
  const historicalMin = Math.min(...baseline.map((item) => item.sharePct));
  const historicalMax = Math.max(...baseline.map((item) => item.sharePct));
  if (latest.sharePct >= historicalMin && latest.sharePct <= historicalMax) return [];
  const direction = latest.sharePct < historicalMin ? 'abaixo' : 'acima';
  const reference = latest.sharePct < historicalMin ? historicalMin : historicalMax;
  return [baseSignal({
    id: `signal:economia:attention:${latest.indicatorId}:${latest.year}`,
    territoryId,
    domains: ['economia'],
    type: 'ATTENTION',
    priority: null,
    severity: 'MODERATE',
    title: `Participação de ${latest.indicatorId} fora da janela histórica`,
    summary: `Em ${latest.year}, a participação de ${latest.indicatorId} foi ${latest.sharePct.toFixed(1)}%, ${direction} da faixa observada nos ${window} exercícios anteriores comparáveis (${reference.toFixed(1)}%).`,
    evidenceRefs: [latest.evidenceRef],
    derivedIndicatorRefs: [`derived:${territoryId}:${latest.indicatorId}:ECON_OFFICIAL_SHARE_SERIES_V1:${latest.year}`],
    period: String(latest.year),
    limitations: [officialShareLimitation(), { code: 'HISTORICAL_WINDOW_LIMITED', description: `Baseline limitado à janela de ${window} exercícios anteriores disponíveis; não é comparação com benchmark externo.`, domain: 'economia' }],
    methodId: 'ECON_SIGNAL_ATTENTION_OFFICIAL_SHARE_V1',
  })];
}

// ---------------------------------------------------------------------------
// ANOMALY — outlier na própria série (IQR / Tukey), robusto para séries curtas
// ---------------------------------------------------------------------------

function quartile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

export function detectAnomaly(territoryId: string, variations: NominalYoyVariation[]): AnalyticalSignal[] {
  if (variations.length < 4) return []; // IQR exige amostra mínima para não fabricar falsa precisão.
  const values = variations.map((item) => item.variationPct).sort((a, b) => a - b);
  const q1 = quartile(values, 0.25);
  const q3 = quartile(values, 0.75);
  const iqr = q3 - q1;
  const multiplier = ECON_THRESHOLDS.ANOMALY_IQR_MULTIPLIER.value;
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;
  return variations
    .filter((item) => item.variationPct < lowerBound || item.variationPct > upperBound)
    .map((item) => baseSignal({
      id: `signal:economia:anomaly:${item.indicatorId}:${item.fromYear}-${item.toYear}`,
      territoryId,
      domains: ['economia'],
      type: 'ANOMALY',
      priority: null,
      severity: 'HIGH',
      title: `Variação atípica em ${item.indicatorId} (${item.fromYear}→${item.toYear})`,
      summary: `A variação nominal de ${item.variationPct.toFixed(1)}% entre ${item.fromYear} e ${item.toYear} está fora da faixa esperada pela própria série histórica de ${item.indicatorId} (método IQR, multiplicador ${multiplier}).`,
      evidenceRefs: [...item.evidenceRefs],
      derivedIndicatorRefs: [`derived:${territoryId}:${item.indicatorId}:ECON_VAR_YOY_V1:${item.fromYear}-${item.toYear}`],
      period: `${item.fromYear}-${item.toYear}`,
      limitations: [nominalLimitation(), { code: 'SHORT_SERIES', description: 'Detecção de outlier em série municipal curta; evitar falsa precisão estatística.', domain: 'economia' }],
      methodId: 'ECON_SIGNAL_ANOMALY_V1',
    }));
}

// ---------------------------------------------------------------------------
// ATTENTION — condição determinística relevante fora das categorias anteriores:
// participação cai abaixo do mínimo da própria janela histórica (seção 27 do gate).
// ---------------------------------------------------------------------------

export function detectAttention(territoryId: string, shares: PercentageShare[]): AnalyticalSignal[] {
  const window = ECON_THRESHOLDS.BASELINE_WINDOW_YEARS.value;
  if (shares.length < window + 1) return [];
  const latest = shares.at(-1)!;
  const baseline = shares.slice(-(window + 1), -1);
  const historicalMin = Math.min(...baseline.map((item) => item.sharePct));
  if (latest.sharePct >= historicalMin) return [];
  return [baseSignal({
    id: `signal:economia:attention:${latest.numeratorIndicator}-em-${latest.denominatorIndicator}:${latest.year}`,
    territoryId,
    domains: ['economia'],
    type: 'ATTENTION',
    priority: null,
    severity: 'MODERATE',
    title: `Participação de ${latest.numeratorIndicator} em ${latest.denominatorIndicator} abaixo da janela histórica`,
    summary: `Em ${latest.year}, a participação de ${latest.numeratorIndicator} em ${latest.denominatorIndicator} foi ${latest.sharePct.toFixed(1)}%, abaixo do mínimo observado nos ${window} exercícios anteriores comparáveis (${historicalMin.toFixed(1)}%).`,
    evidenceRefs: [...latest.evidenceRefs],
    derivedIndicatorRefs: [`derived:${territoryId}:${latest.numeratorIndicator}-em-${latest.denominatorIndicator}:ECON_SHARE_V1:${latest.year}`],
    period: String(latest.year),
    limitations: [{ code: 'HISTORICAL_WINDOW_LIMITED', description: `Baseline limitado à janela de ${window} exercícios anteriores disponíveis; não é comparação com benchmark externo.`, domain: 'economia' }],
    methodId: 'ECON_SIGNAL_ATTENTION_V1',
  })];
}

// ---------------------------------------------------------------------------
// INSUFFICIENT_EVIDENCE — estado explícito quando não há evidência para avaliar (seção 14/83 do gate)
// ---------------------------------------------------------------------------

export function insufficientEvidenceSignal(territoryId: string, indicatorId: string, reason: string): AnalyticalSignal {
  return {
    id: `signal:economia:insufficient:${indicatorId}`,
    territoryId,
    domains: ['economia'],
    type: 'ATTENTION',
    priority: null,
    severity: null,
    title: `Evidência insuficiente para ${indicatorId}`,
    summary: reason,
    evidenceRefs: [],
    derivedIndicatorRefs: [],
    period: 'N/A',
    status: 'INSUFFICIENT_EVIDENCE',
    confidence: null,
    limitations: [{ code: 'INSUFFICIENT_EVIDENCE', description: reason, domain: 'economia' }],
    methodId: 'ECON_SIGNAL_INSUFFICIENT_EVIDENCE_V1',
    methodVersion: ENGINE_METHOD_VERSION,
  };
}

export function evidenceExists(evidence: Evidence[], indicator: string): boolean {
  return evidence.some((item) => item.indicator === indicator);
}
