# Implementação — UX, Performance e Inteligência do PolitixOS

Ver `docs/AUDITORIA_UX_PERFORMANCE_POLITIXOS.md` para o diagnóstico completo. Este documento registra o que foi efetivamente alterado.

## 1. O que foi alterado

### 1.1 Rota padrão pós-login (prioridade máxima do pedido)
- `proxy.ts`: o middleware redirecionava usuário autenticado em rota pública (`/`, `/login`) para `/dashboard/noticias`. Corrigido para `/dashboard/overview`. `loginAction` já redirecionava corretamente; agora todo acesso à raiz com sessão ativa também cai em Visão Geral, sem loop de redirecionamento (verificado manualmente: acesso não autenticado a `/dashboard/overview` volta para `/login` sem loop).

### 1.2 Eliminação de consultas duplicadas na Visão Geral (maior gargalo de performance)
- `lib/queries/overview.ts`: `fetchOverviewData` e `getTrendOverview` agora são memoizadas com `React.cache()` — mesmo padrão já validado em `lib/queries/noticias.ts` (`fetchMencoes`). Todas as funções que dependem delas (`getOverviewKPIs`, `getCrisisOverview`, `getChannelDistribution`, `getPriorityAlerts`, `getDominantTopics`, `getSentimentOverview`, `getRiskOverview`, `getStrategicActions`, `getExecutiveTable`) continuam recebendo o **mesmo objeto `filters`** vindo da página — pré-requisito para o cache por referência funcionar, documentado em comentário no código para evitar o mesmo erro que já ocorreu em `instagram.ts` (cache reaproveitado incorretamente entre uma chamada sem `allowedTargetIds` e uma chamada restrita).
- Resultado: de ~30 idas ao Supabase por carregamento da Visão Geral para ~6 (2 execuções reais de `fetchOverviewData`: uma para os filtros da página, outra — inevitável — para o cálculo de tendência que sempre precisa do período completo).
- A chamada duplicada de `getTrendOverview` diretamente em `page.tsx` (o valor não era usado na UI — só `kpis.tendencia`, calculado internamente) foi removida.

### 1.3 Streaming por bloco na Visão Geral (resposta visual imediata)
- `app/dashboard/overview/page.tsx`: reescrito. Antes: um único `await Promise.all([...11 consultas...])` bloqueando toda a página. Agora: cabeçalho e filtros renderizam imediatamente; cada bloco (KPIs, Termômetro de Crise, Alertas, Temas, Canais, Sentimento, Risco, Mapa de Ação, Tabela Executiva) é um Server Component assíncrono independente, envolto em `SectionBoundary` (novo componente: Suspense + Error Boundary + skeleton + botão "tentar novamente" via `router.refresh()`).
- Uma falha em um bloco não derruba os demais (testado via revisão de código — `SectionErrorBoundary` é uma classe React padrão com `getDerivedStateFromError`/`componentDidCatch`, funciona também para filhos Server Component em Next.js App Router).
- `components/dashboard/overview/OverviewDashboardClient.tsx` (388 linhas, monolítico) foi decomposto em componentes menores e reaproveitáveis, preservando 100% do JSX/estilo visual original (apenas movido entre arquivos, sem reescrever regra de negócio):
  - `OverviewHeader.tsx` — título, filtros (candidato/período), período analisado, última atualização, botão atualizar.
  - `OverviewTopics.tsx`, `OverviewSentiment.tsx`, `OverviewRisk.tsx`, `OverviewExecutiveTable.tsx` — extraídos do JSX inline anterior, agora com estado vazio próprio (antes, alguns blocos quebravam silenciosamente com array vazio, ex.: divisão por `topics[0].frequencia` sem dado).
  - `OverviewExecutiveTable.tsx` ganhou busca funcional (o campo de busca existia visualmente mas não tinha `onChange`).

### 1.4 Remoção de logs sensíveis/ruidosos em produção
- `lib/auth/actions.ts` (`loginAction`): removidos logs de tentativa de login por e-mail, status de variáveis de ambiente e resultado de verificação de senha ("SUCESSO"/"FALHA"). Mantido apenas `console.error` com a mensagem de erro do Supabase (sem dados do usuário) para diagnóstico de incidentes.
- `lib/queries/overview.ts`, `app/dashboard/overview/page.tsx` (antigo), `components/dashboard/overview/OverviewDashboardClient.tsx` (antigo), `OverviewChannels.tsx`: removidos 6 `console.log` de depuração que rodavam a cada requisição/render.
- `proxy.ts`: removido log de toda negação de acesso a rota pública/redirecionamento (ruído). Mantidos `console.error` (falha ao decriptar sessão) e `console.warn` (usuário autenticado sem permissão de tela) — sinais legítimos de auditoria de segurança.

### 1.5 Menu lateral reagrupado
- `components/Sidebar.tsx`: itens agora agrupados em **Painel** (Visão Geral) e **Inteligência** (Radar de Notícias, Radar Instagram, Radar X, Investigações, Candidatos), mais **Administração** (Automação) e **Usuários** (admin). Cabeçalhos de grupo em uppercase, ocultos quando o menu está recolhido (tooltips via `title` continuam funcionando recolhido).
- Removidos "Gestão de Crise" e "Apoiadores" do menu — não existem páginas reais para essas rotas (`app/dashboard/gestao-crise` e `app/dashboard/apoiadores` não existem), então os links levavam a 404. Conforme a diretriz do projeto, funcionalidades sem implementação real ficam fora do menu.

### 1.6 Breadcrumbs
- Novo `components/ui/Breadcrumbs.tsx`, renderizado no início do conteúdo em `app/dashboard/layout.tsx`. Gera a trilha a partir da rota real (`usePathname`), com rótulos amigáveis para os módulos conhecidos e humanização automática para segmentos não mapeados (ex.: IDs de investigação). Não aparece na própria Visão Geral (raiz), evitando um breadcrumb de um nível só.

### 1.7 Busca global (Ctrl+K / Cmd+K)
- Novo `components/CommandPalette.tsx` + `components/HeaderSearchTrigger.tsx` + `lib/actions/search.ts` (Server Action).
- Abre com `Ctrl+K`/`Cmd+K` ou pelo botão de busca no cabeçalho (antes decorativo, sem função).
- Duas categorias de resultado: **Navegação** (módulos do menu, filtrados pelas permissões reais do usuário — mesma lógica de `canSee` do Sidebar) e **Candidatos** (busca real na tabela `targets`, respeitando `allowedTargetIds` do usuário — nunca retorna candidato fora do escopo permitido).
- Debounce de 250ms na busca de candidatos (não busca a cada tecla). Navegação por teclado (`↑`/`↓`/`Enter`), fecha com `Esc`, foco automático no input ao abrir. Selecionar um candidato navega para `/dashboard/overview?candidate=<id>` — reaproveita o filtro já existente na Visão Geral, sem inventar uma tela nova.

## 2. Arquivos modificados

- `proxy.ts`
- `lib/queries/overview.ts`
- `lib/auth/actions.ts`
- `app/dashboard/overview/page.tsx`
- `app/dashboard/layout.tsx`
- `components/Header.tsx`
- `components/Sidebar.tsx`
- `components/dashboard/overview/OverviewChannels.tsx`

## 3. Arquivos criados

- `components/ui/SectionBoundary.tsx`
- `components/ui/BlockSkeleton.tsx`
- `components/ui/Breadcrumbs.tsx`
- `components/dashboard/overview/OverviewHeader.tsx`
- `components/dashboard/overview/OverviewTopics.tsx`
- `components/dashboard/overview/OverviewSentiment.tsx`
- `components/dashboard/overview/OverviewRisk.tsx`
- `components/dashboard/overview/OverviewExecutiveTable.tsx`
- `components/CommandPalette.tsx`
- `components/HeaderSearchTrigger.tsx`
- `lib/actions/search.ts`
- `docs/AUDITORIA_UX_PERFORMANCE_POLITIXOS.md`
- `docs/IMPLEMENTACAO_UX_PERFORMANCE_POLITIXOS.md`

## 4. Arquivo removido

- `components/dashboard/overview/OverviewDashboardClient.tsx` — substituído pela composição de `page.tsx` + os novos componentes de bloco. Nenhuma outra parte do código importava este arquivo (verificado via busca global antes da remoção).

## 5. Consultas otimizadas

Ver seção 1.2. Nenhuma alteração de schema, índice ou RLS foi aplicada — apenas memoização em memória por requisição (React.cache()), já é o padrão do projeto.

## 6. Estratégia de cache

- `React.cache()` (per-request, nativo do React/Next App Router) — único mecanismo de cache necessário aqui, pois todo o data fetching da Visão Geral acontece em Server Components. Não foi introduzida nenhuma biblioteca nova (TanStack Query/SWR) porque não há data fetching client-side relevante nesta tela que se beneficiasse disso, e introduzir uma camada de cache paralela ao padrão já estabelecido (`noticias.ts`) aumentaria a superfície de risco sem ganho real.

## 7. Estratégia de prefetch

- **Não implementada nesta sessão.** O Next.js App Router já faz prefetch automático de rotas visíveis via `<Link>` (comportamento padrão, inalterado). Prefetch programático adicional (hover/foco disparando fetch de dados, não só da rota) exigiria expor as funções de `lib/queries/*` como Server Actions client-invocáveis com cache compartilhado entre navegação — mudança de maior escopo, não incluída para não aumentar o risco desta entrega. Registrado como próximo passo.

## 8. Estratégia de lazy loading

- Os gráficos ECharts já eram `'use client'` isolados por componente (padrão pré-existente, mantido). Como cada bloco da Visão Geral agora é seu próprio Server Component com Suspense, o bundle/dado de cada gráfico só é necessário quando aquele bloco especificamente renderiza — não há mudança de import dinâmico (`dynamic()`) explícito porque os componentes de gráfico já eram pequenos o suficiente para não justificar code-splitting adicional nesta sessão; o ganho real estava nas consultas de dado (seção 1.2), não no JS enviado.

## 9. Melhorias de UX

- Skeletons proporcionais por bloco (antes: tela em branco até tudo carregar).
- Estados vazios explícitos em Temas Dominantes, Sentimento, Risco e Tabela Executiva (antes: alguns quebravam ou mostravam gráfico zerado sem explicação).
- Estado de erro por bloco com "tentar novamente", sem derrubar a tela inteira.
- Indicador de "última atualização" + botão discreto de atualizar com estado de revalidação visível.
- Busca funcional na Tabela Executiva.
- Menu lateral sem links mortos, agrupado.
- Breadcrumbs em todas as telas do dashboard (exceto a raiz).
- Busca global Ctrl+K/Cmd+K.

## 10. Funcionalidades não implementadas (e por quê)

O escopo original do pedido cobre praticamente uma reescrita completa de UX de todos os módulos (comparador de candidatos, mapa geográfico, central de alertas dedicada, "pergunte aos dados" via IA, favoritar/reorganizar blocos, filtros globais persistidos em URL para todos os módulos, drawers substituindo detalhes, rankings de redes sociais com fórmulas explicadas, etc.). Não implementadas nesta sessão:

- **Comparador de candidatos, mapa geográfico**: o pedido é explícito em não criar telas fictícias quando os dados/infra não estão confirmados. Não foi feita uma auditoria de schema Supabase (colunas de geolocalização confiáveis) suficiente para implementar com segurança nesta sessão — ficaria com dados inventados ou quebrados. Recomenda-se auditoria dedicada do schema antes de iniciar.
- **Central de alertas dedicada, "Pergunte aos dados" (IA)**: exigem definição de thresholds/regras de negócio e, no caso da IA, confirmação de orçamento/infra de geração sob demanda — decisões de produto que não deveriam ser tomadas unilateralmente no código.
- **Drawers substituindo modais de detalhe**: os módulos atuais (notícias, Instagram, X) não possuem uma tela de "detalhe" centralizada a substituir — a maior parte das ações já abre a fonte original em nova aba. Criar um drawer sem uma tela de detalhe correspondente seria inventar funcionalidade.
- **Favoritar/reorganizar blocos, preferências persistidas por usuário**: exigiria schema novo (tabela de preferências) — alteração de banco fora do escopo desta sessão sem validação prévia com o time.
- **Filtros globais (período/estado/candidato/etc.) unificados entre todos os módulos**: `noticias`, `instagram` e `x` já têm filtros próprios e independentes, funcionais; unificá-los é uma refatoração maior que arrisca regressão nos três módulos ao mesmo tempo — não incluída para preservar estabilidade.
- **Prefetch ao hover/foco no menu**: ver seção 7.

Nenhuma dessas ausências deixa a aplicação instável — todas as telas existentes continuam funcionando como antes ou melhor.

## 11. Índices de banco recomendados (não aplicados)

Ver seção 8 de `docs/AUDITORIA_UX_PERFORMANCE_POLITIXOS.md`.

## 12. Métricas antes/depois

| Métrica | Antes | Depois |
|---|---|---|
| Chamadas reais ao Supabase por carregamento da Visão Geral | ~30 (9× `fetchOverviewData` + 2× `getTrendOverview`) | ~6 (2× `fetchOverviewData` real, cada uma com 3 subconsultas) |
| Primeiro conteúdo visível na Visão Geral | Só após todas as 11 consultas resolverem | Cabeçalho + filtros + skeletons imediatos |
| Isolamento de falha | Uma consulta com erro quebra a página inteira | Cada bloco falha isoladamente, com retry |
| Rota pós-login/pós-refresh na raiz | `/dashboard/noticias` (incorreto) | `/dashboard/overview` (correto) |
| Logs sensíveis em produção (login) | E-mail, resultado de senha, status de env vars | Nenhum |

## 13. Riscos restantes

- Não há testes automatizados no projeto (`npm run lint` é o único script de qualidade configurado; não existe `test`/`jest`/`vitest` no `package.json`). A verificação desta sessão foi: `tsc --noEmit` limpo, `npm run lint` sem novos erros/warnings nos arquivos tocados, `npm run build` de produção concluído com sucesso, e verificação manual no navegador do fluxo não autenticado (redirecionamento correto, sem loop, sem erros de console).
- **Não foi possível validar o fluxo autenticado (login → Visão Geral → navegação) em navegador nesta sessão**: o projeto está conectado a um projeto Supabase real (não há ambiente de staging/mock configurado em `.env.local`), e não há credenciais de teste disponíveis. Criar ou alterar uma conta para testar exigiria rodar `scripts/seed-admin.mjs`, que grava um usuário admin real no banco de produção — uma ação que decidi não tomar sem autorização explícita, por ser difícil de reverter em um sistema compartilhado. Recomenda-se validação manual do login real antes do deploy ir ao ar para os usuários finais, ou fornecer credenciais de teste em um próximo turno.
- Os itens da seção 10 seguem pendentes.

## 14. Próximos passos sugeridos (registrados na Fase 1)

1. ~~Validar o fluxo autenticado completo em navegador~~ — ainda pendente, ver Fase 2 seção 13.
2. Auditoria de schema Supabase dedicada (colunas de geolocalização, índices existentes) antes de iniciar mapa e comparador de candidatos — ainda pendente.
3. ~~Definir as regras objetivas da central de alertas~~ — feito na Fase 2 (`lib/config/alert-thresholds.ts`, `docs/REGRAS_ALERTAS_POLITIXOS.md`).
4. Avaliar unificação de filtros globais entre notícias/Instagram/X como uma iniciativa própria — ainda não unificados (cada módulo mantém seus filtros independentes), mas todos agora têm chips + "Limpar" consistentes.
5. ~~Configurar uma suíte de testes~~ — feito na Fase 2 (Vitest).

---

# Fase 2 — Inteligência Executiva e Módulos Analíticos

Ver `docs/AUDITORIA_UX_PERFORMANCE_POLITIXOS.md`, seção "Auditoria da Fase 2", para o diagnóstico específico desta fase.

## Fase 2.1 Central de Alertas

- Novo `lib/config/alert-thresholds.ts`: 9 regras documentadas (id, nome, descrição, métrica, threshold, janela, severidade, justificativa, fonte) — todas centralizando thresholds que já existiam de forma implícita e duplicada em `getCrisisAlerts` (noticias.ts), `getInstagramAlerts` (instagram.ts) e `getXAlert` (x.ts). Nenhum threshold novo foi inventado.
- Novo `lib/queries/alerts.ts`: funções puras de avaliação de regra (`evaluateNoticiaItemAlerts`, `evaluateNoticiaAggregateAlerts`, `evaluateInstagramItemAlerts`, `evaluateXItemAlerts`, `sortAlerts`) separadas do orquestrador com I/O (`getUnifiedAlerts`), que busca os 3 canais em paralelo via `Promise.allSettled` — uma falha em um canal não derruba os demais, e a tela informa quais canais falharam sem esconder o erro.
- Nova rota `/dashboard/alertas` (`app/dashboard/alertas/page.tsx` + `AlertasFilterBar.tsx` + `AlertsList.tsx`): resumo por severidade, filtros (período/severidade/canal/candidato) persistidos na URL com chips e "Limpar filtros", lista paginada (client-side, 10 por página, com "Mostrando X–Y de Z"), drawer de detalhe (regra que disparou, métrica atual, referência/threshold, link para evidência quando existe), skeleton e estado vazio.
- Adicionada ao menu lateral (grupo "Inteligência") e ao `screen_key` do middleware (`/dashboard/alertas` → `alertas`) — segue o mesmo modelo de permissão dos demais módulos (admin vê tudo; outros perfis precisam da permissão `alertas` em `app_user_permissions`).
- **Não implementado**: estado lido/não lido (não há infraestrutura de persistência para isso — ver seção 13).

## Fase 2.2 Correção de métrica fabricada

`InstagramDashboard.tsx` e `XDashboard.tsx` exibiam uma variação percentual (`mockVar`) **hardcoded e alternada por índice** (`i % 2 === 0 ? 12 : -5`), rotulada como se fosse a variação real dos KPIs. Removida; os cards de KPI agora mostram apenas o valor real, com um ícone de status (perigo/sucesso/neutro) derivado da própria natureza da métrica — sem inventar tendência.

## Fase 2.3 Drawers de detalhe (substituindo modais centrais)

- Novo `components/ui/Drawer.tsx`: painel lateral genérico e acessível (Esc, focus trap, retorno de foco ao elemento que abriu, preserva scroll da tela de fundo, ocupa quase a tela inteira em mobile).
- `InstagramDashboard.tsx` e `XDashboard.tsx`: os modais centrais de "Análise de Inteligência Estratégica" foram convertidos para usar `Drawer`, preservando 100% do conteúdo já existente (mídia, texto, tema, justificativa de risco, resumo, ação recomendada). O `useEffect` de Esc que cada um mantinha manualmente foi removido (redundante com o `Drawer`).
- `app/dashboard/noticias/NewsFeedTableSection.tsx`: novo drawer de detalhe de notícia (resumo, relevância, localidade, temas, entidades), com distinção honesta entre "análise concluída" e "análise de IA ainda não disponível" — nunca apresenta ausência de análise como resultado neutro.

## Fase 2.4 Radar de Notícias — Feed/Tabela

- Novo `components/ui/ViewToggle.tsx` (genérico) + `app/dashboard/noticias/NewsFeedTableSection.tsx`: alterna entre Feed (cards) e Tabela (componente `DataTable` já existente, reaproveitado sem alterações), com preferência persistida em `localStorage` (`politixos_news_view`).
- A seção "Base Completa de Monitoramento" (antes uma única tabela sem paginação, exibindo até 100 de N registros silenciosamente) agora tem paginação real na apresentação (12 itens/página no Feed, mesma paginação alimentando a Tabela), contador "Mostrando X–Y de Z" e total real de resultados — não mais um corte silencioso em 100.
- Cada card do Feed mostra fonte, data, resumo (ou aviso explícito de "sem análise"), sentimento/risco (badges — omitidos quando não há análise, nunca mostrados como neutro), localidade e até 2 temas, com ação para abrir a matéria original e ação para ver detalhes completos no drawer.

## Fase 2.5 Rankings executivos (Instagram e X)

- Novo `components/dashboard/SocialRankings.tsx`, compartilhado pelos dois módulos: recebe blocos já calculados a partir dos dados que a página já buscou (nenhuma consulta nova) e mostra apenas **volume absoluto**, com tooltip (`title`) explicando a fórmula de cada ranking. Não normaliza por seguidores (dado inexistente) para não fabricar uma "taxa".
- Instagram: Maior Engajamento Absoluto, Mais Comentados, Perfis Mais Ativos.
- X: Maior Volume de Interações, Mais Repostado, Perfis Mais Ativos.

## Fase 2.6 Timeline consolidada (Visão Geral)

- `lib/queries/overview.ts`: nova função pura `buildTimelineEvents` (testada isoladamente) + `getTimelineEvents`, que **reaproveita o mesmo `fetchOverviewData` já cacheado por `React.cache()`** — zero consultas novas ao Supabase. Usa os mesmos critérios de "item notável" de `getPriorityAlerts`, ordenados cronologicamente e deduplicados por `canal:id` (um mesmo item nunca aparece duas vezes, mesmo satisfazendo mais de um critério).
- Novo `components/dashboard/overview/OverviewTimeline.tsx`: lista cronológica com filtro por canal, 15 itens iniciais e "Ver mais" (revela mais itens do array já carregado — até 40 no total —, sem nova consulta), link para a evidência original.

## Fase 2.7 Filtros consistentes

- Novo `components/ui/ActiveFilterChips.tsx` (genérico): aplicado em `NewsGlobalFilters.tsx` (notícias, que já tinha "Limpar" mas não chips), `InstagramFilterBar.tsx` e `XFilterBar.tsx` (que não tinham nem chips nem "Limpar" — adicionados). Cada filtro ativo aparece como chip removível individualmente; "Limpar todos" quando há mais de um filtro ativo.
- Todos os filtros de todos os módulos (Visão Geral, Notícias, Instagram, X, Alertas) já persistem na URL via `router.push`/`searchParams` — recarregar a página ou compartilhar a URL preserva o estado filtrado.

## Fase 2.8 Testes automatizados (Vitest)

Configurado `vitest` (`vitest.config.ts`, scripts `test`/`test:run` no `package.json`). 42 testes em 5 arquivos, todos sobre **funções puras** (nenhum mock de Supabase, conforme diretriz):

- `lib/queries/alerts.test.ts`: regras de alerta (notícia crítica/alta, volume anormal, sentimento negativo, temas sensíveis, Instagram risco/sentimento, X risco/crisisScore), ordenação por severidade+recência, e `shouldReturnEmptyForAccess` (gate de `allowedTargetIds`).
- `lib/queries/overview.test.ts`: `buildTimelineEvents` — ordenação cronológica, threshold de relevância, deduplicação por canal+id, severidade.
- `lib/queries/instagram.test.ts` / `lib/queries/x.test.ts`: `cleanFilter` (sanitização de parâmetros de URL).
- `lib/utils/viewPreference.test.ts`: `resolveViewPreference` (preferência Feed/Tabela).

**Não implementado nesta fase**: testes de componente/interação (abrir/fechar drawer, clique no Ctrl+K, alternância Feed/Tabela na UI) e testes E2E (Playwright). Exigiriam configurar `jsdom` + Testing Library (ou Playwright), uma segunda camada de infraestrutura de teste não presente no projeto. A lógica por trás desses comportamentos (sanitização, regras, ordenação, dedup, preferência) está coberta por testes de função pura; a interação de UI em si permanece validada apenas manualmente/por revisão de código.

## Fase 2.9 Consultas otimizadas / performance

- Central de Alertas: 3 consultas por carregamento (`Promise.allSettled`), reaproveitando os fetchers já existentes.
- Timeline: 0 consultas novas (reaproveita cache da Visão Geral).
- Rankings (Instagram/X): 0 consultas novas (calculados sobre dados já buscados pela página).
- Nenhuma consulta duplicada foi reintroduzida; `React.cache()` em `fetchOverviewData`/`getTrendOverview`/`fetchMencoes` permanece intocado.

## Fase 2.10 Métricas antes/depois

| Métrica | Antes (Fase 2) | Depois |
|---|---|---|
| Variação % exibida nos KPIs de Instagram/X | Fabricada (`mockVar`, alternando +12%/-5%) | Removida — apenas valor real + indicador de status |
| Detalhe de post (Instagram/X) | Modal central, sem focus trap documentado | Drawer lateral acessível (Esc, focus trap, retorno de foco) |
| "Base Completa de Monitoramento" (notícias) | Tabela única, até 100 de N registros exibidos sem indicação de corte | Feed/Tabela com paginação real, "Mostrando X–Y de Z" |
| Central de Alertas | Inexistente | Rota funcional com 9 regras documentadas e explicáveis |
| Rankings sociais executivos | Inexistentes (havia apenas listas "top 5" sem explicação de fórmula) | 3 rankings por módulo, com fórmula em tooltip |
| Timeline na Visão Geral | Inexistente | Presente, sem custo de consulta adicional |
| Filtros com chip visual + "Limpar" | Só em Notícias (sem chips) | Notícias, Instagram, X e Alertas — todos com chips + limpar |
| Testes automatizados | 0 | 42 (Vitest), lógica pura de filtros/alertas/timeline/preferência |

## Fase 2.11 Limitações e dados que ainda não existem

- Estado lido/não lido de alertas — sem tabela de persistência.
- Taxa de engajamento normalizada por seguidores — sem dado de seguidores.
- Comparação período-a-período nos KPIs de Instagram/X (ex.: "+12% vs. semana passada" real) — calculável, mas exigiria uma segunda consulta por módulo; não implementada nesta sessão para não aumentar o número de consultas por carregamento sem alinhamento prévio sobre o custo.
- Comparador de candidatos e mapa geográfico — não implementados (auditoria de schema geográfico ainda pendente, conforme já registrado na Fase 1).
- "Pergunte aos dados" (IA conversacional) — não implementado (decisão de produto/infra pendente).
- Unificação total dos filtros entre módulos — cada módulo mantém filtros próprios (funcionais), não uma barra global compartilhada.

## Fase 2.12 Funcionalidades não implementadas (resumo com motivo)

| Item do pedido | Status | Motivo |
|---|---|---|
| Central de Alertas | ✅ Implementado | — |
| Feed/Tabela em Notícias | ✅ Implementado | — |
| Drawer de notícia | ✅ Implementado | — |
| Rankings Instagram/X | ✅ Implementado (volume absoluto) | Taxa normalizada por seguidores não implementada — sem dado real |
| Timeline consolidada | ✅ Implementado | — |
| Testes mínimos | ✅ Implementado (funções puras) | Testes de componente/E2E não implementados — infra adicional necessária |
| Estado lido/não lido em alertas | ❌ Não implementado | Sem infraestrutura de persistência (instrução explícita: não simular) |
| Comparação período-a-período real nos KPIs sociais | ❌ Não implementado | Exigiria nova consulta por módulo; não orçado nesta sessão |
| Validação do fluxo autenticado em navegador | ❌ Não realizado | Sem credenciais de teste; ver seção 13 |

## Fase 2.13 Validação autenticada

Mesma limitação da Fase 1: o projeto usa um único Supabase real (não há ambiente de staging), e não há credenciais de teste em `.env.local`, documentação ou scripts seguros. `scripts/seed-admin.mjs` gravaria um usuário real no banco de produção — não executado sem autorização explícita.

**Validado sem autenticação** (via navegador real, `npm run dev`):
- Login (`/login`) renderiza normalmente, tema visual preservado.
- Acesso não autenticado a `/dashboard/overview` e à nova rota `/dashboard/alertas` redireciona corretamente para `/login`, sem loop, sem erros de console, sem erros de servidor.

**Checklist manual objetivo para quando houver credenciais** (além do já registrado na Fase 1):
1. Abrir Central de Alertas — resumo por severidade bate com a lista exibida.
2. Aplicar filtro de severidade/canal/candidato — URL atualiza, lista atualiza, chip aparece.
3. Abrir um alerta — drawer mostra regra, métrica, referência e (quando houver) link de evidência.
4. Radar de Notícias — alternar Feed ↔ Tabela, recarregar a página e confirmar que a preferência persiste.
5. Abrir um card do Feed — drawer mostra resumo completo; para notícia sem análise, aviso explícito aparece (não "neutro" silencioso).
6. Instagram/X — abrir detalhe de post pelo botão "Detalhes"/clique na linha — deve abrir como drawer lateral (não mais modal central).
7. Rankings do Instagram/X exibem itens reais do período filtrado; tooltip do ícone "i" mostra a fórmula.
8. Visão Geral — bloco "Timeline Consolidada" aparece após o Mapa de Ação; filtro por canal funciona; "Ver mais" revela mais itens sem tela de carregamento nova.
9. Nenhum erro no console do navegador em nenhuma das telas acima.
