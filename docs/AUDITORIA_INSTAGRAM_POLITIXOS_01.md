# AUDITORIA — MÓDULO INSTAGRAM — POLITIXOS (01)

**Tipo:** Auditoria completa, factual, somente leitura.
**Data:** 2026-08-20
**Escopo:** Frontend, backend, banco (Supabase `hhhwuajptkyposarfbzn`), RapidAPI, workflow n8n `PolitixOS - automação - webrook`.
**Regra de execução:** nenhuma alteração foi feita em código, banco, n8n ou produção. Nenhum deploy, push ou migration foi executado.

---

## 1. Status geral

O módulo Instagram do PolitixOS é, hoje, um **par de camadas desacopladas**:

- Uma **camada de leitura + trigger manual** dentro deste repositório (Next.js): dashboard (`/dashboard/instagram`), queries de leitura ao Supabase, e um painel (`/dashboard/automacoes`) que dispara webhooks n8n via `POST` sem autenticação.
- Uma **camada de coleta e IA** inteiramente fora deste repositório: o workflow n8n **"PolitixOS - automação - webrook"** (id `XaWHmrrnobud6La1`, ativo, 56 nodes, atualizado hoje `2026-08-20`), que chama a RapidAPI (`instagram-scraper-api18.p.rapidapi.com`), grava diretamente no Supabase via REST (bypassando qualquer API própria do PolitixOS) e roda análise de IA (OpenAI) sobre o conteúdo coletado.

O módulo cobre hoje **apenas Posts (feed) e Comentários**. Não há qualquer evidência de código, schema ou configuração para **Reels** ou **Stories** — confirmado por busca exaustiva no repositório e por inspeção direta dos nodes do workflow n8n (apenas dois endpoints RapidAPI são usados: `/user/posts` e `/post/comments`).

O achado mais grave da auditoria não é de cobertura de conteúdo — é de **segurança multi-tenant**: as tabelas que guardam posts, comentários e análises de IA do Instagram têm política RLS `"Allow anon read"` com condição `true` (leitura irrestrita por qualquer chave anônima), e a tabela `targets` (candidatos/alvos) está com **RLS desabilitado** por completo (alerta `ERROR` do linter de segurança do Supabase). O isolamento por cliente hoje existe **apenas na camada de aplicação** (filtro em memória por `target_id` permitido), não no banco.

---

## 2. Arquitetura atual

```
[Cadastro de alvo/handle]  (CRUD puro, sem chamada externa)
        │  components/candidatos/CandidatoForm.tsx → lib/actions/candidatos.ts
        ▼
   tabela social_accounts (Supabase)

[Disparo manual]  /dashboard/automacoes → AutomationPanel.tsx → lib/n8n.ts
        │  POST sem auth, client-side, para URL pública (NEXT_PUBLIC_WEBHOOK_*)
        ▼
[n8n] "PolitixOS - automação - webrook"  (webhook, sem autenticação configurada)
        │
        ├─ busca contas ativas (Supabase REST, service_role hardcoded)
        ├─ RapidAPI /user/posts   → normaliza → upsert social_posts (Supabase REST)
        ├─ RapidAPI /post/comments → normaliza → upsert instagram_comments
        ├─ OpenAI (prompt de análise) → upsert ai_analysis
        └─ log da execução → collection_logs (status hardcoded "success")
        │
        ▼
   Supabase (social_posts, instagram_comments, ai_analysis, collection_logs)
        │  leitura direta (anon/authenticated key), SEM API própria intermediária
        ▼
[PolitixOS] lib/queries/instagram.ts → filtra em memória por allowedTargetIds
        ▼
   app/dashboard/instagram/page.tsx → InstagramDashboard.tsx
```

Não existe nenhuma rota `app/api/**` para Instagram neste repositório — nem para disparar coleta, nem para receber callback do n8n. O n8n é tanto o coletor quanto o "gravador" direto no banco.

---

## 3. Frontend

| Caminho | Função | Dados consumidos | Dados exibidos |
|---|---|---|---|
| [app/dashboard/instagram/page.tsx](app/dashboard/instagram/page.tsx) | Server Component da página. Resolve RBAC (`allowedTargetIds`), busca dados uma única vez (`fetchInstagramData`) e deriva KPIs/gráficos localmente. | `lib/queries/instagram.ts`, `lib/auth/dal.ts` | Passa `options`, `kpis`, `charts`, `posts`, `comments` para os componentes filhos |
| [components/dashboard/InstagramDashboard.tsx](components/dashboard/InstagramDashboard.tsx) | Client Component principal: alerta de post crítico, 6 KPI cards, gráfico "Pressão Social", gauge "Termômetro de Risco", donut de sentimento, barras de temas IA, tabela de posts prioritários, tabela de análise estratégica (até 20 posts), tabela de comentários em tempo real (até 50), modal de detalhe com `MediaRenderer` | Props `kpis/charts/posts/comments` | Sentimento, risco, tema, resumo e ação recomendada por post (todos vindos de IA); mídia única (imagem OU vídeo) por post |
| [components/dashboard/InstagramFilterBar.tsx](components/dashboard/InstagramFilterBar.tsx) | Filtros locais (Sentimento, Risco, Tema, Post) — candidato/período vêm do `GlobalContextBar` | `getInstagramFiltersOptions` | 4 selects que escrevem em `searchParams` |
| [lib/types/instagram.ts](lib/types/instagram.ts) | Tipos `InstagramPost`/`InstagramComment` | — | Sem campos para `media_type` discriminado, carrossel, Reels ou Stories |
| [lib/queries/instagram.ts](lib/queries/instagram.ts) | Núcleo de dados (leitura Supabase + cálculo de KPIs/gráficos/alertas) — detalhado na seção 4 | Supabase (`social_posts`, `targets`, `instagram_comments`, `ai_analysis`) | — |
| [lib/queries/instagram.test.ts](lib/queries/instagram.test.ts) | Testes unitários apenas das funções puras de cálculo (KPIs/gráficos), com fixtures sintéticas | — | Não há teste de integração de `fetchInstagramData`, nem de RapidAPI/n8n |
| [lib/navigation/appScreens.ts:95-104](lib/navigation/appScreens.ts) | Registro da tela `instagram` no catálogo de navegação/RBAC | — | `showInNav`, `supportsGlobalCandidate`, `supportsGlobalPeriod` |
| [proxy.ts:18-77](proxy.ts) | Middleware: bloqueia `/dashboard/instagram` se `permissions` do usuário não incluir `'instagram'` | `session.permissions` | — |
| [components/candidatos/CandidatoForm.tsx](components/candidatos/CandidatoForm.tsx) / [CandidatoList.tsx](components/candidatos/CandidatoList.tsx) | Cadastro/listagem de handles Instagram como parte do cadastro de "alvo" (candidato) | — | `platform`, `handle`, `profile_url`, `is_active` — sem followers/bio/foto |
| [components/AutomationPanel.tsx](components/AutomationPanel.tsx) | Painel manual com 4 flows Instagram: Coletar Posts, Coletar Comentários, Rodar Análise IA, Reprocessar sem análise | `lib/n8n.ts` (`WEBHOOKS`) | Status idle/loading/success/error por flow; mensagem de erro genérica |
| [components/dashboard/overview/OverviewGauge.tsx](components/dashboard/overview/OverviewGauge.tsx), `OverviewChannels.tsx`, `OverviewExecutiveTable.tsx`, `OverviewTimeline.tsx`, `PriorityAlertsCenter.tsx` | Instagram aparece agregado no Overview executivo, com peso fixo de **20%** no "Score de Crise" | dados já processados de `social_posts`/`ai_analysis` | Cards, timeline unificada, tabela executiva cross-canal |
| [app/dashboard/territorios/.../inteligencia-externa/page.tsx:50-158](app/dashboard/territorios) | Card "Instagram" **mockado** (`mock: true`) na tela de Territórios — não é dado real | dado estático de exemplo | — |

Não há suporte de UI para carrossel (múltiplas mídias), Reels ou Stories em nenhum componente.

---

## 4. Backend

### 4.1 Como uma coleta é iniciada
**Exclusivamente manual.** Um usuário autenticado clica em um dos 4 botões em `/dashboard/automacoes` → `lib/n8n.ts::triggerN8nWebhook(url)` → `fetch(url, {method:'POST', body:{source:'politixos_manual', triggeredAt}})`, disparado **no navegador** (client-side), sem header de autenticação. Não há cron nem agendamento no código deste repositório — o agendamento existe **dentro do n8n** (5 nodes `Schedule Trigger`, todos configurados para **30 minutos**, apesar do nome do node dizer "90min").

### 4.2 Qual endpoint recebe dados
**Nenhum.** Não existe rota `app/api/**` para Instagram. O n8n grava diretamente nas tabelas do Supabase via REST, usando uma chave `service_role` (hardcoded no node, ver seção 6.3) — o backend Next.js nunca vê os dados no momento da escrita.

### 4.3 Quem chama a RapidAPI
Apenas o n8n. Nenhum arquivo deste repositório referencia RapidAPI. Dois nodes HTTP Request dentro do workflow:
- `RapidAPI - Buscar posts` → `GET https://instagram-scraper-api18.p.rapidapi.com/user/posts?handle={{handle}}&trim=true`
- `RapidAPI - Buscar comentários` → `GET https://instagram-scraper-api18.p.rapidapi.com/post/comments?url={{post_url}}&trim=true`

### 4.4 Quem chama o n8n
`lib/n8n.ts` (client-side, painel manual) e, historicamente, os próprios `Schedule Trigger` internos do n8n (que não dependem do PolitixOS para disparar).

### 4.5 Quem recebe resposta do n8n
Ninguém, no sentido de callback HTTP. O n8n é "fire and forget" do ponto de vista do PolitixOS: o `fetch` do painel só espera o `res.ok` do webhook (HTTP 2xx = "workflow aceitou a requisição"), não espera o resultado da coleta. O resultado só aparece depois, quando o dashboard relê o Supabase.

### 4.6 Tratamento de erros
- **No trigger manual:** genérico — `throw new Error('Erro ao acionar fluxo (HTTP status)')`, exibido ao usuário como "Não foi possível iniciar o processo agora. Tente novamente." Nenhum detalhe do erro real é repassado.
- **Na leitura (`lib/queries/instagram.ts`):** `console.error` em caso de erro do Supabase, mas a função **não lança exceção** — retorna array vazio silenciosamente (`|| []`).
- **No n8n:** o node `Preparar log` grava `status: 'success'` **hardcoded**, independentemente do resultado real da execução. Confirmado no banco: **100% dos 2.571 registros em `collection_logs` têm `status = 'success'`** — não há um único "error"/"failed" registrado em ~3,5 meses de operação. Isso não significa ausência de falhas; significa que **falhas não são logadas como falhas**.

### 4.7 Retry
- Não existe no caminho principal de coleta (`RapidAPI - Buscar posts`, `RapidAPI - Buscar comentários`, `Supabase - Upsert social_posts`, `Supabase - Upsert instagram_comments` — nenhum tem `retryOnFail`).
- Existe **apenas** no branch de reprocessamento de análise de IA (`Supabase - Posts SEM análise1`, `Supabase - Buscar comentários2`, `OpenAI - Analisar percepção2`, `Supabase - Upsert ai_analysis2` — todos com `retryOnFail: true, maxTries: 3`).
- No endpoint comparável de investigações (`app/api/investigations/start/route.ts`, não é Instagram), também não há retry — falha é devolvida ao usuário.

### 4.8 Deduplicação
- **No n8n:** via `on_conflict` do PostgREST — `social_posts?on_conflict=platform,platform_post_id` e `instagram_comments?on_conflict=instagram_comment_id`, com `Prefer: resolution=merge-duplicates`. Reforçado por índices únicos no banco (seção 5.4).
- **No PolitixOS:** `lib/queries/instagram.ts` deduplica apenas a lista de `postIds` em memória para montar a query de `ai_analysis` — não é deduplicação de dados de origem.

### 4.9 Paginação
- **RapidAPI:** nenhuma. Os dois endpoints são chamados sem cursor/`max_id`/`count` — apenas a primeira página de resultado é usada a cada execução.
- **Leitura Supabase (`lib/queries/instagram.ts`):** `.limit(200)` fixo em posts, `.limit(1000)` fixo em comentários — sem cursor, sem "carregar mais".

### 4.10 Rate-limit handling
Não encontrado em nenhuma camada. Não há nodes de espera/backoff no n8n (nenhum node do tipo `wait`), nem tratamento de HTTP 429 em nenhum node HTTP Request.

---

## 5. Banco

Projeto Supabase: `hhhwuajptkyposarfbzn` ("cpfernandopinto-sudo's Project", ACTIVE_HEALTHY). 26 tabelas no schema `public`; as relevantes ao módulo Instagram:

| Tabela | Finalidade | PK | RLS | Linhas (aprox.) |
|---|---|---|---|---|
| `targets` | Candidatos/alvos monitorados | `id` (uuid) | **DESABILITADO** (`ERROR` no advisor de segurança) | 19 |
| `social_accounts` | Handles monitorados por plataforma (inclui Instagram) | `id` | Habilitado — só `service_role` tem policy | 27 |
| `social_posts` | Posts multi-plataforma (Instagram + X) — **tabela ativa** | `id` | Habilitado — `"Allow anon read"` com `qual: true` | 1.033 (652 Instagram, 381 X) |
| `instagram_posts` | Tabela paralela específica de Instagram — **órfã/não usada** (não referenciada em nenhuma query do repositório; schema diferente de `social_posts`, sem `share_count`/`view_count`/`platform`) | `id` | Habilitado — `"Allow anon read"` | **0** |
| `instagram_comments` | Comentários de posts do Instagram | `id` | Habilitado — `"Allow anon read"` | 125.985 |
| `ai_analysis` | Análise de IA por conteúdo (`content_type`+`content_id`) — hoje só `content_type='post'` | `id` | Habilitado — `"Allow anon read"` | 1.045 |
| `collection_logs` | Log de execuções de coleta | `id` | Habilitado — só `service_role` | 2.570 |
| `app_users`, `app_user_targets`, `app_user_permissions` | RBAC (usuário ↔ alvo ↔ tela) | `id` | Habilitado, **sem nenhuma policy** (deny-all efetivo p/ anon/authenticated) | 7 / 29 / 30 |

**Relacionamentos:** todas as tabelas de conteúdo (`social_accounts`, `social_posts`, `instagram_posts`, `instagram_comments`, `ai_analysis`, `collection_logs`) têm FK direta para `targets.id` via `target_id`. Não existe FK para `candidate_id` como coluna própria em tabelas de conteúdo — `candidate_id` só aparece em `targets.candidate_id` (texto) e em `electoral_poll_results`.

**Índices relevantes:** `uq_social_posts_platform_id`/`idx_unique_post` (duplicados, ambos únicos em `platform, platform_post_id`), `uq_instagram_comments_comment_id`/`instagram_comments_instagram_comment_id_key` (duplicados), `idx_posts_target`/`idx_social_posts_target_id` (redundantes), índices em `taken_at DESC` para ordenação temporal. `idx_post_url` é único em `post_url` (nullable — múltiplos `NULL` são permitidos pelo Postgres).

### 5.1 Pergunta objetiva: um registro Instagram hoje pertence explicitamente a um `client_id`?

**NÃO.**

Não existe coluna `client_id` em nenhuma tabela do schema `public`, nem tabela `clients`/`organizations`/`tenants`. O único vínculo de propriedade é `target_id` (candidato/alvo individual), e o acesso de usuários a alvos é mediado por `app_user_targets` (relação usuário↔alvo, não cliente↔alvo). Ou seja: o sistema hoje modela "quem pode ver qual candidato", não "qual cliente é dono de quais dados" — são conceitos próximos mas não idênticos, e não há uma entidade "cliente" no banco.

Além disso, mesmo o isolamento por `target_id` que existe **não é aplicado no banco**: as policies `"Allow anon read"` em `social_posts`, `instagram_posts`, `instagram_comments` e `ai_analysis` têm `qual: true` — ou seja, **qualquer chamada autenticada com a chave anônima do Supabase lê todos os `target_id`, de todos os candidatos, sem filtro**. O filtro por `allowedTargetIds` existe **apenas em `lib/queries/instagram.ts`**, em memória, no lado da aplicação. Isso está registrado no próprio código-fonte: um comentário em `lib/queries/instagram.ts` (linhas 3-6) documenta que um `React.cache()` anterior foi **removido propositalmente por ter causado vazamento de dados entre usuários com filtros diferentes** — evidência de que esse tipo de falha já ocorreu na prática.

---

## 6. RapidAPI

### 6.1 Onde está configurada
Nenhuma variável de ambiente com "RAPIDAPI" no nome existe no repositório PolitixOS (busca exaustiva vazia). A configuração da RapidAPI **vive inteiramente dentro do workflow n8n**, não neste código.

### 6.2 Endpoints identificados (dentro do n8n)

**ENDPOINT:** `GET https://instagram-scraper-api18.p.rapidapi.com/user/posts`
**MÉTODO:** GET
**PARÂMETROS:** `handle` (query, dinâmico por conta), `trim=true`
**TIPO DE CONTEÚDO RETORNADO:** lista de posts do feed (`response.items[]`) — inclui campos como `id`/`pk`, `code`/`shortcode`, `caption`, `media_type` (1/2/8), `video_versions`, `image_versions2`, `carousel_media`, `like_count`, `comment_count`, `view_count`/`play_count`, `taken_at`
**PAGINAÇÃO:** nenhuma usada (sem cursor/`max_id` enviado)
**CAMPOS PRINCIPAIS USADOS:** `id/pk/media_id`, `code/shortcode`, `caption`, `media_type`, `like_count`, `comment_count`, `view_count`/`play_count`, `taken_at`, `video_versions[0].url`, `image_versions2.candidates[0].url`, `carousel_media[0]...`
**ONDE É UTILIZADO:** node `RapidAPI - Buscar posts` → `Normalizar posts` → upsert em `social_posts`

**ENDPOINT:** `GET https://instagram-scraper-api18.p.rapidapi.com/post/comments`
**MÉTODO:** GET
**PARÂMETROS:** `url` (post_url, query), `trim=true`
**TIPO DE CONTEÚDO RETORNADO:** lista de comentários do post
**PAGINAÇÃO:** nenhuma usada
**CAMPOS PRINCIPAIS USADOS:** id do comentário, usuário, texto, likes, data
**ONDE É UTILIZADO:** node `RapidAPI - Buscar comentários` → `Normalizar comentários` → upsert em `instagram_comments`

### 6.3 Credenciais expostas em texto plano (achado de segurança)
Os nodes RapidAPI e Supabase do workflow **não usam o cofre de credenciais do n8n** (`credentials: null`, `authentication: none` em todos os nodes HTTP Request inspecionados). A chave `x-rapidapi-key` e o JWT `service_role` do Supabase estão **hardcoded diretamente nos parâmetros do node**, visíveis a qualquer pessoa com permissão de leitura do workflow no n8n. Os valores **não** estão sendo reproduzidos neste relatório (conforme instrução da auditoria), mas a existência do hardcode em si é o achado — ver seção 14 (Riscos).

### 6.4 Classificação por tipo de conteúdo

| Tipo | Classificação | Evidência |
|---|---|---|
| POSTS / FEED | **IMPLEMENTADO** | `/user/posts`, normalizado, upsert em `social_posts` |
| COMMENTS | **IMPLEMENTADO** | `/post/comments`, normalizado, upsert em `instagram_comments` |
| LIKES / ENGAGEMENT | **IMPLEMENTADO** (como métrica do post/comentário, não como endpoint próprio) | `like_count`, `comment_count`, `view_count`/`play_count` extraídos do payload de `/user/posts` |
| PROFILE | **NÃO ENCONTRADO** | Nenhum endpoint de perfil (`/user/info` ou similar) chamado; `social_accounts` só guarda `handle`/`profile_url` cadastrados manualmente |
| REELS | **NÃO ENCONTRADO** | Nenhum endpoint dedicado a Reels; vídeos vindos de `/user/posts` são tratados genericamente como `media_type: 'video'`, sem distinguir Reels de vídeo de feed comum, sem `plays` separado de `views` |
| STORIES | **NÃO ENCONTRADO** | Nenhum endpoint, campo, tabela ou UI relacionados a Stories em nenhuma camada |

---

## 7. n8n

**Workflow identificado:** `PolitixOS - automação - webrook` — id `XaWHmrrnobud6La1`, **ativo**, criado em `2026-05-09`, **atualizado em `2026-08-20`** (hoje), `triggerCount: 10`, 56 nodes. Confirmado via MCP n8n (somente leitura — nenhuma alteração foi feita).

Também existe `PolitixOS - IA Análise de Posts Instagram - backup` (id `9ZZRC2Ahaz40ttClJa5bU`), **inativo**, e não disponível para leitura via MCP (precisaria ser habilitado manualmente no n8n para inspeção — não foi feito, por ser alteração de configuração).

Importante: o workflow "webrook" **não é exclusivo de Instagram** — no mesmo workflow mestre também vivem os fluxos de coleta de Notícias (Google News RSS + Gemini). X/Twitter **não** aparece neste workflow (nenhum node relacionado a Twitter/X foi encontrado) — presumivelmente vive em outro workflow não coberto pelo escopo desta auditoria (busca foi por "instagram" e "PolitixOS").

### 7.1 Estrutura mapeada

**Triggers:**
- 4 Webhooks HTTP POST, **sem autenticação configurada**: `/trigger-posts`, `/trigger-comentarios`, `/trigger-analise`, `/trigger-reprocessamento` (mais `/trigger-noticias`, fora do escopo Instagram)
- 5 Schedule Triggers, todos a **cada 30 minutos** (apesar do nome do node dizer "90min" — nome desatualizado em relação à configuração real)

**Fluxo "Posts" (`/trigger-posts` ou schedule):**
`Buscar contas Instagram ativas` (Supabase REST, filtra `platform=eq.instagram&is_active=eq.true`) → `Preparar contas` → `Loop contas` (batch) → `RapidAPI - Buscar posts` → `Normalizar posts` (JS) → `Supabase - Upsert social_posts` → `Preparar log` → `Supabase - Inserir log`

**Fluxo "Comentários" (`/trigger-comentarios`):**
`Supabase - Buscar posts` → `Loop posts` → `RapidAPI - Buscar comentários` → `Normalizar comentários` → `Supabase - Upsert instagram_comments`

**Fluxo "Análise IA" (`/trigger-analise`):**
`Supabase - Buscar posts1` → `Loop posts1` → `Supabase - Buscar comentários` → `Preparar prompt IA` (monta prompt com legenda + métricas + até 80 comentários) → `OpenAI - Analisar percepção` → `Normalizar análise IA` → `Supabase - Upsert ai_analysis`

**Fluxo "Reprocessamento" (`/trigger-reprocessamento`):**
Igual ao fluxo de análise, mas partindo de `Supabase - Posts SEM análise1` (posts sem `ai_analysis` correspondente) — **único trecho com `retryOnFail`/`maxTries: 3` configurado**.

### 7.2 Payload / contrato
- **Entrada (webhook):** nenhum payload obrigatório é lido pelos webhooks — o PolitixOS envia `{source: 'politixos_manual', triggeredAt}`, mas os nodes seguintes ignoram esse body e buscam contas/posts diretamente no Supabase (filtrando só por `platform`/`is_active`, sem receber `target_id`/`client_id` do chamador). Ou seja: **disparar `/trigger-posts` roda a coleta para TODOS os alvos ativos, não é possível escopar por candidato/cliente via payload.**
- **Response:** o webhook responde ao PolitixOS assim que aceita a chamada (não espera o fim do processamento assíncrono).
- **Callback:** não existe — o n8n escreve diretamente no Supabase.

### 7.3 Status de acessibilidade
**N8N_WORKFLOW_MAPPED_VIA_MCP** — não se aplica o rótulo `N8N_WORKFLOW_NOT_ACCESSIBLE`: o workflow foi acessível e lido integralmente através do MCP de n8n configurado nesta sessão (ferramenta somente-leitura `get_workflow_details`). Nenhuma alteração foi salva.

---

## 8. Posts

**IMPLEMENTADO.** Coleta via RapidAPI `/user/posts` → normalização → `social_posts` → leitura via `lib/queries/instagram.ts` → UI em `InstagramDashboard.tsx`. 652 posts de Instagram no banco hoje, com dados de `2026-05-08` até `2026-08-21` (coleta ativa e recente).

Campos hoje disponíveis: `platform_post_id`, `shortcode`, `post_url`, `caption`, `media_type` (image/video/carousel — texto livre, não enum), `media_url` (uma única URL, não array), `like_count`, `comment_count`, `share_count`, `view_count`, `taken_at`, `raw_json` (payload bruto da RapidAPI preservado), `collected_at`.

---

## 9. Reels

**AUSENTE.** Nenhum endpoint RapidAPI dedicado, nenhum campo de banco (`plays` distinto de `views`, `is_reel`, etc.), nenhuma UI, nenhuma análise de IA específica. Vídeos capturados via `/user/posts` são normalizados genericamente como `media_type: 'video'` — não há como hoje diferenciar, no banco, um Reel de um vídeo comum de feed.

Campos que a auditoria (Etapa 9 do pedido original) pediu para verificar, e o resultado:

| Campo | Existe hoje? |
|---|---|
| identificação de `media_type` (Reel) | Não — só `image/video/carousel` genérico |
| `views` | Sim, para vídeo genérico (`view_count`) |
| `plays` | Parcial — `post.play_count` é lido como fallback de `view_count` no código de normalização, mas não é armazenado em campo separado |
| `likes` | Sim (`like_count`) |
| `comments` | Sim (`comment_count`) |
| `caption` | Sim |
| `thumbnail` | Não no banco de coleta (`social_posts` não tem `thumbnail_url`; esse campo só existe no tipo TypeScript `InstagramPost` do frontend, sem coluna correspondente confirmada em `social_posts`) |
| `video URL` | Sim (`media_url`, quando `media_type='video'`) |
| `permalink` | Sim (`post_url`) |
| `published_at` | Sim (`taken_at`) |

---

## 10. Stories

**AUSENTE.** Nenhuma coleta, nenhuma tabela, nenhuma UI. Pontos que precisarão ser decididos antes de implementar (Etapa 8 do pedido original — não implementados, apenas levantados para planejamento):

- **Polling:** Stories expiram em 24h. Com o padrão atual de 30 minutos usado para posts, o intervalo já seria suficiente para não perder uma Story (48 capturas possíveis na janela de 24h), **mas** isso multiplicaria por N contas o número de chamadas RapidAPI a cada 30 min — precisa avaliar custo/quota antes de herdar o mesmo intervalo.
- **`instagram_media_id` / `collected_at` / `expires_at`:** nenhum desses campos existe hoje para Stories; precisarão de tabela nova (`instagram_stories` ou extensão de `social_posts` com `content_kind`).
- **Deduplicação:** o padrão hoje usado (`on_conflict` por `platform_post_id`/`instagram_comment_id`) é reaproveitável, desde que o `media_id` de Stories seja estável entre chamadas.
- **Armazenamento de payload/mídia:** hoje `raw_json` guarda o payload bruto do post, mas **não** há download/armazenamento da mídia em si — apenas a URL retornada pela RapidAPI é salva (`media_url`). URLs de mídia do Instagram (inclusive Stories) expiram; se o requisito for manter histórico visual após a Story sumir do Instagram, será necessário baixar e armazenar a mídia (ex.: Supabase Storage) antes da URL expirar — isso não existe hoje para nenhum tipo de conteúdo.
- **Histórico:** como Story é efêmero, decidir se o objetivo é só "sinalizar que existiu" (metadado) ou "preservar o conteúdo" (mídia) muda fortemente o desenho de custo/armazenamento.

---

## 11. Multi-tenant

**Avaliação da arquitetura atual:** hoje já existe, de fato, **um único workflow mestre** (`PolitixOS - automação - webrook`) que atende todos os alvos cadastrados — não há um workflow por cliente. Porém essa unificação **não é acompanhada de um conceito de `client_id`**: o workflow itera sobre `social_accounts` filtrando só por `platform`/`is_active`, sem nenhum parâmetro de cliente/tenant recebido via payload do webhook.

**Comparação solicitada:**

| Critério | A) 1 workflow por cliente | B) Workflow mestre parametrizado por `client_id` (situação-alvo) |
|---|---|---|
| Isolamento | Alto (falha de um cliente não afeta outro) | Depende 100% de disciplina de filtro por `client_id` em cada node — risco de vazamento cross-tenant se um filtro for esquecido (como já ocorreu — ver seção 5.1) |
| Segurança | Credenciais podem ser segregadas por cliente | Uma única credencial hardcoded hoje serve TODOS os clientes — um vazamento afeta todos de uma vez (ver seção 14, P0) |
| Manutenção | Alto custo — N workflows para manter em sincronia a cada mudança de lógica | Baixo custo — uma mudança de lógica se propaga para todos |
| Escalabilidade | Ruim — cada cliente novo = novo workflow, novo webhook, nova credencial | Boa — cliente novo = nova linha de configuração |
| Custo | Maior (execução redundante de infraestrutura n8n por cliente) | Menor |
| Observabilidade | Fácil (logs já segregados por workflow) | Precisa de `client_id` em todo log/métrica para não misturar clientes na observação |
| Risco de mistura de dados | Baixo (isolamento físico) | **Hoje, alto** — não há `client_id` nem no payload do trigger nem no schema, e a RLS do banco não filtra por tenant |

**Recomendação:** manter a direção já em curso (workflow mestre único) e **fechar a lacuna que falta**, não trocar de arquitetura: (1) criar entidade `clients`/`tenants` no schema, com `client_id` propagado para `targets` (e por FK indireta a `social_accounts`, `social_posts`, `instagram_comments`, `ai_analysis`, `collection_logs`); (2) o payload do webhook n8n passar a receber `client_id` explícito (ou o node "Buscar contas ativas" filtrar por `client_id` recebido); (3) políticas RLS reescritas para filtrar por `client_id`/`target_id` do usuário autenticado, substituindo as policies `"Allow anon read"` atuais que são irrestritas; (4) credenciais RapidAPI/Supabase migradas para o cofre de credenciais do n8n, com rotação. Essa é exatamente a preferência indicada na solicitação original da auditoria (workflow mestre + configuração por `client_id` + perfis vinculados ao cliente + execução parametrizada) — hoje faltam os itens 1, 2 e 3.

---

## 12. Fluxo atual

Ver diagrama da seção 2. Resumo textual: **disparo manual (sem auth) → n8n → RapidAPI → Supabase (escrita direta, sem API própria) → leitura direta pelo frontend (RLS aberta) → filtro de RBAC só em memória na aplicação.**

---

## 13. Lacunas

- Sem endpoint próprio do PolitixOS para iniciar coleta ou receber callback (n8n fala direto com o Supabase).
- Sem `client_id` em nenhuma camada (banco, n8n, frontend).
- Sem paginação em nenhuma chamada RapidAPI.
- Sem retry/backoff no caminho principal de coleta (só existe no branch de reprocessamento de IA).
- `collection_logs.status` sempre `'success'`, independentemente do resultado real — sem visibilidade real de falhas.
- Sem suporte a Reels, Stories, Carrossel completo (múltiplas mídias) ou dados de perfil (bio/followers/foto).
- Tabela `instagram_posts` órfã (0 linhas, schema divergente de `social_posts`, não referenciada em código) — dívida técnica a decidir (dropar ou consolidar).
- Índices únicos duplicados em `social_posts` e `instagram_comments`.
- Webhooks n8n publicamente descobríveis (variáveis `NEXT_PUBLIC_*`) e sem autenticação — qualquer pessoa pode disparar coleta/reprocessamento para todos os alvos.
- Credenciais (RapidAPI key, Supabase service_role JWT) hardcoded em texto plano nos nodes do n8n, fora do cofre de credenciais.
- RLS da tabela `targets` desabilitada; RLS de `social_posts`/`instagram_posts`/`instagram_comments`/`ai_analysis` habilitada mas com policy irrestrita para `anon`.

---

## 14. Riscos

**P0 — Crítico, ação antes de qualquer entrega a cliente:**
1. **RLS de `targets` desabilitada** — roster completo de candidatos de todos os clientes exposto a qualquer chave anônima (alerta `ERROR` do próprio linter de segurança do Supabase).
2. **Policies `"Allow anon read"` (`qual: true`) em `social_posts`, `instagram_posts`, `instagram_comments`, `ai_analysis`** — todo o conteúdo de Instagram e as análises de risco/sentimento de IA de todos os alvos são legíveis por qualquer portador da chave anônima, contornando completamente o filtro `allowedTargetIds` da aplicação.
3. **Webhooks n8n sem autenticação, URLs client-side (`NEXT_PUBLIC_*`) e sem escopo por cliente** — qualquer pessoa que inspecione o bundle JS pode disparar coleta/reprocessamento completo (todos os alvos) a qualquer momento, sem limite.
4. **Credenciais hardcoded em texto plano no workflow n8n** (chave RapidAPI e JWT `service_role` do Supabase, fora do cofre de credenciais) — qualquer pessoa com acesso de leitura ao workflow no n8n obtém as credenciais completas de escrita no banco de produção.
5. **`collection_logs.status` sempre `'success'`** — mascara falhas reais; impede detectar silenciosamente coletas quebradas antes que o cliente perceba dados faltando.

**P1 — Alto, resolver antes de escalar para múltiplos clientes:**
6. Ausência total de conceito `client_id` no schema — bloqueia isolamento real multi-tenant.
7. Sem retry no caminho principal de coleta — uma falha transitória de RapidAPI/Supabase derruba silenciosamente aquele ciclo de coleta (e ainda é logada como sucesso, agravando o item 5).
8. Sem paginação nas chamadas RapidAPI — contas com alto volume de posts podem ter itens não capturados.
9. Tabela `instagram_posts` órfã — risco de confusão/uso incorreto por quem desenvolver a expansão sem saber que é uma tabela morta.
10. Vazamento cross-usuário já ocorrido no passado (cache removido por esse motivo, conforme comentário no próprio código) — indício de que a dependência de filtro só em memória é frágil.

**P2 — Médio:**
11. Índices únicos duplicados (`social_posts`, `instagram_comments`) — overhead de manutenção/armazenamento.
12. Zero cobertura de Reels/Stories/Carrossel — esperado neste estágio, mas é o gap central do próximo sprint.
13. Fallback de URL de produção hardcoded em `lib/n8n.ts` sem validação de ambiente (diferente do padrão mais maduro em `app/api/investigations/start/route.ts`) — risco de ambiente de teste acionar produção acidentalmente.

**P3 — Baixo:**
14. `app_users`/`app_user_targets`/`app_user_permissions` com RLS habilitada mas sem nenhuma policy — efetivamente seguro (deny-all para anon/authenticated) mas sinalizado pelo linter como configuração incompleta; vale tornar explícito.

---

## 15. Arquitetura recomendada

```
PolitixOS (config. por cliente: targets vinculados a client_id)
      │
      ▼
n8n (workflow mestre único, parametrizado por client_id recebido no payload)
      │
      ▼
RapidAPI (posts, comments, e — quando aprovado — reels/stories)
      │
      ▼
Normalização + deduplicação (por platform_post_id / media_id, já com padrão on_conflict reaproveitável)
      │
      ▼
Banco (client_id propagado a todas as tabelas de conteúdo; RLS por client_id, não "Allow anon read")
      │
      ├──────────────► Análise de IA (branch separado, com retry — igual ao branch de reprocessamento hoje)
      │                 Uma falha da IA NÃO deve bloquear a gravação da coleta bruta (já é assim hoje,
      │                 pois a análise roda em fluxo/webhook separado do de coleta — ponto positivo a preservar)
      ▼
Dashboard (RBAC reforçado por RLS no banco, não só filtro em memória)
```

Coleta e Análise de IA já estão fisicamente separadas hoje (fluxos/webhooks distintos: `/trigger-posts` e `/trigger-comentarios` vs. `/trigger-analise`) — esse é um acerto arquitetural existente que deve ser preservado na evolução, não refeito.

---

## 16. Plano de implementação (proposto, não executado)

1. **Segurança primeiro (P0), sem tocar em funcionalidade:** revisar RLS de `targets`/`social_posts`/`instagram_posts`/`instagram_comments`/`ai_analysis`; mover credenciais do n8n para o cofre de credenciais com rotação; adicionar autenticação aos webhooks n8n.
2. **Corrigir observabilidade:** `collection_logs.status` refletir o resultado real (sucesso/erro) por execução.
3. **Introduzir `client_id`:** nova tabela `clients`, FK em `targets`, propagação por herança até as tabelas de conteúdo; políticas RLS reescritas por `client_id`.
4. **Parametrizar o workflow n8n por `client_id`** recebido no payload do webhook (em vez de sempre iterar por todos os alvos ativos).
5. **Adicionar paginação e retry** no caminho principal de coleta (posts/comments), replicando o padrão já existente no branch de reprocessamento de IA.
6. **Decidir o destino de `instagram_posts`** (dropar ou consolidar com `social_posts`).
7. **Modelar Reels:** novo endpoint RapidAPI (se disponível no plano contratado), campos de banco (`plays` distinto de `views`, discriminação de `media_type`), UI própria.
8. **Modelar Stories:** decidir política de retenção (metadado vs. mídia), intervalo de polling, tabela nova com `expires_at`.
9. **UI de carrossel:** suportar array de mídias por post (hoje só a primeira mídia do carrossel é capturada).

---

## 17. Prioridades para entrega ao cliente

1. Fechar os 5 riscos P0 da seção 14 — nenhuma entrega a cliente deveria acontecer com RLS aberta e credenciais hardcoded em produção.
2. Introduzir `client_id` real antes de onboardar um segundo cliente — hoje o sistema não segrega clientes, só usuários↔alvos dentro do que parece ser um único tenant operacional.
3. Só depois disso, avançar para Reels/Stories — cobertura de conteúdo é secundária frente aos riscos de segurança e de isolamento de dados já identificados.

---

## STATUS FINAL

**INSTAGRAM AUDIT STATUS:**
PASS WITH GAPS

**REELS:**
AUSENTE

**STORIES:**
AUSENTE

**MULTI-TENANT:**
NÃO SEGURO

**N8N:**
MAPEADO

**RAPIDAPI:**
MAPEADO

**PRÓXIMO SPRINT RECOMENDADO:**
Sprint de **hardening de segurança e multi-tenant** (seção 16, itens 1-4) — corrigir RLS aberta, remover credenciais hardcoded do n8n, adicionar autenticação aos webhooks, e introduzir `client_id` real no schema e no workflow mestre. Só depois disso iniciar o sprint de expansão de conteúdo (Reels/Stories/Carrossel completo), para não lançar um recurso novo em cima de uma base com vazamento de dados entre clientes ainda aberto.
