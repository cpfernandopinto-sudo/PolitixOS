# RELATÓRIO — CORREÇÃO INSTAGRAM 3B.4 — REGRESSÃO UI 01

Data: 21/08/2026  
Branch: `codex/instagram-bloco3b4-ui`  
Base/HEAD inicial: `a6f8f2b4261a90dd12c9b4881a01bcb3b717c48a`

## ROOT CAUSE

Havia três eventos distintos:

1. A tela com “Estado Político”, “Termômetro de Crise Master” e demais blocos era a rota Overview legítima. O log registrou acesso autenticado a `/`, seguido do redirect previsto do middleware para `/dashboard/overview`. Não existia import, fallback ou renderização de Overview em `/dashboard/instagram`.
2. A rota Instagram não concluía a renderização porque enviava mais de 600 IDs em uma única cláusula `in` para `ai_analysis`, resultando em `Bad Request`; a tentativa de lotear comentários para todos os posts também excedia o statement timeout.
3. A sidebar oficial retornava `null` até a execução de um efeito de montagem. Na aplicação efetivamente renderizada, isso produziu zero elementos `aside`/`nav`. A inicialização foi alterada para renderizar o shell expandido desde o primeiro frame e aplicar a preferência persistida no frame seguinte.

## ROUTE BEFORE

- `/dashboard` redirecionava, e continua redirecionando, para `/dashboard/overview`.
- `/dashboard/instagram` chamava a nova UI, mas a consulta server-side falhava antes da conclusão do streaming.
- Acessar `/` autenticado levava à Overview por regra explícita do middleware.

## ROUTE AFTER

- `/dashboard` → `/dashboard/overview`, sem alteração.
- `/dashboard/instagram` → `InstagramPage` → `getInstagramUiContract(query)` → `InstagramIntelligenceDashboard`.
- Não há redirect, rewrite, fallback ou import de Overview na rota Instagram.
- Foi incluído teste de composição que impede a rota Instagram de importar Overview e confirma o shell pai.

## LAYOUT BEFORE

A rota já herdava `app/layout.tsx` e `app/dashboard/layout.tsx`. O dashboard layout continha Header, Sidebar, autenticação, permissões, candidatos do tenant e área principal. A Sidebar, entretanto, podia renderizar `null` indefinidamente no fluxo observado.

## LAYOUT AFTER

A mesma composição oficial foi preservada. Nenhum shell paralelo foi criado. A Sidebar agora existe no HTML inicial, começa expandida e sincroniza a preferência de colapso com `localStorage` após a montagem.

## SIDEBAR ROOT CAUSE

O guard `if (!mounted) return null` removia completamente a navegação do primeiro render. A correção eliminou o guard e manteve apenas a sincronização assíncrona da preferência persistida. Na validação desktop foram observados `aside=1` e `nav=1`; recolher e expandir também funcionaram na build de produção.

## OVERVIEW CONTENT ROOT CAUSE

Os textos da evidência são produzidos exclusivamente por `app/dashboard/overview/page.tsx` e seus componentes. O servidor registrou acesso a `/`, que, para sessão autenticada, é redirecionado pelo middleware para `/dashboard/overview`. A rota Instagram não contém referência a esses componentes. Na captura final de Instagram, “Termômetro de Crise Master” teve ocorrência zero.

## FILES CHANGED

- `app/dashboard/instagram/page.tsx`
- `app/dashboard/instagram/loading.tsx`
- `app/dashboard/instagram/error.tsx`
- `app/dashboard/instagram/route-composition.test.ts`
- `components/Sidebar.tsx`
- `components/dashboard/instagram/InstagramUiFilters.tsx`
- `components/dashboard/instagram/InstagramIntelligenceDashboard.tsx`
- `components/dashboard/instagram/InstagramIntelligenceDashboard.test.tsx`
- `lib/queries/instagram-ui.ts`
- `lib/queries/instagram-ui.test.ts`
- `lib/instagram/ui-contract.ts`
- `lib/instagram/ui-contract.test.ts`
- `lib/types/instagram-ui.ts`
- `docs/screenshots/instagram-3b4-regression-fix/*`

## INSTAGRAM UI

Renderização real confirmada com:

- header local Instagram;
- filtros de candidato, período, formato e risco;
- 652 posts monitorados;
- distribuição 74 IMAGE, 473 REEL e 105 CAROUSEL;
- KPIs específicos;
- Performance por Formato;
- pressão social, risco e sentimento;
- feed executivo;
- sinais relevantes em comentários;
- drawer com mídia, métricas, resumo, risco, temas e comentários;
- métricas ausentes exibidas como `—`;
- loading, empty e error dedicados.

O filtro CAROUSEL atualizou a URL para `?format=CAROUSEL` e o conteúdo renderizado. O drawer abriu com dados reais e fechou por `Escape`.

## OVERVIEW REGRESSION

PASS. `/dashboard/overview` preservou Estado Político, Saúde, Temperatura, Tendência, Alertas, Volume, Leitura Executiva e Termômetro de Crise Master. Sidebar presente.

## X REGRESSION

PASS. `/dashboard/x` renderizou filtros, conteúdo do Radar X e sidebar oficial.

## NOTICIAS REGRESSION

PASS. `/dashboard/noticias` renderizou filtros, fontes e conteúdo do Radar de Notícias com sidebar oficial.

## DATA CONTRACT

`getInstagramUiContract(query)` permanece como fonte canônica. IDs de posts para `ai_analysis` são enviados em lotes de 150 para evitar URL PostgREST excessiva. Comentários são consultados somente para os posts da página atual e os dez posts de destaque, eliminando timeout sem N+1. Não houve alteração de schema, banco, RLS, tenant, n8n, Pipeline V2, Legacy, RapidAPI ou schedules.

## TYPECHECK

PASS — `npx tsc --noEmit`.

## TESTS

PASS — suíte completa: 132 arquivos passaram, 5 ignorados; 1.171 testes passaram, 5 ignorados.  
PASS — bateria final direcionada: 4 arquivos, 21 testes.  
Incluído teste de regressão de composição da rota/layout.

## BUILD

PASS — Next.js 16.2.6, compilação, TypeScript, coleta de dados e 22 páginas estáticas concluídas.

## VISUAL VALIDATION

PASS na build de produção real:

- desktop 1440×900: sidebar e nav presentes; Instagram correto; zero conteúdo de Overview;
- tablet 900×900: sidebar presente; filtros em acordeão; sem corte horizontal;
- mobile 390×844: hamburger global, filtros em acordeão e KPIs refluídos;
- drawer de CAROUSEL validado com 6 mídias e fechamento por `Escape`;
- Overview, Notícias e X validados em rotas independentes.

## SCREENSHOTS

- `docs/screenshots/instagram-3b4-regression-fix/desktop-1440.png`
- `docs/screenshots/instagram-3b4-regression-fix/tablet-900.png`
- `docs/screenshots/instagram-3b4-regression-fix/mobile-390.png`

## DECISION

PASS.
