import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { getCanonicalRegion } from '../lib/territorios/regional-registry';
import { runRegionalLoad } from '../lib/territorios/regional-load-runner';
import { clearTseProcessCache, getTseCacheStats } from '../lib/territorios/tse-client';
import { MUNICIPAL_YEARS, runTseCollection } from '../lib/territorios/tse-collector';

function loadLocalEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function option(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  const checkpointPath = option('checkpoint');
  if (!checkpointPath || !path.isAbsolute(checkpointPath)) throw new Error('Informe --checkpoint com caminho absoluto.');
  const stopAfterValue = option('stop-after');
  const stopAfter = stopAfterValue === undefined ? undefined : Number(stopAfterValue);
  if (stopAfter !== undefined && (!Number.isInteger(stopAfter) || stopAfter < 0)) throw new Error('--stop-after inválido.');

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const region = getCanonicalRegion('RMBH');
  clearTseProcessCache();
  const startedAt = performance.now();
  const memories = [process.memoryUsage().rss];
  const checkpoint = await runRegionalLoad(region, {
    checkpointPath,
    stopAfter,
    collect: async (ibgeCode, runId) => {
      const result = await runTseCollection(client, { codigoIbge: ibgeCode, requestId: runId, years: [...MUNICIPAL_YEARS] });
      memories.push(process.memoryUsage().rss);
      return {
        status: result.overallStatus === 'completed' ? 'completed' : 'partial',
        years: [...MUNICIPAL_YEARS],
        indicatorsProcessed: result.indicatorsPersisted,
        evidenceProcessed: result.evidencePersisted,
        errors: result.errors,
        durationMs: result.metrics.totalMs,
      };
    },
  });
  memories.push(process.memoryUsage().rss);
  const cache = getTseCacheStats();
  console.log(JSON.stringify({
    checkpointPath,
    checkpoint,
    metrics: {
      totalMs: performance.now() - startedAt,
      cache,
      memory: {
        initial: memories[0],
        average: Math.round(memories.reduce((sum, value) => sum + value, 0) / memories.length),
        peak: Math.max(...memories),
        final: memories[memories.length - 1],
        samples: memories.length,
      },
      concurrency: 1,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

