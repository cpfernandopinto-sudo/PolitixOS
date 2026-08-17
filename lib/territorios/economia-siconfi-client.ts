export const SICONFI_DCA_URL = 'https://apidatalake.tesouro.gov.br/ords/cdwhprd/siconfi/tt/dca';
export const SICONFI_PAGE_SIZE = 5000;
export const SICONFI_MAX_PAGES = 10;
export const SICONFI_MAX_ATTEMPTS_PER_PAGE = 3;
export const SICONFI_MIN_REQUEST_INTERVAL_MS = 1000;

const TRANSIENT_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface SiconfiDcaRow {
  exercicio: number;
  instituicao: string;
  cod_ibge: number;
  uf: string;
  anexo: string;
  rotulo: string;
  coluna: string;
  cod_conta: string;
  conta: string;
  valor: number | string | null;
  populacao: number | null;
}

interface SiconfiDcaPayload {
  items?: SiconfiDcaRow[];
  hasMore?: boolean;
  count?: number;
  limit?: number;
  offset?: number;
}

export interface FetchSiconfiDcaOptions {
  maxPages?: number;
  maxAttemptsPerPage?: number;
  retryBaseDelayMs?: number;
  requestIntervalMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

function validateInput(codigoIbge: string, referenceYear: number): void {
  if (!/^\d{7}$/.test(codigoIbge)) throw new Error('INVALID_CODIGO_IBGE');
  if (!Number.isInteger(referenceYear) || referenceYear < 2013 || referenceYear > 2100) throw new Error('INVALID_REFERENCE_YEAR');
}

function isTransientNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError'));
}

async function fetchPage(url: URL, fetcher: typeof fetch, options: Required<Pick<FetchSiconfiDcaOptions, 'maxAttemptsPerPage' | 'retryBaseDelayMs' | 'sleep'>>): Promise<Response> {
  for (let attempt = 1; attempt <= options.maxAttemptsPerPage; attempt++) {
    try {
      const response = await fetcher(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(60_000) });
      if (response.ok) return response;
      if (!TRANSIENT_HTTP_STATUS.has(response.status) || attempt === options.maxAttemptsPerPage) throw new Error(`SICONFI_HTTP_${response.status}`);
    } catch (error) {
      if (!isTransientNetworkError(error) || attempt === options.maxAttemptsPerPage) throw error;
    }
    await options.sleep(options.retryBaseDelayMs * 2 ** (attempt - 1));
  }
  throw new Error('SICONFI_RETRY_EXHAUSTED');
}

export async function fetchSiconfiDca(
  codigoIbge: string,
  referenceYear: number,
  fetcher: typeof fetch = fetch,
  options: FetchSiconfiDcaOptions = {},
): Promise<{ rows: SiconfiDcaRow[]; pages: number; rawRecords: number; fetchedAt: string; statusCodes: number[] }> {
  validateInput(codigoIbge, referenceYear);
  const maxPages = options.maxPages ?? SICONFI_MAX_PAGES;
  const requestIntervalMs = options.requestIntervalMs ?? SICONFI_MIN_REQUEST_INTERVAL_MS;
  const sleep = options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  const retryOptions = { maxAttemptsPerPage: options.maxAttemptsPerPage ?? SICONFI_MAX_ATTEMPTS_PER_PAGE, retryBaseDelayMs: options.retryBaseDelayMs ?? 500, sleep };
  const rows: SiconfiDcaRow[] = [];
  const statusCodes: number[] = [];
  let pages = 0;
  let offset = 0;
  for (;;) {
    if (pages >= maxPages) throw new Error('SICONFI_PAGINATION_LIMIT');
    const url = new URL(SICONFI_DCA_URL);
    url.searchParams.set('an_exercicio', String(referenceYear));
    url.searchParams.set('id_ente', codigoIbge);
    url.searchParams.set('offset', String(offset));
    const response = await fetchPage(url, fetcher, retryOptions);
    statusCodes.push(response.status);
    const payload = await response.json() as SiconfiDcaPayload;
    if (!Array.isArray(payload.items) || typeof payload.hasMore !== 'boolean') throw new Error('SICONFI_INVALID_PAYLOAD');
    const pageRows = payload.items.filter((row) => String(row.cod_ibge) === codigoIbge && Number(row.exercicio) === referenceYear);
    rows.push(...pageRows);
    pages++;
    if (!payload.hasMore) break;
    const pageLimit = Number(payload.limit) || SICONFI_PAGE_SIZE;
    offset = Number(payload.offset ?? offset) + pageLimit;
    await sleep(requestIntervalMs);
  }
  return { rows, pages, rawRecords: rows.length, fetchedAt: new Date().toISOString(), statusCodes };
}

export async function fetchSiconfiDcaHistory(
  codigoIbge: string,
  referenceYears: number[],
  fetcher: typeof fetch = fetch,
  options: FetchSiconfiDcaOptions = {},
): Promise<Array<{ referenceYear: number; rows: SiconfiDcaRow[]; pages: number; rawRecords: number; fetchedAt: string; statusCodes: number[] }>> {
  const years = [...new Set(referenceYears)].sort((a, b) => a - b);
  if (years.length === 0) throw new Error('REFERENCE_YEARS_REQUIRED');
  const sleep = options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  const interval = options.requestIntervalMs ?? SICONFI_MIN_REQUEST_INTERVAL_MS;
  const results = [];
  for (let index = 0; index < years.length; index++) {
    if (index > 0) await sleep(interval);
    results.push({ referenceYear: years[index], ...await fetchSiconfiDca(codigoIbge, years[index], fetcher, { ...options, sleep }) });
  }
  return results;
}
