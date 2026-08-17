import { describe, expect, it } from 'vitest';
import type { SiconfiDcaRow } from './economia-siconfi-client';
import { ECONOMY_INDICATOR_DEFINITIONS, economyIndicatorNaturalKey, normalizeSiconfiDcaYear } from './economia-siconfi-normalizer';

function rows(year = 2024): SiconfiDcaRow[] {
  return ECONOMY_INDICATOR_DEFINITIONS.map((definition, index) => ({
    exercicio: year,
    instituicao: 'Prefeitura Municipal de Contagem - MG',
    cod_ibge: 3118601,
    uf: 'MG',
    anexo: definition.anexo,
    rotulo: 'DCA',
    coluna: definition.coluna,
    cod_conta: definition.codConta,
    conta: `Conta ${definition.codConta}`,
    valor: 1000 + index,
    populacao: 615621,
  }));
}

describe('normalização SICONFI DCA', () => {
  it('seleciona exatamente sete dados brutos anuais com rastreabilidade', () => {
    const normalized = normalizeSiconfiDcaYear('3118601', 2024, rows());
    expect(normalized.indicators).toHaveLength(7);
    expect(normalized.indicators[0]).toMatchObject({ indicador: 'receita_total_bruta_realizada', valor: 1000, unidade: 'BRL', periodoInicio: '2024-01-01', periodoFim: '2024-12-31', sourceUpdatedAt: null });
    expect(normalized.indicators[0].metadata).toMatchObject({ source_mode: 'REAL', reference_year: 2024, derivation: 'raw_source_row', source_population_discarded: 615621 });
    expect(normalized.sourceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('preserva uma chave natural diferente por exercício', () => {
    const item2024 = normalizeSiconfiDcaYear('3118601', 2024, rows(2024)).indicators[0];
    const item2025 = normalizeSiconfiDcaYear('3118601', 2025, rows(2025)).indicators[0];
    expect(economyIndicatorNaturalKey(item2024)).toBe('receita_total_bruta_realizada|2024-01-01|2024-12-31');
    expect(economyIndicatorNaturalKey(item2025)).not.toBe(economyIndicatorNaturalKey(item2024));
  });

  it('falha quando a conta oficial está ausente, duplicada ou sem valor numérico', () => {
    expect(() => normalizeSiconfiDcaYear('3118601', 2024, rows().slice(1))).toThrow('SICONFI_EXPECTED_SINGLE_ROW');
    expect(() => normalizeSiconfiDcaYear('3118601', 2024, [...rows(), rows()[0]])).toThrow('SICONFI_EXPECTED_SINGLE_ROW');
    const invalid = rows(); invalid[0].valor = null;
    expect(() => normalizeSiconfiDcaYear('3118601', 2024, invalid)).toThrow('SICONFI_INVALID_VALUE');
  });
});
