import { describe, expect, it } from 'vitest';
import { buildCagedEconomicIntelligenceResult, type CagedAdapterPoint } from './caged-adapter';
import { selectInterpretationInput } from '../interpretation/selection';

function point(referenceMonth: string, balance: number, admissions = 100, dismissals = 100 - balance, hash = `hash-${referenceMonth}`): CagedAdapterPoint {
  return { referenceMonth, admissions, dismissals, balance, metadata: { aggregate_hash: hash, history_method_version: 'novo-caged-history-revision-aware-v1', revision_aware: true, as_of_declaration_month: '202606' } };
}

// 13 consecutive months so at least one point has a full 12-month rolling window.
const THIRTEEN_MONTHS: CagedAdapterPoint[] = [
  point('202506', 338), point('202507', -635), point('202508', 170), point('202509', 1308),
  point('202510', 921), point('202511', -94), point('202512', -4132), point('202601', 239),
  point('202602', 1256), point('202603', 1953), point('202604', 543), point('202605', 495), point('202606', 914),
];

describe('buildCagedEconomicIntelligenceResult — INTEL-ELECTORAL-01 Missão A', () => {
  it('produz Evidence real (não fixture) para admissões/desligamentos/saldo de cada mês, com hash de proveniência preservado', () => {
    const result = buildCagedEconomicIntelligenceResult('territory-1', THIRTEEN_MONTHS);
    expect(Object.keys(result.evidenceIndex)).toHaveLength(13 * 3);
    const junho = result.evidenceIndex['db:territory-1:saldo_emprego_formal:NOVO_CAGED:202506'];
    expect(junho.value).toBe(338);
    expect(junho.evidenceHash).toBe('hash-202506');
    expect(junho.source).toBe('MTE');
    expect(junho.dataset).toBe('NOVO_CAGED');
    expect(junho.metadata.history_method_version).toBe('novo-caged-history-revision-aware-v1');
  });

  it('MoM reaplica a mesma fórmula de caged/history.ts (diferença simples, nunca percentual)', () => {
    const result = buildCagedEconomicIntelligenceResult('territory-1', THIRTEEN_MONTHS);
    const mom = result.derivedIndicators.find((item) => item.indicator === 'saldo_emprego_formal_mom' && item.period === '202507');
    expect(mom?.result).toBe(-635 - 338);
  });

  it('YoY só existe quando o mesmo mês do ano anterior está presente na série', () => {
    const result = buildCagedEconomicIntelligenceResult('territory-1', THIRTEEN_MONTHS);
    const yoy = result.derivedIndicators.filter((item) => item.indicator === 'saldo_emprego_formal_yoy');
    // A janela de 13 meses (202506..202606) só contém um único par de mesmo-mês-ano-anterior: 202606 vs 202506.
    expect(yoy).toHaveLength(1);
    expect(yoy[0].period).toBe('202606');
    expect(yoy[0].result).toBe(914 - 338);
  });

  it('Rolling-12m só é calculado quando os 12 meses anteriores estão completos, e soma o fluxo (não é estoque)', () => {
    const result = buildCagedEconomicIntelligenceResult('territory-1', THIRTEEN_MONTHS);
    const rolling = result.derivedIndicators.filter((item) => item.indicator === 'saldo_emprego_formal_rolling12');
    expect(rolling).toHaveLength(2); // 202605 e 202606 são os únicos com 12 meses completos anteriores
    const rolling202606 = rolling.find((item) => item.period === '202606');
    const expectedSum = THIRTEEN_MONTHS.slice(1).reduce((sum, item) => sum + item.balance, 0); // 202507..202606
    expect(rolling202606?.result).toBe(expectedSum);
  });

  it('sinais TREND têm confidence DIRECTLY_SUPPORTED, severity null (sem threshold de magnitude inventado) e family GENERAL', () => {
    const result = buildCagedEconomicIntelligenceResult('territory-1', THIRTEEN_MONTHS);
    expect(result.signals.length).toBeGreaterThan(0);
    for (const signal of result.signals) {
      expect(signal.confidence).toBe('DIRECTLY_SUPPORTED');
      expect(signal.severity).toBeNull();
      expect(signal.limitations.some((limitation) => limitation.code === 'CAGED_L3_THRESHOLD_NOT_CALIBRATED' || limitation.code === 'CAGED_SIGNAL_THRESHOLD_PENDING')).toBeDefined();
    }
    const context = selectInterpretationInput(result);
    expect(context.units.every((unit) => unit.family === 'GENERAL')).toBe(true);
  });

  it('coverageByFamily marca FISCAL/PIB_VAB_MONETARY/OFFICIAL_SHARE como unavailable — nunca inventa dado econômico que não existe', () => {
    const result = buildCagedEconomicIntelligenceResult('territory-1', THIRTEEN_MONTHS);
    expect(result.coverageByFamily.FISCAL).toBe('unavailable');
    expect(result.coverageByFamily.PIB_VAB_MONETARY).toBe('unavailable');
    expect(result.coverageByFamily.OFFICIAL_SHARE).toBe('unavailable');
    expect(result.coverageByFamily.GENERAL).toBe('available');
  });

  it('atravessa selectInterpretationInput + serialização sem lançar erro, com units reais e evidence resolvendo', () => {
    const result = buildCagedEconomicIntelligenceResult('territory-1', THIRTEEN_MONTHS);
    const context = selectInterpretationInput(result);
    expect(context.units.length).toBeGreaterThan(0);
    for (const unit of context.units) {
      for (const ref of unit.evidenceRefs) expect(context.evidenceIndex[ref]).toBeDefined();
    }
  });

  it('array vazio produz coverage unavailable, sem erro e sem sinal fabricado', () => {
    const result = buildCagedEconomicIntelligenceResult('territory-1', []);
    expect(result.signals).toHaveLength(0);
    expect(result.derivedIndicators).toHaveLength(0);
    expect(result.coverage.byDomain.economia).toBe('unavailable');
  });

  // RELEASE-HOTFIX-TERRITORIOS-1.0 — prova do contrato DerivedIndicator restaurado (sem `any`,
  // sem campo ausente) e da rastreabilidade signal -> derivedIndicatorRefs -> DerivedIndicator real.
  it('todo DerivedIndicator produzido respeita integralmente o contrato (methodId/methodVersion/inputs/formulaDescription/limitations)', () => {
    const result = buildCagedEconomicIntelligenceResult('territory-1', THIRTEEN_MONTHS);
    expect(result.derivedIndicators.length).toBeGreaterThan(0);
    for (const indicator of result.derivedIndicators) {
      expect(typeof indicator.methodId).toBe('string');
      expect(indicator.methodId.length).toBeGreaterThan(0);
      expect(typeof indicator.methodVersion).toBe('string');
      expect(indicator.methodVersion.length).toBeGreaterThan(0);
      expect(typeof indicator.formulaDescription).toBe('string');
      expect(indicator.formulaDescription.length).toBeGreaterThan(0);
      expect(Array.isArray(indicator.inputs)).toBe(true);
      expect(indicator.inputs.length).toBeGreaterThan(0);
      for (const input of indicator.inputs) {
        expect(typeof input.evidenceRef).toBe('string');
        expect(typeof input.role).toBe('string');
      }
      expect(Array.isArray(indicator.limitations)).toBe(true);
    }
  });

  it('o sinal TREND referencia um DerivedIndicator (MoM) que realmente existe em derivedIndicators — nunca um id órfão', () => {
    const result = buildCagedEconomicIntelligenceResult('territory-1', THIRTEEN_MONTHS);
    const derivedIds = new Set(result.derivedIndicators.map((item) => item.id));
    expect(result.signals.length).toBeGreaterThan(0);
    for (const signal of result.signals) {
      for (const ref of signal.derivedIndicatorRefs) {
        expect(derivedIds.has(ref)).toBe(true);
      }
    }
  });

  it('com um único ponto (sem MoM possível), o sinal TREND tem derivedIndicatorRefs vazio, nunca um id inventado', () => {
    const result = buildCagedEconomicIntelligenceResult('territory-1', [THIRTEEN_MONTHS[0]]);
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].derivedIndicatorRefs).toEqual([]);
  });
});
