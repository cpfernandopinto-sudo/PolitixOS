# Validação — Reintegração dos Gráficos Estratégicos

Ambiente: `npm run dev` local (`http://127.0.0.1:3000`), autenticação via `app/api/dev-login` (dev-only), dados reais do Supabase configurado em `.env.local`. Branch: `claude/politixos-audit-enhancement-f4d793`, worktree `.claude/worktrees/distracted-hofstadter-fd5510` (confirmado via `lsof -a -p <PID> -d cwd` antes da captura). Screenshots reais via Playwright em `docs/screenshots/analytics-reintegration/`.

## Contexto

O responsável pelo produto revisou a Visão Geral pós-Sprint 5 e apontou que a hierarquia executiva (narrativa, síntese, Estado Político, riscos/oportunidades) escondeu os gráficos estratégicos da versão anterior — Score de Saúde, Temperatura, Tendência, Alertas Ativos, Volume Total, Termômetro de Crise Master, Alertas Prioritários, Temas Dominantes, Distribuição por Canal, Sentimento Consolidado, Distribuição de Risco — dentro de "Análises Complementares", recolhida por padrão. Esta reintegração reorganiza a página em 3 camadas sem remover nenhuma evolução dos Sprints 3–5.

## Blocos reintegrados

| Bloco | Posição antiga | Posição nova | Dados |
|---|---|---|---|
| Cards executivos (5) | "Análises Complementares" (recolhida) | Camada 1 — logo após a Narrativa Executiva | `getOverviewKPIs` (já cacheado) |
| Termômetro de Crise Master | "Análises Complementares" | Camada 2 — ao lado dos Alertas Prioritários | `getCrisisOverview` (já cacheado) |
| Alertas Prioritários | "Análises Complementares" | Camada 2 — ao lado do Termômetro | **Fonte trocada**: `getExecutiveOverviewData(filters).risks` (antes: `getPriorityAlerts`, removida) |
| Temas Dominantes | "Análises Complementares" | Camada 2 — grid "Panorama Analítico" | `getDominantTopics` (já cacheado) |
| Sentimento Consolidado | "Análises Complementares" | Camada 2 — grid "Panorama Analítico" | `getSentimentOverview` (já cacheado) |
| Distribuição de Risco | "Análises Complementares" | Camada 2 — grid "Panorama Analítico" | `getRiskOverview` (já cacheado) |
| Distribuição por Canal (radar) | "Análises Complementares" | Camada 2 — linha própria, largura total | `getChannelDistribution` (já cacheado) — **2 dimensões fabricadas removidas** (ver abaixo) |

**Não reintegrado** (permanece em "Análises Complementares", por não estar na lista pedida — é recomendação operacional, item secundário por natureza): Mapa de Ação Estratégica (`OverviewStrategicMap`/`getStrategicActions`).

## Bugs reais encontrados e corrigidos durante a reintegração

1. **Métrica fabricada no radar "Distribuição por Canal"** (encontrado na auditoria, antes de mexer no código): a dimensão "Alcance" usava constantes fixas (`80`/`60`/`90`) sem nenhuma origem em dado real; "Polarização" também era fixa (`0.2`/`0.4`) para Notícias/Instagram (só X tem o campo real). Ambas removidas — o radar agora tem apenas 3 dimensões com dado real para os três canais (Sentimento, Risco, Volume/Engajamento). Ver `docs/AUDITORIA_VISUAL_SPRINT_5.md`.
2. **Regressão de layout no mesmo radar** (encontrada durante a validação visual desta tarefa, não antes): ao mover o bloco para a Camada 2 (sempre visível, montado imediatamente no carregamento), o gráfico passou a renderizar com ~100px de altura em vez de ~340px — console do navegador confirmava `[ECharts] Can't get DOM width or height`. Causa: o componente dependia de um contexto flex (`h-full` + `flex-1 min-h-[...]`) que só funcionava quando montado dentro do grid de duas colunas de "Análises Complementares" (JÁ ABERTA pelo usuário, layout assentado). Ao montar imediatamente no fluxo inicial da página (Suspense/streaming), o ECharts mediu o container antes do layout assentar. **Corrigido** trocando para altura fixa (`h-[340px] lg:h-[360px]`), mesmo padrão já usado com sucesso em `OverviewSentiment`/`OverviewRisk`. Confirmado via script de depuração Playwright (canvas: 1414×100 → 1414×360) e visualmente (`docs/screenshots/analytics-reintegration/analytics-grid.png`).
3. **Alertas Prioritários usava título bruto como nome do alerta** (mesmo bug já corrigido no Sprint 5 para o board de Riscos, presente aqui sem correção): a função `getPriorityAlerts` usava `resumo: n.title`/`p.text.substring(0,100)`. Corrigido substituindo a fonte de dados por `getExecutiveOverviewData(filters).risks` (já em linguagem executiva via `formatExecutiveRisk`) e removendo `getPriorityAlerts` (ficou sem consumidores).

## Screenshots

| Arquivo | Conteúdo |
|---|---|
| `overview-1600-top.png` | Primeira dobra completa: narrativa, 5 cards executivos, síntese + Estado Político |
| `crisis-alerts.png` | Termômetro de Crise Master + Alertas Prioritários lado a lado, com o texto de diferenciação do Estado Político |
| `analytics-grid.png` / `overview-1600-analytics.png` | Panorama Analítico: Temas Dominantes, Sentimento Consolidado, Distribuição de Risco, e o radar de Distribuição por Canal (já com o bug de altura corrigido) |
| `overview-1600-full.png` | Página completa em 1600px, ordem final ponta a ponta |
| `analyses-complementary.png` | "Análises Complementares" expandida — mostra que só resta o Mapa de Ação Estratégica, sem duplicação dos blocos promovidos |
| `overview-1280.png` | Notebook — 1280px |
| `overview-768.png` | Tablet — 768px |
| `overview-390.png` | Mobile — 390px, ordem completa em coluna única |

## Consultas — antes/depois

Nenhuma consulta nova foi introduzida. Todos os blocos reintegrados já usavam `fetchOverviewData(filters)` (cacheada via `React.cache()`) ou `getExecutiveOverviewData(filters)` (também cacheada, construída sobre a mesma `fetchOverviewData`). O único bloco cuja fonte mudou (Alertas Prioritários) passou a reutilizar dado já calculado por `getExecutiveOverviewData`, em vez de uma função paralela (`getPriorityAlerts`, agora removida) — resultado: **uma função a menos é executada por carregamento**, não uma a mais.

- **Antes** (Sprint 5): 2 execuções reais de `fetchOverviewData` por carregamento (filtros da página + período completo para tendência), independentemente de quantos blocos consomem os dados — mesma dedução already validada nos Sprints 3/4.
- **Depois** (esta tarefa): idêntico — 2 execuções reais de `fetchOverviewData`, mais a consulta leve e independente de opções de candidato (`getOverviewFiltersOptions`). `getPriorityAlerts` (que também reaproveitava `fetchOverviewData`, sem custo extra de consulta, mas com computação redundante e um critério de severidade paralelo) foi removida.

## Impacto de performance

Sem regressão esperada: os mesmos dados já eram buscados; a diferença é puramente de onde/quando são renderizados (Suspense/streaming preservados, cada bloco continua com seu próprio `SectionBoundary` e fallback). O `npm run build` de produção completa com sucesso (ver relatório final) sem aumento de rotas ou dependências novas.

## Impacto visual

- Os 4 gráficos estratégicos e o resumo operacional de Alertas Prioritários estão visíveis por padrão, sem exigir nenhum clique.
- A Narrativa Executiva, o Estado Político, os boards de Riscos/Oportunidades/Mudanças, Entidades/Temas em Atenção, a Timeline e a Leitura Analítica Assistida por IA continuam presentes e na mesma qualidade construída nos Sprints 3–5 — nada foi removido.
- Não há retorno à interface antiga: a narrativa, a hierarquia de superfícies (`surface-hero`/`surface-primary`), os avatares de entidade e os demais padrões visuais do Sprint 5 permanecem.
- Não há componente duplicado: cada bloco aparece em exatamente uma posição.

## Pendências

- Medição formal de Lighthouse não foi possível neste ambiente (sem Chrome DevTools headless com throttling disponível) — a ausência de regressão foi verificada por contagem de consultas (inalterada) e inspeção de bundle via `npm run build` (sem rotas/dependências novas).
- Validação com papéis restritos (`gestor`/`visualizador`) não realizada nesta tarefa — mesma pendência já registrada nos Sprints 4 e 5.
