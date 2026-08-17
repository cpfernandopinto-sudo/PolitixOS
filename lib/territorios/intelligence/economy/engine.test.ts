import { describe, expect, it } from 'vitest';
import { runEconomicIntelligenceEngine } from './engine';
import { assertLineageResolves } from '../lineage';
import { FIXTURE_A_GROWTH, FIXTURE_J_PARTIAL_COVERAGE, FIXTURE_L_SHUFFLED_ORDER, FIXTURE_TERRITORY_ID } from './fixtures';
import { EconomyEngineError } from './types';
import type { Evidence } from '../contracts';

const CONFIG_A = { fiscalMonetaryIndicators: ['indicador_a'], activityMonetaryIndicators: [], officialShareIndicators: [], sharePairs: [], pressurePair: null, divergencePairs: [] } as const;

describe('runEconomicIntelligenceEngine — invariantes gerais', () => {
  it('rejeita territoryId ausente (INVALID_INPUT)', () => {
    expect(() => runEconomicIntelligenceEngine('', [])).toThrow(EconomyEngineError);
  });

  it('rejeita evidence de território diferente do solicitado (INVALID_INPUT)', () => {
    const wrongTerritory: Evidence[] = [{ ...FIXTURE_A_GROWTH[0], territoryId: 'outro-territorio' }];
    expect(() => runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, wrongTerritory)).toThrow(EconomyEngineError);
  });

  it('nunca produz confidence como percentual — apenas as 3 classes qualitativas ou null', () => {
    const result = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    const allowed = new Set(['DIRECTLY_SUPPORTED', 'MULTI_SIGNAL_SUPPORTED', 'LIMITED_CONTEXT', null]);
    for (const signal of result.signals) expect(allowed.has(signal.confidence)).toBe(true);
  });

  it('referencePeriod (temporalCoverage) nunca é confundido com timestamp de coleta (seção 60 do gate)', () => {
    const result = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    expect(result.temporalCoverage.periodStart).toBe('2020');
    expect(result.temporalCoverage.periodEnd).toBe('2024');
    // nenhum campo de temporalCoverage contém um ISO timestamp de execução do teste.
    expect(result.temporalCoverage.periodEnd).not.toMatch(/T\d{2}:\d{2}/);
  });

  it('todo DerivedIndicator de variação carrega a limitação NOMINAL_VALUE (seção 61 do gate)', () => {
    const result = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    expect(result.derivedIndicators.length).toBeGreaterThan(0);
    for (const indicator of result.derivedIndicators) expect(indicator.limitations.some((l) => l.code === 'NOMINAL_VALUE')).toBe(true);
  });

  it('coverage "available" quando todos os indicadores configurados têm evidência (seção 62 do gate)', () => {
    const result = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    expect(result.coverage.byDomain.economia).toBe('available');
  });

  it('coverage "partial" quando falta evidência de um indicador configurado', () => {
    const result = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_J_PARTIAL_COVERAGE, {
      fiscalMonetaryIndicators: ['indicador_j1', 'indicador_j2'], activityMonetaryIndicators: [], officialShareIndicators: [], sharePairs: [], pressurePair: null, divergencePairs: [],
    });
    expect(result.coverage.byDomain.economia).toBe('partial');
    expect(result.limitations.some((l) => l.code === 'PARTIAL_COVERAGE')).toBe(true);
    expect(result.signals.some((s) => s.status === 'INSUFFICIENT_EVIDENCE')).toBe(true);
  });

  it('coverage "unavailable" quando nenhum indicador configurado tem evidência', () => {
    const result = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, [], CONFIG_A);
    expect(result.coverage.byDomain.economia).toBe('unavailable');
    expect(result.signals.every((s) => s.status === 'INSUFFICIENT_EVIDENCE')).toBe(true);
  });
});

describe('determinismo (seção 19/56 do gate)', () => {
  it('mesmo input executado duas vezes produz DerivedIndicators e Signals idênticos', () => {
    const run1 = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    const run2 = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    expect(run1.derivedIndicators).toEqual(run2.derivedIndicators);
    expect(run1.signals.map((s) => s.id)).toEqual(run2.signals.map((s) => s.id));
    expect(run1.signals).toEqual(run2.signals);
  });
});

describe('ordem de input não altera o resultado (seção 20/57 do gate)', () => {
  it('fixture A e fixture L (mesmos dados, ordem embaralhada) produzem resultado semanticamente idêntico', () => {
    const resultOriginal = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    const resultShuffled = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_L_SHUFFLED_ORDER, CONFIG_A);
    expect(resultShuffled.derivedIndicators).toEqual(resultOriginal.derivedIndicators);
    expect(resultShuffled.signals).toEqual(resultOriginal.signals);
  });
});

describe('lineage (seção 43/58 do gate) — nenhuma referência órfã', () => {
  it('todo evidenceRef de todo Signal resolve dentro do evidenceIndex', () => {
    const result = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    for (const signal of result.signals) {
      for (const ref of signal.evidenceRefs) expect(result.evidenceIndex[ref]).toBeDefined();
    }
  });

  it('todo evidenceRef de todo DerivedIndicator.inputs resolve dentro do evidenceIndex', () => {
    const result = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    for (const indicator of result.derivedIndicators) {
      for (const input of indicator.inputs) expect(result.evidenceIndex[input.evidenceRef]).toBeDefined();
    }
  });

  it('usa a infraestrutura de lineage do INTEL-01 (assertLineageResolves) sem erro para uma Recommendation fictícia construída sobre o resultado', () => {
    const result = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    const signal = result.signals[0];
    expect(signal).toBeDefined();
    // Prova de compatibilidade estrutural: um Interpretation/Recommendation fictício apontando para este Signal deve resolver.
    const interpretation = {
      id: 'interpretation:fixture:1', territoryId: FIXTURE_TERRITORY_ID, assertionClass: 'INTERPRETATION' as const,
      statement: 'fixture', domains: ['economia'], origin: 'rule' as const, modelProvenance: null,
      basedOnSignals: [signal.id], evidenceRefs: signal.evidenceRefs, confidence: 'DIRECTLY_SUPPORTED' as const, caveats: [], contradicts: [],
    };
    const recommendation = {
      id: 'recommendation:fixture:1', territoryId: FIXTURE_TERRITORY_ID, assertionClass: 'RECOMMENDATION' as const,
      action: 'fixture', priority: 'LOW' as const, justification: 'fixture', origin: 'rule' as const, modelProvenance: null,
      basedOnImplications: [], basedOnInterpretations: [interpretation.id], evidenceRefs: signal.evidenceRefs, caveats: [], validUntil: null, reviewStatus: 'not_reviewed' as const,
    };
    expect(() => assertLineageResolves({ recommendation, implications: [], interpretations: [interpretation], signals: result.signals, evidenceIndex: result.evidenceIndex })).not.toThrow();
  });
});

describe('deduplicação (seção 48 do gate)', () => {
  it('nenhum signal com ID duplicado no resultado final', () => {
    const result = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    const ids = result.signals.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('ordenação determinística de saída (seção 47 do gate)', () => {
  it('signals sempre no mesmo array order entre execuções (já coberto por determinismo), e ordenados por severity/type/id', () => {
    const result = runEconomicIntelligenceEngine(FIXTURE_TERRITORY_ID, FIXTURE_A_GROWTH, CONFIG_A);
    const severityRank: Record<string, number> = { HIGH: 0, MODERATE: 1, LOW: 2 };
    for (let i = 1; i < result.signals.length; i++) {
      const prevRank = severityRank[result.signals[i - 1].severity ?? ''] ?? 99;
      const currRank = severityRank[result.signals[i].severity ?? ''] ?? 99;
      expect(prevRank).toBeLessThanOrEqual(currRank);
    }
  });
});
