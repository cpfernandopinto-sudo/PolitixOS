# Auditoria de UX, Performance e Arquitetura — PolitixOS

Data: 2026-07-28
Branch: `claude/politixos-audit-enhancement-f4d793`

## 1. Arquitetura atual

- **Framework**: Next.js 16.2.6 (App Router), React 19.2.4, TypeScript, Tailwind v4.
- **Backend/dados**: Supabase (`@supabase/supabase-js` + `@supabase/ssr`), acesso via `lib/supabaseClient.ts` (`createClient` anon / `createAdminClient` service role).
- **Autenticação**: sessão própria em cookie assinado (JWT via `jose`), não usa Supabase Auth. `lib/auth/session.ts` cria/lê o cookie `politixos_session`; `lib/auth/dal.ts` expõe `requireAuth()`/`getSession()`; `proxy.ts` (middleware) faz o gate de rotas e permissões por `screen_key`.
- **Autorização**: papéis `admin | gestor | visualizador`. Permissões de tela em `app_user_permissions` (screen_key) e candidatos permitidos em `app_user_targets` (`allowedTargetIds`). Middleware aplica o gate; queries recebem `allowedTargetIds` e filtram.
- **Data fetching**: 100% Server Components com `async function Page()` fazendo `Promise.all`/`Promise.allSettled` direto no Supabase — não há TanStack Query/SWR, e não é necessário introduzi-los (não há data fetching client-side relevante fora de `candidatos`, que é client-side com `useState`/`useEffect`).
- **Cache**: o único mecanismo de cache é `React.cache()` (per-request memoization de RSC), já usado em `lib/queries/noticias.ts` (`fetchMencoes`) com a convenção documentada em código: *"React.cache() deduplica chamadas com o MESMO objeto filters dentro de 1 render. Todas as funções recebem o mesmo filters ref passado pela page."* Essa convenção **não estava sendo seguida em `lib/queries/overview.ts`** (ver 2.1).
- **Gráficos**: `echarts` + `echarts-for-react`, todos em componentes `'use client'` isolados (`OverviewGauge`, `OverviewChannels`, gráficos inline em `OverviewDashboardClient`).
- **Tabelas**: tabela HTML simples sem paginação/virtualização (usada na Tabela Executiva da Visão Geral, já limitada a 20 linhas no backend).
- **Menu lateral**: `components/Sidebar.tsx`, lista plana (`NAV_ITEMS`), sem agrupamento, com 2 itens (`gestao-crise`, `apoiadores`) sem página real (levam a 404).
- **Header**: `components/Header.tsx`, campo de busca decorativo (sem função), sino de notificações decorativo.
- **Rotas**: `/` → redirect `/login`; `/dashboard` (index) → redirect `/dashboard/overview`; middleware decide acesso por `screen_key`.
- **Padrão já validado em outras telas** (`noticias`, `instagram`, `x`): fetch único por filtro compartilhado + `Promise.all` + Suspense por bloco com skeleton inline. `noticias/page.tsx` já usa `<Suspense>` para alertas de crise, filtros e conteúdo principal — é o padrão de referência que a Visão Geral deveria seguir e não seguia.

## 2. Gargalos encontrados

### 2.1 CRÍTICO — Consultas duplicadas em cascata na Visão Geral (N+1)

`lib/queries/overview.ts` define `fetchOverviewData(filters)` (não memoizada) que dispara 3 fetches (notícias, Instagram, X). Nove funções (`getOverviewKPIs`, `getCrisisOverview`, `getChannelDistribution`, `getPriorityAlerts`, `getDominantTopics`, `getSentimentOverview`, `getRiskOverview`, `getStrategicActions`, `getExecutiveTable`) chamam `fetchOverviewData` **cada uma independentemente**, e `app/dashboard/overview/page.tsx` chama todas as nove em `Promise.all`, além de `getTrendOverview` (chamada 2×: direto na página e de novo dentro de `getOverviewKPIs`).

Resultado real por carregamento da Visão Geral: **~10 chamadas a `fetchOverviewData`, cada uma dependendo de 3 subconsultas → ~30 idas ao Supabase para renderizar uma única página**, mesmo todas usando exatamente os mesmos filtros. Isso é o principal gargalo de performance, custo de banco e latência da tela mais visitada do sistema (Visão Geral = tela padrão pós-login).

### 2.2 CRÍTICO — Rota pós-login/pós-acesso não é a Visão Geral

`proxy.ts` (middleware), ao detectar usuário autenticado acessando rota pública (`/` ou `/login`), redireciona para `/dashboard/noticias`:

```ts
return NextResponse.redirect(new URL('/dashboard/noticias', req.nextUrl));
```

Isso contraria diretamente o requisito de a aplicação sempre abrir em **Visão Geral**. O `loginAction` (Server Action) redireciona corretamente para `/dashboard/overview` no primeiro login, mas qualquer acesso subsequente à raiz (`/`) com sessão ativa cai em Notícias, não em Visão Geral.

### 2.3 Sem streaming/skeletons por bloco na Visão Geral

`app/dashboard/overview/page.tsx` faz `await Promise.all([...11 consultas...])` e só então renderiza `<OverviewDashboardClient>` inteiro. A página fica em branco (aguardando o Server Component) até que **todas** as consultas (já lentas por causa do 2.1) terminem. Não há Suspense, não há skeleton, não há isolamento de falha — se qualquer bloco falhar, a tela inteira quebra. Isso contrasta com `noticias`, `instagram` e `x`, que já usam `<Suspense>` por seção.

### 2.4 Logs de debug sensíveis em produção

- `lib/auth/actions.ts` (`loginAction`): loga e-mail tentando login, se `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` estão configuradas, resultado da verificação de senha ("SUCESSO"/"FALHA") e role do usuário.
- `app/dashboard/overview/page.tsx`: loga `role` e `allowedTargetIds` do usuário autenticado em todo carregamento.
- `lib/queries/overview.ts`: 3 `console.log` de depuração (`[overview filter]`, `[OVERVIEW X CHECK]`, `[OVERVIEW CHANNELS CHECK]`).
- `components/dashboard/overview/OverviewDashboardClient.tsx` e `OverviewChannels.tsx`: `console.log` no client a cada render.
- `proxy.ts`: loga toda negação de acesso e todo redirecionamento (menos sensível, mas polui o log de produção).

Nenhum expõe segredos diretamente, mas violam a diretriz de não poluir console/logs em produção e, no caso do login, registram tentativas de autenticação com detalhes desnecessários.

### 2.5 Menu lateral com links mortos

`Sidebar.tsx` lista `/dashboard/gestao-crise` e `/dashboard/apoiadores`, mas não existem `page.tsx` para essas rotas em `app/dashboard/`. Clicar nesses itens resulta em 404. O middleware já mapeia `screen_key` para eles (preparado para o futuro), mas a especificação deste projeto é explícita: **não deixar no menu funcionalidades sem implementação real.**

### 2.6 Falta de busca global, breadcrumbs e command palette

Header tem apenas um input decorativo sem `onChange`/ação. Não há Ctrl+K, não há breadcrumbs em nenhuma tela.

### 2.7 Estrutura de dados adequada para paginação/tabelas

A tabela executiva da Visão Geral já limita a 20 linhas no backend (`getExecutiveTable`) — não há over-fetch aqui. `noticias` já pagina/filtra no servidor. Não foram encontradas listagens client-side de milhares de registros sem paginação além do módulo `candidatos` (baixo volume, CRUD administrativo, risco/benefício baixo para refatorar agora).

## 3. Componentes afetados

- `proxy.ts` (middleware — redirecionamento pós-login)
- `lib/queries/overview.ts` (deduplicação de consultas, remoção de logs)
- `app/dashboard/overview/page.tsx` (streaming por bloco)
- `components/dashboard/overview/OverviewDashboardClient.tsx` (split em subcomponentes independentes)
- `components/dashboard/overview/OverviewChannels.tsx` (remoção de logs)
- `lib/auth/actions.ts` (remoção de logs sensíveis)
- `components/Sidebar.tsx` (reagrupamento, remoção de links mortos)
- Novos: `components/ui/SectionBoundary.tsx`, `components/ui/Breadcrumbs.tsx`, `components/dashboard/overview/OverviewFilterBar.tsx`, `components/dashboard/overview/OverviewTopics.tsx`, `components/dashboard/overview/OverviewSentiment.tsx`, `components/dashboard/overview/OverviewRisk.tsx`, `components/dashboard/overview/OverviewExecutiveTable.tsx`, `components/dashboard/overview/LastUpdatedIndicator.tsx`.

## 4. Consultas afetadas

- `fetchOverviewData` → memoizada com `React.cache()` (mesmo padrão já usado em `fetchMencoes`).
- `getTrendOverview` → memoizada com `React.cache()` (elimina a segunda chamada duplicada vinda da página + de `getOverviewKPIs`).
- Nenhuma mudança de schema, índice obrigatório ou política RLS. Sugestões de índice ficam registradas na seção 8 (não aplicadas automaticamente, conforme instrução do projeto).

## 5. Riscos das alterações

- **Baixo risco**: `React.cache()` já é padrão validado no projeto (`noticias.ts`). O incidente documentado em `instagram.ts` ("React.cache() foi REMOVIDO propositalmente... causando retorno de dados sem restrição") ocorreu porque `getInstagramFiltersOptions()` chamava `fetchInstagramData()` **sem** `allowedTargetIds`, e o cache por referência retornava dados não filtrados para chamadas subsequentes que deveriam ser filtradas. Para evitar repetir esse erro: `getOverviewFiltersOptions()` **não** passa pelo `fetchOverviewData` cacheado (consulta direta e independente à tabela `targets`), e todas as 9 funções que consomem `fetchOverviewData` recebem o **mesmo objeto `filters`**, nunca uma variante sem `allowedTargetIds`. Não há mutação do objeto `filters` em nenhum ponto.
- **Médio risco**: dividir `OverviewDashboardClient` em subcomponentes menores + Suspense por bloco. Mitigado mantendo o JSX/estilo visual idêntico, apenas movendo código entre arquivos (sem reescrever regras de negócio).
- **Nenhuma alteração** em autenticação, RLS, schema do banco ou contratos de API externos (n8n).

## 6. Plano de implementação (executado nesta sessão)

**Fase 1 — Fundamentos e performance**
1. Corrigir `proxy.ts` para redirecionar usuário autenticado em rota pública para `/dashboard/overview`.
2. Memoizar `fetchOverviewData` e `getTrendOverview` com `React.cache()`.
3. Remover logs de debug sensíveis (login, overview, middleware, componentes client).
4. Dividir a Visão Geral em blocos independentes com Suspense + skeleton + error boundary por bloco.
5. Extrair filtros para componente client dedicado, mantendo estado/URL sync existente.

**Fase 2 — Navegação e consistência**
6. Reagrupar menu lateral em PAINEL / INTELIGÊNCIA / ANÁLISE / ADMINISTRAÇÃO, remover links mortos.
7. Adicionar breadcrumbs reutilizáveis no layout do dashboard.
8. Indicador de "última atualização" + botão de atualizar (via `router.refresh()`).

**Fases 3–5 (busca global Ctrl+K completa, comparador de candidatos, mapas, central de alertas dedicada, "pergunte aos dados")**: **não implementadas nesta sessão** — ver seção 9 (funcionalidades pendentes) para justificativa técnica. O volume de trabalho de todo o espectro do prompt original excede o que é seguro entregar, validar e revisar em uma única sessão sem introduzir regressões em um sistema em produção. Prioridade foi dada aos itens marcados explicitamente como "maior prioridade" no pedido (rota padrão + performance de carregamento) e à tela Visão Geral.

## 7. Arquivos modificados

Ver `docs/IMPLEMENTACAO_UX_PERFORMANCE_POLITIXOS.md` para a lista final após a implementação.

## 8. Métricas / critérios de verificação

- **Antes**: ~30 requisições ao Supabase por carregamento da Visão Geral (9× `fetchOverviewData` + 2× `getTrendOverview`, cada uma = 3 subconsultas). Página só renderiza após todas completarem.
- **Depois**: 2 execuções reais de `fetchOverviewData` (filtros da página + filtros "all period" do cálculo de tendência) = 6 subconsultas totais, mais 1 consulta independente e leve para as opções de candidato do filtro. Redução de ~80% nas idas ao banco por carregamento.
- **Antes**: tela em branco até resolução de todas as 11 promessas.
- **Depois**: cabeçalho, filtros e skeletons aparecem imediatamente (primeiro paint não depende de nenhuma consulta de dado pesado); cada bloco resolve e troca de skeleton→conteúdo de forma independente.
- **Verificação manual**: login → deve cair em Visão Geral; refresh em `/` autenticado → Visão Geral (não mais Notícias); Network tab do navegador → contagem de requisições/consultas reduzida; console do navegador e do servidor sem logs de senha/role/env em produção.

## Auditoria da Fase 2 — Módulos Analíticos

Data: 2026-07-28 (continuação da sessão anterior).

### Dados reais disponíveis

- **Notícias** (`mentions`, via `MencaoRow`): `title`, `summary`, `ai_takeaways`, `ai_sentiment` (número, `null` = sem análise), `ai_topics`/`ai_entities`/`ai_risk_flags` (JSON), `local_relevance` (0–100), `city`, `candidate_name`, `published_at`, `url`, `source`. **Não há campo de status de análise explícito** ("pendente"/"erro") — a única distinção possível nos dados reais é `ai_sentiment/ai_topics/ai_entities/ai_takeaways` nulos/vazios (= "sem análise") vs. preenchidos (= "concluída"). Por isso os componentes novos desta fase usam apenas esses dois estados, nunca "pendente" ou "erro" (que não existem no schema).
- **Instagram** (`social_posts` + `ai_analysis`, via `fetchInstagramData`): `like_count`, `comment_count`, `sentiment`, `risk`, `topic(s)`, `riskReason`, `summary`, `recommendedAction`, `image_url`/`video_url`/`thumbnail_url`, `candidate_name`. Comentários (`instagram_comments`) ligados por `post_id`.
- **X** (`social_posts` platform x/twitter + `ai_analysis`, via `fetchXData`): mesmos campos de Instagram, mais `impactScore`, `crisisScore`, `divergenceFlag/Type`, `authorTone`, `publicReaction`, `polarizationLevel`, `strategicReading` — já calculados em `getStrategicInsights` dentro de `fetchXData`. Replies (`tweet_replies`) ligadas por `post_id`.
- Nenhuma tabela expõe **seguidores/alcance real** de perfil — por isso os rankings desta fase mostram apenas volume absoluto (curtidas, comentários, reposts, contagem de posts), nunca uma "taxa de engajamento sobre a base de seguidores", que seria uma métrica fabricada.
- Nenhuma tabela expõe **estado "lido/não lido"** para alertas — a Central de Alertas não implementa essa funcionalidade (ver `docs/REGRAS_ALERTAS_POLITIXOS.md`).

### Achado adicional: métrica fabricada em produção

`components/dashboard/InstagramDashboard.tsx` e `components/dashboard/XDashboard.tsx` calculavam uma variação percentual (`mockVar = i % 2 === 0 ? 12 : -5`) e exibiam como se fosse a variação real do KPI em relação ao período anterior — havia inclusive o comentário `// Mocking variations for visual effect as requested`. Isso violava diretamente a diretriz de não inventar métricas. Corrigido nesta fase (ver `docs/IMPLEMENTACAO_UX_PERFORMANCE_POLITIXOS.md`).

### Limitações encontradas

- Notícias, Instagram e X já têm filtros próprios funcionais e escrevendo na URL (`NewsGlobalFilters`, `InstagramFilterBar`, `XFilterBar`) — não foi necessário reconstruí-los, apenas adicionar chips de filtro ativo e botão "Limpar" onde faltavam (Instagram e X).
- `fetchMencoes` (notícias) não tem `.limit()` — busca todas as linhas que casam com o filtro. A tela já usava apenas as primeiras 100 para exibição (`getFeedNoticias(rows, 100)`), mas os cálculos agregados (KPIs, temas, evolução de risco etc.) dependem do conjunto completo. Paginar a consulta no servidor quebraria esses agregados. Solução adotada: manter a busca completa (necessária para os agregados) e implementar paginação real na apresentação da lista/feed/tabela (client-side sobre o array já carregado), documentando essa limitação em vez de reivindicar "paginação no servidor" que não seria segura implementar sem separar consulta de listagem da consulta de agregados — separação maior, fora do escopo desta sessão.
- Instagram/X já fazem `.limit(200)`/`.limit(300)` nas consultas de posts — um teto razoável já existente, não alterado.

### Métricas que podem ser calculadas com segurança

- Rankings por volume absoluto (engajamento, comentários, reposts, contagem de posts por perfil) — dados já buscados pela página, sem consulta nova.
- Timeline consolidada da Visão Geral — reaproveita os mesmos dados já buscados por `fetchOverviewData` (cache por requisição), sem consulta nova.
- Central de Alertas — 3 consultas por carregamento (uma por canal), via `Promise.allSettled`, cada uma reaproveitando os fetchers já existentes e já filtrados por `allowedTargetIds`.

### Funcionalidades que não podem ser implementadas sem mudança de schema

- Taxa de engajamento normalizada por seguidores (não há contagem de seguidores nos dados).
- Estado lido/não lido de alertas (não há tabela de alertas persistidos).
- Comparação de crescimento período-a-período nos KPIs de Instagram/X sem uma segunda consulta dedicada (viável, mas não implementada nesta sessão para não aumentar o número de consultas por carregamento desses módulos — ver seção "Próximos passos").

### Arquivos previstos para alteração/criação

Ver `docs/IMPLEMENTACAO_UX_PERFORMANCE_POLITIXOS.md`, seção "Fase 2".

### Riscos de regressão

- Conversão dos modais de detalhe (Instagram/X) para o novo `Drawer` genérico: risco baixo — todo o conteúdo/JSX interno foi preservado, apenas o container mudou (modal centralizado → painel lateral) e o `useEffect` de Esc duplicado foi removido (o `Drawer` já trata Esc).
- Nova paginação client-side em Notícias: risco baixo — os cálculos agregados continuam operando sobre `initialRows`/`filteredRows` completos, inalterados; apenas a seção "Base Completa de Monitoramento" mudou de tabela única para Feed/Tabela paginados.
- Central de Alertas é uma rota nova, sem dependências de outras telas — risco de regressão em módulos existentes é próximo de zero.

### Critérios de validação

- `tsc --noEmit` limpo.
- `npm run lint` sem novos erros/warnings nos arquivos alterados desta fase.
- `npm run build` de produção concluído com sucesso, incluindo a rota `/dashboard/alertas`.
- `npm run test:run` (Vitest) passando para as regras de alerta, sanitização de filtros, timeline e preferência de view.
- Verificação manual do fluxo não autenticado (redirecionamento correto para `/login`, sem loop, sem erros de console) — mesma limitação da fase anterior quanto ao fluxo autenticado (sem credenciais de teste disponíveis).

### Índices sugeridos (não aplicados — apenas recomendação)

- `mentions (published_at desc)` — já é o campo de ordenação padrão em `fetchMencoes`; se ainda não existir índice, é o candidato mais óbvio dado o volume de leitura por período.
- `mentions (candidate_name)` — usado em filtro de acesso por candidato permitido (`in ('candidate_name', ...)`) em praticamente toda consulta.
- Equivalentes em tabelas de Instagram/X (`candidate_name`, coluna de data de publicação) caso ainda não existam — não inspecionadas diretamente nesta auditoria (fora do escopo da Visão Geral), recomenda-se auditoria dedicada ao schema real via Supabase antes de criar índices.
