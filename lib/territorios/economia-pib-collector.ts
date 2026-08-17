import { createHash, randomUUID } from 'node:crypto';
import { fetchOfficialPibPerCapita, fetchPibMunicipalSidra, PIB_BASE_DATASET, PIB_SIDRA_DATASET } from './economia-pib-client';
import { normalizePibMunicipal, pibIndicatorNaturalKey, type PibIndicator } from './economia-pib-normalizer';

type AdminClient = ReturnType<typeof import('@/lib/supabaseClient').createAdminClient>;

export const PIB_ECONOMY_ENGINE = 'ibge-pib-municipal-v1';
export const PIB_ECONOMY_WORKFLOW_VERSION = '1.0.0';

export interface RunPibMunicipalCollectionInput {
  codigoIbge: string;
  forceRefresh?: boolean;
  requestId?: string | null;
}

export type PibIndicatorAction = 'insert' | 'update' | 'unchanged';

export interface PibMunicipalCollectionResult {
  engine: typeof PIB_ECONOMY_ENGINE;
  status: 'completed' | 'partial';
  codigoIbge: string;
  requestId: string;
  inserted: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  recordsPersisted: number;
  evidencePersisted: number;
  coverage: {
    datasets: string[];
    referenceYears: number[];
    normalizedRecords: number;
    unavailableRecords: number;
    perCapitaAvailable: boolean;
  };
  warnings: string[];
  lastUpdated: string;
  timings: Record<string, number>;
}

export function decidePibIndicatorAction(existing: Record<string, unknown> | undefined, indicator: PibIndicator, forceRefresh: boolean): PibIndicatorAction {
  if (!existing) return 'insert';
  if (forceRefresh || Number(existing.valor) !== indicator.value || existing.source_record_id !== indicator.sourceRecordId) return 'update';
  return 'unchanged';
}

async function persistPibIndicators(client: AdminClient, territoryId: string, indicators: PibIndicator[], collectedAt: string, forceRefresh: boolean) {
  const { data, error } = await client.from('territory_indicators')
    .select('id,indicador,source_dataset,periodo_inicio,periodo_fim,valor,source_record_id,metadata')
    .eq('territory_id', territoryId).eq('categoria', 'economia').eq('fonte', 'IBGE')
    .in('source_dataset', [PIB_SIDRA_DATASET, PIB_BASE_DATASET]);
  if (error) throw new Error(error.message);
  const existing = new Map((data ?? []).map((row: Record<string, unknown>) => [
    `${row.indicador}|${row.source_dataset}|${row.periodo_inicio}|${row.periodo_fim}`, row,
  ]));
  const inserts: Record<string, unknown>[] = [];
  const updates: Array<{ id: unknown; payload: Record<string, unknown> }> = [];
  let unchanged = 0;
  for (const indicator of indicators) {
    const row = existing.get(pibIndicatorNaturalKey(indicator)) as Record<string, unknown> | undefined;
    const definition = 'Indicador oficial direto do PIB dos Municípios/IBGE, anual e a preços correntes; não representa crescimento real nem interpretação política.';
    const payload = {
      valor: indicator.value,
      unidade: indicator.unit,
      source_record_id: indicator.sourceRecordId,
      source_updated_at: indicator.sourceUpdatedAt,
      metodologia: definition,
      metadata: { ...indicator.metadata, source_record_id: indicator.sourceRecordId, collected_at: collectedAt, definition },
      collected_at: collectedAt,
      updated_at: collectedAt,
    };
    const action = decidePibIndicatorAction(row, indicator, forceRefresh);
    if (action === 'update') {
      updates.push({ id: row!.id, payload });
    } else if (action === 'unchanged') {
      unchanged++;
    } else {
      inserts.push({
        territory_id: territoryId,
        categoria: 'economia',
        indicador: indicator.indicator,
        granularidade: 'municipal',
        fonte: 'IBGE',
        source_dataset: indicator.sourceDataset,
        periodo_inicio: indicator.periodStart,
        periodo_fim: indicator.periodEnd,
        ...payload,
      });
    }
  }
  for (let offset = 0; offset < inserts.length; offset += 200) {
    const result = await client.from('territory_indicators').insert(inserts.slice(offset, offset + 200));
    if (result.error) throw new Error(result.error.message);
  }
  for (let offset = 0; offset < updates.length; offset += 20) {
    const results = await Promise.all(updates.slice(offset, offset + 20).map(({ id, payload }) =>
      client.from('territory_indicators').update(payload).eq('id', id),
    ));
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new Error(failed.error.message);
  }
  return { inserted: inserts.length, updated: updates.length, unchanged };
}

function evidenceHash(dataset: string, codigoIbge: string, year: number, indicators: PibIndicator[], unavailable: unknown[]): string {
  return createHash('sha256').update(JSON.stringify({ dataset, codigoIbge, year, indicators: indicators.map((item) => [item.sourceRecordId, item.value, item.unit]), unavailable })).digest('hex');
}

async function persistEvidence(client: AdminClient, territoryId: string, municipio: string, codigoIbge: string, collectedAt: string, normalized: ReturnType<typeof normalizePibMunicipal>) {
  const evidenceRows: Record<string, unknown>[] = [];
  for (let year = 2002; year <= 2023; year++) {
    const sidraIndicators = normalized.sidraByYear.get(year) ?? [];
    const unavailable = normalized.unavailable.filter((item) => item.year === year);
    const sidraHash = evidenceHash(PIB_SIDRA_DATASET, codigoIbge, year, sidraIndicators, unavailable);
    const sidraSourceUrl = String(sidraIndicators[0]?.metadata.source_url ?? 'https://servicodados.ibge.gov.br/api/v3/agregados/5938');
    evidenceRows.push({
      territory_id: territoryId, source_type: 'official_data', source_name: 'IBGE/SIDRA', source_url: sidraSourceUrl,
      source_external_id: `${PIB_SIDRA_DATASET}:${codigoIbge}:${year}`, source_hash: sidraHash,
      published_at: `${year}-12-31`, collected_at: collectedAt, tema: 'economia', subtema: 'pib_municipal',
      title: `PIB dos Municípios/SIDRA ${year} de ${municipio}`,
      summary: `${sidraIndicators.length} indicadores oficiais diretos a preços correntes; ${unavailable.length} valores oficialmente indisponíveis.`,
      raw_reference: { codigo_ibge: codigoIbge, reference_year: year, table_id: 5938, records: sidraIndicators.map((item) => ({ source_record_id: item.sourceRecordId, raw_value: item.metadata.raw_value, raw_unit: item.metadata.raw_unit, normalization_factor: item.metadata.normalization_factor })), unavailable },
      confidence: 1, metadata: { source_mode: 'REAL', dataset: PIB_SIDRA_DATASET, reference_year: year, normalized_records: sidraIndicators.length, unavailable_records: unavailable.length, price_basis: 'current_prices' },
    });

    const baseIndicators = normalized.baseByYear.get(year) ?? [];
    if (baseIndicators.length > 0) {
      const baseHash = evidenceHash(PIB_BASE_DATASET, codigoIbge, year, baseIndicators, []);
      evidenceRows.push({
        territory_id: territoryId, source_type: 'official_data', source_name: 'IBGE/PIB dos Municípios', source_url: baseIndicators[0].metadata.source_url,
        source_external_id: `${PIB_BASE_DATASET}:${codigoIbge}:${year}`, source_hash: baseHash,
        published_at: `${year}-12-31`, collected_at: collectedAt, tema: 'economia', subtema: 'pib_per_capita',
        title: `PIB per capita oficial ${year} de ${municipio}`,
        summary: 'PIB per capita oficial a preços correntes, sem recálculo por população externa.',
        raw_reference: { codigo_ibge: codigoIbge, reference_year: year, source_file: baseIndicators[0].metadata.source_file, source_record_id: baseIndicators[0].sourceRecordId, raw_value: baseIndicators[0].metadata.raw_value, raw_unit: baseIndicators[0].metadata.raw_unit, raw_line_hash: baseIndicators[0].metadata.raw_line_hash },
        confidence: 1, metadata: { source_mode: 'REAL', dataset: PIB_BASE_DATASET, reference_year: year, normalized_records: 1, price_basis: 'current_prices' },
      });
    }
  }
  const result = await client.from('territory_evidence')
    .upsert(evidenceRows, { onConflict: 'territory_id,source_hash', ignoreDuplicates: true })
    .select('id');
  if (result.error) throw new Error(result.error.message);
  return result.data?.length ?? 0;
}

export async function runPibMunicipalCollection(client: AdminClient, input: RunPibMunicipalCollectionInput, fetcher: typeof fetch = fetch): Promise<PibMunicipalCollectionResult> {
  const totalStart = performance.now();
  const requestId = input.requestId ?? randomUUID();
  if (!/^\d{7}$/.test(input.codigoIbge)) throw new Error('INVALID_CODIGO_IBGE');
  const territoryResult = await client.from('territories').select('id,codigo_ibge,municipio,uf').eq('codigo_ibge', input.codigoIbge).maybeSingle();
  if (territoryResult.error) throw new Error(territoryResult.error.message);
  if (!territoryResult.data) throw new Error('TERRITORY_NOT_FOUND');
  const territoryId = String(territoryResult.data.id);
  const collectedAt = new Date().toISOString();
  const runResult = await client.from('territory_collection_runs').insert({
    territory_id: territoryId, request_id: requestId, source: 'ibge', status: 'running',
    workflow_name: PIB_ECONOMY_ENGINE, workflow_version: PIB_ECONOMY_WORKFLOW_VERSION, started_at: collectedAt,
    metadata: { codigo_ibge: input.codigoIbge, force_refresh: Boolean(input.forceRefresh), isolated_engine: true, on_demand: true },
  }).select('id').single();
  if (runResult.error) throw new Error(runResult.error.message);
  const runId = runResult.data.id;
  try {
    const fetchStart = performance.now();
    const [sidra, perCapita] = await Promise.allSettled([
      fetchPibMunicipalSidra(input.codigoIbge, fetcher),
      fetchOfficialPibPerCapita(input.codigoIbge, fetcher),
    ]);
    if (sidra.status === 'rejected') throw sidra.reason;
    const warnings: string[] = [];
    const perCapitaRows = perCapita.status === 'fulfilled' ? perCapita.value : [];
    if (perCapita.status === 'rejected') warnings.push(`PIB_PER_CAPITA_UNAVAILABLE:${perCapita.reason instanceof Error ? perCapita.reason.message : String(perCapita.reason)}`);
    const fetchMs = performance.now() - fetchStart;
    const normalizeStart = performance.now();
    const normalized = normalizePibMunicipal(input.codigoIbge, sidra.value.payload, perCapitaRows, sidra.value.sourceUrl);
    const normalizeMs = performance.now() - normalizeStart;
    const persistStart = performance.now();
    const reconciliation = await persistPibIndicators(client, territoryId, normalized.indicators, collectedAt, Boolean(input.forceRefresh));
    const evidencePersisted = await persistEvidence(client, territoryId, String(territoryResult.data.municipio), input.codigoIbge, collectedAt, normalized);
    const persistMs = performance.now() - persistStart;
    const status = warnings.length > 0 ? 'partial' as const : 'completed' as const;
    const coverage = { datasets: perCapitaRows.length > 0 ? [PIB_SIDRA_DATASET, PIB_BASE_DATASET] : [PIB_SIDRA_DATASET], referenceYears: Array.from({ length: 22 }, (_, index) => 2002 + index), normalizedRecords: normalized.indicators.length, unavailableRecords: normalized.unavailable.length, perCapitaAvailable: perCapitaRows.length > 0 };
    const timings = { fetchMs, normalizeMs, persistMs, totalMs: performance.now() - totalStart };
    const finish = await client.from('territory_collection_runs').update({
      status, finished_at: new Date().toISOString(), items_collected: 242 + perCapitaRows.length,
      items_processed: normalized.indicators.length, items_discarded: normalized.unavailable.length,
      error_message: warnings.length > 0 ? warnings.join(' | ') : null,
      metadata: { codigo_ibge: input.codigoIbge, force_refresh: Boolean(input.forceRefresh), coverage, reconciliation, evidence_persisted: evidencePersisted, warnings, source_hash: normalized.sourceHash, timings },
    }).eq('id', runId);
    if (finish.error) throw new Error(finish.error.message);
    return { engine: PIB_ECONOMY_ENGINE, status, codigoIbge: input.codigoIbge, requestId, ...reconciliation, skipped: normalized.unavailable.length, failed: warnings.length, recordsPersisted: normalized.indicators.length, evidencePersisted, coverage, warnings, lastUpdated: collectedAt, timings };
  } catch (error) {
    await client.from('territory_collection_runs').update({ status: 'failed', finished_at: new Date().toISOString(), error_message: error instanceof Error ? error.message : String(error) }).eq('id', runId);
    throw error;
  }
}
