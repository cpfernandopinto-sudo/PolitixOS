# Validação — Integração Radar Real (rescue) + Nova Visão Geral

Data: 2026-07-29. Branch `release/radar-real-plus-overview`, base `origin/rescue/radar-production-20260727`.
Servida em `http://127.0.0.1:3003` (worktree `.claude/worktrees/release-radar-real-plus-overview`),
sem derrubar os servidores das etapas anteriores (3000, 3001, 3002 permaneceram ativos).

## Comparação por módulo

| Módulo | Rescue (`:3002`, antes da integração) | Release integrada (`:3003`) | Resultado |
|---|---|---|---|
| Visão Geral | Versão antiga (`OverviewAlerts`/`OverviewChannels`/`OverviewGauge`/`OverviewKPI`/`OverviewStrategicMap`/`OverviewDashboardClient` da rescue) | Nova Visão Geral completa: 5 cards, Panorama Analítico (4 gráficos), narrativa executiva, Síntese do Cenário, Termômetro de Crise Master, Estado Político, Mudanças Mais Relevantes, Riscos Prioritários, Alertas Prioritários (sem link morto), Entidades em Atenção, Temas em Atenção, Timeline Consolidada, Leitura Analítica Assistida (estado "nenhuma leitura gerada ainda"), Tabela Executiva | ✅ Substituída integralmente, como planejado |
| Radar de Notícias | Estrutura "nova" confirmada (Feed Crítico na primeira dobra, Filtros Globais, Leitura Analítica, todas as 11 assinaturas) | **Idêntica** — `git diff origin/rescue/radar-production-20260727 -- app/dashboard/noticias components/news lib/queries/noticias.ts lib/types/noticias.ts` vazio | ✅ Preservado sem nenhuma alteração |
| Instagram | Tema reskinado da rescue (`#070b14`, glass, dashboard-shell) | Idêntico — `git diff` vazio para `InstagramDashboard.tsx`, `app/dashboard/instagram/page.tsx` | ✅ Inalterado |
| X | Idem | Idêntico — `git diff` vazio para `XDashboard.tsx` | ✅ Inalterado |
| Automação | Modificado na rescue (270 linhas) | Idêntico — `git diff` vazio para `AutomationPanel.tsx` | ✅ Inalterado |
| Chrome global (Header/Sidebar/layout) | Reskin completo da rescue ("OPERAÇÃO ATIVA", paleta `#070b14`/`#22d3ee`) | Idêntico — confirmado visualmente (badge "OPERAÇÃO ATIVA" presente em todas as páginas) e por diff vazio | ✅ Inalterado — Overview renderiza dentro do chrome da rescue sem modificá-lo |

## Comparação visual — Radar (não apenas diff vazio)

Comparado visualmente `:3002` (rescue isolada) vs `:3003` (integrada), ambos em 1600×1000:
- Mesma estrutura de primeira dobra: 5 KPIs → Termômetro de Crise → Status em Tempo Real → Feed Crítico já visível.
- Mesmos rótulos, mesma paleta de cores, mesmo badge "OPERAÇÃO ATIVA" no header.
- Números diferem ligeiramente entre as duas capturas (ex.: Crescimento 24h -71% vs -83%, Termômetro 20/100 "Estável" vs 40/100 "Atenção") — **esperado**, pois são métricas calculadas em tempo real a partir do Supabase e mudam entre execuções distintas no tempo; não é uma diferença de código (confirmado pelo diff vazio).

## Adaptações de código aplicadas (únicas 4 desta integração)

| Arquivo | Alteração |
|---|---|
| `app/globals.css` | Acréscimo, ao final do arquivo, dos tokens `--color-severity-*` e utilitários `surface-hero/primary/muted`, `text-label`, `text-narrative` — nenhuma linha da rescue foi tocada |
| `components/dashboard/overview/OverviewKPI.tsx` | `volume_total.toLocaleString()` → `toLocaleString('pt-BR')` — elimina o mismatch de hidratação já documentado |
| `components/dashboard/overview/OverviewAlerts.tsx` | Removido o link "Ver todos" para `/dashboard/alertas` (rota não incluída nesta release) — texto ajustado para não referenciar uma Central de Alertas inexistente |
| `proxy.ts` | Uma linha: redirecionamento pós-login de `/dashboard/noticias` para `/dashboard/overview` |

Testes ajustados para acompanhar essas mudanças: `OverviewKPI.test.tsx` (locale `pt-BR`),
`OverviewAlerts.test.tsx` (2 testes do link substituídos por 1 teste confirmando sua ausência).

## Typecheck, lint, testes, build

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | Limpo (0 erros) |
| `npm run lint` | 77 problemas (53 erros, 24 avisos) — **redução em relação aos 91 da rescue isolada**, porque a nova Visão Geral substituiu arquivos que tinham mais problemas. Dos 77: 5 pertencem a arquivos transportados da Visão Geral (`OverviewChannels.tsx`: 1, `lib/queries/overview.ts`: 4) e **já eram pré-existentes na branch de desenvolvimento antes desta integração** (confirmado anteriormente); os outros 72 pertencem a arquivos nunca tocados por esta integração (confirmados via `git diff` vazio) — **zero problemas novos introduzidos** |
| `npx vitest run` | **164/164 testes passando** (165 anteriores − 2 testes do link "Ver todos" + 1 teste consolidado confirmando sua ausência = 164) |
| `npm run build` | Compilado com sucesso. 16 rotas geradas, incluindo `/api/dev-login` (temporário, não commitado — ver nota) e **sem** `/dashboard/alertas` (confirma exclusão) |

## Screenshots

Em `docs/screenshots/radar-real-plus-overview/`:
`overview-top.png`, `overview-analytics.png`, `overview-full.png`, `radar-top.png`,
`radar-analytics.png`, `radar-table.png`, `instagram.png`, `x.png`.

## Nota sobre autenticação local

A validação usou uma rota `dev-login` temporária (mesma técnica das etapas anteriores desta sessão),
criada apenas neste worktree para permitir login sem credenciais reais. **Não foi commitada** — é um
arquivo não rastreado (`app/api/dev-login/`) mais uma linha em `.env.local` (também não rastreado,
gitignored). Ambos serão removidos antes de qualquer commit desta branch, ou mantidos apenas
localmente se você quiser continuar revisando em `:3003`.

## Conclusão

Nenhum problema novo foi introduzido. O Radar real, o chrome global e todos os outros módulos
permanecem byte-a-byte idênticos à rescue. A nova Visão Geral está funcionalmente completa e
integrada. Porta `3003` mantida ativa para sua revisão visual.
