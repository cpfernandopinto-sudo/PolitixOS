/**
 * INTEL-DOMAIN-02 (Missão C) — Facts de Segurança (L1/L2 -> L3), sobre a série real
 * SEJUSP-MG (`../../seguranca-analytics.ts`, `SECURITY_INDICATOR_CATALOG`). NUNCA
 * recalcula a série bruta — apenas aritmética simples e determinística por cima de
 * `SecuritySeriesPoint[]` já persistidos (mesmo espírito de
 * `../economy/caged-facts.ts`: fact "não suportado" declara `supported:false` e
 * `value:null` em vez de fabricar um número quando o dado é insuficiente).
 *
 * NÃO chama Gemini/LLM. Este módulo é puramente determinístico (Missão C do gate:
 * "NÃO conectar Gemini ainda").
 */

import type { SecuritySeriesPoint } from '../../seguranca-analytics';
import type { Fact, Limitation } from '../contracts';
import { SECURITY_THRESHOLDS } from './security-thresholds';

const DATASET = 'crimes-violentos';

export interface SecurityIndicatorSeries {
  indicatorKey: string;
  label: string;
  points: SecuritySeriesPoint[];
}

export interface BuildSecurityFactsOptions {
  /**
   * Séries dos demais indicadores de natureza de crime (nunca o índice agregado
   * `indice_crimes_violentos` em si) do mesmo território, usadas exclusivamente para os
   * facts cross-indicador `dominant_nature`/`natures_rising`/`natures_falling`.
   */
  peerSeries?: SecurityIndicatorSeries[];
}

function evidenceRef(territoryId: string, indicatorKey: string, period: string): string {
  return `db:${territoryId}:${indicatorKey}:${DATASET}:${period}`;
}

function ordered(points: SecuritySeriesPoint[]): SecuritySeriesPoint[] {
  return [...points].filter((point) => Number.isFinite(point.value)).sort((a, b) => a.period.localeCompare(b.period));
}

function fact(input: { id: string; territoryId: string; key: string; label: string; value: number | string | null; unit: string | null; period: string; evidenceRefs: string[]; supported: boolean; limitations?: Limitation[] }): Fact {
  return { domain: 'seguranca', derivedIndicatorRefs: [], limitations: [], ...input };
}

function insufficientLimitation(description: string): Limitation[] {
  return [{ code: 'INSUFFICIENT_PERIODS', description, domain: 'seguranca' }];
}

/**
 * Deriva `Fact[]` da série de UM indicador (tipicamente `indice_crimes_violentos`, o
 * índice agregado oficial) mais, opcionalmente, os facts cross-indicador de dominância
 * setorial entre os demais tipos de crime (`options.peerSeries`).
 */
export function buildSecurityFacts(territoryId: string, indicatorKey: string, indicatorLabel: string, points: SecuritySeriesPoint[], options: BuildSecurityFactsOptions = {}): Fact[] {
  const series = ordered(points);
  if (series.length === 0) return [];
  const facts: Fact[] = [];
  const latest = series.at(-1)!;
  const previous = series.length >= 2 ? series.at(-2)! : null;
  const average = Number((series.reduce((sum, point) => sum + point.value, 0) / series.length).toFixed(4));
  const peak = series.reduce((a, b) => (b.value > a.value ? b : a));
  const low = series.reduce((a, b) => (b.value < a.value ? b : a));

  facts.push(fact({ id: `fact:${territoryId}:${indicatorKey}:current_value:${latest.period}`, territoryId, key: 'current_value', label: `${indicatorLabel} (valor atual)`, value: latest.value, unit: 'ocorrências', period: latest.period, evidenceRefs: [evidenceRef(territoryId, indicatorKey, latest.period)], supported: true }));

  facts.push(fact({
    id: `fact:${territoryId}:${indicatorKey}:previous_value:${latest.period}`, territoryId, key: 'previous_value', label: `${indicatorLabel} (período anterior)`,
    value: previous ? previous.value : null, unit: 'ocorrências', period: latest.period,
    evidenceRefs: previous ? [evidenceRef(territoryId, indicatorKey, previous.period)] : [], supported: previous !== null,
    limitations: previous ? undefined : insufficientLimitation('Não há período anterior na série disponível.'),
  }));

  const delta = previous ? latest.value - previous.value : null;
  facts.push(fact({
    id: `fact:${territoryId}:${indicatorKey}:delta:${latest.period}`, territoryId, key: 'delta', label: `${indicatorLabel} (variação absoluta frente ao período anterior)`,
    value: delta, unit: 'ocorrências', period: latest.period,
    evidenceRefs: previous ? [evidenceRef(territoryId, indicatorKey, previous.period), evidenceRef(territoryId, indicatorKey, latest.period)] : [], supported: delta !== null,
    limitations: delta !== null ? undefined : insufficientLimitation('Não há período anterior para calcular delta.'),
  }));

  const deltaPercent = previous && previous.value !== 0 ? Number((((latest.value - previous.value) / Math.abs(previous.value)) * 100).toFixed(2)) : null;
  facts.push(fact({
    id: `fact:${territoryId}:${indicatorKey}:delta_percent:${latest.period}`, territoryId, key: 'delta_percent', label: `${indicatorLabel} (variação percentual frente ao período anterior)`,
    value: deltaPercent, unit: '%', period: latest.period,
    evidenceRefs: previous && previous.value !== 0 ? [evidenceRef(territoryId, indicatorKey, previous.period), evidenceRef(territoryId, indicatorKey, latest.period)] : [], supported: deltaPercent !== null,
    limitations: deltaPercent !== null ? undefined : insufficientLimitation('Não há período anterior com valor diferente de zero para calcular variação percentual.'),
  }));

  facts.push(fact({ id: `fact:${territoryId}:${indicatorKey}:average:${latest.period}`, territoryId, key: 'average', label: `${indicatorLabel} (média da série disponível)`, value: average, unit: 'ocorrências', period: latest.period, evidenceRefs: series.map((point) => evidenceRef(territoryId, indicatorKey, point.period)), supported: true }));
  facts.push(fact({ id: `fact:${territoryId}:${indicatorKey}:peak:${peak.period}`, territoryId, key: 'peak', label: `${indicatorLabel} (pico da série)`, value: peak.value, unit: 'ocorrências', period: peak.period, evidenceRefs: [evidenceRef(territoryId, indicatorKey, peak.period)], supported: true }));
  facts.push(fact({ id: `fact:${territoryId}:${indicatorKey}:low:${low.period}`, territoryId, key: 'low', label: `${indicatorLabel} (mínimo da série)`, value: low.value, unit: 'ocorrências', period: low.period, evidenceRefs: [evidenceRef(territoryId, indicatorKey, low.period)], supported: true }));

  // --- tendência: últimas N variações consecutivas no mesmo sentido (nunca fabricada a partir de 1 delta só) ---
  const deltas = series.slice(1).map((point, index) => point.value - series[index].value);
  const minDeltas = SECURITY_THRESHOLDS.TREND_MIN_CONSECUTIVE_DELTAS;
  const trendSupported = deltas.length >= minDeltas;
  const lastDeltas = deltas.slice(-minDeltas);
  let trendValue: 'subindo' | 'caindo' | 'estavel' | null = null;
  if (trendSupported) {
    if (lastDeltas.every((d) => d > 0)) trendValue = 'subindo';
    else if (lastDeltas.every((d) => d < 0)) trendValue = 'caindo';
    else if (lastDeltas.every((d) => d === 0)) trendValue = 'estavel';
  }
  facts.push(fact({
    id: `fact:${territoryId}:${indicatorKey}:trend:${latest.period}`, territoryId, key: 'trend', label: `${indicatorLabel} (tendência)`,
    value: trendValue, unit: null, period: latest.period,
    evidenceRefs: trendValue !== null ? series.slice(-(minDeltas + 1)).map((point) => evidenceRef(territoryId, indicatorKey, point.period)) : [], supported: trendValue !== null,
    limitations: trendValue !== null ? undefined : insufficientLimitation(`É preciso pelo menos ${minDeltas} variações consecutivas no mesmo sentido para declarar tendência.`),
  }));

  // --- mudança de direção: sinal do último delta difere do penúltimo ---
  const reversalSupported = deltas.length >= 2;
  const reversalIsTrue = reversalSupported && Math.sign(deltas.at(-1)!) !== 0 && Math.sign(deltas.at(-2)!) !== 0 && Math.sign(deltas.at(-1)!) !== Math.sign(deltas.at(-2)!);
  const reversalValue: 'sim' | 'nao' | null = reversalSupported ? (reversalIsTrue ? 'sim' : 'nao') : null;
  facts.push(fact({
    id: `fact:${territoryId}:${indicatorKey}:direction_change:${latest.period}`, territoryId, key: 'direction_change', label: `${indicatorLabel} (mudança de direção frente ao período anterior)`,
    value: reversalValue, unit: null, period: latest.period,
    evidenceRefs: reversalSupported ? series.slice(-3).map((point) => evidenceRef(territoryId, indicatorKey, point.period)) : [], supported: reversalSupported,
    limitations: reversalSupported ? undefined : insufficientLimitation('É preciso pelo menos 2 variações consecutivas para avaliar mudança de direção.'),
  }));

  // --- nível persistentemente elevado: últimos N períodos, todos >= média da série ---
  const minPersistent = SECURITY_THRESHOLDS.PERSISTENT_HIGH_MIN_PERIODS;
  const persistentSupported = series.length >= minPersistent;
  const persistentValue: 'sim' | 'nao' | null = persistentSupported ? (series.slice(-minPersistent).every((point) => point.value >= average) ? 'sim' : 'nao') : null;
  facts.push(fact({
    id: `fact:${territoryId}:${indicatorKey}:persistent_high_level:${latest.period}`, territoryId, key: 'persistent_high_level', label: `${indicatorLabel} (nível persistentemente elevado nos últimos ${minPersistent} períodos)`,
    value: persistentValue, unit: null, period: latest.period,
    evidenceRefs: persistentSupported ? series.slice(-minPersistent).map((point) => evidenceRef(territoryId, indicatorKey, point.period)) : [], supported: persistentSupported,
    limitations: persistentSupported ? undefined : insufficientLimitation(`É preciso pelo menos ${minPersistent} períodos na série para avaliar persistência.`),
  }));

  // --- cross-indicador: natureza dominante (atual e anterior) / naturezas em crescimento/queda ---
  if (options.peerSeries && options.peerSeries.length > 0) {
    const peers = options.peerSeries
      .map((series2) => ({ series2, ordered: ordered(series2.points) }))
      .filter((item) => item.ordered.length > 0 && item.ordered.at(-1)!.period === latest.period);
    if (peers.length > 0) {
      const withCurrent = peers.map((item) => ({ key: item.series2.indicatorKey, label: item.series2.label, current: item.ordered.at(-1)!.value }));
      const dominant = withCurrent.reduce((a, b) => (b.current > a.current ? b : a));
      facts.push(fact({
        id: `fact:${territoryId}:dominant_nature:${latest.period}`, territoryId, key: 'dominant_nature', label: 'Natureza de crime dominante no período (maior valor absoluto entre as naturezas avaliadas)',
        value: dominant.label, unit: null, period: latest.period, evidenceRefs: [evidenceRef(territoryId, dominant.key, latest.period)], supported: true,
      }));

      const peersWithPrevious = peers.filter((item) => item.ordered.length >= 2);
      if (peersWithPrevious.length > 0) {
        const previousPeriod = peersWithPrevious[0].ordered.at(-2)!.period;
        const sharePreviousPeriod = peersWithPrevious.every((item) => item.ordered.at(-2)!.period === previousPeriod);
        if (sharePreviousPeriod) {
          const withPrevious = peersWithPrevious.map((item) => ({ key: item.series2.indicatorKey, label: item.series2.label, previous: item.ordered.at(-2)!.value }));
          const previousDominant = withPrevious.reduce((a, b) => (b.previous > a.previous ? b : a));
          facts.push(fact({
            id: `fact:${territoryId}:dominant_nature:${previousPeriod}`, territoryId, key: 'dominant_nature', label: 'Natureza de crime dominante no período (maior valor absoluto entre as naturezas avaliadas)',
            value: previousDominant.label, unit: null, period: previousPeriod, evidenceRefs: [evidenceRef(territoryId, previousDominant.key, previousPeriod)], supported: true,
          }));
        }
      }

      const withDelta = peersWithPrevious.map((item) => item.ordered.at(-1)!.value - item.ordered.at(-2)!.value);
      const rising = withDelta.filter((d) => d > 0).length;
      const falling = withDelta.filter((d) => d < 0).length;
      const risingRefs = peersWithPrevious.map((item) => evidenceRef(territoryId, item.series2.indicatorKey, latest.period));
      facts.push(fact({ id: `fact:${territoryId}:natures_rising:${latest.period}`, territoryId, key: 'natures_rising', label: 'Quantidade de naturezas de crime em crescimento no período', value: withDelta.length > 0 ? rising : null, unit: 'naturezas', period: latest.period, evidenceRefs: withDelta.length > 0 ? risingRefs : [], supported: withDelta.length > 0, limitations: withDelta.length > 0 ? undefined : insufficientLimitation('Nenhuma natureza avaliada tem período anterior para calcular delta.') }));
      facts.push(fact({ id: `fact:${territoryId}:natures_falling:${latest.period}`, territoryId, key: 'natures_falling', label: 'Quantidade de naturezas de crime em queda no período', value: withDelta.length > 0 ? falling : null, unit: 'naturezas', period: latest.period, evidenceRefs: withDelta.length > 0 ? risingRefs : [], supported: withDelta.length > 0, limitations: withDelta.length > 0 ? undefined : insufficientLimitation('Nenhuma natureza avaliada tem período anterior para calcular delta.') }));
    }
  }

  return facts;
}
