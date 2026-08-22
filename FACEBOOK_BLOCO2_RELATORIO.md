# FACEBOOK — BLOCO 2 — RELATÓRIO TÉCNICO

## 1. Resumo executivo

O preflight e a auditoria somente leitura localizaram o cadastro correto da Michelle Bolsonaro e confirmaram que o schema atual comporta Facebook sem migration. O gate obrigatório de ambiente, porém, resultou em **BLOCKER**: o Supabase configurado localmente é o mesmo projeto que a documentação do repositório identifica como banco de produção. Como o prompt proíbe persistência em produção, nenhuma escrita, coleta persistente ou alteração de cadastro foi executada.

## 2. Estado inicial

- branch: `codex/facebook-bloco1`;
- HEAD inicial: `f2df973c3fdd76cd28d5dc1104e6729c38a75b8e`;
- alterações rastreadas iniciais: nenhuma;
- relatórios históricos X não rastreados: preservados e não inspecionados como parte da implementação;
- Bloco 1/1B: GO confirmado pelo relatório anterior.

## 3. Cadastro Facebook encontrado

Consulta real, somente leitura:

```text
client_id = f348bd17-bc45-4f53-a5f2-8daae47d0ca5
target_id = 7a7c0d0e-4ffc-4b63-8ae0-3d2a1850e655
social_account_id = 2cf150b1-4846-497d-a955-015ddd5dc281
platform = facebook
handle = mulherconservadoraoficial
page_id = 100064348075846
```

- target: `Michelle Bolsonaro`;
- target ativo: sim;
- social account ativa: sim;
- profile URL: `https://www.facebook.com/mulherconservadoraoficial/?locale=pt_BR`;
- `client_id` do target e da social account: coincidentes.

## 4. Schema utilizado

`social_accounts` já possui `id`, `client_id`, `target_id`, `platform`, `handle`, `profile_url`, `is_active` e `created_at`. Não foi encontrado campo estruturado para external ID/Page ID nem metadata nessa tabela. O Page ID comprovado pode ser fornecido como configuração operacional ao coletor sem duplicar schema nesta rodada.

## 5. Investigação de endpoints

Nenhum path complementar novo foi comprovado antes do gate de ambiente. Não foram inferidos endpoints nem executadas tentativas aleatórias.

## 6. Resultado handle/URL → Page ID

`FACEBOOK_PAGE_ID_RESOLUTION = UNAVAILABLE` para resolução automática. O Page ID manual/runtime previamente comprovado permanece disponível como configuração segura: `100064348075846`.

## 7. Identity validation

Pré-validação cadastral: **PASS** para target, tenant, platform, handle, URL e status ativo. A comparação runtime `author.id`/`source_page_id` seria executada imediatamente antes da persistência, mas não foi repetida porque o gate de ambiente impediu a etapa mutável.

## 8. Coleta runtime

Não executada no Bloco 2. O provider já está homologado no Bloco 1B, mas esta rodada exigia coleta integrada à persistência real e foi interrompida antes dela.

## 9. Persistência real

**NÃO EXECUTADA.** O projeto Supabase configurado é identificado no próprio repositório como produção. A regra do prompt exige parar antes de escrever quando houver ambiente de produção proibido.

## 10. Amostra sanitizada dos registros persistidos

Não aplicável: zero registros persistidos.

## 11. Idempotência real

`REAL_IDEMPOTENCY = NOT_TESTED`. A idempotência mock do Bloco 1 permanece PASS, mas não foi promovida indevidamente a evidência real.

## 12. Collection logs

`COLLECTION_LINEAGE = NOT_TESTED`. Nenhum `collection_logs` foi inserido ou alterado.

## 13. Backend read

`FACEBOOK_BACKEND_READ = NOT_TESTED`. Nenhum post Facebook de homologação foi gravado para releitura.

## 14. Multi-tenant

- alinhamento cadastral `targets.client_id = social_accounts.client_id`: confirmado;
- proteção mock `FACEBOOK_CROSS_TENANT_POST_CONFLICT`: preservada;
- teste destrutivo com outro tenant real: não executado, conforme instrução.

## 15. Endpoints complementares

| Capacidade | Status |
|---|---|
| PAGE_POSTS | CONFIRMED no Bloco 1B |
| PAGE_LOOKUP | NOT_TESTED |
| PAGE_DETAILS | NOT_TESTED |
| POST_DETAILS | NOT_TESTED |
| COMMENTS | NOT_TESTED |
| RESHARES | NOT_TESTED |
| SEARCH_PAGES | NOT_TESTED |
| SEARCH_POSTS | NOT_TESTED |
| SEARCH_PEOPLE | NOT_TESTED |

## 16. Arquivos criados

- `FACEBOOK_BLOCO2_RELATORIO.md`.

## 17. Arquivos modificados

Nenhum arquivo de runtime.

## 18. Migrations

**NÃO.** Nenhuma migration criada ou aplicada.

## 19. Testes

Não repetidos após o blocker porque nenhum código foi alterado. O baseline do commit inicial permanece: 69 testes dirigidos, TypeScript, ESLint e build PASS no Bloco 1B.

## 20. Segurança

- consulta Supabase somente leitura;
- zero INSERT/UPDATE/DELETE/UPSERT;
- zero alteração em produção;
- RapidAPI key não utilizada nem persistida nesta rodada;
- nenhum deploy, n8n, cron, Instagram ou X alterado.

## 21. Débitos

- disponibilizar um projeto Supabase de homologação isolado, ou autorização inequívoca para o ambiente correto;
- comprovar resolução automática de Page ID;
- executar pipeline integrado, idempotência real, lineage e backend read.

## 22. Bloqueadores

**FACEBOOK_BLOCO2_ENVIRONMENT_BLOCKER** — o Supabase configurado corresponde ao banco documentado como produção, cuja escrita é proibida neste bloco.

## 23. Matriz final de capacidades

| Capacidade | Resultado |
|---|---|
| Conta correta identificada | PASS |
| Page ID disponível | PASS — configuração manual comprovada |
| Identity validation cadastral | PASS |
| Coleta integrada | BLOCKED |
| Persistência real controlada | BLOCKED |
| Idempotência real | NOT_TESTED |
| Collection lineage | NOT_TESTED |
| Backend read | NOT_TESTED |
| Tenant isolation mock | PASS |
| Segurança de ambiente | PASS — fail closed antes da escrita |

## 24. Veredito

# NO_GO

O pipeline completo não pode receber GO sem persistência real, segunda execução, lineage e releitura. O NO_GO é operacional por ambiente, não uma falha do provider ou da fundação Facebook.

## 25. Recomendação objetiva para o Bloco 3

Não iniciar o Bloco 3. Primeiro configurar um Supabase de homologação seguro com schema compatível ou fornecer autorização explícita e inequívoca para o banco que deve receber o piloto. Depois retomar o Bloco 2 exatamente antes da primeira escrita.

## Bloco 2C — Piloto Controlado em Produção

### 1. Autorização limitada

A escrita em produção foi autorizada exclusivamente para a conta Facebook da Michelle Bolsonaro, até 20 posts, sem delete, migration, deploy, n8n ou alteração de outras redes/targets. O blocker de ambiente do Bloco 2 foi removido por esta autorização específica.

### 2. Preflight

```text
ambiente = produção (piloto cirúrgico autorizado)
client_id = f348bd17-bc45-4f53-a5f2-8daae47d0ca5
target_id = 7a7c0d0e-4ffc-4b63-8ae0-3d2a1850e655
social_account_id = 2cf150b1-4846-497d-a955-015ddd5dc281
platform = facebook
handle = mulherconservadoraoficial
page_id = 100064348075846
target_active = true
social_account_active = true
FACEBOOK_SCRAPER_RAPIDAPI_KEY = CONFIGURED
```

Target e social account pertencem ao mesmo `client_id`. Nenhuma alteração cadastral foi necessária.

### 3. Identidade

`ACCOUNT_IDENTITY = PASS`.

As duas páginas retornaram seis posts únicos; todos apresentaram `author.id=100064348075846`, compatível com o Page ID esperado, handle e URL cadastrados. A validação foi executada antes da primeira escrita. O orquestrador foi endurecido para falhar com `FACEBOOK_ACCOUNT_IDENTITY_MISMATCH` antes até mesmo de criar `collection_logs` quando não houver evidência ou existir mismatch.

### 4. Janela de coleta

- janela: `[2026-08-21, 2026-08-23)`;
- páginas: 2;
- posts recebidos: 6;
- posts normalizados: 6;
- posts únicos: 6;
- timestamps: entre `2026-08-21T14:41:24.000Z` e `2026-08-22T16:21:18.000Z`;
- volume abaixo do threshold de 20;
- erros do provider: zero.

### 5. Primeira persistência

`REAL_PERSISTENCE = BROKEN`.

O `collection_log` foi criado e o upsert de `social_posts` foi tentado. O banco rejeitou a primeira linha com:

```text
new row for relation "social_posts" violates check constraint "chk_platform"
```

Isso comprova que o schema real ainda restringe `social_posts.platform` e não admite `facebook`. Como migration e alteração estrutural estavam expressamente proibidas, a execução parou imediatamente, sem retry ou contorno.

### 6. Impacto real

- posts Facebook antes: 0;
- posts Facebook depois: 0;
- posts criados/atualizados: 0;
- posts Instagram/X alterados: 0;
- total de posts não Facebook permaneceu consultável: 1.057;
- deletes/truncates: zero;
- único efeito persistido: um `collection_log` de erro, pertencente ao tenant/target/account autorizados.

### 7. Collection log e lineage

O run `c43e1e16-b434-4c44-9692-b23d4b781332` terminou com:

- `status=error`;
- `posts_collected=0`;
- `started_at=2026-08-22T21:26:19.754Z`;
- `finished_at=2026-08-22T21:26:27.421Z`;
- metadata com `pipeline_version=facebook-v1`, `content_origin=OWNED` e Page ID correto.

`COLLECTION_LINEAGE = PARTIAL`: lifecycle de erro confirmado, mas não existe post persistido cujo `raw_json.collection_run_id` possa ser relacionado ao log.

### 8. Releitura e backend read

Foi adicionada camada server-side mínima com filtros obrigatórios por `platform=facebook`, `client_id`, `target_id`, `social_account_id` e período `[start,end)`. A lógica local passou nos testes, mas a prova real retornou zero linhas porque a persistência foi rejeitada.

`FACEBOOK_BACKEND_READ = PARTIAL`.

### 9. Segunda execução e idempotência

A segunda execução não foi iniciada após a falha estrutural da primeira.

- duplicatas criadas: 0;
- `REAL_IDEMPOTENCY = NOT_TESTED` em produção;
- proteção mock por `(platform, platform_post_id)` e conflito cross-tenant permanece preservada.

### 10. Tenant isolation

`TENANT_ISOLATION = PASS` para o escopo executado: cadastro e contexto coincidiram, queries foram totalmente filtradas, nenhum terceiro tenant foi usado e nenhuma linha de outra rede/conta foi alterada.

### 11. Mudanças locais

- `lib/facebook/collector.ts`: validação obrigatória de identidade antes da primeira escrita;
- `lib/facebook/collector.test.ts`: cobertura de identidade correta, ausente e divergente;
- `lib/queries/facebook.ts`: leitura server-side escopada;
- `lib/queries/facebook.test.ts`: cobertura dos filtros e fail-closed.

### 12. Migration

**NÃO.** Nenhuma migration foi criada ou aplicada. A correção de `chk_platform` exige autorização arquitetural específica em uma rodada posterior.

### 13. Segurança

- credencial RapidAPI somente em memória;
- nenhum secret persistido ou impresso;
- volume limitado a seis posts;
- zero delete/truncate;
- zero alteração em Instagram/X/outros targets;
- erro estrutural tratado fail-closed;
- nenhum deploy, n8n, cron ou scheduler.

### 13.1 Testes finais

- Facebook + regressões dirigidas Instagram/X: 9 arquivos, 75 testes, PASS;
- TypeScript: PASS;
- ESLint dirigido: PASS;
- `git diff --check`: PASS;
- build Next.js: PASS.

### 14. Blocker

**FACEBOOK_SOCIAL_POSTS_PLATFORM_CONSTRAINT_BLOCKER** — `chk_platform` rejeita `platform='facebook'`.

### 15. Matriz final do Bloco 2C

| Critério | Resultado |
|---|---|
| ACCOUNT_IDENTITY | PASS |
| COLLECTION_RUNTIME | PASS |
| NORMALIZATION | PASS |
| REAL_PERSISTENCE | BROKEN |
| REAL_IDEMPOTENCY | NOT_TESTED |
| COLLECTION_LINEAGE | PARTIAL |
| FACEBOOK_BACKEND_READ | PARTIAL |
| TENANT_ISOLATION | PASS |
| INSTAGRAM_REGRESSION | PASS |
| X_REGRESSION | PASS |
| TYPECHECK | PASS |
| ESLINT | PASS |
| BUILD | PASS |
| MIGRATION | NÃO |
| SECURITY | PASS |

### 16. Veredito final

# NO_GO

O blocker anterior de ambiente foi removido, mas o piloto revelou um blocker estrutural real no schema. Não iniciar o Bloco 3. A próxima rodada deve auditar a definição exata de `chk_platform` e autorizar, se apropriado, uma migration aditiva/reversível que inclua `facebook`, seguida da retomada do piloto sem ampliar seu escopo.

## Bloco 2D — Migration chk_platform + Retomada do Piloto

### 1. Definição original

```sql
CHECK (platform = ANY (ARRAY[
  'instagram'::text,
  'tiktok'::text,
  'youtube'::text,
  'x'::text
]))
```

A constraint estava validada. Precheck: 1.057 linhas (`instagram=656`, `x=401`), zero valores fora do conjunto permitido e zero Facebook.

### 2. Dependências auditadas

- RLS de `social_posts`: habilitada;
- policy: `service_role_full_access_social_posts`, inalterada;
- unique constraint: `UNIQUE (platform, platform_post_id)`, inalterada;
- índices: inalterados;
- views: `social_posts_pending_analysis` filtra explicitamente Instagram e `x_posts_pending_analysis` filtra explicitamente X;
- trigger de content type: preservado;
- `classify_social_content_type`: retorna `NULL` para plataformas diferentes de Instagram, compatível com `content_type` nullable;
- nenhum trigger/view/function exigiu alteração.

Os advisors apontaram achados preexistentes fora do escopo (incluindo views security-definer e índices duplicados). Nenhum achado novo foi causado pela migration e nenhum item adjacente foi alterado.

### 3. Migration criada e aplicada

Arquivo: `supabase_migration_facebook_chk_platform.sql`.

A migration `facebook_chk_platform` foi aplicada pelo mecanismo de migrations do Supabase. Ela:

1. verifica a definição original exata;
2. falha se houver valores inesperados;
3. remove somente `chk_platform`;
4. recria a constraint preservando os quatro valores existentes e adicionando `facebook`;
5. valida a constraint na mesma transação.

Nenhuma coluna, tipo, índice, unique key, policy, trigger, view ou dado foi alterado pela migration.

### 4. Definição final

```sql
CHECK (platform = ANY (ARRAY[
  'instagram'::text,
  'tiktok'::text,
  'youtube'::text,
  'x'::text,
  'facebook'::text
]))
```

`CHK_PLATFORM_FACEBOOK = PASS`; constraint efetiva e validada no banco.

### 5. Rollback conceitual

Não executado. Antes de remover `facebook`, seria obrigatório confirmar ausência de linhas Facebook ou tratá-las sob plano de dados explicitamente autorizado. Depois, em uma transação, `chk_platform` poderia ser restaurada ao conjunto original `instagram/tiktok/youtube/x`.

### 6. Retomada da coleta

- target/account/tenant: os mesmos já validados;
- identidade: todos os posts com `author.id=100064348075846`;
- janela: `[2026-08-21, 2026-08-23)`;
- páginas por execução: 2;
- posts recebidos/normalizados/únicos: 6/6/6;
- erro do provider: zero;
- duração da primeira execução: aproximadamente 8,6 s;
- duração da segunda execução: aproximadamente 6,1 s.

`ACCOUNT_IDENTITY = PASS`; `COLLECTION_RUNTIME = PASS`.

### 7. Persistência real

- antes: 0 posts Facebook;
- após primeira execução: 6;
- inserts efetivos inferidos: 6;
- após segunda execução: 6;
- updates/reconciliações na segunda execução: 6;
- `platform_post_id=post_id`;
- `content_origin=OWNED`;
- `like_count=null` em todos;
- provider, reactions total/breakdown e collection run presentes em todos;
- linhas inválidas na auditoria final: 0.

`REAL_PERSISTENCE = CONFIRMED`.

### 8. Idempotência

A mesma janela e limite foram executados duas vezes. A contagem permaneceu 6 e há seis IDs distintos. Auditoria global por `(platform, platform_post_id)` retornou zero chaves duplicadas.

`REAL_IDEMPOTENCY = CONFIRMED`.

### 9. Collection lineage

Runs bem-sucedidos:

- `384b5b56-9ebf-45f8-b066-be30ddbf9d7e`: success, 6 posts;
- `939cf512-b27e-4f29-972d-5895f476dbae`: success, 6 posts.

Após a reconciliação, os seis posts apontam em `raw_json.collection_run_id` para o segundo run, que é o lineage vigente do último upsert. Ambos os logs possuem início/fim, páginas, cursores, normalizados e persistidos.

`COLLECTION_LINEAGE = CONFIRMED`.

### 10. Backend read

A consulta server-side escopada por `client_id`, `target_id`, `social_account_id`, `platform=facebook` e período retornou exatamente seis linhas, os mesmos seis IDs persistidos.

`FACEBOOK_BACKEND_READ = CONFIRMED`.

### 11. Regressão de schema e impacto

- `instagram`: permaneceu com 656 linhas;
- `x`: permaneceu com 401 linhas;
- `facebook`: 6 linhas autorizadas;
- `tiktok` e `youtube`: continuam permitidos pela constraint;
- unique constraint, RLS, policy, views, funções e triggers preservados;
- nenhum delete/truncate/backfill;
- nenhum outro tenant/target/rede alterado;
- migration total: uma, exclusivamente `chk_platform`.

### 12. Segurança

- RapidAPI key somente em memória;
- nenhum secret no código, migration, relatório ou Git;
- somente seis posts do target autorizado;
- nenhum deploy, n8n, cron, scheduler ou Vercel;
- advisors pós-DDL executados; achados preexistentes não foram ampliados nem corrigidos fora do escopo.

### 13. Testes finais

- Facebook + regressões dirigidas Instagram/X: 10 arquivos, 77 testes, PASS;
- teste específico da migration e preservação de plataformas: PASS;
- TypeScript: PASS;
- ESLint dirigido: PASS;
- `git diff --check`: PASS;
- build Next.js: PASS.

### 14. Blockers

Nenhum blocker funcional ou estrutural remanescente para o Bloco 2.

### 15. Matriz final do Bloco 2D

| Critério | Resultado |
|---|---|
| CHK_PLATFORM_FACEBOOK | PASS |
| ACCOUNT_IDENTITY | PASS |
| COLLECTION_RUNTIME | PASS |
| REAL_PERSISTENCE | CONFIRMED |
| REAL_IDEMPOTENCY | CONFIRMED |
| COLLECTION_LINEAGE | CONFIRMED |
| FACEBOOK_BACKEND_READ | CONFIRMED |
| TENANT_ISOLATION | PASS |
| INSTAGRAM_REGRESSION | PASS |
| X_REGRESSION | PASS |
| TYPECHECK | PASS |
| ESLINT | PASS |
| BUILD | PASS |
| SECURITY | PASS |

### 16. Veredito final

# GO

O Bloco 2 está funcionalmente encerrado. Este GO não autoriza iniciar o Bloco 3, realizar deploy ou automatizar a coleta. Aguardar auditoria independente do Claude.

---

## Bloco 2E — Correção P1 Cross-Tenant Atomic Guard

A auditoria Claude identificou uma janela TOCTOU entre a consulta de ownership e o upsert em `social_posts`. O fluxo foi substituído pela RPC `public.persist_facebook_social_posts`, que decide o conflito atomicamente no banco e preserva a unique key consolidada.

- cross-tenant: `FACEBOOK_CROSS_TENANT_POST_CONFLICT`;
- mesmo client com target/account divergente: `FACEBOOK_POST_CONTEXT_CONFLICT`;
- RPC `SECURITY INVOKER`, `search_path=''`, executável somente por `service_role`;
- cinco corridas cross-tenant reais: exatamente um vencedor em 5/5;
- corrida same-tenant real: duas chamadas bem-sucedidas, uma linha final;
- zero resíduos sintéticos após limpeza;
- baseline final: Facebook 6, Instagram 656, X 401, zero duplicidades globais;
- suíte completa: 1.266 testes PASS; lint e build PASS.

Relatório detalhado: `FACEBOOK_BLOCO2E_ATOMIC_TENANT_FIX.md`.

`VEREDITO_CODEX = READY_FOR_CLAUDE_REVALIDATION`

Não avancei para o Bloco 3.
