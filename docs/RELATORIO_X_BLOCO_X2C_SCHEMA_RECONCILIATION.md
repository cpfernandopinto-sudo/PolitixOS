# Relatório — X Bloco X.2C — Schema Reconciliation

Data: 2026-08-21

Branch: `codex/x-bloco-x2b`

Decisão: **READY WITH CONDITIONS**

## 1. Divergência `ai_analysis` resolvida

Resposta objetiva: **existe unicidade efetiva, mas não uma unique constraint**.

- `pg_constraint`: somente `ai_analysis_pkey` é unique por natureza; não há constraint `(content_type, content_id)`.
- `pg_indexes`: existe o **unique index** `uq_ai_analysis_content`, definição exata `CREATE UNIQUE INDEX uq_ai_analysis_content ON public.ai_analysis USING btree (content_type, content_id)`.
- `information_schema`: `content_type` e `content_id` são `NOT NULL`; `client_id` é nullable, mas o baseline tem zero nulos.
- Baseline: 1.045 análises, zero duplicidade tanto por `(content_type,content_id)` quanto por `(client_id,content_type,content_id)`.

Conclusão: X.2B descreveu corretamente a unicidade; X.2A consultou corretamente constraints, mas a conclusão “sem proteção nativa” ignorou o índice único. PostgREST pode usar as colunas desse índice como alvo de conflito. Nenhum novo índice de IA é necessário.

Foram observadas 12 análises `content_type='post'` sem `social_posts` correspondente. Isso não contradiz a unicidade e não será saneado neste bloco; requer investigação separada antes de qualquer FK futura.

## 2. Modelo de external post

Escolha: **Opção A — manter `social_posts` canônica e tornar `social_account_id`/`target_id` nullable**.

Opção B (`x_external_posts`) duplicaria identidade, métricas, IA, queries e dedup; também criaria reconciliação permanente entre owned e external quando o mesmo ID aparece por profile/search. Uma tabela de autores externos agora seria prematura. O payload/autor permanece em `raw_json` e no contrato V2.

## 3. `target_id`

Para external post, `social_posts.target_id=NULL`. Não haverá “primeiro target” arbitrário. `social_post_targets` é a fonte de verdade; um único post pode ter várias associações do mesmo tenant. Posts owned mantêm o target atual.

## 4. `social_account_id`

Para external post, `social_account_id=NULL`. `social_accounts` representa contas monitoradas e não será contaminada com autores externos. Posts owned permanecem inalterados.

## 5. N:N

`social_post_targets` contém post, target, client, match type, match term, discovery source e created_at. `source` foi materializado como `discovery_source` porque profile/search/mention muda auditoria operacional. `created_at` já cobre descoberta; confidence e query ID foram descartados por falta de consumidor atual.

Idempotência usa unique `(post_id,target_id,match_type,match_term)`. FKs compostos `(id,client_id)` em post e target impedem associação cross-tenant mesmo com service role.

## 6. `content_origin`

Valores: `OWNED`, `EXTERNAL`, `QUOTE`, `REPOST`, via CHECK. Origem desconhecida é `NULL`, não string `UNKNOWN`. Isso preserva legado sem fabricar classificação.

## 7. Replies

Adicionar `client_id`, `parent_reply_external_id`, `parent_reply_id` e `conversation_id`. O parent externo é a evidência primária; o UUID local é opcional e preenchido apenas quando o parent já existe no mesmo tenant. A FK local é composta por `(parent_reply_id, client_id)`, impedindo parent cross-tenant. Isso evita uma FK impossível quando o provider entrega o filho antes do parent.

Baseline atualizado: 353 replies, zero órfãos, zero mismatch de target e zero inconsistência de tenant derivada do post. Logo o backfill `reply -> post.client_id` é determinístico e permite propor `NOT NULL` somente após validação.

## 8. RLS

Estado real: RLS ligada em `social_posts`, `instagram_comments`, `ai_analysis` e `targets`; desligada em `tweet_replies`. As tabelas seguras possuem apenas policy `service_role ... ALL USING(true) WITH CHECK(true)` quando há policy; não existe policy direta para anon/authenticated.

Proposta: ligar RLS em replies e na relação nova, com policy exclusiva para service role. `anon` e `authenticated` ficam sem acesso direto. Backend e n8n usam service role; a aplicação server-side continua responsável por `client_id + allowedTargetIds`. FKs compostos adicionam defesa estrutural contra associação cross-tenant.

A documentação/changelog atual do Supabase também exige distinguir grants, exposição ao Data API e RLS. A migration concede CRUD da relação nova somente à service role; a exposição PostgREST deve ser confirmada antes do enablement, sem liberar anon/authenticated.

## 9. AI idempotency

Identidade escolhida: `(content_type, content_id)`, já garantida por `uq_ai_analysis_content`. UUID de conteúdo identifica globalmente a linha canônica dentro da tabela indicada por content type. Incluir `client_id` enfraqueceria a proteção ao permitir duas análises do mesmo conteúdo se um client incorreto fosse enviado.

O upsert deve validar/derivar `client_id` e `target_id` do conteúdo persistido; não confiar em valores livres do pipeline. Para post externo multi-target, a análise continua sendo do conteúdo, compartilhada pelas associações. Análise específica por target exigiria outro modelo e não foi solicitada.

## 10. Backfill

Há agora 384 posts X. Os 384 têm account, target e client consistentes; 3 possuem evidência explícita `_v2_origin='owned'`. O conjunto inteiro tem prova estrutural suficiente: conta social X existente, mesma plataforma, target e client. O backfill marca apenas esses registros como `OWNED` e cria uma associação `owned` idempotente por post.

External mentions ainda não persistidas não entram no backfill. Replies recebem client a partir do post e metadados parent/conversation de `raw_json` quando presentes.

## 11. Impactos

- **Queries:** Instagram filtra `platform='instagram'`; X Legacy filtra X/Twitter e target. Nenhuma query encontrada faz inner join obrigatório por `social_account_id`. External posts com target nulo não entram no Legacy até a query V2 usar a N:N.
- **UI/components:** nenhum componente de dashboard acessa `social_posts.social_account_id`. Componentes de candidatos tratam a lista de `social_accounts`, não o FK dos posts.
- **Instagram:** registros e constraints existentes permanecem; nenhuma linha Instagram é backfilled ou alterada. Nullabilidade nova não muda valores atuais.
- **X Legacy:** owned posts mantêm account/target; comportamento atual preservado.
- **FK/RLS:** FKs atuais aceitam NULL após a mudança. Relação nova e replies recebem isolamento composto por client. RLS segue o padrão service-role-only real.
- **Analytics/IA:** IA continua vinculada ao post único; queries V2 precisam usar a relação para filtrar external por target.
- **Tests/server actions:** não foram encontrados server actions nem testes que exijam non-null nesses campos. A aplicação V2 deverá cobrir external, dois targets e cross-tenant antes de enablement.

## 12. Migration final

Entregue em `docs/PROPOSTA_MIGRATION_X_V2_RELACOES_V2.md`, dividida em seis fases: estrutura, backfill, validação, constraints, RLS e enablement. Nenhum SQL foi colocado em diretório de migrations e nada foi executado.

## 13. Rollback

Antes da primeira gravação external, rollback estrutural ainda é possível mediante checks de nulidade. Após o primeiro external real, a volta para `NOT NULL` ou remoção de N:N perderia semântica; o rollback seguro passa a ser desligar consumidores e corrigir forward-only, preservando dados.

## 14. Riscos

1. Aplicar `NOT NULL` em replies antes de validar o backfill bloquearia a migration.
2. Service role ignora RLS; tenant scope incorreto no pipeline ainda é perigoso. FKs compostos mitigam associações, não leituras amplas.
3. External post sem qualquer associação seria invisível por target; o pipeline deve tratar post + associações como unidade operacional.
4. Os 12 AI posts órfãos indicam dívida histórica que não deve ser misturada a esta migration.
5. Soft failure HTTP 200 sem timeline é problema do pipeline/telemetria, não do schema. A interface futura deve classificá-lo como `SOFT_FAILURE`; migration não presume que HTTP 200 contém dados úteis.
6. Alterar nullabilidade é compartilhado com Instagram; a regressão multicanal é condição de aplicação, embora nenhum consumidor atual assuma non-null.

## 15. Decisão

**READY WITH CONDITIONS.** O SQL está pronto para revisão humana, não para execução automática. Condições: snapshot/backup; repetir todos os pré-checks; resolver qualquer divergência não-zero; revisão de DBA/Supabase das policies e locks; aplicar fase a fase com pós-checks; atualizar pipeline/aplicação somente na Phase 6; executar regressão Instagram/X Legacy e teste real de dois tenants antes de qualquer schedule/cutover.

STOP cumprido: nenhuma migration, DDL, DML, policy, deploy, n8n ou cutover foi executado.
