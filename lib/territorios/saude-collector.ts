import { randomUUID } from 'node:crypto';
import { fetchCnesEstablishments } from './saude-cnes-client';
import { normalizeCnesSnapshot, normalizeReferenceDate, type HealthIndicator } from './saude-cnes-normalizer';

type AdminClient = ReturnType<typeof import('@/lib/supabaseClient').createAdminClient>;
export const HEALTH_ENGINE = 'datasus-cnes-health-v1';
export const HEALTH_WORKFLOW_VERSION = '1.0.0';
export const HEALTH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface RunHealthCollectionInput { codigoIbge: string; referenceDate?: string; forceRefresh?: boolean; requestId?: string | null; }
export interface HealthCollectionResult { engine: typeof HEALTH_ENGINE; status: 'completed' | 'failed' | 'not_available'; codigoIbge: string; requestId: string; updated: number; inserted: number; unchanged: number; recordsPersisted: number; evidencePersisted: number; coverage: { dataset: 'CNES_ESTABELECIMENTOS'; referenceDate: string; rawRecords: number; pages: number }; lastUpdated: string; cacheHit: boolean; error: string | null; timings: Record<string, number>; }

export type HealthIndicatorAction = 'insert' | 'update' | 'unchanged';

export function healthIndicatorNaturalKey(indicator: Pick<HealthIndicator, 'indicador' | 'periodoInicio' | 'periodoFim'>): string {
  return `${indicator.indicador}|${indicator.periodoInicio}|${indicator.periodoFim}`;
}

export function decideHealthIndicatorAction(existing: Record<string, unknown> | undefined, indicator: HealthIndicator, forceRefresh: boolean): HealthIndicatorAction {
  if (!existing) return 'insert';
  const storedHash = (existing.metadata as Record<string, unknown> | null)?.source_hash;
  if (forceRefresh || Number(existing.valor) !== indicator.valor || storedHash !== indicator.metadata.source_hash) return 'update';
  return 'unchanged';
}

export function isHealthCacheFresh(lastUpdated: string | null | undefined, nowMs = Date.now(), ttlMs = HEALTH_CACHE_TTL_MS): boolean {
  if (!lastUpdated) return false;
  const collectedAt = Date.parse(lastUpdated);
  return Number.isFinite(collectedAt) && collectedAt <= nowMs && nowMs - collectedAt < ttlMs;
}

async function readHealthCache(client: AdminClient, territoryId: string, nowMs: number) {
  const threshold = new Date(nowMs - HEALTH_CACHE_TTL_MS).toISOString();
  const result = await client.from('territory_collection_runs')
    .select('finished_at,metadata,items_collected,items_processed')
    .eq('territory_id', territoryId)
    .eq('source', 'datasus')
    .eq('workflow_name', HEALTH_ENGINE)
    .eq('status', 'completed')
    .gte('finished_at', threshold)
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  const row = result.data as Record<string, unknown> | null;
  const finishedAt = typeof row?.finished_at === 'string' ? row.finished_at : null;
  if (!row || !isHealthCacheFresh(finishedAt, nowMs)) return null;
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const coverage = (metadata.coverage ?? {}) as Record<string, unknown>;
  const referenceDate = typeof metadata.reference_date === 'string' ? metadata.reference_date : null;
  const rawRecords = Number(row.items_collected);
  const pages = Number(coverage.pages);
  const processed = Number(row.items_processed);
  if (!referenceDate || !Number.isFinite(rawRecords) || !Number.isFinite(pages) || !Number.isFinite(processed) || processed <= 0) return null;
  return { lastUpdated: finishedAt!, referenceDate, rawRecords, pages, processed };
}

async function persistIndicators(client: AdminClient, territoryId: string, indicators: HealthIndicator[], collectedAt: string, forceRefresh: boolean) {
  const { data, error } = await client.from('territory_indicators').select('id,indicador,periodo_inicio,periodo_fim,valor,metadata').eq('territory_id', territoryId).eq('categoria', 'saude').eq('fonte', 'DATASUS').eq('source_dataset', 'CNES_ESTABELECIMENTOS');
  if (error) throw new Error(error.message);
  const existing = new Map((data ?? []).map((row: Record<string, unknown>) => [`${row.indicador}|${row.periodo_inicio}|${row.periodo_fim}`, row]));
  let inserted = 0, updated = 0, unchanged = 0;
  for (const item of indicators) {
    const key = healthIndicatorNaturalKey(item);
    const row = existing.get(key) as Record<string, unknown> | undefined;
    const methodology = item.indicador === 'estabelecimentos_atendimento_ambulatorial_sus'
      ? 'Quantidade de estabelecimentos ativos do CNES com indicação de atendimento ambulatorial SUS.'
      : 'Contagem municipal de estabelecimentos ativos e capacidades cadastradas no CNES, agregada por snapshot controlado do PolitixOS.';
    const payload = { valor: item.valor, unidade: item.unidade, source_record_id: item.sourceRecordId, source_updated_at: item.sourceUpdatedAt, metodologia: methodology, metadata: { ...item.metadata, definition: methodology }, collected_at: collectedAt, updated_at: collectedAt };
    const action = decideHealthIndicatorAction(row, item, forceRefresh);
    if (action === 'update') { const result = await client.from('territory_indicators').update(payload).eq('id', row!.id); if (result.error) throw new Error(result.error.message); updated++; }
    else if (action === 'unchanged') unchanged++;
    else { const result = await client.from('territory_indicators').insert({ territory_id: territoryId, categoria: 'saude', indicador: item.indicador, granularidade: 'municipal', fonte: 'DATASUS', source_dataset: 'CNES_ESTABELECIMENTOS', periodo_inicio: item.periodoInicio, periodo_fim: item.periodoFim, ...payload }); if (result.error) throw new Error(result.error.message); inserted++; }
  }
  return { inserted, updated, unchanged };
}

export async function runHealthCollection(client: AdminClient, input: RunHealthCollectionInput, fetcher: typeof fetch = fetch): Promise<HealthCollectionResult> {
  const totalStart = performance.now(); const requestId = input.requestId ?? randomUUID();
  if (!/^\d{7}$/.test(input.codigoIbge)) throw new Error('INVALID_CODIGO_IBGE');
  const referenceDate = normalizeReferenceDate(input.referenceDate ?? new Date().toISOString().slice(0, 10));
  const territoryResult = await client.from('territories').select('id,codigo_ibge,municipio,uf').eq('codigo_ibge', input.codigoIbge).maybeSingle();
  if (territoryResult.error) throw new Error(territoryResult.error.message); if (!territoryResult.data) throw new Error('TERRITORY_NOT_FOUND');
  const territoryId = String(territoryResult.data.id); const nowMs = Date.now(); const collectedAt = new Date(nowMs).toISOString();
  if (!input.forceRefresh) {
    const cached = await readHealthCache(client, territoryId, nowMs);
    if (cached) return { engine: HEALTH_ENGINE, status: 'completed', codigoIbge: input.codigoIbge, requestId, updated: 0, inserted: 0, unchanged: cached.processed, recordsPersisted: 0, evidencePersisted: 0, coverage: { dataset: 'CNES_ESTABELECIMENTOS', referenceDate: cached.referenceDate, rawRecords: cached.rawRecords, pages: cached.pages }, lastUpdated: cached.lastUpdated, cacheHit: true, error: null, timings: { fetchMs: 0, normalizeMs: 0, persistMs: 0, totalMs: performance.now() - totalStart } };
  }
  const runResult = await client.from('territory_collection_runs').insert({ territory_id: territoryId, request_id: requestId, source: 'datasus', status: 'running', workflow_name: HEALTH_ENGINE, workflow_version: HEALTH_WORKFLOW_VERSION, started_at: collectedAt, metadata: { codigo_ibge: input.codigoIbge, reference_date: referenceDate, force_refresh: Boolean(input.forceRefresh), isolated_engine: true } }).select('id').single();
  if (runResult.error) throw new Error(runResult.error.message); const runId = runResult.data.id;
  try {
    const fetchStart = performance.now(); const fetched = await fetchCnesEstablishments(input.codigoIbge, fetcher); const fetchMs = performance.now() - fetchStart;
    const normalizeStart = performance.now(); const normalized = normalizeCnesSnapshot(input.codigoIbge, fetched.rows, referenceDate); const normalizeMs = performance.now() - normalizeStart;
    const persistStart = performance.now(); const persisted = await persistIndicators(client, territoryId, normalized.indicators, collectedAt, Boolean(input.forceRefresh));
    const evidence = await client.from('territory_evidence').upsert({ territory_id: territoryId, source_type: 'official_data', source_name: 'DATASUS/CNES', source_url: 'https://apidadosabertos.saude.gov.br/cnes/estabelecimentos', source_external_id: `CNES_ESTABELECIMENTOS:${input.codigoIbge}:${normalized.referenceDate}`, source_hash: normalized.sourceHash, published_at: normalized.referenceDate, collected_at: collectedAt, tema: 'saude', subtema: 'estabelecimentos', title: `Snapshot CNES de ${territoryResult.data.municipio}`, summary: `${fetched.rows.length} estabelecimentos ativos agregados.`, raw_reference: { codigo_ibge: input.codigoIbge, reference_date: normalized.referenceDate, source_updated_at_min: normalized.sourceUpdatedAtMin, source_updated_at_max: normalized.sourceUpdatedAtMax, records: fetched.rows.length, pages: fetched.pages }, confidence: 1, metadata: { source_mode: 'REAL', dataset: 'CNES_ESTABELECIMENTOS', snapshot_reference_date: normalized.referenceDate, source_updated_at_min: normalized.sourceUpdatedAtMin, source_updated_at_max: normalized.sourceUpdatedAtMax } }, { onConflict: 'territory_id,source_hash', ignoreDuplicates: true }).select('id');
    if (evidence.error) throw new Error(evidence.error.message); const persistMs = performance.now() - persistStart;
    const timings = { fetchMs, normalizeMs, persistMs, totalMs: performance.now() - totalStart };
    const finish = await client.from('territory_collection_runs').update({ status: 'completed', finished_at: new Date().toISOString(), items_collected: fetched.rows.length, items_processed: normalized.indicators.length, items_discarded: 0, metadata: { codigo_ibge: input.codigoIbge, reference_date: normalized.referenceDate, source_updated_at_min: normalized.sourceUpdatedAtMin, source_updated_at_max: normalized.sourceUpdatedAtMax, force_refresh: Boolean(input.forceRefresh), coverage: { referenceDate: normalized.referenceDate, pages: fetched.pages }, reconciliation: persisted, timings } }).eq('id', runId); if (finish.error) throw new Error(finish.error.message);
    return { engine: HEALTH_ENGINE, status: 'completed', codigoIbge: input.codigoIbge, requestId, updated: persisted.updated, inserted: persisted.inserted, unchanged: persisted.unchanged, recordsPersisted: normalized.indicators.length, evidencePersisted: evidence.data?.length ?? 0, coverage: { dataset: 'CNES_ESTABELECIMENTOS', referenceDate: normalized.referenceDate, rawRecords: fetched.rows.length, pages: fetched.pages }, lastUpdated: collectedAt, cacheHit: false, error: null, timings };
  } catch (error) { await client.from('territory_collection_runs').update({ status: 'failed', finished_at: new Date().toISOString(), error_message: error instanceof Error ? error.message : String(error) }).eq('id', runId); throw error; }
}
