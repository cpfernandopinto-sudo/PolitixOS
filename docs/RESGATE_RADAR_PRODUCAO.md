# Resgate — Radar de Notícias Publicado em Produção

Data do resgate: 2026-07-29. Este documento descreve **o que foi feito para preservar** o código
não commitado que corresponde à versão do Radar de Notícias (e de outras telas) atualmente
publicada em `app.politixos.ia.br`. **Este código não foi validado quanto a qualidade, estilo ou
prontidão para produção — é um snapshot de resgate.**

## Origem do código

- **Onde estava**: pasta raiz do repositório local (`/PolitixOS`, fora de qualquer worktree do
  Claude), como alterações não commitadas sobre o commit `9bc5f36` (idêntico a `origin/main`).
- **Como foi encontrado**: investigado em `docs/RASTREABILIDADE_PRODUCAO_REAL_POLITIXOS.md`. Resumo:
  o último deployment de Production via integração GitHub→Vercel é `9bc5f36` (18/05/2026); a Vercel
  CLI foi autenticada nesta máquina em 27/07/2026 22:23, com o mesmo Team ID do projeto `politix-os`;
  os arquivos do Radar foram salvos pela última vez às 23:39–23:45 do mesmo dia — evidência forte de
  publicação direta via CLI, fora do fluxo Git.
- **Por que não estava versionado**: desconhecido — não há registro de por que um `git commit` nunca
  foi feito antes da publicação. Não faço suposições sobre a causa além do que os dados mostram.

## Arquivos resgatados (29 no total — 28 modificados + 1 novo)

Classificados e justificados em `docs/MATRIZ_RESGATE_RADAR_PRODUCAO.md`. Nenhum arquivo foi excluído
do resgate — todos os 29 foram incluídos, porque nenhum continha segredo e o objetivo era preservar
o estado completo, não selecionar.

**Grupo A — Radar direto (5)**: `NoticiasDashboardClient.tsx`, `NewsGlobalFilters.tsx`,
`lib/queries/noticias.ts`, `lib/types/noticias.ts`, `components/news/NewsDetailModal.tsx` (novo).

**Grupo B — Compartilhados necessários ao Radar (10)**: `DataTable.tsx`, `KpiCard.tsx`,
`ChartCard.tsx`, `GaugeChart.tsx`, `BarChart.tsx`, `DonutChart.tsx`, `LineChart.tsx`,
`globals.css`, `layout.tsx` (dashboard e raiz), `Header.tsx`, `Sidebar.tsx`.

**Grupo C — Outros módulos preservados no mesmo snapshot (12)**: `instagram/page.tsx`,
`InstagramDashboard.tsx`, `XDashboard.tsx`, `AutomationPanel.tsx`, `OverviewAlerts.tsx`,
`OverviewChannels.tsx`, `OverviewDashboardClient.tsx`, `OverviewGauge.tsx`, `OverviewKPI.tsx`,
`OverviewStrategicMap.tsx`, `lib/n8n.ts`, `lib/queries/overview.ts`.

Nenhum arquivo do Grupo D (suspeito/temporário) ou E (segredo) foi encontrado.

## Commit, tag e branch

| Item | Valor |
|---|---|
| Branch local | `rescue/radar-production-20260727` |
| Commit-base (detached HEAD original) | `9bc5f368f27948fadce9ca1e0a56cf491d2e8da1` |
| Commit de resgate | `8f774c449fbaddf3e4e900d2a9828a3ca36ee214` |
| Mensagem do commit | `rescue: preserva versão do Radar publicada em produção` |
| Tag local anotada | `rescue-radar-production-20260727` (não pushada) |
| Arquivos no commit | 29 (2.060 inserções, 885 remoções) |

## Backup físico (fora do Git)

| Item | Local |
|---|---|
| Pasta com os 29 arquivos + metadados | `~/Desktop/PolitixOS-rescue-20260729/` |
| Compactado | `~/Desktop/PolitixOS-rescue-20260729.tar.gz` (159 KB) |
| Conteúdo | `rescue-files.txt`, `rescue-status.txt`, `rescue-diff.patch` (3.903 linhas), `rescue-head.txt`, `package.json`, `package-lock.json`, `.vercel/project.json`, cópia de cada arquivo modificado |
| Segredos | Confirmado ausentes — `.env.local`, `auth.json`, tokens e credenciais **não foram copiados** |

## Assinatura funcional confirmada

As 11 strings usadas como assinatura do "Radar novo" foram encontradas, com arquivo:linha, antes do
commit:

| String | Local |
|---|---|
| Termômetro de Crise | `NoticiasDashboardClient.tsx:170` |
| Status em Tempo Real | `NoticiasDashboardClient.tsx:259` |
| Feed Crítico — Últimas | `NoticiasDashboardClient.tsx:339` |
| Principais Temas Negativos | `NoticiasDashboardClient.tsx:443` |
| Fontes com Maior Impacto | `NoticiasDashboardClient.tsx:486` |
| Distribuição do Impacto | `NoticiasDashboardClient.tsx:541` |
| Evolução do Risco | `NoticiasDashboardClient.tsx:571` |
| Linha do Tempo de Crise — Últimas 24 horas | `NoticiasDashboardClient.tsx:592` |
| Base Completa de Monitoramento | `NoticiasDashboardClient.tsx:701` |
| Filtros Globais | `NewsGlobalFilters.tsx:81` |
| Leitura Analítica | `NoticiasDashboardClient.tsx:429` |

## Testes, typecheck, lint, build

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | Limpo (0 erros) |
| `npm run lint` | 91 problemas (67 erros, 24 avisos) — **registrados, não corrigidos**, conforme instrução explícita de não alterar código nesta etapa. Predominam `@typescript-eslint/no-explicit-any` e `prefer-const`, espalhados por `XDashboard.tsx`, `XFilterBar.tsx`, `OverviewDashboardClient.tsx`, `BadgeStatus.tsx`, `lib/queries/instagram.ts`, `lib/queries/overview.ts`, `lib/queries/x.ts`, além de 2 arquivos fora do app (`scratch/`, `scripts/`) |
| Testes automatizados | **Não há script de teste neste snapshot** — o `package.json` deste commit é anterior à infraestrutura de testes (`vitest`) introduzida nos Sprints 4-6 da branch de desenvolvimento; não é um erro, é uma característica do estado resgatado |
| `npm run build` | Compilado com sucesso. Rotas: `/`, `/_not-found`, `/api/investigations/start`, `/dashboard`, `/dashboard/automacoes`, `/dashboard/candidatos`, `/dashboard/instagram`, `/dashboard/investigacoes(+[id])`, `/dashboard/noticias`, `/dashboard/overview`, `/dashboard/sem-permissao`, `/dashboard/usuarios`, `/dashboard/x`, `/login` |

**Nenhum erro foi corrigido.** Este é o estado exato encontrado, preservado como snapshot.

## Validação visual (localhost:3002)

Servido em `http://127.0.0.1:3002` (branch `rescue/radar-production-20260727`, commit `8f774c4`),
autenticado via uma rota `dev-login` **temporária**, criada apenas para este teste e **removida do
disco antes do commit de documentação** (não faz parte de nenhum commit — gated por
`ENABLE_DEV_LOGIN=true`, nunca usado em produção).

Screenshots em `docs/screenshots/rescue-radar/`:
- `noticias-top.png` — confirma "Feed Crítico — Últimas" já visível na primeira dobra, junto de Termômetro de Crise e Status em Tempo Real (a mudança de composição que motivou toda esta investigação).
- `noticias-analytics.png`, `noticias-table.png` — demais seções do Radar.
- `overview-current.png`, `instagram-current.png`, `x-current.png` — demais módulos preservados no mesmo snapshot (página completa).

## Push

```
git push -u origin rescue/radar-production-20260727
```
Executado após backup, commit, tag local, validação e screenshots — ver confirmação no relatório
final desta tarefa. **A tag local não foi pushada** (aguardando autorização explícita, conforme
pedido).

## Riscos

- Este código não foi revisado quanto a qualidade — contém 91 problemas de lint conhecidos e
  nenhuma cobertura de teste automatizado.
- Não é idêntico, byte a byte, ao que está em produção — a comparação foi por assinatura funcional
  (títulos de seção) e validação visual, não por diff direto contra o site autenticado (sem acesso).
- Os arquivos do Grupo C (Instagram, X, Automação, Overview antigo) foram preservados junto por
  pertencerem ao mesmo snapshot não commitado, não porque foi confirmado que cada um individualmente
  está ativo em produção hoje.

## Próximos passos seguros (não executados nesta tarefa)

1. Com o código agora preservado e versionado, uma futura branch de release pode ser construída a
   partir de `rescue/radar-production-20260727` (em vez de `origin/main`, que se mostrou incompleto),
   transportando por cima dela somente as melhorias da Visão Geral — repetindo a mesma disciplina de
   matriz de impacto e diff vazio já usada em `release/overview-presentation-safe`.
2. Correções de lint, adoção de testes, e qualquer refino de qualidade devem acontecer em uma branch
   derivada da rescue, não nela mesma.
3. Nenhuma dessas etapas foi iniciada — aguardando autorização.
