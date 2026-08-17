import { randomUUID } from 'node:crypto';
import { fetchSiconfiDcaHistory } from './economia-siconfi-client';
import { economyIndicatorNaturalKey, normalizeSiconfiDcaYear, SICONFI_DCA_DATASET, type EconomyIndicator } from './economia-siconfi-normalizer';

type AdminClient = ReturnType<typeof import('@/lib/supabaseClient').createAdminClient>;
export const ECONOMY_ENGINE = 'tesouro-siconfi-economy-v1';
export const ECONOMY_WORKFLOW_VERSION = '1.0.0';
export const DEFAULT_ECONOMY_REFERENCE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025] as const;

export interface RunEconomyCollectionInput {
  codigoIbge: string;
  referenceYears?: number[];
  forceRefresh?: boolean;
  requestId?: string | null;
}

export interface EconomyCollectionResult {
  engine: typeof ECONOMY_ENGINE;
  status: 'completed';
  codigoIbge: string;
  requestId: string;
  inserted: number;
  updated: number;
  unchanged: number;
  recordsPersisted: number;
  evidencePersisted: number;
  coverage: { dataset: typeof SICONFI_DCA_DATASET; referenceYears: number[]; rawRecords: number; normalizedRecords: number; pages: number; httpStatusCodes: number[] };
  lastUpdated: string;
  timings: Record<string, number>;
}

export type EconomyIndicatorAction = 'insert' | 'update' | 'unchanged';

export function decideEconomyIndicatorAction(existing: Record<string, unknown> | undefined, indicator: EconomyIndicator, forceRefresh: boolean): EconomyIndicatorAction {
  if (!existing) return 'insert';
  const metadata = (existing.metadata ?? {}) as Record<string, unknown>;
  if (forceRefresh || Number(existing.valor) !== indicator.valor || metadata.source_record_id !== indicator.sourceRecordId) return 'update';
  return 'unchanged';
}

async function persistIndicators(client: AdminClient, territoryId: string, indicators: EconomyIndicator[], collectedAt: string, forceRefresh: boolean) {
  const { data, error } = await client.from('territory_indicators')
    .select('id,indicador,periodo_inicio,periodo_fim,valor,source_record_id,metadata')
    .eq('territory_id', territoryId).eq('categoria', 'economia').eq('fonte', 'SICONFI').eq('source_dataset', SICONFI_DCA_DATASET);
  if (error) throw new Error(error.message);
  const existing = new Map((data ?? []).map((row: Record<string, unknown>) => [`${row.indicador}|${row.periodo_inicio}|${row.periodo_fim}`, row]));
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  for (const indicator of indicators) {
    const row = existing.get(economyIndicatorNaturalKey(indicator)) as Record<string, unknown> | undefined;
    const definition = 'Valor anual bruto publicado no DCA/SICONFI, preservando a conta, coluna e exercício da fonte; não é indicador político nem valor corrigido por inflação.';
    const payload = {
      valor: indicator.valor,
      unidade: indicator.unidade,
      source_record_id: indicator.sourceRecordId,
      source_updated_at: indicator.sourceUpdatedAt,
      metodologia: definition,
      metadata: { ...indicator.metadata, source_record_id: indicator.sourceRecordId, collected_at: collectedAt, definition },
      collected_at: collectedAt,
      updated_at: collectedAt,
    };
    const action = decideEconomyIndicatorAction(row, indicator, forceRefresh);
    if (action === 'update') {
      const result = await client.from('territory_indicators').update(payload).eq('id', row!.id);
      if (result.error) throw new Error(result.error.message);
      updated++;
    } else if (action === 'unchanged') {
      unchanged++;
    } else {
      const result = await client.from('territory_indicators').insert({
        territory_id: territoryId,
        categoria: 'economia',
        indicador: indicator.indicador,
        granularidade: 'municipal',
        fonte: 'SICONFI',
        source_dataset: SICONFI_DCA_DATASET,
        periodo_inicio: indicator.periodoInicio,
        periodo_fim: indicator.periodoFim,
        ...payload,
      });
      if (result.error) throw new Error(result.error.message);
      inserted++;
    }
  }
  return { inserted, updated, unchanged };
}

export async function runEconomyCollection(client: AdminClient, input: RunEconomyCollectionInput, fetcher: typeof fetch = fetch): Promise<EconomyCollectionResult> {
  const totalStart = performance.now();
  const requestId = input.requestId ?? randomUUID();
  if (!/^\d{7}$/.test(input.codigoIbge)) throw new Error('INVALID_CODIGO_IBGE');
  const referenceYears = [...new Set(input.referenceYears ?? [...DEFAULT_ECONOMY_REFERENCE_YEARS])].sort((a, b) => a - b);
  if (referenceYears.length === 0) throw new Error('REFERENCE_YEARS_REQUIRED');
  const territoryResult = await client.from('territories').select('id,codigo_ibge,municipio,uf').eq('codigo_ibge', input.codigoIbge).maybeSingle();
  if (territoryResult.error) throw new Error(territoryResult.error.message);
  if (!territoryResult.data) throw new Error('TERRITORY_NOT_FOUND');
  const territoryId = String(territoryResult.data.id);
  const collectedAt = new Date().toISOString();
  const runResult = await client.from('territory_collection_runs').insert({
    territory_id: territoryId,
    request_id: requestId,
    source: 'siconfi',
    status: 'running',
    workflow_name: ECONOMY_ENGINE,
    workflow_version: ECONOMY_WORKFLOW_VERSION,
    started_at: collectedAt,
    metadata: { codigo_ibge: input.codigoIbge, reference_years: referenceYears, force_refresh: Boolean(input.forceRefresh), isolated_engine: true },
  }).select('id').single();
  if (runResult.error) throw new Error(runResult.error.message);
  const runId = runResult.data.id;
  try {
    const fetchStart = performance.now();
    const fetched = await fetchSiconfiDcaHistory(input.codigoIbge, referenceYears, fetcher);
    const fetchMs = performance.now() - fetchStart;
    const normalizeStart = performance.now();
    const normalizedYears = fetched.map((year) => normalizeSiconfiDcaYear(input.codigoIbge, year.referenceYear, year.rows));
    const indicators = normalizedYears.flatMap((year) => year.indicators);
    const normalizeMs = performance.now() - normalizeStart;
    const persistStart = performance.now();
    const persisted = await persistIndicators(client, territoryId, indicators, collectedAt, Boolean(input.forceRefresh));
    let evidencePersisted = 0;
    for (let index = 0; index < normalizedYears.length; index++) {
      const year = normalizedYears[index];
      const raw = fetched[index];
      const evidence = await client.from('territory_evidence').upsert({
        territory_id: territoryId,
        source_type: 'official_data',
        source_name: 'Tesouro/SICONFI',
        source_url: `https://apidatalake.tesouro.gov.br/ords/cdwhprd/siconfi/tt/dca?an_exercicio=${year.referenceYear}&id_ente=${input.codigoIbge}`,
        source_external_id: `${SICONFI_DCA_DATASET}:${input.codigoIbge}:${year.referenceYear}`,
        source_hash: year.sourceHash,
        published_at: `${year.referenceYear}-12-31`,
        collected_at: collectedAt,
        tema: 'economia',
        subtema: 'financas_publicas_municipais',
        title: `DCA/SICONFI ${year.referenceYear} de ${territoryResult.data.municipio}`,
        summary: `${raw.rawRecords} registros oficiais consultados e ${year.indicators.length} indicadores fiscais brutos selecionados.`,
        raw_reference: { codigo_ibge: input.codigoIbge, reference_year: year.referenceYear, raw_records: raw.rawRecords, pages: raw.pages, http_status_codes: raw.statusCodes },
        confidence: 1,
        metadata: { source_mode: 'REAL', dataset: SICONFI_DCA_DATASET, reference_year: year.referenceYear, normalized_records: year.indicators.length },
      }, { onConflict: 'territory_id,source_hash', ignoreDuplicates: true }).select('id');
      if (evidence.error) throw new Error(evidence.error.message);
      evidencePersisted += evidence.data?.length ?? 0;
    }
    const persistMs = performance.now() - persistStart;
    const coverage = {
      dataset: SICONFI_DCA_DATASET as typeof SICONFI_DCA_DATASET,
      referenceYears,
      rawRecords: fetched.reduce((sum, year) => sum + year.rawRecords, 0),
      normalizedRecords: indicators.length,
      pages: fetched.reduce((sum, year) => sum + year.pages, 0),
      httpStatusCodes: fetched.flatMap((year) => year.statusCodes),
    };
    const timings = { fetchMs, normalizeMs, persistMs, totalMs: performance.now() - totalStart };
    const finish = await client.from('territory_collection_runs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      items_collected: coverage.rawRecords,
      items_processed: indicators.length,
      items_discarded: coverage.rawRecords - indicators.length,
      metadata: { codigo_ibge: input.codigoIbge, force_refresh: Boolean(input.forceRefresh), coverage, reconciliation: persisted, evidence_persisted: evidencePersisted, timings },
    }).eq('id', runId);
    if (finish.error) throw new Error(finish.error.message);
    return { engine: ECONOMY_ENGINE, status: 'completed', codigoIbge: input.codigoIbge, requestId, ...persisted, recordsPersisted: indicators.length, evidencePersisted, coverage, lastUpdated: collectedAt, timings };
  } catch (error) {
    await client.from('territory_collection_runs').update({ status: 'failed', finished_at: new Date().toISOString(), error_message: error instanceof Error ? error.message : String(error) }).eq('id', runId);
    throw error;
  }
}
