import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { getCanonicalRegion } from '../lib/territorios/regional-registry';

function loadLocalEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function paginated<T>(query: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await query(start, start + 999);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if ((data ?? []).length < 1000) return all;
  }
}

function duplicateCount(values: string[]): number {
  return values.length - new Set(values).size;
}

async function main() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const region = getCanonicalRegion('RMBH');
  const codes = region.territories.map((item) => item.ibgeCode);
  const { data: territories, error: territoryError } = await client.from('territories').select('id,codigo_ibge,municipio,uf').in('codigo_ibge', codes);
  if (territoryError) throw territoryError;
  const ids = (territories ?? []).map((item) => item.id);
  const indicators = await paginated<Record<string, unknown>>((start, end) => client.from('territory_indicators')
    .select('id,territory_id,indicador,source_dataset,periodo_inicio,periodo_fim,fonte,categoria')
    .in('territory_id', ids).eq('categoria', 'eleicoes').eq('fonte', 'TSE').range(start, end));
  const evidence = await paginated<Record<string, unknown>>((start, end) => client.from('territory_evidence')
    .select('id,territory_id,source_hash,source_name,tema').in('territory_id', ids).eq('tema', 'eleicoes').eq('source_name', 'TSE').range(start, end));
  const runs = await paginated<Record<string, unknown>>((start, end) => client.from('territory_collection_runs')
    .select('id,territory_id,status,request_id,started_at,finished_at').in('territory_id', ids).eq('source', 'tse').range(start, end));
  const indicatorKeys = indicators.map((item) => [item.territory_id, item.indicador, item.source_dataset, item.periodo_inicio, item.periodo_fim].join('|'));
  const evidenceKeys = evidence.map((item) => [item.territory_id, item.source_hash].join('|'));
  const byIbge = new Map((territories ?? []).map((item) => [item.codigo_ibge, item]));
  const sanity = ['3118601', '3106200', '3106705'].map((ibge) => {
    const territory = byIbge.get(ibge);
    const municipalityIndicators = indicators.filter((item) => item.territory_id === territory?.id);
    const municipalityEvidence = evidence.filter((item) => item.territory_id === territory?.id);
    const years = new Set(municipalityIndicators.map((item) => String(item.periodo_inicio).slice(0, 4)));
    return {
      ibge,
      municipality: territory?.municipio ?? null,
      indicators: municipalityIndicators.length,
      evidence: municipalityEvidence.length,
      years: [...years].sort(),
      pass: Boolean(territory) && [2016, 2020, 2024].every((year) => years.has(String(year))) && municipalityIndicators.length > 0 && municipalityEvidence.length === 5,
    };
  });
  console.log(JSON.stringify({
    expectedMunicipalities: 34,
    catalogMunicipalities: territories?.length ?? 0,
    externalMunicipalities: (territories ?? []).filter((item) => !codes.includes(item.codigo_ibge)).length,
    duplicateIbge: duplicateCount(codes),
    indicators: indicators.length,
    evidence: evidence.length,
    collectionRuns: runs.length,
    indicatorDuplicates: duplicateCount(indicatorKeys),
    evidenceDuplicates: duplicateCount(evidenceKeys),
    runningOrphans: runs.filter((item) => item.status === 'running').length,
    sanity,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

