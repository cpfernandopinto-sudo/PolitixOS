/**
 * INTEL-DOMAIN-02 (Missão C) — Signals de Segurança (L3), a partir dos Facts de
 * `security-facts.ts`. Cada signal só é produzido quando o(s) fact(s) que o sustentam
 * têm `supported:true` — ausência de dado suficiente nunca vira signal fabricado (mesmo
 * padrão de `../economy/caged-employment-signals.ts`).
 *
 * NÃO chama Gemini/LLM (Missão C do gate: "NÃO conectar Gemini ainda").
 *
 * Thresholds usados aqui são os de `security-thresholds.ts`, documentados naquele
 * arquivo. RECENT_SPIKE/RECENT_IMPROVEMENT exigem que o valor atual seja literalmente o
 * pico/mínimo da série E ultrapasse o multiplicador da média — não dispara em qualquer
 * variação, só em desvio real e documentável.
 */

import type { AnalyticalSignal, Fact } from '../contracts';
import { SECURITY_THRESHOLDS } from './security-thresholds';

const METHOD_ID = 'SECURITY_SIGNALS_V1';
const METHOD_VERSION = 'intel-domain-02-v1';

export type SecuritySignalType =
  | 'VIOLENCE_RISING'
  | 'VIOLENCE_FALLING'
  | 'RECENT_SPIKE'
  | 'RECENT_IMPROVEMENT'
  | 'PERSISTENT_HIGH_LEVEL'
  | 'CATEGORY_SHIFT';

function findFact(facts: Fact[], key: string, period?: string): Fact | undefined {
  return facts.find((item) => item.key === key && item.supported && (period === undefined || item.period === period));
}

function baseSignal(type: SecuritySignalType, territoryId: string, indicatorLabel: string, period: string, title: string, summary: string, evidenceRefs: string[]): AnalyticalSignal {
  return {
    id: `signal:seguranca:${type.toLowerCase()}:${territoryId}:${period}`,
    territoryId, domains: ['seguranca'], type: type === 'CATEGORY_SHIFT' ? 'CHANGE' : type === 'PERSISTENT_HIGH_LEVEL' ? 'PRESSURE' : type.startsWith('RECENT') ? 'ANOMALY' : 'TREND',
    priority: null, severity: null, title, summary, evidenceRefs, derivedIndicatorRefs: [], period,
    status: 'ACTIVE', confidence: 'DIRECTLY_SUPPORTED', limitations: [], methodId: METHOD_ID, methodVersion: METHOD_VERSION,
  };
}

/**
 * Deriva os sinais de UM indicador de segurança a partir de `Fact[]` já calculados por
 * `buildSecurityFacts` para esse mesmo indicador. Puro, determinístico, sem chamada de
 * rede/LLM.
 */
export function buildSecurityIndicatorSignals(territoryId: string, indicatorLabel: string, facts: Fact[]): AnalyticalSignal[] {
  const signals: AnalyticalSignal[] = [];
  const current = findFact(facts, 'current_value');
  const trend = findFact(facts, 'trend');
  const average = findFact(facts, 'average');
  const peak = findFact(facts, 'peak');
  const low = findFact(facts, 'low');
  const persistent = findFact(facts, 'persistent_high_level');
  const period = current?.period ?? facts[0]?.period;
  if (!period) return signals;

  if (trend && (trend.value === 'subindo' || trend.value === 'caindo')) {
    const rising = trend.value === 'subindo';
    signals.push(baseSignal(
      rising ? 'VIOLENCE_RISING' : 'VIOLENCE_FALLING', territoryId, indicatorLabel, period,
      rising ? `${indicatorLabel}: tendência de alta` : `${indicatorLabel}: tendência de queda`,
      rising ? `As últimas variações de "${indicatorLabel}" foram consistentemente positivas.` : `As últimas variações de "${indicatorLabel}" foram consistentemente negativas.`,
      trend.evidenceRefs,
    ));
  }

  if (current && peak && average && current.period === peak.period && Number(current.value) === Number(peak.value) && Number(peak.value) >= Number(average.value) * SECURITY_THRESHOLDS.SPIKE_MULTIPLIER) {
    signals.push(baseSignal('RECENT_SPIKE', territoryId, indicatorLabel, period, `${indicatorLabel}: pico recente acima da média`, `O valor do período mais recente é o maior de toda a série disponível e supera a média em pelo menos ${SECURITY_THRESHOLDS.SPIKE_MULTIPLIER}x.`, [...new Set([...current.evidenceRefs, ...average.evidenceRefs])]));
  }

  if (current && low && average && current.period === low.period && Number(current.value) === Number(low.value) && Number(average.value) > 0 && Number(low.value) <= Number(average.value) / SECURITY_THRESHOLDS.IMPROVEMENT_DIVISOR) {
    signals.push(baseSignal('RECENT_IMPROVEMENT', territoryId, indicatorLabel, period, `${indicatorLabel}: melhora recente abaixo da média`, `O valor do período mais recente é o menor de toda a série disponível e fica abaixo da média por um fator de pelo menos ${SECURITY_THRESHOLDS.IMPROVEMENT_DIVISOR}x.`, [...new Set([...current.evidenceRefs, ...average.evidenceRefs])]));
  }

  if (persistent && persistent.value === 'sim') {
    signals.push(baseSignal('PERSISTENT_HIGH_LEVEL', territoryId, indicatorLabel, period, `${indicatorLabel}: nível persistentemente elevado`, `Os últimos ${SECURITY_THRESHOLDS.PERSISTENT_HIGH_MIN_PERIODS} períodos ficaram todos em ou acima da média da série.`, persistent.evidenceRefs));
  }

  return signals;
}

/**
 * Deriva CATEGORY_SHIFT a partir dos facts cross-indicador `dominant_nature` (atual e
 * anterior) — só dispara quando ambos os períodos têm uma natureza dominante suportada e
 * ela realmente muda de um período para o outro.
 */
export function buildSecurityCategoryShiftSignal(territoryId: string, facts: Fact[]): AnalyticalSignal[] {
  const dominantFacts = facts.filter((item) => item.key === 'dominant_nature' && item.supported).sort((a, b) => a.period.localeCompare(b.period));
  if (dominantFacts.length < 2) return [];
  const previous = dominantFacts.at(-2)!;
  const current = dominantFacts.at(-1)!;
  if (previous.value === current.value) return [];
  return [baseSignal('CATEGORY_SHIFT', territoryId, 'Naturezas de crime', current.period, 'Mudança na natureza de crime dominante', `A natureza de crime dominante mudou de "${previous.value}" (${previous.period}) para "${current.value}" (${current.period}).`, [...new Set([...previous.evidenceRefs, ...current.evidenceRefs])])];
}
