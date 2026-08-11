# POLITIX TERRITÓRIOS — Bloco 1: Fundação Territorial e Arquitetura

**Sprint 11 · Relatório técnico de auditoria e proposta**
**Status:** aguardando homologação humana. Nenhum código, migration ou nav item foi criado nesta etapa — apenas auditoria e proposta, conforme o gate do briefing.

---

## 1. Arquitetura atual encontrada

- **Framework:** Next.js 16.2.6 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS 4 (tokens via `@theme` em [app/globals.css](app/globals.css)).
- **Middleware renomeado:** nesta versão do Next.js, `middleware.ts` foi substituído por [proxy.ts](proxy.ts) (exporta `proxy()` em vez de `middleware()`). Já está em uso e é o único ponto de verificação de sessão + permissão de tela por rota. Isso confirma que a nota do `CLAUDE.md`/`AGENTS.md` sobre breaking changes tem base real neste caso específico — mas o caminho `node_modules/next/dist/docs/` citado não existe no projeto (verificado); não há docs locais adicionais a consultar além do comportamento observado no próprio código.
- **Padrão geral:** Server Components buscam dados diretamente via funções em `lib/queries/*.ts` (sem camada REST própria, exceto para o webhook n8n de investigações). Mutações usam Server Actions (`'use server'`) em `lib/actions/*.ts`. Não há hooks React customizados (`useX`) no projeto — estado de UI é local (`useState`/`useSearchParams`), sem camada de data-fetching client-side (SWR/React Query).
- **Autenticação:** própria (não usa Supabase Auth). JWT assinado (HS256, `jose`) guardado em cookie httpOnly `politixos_session`, gerado a partir de `app_users` + hash `scrypt` de senha. Sessão inclui `role`, `permissions[]` (screen_keys) e `allowedTargetIds[]`.
- **Autorização:** baseada em `screen_key` (tela) e `allowedTargetIds` (escopo de candidatos). `proxy.ts` bloqueia rota inteira por `screen_key`; dentro da tela, as *queries* filtram registros por `allowedTargetIds`. Admin ignora ambas as restrições.
- **Banco:** Supabase Postgres. RLS habilitado nas tabelas conhecidas, mas com política **"allow all"** — a autorização real acontece na aplicação (Server Actions/Server Components), não no Postgres. O client anônimo (`createClient`) é usado em queries de leitura; `createAdminClient` (service role) é usado em Server Actions e nas leituras de `app_users`/permissões.
- **Design system homologado:** paleta escura (`--background: #0B0F19`, `--surface-1/2/3`, `--brand: #06B6D4`), utilitário `glass` (glassmorphism com blur), cards com `rounded-xl border border-white/5`, fonte Geist. Layout: `Header` full-width (Brand Area + Global Context Bar) acima da linha `Sidebar + main` (ver [app/dashboard/layout.tsx](app/dashboard/layout.tsx), fruto das Etapas 2C/2C.1 recentes). Padrão de filtros: `useSearchParams` + `router.push` (URL como fonte de verdade), sem estado global de filtro fora da URL.
- **n8n:** não há orquestrador único hoje — cada fluxo dispara webhooks pontuais. Dois padrões coexistem:
  1. **Fire-and-forget simples** ([lib/n8n.ts](lib/n8n.ts) + `AutomationPanel`): POST direto do client para URLs de webhook com fallback hardcoded, sem autenticação por API key.
  2. **Proxy server-side com API key** ([app/api/investigations/start/route.ts](app/api/investigations/start/route.ts)): rota Next.js que valida env vars, adiciona `x-api-key`, tem timeout (120s), sanitiza logs (redação de campos sensíveis) e traduz erros do n8n em códigos estruturados (`N8N_HTTP_ERROR`, `N8N_TIMEOUT`, etc.). **Este é o padrão recomendado para o Motor Territorial** — é o único caminho que já protege credenciais e trata falhas como cidadão de primeira classe.
- **Testes:** Vitest + Testing Library, `.test.ts(x)` colocados junto ao código-fonte. Sem testes de integração com Supabase real (mocks).

## 2. Arquivos relevantes

| Área | Arquivo |
|---|---|
| Auth/sessão | `lib/auth/{types,dal,session,token,actions,password}.ts` |
| Autorização por rota | `proxy.ts` |
| Navegação | `lib/navigation/dashboardNavigation.tsx`, `components/{Sidebar,Header,GlobalContextBar}.tsx` |
| Supabase clients | `lib/supabaseClient.ts` |
| Padrão de query | `lib/queries/{overview,candidatos,noticias,instagram,x,investigations,alerts}.ts` |
| Padrão de Server Action | `lib/actions/{candidatos,analytics-insight}.ts` |
| Padrão de tipos | `lib/types/{noticias,instagram,investigations}.ts` |
| Motor externo (referência p/ n8n) | `app/api/investigations/start/route.ts`, `lib/n8n.ts`, `lib/types/investigations.ts` |
| Migrations existentes | `supabase_migration_access_control.sql`, `supabase_migration_executive_ai_insights.sql` |
| Design system | `app/globals.css`, `components/ui/*` |
| Layout do dashboard | `app/dashboard/layout.tsx` |

## 3. Estrutura atual do Supabase (inferida do código)

Não há diretório `supabase/migrations` nem CLI do Supabase versionando o schema — as duas migrations existentes são arquivos `.sql` soltos na raiz, para execução manual via SQL Editor. **Não foi possível inspecionar o schema ao vivo**: não existe `.env.local`/`.env.example` no repositório (gitignorado) que aponte o `NEXT_PUBLIC_SUPABASE_URL` deste projeto, e a conta Supabase acessível via MCP nesta sessão lista projetos de **outros clientes** (`Check-list Qualidade`, `biotech-compras`) junto de um projeto ativo sem nome claramente associado ao PolitixOS. Por prudência e para não misturar dados de clientes diferentes, optei por **não** consultar `list_tables`/`get_advisors` ao vivo sem confirmação explícita de qual `project_id` corresponde a este repositório (ver Seção 18).

Tabelas confirmadas **pelo código** (não pela inspeção do banco):

- `app_users`, `app_user_targets`, `app_user_permissions` — controle de acesso (migration `access_control`).
- `targets` (candidatos/entidades monitoradas: `candidate_name`, `city`, `state` como **texto livre**, `keywords`, `is_active`) e `social_accounts` (contas por `target_id` + `platform` + `handle`, `unique(target_id, platform, handle)`).
- `mencoes` (notícias cruas — inferido de `MencaoRow`): tem coluna `hash` para deduplicação, `ai_topics/entities/risk_flags` como JSON serializado em texto, `city`/`candidate_name` como texto livre.
- Tabelas equivalentes para Instagram e X (não lidas em detalhe nesta rodada, mesmo padrão presumido).
- `investigations`, `investigation_sources`, `investigation_entities`, `investigation_timeline`, `investigation_queries` — já é o exemplo mais próximo de um "motor + evidências + timeline" dentro do projeto.
- `executive_ai_insights` — **migration escrita mas explicitamente NÃO aplicada** (cache de leitura analítica; hoje em memória de processo). Boa referência de convenção para cache com `context_hash` + `expires_at` opcional.

**Ponto crítico para Territórios:** hoje `city`/`state` em `targets` são texto livre, sem normalização IBGE. Não existe nenhuma tabela ou lista de municípios/UFs no projeto — confirma a exigência do briefing de não usar lista hardcoded e de introduzir `codigo_ibge_municipio` como novo identificador central.

## 4. Padrão de migrations

- SQL puro, idempotente (`create table if not exists`, `create index if not exists`, blocos `do $$ ... end$$` para políticas condicionais).
- Cabeçalho em comentário explicando o que a migration faz e, quando aplicável, **status explícito** ("NÃO APLICADA", checklist de revisão antes de aplicar) — ver `executive_ai_insights`.
- RLS sempre habilitado, mas com policy "allow all" — autorização fica 100% na aplicação. **Comentário explícito no código confirma que essa é a convenção intencional**, não um descuido: "a aplicação continua sendo a camada de autorização... não usa RLS do Supabase Auth porque a autenticação é própria, via JWT em cookie".
- Sem versionamento formal (sem `supabase/migrations/<timestamp>_nome.sql` nem CLI) — arquivos soltos aplicados manualmente. Proponho seguir esse mesmo padrão para não introduzir um processo paralelo (fora de escopo mudar isso agora).

## 5. Padrão de autenticação

JWT HS256 assinado com `SESSION_SECRET`, cookie httpOnly `politixos_session`, TTL 7 dias. Payload: `{ userId, name, email, role, permissions[], allowedTargetIds[], expiresAt }`. Três papéis: `admin | gestor | visualizador`. `role='admin'` sempre ignora `permissions` e `allowedTargetIds`. Territórios deve seguir exatamente este modelo — nenhuma mudança necessária na camada de auth em si, apenas extensão de `ALL_SCREENS` (Seção 15).

## 6. Modelo de multi-tenancy

**Não é multi-tenant por `client_id`.** É multi-tenant por **escopo de candidato (`target_id`)**:

- Dados de conteúdo (notícias, posts, investigações) pertencem a um `target` (candidato). Usuários não-admin só veem registros cujo `candidate_name`/`target_id` está em `allowedTargetIds`.
- Não há isolamento por "cliente" separado de "candidato" — na prática, cada `target` já funciona como a unidade de escopo (um cliente pode ter 1+ candidatos monitorados; um usuário recebe acesso a um subconjunto de `targets`).

**Implicação direta para Territórios (Seção 11 do briefing):**
- Dados territoriais **globais** (população de Contagem, resultado eleitoral, indicadores IBGE/DATASUS/TSE/SICONFI) não pertencem a nenhum `target` — são públicos e compartilháveis entre todos os candidatos/usuários que consultarem aquele município. **Não devem ter `target_id`/`allowedTargetIds` aplicado.**
- Dados **específicos de uso** (um briefing gerado para preparar a visita de um candidato X à cidade Y, a interpretação/anotação daquele briefing) devem carregar `target_id` (nullable) e seguir o mesmo filtro `allowedTargetIds` já usado no resto do sistema — sem reinventar um mecanismo de tenancy novo.

## 7. Proposta final de banco territorial

Divirjo da lista conceitual do briefing em um ponto, com justificativa: em vez de 5 tabelas paralelas quase idênticas (`territory_demographics`, `territory_health`, `territory_security`, `territory_elections`, `territory_finance`), proponho **uma única tabela genérica `territory_indicators`** com uma coluna `categoria`. Motivo: o próprio briefing (Seção 4) pede para "evitar tabelas redundantes" e "avaliar JSONB versus estrutura relacional" antes de criar migrations — as 5 tabelas propostas teriam exatamente as mesmas colunas (território, valor, unidade, período, fonte, metodologia), só mudando o nome. Um contrato único de indicador (Seção 6 do briefing) já cobre semanticamente os 5 domínios sem multiplicar schema, índices e código de acesso. **Isto é uma proposta, não uma decisão fechada — ver Seção 18.**

Da mesma forma, `territory_news` fica **absorvida por `territory_evidence`** com `source_type='news'`, em vez de ser uma tabela irmã: notícia territorial é, estruturalmente, evidência com fonte do tipo notícia. Isso evita duplicar colunas (`title`, `summary`, `source_url`, `published_at`) em duas tabelas que representariam o mesmo conceito.

`territory_topics` também fica adiada: nesta fundação, `tema`/`subtema` em `territory_evidence` (texto livre, como já é convenção no projeto para `platform`, `source`, etc.) é suficiente. Uma tabela de taxonomia formal só se justifica quando houver classificação automática de temas rodando (motor de classificação do briefing, Seção 8) — construí-la agora seria especular sobre uma necessidade ainda não implementada.

### Tabelas propostas

```
territories                  -- identidade do município (GLOBAL)
territory_indicators          -- contrato único de indicador (GLOBAL, histórico)
territory_evidence             -- contrato único de evidência: notícias, achados Perplexity, etc. (GLOBAL, histórico)
territory_collection_runs      -- execução de cada motor de coleta (GLOBAL, observabilidade)
territory_briefings            -- briefing gerado, com escopo opcional por target_id (GLOBAL + específico)
```

#### `territories`
```sql
id                   uuid primary key default gen_random_uuid(),
codigo_ibge          text not null unique,        -- identificador territorial principal
uf                   char(2) not null,
municipio            text not null,
regiao               text,                         -- Norte/Nordeste/... (derivável, cache opcional)
geometria             jsonb,                        -- GeoJSON opcional; Postgis fica para quando houver necessidade real de query espacial
metadata             jsonb not null default '{}',
created_at           timestamptz not null default now(),
updated_at           timestamptz not null default now()
```
Município é **catálogo global**, não duplicado por cliente. `codigo_ibge` é a chave natural (7 dígitos, IBGE), com `unique`. Sem geometria pesada nem PostGIS nesta fundação — `geometria jsonb` é só um placeholder para quando isso for de fato necessário (evita ativar extensão sem uso real, conforme pedido do briefing de não sobre-engenheirar para a demo).

#### `territory_indicators`
```sql
id               uuid primary key default gen_random_uuid(),
territory_id     uuid not null references territories(id) on delete cascade,
categoria        text not null,      -- 'demografia' | 'saude' | 'seguranca' | 'eleicoes' | 'financas' | ...
indicador        text not null,      -- chave estável, ex: 'populacao_total', 'crimes_violentos', 'eleitorado_total'
valor             numeric,            -- valor numérico principal
valor_texto       text,               -- fallback quando o indicador não é numérico
unidade           text,               -- 'habitantes', 'R$', 'casos/100mil', ...
periodo_inicio    date,
periodo_fim       date,
granularidade     text not null default 'municipal', -- 'municipal' | 'estadual' | 'nacional'
fonte             text not null,      -- 'IBGE' | 'DATASUS' | 'TSE' | 'SICONFI' | ...
metodologia       text,
metadata          jsonb not null default '{}',
collected_at      timestamptz not null default now(),
updated_at        timestamptz not null default now(),
unique (territory_id, categoria, indicador, periodo_inicio, periodo_fim, fonte)
```
`unique` natural key habilita `upsert` idempotente (Seção 9) e preserva série histórica (cada período novo é uma linha nova, não um overwrite).

#### `territory_evidence`
```sql
id               uuid primary key default gen_random_uuid(),
territory_id     uuid not null references territories(id) on delete cascade,
source_type      text not null,   -- 'news' | 'perplexity' | 'official_data' | 'social' | ...
source_name      text,
source_url       text,
source_hash      text not null,   -- hash estável para dedup (ver Seção 9)
published_at     timestamptz,
collected_at     timestamptz not null default now(),
tema             text,
subtema          text,
title            text,
summary          text,
raw_reference    jsonb,           -- payload bruto da fonte, para auditoria
confidence       numeric,         -- 0–1
metadata         jsonb not null default '{}',
created_at       timestamptz not null default now(),
unique (territory_id, source_hash)
```
Mesmo espírito do `hash` já existente em `mencoes` — dedup por hash de conteúdo, não por texto livre.

#### `territory_collection_runs`
```sql
id                uuid primary key default gen_random_uuid(),
territory_id      uuid not null references territories(id) on delete cascade,
request_id        uuid not null,        -- correlaciona todos os motores disparados numa mesma execução do orquestrador
source             text not null,        -- 'ibge' | 'datasus' | 'seguranca' | 'tse' | 'siconfi' | 'perplexity' | 'noticias'
status             text not null default 'pending', -- pending|running|partial|completed|failed
started_at         timestamptz,
finished_at        timestamptz,
items_collected    integer not null default 0,
items_processed    integer not null default 0,
items_discarded    integer not null default 0,
error_message      text,
metadata           jsonb not null default '{}',
created_at         timestamptz not null default now()
```

#### `territory_briefings`
```sql
id                    uuid primary key default gen_random_uuid(),
territory_id          uuid not null references territories(id) on delete cascade,
target_id             uuid references targets(id) on delete set null, -- null = briefing genérico do território, não ligado a candidato
requested_by          uuid references app_users(id),
request_id            uuid not null,   -- mesmo request_id dos collection_runs desta geração
status                text not null default 'nao_iniciado', -- nao_iniciado|coletando|processando|analisando|concluido|parcial|erro
content               jsonb,           -- briefing final estruturado (seções do dossiê)
model                 text,
prompt_version        text,
generated_at          timestamptz,
expires_at            timestamptz,     -- política de cache (Seção 10)
error_message         text,
created_at            timestamptz not null default now(),
updated_at            timestamptz not null default now()
```

## 8. Relacionamentos

```
territories 1───N territory_indicators
territories 1───N territory_evidence
territories 1───N territory_collection_runs
territories 1───N territory_briefings
targets     1───N territory_briefings   (opcional — nullable)
app_users   1───N territory_briefings   (requested_by)
```
`territory_collection_runs.request_id` e `territory_briefings.request_id` compartilham o mesmo UUID por execução do orquestrador — permite reconstruir "tudo que aconteceu nesta geração de briefing" sem tabela de junção extra.

## 9. Estratégia de evidências

Contrato conforme Seção 5 do briefing, implementado em `territory_evidence` (Seção 7). Dedup via `source_hash` = hash estável (ex.: SHA-256 de `source_url` normalizada, ou de `source_type + source_name + title + published_at` quando não há URL). Índice único `(territory_id, source_hash)` torna a inserção **upsert-safe**: rodar a coleta de novo não duplica evidência, só atualiza `collected_at`/`metadata` se necessário (`on conflict do update` seletivo). Mesmo princípio já usado em `mencoes.hash`, sem inventar mecanismo novo.

## 10. Estratégia de indicadores

Contrato único (Seção 6 do briefing) implementado em `territory_indicators` (Seção 7), com `categoria`/`indicador` como *strings* controladas por convenção de código (não por enum de banco, para não travar schema a cada novo indicador — mesma filosofia de `platform`/`source` texto livre já usada no projeto). Histórico preservado por linha-por-período; "valor atual" é sempre a linha com `periodo_fim` mais recente para aquele `(territory_id, categoria, indicador)`.

## 11. Estratégia de collection runs

`territory_collection_runs` como registro append-only por motor×execução, com `request_id` amarrando todos os motores de uma mesma chamada do orquestrador n8n. Estados replicam exatamente os do briefing (`pending/running/partial/completed/failed`). Isso dá observabilidade granular (qual motor falhou, quantos itens cada um trouxe) sem acoplar o estado de um motor ao estado do briefing inteiro — o briefing consolida via `territory_briefings.status`, calculado a partir do conjunto de `collection_runs` daquele `request_id` (ex.: 1 `failed` + resto `completed` → briefing `parcial`).

## 12. Estratégia de cache e atualização

Sem fixar tempos ainda (conforme pedido explícito do briefing — Seção 10). A arquitetura já suporta políticas diferentes por fonte porque `territory_indicators`/`territory_evidence` guardam `collected_at`/`updated_at` por linha: o orquestrador decide, no momento de disparar cada motor, se os dados existentes para aquele território+fonte ainda estão "frescos o suficiente" antes de rechamar a fonte externa — essa decisão fica no n8n (ou numa função de política em `lib/territorios/cache-policy.ts`, a criar futuramente), não no schema. `territory_briefings.expires_at` cobre o cache do briefing consolidado em si, no mesmo espírito do campo já desenhado (mas não aplicado) em `executive_ai_insights.expires_at`.

## 13. Estratégia de idempotência

- **Indicadores:** `unique(territory_id, categoria, indicador, periodo_inicio, periodo_fim, fonte)` + upsert. Gerar o briefing de Contagem hoje e amanhã não duplica população nem histórico — cada período é uma chave natural distinta; reprocessar o mesmo período atualiza a linha existente.
- **Evidências:** `unique(territory_id, source_hash)` + upsert, mesmo padrão do `hash` de `mencoes`.
- **Territórios:** `unique(codigo_ibge)` — nunca cria município duplicado; resolução de território é sempre "buscar por `codigo_ibge`, criar se não existir".
- **Collection runs / briefings:** não precisam de dedup por chave natural (são eventos, não estado) — cada disparo do orquestrador gera um novo `request_id` e uma nova linha. O "não duplicar" vive nos dados que eles produzem (indicadores/evidências), não nos próprios registros de execução.

## 14. Arquitetura proposta dos workflows n8n

Segue o desenho conceitual do briefing (Seção 8), com o contrato de entrada/saída explicitado para que cada motor possa ser construído depois sem retrabalho:

```
Next.js (Server Action) ──POST──▶  N8N Orquestrador Territorial
   payload: { codigo_ibge, municipio, uf, request_id, territory_id, target_id? }
                                          │
                     ┌────────────────────┼────────────────────┐
                     ▼                    ▼                    ▼
              Motor IBGE          Motor DATASUS         Motor Notícias   ... (demais motores)
                     │                    │                    │
              cada motor: cria territory_collection_run (pending→running→completed/failed)
              e faz upsert em territory_indicators / territory_evidence
                     └────────────────────┼────────────────────┘
                                          ▼
                          Normalização → Deduplicação → Classificação
                                          ▼
                                       Análise
                                          ▼
                          Persistência (territory_briefings.content)
                                          ▼
                          territory_briefings.status = 'concluido'
```

**Padrão de segurança a reaplicar** (idêntico ao já validado em `app/api/investigations/start/route.ts`): o Next.js **nunca** chama o n8n direto do client. Uma rota server-side (`app/api/territorios/generate/route.ts`, a criar) recebe a requisição autenticada, injeta `x-api-key` a partir de env var server-only, tem timeout e traduz erros do n8n em códigos estruturados. O n8n, por sua vez, não deve escrever direto no Postgres com credenciais soltas no workflow — deve usar a mesma `SUPABASE_SERVICE_ROLE_KEY` já usada pelo backend, mantida em credencial do n8n (fora do repo).

Nenhum motor será implementado neste bloco — apenas o contrato de payload/estado acima, para que Motor IBGE, DATASUS, Segurança, TSE, SICONFI, Perplexity e Notícias possam ser adicionados depois sem alterar `territory_collection_runs`/`territory_indicators`/`territory_evidence`.

## 15. Arquivos que precisarão ser criados (proposta — nada criado ainda)

- `supabase_migration_territories_foundation.sql` — DDL das 5 tabelas da Seção 7, seguindo o padrão de `executive_ai_insights.sql` (cabeçalho "NÃO APLICADA" + checklist de revisão).
- `lib/types/territories.ts` — tipos TS dos contratos (Territory, TerritoryIndicator, TerritoryEvidence, TerritoryCollectionRun, TerritoryBriefing).
- `lib/queries/territories.ts` — leitura (UFs, municípios por UF via tabela `territories` ou API IBGE de localidades, busca por `codigo_ibge`).
- `lib/actions/territories.ts` — Server Action que cria `territory_briefings` (status `nao_iniciado`) e dispara o orquestrador (stub, sem chamar n8n de verdade neste bloco).
- `app/api/territorios/generate/route.ts` — proxy server-side para o webhook n8n, no padrão de `investigations/start/route.ts`.
- `app/dashboard/territorios/page.tsx` + `TerritoriosClient.tsx` — tela mínima descrita na Seção 12 do briefing (seleção UF → Município + botão "Gerar Briefing"), sem dashboard fictício.
- `docs/RELATORIO_TERRITORIOS_BLOCO1_FUNDACAO.md` — este relatório (já criado).

## 16. Arquivos que precisarão ser modificados (proposta — nada alterado ainda)

Mudanças **puramente aditivas**, mas são arquivos hoje compartilhados por todos os módulos existentes — por isso peço confirmação explícita antes de tocá-los (Seção 18), mesmo sendo adições e não alterações de comportamento:

- `lib/auth/types.ts` — adicionar `'territorios'` a `ALL_SCREENS`.
- `proxy.ts` — adicionar `'/dashboard/territorios': 'territorios'` a `SCREEN_MAP`.
- `lib/navigation/dashboardNavigation.tsx` — adicionar item "Territórios" a `NAV_GROUPS` (grupo "Inteligência", ao lado de Notícias/Investigações).

Nenhum outro arquivo de módulo existente (Visão Geral, Notícias, Instagram, X, Investigações, Politix IA, autenticação, Supabase, filtros globais, header, sidebar) precisa ser tocado — o módulo nasce aditivo, como pedido.

## 17. Riscos encontrados

1. **Ambiguidade de projeto Supabase**: sem `.env.local`/`.env.example` no repo, não há confirmação de qual projeto Supabase é o de produção do PolitixOS — a conta MCP disponível lista projetos de outros clientes junto. Criar/aplicar qualquer migration sem essa confirmação é risco real de aplicar no banco errado.
2. **`city`/`state` como texto livre em `targets`**: hoje não há vínculo entre um candidato e um `codigo_ibge`. Se o objetivo futuro é ligar Territórios a um candidato automaticamente pela cidade dele, será necessário migrar/normalizar esses campos — fora de escopo deste bloco, mas é uma dívida a antecipar.
3. **`lib/n8n.ts` hoje expõe URLs de webhook com fallback hardcoded e sem API key** — funcional para os fluxos atuais, mas não deve ser o padrão copiado para Territórios (usar o padrão de `investigations/start`, com API key e sem URL hardcoded em produção).
4. **RLS "allow all"** é uma decisão consciente e documentada do projeto (autorização 100% na aplicação) — não é uma falha a corrigir aqui, mas significa que qualquer bug na Server Action que grava `territory_briefings` pode expor/gravar dados fora do escopo do usuário sem uma segunda camada de defesa no banco. Vale reforçar testes na camada de aplicação especificamente para o filtro `target_id`/`allowedTargetIds` de Territórios.
5. **Ausência de extensão geoespacial**: se no futuro for necessário mapa/geometria real (não apenas dados tabulares), `territories.geometria jsonb` não substitui PostGIS — decisão adiada de propósito, mas registrada para não ser esquecida.

## 18. Decisões que precisam de validação humana

1. **Nome da rota**: o briefing pede `/dashboard/territories` (inglês), mas toda a convenção existente é em português (`/dashboard/noticias`, `/dashboard/candidatos`, `/dashboard/investigacoes`...). Recomendo `/dashboard/territorios` por consistência — confirmar.
2. **Consolidação de tabelas**: aceitar a simplificação proposta (1 tabela `territory_indicators` em vez de 5; `territory_news`/`territory_topics` absorvidas por `territory_evidence`) ou manter a separação literal sugerida no briefing?
3. **Qual projeto Supabase é o de produção do PolitixOS?** Preciso do `project_id` (ou de rodar localmente com o `.env.local` real) para inspecionar o schema ao vivo e os advisors de segurança/performance antes de finalizar a migration.
4. **Vínculo `territory_briefings.target_id`**: confirmar que briefing territorial pode existir sem candidato associado (visita exploratória a uma cidade ainda sem candidato monitorado) — o desenho acima assume `target_id` nullable.
5. **Permissão de acesso à tela Territórios**: novo `screen_key='territorios'` — confirmar se deve ser concedido por padrão a todos os usuários existentes (`gestor`/`visualizador`) ou se começa restrito, exigindo concessão manual via `/dashboard/usuarios` (padrão atual para toda tela nova).
6. **Autorização para tocar os 3 arquivos compartilhados** listados na Seção 16 (mesmo sendo mudanças aditivas).
7. **Nota "This is NOT the Next.js you know"** presente em `CLAUDE.md`/`AGENTS.md`: o caminho de docs citado não existe no projeto. Vale confirmar se essa nota é intencional/deve ser mantida ou é resíduo de um template de scaffolding.

---

**Gate respeitado nesta execução:** nenhuma integração (IBGE/DATASUS/Segurança/TSE/SICONFI/Perplexity/Notícias) foi implementada, nenhum dado mockado foi gerado, nenhum módulo existente foi alterado, nenhuma migration foi aplicada, nenhum deploy ou push foi feito. Aguardando homologação das decisões da Seção 18 para seguir para implementação.
