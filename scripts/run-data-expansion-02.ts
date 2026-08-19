import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { fetchDemographyPayloads, normalizeDemographyPayloads, type DemographyIndicator } from '../lib/territorios/demografia-expansion';
import { runHealthCollection } from '../lib/territorios/saude-collector';

const PILOTS = ['3106200', '3106705', '3118601'];
const APPLY = process.argv.includes('--apply');
const REFRESH_HEALTH = process.argv.includes('--refresh-health');

function loadEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function naturalKey(item: DemographyIndicator) {
  return `${item.indicator}|${item.sourceDataset}|${item.periodStart}|${item.periodEnd}`;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const collectedAt = new Date().toISOString();
  const fetched = await fetchDemographyPayloads(PILOTS);
  const normalized = normalizeDemographyPayloads(fetched.estimatePayload, fetched.censusPayload, collectedAt);
  const territoriesResult = await client.from('territories').select('id,codigo_ibge,municipio').in('codigo_ibge', PILOTS);
  if (territoriesResult.error) throw new Error(territoriesResult.error.message);
  const territories = new Map((territoriesResult.data ?? []).map((row) => [String(row.codigo_ibge), row]));
  const summary: Record<string, unknown> = { mode: APPLY ? 'APPLY' : 'DRY_RUN', collectedAt, demography: {}, health: [] };

  for (const codigoIbge of PILOTS) {
    const territory = territories.get(codigoIbge);
    if (!territory) throw new Error(`TERRITORY_NOT_FOUND:${codigoIbge}`);
    const candidates = normalized.indicators.filter((item) => item.codigoIbge === codigoIbge);
    const existingResult = await client.from('territory_indicators')
      .select('id,indicador,source_dataset,periodo_inicio,periodo_fim,valor,source_record_id,metadata')
      .eq('territory_id', territory.id).eq('categoria', 'demografia').in('source_dataset', ['SIDRA_6579', 'SIDRA_9514']);
    if (existingResult.error) throw new Error(existingResult.error.message);
    const existing = new Map((existingResult.data ?? []).map((row) => [`${row.indicador}|${row.source_dataset}|${row.periodo_inicio}|${row.periodo_fim}`, row]));
    const inserts: Record<string, unknown>[] = []; const updates: Array<{ id: string; payload: Record<string, unknown> }> = []; let unchanged = 0;
    for (const item of candidates) {
      const row = existing.get(naturalKey(item));
      const payload = { valor: item.value, unidade: item.unit, source_record_id: item.sourceRecordId, source_updated_at: collectedAt, metodologia: item.methodology, metadata: item.metadata, collected_at: collectedAt, updated_at: collectedAt };
      if (!row) inserts.push({ territory_id: territory.id, categoria: 'demografia', indicador: item.indicator, granularidade: 'municipal', fonte: 'IBGE', source_dataset: item.sourceDataset, periodo_inicio: item.periodStart, periodo_fim: item.periodEnd, ...payload });
      else if (Number(row.valor) !== item.value || row.source_record_id !== item.sourceRecordId || Object.keys((row.metadata ?? {}) as object).length === 0) updates.push({ id: String(row.id), payload });
      else unchanged++;
    }
    const evidenceRows = normalized.evidence.filter((item) => item.codigoIbge === codigoIbge).map((item) => ({
      territory_id: territory.id, source_type: 'official_data', source_name: 'IBGE/SIDRA', source_url: item.sourceUrl,
      source_external_id: `${item.dataset}:${codigoIbge}:${item.period}`, source_hash: item.sourceHash,
      published_at: `${item.period}-12-31`, collected_at: collectedAt, tema: 'demografia', subtema: item.dataset === 'SIDRA_9514' ? 'estrutura_populacional' : 'estimativa_populacional',
      title: `${item.dataset} — ${territory.municipio}`, summary: `${candidates.filter((candidate) => candidate.sourceDataset === item.dataset).length} indicadores oficiais/derivados auditáveis.`,
      raw_reference: item.rawReference, confidence: 1, metadata: { source_mode: 'REAL', dataset: item.dataset, codigo_ibge: codigoIbge, reference_period: item.period, collected_at: collectedAt },
    }));
    if (APPLY) {
      for (let i = 0; i < inserts.length; i += 200) { const result = await client.from('territory_indicators').insert(inserts.slice(i, i + 200)); if (result.error) throw new Error(result.error.message); }
      for (const update of updates) { const result = await client.from('territory_indicators').update(update.payload).eq('id', update.id); if (result.error) throw new Error(result.error.message); }
      const evidence = await client.from('territory_evidence').upsert(evidenceRows, { onConflict: 'territory_id,source_hash', ignoreDuplicates: true }).select('id');
      if (evidence.error) throw new Error(evidence.error.message);
      const run = await client.from('territory_collection_runs').insert({ territory_id: territory.id, request_id: randomUUID(), source: 'ibge', status: 'completed', workflow_name: 'politix-territorios-demography-expansion-v2', workflow_version: '2.0.0', started_at: collectedAt, finished_at: new Date().toISOString(), items_collected: candidates.length, items_processed: inserts.length + updates.length, items_discarded: 0, metadata: { codigo_ibge: codigoIbge, reconciliation: { inserted: inserts.length, updated: updates.length, unchanged }, evidence_rows: evidenceRows.length, on_demand: true } });
      if (run.error) throw new Error(run.error.message);
    }
    (summary.demography as Record<string, unknown>)[codigoIbge] = { indicators: candidates.length, inserted: inserts.length, updated: updates.length, unchanged, evidence: evidenceRows.length };
  }

  if (APPLY) {
    for (const codigoIbge of PILOTS) (summary.health as unknown[]).push(await runHealthCollection(client as never, { codigoIbge, referenceDate: collectedAt.slice(0, 10), forceRefresh: REFRESH_HEALTH }));
  } else summary.health = 'DRY_RUN: CNES não consultado nem alterado';
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
