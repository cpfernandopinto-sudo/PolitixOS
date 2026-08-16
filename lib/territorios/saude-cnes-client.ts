export const CNES_ESTABLISHMENTS_URL = 'https://apidadosabertos.saude.gov.br/cnes/estabelecimentos';
export const CNES_PAGE_SIZE = 20;
export const CNES_MAX_PAGES = 1000;
export const CNES_MAX_ATTEMPTS_PER_PAGE = 3;

const TRANSIENT_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface CnesEstablishment {
  codigo_cnes: number;
  codigo_municipio: number;
  codigo_tipo_unidade: number;
  estabelecimento_faz_atendimento_ambulatorial_sus: string | null;
  estabelecimento_possui_centro_cirurgico: number;
  estabelecimento_possui_centro_obstetrico: number;
  estabelecimento_possui_centro_neonatal: number;
  estabelecimento_possui_atendimento_hospitalar: number;
  estabelecimento_possui_servico_apoio: number;
  estabelecimento_possui_atendimento_ambulatorial: number;
  data_atualizacao: string;
}

export function codigoIbgeToCnesMunicipio(codigoIbge: string): string {
  if (!/^\d{7}$/.test(codigoIbge)) throw new Error('INVALID_CODIGO_IBGE');
  return codigoIbge.slice(0, 6);
}

export interface FetchCnesOptions {
  maxPages?: number;
  maxAttemptsPerPage?: number;
  retryBaseDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

function isTransientNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError'));
}

async function fetchPage(url: URL, fetcher: typeof fetch, options: Required<Pick<FetchCnesOptions, 'maxAttemptsPerPage' | 'retryBaseDelayMs' | 'sleep'>>): Promise<Response> {
  for (let attempt = 1; attempt <= options.maxAttemptsPerPage; attempt++) {
    try {
      const response = await fetcher(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
      if (response.ok) return response;
      if (!TRANSIENT_HTTP_STATUS.has(response.status) || attempt === options.maxAttemptsPerPage) throw new Error(`CNES_HTTP_${response.status}`);
    } catch (error) {
      if (!isTransientNetworkError(error) || attempt === options.maxAttemptsPerPage) throw error;
    }
    await options.sleep(options.retryBaseDelayMs * 2 ** (attempt - 1));
  }
  throw new Error('CNES_RETRY_EXHAUSTED');
}

export async function fetchCnesEstablishments(codigoIbge: string, fetcher: typeof fetch = fetch, options: FetchCnesOptions = {}): Promise<{ rows: CnesEstablishment[]; pages: number; fetchedAt: string }> {
  const codigoMunicipio = codigoIbgeToCnesMunicipio(codigoIbge);
  const maxPages = options.maxPages ?? CNES_MAX_PAGES;
  const retryOptions = {
    maxAttemptsPerPage: options.maxAttemptsPerPage ?? CNES_MAX_ATTEMPTS_PER_PAGE,
    retryBaseDelayMs: options.retryBaseDelayMs ?? 250,
    sleep: options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs))),
  };
  const rows: CnesEstablishment[] = [];
  let pages = 0;
  for (let offset = 0; ; offset += CNES_PAGE_SIZE) {
    if (pages >= maxPages) throw new Error('CNES_PAGINATION_LIMIT');
    const url = new URL(CNES_ESTABLISHMENTS_URL);
    url.searchParams.set('codigo_municipio', codigoMunicipio);
    url.searchParams.set('status', '1');
    url.searchParams.set('limit', String(CNES_PAGE_SIZE));
    url.searchParams.set('offset', String(offset));
    const response = await fetchPage(url, fetcher, retryOptions);
    const payload = await response.json() as { estabelecimentos?: CnesEstablishment[] };
    if (!Array.isArray(payload.estabelecimentos)) throw new Error('CNES_INVALID_PAYLOAD');
    pages++;
    const page = payload.estabelecimentos.filter((item) => String(item.codigo_municipio) === codigoMunicipio);
    rows.push(...page);
    if (payload.estabelecimentos.length < CNES_PAGE_SIZE) break;
  }
  const unique = [...new Map(rows.map((item) => [String(item.codigo_cnes), item])).values()];
  return { rows: unique, pages, fetchedAt: new Date().toISOString() };
}
