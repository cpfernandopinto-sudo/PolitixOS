import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { runPibMunicipalCollection } from '../lib/territorios/economia-pib-collector';
import { runEconomyCollection } from '../lib/territorios/economia-collector';

const PILOTS = ['3106200', '3106705', '3118601'];
const TARGETS = ['3106200', '3106705'];
const PIB_DATASETS = ['IBGE_SIDRA_5938', 'IBGE_PIB_MUNICIPIOS_BASE'];
type AdminClient = ReturnType<typeof createAdminClient>;

function loadEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function snapshot(client: AdminClient) {
  const territories = await client.from('territories').select('id,codigo_ibge,municipio').in('codigo_ibge', PILOTS);
  if (territories.error) throw new Error(territories.error.message);
  const rows = territories.data ?? [];
  const ids = rows.map((row) => row.id);
  const [indicators, evidence] = await Promise.all([
    client.from('territory_indicators').select('id,territory_id,indicador,source_dataset,periodo_inicio,periodo_fim').in('territory_id', ids).eq('categoria', 'economia').in('source_dataset', [...PIB_DATASETS, 'SICONFI_DCA']),
    client.from('territory_evidence').select('id,territory_id,source_hash,source_name,source_external_id').in('territory_id', ids).eq('tema', 'economia'),
  ]);
  if (indicators.error) throw new Error(indicators.error.message);
  if (evidence.error) throw new Error(evidence.error.message);
  return rows.map((territory) => {
    const territoryIndicators = (indicators.data ?? []).filter((row) => row.territory_id === territory.id);
    const territoryEvidence = (evidence.data ?? []).filter((row) => row.territory_id === territory.id && ['Tesouro/SICONFI', 'IBGE/SIDRA', 'IBGE/PIB dos Municípios'].includes(String(row.source_name)));
    const naturalKeys = territoryIndicators.map((row) => `${row.indicador}|${row.source_dataset}|${row.periodo_inicio}|${row.periodo_fim}`);
    const evidenceKeys = territoryEvidence.map((row) => String(row.source_hash));
    return {
      codigoIbge: territory.codigo_ibge, municipio: territory.municipio,
      pibIndicators: territoryIndicators.filter((row) => PIB_DATASETS.includes(String(row.source_dataset))).length,
      siconfiIndicators: territoryIndicators.filter((row) => row.source_dataset === 'SICONFI_DCA').length,
      evidence: territoryEvidence.length,
      indicatorDuplicates: naturalKeys.length - new Set(naturalKeys).size,
      evidenceDuplicates: evidenceKeys.length - new Set(evidenceKeys).size,
    };
  }).sort((a, b) => String(a.codigoIbge).localeCompare(String(b.codigoIbge)));
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as AdminClient;
  const before = await snapshot(client);
  const executions = [];
  for (const codigoIbge of TARGETS) {
    const pib = await runPibMunicipalCollection(client, { codigoIbge });
    const siconfi = await runEconomyCollection(client, { codigoIbge });
    executions.push({ codigoIbge, pib: { status: pib.status, recordsPersisted: pib.recordsPersisted, evidencePersisted: pib.evidencePersisted, warnings: pib.warnings }, siconfi: { status: siconfi.status, recordsPersisted: siconfi.recordsPersisted, evidencePersisted: siconfi.evidencePersisted } });
  }
  const after = await snapshot(client);
  const result = { before, executions, after, pilotsReady: after.length === 3 && after.every((item) => item.pibIndicators > 0 && item.siconfiIndicators > 0 && item.evidence > 0 && item.indicatorDuplicates === 0 && item.evidenceDuplicates === 0) };
  fs.writeFileSync('/private/tmp/data-critical-01-economy-pilots.json', `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
