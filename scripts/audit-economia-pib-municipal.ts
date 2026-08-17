import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { PIB_ECONOMY_ENGINE, runPibMunicipalCollection } from '../lib/territorios/economia-pib-collector';
import { fetchOfficialPibPerCapita, fetchPibMunicipalSidra, PIB_BASE_DATASET, PIB_SIDRA_DATASET } from '../lib/territorios/economia-pib-client';
import { normalizePibMunicipal } from '../lib/territorios/economia-pib-normalizer';

const MUNICIPALITIES = [
  { codigoIbge: '3118601', name: 'Contagem' },
  { codigoIbge: '3106705', name: 'Betim' },
  { codigoIbge: '3106200', name: 'Belo Horizonte' },
] as const;

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function snapshot(client: ReturnType<typeof createAdminClient>, territoryId: string) {
  const [indicators, evidence, runs, eco01] = await Promise.all([
    client.from('territory_indicators').select('id,indicador,valor,unidade,source_dataset,source_record_id,periodo_inicio,periodo_fim,metadata').eq('territory_id', territoryId).eq('categoria', 'economia').eq('fonte', 'IBGE').in('source_dataset', [PIB_SIDRA_DATASET, PIB_BASE_DATASET]).order('periodo_inicio'),
    client.from('territory_evidence').select('id,source_hash,source_external_id,source_name,published_at,raw_reference,metadata').eq('territory_id', territoryId).eq('tema', 'economia').in('source_name', ['IBGE/SIDRA', 'IBGE/PIB dos Municípios']),
    client.from('territory_collection_runs').select('id,status,items_collected,items_processed,items_discarded,error_message,metadata,created_at').eq('territory_id', territoryId).eq('source', 'ibge').eq('workflow_name', PIB_ECONOMY_ENGINE).order('created_at', { ascending: false }).limit(10),
    client.from('territory_indicators').select('id,indicador,source_dataset,periodo_inicio,periodo_fim').eq('territory_id', territoryId).eq('categoria', 'economia').eq('fonte', 'SICONFI').eq('source_dataset', 'SICONFI_DCA'),
  ]);
  for (const result of [indicators, evidence, runs, eco01]) if (result.error) throw new Error(result.error.message);
  return { indicators: indicators.data ?? [], evidence: evidence.data ?? [], runs: runs.data ?? [], eco01: eco01.data ?? [] };
}

function duplicates(rows: Array<Record<string, unknown>>, fields: string[]): number {
  const keys = rows.map((row) => fields.map((field) => String(row[field] ?? '')).join('|'));
  return keys.length - new Set(keys).size;
}

async function validateRealMunicipality(codigoIbge: string, name: string) {
  const start = performance.now();
  const [sidra, perCapita] = await Promise.all([fetchPibMunicipalSidra(codigoIbge), fetchOfficialPibPerCapita(codigoIbge)]);
  const normalized = normalizePibMunicipal(codigoIbge, sidra.payload, perCapita, sidra.sourceUrl);
  const latestPib = normalized.indicators.find((row) => row.indicator === 'pib_municipal_precos_correntes' && row.periodStart === '2023-01-01');
  const latestPerCapita = normalized.indicators.find((row) => row.indicator === 'pib_per_capita_precos_correntes' && row.periodStart === '2023-01-01');
  return { name, codigoIbge, status: 'PASS', elapsedMs: performance.now() - start, sidraVariables: sidra.payload.length, sidraCells: sidra.payload.reduce((sum, item) => sum + Object.keys(item.resultados[0].series[0].serie).length, 0), years: [2002, 2023], indicators: normalized.indicators.length, unavailable: normalized.unavailable.length, pib2023Brl: latestPib?.value, pibPerCapita2023Brl: latestPerCapita?.value };
}

export async function executePibMunicipalAudit() {
  loadLocalEnv();
  const integrations = [];
  for (const municipality of MUNICIPALITIES) integrations.push(await validateRealMunicipality(municipality.codigoIbge, municipality.name));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado em .env.local.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const territory = await client.from('territories').select('id,codigo_ibge,municipio,uf').eq('codigo_ibge', '3118601').single();
  if (territory.error) throw new Error(territory.error.message);
  const territoryId = String(territory.data.id);
  const before = await snapshot(client, territoryId);
  const run1 = await runPibMunicipalCollection(client, { codigoIbge: '3118601' });
  const afterRun1 = await snapshot(client, territoryId);
  const run2 = await runPibMunicipalCollection(client, { codigoIbge: '3118601' });
  const afterRun2 = await snapshot(client, territoryId);
  const sample = (afterRun2.indicators as Array<Record<string, unknown>>).filter((row) => row.periodo_inicio === '2023-01-01' || String(row.periodo_inicio).startsWith('2023'));
  const result = {
    integrations,
    territory: territory.data,
    before: { indicators: before.indicators.length, evidence: before.evidence.length, runs: before.runs.length, eco01Indicators: before.eco01.length },
    run1,
    afterRun1: { indicators: afterRun1.indicators.length, evidence: afterRun1.evidence.length, eco01Indicators: afterRun1.eco01.length },
    run2,
    afterRun2: { indicators: afterRun2.indicators.length, evidence: afterRun2.evidence.length, eco01Indicators: afterRun2.eco01.length },
    audit: {
      indicatorNaturalKeyDuplicates: duplicates(afterRun2.indicators as Array<Record<string, unknown>>, ['indicador', 'source_dataset', 'periodo_inicio', 'periodo_fim']),
      evidenceHashDuplicates: duplicates(afterRun2.evidence as Array<Record<string, unknown>>, ['source_hash']),
      secondRunAddedIndicators: afterRun2.indicators.length - afterRun1.indicators.length,
      secondRunAddedEvidence: afterRun2.evidence.length - afterRun1.evidence.length,
      eco01CountChanged: afterRun2.eco01.length - before.eco01.length,
    },
    sample2023: sample.map((row) => ({ indicador: row.indicador, valor: row.valor, unidade: row.unidade, source_dataset: row.source_dataset, raw_value: (row.metadata as Record<string, unknown>)?.raw_value, raw_unit: (row.metadata as Record<string, unknown>)?.raw_unit })),
    recentRuns: afterRun2.runs.slice(0, 2),
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.endsWith('audit-economia-pib-municipal.ts')) executePibMunicipalAudit().catch((error) => { console.error(error); process.exitCode = 1; });

