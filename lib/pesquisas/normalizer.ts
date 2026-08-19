import type { ElectoralPollUpsert } from './types';
import { getPesquisasSourceDescriptor } from './source';

/**
 * Mapeamento REAL verificado (não suposição) — colunas confirmadas por
 * download real do `pesquisa_eleitoral_2026.zip` em 2026-08-19 (ver
 * docs/relatorios/CLAUDE_PESQUISAS_01A_CORE_TSE.md, §Schema Real).
 *
 * Campos NÃO presentes nesta fonte (permanecem null aqui, não inventados):
 *   - margem de erro / nível de confiança: só aparecem, quando aparecem,
 *     como texto livre dentro de DS_PLANO_AMOSTRAL, sem coluna estruturada.
 *   - contratante / pagante: não fazem parte deste recurso — existem
 *     recursos separados (pesquisa_contratante_2026.zip,
 *     pesquisa_pagante_2026.zip) ainda não ingeridos (PESQUISAS-01B).
 *   - abrangência real da pesquisa (estadual vs. municipal): SG_UE/NM_UE é
 *     a unidade eleitoral de REGISTRO (o TRE), não necessariamente a área
 *     real da pesquisa — uma pesquisa municipal (ex.: Uberaba) pode
 *     aparecer registrada sob a unidade estadual. Armazenado mesmo assim
 *     (é a única informação estruturada disponível), mas o rótulo na UI
 *     deve deixar claro que é a unidade de registro, não uma confirmação
 *     de escopo geográfico real da amostra.
 *   - município específico: não existe coluna própria — fica null.
 *   - candidato/percentual/cenário/turno: não existem nesta fonte —
 *     resultado de intenção de voto NÃO está neste dataset (ver §7).
 *   - bairro estruturado: DS_DADO_MUNICIPIO é texto livre, formato
 *     inconsistente entre institutos (às vezes "#NULO#", às vezes um
 *     parágrafo jurídico prometendo anexo futuro, às vezes prosa com
 *     percentuais por região embutidos) — não extraído, não implementado
 *     na UI (PARTE 24/25).
 */
export const VERIFIED_COLUMNS = [
  'DT_GERACAO', 'HH_GERACAO', 'AA_ELEICAO', 'CD_ELEICAO', 'NM_ELEICAO',
  'SG_UF', 'SG_UE', 'NM_UE', 'NR_PROTOCOLO_REGISTRO', 'DT_REGISTRO',
  'ST_PESQUISA_PROPRIA', 'NR_CNPJ_EMPRESA', 'NM_EMPRESA', 'NM_EMPRESA_FANTASIA',
  'DS_CARGO', 'DT_INICIO_PESQUISA', 'DT_FIM_PESQUISA', 'DT_DIVULGACAO',
  'QT_ENTREVISTADO', 'CD_CONRE', 'NM_ESTATISTICO_RESP', 'VR_PESQUISA',
  'DS_METODOLOGIA_PESQUISA', 'DS_PLANO_AMOSTRAL', 'DS_SISTEMA_CONTROLE',
  'DS_DADO_MUNICIPIO',
] as const;

function nullIfPlaceholder(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '#NULO#') return null;
  return trimmed;
}

/** "170000,00" (formato decimal brasileiro) → 170000.00 */
function parseBrValor(value: string | undefined): number | null {
  const clean = nullIfPlaceholder(value);
  if (!clean) return null;
  const parsed = Number(clean.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntOrNull(value: string | undefined): number | null {
  const clean = nullIfPlaceholder(value);
  if (!clean) return null;
  const parsed = parseInt(clean, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** "2026-03-14 00:00:00" → "2026-03-14" (só a parte de data, para colunas `date`) */
function toDateOnly(value: string | undefined): string | null {
  const clean = nullIfPlaceholder(value);
  if (!clean) return null;
  const datePart = clean.split(' ')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
}

export function normalizePesquisaRow(row: Record<string, string>): ElectoralPollUpsert | null {
  const registrationNumber = nullIfPlaceholder(row.NR_PROTOCOLO_REGISTRO);
  const electionYear = parseIntOrNull(row.AA_ELEICAO);
  if (!registrationNumber || !electionYear) return null; // sem identidade oficial, não ingere (PARTE 11)

  const source = getPesquisasSourceDescriptor();

  return {
    tseRegistrationNumber: registrationNumber,
    source: 'TSE/PesqEle',
    sourceUrl: source.sourceUrl,
    sourceDataset: source.dataset,
    electionYear,
    uf: nullIfPlaceholder(row.SG_UF),
    municipio: null, // sem coluna estruturada confiável nesta fonte — ver nota acima
    cargo: nullIfPlaceholder(row.DS_CARGO), // multi-valor bruto ("Governador, Senador") — fonte não separa
    abrangencia: nullIfPlaceholder(row.NM_UE), // unidade eleitoral de REGISTRO, não confirmação de escopo real — ver nota acima
    instituto: nullIfPlaceholder(row.NM_EMPRESA),
    contratante: null, // não presente neste recurso
    pagante: null, // não presente neste recurso
    valor: parseBrValor(row.VR_PESQUISA),
    metodologia: nullIfPlaceholder(row.DS_METODOLOGIA_PESQUISA),
    dataRegistro: toDateOnly(row.DT_REGISTRO),
    campoInicio: toDateOnly(row.DT_INICIO_PESQUISA),
    campoFim: toDateOnly(row.DT_FIM_PESQUISA),
    amostra: parseIntOrNull(row.QT_ENTREVISTADO),
    margemErro: null, // não estruturado nesta fonte — às vezes em texto livre dentro de DS_PLANO_AMOSTRAL
    nivelConfianca: null, // idem
    ingestedAt: new Date().toISOString(),
    rawSourceRow: row,
  };
}
