import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { compareRegionClassification, getCanonicalRegion } from '../lib/territorios/regional-registry';

function loadLocalEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const region = getCanonicalRegion('RMBH');
  const codes = region.territories.map((item) => item.ibgeCode);
  const { data: catalog, error: catalogError } = await client.from('territories').select('id,codigo_ibge,municipio,uf').in('codigo_ibge', codes);
  if (catalogError) throw catalogError;
  const territoryIdByIbge = new Map((catalog ?? []).map((item) => [item.codigo_ibge, item.id]));
  const ids = [...territoryIdByIbge.values()];
  const securityByIbge = new Map<string, boolean>();
  for (let start = 0; ; start += 1000) {
    const { data, error } = await client.from('territory_indicators')
      .select('territory_id,metadata').in('territory_id', ids).eq('categoria', 'seguranca_publica').eq('fonte', 'SEJUSP-MG').range(start, start + 999);
    if (error) throw error;
    for (const row of data ?? []) {
      const ibge = [...territoryIdByIbge.entries()].find(([, id]) => id === row.territory_id)?.[0];
      if (!ibge) continue;
      const member = String(row.metadata?.rmbh ?? '').trim().toUpperCase() === 'SIM';
      if (!securityByIbge.has(ibge)) securityByIbge.set(ibge, member);
      else if (securityByIbge.get(ibge) !== member) throw new Error(`Classificação SEJUSP inconsistente dentro do município ${ibge}.`);
    }
    if ((data ?? []).length < 1000) break;
  }
  const catalogByIbge = new Map((catalog ?? []).map((item) => [item.codigo_ibge, item]));
  const matrix = region.territories.map((canonical) => ({
    ibge: canonical.ibgeCode,
    municipality: canonical.name,
    territories: catalogByIbge.has(canonical.ibgeCode),
    security: securityByIbge.has(canonical.ibgeCode) ? (securityByIbge.get(canonical.ibgeCode) ? 'SIM' : 'NÃO') : 'SEM DADO',
    tse: catalogByIbge.get(canonical.ibgeCode)?.id ? 'RESOLVÍVEL PELO CATÁLOGO' : 'NÃO RESOLVÍVEL',
    divergence: securityByIbge.get(canonical.ibgeCode) !== true,
  }));
  console.log(JSON.stringify({
    region: { code: region.code, version: region.version, authority: region.authority, legalBasis: region.legalBasis, sourceUrl: region.sourceUrl },
    total: region.territories.length,
    catalogMatches: catalog?.length ?? 0,
    duplicateIbge: region.territories.length - new Set(codes).size,
    outsideMg: region.territories.filter((item) => item.uf !== 'MG').length,
    divergences: compareRegionClassification('RMBH', securityByIbge),
    matrix,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
