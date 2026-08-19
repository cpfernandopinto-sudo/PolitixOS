import { describe, expect, it } from 'vitest';
import { consolidateConfidence, type AnalyticalSignal, type Coverage, type Fact, type Recommendation } from './contracts';
import { pocEvidence, pocEvidenceIndex, pocImplication, pocInterpretation, pocRecommendation, pocSignal, POC_TERRITORY_ID } from './poc-fixture';

describe('INTEL-01 contratos — formato e separação de camadas', () => {
  it('Evidence nunca carrega assertionClass de interpretação (L1 não é L4)', () => {
    for (const item of pocEvidence) expect('assertionClass' in item).toBe(false);
  });

  it('Signal separa priority de severity como eixos independentes (seção 18)', () => {
    const signal: AnalyticalSignal = { ...pocSignal, priority: 'LOW', severity: 'HIGH' };
    expect(signal.priority).toBe('LOW');
    expect(signal.severity).toBe('HIGH');
    expect(signal.priority).not.toBe(signal.severity);
  });

  it('Interpretation declara origem e nunca confunde regra com modelo (seção 4/26)', () => {
    expect(pocInterpretation.origin).toBe('rule');
    expect(pocInterpretation.modelProvenance).toBeNull();
  });

  it('Recommendation exige reviewStatus e nunca vem pré-aprovada (seção 28)', () => {
    expect(pocRecommendation.reviewStatus).toBe('not_reviewed');
  });

  it('coverage distingue disponibilidade por domínio de confidence (seção 10 vs 11)', () => {
    const coverage: Coverage = {
      byDomain: { economia: 'available', saude: 'partial', seguranca: 'unavailable', eleitoral: 'available', demografia: 'available' },
      domainsAvailable: 3,
      domainsExpected: 5,
      missingData: [{ domain: 'seguranca', period: '2025', fields: ['todos'] }],
    };
    expect(coverage.byDomain.saude).toBe('partial');
    expect('confidence' in coverage).toBe(false);
  });

  it('a cadeia fictícia inteira referencia o mesmo territoryId (nunca mistura território)', () => {
    const ids = new Set([...pocEvidence.map((e) => e.territoryId), pocSignal.territoryId, pocInterpretation.territoryId, pocImplication.territoryId, pocRecommendation.territoryId]);
    expect(ids.size).toBe(1);
    expect([...ids][0]).toBe(POC_TERRITORY_ID);
  });

  it('consolidateConfidence nunca produz um valor fora do enum qualitativo', () => {
    const consolidated = consolidateConfidence([pocSignal.confidence!, pocInterpretation.confidence, pocImplication.confidence]);
    expect(['DIRECTLY_SUPPORTED', 'MULTI_SIGNAL_SUPPORTED', 'LIMITED_CONTEXT']).toContain(consolidated);
  });

  it('Recommendation fictícia resolve por completo dentro do índice de evidência fornecido', () => {
    const rec: Recommendation = pocRecommendation;
    expect(rec.evidenceRefs.every((ref) => Boolean(pocEvidenceIndex[ref]))).toBe(true);
  });

  // INTEL-DOMAIN-02 — Fact é aditivo: ponte legível L1/L2 -> L3, nunca uma interpretação.
  it('Fact nunca carrega assertionClass (não é L4) e declara explicitamente quando não é suportado por dado suficiente', () => {
    const supported: Fact = { id: 'fact:1', territoryId: POC_TERRITORY_ID, domain: 'economia', key: 'current_balance', label: 'Saldo atual', value: 100, unit: 'vagas', period: '202606', evidenceRefs: ['ev:1'], derivedIndicatorRefs: [], supported: true, limitations: [] };
    const unsupported: Fact = { ...supported, id: 'fact:2', key: 'mom_change', supported: false, value: null };
    expect('assertionClass' in supported).toBe(false);
    expect(supported.supported).toBe(true);
    expect(unsupported.supported).toBe(false);
    expect(unsupported.value).toBeNull();
  });
});
