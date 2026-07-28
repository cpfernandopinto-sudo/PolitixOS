/**
 * Central de thresholds de oportunidades do PolitixOS — mesmo espírito de
 * lib/config/alert-thresholds.ts, mas para sinais positivos.
 *
 * Regra do projeto: uma oportunidade só existe quando há uma comparação
 * temporal real (período atual vs. período anterior, ambos com dados) ou um
 * sinal de estado atual objetivo (ex.: alta exposição sem risco associado).
 * "Ausência de risco" isoladamente NUNCA é tratada como oportunidade — por
 * isso a regra de exposição exige volume alto (top-3) *e* risco baixo, não
 * apenas risco baixo.
 *
 * Ver docs/REGRAS_OPORTUNIDADES_POLITIXOS.md para a explicação em
 * linguagem de produto.
 */

export interface OpportunityRuleDefinition {
  id: string;
  nome: string;
  descricao: string;
  metrica: string;
  threshold: string;
  janela: string;
  justificativa: string;
  limitacoes: string;
}

export const OPPORTUNITY_RULES: Record<string, OpportunityRuleDefinition> = {
  queda_negatividade: {
    id: 'queda_negatividade',
    nome: 'Queda de negatividade',
    descricao: 'A proporção de menções negativas caiu de forma relevante em relação ao período anterior.',
    metrica: '% de menções negativas (notícias + Instagram + X) sobre o total analisado',
    threshold: 'queda ≥ 10 pontos percentuais',
    janela: 'período selecionado vs. período imediatamente anterior de mesma duração',
    justificativa: 'Comparação direta de duas janelas temporais reais — não é uma projeção.',
    limitacoes: 'Não distingue causa da queda (pode ser redução real de fatos negativos ou apenas menor cobertura no período).',
  },
  crescimento_sentimento_positivo: {
    id: 'crescimento_sentimento_positivo',
    nome: 'Crescimento de sentimento positivo',
    descricao: 'A proporção de menções positivas cresceu de forma relevante em relação ao período anterior.',
    metrica: '% de menções positivas (notícias + Instagram + X) sobre o total analisado',
    threshold: 'crescimento ≥ 10 pontos percentuais',
    janela: 'período selecionado vs. período imediatamente anterior de mesma duração',
    justificativa: 'Comparação direta de duas janelas temporais reais.',
    limitacoes: 'Sensível a baixo volume: poucas menções positivas a mais podem gerar uma variação percentual grande.',
  },
  alta_exposicao_baixo_risco: {
    id: 'alta_exposicao_baixo_risco',
    nome: 'Alta exposição com risco baixo',
    descricao: 'Entidade entre as 3 com maior volume de menções no período, sem nenhum alerta ou item de risco alto/crítico associado.',
    metrica: 'volume de menções (rank) + presença de alertas/risco alto',
    threshold: 'top 3 em volume E zero alertas críticos/altos associados',
    janela: 'período selecionado',
    justificativa: 'Não é "ausência de risco" isolada — exige visibilidade alta (top 3) combinada com risco baixo, a combinação que de fato indica uma janela de comunicação favorável.',
    limitacoes: 'Não avalia o teor específico das menções (pode haver cobertura neutra/técnica sem viés positivo real).',
  },
};
