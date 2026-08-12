import { createHash, randomUUID } from 'node:crypto';
import { downloadTseCsv, getTseCacheStats, type TseCsvResource, type TseSourceDescriptor } from './tse-client';
import {
  aggregateCandidateResults,
  aggregateElectionTotals,
  aggregatePartyResults,
  buildCouncilComposition,
  type TerritorialElectionDataset,
  type TseTerritoryKey,
} from './tse-normalizer';

export const TSE_WORKFLOW_NAME = 'politix-territorios-tse';
export const TSE_WORKFLOW_VERSION = '1.2.0';
export const MUNICIPAL_YEARS = [2016, 2020, 2024] as const;
export const TSE_BATCH_SIZE = 100;

type AdminClient = ReturnType<typeof import('@/lib/supabaseClient').createAdminClient>;

export interface RunTseCollectionInput {
  codigoIbge: string;
  requestId?: string | null;
  years?: number[];
}

export interface TseCollectionResult {
  requestId: string;
  territory: TseTerritoryKey;
  dataset: TerritorialElectionDataset;
  indicatorsPersisted: number;
  indicatorReconciliation: IndicatorReconciliationMetrics;
  evidencePersisted: number;
  overallStatus: 'completed' | 'partial' | 'failed';
  errors: string[];
  metrics: TseTerritoryMetrics;
}

export interface IndicatorReconciliationMetrics {
  existingRead: number;
  pagesRead: number;
  inserts: number;
  updates: number;
  skips: number;
}

export interface TseTerritoryMetrics {
  totalMs: number;
  persistenceMs: number;
  indicatorBatches: number;
  evidenceBatches: number;
  retries: number;
}

export interface TseMultiCollectionResult {
  requestId: string;
  results: TseCollectionResult[];
  cache: ReturnType<typeof getTseCacheStats>;
  totalMs: number;
}

export class TseCollectionError extends Error {
  constructor(public readonly kind: 'invalid_input' | 'territory_not_found' | 'mapping_not_found' | 'database', message: string) {
    super(message);
    this.name = 'TseCollectionError';
  }
}

function normalizedName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function resolveCodigoTse(rows: Record<string, string>[], uf: string, municipio: string, metadata: Record<string, unknown>): string {
  const tse = metadata.tse as { codigo_municipio?: unknown } | undefined;
  if (typeof tse?.codigo_municipio === 'string' && /^\d+$/.test(tse.codigo_municipio)) return tse.codigo_municipio;
  const matches = new Set(
    rows
      .filter((row) => row.SG_UF === uf && normalizedName(row.NM_MUNICIPIO) === normalizedName(municipio))
      .map((row) => row.CD_MUNICIPIO)
      .filter(Boolean)
  );
  if (matches.size !== 1) throw new TseCollectionError('mapping_not_found', `Mapeamento TSE não foi único para ${municipio}/${uf}.`);
  return [...matches][0];
}

function period(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

const TSE_RECONCILIATION_PAGE_SIZE = 1000;

export async function readAllExistingTseIndicators(
  fetchPage: (start: number, end: number) => PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>,
  pageSize = TSE_RECONCILIATION_PAGE_SIZE
): Promise<{ rows: Record<string, unknown>[]; pagesRead: number }> {
  const rows: Record<string, unknown>[] = [];
  let pagesRead = 0;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await fetchPage(start, start + pageSize - 1);
    if (error) throw new TseCollectionError('database', error.message);
    const page = data ?? [];
    pagesRead++;
    rows.push(...page);
    if (page.length < pageSize) return { rows, pagesRead };
  }
}

export function reconcileIndicatorRows(existing: Record<string, unknown>[], incoming: Record<string, unknown>[]) {
  const byKey = new Map(existing.map((row) => [`${row.indicador}|${row.source_dataset}|${row.periodo_inicio}|${row.periodo_fim}`, row]));
  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: Array<{ id: unknown; row: Record<string, unknown> }> = [];
  let skips = 0;
  for (const row of incoming) {
    const k = `${row.indicador}|${row.source_dataset}|${row.periodo_inicio}|${row.periodo_fim}`;
    const existingRow = byKey.get(k);
    if (existingRow && !sameIndicatorValue(existingRow, row)) toUpdate.push({ id: existingRow.id, row });
    else if (existingRow) skips++;
    else toInsert.push(row);
  }
  return { toInsert, toUpdate, skips };
}

async function persistIndicators(client: AdminClient, territoryId: string, dataset: TerritorialElectionDataset): Promise<IndicatorReconciliationMetrics> {
  const rows: Record<string, unknown>[] = [];
  for (const item of dataset.totals) {
    const p = period(item.year);
    const base = {
      territory_id: territoryId,
      categoria: 'eleicoes',
      fonte: 'TSE',
      source_dataset: `detalhe_votacao_munzona_${item.year}`,
      periodo_inicio: p.start,
      periodo_fim: p.end,
      granularidade: 'municipal',
      unidade: 'eleitores',
      source_updated_at: null,
      collected_at: dataset.metadata.collectedAt,
      updated_at: dataset.metadata.collectedAt,
      metodologia: 'Soma das zonas eleitorais do município, preservando ano, turno e cargo.',
      metadata: { ano: item.year, turno: item.round, cargo: item.office, codigo_cargo: item.officeCode, tipo_eleicao: item.electionType, source_record_ids: item.sourceRecordIds, source_mode: 'REAL' },
    };
    const suffix = `${item.year}_t${item.round}_c${item.officeCode}`;
    for (const [indicator, value] of [
      ['eleitorado_total', item.electorate], ['comparecimento_total', item.turnout], ['abstencao_total', item.abstention],
      ['votos_validos_total', item.validVotes], ['votos_brancos_total', item.blankVotes], ['votos_nulos_total', item.nullVotes],
    ] as const) rows.push({ ...base, indicador: `${indicator}_${suffix}`, valor: value, source_record_id: `${dataset.territory.codigoTse}:${suffix}:${indicator}` });
  }
  for (const item of dataset.results) {
    const p = period(item.year);
    rows.push({
      territory_id: territoryId, categoria: 'eleicoes', indicador: `resultado_candidato_${item.year}_t${item.round}_c${item.officeCode}_${item.candidateId}`,
      valor: item.votes, unidade: 'votos', periodo_inicio: p.start, periodo_fim: p.end, granularidade: 'municipal', fonte: 'TSE',
      source_dataset: `votacao_candidato_munzona_${item.year}`, source_record_id: item.candidateId, source_updated_at: null,
      metodologia: 'Soma da votação nominal válida do candidato em todas as zonas do município.', metadata: { ...item, source_mode: 'REAL' },
      collected_at: dataset.metadata.collectedAt, updated_at: dataset.metadata.collectedAt,
    });
  }
  for (const item of dataset.parties) {
    const p = period(item.year);
    rows.push({
      territory_id: territoryId, categoria: 'eleicoes', indicador: `resultado_partido_${item.year}_t${item.round}_c${item.officeCode}_${item.partyNumber}`,
      valor: item.totalVotes, unidade: 'votos', periodo_inicio: p.start, periodo_fim: p.end, granularidade: 'municipal', fonte: 'TSE',
      source_dataset: `votacao_partido_munzona_${item.year}`, source_record_id: item.partyNumber, source_updated_at: null,
      metodologia: 'Soma dos votos nominais válidos e votos de legenda válidos do partido no município.', metadata: { ...item, source_mode: 'REAL' },
      collected_at: dataset.metadata.collectedAt, updated_at: dataset.metadata.collectedAt,
    });
  }

  const { rows: existing, pagesRead } = await readAllExistingTseIndicators((start, end) => client.from('territory_indicators')
    .select('id, indicador, fonte, source_dataset, periodo_inicio, periodo_fim, valor, unidade, metadata')
    .eq('territory_id', territoryId).eq('categoria', 'eleicoes').eq('fonte', 'TSE').range(start, end));
  const { toInsert, toUpdate, skips } = reconcileIndicatorRows(existing, rows);

  for (const batch of chunks(toInsert, TSE_BATCH_SIZE)) {
    const { error } = await client.from('territory_indicators').insert(batch);
    if (error) throw new TseCollectionError('database', `Falha no lote de ${batch.length} indicadores: ${error.message}`);
  }
  for (const batch of chunks(toUpdate, TSE_BATCH_SIZE)) {
    const outcomes = await Promise.all(batch.map(({ id, row }) => client.from('territory_indicators').update(row).eq('id', id)));
    const failed = outcomes.find((outcome) => outcome.error);
    if (failed?.error) throw new TseCollectionError('database', `Falha no lote de atualização de indicadores: ${failed.error.message}`);
  }
  return { existingRead: existing.length, pagesRead, inserts: toInsert.length, updates: toUpdate.length, skips };
}

function sameIndicatorValue(existing: Record<string, unknown>, incoming: Record<string, unknown>): boolean {
  return Number(existing.valor) === Number(incoming.valor)
    && existing.unidade === incoming.unidade;
}

async function persistEvidence(client: AdminClient, territoryId: string, dataset: TerritorialElectionDataset): Promise<number> {
  const rows = dataset.sources.map((source) => {
    const raw = { source, territory: dataset.territory, contractVersion: dataset.metadata.version };
    const sourceHash = createHash('sha256').update(`${territoryId}|${source.dataset}|${source.referencePeriod}`).digest('hex');
    return {
      territory_id: territoryId, source_type: 'official_data', source_name: 'TSE', source_url: source.sourceUrl,
      source_external_id: source.dataset, source_hash: sourceHash, collected_at: dataset.metadata.collectedAt, tema: 'eleicoes',
      title: source.officialName, summary: `Dataset oficial TSE ${source.referencePeriod}, agregado para ${dataset.territory.municipio}/${dataset.territory.uf}.`,
      raw_reference: raw, confidence: 1, metadata: { classification: 'OFFICIAL', license: source.license, territorial_granularity: source.territorialGranularity },
    };
  });
  let persisted = 0;
  for (const batch of chunks(rows, TSE_BATCH_SIZE)) {
    const { error } = await client.from('territory_evidence').upsert(batch, { onConflict: 'territory_id,source_hash' });
    if (error) throw new TseCollectionError('database', error.message);
    persisted += batch.length;
  }
  return persisted;
}

export function chunks<T>(values: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size));
  return output;
}

interface PreparedTseResources {
  detailByYear: Map<number, TseCsvResource>;
  candidatesByYear: Map<number, TseCsvResource>;
  partiesByYear: Map<number, TseCsvResource>;
}

interface TseTerritoryRow {
  id: string;
  codigo_ibge: string;
  municipio: string;
  uf: string;
  metadata: Record<string, unknown> | null;
}

async function prepareResources(uf: string, years: number[]): Promise<PreparedTseResources> {
  const [detailResources, candidateResources, partyResources] = await Promise.all([
    Promise.all(years.map((year) => downloadTseCsv(year, uf, 'detail'))),
    Promise.all(years.map((year) => downloadTseCsv(year, uf, 'candidate'))),
    Promise.all(years.map((year) => downloadTseCsv(year, uf, 'party'))),
  ]);
  return {
    detailByYear: new Map(years.map((year, index) => [year, detailResources[index]])),
    candidatesByYear: new Map(years.map((year, index) => [year, candidateResources[index]])),
    partiesByYear: new Map(years.map((year, index) => [year, partyResources[index]])),
  };
}

async function createRun(client: AdminClient, territoryId: string, requestId: string, input: RunTseCollectionInput, startedAt: string) {
  const { data, error } = await client.from('territory_collection_runs').insert({
    territory_id: territoryId, request_id: requestId, source: 'tse', status: 'running', workflow_name: TSE_WORKFLOW_NAME,
    workflow_version: TSE_WORKFLOW_VERSION, started_at: startedAt, items_collected: 0, items_processed: 0,
    items_discarded: 0, metadata: { codigo_ibge: input.codigoIbge, years: input.years },
  }).select('id').single();
  if (error) throw new TseCollectionError('database', error.message);
  return data.id as string;
}

async function finishRun(client: AdminClient, runId: string, values: Record<string, unknown>) {
  const { error } = await client.from('territory_collection_runs').update({ ...values, finished_at: new Date().toISOString() }).eq('id', runId);
  if (error) throw new TseCollectionError('database', error.message);
}

function validateInput(input: RunTseCollectionInput): { requestId: string; years: number[] } {
  if (!/^\d{7}$/.test(input.codigoIbge)) throw new TseCollectionError('invalid_input', 'codigoIbge deve conter 7 dígitos.');
  const requestId = input.requestId ?? randomUUID();
  const years = [...new Set(input.years ?? MUNICIPAL_YEARS)].sort();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    throw new TseCollectionError('invalid_input', 'requestId deve ser um UUID válido.');
  }
  if (!years.length || years.some((year) => !Number.isInteger(year) || year < 2000 || year > 2100)) {
    throw new TseCollectionError('invalid_input', 'years deve conter anos eleitorais válidos.');
  }
  return { requestId, years };
}

async function collectPreparedTerritory(
  client: AdminClient,
  input: RunTseCollectionInput,
  requestId: string,
  years: number[],
  territoryRow: TseTerritoryRow,
  resources: PreparedTseResources
): Promise<TseCollectionResult> {
  const totalStartedAt = performance.now();
  const startedAt = new Date().toISOString();
  const runId = await createRun(client, territoryRow.id, requestId, input, startedAt);
  try {
    const latestYear = Math.max(...years);
    const latestDetail = resources.detailByYear.get(latestYear)!;
    const codigoTse = resolveCodigoTse(latestDetail.rows, territoryRow.uf, territoryRow.municipio, territoryRow.metadata ?? {});
    const territory: TseTerritoryKey = { codigoIbge: territoryRow.codigo_ibge, codigoTse, municipio: territoryRow.municipio, uf: territoryRow.uf };
    const sources: TseSourceDescriptor[] = [];
    const totals = [];
    const errors: string[] = [];
    for (const year of years) {
      try {
        const resource = resources.detailByYear.get(year)!;
        sources.push(resource.source);
        totals.push(...aggregateElectionTotals(resource.rowsByMunicipality.get(codigoTse) ?? [], territory));
      } catch (err) {
        errors.push(`${year}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    const validByOffice = new Map(totals.map((item) => [`${item.year}|${item.round}|${item.officeCode}`, item.validVotes]));
    const results = [];
    const parties = [];
    for (const year of years) {
      const candidateResource = resources.candidatesByYear.get(year)!;
      const partyResource = resources.partiesByYear.get(year)!;
      sources.push(candidateResource.source, partyResource.source);
      results.push(...aggregateCandidateResults(candidateResource.rowsByMunicipality.get(codigoTse) ?? [], territory, validByOffice));
      parties.push(...aggregatePartyResults(partyResource.rowsByMunicipality.get(codigoTse) ?? [], territory));
    }
    const dataset: TerritorialElectionDataset = {
      metadata: { engine: 'TSE', version: TSE_WORKFLOW_VERSION, collectedAt: new Date().toISOString(), referenceYears: years, sourceMode: 'REAL' },
      territory, sources, totals, results, parties, councilComposition: buildCouncilComposition(results, latestYear),
    };

    const metadata = { ...(territoryRow.metadata ?? {}), tse: { codigo_municipio: codigoTse, mapping_method: 'unique_uf_normalized_name_then_persisted', mapped_at: dataset.metadata.collectedAt } };
    const { error: metadataError } = await client.from('territories').update({ metadata, updated_at: dataset.metadata.collectedAt }).eq('id', territoryRow.id);
    if (metadataError) throw new TseCollectionError('database', metadataError.message);
    const persistenceStartedAt = performance.now();
    const indicatorReconciliation = await persistIndicators(client, territoryRow.id, dataset);
    const indicatorsPersisted = indicatorReconciliation.inserts + indicatorReconciliation.updates;
    const evidencePersisted = await persistEvidence(client, territoryRow.id, dataset);
    const persistenceMs = performance.now() - persistenceStartedAt;
    const overallStatus = errors.length ? 'partial' : 'completed';
    const metrics: TseTerritoryMetrics = {
      totalMs: performance.now() - totalStartedAt,
      persistenceMs,
      indicatorBatches: Math.ceil(indicatorsPersisted / TSE_BATCH_SIZE),
      evidenceBatches: Math.ceil(evidencePersisted / TSE_BATCH_SIZE),
      retries: 0,
    };
    await finishRun(client, runId, {
      status: overallStatus, items_collected: totals.length + results.length + parties.length, items_processed: indicatorsPersisted,
      items_discarded: 0, error_message: errors.join('; ') || null,
      metadata: { codigo_ibge: input.codigoIbge, codigo_tse: codigoTse, years, sources: sources.map((s) => s.dataset), metrics, indicator_reconciliation: indicatorReconciliation },
    });
    return { requestId, territory, dataset, indicatorsPersisted, indicatorReconciliation, evidencePersisted, overallStatus, errors, metrics };
  } catch (error) {
    await finishRun(client, runId, { status: 'failed', error_message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function runTseCollection(client: AdminClient, input: RunTseCollectionInput): Promise<TseCollectionResult> {
  const { requestId, years } = validateInput(input);
  const { data: territoryRow, error } = await client.from('territories').select('id, codigo_ibge, municipio, uf, metadata').eq('codigo_ibge', input.codigoIbge).maybeSingle();
  if (error) throw new TseCollectionError('database', error.message);
  if (!territoryRow) throw new TseCollectionError('territory_not_found', `Território ${input.codigoIbge} não existe no catálogo.`);
  const resources = await prepareResources(territoryRow.uf, years);
  return collectPreparedTerritory(client, input, requestId, years, territoryRow, resources);
}

export async function runTseMultiCollection(client: AdminClient, inputs: RunTseCollectionInput[]): Promise<TseMultiCollectionResult> {
  if (!inputs.length) throw new TseCollectionError('invalid_input', 'Informe ao menos um território.');
  const totalStartedAt = performance.now();
  const requestId = inputs[0].requestId ?? randomUUID();
  const validated = inputs.map((input) => validateInput({ ...input, requestId }));
  const years = validated[0].years;
  if (validated.some((item) => item.years.join(',') !== years.join(','))) throw new TseCollectionError('invalid_input', 'Todos os territórios do lote devem usar os mesmos anos.');
  const codes = inputs.map((input) => input.codigoIbge);
  const { data, error } = await client.from('territories').select('id, codigo_ibge, municipio, uf, metadata').in('codigo_ibge', codes);
  if (error) throw new TseCollectionError('database', error.message);
  const rows = (data ?? []) as TseTerritoryRow[];
  if (rows.length !== new Set(codes).size) throw new TseCollectionError('territory_not_found', 'Um ou mais territórios do lote não existem no catálogo.');
  const ufs = new Set(rows.map((row) => row.uf));
  if (ufs.size !== 1) throw new TseCollectionError('invalid_input', 'O lote controlado deve conter municípios da mesma UF.');
  const resources = await prepareResources(rows[0].uf, years);
  const byCode = new Map(rows.map((row) => [row.codigo_ibge, row]));
  const results: TseCollectionResult[] = [];
  for (const input of inputs) results.push(await collectPreparedTerritory(client, { ...input, requestId, years }, requestId, years, byCode.get(input.codigoIbge)!, resources));
  return { requestId, results, cache: getTseCacheStats(), totalMs: performance.now() - totalStartedAt };
}
