# POLITIXOS — Facebook Bloco 2E — correção P1 cross-tenant atômica

Data: 22/08/2026  
Branch: `codex/facebook-bloco1`  
Base/HEAD inicial: `1214e8398e2fd190cdd7a508aae92403910bd8a9`

## 1. Escopo

Correção exclusiva do P1 apontado em `CLAUDE_AUDIT_FACEBOOK_BLOCOS1_2.md`: a persistência fazia uma leitura de ownership e, em outra operação, o upsert, deixando uma janela TOCTOU na chave consolidada `(platform, platform_post_id)`.

Não houve início do Bloco 3, deploy, alteração de workflow, n8n, cron, UX, provider ou credenciais.

## 2. Achado Claude e causa raiz

O achado foi corretamente confirmado. A leitura de `client_id` e o `upsert` eram duas requisições independentes. A unique key impedia duas linhas, mas não impedia que o segundo writer atualizasse os campos de ownership da linha criada pelo primeiro. Portanto, a checagem no Node não constituía uma garantia sob concorrência.

## 3. Solução implementada

- criada a migration aditiva `facebook_atomic_tenant_persistence` (`20260822215815`);
- criada a RPC `public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb)`;
- a aplicação deixou de executar SELECT + UPSERT separados e passou a chamar exclusivamente a RPC;
- o insert/upsert e a verificação de ownership agora ocorrem atomicamente no banco;
- a chave `UNIQUE (platform, platform_post_id)` foi preservada;
- updates somente são aceitos quando `client_id`, `target_id` e `social_account_id` coincidem;
- conflito entre clientes gera deterministicamente `FACEBOOK_CROSS_TENANT_POST_CONFLICT`;
- mesmo cliente com target ou social account diferentes falha fechado com `FACEBOOK_POST_CONTEXT_CONFLICT`;
- lotes vazios, inválidos, duplicados ou acima de 100 itens falham fechado;
- o contexto é validado contra target ativo e conta Facebook ativa antes da persistência.

SQL central:

```sql
on conflict (platform, platform_post_id) do update
set ...
where social_posts.client_id = excluded.client_id
  and social_posts.target_id = excluded.target_id
  and social_posts.social_account_id = excluded.social_account_id
returning 1;
```

Quando o `RETURNING` não cobre o lote completo, a função consulta o owner vencedor já consolidado e lança o erro determinístico apropriado. A exception reverte toda a chamada, inclusive eventuais alterações anteriores do mesmo lote.

## 4. Segurança da RPC

- `SECURITY INVOKER`;
- `search_path=''`;
- EXECUTE revogado de `PUBLIC`, `anon` e `authenticated`;
- EXECUTE concedido somente a `service_role`;
- verificação real: `anon=false`, `authenticated=false`, `service_role=true`;
- RLS de `social_posts` permaneceu ativa;
- nenhuma policy, tabela, trigger, constraint ou índice foi alterado.

Os advisors foram executados antes e depois. A função nova não gerou alerta de `search_path`; achados históricos fora do escopo permaneceram inalterados. Referência do linter: https://supabase.com/docs/guides/database/database-linter

## 5. Prova concorrente real

Foram criados temporariamente dois clients sintéticos, três targets e três social accounts, todos com UUIDs e marcadores exclusivos `CODEX-FB2E`.

### Cross-tenant

Cinco IDs sintéticos diferentes receberam duas chamadas realmente concorrentes, uma por tenant:

- 5/5 corridas produziram exatamente um vencedor;
- 5/5 chamadas perdedoras retornaram `FACEBOOK_CROSS_TENANT_POST_CONFLICT`;
- cada ID persistiu exatamente uma linha;
- nenhum ownership vencedor foi sobrescrito.

### Same-tenant

Duas chamadas concorrentes do mesmo client/target/social account para o mesmo ID:

- ambas retornaram sucesso;
- permaneceu exatamente uma linha;
- ownership permaneceu no contexto esperado.

### Mesmo cliente, contexto divergente

Uma chamada para o ID já existente usando o mesmo client, mas outro target/social account:

- retornou `FACEBOOK_POST_CONTEXT_CONFLICT`;
- nenhuma alteração de ownership ocorreu.

### Limpeza

Antes da exclusão, a rotina validou contagens e marcadores exatos. Foram removidos somente:

- 6 posts sintéticos;
- 3 social accounts sintéticas;
- 3 targets sintéticos;
- 2 clients sintéticos.

Auditoria após limpeza: zero resíduos sintéticos.

## 6. Baseline, idempotência e regressão multicanal

Após a prova e a limpeza:

| Verificação | Resultado |
|---|---:|
| Facebook | 6 |
| Facebook IDs distintos | 6 |
| Facebook `client_id` nulo | 0 |
| Facebook órfãos | 0 |
| Facebook divergências de contexto | 0 |
| Instagram | 656 |
| X | 401 |
| Duplicidades globais `(platform, platform_post_id)` | 0 |
| Resíduos sintéticos | 0 |

Fingerprint de ownership dos seis posts Facebook: `c86cb72fbcc0ec93184f289ea3996595`.

A idempotência ficou comprovada tanto nas duas chamadas concorrentes same-tenant quanto pela manutenção de uma única linha por chave e zero duplicidades globais.

## 7. Testes e qualidade

- testes focados iniciais: 6/6 PASS;
- teste estático da migration: 3/3 PASS;
- suíte completa: 144 arquivos PASS, 5 skipped;
- total: 1.266 testes PASS, 5 skipped;
- TypeScript: PASS no build;
- ESLint dirigido: PASS;
- `git diff --check`: PASS;
- Next.js build de produção: PASS.

## 8. Reversibilidade

A alteração de banco é somente uma função. O rollback técnico é:

```sql
drop function if exists public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb);
```

O rollback não foi executado. Nenhuma tabela ou dado real precisa ser removido para revertê-la.

## 9. Arquivos alterados

- `lib/facebook/persistence.ts`;
- `lib/facebook/persistence.test.ts`;
- `lib/facebook/atomic-persistence-migration.test.ts`;
- `supabase_migration_facebook_atomic_tenant_persistence.sql`;
- `FACEBOOK_BLOCO2E_ATOMIC_TENANT_FIX.md`;
- `FACEBOOK_BLOCO2_RELATORIO.md`.

## 10. Blockers

Nenhum blocker remanescente para a revalidação exclusiva do P1. Os P2/P3 da auditoria Claude não foram alterados e permanecem no backlog.

## 11. Matriz final

| Critério | Resultado |
|---|---|
| P1 TOCTOU removido | PASS |
| Conflito cross-tenant determinístico | PASS |
| Same-tenant idempotente sob concorrência | PASS |
| Mesmo client/contexto divergente fail-closed | PASS |
| Unique key preservada | PASS |
| RLS/policies preservadas | PASS |
| Regressão Facebook/Instagram/X | PASS |
| Limpeza sintética | PASS |
| Testes/lint/build | PASS |

## 12. Veredito

`VEREDITO_CODEX = READY_FOR_CLAUDE_REVALIDATION`

O Bloco 2E está encerrado no limite autorizado. Não avancei para o Bloco 3.
