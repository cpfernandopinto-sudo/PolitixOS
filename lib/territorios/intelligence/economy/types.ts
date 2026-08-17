/**
 * INTEL-02 — Tipos de suporte do Motor de Inteligência Econômica.
 *
 * Reutiliza os contratos canônicos de `../contracts.ts` (Evidence, DerivedIndicator,
 * AnalyticalSignal, Coverage, TemporalCoverage, ConfidenceClass, Limitation) sem
 * paralelizá-los. Este arquivo define apenas o que é específico do domínio Economia
 * e não pertence ao contrato cross-domain (catálogo de fórmulas, política de dado
 * ausente, janela de baseline).
 */

import type { AnalyticalSignal, Coverage, DerivedIndicator, DomainAvailability, Evidence, Limitation, TemporalCoverage } from '../contracts';
import type { ThresholdFamily } from './thresholds';
import type { ConsolidatedSignal } from './consolidation';

/** Política declarada de tratamento de dado ausente — nunca implícita (seção 13/14 do gate). */
export interface MissingDataPolicy {
  window: number;
  minObservations: number;
  onInsufficientData: 'SKIP';
}

export interface EconomyDerivedIndicatorCatalogEntry {
  id: string;
  name: string;
  domain: 'economia';
  description: string;
  formula: string;
  inputs: string[];
  unit: 'BRL' | '%' | 'ratio';
  comparability: string;
  limitations: string[];
  methodId: string;
  methodVersion: string;
}

/**
 * INTEL-02B (seção 20/29 do gate): o contrato canônico (`Coverage`/`TemporalCoverage`)
 * não comporta detalhe por família de indicador dentro de um único domínio ('economia').
 * Em vez de alterar o contrato canônico amplamente, a Economia estende o resultado aqui
 * com detalhe por família (FISCAL/PIB_VAB_MONETARY/OFFICIAL_SHARE) — decisão documentada,
 * não uma alteração ao contrato cross-domain do INTEL-01.
 */
export interface EconomicIntelligenceResult {
  territoryId: string;
  engineVersion: string;
  derivedIndicators: DerivedIndicator[];
  signals: AnalyticalSignal[];
  /** Camada adicional, aditiva — nunca substitui `signals` (seção 29 do gate INTEL-02C). */
  consolidatedSignals: ConsolidatedSignal[];
  coverage: Coverage;
  coverageByFamily: Record<ThresholdFamily, DomainAvailability>;
  temporalCoverage: TemporalCoverage;
  temporalCoverageByFamily: Record<'FISCAL' | 'PIB_VAB_MONETARY' | 'OFFICIAL_SHARE', { periodStart: string; periodEnd: string } | null>;
  limitations: Limitation[];
  methodology: { methodId: string; methodVersion: string; description: string };
  evidenceIndex: Record<string, Evidence>;
}

export type EconomyEngineErrorCode =
  | 'INVALID_INPUT'
  | 'INSUFFICIENT_EVIDENCE'
  | 'INCOMPARABLE_PERIODS'
  | 'MISSING_REQUIRED_INDICATOR'
  | 'BROKEN_LINEAGE'
  | 'METHOD_ERROR';

export class EconomyEngineError extends Error {
  code: EconomyEngineErrorCode;
  constructor(code: EconomyEngineErrorCode, message: string) {
    super(`${code}:${message}`);
    this.code = code;
  }
}
