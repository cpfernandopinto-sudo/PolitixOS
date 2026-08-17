import { createHash } from 'node:crypto';
import {
  PIB_BASE_DATASET,
  PIB_SIDRA_DATASET,
  PIB_SIDRA_TABLE,
  PIB_SIDRA_VARIABLES,
  parseSidraValue,
  type OfficialPibPerCapitaRow,
  type SidraPibSeries,
} from './economia-pib-client';

export const PIB_REFERENCE_START_YEAR = 2002;
export const PIB_REFERENCE_END_YEAR = 2023;
export const PIB_DETAILED_END_YEAR = 2021;
export const PIB_VALUE_IDENTITY_TOLERANCE_BRL = 1_000;
export const VAB_VALUE_IDENTITY_TOLERANCE_BRL = 2_000;
export const SHARE_IDENTITY_TOLERANCE_PP = 0.02;

type CanonicalUnit = 'BRL' | 'BRL/habitante' | '%';

interface PibVariableDefinition {
  id: typeof PIB_SIDRA_VARIABLES[number];
  indicator: string;
  rawName: string;
  rawUnit: 'Mil Reais' | '%';
  canonicalUnit: CanonicalUnit;
  endYear: number;
  officialConcept: string;
}

export const PIB_VARIABLE_DEFINITIONS: readonly PibVariableDefinition[] = [
  { id: 37, indicator: 'pib_municipal_precos_correntes', rawName: 'Produto Interno Bruto a preços correntes', rawUnit: 'Mil Reais', canonicalUnit: 'BRL', endYear: 2023, officialConcept: 'Produto Interno Bruto a preços correntes' },
  { id: 543, indicator: 'impostos_liquidos_subsidios_produtos_precos_correntes', rawName: 'Impostos, líquidos de subsídios, sobre produtos a preços correntes', rawUnit: 'Mil Reais', canonicalUnit: 'BRL', endYear: 2021, officialConcept: 'Impostos, líquidos de subsídios, sobre produtos a preços correntes' },
  { id: 498, indicator: 'vab_total_precos_correntes', rawName: 'Valor adicionado bruto a preços correntes total', rawUnit: 'Mil Reais', canonicalUnit: 'BRL', endYear: 2021, officialConcept: 'Valor adicionado bruto a preços correntes total' },
  { id: 513, indicator: 'vab_agropecuaria_precos_correntes', rawName: 'Valor adicionado bruto a preços correntes da agropecuária', rawUnit: 'Mil Reais', canonicalUnit: 'BRL', endYear: 2021, officialConcept: 'Valor adicionado bruto a preços correntes da agropecuária' },
  { id: 516, indicator: 'participacao_vab_agropecuaria', rawName: 'Participação do valor adicionado bruto a preços correntes da agropecuária no valor adicionado bruto a preços correntes total', rawUnit: '%', canonicalUnit: '%', endYear: 2021, officialConcept: 'Participação do VAB da agropecuária no VAB total' },
  { id: 517, indicator: 'vab_industria_precos_correntes', rawName: 'Valor adicionado bruto a preços correntes da indústria', rawUnit: 'Mil Reais', canonicalUnit: 'BRL', endYear: 2021, officialConcept: 'Valor adicionado bruto a preços correntes da indústria' },
  { id: 520, indicator: 'participacao_vab_industria', rawName: 'Participação do valor adicionado bruto a preços correntes da indústria no valor adicionado bruto a preços correntes total', rawUnit: '%', canonicalUnit: '%', endYear: 2021, officialConcept: 'Participação do VAB da indústria no VAB total' },
  { id: 6575, indicator: 'vab_servicos_exceto_setor_publico_ampliado_precos_correntes', rawName: 'Valor adicionado bruto a preços correntes dos serviços, exclusive administração, defesa, educação e saúde públicas e seguridade social', rawUnit: 'Mil Reais', canonicalUnit: 'BRL', endYear: 2021, officialConcept: 'Valor adicionado bruto dos serviços, exclusive administração, defesa, educação e saúde públicas e seguridade social, a preços correntes' },
  { id: 6574, indicator: 'participacao_vab_servicos_exceto_setor_publico_ampliado', rawName: 'Participação do valor adicionado bruto a preços correntes dos serviços, exclusive administração, defesa, educação e saúde públicas e seguridade social, no valor adicionado bruto a preços correntes total', rawUnit: '%', canonicalUnit: '%', endYear: 2021, officialConcept: 'Participação do VAB dos serviços, exclusive setor público ampliado, no VAB total' },
  { id: 525, indicator: 'vab_administracao_defesa_educacao_saude_publicas_seguridade_precos_correntes', rawName: 'Valor adicionado bruto a preços correntes da administração, defesa, educação e saúde públicas e seguridade social', rawUnit: 'Mil Reais', canonicalUnit: 'BRL', endYear: 2021, officialConcept: 'Valor adicionado bruto da administração, defesa, educação e saúde públicas e seguridade social, a preços correntes' },
  { id: 528, indicator: 'participacao_vab_administracao_defesa_educacao_saude_publicas_seguridade', rawName: 'Participação do valor adicionado bruto a preços correntes da administração, defesa, educação e saúde públicas e seguridade social no valor adicionado bruto a preços correntes total', rawUnit: '%', canonicalUnit: '%', endYear: 2021, officialConcept: 'Participação do VAB da administração, defesa, educação e saúde públicas e seguridade social no VAB total' },
] as const;

export interface PibIndicator {
  indicator: string;
  value: number;
  unit: CanonicalUnit;
  periodStart: string;
  periodEnd: string;
  sourceDataset: typeof PIB_SIDRA_DATASET | typeof PIB_BASE_DATASET;
  sourceRecordId: string;
  sourceUpdatedAt: null;
  metadata: Record<string, unknown>;
}

export interface PibAvailability {
  variableId: number;
  indicator: string;
  year: number;
  status: string;
  rawValue: string;
}

export interface NormalizedPibMunicipal {
  indicators: PibIndicator[];
  unavailable: PibAvailability[];
  sourceHash: string;
  sidraByYear: Map<number, PibIndicator[]>;
  baseByYear: Map<number, PibIndicator[]>;
}

function annualPeriod(year: number) {
  return { periodStart: `${year}-01-01`, periodEnd: `${year}-12-31` };
}

export function pibIndicatorNaturalKey(indicator: Pick<PibIndicator, 'indicator' | 'sourceDataset' | 'periodStart' | 'periodEnd'>): string {
  return `${indicator.indicator}|${indicator.sourceDataset}|${indicator.periodStart}|${indicator.periodEnd}`;
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function singleSeries(item: SidraPibSeries, codigoIbge: string): Record<string, string> {
  const series = item.resultados.flatMap((result) => result.series).filter((entry) => entry.localidade.id === codigoIbge);
  if (series.length !== 1) throw new Error(`SIDRA_5938_EXPECTED_SINGLE_SERIES:${codigoIbge}:${item.variavel}:${series.length}`);
  return series[0].serie;
}

function validateSidraContract(payload: SidraPibSeries[]) {
  if (payload.length !== PIB_VARIABLE_DEFINITIONS.length) throw new Error(`SIDRA_5938_VARIABLE_COUNT:${payload.length}`);
  payload.forEach((item, index) => {
    const definition = PIB_VARIABLE_DEFINITIONS[index];
    if (item.variavel !== definition.rawName || item.unidade !== definition.rawUnit) {
      throw new Error(`SIDRA_5938_CONTRACT_CHANGED:${definition.id}:${item.variavel}:${item.unidade}`);
    }
  });
}

export function validatePibIdentities(indicators: PibIndicator[]) {
  const byYear = new Map<number, Map<string, number>>();
  for (const indicator of indicators.filter((item) => item.sourceDataset === PIB_SIDRA_DATASET)) {
    const year = Number(indicator.metadata.reference_year);
    const values = byYear.get(year) ?? new Map<string, number>();
    values.set(indicator.indicator, indicator.value);
    byYear.set(year, values);
  }
  for (const [year, values] of byYear) {
    if (year > PIB_DETAILED_END_YEAR) continue;
    const get = (name: string) => {
      const value = values.get(name);
      if (value === undefined) throw new Error(`PIB_IDENTITY_MISSING:${year}:${name}`);
      return value;
    };
    const pibDifference = Math.abs(get('pib_municipal_precos_correntes') - get('vab_total_precos_correntes') - get('impostos_liquidos_subsidios_produtos_precos_correntes'));
    if (pibDifference > PIB_VALUE_IDENTITY_TOLERANCE_BRL) throw new Error(`PIB_IDENTITY_FAILED:${year}:${pibDifference}`);
    const vabDifference = Math.abs(get('vab_total_precos_correntes') - get('vab_agropecuaria_precos_correntes') - get('vab_industria_precos_correntes') - get('vab_servicos_exceto_setor_publico_ampliado_precos_correntes') - get('vab_administracao_defesa_educacao_saude_publicas_seguridade_precos_correntes'));
    if (vabDifference > VAB_VALUE_IDENTITY_TOLERANCE_BRL) throw new Error(`VAB_IDENTITY_FAILED:${year}:${vabDifference}`);
    const shareDifference = Math.abs(100 - get('participacao_vab_agropecuaria') - get('participacao_vab_industria') - get('participacao_vab_servicos_exceto_setor_publico_ampliado') - get('participacao_vab_administracao_defesa_educacao_saude_publicas_seguridade'));
    if (shareDifference > SHARE_IDENTITY_TOLERANCE_PP + Number.EPSILON * 100) throw new Error(`VAB_SHARE_IDENTITY_FAILED:${year}:${shareDifference}`);
  }
}

export function normalizePibMunicipal(codigoIbge: string, payload: SidraPibSeries[], perCapitaRows: OfficialPibPerCapitaRow[], sidraSourceUrl: string): NormalizedPibMunicipal {
  if (!/^\d{7}$/.test(codigoIbge)) throw new Error('INVALID_CODIGO_IBGE');
  validateSidraContract(payload);
  if (perCapitaRows.length !== 0 && perCapitaRows.length !== 22) throw new Error(`PIB_PER_CAPITA_INCOMPLETE:${codigoIbge}:${perCapitaRows.length}`);
  const indicators: PibIndicator[] = [];
  const unavailable: PibAvailability[] = [];
  const sidraByYear = new Map<number, PibIndicator[]>();
  const baseByYear = new Map<number, PibIndicator[]>();

  payload.forEach((item, index) => {
    const definition = PIB_VARIABLE_DEFINITIONS[index];
    const series = singleSeries(item, codigoIbge);
    for (let year = PIB_REFERENCE_START_YEAR; year <= PIB_REFERENCE_END_YEAR; year++) {
      const raw = series[String(year)];
      if (raw === undefined) throw new Error(`SIDRA_5938_MISSING_YEAR:${definition.id}:${year}`);
      const parsed = parseSidraValue(raw);
      if (parsed.value === null) {
        unavailable.push({ variableId: definition.id, indicator: definition.indicator, year, status: parsed.status, rawValue: parsed.rawValue });
        if (year <= definition.endYear) throw new Error(`SIDRA_5938_UNEXPECTED_UNAVAILABLE:${definition.id}:${year}:${parsed.status}`);
        continue;
      }
      if (year > definition.endYear) throw new Error(`SIDRA_5938_UNEXPECTED_VALUE:${definition.id}:${year}`);
      const monetary = definition.rawUnit === 'Mil Reais';
      const value = monetary ? parsed.value * 1_000 : parsed.value;
      const period = annualPeriod(year);
      const indicator: PibIndicator = {
        indicator: definition.indicator,
        value,
        unit: definition.canonicalUnit,
        ...period,
        sourceDataset: PIB_SIDRA_DATASET,
        sourceRecordId: `${PIB_SIDRA_TABLE}:${definition.id}:${codigoIbge}:${year}`,
        sourceUpdatedAt: null,
        metadata: {
          source_mode: 'REAL', table_id: PIB_SIDRA_TABLE, variable_id: definition.id,
          raw_name: definition.rawName, raw_value: parsed.rawValue, raw_unit: definition.rawUnit,
          normalization_factor: monetary ? 1_000 : 1, reference_year: year,
          source_url: sidraSourceUrl, availability_status: parsed.status,
          methodological_reference: 'IBGE PIB dos Municípios — referência 2010; valores a preços correntes',
          official_concept: definition.officialConcept, price_basis: 'current_prices', derivation: 'official_direct',
        },
      };
      indicators.push(indicator);
      sidraByYear.set(year, [...(sidraByYear.get(year) ?? []), indicator]);
    }
  });

  for (const row of perCapitaRows) {
    if (row.codigoIbge !== codigoIbge || row.year < PIB_REFERENCE_START_YEAR || row.year > PIB_REFERENCE_END_YEAR) throw new Error(`PIB_PER_CAPITA_ROW_OUT_OF_SCOPE:${row.codigoIbge}:${row.year}`);
    const period = annualPeriod(row.year);
    const indicator: PibIndicator = {
      indicator: 'pib_per_capita_precos_correntes', value: row.pibPerCapita, unit: 'BRL/habitante', ...period,
      sourceDataset: PIB_BASE_DATASET, sourceRecordId: `PIB_MUNICIPIOS_BASE:${codigoIbge}:${row.year}`, sourceUpdatedAt: null,
      metadata: {
        source_mode: 'REAL', raw_name: 'Produto Interno Bruto per capita, a preços correntes', raw_value: row.pibPerCapita,
        raw_unit: 'Reais', normalization_factor: 1, reference_year: row.year, source_url: row.sourceUrl,
        source_file: row.sourceFile, availability_status: 'available',
        methodological_reference: 'IBGE PIB dos Municípios — base oficial completa; valores a preços correntes',
        official_pib_thousand_brl_for_audit: row.officialPibThousandBrl,
        raw_line_hash: hash(row.rawLineHashInput), price_basis: 'current_prices', derivation: 'official_direct',
      },
    };
    indicators.push(indicator);
    baseByYear.set(row.year, [indicator]);
  }

  validatePibIdentities(indicators);
  return { indicators, unavailable, sourceHash: hash(JSON.stringify(indicators.map((item) => [item.sourceRecordId, item.value, item.unit]))), sidraByYear, baseByYear };
}
