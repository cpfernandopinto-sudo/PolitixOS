# Matriz de Resgate — Radar de Notícias em Produção

Objetivo deste documento: decidir, arquivo por arquivo, o que entra no commit de resgate. **O
objetivo do primeiro commit é preservar o estado que gerou a produção real, não otimizar ou
limpar.** Nenhum destes 29 itens contém segredo (verificado por busca de padrões no diff — ver
`docs/RESGATE_RADAR_PRODUCAO.md`), então, na dúvida, a decisão é sempre **incluir e documentar**.

## Grupo A — Radar de Notícias (direto)

| Arquivo | Motivo da alteração | Necessário para Radar | Afeta outros módulos | Incluir |
|---|---|---:|---:|---:|
| `app/dashboard/noticias/NoticiasDashboardClient.tsx` | Redesenho completo do Radar (873 linhas) — contém as 11 assinaturas confirmadas (Termômetro, Status em Tempo Real, Feed Crítico, Temas Negativos, Fontes, Distribuição, Evolução do Risco, Linha do Tempo, Base Completa, Filtros Globais, Leitura Analítica) | Sim | Não | **Sim** |
| `app/dashboard/noticias/NewsGlobalFilters.tsx` | Ajuste nos filtros globais (110 linhas) — contém "Filtros Globais" | Sim | Não | **Sim** |
| `lib/queries/noticias.ts` | Pequeno ajuste (3 linhas) — provavelmente dado necessário para o novo layout | Sim | Não | **Sim** |
| `lib/types/noticias.ts` | 1 linha adicionada — provavelmente novo campo de tipo usado pelo redesenho | Sim | Não | **Sim** |
| `components/news/NewsDetailModal.tsx` (novo) | Componente inteiramente novo, não rastreado — modal de detalhe, provável origem de "Investigação Profunda"/detalhe de notícia no Radar novo | Sim | Não | **Sim** |

## Grupo B — Componentes compartilhados necessários ao Radar

| Arquivo | Motivo da alteração | Necessário para Radar | Afeta outros módulos | Incluir |
|---|---:|---:|---:|---:|
| `components/ui/DataTable.tsx` | Maior diff do grupo (405 linhas) — muito provavelmente a tabela por trás de "Base Completa de Monitoramento" | Sim | Sim — usado também por Investigações/outros módulos | **Sim** — sem ele o Radar não teria a tabela nova |
| `components/ui/KpiCard.tsx` | 34 linhas — provável origem visual dos 5 KPIs do Radar (Alertas Ativos, Crescimento 24h, etc.) | Sim | Sim — usado por Overview também | **Sim** |
| `components/ui/ChartCard.tsx` | 8 linhas — moldura dos cards de gráfico (Termômetro, Evolução do Risco etc.) | Sim | Sim — usado por Overview também | **Sim** |
| `components/charts/GaugeChart.tsx` | 14 linhas — motor do Termômetro de Crise | Sim | Sim — usado por Overview também | **Sim** |
| `components/charts/BarChart.tsx`, `DonutChart.tsx`, `LineChart.tsx` | 115+35+34 linhas — prováveis motores de Distribuição do Impacto, Evolução do Risco, Linha do Tempo | Sim (provável) | Sim — reutilizados em outros módulos | **Sim** |
| `app/globals.css` | 158 linhas — inclui, entre outras coisas, o utilitário de brilho ciano (`shadow-[0_0_10px_#00FFFF]`) visto em "Base Completa de Monitoramento" | Sim (estilo) | Sim — CSS global, todas as telas | **Sim** |
| `app/dashboard/layout.tsx` | 4 linhas — mudança pequena, provavelmente estrutural para o novo Radar | Incerto, mas pequeno | Sim — layout do dashboard inteiro | **Sim** (baixo risco, diff pequeno, preferir preservar) |
| `app/layout.tsx` | 2 linhas — mudança mínima | Incerto | Sim — layout raiz | **Sim** (diff mínimo) |
| `components/Header.tsx` | 40 linhas | Incerto, possivelmente relacionado a busca/filtros | Sim — chrome global | **Sim** |
| `components/Sidebar.tsx` | 20 linhas | Incerto | Sim — chrome global | **Sim** |

## Grupo C — Outros módulos modificados (não diretamente Radar)

Estes arquivos fazem parte do **mesmo estado não commitado**, ou seja, muito provavelmente também
foram publicados juntos no mesmo deploy fora do Git (ver hipótese de `vercel deploy` na
rastreabilidade). Não sei se cada um individualmente está ativo na produção hoje, mas excluí-los
do resgate arriscaria perder parte do estado real caso estejam.

| Arquivo | Motivo da alteração | Necessário para Radar | Afeta outros módulos | Incluir |
|---|---|---:|---:|---:|
| `app/dashboard/instagram/page.tsx` | 14 linhas | Não | Sim — Instagram | **Sim** (preservar o snapshot completo) |
| `components/dashboard/InstagramDashboard.tsx` | 29 linhas | Não | Sim — Instagram | **Sim** |
| `components/dashboard/XDashboard.tsx` | 17 linhas | Não | Sim — X | **Sim** |
| `components/AutomationPanel.tsx` | 270 linhas — diff grande | Não | Sim — Automação | **Sim** |
| `components/dashboard/overview/OverviewAlerts.tsx` | 102 linhas | Não | Sim — Visão Geral (versão antiga, anterior aos Sprints 4-6 desta auditoria) | **Sim** |
| `components/dashboard/overview/OverviewChannels.tsx` | 148 linhas | Não | Sim — idem | **Sim** |
| `components/dashboard/overview/OverviewDashboardClient.tsx` | 153 linhas | Não | Sim — idem (este arquivo foi removido como código morto na branch de desenvolvimento desta auditoria — aqui é uma versão anterior e ainda ativa) | **Sim** |
| `components/dashboard/overview/OverviewGauge.tsx` | 22 linhas | Não | Sim — idem | **Sim** |
| `components/dashboard/overview/OverviewKPI.tsx` | 42 linhas | Não | Sim — idem | **Sim** |
| `components/dashboard/overview/OverviewStrategicMap.tsx` | 28 linhas | Não | Sim — idem | **Sim** |
| `lib/n8n.ts` | 4 linhas | Não | Sim — Automação/Investigações | **Sim** |
| `lib/queries/overview.ts` | 2 linhas removidas | Não | Sim — Visão Geral (versão antiga) | **Sim** |

**Nota importante**: os arquivos do Grupo C revelam que o estado não commitado pode representar
**mais do que um Radar atualizado** — é possível que a Visão Geral, Instagram, X e Automação
publicados em produção hoje também sejam esta versão, diferente da que existe em `origin/main` e
diferente da nova Visão Geral desenvolvida nos Sprints 4-6 desta auditoria (branch
`claude/politixos-audit-enhancement-f4d793`). Isto é uma constatação, não uma ação — nenhuma
mudança de escopo foi feita; o pedido desta tarefa é resgatar exatamente este estado, íntegro.

## Grupo D — Arquivos suspeitos ou temporários

Nenhum encontrado. Não há arquivos `.tmp`, `.bak`, de debug, ou fora do padrão do projeto entre os
29 itens.

## Grupo E — Segredos/configurações locais

Nenhum arquivo de segredo está entre as alterações. Verificação detalhada (busca por padrões de
chave/token/senha no diff inteiro) não encontrou nenhuma ocorrência — ver
`docs/RESGATE_RADAR_PRODUCAO.md`, seção de verificação de segredos. `.vercel/project.json` já está
no `.gitignore` do projeto e não será adicionado (nem precisa ser — não é específico deste resgate).

## Decisão final

**Incluir todos os 29 itens (28 modificados + 1 novo) no commit de resgate.** Nenhum foi excluído.
`git add` será feito listando os 29 caminhos explicitamente (nunca `git add .` ou `git add -A`),
para que a lista fique auditável neste documento e no próprio commit.
