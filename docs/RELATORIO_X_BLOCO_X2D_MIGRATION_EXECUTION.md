# Relatório — X Bloco X.2D — Migration Execution

Data: 2026-08-21 (captura do banco: 2026-08-22 02:05:57 UTC)

Projeto Supabase: `hhhwuajptkyposarfbzn`

Branch local: `codex/x-bloco-x2b`

Decisão: **BLOCKED**

## 1. Baseline

| Medida | Valor |
|---|---:|
| `social_posts` | 1.036 |
| posts X | 384 |
| posts Instagram | 652 |
| `tweet_replies` | 353 |
| `instagram_comments` | 126.137 |
| `ai_analysis` | 1.045 |

Banco `postgres`, PostgreSQL 17.6. Nenhum secret foi consultado ou impresso.

## 2. Snapshot

Antes de qualquer tentativa de DDL foram capturados via catálogo: data/hora, versão, colunas, constraints, índices, estado de RLS, policies e contagens das tabelas afetadas e compartilhadas. Estado relevante:

- RLS ligada: `social_posts`, `instagram_comments`, `ai_analysis`, `targets`, `social_accounts`;
- RLS desligada: `tweet_replies`;
- policies existentes nas tabelas de conteúdo: somente service role;
- `social_posts.target_id` e `social_account_id`: `NOT NULL`;
- `social_post_targets`: inexistente;
- `content_origin`: inexistente;
- colunas X V2 de replies: inexistentes.

Não havia ferramenta de dump binário disponibilizada. O snapshot de catálogo e baseline foi considerado a forma segura disponível; nenhuma credencial foi extraída.

## 3. Prechecks

Todos os gates obrigatórios passaram:

| Check | Resultado |
|---|---:|
| duplicidade `(lower(platform), platform_post_id)` | 0 |
| posts com `client_id` nulo | 0 |
| target órfão | 0 |
| account órfã | 0 |
| post/target client mismatch | 0 |
| post/account client mismatch | 0 |
| account/post target mismatch | 0 |
| reply com post órfão | 0 |
| reply com target órfão | 0 |
| reply/post target mismatch | 0 |
| reply sem client derivável do post | 0 |
| reply/target client mismatch | 0 |
| duplicidade IA `(content_type, content_id)` | 0 |

O índice foi reconfirmado: `uq_ai_analysis_content`, unique em `(content_type, content_id)`.

As 12 análises de posts sem `social_posts` correspondente foram registradas separadamente e não alteradas, conforme instrução.

## 4. Phase 1

Foi submetida exatamente a Phase 1 aprovada, com o identificador planejado `x_v2_phase1_structure`. O mecanismo de segurança recusou a operação **antes de executá-la**, pois a fase criaria uma tabela em `public` sem habilitar RLS atomicamente.

Erro real resumido: criação de tabela pública sem RLS produziria uma fraqueza de segurança persistente; RLS precisaria ser aplicada atomicamente ou antes da exposição.

O SQL não foi modificado, repartido, contornado ou combinado com a Phase 5, porque o X.2D proíbe redesenho e determina parada em qualquer falha de DDL.

## 5. Phase 2

Não executada. Nenhum backfill ocorreu.

## 6. Phase 3

Não executada, pois a Phase 1 não foi aplicada.

## 7. Phase 4

Não executada. Nenhuma constraint ou índice novo foi criado.

## 8. Phase 5

Não executada. Nenhuma policy ou configuração de RLS foi alterada.

## 9. RLS

Permanece no estado inicial. Em particular, `tweet_replies` continua com RLS desligada e `social_post_targets` não existe.

## 10. Permissions

Testes anon/authenticated/service role não foram executados porque não existe schema migrado a testar. Nenhuma permissão foi alterada.

## 11. Cross-tenant

Teste de rejeição não executado porque as FKs compostas não foram criadas. O baseline read-only confirmou zero inconsistências atuais.

## 12. Instagram regression

Não foi necessária regressão pós-migration porque nenhuma alteração atingiu o banco. A verificação imediata confirmou os mesmos 652 posts e 126.137 comentários Instagram.

## 13. X Legacy regression

Nenhuma alteração atingiu X Legacy. Os 384 posts X e 353 replies permanecem no estado anterior. Radar X não foi ativado ou modificado.

## 14. Tests

Testes de aplicação não foram executados: não houve schema novo nem mudança de código para validar. Avançar para testes após um checkpoint de DDL rejeitado contrariaria a ordem do bloco.

## 15. Build

Não executado pelo mesmo motivo: a execução foi encerrada no Checkpoint Phase 1, sem alteração de aplicação.

## 16. Post-checks

Foi feito apenas o post-check de não aplicação:

- `social_post_targets`: inexistente;
- `content_origin`: inexistente;
- `tweet_replies.client_id`: inexistente;
- `social_posts.target_id`: continua `NOT NULL`;
- `social_posts.social_account_id`: continua `NOT NULL`;
- contagens de posts, replies e comentários: inalteradas;
- histórico `x_v2_phase1_structure`: inexistente.

Isso prova que não houve DDL parcial.

## 17. Idempotency

Não testada, porque a tabela/constraint de associação não existe. Nenhum fixture foi criado.

## 18. Divergências

A migration aprovada separa criação da tabela (Phase 1) e habilitação de RLS (Phase 5). O controle de segurança exige que uma tabela criada em schema exposto tenha RLS no mesmo ato, evitando uma janela vulnerável. Essa exigência é incompatível com a ordem aprovada sem alterar o SQL/faseamento.

Resolução requer nova aprovação humana para uma das alternativas:

1. incorporar `ENABLE ROW LEVEL SECURITY`, grant e policy service-role-only de `social_post_targets` à mesma migration/transação da Phase 1; ou
2. aprovar outra forma que garanta ausência de janela sem RLS.

Nenhuma alternativa foi aplicada automaticamente.

## 19. Estado final

Banco e aplicação permanecem no estado anterior ao X.2D. Não houve migration, backfill, DDL, DML, policy, rollback, deploy, n8n, Search/Mentions, IA, schedule ou cutover.

Os relatórios paralelos não rastreados no working tree foram preservados.

## 20. Decisão

**BLOCKED — PHASE 1 SECURITY GATE.**

Prechecks: PASS. Aplicação: não iniciada. Nenhum rollback é necessário porque nenhuma operação foi executada. É necessária aprovação humana de uma revisão mínima do faseamento para habilitar RLS de `social_post_targets` atomicamente com sua criação.
