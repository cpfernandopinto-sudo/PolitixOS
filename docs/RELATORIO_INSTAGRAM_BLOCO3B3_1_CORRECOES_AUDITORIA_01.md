# RELATÓRIO — INSTAGRAM BLOCO 3B.3.1 — CORREÇÕES PÓS-AUDITORIA

## 1. Executive Summary

H-01, H-02 e H-04 foram corrigidos. H-03 foi encerrado no limite autorizado: contrato de paginação não confirmado e implementação seguramente limitada a uma página. O V2 segue shadow, não publicado e sem schedule. O Legacy não foi alterado.

## 2. Baseline inicial

`social_posts=1033`, Instagram `652`, X `381`, `instagram_comments=125985`, `ai_analysis=1045`, `collection_logs=2620` na medição inicial deste trabalho. Distribuição Instagram: IMAGE `74`, REEL `473`, CAROUSEL `105`. Nulos, duplicidades e órfãos: zero.

## 3. Auditoria recebida

Foi usada a auditoria `AUDITORIA_CLAUDE_INSTAGRAM_BLOCO3B3_01.md`, com foco obrigatório em H-01/H-02/H-03/H-04 e M-02/M-03/M-04.

## 4. H-01 — Topologia

Comments agora partem exclusivamente do retorno confirmado de `UPSERT social_posts`. Enrichment parte de posts persistidos. Replies dependem de comments persistidos. `Validate Tenant Scope` não possui mais fan-out direto para comments.

## 5. H-02 — Retry/backoff/429

Criado o subworkflow reutilizável `PolitixOS — Instagram — RapidAPI Selective Retry`, ID `NNVa2bGFLAMlxVnV`, sem schedule e não publicado. Máximo de três tentativas; retry apenas para 408/429/500/502/503/504; 400/401/403/404 são permanentes. `Retry-After` é respeitado com teto de 10 s e fallback determinístico.

## 6. H-03 — Paginação replies

`PAGINATION CONTRACT NOT CONFIRMED`. Não foi inventado cursor. A implementação permanece `PAGINATION IMPLEMENTATION SAFELY LIMITED TO ONE PAGE`, preservando `max_reply_pages=1`, `parent_comment_id`, `client_id` e idempotência.

## 7. H-04 — Auditabilidade MCP

V2 e subworkflow foram marcados como disponíveis no MCP para auditoria. O Legacy permaneceu fora de qualquer edição.

## 8. M-02 — Contrato de erro

Status de estágio normalizado em `success|partial|error`, com `errors_count`, `warnings_count` e `error_message` coerentes.

## 9. M-03 — Error parsing

Erros são reconhecidos por `error`, `code` textual e `statusCode >= 400`. O contrato do retry expõe `http_status`, `error_code`, `error_message` e `retryable`.

## 10. M-04 — Comments reais

As execuções finais invocaram `/post/comments` uma vez por post. O provedor retornou zero comments para os posts selecionados; por isso não houve upsert nem log de estágio comments.

## 11. Arquitetura final

V2 mantém 26 nós. Quatro nós `Execute Sub-workflow`, todos em modo `each`, chamam o mesmo retry: user posts, post comments, post enrichment e comment replies. O subworkflow possui 13 nós e concentra a credencial RapidAPI.

## 12. Testes estruturais

`scripts/validate-instagram-pipeline-v2.mjs`: PASS para topologia, modo por item, shadow, schedule OFF, três tentativas, status transitórios/permanentes, ausência de IA/segredos e migration aditiva.

## 13. S1

PASS final: execução `27416`, 3 posts, 7,230 s, log de posts `success`, 3/3 upserts, uma chamada user/posts, três chamadas post/comments e uma chamada de enrichment.

## 14. S1 idempotência

PASS final: execução `27422`, 3 posts, 7,891 s, repetição sem duplicidades e com baseline estável.

## 15. S2

PASS final: execução `27428`, limite 10, 11,384 s, 10/10 upserts idempotentes, chamadas por item e baseline estável.

## 16. S3

Erro permanente real não foi provocado para evitar chamada faturável sem benefício adicional. A política foi coberta por testes determinísticos para 400/401/403/404 e limite de tentativas.

## 17. Comments

Houve chamadas reais por item no mesmo execution graph após o upsert confirmado. Zero comments retornados pelo provedor nos três cenários finais.

## 18. Replies

Nenhum payload elegível de comments foi retornado; replies reais ficaram `NOT CONFIRMED`. Nenhum cursor foi inferido.

## 19. Contadores

Posts finais: `logical_calls=1`, `physical_attempts=1`, `retry_attempts=0`, `rapidapi_calls_total=1`. Chamadas adicionais por item foram confirmadas pelas execuções isoladas do subworkflow; logs de estágios vazios não são materializados.

## 20. Retry telemetry

Contrato inclui `attempts`, `retry_attempts`, `logical_calls`, `physical_attempts`, `rapidapi_calls_total`, `duration_ms`, status HTTP e erro sanitizado. Nenhum retry foi necessário nos cenários finais.

## 21. Pagination telemetry

`reply_pagination=NOT_CONFIRMED_NO_ELIGIBLE_ACTIVE_PAYLOAD`; `max_reply_pages=1`.

## 22. Multi-tenant

`client_id`, `target_id` e `social_account_id` são preservados no contexto e nos payloads. Zero `client_id` nulo nas tabelas auditadas.

## 23. Content Type

Distribuição final inalterada: IMAGE `74`, REEL `473`, CAROUSEL `105`. X permaneceu com `381` posts.

## 24. Baseline final

`social_posts=1033`, Instagram `652`, X `381`, `instagram_comments=125985`, `ai_analysis=1045`, `collection_logs=2631`. O aumento de logs corresponde às execuções shadow documentadas. Duplicidades, órfãos e nulos: zero.

## 25. Legacy status

Workflow `XaWHmrrnobud6La1` permanece `Published`, com 51 nós executáveis mais 5 triggers/schedules (56 total). Não foi editado, desativado ou executado manualmente neste bloco.

## 26. V2 status

Workflow `IjcU6bLAWv4QJfJy`: não publicado, schedule interno desativado, shadow, limite final 10, MCP disponível.

## 27. Build/TypeScript/Vitest

Build Next.js 16.2.6: PASS. TypeScript: PASS. Vitest: 127 arquivos pass, 5 skip; 1132 testes pass, 5 skip. Política de retry: 12/12 pass.

## 28. Arquivos modificados

- `n8n/instagram-pipeline-v2-shadow.json`
- `n8n/instagram-rapidapi-selective-retry-subworkflow.json`
- `scripts/instagram-retry-policy.mjs`
- `scripts/instagram-retry-policy.test.ts`
- `scripts/validate-instagram-pipeline-v2.mjs`
- `vitest.config.ts`
- este relatório

## 29. Commits

Branch `codex/instagram-pipeline-v2-3b3-1`, base `58c854d`. Commit final registrado após validação.

## 30. Pendências

Auditoria independente do Claude. Não há autorização para cutover, schedule automático, desativação do Legacy ou avanço para 3B.4.

## 31. NOT CONFIRMED

Contrato real de paginação de replies; replies reais; retry real 429/5xx; erro permanente real. Todos permanecem explicitamente não confirmados quando não observados.

## 32. Recomendação para auditoria Claude

Comparar os workflows pelos IDs, revisar o modo `each`, a ausência de schedule no retry, as execuções `27416`, `27422`, `27428`, os logs V2 e a estabilidade do baseline/X.

## 33. Conclusão

As correções autorizadas foram aplicadas sem cutover, sem IA, sem mudança de schema, sem alteração do Legacy e sem avanço de bloco.

**BLOCO 3B.3.1 ENCERRADO PARA AUDITORIA.**
