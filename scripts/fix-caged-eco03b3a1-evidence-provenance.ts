import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { cagedEvidenceLogicalKey, persistRevisionAwareCagedEvidence, type CagedEvidenceRow } from '../lib/territorios/caged/evidence-persistence';

const PILOT_CODES = ['3118601', '3106705', '3106200'];
const HISTORY_METHOD = 'novo-caged-history-revision-aware-v1';

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await query(from, from + 999);
    if (result.error) throw new Error(result.error.message);
    rows.push(...(result.data ?? []));
    if ((result.data ?? []).length < 1000) return rows;
  }
}

function indicatorLogicalKey(row: Record<string, unknown>): string | null {
  const indicator = String(row.indicador ?? '');
  if (indicator !== 'saldo_emprego_formal' && !indicator.startsWith('saldo_emprego_formal_')) return null;
  const sector = indicator === 'saldo_emprego_formal' ? 'total' : indicator.replace('saldo_emprego_formal_', '');
  const period = String(row.periodo_inicio ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) return null;
  return `${row.territory_id}|${period.slice(0, 7).replace('-', '')}|${sector}`;
}

function fingerprint(rows: Record<string, unknown>[]): string {
  return createHash('sha256').update(JSON.stringify(rows.map((row) => ({ id: row.id, valor: row.valor, metadata: row.metadata })).sort((a, b) => String(a.id).localeCompare(String(b.id))))).digest('hex');
}

export async function fixCagedEco03B3A1EvidenceProvenance(options: { apply?: boolean } = {}) {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado em .env.local.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const territories = await readAll<Record<string, unknown>>((from, to) => client.from('territories').select('id,codigo_ibge,municipio').in('codigo_ibge', PILOT_CODES).range(from, to));
  const territoryIds = territories.map((row) => String(row.id));
  const evidence = await readAll<CagedEvidenceRow>((from, to) => client.from('territory_evidence')
    .select('id,territory_id,source_hash,source_name,source_type,source_url,source_external_id,published_at,collected_at,tema,subtema,title,summary,raw_reference,confidence,metadata')
    .in('territory_id', territoryIds).eq('source_name', 'MTE/Novo CAGED').eq('tema', 'economia').range(from, to));
  const indicators = await readAll<Record<string, unknown>>((from, to) => client.from('territory_indicators')
    .select('id,territory_id,indicador,periodo_inicio,valor,metadata').in('territory_id', territoryIds)
    .eq('categoria', 'economia').eq('fonte', 'MTE').eq('source_dataset', 'NOVO_CAGED')
    .gte('periodo_inicio', '2025-06-01').lte('periodo_inicio', '2026-06-01').range(from, to));

  const evidenceByKey = new Map<string, CagedEvidenceRow[]>();
  const malformedEvidence: string[] = [];
  for (const row of evidence) {
    const logicalKey = cagedEvidenceLogicalKey(row);
    if (!logicalKey) { malformedEvidence.push(String(row.id)); continue; }
    evidenceByKey.set(logicalKey, [...(evidenceByKey.get(logicalKey) ?? []), row]);
  }
  const desired: CagedEvidenceRow[] = [];
  const ambiguousRows = [...malformedEvidence.map((id) => `malformed-evidence:${id}`)];
  for (const indicator of indicators) {
    const logicalKey = indicatorLogicalKey(indicator);
    if (!logicalKey) continue;
    const metadata = (indicator.metadata ?? {}) as Record<string, unknown>;
    const aggregateHash = String(metadata.aggregate_hash ?? '');
    const matches = (evidenceByKey.get(logicalKey) ?? []).filter((row) => row.source_hash === aggregateHash);
    if (matches.length !== 1) { ambiguousRows.push(`indicator-match:${logicalKey}:${aggregateHash}:${matches.length}`); continue; }
    const matching = matches[0];
    const desiredMetadata: Record<string, unknown> = {
      ...(matching.metadata ?? {}),
      method_version: metadata.method_version ?? matching.metadata?.method_version,
      history_method_version: metadata.history_method_version ?? HISTORY_METHOD,
      as_of_declaration_month: metadata.as_of_declaration_month ?? '202606',
      aggregate_hash: aggregateHash,
      revision_aware: true,
      current: true,
    };
    const mappingVersion = metadata.mapping_version ?? matching.metadata?.mapping_version;
    if (mappingVersion !== undefined) desiredMetadata.mapping_version = mappingVersion;
    desired.push({
      ...matching,
      metadata: desiredMetadata,
    });
  }
  if (desired.length !== 234) ambiguousRows.push(`desired-cardinality:${desired.length}:expected-234`);
  const beforeIndicatorFingerprint = fingerprint(indicators);
  const dryRun = await persistRevisionAwareCagedEvidence(client, desired, { dryRun: true });
  ambiguousRows.push(...dryRun.ambiguousRows);
  const report = {
    generatedAt: new Date().toISOString(), mode: options.apply ? 'apply' : 'dry-run', scope: { codes: PILOT_CODES, from: '202506', to: '202606' },
    rowsFound: evidence.length, logicalPoints: evidenceByKey.size, rowsToInsert: dryRun.inserted, rowsToUpdate: dryRun.updated,
    alreadyCorrect: dryRun.unchanged, logicalDuplicates: dryRun.logicalDuplicates, legitimateVintages: dryRun.legitimateVintages,
    ambiguousRows, indicatorsFound: indicators.length, indicatorFingerprintBefore: beforeIndicatorFingerprint,
  };
  if (ambiguousRows.length || !options.apply) return report;

  const backupPath = path.join(process.cwd(), 'docs/relatorios/artefatos/ECO03B3A1_EVIDENCE_METADATA_BACKUP.json');
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify({ generatedAt: report.generatedAt, rows: evidence.map((row) => ({ id: row.id, territory_id: row.territory_id, source_hash: row.source_hash, metadata: row.metadata })) }, null, 2)}\n`);
  const applied = await persistRevisionAwareCagedEvidence(client, desired);
  const indicatorsAfter = await readAll<Record<string, unknown>>((from, to) => client.from('territory_indicators')
    .select('id,territory_id,indicador,periodo_inicio,valor,metadata').in('territory_id', territoryIds)
    .eq('categoria', 'economia').eq('fonte', 'MTE').eq('source_dataset', 'NOVO_CAGED')
    .gte('periodo_inicio', '2025-06-01').lte('periodo_inicio', '2026-06-01').range(from, to));
  return { ...report, backupPath, applied, indicatorFingerprintAfter: fingerprint(indicatorsAfter), indicatorValuesChanged: beforeIndicatorFingerprint !== fingerprint(indicatorsAfter) };
}

if (process.argv[1]?.endsWith('fix-caged-eco03b3a1-evidence-provenance.ts')) {
  fixCagedEco03B3A1EvidenceProvenance({ apply: process.argv.includes('--apply') }).then((report) => {
    const output = process.argv.includes('--apply') ? '/private/tmp/eco03b3a1-apply.json' : '/private/tmp/eco03b3a1-dry-run.json';
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  }).catch((error) => { console.error(error); process.exitCode = 1; });
}
