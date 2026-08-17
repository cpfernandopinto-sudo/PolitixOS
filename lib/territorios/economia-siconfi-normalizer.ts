import { createHash } from 'node:crypto';
import type { SiconfiDcaRow } from './economia-siconfi-client';

export const SICONFI_DCA_DATASET = 'SICONFI_DCA';

export interface EconomyIndicator {
  indicador: string;
  valor: number;
  unidade: 'BRL';
  periodoInicio: string;
  periodoFim: string;
  sourceRecordId: string;
  sourceUpdatedAt: null;
  metadata: Record<string, unknown>;
}

interface IndicatorDefinition {
  indicador: string;
  anexo: 'DCA-Anexo I-C' | 'DCA-Anexo I-D';
  codConta: string;
  coluna: 'Receitas Brutas Realizadas' | 'Despesas Empenhadas';
  natureza: 'receita' | 'despesa';
  classificacao: string;
}

export const ECONOMY_INDICATOR_DEFINITIONS: readonly IndicatorDefinition[] = [
  { indicador: 'receita_total_bruta_realizada', anexo: 'DCA-Anexo I-C', codConta: 'TotalReceitas', coluna: 'Receitas Brutas Realizadas', natureza: 'receita', classificacao: 'receita_total' },
  { indicador: 'receita_corrente_bruta_realizada', anexo: 'DCA-Anexo I-C', codConta: 'RO1.0.0.0.00.0.0', coluna: 'Receitas Brutas Realizadas', natureza: 'receita', classificacao: 'receita_corrente' },
  { indicador: 'receita_tributaria_bruta_realizada', anexo: 'DCA-Anexo I-C', codConta: 'RO1.1.0.0.00.0.0', coluna: 'Receitas Brutas Realizadas', natureza: 'receita', classificacao: 'impostos_taxas_contribuicoes_melhoria' },
  { indicador: 'transferencias_correntes_brutas_realizadas', anexo: 'DCA-Anexo I-C', codConta: 'RO1.7.0.0.00.0.0', coluna: 'Receitas Brutas Realizadas', natureza: 'receita', classificacao: 'transferencias_correntes' },
  { indicador: 'despesa_corrente_empenhada', anexo: 'DCA-Anexo I-D', codConta: 'DO3.0.00.00.00.00', coluna: 'Despesas Empenhadas', natureza: 'despesa', classificacao: 'despesa_corrente' },
  { indicador: 'despesa_capital_empenhada', anexo: 'DCA-Anexo I-D', codConta: 'DO4.0.00.00.00.00', coluna: 'Despesas Empenhadas', natureza: 'despesa', classificacao: 'despesa_capital' },
  { indicador: 'investimento_empenhado', anexo: 'DCA-Anexo I-D', codConta: 'DO4.4.00.00.00.00', coluna: 'Despesas Empenhadas', natureza: 'despesa', classificacao: 'investimentos' },
] as const;

function numericValue(value: SiconfiDcaRow['valor']): number {
  if (value === null || value === '') throw new Error('SICONFI_INVALID_VALUE');
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error('SICONFI_INVALID_VALUE');
  return parsed;
}

export function economyIndicatorNaturalKey(indicator: Pick<EconomyIndicator, 'indicador' | 'periodoInicio' | 'periodoFim'>): string {
  return `${indicator.indicador}|${indicator.periodoInicio}|${indicator.periodoFim}`;
}

export function normalizeSiconfiDcaYear(codigoIbge: string, referenceYear: number, rows: SiconfiDcaRow[]) {
  if (!/^\d{7}$/.test(codigoIbge)) throw new Error('INVALID_CODIGO_IBGE');
  const start = `${referenceYear}-01-01`;
  const end = `${referenceYear}-12-31`;
  const indicators = ECONOMY_INDICATOR_DEFINITIONS.map((definition) => {
    const matches = rows.filter((row) => row.anexo === definition.anexo && row.cod_conta === definition.codConta && row.coluna === definition.coluna);
    if (matches.length !== 1) throw new Error(`SICONFI_EXPECTED_SINGLE_ROW:${referenceYear}:${definition.indicador}:${matches.length}`);
    const row = matches[0];
    const valor = numericValue(row.valor);
    const sourceRecordId = `${referenceYear}:${definition.anexo}:${definition.codConta}:${definition.coluna}`;
    return {
      indicador: definition.indicador,
      valor,
      unidade: 'BRL' as const,
      periodoInicio: start,
      periodoFim: end,
      sourceRecordId,
      sourceUpdatedAt: null,
      metadata: {
        source_mode: 'REAL',
        source_resource: definition.anexo,
        source_url: `https://apidatalake.tesouro.gov.br/ords/cdwhprd/siconfi/tt/dca?an_exercicio=${referenceYear}&id_ente=${codigoIbge}`,
        reference_year: referenceYear,
        reference_period: String(referenceYear),
        unit: 'BRL',
        natureza: definition.natureza,
        classification: definition.classificacao,
        raw_name: row.conta,
        raw_column: row.coluna,
        raw_account_code: row.cod_conta,
        institution: row.instituicao,
        uf: row.uf,
        source_population_discarded: row.populacao,
        derivation: 'raw_source_row',
      },
    } satisfies EconomyIndicator;
  });
  const sourceHash = createHash('sha256').update(JSON.stringify(indicators.map(({ indicador, valor, sourceRecordId }) => ({ indicador, valor, sourceRecordId })))).digest('hex');
  return { referenceYear, periodoInicio: start, periodoFim: end, indicators, sourceHash };
}
