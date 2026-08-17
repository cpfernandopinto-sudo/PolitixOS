import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { CAGED_CAPABILITIES, CAGED_OFFICIAL_SECTORS } from '../lib/territorios/caged/methods';
import { runCagedPipeline } from '../lib/territorios/caged/pipeline';
import { acquireCagedLease, createCentralCagedRun, finishCentralCagedRun, persistCagedSectorAggregates, releaseCagedLease } from '../lib/territorios/caged/persistence';

const PILOTS = [
  { ibge: '3118601', name: 'Contagem' },
  { ibge: '3106705', name: 'Betim' },
  { ibge: '3106200', name: 'Belo Horizonte' },
] as const;

const EXPECTED_NATIONAL = {
  agropecuaria: { admissions: 114801, dismissals: 91903, balance: 22898 },
  industria_geral: { admissions: 331149, dismissals: 316711, balance: 14438 },
  construcao: { admissions: 208989, dismissals: 194853, balance: 14136 },
  comercio: { admissions: 507660, dismissals: 488483, balance: 19177 },
  servicos: { admissions: 1057527, dismissals: 983013, balance: 74514 },
  nao_classificado: { admissions: 5, dismissals: 7, balance: -2 },
} as const;

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function compactTotals(value: { admissions: number; dismissals: number; balance: number; rowsRead?: number }) {
  return { admissions: value.admissions, dismissals: value.dismissals, balance: value.balance };
}

function sum(rows: Array<{ admissions: number; dismissals: number; balance: number }>) {
  return rows.reduce((total, row) => ({ admissions: total.admissions + row.admissions, dismissals: total.dismissals + row.dismissals, balance: total.balance + row.balance }), { admissions: 0, dismissals: 0, balance: 0 });
}

function stableHash(rows: unknown[]): string {
  return createHash('sha256').update(JSON.stringify([...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))).digest('hex');
}

async function indicatorSnapshot(client: ReturnType<typeof createAdminClient>, territoryIds: string[]) {
  const result = await client.from('territory_indicators').select('territory_id,indicador,valor,periodo_inicio,metadata').in('territory_id', territoryIds).eq('categoria', 'economia').eq('fonte', 'MTE').eq('source_dataset', 'NOVO_CAGED').eq('periodo_inicio', '2026-06-01');
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
}

export async function executeCagedEco03B2Audit() {
  loadLocalEnv();
  const dataRoot = process.env.CAGED_DATA_ROOT ?? '/private/tmp/politixos-caged-eco03b1';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado em .env.local.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const territories = await client.from('territories').select('id,codigo_ibge,municipio,uf').in('codigo_ibge', PILOTS.map((pilot) => pilot.ibge));
  if (territories.error || territories.data?.length !== PILOTS.length) throw new Error(territories.error?.message ?? 'Pilotos não resolvidos no catálogo territorial.');
  const territoryIds = territories.data.map((row) => String(row.id));
  const baseIndicators = ['admissoes_emprego_formal', 'desligamentos_emprego_formal', 'saldo_emprego_formal'];
  const before = await indicatorSnapshot(client, territoryIds);
  const baseBefore = before.filter((row) => baseIndicators.includes(row.indicador));
  const lease = await acquireCagedLease(client, '202606');
  const run = await createCentralCagedRun(client, '3118601', '202606');
  try {
    const pipeline = await runCagedPipeline({ declarationMonth: '202606', dataRoot });
    if (pipeline.status !== 'completed') throw new Error(`Pipeline parcial: ${JSON.stringify(pipeline.failures)}`);
    const mov = pipeline.summaries.find((summary) => summary.kind === 'MOV');
    if (!mov) throw new Error('Resumo MOV ausente.');
    const nationalBySector = Object.fromEntries(CAGED_OFFICIAL_SECTORS.map((sector) => [sector, compactTotals(mov.sectors.nationalTotals[sector])]));
    const nationalStatus = JSON.stringify(nationalBySector) === JSON.stringify(EXPECTED_NATIONAL) ? 'PASS' : 'FAIL';
    if (nationalStatus !== 'PASS') throw new Error(`Setores nacionais divergentes: ${JSON.stringify(nationalBySector)}`);
    const pilotRows = pipeline.currentSectorAggregates.filter((row) => PILOTS.some((pilot) => pilot.ibge === row.ibgeCode));
    const pilotAudit = PILOTS.map((pilot) => {
      const sectorRows = pilotRows.filter((row) => row.ibgeCode === pilot.ibge);
      const general = pipeline.currentAggregates.find((row) => row.ibgeCode === pilot.ibge);
      const sectorTotal = sum(sectorRows);
      return { ...pilot, general: general ? compactTotals(general) : null, sectorTotal, sectors: sectorRows, status: general && JSON.stringify(sectorTotal) === JSON.stringify(compactTotals(general)) ? 'PASS' : 'FAIL' };
    });
    if (pilotAudit.some((pilot) => pilot.status !== 'PASS')) throw new Error('Reconciliação setorial de piloto falhou.');
    const first = await persistCagedSectorAggregates(client, pilotRows, pipeline.vintages, '202606');
    const second = await persistCagedSectorAggregates(client, pilotRows, pipeline.vintages, '202606');
    const after = await indicatorSnapshot(client, territoryIds);
    const baseAfter = after.filter((row) => baseIndicators.includes(row.indicador));
    const report = {
      generatedAt: new Date().toISOString(), declarationMonth: '202606', capabilities: CAGED_CAPABILITIES,
      source: { provider: 'MTE/PDET/Novo CAGED', officialComparison: 'Sumário Executivo Junho/2026, Tabela 1' },
      national: { expected: EXPECTED_NATIONAL, actual: nationalBySector, status: nationalStatus, total: sum(Object.values(nationalBySector)) },
      pilots: pilotAudit,
      revisions: Object.fromEntries(pipeline.summaries.filter((summary) => summary.kind !== 'MOV').map((summary) => [summary.kind, { rowsRead: summary.rowsRead, national: summary.sectors.nationalTotals, referenceMonths: summary.referenceMonthsTouched }])),
      persistence: { first, second, pilotRows: pilotRows.length, expectedIndicators: PILOTS.length * 5 * 3 },
      preservation: { baseRowsBefore: baseBefore.length, baseRowsAfter: baseAfter.length, baseHashBefore: stableHash(baseBefore), baseHashAfter: stableHash(baseAfter), unchanged: stableHash(baseBefore) === stableHash(baseAfter) },
      privacy: { postgresMicroevents: false, individualFieldsPersisted: false, curatedRows: 'municipio_mes_setor' },
      timings: pipeline.timings,
    };
    if (!report.preservation.unchanged || baseBefore.length !== 9 || baseAfter.length !== 9) throw new Error('Os nove indicadores-base não foram preservados exatamente.');
    await finishCentralCagedRun(client, run.id, 'completed', { declaration_month: '202606', scope: 'ECO03B2_PILOTS', rows_read: pipeline.summaries.reduce((total, summary) => total + summary.rowsRead, 0), rows_discarded: pipeline.summaries.reduce((total, summary) => total + summary.rowsDiscarded, 0), indicators_processed: first.indicatorsProcessed, persistence: first, national_sector_reconciliation: nationalStatus });
    return report;
  } catch (error) {
    await finishCentralCagedRun(client, run.id, 'failed', { declaration_month: '202606', scope: 'ECO03B2_PILOTS' }, error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await releaseCagedLease(client, lease);
  }
}

if (process.argv[1]?.endsWith('audit-caged-eco03b2.ts')) executeCagedEco03B2Audit().then((report) => console.log(JSON.stringify(report, null, 2))).catch((error) => { console.error(error); process.exitCode = 1; });
