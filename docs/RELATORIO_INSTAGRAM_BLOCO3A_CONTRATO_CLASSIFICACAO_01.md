# RELATÓRIO — INSTAGRAM BLOCO 3A: CONTRATO CANÔNICO E CLASSIFICAÇÃO

**Data:** 2026-08-21  
**Branch:** `codex/instagram-bloco3a`  
**Status:** PASS WITH GAPS  
**Commit funcional:** `cb23122` (`feat(instagram): add canonical content classification`)

## 1. Executive Summary

O Bloco 3A adicionou a `social_posts.content_type` como contrato canônico nullable e classificou os 652 posts Instagram existentes sem criar, excluir ou duplicar publicações. O resultado real foi 74 `IMAGE`, 473 `REEL` e 105 `CAROUSEL`; não havia exemplos históricos de `VIDEO` não-clips nem `OUTRO`, embora ambos estejam cobertos pelo contrato e pelos testes. O classificador central de persistência está no PostgreSQL e é aplicado por trigger a todo insert/upsert futuro. O frontend recebeu somente um fallback compatível e invisível ao usuário.

`product_type` não foi materializado: os 652 valores continuam preservados no `raw_json`, evitando uma segunda fonte que exigiria sincronização. Nenhuma mudança foi feita no workflow n8n, pois o trigger do banco classifica o upsert existente de `/user/posts`. X permanece na mesma tabela, com suas 381 linhas inalteradas e `content_type = NULL`.

## 2. Status final

**PASS WITH GAPS.** Integridade, classificação, multi-tenant, testes, build e execução automática real do n8n passaram. O lint global continua falhando por dívida preexistente fora do escopo. O conector Vercel não possui autorização no escopo da equipe para informar o SHA do deployment; a saúde HTTP pública foi validada.

## 3. Preflight

- `main` local estava limpa e 4 commits atrás de `origin/main`.
- Sincronização realizada exclusivamente por `git merge --ff-only origin/main`, de `6891292` para `4bcade2`.
- Os quatro commits foram confirmados como hardening server-side, fundação multi-tenant/client_id, fechamento da leitura anon de `targets` e documentação final.
- Segundo preflight executado sobre `4bcade2`, antes da criação da branch.
- Supabase real: projeto `hhhwuajptkyposarfbzn`, PostgreSQL 17, RLS ativa nas tabelas do módulo.

## 4. Estado encontrado

| Item | Estado inicial |
|---|---:|
| `social_posts` | 1.033 |
| Posts Instagram | 652 |
| Posts X | 381 |
| `instagram_posts` legado | 0 |
| `instagram_comments` | 125.985 |
| `ai_analysis` | 1.045 |
| `collection_logs` | 2.582 |
| Duplicidades `(platform, platform_post_id)` | 0 |
| Órfãos auditados | 0 |
| `client_id` nulo nas tabelas auditadas | 0 |

Distribuição bruta inicial: 74 `image + feed`, 473 `video + clips`, 105 `carousel + carousel_container`.

## 5. Arquitetura antes

`n8n /user/posts → normalização → upsert social_posts → dashboards/IA`. O formato permanecia apenas em `media_type` normalizado e em `raw_json.product_type`; não existia classificação canônica capaz de distinguir Reel de vídeo comum.

## 6. Arquitetura depois

`n8n /user/posts → mesmo upsert social_posts → trigger PostgreSQL → content_type`.

O banco é a fonte operacional da classificação. O helper TypeScript replica o contrato para fallback backward-compatible na leitura e testes unitários, sem persistir dados.

## 7. Arquivos alterados

- `lib/instagram/content-type.ts`: tipos e classificador TypeScript determinístico.
- `lib/instagram/content-type.test.ts`: testes do contrato, idempotência, identidade e carrossel.
- `lib/queries/instagram.ts`: expõe `content_type` com fallback compatível.
- `lib/queries/instagram.test.ts`: fixture compatível.
- `supabase_migration_instagram_content_type_contract.sql`: schema, classificador SQL, trigger e backfill.
- Este relatório.

## 8. Migration

Migration aplicada: `instagram_content_type_contract`.

- adiciona coluna `text` nullable;
- adiciona check validado para `IMAGE|REEL|CAROUSEL|VIDEO|OUTRO` ou `NULL`;
- cria função SQL `IMMUTABLE`, `PARALLEL SAFE`, com `search_path=''`;
- cria trigger antes de insert/update dos campos discriminadores;
- faz backfill somente de `platform='instagram'`;
- não altera PK, FK, unique constraints, índices, grants, RLS ou policies.

O CLI Supabase não está instalado. Seguiu-se a convenção real deste repositório de migration SQL standalone, aplicada pelo Supabase MCP.

## 9. Alterações n8n

Nenhuma. Não foi criado `/user/reels`, workflow paralelo ou duplicação de regra. O upsert existente continua em `social_posts?on_conflict=platform,platform_post_id`; a classificação ocorre no trigger do banco.

## 10. Contrato `content_type`

Campo: `public.social_posts.content_type text NULL`.

Valores canônicos: `IMAGE`, `REEL`, `CAROUSEL`, `VIDEO`, `OUTRO`. Canais não abrangidos, incluindo X, permanecem `NULL`.

## 11. Regras de classificação

1. `platform != instagram` → `NULL`.
2. imagem (`image`, `photo`, `1`) → `IMAGE`.
3. carrossel (`carousel`, `carousel_container`, `8`) → `CAROUSEL`.
4. vídeo (`video`, `2`) + `product_type=clips` → `REEL`.
5. vídeo não-clips → `VIDEO`.
6. caso Instagram não reconhecido/incompleto → `OUTRO`.

Campos estruturados têm prioridade; `raw_json` é fallback. Story e Highlight nunca são inferidos.

## 12. Tratamento de carrossel

O post pai continua sendo a única linha em `social_posts`. Os 105 carrosséis produziram exatamente 105 classificações `CAROUSEL`. `carousel_media[]` permanece no `raw_json`; slides não geram IDs, métricas, comentários ou análises adicionais.

## 13. Tratamento de Reels

Os 473 registros `media_type=video` e `product_type=clips` foram classificados como `REEL`. A identidade `(platform, platform_post_id)` não mudou, e nenhum endpoint ou coleta específica de Reels foi criado.

## 14. Métricas

- `play_count`, `video_duration` e `has_audio`: presentes em 473 payloads, preservados.
- `reach`, `impressions`, `share_count` e `save_count`: ausentes nos 652 payloads.
- Nenhum valor ausente foi gravado como zero pelo Bloco 3A.
- `play_count` e `view_count` não foram fundidos.

## 15. Backfill

O backfill atualiza somente `content_type`, usando a mesma função do trigger. É determinístico e reexecutável via `IS DISTINCT FROM`. Totais antes/depois permaneceram iguais. Nenhuma IA foi reexecutada.

## 16. Idempotência

- Unique existente `(platform, platform_post_id)` preservada.
- Classificar novamente produz o mesmo resultado.
- Testes confirmam preservação de `id`, `platform_post_id`, `target_id` e `client_id`.
- Reel vindo de `/user/posts` continua sendo o mesmo post do feed.

## 17. Multi-tenant

Zero mudança em `client_id`, triggers de derivação, RLS, `allowedTargetIds`, autenticação ou service role. Após o backfill: zero `client_id`, `target_id` ou `social_account_id` nulos em `social_posts`.

## 18. Segurança

Nenhum segredo foi lido ou registrado. As policies do módulo permaneceram restritas a `service_role`; `targets` continua deny-by-default sem policy pública. Advisors pós-DDL não apontaram problema novo nas funções do Bloco 3A. Alertas preexistentes de outras tabelas/views foram preservados e não corrigidos fora de escopo.

## 19. Testes

- Direcionados: 107/107 PASS.
- Suíte global: 4.366/4.366 PASS; 20 skipped.
- Testes SQL do contrato: 7/7 PASS.
- Typecheck: PASS.
- ESLint dos arquivos novos: PASS.
- Lint global: FAIL preexistente, 78 erros e 120 warnings em áreas não relacionadas e em linhas legadas; nenhuma correção fora do escopo foi feita.

## 20. Build

`npm run build`: PASS, Next.js 16.2.6, compilação em 5,5 s, TypeScript em 6,3 s, 22 páginas estáticas geradas.

## 21. Before / After

| Métrica | Before | After migration | Resultado |
|---|---:|---:|---|
| `social_posts` | 1.033 | 1.033 | PASS |
| `instagram_comments` | 125.985 | 125.985 | PASS |
| `ai_analysis` | 1.045 | 1.045 | PASS |
| `collection_logs` | 2.582 | 2.583 | PASS, +1 execução automática legítima |
| `client_id` nulo | 0 | 0 | PASS |
| Duplicidades | 0 | 0 | PASS |
| `IMAGE` | — | 74 | PASS |
| `REEL` | — | 473 | PASS |
| `CAROUSEL` | — | 105 | PASS |
| `VIDEO` | — | 0 | PASS, sem amostra histórica |
| `OUTRO` | — | 0 | PASS, sem amostra histórica |
| Posts X | 381 | 381 | PASS |

## 22. Validação n8n real

O workflow não foi modificado. A execução automática real pós-migration ocorreu em `2026-08-21T04:30:48.990Z` e registrou `status=success`, 12 posts coletados, zero comentários e `client_id`, `target_id` e `social_account_id` corretos. A reconciliação imediatamente posterior confirmou:

- `social_posts=1.033`, `instagram_comments=125.985`, `ai_analysis=1.045`;
- `collection_logs=2.583` (+1 explicado pela execução automática);
- 652 identidades Instagram distintas para 652 linhas;
- zero `content_type` ou `client_id` nulo no Instagram;
- distribuição ainda 74 `IMAGE`, 473 `REEL`, 105 `CAROUSEL`;
- amostra da conta processada contém as três classes reais: `IMAGE/feed`, `REEL/clips`, `CAROUSEL/carousel_container`;
- 381 posts X, todos com `content_type=NULL`.

## 23. Regressão Instagram

652 posts preservados, dashboard compila, query direcionada testada e contrato exposto sem filtro visual novo.

## 24. Regressão X

381 posts preservados. Todos permanecem `content_type=NULL`; a query de X não ganhou filtro ou alteração. Views pendentes de X continuam selecionando explicitamente as mesmas colunas.

## 25. Regressão Notícias

Nenhum arquivo/query de Notícias foi alterado. Build e suíte global passaram; contagem real de `mentions` permaneceu disponível.

## 26. Regressão Overview

Nenhum filtro por `content_type` foi introduzido. Overview continua consumindo as mesmas funções Instagram/X; testes relacionados e build passaram.

## 27. Riscos encontrados

- A função SQL e o fallback TypeScript precisam permanecer semanticamente alinhados; o banco é a autoridade operacional.
- Views usam seleção explícita, portanto não expõem `content_type` até uma demanda futura aprovada.
- Lint global já estava vermelho antes deste bloco.
- API Vercel indisponível ao conector atual por 403 de escopo.

## 28. Dívidas técnicas

- CROSS-CLIENT SESSION TEST E2E autenticado continua pendente e fora do Bloco 3A.
- Alertas preexistentes dos advisors Supabase permanecem fora do escopo.
- Lint global preexistente.

## 29. Fora do escopo

Stories, Highlights, replies, transcript, DMs, Ads, publicação/agendamento, novos endpoints, redesign, dashboards/filtros por formato e `product_type` estruturado não foram implementados.

## 30. Commits

- `cb23122` — `feat(instagram): add canonical content classification`.
- Commit documental final: registrado após a conclusão das evidências pós-deploy.

## 31. Deploy

- Migration aplicada em produção com sucesso.
- `origin/main` avançou por fast-forward de `4bcade2` para `cb23122`.
- `https://politix-os.vercel.app/login`: HTTP 200.
- `/dashboard/instagram` sem sessão: HTTP 307 para `/login`, autenticação preservada.
- SHA do deployment não confirmável pela API Vercel: conector retorna 403 para o escopo da equipe.

## 32. Rollback

Rollback compensatório documentado no fim da migration: remover trigger, funções, check e, por último, a coluna. É destrutivo somente para a classificação derivada; não toca em posts, raw payloads, IDs ou conteúdo. Em produção, deve ser uma nova migration roll-forward, nunca reset.

## 33. Evidências

- Git limpo e sincronização ff-only documentada.
- Introspecção real de schema, constraints, triggers, policies, views e funções.
- Queries read-only before/after.
- Testes TypeScript e SQL.
- Advisors Supabase pós-DDL.
- Build local de produção.
- Saúde HTTP do Vercel.
- Execução automática n8n `8820c6b2-a649-49d7-99ac-71e2d2e91566` e reconciliação pós-ciclo.

## 34. Recomendação para Bloco 3B

Não iniciar até auditoria independente. Se aprovado, consumir `content_type` somente para análises explicitamente definidas; não expandir Stories/Highlights sem nova evidência real. Antes de adicionar campos derivados, medir consumidor e benefício para evitar duplicação do `raw_json`.

---

**BLOCO 3A ENCERRADO PARA AUDITORIA.**  
**Não avancei para o Bloco 3B.**  
**Aguardando auditoria independente do Claude e autorização.**
