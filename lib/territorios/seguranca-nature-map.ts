// ---------------------------------------------------------------------------
// Mapeamento fechado de naturezas — Motor Segurança Pública / MG (Bloco 4.2).
// ---------------------------------------------------------------------------
// As strings abaixo são EXATAMENTE as encontradas nos CSVs reais do dataset
// "Crimes Violentos" da SEJUSP-MG (dados.mg.gov.br), coluna `natureza`,
// verificadas nos arquivos crimes_violentos_2025.csv e crimes_violentos_2026.csv
// (Bloco 4.1/4.2). Propositalmente um mapa fechado (não uma transformação
// automática de string — ex.: strip de acentos/normalização genérica) porque
// a fonte tem inconsistências reais que uma transformação automática erraria:
// duas das 15 naturezas trazem o sufixo "(REGISTROS)" e as outras não (ex.:
// "HOMICIDIO CONSUMADO (REGISTROS)" vs. "ROUBO CONSUMADO").
//
// `core: true` = uma das 13 naturezas que a própria SEJUSP soma para compor
// o indicador oficial "Crimes Violentos" (ver `notes` do dataset no CKAN) —
// são as únicas persistidas neste bloco e as únicas somadas em
// `indice_crimes_violentos`.
//
// `core: false` = Feminicídio Consumado/Tentado. Aparecem no MESMO arquivo
// "Crimes Violentos" (achado deste bloco — não estavam documentadas nas
// `notes` do dataset), mas por instrução explícita do Bloco 4.2 (Seção 3)
// NÃO entram no núcleo operacional agora (mesmo motivo de cautela já
// identificado no Bloco 4.1 para o dataset dedicado de violência contra a
// mulher: evitar misturar indicador corrente com fonte de atualização não
// reconfirmada, sem sinalização temporal explícita). Ficam reconhecidas no
// mapa (não caem em "natureza desconhecida"), mas são excluídas da
// persistência — o coletor reporta quantas linhas foram excluídas por esse
// motivo, separado da contagem de naturezas genuinamente desconhecidas.
// ---------------------------------------------------------------------------

export interface NatureMapping {
  /** Chave interna estável do indicador (grava em `territory_indicators.indicador`). */
  indicatorKey: string;
  /** true = uma das 13 naturezas oficiais do índice "Crimes Violentos" da SEJUSP. */
  core: boolean;
}

export const NATURE_MAP: Readonly<Record<string, NatureMapping>> = Object.freeze({
  'ESTUPRO CONSUMADO': { indicatorKey: 'estupro_consumado', core: true },
  'ESTUPRO TENTADO': { indicatorKey: 'estupro_tentado', core: true },
  'ESTUPRO DE VULNERAVEL CONSUMADO': { indicatorKey: 'estupro_vulneravel_consumado', core: true },
  'ESTUPRO DE VULNERAVEL TENTADO': { indicatorKey: 'estupro_vulneravel_tentado', core: true },
  'EXTORSAO CONSUMADO': { indicatorKey: 'extorsao_consumado', core: true },
  'EXTORSAO TENTADO': { indicatorKey: 'extorsao_tentado', core: true },
  'EXTORSAO MEDIANTE SEQUESTRO CONSUMADO': { indicatorKey: 'extorsao_mediante_sequestro_consumado', core: true },
  'HOMICIDIO CONSUMADO (REGISTROS)': { indicatorKey: 'homicidio_consumado', core: true },
  'HOMICIDIO TENTADO': { indicatorKey: 'homicidio_tentado', core: true },
  'ROUBO CONSUMADO': { indicatorKey: 'roubo_consumado', core: true },
  'ROUBO TENTADO': { indicatorKey: 'roubo_tentado', core: true },
  'SEQUESTRO E CARCERE PRIVADO CONSUMADO': { indicatorKey: 'sequestro_carcere_privado_consumado', core: true },
  'SEQUESTRO E CARCERE PRIVADO TENTADO': { indicatorKey: 'sequestro_carcere_privado_tentado', core: true },
  'FEMINICIDIO CONSUMADO (REGISTROS)': { indicatorKey: 'feminicidio_consumado', core: false },
  'FEMINICIDIO TENTADO': { indicatorKey: 'feminicidio_tentado', core: false },
});

/** Indicador derivado: soma das 13 naturezas `core: true` por território + mês. Não é uma linha do mapa — é calculado pelo coletor. */
export const INDICE_CRIMES_VIOLENTOS_KEY = 'indice_crimes_violentos';

export const CORE_INDICATOR_KEYS: readonly string[] = Object.freeze(
  Array.from(new Set(Object.values(NATURE_MAP).filter((m) => m.core).map((m) => m.indicatorKey)))
);

export type NatureResolution =
  | { status: 'core'; indicatorKey: string }
  | { status: 'out_of_scope'; indicatorKey: string }
  | { status: 'unknown' };

/** Resolve uma string de `natureza` bruta do CSV para o indicador interno. Nunca lança — o chamador decide o que fazer com cada status. */
export function resolveNatureza(naturezaRaw: string): NatureResolution {
  const key = naturezaRaw.trim();
  const mapping = NATURE_MAP[key];
  if (!mapping) return { status: 'unknown' };
  return mapping.core
    ? { status: 'core', indicatorKey: mapping.indicatorKey }
    : { status: 'out_of_scope', indicatorKey: mapping.indicatorKey };
}
