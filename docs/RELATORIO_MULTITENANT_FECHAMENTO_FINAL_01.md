# RELATÓRIO — BLOCO 2.2: FECHAMENTO FINAL DA POLICY TARGETS

**Baseline:** [RELATORIO_MULTITENANT_FECHAMENTO_PRODUCAO_01.md](RELATORIO_MULTITENANT_FECHAMENTO_PRODUCAO_01.md)
**Data:** 2026-08-21
**Escopo:** Remover `read_targets_legacy_anon`, validar fechamento total do acesso anônimo, nenhuma feature nova.

---

## 1. Validação visual humana pré-policy

Informada pelo usuário como concluída e **PASS** em todas as 6 telas: Overview, Instagram, X, Notícias, Candidatos, Automações. Usada como pré-requisito confirmado para prosseguir — não foi re-executada por mim (é validação humana, não técnica).

Pré-check técnico complementar (repetido nesta etapa, antes da migration):
- Busca completa por `.from('targets')`: 7 arquivos (`lib/actions/candidatos.ts`, `lib/queries/candidatos.ts`, `lib/queries/instagram.ts`, `lib/queries/x.ts`, `lib/queries/overview.ts`, `lib/queries/noticias.ts`, `lib/auth/dal.ts`) — os 6 primeiros já confirmados no Bloco 2; `lib/auth/dal.ts` é novo nesta busca (função `filterTargetIdsByClient`, adicionada no Bloco 2), confirmado `server-only` (import que causa erro de build se importado por Client Component) + `createAdminClient()`.
- **Nenhum é `'use client'`. Todos usam `createAdminClient()`/`createAdminClient()`-only para `targets`.**
- `lib/queries/noticias.ts`: confirmado usando `createAdminClient()` nas 4 instanciações.
- `npm run build` + `npx vitest run`: limpos (1109/1109) antes da migration.
- Workflow n8n (`XaWHmrrnobud6La1`): `updatedAt` inalterado desde a última publicação do Bloco 2 — nenhuma mudança pendente.

**Resultado: client-side anon = 0, server-side anon legítimo = 0. Condição satisfeita, prossegui.**

## 2. Estado anterior de read_targets_legacy_anon

`SELECT` para `{anon, authenticated}`, `using(true)` — única policy da tabela `targets` (que já tinha RLS habilitada desde o Bloco 1, só essa policy permissiva restava).

## 3. Migration aplicada

```sql
drop policy if exists "read_targets_legacy_anon" on public.targets;
```
Aplicada via Supabase MCP (`apply_migration`, nome `remove_targets_legacy_anon_policy`) e registrada no repositório em [supabase_migration_remove_targets_legacy_anon_policy.sql](../supabase_migration_remove_targets_legacy_anon_policy.sql), seguindo a convenção já usada no projeto para migrations avulsas. Nenhuma outra policy, tabela, trigger, índice ou constraint foi tocada.

## 4-8. Resultado anon (targets, social_posts, instagram_comments, instagram_posts, ai_analysis)

Chamadas reais à API REST do Supabase com a chave `anon` pública, depois da migration:

```
GET /rest/v1/targets?select=id&limit=1              → HTTP 200, body: []
GET /rest/v1/social_posts?select=id&limit=1         → HTTP 200, body: []
GET /rest/v1/instagram_comments?select=id&limit=1   → HTTP 200, body: []
GET /rest/v1/instagram_posts?select=id&limit=1      → HTTP 200, body: []
GET /rest/v1/ai_analysis?select=id&limit=1          → HTTP 200, body: []
```

**As 5 tabelas retornam `[]` para a chave anônima.** Confirmado também via `pg_policies`: `targets` agora tem **zero policies** (mesmo estado das outras 4 — só `service_role` tem acesso, via bypass padrão de RLS do Supabase + as policies `service_role_full_access_*` já existentes, inalteradas).

## 9. Build

```
✓ Compiled successfully in 4.7s
```
Executado depois da migration.

## 10. Vitest

```
Test Files  125 passed | 5 skipped (130)
     Tests  1109 passed | 5 skipped (1114)
```
Depois da migration — sem regressão.

## 11. Banco

Recontagem depois da migration (nenhuma mudança esperada, já que a migration só remove uma policy, não toca dado nenhum):
```
clients = 1
targets sem client_id = 0
social_accounts sem client_id = 0
social_posts sem client_id = 0
instagram_comments sem client_id = 0
ai_analysis sem client_id = 0
collection_logs sem client_id = 0
```
Idêntico ao estado pré-migration.

## 12. Instagram/n8n

Confirmado com dado real **pós-migration**: o schedule trigger automático do n8n (30min) rodou às `03:30:50 UTC` — depois da remoção da policy — e completou normalmente: `status: success, posts_collected: 12, client_id` correto. A remoção da policy `anon` não afeta o n8n (que sempre usou `service_role`, nunca dependeu dessa policy). Página de login em produção carregando sem erro de console depois da migration.

## 13. SHA

`7bc769e` (`7bc769e1bcc1cabf7bffe16366a438073f0381d5`) — `docs(multitenant): close targets anon policy, record final validation`, branch `main`, fast-forward de `32d9553` (Bloco 2, já em produção). Push aceito por `origin/main`. Nenhum código de aplicação novo neste bloco — só a migration (`.sql`, registro no repo) e os relatórios.

## 14. Policies finais em targets

```
(nenhuma)
```
RLS habilitada, zero policies para `anon`/`authenticated` — deny-all por padrão do Postgres. `service_role` continua com acesso total (bypass de RLS + policies `service_role_full_access_*` nas demais tabelas, que nunca dependeram de `targets` ter uma policy própria).

## 15. Pendências

1. **Teste cross-client com sessão real** (ver seção 16) — segue pendente, requer validação humana ou ferramenta explicitamente autorizada a inserir credenciais.
2. Confirmar SHA exato de deployment na Vercel quando a API MCP tiver escopo (bloqueio de autenticação já registrado nos relatórios anteriores).
3. Pendências herdadas, inalteradas: rotação de credenciais antigas (RapidAPI/Supabase `service_role`), nome comercial do cliente (hoje placeholder), `NOT NULL` em `client_id` (não aplicado, conforme instrução), UI multi-cliente, `instagram_posts` órfã.

## 16. Teste cross-client

**CROSS-CLIENT SESSION TEST: PENDING**

A defesa (`app/api/automations/instagram/trigger/route.ts`: `client_id` do payload comparado contra `session.clientId` para não-admin, `403`/`CLIENT_ID_MISMATCH` em caso de divergência, nenhuma chamada ao n8n) está implementada, revisada em código e coberta indiretamente pelo teste real do lado n8n (Bloco 2.1: um `client_id` inexistente corretamente não encontra nenhuma conta). **Não foi executado um teste E2E autenticado real** — faria isso exigir inserir uma senha num formulário de login, ação que minhas regras de segurança proíbem sem exceção, mesmo para uma conta de teste criada e removida por mim mesmo só para esse fim (já tentado e revertido no Bloco 2.1). Não marco como PASS por inferência.

## 17. Riscos residuais

| Risco | Nível |
|---|---|
| Teste cross-client sem execução E2E real | Baixo — metade do mecanismo (n8n) provada com dado real; metade que falta é lógica simples de comparação de string, revisada em código |
| Credenciais antigas não rotacionadas | Médio, herdado, inalterado |
| `client_id` ainda nullable (sem `NOT NULL`) | Baixo, decisão deliberada, backfill já garante 0 nulos hoje |

## 18. Recomendação para Bloco 3

Fundação multi-tenant estruturalmente fechada: `clients`/`client_id` propagados e testados, leitura pública de todas as 5 tabelas sensíveis (`targets`/`social_posts`/`instagram_comments`/`instagram_posts`/`ai_analysis`) fechada e confirmada com chave anônima real, aplicação saudável em produção, pipeline Instagram/n8n operando normalmente pós-fechamento. O Bloco 3 (Reels/Stories/Carrossel) pode começar sobre essa base. O único item que continua pendente (teste cross-client E2E) não bloqueia o Bloco 3 — é independente do trabalho de expansão de conteúdo — mas deve ficar registrado como dívida técnica a ser fechada quando houver uma forma segura de testar sessão real (validação humana, ou uma ferramenta de automação de navegador explicitamente autorizada e operada por alguém com essa permissão).

---

## MULTI-TENANT FOUNDATION: PASS
## CROSS-CLIENT SESSION TEST: PENDING

Fechamento estrutural: migration correta e isolada, leitura anônima fechada nas 5 tabelas (confirmado com chamadas reais), banco consistente antes/depois, aplicação saudável (build + 1109 testes + produção respondendo sem erro + pipeline n8n rodando com sucesso pós-migration, inclusive um ciclo automático real), n8n inalterado e saudável. A defesa cross-client da rota de trigger está implementada e parcialmente validada (lado n8n, com dado real) mas carece de um teste E2E autenticado real — registrado explicitamente como pendente, não inferido como PASS.

Não avancei para o Bloco 3. Aguardando análise e autorização.
