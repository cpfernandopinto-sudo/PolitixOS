/**
 * Contrato canônico dos filtros globais (Candidatos + Período) — fonte única
 * de verdade para GlobalContextBar e para toda página que consome esses
 * filtros (Visão Geral, Notícias, Instagram, X).
 *
 * Antes desta unificação cada página reimplementava candidato/período de
 * forma independente: nomes de query param divergentes (`candidate` vs
 * `candidateId` vs `target`), candidato single-select, e um enum de período
 * (R12/YTD/FULL/CENSO) que não correspondia a nada que as camadas de query
 * realmente consumem — ver docs/relatorios/CLAUDE_UX_ACCESS_FILTERS_01.md.
 */

export type CandidateMode = 'ALL_ALLOWED' | 'SELECTED';

/**
 * Os únicos valores de período que alguma camada de query no sistema hoje
 * realmente implementa: `OverviewFilters`, `AlertsFilters` e
 * `AnalyticsInsightRequest` já whitelistam exatamente este conjunto;
 * Instagram/X fazem `parseInt()` direto do valor. Não inventar novos valores
 * aqui sem primeiro implementar o consumidor correspondente — período que
 * nenhuma fonte suporta não deve ser oferecido como opção (ver PARTE 7 do
 * briefing: não fabricar dado para uma janela que a fonte não cobre).
 */
export const GLOBAL_PERIODS = ['all', '1', '7', '30'] as const;
export type GlobalPeriod = (typeof GLOBAL_PERIODS)[number];

export const GLOBAL_PERIOD_LABELS: Record<GlobalPeriod, string> = {
  all: 'Todo período',
  '1': 'Últimas 24h',
  '7': 'Últimos 7 dias',
  '30': 'Últimos 30 dias',
};

export interface GlobalFiltersState {
  candidateMode: CandidateMode;
  /** Só tem significado quando candidateMode === 'SELECTED'. */
  candidateIds: string[];
  period: GlobalPeriod;
}

export const DEFAULT_GLOBAL_FILTERS: GlobalFiltersState = {
  candidateMode: 'ALL_ALLOWED',
  candidateIds: [],
  period: 'all',
};

function isGlobalPeriod(value: string | null): value is GlobalPeriod {
  return value !== null && (GLOBAL_PERIODS as readonly string[]).includes(value);
}

/**
 * Converte o objeto `searchParams` que o Next.js passa a Server Components
 * (`Record<string, string | string[] | undefined>`) para `URLSearchParams`,
 * para reaproveitar `parseGlobalFilters` diretamente nas páginas. Quando um
 * parâmetro chega como array (raro para os parâmetros canônicos, mas
 * possível via `?period=7&period=30`), usa o primeiro valor.
 */
export function searchParamsToURLSearchParams(
  sp: Record<string, string | string[] | undefined>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) params.set(key, first);
  }
  return params;
}

/**
 * Lê o estado canônico da URL. Aceita os aliases legados de candidato único
 * (`candidate`, `candidateId`) para não quebrar links profundos já
 * compartilhados — sempre resolvidos para `candidateMode: 'SELECTED'` com um
 * único id. Grava sempre no formato canônico (`candidates` + `mode`) via
 * `serializeGlobalFilters`, então os aliases só aparecem em URLs antigas.
 */
export function parseGlobalFilters(searchParams: URLSearchParams): GlobalFiltersState {
  const rawCandidates = searchParams.get('candidates');
  const legacyCandidate = searchParams.get('candidate') ?? searchParams.get('candidateId');

  let candidateIds: string[] = [];
  if (rawCandidates) {
    candidateIds = rawCandidates
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  } else if (legacyCandidate) {
    candidateIds = [legacyCandidate];
  }

  const rawMode = searchParams.get('mode')?.toUpperCase();
  const candidateMode: CandidateMode =
    rawMode === 'SELECTED' || rawMode === 'ALL_ALLOWED'
      ? rawMode
      : candidateIds.length > 0
        ? 'SELECTED'
        : 'ALL_ALLOWED';

  const rawPeriod = searchParams.get('period');
  const period: GlobalPeriod = isGlobalPeriod(rawPeriod) ? rawPeriod : 'all';

  return {
    candidateMode,
    candidateIds: candidateMode === 'SELECTED' ? candidateIds : [],
    period,
  };
}

/**
 * Grava o estado canônico em um `URLSearchParams` (clonado a partir de
 * `existing`, que não é mutado), removendo os aliases legados e quaisquer
 * outros nomes de parâmetro já usados por páginas individuais (`target`) —
 * depois desta função rodar uma vez, a URL só carrega o formato canônico.
 */
export function serializeGlobalFilters(
  state: GlobalFiltersState,
  existing: URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams(existing.toString());
  params.delete('candidate');
  params.delete('candidateId');
  params.delete('target');

  if (state.candidateMode === 'SELECTED' && state.candidateIds.length > 0) {
    params.set('candidates', state.candidateIds.join(','));
    params.set('mode', 'selected');
  } else {
    params.delete('candidates');
    params.delete('mode');
  }

  if (state.period && state.period !== 'all') {
    params.set('period', state.period);
  } else {
    params.delete('period');
  }

  return params;
}

/**
 * Resolve o conjunto de candidatos que a query deve efetivamente enxergar —
 * ÚNICO ponto de interseção entre "o que o usuário selecionou" e "o que o
 * usuário tem permissão de ver". `null` mantém a semântica já usada em todo
 * o sistema para "sem filtro" (admin).
 *
 * Este é também o ponto que sanitiza uma seleção quando um candidato é
 * removido das permissões do usuário enquanto ainda estava selecionado: a
 * interseção simplesmente o exclui, sem precisar de um passo de "limpeza"
 * separado em cada página.
 */
export function getEffectiveCandidateIds(
  state: GlobalFiltersState,
  allowedTargetIds: string[] | null
): string[] | null {
  const hasSelection = state.candidateMode === 'SELECTED' && state.candidateIds.length > 0;

  if (allowedTargetIds === null) {
    // admin — sem restrição de permissão; uma seleção explícita ainda filtra.
    return hasSelection ? state.candidateIds : null;
  }

  if (hasSelection) {
    const allowedSet = new Set(allowedTargetIds);
    return state.candidateIds.filter((id) => allowedSet.has(id));
  }

  return allowedTargetIds;
}

/**
 * Constrói o `href` de um item de navegação preservando os filtros globais
 * ativos — SÓ as dimensões (candidato/período) que a tela de destino
 * declara suportar no catálogo (`AppScreen.supportsGlobalCandidate` /
 * `supportsGlobalPeriod`). Filtros locais de página (cidade, sentimento,
 * busca etc.) nunca são carregados entre telas — só os globais, e só quando
 * a tela de destino realmente os consome. É isto que faz "selecionar Celina
 * + Michelle na Visão Geral, navegar para Notícias" preservar a seleção sem
 * precisar de um context/store novo (PARTE 6 do briefing).
 */
export function buildNavHref(
  basePath: string,
  currentParams: URLSearchParams,
  opts: { supportsCandidate?: boolean; supportsPeriod?: boolean }
): string {
  const state = parseGlobalFilters(currentParams);
  const params = new URLSearchParams();

  if (opts.supportsCandidate && state.candidateMode === 'SELECTED' && state.candidateIds.length > 0) {
    params.set('candidates', state.candidateIds.join(','));
    params.set('mode', 'selected');
  }
  if (opts.supportsPeriod && state.period !== 'all') {
    params.set('period', state.period);
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * `NoticiasFilters.period` usa buckets nomeados (`'24h'|'7d'|'30d'`) em vez
 * do formato dia-contagem (`'1'|'7'|'30'`) usado por todo o resto — mesma
 * transformação que já existia (duplicada) em `lib/queries/overview.ts`.
 * `undefined` = sem filtro de data ('all').
 */
export function toLegacyNoticiasBucket(period: GlobalPeriod): '24h' | '7d' | '30d' | undefined {
  switch (period) {
    case '1':
      return '24h';
    case '7':
      return '7d';
    case '30':
      return '30d';
    default:
      return undefined;
  }
}
