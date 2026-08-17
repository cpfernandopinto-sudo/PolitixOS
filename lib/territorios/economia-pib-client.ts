import iconv from 'iconv-lite';
import unzipper from 'unzipper';
import { fetchIbgeJson, IbgeApiError } from './ibge-client';

export const PIB_SIDRA_TABLE = 5938;
export const PIB_SIDRA_VARIABLES = [37, 543, 498, 513, 516, 517, 520, 6575, 6574, 525, 528] as const;
export const PIB_SIDRA_DATASET = 'IBGE_SIDRA_5938';
export const PIB_BASE_DATASET = 'IBGE_PIB_MUNICIPIOS_BASE';

const AGGREGATES_BASE = 'https://servicodados.ibge.gov.br/api/v3/agregados';
const PIB_BASE_ROOT = 'https://ftp.ibge.gov.br/Pib_Municipios/2022_2023/base';
const PIB_BASE_FILES = [
  { id: '2002_2009', url: `${PIB_BASE_ROOT}/base_de_dados_2002_2009_txt.zip` },
  { id: '2010_2023', url: `${PIB_BASE_ROOT}/base_de_dados_2010_2023_txt.zip` },
] as const;
const defaultPerCapitaCache = new Map<string, Promise<OfficialPibPerCapitaRow[]>>();
const defaultZipCache = new Map<string, Promise<Buffer>>();

export type SidraSpecialValue = '-' | '..' | '...' | 'X' | 'range' | 'invalid';

export interface SidraPibSeries {
  variavel: string;
  unidade: string;
  resultados: Array<{
    series: Array<{
      localidade: { id: string; nome: string };
      serie: Record<string, string>;
    }>;
  }>;
}

export interface ParsedSidraValue {
  status: 'available' | 'absolute_zero' | 'rounded_zero' | 'not_applicable' | 'not_available' | 'suppressed' | 'range' | 'invalid';
  value: number | null;
  rawValue: string;
}

export interface OfficialPibPerCapitaRow {
  codigoIbge: string;
  municipio: string;
  year: number;
  pibPerCapita: number;
  officialPibThousandBrl: number;
  sourceFile: string;
  sourceUrl: string;
  rawLineHashInput: string;
}

export interface FetchPibMunicipalResult {
  payload: SidraPibSeries[];
  sourceUrl: string;
}

export function parseSidraValue(rawInput: string): ParsedSidraValue {
  const rawValue = String(rawInput ?? '').trim();
  if (rawValue === '-') return { status: 'absolute_zero', value: 0, rawValue };
  if (rawValue === '0') return { status: 'rounded_zero', value: 0, rawValue };
  if (rawValue === '..') return { status: 'not_applicable', value: null, rawValue };
  if (rawValue === '...') return { status: 'not_available', value: null, rawValue };
  if (rawValue.toUpperCase() === 'X') return { status: 'suppressed', value: null, rawValue };
  if (/^[A-WYZ]$/i.test(rawValue)) return { status: 'range', value: null, rawValue };
  const value = Number(rawValue);
  if (!rawValue || !Number.isFinite(value)) return { status: 'invalid', value: null, rawValue };
  return { status: 'available', value, rawValue };
}

export async function fetchPibMunicipalSidra(codigoIbge: string, fetcher: typeof fetch = fetch): Promise<FetchPibMunicipalResult> {
  if (!/^\d{7}$/.test(codigoIbge)) throw new Error('INVALID_CODIGO_IBGE');
  const sourceUrl = `${AGGREGATES_BASE}/${PIB_SIDRA_TABLE}/periodos/all/variaveis/${PIB_SIDRA_VARIABLES.join('%7C')}?localidades=N6[${codigoIbge}]`;
  const payload = await fetchIbgeJson<SidraPibSeries[]>(sourceUrl, fetcher);
  if (!Array.isArray(payload) || payload.length !== PIB_SIDRA_VARIABLES.length) {
    throw new IbgeApiError('invalid_response', `SIDRA 5938 retornou shape inválido para ${codigoIbge}`);
  }
  const localityIds = new Set(payload.flatMap((item) => item.resultados.flatMap((result) => result.series.map((series) => series.localidade.id))));
  if (localityIds.size !== 1 || !localityIds.has(codigoIbge)) {
    throw new IbgeApiError('invalid_response', `SIDRA 5938 não retornou o município ${codigoIbge}`);
  }
  return { payload, sourceUrl };
}

function fixedField(line: string, position: number, length: number): string {
  return line.slice(position - 1, position - 1 + length).trim();
}

/** Parser baseado no layout oficial incluído nos dois ZIPs (posições 1, 47, 55, 935 e 954). */
export function parseOfficialPibBaseLine(line: string, sourceFile: string, sourceUrl: string): OfficialPibPerCapitaRow | null {
  const yearRaw = fixedField(line, 1, 4);
  const codigoIbge = fixedField(line, 47, 7);
  if (!/^\d{4}$/.test(yearRaw) || !/^\d{7}$/.test(codigoIbge)) return null;
  const municipio = fixedField(line, 55, 40);
  const officialPibThousandBrl = Number(fixedField(line, 935, 18));
  const pibPerCapita = Number(fixedField(line, 954, 18));
  if (!municipio || !Number.isFinite(officialPibThousandBrl) || !Number.isFinite(pibPerCapita)) {
    throw new Error(`IBGE_PIB_BASE_INVALID_LAYOUT:${sourceFile}:${codigoIbge}:${yearRaw}`);
  }
  return {
    codigoIbge,
    municipio,
    year: Number(yearRaw),
    pibPerCapita,
    officialPibThousandBrl,
    sourceFile,
    sourceUrl,
    rawLineHashInput: line,
  };
}

async function downloadZip(url: string, fetcher: typeof fetch): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`IBGE_PIB_BASE_HTTP_${response.status}:${url}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error(`IBGE_PIB_BASE_TIMEOUT:${url}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getZip(url: string, fetcher: typeof fetch): Promise<Buffer> {
  if (fetcher !== fetch) return downloadZip(url, fetcher);
  const cached = defaultZipCache.get(url);
  if (cached) return cached;
  const pending = downloadZip(url, fetcher).catch((error) => {
    defaultZipCache.delete(url);
    throw error;
  });
  defaultZipCache.set(url, pending);
  return pending;
}

async function parseZipForMunicipio(buffer: Buffer, codigoIbge: string, sourceFile: string, sourceUrl: string): Promise<OfficialPibPerCapitaRow[]> {
  let directory: { files: Array<{ type: string; path: string; buffer(): Promise<Buffer> }> };
  try {
    directory = await unzipper.Open.buffer(buffer);
  } catch {
    throw new Error(`IBGE_PIB_BASE_INVALID_ZIP:${sourceFile}`);
  }
  const textFile = directory.files.find((file) => file.type === 'File' && file.path.toLowerCase().endsWith('.txt'));
  if (!textFile) throw new Error(`IBGE_PIB_BASE_TXT_NOT_FOUND:${sourceFile}`);
  const text = iconv.decode(await textFile.buffer(), 'latin1');
  const rows: OfficialPibPerCapitaRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (fixedField(line, 47, 7) !== codigoIbge) continue;
    const parsed = parseOfficialPibBaseLine(line, sourceFile, sourceUrl);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

async function fetchOfficialPibPerCapitaUncached(codigoIbge: string, fetcher: typeof fetch): Promise<OfficialPibPerCapitaRow[]> {
  const rows: OfficialPibPerCapitaRow[] = [];
  // Sequencial por desenho: cada TXT descompactado é grande; evita manter as duas bases em memória simultaneamente.
  for (const { id, url } of PIB_BASE_FILES) {
    const buffer = await getZip(url, fetcher);
    rows.push(...await parseZipForMunicipio(buffer, codigoIbge, `base_de_dados_${id}_txt.zip`, url));
  }
  rows.sort((a, b) => a.year - b.year);
  if (rows.length !== 22 || rows[0]?.year !== 2002 || rows.at(-1)?.year !== 2023) {
    throw new Error(`IBGE_PIB_BASE_INCOMPLETE:${codigoIbge}:${rows.length}`);
  }
  return rows;
}

export async function fetchOfficialPibPerCapita(codigoIbge: string, fetcher: typeof fetch = fetch): Promise<OfficialPibPerCapitaRow[]> {
  if (!/^\d{7}$/.test(codigoIbge)) throw new Error('INVALID_CODIGO_IBGE');
  if (fetcher !== fetch) return fetchOfficialPibPerCapitaUncached(codigoIbge, fetcher);
  const cached = defaultPerCapitaCache.get(codigoIbge);
  if (cached) return cached;
  const pending = fetchOfficialPibPerCapitaUncached(codigoIbge, fetcher).catch((error) => {
    defaultPerCapitaCache.delete(codigoIbge);
    throw error;
  });
  defaultPerCapitaCache.set(codigoIbge, pending);
  return pending;
}
