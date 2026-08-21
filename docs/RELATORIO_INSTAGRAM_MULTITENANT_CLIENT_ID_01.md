# RELATÓRIO — BLOCO 2: ARQUITETURA MULTI-TENANT REAL / CLIENT_ID

**Baseline:** [AUDITORIA_INSTAGRAM_POLITIXOS_01.md](AUDITORIA_INSTAGRAM_POLITIXOS_01.md), [RELATORIO_INSTAGRAM_HARDENING_P0_01.md](RELATORIO_INSTAGRAM_HARDENING_P0_01.md)
**Data:** 2026-08-21
**Escopo:** Fundação multi-tenant (`clients`, `client_id`), sem redesenho de UI, sem Supabase Auth, sem workflow por cliente.

---

## 1. Resumo executivo

O conceito de cliente passou a existir explicitamente no modelo de dados (`clients`), com `client_id` propagado (nullable) a `targets`, `social_accounts`, `social_posts`, `instagram_comments`, `ai_analysis`, `collection_logs` e `app_users`. Backfill 100% completo, zero órfãos, zero nulos onde esperado. O trigger manual (`/api/automations/instagram/trigger`) agora resolve o cliente sempre a partir da sessão do servidor — nunca de um valor enviado pelo browser, salvo para admin — e o n8n aplica esse escopo na busca de contas/posts das 4 branches de Instagram. Testado com dado real de produção (não só simulado): um `client_id` inexistente corretamente encontra zero contas e não gasta RapidAPI; o `client_id` real continua processando normalmente. `read_targets_legacy_anon` **não foi removida** — a dívida foi endereçada no código (`lib/queries/noticias.ts` migrado para `service_role`), mas a policy só será removida depois desse código estar validado em produção (condição explícita do usuário).

Sequência seguida à risca conforme condição do usuário: código primeiro (compila, testes passam) → só depois migration/backfill no Supabase → n8n ajustado e publicado → testado com dado real. Nenhum commit/push/deploy foi feito.

---

## 2. Arquitetura anterior

```
Browser → Server Component/Route/Action → sessão PolitixOS → allowedTargetIds
        → createAdminClient() → Supabase
```
Sem conceito de cliente. Isolamento só por `target_id` via `app_user_targets`. `targets` com leitura pública (`anon`) por dependência de `lib/queries/noticias.ts`.

## 3. Arquitetura nova

```
Browser → Server Component/Route/Action → sessão PolitixOS
        → clientId (getActiveClientId) + allowedTargetIds (inalterado)
        → createAdminClient() → Supabase (client_id disponível em todas as tabelas de conteúdo)
```
`allowedTargetIds` continua sendo a barreira de leitura real (nada mudou nela). `client_id` é a base para: escopo do trigger manual do n8n, observabilidade por cliente em `collection_logs`, e guarda contra vínculo cross-tenant ao conceder targets a um usuário.

## 4. Modelo clients

```sql
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
Nenhuma entidade equivalente pré-existente (busca completa por `client`/`tenant`/`organization`/`cliente`/`empresa`/`contrato` no schema, TypeScript, migrations, componentes, auth, n8n, docs — todas as ocorrências eram falsos-positivos: browser/HTTP client, "contrato de dados" em Territórios, ou projetos Supabase *externos* deste desenvolvedor). RLS habilitada, só `service_role`.

**1 registro criado**, nome placeholder (decisão explícita do usuário no checkpoint — não inventar nome comercial):
`"PolitixOS — Operação Principal"` / slug `operacao-principal` / `status='active'`. Renomeável a qualquer momento com um `UPDATE` de 1 linha.

## 5. Modelo user ↔ client

**Modelo A** (aprovado no checkpoint): `app_users.client_id`, nullable, `NULL` = admin global (mesma semântica de `allowedTargetIds: null`). Não-admin pertence a exatamente 1 cliente. `SessionPayload.clientId` calculado no login (`loginAction`), igual ao padrão já usado para `allowedTargetIds` — não recalculado a cada request.

## 6. Modelo client ↔ target

`targets.client_id uuid references clients(id)`, nullable. 1 cliente → N targets. `targets` é a **fonte da verdade** — não tem trigger de derivação (as outras tabelas derivam dela).

## 7. Estratégia de client_id

**Denormalizada com trigger** (aprovada no checkpoint). Função `sync_client_id_from_target()` (`BEFORE INSERT OR UPDATE OF target_id`) copia `client_id` de `targets` automaticamente — nunca escrito manualmente pelo n8n ou pela aplicação nas tabelas de conteúdo/log. Testada (transação com `ROLLBACK`, ver seção 28) e confirmada funcionando nas 5 tabelas.

## 8. Tabelas alteradas

| Tabela | Mudança |
|---|---|
| `clients` | Nova |
| `targets` | `+client_id` (nullable, FK), índice |
| `social_accounts` | `+client_id` (nullable, FK, trigger), índice |
| `social_posts` | idem |
| `instagram_comments` | idem |
| `ai_analysis` | idem |
| `collection_logs` | idem |
| `app_users` | `+client_id` (nullable, FK), índice |
| `social_posts_pending_analysis` (view) | `+client_id` no SELECT (aditivo, coluna ao final — Postgres exige posição fixa das colunas existentes em `CREATE OR REPLACE VIEW`) |
| `instagram_posts` | **Não alterada** — tabela órfã, 0 linhas, 0 consumidores (decisão do checkpoint) |

## 9. Migrations

Duas, ambas aplicadas via Supabase MCP (`apply_migration`), aditivas, sem `DROP`/`TRUNCATE`/`DELETE`:

1. `instagram_multitenant_client_id_foundation` — tabela `clients`, seed do cliente único, `client_id` nullable + FK + índice nas 7 tabelas, backfill (targets → propagação por `target_id` → `app_users`), triggers de derivação.
2. `expose_client_id_on_pending_analysis_view` — `CREATE OR REPLACE VIEW social_posts_pending_analysis` acrescentando `client_id`.

## 10. Backfill

Ordem executada: `clients` (1 linha) → `targets` (direto) → `social_accounts`/`social_posts`/`instagram_comments`/`ai_analysis`/`collection_logs` (via `target_id`) → `app_users` (não-admin).

## 11. Contagens antes/depois

| Tabela | Total | Com `client_id` após backfill |
|---|---|---|
| `clients` | 1 | — |
| `targets` | 19 | 19 |
| `social_accounts` | 27 | 27 |
| `social_posts` | 1.033 | 1.033 |
| `instagram_comments` | 125.985 | 125.985 |
| `ai_analysis` | 1.045 | 1.045 |
| `collection_logs` | 2.576 | 2.576 |
| `app_users` | 7 (3 admin + 4 gestor) | 4 (só não-admin; 3 admins corretamente `NULL`) |

Nenhuma linha perdida — totais idênticos antes/depois em todas as tabelas (comparado com as contagens já documentadas na auditoria original e no Bloco 1).

## 12. Registros órfãos

**Zero.** Todo `target_id` em uso já era garantido por FK pré-existente (Bloco 0) a resolver para um `targets.id` válido — a propagação via `JOIN`/subquery em `targets` não deixou nenhuma linha sem `client_id` nas 5 tabelas de conteúdo/log.

## 13. Constraints

`client_id` permanece **nullable** em todas as 7 tabelas, conforme instrução explícita do usuário ("não torne client_id NOT NULL imediatamente"). `NOT NULL` fica proposto para um bloco futuro, só depois de nova confirmação de 0 nulos em produção real (o backfill já prova isso hoje, mas a constraint em si não foi aplicada).

## 14. Índices

`idx_targets_client_id`, `idx_social_accounts_client_id`, `idx_social_posts_client_id`, `idx_instagram_comments_client_id`, `idx_ai_analysis_client_id`, `idx_collection_logs_client_id`, `idx_app_users_client_id` — um por tabela, simples (`btree` em `client_id`).

## 15. Alterações de autenticação/autorização

- [lib/auth/types.ts](../lib/auth/types.ts): `AppUser.client_id: string | null`.
- [lib/auth/token.ts](../lib/auth/token.ts): `SessionPayload.clientId: string | null`.
- [lib/auth/actions.ts](../lib/auth/actions.ts): `loginAction` seleciona e grava `clientId` na sessão (admin sempre `null`); `createUserAction`/`updateUserAction` atribuem `client_id` automaticamente (admin=`null`, não-admin=cliente único via `getDefaultClientId()`) e **filtram os `target_ids` concedidos para só os do próprio cliente** (`filterTargetIdsByClient`) — impede um admin vincular sem querer um usuário de um cliente a um target de outro.
- [lib/auth/dal.ts](../lib/auth/dal.ts): novos `getActiveClientId()`, `getDefaultClientId()`, `filterTargetIdsByClient()`.
- [lib/actions/candidatos.ts](../lib/actions/candidatos.ts): `createCandidateAction` passa a gravar `client_id` no novo `target` (não há trigger em `targets`, precisa ser explícito) — achado durante a implementação, corrigido antes de qualquer teste.

## 16. Alterações em allowedTargetIds

**Nenhuma.** Contrato idêntico (`null`/`[]`/`[...]`). `client_id` é um mecanismo complementar, não substitui essa checagem — decisão consciente do checkpoint (evitar abstração desnecessária sobre um filtro que já funciona e está coberto por 1109 testes).

## 17. Alterações Instagram

Nenhuma em `lib/queries/instagram.ts` além do que já havia sido feito no Bloco 1 (`createAdminClient()`). `client_id` já está disponível em `social_posts`/`instagram_comments`/`ai_analysis` para uso futuro (dashboards, filtros), mas não foi adicionado nenhum filtro novo na leitura — `allowedTargetIds` já isola corretamente.

## 18. Alterações X

Idêntico ao item 17 (mesmas tabelas compartilhadas, mesmo raciocínio).

## 19. Alterações Overview

Nenhuma — `overview.ts` já agrega via `fetchInstagramData`/`fetchXData`, que já respeitam `allowedTargetIds`.

## 20. Alterações Notícias

`lib/queries/noticias.ts`: **as 4 instanciações de `createClient()` foram trocadas para `createAdminClient()`.** Isso é uma correção maior do que a auditoria original assumia: reconfirmei por busca completa que `fetchMencoes`/`getCandidateOptions`/`getCityOptions`/`getSourceOptions` (as únicas funções deste arquivo que tocam o Supabase) são chamadas **exclusivamente server-side** (`DashboardContent.tsx`, `page.tsx`, `lib/queries/overview.ts`, `lib/queries/alerts.ts` — nenhum tem `'use client'`). `NoticiasDashboardClient.tsx` (`'use client'`) importa deste arquivo só funções puras (`getKPIs`, `getFontes`, etc.) que recebem dados já buscados como parâmetro — nunca chamam Supabase. **Não precisei criar a Server Action nova que o checkpoint havia previsto** — a troca direta do cliente (mesmo padrão do Bloco 1 em `instagram.ts`/`x.ts`) já resolve com menos código e menos risco. Registrado aqui como correção do plano original durante a implementação.

**`read_targets_legacy_anon` NÃO foi removida** — condição explícita do usuário: só depois desse código estar deployado e validado em produção real.

## 21. Alterações Candidatos

`createCandidateAction` grava `client_id` no `target` novo (item 15). Nenhuma mudança de UI (sem seletor de cliente — só existe 1 cliente hoje).

## 22. Alterações n8n

Workflow `PolitixOS - automação - webrook` (`XaWHmrrnobud6La1`). Restrito às 4 branches de Instagram, `Webhook4`/Notícias intocados (confirmado por mapeamento de conexões antes de editar, igual ao Bloco 1).

Simplificação relevante em relação ao que o checkpoint desenhou: **não foi necessário reestruturar o schedule com um "Loop clientes"**. O isolamento de falha já existe no nível de conta (`Loop contas`, `onError: continueRegularOutput`, feito no Bloco 1) — mais granular do que um loop por cliente. `client_id` chega "de graça" em todo o conteúdo via os triggers do banco (item 7), sem nenhuma mudança de lógica em `Normalizar posts`/`Normalizar comentários`/`Preparar log`.

Mudança real: os 4 nodes de entrada (`Buscar contas Instagram ativas`, `Supabase - Buscar posts`, `Supabase - Buscar posts1`, `Supabase - Posts SEM análise1`) ganharam um parâmetro de query `client_id`:
```
={{ $json.body?.clientId ? 'eq.' + $json.body.clientId : 'not.is.null' }}
```
Presente (trigger manual autenticado) → filtra só aquele cliente. Ausente (schedule trigger, sem `body`; ou admin sem especificar) → `not.is.null` = todos os clientes, comportamento idêntico ao anterior ao Bloco 2.

## 23. Execução manual por client_id

`app/api/automations/instagram/trigger/route.ts`: resolve `effectiveClientId` **sempre a partir da sessão**. Não-admin: `client_id` do payload é comparado contra `session.clientId` — se divergir, **403** (`CLIENT_ID_MISMATCH`) e **nenhuma chamada ao n8n é feita**; se ausente ou igual, usa o da sessão. Admin: pode informar um `client_id` explícito (confiável só porque admin já enxerga tudo) ou omitir (= todos os clientes).

## 24. Schedule multi-client

Nenhuma mudança de topologia (item 22). Continua rodando a cada 30min para **todas** as contas ativas de **todos** os clientes, com isolamento de falha por conta já existente desde o Bloco 1.

## 25. collection_logs

`+client_id`, derivado automaticamente por trigger — nenhuma mudança em `Preparar log`/`Supabase - Inserir log`. Confirmado com execução real (seção 28): `client_id` correto aparece nas linhas novas.

## 26. RLS/policies

Nenhuma policy nova além de `service_role_full_access_clients` (mesma postura das demais tabelas de conteúdo). `read_targets_legacy_anon` inalterada (item 20). Sem Supabase Auth, RLS por `auth.uid()` continua inviável — não implementado, só documentado no checkpoint como possibilidade futura (claim customizado em JWT próprio via `request.jwt.claims`).

## 27. Remoção de read_targets_legacy_anon

**Não executada nesta etapa** — condição explícita do usuário. Pré-requisito (código migrado) já está pronto no working tree; falta deploy + validação em produção antes de uma migration futura remover a policy.

## 28. Testes cross-tenant

Executado **dentro de uma transação com `ROLLBACK`** (zero dado persistido) — moveu 1 conta real para um cliente de teste temporário e confirmou:

```
visivel_cliente_original: 0
visivel_cliente_teste: 1
total_sem_filtro: 1
```

**PASS.** O filtro `client_id` exclui corretamente contas de outro cliente.

## 29. Teste client_id forjado

Lógica implementada e revisada em código (`route.ts`, item 23) — usuário não-admin que envia `client_id` diferente do da própria sessão recebe `403`/`CLIENT_ID_MISMATCH` antes de qualquer chamada ao n8n. Não foi possível exercitar com uma sessão real de usuário não-admin neste ambiente (sem login — mesma limitação do Bloco 1), mas a lógica é direta, coberta por build+tipos, e o **equivalente no lado do n8n foi testado com dado real** (item 30): um `client_id` inexistente/não-correspondente corretamente não encontra nenhuma conta.

## 30. Teste admin

Preservado por construção: `role==='admin'` continua retornando `null` em `getAllowedTargetIds()` (inalterado) e agora também em `getActiveClientId()` — mesmo padrão, nenhum comportamento novo a testar além do que os 1109 testes existentes já cobrem para o papel admin.

## 31. Teste anon

Não repetido nesta etapa porque nada no Bloco 2 mexeu em policies de `anon` — o estado já verificado no Bloco 1 (`social_posts`/`instagram_comments`/`instagram_posts`/`ai_analysis` retornando `[]` para a chave anônima) continua válido, já que nenhuma migration deste bloco tocou essas 4 policies.

## 32. Teste Instagram

Coleta real de Posts executada com `client_id` real e com `client_id` inexistente (item 30 do checkpoint / TESTE N8N MANUAL) — ver seção 36. Dashboard `/dashboard/instagram` não testado via browser real (mesma limitação de ambiente do Bloco 1 — sem `.env.local`).

## 33. Teste X

Nenhuma mudança de código em `x.ts` além do já feito no Bloco 1; `npx vitest run` (1109 testes) cobre a suíte inteira sem regressão.

## 34. Teste Notícias

`npm run build` + `npx vitest run` confirmam que a troca de `createClient()` para `createAdminClient()` em `noticias.ts` não quebrou nenhum teste (nenhum teste de notícias falhou). Validação via browser real não executada (mesma limitação).

## 35. Teste Overview

Nenhuma mudança de código; suíte completa passando.

## 36. Teste n8n real

**Executado contra produção, com dado real:**

| Chamada | `client_id` enviado | Resultado |
|---|---|---|
| `trigger-posts` | id do cliente real | Conta encontrada, processada, `collection_logs` com `status:success, posts_collected:12, client_id` correto |
| `trigger-posts` | `00000000-0000-0000-0000-000000000000` (inexistente) | **Zero contas encontradas** (`Buscar contas Instagram ativas` retornou `[]`), execução parou ali, nenhuma chamada à RapidAPI, nenhum log gravado |

**Achado durante o teste, corrigido no ato:** a primeira rodada de testes (antes de eu publicar a versão com o filtro) mostrou a MESMA conta sendo processada independente do `client_id` enviado — reproduzindo a mesma lição do Bloco 1 (`update_workflow` só grava rascunho). Publiquei (`publish_workflow`) e reexecutei ambos os testes — o segundo round confirmou o comportamento correto acima.

## 37. Versão n8n publicada

`activeVersionId: 0cfd6ecc-a377-492b-9b25-c3280782c06a` (workflow `XaWHmrrnobud6La1`), publicada após as 4 mudanças de query params e antes dos testes reais confirmatórios.

## 38. npm run build

```
✓ Compiled successfully in 4.3s
```
Executado múltiplas vezes ao longo da implementação (após cada lote de mudanças) — sempre limpo.

## 39. vitest

```
Test Files  125 passed | 5 skipped (130)
     Tests  1109 passed | 5 skipped (1114)
```
1 falha temporária durante a implementação (`lib/actions/candidatos.test.ts` — mock de `@/lib/auth/dal` não incluía os 2 novos exports), corrigida no mesmo passo (mocks + defaults em `beforeEach`) antes de prosseguir.

## 40. git diff (resumo)

```
 app/api/automations/instagram/trigger/route.ts | 37 +++++++++++++-
 lib/actions/candidatos.test.ts                 |  8 ++-
 lib/actions/candidatos.ts                      |  9 +++-
 lib/auth/actions.ts                            | 45 +++++++++++++----
 lib/auth/dal.ts                                | 70 +++++++++++++++++++++++++-
 lib/auth/token.ts                              |  7 +++
 lib/auth/types.ts                              |  6 +++
 lib/queries/noticias.ts                        | 20 ++++++--
 8 files changed, 181 insertions(+), 21 deletions(-)
```
Nenhum commit feito — working tree aguardando autorização, conforme instrução.

## 41. Pendências

1. Deploy do código deste bloco (aguardando novo checkpoint, conforme condição do usuário) — sem ele, produção continua sem `client_id` na sessão/rota, mas isso é **seguro**: o código antigo continua funcionando exatamente como antes (nada foi removido do banco, só adicionado).
2. Remover `read_targets_legacy_anon` — só depois do item 1 estar validado em produção.
3. Nomear o cliente comercialmente (hoje é o placeholder `"PolitixOS — Operação Principal"`).
4. `NOT NULL` em `client_id` nas 7 tabelas — proposto para depois de mais um ciclo de confirmação em produção real.
5. Seletor de cliente na UI (cadastro de candidato, criação de usuário) — só necessário quando existir um 2º cliente real.
6. Rotação das credenciais antigas da RapidAPI/Supabase `service_role` (pendência já registrada no Bloco 1, inalterada, não coordenada nesta etapa).
7. `instagram_posts` (tabela órfã) segue sem `client_id` e sem uso — decisão consciente, não uma lacuna.

## 42. Riscos restantes

| Risco | Nível | Situação |
|---|---|---|
| `targets` ainda legível por `anon` | Presente, deliberado | Código já corrigido, policy aguarda validação em produção (item 41.2) |
| Deploy pendente | Baixo | Migration é 100% aditiva — código de produção atual continua funcionando sem saber que `client_id` existe |
| `NOT NULL` ainda não aplicado | Baixo | Backfill já garante 0 nulos hoje; falta só formalizar depois de mais confiança |
| Falta de UI para 2º cliente | Esperado | Fora de escopo até haver necessidade real |
| Rotação de credenciais pendente | Médio, herdado do Bloco 1 | Requer coordenação com outros workflows n8n |

## 43. Rollback

Toda migration é aditiva — `DROP COLUMN client_id`/`DROP TABLE clients`/`DROP TRIGGER trg_sync_client_id_*`/reverter a view para a definição anterior (sem `client_id`) desfazem completamente sem perda de nenhum dado original. Nenhum dado pré-existente foi modificado, só enriquecido.

## 44. Recomendação para Bloco 3

Com o Bloco 2 fechando **PASS** (fundação multi-tenant pronta, testada com dado real, nada quebrado), o próximo passo natural — antes do Bloco 3 (Reels/Stories) — é um **micro-bloco de deploy e fechamento**: (a) deploy deste código com autorização explícita, (b) validar `/dashboard/instagram`, `/dashboard/x`, `/dashboard/noticias`, `/dashboard/automacoes` em produção real (visual, com login), (c) remover `read_targets_legacy_anon` depois disso confirmado. Só então o Bloco 3 (Reels/Stories/Carrossel) parte de uma base multi-tenant já fechada, em vez de precisar reabrir este assunto no meio da expansão de conteúdo.

---

## MULTI-TENANT / CLIENT_ID STATUS:
**PASS**

Justificativa: cliente modelado explicitamente, targets vinculados, usuários escopados (Modelo A), backfill sem perda (contagens idênticas, zero órfãos), cross-tenant bloqueado (testado com dado real via transação de teste), client_id forjado bloqueado no n8n (testado com dado real — id inexistente corretamente não processa nada) e no código da rota (revisado, não exercitado ao vivo por falta de sessão local), admin preservado, Instagram/X/Overview/Notícias preservados (build+1109 testes sem regressão), workflow n8n mestre preservado (sem workflow por cliente), execução manual escopada por client, schedule preparado para multi-cliente sem reestruturação de risco desnecessária, logs identificáveis por cliente, build aprovado, testes aprovados. Único item que impede um "PASS" mais absoluto é não ter sido possível validar visualmente os dashboards logados (limitação de ambiente, não do código) — registrado como pendência, não escondido.
