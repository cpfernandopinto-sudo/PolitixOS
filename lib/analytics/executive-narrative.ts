/**
 * Narrativa executiva determinística da Visão Geral (Sprint 5).
 *
 * Não usa IA — é montada por template a partir dos mesmos dados já
 * calculados pelo Centro Executivo (`getExecutiveOverviewData`). A mesma
 * entrada sempre produz a mesma saída.
 *
 * Regras (ver docs/METODOLOGIA_CENTRO_EXECUTIVO.md):
 * - Nunca afirma causalidade entre fenômenos (ex.: não diz que um risco
 *   "causou" uma mudança de sentimento).
 * - Separa fenômeno (o que o dado mostra), entidade (quem) e evidência
 *   (onde conferir) — nunca mistura os três numa única frase.
 * - Nunca usa o título de uma notícia/post como se fosse a frase da
 *   narrativa (mesma regra de `formatExecutiveRisk`).
 */

import { SEVERITY_LABEL } from '@/lib/config/alert-thresholds';
import type { PoliticalStatusResult } from './political-status';
import type { RiskCard, OpportunityCard, KeyChange, EntityRankItem, ThemeRankItem } from './executive-summary';

export interface NarrativeAction {
  label: string;
  href: string;
}

export interface ExecutiveNarrativeResult {
  fraseGeral: string;
  fraseContexto: string;
  fraseAtencao: string | null;
  acoes: NarrativeAction[];
  semDados: boolean;
}

export interface BuildExecutiveNarrativeInput {
  politicalStatus: PoliticalStatusResult;
  primaryRisk: RiskCard | null;
  primaryOpportunity: OpportunityCard | null;
  keyChanges: KeyChange[];
  topEntity: EntityRankItem | null;
  topTheme: ThemeRankItem | null;
}

export function buildExecutiveNarrative(input: BuildExecutiveNarrativeInput): ExecutiveNarrativeResult {
  const { politicalStatus, primaryRisk, primaryOpportunity, keyChanges, topEntity, topTheme } = input;

  if (politicalStatus.semDados) {
    return {
      fraseGeral: 'Ainda não há dados suficientes no período e filtros selecionados para uma leitura executiva.',
      fraseContexto: 'Ajuste o período ou o candidato monitorado para gerar a narrativa.',
      fraseAtencao: null,
      acoes: [],
      semDados: true,
    };
  }

  const fraseGeral = topEntity
    ? `O cenário está classificado como "${politicalStatus.label}", com maior concentração de menções em ${topEntity.nome}.`
    : `O cenário está classificado como "${politicalStatus.label}".`;

  const topChange = keyChanges[0] ?? null;
  const fraseContexto = topChange
    ? `A maior mudança do período foi em ${topChange.label.toLowerCase()}: ${topChange.valorAnterior} → ${topChange.valorAtual} (${topChange.periodo.toLowerCase()}).`
    : topTheme
      ? `O tema com maior volume no período foi "${topTheme.tema}", com ${topTheme.frequencia} menções.`
      : 'Não há comparação temporal real disponível para o período selecionado.';

  let fraseAtencao: string | null = null;
  const acoes: NarrativeAction[] = [];

  if (primaryRisk) {
    fraseAtencao = `Atenção prioritária: ${primaryRisk.descricao} — severidade ${SEVERITY_LABEL[primaryRisk.severidade].toLowerCase()}.`;
    acoes.push({ label: 'Ver riscos', href: '#riscos-oportunidades' });
  } else if (primaryOpportunity) {
    fraseAtencao = `Sem riscos prioritários no período. Oportunidade identificada: ${primaryOpportunity.descricao}.`;
    acoes.push({ label: 'Ver oportunidades', href: '#oportunidades' });
  }

  if (topChange) acoes.push({ label: 'Ver mudanças', href: '#mudancas-relevantes' });
  if (topEntity?.targetId) acoes.push({ label: `Filtrar ${topEntity.nome}`, href: `?candidate=${topEntity.targetId}` });
  acoes.push({ label: 'Ver evidências', href: '#timeline' });

  return { fraseGeral, fraseContexto, fraseAtencao, acoes, semDados: false };
}
