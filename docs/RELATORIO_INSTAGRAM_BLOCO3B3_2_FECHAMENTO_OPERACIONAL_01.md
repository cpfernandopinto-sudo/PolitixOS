# RELATÓRIO — INSTAGRAM BLOCO 3B.3.2 — FECHAMENTO OPERACIONAL

Data: 2026-08-21  
Branch: `codex/instagram-pipeline-v2-3b3-2`  
Escopo: auditabilidade MCP, prova E2E de comentários e consolidação do Pipeline V2 em shadow mode.

## 1. Executive Summary

O bloco encerrou os dois achados remanescentes. O Pipeline V2 (`IjcU6bLAWv4QJfJy`) e o subworkflow de retry (`NNVa2bGFLAMlxVnV`) estão com `availableInMCP=true`, comprovado ao vivo após reabrir as configurações. O estágio de comentários foi exercitado de ponta a ponta em três execuções válidas: S1 `27470`, S1-idempotência `27477` e S2 `27484`.

S1 e sua repetição processaram 3 posts, chamaram `/post/comments` 3 vezes e retornaram/persistiram 29 comentários por execução. S2 processou 10 posts, chamou `/post/comments` 10 vezes e retornou/persistiu 134 comentários. O crescimento físico final foi de 134 comentários únicos, confirmando que a repetição S1 foi idempotente e que S2 acrescentou somente 105 comentários ainda ausentes.

Não houve migration, DDL, alteração de schema, cutover, ativação de schedule, IA nova ou alteração do Legacy. O resultado é `READY FOR INDEPENDENT AUDIT / 3B.4 DESIGN`.

## 2. Checkpoint A

- Base auditada: `e4563ee7bcbcc9999225b5b1ab01fba2be3d2b48`.
- Branch-base encontrada: `codex/instagram-pipeline-v2-3b3-1`.
- Branch de trabalho criada: `codex/instagram-pipeline-v2-3b3-2`.
- Working tree inicial: limpo.
- Legacy `XaWHmrrnobud6La1`: publicado/ativo; última versão permaneceu `Bloco 2: escopo por client_id...`, Aug 21 00:07:33.
- V2 inicial: inactive, schedule OFF, 26 nós.
- Retry inicial: inactive, 13 nós, sem schedule.
- Draft `4zyT02YS5XLoxB7k`: identificado como `DRAFT INVALID (não executar)`, schedule de seu trigger desativado e não utilizado.
- Baseline inicial: 1.033 `social_posts`, 652 Instagram, 381 X, 125.985 `instagram_comments`, 1.045 `ai_analysis`, 2.632 `collection_logs`; zero `client_id` nulo, duplicidades e órfãos.

## 3. Causa raiz real do M-04

Havia três causas combinadas:

1. após o upsert, o V2 confiava somente na representação retornada pelo PostgREST, sem reconciliá-la deterministicamente com o post normalizado original;
2. a chamada de comentários enviava `shortcode`, mas o contrato real do endpoint `/post/comments` exige `url` e `trim=true`;
3. quando o endpoint retornava zero itens, `Normalize Comments` emitia zero itens e interrompia naturalmente a cadeia, portanto a ausência de log não distinguia “não chamou” de “chamou e retornou zero”.

O payload real também revelou timestamps em mais de um formato, enquanto a normalização anterior presumia epoch em segundos.

## 4. Correção implementada

- Reconciliação post normalizado ↔ post persistido por chave estável `client_id::platform::platform_post_id`, nunca por posição de array.
- Preservação do contexto normalizado, inclusive `shortcode` e `post_url`, após confirmação do `id` persistido.
- Elegibilidade explícita: `id`, `client_id` e `shortcode` obrigatórios para comentários.
- `/post/comments` agora recebe `url: post_url || https://www.instagram.com/p/{shortcode}/` e `trim:true`.
- Normalização agregada de todas as respostas de comentários.
- Timestamp aceita epoch em segundos, epoch em milissegundos e data textual válida; valor inválido vira `NULL`, não data inventada.
- Dois novos nós de telemetria: `Prepare Comments Skip Log` e `Prepare Comments Fetch Log`.
- O log de persistência recebeu `phase`, `operational_outcome`, `posts_eligible`, `comments_returned` e `comments_persisted`.

## 5. Evidência H-04

- V2: configuração reaberta após a importação final, `availableInMCP=true`.
- Retry: configuração reaberta, `availableInMCP=true`.
- V2: execuções `27470`, `27477` e `27484` permanecem consultáveis no histórico.
- Retry: execuções filhas consultáveis; na S2, IDs `27485` a `27497`.
- Causa da falsa confirmação anterior: o seletor genérico atingia o contêiner errado e a importação podia recompor o estado salvo. A correção usou o switch único `div.el-switch[data-test-id="workflow-settings-available-in-mcp"]` e verificou o `aria-checked` do input após salvar e reabrir.

Classificação: **H-04 PASS**.

## 6. Topologia final

- Pipeline V2: 28 nós, `active=false`, schedule interno desativado.
- Retry: 13 nós, `active=false`, sem schedule trigger.
- Todos os quatro pontos externos do V2 continuam delegados ao Retry: user posts, post comments, enrichment e comment replies.
- Writer de `collection_logs` foi reutilizado; nenhuma nova persistência shadow ou tabela foi criada.
- Legacy permanece separado, publicado e inalterado.

## 7. Telemetria

O estágio `comments` agora registra:

- `phase=eligibility`, outcome `SKIPPED_NO_ELIGIBLE_POSTS`: endpoint não chamado;
- `phase=fetch`, outcome `SUCCESS_ZERO_RESULTS`: endpoint chamado com sucesso e zero resultados;
- `phase=fetch`, outcome `SUCCESS_WITH_RESULTS`, `PARTIAL` ou `ERROR`;
- `phase=persistence`: contagens retornadas e efetivamente persistidas.

Campos centrais: `posts_eligible`, `calls_post_comments`, `logical_calls`, `physical_attempts`, `retry_attempts`, `comments_returned`, `comments_persisted`, `errors_count` e `warnings_count`.

## 8. Testes adicionados

Foi criada a suíte `scripts/instagram-comments-stage.test.ts`, cobrindo:

- elegibilidade com shortcode;
- skip explícito sem shortcode;
- falha de persistência;
- reconciliação fora de ordem por chave estável;
- isolamento entre tenants;
- deduplicação de comentários;
- sucesso com zero resultado;
- distinção de endpoint não chamado;
- retry para 429/5xx e ausência de retry para 4xx permanentes;
- normalização de timestamps.

O validador estrutural passou a exigir a nova topologia, as fases de telemetria, o contrato `url + trim`, a reconciliação estável e a ausência de `_v2_retry_telemetry`.

## 9. Resultado completo dos testes

- TypeScript: PASS, `npx tsc --noEmit`.
- Build Next.js 16.2.6: PASS; compilação em 4,5 s, TypeScript em 5,9 s, 22/22 páginas estáticas.
- Vitest completo: PASS; 128 arquivos passaram, 5 ignorados; 1.150 testes passaram, 5 ignorados, total 1.155.
- Validador estrutural Instagram: PASS; V2 28 nós e Retry 13 nós.
- Retry policy + testes 3B.3.2: PASS; 2 arquivos, 30 testes.
- `git diff --check`: PASS.

## 10. Execução S1

- V2 execution: `27470`, sucesso, 19,285 s.
- Posts: 3 descobertos/persistidos.
- Elegíveis para comentários: 3.
- `/post/comments`: 3 chamadas.
- Comentários retornados: 29.
- Comentários persistidos: 29.
- Fetch outcome: `SUCCESS_WITH_RESULTS`.
- Persistence outcome: `SUCCESS`.
- Retries: 0.

## 11. Execução S1-idempotência

- V2 execution: `27477`, sucesso.
- Mesmos 3 posts e 29 comentários retornados/persistidos via upsert.
- Contagem física de `instagram_comments` não cresceu na repetição: os mesmos IDs do provedor foram atualizados, não duplicados.
- Duplicidades finais: zero.
- Retries: 0.

## 12. Execução S2

- V2 execution: `27484`, sucesso.
- Posts: 10 descobertos/persistidos.
- Elegíveis: 10.
- `/post/comments`: 10 chamadas.
- Comentários retornados: 134.
- Comentários persistidos via upsert: 134.
- Crescimento físico adicional sobre S1: 105; 29 já existiam.
- Fetch outcome: `SUCCESS_WITH_RESULTS`.
- Persistence outcome: `SUCCESS`.
- Retries: 0.

## 13. Evidência real `/post/comments`

A cadeia empírica ficou comprovada:

`post coletado → normalizado → upsert social_posts → reconciliado por chave estável → elegível → Retry → /post/comments → normalizado → upsert instagram_comments → collection_logs`.

As execuções S1 registram `posts_eligible=3`, `calls_post_comments=3`; S2 registra `posts_eligible=10`, `calls_post_comments=10`. A evidência não depende da existência de comentários, pois o fetch sempre produz log próprio.

## 14. Comentários retornados/persistidos

| Execução | Retornados | Upserts confirmados | Crescimento físico |
|---|---:|---:|---:|
| 27470 | 29 | 29 | 29 |
| 27477 | 29 | 29 | 0 |
| 27484 | 134 | 134 | 105 |

Total final: 126.119 comentários, delta líquido de +134 sobre 125.985.

## 15. Retry telemetry

- S1 `27470`: 6 logical calls/physical attempts, 0 retries; 1 user/posts + 3 comments + 1 enrichment + 1 replies.
- S1-idempotência `27477`: 6 logical calls/physical attempts, 0 retries; mesma decomposição.
- S2 `27484`: 13 logical calls/physical attempts, 0 retries; 1 user/posts + 10 comments + 1 enrichment + 1 replies.
- Nenhuma execução final carregou `_v2_retry_telemetry` no payload de persistência.
- Retry transitório permanece limitado a 408/429/500/502/503/504, três tentativas máximas e backoff limitado; 400/401/403/404 permanecem permanentes.

## 16. Multi-tenant

- Toda reconciliação inclui `client_id` na chave estável.
- Um retorno persistido de tenant B não pode confirmar um post do tenant A; há teste específico.
- Todos os logs finais têm `client_id` e escopo de conta/target.
- `client_id` nulo final: zero em posts e comentários.
- Dados X permaneceram em 381 posts, sem alteração semântica.

## 17. Idempotência

- Posts continuam com conflito por `(platform, platform_post_id)`.
- Comentários continuam com conflito pelo identificador canônico do provedor.
- S1 repetida reprocessou 29 comentários sem aumento físico.
- S2 reprocessou os mesmos 29 e acrescentou apenas 105 novos.
- Zero duplicidades finais em posts e comentários.

## 18. Baseline antes/depois

| Métrica | Antes | Depois | Delta |
|---|---:|---:|---:|
| social_posts | 1.033 | 1.033 | 0 |
| Instagram | 652 | 652 | 0 |
| X | 381 | 381 | 0 |
| instagram_comments | 125.985 | 126.119 | +134 |
| ai_analysis | 1.045 | 1.045 | 0 |
| collection_logs | 2.632 | 2.646 | +14 |
| client_id NULL | 0 | 0 | 0 |
| duplicidades | 0 | 0 | 0 |
| órfãos | 0 | 0 | 0 |

O delta de comentários é explicado integralmente por IDs reais retornados nas execuções shadow. O delta de logs é composto por 13 logs V2 das tentativas intermediárias e finais e 1 log Legacy legítimo.

## 19. Impacto do Legacy automático durante testes

Houve uma execução automática legítima do Legacy às 20:30:50 UTC, metadata `flow=instagram_posts_mvp`, handle `michellebolsonaro`, com 12 posts coletados e um novo `collection_logs`. Ela não alterou as contagens únicas de posts e foi separada dos 13 logs V2. O workflow Legacy não foi editado, pausado ou disparado manualmente neste bloco.

## 20. Custo em chamadas

Volume faturável estimado pela fórmula `physical_attempts = logical_calls + retry_attempts`:

- S1: 6 chamadas físicas.
- S1-idempotência: 6 chamadas físicas.
- S2: 13 chamadas físicas.
- Total das três execuções aceitas: 25 chamadas físicas, 0 retries.

Preço monetário não foi inventado. Custo monetário = `25 × preço unitário vigente do plano RapidAPI`, se aplicável.

## 21. Limitações restantes

- Paginação real de replies continua limitada pela ausência de amostra/contrato de cursor confirmado; o workflow não inventa cursor e registra `NOT_CONFIRMED_NO_ELIGIBLE_ACTIVE_PAYLOAD` quando aplicável.
- `availableInMCP` é configuração externa ao JSON exportado e deve ser revalidada após futuras recriações/importações do workflow.
- Não houve cenário final com `SUCCESS_ZERO_RESULTS`, mas o caminho é estruturalmente explícito e testado; as execuções finais tiveram resultados reais, evidência mais forte para o E2E.

## 22. Divergências encontradas durante desenvolvimento

- O endpoint real de comentários usa `url`, não `shortcode` como query parameter.
- Timestamps de comentário não são uniformemente epoch em segundos.
- A importação no editor pode anexar o arquivo à versão salva se o canvas vazio ainda não estiver persistido. O estado duplicado de 55 nós não foi mantido: todo o canvas foi limpo, recarregado e confirmado vazio antes de importar uma única cópia de 28 nós.
- A configuração MCP deve ser verificada no input real do switch; o contêiner visual não fornece prova suficiente.

## 23. Falhas intermediárias ocorridas e correções

- `27449`: `Normalize Comments` retornou lista em modo item-a-item (`json property isn't an object`). Corrigido para agregação com `$input.all().flatMap`.
- `27456`: workflow terminou, mas o log comments foi `ERROR`, mensagem `You must provide a url`. Corrigido o contrato para `url + trim=true`.
- `27465`: `Invalid time value` na normalização. Corrigido suporte a epoch segundos/milissegundos e data textual, com inválido → `NULL`.
- Primeira importação produziu 55 nós por recomposição/anexação. O estado foi limpo integralmente e a persistência do canvas vazio foi confirmada por reload antes da importação única.
- Primeira passagem TypeScript encontrou um parâmetro implícito `any` apenas no teste novo. O tipo foi explicitado e TypeScript passou.

Nenhuma dessas falhas exigiu rollback de banco, DROP, migration, alteração do Legacy ou exclusão de dados.

## 24. Matriz GO/NO-GO

| Critério | Estado | Evidência resumida |
|---|---|---|
| H-01 topology structural | PASS | validador, 28 nós, quatro chamadas via Retry |
| H-01 topology empirical | PASS | execuções V2 e filhas Retry reais |
| H-02 retry | PASS | contrato e testes 429/5xx vs 4xx |
| H-02 backoff | PASS | 3 tentativas, delay limitado |
| H-03 pagination | PASS WITH LIMITATION | sem cursor inventado; amostra de paginação real não confirmada |
| H-04 auditability | PASS | MCP true em V2/Retry e execuções consultáveis |
| M-02 error contract | PASS | outcomes ERROR/PARTIAL explícitos |
| M-03 parsing | PASS | payload e timestamps reais normalizados |
| M-04 comments E2E | PASS | 3/3/10 chamadas, 29/29/134 comentários |
| multi-tenant | PASS | chave inclui client_id, testes e nulos zero |
| idempotência | PASS | repetição sem crescimento/duplicação |
| Legacy preservation | PASS | publicado e última versão inalterada |
| baseline | PASS | deltas explicados, invariantes zero |
| tests | PASS | 1.150 testes passaram |
| build | PASS | Next.js production build |

GO para auditoria independente e desenho do 3B.4. NO-GO para cutover neste bloco.

## 25. Recomendação para 3B.4

Usar as execuções `27470`, `27477` e `27484` como baseline empírico para o desenho de cutover. Antes de qualquer ativação, manter revisão independente de MCP, políticas de rollback, janela controlada e comparação Legacy/V2. Nenhum elemento do 3B.4 foi implementado aqui.

## 26. Branch

`codex/instagram-pipeline-v2-3b3-2`, criada diretamente sobre o commit-base auditado `e4563ee`.

## 27. Commit

Commit descritivo do bloco: `fix(instagram): close v2 shadow comments observability`. O hash final é informado na entrega Codex porque o próprio relatório integra o commit.

## 28. Git status

Antes do commit: somente os artefatos intencionais deste bloco estavam modificados/adicionados. Após o commit, a entrega deve confirmar working tree limpo. Não houve push, merge, deploy, cutover ou avanço ao 3B.4.

---

**BLOCO 3B.3.2 CONCLUÍDO — READY FOR INDEPENDENT AUDIT / 3B.4 DESIGN.**
