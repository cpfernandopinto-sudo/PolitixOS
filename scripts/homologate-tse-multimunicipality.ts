import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { clearTseProcessCache, getTseCacheStats } from '../lib/territorios/tse-client';
import { MUNICIPAL_YEARS, runTseMultiCollection } from '../lib/territorios/tse-collector';

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

loadLocalEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase não configurado em .env.local.');
const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const municipalities = [
  { codigoIbge: '3118601', name: 'Contagem' },
  { codigoIbge: '3106200', name: 'Belo Horizonte' },
  { codigoIbge: '3106705', name: 'Betim' },
];

async function counts() {
  const output: Record<string, { indicators: number; evidence: number; runs: number }> = {};
  for (const municipality of municipalities) {
    const { data: territory, error } = await client.from('territories').select('id').eq('codigo_ibge', municipality.codigoIbge).single();
    if (error) throw error;
    const [indicators, evidence, runs] = await Promise.all([
      client.from('territory_indicators').select('id', { count: 'exact', head: true }).eq('territory_id', territory.id).eq('categoria', 'eleicoes').eq('fonte', 'TSE'),
      client.from('territory_evidence').select('id', { count: 'exact', head: true }).eq('territory_id', territory.id).eq('tema', 'eleicoes').eq('source_name', 'TSE'),
      client.from('territory_collection_runs').select('id', { count: 'exact', head: true }).eq('territory_id', territory.id).eq('source', 'tse'),
    ]);
    output[municipality.name] = { indicators: indicators.count ?? 0, evidence: evidence.count ?? 0, runs: runs.count ?? 0 };
  }
  return output;
}

async function main() {
  clearTseProcessCache();
  const before = await counts();
  const inputs = municipalities.map(({ codigoIbge }) => ({ codigoIbge, years: [...MUNICIPAL_YEARS] }));
  const first = await runTseMultiCollection(client, inputs);
  const afterFirst = await counts();
  const statsAfterFirst = getTseCacheStats();
  const second = await runTseMultiCollection(client, inputs);
  const afterSecond = await counts();
  const statsAfterSecond = getTseCacheStats();
  const summary = {
    municipalities,
    years: MUNICIPAL_YEARS,
    before,
    first: {
      requestId: first.requestId,
      totalMs: Math.round(first.totalMs),
      results: first.results.map((result) => ({
        ibge: result.territory.codigoIbge, tse: result.territory.codigoTse, name: result.territory.municipio,
        totals: result.dataset.totals.length, indicators: result.indicatorsPersisted, evidence: result.evidencePersisted,
        status: result.overallStatus, metrics: { ...result.metrics, totalMs: Math.round(result.metrics.totalMs), persistenceMs: Math.round(result.metrics.persistenceMs) },
      })),
      cache: statsAfterFirst,
      counts: afterFirst,
    },
    second: {
      requestId: second.requestId,
      totalMs: Math.round(second.totalMs),
      results: second.results.map((result) => ({
        ibge: result.territory.codigoIbge, tse: result.territory.codigoTse, name: result.territory.municipio,
        totals: result.dataset.totals.length, indicators: result.indicatorsPersisted, evidence: result.evidencePersisted,
        status: result.overallStatus, metrics: { ...result.metrics, totalMs: Math.round(result.metrics.totalMs), persistenceMs: Math.round(result.metrics.persistenceMs) },
      })),
      cache: statsAfterSecond,
      counts: afterSecond,
    },
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
