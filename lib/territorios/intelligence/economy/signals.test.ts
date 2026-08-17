import { describe, expect, it } from 'vitest';
import { calculateNominalYoyVariations, calculatePercentageShares } from './derived-indicators';
import { detectAnomaly, detectAttention, detectChange, detectConcentration, detectDivergence, detectPressure, detectTrend, insufficientEvidenceSignal } from './signals';
import { FIXTURE_A_GROWTH, FIXTURE_B_DECLINE, FIXTURE_C_STABLE, FIXTURE_D_ABRUPT_CHANGE, FIXTURE_H_OUTLIER, FIXTURE_K_DIVERGENT_A, FIXTURE_K_DIVERGENT_B, FIXTURE_TERRITORY_ID } from './fixtures';
import type { Evidence } from '../contracts';

function ev(id: string, indicator: string, value: number, period: string): Evidence {
  return { id, territoryId: FIXTURE_TERRITORY_ID, domain: 'economia', indicator, value, unit: 'BRL', period, source: 'fixture', dataset: 'FIXTURE_DATASET', evidenceHash: `hash-${id}`, metadata: {} };
}

describe('TREND — seção 21 do gate', () => {
  it('caso positivo: crescimento persistente em 4 intervalos produz TREND crescente', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_A_GROWTH, 'indicador_a');
    const signals = detectTrend(FIXTURE_TERRITORY_ID, variations);
    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe('TREND');
    expect(signals[0].title).toContain('crescente');
  });

  it('caso positivo: queda persistente produz TREND decrescente', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_B_DECLINE, 'indicador_b');
    const signals = detectTrend(FIXTURE_TERRITORY_ID, variations);
    expect(signals).toHaveLength(1);
    expect(signals[0].title).toContain('decrescente');
  });

  it('caso negativo: série estável (sinais alternando) não produz TREND', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_C_STABLE, 'indicador_c');
    expect(detectTrend(FIXTURE_TERRITORY_ID, variations)).toHaveLength(0);
  });

  it('boundary: apenas 2 intervalos comparáveis não é suficiente (mínimo é 3)', () => {
    const twoIntervals = calculateNominalYoyVariations(FIXTURE_A_GROWTH.slice(0, 3), 'indicador_a');
    expect(twoIntervals).toHaveLength(2);
    expect(detectTrend(FIXTURE_TERRITORY_ID, twoIntervals)).toHaveLength(0);
  });

  it('insufficient evidence: nenhuma variação não produz TREND', () => {
    expect(detectTrend(FIXTURE_TERRITORY_ID, [])).toHaveLength(0);
  });
});

describe('CHANGE — seção 22 do gate', () => {
  it('caso positivo: variação de +145% (fixture D) ultrapassa o threshold e produz CHANGE', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_D_ABRUPT_CHANGE, 'indicador_d');
    const signals = detectChange(FIXTURE_TERRITORY_ID, variations);
    expect(signals.some((s) => s.period === '2021-2022')).toBe(true);
  });

  it('caso negativo: variação de 10% (fixture A) fica abaixo do threshold de 15%', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_A_GROWTH, 'indicador_a');
    expect(detectChange(FIXTURE_TERRITORY_ID, variations)).toHaveLength(0);
  });

  it('boundary: variação exatamente no threshold (15%) produz CHANGE', () => {
    const evidence = [ev('a', 'x', 100, '2020'), ev('b', 'x', 115, '2021')];
    const variations = calculateNominalYoyVariations(evidence, 'x');
    expect(detectChange(FIXTURE_TERRITORY_ID, variations)).toHaveLength(1);
  });

  it('boundary: variação a 14,99% (abaixo do threshold) não produz CHANGE', () => {
    const evidence = [ev('a', 'x', 100, '2020'), ev('b', 'x', 114.99, '2021')];
    const variations = calculateNominalYoyVariations(evidence, 'x');
    expect(detectChange(FIXTURE_TERRITORY_ID, variations)).toHaveLength(0);
  });
});

describe('ANOMALY — seção 26 do gate (IQR)', () => {
  it('caso positivo: outlier real em série majoritariamente estável (fixture H)', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_H_OUTLIER, 'indicador_h');
    const signals = detectAnomaly(FIXTURE_TERRITORY_ID, variations);
    expect(signals.some((s) => s.period === '2022-2023')).toBe(true);
  });

  it('caso negativo: série estável não produz ANOMALY', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_C_STABLE, 'indicador_c');
    expect(detectAnomaly(FIXTURE_TERRITORY_ID, variations)).toHaveLength(0);
  });

  it('insufficient evidence: menos de 4 observações não calcula IQR (evita falsa precisão)', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_B_DECLINE, 'indicador_b'); // 3 variações
    expect(variations.length).toBeLessThan(4);
    expect(detectAnomaly(FIXTURE_TERRITORY_ID, variations)).toHaveLength(0);
  });
});

describe('CONCENTRATION — seção 24 do gate', () => {
  it('caso positivo: participação de 85% (acima do threshold de 80%) produz CONCENTRATION', () => {
    const evidence = [ev('num', 'a', 850, '2023'), ev('den', 'b', 1000, '2023')];
    const shares = calculatePercentageShares(evidence, 'a', 'b');
    expect(detectConcentration(FIXTURE_TERRITORY_ID, shares)).toHaveLength(1);
  });

  it('caso negativo: participação de 50% não produz CONCENTRATION', () => {
    const evidence = [ev('num', 'a', 500, '2023'), ev('den', 'b', 1000, '2023')];
    const shares = calculatePercentageShares(evidence, 'a', 'b');
    expect(detectConcentration(FIXTURE_TERRITORY_ID, shares)).toHaveLength(0);
  });

  it('boundary: participação exatamente 80% produz CONCENTRATION', () => {
    const evidence = [ev('num', 'a', 800, '2023'), ev('den', 'b', 1000, '2023')];
    const shares = calculatePercentageShares(evidence, 'a', 'b');
    expect(detectConcentration(FIXTURE_TERRITORY_ID, shares)).toHaveLength(1);
  });

  it('insufficient evidence: nenhuma participação calculável não produz CONCENTRATION', () => {
    expect(detectConcentration(FIXTURE_TERRITORY_ID, [])).toHaveLength(0);
  });
});

describe('DIVERGENCE — seção 25 do gate', () => {
  it('caso positivo: duas séries com sinais opostos no mesmo período (fixture K)', () => {
    const seriesA = calculateNominalYoyVariations(FIXTURE_K_DIVERGENT_A, 'indicador_k_a');
    const seriesB = calculateNominalYoyVariations(FIXTURE_K_DIVERGENT_B, 'indicador_k_b');
    const signals = detectDivergence(FIXTURE_TERRITORY_ID, seriesA, seriesB);
    expect(signals).toHaveLength(1);
  });

  it('caso negativo: duas séries crescendo no mesmo sentido não produzem DIVERGENCE', () => {
    const seriesA = calculateNominalYoyVariations(FIXTURE_A_GROWTH, 'indicador_a');
    const seriesB = calculateNominalYoyVariations(FIXTURE_A_GROWTH.map((e) => ({ ...e, indicator: 'indicador_a2' })), 'indicador_a2');
    expect(detectDivergence(FIXTURE_TERRITORY_ID, seriesA, seriesB)).toHaveLength(0);
  });
});

describe('PRESSURE — seção 23 do gate', () => {
  it('caso positivo: despesa cresce mais que receita em 3 de 3 intervalos recentes', () => {
    const revenue = [ev('r1', 'receita', 1000, '2021'), ev('r2', 'receita', 1050, '2022'), ev('r3', 'receita', 1100, '2023'), ev('r4', 'receita', 1150, '2024')];
    const expense = [ev('e1', 'despesa', 1000, '2021'), ev('e2', 'despesa', 1200, '2022'), ev('e3', 'despesa', 1440, '2023'), ev('e4', 'despesa', 1728, '2024')];
    const revenueVariations = calculateNominalYoyVariations(revenue, 'receita');
    const expenseVariations = calculateNominalYoyVariations(expense, 'despesa');
    const signals = detectPressure(FIXTURE_TERRITORY_ID, revenueVariations, expenseVariations);
    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe('PRESSURE');
  });

  it('caso negativo: receita e despesa crescem no mesmo ritmo não produz PRESSURE', () => {
    const revenue = [ev('r1', 'receita', 1000, '2021'), ev('r2', 'receita', 1100, '2022'), ev('r3', 'receita', 1210, '2023')];
    const expense = [ev('e1', 'despesa', 1000, '2021'), ev('e2', 'despesa', 1100, '2022'), ev('e3', 'despesa', 1210, '2023')];
    const revenueVariations = calculateNominalYoyVariations(revenue, 'receita');
    const expenseVariations = calculateNominalYoyVariations(expense, 'despesa');
    expect(detectPressure(FIXTURE_TERRITORY_ID, revenueVariations, expenseVariations)).toHaveLength(0);
  });

  it('insufficient evidence: menos de 2 intervalos comparáveis não produz PRESSURE', () => {
    const revenue = [ev('r1', 'receita', 1000, '2023'), ev('r2', 'receita', 1050, '2024')];
    const expense = [ev('e1', 'despesa', 1000, '2023'), ev('e2', 'despesa', 1200, '2024')];
    const revenueVariations = calculateNominalYoyVariations(revenue, 'receita');
    const expenseVariations = calculateNominalYoyVariations(expense, 'despesa');
    expect(detectPressure(FIXTURE_TERRITORY_ID, revenueVariations, expenseVariations)).toHaveLength(0);
  });
});

describe('ATTENTION — seção 27 do gate', () => {
  it('caso positivo: participação recente abaixo do mínimo da janela histórica', () => {
    const evidence = [
      ev('n1', 'num', 900, '2021'), ev('d1', 'den', 1000, '2021'), // 90%
      ev('n2', 'num', 880, '2022'), ev('d2', 'den', 1000, '2022'), // 88%
      ev('n3', 'num', 850, '2023'), ev('d3', 'den', 1000, '2023'), // 85%
      ev('n4', 'num', 700, '2024'), ev('d4', 'den', 1000, '2024'), // 70% -- abaixo do min historico (85%)
    ];
    const shares = calculatePercentageShares(evidence, 'num', 'den');
    const signals = detectAttention(FIXTURE_TERRITORY_ID, shares);
    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe('ATTENTION');
  });

  it('caso negativo: participação dentro da janela histórica não produz ATTENTION', () => {
    const evidence = [
      ev('n1', 'num', 900, '2021'), ev('d1', 'den', 1000, '2021'),
      ev('n2', 'num', 880, '2022'), ev('d2', 'den', 1000, '2022'),
      ev('n3', 'num', 850, '2023'), ev('d3', 'den', 1000, '2023'),
      ev('n4', 'num', 870, '2024'), ev('d4', 'den', 1000, '2024'),
    ];
    const shares = calculatePercentageShares(evidence, 'num', 'den');
    expect(detectAttention(FIXTURE_TERRITORY_ID, shares)).toHaveLength(0);
  });

  it('insufficient evidence: janela histórica incompleta (menos de 4 anos) não produz ATTENTION', () => {
    const evidence = [ev('n1', 'num', 900, '2023'), ev('d1', 'den', 1000, '2023'), ev('n2', 'num', 700, '2024'), ev('d2', 'den', 1000, '2024')];
    const shares = calculatePercentageShares(evidence, 'num', 'den');
    expect(detectAttention(FIXTURE_TERRITORY_ID, shares)).toHaveLength(0);
  });
});

describe('insufficientEvidenceSignal — estado explícito (seção 14/83 do gate)', () => {
  it('produz um signal com status INSUFFICIENT_EVIDENCE, confidence null e sem evidenceRefs', () => {
    const signal = insufficientEvidenceSignal(FIXTURE_TERRITORY_ID, 'indicador_inexistente', 'motivo de teste');
    expect(signal.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(signal.confidence).toBeNull();
    expect(signal.evidenceRefs).toHaveLength(0);
  });
});

describe('segurança semântica — RISK/OPPORTUNITY nunca são SignalType (seção 76 do gate)', () => {
  it('nenhuma função de sinal produz type fora do conjunto canônico permitido', () => {
    const allowed = new Set(['TREND', 'CHANGE', 'PRESSURE', 'CONCENTRATION', 'DIVERGENCE', 'ANOMALY', 'ATTENTION']);
    const variations = calculateNominalYoyVariations(FIXTURE_H_OUTLIER, 'indicador_h');
    const all = [...detectTrend(FIXTURE_TERRITORY_ID, variations), ...detectChange(FIXTURE_TERRITORY_ID, variations), ...detectAnomaly(FIXTURE_TERRITORY_ID, variations)];
    for (const signal of all) {
      expect(allowed.has(signal.type)).toBe(true);
      expect(signal.type).not.toBe('RISK');
      expect(signal.type).not.toBe('OPPORTUNITY');
    }
  });
});
