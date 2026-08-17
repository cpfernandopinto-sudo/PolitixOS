import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { cagedEvidenceLogicalKey, type CagedEvidenceRow } from '../lib/territorios/caged/evidence-persistence';
import { reconstructCagedHistoricalSeries, type CagedHistoricalBatch, type CagedHistoricalTarget } from '../lib/territorios/caged/history';

const PILOTS: CagedHistoricalTarget[] = [
  { ibgeCode: '3118601', cagedMunicipality: '311860' }, { ibgeCode: '3106705', cagedMunicipality: '310670' }, { ibgeCode: '3106200', cagedMunicipality: '310620' },
];
const MONTHS = ['202401', '202406', '202412', '202506'];
const SECTORS = ['servicos', 'comercio'];

function loadEnv() { const file = path.join(process.cwd(), '.env.local'); if (fs.existsSync(file)) for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, ''); } }
async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) { const rows: T[] = []; for (let from = 0; ; from += 1000) { const result = await query(from, from + 999); if (result.error) throw new Error(result.error.message); rows.push(...(result.data ?? [])); if ((result.data ?? []).length < 1000) return rows; } }
function monthDate(month: string) { return `${month.slice(0, 4)}-${month.slice(4)}-01`; }

async function main() {
  loadEnv(); const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const dataRoot = process.env.CAGED_DATA_ROOT ?? '/private/tmp/politixos-caged-eco03b1'; const checkpointDir = path.join(dataRoot, 'checkpoints', 'eco03b3b');
  const batches = fs.readdirSync(checkpointDir).filter((name) => /^\d{6}\.json$/.test(name)).sort().map((name) => JSON.parse(fs.readFileSync(path.join(checkpointDir, name), 'utf8')) as CagedHistoricalBatch);
  const series = reconstructCagedHistoricalSeries({ batches, targets: PILOTS, from: '202401', to: '202606', asOfDeclarationMonth: '202606' });
  const territories = await readAll<Record<string, unknown>>((from, to) => client.from('territories').select('id,codigo_ibge,municipio').in('codigo_ibge', PILOTS.map((item) => item.ibgeCode)).range(from, to));
  const ids = territories.map((row) => String(row.id)); const codeById = new Map(territories.map((row) => [String(row.id), String(row.codigo_ibge)]));
  const indicators = await readAll<Record<string, unknown>>((from, to) => client.from('territory_indicators').select('id,territory_id,indicador,periodo_inicio,valor,metadata').in('territory_id', ids).eq('categoria', 'economia').eq('fonte', 'MTE').eq('source_dataset', 'NOVO_CAGED').gte('periodo_inicio', '2024-01-01').lte('periodo_inicio', '2026-06-01').range(from, to));
  const evidence = await readAll<CagedEvidenceRow>((from, to) => client.from('territory_evidence').select('id,territory_id,source_hash,source_name,source_type,source_url,source_external_id,published_at,collected_at,tema,subtema,title,summary,raw_reference,confidence,metadata').in('territory_id', ids).eq('source_name', 'MTE/Novo CAGED').eq('tema', 'economia').range(from, to));
  const indicatorKeys = new Map<string, number>(); for (const row of indicators) { const key = `${row.territory_id}|${row.indicador}|${row.periodo_inicio}`; indicatorKeys.set(key, (indicatorKeys.get(key) ?? 0) + 1); }
  const currentEvidence = evidence.filter((row) => row.metadata?.current === true); const currentKeys = new Map<string, number>(); for (const row of currentEvidence) { const key = cagedEvidenceLogicalKey(row); if (key) currentKeys.set(key, (currentKeys.get(key) ?? 0) + 1); }
  const expected = new Map<string, number>();
  for (const item of series) for (const point of item.points) {
    expected.set(`${item.ibgeCode}|${point.referenceMonth}|saldo_emprego_formal`, point.balance); expected.set(`${item.ibgeCode}|${point.referenceMonth}|admissoes_emprego_formal`, point.admissions); expected.set(`${item.ibgeCode}|${point.referenceMonth}|desligamentos_emprego_formal`, point.dismissals);
    for (const sector of point.sectors) for (const [prefix, field] of [['admissoes', 'admissions'], ['desligamentos', 'dismissals'], ['saldo', 'balance']] as const) expected.set(`${item.ibgeCode}|${point.referenceMonth}|${prefix}_emprego_formal_${sector.sector}`, sector[field]);
  }
  const mismatches = indicators.filter((row) => Number(row.valor) !== expected.get(`${codeById.get(String(row.territory_id))}|${String(row.periodo_inicio).slice(0, 7).replace('-', '')}|${row.indicador}`));
  const samples = MONTHS.flatMap((month) => PILOTS.flatMap((pilot) => ['saldo_emprego_formal', ...SECTORS.map((sector) => `saldo_emprego_formal_${sector}`)].map((indicator) => ({ ibgeCode: pilot.ibgeCode, month, indicator, expected: expected.get(`${pilot.ibgeCode}|${month}|${indicator}`), actual: indicators.find((row) => codeById.get(String(row.territory_id)) === pilot.ibgeCode && row.indicador === indicator && row.periodo_inicio === monthDate(month))?.valor }))));
  const requiredMetadata = ['reference_month', 'context', 'contributing_vintages', 'history_method_version', 'as_of_declaration_month', 'aggregate_hash'];
  const metadataMissing = currentEvidence.filter((row) => requiredMetadata.some((field) => row.metadata?.[field] == null) || row.metadata?.revision_aware !== true);
  const result = { generatedAt: new Date().toISOString(), indicators: { rows: indicators.length, expected: 1620, duplicateCurrentKeys: [...indicatorKeys.values()].filter((count) => count > 1).length, mismatches: mismatches.length }, evidence: { totalRows: evidence.length, currentRows: currentEvidence.length, expectedCurrent: 540, duplicateCurrentLogicalKeys: [...currentKeys.values()].filter((count) => count > 1).length, legitimateHistoricalVersions: evidence.length - currentEvidence.length, metadataMissing: metadataMissing.length }, samples, sampleMismatches: samples.filter((item) => Number(item.actual) !== item.expected).length, checkpoints: batches.length, pass: indicators.length === 1620 && mismatches.length === 0 && currentEvidence.length === 540 && metadataMissing.length === 0 && [...indicatorKeys.values(), ...currentKeys.values()].every((count) => count === 1) && samples.every((item) => Number(item.actual) === item.expected) };
  fs.writeFileSync('/private/tmp/eco03b3b-db-audit.json', `${JSON.stringify(result, null, 2)}\n`); console.log(JSON.stringify(result, null, 2)); if (!result.pass) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
