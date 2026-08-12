import { createHash } from 'node:crypto';
import iconv from 'iconv-lite';
import { parse } from 'csv-parse/sync';
import unzipper from 'unzipper';

export const TSE_PROVIDER = 'Tribunal Superior Eleitoral';
export const TSE_LICENSE = 'Creative Commons Atribuição';
export const TSE_PORTAL_URL = 'https://dadosabertos.tse.jus.br';
export const TSE_RESULTS_DATASET = 'Resultados';

export type TseDatasetKind = 'detail' | 'candidate' | 'party';

export interface TseSourceDescriptor {
  provider: typeof TSE_PROVIDER;
  dataset: string;
  officialName: string;
  sourceUrl: string;
  referencePeriod: string;
  territorialGranularity: 'municipio_zona';
  updateFrequency: 'uma_vez_por_pleito';
  license: typeof TSE_LICENSE;
  status: 'OFFICIAL';
}

export interface TseCacheMetadata {
  key: string;
  sha256: string;
  downloadedAt: string;
  expiresAt: string;
  byteLength: number;
  cacheHit: boolean;
}

export interface TseCsvResource {
  rows: Record<string, string>[];
  rowsByMunicipality: Map<string, Record<string, string>[]>;
  source: TseSourceDescriptor;
  collectedAt: string;
  cache: TseCacheMetadata;
}

export interface TseCacheStats {
  downloads: number;
  hits: number;
  misses: number;
  parses: number;
  parseMs: number;
  downloadedBytes: number;
}

const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const resourceCache = new Map<string, { expiresAtMs: number; promise: Promise<TseCsvResource> }>();
const cacheStats: TseCacheStats = { downloads: 0, hits: 0, misses: 0, parses: 0, parseMs: 0, downloadedBytes: 0 };

export function getTseCacheKey(year: number, uf: string, kind: TseDatasetKind): string {
  return `tse:${kind}:${year}:${uf.trim().toUpperCase()}`;
}

export function getTseCacheStats(): TseCacheStats {
  return { ...cacheStats };
}

export function clearTseProcessCache(): void {
  resourceCache.clear();
  Object.assign(cacheStats, { downloads: 0, hits: 0, misses: 0, parses: 0, parseMs: 0, downloadedBytes: 0 });
}

export class TseSourceError extends Error {
  constructor(
    public readonly kind: 'network' | 'http' | 'zip' | 'csv' | 'layout',
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'TseSourceError';
  }
}

export function getTseSourceDescriptor(year: number, kind: TseDatasetKind): TseSourceDescriptor {
  const paths: Record<TseDatasetKind, { folder: string; file: string; name: string }> = {
    detail: {
      folder: 'detalhe_votacao_munzona',
      file: `detalhe_votacao_munzona_${year}.zip`,
      name: 'Detalhe da apuração por município e zona',
    },
    candidate: {
      folder: 'votacao_candidato_munzona',
      file: `votacao_candidato_munzona_${year}.zip`,
      name: 'Votação nominal por município e zona',
    },
    party: {
      folder: 'votacao_partido_munzona',
      file: `votacao_partido_munzona_${year}.zip`,
      name: 'Votação em partido por município e zona',
    },
  };
  const item = paths[kind];
  return {
    provider: TSE_PROVIDER,
    dataset: `${item.folder}_${year}`,
    officialName: item.name,
    sourceUrl: `https://cdn.tse.jus.br/estatistica/sead/odsele/${item.folder}/${item.file}`,
    referencePeriod: String(year),
    territorialGranularity: 'municipio_zona',
    updateFrequency: 'uma_vez_por_pleito',
    license: TSE_LICENSE,
    status: 'OFFICIAL',
  };
}

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').trim();
}

async function fetchAndParseTseCsv(year: number, uf: string, kind: TseDatasetKind, cacheKey: string, ttlMs: number): Promise<TseCsvResource> {
  const source = getTseSourceDescriptor(year, kind);
  let response: Response;
  try {
    response = await fetch(source.sourceUrl, { cache: 'no-store', signal: AbortSignal.timeout(45_000) });
  } catch (error) {
    throw new TseSourceError('network', `Falha ao baixar ${source.dataset}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) {
    throw new TseSourceError('http', `TSE respondeu HTTP ${response.status} para ${source.dataset}.`, response.status);
  }

  const zipBuffer = Buffer.from(await response.arrayBuffer());
  const downloadedAt = new Date().toISOString();
  const sha256 = createHash('sha256').update(zipBuffer).digest('hex');
  cacheStats.downloads++;
  cacheStats.downloadedBytes += zipBuffer.byteLength;

  let directory: { files: Array<{ path: string; type: string; buffer(): Promise<Buffer> }> };
  try {
    directory = await unzipper.Open.buffer(zipBuffer);
  } catch (error) {
    throw new TseSourceError('zip', `ZIP inválido em ${source.dataset}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const suffix = `_${uf.toUpperCase()}.csv`;
  const entry = directory.files.find((file) => file.type === 'File' && file.path.toUpperCase().endsWith(suffix.toUpperCase()));
  if (!entry) throw new TseSourceError('zip', `Arquivo ${suffix} não encontrado em ${source.dataset}.`);

  try {
    const parseStartedAt = performance.now();
    const csv = iconv.decode(await entry.buffer(), 'latin1');
    const rows = parse(csv, {
      columns: (headers: string[]) => headers.map(normalizeHeader),
      delimiter: ';',
      quote: '"',
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }) as Record<string, string>[];
    const rowsByMunicipality = new Map<string, Record<string, string>[]>();
    for (const row of rows) {
      const code = row.CD_MUNICIPIO;
      if (!code) continue;
      const municipalRows = rowsByMunicipality.get(code);
      if (municipalRows) municipalRows.push(row);
      else rowsByMunicipality.set(code, [row]);
    }
    cacheStats.parses++;
    cacheStats.parseMs += performance.now() - parseStartedAt;
    return {
      rows,
      rowsByMunicipality,
      source,
      collectedAt: downloadedAt,
      cache: {
        key: cacheKey,
        sha256,
        downloadedAt,
        expiresAt: new Date(Date.now() + ttlMs).toISOString(),
        byteLength: zipBuffer.byteLength,
        cacheHit: false,
      },
    };
  } catch (error) {
    throw new TseSourceError('csv', `CSV inválido em ${source.dataset}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function downloadTseCsv(
  year: number,
  uf: string,
  kind: TseDatasetKind,
  options: { ttlMs?: number; forceRefresh?: boolean } = {}
): Promise<TseCsvResource> {
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;
  const cacheKey = getTseCacheKey(year, uf, kind);
  const now = Date.now();
  const cached = resourceCache.get(cacheKey);
  if (!options.forceRefresh && cached && cached.expiresAtMs > now) {
    cacheStats.hits++;
    const resource = await cached.promise;
    return { ...resource, cache: { ...resource.cache, cacheHit: true } };
  }

  cacheStats.misses++;
  const promise = fetchAndParseTseCsv(year, uf, kind, cacheKey, ttlMs);
  resourceCache.set(cacheKey, { expiresAtMs: now + ttlMs, promise });
  try {
    return await promise;
  } catch (error) {
    if (resourceCache.get(cacheKey)?.promise === promise) resourceCache.delete(cacheKey);
    throw error;
  }
}
