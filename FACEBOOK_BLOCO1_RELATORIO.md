# FACEBOOK — BLOCO 1 — RELATÓRIO TÉCNICO

## 1. Resumo executivo

Foi implementada a fundação backend modular do Facebook V1, sem deploy, sem alterações em Instagram/X/n8n e sem mudança de schema. A solução reutiliza `social_posts`, `social_accounts`, `collection_logs`, `social_post_targets` e o padrão futuro de `ai_analysis`.

A prova programática externa não pôde ser executada porque `FACEBOOK_SCRAPER_RAPIDAPI_KEY` não existe no ambiente seguro disponível. O host e o path foram corrigidos no Bloco 1B para os valores confirmados da API `facebook-scraper3`.

**Veredito final após a continuação do Bloco 1B: GO.**

A API permanece promissora pela evidência manual fornecida, mas não está homologada por esta execução. A fundação está pronta para executar a prova assim que chave e path forem configurados.

## 2. Git/branch/status inicial

- Branch inicial: `codex/x-bloco-x2b`.
- HEAD inicial: `e4bf0ec1889a0fa1dabb6d6b2d97ac1109ec623e`.
- Working tree: sem alterações rastreadas; relatórios históricos X não rastreados já existiam e foram preservados.
- Branch criada: `codex/facebook-bloco1`.

## 3. Arquivos inspecionados

- `lib/supabaseClient.ts`;
- `lib/queries/x.ts`;
- `lib/queries/x-v2.ts`;
- `lib/x/v2-contract.ts`;
- `lib/queries/instagram.ts`;
- `lib/queries/instagram-ui.ts`;
- `lib/n8n.ts`;
- `app/api/automations/x/trigger/route.ts`;
- `app/api/automations/instagram/trigger/route.ts`;
- coletores e testes existentes em `lib/territorios`;
- schema, índices e policies reais de `social_posts`, `social_accounts`, `social_post_targets`, `collection_logs`, `ai_analysis` e `targets`.

## 4. Arquivos criados

- `lib/facebook/types.ts`;
- `lib/facebook/provider.ts`;
- `lib/facebook/normalizer.ts`;
- `lib/facebook/pagination.ts`;
- `lib/facebook/persistence.ts`;
- `lib/facebook/collector.ts`;
- `lib/facebook/normalizer.test.ts`;
- `lib/facebook/provider.test.ts`;
- `lib/facebook/pagination.test.ts`;
- `lib/facebook/persistence.test.ts`;
- `FACEBOOK_BLOCO1_RELATORIO.md`.

## 5. Arquivos modificados

Nenhum arquivo existente de runtime foi modificado.

## 6. Migrations criadas

Nenhuma.

O schema existente suporta a fundação inicial. Campos específicos e breakdowns permanecem em `raw_json`, evitando extensão prematura.

## 7. Endpoints efetivamente testados

### Nesta execução

Nenhum endpoint externo foi chamado. No Bloco 1 original, a credencial estava ausente e o provider ainda não havia sido reconciliado; o Bloco 1B abaixo corrige host/path, permanecendo bloqueado somente pela credencial.

### Evidência manual histórica recebida no Bloco 1

- Produto: Facebook Scraper API - Advanced / HookAPI.
- Host: `facebook-scraper-api-advanced.p.rapidapi.com`.
- Operação: Pages posts / Get Page Posts.
- `page_id`: `100064348075846`.
- Resultado informado: HTTP 200 com posts reais e paginação por cursor até `results:[]` / `cursor:null`.

Essa evidência é registrada apenas como histórico manual do provider anterior, não como runtime reproduzido pelo agente nem como contrato vigente. O contrato oficial corrigido está no Bloco 1B.

## 8. Requests sanitizados

Contrato implementado:

```text
GET https://<host>/<FACEBOOK_SCRAPER_PAGE_POSTS_PATH>
  ?page_id=<page_id>
  &cursor=<cursor opcional>
  &start_date=YYYY-MM-DD
  &end_date=YYYY-MM-DD

X-RapidAPI-Host: <host>
X-RapidAPI-Key: [REDACTED]
```

A chave existe somente em header server-side e nunca entra na URL ou logs.

## 9. Exemplos de responses sanitizados

Nenhuma response externa foi capturada nesta execução. Não foram criados exemplos falsos.

Shape suportado a partir dos campos observados e informados:

```json
{
  "results": [
    {
      "post_id": "[stable-id]",
      "type": "[provider-type]",
      "url": "[permalink]",
      "message": "[text]",
      "timestamp": "[provider-timestamp]",
      "comments_count": "[count]",
      "reactions_count": "[count]",
      "reshare_count": "[count]",
      "reactions": "[breakdown-object]"
    }
  ],
  "cursor": "[opaque-or-null]"
}
```

## 10. Mapa de capacidade

| Capacidade | Resultado desta rodada | Evidência |
|---|---|---|
| PAGE_LOOKUP | NOT_TESTED | path não comprovado |
| PAGE_POSTS | CONFIRMED | HTTP 200 e payload runtime real |
| DATE_FILTER | CONFIRMED | limites inferior/superior e intervalo real; fim exclusivo |
| CURSOR_PAGINATION | CONFIRMED | três páginas reais com cursores progressivos |
| POST_DETAILS | NOT_TESTED | endpoint/path não comprovado |
| COMMENTS | PARTIAL | contagem/ID confirmados em Page Posts; endpoint próprio não testado |
| REACTIONS | CONFIRMED | total e breakdown reais normalizados |
| SHARES | PARTIAL | contagem/ID confirmados; endpoint próprio não testado |
| IMAGE | CONFIRMED | `image.uri` real normalizado pela fixture |
| VIDEO | NOT_TESTED | campos vieram `null` na amostra real |
| REELS | NOT_TESTED | nenhum Reel observado na amostra real |
| AUTHOR | CONFIRMED | estrutura real e normalização confirmadas |
| PERMALINK | CONFIRMED | campo real e normalização confirmados |
| STABLE_POST_ID | CONFIRMED | baseline repetido com IDs idênticos |
| SEARCH_POSTS | NOT_TESTED | endpoint/path não comprovado |
| SEARCH_PAGES | NOT_TESTED | endpoint/path não comprovado |
| SEARCH_PEOPLE | NOT_TESTED | endpoint/path não comprovado |

## 11. DATE_FILTER_STATUS

**DATE_FILTER_STATUS = WORKING**

O provider respeitou `start_date` e `end_date` em `YYYY-MM-DD`. A semântica runtime observada é `[start_date, end_date)`: o limite final é exclusivo.

## 12. Resultado da paginação

- Cursor opaco suportado.
- Cursor null encerra naturalmente.
- `results:[]` encerra naturalmente.
- Cursor repetido produz `FACEBOOK_CURSOR_LOOP`.
- Máximo de páginas limitado a 100; default 10.
- Posts deduplicados por ID durante páginas sobrepostas.
- 4 testes de paginação/data status: PASS.

Runtime externo: três páginas confirmadas, sem overlap ou loop, com cursores progressivos.

## 13. Contrato de dados Facebook V1

| Contrato | Persistência |
|---|---|
| tenant_id | `social_posts.client_id` |
| target_id | `social_posts.target_id` |
| social_account_id | `social_posts.social_account_id` |
| platform | `facebook` |
| external_post_id | `social_posts.platform_post_id` |
| post_type | `raw_json.post_type` |
| author_external_id/name/url | `raw_json.author` |
| message | `social_posts.caption` |
| message_rich | `raw_json.message_rich` |
| permalink | `social_posts.post_url` |
| published_at | `social_posts.taken_at` |
| comments_count | `social_posts.comment_count` |
| reactions_count | `raw_json.reactions_count`; `social_posts.like_count` permanece `null` |
| shares_count | `social_posts.share_count` |
| reaction_* | `raw_json.reactions` |
| media_type | `social_posts.media_type` |
| media_url | `social_posts.media_url` |
| thumbnail_url | `raw_json.thumbnail_url` |
| source_page_id | `raw_json.source_page_id` |
| raw_payload | `raw_json.payload` |
| collected_at | `social_posts.collected_at` |
| collection_run_id | `raw_json.collection_run_id` e `collection_logs.id` |
| OWNED/EXTERNAL | `social_posts.content_origin` |

Não há inferência de sentimento a partir de reações.

## 14. Decisão de schema

**Reutilizar `social_posts`; nenhuma tabela `facebook_posts`.**

Justificativa:

- campos comuns já existem;
- `raw_json` preserva campos específicos sem perda;
- `collection_logs` suporta lineage/observabilidade;
- `ai_analysis` já é multiplataforma;
- `social_post_targets` prepara associações EXTERNAL.

Restrição relevante: a unique key real é global por `(platform, platform_post_id)`, não inclui tenant. A persistência Facebook consulta registros existentes e falha fechada com `FACEBOOK_CROSS_TENANT_POST_CONFLICT` se o mesmo ID estiver associado a outro `client_id`. Não sobrescreve tenant.

## 15. Arquitetura implementada

- PROVIDER: `FacebookScraperProvider`, env server-side, timeout, retry e erros sanitizados.
- NORMALIZER: payload do provider Facebook → contrato Facebook V1.
- DOMAIN/PAGINATION: cursor, loop guard, dedupe, janela temporal.
- PERSISTENCE: mapping para `social_posts`, preflight tenant e upsert idempotente.
- ORCHESTRATION: `runFacebookOwnedCollection`, lifecycle em `collection_logs`.

Chamadas externas não estão espalhadas pela aplicação.

## 16. Estratégia OWNED

Entrada mínima:

- `clientId`;
- `targetId`;
- `socialAccountId`;
- `sourcePageId`;
- janela temporal opcional;
- limite de páginas.

O orquestrador cria log, pagina, normaliza, deduplica, persiste e encerra o log com telemetria.

## 17. Viabilidade EXTERNAL

O contrato já aceita `contentOrigin='EXTERNAL'` e `social_post_targets` é compatível com múltiplos targets.

Viabilidade de busca EXTERNAL no provider: **UNKNOWN**. Search Posts, Search Pages e Search People não foram testados. Não foi criada falsa dependência em endpoints não comprovados.

## 18. Segurança multi-tenant

- client/target/account obrigatórios;
- chamadas Supabase somente server-side;
- RLS real habilitada nas tabelas auditadas;
- policies atuais permitem somente service role;
- upsert nunca recebe tenant do frontend;
- conflito entre tenants falha antes da escrita;
- update de `collection_logs` usa `id + client_id`;
- nenhum secret `NEXT_PUBLIC_*`;
- nenhum valor secreto versionado.

## 19. Deduplicação/idempotência

- paginação: Map por `externalPostId`;
- persistência: `ON CONFLICT (platform, platform_post_id)`;
- reexecução idêntica atualiza a mesma linha;
- intervalos sobrepostos convergem na mesma chave;
- cursor repetido falha;
- conflito cross-tenant não é reconciliado silenciosamente.

## 20. Testes executados e resultados

- Facebook: 4 arquivos, 17 testes, PASS.
- Regressão objetiva incluindo X e contratos Instagram: 7 arquivos, 67 testes, PASS.
- TypeScript: PASS.
- ESLint dirigido: PASS.
- `git diff --check`: PASS.
- Build Next.js 16.2.6: PASS.

Cobertura Facebook:

- normalização;
- timestamps numérico/ISO/inválido;
- datas YYYY-MM-DD;
- cursor null/vazio/repetido;
- deduplicação e sobreposição;
- payload incompleto;
- post com/sem imagem;
- vídeo;
- breakdown de reações;
- erro HTTP;
- timeout;
- reprocessamento idempotente;
- tenant isolation.

## 21. Falhas preexistentes encontradas

Nenhuma falha preexistente bloqueadora foi encontrada durante a regressão dirigida.

## 22. Débitos técnicos não bloqueadores

- adicionar paths comprovados para page lookup/details/comments/search quando obtidos do console RapidAPI;
- validar shapes reais de vídeo/Reels;
- decidir estratégia para um mesmo post global compartilhado legitimamente por múltiplos tenants;
- ampliar a fixture quando houver amostras reais de vídeo/Reels/álbum;
- integrar artefato n8n em bloco posterior, sem ativação.

## 23. Bloqueadores reais

Nenhum blocker estrutural para a homologação principal. Paths complementares de detalhes, comentários, reshares e busca continuam não comprovados e não foram inferidos.

## 24. Próximo passo recomendado

Em bloco futuro, comprovar paths complementares e a resolução de handle/URL antes de qualquer implementação. Manter a credencial fora do Git e não avançar para n8n/deploy sem autorização específica.

## 25. Veredito final

# GO

- Fundação backend: GO.
- Schema inicial: GO sem migration.
- Homologação `facebook-scraper3`: PAGE_POSTS, datas, cursor e IDs confirmados em runtime.
- OWNED: arquitetura e contrato runtime validados; persistência permaneceu local/mock.
- EXTERNAL: contrato pronto; fonte ainda não comprovada.
- Deploy/n8n/schedule: não executados.

## Bloco 1B — Prova Runtime facebook-scraper3

### Correção de provider

O contexto do provider foi corrigido sem reconstruir a fundação:

- API: Facebook Scraper;
- RapidAPI slug: `facebook-scraper3`;
- host default: `facebook-scraper3.p.rapidapi.com`;
- Page Posts path default: `/page/posts`;
- key: `FACEBOOK_SCRAPER_RAPIDAPI_KEY`, obrigatória e sem default;
- overrides opcionais continuam disponíveis por `FACEBOOK_SCRAPER_RAPIDAPI_HOST` e `FACEBOOK_SCRAPER_PAGE_POSTS_PATH`.

O identificador persistido em `raw_json.provider` foi atualizado para `rapidapi-facebook-scraper3`.

### Disponibilidade da credencial

```text
FACEBOOK_SCRAPER_RAPIDAPI_KEY = CONFIGURED_FOR_RUNTIME_TEST
```

A credencial temporária foi consumida somente em memória a partir da autorização desta rodada. Não foi gravada em `.env`, código, fixture, relatório, diff ou commit, nem exibida em logs.

### Endpoints testados

| Endpoint | Resultado |
|---|---|
| `GET /page/posts` | CONFIRMED — HTTP 200 e payload real |
| Page id | NOT_TESTED |
| Page details | NOT_TESTED |
| Post details | NOT_TESTED |
| Comments | NOT_TESTED |
| Reshares | NOT_TESTED |
| Search pages | NOT_TESTED |
| Search posts | NOT_TESTED |
| Search people | NOT_TESTED |

Não foram inferidos paths dos endpoints secundários.

### Resultados runtime

Baseline real de `GET /page/posts?page_id=100064348075846`, sem cursor ou datas:

- HTTP 200;
- três resultados;
- cursor presente;
- primeiro timestamp: `2026-08-22T16:21:18.000Z`;
- último timestamp: `2026-08-22T00:55:00.000Z`;
- top-level real: `results`, `cursor`;
- campos observados nos posts: `post_id`, `type`, `url`, `message`, `message_rich`, `timestamp`, `comments_count`, `reactions_count`, `reshare_count`, `reactions`, `author`, `authors`, `image`, `video`, `video_view_count`, `video_files`, `video_thumbnail`, `album_preview`, `comments_id`, `shares_id`, `associated_group_id`, `associated_group`, além de metadados anexos preservados no payload bruto.

**PAGE_POSTS = CONFIRMED**

### DATE_FILTER_STATUS

**DATE_FILTER_STATUS = WORKING**

Evidência programática:

- `start_date=2026-08-23`: zero resultados, confirmando o limite inferior;
- `end_date=2026-08-21`: posts anteriores a 21/08, confirmando o limite superior;
- `start_date=2026-08-21&end_date=2026-08-22`: três posts de 21/08;
- `start_date=2026-08-21&end_date=2026-08-21`: zero resultados.

Semântica observada: intervalo `[start_date, end_date)`, com `end_date` exclusivo. Para coletar um dia civil, o backend deve enviar o dia seguinte como `end_date`. Não foi necessário fallback client-side.

### CURSOR_PAGINATION_STATUS

**CURSOR_PAGINATION_STATUS = CONFIRMED**

- três páginas reais executadas, com três posts cada;
- cursor avançou em todas as transições;
- IDs e timestamps mudaram entre páginas;
- zero sobreposição nas páginas observadas;
- nenhum loop;
- parada em `results=[]` e `cursor=null`, dedupe e loop guard permanecem cobertos por testes locais;
- a coleta real foi encerrada após evidência suficiente, evitando consumo desnecessário.

### STABLE_POST_ID

**STABLE_POST_ID = CONFIRMED**

O baseline foi repetido e retornou os mesmos três `post_id`, na mesma ordem. Portanto, `platform=facebook` + `platform_post_id=post_id` é chave adequada para idempotência no contrato atual.

### Fixture sanitizada real

Criada em `lib/facebook/fixtures/page-posts.runtime.sanitized.json` a partir da primeira resposta real. Textos públicos foram neutralizados, URLs de CDN foram substituídas, e cursor/headers sensíveis não foram preservados. IDs estáveis e estrutura necessária à regressão foram mantidos.

### Mudanças no normalizer

O normalizer atual foi executado contra a fixture real sanitizada e confirmou ID, tipo, autor, imagem, timestamp, comentários, total/breakdown de reações e compartilhamentos. `image.uri` já era tratado corretamente. Não foi necessária alteração do normalizer nem promoção especulativa de campos de vídeo/álbum que vieram `null` na amostra.

### Matriz final de capacidades

| Capacidade | Status | Evidência |
|---|---|---|
| PAGE_POSTS | CONFIRMED | HTTP 200, payload real, três resultados e cursor |
| DATE_FILTER | CONFIRMED | `start_date`, `end_date` e combinação; fim exclusivo |
| CURSOR_PAGINATION | CONFIRMED | três páginas reais, cursores progressivos, sem overlap/loop |
| STABLE_POST_ID | CONFIRMED | baseline repetido com IDs idênticos |
| PAGE_LOOKUP | NOT_TESTED | nenhum path comprovado para handle/URL → Page ID |
| PAGE_DETAILS | NOT_TESTED | path não comprovado |
| POST_DETAILS | NOT_TESTED | path não comprovado |
| COMMENTS | NOT_TESTED | path não comprovado |
| RESHARES | NOT_TESTED | path não comprovado |
| SEARCH_PAGES | NOT_TESTED | path não comprovado |
| SEARCH_POSTS | NOT_TESTED | path não comprovado |
| SEARCH_PEOPLE | NOT_TESTED | path não comprovado |

### Resolução handle/URL → Page ID

Não foi encontrado path oficial comprovável nesta rodada; por segurança, nenhuma URL foi inferida ou executada. O payload de Page Posts confirma `author.id=100064348075846`, mas isso não resolve o cadastro inicial porque a chamada já exige o Page ID. Recomendação para o próximo bloco: manter Page ID explícito até existir endpoint documentado e homologado; então encapsular a resolução server-side, com validação de correspondência entre handle/URL e ID, sem alterar schema ou UI nesta rodada.

### Persistência controlada

A persistência permaneceu restrita a mocks:

- primeiro upsert: PASS;
- segunda entrada idêntica deduplicada: PASS;
- onConflict `platform,platform_post_id`: PASS;
- cross-tenant fail-closed: PASS;
- `raw_json` preserva breakdown e lineage: PASS;
- `content_origin=OWNED`: PASS;
- nenhuma escrita Supabase real.

### Decisão reactions_count / like_count

Decisão adotada: **B — manter o total somente no `raw_json` por enquanto**.

Motivo: `reactions_count` soma like, love, care, haha, wow, sad e angry; gravá-lo como `social_posts.like_count` induziria consumidores genéricos a interpretar total de reações como likes reais.

Implementação:

- `social_posts.like_count = null` para Facebook V1;
- `raw_json.reactions_count` preserva o total;
- `raw_json.reactions` preserva o breakdown;
- nenhuma migration;
- extensão estruturada futura somente após consumidores e semântica serem aprovados.

### Testes do Bloco 1B

- Facebook + regressão dirigida Instagram/X: 7 arquivos, 69 testes, PASS;
- fixture runtime sanitizada exercitada pelo normalizer: PASS;
- TypeScript: PASS;
- ESLint dirigido: PASS;
- `git diff --check`: PASS;
- build Next.js: PASS.

### Segurança

- key server-side e obrigatória;
- nenhum `NEXT_PUBLIC_*`;
- nenhum secret em URL, fixture, relatório ou commit;
- erros do provider não incluem body remoto;
- host/path defaults confirmados;
- tenant isolation preservado;
- nenhum deploy;
- nenhum n8n;
- nenhuma alteração em Instagram/X.

### Débitos e bloqueadores

Nenhum blocker estrutural para encerrar o Bloco 1. Permanecem como débitos não bloqueadores os endpoints complementares e a resolução handle/URL → Page ID, cujos paths não foram comprovados.

### Recomendação do Bloco 1B

**GO**. Os critérios runtime, segurança, testes e build foram atendidos. Este veredito não autoriza Bloco 2, deploy, n8n ou escrita em produção.
