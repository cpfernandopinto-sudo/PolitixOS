import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { DEFAULT_ECONOMY_REFERENCE_YEARS, ECONOMY_ENGINE, runEconomyCollection } from '../lib/territorios/economia-collector';
import { SICONFI_DCA_DATASET } from '../lib/territorios/economia-siconfi-normalizer';

const CODIGO_IBGE = '3118601';

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function snapshot(client: ReturnType<typeof createAdminClient>, territoryId: string) {
  const [indicators, evidence, runs, population] = await Promise.all([
    client.from('territory_indicators').select('id,indicador,valor,unidade,periodo_inicio,periodo_fim,source_record_id,metadata').eq('territory_id', territoryId).eq('categoria', 'economia').eq('fonte', 'SICONFI').eq('source_dataset', SICONFI_DCA_DATASET).order('periodo_inicio'),
    client.from('territory_evidence').select('id,source_hash,source_external_id,published_at,raw_reference').eq('territory_id', territoryId).eq('tema', 'economia').eq('source_name', 'Tesouro/SICONFI'),
    client.from('territory_collection_runs').select('id,status,items_collected,items_processed,items_discarded,error_message,metadata,created_at').eq('territory_id', territoryId).eq('source', 'siconfi').eq('workflow_name', ECONOMY_ENGINE).order('created_at', { ascending: false }).limit(10),
    client.from('territory_indicators').select('indicador,valor,unidade,periodo_inicio,periodo_fim,source_dataset').eq('territory_id', territoryId).eq('categoria', 'demografia').eq('indicador', 'populacao_total').order('periodo_inicio', { ascending: false }).limit(10),
  ]);
  for (const result of [indicators, evidence, runs, population]) if (result.error) throw new Error(result.error.message);
  return { indicators: indicators.data ?? [], evidence: evidence.data ?? [], runs: runs.data ?? [], population: population.data ?? [] };
}

function duplicateCount(rows: Array<Record<string, unknown>>, fields: string[]): number {
  const keys = rows.map((row) => fields.map((field) => String(row[field] ?? '')).join('|'));
  return keys.length - new Set(keys).size;
}

export async function executeEconomyAudit() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado em .env.local.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const territory = await client.from('territories').select('id,codigo_ibge,municipio,uf').eq('codigo_ibge', CODIGO_IBGE).single();
  if (territory.error) throw new Error(territory.error.message);
  const territoryId = String(territory.data.id);
  const before = await snapshot(client, territoryId);
  const run1 = await runEconomyCollection(client, { codigoIbge: CODIGO_IBGE, referenceYears: [...DEFAULT_ECONOMY_REFERENCE_YEARS] });
  const afterRun1 = await snapshot(client, territoryId);
  const run2 = await runEconomyCollection(client, { codigoIbge: CODIGO_IBGE, referenceYears: [...DEFAULT_ECONOMY_REFERENCE_YEARS] });
  const afterRun2 = await snapshot(client, territoryId);
  const result = {
    territory: territory.data,
    referenceYears: DEFAULT_ECONOMY_REFERENCE_YEARS,
    before: { indicators: before.indicators.length, evidence: before.evidence.length, runs: before.runs.length },
    run1,
    afterRun1: { indicators: afterRun1.indicators.length, evidence: afterRun1.evidence.length },
    run2,
    afterRun2: { indicators: afterRun2.indicators.length, evidence: afterRun2.evidence.length },
    audit: {
      indicatorNaturalKeyDuplicates: duplicateCount(afterRun2.indicators as Array<Record<string, unknown>>, ['indicador', 'periodo_inicio', 'periodo_fim']),
      evidenceHashDuplicates: duplicateCount(afterRun2.evidence as Array<Record<string, unknown>>, ['source_hash']),
      secondRunAddedIndicators: afterRun2.indicators.length - afterRun1.indicators.length,
      secondRunAddedEvidence: afterRun2.evidence.length - afterRun1.evidence.length,
    },
    periods: [...new Set(afterRun2.indicators.map((row) => String(row.periodo_inicio).slice(0, 4)))],
    sample2025: afterRun2.indicators.filter((row) => String(row.periodo_inicio).startsWith('2025')).map((row) => ({ indicador: row.indicador, valor: row.valor, unidade: row.unidade })),
    populationJoinReady: afterRun2.population,
    evidence: afterRun2.evidence,
    recentRuns: afterRun2.runs.slice(0, 2),
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.endsWith('audit-economia-siconfi-contagem.ts')) executeEconomyAudit().catch((error) => { console.error(error); process.exitCode = 1; });
