/**
 * INTEL-03A — Serializador determinístico do contexto de interpretação (seções 50-53
 * do gate).
 *
 * NÃO é um prompt final (seção 50 — "não criar prompt final"). É uma canonicalização
 * estruturada e determinística de `InterpretationInputContext`, pensada para ser o
 * "PromptInputModel" que um futuro provider (INTEL-03B) consome — nunca texto
 * instrucional. Mesmo input produz sempre a mesma saída, byte a byte (seção 51),
 * verificável pelo `contextHash`.
 *
 * "Token budget futuro" (seção 52): não calcula tokens reais (nenhum provider real
 * existe neste gate), mas aplica limites conceituais — truncamento de campos de texto
 * livre (title/summary), nunca de refs/IDs (lineage nunca é cortado por este limite).
 */

import { createHash } from 'node:crypto';
import type { AnalyticalSignal } from '../contracts';
import type { ConsolidatedSignal } from '../economy/consolidation';
import type { InterpretationInputContext, InterpretationUnit } from './types';

/** Seção 52 — limites conceituais de densidade, não budget de tokens real (sem provider real). */
export const CONTEXT_LIMITS = {
  maxCharsPerFreeTextField: 240,
  maxEvidenceRefsPerUnit: 12,
} as const;

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export interface SerializedUnit {
  id: string;
  kind: InterpretationUnit['kind'];
  family: string;
  type: string;
  period: string;
  title: string;
  summary: string;
  eventCount: number | null;
  severity: string | null;
  evidenceRefs: string[];
  derivedIndicatorRefs: string[];
  constituentRawSignalRefs: string[];
}

export interface SerializedInterpretationContext {
  mode: InterpretationInputContext['mode'];
  territoryId: string;
  selectionPolicy: InterpretationInputContext['selectionPolicy'];
  units: SerializedUnit[];
  coverage: InterpretationInputContext['coverage'];
  coverageByFamily: InterpretationInputContext['coverageByFamily'];
  temporalCoverage: InterpretationInputContext['temporalCoverage'];
  temporalCoverageByFamily: InterpretationInputContext['temporalCoverageByFamily'];
  limitations: InterpretationInputContext['limitations'];
  calibrationStatusByFamily: InterpretationInputContext['calibrationStatusByFamily'];
  methodology: InterpretationInputContext['methodology'];
  contextHash: string;
}

function serializeUnit(unit: InterpretationUnit): SerializedUnit {
  if (unit.kind === 'CONSOLIDATED_SIGNAL') {
    const signal = unit.signal as ConsolidatedSignal;
    return {
      id: unit.id,
      kind: unit.kind,
      family: unit.family,
      type: signal.signalType,
      period: unit.period,
      title: `${signal.direction === 'up' ? 'Alta' : 'Queda'} consolidada — ${signal.indicator}`,
      summary: truncate(`Sequência de ${signal.eventCount} evento(s) CHANGE na mesma direção (${signal.direction}), ${signal.startPeriod}-${signal.endPeriod}.`, CONTEXT_LIMITS.maxCharsPerFreeTextField),
      eventCount: signal.eventCount,
      severity: null,
      evidenceRefs: unit.evidenceRefs.slice(0, CONTEXT_LIMITS.maxEvidenceRefsPerUnit).sort(),
      derivedIndicatorRefs: [...unit.derivedIndicatorRefs].sort(),
      constituentRawSignalRefs: [...unit.constituentRawSignalRefs].sort(),
    };
  }
  const signal = unit.signal as AnalyticalSignal;
  return {
    id: unit.id,
    kind: unit.kind,
    family: unit.family,
    type: signal.type,
    period: unit.period,
    title: truncate(signal.title, CONTEXT_LIMITS.maxCharsPerFreeTextField),
    summary: truncate(signal.summary, CONTEXT_LIMITS.maxCharsPerFreeTextField),
    eventCount: null,
    severity: signal.severity,
    evidenceRefs: unit.evidenceRefs.slice(0, CONTEXT_LIMITS.maxEvidenceRefsPerUnit).sort(),
    derivedIndicatorRefs: [...unit.derivedIndicatorRefs].sort(),
    constituentRawSignalRefs: [...unit.constituentRawSignalRefs].sort(),
  };
}

/** Ordena families → signals → evidence refs → limitations de forma canônica (seção 51 do gate). */
export function serializeInterpretationContext(context: InterpretationInputContext): SerializedInterpretationContext {
  const units = [...context.units].sort((a, b) => a.family.localeCompare(b.family) || a.id.localeCompare(b.id)).map(serializeUnit);
  const limitations = [...context.limitations].sort((a, b) => a.code.localeCompare(b.code) || a.description.localeCompare(b.description));

  const payload = {
    mode: context.mode,
    territoryId: context.territoryId,
    selectionPolicy: { id: context.selectionPolicy.id, maxUnitsPerFamily: context.selectionPolicy.maxUnitsPerFamily, criteria: [...context.selectionPolicy.criteria].sort() },
    units,
    coverage: context.coverage,
    coverageByFamily: context.coverageByFamily,
    temporalCoverage: context.temporalCoverage,
    temporalCoverageByFamily: context.temporalCoverageByFamily,
    limitations,
    calibrationStatusByFamily: context.calibrationStatusByFamily,
    methodology: context.methodology,
  };
  const contextHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return { ...payload, contextHash };
}
