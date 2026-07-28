# Metodologia do Centro Executivo — PolitixOS

## O que é o Centro Executivo

A partir do Sprint 3, a Visão Geral (`/dashboard/overview`) funciona como um **cockpit executivo**: a primeira dobra da página deve permitir compreender o cenário político monitorado (notícias + Instagram + X, filtrados por candidato/período) em poucos segundos, respondendo a seis perguntas: estado atual, o que mudou, principais riscos, principais oportunidades, quem/o que exige atenção, e qual evidência sustenta cada conclusão.

Toda a lógica que decide "o que é notável" fica em módulos puros e testáveis (`lib/analytics/`), separados dos componentes visuais — os componentes apenas renderizam o que essas funções calculam.

## Como o estado político é classificado

`lib/analytics/political-status.ts#classifyPoliticalStatus` reaproveita **o mesmo score de crise** já calculado por `getCrisisOverview` (`lib/queries/overview.ts`) — uma média ponderada (50% notícias, 30% X, 20% Instagram) de indicadores de sentimento e risco já existentes desde a Fase 1. Os thresholds também são os mesmos já usados ali:

| Score | Classificação |
|---|---|
| > 75 | Crítico |
| > 50 | Tensão elevada |
| > 25 | Atenção |
| ≤ 25 | Estável |

Nenhum threshold novo foi criado — apenas os rótulos foram tornados mais executivos (ex.: "quente" → "Tensão elevada"). Quando não há volume de menções no período, o estado retorna explicitamente "Sem dados suficientes" em vez de uma classificação arbitrária.

## Como riscos são escolhidos

Os riscos exibidos vêm das **mesmas regras da Central de Alertas** (`docs/REGRAS_ALERTAS_POLITIXOS.md`), aplicadas como funções puras (`evaluateNoticiaItemAlerts`, `evaluateNoticiaAggregateAlerts`, `evaluateInstagramItemAlerts`, `evaluateXItemAlerts` — todas em `lib/queries/alerts.ts`) diretamente sobre os dados que a Visão Geral já buscou — não é uma consulta separada à Central de Alertas. Apenas alertas de severidade Alto ou Crítico viram "risco"; são ordenados por severidade e recência (`sortAlerts`) e limitados na tela (3 visíveis, com "Ver todos").

## Como oportunidades são identificadas

Ver `docs/REGRAS_OPORTUNIDADES_POLITIXOS.md` para as 3 regras completas. Resumo do princípio: uma oportunidade exige **evidência de duas fontes** — ou uma comparação temporal real (sentimento melhorando entre dois períodos reais), ou uma combinação de dois sinais de estado atual (alta exposição **e** baixo risco). Nunca "ausência de risco" isolada.

## Como mudanças são calculadas

`lib/analytics/executive-summary.ts#selectKeyChanges` só gera uma mudança quando há uma janela anterior real para comparar. A divisão em "período atual" e "período anterior" (`splitByPeriod`) reaproveita a mesma técnica já usada por `calculateTrend` desde a Fase 1: para período "todo o histórico", divide o intervalo observado ao meio; para um período em dias (ex.: 7 dias), compara os últimos N dias com os N dias imediatamente anteriores. Quando não há dados suficientes para uma janela anterior (poucos itens ou histórico insuficiente), a lista de mudanças fica vazia — nunca aparece um card zerado fingindo ser uma comparação real.

A interpretação (favorável/desfavorável/neutro) depende do significado da métrica, não da direção da seta: aumento de sentimento negativo é desfavorável, queda é favorável; variação de volume bruto é tratada como neutra (mais cobertura não é intrinsecamente boa ou ruim).

## Como temas e entidades são ranqueados

- **Temas**: reaproveita `getDominantTopics` (já existente desde a Fase 1, calcula frequência e sentimento médio por tema a partir de `ai_topics`). `rankThemes` apenas reordena e limita — não recalcula frequência.
- **Entidades**: `rankEntities` agrega notícias + posts de Instagram/X por `candidate_name`, contando volume, sentimento/risco predominantes (moda, não média) e cruzando com o número de alertas ativos por entidade. Quando a entidade tem posts sociais vinculados a um `target_id`, esse ID é preservado para permitir a ação "Filtrar" — entidades conhecidas apenas por notícias (que não carregam `target_id`) não recebem essa ação, para não fabricar um link quebrado.

## Como a timeline é agrupada

O modo agrupado (`lib/analytics/timeline-grouping.ts#groupTimelineEvents`) **não usa IA generativa**. Agrupa exclusivamente por igualdade de string do primeiro tema associado a cada evento (já extraído da análise de IA existente, `ai_topics`/`topic`), normalizado para minúsculas. Eventos sem tema viram grupos de um único item (fallback por `canal:id`). Dentro de cada grupo, a severidade exibida é a maior entre os eventos, as entidades associadas são a união sem duplicatas, e o sentimento predominante é a moda dos sentimentos dos eventos do grupo.

## Como evitar viés

- Nenhuma regra usa nome de candidato, partido ou afiliação política como critério — todas operam sobre métricas (score, contagem, percentual, presença de flags), aplicadas identicamente a qualquer entidade.
- Os mesmos thresholds valem para todos os candidatos monitorados; não há tratamento diferenciado.
- O sistema não gera opinião, recomendação de voto ou previsão eleitoral em nenhum texto — as "ações recomendadas" do Mapa de Ação Estratégica (já existente desde a Fase 1) são recomendações operacionais de comunicação (ex.: "monitorar", "mitigar"), não políticas.

## Como evitar conclusões sem evidência

Toda estrutura de síntese (`ExecutiveSynthesisField`) carrega um campo `semDados: boolean` e `evidenceRefs: EvidenceRef[]`. Quando não há dado real, o campo explicitamente marca `semDados: true` e a interface exibe "Dados insuficientes para síntese" — nunca um valor de fallback silencioso (nem `0`, nem `"neutro"`, nem texto genérico). Quando há evidência com link (ex.: um alerta com URL da notícia/post de origem), o campo carrega essa referência para a UI oferecer "Ver evidência".

## Limitações da metodologia

- **Score de crise não é uma medição científica de "popularidade" ou "aprovação"** — é um indicador sintético derivado de volume, sentimento e classificações de risco da IA de análise já existente no projeto. Deve ser lido como um resumo operacional, não como pesquisa de opinião.
- **"Tema em Destaque" reflete apenas volume no período atual**, não crescimento — o projeto não tem dado histórico de frequência por tema para calcular uma tendência real (ver `docs/REGRAS_OPORTUNIDADES_POLITIXOS.md`, seção "Regras descartadas").
- **Comparação período-a-período dos KPIs de Instagram/X individualmente** (por métrica, não agregada) não está implementada — a comparação existente é agregada (sentimento geral, volume geral), não por métrica de cada rede.
- **Ranking de entidades depende de `candidate_name` estar preenchido** nos dados de origem; itens sem candidato identificado ("—") são excluídos do ranking.

## Como ajustar as regras no futuro

1. Thresholds de alerta → `lib/config/alert-thresholds.ts`.
2. Thresholds de oportunidade → `lib/config/opportunity-thresholds.ts` (descritivo) + constantes em `lib/analytics/executive-summary.ts` (`OPPORTUNITY_SHARE_DELTA_THRESHOLD`, `OPPORTUNITY_TOP_N_EXPOSURE`, `KEY_CHANGE_SHARE_DELTA_THRESHOLD`).
3. Thresholds de estado político → `POLITICAL_STATUS_THRESHOLDS` em `lib/analytics/political-status.ts`.
4. Qualquer alteração nesses arquivos deve vir acompanhada de atualização dos testes correspondentes (`lib/analytics/*.test.ts`) e destes documentos.
