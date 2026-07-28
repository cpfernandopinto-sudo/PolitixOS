# Regras de Oportunidades — PolitixOS

Fonte de verdade no código: [`lib/config/opportunity-thresholds.ts`](../lib/config/opportunity-thresholds.ts) (definições) e [`lib/analytics/executive-summary.ts`](../lib/analytics/executive-summary.ts) (`evaluateOpportunities`, aplicação das regras). Este documento explica as mesmas regras em linguagem de produto.

## Princípio central

**Ausência de risco não é oportunidade.** Uma oportunidade só é exibida quando há um dos dois tipos de evidência objetiva:

1. **Comparação temporal real** — o período selecionado comparado ao período imediatamente anterior de mesma duração, usando a mesma técnica de divisão já validada em `getTrendOverview` (`lib/queries/overview.ts`). Sem essa comparação, a regra simplesmente não é avaliada — nunca se fabrica um "0%" ou uma tendência para preencher a lacuna.
2. **Estado atual combinando dois sinais** — nunca um único sinal isolado. A regra "alta exposição com risco baixo", por exemplo, exige alto volume de menções (top 3) **e** ausência de alertas/risco alto — não apenas a ausência de risco isoladamente.

## Regras

### Queda de negatividade
- **O que é**: a proporção de menções negativas (notícias + Instagram + X) caiu de forma relevante em relação ao período anterior.
- **Fórmula**: `negativoShare_atual − negativoShare_anterior ≤ −10 pontos percentuais`.
- **Janela**: período selecionado vs. período imediatamente anterior de mesma duração.
- **Exemplo**: se 30% das menções eram negativas no período anterior e caíram para 15% no período atual, a regra dispara (queda de 15pp).
- **Limitações**: não distingue causa da queda — pode ser uma melhora real de percepção ou apenas menor cobertura jornalística/social no período.

### Crescimento de sentimento positivo
- **Fórmula**: `positivoShare_atual − positivoShare_anterior ≥ +10 pontos percentuais`.
- **Janela**: mesma comparação acima.
- **Limitações**: sensível a baixo volume — em períodos com poucas menções, um punhado de posts positivos a mais já cruza o threshold.

### Alta exposição com risco baixo
- **O que é**: uma entidade (candidato/target) está entre as 3 com maior volume de menções no período **e** não tem nenhum alerta ativo nem risco predominante alto/crítico associado.
- **Fórmula**: `rank de volume ≤ 3 E alertas = 0 E (risco predominante = baixo OU não classificado)`.
- **Janela**: período selecionado (não depende de comparação temporal).
- **Por que não é apenas "ausência de risco"**: uma entidade pouco mencionada e sem risco não entra nesta regra — só entram as que estão entre as mais visíveis do período. É a combinação de visibilidade alta + risco baixo que indica uma janela de comunicação favorável, não a simples falta de problemas.
- **Limitações**: não avalia o teor específico das menções (pode ser cobertura neutra/técnica, sem viés favorável real).

## Regras consideradas e descartadas nesta versão

- **Tema positivo emergente**: descartada porque o projeto não tem dado histórico de frequência por tema (apenas o volume do período atual). Rotular um tema como "emergente" exigiria uma comparação de crescimento que não existe — em vez de fabricar essa comparação, o Sprint 3 expõe apenas "Tema em Destaque" (maior volume atual, sem alegação de crescimento) na síntese executiva.
- **Aumento de repercussão positiva** (como regra separada de "crescimento de sentimento positivo"): mantida como o mesmo sinal, para não duplicar regras equivalentes com nomes diferentes.

## Como ajustar thresholds futuramente

Os números (`10 pontos percentuais`, `top 3`) vivem em `OPPORTUNITY_RULES` (`lib/config/opportunity-thresholds.ts`, campo `threshold`, descritivo) e são aplicados em `evaluateOpportunities` (`lib/analytics/executive-summary.ts`, constantes `OPPORTUNITY_SHARE_DELTA_THRESHOLD` e `OPPORTUNITY_TOP_N_EXPOSURE`). Ajustar um threshold é alterar essas constantes — a lógica de avaliação em si não muda.
