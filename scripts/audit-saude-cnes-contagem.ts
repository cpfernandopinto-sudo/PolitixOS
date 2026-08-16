import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { runHealthCollection } from '../lib/territorios/saude-collector';

const CODIGO_IBGE = '3118601';
const REFERENCE_DATE = process.argv[2] ?? new Date().toISOString().slice(0, 10);

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
    client.from('territory_indicators').select('id,indicador,valor,unidade,periodo_inicio,periodo_fim,source_record_id,source_updated_at,metadata').eq('territory_id', territoryId).eq('categoria', 'saude').eq('fonte', 'DATASUS').eq('source_dataset', 'CNES_ESTABELECIMENTOS'),
    client.from('territory_evidence').select('id,source_hash,source_external_id,published_at,raw_reference').eq('territory_id', territoryId).eq('tema', 'saude').eq('source_name', 'DATASUS/CNES'),
    client.from('territory_collection_runs').select('id,request_id,status,items_collected,items_processed,error_message,metadata,created_at').eq('territory_id', territoryId).eq('source', 'datasus').eq('workflow_name', 'datasus-cnes-health-v1').order('created_at', { ascending: false }).limit(10),
    client.from('territory_indicators').select('indicador,valor,unidade,periodo_inicio').eq('territory_id', territoryId).eq('categoria', 'demografia').eq('indicador', 'populacao_total').order('periodo_inicio', { ascending: false }).limit(1),
  ]);
  for (const result of [indicators, evidence, runs, population]) if (result.error) throw new Error(result.error.message);
  return { indicators: indicators.data ?? [], evidence: evidence.data ?? [], runs: runs.data ?? [], population: population.data ?? [] };
}

function duplicateCount(rows: Array<Record<string, unknown>>, fields: string[]): number {
  const keys = rows.map((row) => fields.map((field) => String(row[field] ?? '')).join('|'));
  return keys.length - new Set(keys).size;
}

export async function executeHealthAudit() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado em .env.local.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const territory = await client.from('territories').select('id,codigo_ibge,municipio,uf').eq('codigo_ibge', CODIGO_IBGE).single();
  if (territory.error) throw new Error(territory.error.message);
  const territoryId = String(territory.data.id);
  const before = await snapshot(client, territoryId);
  if (process.argv.includes('--single')) {
    const run = await runHealthCollection(client, { codigoIbge: CODIGO_IBGE, referenceDate: REFERENCE_DATE });
    const after = await snapshot(client, territoryId);
    const result = { territory: territory.data, referenceDate: REFERENCE_DATE, before: { indicators: before.indicators.length, evidence: before.evidence.length }, run, after: { indicators: after.indicators.length, evidence: after.evidence.length }, evidence: after.evidence };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  const run1 = await runHealthCollection(client, { codigoIbge: CODIGO_IBGE, referenceDate: REFERENCE_DATE });
  const afterRun1 = await snapshot(client, territoryId);
  const run2 = await runHealthCollection(client, { codigoIbge: CODIGO_IBGE, referenceDate: REFERENCE_DATE });
  const afterRun2 = await snapshot(client, territoryId);
  const run3 = await runHealthCollection(client, { codigoIbge: CODIGO_IBGE, referenceDate: REFERENCE_DATE, forceRefresh: true });
  const afterRun3 = await snapshot(client, territoryId);
  const result = {
    territory: territory.data, referenceDate: REFERENCE_DATE,
    before: { indicators: before.indicators.length, evidence: before.evidence.length, runs: before.runs.length },
    run1, afterRun1: { indicators: afterRun1.indicators.length, evidence: afterRun1.evidence.length },
    run2, afterRun2: { indicators: afterRun2.indicators.length, evidence: afterRun2.evidence.length },
    run3, afterRun3: { indicators: afterRun3.indicators.length, evidence: afterRun3.evidence.length },
    values: afterRun3.indicators.map((row) => ({ indicador: row.indicador, valor: row.valor, unidade: row.unidade, periodo: row.periodo_inicio })),
    populationJoinReady: afterRun3.population,
    audit: {
      indicatorNaturalKeyDuplicates: duplicateCount(afterRun3.indicators as Array<Record<string, unknown>>, ['indicador', 'periodo_inicio', 'periodo_fim']),
      evidenceHashDuplicates: duplicateCount(afterRun3.evidence as Array<Record<string, unknown>>, ['source_hash']),
      secondRunAddedIndicators: afterRun2.indicators.length - afterRun1.indicators.length,
      secondRunAddedEvidence: afterRun2.evidence.length - afterRun1.evidence.length,
      forceRefreshAddedIndicators: afterRun3.indicators.length - afterRun2.indicators.length,
      forceRefreshAddedEvidence: afterRun3.evidence.length - afterRun2.evidence.length,
    },
    recentRuns: afterRun3.runs.slice(0, 3),
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.endsWith('audit-saude-cnes-contagem.ts')) executeHealthAudit().catch((error) => { console.error(error); process.exitCode = 1; });
