import { describe, expect, it } from 'vitest';
import { assertLineageResolves, assertRecommendationNotOrphan, BrokenLineageError, OrphanRecommendationError, resolveRecommendationToEvidence } from './lineage';
import { pocEvidenceIndex, pocImplication, pocInterpretation, pocRecommendation, pocSignal } from './poc-fixture';

describe('INTEL-01 lineage — prova conceitual (fixture fictícia)', () => {
  it('resolve a cadeia completa Recommendation -> Implication -> Interpretation -> Evidence', () => {
    expect(() =>
      assertLineageResolves({
        recommendation: pocRecommendation,
        implications: [pocImplication],
        interpretations: [pocInterpretation],
        signals: [pocSignal],
        evidenceIndex: pocEvidenceIndex,
      }),
    ).not.toThrow();

    const evidence = resolveRecommendationToEvidence({
      recommendation: pocRecommendation,
      implications: [pocImplication],
      interpretations: [pocInterpretation],
      evidenceIndex: pocEvidenceIndex,
    });
    expect(evidence.map((item) => item.id).sort()).toEqual(['evidence:eco:receita-corrente:2025', 'evidence:eco:transferencias:2025']);
    expect(evidence.every((item) => item.source === 'Tesouro/SICONFI')).toBe(true);
  });

  it('rejeita Recommendation órfã (sem Implication nem Interpretation)', () => {
    const orphan = { ...pocRecommendation, basedOnImplications: [], basedOnInterpretations: [] };
    expect(() => assertRecommendationNotOrphan(orphan)).toThrow(OrphanRecommendationError);
  });

  it('rejeita lineage quebrada (referência a Implication inexistente)', () => {
    const broken = { ...pocRecommendation, basedOnImplications: ['implication:inexistente'] };
    expect(() =>
      assertLineageResolves({ recommendation: broken, implications: [pocImplication], interpretations: [pocInterpretation], signals: [pocSignal], evidenceIndex: pocEvidenceIndex }),
    ).toThrow(BrokenLineageError);
  });

  it('rejeita lineage quebrada (Interpretation referenciando Signal inexistente)', () => {
    const brokenInterpretation = { ...pocInterpretation, basedOnSignals: ['signal:inexistente'] };
    expect(() =>
      assertLineageResolves({ recommendation: pocRecommendation, implications: [pocImplication], interpretations: [brokenInterpretation], signals: [pocSignal], evidenceIndex: pocEvidenceIndex }),
    ).toThrow(BrokenLineageError);
  });

  it('rejeita lineage quebrada (evidenceRef fora do índice)', () => {
    const brokenSignal = { ...pocSignal, evidenceRefs: [...pocSignal.evidenceRefs, 'evidence:inexistente'] };
    expect(() =>
      assertLineageResolves({ recommendation: pocRecommendation, implications: [pocImplication], interpretations: [pocInterpretation], signals: [brokenSignal], evidenceIndex: pocEvidenceIndex }),
    ).toThrow(BrokenLineageError);
  });
});
