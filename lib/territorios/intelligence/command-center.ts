/**
 * INTEL-DOMAIN-02 (Missão D) — Contrato de síntese territorial para o Command Center do
 * frontend. NÃO constrói frontend (fora de escopo deste gate) — apenas o formato de
 * dados que o Command Center consumiria, `{ economy, electoral, security }`, cada um com
 * status/headline/direction/severity/confidence/period/evidenceRefs.
 *
 * Nenhum texto de LLM é exigido: cada `DomainExecutiveSignal` é derivado inteiramente do
 * `AnalyticalSignal` mais relevante já computado deterministicamente por
 * `economy/caged-employment-signals.ts`, `electoral/electoral-signals.ts` ou
 * `security/security-signals.ts`. O Command Center funciona mesmo sem Gemini disponível
 * — este contrato não depende de nenhum provider.
 *
 * `direction` descreve o sentido do ÚNICO signal mais relevante escolhido para o
 * domínio (nunca uma "média" ou "saldo" do domínio inteiro) — deliberado: um domínio
 * como Eleitoral não tem um eixo único de "bom"/"ruim" (comparecimento subir e margem
 * estreitar são, ao mesmo tempo, direções diferentes e sem polaridade política inerente
 * — ver `direction()` abaixo). `direction` é sempre RISING/FALLING/STABLE/MIXED/UNKNOWN
 * — nunca IMPROVING/WORSENING — para não embutir juízo de valor político no contrato
 * cross-domain (mesma disciplina de `electoral-intelligence.test.ts`, que proíbe termos
 * como "risco eleitoral"/"oportunidade eleitoral").
 */

import type { AnalyticalSignal, ConfidenceClass, IntelligenceDomain, SignalSeverity } from './contracts';

export type DomainSignalStatus = 'AVAILABLE' | 'INSUFFICIENT_DATA';
export type DomainSignalDirection = 'RISING' | 'FALLING' | 'STABLE' | 'MIXED' | 'UNKNOWN';

export interface DomainExecutiveSignal {
  domain: IntelligenceDomain;
  status: DomainSignalStatus;
  headline: string;
  direction: DomainSignalDirection;
  severity: SignalSeverity | null;
  confidence: ConfidenceClass | null;
  period: string | null;
  evidenceRefs: string[];
  signalId: string | null;
}

export interface TerritoryExecutiveSignals {
  territoryId: string;
  economy: DomainExecutiveSignal;
  electoral: DomainExecutiveSignal;
  security: DomainExecutiveSignal;
}

const RISING_MARKERS = ['increased', 'rising', 'expanded', 'accelerating', 'recovery', 'above_sample', 'spike', 'persistent_high'];
const FALLING_MARKERS = ['decreased', 'falling', 'narrowed', 'decelerating', 'deterioration', 'below_sample', 'improvement'];
const STABLE_MARKERS = ['unchanged_exactly', 'maintained', 'at_sample', 'round_unchanged'];
const MIXED_MARKERS = ['changed', 'shift', 'moved', 'reversal', 'concentration'];

function direction(signalId: string): DomainSignalDirection {
  const id = signalId.toLowerCase();
  if (RISING_MARKERS.some((marker) => id.includes(marker))) return 'RISING';
  if (FALLING_MARKERS.some((marker) => id.includes(marker))) return 'FALLING';
  if (STABLE_MARKERS.some((marker) => id.includes(marker))) return 'STABLE';
  if (MIXED_MARKERS.some((marker) => id.includes(marker))) return 'MIXED';
  return 'UNKNOWN';
}

function pickTopSignal(signals: AnalyticalSignal[]): AnalyticalSignal | null {
  const active = signals.filter((signal) => signal.status === 'ACTIVE' && signal.evidenceRefs.length > 0);
  if (active.length === 0) return null;
  return [...active].sort((a, b) => b.period.localeCompare(a.period))[0];
}

function unavailable(domain: IntelligenceDomain): DomainExecutiveSignal {
  return { domain, status: 'INSUFFICIENT_DATA', headline: 'Sem sinal suficiente para síntese executiva neste domínio.', direction: 'UNKNOWN', severity: null, confidence: null, period: null, evidenceRefs: [], signalId: null };
}

function toDomainExecutiveSignal(domain: IntelligenceDomain, signals: AnalyticalSignal[]): DomainExecutiveSignal {
  const top = pickTopSignal(signals);
  if (!top) return unavailable(domain);
  return {
    domain, status: 'AVAILABLE', headline: top.title, direction: direction(top.id),
    severity: top.severity, confidence: top.confidence, period: top.period,
    evidenceRefs: top.evidenceRefs, signalId: top.id,
  };
}

/**
 * Monta `TerritoryExecutiveSignals` a partir dos `AnalyticalSignal[]` já produzidos por
 * cada domínio (nunca recalcula nada). Puro, determinístico, sem chamada de rede/LLM —
 * funciona mesmo se nenhum provider Gemini/Anthropic estiver disponível.
 */
export function buildTerritoryExecutiveSignals(territoryId: string, input: { economySignals: AnalyticalSignal[]; electoralSignals: AnalyticalSignal[]; securitySignals: AnalyticalSignal[] }): TerritoryExecutiveSignals {
  return {
    territoryId,
    economy: toDomainExecutiveSignal('economia', input.economySignals),
    electoral: toDomainExecutiveSignal('eleitoral', input.electoralSignals),
    security: toDomainExecutiveSignal('seguranca', input.securitySignals),
  };
}
