# Matriz de Integração — Radar Real (rescue) + Nova Visão Geral

Base: `origin/rescue/radar-production-20260727` (não `origin/main`). Esta matriz reaudita, contra a
nova base, cada arquivo já classificado em `docs/MATRIZ_RELEASE_SEGURA_OVERVIEW.md` (que usava
`origin/main` como base) — porque a rescue modificou vários componentes compartilhados que a versão
anterior não precisava considerar.

## O que mudou em relação à matriz anterior

A rescue modifica estes arquivos compartilhados além do Radar em si:
`ChartCard.tsx`, `KpiCard.tsx`, `DataTable.tsx`, `GaugeChart.tsx`, `globals.css`, `Header.tsx`,
`Sidebar.tsx`, `app/dashboard/layout.tsx`, `app/layout.tsx`, `lib/queries/overview.ts`,
`lib/queries/noticias.ts`, `lib/types/noticias.ts`.

Verificação de consumidores (repetida contra o código atual, com `rg`):

| Arquivo compartilhado alterado pela rescue | A Visão Geral (branch de desenvolvimento) o usa? | Decisão |
|---|---|---|
| `components/ui/ChartCard.tsx` | **Não** — nenhum arquivo em `app/dashboard/overview` ou `components/dashboard/overview` importa este arquivo | Não tocar — fica exatamente como a rescue deixou |
| `components/ui/KpiCard.tsx` | **Não** — idem | Não tocar |
| `components/ui/DataTable.tsx` | **Não** — idem | Não tocar |
| `components/charts/GaugeChart.tsx` | **Sim** — `PoliticalStatusCard.tsx:77` (`<GaugeChart score=... level=... />`) | **Manter a versão da rescue sem alteração.** Diff da rescue é estritamente aditivo (`showValue?`, `height?`, ambos opcionais com default idêntico ao comportamento antigo) — `PoliticalStatusCard.tsx` chama só `score`/`level`, então funciona sem nenhuma mudança |
| `components/Header.tsx`, `components/Sidebar.tsx`, `app/dashboard/layout.tsx`, `app/layout.tsx` | **Não** — confirmado de novo por `rg`: nenhum arquivo exclusivo do Overview importa esses | Não tocar — Overview renderiza dentro do chrome da rescue automaticamente |
| `app/globals.css` | **Sim, indiretamente** — a Visão Geral usa classes novas (`surface-hero`, `surface-primary`, `surface-muted`, `text-label`, `text-narrative`) e tokens (`--color-severity-*`) que não existem no CSS de nenhuma das duas bases | **Mesclar por acréscimo**: anexar ao final do `globals.css` da rescue somente os blocos `@theme` (tokens `--color-severity-*` etc.) e `@utility` novos do Overview — sem tocar em nenhuma linha já existente na rescue (que reestilizou toda a paleta: fundo `#070b14`, acento `#22d3ee`, glass, dashboard-shell etc.). Nenhuma colisão de nome de classe/variável |
| `lib/queries/overview.ts` | **Sim — é o arquivo de dados exclusivo da Visão Geral** | O diff da rescue aqui é a remoção de 1 `console.log` de depuração, sem nenhum efeito funcional. Como o arquivo é, na prática, de uso exclusivo do Overview (Radar nunca o importa), **substituir integralmente pela versão da branch de desenvolvimento** é seguro — o "diff perdido" da rescue é irrelevante (só um log) |
| `lib/queries/noticias.ts`, `lib/types/noticias.ts` | **Não diretamente pelo Overview** — mas `lib/queries/alerts.ts` (dependência do Overview) importa `fetchMencoes` de `noticias.ts` | **Não tocar.** Confirmado: `fetchMencoes` continua exportado sem mudança de assinatura na versão da rescue; o diff da rescue nesses 2 arquivos é aditivo (`candidato` no tipo `Noticia`, um `any` corrigido) e não quebra `alerts.ts` |

## Grupo A — Transportar sem alteração (idêntico à matriz anterior)

Todos os 64 arquivos já listados em `docs/MATRIZ_RELEASE_SEGURA_OVERVIEW.md` como Grupo A, **exceto**
`lib/queries/overview.ts` (mantido aqui, ver acima — decisão confirmada, não mudou) e **exceto**
qualquer arquivo que colidisse com a lista de compartilhados acima (nenhum colide, pois nenhum
arquivo do Grupo A original é `ChartCard`/`KpiCard`/`DataTable`/`GaugeChart`/`Header`/`Sidebar`/
`layout`).

## Grupo B — Radar real (rescue) — Intocável

`app/dashboard/noticias/**`, `components/news/**`, `lib/queries/noticias.ts`,
`lib/types/noticias.ts`, e os componentes compartilhados usados majoritariamente pelo Radar
(`ChartCard`, `KpiCard`, `DataTable`) — nenhum será tocado.

## Grupo C — Adaptações necessárias (código mínimo, documentado aqui)

| Arquivo | Adaptação | Motivo |
|---|---|---|
| `app/globals.css` | Acrescentar ao final os blocos novos do Overview (tokens de severidade + utilitários `surface-*`/`text-label`/`text-narrative`), sem remover/alterar nada da rescue | A Visão Geral depende dessas classes para estilizar corretamente; a rescue não as tem |
| `components/dashboard/overview/OverviewKPI.tsx` | `volume_total.toLocaleString()` → `volume_total.toLocaleString('pt-BR')` | Decisão explícita desta release — elimina o mismatch de hidratação (`1.500` servidor vs `1,500` cliente) já documentado como bug pré-existente |
| `components/dashboard/overview/OverviewAlerts.tsx` | Remover o link "Ver todos" para `/dashboard/alertas` (linha 85 na branch de desenvolvimento) — a Central de Alertas não foi incluída nesta release | Decisão explícita desta release — nenhum link morto |
| `proxy.ts` | Uma linha: `'/dashboard/noticias'` → `'/dashboard/overview'` no redirecionamento pós-login (linha 50 da rescue). **Nenhuma outra linha tocada** — mapa de rotas e demais regras da rescue permanecem intactos | Decisão de produto: Visão Geral como tela inicial |

## Grupo D — Não incluídos nesta release (decisões conservadoras)

| Item | Decisão |
|---|---|
| `ANTHROPIC_API_KEY` | Não configurada. `AssistedInsight` permanece com estado "indisponível" (já tratado com segurança no código) |
| `supabase_migration_executive_ai_insights.sql` | Arquivo pode ser transportado como documentação/referência, mas **a migration não será executada** |
| Central de Alertas (`app/dashboard/alertas/**`) | Não transportada nesta release — por isso o link "Ver todos" é removido em vez de apontar para rota inexistente |
| `app/api/dev-login/**` | Nunca incluído em nenhum commit — usado apenas localmente, fora do controle de versão, para validação |

## Conclusão

Apenas **4 arquivos** recebem alteração de código nesta integração além do transporte puro de
arquivos exclusivos do Overview: `globals.css` (acréscimo), `OverviewKPI.tsx` (1 linha),
`OverviewAlerts.tsx` (remoção do link), `proxy.ts` (1 linha). Todo o resto é transporte seletivo
idêntico ao já auditado. Nenhum arquivo do Radar real é tocado.
