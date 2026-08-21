# PolitixOS — Instagram — Bloco 3B.2 — Pipeline V2 Shadow

Data: 2026-08-21  
Branch: `codex/instagram-pipeline-v2-3b2`  
Status: **GO WITH LIMITATIONS para shadow manual; NO-GO para schedule automático**

## 1. Resumo executivo

O Pipeline V2 foi criado como workflow independente, não publicado e com schedule interno desativado. Duas execuções controladas idênticas passaram sem duplicidades, órfãos, `client_id` nulo ou regressão no X. O Legacy permaneceu ativo e estruturalmente inalterado. O schedule V2 não foi ativado porque a agregação dos contadores de estágio ainda subcontabiliza os posts e a amostra controlada não exercitou replies reais.

## 2. Pre-flight

**PASS.** Git limpo/alinhado, banco íntegro, Legacy ativo, LAB 3B.1 desativado e produção respondendo. Evidência: Git, banco, n8n e produção.

## 3. Baseline Git

- Base sincronizada: `2bd9c69`.
- Diferença para `origin/main` no pre-flight: `0/0`.
- Branch criada: `codex/instagram-pipeline-v2-3b2`.
- Nenhum force, reset, rebase ou alteração de histórico.

## 4. Baseline banco

| Medida | Baseline |
|---|---:|
| clients | 1 |
| targets | 19 |
| social_accounts | 27 |
| social_posts | 1.033 |
| Instagram | 652 |
| X | 381 |
| instagram_comments | 125.985 |
| ai_analysis | 1.045 |
| collection_logs no pre-flight inicial | 2.600 |

Distribuição Instagram: 74 IMAGE, 473 REEL, 105 CAROUSEL. Nulos de `client_id`, órfãos e chaves naturais duplicadas: zero.

## 5. Baseline Legacy

- ID: `XaWHmrrnobud6La1`.
- Nome: `PolitixOS - automação - webrook`.
- Estado: publicado/ativo.
- Nós: 56, incluindo 5 sticky notes.
- Schedule: cinco triggers efetivamente configurados para 30 minutos; o nome visual ainda diz “90min”.
- Versão publicada/fingerprint disponível: `0cfd6ecc-a377-492b-9b25-c3280782c06a`.
- Publicação: 2026-08-21 00:07:33, `Bloco 2: escopo por client_id no trigger manual (4 entry nodes)`.

## 6. Arquitetura V2

Dois triggers convergem para configuração/guardrails, carregamento de contas Instagram e validação de tenant. A partir daí: core `/user/posts`; core `/post/comments`; enriquecimento seletivo `/post`; replies seletivas `/post/comment/replies`; upserts idempotentes; logs V2.

## 7. Workflow ID V2

- Workflow válido: `IjcU6bLAWv4QJfJy`.
- Rascunho isolado e não executável após import incremental inesperado: `4zyT02YS5XLoxB7k`, renomeado para `DRAFT INVALID (não executar)`, não publicado. Não foi apagado para preservar rastreabilidade.

## 8. Nodes

Workflow válido: 26 nós. Inclui trigger manual, schedule desativado, configuração, carga/validação de tenant, core de posts/comentários, enrichment, replies, upserts e logs por estágio.

## 9. Endpoints

- ON: `/user/posts`, `/post/comments`.
- SELECTIVE: `/post`, `/post/comment/replies`.
- OFF: `/user/reels`, `/media/transcript`, Stories e Highlights.

## 10. Credenciais

Somente referências do cofre n8n:

- Supabase `supabaseApi`: `62RqY3LtKsmVwNjf`.
- RapidAPI Header Auth: `uFExF6u1ruQ1MUb1`.

Nenhuma chave, JWT, bearer token ou valor secreto está no JSON versionado.

## 11. Estratégia multi-tenant

`social_accounts` fornece `id`, `target_id`, `handle` e `client_id`. O node `Validate Tenant Scope` recusa contas sem os quatro campos. Não existe fallback de cliente nem primeiro cliente global silencioso.

## 12. Estratégia de idempotência

- Posts: `on_conflict=platform,platform_post_id`.
- Comentários/replies: `on_conflict=instagram_comment_id`.
- `Prefer: resolution=merge-duplicates`.

## 13. Estratégia de comments

`/post/comments` permanece fonte canônica. Preview de `/post` não substitui a coleta principal.

## 14. Estratégia de replies

Somente comentários cujo `raw_json` sinaliza filhos são candidatos. Replies reutilizam `instagram_comments` e recebem `parent_comment_id`. Paginação está limitada a uma página até evidência real de cursor/`has_more`.

## 15. Estratégia de enrichment

Somente REEL/CAROUSEL são elegíveis. IMAGE fica fora por padrão. Falha de `/post` não invalida o post core. O payload complementar é preservado sob `raw_json._v2_enrichment`; nenhuma coluna canônica adicional foi criada.

## 16. Endpoints deliberadamente excluídos

`/user/reels`, `/media/transcript`, Stories e Highlights não constam na definição. Confirmado por código e n8n.

## 17. IA OFF

Zero nodes OpenAI, Anthropic, Gemini, embeddings ou análise narrativa. `ai_calls=0` nos metadados V2.

## 18. Migrations

Aplicada `instagram_replies_parent_bloco_3b2`: coluna nullable `instagram_comments.parent_comment_id`, índice parcial e FK self-reference `NOT VALID`, `ON DELETE SET NULL`. Rollback versionado. Nenhum `NOT NULL`, rewrite histórico ou operação destrutiva.

## 19. Logs

`collection_logs.metadata.pipeline_version='v2'`, `shadow_mode=true`, estágio e limites internos. Três logs V2 reais foram gravados durante a construção/testes.

## 20. API call counters

Campos previstos: `calls_user_posts`, `calls_post_comments`, `calls_post_enrichment`, `calls_replies`, `ai_calls`. Limitação: o log final de posts subcontabilizou 3 itens como 1; por isso o schedule não foi ativado.

## 21. Guardrails

Teste/manual atual: 1 target, 3 posts, 1 página de comments, 1 página de replies e 1 enrichment. Todos rotulados `INTERNAL_SAFETY_LIMIT`, não como limite oficial da API.

## 22. Tratamento de erros

HTTP nodes usam continuação de output; enrichment/replies não bloqueiam o core. Ausência estrutural de conta/tenant válido interrompe explicitamente.

## 23. Teste manual

Execução válida `27347`, 2026-08-21 13:56:57 BRT, sucesso em 4,736 s: 1 target, 3 posts core e 1 enrichment elegível. A amostra não gerou comentários/replies novos.

## 24. Execução n8n real

- Diagnóstica: `27346`, sucesso em 7,123 s; revelou limite e log inadequados e foi substituída pelo workflow válido.
- Controlada válida: `27347`, sucesso em 4,736 s.
- Idempotência: `27348`, sucesso em 4,538 s.

## 25. Payloads relevantes sanitizados

O payload bruto de discovery continua em `raw_json`; enrichment fica em `raw_json._v2_enrichment`. Nenhum payload sensível foi copiado ao relatório.

## 26. Teste de idempotência

Execução `27348` repetiu o mesmo cenário. Totais permaneceram: 1.033 posts, 652 Instagram, 381 X e 125.985 comentários. Duplicidades de posts e comentários: zero.

## 27. SQL antes/depois

Antes e depois das duas execuções válidas: posts/comentários estáveis; `collection_logs` aumentou somente pelos logs legítimos V2/Legacy. A nova coluna existe; zero replies persistidas na amostra.

## 28. Validação X

381 registros antes/depois; zero com `content_type` alterado; nenhum registro X inserido, removido ou reclassificado pelo V2.

## 29. Validação Legacy

Estado final confirmado por n8n: publicado, 56 nós e 5 schedules. Nenhum node/conexão/configuração do Legacy foi editado.

## 30. Testes

`node scripts/validate-instagram-pipeline-v2.mjs`: PASS, 26 nós; V2 desativado; IA/endpoints proibidos/segredos ausentes; migration aditiva.

## 31. Build

`npm run build`: PASS fora do sandbox; compilação 4,4 s, geração das 22 páginas estáticas concluída. A primeira tentativa falhou apenas porque o sandbox impediu o Turbopack de abrir porta interna.

## 32. Typecheck

TypeScript executado dentro do build: PASS em 5,6 s.

## 33. Custos confirmados

Nenhum preço/quota de RapidAPI foi confirmado. IA incremental: zero chamadas.

## 34. Custos não confirmados

Valor financeiro das chamadas RapidAPI permanece NÃO CONFIRMADO. Somente volume instrumentado pode ser conciliado após corrigir a agregação.

## 35. Riscos

- Agregação dos counters ainda incompleta.
- Paginação de replies grandes não confirmada.
- Replies não exercitadas na amostra 1×3.
- Rascunho inválido permanece desativado para rastreabilidade.

## 36. Limitações

Shadow validado somente manualmente. Não há evidência suficiente para schedule automático nem comparação quantitativa completa Legacy versus V2.

## 37. Rollback

Manter V2 despublicado/desativado já elimina efeito operacional. Para schema, executar `supabase_rollback_instagram_replies_parent.sql` somente após confirmar que nenhuma reply foi persistida. Legacy continua sendo o pipeline oficial.

## 38. Shadow readiness

**GO WITH LIMITATIONS para novas execuções manuais controladas. NO-GO para ativação automática.**

## 39. Matriz GO/NO-GO

| Item | Decisão |
|---|---|
| Core `/user/posts` | GO |
| Core `/post/comments` | GO, sem novos comentários na amostra |
| `/post` seletivo | GO |
| Replies seletivas | GO estrutural / NÃO CONFIRMADO por execução desta amostra |
| Idempotência | GO |
| Schedule automático | NO-GO nesta rodada |
| Cutover | PROIBIDO / não executado |

## 40. Commits

- `886713d` — workflow, migration, rollback e validação estrutural.
- Commit deste relatório: registrado pelo Git após a escrita deste documento.

## 41. Arquivos alterados

- `n8n/instagram-pipeline-v2-shadow.json`
- `scripts/validate-instagram-pipeline-v2.mjs`
- `supabase_migration_instagram_replies_parent.sql`
- `supabase_rollback_instagram_replies_parent.sql`
- este relatório

## 42. Migrations aplicadas

`instagram_replies_parent_bloco_3b2`: aplicada com sucesso no projeto `hhhwuajptkyposarfbzn`.

## 43. Estado final V2

Workflow `IjcU6bLAWv4QJfJy`: 26 nós, não publicado, schedule desativado, duas execuções válidas bem-sucedidas. Shadow manual disponível; automático bloqueado.

## 44. Estado final Legacy

ACTIVE, PUBLISHED, PRODUCTION, 56 nodes, 5 schedules, inalterado.

## 45. Recomendação para 3B.3

Corrigir a agregação de counters; executar amostra controlada que contenha comentários com replies; validar paginação/cursor; repetir idempotência; só então submeter a ativação automática e qualquer comparação/cutover à auditoria independente.
