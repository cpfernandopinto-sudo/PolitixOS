# RELATÓRIO — INSTAGRAM BLOCO 3B.3 — HARDENING + SHADOW AMPLIADO 01

Data: 2026-08-21  
Branch: `codex/instagram-pipeline-v2-3b3`  
Decisão: **GO WITH LIMITATIONS para auditoria; NO-GO para 3B.4/cutover**

## 1. Checkpoint A e resíduos locais

- Os arquivos `supabase_migration_instagram_pipeline_shadow.sql` e `supabase_rollback_instagram_pipeline_shadow.sql` eram untracked, nunca commitados, sem referência em arquivo rastreado ou workflow n8n.
- Nenhuma migration correspondente constava no histórico do Supabase e nenhuma das tabelas `instagram_pipeline_shadow_runs`, `instagram_pipeline_shadow_posts`, `instagram_pipeline_shadow_comments` ou `instagram_pipeline_shadow_events` existia.
- Nenhum SQL ou rollback foi executado; nenhuma tabela foi removida. Somente os dois resíduos locais autorizados foram excluídos.
- Checkpoint A: PASS. Base `codex/instagram-pipeline-v2-3b2`, branch criada a partir dela, dois commits à frente e zero atrás de `origin/main` no início do bloco.

## 2. Estado preservado

- Legacy `XaWHmrrnobud6La1`: publicado, 56 nós e 5 schedules; não alterado nem desativado.
- Pipeline V2 `IjcU6bLAWv4QJfJy`: não publicado, 26 nós, schedule interno desativado, IA ausente.
- Draft inválido `4zyT02YS5XLoxB7k`: não publicado e não alterado.
- Nenhuma migration, DDL, mudança de RLS, cutover ou ativação automática foi realizada.

## 3. Hardening implementado

- Contadores agora separam chamadas RapidAPI de itens descobertos/upsertados.
- Logs incluem `workflow_id`, `execution_id`, contadores de posts/comentários/replies/enriquecimentos, erros e warnings.
- O estágio de posts detecta erro tanto na normalização quanto na resposta PostgREST; falhas deixam de ser registradas como sucesso.
- Corrigido o parâmetro do endpoint `/user/posts` de `username` para `handle`, conforme erro real do provedor (`You must provide a handle`).
- Snapshot local e workflow n8n foram mantidos equivalentes.

## 4. Evidências reais de shadow

### Falha descoberta e corrigida

- Execuções `27362` e `27371`: 1 chamada, 0 itens; o erro era mascarado como sucesso.
- Execução `27372`: após o hardening, a mesma condição foi registrada corretamente como `status=error`, `errors_count=1`, `warnings_count=1`, mensagem `You must provide a handle`.

### S1 — 1 alvo, 3 posts

- Execução `27373`: sucesso; `calls_user_posts=1`, `rapidapi_calls_total=1`, `posts_discovered=3`, `posts_upserted=3`.
- Repetição idempotente `27374`: mesmos contadores e sucesso.
- Após a repetição: 1.033 posts totais, 652 Instagram, zero chaves duplicadas e zero órfãos.
- Checkpoint B: PASS.

### S2 — 1 alvo, 10 posts

- Execução `27375`: sucesso; `calls_user_posts=1`, `rapidapi_calls_total=1`, `posts_discovered=10`, `posts_upserted=10`, zero erros/warnings.
- Checkpoint C: PASS para o escopo executável de um alvo.

### S3 — múltiplos alvos

- **NOT CONFIRMED**: existe somente uma conta Instagram ativa. Contas inativas não foram reativadas nem processadas fora de escopo.

## 5. Replies e paginação

- Existem 208 comentários históricos com indicação bruta de filhos, porém pertencem a contas atualmente inativas.
- A única conta Instagram ativa não possui candidato histórico com reply.
- Nenhum payload foi fabricado e nenhum alvo inativo foi forçado.
- Persistência real de replies e paginação: **NOT CONFIRMED** neste bloco.
- `max_reply_pages=1` permanece como limite interno; não há alegação de paginação validada.

## 6. Baseline final e regressão multicanal

- `social_posts`: 1.033; Instagram: 652; X: 381.
- `instagram_comments`: 125.985; `ai_analysis`: 1.045; `collection_logs`: 2.619.
- Distribuição Instagram: 74 IMAGE, 473 REEL, 105 CAROUSEL.
- `client_id` nulo nas tabelas auditadas: 0.
- Duplicidades de posts/comentários: 0; comentários órfãos: 0.
- O aumento de `collection_logs` decorre das execuções manuais documentadas; dados de posts/comentários permaneceram estáveis.

## 7. Verificações técnicas

- Validador V2: PASS — 26 nós, V2 desativado, sem endpoints/IA/segredos proibidos e migration aditiva.
- `npm run build`: PASS, incluindo TypeScript e geração das rotas.
- Schedule automático: desativado. Legacy: preservado. Cutover: não executado.

## 8. Decisão

**GO WITH LIMITATIONS para auditoria independente do Bloco 3B.3.** O hardening de contadores/erros, S1, idempotência e S2 foram comprovados. **NO-GO para 3B.4/cutover** enquanto S3 multialvo, reply real e paginação real permanecerem não confirmados.

BLOCO 3B.3 ENCERRADO PARA AUDITORIA.  
Não avancei para o Bloco 3B.4.  
Aguardando auditoria independente do Claude e autorização.
