# POLITIXOS — Facebook Bloco 4 — Analytics + Contrato de IA + Readiness n8n

Data: 22/08/2026
Branch: `codex/facebook-bloco1`
Escopo: integrar Facebook ao pipeline analítico com contrato multi-plataforma correto, processar os 8 posts reais já persistidos, deixar o contrato de n8n documentado. Sem ativar n8n, sem deploy, sem redesign de UX, sem iniciar Bloco 5.

## 1. Resumo executivo

Facebook agora entra corretamente no pipeline analítico do PolitixOS: content_type classificado, fila de análise própria, contrato analítico que nunca trata `reactions_count` como "curtidas" nem `like_count=null` como zero, prompt de IA com regras explícitas sobre reações e ausência de texto de comentários, e um runner que chama o LLM com **structured output** (JSON Schema nativo do Anthropic) em vez de parsing de texto solto. Os 8 posts reais da Michelle Bolsonaro foram processados com IA real (Claude Sonnet 5) e persistidos em `ai_analysis`. Três problemas reais só descobertos na execução E2E real foram corrigidos nesta mesma fase (detalhado na seção 11). `FACEBOOK_REAL_ANALYTICS_E2E = PASS`.

## 2. Pipeline anterior (mapeamento real)

- `social_posts_pending_analysis` hardcoda `platform = 'instagram'` e nem seleciona `platform`/`raw_json` — Facebook nunca apareceria nela.
- `x_posts_pending_analysis` é uma view irmã, hardcoda `platform = 'x'` — confirma que o padrão já estabelecido no projeto é **uma view por plataforma**, não uma view única alargada.
- `classify_social_content_type` retornava `NULL` para qualquer plataforma diferente de `'instagram'`.
- A análise de IA real (Instagram produção, X V2 shadow) roda em **n8n**, não em código da aplicação — os prompts são montados inline em Code nodes, com `post.like_count || 0` embutido no texto enviado ao modelo.
- `lib/queries/instagram.ts`/`x.ts` fazem `.from('ai_analysis').select('*').eq('content_type','post').in('content_id', allPostIds)` e mapeiam por `content_id` — este é o padrão de leitura reaproveitado no Bloco 4.
- Não existia nenhum adapter/normalizer multi-plataforma; cada pipeline monta seu próprio formato de post para IA a partir de campos brutos.

## 3. Incompatibilidades encontradas

1. `like_count || 0` (queries e prompt n8n) transformaria `null` (Facebook) em "0 curtidas" — falso.
2. `classify_social_content_type` sempre `NULL` para Facebook.
3. Nenhuma fila de pendência incluía Facebook.
4. O prompt existente não tem noção de reações nem de "texto de comentário indisponível".
5. **Descoberta nova, fora do que o Bloco 3 já havia documentado**: `ai_analysis.sentiment` não tem CHECK constraint no banco, mas os consumidores fazem comparação exata de string (`lib/queries/alerts.ts:217`, `p.sentiment?.toLowerCase() === 'negativo'`). Um `sentiment` livre (o que um LLM sem contrato fechado produz) quebraria esse alerta silenciosamente para Facebook. Corrigido na seção 11.

## 4. Contrato analítico

Novo módulo `lib/facebook/analytics-contract.ts` — normaliza uma linha de `social_posts`/`facebook_posts_pending_analysis` para:

```
FacebookAnalyticsPost {
  id, clientId, targetId, platform: 'facebook', contentOrigin, contentType, text, publishedAt, url,
  engagement: { likes: null, reactionsTotal, reactionsBreakdown{like,love,care,haha,wow,sad,angry}, comments{count,textAvailable:false}, shares }
}
```

O consumidor (prompt, futura leitura de dashboard) nunca acessa `raw_json.reactions_count` diretamente.

## 5. Semântica de reactions

- `likes`: sempre `null`, nunca `0`.
- `reactionsTotal`: `raw_json.reactions_count`.
- `reactionsBreakdown`: `raw_json.reactions` completo (7 chaves), preservando `null` quando ausente.
- Nenhuma conversão de ausência em zero em nenhum ponto do contrato.

## 6. Engagement normalizado

`computeFacebookEngagementTotal = reactionsTotal + comments.count + shares` (parcela ausente conta como 0 na soma, mas nunca é ocultada do contrato — `comments.count` continua `null` mesmo que a soma exista). Retorna `null` apenas quando as três parcelas são desconhecidas. Documentado e testado que **engagementTotal não é sentimento** — é passado ao prompt rotulado explicitamente como "apenas agregado comportamental".

## 7. Content type

Migration `supabase_migration_facebook_content_type_contract.sql` estende `classify_social_content_type` com um branch `platform = 'facebook'` (preserva o branch Instagram byte-a-byte), mapeando:

| media_type | content_type |
|---|---|
| image, photo | IMAGE |
| reel | REEL |
| album, carousel | CAROUSEL |
| video | VIDEO |
| outro/ausente | OUTRO |

Nenhum tipo foi inventado: `image`/`post` é o único tipo real observado nos 8 posts (todos viraram `IMAGE`); `reel`/`video`/`album` são suportados por analogia ao que o normalizer (`lib/facebook/normalizer.ts`) já é capaz de produzir, mas ainda não observados nos dados reais — documentado como tal. Nenhuma alteração no CHECK constraint (mesmo domínio `IMAGE/REEL/CAROUSEL/VIDEO/OUTRO`) nem no trigger. Espelho em TS: `lib/facebook/content-type.ts` (`classifyFacebookContentType`), usado apenas para testes/consistência — a fonte de verdade em runtime continua o trigger SQL.

## 8. Pending analysis

Nova view `facebook_posts_pending_analysis` (migration própria), seguindo exatamente o precedente de `x_posts_pending_analysis`: uma view por plataforma, com `LEFT JOIN ai_analysis ... WHERE ai.id IS NULL`, expondo `platform`, `raw_json`, `content_origin`, `content_type`, `client_id`, `target_id`. `social_posts_pending_analysis` (Instagram) e `x_posts_pending_analysis` não foram tocadas. `get_advisors` confirma que a nova view dispara exatamente as mesmas duas classes de achado pré-existentes nas suas duas irmãs (`security_definer_view`, `pg_graphql_*_table_exposed`) — nenhuma classe nova de risco introduzida.

## 9. Prompt de IA

`lib/facebook/analysis-prompt.ts`: reaproveita integralmente o contrato de saída de 16 campos já usado por `ai_analysis` (superset já usado por Instagram/X) — nenhuma dimensão política nova. O prompt:
- rotula explicitamente `platform: facebook`;
- nunca menciona "curtidas" nem envia `like_count`;
- envia `reactions_total` e os 7 componentes do breakdown rotulados `reaction_<tipo>`;
- instrui que reações são sinal comportamental, não sentimento determinístico (haha pode ser apoio/ironia/deboche; angry pode mirar o tema, um terceiro ou o autor; love/like não indicam intenção de voto);
- declara explicitamente `comments_text: unavailable`.

**Structured output real**: a chamada usa `client.messages.parse()` com `output_config.format = {type:'json_schema', schema: z.toJSONSchema(FacebookAnalysisOutputSchema)}` — o mesmo padrão já homologado em `lib/territorios/intelligence/interpretation/anthropic-provider.ts`. O modelo é estruturalmente impedido de responder fora do schema ou com `risk_level`/`sentiment` fora do domínio, em vez de depender de parsing de texto solto e regex.

## 10. Comentários

`engagement.comments = { count, textAvailable: false }` sempre. O prompt nunca recebe nem infere texto de comentário — apenas a contagem, com uma linha explícita "não coletado para esta plataforma". Nenhum comentário foi simulado.

## 11. Processamento real dos 8 posts — o que a execução real revelou

Executado via teste E2E descartável (mesmo padrão do Bloco 3B: script real, removido após a execução), contra os 8 posts reais de Michelle Bolsonaro, com `ANTHROPIC_API_KEY` real e persistência real em `ai_analysis`. Três problemas reais, não previstos no design inicial, apareceram e foram corrigidos nesta mesma fase — nenhum foi contornado ou ocultado:

1. **`ai_analysis_risk_level_check` (CHECK constraint real, não documentada em nenhum relatório anterior)**: só aceita `baixo|medio|alto|critico`. O schema inicial tratava `risk_level` como string livre; 2/8 posts falharam ao persistir. Corrigido: `risk_level` virou `z.enum(['baixo','medio','alto','critico'])`, embutido também no JSON Schema enviado ao modelo.
2. **Truncamento de JSON (`MAX_TOKENS=1200` insuficiente)**: 3/8 respostas vieram com string JSON não terminada em posts com texto mais longo. Corrigido: `MAX_TOKENS` para 2048.
3. **`sentiment` livre incompatível com consumidor real**: o modelo produziu valores como `"positivo/apoio ao ministro (tom do post), engajamento público baixo..."`. `lib/queries/alerts.ts:217` faz `sentiment === 'negativo'` (comparação exata) — um valor assim nunca dispararia o alerta de sentimento negativo para Facebook, quebrando silenciosamente essa funcionalidade. Corrigido: `sentiment` virou `z.enum(['positivo','negativo','neutro','misto'])`, o mesmo domínio observado em 100% das 397 linhas reais de Instagram/X (`204 positivo / 104 neutro / 89 negativo / 4 misto`, zero fora do domínio).

Um efeito colateral do JSON Schema gerado pelo zod: a API do Anthropic rejeita `minimum`/`maximum` em propriedades `number` (`400 output_config.format.schema: ... not supported`) — corrigido removendo essas duas chaves do schema enviado ao provider (a validação de intervalo de `confidence_score` continua garantida pelo `safeParse` do zod após a resposta, que é a autoridade final).

Depois das 3 correções, os 8 posts foram reprocessados do zero (as 8 linhas provisórias, criadas por mim minutos antes com o schema solto, foram apagadas e regeneradas — nenhum dado histórico real de terceiros foi tocado). Resultado final: **8 elegíveis → 8 processados → 8 sucesso → 0 falha → 0 pulado**. Reexecução imediata confirmou idempotência: **0 elegíveis** na segunda chamada.

## 12. Outputs (amostra completa — 8/8)

| platform_post_id | sentiment | risk_level | confidence | tema |
|---|---|---|---|---|
| 1507432994744955 | positivo | baixo | 0.55 | Decisão rápida do ministro André Mendonça |
| 1507290834759171 | positivo | baixo | 0.62 | Desempenho eleitoral de Tarcísio de Freitas |
| 1506856351469286 | negativo | alto | 0.55 | Acusação contra o STF (prisão de Filipe Martins) |
| 1506693981485523 | positivo | medio | 0.60 | Pesquisa eleitoral — candidato Marçal |
| 1506511431503778 | negativo | alto | 0.62 | Segurança pública e violência criminal |
| 1506455818176006 | neutro | baixo | 0.55 | Investigação de vazamento pela PF |
| 1506315171523404 | negativo | alto | 0.60 | Suposta investigação da PF envolvendo aliado |
| 1506270751527846 | misto | medio | 0.55 | Defesa institucional de ministro do STF |

Confirmado por amostra: `platform = 'facebook'` correto em todas as 8 linhas; nenhum campo Facebook foi interpretado como Instagram (nenhuma menção a "curtidas" nos `risk_reason`/`summary` gerados); `content_type = IMAGE` em todas (único tipo real observado); engajamento refletido nos temas condiz com os valores reais de `reactions_count`/`comment_count` (ex.: o post com 299 reações e 79 compartilhamentos foi um dos que recebeu `risk_level=alto`).

## 13. Analytics read (backend readiness)

`lib/queries/facebook.ts` ganhou `fetchFacebookPostsWithAnalysis`, seguindo o mesmo padrão de leitura de `fetchInstagramData`/`fetchXData` (`ai_analysis` filtrado por `content_type='post'` e `content_id in (...)`, mapeado por `content_id`), retornando o post já no contrato analítico (`FacebookAnalyticsPost`) junto da linha de análise. Nenhum dashboard novo foi criado — apenas a função de leitura, testada com mocks (não requer credencial real). Escopo multi-tenant idêntico ao já existente em `fetchFacebookPosts` (client/target/social_account/período).

## 14. Idempotência

Dupla camada: (1) a view `facebook_posts_pending_analysis` já exclui qualquer post com linha em `ai_analysis`; (2) o runner faz uma checagem extra (`SELECT ... WHERE content_id = ? AND content_type = 'post'`) antes de cada insert, cobrindo o caso de rodar o runner duas vezes sobre uma lista já obtida. Comprovado empiricamente: a segunda chamada real, imediatamente após a primeira, retornou `eligible = 0`.

## 15. n8n contract (documentado, não ativado)

Fluxo futuro proposto (nenhum workflow criado ou tocado):

```
n8n → POST /api/automations/facebook/trigger (já existe, Bloco 3)
    → resposta { collectionComplete, termination, postsPersisted, ... }
    → n8n decide disparar analytics (novo endpoint futuro, ex.: POST /api/automations/facebook/analyze)
    → endpoint chama runFacebookAnalysis({ clientId, targetId, maxPosts })
    → resposta { eligible, success, failed, skipped }
```

Decisões de contrato:
- **Quando analisar**: analytics roda **por post persistido**, não por status do run (ver seção 16).
- **Coleta parcial**: pode ser analisada (decisão A, seção 16).
- **Retry**: nenhum retry automático dentro do runner — um post que falhar (`MODEL_RESPONSE_NOT_JSON`/erro de provider) simplesmente permanece elegível na view e será pego pela próxima invocação, sem endpoint de retry dedicado.
- **Idempotência**: garantida pela view + checagem extra (seção 14); um segundo trigger para o mesmo client/target nunca duplica ou reprocessa.
- **Erro de provider** (auth/rate limit/timeout/refusal): isolado por post, nunca aborta o lote — registrado como `failed` com motivo.
- **Erro de persistência** (`insert` falhar): idem, isolado, `failed`, sem afetar os demais posts do lote.

## 16. Partial collection behavior

**Decisão: opção A — analytics processa os posts já persistidos mesmo quando o `collection_log` do run é `SUCCESS_PARTIAL` (`termination=MAX_PAGES`).**

Motivo: a persistência é atômica por post (RPC `persist_facebook_social_posts`, Bloco 2E) — um post que está em `social_posts` é sempre um post completo e corretamente associado ao tenant, independentemente de a paginação do run ter atingido `cursor=null`/`EMPTY_RESULTS` ou parado em `MAX_PAGES`. `SUCCESS_PARTIAL` descreve a cobertura da janela de coleta, não a integridade de cada post individual. Esperar por uma "continuidade" do run não traz nenhum benefício de correção e apenas atrasaria a análise de conteúdo real e válido. Isso já satisfaz a preferência do enunciado ("analytics somente após persistência bem-sucedida") de forma literal e por post, não por run.

## 17. Segurança e custo

- `maxPosts` (default 20) limita o tamanho de cada lote processado, evitando custo descontrolado.
- Idempotência (seção 14) evita reprocessar e pagar duas vezes pelo mesmo post.
- Falha isolada por post evita que um erro de schema/parsing gaste o restante do orçamento do lote sem necessidade.
- `ANTHROPIC_API_KEY` usada apenas via `process.env`, nunca hardcoded, nunca logada; nenhuma ocorrência literal de chave no working tree (verificado).
- `risk_level`/`sentiment` fechados por enum eliminam uma classe de erro de persistência (CHECK constraint) que poderia, em produção, causar `failed` silencioso em escala.
- Nenhuma alteração na RPC atômica cross-tenant do Facebook (Bloco 2E) nem no provider/coletor (Bloco 3).

## 18. Arquivos criados/modificados

Criados:
- `lib/facebook/analytics-contract.ts` + `.test.ts`
- `lib/facebook/content-type.ts` + `.test.ts`
- `lib/facebook/analysis-prompt.ts` + `.test.ts`
- `lib/facebook/analysis-runner.ts` + `.test.ts`
- `lib/facebook/analytics-migration.test.ts`
- `supabase_migration_facebook_content_type_contract.sql`
- `supabase_migration_facebook_pending_analysis_view.sql`
- `FACEBOOK_BLOCO4_ANALYTICS_RELATORIO.md`

Modificados:
- `lib/queries/facebook.ts` (+ `fetchFacebookPostsWithAnalysis`)
- `lib/queries/facebook.test.ts`

Nenhum arquivo do provider, normalizer, pagination, collector, persistence (RPC) ou operational do Facebook foi alterado. Nenhum arquivo de Instagram/X foi alterado.

## 19. Migrations

`MIGRATION = SIM` — duas, ambas aditivas e aplicadas via Supabase MCP no projeto real (`hhhwuajptkyposarfbzn`):
1. `facebook_content_type_contract` — `CREATE OR REPLACE FUNCTION classify_social_content_type` (novo branch Facebook) + backfill restrito a `platform='facebook'`.
2. `facebook_pending_analysis_view` — `CREATE OR REPLACE VIEW facebook_posts_pending_analysis`.

Nenhum `ALTER TABLE`, `CREATE TABLE`, `DROP COLUMN` ou alteração de RLS/policy/constraint/trigger existente. Rollback de ambas documentado no próprio arquivo `.sql` (drop function/view).

## 20. Testes

- Testes novos/Facebook: 16 arquivos, 80 testes, PASS.
- Suíte completa do repositório: 153 arquivos PASS (5 skipped), 1.320 testes PASS (5 skipped).
- TypeScript (`tsc --noEmit`): PASS, 0 erros.
- ESLint dirigido (`lib/facebook`, `lib/queries/facebook.ts`, `lib/queries/facebook.test.ts`): PASS, 0 warnings.
- `git diff --check`: PASS (limpo).
- `next build` (produção): PASS, todas as rotas existentes presentes, nenhuma rota nova (nenhum endpoint de analytics foi criado nesta fase, conforme escopo).

## 21. Regressões

- Instagram: 656 posts, `content_type` inalterado (74 IMAGE / 106 CAROUSEL / 476 REEL, mesmos totais de antes).
- X: 401 posts, `content_type = NULL` em todos (comportamento preservado — branch `else null` intacto).
- Facebook: 8 posts, contagem inalterada; `content_type = IMAGE` nos 8 (novo, correto).
- Zero duplicidade global, zero alteração de ownership/tenant em qualquer post real.
- `facebook_posts_pending_analysis` não interfere com `social_posts_pending_analysis`/`x_posts_pending_analysis` (views independentes, sem alteração nelas).

## 22. Blockers

Nenhum blocker impede o veredito. Débitos preservados, não promovidos:
- `ROTATE_FACEBOOK_RAPIDAPI_KEY_BEFORE_CONTINUOUS_PRODUCTION` (Bloco 3, inalterado).
- P2/P3 do Bloco 1-2-3 (lineage "último run vence", identity validation por uma fonte, Page ID resolution automática, endpoints complementares, vídeo/Reels/álbum ainda não homologados em produção real, `delegate_page_id`/`associated_group_id`) — preservados verbatim, não relitigados.
- Novo item de backlog (P2, não bloqueador): o endpoint futuro `POST /api/automations/facebook/analyze` mencionado na seção 15 é apenas documentado — implementá-lo é trabalho de um bloco futuro de integração n8n, explicitamente fora do escopo aqui ("NÃO ativar n8n").

## 23. Veredito

| Critério | Resultado |
|---|---|
| FACEBOOK_ANALYTICS_ADAPTER | PASS |
| FACEBOOK_PENDING_ANALYSIS | PASS |
| FACEBOOK_CONTENT_TYPE | PASS |
| REACTIONS_SEMANTICS | PASS |
| FACEBOOK_PROMPT_CONTRACT | PASS |
| ANALYTICS_IDEMPOTENCY | PASS |
| TENANT_ISOLATION | PASS (escopo client/target explícito, obrigatório, sem fallback) |
| BACKEND_ANALYTICS_READ | PASS |
| INSTAGRAM_REGRESSION | PASS |
| X_REGRESSION | PASS |
| TYPECHECK | PASS |
| ESLINT | PASS |
| BUILD | PASS |
| FACEBOOK_REAL_ANALYTICS_E2E | PASS (8/8 posts reais processados e persistidos, IA real, idempotência real confirmada) |

`VEREDITO = GO`

## 24. Próximo passo objetivo

1. Se/quando o Bloco de integração n8n for autorizado: criar `POST /api/automations/facebook/analyze` (mesmo padrão de auth/rate-limit/secret do trigger de coleta) que chame `runFacebookAnalysis`, e então (só então) ligar o disparo a partir do workflow n8n de coleta.
2. Considerar dashboard de Facebook (fora de escopo aqui) consumindo `fetchFacebookPostsWithAnalysis`.
3. Rotacionar `FACEBOOK_SCRAPER_RAPIDAPI_KEY` antes de produção contínua (débito já conhecido, inalterado).

Não ativei n8n, não fiz deploy, não iniciei redesign de UX, não iniciei o Bloco 5.
