// ---------------------------------------------------------------------------
// Cliente da API oficial do IBGE — Politix Territórios, Motor IBGE (Bloco 3).
// ---------------------------------------------------------------------------
// Endpoints usados (API de Localidades v1 + Agregados/SIDRA v3, ambos
// públicos, sem chave de autenticação):
//
//   GET /api/v1/localidades/estados
//     → lista de UFs: [{ id, sigla, nome, regiao: { id, sigla, nome } }]
//
//   GET /api/v1/localidades/estados/{UF}/municipios
//     → municípios de uma UF: [{ id, nome, microrregiao: { ...mesorregiao:
//       { ...UF: { ...regiao } } }, "regiao-imediata": { ...
//       "regiao-intermediaria": { ...UF } } }]
//     `id` é o codigo_ibge de 7 dígitos.
//
//   GET /api/v1/localidades/municipios/{codigoIbge}
//     → um único município, mesmo formato do item acima (modo `single`).
//
//   GET /api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[...]
//     → SIDRA, tabela 6579 "População residente estimada", variável 9324
//       (unidade: Pessoas, periodicidade anual). `periodos/-1` = período
//       mais recente disponível. `N6[N3[{ufId}]]` retorna a UF inteira em
//       uma única chamada (testado: 853/853 municípios de MG em 1 request);
//       `N6[{codigoIbge}]` retorna um único município.
//
// Limitações conhecidas: sem SLA público documentado, sujeito a rate limit
// não documentado numericamente (por isso o retry com backoff abaixo).
// `periodos/-1` pode retornar ano diferente para tabelas diferentes — o ano
// efetivo devolvido pela API é sempre lido do payload (nunca fixado no
// código), fica registrado em `source_updated_at`/`periodo_*` de cada
// indicador persistido pelo coletor.
// ---------------------------------------------------------------------------

const LOCALIDADES_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const AGREGADOS_BASE = 'https://servicodados.ibge.gov.br/api/v3/agregados';

export const POPULACAO_TABELA = 6579;
export const POPULACAO_VARIAVEL = 9324;

const FETCH_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

export type IbgeErrorKind = 'timeout' | 'rate_limited' | 'server_error' | 'http_error' | 'invalid_response';

export class IbgeApiError extends Error {
  kind: IbgeErrorKind;
  status?: number;

  constructor(kind: IbgeErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'IbgeApiError';
    this.kind = kind;
    this.status = status;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch com timeout, classificação de erro e retry controlado (backoff
 * exponencial simples) para 429 e 5xx. NÃO faz retry para 4xx que não seja
 * 429 (UF/codigo inexistente, por exemplo, é erro definitivo do chamador).
 * Retry é limitado a MAX_RETRIES — nunca infinito (Seção 14 do briefing).
 */
export async function fetchIbgeJson<T>(url: string, fetcher: typeof fetch = fetch): Promise<T> {
  let lastError: IbgeApiError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetcher(url, { signal: controller.signal });

      if (res.status === 429) {
        lastError = new IbgeApiError('rate_limited', `IBGE respondeu 429 (rate limit) em ${url}`, 429);
      } else if (res.status >= 500) {
        lastError = new IbgeApiError('server_error', `IBGE respondeu ${res.status} em ${url}`, res.status);
      } else if (!res.ok) {
        throw new IbgeApiError('http_error', `IBGE respondeu ${res.status} em ${url}`, res.status);
      } else {
        try {
          return (await res.json()) as T;
        } catch {
          throw new IbgeApiError('invalid_response', `Resposta não-JSON do IBGE em ${url}`);
        }
      }
    } catch (err) {
      if (err instanceof IbgeApiError) {
        if (err.kind === 'http_error' || err.kind === 'invalid_response') throw err;
        lastError = err;
      } else if (err instanceof Error && err.name === 'AbortError') {
        lastError = new IbgeApiError('timeout', `Timeout (${FETCH_TIMEOUT_MS}ms) ao consultar IBGE em ${url}`);
      } else {
        throw new IbgeApiError('http_error', `Falha de rede ao consultar IBGE em ${url}: ${String(err)}`);
      }
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }

  throw lastError ?? new IbgeApiError('http_error', `Falha desconhecida ao consultar IBGE em ${url}`);
}

// ─── Tipos brutos da API do IBGE ──────────────────────────────────────────────

export interface IbgeEstado {
  id: number;
  sigla: string;
  nome: string;
  regiao: { id: number; sigla: string; nome: string };
}

export interface IbgeMunicipioRaw {
  id: number;
  nome: string;
  microrregiao?: {
    id: number;
    nome: string;
    mesorregiao?: {
      id: number;
      nome: string;
      UF?: { id: number; sigla: string; nome: string; regiao?: { id: number; sigla: string; nome: string } };
    };
  };
  'regiao-imediata'?: {
    id: number;
    nome: string;
    'regiao-intermediaria'?: {
      id: number;
      nome: string;
      UF?: { id: number; sigla: string; nome: string };
    };
  };
}

interface SidraSerieResultado {
  variavel: string;
  unidade: string;
  resultados: Array<{
    series: Array<{
      localidade: { id: string; nome: string };
      serie: Record<string, string>;
    }>;
  }>;
}

export interface PopulacaoIndicador {
  codigoIbge: string;
  valor: number;
  periodo: string;
  unidade: string;
}

// ─── Localidades ───────────────────────────────────────────────────────────

export async function fetchEstados(): Promise<IbgeEstado[]> {
  return fetchIbgeJson<IbgeEstado[]>(`${LOCALIDADES_BASE}/estados`);
}

export async function fetchEstadoBySigla(uf: string): Promise<IbgeEstado> {
  const estados = await fetchEstados();
  const estado = estados.find((e) => e.sigla.toUpperCase() === uf.toUpperCase());
  if (!estado) {
    throw new IbgeApiError('http_error', `UF "${uf}" não existe na tabela de UFs do IBGE.`);
  }
  return estado;
}

export async function fetchMunicipiosByUf(uf: string): Promise<IbgeMunicipioRaw[]> {
  const municipios = await fetchIbgeJson<IbgeMunicipioRaw[]>(
    `${LOCALIDADES_BASE}/estados/${encodeURIComponent(uf.toUpperCase())}/municipios`
  );
  if (!Array.isArray(municipios) || municipios.length === 0) {
    throw new IbgeApiError('invalid_response', `IBGE retornou lista vazia de municípios para UF "${uf}".`);
  }
  return municipios;
}

export async function fetchMunicipioByCodigo(codigoIbge: string): Promise<IbgeMunicipioRaw> {
  return fetchIbgeJson<IbgeMunicipioRaw>(`${LOCALIDADES_BASE}/municipios/${encodeURIComponent(codigoIbge)}`);
}

// ─── SIDRA — População residente estimada ────────────────────────────────────

function parseSidraPopulacao(payload: SidraSerieResultado[]): PopulacaoIndicador[] {
  const [primeira] = payload;
  if (!primeira || !Array.isArray(primeira.resultados)) return [];

  const out: PopulacaoIndicador[] = [];
  for (const resultado of primeira.resultados) {
    for (const serie of resultado.series ?? []) {
      const periodos = Object.keys(serie.serie ?? {});
      const ultimoPeriodo = periodos[periodos.length - 1];
      const valorBruto = ultimoPeriodo ? serie.serie[ultimoPeriodo] : undefined;
      const valor = valorBruto !== undefined ? Number(valorBruto) : NaN;
      if (!ultimoPeriodo || Number.isNaN(valor)) continue;
      out.push({
        codigoIbge: serie.localidade.id,
        valor,
        periodo: ultimoPeriodo,
        unidade: primeira.unidade,
      });
    }
  }
  return out;
}

/** População de todos os municípios de uma UF, em uma única chamada SIDRA. */
export async function fetchPopulacaoByUfId(ufId: number): Promise<Map<string, PopulacaoIndicador>> {
  const url = `${AGREGADOS_BASE}/${POPULACAO_TABELA}/periodos/-1/variaveis/${POPULACAO_VARIAVEL}?localidades=N6[N3[${ufId}]]`;
  const payload = await fetchIbgeJson<SidraSerieResultado[]>(url);
  const indicadores = parseSidraPopulacao(payload);
  return new Map(indicadores.map((i) => [i.codigoIbge, i]));
}

export async function fetchPopulacaoByCodigo(codigoIbge: string): Promise<PopulacaoIndicador | null> {
  const url = `${AGREGADOS_BASE}/${POPULACAO_TABELA}/periodos/-1/variaveis/${POPULACAO_VARIAVEL}?localidades=N6[${codigoIbge}]`;
  const payload = await fetchIbgeJson<SidraSerieResultado[]>(url);
  const indicadores = parseSidraPopulacao(payload);
  return indicadores.find((i) => i.codigoIbge === codigoIbge) ?? null;
}

// ─── Normalização ────────────────────────────────────────────────────────────

export interface NormalizedMunicipio {
  codigo_ibge: string;
  uf: string;
  municipio: string;
  regiao: string | null;
  metadata: {
    microrregiao: { id: number; nome: string } | null;
    mesorregiao: { id: number; nome: string } | null;
    regiao_imediata: { id: number; nome: string } | null;
    regiao_intermediaria: { id: number; nome: string } | null;
  };
}

/**
 * Converte a resposta bruta do IBGE para o contrato Territory. Guarda em
 * `metadata` apenas os identificadores/nomes de meso/microrregião e das
 * regiões imediata/intermediária (úteis para segmentação territorial
 * futura) — não o payload inteiro do IBGE, que duplica UF/região em cada
 * nível de aninhamento sem necessidade.
 */
export function normalizeMunicipio(raw: IbgeMunicipioRaw): NormalizedMunicipio {
  const uf = raw.microrregiao?.mesorregiao?.UF;
  const regiao = uf?.regiao?.nome ?? null;

  if (!raw.id || !raw.nome || !uf?.sigla) {
    throw new IbgeApiError(
      'invalid_response',
      `Item de município incompleto retornado pelo IBGE (id=${raw.id}, nome=${raw.nome}, uf=${uf?.sigla}).`
    );
  }

  return {
    codigo_ibge: String(raw.id),
    uf: uf.sigla,
    municipio: raw.nome,
    regiao,
    metadata: {
      microrregiao: raw.microrregiao ? { id: raw.microrregiao.id, nome: raw.microrregiao.nome } : null,
      mesorregiao: raw.microrregiao?.mesorregiao
        ? { id: raw.microrregiao.mesorregiao.id, nome: raw.microrregiao.mesorregiao.nome }
        : null,
      regiao_imediata: raw['regiao-imediata']
        ? { id: raw['regiao-imediata'].id, nome: raw['regiao-imediata'].nome }
        : null,
      regiao_intermediaria: raw['regiao-imediata']?.['regiao-intermediaria']
        ? {
            id: raw['regiao-imediata']!['regiao-intermediaria']!.id,
            nome: raw['regiao-imediata']!['regiao-intermediaria']!.nome,
          }
        : null,
    },
  };
}
