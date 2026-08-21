# Contrato de Dados da UI Instagram — Bloco 3B.4

Contrato funcional para Stitch, Antigravity e implementação visual futura. A página atual não foi substituída neste bloco.

## Entrada server-side

`getInstagramUiContract(query)` aceita somente filtros funcionais:

- `contentTypes`: `IMAGE | REEL | CAROUSEL | VIDEO | OUTRO`;
- `candidateIds`: sempre intersectados com `allowedTargetIds` da sessão;
- `periodDays`: inteiro positivo;
- `page`: mínimo 1;
- `pageSize`: 1–100.

`client_id` não é parâmetro. Ele é obtido da sessão no servidor. Usuário sem targets recebe estado vazio. Admin pode ter escopo global.

## Estrutura principal

- `summary`: totais de posts, comentários e posts com análise.
- `contentTypes`: somente tipos presentes no conjunto filtrado.
- `performanceByType`: likes, comments e plays separados por tipo; não existe KPI combinado.
- `recentPosts`: página cronológica de posts.
- `topPosts`: itens ordenados pelo critério declarado `likes_desc_then_comments_desc`.
- `sentiment`, `risk`, `themes`: distribuições derivadas de `ai_analysis` existente.
- `comments.recent`: comentários recentes.
- `comments.relevant`: ordenados por `like_count`; o critério é exposto.
- `collectionFreshness`: última coleta dos posts e estado `EMPTY | FRESH | STALE`.
- `pagination`: página, tamanho, total, páginas e continuidade.
- `availability`: sinaliza existência real de reach, impressions, shares, saves e transcript.

## Post

Campos funcionais:

- identidade: `id`, `targetId`, `candidateName`;
- formato: `contentType`;
- conteúdo: `caption`, `publishedAt`, `collectedAt`, `url`, `mediaUrl`;
- métricas: `likes`, `comments`, `plays`, `views`, `reach`, `impressions`, `shares`, `saves`;
- análise: `sentiment`, `risk`, `themes`, `summary`, `riskReason`;
- `reel`, `carousel` e `enrichment` tipados.

Cada métrica contém:

```ts
{ value: number | null; availability: 'AVAILABLE' | 'UNAVAILABLE'; source: 'structured' | 'raw_json' | null }
```

`value=0` é um zero real. Dado ausente usa `value=null` e `availability=UNAVAILABLE`.

## Reels

Disponível na baseline:

- caption;
- likes e comments;
- `play_count`/`ig_play_count` como plays;
- `video_duration`;
- `has_audio`;
- sentiment, risk e themes quando houver `ai_analysis`.

`plays` não é convertido em `views`. Atribuição de áudio está indisponível na baseline porque os 473 `music_metadata` são `null`. Transcript permanece fora.

## Carrossel

- Um carrossel continua sendo um `social_post`.
- `childCount` vem de `raw_json.carousel_media.length`.
- `children` expõe somente `id`, `mediaType`, `imageUrl` e `videoUrl`.
- Slides não recebem métricas, análises ou identidade de post.
- Baseline: 105 carrosséis, 2–20 children, média 9,44.

## Comentários

Campos: `id`, `providerId`, `postId`, `parentCommentId`, autor, texto, likes, datas e `repliesAvailable`.

- Comentários por post: agrupar/filtrar por `postId`.
- Recentes: `comments.recent`.
- Relevantes: `comments.relevant`, exclusivamente por `like_count`.
- Replies: `repliesPresent=false` quando nenhum `parent_comment_id` existir; a UI não deve simular respostas.
- Baseline atual: 126.119 comentários, zero replies persistidos.

## Enrichment

O mapper lê `raw_json._v2_enrichment` quando existir e retorna somente:

- `playCount`;
- `durationSeconds`;
- `hasAudio`;
- `audioAttribution`.

O dump técnico de `raw_json` nunca integra o contrato. Na baseline atual há zero registros com `_v2_enrichment`.

## Métricas indisponíveis

Na baseline de 652 posts, não existem no payload bruto:

- reach;
- impressions;
- share_count;
- save_count.

Esses campos devem ser ocultados ou exibidos como indisponíveis. Não mostrar zero. A coluna legada `share_count=0` não é usada como prova de disponibilidade porque o payload bruto não contém a métrica.

## Segurança e performance

- Consultas exclusivamente server-side com `createAdminClient`.
- Nenhuma chave privilegiada é enviada ao browser.
- `platform='instagram'`, `client_id` da sessão e targets permitidos são aplicados antes da leitura.
- O filtro de `content_type` não alcança X.
- Duas fases: posts; depois comments/análises/targets em paralelo.
- Sem query por post ou comentário.
- Limite analítico atual: 2.000 posts; comentários recentes carregados: 500; listas visuais paginadas.

## Limitações

- Stories, Highlights, Transcript, Meta Graph e IA nova estão fora.
- Enrichment e replies serão mostrados apenas quando realmente persistidos.
- A camada está pronta, mas não está conectada à UI atual; aguarda layout aprovado.
