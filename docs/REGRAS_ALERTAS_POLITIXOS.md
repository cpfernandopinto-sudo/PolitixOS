# Regras da Central de Alertas — PolitixOS

Fonte de verdade no código: [`lib/config/alert-thresholds.ts`](../lib/config/alert-thresholds.ts) (definições) e [`lib/queries/alerts.ts`](../lib/queries/alerts.ts) (aplicação das regras). Este documento explica as mesmas regras em linguagem de produto, para quem não vai ler o código.

A Central de Alertas (`/dashboard/alertas`) não usa nenhum modelo de IA para "decidir" o que é um alerta — todas as regras abaixo são **thresholds objetivos e determinísticos** aplicados sobre os dados já coletados nos módulos de Notícias, Instagram e X. Nenhum número foi inventado nesta fase: todos os thresholds já existiam de forma implícita em outras partes do código (`getCrisisAlerts`, `getInstagramAlerts`, `getXAlert`, `getPriorityAlerts`) e foram apenas centralizados e documentados aqui.

## Notícias

### Notícia de risco crítico
- **O que é**: uma notícia individual cuja relevância/risco local calculado pela IA está no patamar mais alto observado no projeto.
- **Fórmula**: `local_relevance > 85` (escala 0–100).
- **Janela**: item individual, sem comparação temporal.
- **Severidade**: Crítico.
- **Exemplo**: uma notícia sobre um candidato com `local_relevance = 92` gera este alerta.
- **Falso positivo**: pode ocorrer se a análise de IA superestimar a relevância de uma notícia genérica que apenas cita o nome do candidato de passagem.

### Notícia de risco alto
- **O que é**: mesma métrica acima, em um patamar de atenção (mas não crítico).
- **Fórmula**: `80 < local_relevance ≤ 85`.
- **Janela**: item individual.
- **Severidade**: Alto.

### Pico anormal de menções (24h)
- **O que é**: o volume de notícias monitoradas nas últimas 24h está bem acima do normal recente.
- **Fórmula**: `volume_24h > (volume_7d_anteriores / 7) × 1,5`.
- **Janela**: 24h vs. média diária dos 7 dias anteriores.
- **Severidade**: Alto.
- **Exemplo**: se a média foi de 4 notícias/dia nos 7 dias anteriores, um dia com mais de 6 notícias dispara o alerta.
- **Falso positivo**: um candidato com pouquíssimas notícias históricas pode disparar este alerta com um volume absoluto pequeno (ex.: de 1 para 3 notícias) — o alerta reflete uma mudança de padrão relativa, não necessariamente uma crise real.

### Concentração de notícias negativas (24h)
- **Fórmula**: `% de notícias com ai_sentiment < 0 (sobre as notícias analisadas) > 40%` nas últimas 24h.
- **Janela**: 24h.
- **Severidade**: Alto.
- **Falso positivo**: em dias de baixo volume, uma ou duas notícias negativas já podem ultrapassar 40%.

### Concentração de temas sensíveis (24h)
- **O que é**: várias notícias no mesmo dia tocam em temas de crise (corrupção, processo judicial, crise política/financeira, acusação).
- **Fórmula**: mais de 3 notícias nas últimas 24h com 2+ flags de risco simultâneas ou um flag da lista de crise.
- **Janela**: 24h.
- **Severidade**: Crítico.

## Instagram

### Post de alto risco
- **Fórmula**: `risk_level = "alto"` (classificação da IA por post).
- **Janela**: item individual.
- **Severidade**: Alto.

### Concentração de posts negativos
- **Fórmula**: `% de posts com sentiment = "negativo" > 40%` no período do filtro selecionado.
- **Janela**: período selecionado (padrão: todo o histórico monitorado).
- **Severidade**: Alto.
- **Falso positivo**: candidatos com poucos posts no período monitorado podem cruzar 40% com 1–2 posts negativos.

## X (Twitter)

### Post de risco alto ou crítico
- **Fórmula**: `risk_level ∈ {"alto", "crítico"}`.
- **Janela**: item individual.
- **Severidade**: Alto (risco alto) ou Crítico (risco crítico).

### Score de crise elevado
- **O que é**: um post cujo `crisisScore` (já calculado em `fetchXData`, combinando negatividade da reação pública, polarização e risco) está muito alto, mesmo que a IA não tenha classificado o post individualmente como "alto risco".
- **Fórmula**: `crisisScore > 75` (escala 0–100).
- **Janela**: item individual.
- **Severidade**: Crítico.
- **Falso positivo**: posts com reação pública fortemente dividida mas sem conteúdo de risco real (ex.: debate político comum, sem acusação/crise) podem ter `crisisScore` elevado por polarização, não por gravidade real do conteúdo.

## O que a Central de Alertas NÃO faz

- Não usa modelos de linguagem para "julgar" se algo é um alerta — apenas aplica os thresholds acima sobre dados já processados pela pipeline de IA existente (n8n + `ai_analysis`).
- Não persiste estado de "lido/não lido" — não existe infraestrutura de banco para isso hoje; adicionar essa funcionalidade exigiria uma tabela nova e está fora do escopo desta fase (ver `docs/IMPLEMENTACAO_UX_PERFORMANCE_POLITIXOS.md`, seção Fase 2).
- Não compara candidatos entre si nem gera ranking de "quem está pior" — cada alerta é sobre um item ou uma janela temporal, não uma comparação.

## Ajuste futuro dos thresholds

Todos os valores numéricos (`85`, `80`, `1,5×`, `40%`, `3`, `75`) vivem exclusivamente em `lib/config/alert-thresholds.ts`, no campo `threshold` de cada `AlertRuleDefinition`. Ajustar um threshold é uma mudança de configuração, não de lógica — mas hoje o valor em `threshold` é apenas descritivo (string), a aplicação real do número está na função de avaliação correspondente em `lib/queries/alerts.ts` (`evaluateNoticiaItemAlerts`, `evaluateNoticiaAggregateAlerts`, `evaluateInstagramItemAlerts`, `evaluateXItemAlerts`). Um próximo passo natural é extrair os números para constantes nomeadas compartilhadas entre os dois arquivos, para eliminar essa duplicação descritiva.
