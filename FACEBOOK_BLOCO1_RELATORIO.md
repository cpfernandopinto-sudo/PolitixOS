# FACEBOOK — BLOCO 1 — RELATÓRIO TÉCNICO

## 1. Resumo executivo

Foi implementada a fundação backend modular do Facebook V1, sem deploy, sem alterações em Instagram/X/n8n e sem mudança de schema. A solução reutiliza `social_posts`, `social_accounts`, `collection_logs`, `social_post_targets` e o padrão futuro de `ai_analysis`.

A prova programática externa não pôde ser executada porque `FACEBOOK_SCRAPER_RAPIDAPI_KEY` não existe no ambiente seguro disponível. O host e o path foram corrigidos no Bloco 1B para os valores confirmados da API `facebook-scraper3`.

**Veredito: GO_WITH_RESTRICTIONS.**

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
| PAGE_LOOKUP | NOT_TESTED | sem credencial/path |
| PAGE_POSTS | PARTIAL | evidência manual; client implementado |
| DATE_FILTER | NOT_TESTED | helper implementado; runtime pendente |
| CURSOR_PAGINATION | PARTIAL | evidência manual; proteção/testes locais PASS |
| POST_DETAILS | NOT_TESTED | endpoint/path não comprovado |
| COMMENTS | PARTIAL | contagem observada; endpoint de comentários não testado |
| REACTIONS | PARTIAL | total/breakdown observados; endpoint próprio não testado |
| SHARES | PARTIAL | contagem/ID observados; endpoint próprio não testado |
| IMAGE | PARTIAL | campo observado; normalização testada |
| VIDEO | NOT_TESTED | normalização preparada; payload runtime pendente |
| REELS | NOT_TESTED | normalização preparada; payload runtime pendente |
| AUTHOR | PARTIAL | campos observados; normalização testada |
| PERMALINK | PARTIAL | campo observado; normalização testada |
| STABLE_POST_ID | PARTIAL | `post_id` observado; estabilidade entre execuções não reproduzida |
| SEARCH_POSTS | NOT_TESTED | endpoint/path não comprovado |
| SEARCH_PAGES | NOT_TESTED | endpoint/path não comprovado |
| SEARCH_PEOPLE | NOT_TESTED | endpoint/path não comprovado |

## 11. DATE_FILTER_STATUS

**DATE_FILTER_STATUS = UNKNOWN**

O provider envia programaticamente `start_date` e `end_date` em `YYYY-MM-DD`, e o helper compara cada `published_at` retornado contra a janela. Sem credencial não foi possível determinar se o servidor respeita, ignora ou aplica parcialmente o filtro.

## 12. Resultado da paginação

- Cursor opaco suportado.
- Cursor null encerra naturalmente.
- `results:[]` encerra naturalmente.
- Cursor repetido produz `FACEBOOK_CURSOR_LOOP`.
- Máximo de páginas limitado a 100; default 10.
- Posts deduplicados por ID durante páginas sobrepostas.
- 4 testes de paginação/data status: PASS.

Runtime externo: pendente.

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
- adicionar fixture sanitizada de runtime somente após primeira prova real;
- integrar artefato n8n em bloco posterior, sem ativação.

## 23. Bloqueadores reais

Para homologação da API:

1. `FACEBOOK_SCRAPER_RAPIDAPI_KEY` ausente;
2. DATE_FILTER_STATUS ainda UNKNOWN;
3. endpoints de detalhes/comentários/search não comprovados.

Não há blocker para manter e auditar a fundação local.

## 24. Próximo passo recomendado

Configurar localmente, fora do Git:

- `FACEBOOK_SCRAPER_RAPIDAPI_KEY`;
- opcional `FACEBOOK_SCRAPER_PAGE_POSTS_PATH` (default seguro `/page/posts`);
- opcional `FACEBOOK_SCRAPER_RAPIDAPI_HOST`.

Depois executar prova controlada com `page_id=100064348075846`:

1. baseline sem datas;
2. start_date;
3. end_date;
4. intervalo;
5. ao menos dois cursores ou final natural;
6. reexecução para estabilidade de IDs;
7. detalhes/comentários e buscas conforme paths comprovados;
8. nenhuma persistência produtiva durante a prova.

Somente depois preparar workflow n8n inativo.

## 25. Veredito final

# GO_WITH_RESTRICTIONS

- Fundação backend: GO.
- Schema inicial: GO sem migration.
- Homologação `facebook-scraper3`: host/path corrigidos; pendente somente de credencial e prova runtime.
- OWNED: arquitetura pronta; execução real pendente.
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
FACEBOOK_SCRAPER_RAPIDAPI_KEY=MISSING
```

Somente o nome da variável foi verificado. Nenhuma chave foi lida, reutilizada de screenshot, exibida, logada ou persistida.

### Endpoints testados

| Endpoint | Resultado |
|---|---|
| `GET /page/posts` | NOT_TESTED — key ausente |
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

Nenhuma requisição externa foi executada no Bloco 1B. Por isso:

- status HTTP: não observado;
- quantidade/cursor/timestamps: não observados;
- payload real: não capturado;
- IDs reais: não comparados;
- normalizer contra runtime: pendente.

### DATE_FILTER_STATUS

**DATE_FILTER_STATUS = UNKNOWN**

Impedimento externo real: ausência da credencial. O client confirma por teste que transmite `start_date` e `end_date` diretamente como `YYYY-MM-DD`, mas isso não homologa o comportamento do servidor.

### CURSOR_PAGINATION_STATUS

**CURSOR_PAGINATION_STATUS = PARTIAL**

- lógica local, cursor null, results vazio, cursor repetido, dedupe e limite: PASS;
- runtime manual prévio: evidência recebida;
- reprodução programática nesta rodada: bloqueada pela key.

### STABLE_POST_ID

**STABLE_POST_ID = PARTIAL**

`post_id` permanece a chave candidata correta, mas a estabilidade entre duas respostas reais não foi reproduzida nesta rodada.

### Fixture sanitizada real

Não criada. Sem response runtime, criar fixture seria fabricar evidência, o que é proibido.

### Mudanças no normalizer

Nenhuma mudança de shape foi feita sem payload real. O normalizer continua preparado para os campos informados, mas somente campos efetivamente observados em uma futura execução serão promovidos a CONFIRMED.

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

- Facebook + regressão dirigida Instagram/X: 7 arquivos, 68 testes, PASS;
- TypeScript: PASS;
- ESLint dirigido: PASS;
- `git diff --check`: PASS;
- build Next.js do Bloco 1B: PASS.

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

Bloqueador único para executar a prova runtime:

```text
FACEBOOK_SCRAPER_RAPIDAPI_KEY=<necessária>
```

Depois da disponibilização segura da variável, ainda devem ser executados: baseline, filtros de data, paginação, repetição de janela, captura de fixture real e descoberta comprovada dos endpoints secundários.

### Recomendação do Bloco 1B

Manter o veredito **GO_WITH_RESTRICTIONS** até a prova runtime. Não avançar para n8n ou produção antes de:

- PAGE_POSTS = CONFIRMED;
- CURSOR_PAGINATION = CONFIRMED;
- STABLE_POST_ID = CONFIRMED;
- normalização validada contra payload real;
- DATE_FILTER classificado.
