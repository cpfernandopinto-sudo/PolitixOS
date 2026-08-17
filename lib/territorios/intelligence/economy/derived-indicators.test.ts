import { describe, expect, it } from 'vitest';
import { calculateNominalYoyVariations, calculatePercentageShares, derivedIndicatorId, seriesForIndicator } from './derived-indicators';
import { FIXTURE_A_GROWTH, FIXTURE_E_INSUFFICIENT, FIXTURE_F_MISSING_MIDDLE_YEAR, FIXTURE_G_LEGITIMATE_ZERO, FIXTURE_I_INCOMPARABLE_PERIODS, FIXTURE_TERRITORY_ID } from './fixtures';
import type { Evidence } from '../contracts';

function ev(id: string, indicator: string, value: number | null, period: string): Evidence {
  return { id, territoryId: FIXTURE_TERRITORY_ID, domain: 'economia', indicator, value, unit: 'BRL', period, source: 'fixture', dataset: 'FIXTURE_DATASET', evidenceHash: `hash-${id}`, metadata: {} };
}

describe('ECON_VAR_YOY_V1 — teste de fórmula com valor conhecido (seção 54 do gate)', () => {
  it('100 -> 110 produz variação nominal de exatamente 10%', () => {
    const evidence = [ev('a', 'x', 100, '2020'), ev('b', 'x', 110, '2021')];
    const [variation] = calculateNominalYoyVariations(evidence, 'x');
    expect(variation.variationPct).toBeCloseTo(10, 6);
  });

  it('queda produz variação negativa correta', () => {
    const evidence = [ev('a', 'x', 200, '2020'), ev('b', 'x', 150, '2021')];
    const [variation] = calculateNominalYoyVariations(evidence, 'x');
    expect(variation.variationPct).toBeCloseTo(-25, 6);
  });

  it('denominador zero não produz variação (não fabrica Infinity/NaN)', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_G_LEGITIMATE_ZERO, 'indicador_g');
    expect(variations).toHaveLength(0);
    expect(variations.every((v) => Number.isFinite(v.variationPct))).toBe(true);
  });

  it('valor null é ignorado, não vira zero', () => {
    const evidence = [ev('a', 'x', null, '2020'), ev('b', 'x', 100, '2021')];
    expect(calculateNominalYoyVariations(evidence, 'x')).toHaveLength(0);
  });

  it('uma única observação não produz nenhuma variação (dados insuficientes)', () => {
    expect(calculateNominalYoyVariations(FIXTURE_E_INSUFFICIENT, 'indicador_e')).toHaveLength(0);
  });

  it('ano do meio ausente: não compara 2021 com 2023 como se fossem consecutivos', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_F_MISSING_MIDDLE_YEAR, 'indicador_f');
    expect(variations).toHaveLength(1); // apenas 2020->2021
    expect(variations[0].fromYear).toBe(2020);
    expect(variations[0].toYear).toBe(2021);
  });

  it('período não anual (2023-Q1) é ignorado no cálculo de variação', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_I_INCOMPARABLE_PERIODS, 'indicador_i');
    expect(variations).toHaveLength(1);
    expect(variations[0].fromYear).toBe(2023);
    expect(variations[0].toYear).toBe(2024);
  });

  it('precisão: série real de crescimento persistente (fixture A) produz 4 variações positivas em torno de 10%', () => {
    const variations = calculateNominalYoyVariations(FIXTURE_A_GROWTH, 'indicador_a');
    expect(variations).toHaveLength(4);
    for (const v of variations) {
      expect(v.variationPct).toBeGreaterThan(9);
      expect(v.variationPct).toBeLessThan(11);
    }
  });

  it('evidenceRefs sempre aponta para os 2 IDs reais de evidência usados', () => {
    const evidence = [ev('ev-1', 'x', 100, '2020'), ev('ev-2', 'x', 110, '2021')];
    const [variation] = calculateNominalYoyVariations(evidence, 'x');
    expect(variation.evidenceRefs).toEqual(['ev-1', 'ev-2']);
  });
});

describe('ECON_SHARE_V1 — participação percentual', () => {
  it('50/200 = 25%', () => {
    const evidence = [ev('num', 'a', 50, '2023'), ev('den', 'b', 200, '2023')];
    const [share] = calculatePercentageShares(evidence, 'a', 'b');
    expect(share.sharePct).toBeCloseTo(25, 6);
  });

  it('período divergente entre numerador e denominador não produz participação', () => {
    const evidence = [ev('num', 'a', 50, '2023'), ev('den', 'b', 200, '2024')];
    expect(calculatePercentageShares(evidence, 'a', 'b')).toHaveLength(0);
  });

  it('denominador zero não produz participação', () => {
    const evidence = [ev('num', 'a', 50, '2023'), ev('den', 'b', 0, '2023')];
    expect(calculatePercentageShares(evidence, 'a', 'b')).toHaveLength(0);
  });
});

describe('seriesForIndicator — ordenação determinística independente da ordem de entrada', () => {
  it('sempre retorna ordenado por ano, mesmo com input embaralhado', () => {
    const shuffled = [ev('c', 'x', 3, '2022'), ev('a', 'x', 1, '2020'), ev('b', 'x', 2, '2021')];
    const series = seriesForIndicator(shuffled, 'x');
    expect(series.map((item) => item.year)).toEqual([2020, 2021, 2022]);
  });
});

describe('derivedIndicatorId — determinismo de identidade (seção 45 do gate)', () => {
  it('mesmos inputs produzem sempre o mesmo ID', () => {
    const id1 = derivedIndicatorId('receita_total', 'ECON_VAR_YOY_V1', '2023-2024', 'territorio-x');
    const id2 = derivedIndicatorId('receita_total', 'ECON_VAR_YOY_V1', '2023-2024', 'territorio-x');
    expect(id1).toBe(id2);
  });

  it('inputs diferentes produzem IDs diferentes', () => {
    const id1 = derivedIndicatorId('receita_total', 'ECON_VAR_YOY_V1', '2023-2024', 'territorio-x');
    const id2 = derivedIndicatorId('receita_total', 'ECON_VAR_YOY_V1', '2024-2025', 'territorio-x');
    expect(id1).not.toBe(id2);
  });
});
