import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { compactCagedHistoricalBatch, reconstructCagedHistoricalSeries, type CagedHistoricalBatch, type CagedHistoricalTarget } from '../lib/territorios/caged/history';
import { persistCagedHistoricalSeries } from '../lib/territorios/caged/history-persistence';
import { runCagedPipeline } from '../lib/territorios/caged/pipeline';
import { acquireCagedLease, createCentralCagedRun, finishCentralCagedRun, releaseCagedLease } from '../lib/territorios/caged/persistence';

const PILOTS: Array<CagedHistoricalTarget & { name: string }> = [
  { ibgeCode: '3118601', cagedMunicipality: '311860', name: 'Contagem' },
  { ibgeCode: '3106705', cagedMunicipality: '310670', name: 'Betim' },
  { ibgeCode: '3106200', cagedMunicipality: '310620', name: 'Belo Horizonte' },
];

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local'); if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, ''); }
}

function monthsBetween(from: string, to: string): string[] {
  const result: string[] = []; let cursor = from;
  while (cursor <= to) { result.push(cursor); const year = Number(cursor.slice(0, 4)); const month = Number(cursor.slice(4)); cursor = month === 12 ? `${year + 1}01` : `${year}${String(month + 1).padStart(2, '0')}`; }
  return result;
}

export async function executeCagedEco03B3AAudit(options: { from?: string; to?: string; persist?: boolean } = {}) {
  loadLocalEnv();
  const from = options.from ?? process.env.CAGED_HISTORY_FROM ?? '202506';
  const to = options.to ?? process.env.CAGED_HISTORY_TO ?? '202606';
  const dataRoot = process.env.CAGED_DATA_ROOT ?? '/private/tmp/politixos-caged-eco03b1';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado em .env.local.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const batches: CagedHistoricalBatch[] = []; const runs: Array<Record<string, unknown>> = [];
  let peakRssBytes = process.memoryUsage().rss;
  for (const declarationMonth of monthsBetween(from, to)) {
    const lease = await acquireCagedLease(client, declarationMonth); const run = await createCentralCagedRun(client, PILOTS[0].ibgeCode, declarationMonth); const started = performance.now();
    try {
      const pipeline = await runCagedPipeline({ declarationMonth, dataRoot });
      if (pipeline.status !== 'completed') throw new Error(`Pipeline parcial ${declarationMonth}: ${JSON.stringify(pipeline.failures)}`);
      batches.push(compactCagedHistoricalBatch({ declarationMonth, status: pipeline.status, vintages: pipeline.vintages, summaries: pipeline.summaries }, PILOTS));
      peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss, ...pipeline.summaries.map((summary) => summary.peakRssBytes));
      const metadata = { declaration_month: declarationMonth, scope: 'ECO03B3A_HISTORY_PILOTS', rows_read: pipeline.summaries.reduce((sum, item) => sum + item.rowsRead, 0), rows_discarded: pipeline.summaries.reduce((sum, item) => sum + item.rowsDiscarded, 0), indicators_processed: 0, cache_hits: pipeline.cacheHits, elapsed_ms: performance.now() - started };
      await finishCentralCagedRun(client, run.id, 'completed', metadata); runs.push(metadata);
    } catch (error) {
      await finishCentralCagedRun(client, run.id, 'failed', { declaration_month: declarationMonth, scope: 'ECO03B3A_HISTORY_PILOTS' }, error instanceof Error ? error.message : String(error)); throw error;
    } finally { await releaseCagedLease(client, lease); }
  }
  const reconstructStarted = performance.now();
  reconstructCagedHistoricalSeries({ batches, targets: [PILOTS[0]], from, to, asOfDeclarationMonth: to });
  const oneMunicipalityMs = performance.now() - reconstructStarted;
  const threeStarted = performance.now();
  const series = reconstructCagedHistoricalSeries({ batches, targets: PILOTS, from, to, asOfDeclarationMonth: to });
  const threeMunicipalitiesMs = performance.now() - threeStarted;
  const june2026 = series.map((item) => ({ ibgeCode: item.ibgeCode, point: item.points.find((point) => point.referenceMonth === '202606') })).filter((item) => item.point);
  const expected = new Map([['3118601', [12237, 11323, 914]], ['3106705', [7291, 5935, 1356]], ['3106200', [47792, 46646, 1146]]]);
  const regression202606 = june2026.every(({ ibgeCode, point }) => JSON.stringify([point!.admissions, point!.dismissals, point!.balance]) === JSON.stringify(expected.get(ibgeCode)));
  if (!regression202606) throw new Error('Regressão 202606 detectada.');
  const revised = series.flatMap((item) => item.points.filter((point) => point.revisionMetadata.revisionVintages.length).map((point) => ({ ibgeCode: item.ibgeCode, referenceMonth: point.referenceMonth, balance: point.balance, revisions: point.revisionMetadata.revisionVintages, hash: point.revisionMetadata.aggregateHash })));
  if (!revised.length) throw new Error('Nenhuma revisão real FOR/EXC encontrada na janela.');
  const persistence = options.persist || process.env.CAGED_HISTORY_PERSIST === '1' ? await persistCagedHistoricalSeries(client, series, batches) : null;
  return { generatedAt: new Date().toISOString(), window: { from, to, asOfDeclarationMonth: to, months: monthsBetween(from, to).length }, pilots: PILOTS, series, revisedExamples: revised.slice(0, 20), regression202606, persistence, runs, performance: { oneMunicipalityMs, threeMunicipalitiesMs, peakRssBytes }, privacy: { rawEventsInPostgres: false, individualFieldsPersisted: false }, constraints: { stock: 'METHODOLOGY_PENDING', relativeStock: 'METHODOLOGY_PENDING', salary: 'METHODOLOGY_PENDING', cbo: 'NOT_IMPLEMENTED', demographics: 'NOT_IMPLEMENTED' } };
}

if (process.argv[1]?.endsWith('audit-caged-eco03b3a.ts')) executeCagedEco03B3AAudit().then((report) => { fs.writeFileSync('/private/tmp/eco03b3a-audit.json', `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify({ ...report, series: report.series.map((item) => ({ ...item, points: item.points.length })) }, null, 2)); }).catch((error) => { console.error(error); process.exitCode = 1; });
