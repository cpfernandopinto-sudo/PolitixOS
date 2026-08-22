# POLITIXOS — Facebook Bloco 3 — Relatório Operacional

Data: 22/08/2026  
Branch: `codex/facebook-bloco1`  
Base: `08b2f81`  
Escopo: integração operacional nativa do Facebook, sem deploy, ativação de n8n, cron ou Bloco 4.

## 1. Resumo executivo

A integração operacional foi implementada até o gate de execução real:

```text
Cadastro do candidato
→ social_accounts.platform_account_id
→ resolução server-side do contexto
→ orquestrador Facebook
→ provider
→ paginação
→ normalização
→ RPC atômica
→ social_posts
→ collection_logs
→ backend read
```

O E2E real não foi executado porque a credencial obrigatória do provider está comprovadamente ausente tanto no workspace quanto na Vercel Production. Nenhuma execução foi simulada ou declarada como real.

## 2. Arquitetura operacional

- `resolveFacebookSocialAccount`: carrega a conta e valida plataforma, atividade, client, target e Page ID.
- `runFacebookCollectionForSocialAccount`: encapsula resolução, provider, janela, paginação, identity guard, normalização, RPC, logs e resultado.
- `POST /api/automations/facebook/trigger`: entrada controlada para usuário autenticado ou futuro caller server-to-server.
- `runFacebookOwnedCollection`: preservado como núcleo homologado e ampliado somente com telemetria de completude.

O consumidor não precisa conhecer RapidAPI, cursor, RPC ou detalhes do provider.

## 3. social_accounts / Page ID

Nenhum campo existente comportava semanticamente o identificador nativo da plataforma. Foi adicionada:

```text
social_accounts.platform_account_id text nullable
```

O campo é genérico, aditivo e backward-compatible. Para Facebook representa o Page ID.

O cadastro existente da Michelle Bolsonaro foi atualizado por operação controlada, com escopo exato de account/client/target/handle:

- social account: `2cf150b1-4846-497d-a955-015ddd5dc281`;
- handle: `mulherconservadoraoficial`;
- Page ID: `100064348075846`.

O runtime não contém mapa ou hardcode Michelle → Page ID. O valor é sempre lido do cadastro.

O formulário existente de candidatos recebeu somente um campo condicional “Facebook Page ID”; não houve redesign.

## 4. Mudanças de schema

Migration: `social_accounts_platform_account_id`.

- coluna nullable;
- sem default;
- nenhuma tabela nova;
- nenhuma alteração de RLS, policy, constraint, índice ou trigger;
- RLS de `social_accounts` continua ativa;
- advisors pós-DDL não apontaram achado novo para a coluna.

Rollback conceitual:

```sql
alter table public.social_accounts drop column if exists platform_account_id;
```

O rollback não foi executado.

## 5. Orquestrador

Entrada:

- `socialAccountId`;
- `startDate`;
- `endDate` exclusiva;
- `maxPagesSafety` opcional;
- client e targets esperados somente como guardas server-side.

Saída:

- `runId`;
- `platform`;
- `clientId`;
- `targetId`;
- `socialAccountId`;
- `pageId`;
- `startDate` / `endDate`;
- `pagesFetched`;
- `postsReceived`;
- `postsUnique`;
- `postsPersisted`;
- `termination`;
- `collectionComplete`;
- `startedAt` / `finishedAt` / `durationMs`;
- `errors`.

## 6. Server-side trigger

Endpoint criado:

```text
POST /api/automations/facebook/trigger
```

Payload:

```json
{
  "socialAccountId": "uuid",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "maxPagesSafety": 100
}
```

Controles:

- schema estrito; client/target enviados pelo browser são rejeitados;
- usuário: sessão assinada, same-origin, role admin ou gestor com permissão `automacoes`;
- não-admin: client e targets derivados da sessão;
- service-to-service: `X-Webhook-Secret`, comparação constant-time;
- rate limit por usuário/conta ou caller/conta;
- respostas de erro sanitizadas;
- service role e provider key permanecem server-side.

## 7. Paginação completa

A coleta normal segue o cursor até:

- `cursor=null`; ou
- `results=[]`.

O safety cap continua limitado a 1–100 páginas, configurável por execução ou `FACEBOOK_MAX_PAGES_SAFETY`, com default 100.

## 8. termination / collectionComplete

| termination | collectionComplete |
|---|---|
| `CURSOR_NULL` | `true` |
| `EMPTY_RESULTS` | `true` |
| `MAX_PAGES` | `false` |

`MAX_PAGES` nunca é apresentado como coleta completa.

## 9. collection_logs

O metadata registra:

- janela;
- páginas e cursores;
- recebidos, únicos, normalizados e persistidos;
- termination;
- collection_complete;
- `SUCCESS_COMPLETE` ou `SUCCESS_PARTIAL`.

O status estrutural permanece `success` quando a persistência conclui; a completude é distinguida explicitamente no metadata, sem migration adicional.

## 10. End-to-end Michelle

`SOCIAL_ACCOUNT_PAGE_ID_FLOW = PASS`: o cadastro real resolve corretamente o Page ID sem hardcode.

`END_TO_END_OPERATIONAL_TEST = BLOCKED`: a chamada ao provider não pôde iniciar porque `FACEBOOK_SCRAPER_RAPIDAPI_KEY` está ausente:

- ambiente local/workspace: ausente;
- Vercel Production: ausente na listagem de nomes de env vars.

Nenhum valor secreto foi exibido, baixado ou alterado. Nenhuma chamada manual ao collector foi usada para contornar o orquestrador.

## 11. Posts, persistência e idempotência

Baseline pós-migration:

- Facebook: 6 posts, 6 IDs distintos, zero `client_id` nulo, um contexto de ownership;
- Instagram: 656;
- X: 401;
- duplicidades globais `(platform, platform_post_id)`: zero.

A RPC atômica não foi alterada. Testes de persistência/idempotência continuam PASS.

## 12. Backend read

O read existente continua escopado por client, target, social account, plataforma e período exclusivo. A prova sobre novos dados não pôde ser executada sem a credencial; os seis posts existentes permanecem recuperáveis pelo contrato já homologado.

## 13. Pipeline analítico

`ANALYTICS_PIPELINE_FACEBOOK = DOCUMENTED_BLOCKER`.

Evidência:

- `social_posts_pending_analysis` filtra exclusivamente `platform='instagram'`;
- `classify_social_content_type` retorna `NULL` para não-Instagram;
- o workflow de IA observado constrói prompts com `post.like_count || 0`, semanticamente incorreto para Facebook;
- o pipeline atual também pressupõe comentários Instagram.

Incluir Facebook com segurança exige um contrato analítico específico para reações e ausência de comentários detalhados. Alterar apenas a view faria Facebook entrar em um consumidor semanticamente incompatível; por isso nenhuma integração improvisada foi aplicada.

## 14. Semântica de reactions

- `social_posts.like_count` permanece `null`;
- total permanece em `raw_json.reactions_count`;
- breakdown permanece em `raw_json.reactions`;
- nenhum código Facebook converte `null` em zero;
- consumidores genéricos Instagram identificados não foram reutilizados para Facebook.

## 15. n8n readiness

Ponto futuro de entrada:

```text
n8n → POST /api/automations/facebook/trigger
    → PolitixOS backend
    → Facebook orchestrator
    → provider
```

Contrato:

- header `X-Webhook-Secret`;
- payload estrito descrito na seção 6;
- resposta contém resultado operacional e `collectionComplete`;
- retry somente para falhas transitórias/5xx, respeitando rate limit;
- a RPC garante idempotência;
- `MAX_PAGES` deve ser tratado como parcial, não como completo.

`FACEBOOK_COLLECTION_WEBHOOK_SECRET` também precisa ser configurada antes do caller n8n. Nenhum workflow ou schedule foi criado ou ativado.

## 16. Segurança

- Page ID lido do banco;
- tenant e target validados perto da fonte de dados;
- browser não escolhe client/target;
- service role somente no backend;
- RapidAPI key somente server-side quando configurada;
- RPC somente `service_role`;
- same-origin para chamadas de sessão;
- secret server-to-server com comparação constant-time;
- rate limit;
- erros e respostas sem secrets;
- atomic cross-tenant guard preservado.

## 17. Arquivos criados/modificados

Criados:

- `app/api/automations/facebook/trigger/route.ts`;
- `app/api/automations/facebook/trigger/route.test.ts`;
- `lib/facebook/account-resolver.ts`;
- `lib/facebook/account-resolver.test.ts`;
- `lib/facebook/operational.ts`;
- `lib/facebook/operational.test.ts`;
- `lib/facebook/platform-account-id-migration.test.ts`;
- `supabase_migration_social_accounts_platform_account_id.sql`;
- `FACEBOOK_BLOCO3_OPERACIONAL_RELATORIO.md`.

Modificados:

- `components/candidatos/CandidatoForm.tsx`;
- `lib/actions/candidatos.ts`;
- `lib/queries/candidatos.ts`;
- `lib/facebook/pagination.ts` e teste;
- `lib/facebook/collector.ts` e teste.

## 18. Migrations

`MIGRATION = SIM`.

Aplicada: `social_accounts_platform_account_id`.

Nenhuma outra migration foi criada ou aplicada.

## 19. Testes

- testes focados após implementação: 12 arquivos, 57 testes, PASS;
- suíte completa: 148 arquivos PASS, 5 skipped;
- total: 1.281 testes PASS, 5 skipped;
- TypeScript: PASS;
- ESLint dirigido: PASS, zero warnings;
- `git diff --check`: PASS;
- Next.js 16.2.6 build: PASS;
- rota `/api/automations/facebook/trigger` presente no build.

## 20. Regressões

- Instagram: 656, íntegro;
- X: 401, íntegro;
- Facebook: 6, íntegro;
- unique key global preservada;
- zero duplicidades;
- RLS/policies preservadas;
- nenhuma alteração de workflow, schedule, deploy ou outra página.

## 21. P2/P3 preservados

P2:

- lineage “último run vence”;
- identity validation por uma fonte;
- Page ID resolution automática indisponível;
- endpoints complementares;
- rotação da credencial antes de produção contínua;
- semântica reactions/like_count;
- MAX_PAGES mitigado com telemetria explícita.

P3:

- helper diagnóstico de data;
- vídeo/Reels/álbum não homologados;
- `delegate_page_id` / `associated_group_id`.

Débito obrigatório: `ROTATE_FACEBOOK_RAPIDAPI_KEY_BEFORE_CONTINUOUS_PRODUCTION`.

## 22. Blockers

1. `FACEBOOK_SCRAPER_RAPIDAPI_KEY` ausente localmente e na Vercel Production.
2. Consequentemente, E2E operacional real e confirmação runtime de `collectionComplete` para Michelle não executados.
3. Analytics Facebook exige bloco próprio para contrato de reações e inputs, documentado sem improvisação.

## 23. Veredito

| Critério | Resultado |
|---|---|
| SOCIAL_ACCOUNT_PAGE_ID_FLOW | PASS |
| FACEBOOK_OPERATIONAL_ORCHESTRATOR | PASS |
| FULL_WINDOW_COLLECTION_SEMANTICS | PASS |
| PARTIAL_COLLECTION_TELEMETRY | PASS |
| SERVER_SIDE_TRIGGER | PASS |
| END_TO_END_OPERATIONAL_TEST | BLOCKED |
| ATOMIC_TENANT_GUARD | PASS |
| REAL_IDEMPOTENCY | PASS (baseline preservado) |
| BACKEND_READ | PASS (baseline homologado) |
| INSTAGRAM_REGRESSION | PASS |
| X_REGRESSION | PASS |
| TYPECHECK | PASS |
| ESLINT | PASS |
| BUILD | PASS |
| SECURITY | PASS |
| ANALYTICS_PIPELINE_FACEBOOK | DOCUMENTED_BLOCKER |

`VEREDITO_CODEX = NO_GO_EXTERNAL_CREDENTIAL_BLOCKER`

O código está pronto para reteste, mas o Bloco 3 não pode receber GO sem a prova E2E real obrigatória.

## 24. Próximo passo objetivo

1. cadastrar `FACEBOOK_SCRAPER_RAPIDAPI_KEY` no ambiente autorizado, sem expor o valor;
2. retestar exclusivamente o fluxo novo com uma janela pequena da Michelle;
3. confirmar `termination`, `collectionComplete`, persistência, log, read e ownership;
4. emitir complemento do relatório e novo veredito;
5. somente depois discutir analytics ou automação.

Não iniciei o Bloco 4.

## Bloco 3B — E2E Runtime Real

### Credencial e preflight

- `FACEBOOK_SCRAPER_RAPIDAPI_KEY = CONFIGURED_FOR_E2E_RUNTIME`;
- credencial usada somente em memória nesta execução, sem persistência, impressão ou configuração na Vercel;
- conta Facebook ativa de Michelle Bolsonaro resolvida pelo cadastro real;
- `platform_account_id = 100064348075846`;
- `client_id`, `target_id` e `social_account_id` coerentes e pertencentes ao mesmo tenant;
- ownership fingerprint pré-execução preservado, sem reassociação.

### Janela e execução 1

- janela `[2026-08-21, 2026-08-23)`, com `endDate` exclusivo;
- safety cap: 20 páginas;
- entrada: `runFacebookCollectionForSocialAccount`;
- `runId = ec3f0022-c641-4006-8251-103e56f0cb9e`;
- Page ID: `100064348075846`;
- páginas: 4;
- posts recebidos: 8;
- posts únicos: 8;
- posts persistidos/upsertados: 8;
- `termination = EMPTY_RESULTS`;
- `collectionComplete = true`;
- duração aproximada: 14.333 ms;
- erros: nenhum;
- outcome: `SUCCESS_COMPLETE`.

O baseline anterior tinha 6 posts. A nova leitura do provedor retornou 8 posts reais na mesma janela; os dois registros adicionais possuem IDs únicos e ownership correto. A variação é conteúdo novo/coletável, não duplicação.

### Execução 2 e trigger server-side

- mesma janela e mesmo safety cap;
- execução feita por `POST /api/automations/facebook/trigger`;
- autenticação server-side pelo header próprio, com segredo efêmero de teste;
- a chave RapidAPI não foi enviada no request;
- schema, `socialAccountId`, `startDate`, `endDate`, guard e retorno operacional validados;
- `runId = 4304c5d2-b8a4-4129-8686-237928b446ba`;
- páginas: 4;
- posts recebidos: 8;
- posts únicos: 8;
- posts persistidos/upsertados: 8;
- `termination = EMPTY_RESULTS`;
- `collectionComplete = true`;
- duração aproximada: 7.090 ms;
- erros: nenhum;
- outcome: `SUCCESS_COMPLETE`.

### Persistência, idempotência, lineage e leitura

- Facebook após a segunda execução: 8 registros e 8 `platform_post_id` distintos;
- janela: 8 registros e 8 IDs distintos;
- grupos duplicados globais por `(platform, platform_post_id)`: zero;
- ownership incorreto/cross-tenant: zero;
- `platform = facebook`, `content_origin = OWNED` e provider esperado em todos os registros da janela;
- `like_count = null` nos 8 registros, preservando a semântica aprovada;
- `raw_json.reactions_count`, `raw_json.reactions`, provider e `collection_run_id` presentes segundo o contrato normalizado;
- os 8 registros apontam para o segundo run, confirmando “último run vence”;
- ambos os `collection_logs` têm status `success`, `SUCCESS_COMPLETE`, janela, páginas, recebidos, únicos, persistidos, terminação e completude corretos;
- a camada real `fetchFacebookPosts` recuperou os 8 posts por client, target, social account e período;
- atomic tenant guard preservado; nenhum teste destrutivo cross-tenant foi repetido.

### Segurança e regressões

- busca literal da credencial no working tree e arquivos rastreáveis: 0 ocorrências;
- teste E2E descartável removido após a execução;
- testes Facebook, trigger, operacional, Instagram e X: 15 arquivos, 104 testes, PASS;
- TypeScript: PASS;
- ESLint dirigido: PASS, zero warnings;
- `git diff --check`: PASS;
- Next.js 16.2.6 build: PASS;
- rota `/api/automations/facebook/trigger` confirmada no build;
- nenhuma alteração em n8n, deploy, Vercel, Supabase schema, analytics, Instagram ou X.

### Critérios finais

| Critério | Resultado |
|---|---|
| SOCIAL_ACCOUNT_PAGE_ID_FLOW | PASS |
| FACEBOOK_OPERATIONAL_ORCHESTRATOR | PASS |
| END_TO_END_OPERATIONAL_TEST | PASS |
| FULL_WINDOW_COLLECTION_SEMANTICS | PASS |
| REAL_PERSISTENCE | PASS |
| REAL_IDEMPOTENCY | PASS |
| COLLECTION_LINEAGE | PASS |
| FACEBOOK_BACKEND_READ | PASS |
| SERVER_SIDE_TRIGGER | PASS |
| ATOMIC_TENANT_GUARD | PASS |
| INSTAGRAM_REGRESSION | PASS |
| X_REGRESSION | PASS |
| TYPECHECK | PASS |
| ESLINT | PASS |
| BUILD | PASS |
| SECURITY | PASS |
| ANALYTICS_PIPELINE_FACEBOOK | DOCUMENTED_BLOCKER |

O blocker externo do E2E foi encerrado. Permanece apenas o débito documentado de analytics Facebook, fora do escopo e não impeditivo para o fechamento operacional do Bloco 3. A credencial temporária continua candidata a rotação antes de produção contínua.

`VEREDITO_CODEX = GO`

Não iniciei analytics, n8n, deploy ou o Bloco 4.
