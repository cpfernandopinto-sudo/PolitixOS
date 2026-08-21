# Relatório Instagram Bloco 3B.4 — Codex / Frente A

Data: 2026-08-21  
Branch: `codex/instagram-bloco3b4-aplicacao`  
Base: `8cd9c4073b5363832f5716670190e9b35a0a79b7`

## Executive Summary

Foi criada a fundação de dados server-side para a futura página Instagram sem alterar a UI atual e sem tocar em n8n. A entrega inclui contrato tipado, mappers puros, filtro canônico de `content_type`, consulta server-side tenant-aware, paginação, disponibilidade explícita de métricas, suporte funcional a Reels/carrosséis/comentários/enrichment e documentação para Stitch/Antigravity.

Não houve migration, alteração de schema, mudança em X, n8n, Legacy, Pipeline V2, schedules, RapidAPI, IA ou Design System.

## Preflight

- Working tree inicial: limpo.
- Branch encontrada: `codex/instagram-pipeline-v2-3b3-2`.
- Base: commit auditado `8cd9c40` do Bloco 3B.3.2.
- Branch isolada criada: `codex/instagram-bloco3b4-aplicacao`.
- Página atual: Server Component `app/dashboard/instagram/page.tsx`, uma busca principal e opções em paralelo.
- Query atual: `lib/queries/instagram.ts`, `social_posts` restrito a Instagram, comentários por `post_id` e análises por `content_id`.
- UI atual: `InstagramFilterBar` + `InstagramDashboard`; mantida integralmente.
- Post Detail atual: modal client-side no dashboard, alimentado pelo mesmo array de posts/comentários.
- Server actions: não há action específica da página Instagram; acesso é feito diretamente no Server Component.

## Schema e baseline auditados

- `social_posts`: identidade compartilhada entre Instagram e X; `content_type` nullable, `raw_json` preservado.
- `instagram_comments`: `client_id` e `parent_comment_id` nullable; 126.119 registros, zero replies persistidos.
- `ai_analysis`: análise existente por `content_id`, com sentiment, risk, topics, summary e reason.
- Instagram: 652 posts — 74 IMAGE, 473 REEL, 105 CAROUSEL.
- X: 381 posts com `content_type=NULL`, preservados.
- Reels: 473/473 com play_count, duração e has_audio no raw.
- Carrosséis: 105/105 com carousel_media; 2–20 children.
- `_v2_enrichment`: zero registros atuais.
- reach/impressions/share/save no raw: zero registros.

## Dependências compartilhadas

- X lê `social_posts` e `ai_analysis` em `lib/queries/x.ts`, com filtro próprio `x/twitter`; não foi alterado.
- Overview e alertas chamam `fetchInstagramData`; a assinatura existente permanece compatível.
- Notícias usa sua própria camada e targets compartilhados; não foi alterada.
- Candidatos fornece o contexto global/allowed targets; não foi alterado.
- A única mudança compatível na query existente foi adicionar o filtro opcional `contentTypes`, sempre após `platform='instagram'`.

## Arquitetura nova

1. `lib/types/instagram-ui.ts`: contrato funcional tipado.
2. `lib/instagram/ui-contract.ts`: mapeamento puro e testável, sem I/O.
3. `lib/queries/instagram-ui.ts`: orquestração server-only e tenant-aware.
4. `getInstagramUiContract(query)`: ponto único da futura UI.

A consulta ocorre em duas fases:

1. posts Instagram já restritos por tenant/target/content type/período;
2. comments, análises e nomes de targets em paralelo, usando os IDs já autorizados.

Não há N+1.

## Contrato novo

O retorno contém `summary`, `contentTypes`, `performanceByType`, `recentPosts`, `topPosts`, `sentiment`, `risk`, `themes`, `comments`, `collectionFreshness`, `pagination` e `availability`.

O contrato técnico integral está em `docs/CONTRATO_DADOS_UI_INSTAGRAM_BLOCO3B4.md`.

## Content types e filtros

- Tipos canônicos: IMAGE, REEL, CAROUSEL, VIDEO, OUTRO.
- Valores desconhecidos, Story e Highlight são descartados do filtro.
- Duplicatas são removidas.
- O filtro é aplicado no banco exclusivamente sobre uma query previamente limitada a `platform='instagram'`.
- A UI futura deve listar apenas tipos presentes em `contentTypes`.

## Métricas

Cada métrica diferencia explicitamente zero real de ausência. Likes/comments estruturados podem ser `AVAILABLE` com valor 0. Plays/views/reach/impressions/shares/saves só ficam disponíveis quando a chave real existe na fonte aceita.

Não existe KPI combinado de “engajamento”. `performanceByType` mantém likes, comments e plays separados. `topPosts` usa critério lexicográfico declarado: likes desc, depois comments desc.

## Reels, carrosséis e enrichment

- Reel: plays, duração, hasAudio e atribuição apenas quando sustentados.
- Plays nunca vira views.
- Carrossel: um post pai; children são mídia auxiliar, sem métricas multiplicadas.
- Enrichment: whitelist funcional; raw_json não é exposto.
- Transcript permanece indisponível.

## Comentários

- Todos carregam `postId` para agrupamento por post.
- Recentes ordenados por data real.
- Relevantes usam somente `like_count`, critério declarado.
- `parentCommentId` preservado.
- `repliesPresent` e `repliesAvailable` não inventam replies.

## Freshness

`lastCollectedAt` vem do maior `social_posts.collected_at` do escopo. O estado é `EMPTY`, `FRESH` (até 24 h) ou `STALE`. Nenhum ID ou detalhe do n8n é exposto.

## Segurança

- `client_id` vem exclusivamente de `getActiveClientId()`.
- `allowedTargetIds` vem exclusivamente de `getAllowedTargetIds()`.
- `candidateIds` recebido da UI é intersectado com allowed targets.
- Usuário sem targets retorna contrato vazio antes de consultar dados.
- Admin mantém semântica global existente.
- `createAdminClient` existe somente no módulo server-only.
- Sem anon read, service role no client ou confiança em tenant enviado pelo frontend.

## Performance e paginação

- Duas fases de I/O, segunda fase paralela.
- Sem N+1.
- Seleção explícita de colunas; raw_json permanece apenas no servidor/mappers.
- Máximo analítico atual de 2.000 posts, suficiente para baseline de 652.
- Máximo de 500 comentários recentes, com total exato separado.
- Página normalizada a mínimo 1 e pageSize limitado a 100.
- Se o volume exceder 2.000 posts, `hasNextPage` permanece true e a limitação deve ser substituída por agregação/RPC antes do cutover.

## Compatibilidade e feature flag

Não foi necessária feature flag porque a nova função não está conectada à rota visual. A página atual continua usando o contrato legado. A integração futura pode ocorrer atrás de flag depois do layout aprovado, sem refazer queries ou mappers.

## Testes adicionados

Cobertura específica:

- content_type filter;
- Instagram-only/X preserved;
- disponibilidade versus zero;
- semântica de carrossel;
- Reel e separação plays/views;
- comments/replies;
- enrichment whitelist;
- client/allowed target scope;
- empty state;
- paginação;
- performance por tipo sem fundir métricas.

## Arquivos

- `lib/types/instagram-ui.ts` — novo.
- `lib/instagram/ui-contract.ts` — novo.
- `lib/instagram/ui-contract.test.ts` — novo.
- `lib/queries/instagram-ui.ts` — novo.
- `lib/queries/instagram-ui.test.ts` — novo.
- `lib/queries/instagram.ts` — filtro opcional compatível.
- `docs/CONTRATO_DADOS_UI_INSTAGRAM_BLOCO3B4.md` — novo.
- `docs/RELATORIO_INSTAGRAM_BLOCO3B4_CODEX_APLICACAO_01.md` — novo.

## Riscos e limitações

- Não existe amostra atual de `_v2_enrichment` ou replies.
- Atribuição de áudio está ausente: `music_metadata` é null nos 473 Reels.
- Métricas reach/impressions/share/save não existem no raw da baseline.
- O teto analítico de 2.000 posts é uma decisão compatível com o volume atual, não solução infinita.
- A futura UI deve respeitar `availability` e nunca renderizar indisponível como zero.
- Durante a revisão final surgiu o arquivo externo não rastreado `docs/AUDITORIA_UX_E_SPEC_FINAL_INSTAGRAM_3B4.md`, ausente no preflight e compatível com a frente paralela de UX. Ele foi preservado, não lido como autorização arquitetural e não será incluído no commit Codex.

## Validação

- TypeScript: PASS, `npx tsc --noEmit`.
- Vitest: PASS; 130 arquivos passaram, 5 foram ignorados; 1.164 testes passaram, 5 foram ignorados, total 1.169.
- Build Next.js 16.2.6: PASS; compilação em 10,6 s, TypeScript em 11,1 s e 22/22 páginas estáticas geradas.
- Testes focados Instagram: 4 arquivos, 31 testes, todos PASS.
- `git diff --check`: executado no fechamento.
- Verificação read-only ao vivo: filtro canônico encontra 652/652 Instagram e 0/381 X; mismatches `social_posts.client_id` versus `targets.client_id`: zero.

O preflight e as queries de auditoria foram somente leitura; o banco não foi alterado.

## Commit

Commit descritivo do bloco é registrado na entrega final. Não haverá push, merge, deploy ou integração visual neste bloco.

## Conclusão

Fundação pronta para receber o output aprovado de Stitch/Antigravity. A implementação do redesign final não foi iniciada.
