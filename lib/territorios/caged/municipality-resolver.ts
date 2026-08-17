import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CagedError } from './core';

const IBGE_MUNICIPALITIES_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';

export interface MunicipalityDictionaryMetadata { source: string; collectedAt: string; sha256: string; entries: number; }

export class CagedMunicipalityResolver {
  constructor(private readonly byCagedCode: Map<string, string>, public readonly metadata: MunicipalityDictionaryMetadata) {}

  resolve(cagedCode: string): string | null { return this.byCagedCode.get(cagedCode) ?? null; }

  static fromIbgeRows(rows: Array<{ id: number | string }>, collectedAt = new Date().toISOString()): CagedMunicipalityResolver {
    const sorted = rows.map((row) => String(row.id)).filter((id) => /^\d{7}$/.test(id)).sort();
    const map = new Map<string, string>();
    for (const ibgeCode of sorted) {
      const cagedCode = ibgeCode.slice(0, 6);
      if (map.has(cagedCode) && map.get(cagedCode) !== ibgeCode) throw new CagedError('CAGED_INVALID_MUNICIPALITY', `Colisão no dicionário municipal: ${cagedCode}`);
      map.set(cagedCode, ibgeCode);
    }
    const sha256 = createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
    return new CagedMunicipalityResolver(map, { source: IBGE_MUNICIPALITIES_URL, collectedAt, sha256, entries: map.size });
  }
}

export async function loadOfficialMunicipalityResolver(cacheRoot: string, fetcher: typeof fetch = fetch): Promise<CagedMunicipalityResolver> {
  const cachePath = path.join(cacheRoot, 'dictionaries', 'ibge-municipalities.json');
  try {
    const cached = JSON.parse(await fs.readFile(cachePath, 'utf8')) as { collectedAt: string; rows: Array<{ id: number }> };
    return CagedMunicipalityResolver.fromIbgeRows(cached.rows, cached.collectedAt);
  } catch { /* cache miss */ }
  const response = await fetcher(IBGE_MUNICIPALITIES_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new CagedError('CAGED_DOWNLOAD_FAILED', `Dicionário IBGE indisponível: HTTP ${response.status}`);
  const rows = await response.json() as Array<{ id: number }>;
  const collectedAt = new Date().toISOString();
  const resolver = CagedMunicipalityResolver.fromIbgeRows(rows, collectedAt);
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  const partial = `${cachePath}.partial`;
  await fs.writeFile(partial, JSON.stringify({ collectedAt, source: IBGE_MUNICIPALITIES_URL, rows }));
  await fs.rename(partial, cachePath);
  return resolver;
}

