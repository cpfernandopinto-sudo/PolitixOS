import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { runCagedPipeline } from '../lib/territorios/caged/pipeline';
import { createCentralCagedRun, finishCentralCagedRun, persistCagedAggregates } from '../lib/territorios/caged/persistence';

const PILOTS = [
  { ibge: '3118601', name: 'Contagem', current: [12237, 11323, 914], historical: [6567, 6852, -285] },
  { ibge: '3106705', name: 'Betim', current: [7291, 5935, 1356], historical: [3161, 2685, 476] },
  { ibge: '3106200', name: 'Belo Horizonte', current: [47792, 46646, 1146], historical: [31772, 32571, -799] },
] as const;

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function totals(rows: Array<{ admissions: number; dismissals: number; balance: number }>) {
  return rows.reduce((sum, row) => ({ admissions: sum.admissions + row.admissions, dismissals: sum.dismissals + row.dismissals, balance: sum.balance + row.balance }), { admissions: 0, dismissals: 0, balance: 0 });
}

function compactSummary(summary: Awaited<ReturnType<typeof runCagedPipeline>>['summaries'][number]) {
  return {
    kind: summary.kind, rowsRead: summary.rowsRead, rowsAccepted: summary.rowsAccepted, rowsDiscarded: summary.rowsDiscarded,
    invalidMunicipalities: summary.invalidMunicipalities, nationalTotals: summary.nationalTotals,
    referenceMonthsTouched: summary.referenceMonthsTouched, header: summary.header, layoutHash: summary.layoutHash,
    elapsedMs: summary.elapsedMs, peakRssBytes: summary.peakRssBytes, municipalitiesTouchedCount: summary.municipalitiesTouched.length,
  };
}

function auditPilots(rows: Awaited<ReturnType<typeof runCagedPipeline>>['currentAggregates'], period: 'current' | 'historical') {
  return PILOTS.map((pilot) => {
    const row = rows.find((item) => item.ibgeCode === pilot.ibge);
    const expected = pilot[period];
    const actual = row ? [row.admissions, row.dismissals, row.balance] : null;
    return { ...pilot, expected, actual, status: JSON.stringify(actual) === JSON.stringify(expected) ? 'PASS' : 'FAIL' };
  });
}

async function snapshot(client: ReturnType<typeof createAdminClient>, territoryIds: string[]) {
  const result = await client.from('territory_indicators').select('id,territory_id,indicador,valor,periodo_inicio,metadata').in('territory_id', territoryIds).eq('categoria', 'economia').eq('fonte', 'MTE').eq('source_dataset', 'NOVO_CAGED').eq('periodo_inicio', '2026-06-01');
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
}

export async function executeCagedEco03B1Audit() {
  loadLocalEnv();
  const dataRoot = process.env.CAGED_DATA_ROOT ?? '/private/tmp/politixos-caged-eco03b1';
  const rssBefore = process.memoryUsage().rss;
  const recent = await runCagedPipeline({ declarationMonth: '202606', dataRoot });
  const recentAgain = await runCagedPipeline({ declarationMonth: '202606', dataRoot });
  const historical = await runCagedPipeline({ declarationMonth: '202001', dataRoot, kinds: ['MOV'] });
  const municipalResolvedNational = totals(recent.currentAggregates);
  const national = recent.summaries.find((item) => item.kind === 'MOV')!.nationalTotals;
  const revision = recent.summaries.filter((item) => item.kind !== 'MOV').reduce((sum, item) => ({ admissions: sum.admissions + item.nationalTotals.admissions, dismissals: sum.dismissals + item.nationalTotals.dismissals, balance: sum.balance + item.nationalTotals.balance }), { admissions: 0, dismissals: 0, balance: 0 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado em .env.local.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const territoryRows: Array<{ id: string; codigo_ibge: string }> = [];
  for (let from = 0; ; from += 1000) {
    const page = await client.from('territories').select('id,codigo_ibge').range(from, from + 999);
    if (page.error) throw new Error(page.error.message);
    territoryRows.push(...((page.data ?? []) as Array<{ id: string; codigo_ibge: string }>));
    if ((page.data ?? []).length < 1000) break;
  }
  const currentCodes = new Set(recent.currentAggregates.map((row) => row.ibgeCode));
  const territoryQuery = { data: territoryRows.filter((row) => currentCodes.has(String(row.codigo_ibge))) };
  const availableCodes = new Set(territoryQuery.data.map((row) => String(row.codigo_ibge)));
  const scope = availableCodes.size === recent.currentAggregates.length ? 'national' : 'pilots';
  const selected = scope === 'national' ? recent.currentAggregates : recent.currentAggregates.filter((row) => PILOTS.some((pilot) => pilot.ibge === row.ibgeCode));
  const selectedTerritories = (territoryQuery.data ?? []).filter((row) => selected.some((item) => item.ibgeCode === row.codigo_ibge));
  const run = await createCentralCagedRun(client, '3118601', '202606');
  try {
    const first = await persistCagedAggregates(client, selected, recent.vintages, '202606');
    const beforeSecond = await snapshot(client, selectedTerritories.map((row) => String(row.id)));
    const second = await persistCagedAggregates(client, selected, recent.vintages, '202606');
    const afterSecond = await snapshot(client, selectedTerritories.map((row) => String(row.id)));
    const report = {
      generatedAt: new Date().toISOString(), dataRoot, runtime: { node: process.version, platform: process.platform, rssBefore, rssAfter: process.memoryUsage().rss, peakRssReported: Math.max(...recent.summaries.map((item) => item.peakRssBytes)) },
      architecture: { raw: 'versioned-filesystem-artifact-store', normalized: 'streaming-in-memory-aggregate', curated: 'NDJSON municipal + Supabase operational aggregates', parquet: 'deferred-no-existing-engine-or-library', postgresMicrodata: false },
      recent: { status: recent.status, vintages: recent.vintages, summaries: recent.summaries.map(compactSummary), currentMunicipalities: recent.currentAggregates.length, national, municipalResolvedNational, expectedNational: { admissions: 2220131, dismissals: 2074970, balance: 145161 }, pilots: auditPilots(recent.currentAggregates, 'current'), revision: { aggregate: revision, rows: recent.summaries.filter((item) => item.kind !== 'MOV').reduce((sum, item) => sum + item.rowsRead, 0), referenceMonths: [...new Set(recent.summaries.filter((item) => item.kind !== 'MOV').flatMap((item) => item.referenceMonthsTouched))].sort(), municipalities: [...new Set(recent.summaries.filter((item) => item.kind !== 'MOV').flatMap((item) => item.municipalitiesTouched))].length }, timings: recent.timings },
      historical: { summaries: historical.summaries.map(compactSummary), pilots: auditPilots(historical.currentAggregates, 'historical'), timings: historical.timings },
      idempotency: { rawCacheHitsSecondRun: recentAgain.cacheHits, sameCurrent: JSON.stringify(recent.currentAggregates) === JSON.stringify(recentAgain.currentAggregates), persistenceFirst: first, persistenceSecond: second, indicatorRowsBeforeSecond: beforeSecond.length, indicatorRowsAfterSecond: afterSecond.length, secondRunAddedIndicatorRows: afterSecond.length - beforeSecond.length },
      persistence: { scope, selectedMunicipalities: selected.length, availableTerritories: availableCodes.size, totalCurrentMunicipalities: recent.currentAggregates.length },
    };
    await finishCentralCagedRun(client, run.id, recent.status, { declaration_month: '202606', kinds: recent.summaries.map((item) => item.kind), vintages: recent.vintages.map((item) => ({ kind: item.kind, sha256: item.sha256 })), rows_read: recent.summaries.reduce((sum, item) => sum + item.rowsRead, 0), rows_discarded: recent.summaries.reduce((sum, item) => sum + item.rowsDiscarded, 0), municipalities_touched: recent.currentAggregates.length, reference_months_touched: [...new Set(recent.summaries.flatMap((item) => item.referenceMonthsTouched))], indicators_processed: selected.length * 3, persistence_scope: scope, persistence: first, timings: recent.timings });
    console.log(JSON.stringify(report, null, 2));
    return report;
  } catch (error) {
    await finishCentralCagedRun(client, run.id, 'failed', { declaration_month: '202606' }, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

if (process.argv[1]?.endsWith('audit-caged-eco03b1.ts')) executeCagedEco03B1Audit().catch((error) => { console.error(error); process.exitCode = 1; });
