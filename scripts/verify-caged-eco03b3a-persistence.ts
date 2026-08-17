import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import type { CagedHistoricalBatch, CagedHistoricalSeries } from '../lib/territorios/caged/history';
import { persistCagedHistoricalSeries } from '../lib/territorios/caged/history-persistence';
import { getCagedMunicipalSeries } from '../lib/territorios/caged/series-query';
import type { CagedSourceVintage } from '../lib/territorios/caged/types';

function loadLocalEnv(): void { const file = path.join(process.cwd(), '.env.local'); if (!fs.existsSync(file)) return; for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, ''); } }
function manifests(root: string): CagedSourceVintage[] { return fs.readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.manifest.json')).map((entry) => JSON.parse(fs.readFileSync(path.join(entry.parentPath, entry.name), 'utf8')) as CagedSourceVintage); }

export async function verifyCagedEco03B3APersistence() {
  loadLocalEnv(); const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const audit = JSON.parse(fs.readFileSync('/private/tmp/eco03b3a-audit.json', 'utf8')) as { series: CagedHistoricalSeries[]; window: { from: string; to: string } };
  const rawRoot = path.join(process.env.CAGED_DATA_ROOT ?? '/private/tmp/politixos-caged-eco03b1', 'caged', 'raw');
  const vintages = manifests(rawRoot).filter((vintage) => vintage.declarationMonth >= audit.window.from && vintage.declarationMonth <= audit.window.to);
  const batches: CagedHistoricalBatch[] = vintages.map((vintage) => ({ declarationMonth: vintage.declarationMonth, status: 'completed', vintages: [vintage], summaries: [] }));
  const second = await persistCagedHistoricalSeries(client, audit.series, batches);
  const territories = await client.from('territories').select('id,codigo_ibge').in('codigo_ibge', audit.series.map((item) => item.ibgeCode)); if (territories.error) throw new Error(territories.error.message);
  const ids = (territories.data ?? []).map((row) => String(row.id));
  const rows = await client.from('territory_indicators').select('territory_id,indicador,periodo_inicio').in('territory_id', ids).eq('categoria', 'economia').eq('fonte', 'MTE').eq('source_dataset', 'NOVO_CAGED').gte('periodo_inicio', '2025-06-01').lte('periodo_inicio', '2026-06-01'); if (rows.error) throw new Error(rows.error.message);
  const keys = (rows.data ?? []).map((row) => `${row.territory_id}|${row.indicador}|${row.periodo_inicio}`); const duplicates = keys.length - new Set(keys).size;
  const contagem = (territories.data ?? []).find((row) => row.codigo_ibge === '3118601'); if (!contagem) throw new Error('Contagem ausente.');
  const totalSeries = await getCagedMunicipalSeries(client, { territoryId: String(contagem.id), from: '202506', to: '202606' });
  const servicesSeries = await getCagedMunicipalSeries(client, { territoryId: String(contagem.id), from: '202506', to: '202606', sector: 'servicos' });
  return { second, databaseRows: keys.length, duplicates, totalSeries: { points: totalSeries.points.length, coverage: totalSeries.coverage }, servicesSeries: { points: servicesSeries.points.length, coverage: servicesSeries.coverage } };
}

if (process.argv[1]?.endsWith('verify-caged-eco03b3a-persistence.ts')) verifyCagedEco03B3APersistence().then((result) => { fs.writeFileSync('/private/tmp/eco03b3a-persistence-verification.json', `${JSON.stringify(result, null, 2)}\n`); console.log(JSON.stringify(result, null, 2)); }).catch((error) => { console.error(error); process.exitCode = 1; });
