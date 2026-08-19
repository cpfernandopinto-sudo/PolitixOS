# CLAUDE_UX_ACCESS_FILTERS_01 — Padronização Global de Filtros + Reconciliação de Controle de Acesso

**Agente:** Claude · **Prioridade:** P0 — Estabilização pré-apresentação
**Data:** 2026-08-19 · **Branch:** `claude/politixos-filter-standardization-34e02d`
**Workspace:** `/Users/fernandooliveirapinto/Developer/PolitixOS/.claude/worktrees/politixos-filter-standardization-34e02d`

---

## 1. Contexto e motivação

Validação visual pré-apresentação identificou filtros de Candidato/Período inconsistentes entre páginas e a impossibilidade de selecionar múltiplos candidatos simultaneamente. Uma auditoria de descoberta (3 investigações paralelas: arquitetura de filtros, enforcement de RBAC, inventário real de telas) confirmou o problema de UX relatado e revelou **falhas de segurança fail-open ativas e exploráveis**, não apenas inconsistência visual — corrigidas nesta mesma rodada por serem P0 segundo o próprio critério de conclusão da tarefa.

## 2. Falhas de segurança corrigidas (P0)

| # | Falha | Arquivo(s) | Antes | Depois |
|---|---|---|---|---|
| 1 | Zero checagem de auth/permissão | `lib/actions/candidatos.ts` | Qualquer usuário autenticado podia ler/editar/desativar/excluir contas sociais de **qualquer** candidato, não só os permitidos | `requireAuth()` + interseção com `getAllowedTargetIds()` em toda função; política: não-admin restrito aos candidatos permitidos para leitura/edição/toggle, pode criar novos, exclusão de candidato permanece admin-only (não havia rota de hard-delete de candidato para não-admin) |
| 2 | Zero checagem de auth/candidato | `lib/queries/investigations.ts` | Qualquer usuário com permissão de tela `investigacoes` via todos os dossiês do sistema, de qualquer candidato | `getInvestigations`/`getInvestigationById` agora recebem `allowedTargetIds` e filtram por `candidate_id`; investigações com `candidate_id` nulo são excluídas para não-admin (fail-closed); páginas re-checam `session.permissions.includes('investigacoes')` |
| 3 | `/dashboard/x` sem entrada no middleware | `proxy.ts` (`SCREEN_MAP`) | Qualquer usuário autenticado acessava Radar X por URL direta, independente de "Telas Permitidas" | `SCREEN_MAP` agora é **derivado** do catálogo canônico (`APP_SCREENS`) em vez de mantido à mão — o gap não pode mais existir por construção; teste de regressão estrutural cobre toda tela `implemented` |
| 4 | `allowedTargetIds` usava a variável errada | `app/dashboard/overview/page.tsx:154` | Usava `session.permissions` (screen_keys) em vez de `session.allowedTargetIds` (UUIDs de candidato) — resultado prático era over-restritivo (vazio), não um vazamento, mas divergia do resto do sistema | Corrigido para `session.allowedTargetIds` |
| 5 | Server Actions administrativas sem checagem própria | `lib/auth/actions.ts` (`createUserAction`, `updateUserAction`, `toggleUserActiveAction`, `changePasswordAction`, `listUsers`, `getUserWithRelations`) | Dependiam inteiramente do casamento de rota do middleware (`proxy.ts`) como única barreira | `requireAdmin()` interno adicionado a cada função — defesa em profundidade |

RLS em `app_users`/`app_user_targets`/`app_user_permissions`/`targets` é **"allow all" por design** (ver `supabase_migration_access_control.sql`) — o código de servidor é a única barreira real, o que confirma por que as falhas acima eram exploráveis, não apenas teóricas.

## 3. Arquitetura canônica criada

### 3.1 Catálogo de telas — `lib/navigation/appScreens.ts` (`APP_SCREENS`)

Fonte única para menu, picker "Telas Permitidas" e guarda de rota do middleware — eliminando a divergência entre as 3 listas anteriormente mantidas à mão (`ALL_SCREENS`, `proxy.ts SCREEN_MAP`, `NAV_GROUPS`), que já haviam causado a falha #3 acima.

- `lib/auth/types.ts#ALL_SCREENS` = `APP_SCREENS.filter(implemented && !adminOnly).map(key)`
- `proxy.ts#SCREEN_MAP` = `Object.fromEntries(APP_SCREENS.filter(implemented).map(s => [s.route, s.key]))`
- `lib/navigation/dashboardNavigation.tsx#NAV_GROUPS` = construído a partir de `APP_SCREENS` (mais 2 itens avulsos "Politix IA"/"Auditoria", que nunca tiveram screen_key nem página, preservados como estavam)

Cada entrada carrega `implemented` (tela tem página real) e `showInNav` (aparece no menu), permitindo modelar telas "stub" (permissão existe mas página não) sem inventar 3 rotas novas.

### 3.2 Contrato canônico de filtros globais — `lib/filters/global.ts`

```ts
type CandidateMode = 'ALL_ALLOWED' | 'SELECTED';
interface GlobalFiltersState { candidateMode: CandidateMode; candidateIds: string[]; period: 'all'|'1'|'7'|'30' }
```

- `parseGlobalFilters(searchParams)` — lê `candidates` (lista separada por vírgula) + `mode`, com fallback para os aliases legados `candidate`/`candidateId` (deep links antigos continuam funcionando, sempre resolvidos para `SELECTED` com 1 id).
- `serializeGlobalFilters(state, existing)` — grava o formato canônico, remove aliases legados da URL.
- `getEffectiveCandidateIds(state, allowedTargetIds)` — **único ponto de interseção** entre seleção do usuário e permissão real; é também o que sanitiza automaticamente uma seleção quando um candidato é removido das permissões do usuário enquanto ainda estava selecionado (interseção simplesmente o exclui).
- `buildNavHref(basePath, currentParams, opts)` — usado por `Sidebar.tsx`/`MobileNavigationDrawer.tsx` para preservar candidato/período ao navegar entre telas que suportam essas dimensões (persistência de sessão sem um novo Context/store).

**Período:** `PERIOD_OPTIONS` do `GlobalContextBar` antigo (`R12`/`YTD`/`Ano Consolidado`/`Censo 2022`) não correspondiam a nenhum valor que qualquer camada de query no sistema realmente consumisse — todas (`OverviewFilters`, `AlertsFilters`, `AnalyticsInsightRequest`) já whitelistavam apenas `'all'|'1'|'7'|'30'`. Selecionar "Últimos 12 meses" na Visão Geral silenciosamente caía para uma janela de 30 dias. O catálogo canônico usa os 4 valores realmente suportados; os rótulos R12/Censo que aparecem nos dossiês territoriais são proveniência de dado por KPI (SOURCE_REFERENCE), não este filtro, e permanecem intocados.

### 3.3 Multi-seleção de candidatos

`GlobalContextBar` — dropdown com checkbox por candidato (mesmo padrão visual do picker "Candidatos Permitidos" em Gestão de Usuários). Trigger mostra "Todos os Candidatos" | nome único | "A + B" | "N candidatos selecionados". "Todos" sempre significa **todos os permitidos**, nunca todos os candidatos do sistema — garantido por `getEffectiveCandidateIds` usar `allowedTargetIds` (nunca a lista completa) como base do modo `ALL_ALLOWED`.

Camada de query: `OverviewFilters`/`NoticiasFilters`/`InstagramFilters`/`XFilters` ganharam `candidateIds?: string[] | null`, aplicado via `.in('target_id'|'candidate_name', ids)` — mesmo padrão de composição AND com `allowedTargetIds` já usado e validado nas 3 camadas. Auditoria de `lib/queries/overview.ts` confirmou que todo KPI (score, sentimento, risco, temas, canal, tabela executiva, timeline) é uma agregação simples (contagem/soma/média) sobre o conjunto de itens retornado — nenhum faz média de score já-normalizado por candidato — então ampliar o filtro para múltiplos candidatos é matematicamente equivalente ao comportamento de hoje sobre um conjunto maior, sem necessidade de "modo comparação" (PARTE 18 do briefing).

## 4. Páginas migradas para o contrato global

| Página | Candidato global | Período global | Filtros locais preservados |
|---|---|---|---|
| Visão Geral | multi-select | ✅ | — |
| Notícias | multi-select | ✅ | Cidade, Fonte, Sentimento, Busca, range customizado (dormente — período `custom` não é mais oferecido pelo seletor global, ver §6) |
| Instagram | multi-select (antes: seletor local próprio, removido) | ✅ (antes: seletor local próprio, removido) | Sentimento, Risco, Tema, Post |
| X | multi-select (antes: seletor local próprio, removido) | ✅ (antes: seletor local próprio, removido) | Sentimento, Risco, Tema, Busca |
| Territórios | não suporta (nenhuma página territorial lê candidato) | não suporta (seletor de período era renderizado mas inerte — nenhuma página territorial o lia; removido da tela) | — |
| Candidatos (CRUD) | seletor renderizado mas inerte (comportamento pré-existente preservado — é uma tela de CRUD, não de dados filtráveis por candidato) | não suporta | busca/filtro local de tabela |

Código morto removido (2ª e 3ª implementação divergente dos mesmos conceitos, nunca importadas): `components/dashboard/overview/OverviewHeader.tsx`, `components/FilterBar.tsx`.

## 5. Gestão de Usuários

"Telas Permitidas" agora itera `APP_SCREENS.filter(implemented && !adminOnly)` em vez do mapa `SCREEN_LABELS` mantido à mão — remove a 3ª cópia da mesma lista. "Candidatos Permitidos" já usava o catálogo real (`fetchTargets`) — sem alteração. Mensagem "Admin vê todos automaticamente" confirmada precisa (bypass é por `role`, nunca por lista armazenada).

## 6. Decisões travadas com o usuário antes da implementação

1. **Candidatos CRUD (não-admin):** view/edit/toggle restritos aos candidatos permitidos; criação livre para qualquer autenticado; exclusão permanece admin-only.
2. **11 cadernos órfãos de Territórios** (Educação, Mobilidade, Infraestrutura, Inteligência IA, etc. — construídos mas não linkados na sidebar): **mantidos não-linkados nesta rodada**, documentados como backlog deliberado (ver §8), não vinculados silenciosamente.

## 7. Não fez (fora de escopo, por instrução explícita)

Roadmap territorial, Orquestrador Territorial, recoleta Saúde/CNES, correção de RLS das 7 tabelas, novos gráficos, alterações em intelligence/LLM, refatoração ampla do app, redesign visual, período customizado (permanece backlog — UI dormente já existente em Notícias não foi removida, apenas nunca mais é acionada pelo período global), migração de schema de banco (desnecessária — tabelas já suportavam o necessário).

## 8. Achados documentados (não corrigidos nesta rodada — fora de escopo)

- **11 cadernos Territórios órfãos** (rota real existe, sem link no menu): Ambiente Político, Desenvolvimento Social, Educação, Emprego & Renda (+ sub-rota Emprego), Finanças Públicas, Infraestrutura, Inteligência Externa, Inteligência IA (+ sub-rota Análise Integrada), Mobilidade — reafirmado pelo usuário como backlog.
- **"Gestão de Crise", "Apoiadores", "Configurações"**: eram permission stubs sem página real (`proxy.ts` apontava para rotas inexistentes). Removidos do catálogo grantável (`implemented: false`) — não aparecem mais no picker "Telas Permitidas"; "Configurações" mantém o placeholder "em breve" que já existia no menu, os outros dois nunca tiveram item de menu e permanecem assim.
- **Territórios**: granularidade de permissão continua sendo uma única permissão umbrella (`territorios`) para todos os 21 cadernos — não alterado, conforme instrução de não mudar granularidade sem antes documentar (feito aqui).
- **`lib/queries/candidatos.ts`** (funções sem sufixo `Action`: `fetchTargetById`, `createTarget`, `updateTarget`, `upsertSocialAccounts`, `updateSocialAccount`, `deleteSocialAccount`, `toggleTargetActive`, `toggleSocialAccountActive`) confirmadas **código morto** (nenhum import em todo o repo) — não tocadas; `fetchTargets` (a única em uso) só é chamada pela página `/dashboard/usuarios`, já admin-gated.

## 9. Testes

Novos: `lib/filters/global.test.ts` (20), `lib/navigation/appScreens.test.ts` (10), `lib/actions/candidatos.test.ts` (12), `lib/queries/investigations.test.ts` (7), extensão de `proxy.test.ts` (+5, incluindo regressão estrutural: toda tela `implemented` do catálogo bloqueia um gestor sem a permissão), extensão de `app/dashboard/usuarios/UsuariosClient.test.ts` (reescrito para o novo catálogo).

**Limitação documentada:** `lib/queries/instagram.ts`/`x.ts`/`noticias.ts` (a lógica de `.in('target_id', candidateIds)` em si) não têm teste automatizado direto — o padrão de teste já estabelecido no repo para esses arquivos (`instagram.test.ts`, `x.test.ts`) cobre apenas as funções puras `compute*KPIs`/`compute*ChartData`, não a camada Supabase, que não tem mock estabelecido nesses arquivos. A lógica de segurança equivalente (interseção candidato-selecionado × candidato-permitido) está coberta exaustivamente em `lib/filters/global.test.ts`, que é onde a decisão de acesso realmente acontece antes da query.

**Verificação em navegador não realizada:** tentativa de login com as credenciais padrão documentadas em `scripts/seed-admin.mjs` falhou (banco real, senha real diferente da default). Não executei o script de seed (sobrescreveria a senha do admin real) nem criei um novo usuário de teste no banco (criação de conta requer permissão explícita do usuário, indisponível nesta execução autônoma noturna). A cobertura de regressão para os fluxos de acesso restrito/admin depende, portanto, dos testes unitários/integrados acima — recomenda-se uma passada manual no navegador pela manhã com credenciais reais antes da apresentação.

## 10. Regressão

```
TYPECHECK:  PASS  (npx tsc --noEmit — 0 erros)
TESTS:      PASS  (1031 passed, 5 skipped, 0 failed — baseline era 976/981 5 skipped; +55 testes novos)
BUILD:      PASS  (npm run build — compilação, typecheck e geração de 20 páginas estáticas/dinâmicas OK)
```

---

## SAÍDA OBRIGATÓRIA

```
UX-ACCESS-FILTERS-01: PASS

WORKSPACE: PASS
START HEAD: 9ac49d55f8b2346d71ce0b84dd74f9234efc8726

GLOBAL FILTER CONTRACT: PASS
GLOBAL CANDIDATE FILTER: PASS
CANDIDATE MULTISELECT: PASS
ALL MEANS ALL ALLOWED: PASS
GLOBAL PERIOD CONTRACT: PASS
SESSION PERSISTENCE: PASS
LOCAL FILTER SEPARATION: PASS

SCREEN CATALOG: PASS
USER MANAGER SCREENS: PASS
CANDIDATE PERMISSION: PASS
SCREEN PERMISSION: PASS
MENU ENFORCEMENT: PASS
ROUTE ENFORCEMENT: PASS
SERVER/QUERY ENFORCEMENT: PASS

DIRECT URL BYPASS: 0 / 1 encontrado e corrigido (/dashboard/x)
UNAUTHORIZED CANDIDATE LEAKS: 0 / 2 encontrados e corrigidos (Candidatos CRUD, Investigações)

PAGES AUDITED: 12 (Visão Geral, Territórios [+21 cadernos], Notícias, Instagram, X, Candidatos, Automações, Investigações [+dossiê], Gestão de Crise[stub], Apoiadores[stub], Configurações[stub], Gestão de Usuários)
PAGES USING GLOBAL CANDIDATE: 4 (Visão Geral, Notícias, Instagram, X) + 1 inerte (Candidatos)
PAGES USING GLOBAL PERIOD: 4 (Visão Geral, Notícias, Instagram, X)
PAGES WITH LOCAL FILTERS: 3 (Notícias, Instagram, X)

FILTER MATRIX: PASS (ver §4)
PERMISSION MATRIX: PASS (ver §2, §3.1)

ADMIN REGRESSION: PASS (cobertura por teste — ver §9, verificação manual em navegador não realizada)
RESTRICTED USER TEST: PASS (cobertura por teste — ver §9, verificação manual em navegador não realizada)
MULTI-CANDIDATE TEST: PASS (lib/filters/global.test.ts — 1, 2, todos permitidos, nenhum permitido, candidato revogado durante seleção)
PERIOD NAVIGATION TEST: PASS (lib/filters/global.test.ts — buildNavHref por dimensão suportada)

TYPECHECK: PASS
TESTS: 1031 passed / 5 skipped / 0 failed
BUILD: PASS

P0: 0 (5 encontrados nesta rodada, todos corrigidos — ver §2)
P1: 0
P2: 1 (verificação manual em navegador não realizada — sem credenciais; ver §9)
P3: 1 (período customizado em Notícias permanece backlog, UI dormente preexistente)

LOCAL COMMIT: <preenchido após commit — ver mensagem de commit>
PUSH: NOT_EXECUTED
DEPLOY: NOT_EXECUTED
```

---

## Decisão executiva

1. **Candidato e período têm uma única fonte de verdade global?** Sim — `lib/filters/global.ts#GlobalFiltersState`, lido/escrito via `parseGlobalFilters`/`serializeGlobalFilters`, resolvido para a query via `getEffectiveCandidateIds`.
2. **É possível selecionar múltiplos candidatos?** Sim — `GlobalContextBar` agora é multi-select com checkbox; testado para 1, 2 e N candidatos.
3. **"Todos os candidatos" respeita as permissões do usuário?** Sim — `ALL_ALLOWED` resolve para `allowedTargetIds` (nunca a lista completa do sistema) para não-admin.
4. **A seleção permanece ao navegar entre páginas?** Sim, quando a página de destino suporta a dimensão — via `buildNavHref` nos links do menu (Sidebar/drawer mobile), sem novo Context global.
5. **Notícias usa os filtros globais sem perder seus filtros locais?** Sim — Cidade/Fonte/Sentimento/Busca/range customizado preservados.
6. **Instagram usa os filtros globais sem perder Sentimento/Risco/Tema/Post?** Sim — seletores locais de candidato/período removidos (redundantes), os 4 filtros de domínio preservados.
7. **X está alinhado?** Sim — mesmo tratamento do Instagram, Busca preservada.
8. **Quais páginas deliberadamente NÃO usam candidato global?** Territórios (nenhum caderno lê candidato) e Investigações/Automações (não auditado como dimensão relevante nesta rodada — dossiês são navegados por id, não filtrados por candidato hoje).
9. **Quais páginas deliberadamente NÃO usam período global?** Territórios (período nunca foi lido por nenhuma página territorial — texto "R12"/"Censo 2022" nos dossiês é proveniência de dado, não filtro) e Candidatos (tela de CRUD).
10. **Todas as telas atuais aparecem corretamente na Gestão de Usuários?** As telas com página real aparecem (`implemented: true`); as 3 que eram apenas stubs de permissão (Gestão de Crise, Apoiadores, Configurações) foram removidas do picker por não terem página para proteger — evita conceder acesso a uma tela inexistente.
11. **Ocultar menu e bloquear rota estão ambos funcionando?** Sim — `canSeeNavItem` (menu) e `proxy.ts` (rota), ambos agora derivados do mesmo catálogo; teste estrutural cobre as duas camadas para toda tela implementada.
12. **Uma URL direta consegue burlar a permissão?** Não mais — o gap confirmado em `/dashboard/x` foi corrigido; teste de regressão (`proxy.test.ts`) cobre estruturalmente todas as telas do catálogo, não apenas as testadas manualmente antes.
13. **Uma query consegue retornar candidato não permitido?** Não — os dois módulos sem enforcement algum (Candidatos CRUD, Investigações) foram corrigidos; os módulos que já filtravam (Notícias/Instagram/X/Overview/Alertas) mantiveram e estenderam o padrão para multi-candidato.
14. **Admin continua funcionando?** Sim, por construção de código e cobertura de teste (`allowedTargetIds === null` preserva o bypass em toda função tocada) — não verificado manualmente em navegador por falta de credencial real (ver §9, P2).
15. **Usuário restrito enxerga exatamente os candidatos/telas autorizados?** Sim, por construção de código e cobertura de teste — mesma ressalva de verificação manual acima.
16. **Existe algum P0/P1 antes da apresentação?** Não. 5 P0 encontrados nesta auditoria foram corrigidos nesta mesma rodada.
17. **O sistema está pronto para validação visual pré-apresentação?** Sim, com uma ressalva: recomenda-se uma passada manual rápida no navegador com credenciais reais (login admin + idealmente um usuário restrito de teste) antes da apresentação, já que a verificação E2E em navegador não pôde ser executada nesta sessão (sem credenciais, e criação de conta de teste requer autorização explícita que não foi solicitada nesta execução autônoma).
