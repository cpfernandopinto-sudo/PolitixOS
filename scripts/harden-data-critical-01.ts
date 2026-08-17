import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { getCnesTypeIndicatorLabel } from '../lib/territorios/saude-indicator-labels';

type Row = Record<string, unknown>;
type DbResult<T> = { data: T[] | null; error: { message: string } | null };
type AdminClient = ReturnType<typeof createAdminClient>;

const APPLY = process.argv.includes('--apply');
const SECURITY_DATASET_URL = 'https://dados.mg.gov.br/dataset/crimes-violentos';
const DEMOGRAPHY_API_URL = 'https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324';

function loadEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function all<T>(query: (from: number, to: number) => PromiseLike<DbResult<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await query(from, from + 999);
    if (result.error) throw new Error(result.error.message);
    rows.push(...(result.data ?? []));
    if ((result.data ?? []).length < 1000) return rows;
  }
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Row).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return createHash('sha256').update(stable(value)).digest('hex');
}

function valueFingerprint(rows: Row[]): string {
  return hash(rows.map((row) => ({ id: row.id, valor: row.valor })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
}

function duplicates(rows: Row[], key: (row: Row) => string): number {
  const seen = new Set<string>();
  let count = 0;
  for (const row of rows) { const value = key(row); if (seen.has(value)) count++; else seen.add(value); }
  return count;
}

async function insertBatches(client: AdminClient, rows: Row[]): Promise<number> {
  if (!APPLY) return 0;
  let persisted = 0;
  for (let offset = 0; offset < rows.length; offset += 200) {
    const batch = rows.slice(offset, offset + 200);
    const result = await client.from('territory_evidence').upsert(batch, { onConflict: 'territory_id,source_hash', ignoreDuplicates: true });
    if (result.error) throw new Error(result.error.message);
    persisted += batch.length;
  }
  return persisted;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as AdminClient;

  const territories = await all<Row>((from, to) => client.from('territories').select('id,codigo_ibge,municipio,uf').range(from, to));
  const territoryById = new Map(territories.map((row) => [String(row.id), row]));
  const security = await all<Row>((from, to) => client.from('territory_indicators').select('id,territory_id,indicador,valor,unidade,source_dataset,source_record_id,periodo_inicio,periodo_fim,source_updated_at,collected_at,metadata').eq('categoria', 'seguranca_publica').eq('source_dataset', 'crimes-violentos').range(from, to));
  const demography = await all<Row>((from, to) => client.from('territory_indicators').select('id,territory_id,indicador,valor,unidade,fonte,source_dataset,source_record_id,periodo_inicio,periodo_fim,source_updated_at,collected_at,metadata').eq('categoria', 'demografia').eq('source_dataset', 'SIDRA_6579').eq('indicador', 'populacao_total').range(from, to));
  const health = await all<Row>((from, to) => client.from('territory_indicators').select('indicador').eq('categoria', 'saude').eq('source_dataset', 'CNES_ESTABELECIMENTOS').range(from, to));

  const securityBefore = valueFingerprint(security);
  const demographyBefore = valueFingerprint(demography);
  const collectedAt = new Date().toISOString();

  const securityGroups = new Map<string, Row[]>();
  for (const row of security) {
    const groupKey = `${row.territory_id}|${row.periodo_inicio}|${row.periodo_fim}`;
    const group = securityGroups.get(groupKey) ?? [];
    group.push(row);
    securityGroups.set(groupKey, group);
  }
  const securityEvidence = [...securityGroups.values()].map((group) => {
    const first = group[0];
    const territory = territoryById.get(String(first.territory_id));
    if (!territory) throw new Error(`Território ausente: ${first.territory_id}`);
    const metadata = (first.metadata ?? {}) as Row;
    const records = group.map((row) => ({ indicador: row.indicador, valor: row.valor, unidade: row.unidade, natureza_original: ((row.metadata ?? {}) as Row).natureza_original })).sort((a, b) => String(a.indicador).localeCompare(String(b.indicador)));
    const sourceHash = hash({ dataset: 'crimes-violentos', codigo_ibge: territory.codigo_ibge, periodo_inicio: first.periodo_inicio, periodo_fim: first.periodo_fim, source_year: metadata.source_year, source_resource: metadata.source_resource, records });
    return {
      territory_id: first.territory_id,
      source_type: 'official_data', source_name: 'SEJUSP-MG', source_url: SECURITY_DATASET_URL,
      source_external_id: `crimes-violentos:${territory.codigo_ibge}:${String(first.periodo_inicio).slice(0, 7)}`,
      source_hash: sourceHash, published_at: first.periodo_fim, collected_at: first.collected_at ?? collectedAt,
      tema: 'seguranca_publica', subtema: 'crimes_violentos',
      title: `Crimes violentos — ${territory.municipio}/${territory.uf} — ${String(first.periodo_inicio).slice(0, 7)}`,
      summary: `${records.length} indicadores oficiais mensais preservados sem alteração de valor.`,
      raw_reference: { codigo_ibge: territory.codigo_ibge, municipio: territory.municipio, reference_period: { start: first.periodo_inicio, end: first.periodo_fim }, source_year: metadata.source_year, source_resource: metadata.source_resource, records },
      confidence: 1,
      metadata: { source_mode: 'REAL', source_dataset: 'crimes-violentos', dataset_id: 'crimes-violentos', reference_period: String(first.periodo_inicio).slice(0, 7), context: 'territory_month', indicator_count: records.length, source_year: metadata.source_year, source_resource: metadata.source_resource, provenance_level: 'AGGREGATED_FROM_CANONICAL_INDICATORS', official_dataset_url: SECURITY_DATASET_URL },
    };
  });

  const demographyEvidence = demography.map((row) => {
    const territory = territoryById.get(String(row.territory_id));
    if (!territory) throw new Error(`Território ausente: ${row.territory_id}`);
    const record = { indicador: row.indicador, valor: row.valor, unidade: row.unidade, source_record_id: row.source_record_id };
    const sourceHash = hash({ dataset: 'SIDRA_6579', variable: 9324, codigo_ibge: territory.codigo_ibge, periodo_inicio: row.periodo_inicio, periodo_fim: row.periodo_fim, record });
    return {
      territory_id: row.territory_id,
      source_type: 'official_data', source_name: 'IBGE/SIDRA', source_url: `${DEMOGRAPHY_API_URL}?localidades=N6[${territory.codigo_ibge}]`,
      source_external_id: `SIDRA_6579:9324:${territory.codigo_ibge}:${String(row.periodo_inicio).slice(0, 4)}`,
      source_hash: sourceHash, published_at: null, collected_at: row.collected_at ?? collectedAt,
      tema: 'demografia', subtema: 'populacao_total',
      title: `População residente estimada — ${territory.municipio}/${territory.uf} — ${String(row.periodo_inicio).slice(0, 4)}`,
      summary: 'Estimativa populacional oficial do IBGE/SIDRA, tabela 6579, variável 9324.',
      raw_reference: { codigo_ibge: territory.codigo_ibge, municipio: territory.municipio, table_id: 6579, variable_id: 9324, reference_period: { start: row.periodo_inicio, end: row.periodo_fim }, record },
      confidence: 1,
      metadata: { source_mode: 'REAL', source_dataset: 'SIDRA_6579', table_id: 6579, variable_id: 9324, indicator_key: 'populacao_total', reference_period: String(row.periodo_inicio).slice(0, 4), provenance_level: 'DIRECT_OFFICIAL_VALUE', official_api_url: DEMOGRAPHY_API_URL },
    };
  });

  await insertBatches(client, securityEvidence);
  await insertBatches(client, demographyEvidence);

  const securityAfterRows = await all<Row>((from, to) => client.from('territory_indicators').select('id,valor').eq('categoria', 'seguranca_publica').eq('source_dataset', 'crimes-violentos').range(from, to));
  const demographyAfterRows = await all<Row>((from, to) => client.from('territory_indicators').select('id,valor').eq('categoria', 'demografia').eq('source_dataset', 'SIDRA_6579').eq('indicador', 'populacao_total').range(from, to));
  const persistedSecurityEvidence = await all<Row>((from, to) => client.from('territory_evidence').select('id,territory_id,source_hash,source_external_id,raw_reference,metadata').eq('source_name', 'SEJUSP-MG').eq('tema', 'seguranca_publica').range(from, to));
  const persistedDemographyEvidence = await all<Row>((from, to) => client.from('territory_evidence').select('id,territory_id,source_hash,source_external_id,raw_reference,metadata').eq('source_name', 'IBGE/SIDRA').eq('tema', 'demografia').eq('subtema', 'populacao_total').range(from, to));

  const currentTypes = [...new Set(health.map((row) => String(row.indicador)).filter((indicator) => indicator.startsWith('estabelecimentos_tipo_unidade_')).map((indicator) => Number(indicator.split('_').at(-1))))].sort((a, b) => a - b);
  const unlabeled = currentTypes.filter((code) => !getCnesTypeIndicatorLabel(`estabelecimentos_tipo_unidade_${code}`));
  const pilotCodes = new Set(['3106200', '3106705', '3118601']);
  const securityPilotEvidence = territories.filter((territory) => pilotCodes.has(String(territory.codigo_ibge))).map((territory) => {
    const evidence = persistedSecurityEvidence.filter((row) => row.territory_id === territory.id);
    return {
      codigoIbge: territory.codigo_ibge,
      municipio: territory.municipio,
      evidenceRows: evidence.length,
      completeReferences: evidence.filter((row) => {
        const raw = (row.raw_reference ?? {}) as Row;
        return raw.codigo_ibge === territory.codigo_ibge && Boolean(raw.reference_period) && Boolean(raw.source_year) && Boolean(raw.source_resource) && Array.isArray(raw.records) && raw.records.length === 14;
      }).length,
    };
  });
  const demographyCompleteReferences = persistedDemographyEvidence.filter((row) => {
    const raw = (row.raw_reference ?? {}) as Row;
    return raw.table_id === 6579 && raw.variable_id === 9324 && Boolean(raw.codigo_ibge) && Boolean(raw.reference_period) && Boolean(raw.record);
  }).length;
  const result = {
    mode: APPLY ? 'apply' : 'dry-run',
    security: { indicatorsBefore: security.length, indicatorsAfter: securityAfterRows.length, valuesChanged: securityBefore !== valueFingerprint(securityAfterRows), expectedEvidence: securityEvidence.length, evidenceRows: persistedSecurityEvidence.length, evidenceLogicalDuplicates: duplicates(persistedSecurityEvidence, (row) => String(row.source_external_id)), evidenceHashDuplicates: duplicates(persistedSecurityEvidence, (row) => `${row.territory_id}|${row.source_hash}`), territories: new Set(security.map((row) => row.territory_id)).size, periods: new Set(security.map((row) => row.periodo_inicio)).size, pilotEvidence: securityPilotEvidence },
    health: { currentTypes, types: currentTypes.length, labeled: currentTypes.length - unlabeled.length, unlabeled },
    demography: { indicators: demography.length, indicatorsAfter: demographyAfterRows.length, valuesChanged: demographyBefore !== valueFingerprint(demographyAfterRows), expectedEvidence: demographyEvidence.length, evidenceRows: persistedDemographyEvidence.length, completeReferences: demographyCompleteReferences, evidenceLogicalDuplicates: duplicates(persistedDemographyEvidence, (row) => String(row.source_external_id)), evidenceHashDuplicates: duplicates(persistedDemographyEvidence, (row) => `${row.territory_id}|${row.source_hash}`), lineage: persistedDemographyEvidence.length === demography.length && demography.length > 0 ? 'FULL' : persistedDemographyEvidence.length > 0 ? 'PARTIAL' : 'NONE' },
  };
  fs.writeFileSync('/private/tmp/data-critical-01-hardening.json', `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
