/**
 * INTEL-DOMAIN-02 (Missão F) — Contrato do Radar Territorial. Cada item NASCE de uma
 * mudança mensurável real: um `AnalyticalSignal` já computado deterministicamente
 * (economia/eleitoral/segurança), nunca um texto genérico. `headline` reusa
 * literalmente `signal.title` (já governado pelos guards de cada domínio) — este módulo
 * nunca gera prosa nova.
 *
 * Exemplo do gate ("Saldo de empregos desacelerou pelo terceiro mês") só apareceria
 * aqui se fosse literalmente verdade — isto é garantido por construção, porque um
 * `RadarItem` só existe quando existe um `AnalyticalSignal` real com `status:'ACTIVE'`
 * e `evidenceRefs` não-vazio por trás dele.
 */

import type { AnalyticalSignal, ConfidenceClass, IntelligenceDomain } from './contracts';

export interface RadarItem {
  id: string;
  territoryId: string;
  domain: IntelligenceDomain;
  headline: string;
  signalId: string;
  period: string;
  confidence: ConfidenceClass | null;
  evidenceRefs: string[];
}

/**
 * Deriva `RadarItem[]` a partir de `AnalyticalSignal[]` já computados por qualquer
 * domínio — só inclui sinais `ACTIVE` com evidência real, nunca um item sem lastro.
 * Puro, determinístico, sem chamada de rede/LLM.
 */
export function buildTerritoryRadar(territoryId: string, signals: AnalyticalSignal[]): RadarItem[] {
  return signals
    .filter((signal) => signal.status === 'ACTIVE' && signal.evidenceRefs.length > 0)
    .map((signal) => ({
      id: `radar:${signal.id}`, territoryId, domain: signal.domains[0] ?? 'desconhecido',
      headline: signal.title, signalId: signal.id, period: signal.period,
      confidence: signal.confidence, evidenceRefs: signal.evidenceRefs,
    }));
}
