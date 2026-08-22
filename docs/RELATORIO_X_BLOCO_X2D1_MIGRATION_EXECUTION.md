# Relatório — X Bloco X.2D.1 — Migration Execution

Data: 2026-08-21/22

Projeto Supabase: `hhhwuajptkyposarfbzn`

Branch: `codex/x-bloco-x2b`

Decisão: **PASS WITH LIMITATIONS**

## 1. Security gate anterior

O X.2D foi bloqueado antes de qualquer DDL porque a Phase 1 criaria `public.social_post_targets` e deixaria RLS para a Phase 5. O pós-check comprovou zero aplicação parcial e nenhum histórico da migration recusada.

## 2. Revisão aprovada

`PROPOSTA_MIGRATION_X_V2_RELACOES_V2.md` recebeu a seção **SECURITY PHASING REVISION X.2D.1**. Somente o faseamento de segurança mudou: criação da tabela, RLS, grant CRUD à service role e policy service-role-only passaram para a mesma transação da Phase 1. As decisões arquiteturais permaneceram intactas.

## 3. Prechecks atualizados

Reexecutados às 2026-08-22 02:13:05 UTC:

| Gate | Resultado |
|---|---:|
| external identity duplicates | 0 |
| posts com client nulo | 0 |
| target/account órfão | 0 / 0 |
| target/account/client mismatch | 0 |
| reply post/target órfão | 0 / 0 |
| reply/post target mismatch | 0 |
| reply tenant mismatch | 0 |
| AI duplicates | 0 |

Baseline: 1.036 posts, 384 X, 652 Instagram, 353 replies e 126.137 comentários Instagram. As 12 análises históricas órfãs foram apenas registradas e permanecem fora do escopo. `uq_ai_analysis_content(content_type, content_id)` foi reconfirmado.

## 4. Phase 1 revisada

Migration `x_v2_phase1_structure_rls_atomic`: PASS.

- `content_origin` criado;
- `target_id` e `social_account_id` agora nullable;
- índices compostos de post/target + client criados;
- `social_post_targets` criada com quatro índices;
- quatro colunas V2 adicionadas a replies.

## 5. RLS atômica

`social_post_targets` foi criada, protegida e teve sua policy criada dentro da mesma transação. Não houve estado persistente intermediário: o commit torna criação e proteção visíveis atomicamente.

Validação imediata: RLS `true`, exatamente uma policy `service_role_full_access_social_post_targets`, zero policies para anon/authenticated.

## 6. Phase 2

Migration `x_v2_phase2_backfill`: PASS.

- 384 posts X classificados `OWNED` por evidência estrutural;
- 384 associações `owned / owned_profile` criadas;
- 353 replies receberam `client_id` derivado do post;
- 216 replies receberam parent external e conversation a partir do `raw_json`;
- zero parent UUID local foi inventado, pois os parents correspondentes não estão coletados.

## 7. Phase 3

Gate PASS:

- `owned_without_relation = 0`;
- `replies_without_client = 0`;
- `reply_cross_tenant = 0`;
- duplicidade N:N = 0.

Instagram permaneceu com 652 posts e 126.137 comentários durante o gate.

## 8. Phase 4

Migration `x_v2_phase4_constraints`: PASS.

- `tweet_replies.client_id NOT NULL`;
- FKs compostas post/client, target/client e parent/client criadas e validadas;
- parent FK limpa somente `parent_reply_id` em delete, preservando client;
- cinco índices requeridos presentes;
- CHECK de `content_origin` validado.

## 9. Phase 5

Migration `x_v2_phase5_tweet_replies_rls_atomic`: PASS.

RLS e `service_role_full_access_tweet_replies` foram aplicadas na mesma transação. Nenhuma policy anon/authenticated foi criada.

## 10. Permissions

| Papel | SELECT relações/replies | INSERT relações | INSERT replies |
|---|---|---|---|
| anon | 0 / 0 linhas visíveis | rejeitado `42501` | rejeitado `42501` |
| authenticated | 0 / 0 linhas visíveis | rejeitado `42501` | rejeitado `42501` |
| service role | permitido | permitido | permitido |

Service role completou SELECT, INSERT, UPDATE e DELETE controlados nas duas tabelas dentro de transação, terminando com zero fixtures.

## 11. Cross-tenant

O projeto possui apenas um client real. Foram usadas fixtures de segundo tenant dentro de uma transação com rollback integral.

- post client A + target client B: rejeitado pela FK composta;
- child client B + parent reply client A: rejeitado pela FK composta;
- fixtures/resíduos após rollback: zero.

## 12. Instagram regression

Banco: PASS. Permanecem 652 posts, 126.137 comentários, zero post Instagram sem target/account e zero comentário órfão. Queries/contratos direcionados passaram nos testes; build preservou `/dashboard/instagram`.

Validação visual completa (cards, filtros, drawer e KPIs) ficou limitada: o navegador local alcançou corretamente `/login`, mas não havia sessão autenticada disponível no host local. Nenhuma credencial foi solicitada, lida ou inventada.

## 13. X Legacy regression

Banco e aplicação: PASS. Os 384 owned posts continuam com `target_id` e `social_account_id`; zero referência Legacy ausente. Testes direcionados X passaram e build preservou `/dashboard/x`.

Verificação read-only no n8n confirmou `Radar X` não publicado/sem ativação e o schedule do Pipeline X V2 explicitamente **Deactivated**. Nenhum workflow foi executado ou alterado.

## 14. Tests

- direcionados X/Instagram: 28/28 PASS;
- Vitest completo: 1.193 PASS, 5 skips preexistentes;
- TypeScript `--noEmit`: PASS;
- ESLint dos contratos X.2B/X.2D: PASS.

Lint ampliado das queries Legacy encontrou 9 erros e 1 warning históricos (`any`, `prefer-const`, variável não usada) em `instagram.ts` e `x.ts`. Esses arquivos não foram alterados; correção ficou fora do escopo.

## 15. Build

Production build Next.js 16.2.6/Turbopack: PASS fora da restrição de sandbox. A primeira tentativa isolada falhou porque o sandbox impediu criação de processo/bind de porta, não por código. A repetição autorizada compilou, executou TypeScript, gerou 22 páginas estáticas e preservou as rotas dinâmicas Instagram/X.

## 16. Idempotency

Uma associação owned existente foi reinserida com `ON CONFLICT (post_id,target_id,match_type,match_term) DO NOTHING`. Retorno: zero inserts; total permaneceu 384. Constraint `social_post_targets_identity_key` confirmada.

## 17. Post-checks

| Check final | Resultado |
|---|---:|
| X posts / OWNED | 384 / 384 |
| X owned sem refs Legacy | 0 |
| relações / owned | 384 / 384 |
| relações duplicadas | 0 |
| relações cross-tenant | 0 |
| replies / client nulo | 353 / 0 |
| reply órfã/cross-tenant | 0 / 0 |
| parent cross-tenant | 0 |
| parent external / local | 216 / 0 |
| conversation | 216 |
| FKs compostas validadas | 3 |
| RLS relações/replies | true / true |
| policies service role | 2 |
| policies anon/authenticated | 0 |
| AI duplicates | 0 |
| AI órfãs históricas | 12, inalteradas |
| resíduos de teste | 0 |

## 18. Estado final

Banco preparado para external posts, N:N, reply tenant/hierarquia/conversation e IA idempotente pelo índice existente. Phase 6 operacional não foi executada. Nenhum external post real foi persistido por Search/Mentions.

Não houve mudança em n8n, RapidAPI, credenciais, IA, UX, schedule ou cutover.

## 19. Limitações

1. Regressão visual autenticada de dashboard/drawer não pôde ser concluída sem sessão local; regressões de banco, queries, contratos e build passaram.
2. Lint completo das queries Legacy continua vermelho por dívida preexistente, enquanto o lint dos arquivos do contrato novo passa.
3. Há apenas um tenant real; o teste de segundo tenant foi transacional e totalmente revertido.
4. As 12 análises órfãs históricas permanecem para investigação separada.

## 20. Decisão

**PASS WITH LIMITATIONS.** Migration, segurança, backfills, constraints, RLS, permissões, cross-tenant, idempotência, dados Instagram/X, testes, TypeScript e build passaram. A classificação não é PASS pleno exclusivamente pela ausência de sessão para regressão visual autenticada e pelo lint Legacy histórico fora do escopo.

STOP cumprido: X.2E não iniciado; Claude não chamado; workflow/Search/IA/schedule/cutover não executados.
