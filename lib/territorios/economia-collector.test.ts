import { describe, expect, it } from 'vitest';
import { decideEconomyIndicatorAction, DEFAULT_ECONOMY_REFERENCE_YEARS } from './economia-collector';
import type { EconomyIndicator } from './economia-siconfi-normalizer';

const indicator: EconomyIndicator = {
  indicador: 'investimento_empenhado', valor: 100, unidade: 'BRL', periodoInicio: '2024-01-01', periodoFim: '2024-12-31',
  sourceRecordId: '2024:DCA-Anexo I-D:DO4.4.00.00.00.00:Despesas Empenhadas', sourceUpdatedAt: null, metadata: {},
};

describe('reconciliação do Motor Economia', () => {
  it('cobre a série histórica controlada de 2020 a 2025', () => {
    expect(DEFAULT_ECONOMY_REFERENCE_YEARS).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
  });

  it('insere novo, preserva idêntico e atualiza valor alterado/force refresh', () => {
    expect(decideEconomyIndicatorAction(undefined, indicator, false)).toBe('insert');
    const existing = { valor: 100, metadata: { source_record_id: indicator.sourceRecordId } };
    expect(decideEconomyIndicatorAction(existing, indicator, false)).toBe('unchanged');
    expect(decideEconomyIndicatorAction(existing, { ...indicator, valor: 101 }, false)).toBe('update');
    expect(decideEconomyIndicatorAction(existing, indicator, true)).toBe('update');
  });
});
