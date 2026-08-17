import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { compactCagedHistoricalBatch, reconstructCagedHistoricalSeries, type CagedHistoricalBatch, type CagedHistoricalSeries, type CagedHistoricalTarget } from '../lib/territorios/caged/history';
import { persistCagedHistoricalSeries } from '../lib/territorios/caged/history-persistence';
import { runCagedPipeline } from '../lib/territorios/caged/pipeline';

const FROM = '202401';
const TO = '202606';
const HISTORY_METHOD = 'novo-caged-history-revision-aware-v1';
const PILOTS: Array<CagedHistoricalTarget & { name: string }> = [
  { ibgeCode: '3118601', cagedMunicipality: '311860', name: 'Contagem' },
  { ibgeCode: '3106705', cagedMunicipality: '310670', name: 'Betim' },
  { ibgeCode: '3106200', cagedMunicipality: '310620', name: 'Belo Horizonte' },
];
const BLOCKS = [['202401', '202403'], ['202404', '202406'], ['202407', '202412'], ['202501', '202505'], ['202506', '202507'], ['202508', '202606']] as const;

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function monthsBetween(from: string, to: string): string[] {
  const result: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    result.push(cursor);
    const year = Number(cursor.slice(0, 4)); const month = Number(cursor.slice(4));
    cursor = month === 12 ? `${year + 1}01` : `${year}${String(month + 1).padStart(2, '0')}`;
  }
  return result;
}

function selectWindow(series: CagedHistoricalSeries[], from: string, to: string): CagedHistoricalSeries[] {
  return series.map((item) => ({ ...item, points: item.points.filter((point) => point.referenceMonth >= from && point.referenceMonth <= to) }));
}

function ensureSeries(series: CagedHistoricalSeries[]): void {
  const expectedMonths = monthsBetween(FROM, TO);
  for (const item of series) {
    if (item.coverage.coverageStatus !== 'COMPLETE' || item.coverage.monthsMissing.length) throw new Error(`Cobertura incompleta ${item.ibgeCode}: ${item.coverage.monthsMissing.join(',')}`);
    if (item.points.length !== expectedMonths.length) throw new Error(`Cardinalidade inesperada ${item.ibgeCode}: ${item.points.length}/${expectedMonths.length}`);
    for (const point of item.points) {
      if (point.admissions - point.dismissals !== point.balance) throw new Error(`Reconciliação total inválida ${item.ibgeCode}|${point.referenceMonth}`);
      if (!point.revisionMetadata.contributingVintages.length) throw new Error(`Linhagem ausente ${item.ibgeCode}|${point.referenceMonth}`);
    }
  }
}

async function main() {
  loadLocalEnv();
  const dataRoot = process.env.CAGED_DATA_ROOT ?? '/private/tmp/politixos-caged-eco03b1';
  const checkpointDir = path.join(dataRoot, 'checkpoints', 'eco03b3b');
  fs.mkdirSync(checkpointDir, { recursive: true });
  const batches: CagedHistoricalBatch[] = [];
  const runs: Record<string, unknown>[] = [];
  let peakRssBytes = process.memoryUsage().rss;
  for (const declarationMonth of monthsBetween(FROM, TO)) {
    const checkpoint = path.join(checkpointDir, `${declarationMonth}.json`);
    if (fs.existsSync(checkpoint)) {
      batches.push(JSON.parse(fs.readFileSync(checkpoint, 'utf8')) as CagedHistoricalBatch);
      runs.push({ declarationMonth, checkpoint: 'hit' });
      console.log(`[ECO03B3B] ${declarationMonth} checkpoint`);
      continue;
    }
    const started = performance.now();
    const pipeline = await runCagedPipeline({ declarationMonth, dataRoot });
    if (pipeline.status !== 'completed') throw new Error(`Pipeline parcial ${declarationMonth}: ${JSON.stringify(pipeline.failures)}`);
    const batch = compactCagedHistoricalBatch({ declarationMonth, status: pipeline.status, vintages: pipeline.vintages, summaries: pipeline.summaries }, PILOTS);
    const temporary = `${checkpoint}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(batch)}\n`); fs.renameSync(temporary, checkpoint);
    batches.push(batch);
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss, ...pipeline.summaries.map((summary) => summary.peakRssBytes));
    runs.push({ declarationMonth, checkpoint: 'created', cacheHits: pipeline.cacheHits, rowsRead: pipeline.summaries.reduce((sum, item) => sum + item.rowsRead, 0), elapsedMs: performance.now() - started });
    console.log(`[ECO03B3B] ${declarationMonth} concluído`);
  }
  const series = reconstructCagedHistoricalSeries({ batches, targets: PILOTS, from: FROM, to: TO, asOfDeclarationMonth: TO });
  ensureSeries(series);
  const revised = series.flatMap((item) => item.points.filter((point) => point.revisionMetadata.revisionVintages.length).map((point) => ({ ibgeCode: item.ibgeCode, referenceMonth: point.referenceMonth, revisionVintages: point.revisionMetadata.revisionVintages })));
  if (!revised.length) throw new Error('Nenhuma revisão FOR/EXC real encontrada.');
  const apply = process.argv.includes('--apply');
  const persistence: Record<string, unknown>[] = [];
  if (apply) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase não configurado em .env.local.');
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
    for (const [from, to] of BLOCKS) {
      const result = await persistCagedHistoricalSeries(client, selectWindow(series, from, to), batches);
      persistence.push({ from, to, ...result });
      console.log(`[ECO03B3B] persistência ${from}-${to} concluída`);
    }
  }
  const report = { generatedAt: new Date().toISOString(), mode: apply ? 'apply' : 'dry-run', window: { from: FROM, to: TO, months: monthsBetween(FROM, TO).length, historyMethodVersion: HISTORY_METHOD }, pilots: PILOTS, runs, coverage: series.map((item) => ({ ibgeCode: item.ibgeCode, ...item.coverage })), revisedExamples: revised.slice(0, 30), persistence, performance: { peakRssBytes }, privacy: { rawEventsInPostgres: false, individualFieldsPersisted: false } };
  fs.writeFileSync('/private/tmp/eco03b3b-expansion.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, runs: { total: runs.length, checkpointHits: runs.filter((item) => item.checkpoint === 'hit').length }, revisedExamples: report.revisedExamples.slice(0, 5) }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
