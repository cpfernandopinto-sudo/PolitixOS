/**
 * INTEL-DOMAIN-02 (Missão E) — Contrato de Briefing Executivo cross-domain: FACTS + TOP
 * SIGNALS + LIMITATIONS + síntese LLM OPCIONAL (nunca obrigatória, nunca preenchida
 * deterministicamente por este módulo). Responde às 5 perguntas do gate:
 * (1) o que mudou -> `whatChanged`; (2) top 3 sinais -> `topSignals`;
 * (3) onde está o risco / (4) onde está a oportunidade -> `attention` (categoria
 * RISK/OPPORTUNITY); (5) o que precisa de monitoramento -> `attention` (categoria
 * MONITOR). Nenhuma recomendação factual é inventada: todo item de `attention` reusa
 * literalmente `signal.title`/`signal.summary` já governados pelos guards de cada
 * domínio — este módulo nunca gera prosa nova.
 *
 * REGRA CRÍTICA (mesma disciplina de `electoral-intelligence.test.ts`, que proíbe termos
 * como "risco eleitoral"/"oportunidade eleitoral", e de `electoral-briefing.ts`, cujo
 * guardrail declara `recommendations: []`): sinais do domínio ELEITORAL NUNCA são
 * classificados como RISK/OPPORTUNITY — o domínio não tem um eixo natural de "bom"/"ruim"
 * (comparecimento subir não é uma vitória ou derrota para ninguém, por si só). Sinais
 * eleitorais só entram em `whatChanged` e, quando factualmente relevantes (mudança de
 * vencedor/partido/turno decisivo), em `attention` como MONITOR — nunca RISK/OPPORTUNITY.
 */

import type { AnalyticalSignal, ConfidenceClass, Fact, IntelligenceDomain } from './contracts';

export type AttentionCategory = 'RISK' | 'OPPORTUNITY' | 'MONITOR';

export interface BriefingAttentionItem {
  domain: IntelligenceDomain;
  category: AttentionCategory;
  signalId: string;
  headline: string;
  evidenceRefs: string[];
  confidence: ConfidenceClass | null;
}

export interface TerritoryExecutiveBriefing {
  territoryId: string;
  facts: Fact[];
  topSignals: AnalyticalSignal[];
  whatChanged: AnalyticalSignal[];
  attention: BriefingAttentionItem[];
  limitations: string[];
  /** Síntese narrativa opcional de LLM — nunca preenchida por este módulo (camada determinística). */
  llmSynthesis: null;
}

const ECONOMY_RISK_MARKERS = ['decelerating', 'deterioration', 'contraction'];
const ECONOMY_OPPORTUNITY_MARKERS = ['accelerating', 'recovery', 'expansion'];
const SECURITY_RISK_MARKERS = ['violence_rising', 'recent_spike', 'persistent_high_level', 'category_shift'];
const SECURITY_OPPORTUNITY_MARKERS = ['violence_falling', 'recent_improvement'];
/** Só eventos factuais de "precisa de acompanhamento" — nunca risco/oportunidade (ver cabeçalho). */
const ELECTORAL_MONITOR_MARKERS = ['winner_changed', 'winning_party_changed', 'decision_moved_to_runoff'];
const CHANGE_TYPES = new Set(['TREND', 'CHANGE']);

function classify(signal: AnalyticalSignal): BriefingAttentionItem | null {
  const id = signal.id.toLowerCase();
  const domain = signal.domains[0] ?? 'desconhecido';
  const base = { domain, signalId: signal.id, headline: signal.title, evidenceRefs: signal.evidenceRefs, confidence: signal.confidence };
  if (domain === 'economia') {
    if (ECONOMY_RISK_MARKERS.some((marker) => id.includes(marker))) return { ...base, category: 'RISK' };
    if (ECONOMY_OPPORTUNITY_MARKERS.some((marker) => id.includes(marker))) return { ...base, category: 'OPPORTUNITY' };
  }
  if (domain === 'seguranca') {
    if (SECURITY_RISK_MARKERS.some((marker) => id.includes(marker))) return { ...base, category: 'RISK' };
    if (SECURITY_OPPORTUNITY_MARKERS.some((marker) => id.includes(marker))) return { ...base, category: 'OPPORTUNITY' };
  }
  if (domain === 'eleitoral' && ELECTORAL_MONITOR_MARKERS.some((marker) => id.includes(marker))) return { ...base, category: 'MONITOR' };
  return null;
}

/**
 * Monta `TerritoryExecutiveBriefing` a partir de `Fact[]`/`AnalyticalSignal[]` já
 * computados por qualquer combinação de domínios (nunca recalcula nada). Puro,
 * determinístico, sem chamada de rede/LLM.
 */
export function buildTerritoryExecutiveBriefing(territoryId: string, facts: Fact[], signals: AnalyticalSignal[], limitations: string[] = []): TerritoryExecutiveBriefing {
  const active = signals.filter((signal) => signal.status === 'ACTIVE' && signal.evidenceRefs.length > 0);
  const topSignals = [...active].sort((a, b) => b.period.localeCompare(a.period)).slice(0, 3);
  const whatChanged = active.filter((signal) => CHANGE_TYPES.has(signal.type));
  const attention = active.map(classify).filter((item): item is BriefingAttentionItem => item !== null);
  return { territoryId, facts, topSignals, whatChanged, attention, limitations, llmSynthesis: null };
}
