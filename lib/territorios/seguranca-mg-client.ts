// ---------------------------------------------------------------------------
// MinasGeraisSecurityAdapter — Motor Segurança Pública (Bloco 4.2).
// ---------------------------------------------------------------------------
// Fonte: Portal de Dados Abertos de Minas Gerais (CKAN), dataset
// "crimes-violentos" (SEJUSP-MG) — verificado tecnicamente no Bloco 4.1/4.2:
//
//   GET /api/3/action/package_show?id=crimes-violentos
//     → catálogo CKAN: metadados + lista de `resources` (1 CSV por ano,
//       2019-2026), cada um com { name, format, url, last_modified }.
//       Isto é uma API de CATÁLOGO, não de consulta por município/período —
//       o dado em si é um arquivo anual completo (todos os municípios, todos
//       os meses daquele ano, todas as naturezas) para download em lote.
//
//   GET <resource.url> (download direto do CSV)
//     → colunas reais: registros;natureza;municipio;cod_municipio;mes;ano;risp;rmbh
//       separador ';', 1 linha de cabeçalho, sem aspas/escaping observado.
//
// Diferente do Motor IBGE (API de consulta pontual), aqui SEMPRE baixamos o
// arquivo anual inteiro e filtramos localmente — nunca 1 request por
// município (Seção 2 do briefing do Bloco 4.2).
// ---------------------------------------------------------------------------

const CKAN_BASE = 'https://dados.mg.gov.br';
const CKAN_PACKAGE_SHOW_URL = `${CKAN_BASE}/api/3/action/package_show`;

export const CRIMES_VIOLENTOS_DATASET_ID = 'crimes-violentos';
export const CRIMES_VIOLENTOS_SOURCE = 'SEJUSP-MG';

const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

// User-Agent explícito: o WAF do portal (verificado no Bloco 4.1) rejeita
// requisições sem UA de navegador com 403, tanto na API de catálogo quanto
// no download dos recursos.
const REQUEST_USER_AGENT =
  'Mozilla/5.0 (compatible; PolitixOS-Territorios/1.0; +https://politix-os.vercel.app)';

export type SegurancaErrorKind =
  | 'timeout'
  | 'rate_limited'
  | 'server_error'
  | 'http_error'
  | 'invalid_response'
  | 'resource_not_found'
  | 'empty_file'
  | 'malformed_csv';

export class SegurancaSourceError extends Error {
  kind: SegurancaErrorKind;
  status?: number;

  constructor(kind: SegurancaErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'SegurancaSourceError';
    this.kind = kind;
    this.status = status;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** fetch com timeout, UA explícito e retry (backoff) para 429/5xx — mesma filosofia de `ibge-client.ts`. Sem retry para 4xx que não seja 429 (erro definitivo do chamador). */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: SegurancaSourceError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': REQUEST_USER_AGENT } });

      if (res.status === 429) {
        lastError = new SegurancaSourceError('rate_limited', `SEJUSP-MG respondeu 429 (rate limit) em ${url}`, 429);
      } else if (res.status >= 500) {
        lastError = new SegurancaSourceError('server_error', `SEJUSP-MG respondeu ${res.status} em ${url}`, res.status);
      } else if (!res.ok) {
        throw new SegurancaSourceError('http_error', `SEJUSP-MG respondeu ${res.status} em ${url}`, res.status);
      } else {
        return res;
      }
    } catch (err) {
      if (err instanceof SegurancaSourceError) {
        if (err.kind === 'http_error') throw err;
        lastError = err;
      } else if (err instanceof Error && err.name === 'AbortError') {
        lastError = new SegurancaSourceError('timeout', `Timeout (${FETCH_TIMEOUT_MS}ms) ao consultar SEJUSP-MG em ${url}`);
      } else {
        throw new SegurancaSourceError('http_error', `Falha de rede ao consultar SEJUSP-MG em ${url}: ${String(err)}`);
      }
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }

  throw lastError ?? new SegurancaSourceError('http_error', `Falha desconhecida ao consultar SEJUSP-MG em ${url}`);
}

// ─── Descoberta de recursos (CKAN) ────────────────────────────────────────

export interface CkanResource {
  id: string;
  name: string;
  format: string;
  url: string;
  last_modified: string | null;
}

interface CkanPackageShowResponse {
  success: boolean;
  result?: { resources: Array<{ id: string; name: string; format: string; url: string; last_modified: string | null }> };
}

/** Lista os recursos (1 CSV por ano) do dataset via CKAN Action API. Não baixa nenhum CSV — só o catálogo. */
export async function discoverResources(datasetId: string = CRIMES_VIOLENTOS_DATASET_ID): Promise<CkanResource[]> {
  const url = `${CKAN_PACKAGE_SHOW_URL}?id=${encodeURIComponent(datasetId)}`;
  const res = await fetchWithRetry(url);

  let payload: CkanPackageShowResponse;
  try {
    payload = (await res.json()) as CkanPackageShowResponse;
  } catch {
    throw new SegurancaSourceError('invalid_response', `Resposta não-JSON do catálogo CKAN em ${url}`);
  }

  if (!payload.success || !payload.result || !Array.isArray(payload.result.resources)) {
    throw new SegurancaSourceError('invalid_response', `Catálogo CKAN retornou payload inesperado para dataset "${datasetId}".`);
  }

  return payload.result.resources.map((r) => ({
    id: r.id,
    name: r.name,
    format: r.format,
    url: r.url,
    last_modified: r.last_modified ?? null,
  }));
}

/**
 * Seleciona, dentre os recursos descobertos, o CSV anual do ano pedido.
 * Falha explicitamente (sem fallback silencioso para outro ano) se não
 * encontrar exatamente 1 recurso CSV cujo nome contenha o ano — Seção 10 do
 * briefing do Bloco 4.2.
 */
export function selectResourceForYear(resources: CkanResource[], year: number): CkanResource {
  const candidates = resources.filter(
    (r) => r.format.toUpperCase() === 'CSV' && new RegExp(`\\b${year}\\b`).test(r.name)
  );

  if (candidates.length === 0) {
    throw new SegurancaSourceError(
      'resource_not_found',
      `Nenhum recurso CSV para o ano ${year} encontrado no dataset (recursos disponíveis: ${resources.map((r) => r.name).join(', ') || 'nenhum'}).`
    );
  }
  if (candidates.length > 1) {
    throw new SegurancaSourceError(
      'resource_not_found',
      `Mais de um recurso CSV corresponde ao ano ${year} — ambíguo, recusando escolher arbitrariamente (${candidates.map((r) => r.name).join(', ')}).`
    );
  }
  return candidates[0];
}

// ─── Download + parse do CSV ──────────────────────────────────────────────

export async function fetchAnnualCsv(url: string): Promise<string> {
  const res = await fetchWithRetry(url);
  const text = await res.text();
  if (!text || text.trim().length === 0) {
    throw new SegurancaSourceError('empty_file', `Arquivo CSV vazio em ${url}.`);
  }
  return text;
}

export interface CrimeViolentoRow {
  registros: number;
  natureza: string;
  municipio: string;
  cod_municipio: string;
  mes: number;
  ano: number;
  risp: string;
  rmbh: string;
}

const EXPECTED_COLUMNS = ['registros', 'natureza', 'municipio', 'cod_municipio', 'mes', 'ano', 'risp', 'rmbh'];

/**
 * Parser dedicado ao formato real do CSV da SEJUSP-MG (separador ';', sem
 * aspas/escaping). Não usa nenhuma biblioteca de CSV genérica — o formato é
 * simples e estável (verificado nos anos 2025/2026), e um parser dedicado
 * deixa a validação de colunas e os erros explícitos (Seção 9: nunca
 * silencioso). Resolve colunas pelo NOME do cabeçalho, não pela posição —
 * tolera reordenação de colunas pela fonte, mas não tolera colunas faltando.
 */
export function parseCrimesViolentosCsv(csvText: string): CrimeViolentoRow[] {
  const withoutBom = csvText.replace(/^﻿/, '');
  const lines = withoutBom.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new SegurancaSourceError('empty_file', 'CSV vazio (sem nenhuma linha).');
  }

  const header = lines[0].split(';').map((h) => h.trim().toLowerCase());
  const colIndex: Record<string, number> = {};
  for (const col of EXPECTED_COLUMNS) {
    const idx = header.indexOf(col);
    if (idx === -1) {
      throw new SegurancaSourceError(
        'malformed_csv',
        `Coluna obrigatória "${col}" não encontrada no cabeçalho do CSV (colunas presentes: ${header.join(', ')}).`
      );
    }
    colIndex[col] = idx;
  }

  if (lines.length === 1) {
    throw new SegurancaSourceError('empty_file', 'CSV contém apenas o cabeçalho, nenhuma linha de dado.');
  }

  const rows: CrimeViolentoRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(';');
    if (fields.length < EXPECTED_COLUMNS.length) {
      throw new SegurancaSourceError(
        'malformed_csv',
        `Linha ${i + 1} do CSV tem ${fields.length} coluna(s), esperado ao menos ${EXPECTED_COLUMNS.length} (linha: "${lines[i]}").`
      );
    }

    const registros = Number(fields[colIndex.registros]?.trim());
    const mes = Number(fields[colIndex.mes]?.trim());
    const ano = Number(fields[colIndex.ano]?.trim());

    if (!Number.isFinite(registros) || !Number.isFinite(mes) || !Number.isFinite(ano)) {
      throw new SegurancaSourceError(
        'malformed_csv',
        `Linha ${i + 1} do CSV tem valor numérico inválido (registros/mes/ano) (linha: "${lines[i]}").`
      );
    }

    rows.push({
      registros,
      natureza: fields[colIndex.natureza]?.trim() ?? '',
      municipio: fields[colIndex.municipio]?.trim() ?? '',
      cod_municipio: fields[colIndex.cod_municipio]?.trim() ?? '',
      mes,
      ano,
      risp: fields[colIndex.risp]?.trim() ?? '',
      rmbh: fields[colIndex.rmbh]?.trim() ?? '',
    });
  }

  return rows;
}
