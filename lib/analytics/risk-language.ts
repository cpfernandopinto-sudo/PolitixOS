/**
 * Traduz um alerta unificado (`lib/queries/alerts.ts#UnifiedAlert`) em
 * linguagem executiva para os cards de risco da Visão Geral.
 *
 * Bug corrigido no Sprint 5: o card de risco usava o TÍTULO da notícia/post
 * de origem como se fosse o nome do risco (ex.: "Flávio Bolsonaro: Motivos
 * para as desculpas de Flávio - blogs.correiobraziliense.com.br"). O nome do
 * risco deve vir da REGRA disparada (`ALERT_RULES`, já em linguagem
 * executiva); o título original é evidência, não descrição do risco — os
 * dois nunca devem ser o mesmo texto.
 */

import type { UnifiedAlert } from '@/lib/queries/alerts';

export interface ExecutiveRiskEvidence {
  titulo: string;
  url: string | null;
}

export interface ExecutiveRiskFormat {
  /** Linguagem executiva: nome da regra + entidade. Nunca o título de uma notícia/post. */
  headline: string;
  entidade: string;
  descricaoRegra: string;
  /** Evidência principal (título/legenda original + link) — `null` para alertas agregados, que não têm um item de origem único. */
  evidenciaPrincipal: ExecutiveRiskEvidence | null;
  evidenceCount: number;
}

/**
 * Alertas agregados (pico de volume, concentração de negativas/temas
 * sensíveis) não têm um item de origem individual — os fetchers em
 * `lib/queries/alerts.ts` preenchem `titulo` com o próprio `nome` da regra
 * nesses casos (ver `evaluateNoticiaAggregateAlerts`). Alertas de item têm um
 * `titulo` distinto (o cabeçalho real da notícia/legenda do post).
 */
function isAggregateAlert(alert: UnifiedAlert): boolean {
  return alert.titulo === alert.nome;
}

export function formatExecutiveRisk(alert: UnifiedAlert): ExecutiveRiskFormat {
  const aggregate = isAggregateAlert(alert);
  const headline =
    aggregate || alert.entidade === 'Geral' ? alert.nome : `${alert.nome} envolvendo ${alert.entidade}`;

  return {
    headline,
    entidade: alert.entidade,
    descricaoRegra: alert.descricao,
    evidenciaPrincipal: aggregate ? null : { titulo: alert.titulo, url: alert.url },
    evidenceCount: aggregate ? 0 : 1,
  };
}
