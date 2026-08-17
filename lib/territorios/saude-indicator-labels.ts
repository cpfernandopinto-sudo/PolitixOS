/**
 * Rótulos oficiais para os códigos presentes em `codigo_tipo_unidade` do
 * CNES. As chaves canônicas persistidas não são alteradas: esta é somente
 * uma camada de apresentação/auditoria.
 *
 * Catálogo legado oficial (TP_UNID):
 * https://cnes2.datasus.gov.br/Mod_Ind_Unidade.asp?VEstado=00
 *
 * O código 16 não aparece mais no catálogo legado vigente, mas aparece na
 * classificação oficial atual como 016 — AMBULATÓRIO:
 * https://cnes2.datasus.gov.br/Mod_Ind_Unidade_Novo.asp?VEstado=00
 */
export const CNES_TYPE_LABELS = {
  1: 'Posto de Saúde',
  2: 'Centro de Saúde/Unidade Básica',
  4: 'Policlínica',
  5: 'Hospital Geral',
  7: 'Hospital Especializado',
  15: 'Unidade Mista',
  16: 'Ambulatório',
  20: 'Pronto-Socorro Geral',
  21: 'Pronto-Socorro Especializado',
  22: 'Consultório Isolado',
  32: 'Unidade Móvel Fluvial',
  36: 'Clínica/Centro de Especialidade',
  39: 'Unidade de Apoio Diagnose e Terapia (SADT Isolado)',
  40: 'Unidade Móvel Terrestre',
  42: 'Unidade Móvel de Nível Pré-Hospitalar na Área de Urgência',
  43: 'Farmácia',
  50: 'Unidade de Vigilância em Saúde',
  60: 'Cooperativa ou Empresa de Cessão de Trabalhadores na Saúde',
  61: 'Centro de Parto Normal — Isolado',
  62: 'Hospital-Dia — Isolado',
  67: 'Laboratório Central de Saúde Pública (LACEN)',
  68: 'Central de Gestão em Saúde',
  69: 'Centro de Atenção Hemoterápica e/ou Hematológica',
  70: 'Centro de Atenção Psicossocial',
  71: 'Centro de Apoio à Saúde da Família',
  72: 'Unidade de Atenção à Saúde Indígena',
  73: 'Pronto Atendimento',
  74: 'Polo Academia da Saúde',
  75: 'Telessaúde',
  76: 'Central de Regulação Médica das Urgências',
  77: 'Serviço de Atenção Domiciliar Isolado (Home Care)',
  78: 'Unidade de Atenção em Regime Residencial',
  79: 'Oficina Ortopédica',
  80: 'Laboratório de Saúde Pública',
  81: 'Central de Regulação do Acesso',
  82: 'Central Estadual de Notificação, Captação e Distribuição de Órgãos',
  83: 'Polo de Prevenção de Doenças e Agravos e Promoção da Saúde',
  84: 'Central de Abastecimento',
  85: 'Centro de Imunização',
} as const satisfies Record<number, string>;

export interface CnesTypeIndicatorLabel {
  code: number;
  label: string;
  indicatorLabel: string;
  officialCatalog: 'CNES_TP_UNID_LEGACY' | 'CNES_CLASSIFICACAO_ATUAL';
}

const TYPE_INDICATOR_PATTERN = /^estabelecimentos_tipo_unidade_(\d+)$/;

export function getCnesTypeIndicatorLabel(indicator: string): CnesTypeIndicatorLabel | null {
  const match = TYPE_INDICATOR_PATTERN.exec(indicator);
  if (!match) return null;
  const code = Number(match[1]);
  const label = CNES_TYPE_LABELS[code as keyof typeof CNES_TYPE_LABELS];
  if (!label) return null;
  return {
    code,
    label,
    indicatorLabel: `Estabelecimentos — ${label}`,
    officialCatalog: code === 16 ? 'CNES_CLASSIFICACAO_ATUAL' : 'CNES_TP_UNID_LEGACY',
  };
}

