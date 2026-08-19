import { createHash } from 'node:crypto';
import { fetchIbgeJson } from './ibge-client';

export const DEMOGRAPHY_ESTIMATE_DATASET = 'SIDRA_6579';
export const DEMOGRAPHY_CENSUS_DATASET = 'SIDRA_9514';
export const DEMOGRAPHY_SOURCE = 'IBGE';
export const DEMOGRAPHY_REFERENCE_YEAR = '2022';

const AGGREGATES_BASE = 'https://servicodados.ibge.gov.br/api/v3/agregados';
const AGE_CATEGORIES = {
  criancas: ['93070', '93084', '93085'],
  jovens: ['93086', '93087', '93088'],
  adultos: ['93089', '93090', '93091', '93092', '93093', '93094'],
  idosos: ['93095', '93096', '93097', '93098', '49108', '49109', '60040', '60041', '6653'],
} as const;
const AGE_IDS = Object.values(AGE_CATEGORIES).flat();

interface SidraResult {
  id: string;
  variavel: string;
  unidade: string;
  resultados: Array<{
    classificacoes: Array<{ id: string; nome: string; categoria: Record<string, string> }>;
    series: Array<{ localidade: { id: string; nome: string }; serie: Record<string, string> }>;
  }>;
}

export interface DemographyIndicator {
  codigoIbge: string;
  indicator: string;
  value: number;
  unit: 'Pessoas' | '%';
  periodStart: string;
  periodEnd: string;
  sourceDataset: typeof DEMOGRAPHY_ESTIMATE_DATASET | typeof DEMOGRAPHY_CENSUS_DATASET;
  sourceRecordId: string;
  methodology: string;
  metadata: Record<string, unknown>;
}

export interface DemographyNormalized {
  indicators: DemographyIndicator[];
  evidence: Array<{ codigoIbge: string; dataset: string; sourceUrl: string; sourceHash: string; period: string; rawReference: Record<string, unknown> }>;
}

function finiteValue(raw: string | undefined): number | null {
  if (raw === undefined || raw === '-' || raw === '...') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function classificationId(result: SidraResult['resultados'][number], classification: string): string | null {
  const found = result.classificacoes.find((item) => item.id === classification);
  return found ? Object.keys(found.categoria)[0] ?? null : null;
}

export function normalizeDemographyPayloads(estimatePayload: SidraResult[], censusPayload: SidraResult[], collectedAt: string): DemographyNormalized {
  const indicators: DemographyIndicator[] = [];
  const evidence: DemographyNormalized['evidence'] = [];
  const estimateUrl = `${AGGREGATES_BASE}/6579`;
  const censusUrl = `${AGGREGATES_BASE}/9514`;

  for (const series of estimatePayload[0]?.resultados?.flatMap((item) => item.series ?? []) ?? []) {
    const records: Array<[string, number]> = [];
    for (const [period, raw] of Object.entries(series.serie ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      const value = finiteValue(raw);
      if (value === null) continue;
      records.push([period, value]);
      indicators.push({
        codigoIbge: series.localidade.id, indicator: 'populacao_total', value, unit: 'Pessoas',
        periodStart: `${period}-01-01`, periodEnd: `${period}-12-31`, sourceDataset: DEMOGRAPHY_ESTIMATE_DATASET,
        sourceRecordId: `6579:9324:${series.localidade.id}:${period}`,
        methodology: 'Estimativa anual da população residente; não é resultado censitário.',
        metadata: { source_mode: 'REAL', source_table: 6579, variable: 9324, territory: series.localidade.id, reference_period: period, unit: 'Pessoas', method_context: 'estimativa_populacional_anual', source_url: estimateUrl, collected_at: collectedAt },
      });
    }
    const sourceHash = createHash('sha256').update(JSON.stringify(records)).digest('hex');
    evidence.push({ codigoIbge: series.localidade.id, dataset: DEMOGRAPHY_ESTIMATE_DATASET, sourceUrl: estimateUrl, sourceHash, period: records.at(-1)?.[0] ?? '', rawReference: { table: 6579, variable: 9324, records } });
  }

  const censusByTerritory = new Map<string, { name: string; total: number; male: number; female: number; ages: Map<string, number> }>();
  for (const result of censusPayload[0]?.resultados ?? []) {
    const sex = classificationId(result, '2');
    const age = classificationId(result, '287');
    const declaration = classificationId(result, '286');
    if (declaration !== '113635') continue;
    for (const series of result.series ?? []) {
      const value = finiteValue(series.serie?.[DEMOGRAPHY_REFERENCE_YEAR]);
      if (value === null) continue;
      const row = censusByTerritory.get(series.localidade.id) ?? { name: series.localidade.nome, total: 0, male: 0, female: 0, ages: new Map<string, number>() };
      if (age === '100362' && sex === '6794') row.total = value;
      else if (age === '100362' && sex === '4') row.male = value;
      else if (age === '100362' && sex === '5') row.female = value;
      else if (sex === '6794' && age && AGE_IDS.includes(age as never)) row.ages.set(age, value);
      censusByTerritory.set(series.localidade.id, row);
    }
  }

  for (const [codigoIbge, row] of censusByTerritory) {
    if (row.total <= 0 || row.male + row.female !== row.total) throw new Error(`DEMOGRAPHY_CENSUS_INCONSISTENT:${codigoIbge}`);
    const raw = { total: row.total, male: row.male, female: row.female, ages: [...row.ages.entries()].sort() };
    const baseMetadata = { source_mode: 'REAL', source_table: 9514, variable: 93, territory: codigoIbge, reference_period: DEMOGRAPHY_REFERENCE_YEAR, method_context: 'censo_demografico_2022', source_url: censusUrl, collected_at: collectedAt };
    const add = (indicator: string, value: number, unit: 'Pessoas' | '%', context: string) => indicators.push({
      codigoIbge, indicator, value, unit, periodStart: '2022-01-01', periodEnd: '2022-12-31', sourceDataset: DEMOGRAPHY_CENSUS_DATASET,
      sourceRecordId: `9514:93:${codigoIbge}:2022:${indicator}`, methodology: context,
      metadata: { ...baseMetadata, unit, derived_from: unit === '%' ? ['populacao_censo_total'] : undefined, definition: context },
    });
    add('populacao_censo_total', row.total, 'Pessoas', 'População residente recenseada no Censo Demográfico 2022.');
    add('populacao_masculina', row.male, 'Pessoas', 'População residente masculina recenseada no Censo 2022.');
    add('populacao_feminina', row.female, 'Pessoas', 'População residente feminina recenseada no Censo 2022.');
    add('percentual_masculino', Number(((row.male / row.total) * 100).toFixed(4)), '%', 'Participação masculina calculada sobre o total censitário da mesma tabela e período.');
    add('percentual_feminino', Number(((row.female / row.total) * 100).toFixed(4)), '%', 'Participação feminina calculada sobre o total censitário da mesma tabela e período.');
    for (const [group, ids] of Object.entries(AGE_CATEGORIES)) {
      const value = ids.reduce((sum, id) => sum + (row.ages.get(id) ?? 0), 0);
      add(`populacao_${group}`, value, 'Pessoas', `Faixa etária analítica PolitixOS agregada exclusivamente a partir das faixas quinquenais oficiais da tabela 9514: ${ids.join(', ')}.`);
      add(`percentual_${group}`, Number(((value / row.total) * 100).toFixed(4)), '%', `Participação da faixa ${group} sobre a população censitária total de 2022.`);
    }
    evidence.push({ codigoIbge, dataset: DEMOGRAPHY_CENSUS_DATASET, sourceUrl: censusUrl, sourceHash: createHash('sha256').update(JSON.stringify(raw)).digest('hex'), period: '2022', rawReference: { table: 9514, variable: 93, classifications: { sexo: [6794, 4, 5], idade: AGE_IDS, forma_declaracao: 113635 }, raw } });
  }
  return { indicators, evidence };
}

export async function fetchDemographyPayloads(codigosIbge: string[], fetcher: typeof fetch = fetch) {
  if (codigosIbge.length === 0 || codigosIbge.some((code) => !/^\d{7}$/.test(code))) throw new Error('INVALID_CODIGOS_IBGE');
  const localities = codigosIbge.join(',');
  const estimateUrl = `${AGGREGATES_BASE}/6579/periodos/-30/variaveis/9324?localidades=N6[${localities}]`;
  const censusUrl = `${AGGREGATES_BASE}/9514/periodos/2022/variaveis/93?localidades=N6[${localities}]&classificacao=2[6794,4,5]|287[100362,${AGE_IDS.join(',')}]|286[113635]`;
  const [estimatePayload, censusPayload] = await Promise.all([
    fetchIbgeJson<SidraResult[]>(estimateUrl, fetcher),
    fetchIbgeJson<SidraResult[]>(censusUrl, fetcher),
  ]);
  return { estimatePayload, censusPayload, sourceUrls: { estimateUrl, censusUrl } };
}
