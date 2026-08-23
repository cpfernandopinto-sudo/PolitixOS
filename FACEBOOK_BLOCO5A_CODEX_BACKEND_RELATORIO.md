# POLITIXOS — Facebook Bloco 5A — Backend de Automação + Endpoint Analytics + Contrato n8n

Data: 22/08/2026
Branch: `codex/facebook-bloco1`

## 1. Resumo executivo

Foi criada a camada backend `POST /api/automations/facebook/analyze`, reutilizando integralmente `runFacebookAnalysis`. O endpoint autentica automações, valida payload/custo, confirma o vínculo ativo `clientId ↔ targetId`, executa o runner homologado e devolve estados legíveis por máquina. A resposta da coleta recebeu apenas o campo aditivo `status`, preservando o objeto `result` existente.

O E2E real contra Michelle Bolsonaro retornou `NOTHING_TO_PROCESS`, `eligible=0`, confirmando idempotência sem nova chamada à IA ou escrita. Nenhum workflow n8n foi criado ou alterado.

## 2. Arquitetura encontrada

- coleta: `/api/automations/facebook/trigger` → resolver → orquestrador → provider → RPC atômica;
- analytics: `facebook_posts_pending_analysis` → contrato → prompt → `runFacebookAnalysis` → Anthropic structured output → `ai_analysis`;
- autenticação consolidada: sessão autorizada ou `X-Webhook-Secret` comparado em tempo constante;
- rate limit existente: bucket em memória por escopo, janela de 60 segundos;
- leitura: `fetchFacebookPostsWithAnalysis`, preservada.

## 3. Endpoint criado

`POST /api/automations/facebook/analyze`

O handler é somente uma camada operacional. Não replica prompt, adapter, provider Anthropic, persistência ou idempotência.

## 4. Autenticação

- n8n: header `X-Webhook-Secret`, usando o mesmo `FACEBOOK_COLLECTION_WEBHOOK_SECRET` do trigger de coleta;
- aplicação: sessão admin ou gestor com permissão `automacoes`, mesma origem;
- segredo ausente/incorreto: HTTP 401;
- segredo nunca é retornado ou logado.

## 5. Payload

```json
{
  "clientId": "uuid obrigatório",
  "targetId": "uuid obrigatório",
  "maxPosts": 5
}
```

Schema estrito. `maxPosts` é opcional, inteiro, mínimo 1 e máximo 20. Campos extras, UUIDs inválidos, body inválido e limites fora do intervalo retornam HTTP 400 `INVALID_PAYLOAD`.

## 6. Response contract

Campos estáveis de sucesso operacional:

```json
{
  "ok": true,
  "status": "SUCCESS | SUCCESS_WITH_FAILURES | NOTHING_TO_PROCESS",
  "platform": "facebook",
  "clientId": "uuid",
  "targetId": "uuid",
  "correlationId": "string segura",
  "eligible": 0,
  "processed": 0,
  "success": 0,
  "failed": 0,
  "skipped": 0,
  "analysisComplete": true,
  "termination": "COMPLETED | COMPLETED_WITH_FAILURES | NOTHING_TO_PROCESS",
  "items": []
}
```

Falha HTTP retorna `ok=false`, `status=FAILED`, `code` sanitizado e `correlationId`. Falhas isoladas por post continuam HTTP 200 com `SUCCESS_WITH_FAILURES`.

## 7. Status operacionais

- `SUCCESS`: lote elegível terminou sem falhas;
- `SUCCESS_WITH_FAILURES`: execução válida, com uma ou mais falhas isoladas;
- `NOTHING_TO_PROCESS`: nenhum post elegível, operação normal;
- `FAILED`: autenticação, payload, escopo, dependência ou exceção do lote impediu a execução.

## 8. Idempotência

O endpoint chama o runner existente, que combina a view de pendência com uma segunda checagem em `ai_analysis`. E2E real: 8 posts Facebook, 8 análises, 0 pendentes, segunda invocação com `eligible=0`. Zero análise duplicada.

## 9. Tenant isolation

- `clientId` e `targetId` obrigatórios;
- gestor limitado ao `clientId` e `allowedTargetIds` da sessão;
- service-to-service e admin ainda passam por confirmação server-side de target ativo pertencente ao client;
- view e runner filtram simultaneamente `client_id` e `target_id`;
- auditoria real: zero divergência entre tenant/target do post e da análise.

## 10. Concorrência

Existe proteção simples por rate limit de 60 segundos para o mesmo ator/client/target no mesmo runtime, cobrindo chamadas simultâneas e retries imediatos nessa instância. A view, a checagem pré-insert e a persistência evitam duplicação final.

Limitação documentada: instâncias serverless diferentes não compartilham o bucket em memória. Duas chamadas realmente simultâneas em instâncias distintas podem consultar o mesmo pendente antes do insert e consumir IA em duplicidade; o banco evita a duplicação final, mas não o custo externo anterior. Resolver integralmente exige um claim/lock distribuído no banco, mudança arquitetural não justificada para este bloco. `CONCURRENCY_SAFETY = DOCUMENTED_SAFE_LIMITATION`.

## 11. Observabilidade

Logs estruturados registram apenas correlation ID seguro, client, target, plataforma, status, elegíveis, sucesso, falhas, pulados e duração. Não registram prompt, conteúdo de post, API key ou webhook secret. Motivos retornados por item são normalizados para códigos seguros.

## 12. Coleta → analytics

O trigger de coleta agora adiciona, sem remover campos:

- `status=SUCCESS_COMPLETE` quando `collectionComplete=true`;
- `status=SUCCESS_PARTIAL` quando `collectionComplete=false`.

O objeto `result` continua contendo `collectionComplete`, `termination`, `postsPersisted` e toda a telemetria anterior.

## 13. SUCCESS_COMPLETE

`SUCCESS_COMPLETE` autoriza chamar analytics. Indica término natural da janela (`CURSOR_NULL` ou `EMPTY_RESULTS`).

## 14. SUCCESS_PARTIAL

`SUCCESS_PARTIAL`, tipicamente `termination=MAX_PAGES`, também autoriza chamar analytics. O runner verá somente posts já persistidos atomicamente. Parcialidade descreve cobertura da janela, não integridade dos posts.

## 15. Nothing to process

Coleta com zero posts não é erro. Analytics com zero elegíveis retorna HTTP 200, `status=NOTHING_TO_PROCESS`, `analysisComplete=true` e contadores zero.

## 16. Erros IA

Falha de um post não cancela os demais. O endpoint retorna `SUCCESS_WITH_FAILURES`, contadores e itens sanitizados. O post sem análise permanece elegível para tentativa posterior. Exceção que impede o lote retorna `FAILED` com HTTP apropriado.

## 17. Segurança/custo

- autenticação fail-closed;
- comparação do segredo em tempo constante;
- payload estrito e máximo absoluto de 20;
- rate limit de 60 segundos;
- validação tenant/target antes do runner;
- correlation ID limitado a caracteres seguros;
- nenhuma chave hardcoded, persistida ou exposta;
- débito preservado: `ROTATE_FACEBOOK_RAPIDAPI_KEY_BEFORE_CONTINUOUS_PRODUCTION`.

## 18. Arquivos

Criados:

- `app/api/automations/facebook/analyze/route.ts`;
- `app/api/automations/facebook/analyze/route.test.ts`;
- `FACEBOOK_BLOCO5A_CODEX_BACKEND_RELATORIO.md`.

Modificados:

- `app/api/automations/facebook/trigger/route.ts`;
- `app/api/automations/facebook/trigger/route.test.ts`.

Os arquivos do Bloco 4 presentes simultaneamente no working tree foram consumidos como dependência e não foram reimplementados.

## 19. Migrations

Nenhuma migration criada ou aplicada. Nenhuma mudança de schema, RLS, policy, RPC ou dado.

## 20. Testes

- teste inicial endpoint/runner/trigger: 3 arquivos, 35 testes, PASS;
- regressão final dirigida Facebook/API/analytics/Instagram/X: 21 arquivos, 161 testes, PASS;
- TypeScript: PASS;
- ESLint dirigido: PASS, zero warnings;
- `git diff --check`: PASS;
- Next.js 16.2.6 production build: PASS;
- rota `/api/automations/facebook/analyze` confirmada no build.

## 21. Regressões

Instagram e X passaram nos testes dirigidos. Nenhum arquivo dessas plataformas foi alterado. O contrato antigo do trigger Facebook foi preservado e recebeu apenas `status` aditivo.

## 22. E2E

Endpoint executado contra o target real homologado da Michelle Bolsonaro, com segredo efêmero de runtime:

- HTTP 200;
- `status=NOTHING_TO_PROCESS`;
- `eligible=0`, `processed=0`, `success=0`, `failed=0`, `skipped=0`;
- `analysisComplete=true`;
- banco após execução: 8 posts, 8 análises, 0 pendentes, 0 análises duplicadas e 0 divergências de tenant;
- nenhuma chamada à IA e nenhuma escrita necessária.

## 23. Blockers

Nenhum blocker funcional. Permanece a limitação documentada de concorrência distribuída e o débito de rotação da credencial RapidAPI antes de produção contínua.

## 24. N8N_HANDOFF

1. **URL/path:** `/api/automations/facebook/analyze` no domínio do PolitixOS.
2. **Método:** `POST`.
3. **Headers:** `Content-Type: application/json`, `X-Webhook-Secret: <segredo configurado>`; opcional `X-Correlation-Id` com 1–128 caracteres `[A-Za-z0-9._:-]`.
4. **Auth:** mesmo segredo server-side `FACEBOOK_COLLECTION_WEBHOOK_SECRET` usado pelo trigger de coleta. Nunca enviar RapidAPI ou Anthropic key.
5. **Body:** `{"clientId":"<uuid>","targetId":"<uuid>","maxPosts":5}`; `maxPosts` permitido de 1 a 20.
6. **Response SUCCESS:** HTTP 200, `ok=true`, `status=SUCCESS`, `termination=COMPLETED`, `analysisComplete=true`, contadores e items.
7. **Response NOTHING_TO_PROCESS:** HTTP 200, `ok=true`, `status=NOTHING_TO_PROCESS`, `termination=NOTHING_TO_PROCESS`, contadores zero. Encerrar normalmente, sem retry.
8. **Response SUCCESS_WITH_FAILURES:** HTTP 200, `ok=true`, `status=SUCCESS_WITH_FAILURES`, `termination=COMPLETED_WITH_FAILURES`, `analysisComplete=false`. Registrar contadores/items e permitir nova tentativa após 60 segundos; somente posts ainda pendentes serão selecionados.
9. **Response FAILED:** HTTP 4xx/5xx, `ok=false`, `status=FAILED`, `code`, `correlationId`. Não interpretar texto livre.
10. **SUCCESS_PARTIAL da coleta:** chamar analytics normalmente quando o trigger retornar `status=SUCCESS_PARTIAL`; processar somente posts persistidos. Não tratar `MAX_PAGES` como falha fatal.
11. **Retry recomendado:** nenhum retry para 400/401/403 ou `NOTHING_TO_PROCESS`; para 429 respeitar `Retry-After: 60`; para 5xx/502/503, até 2 retries com backoff de 60 s e 120 s; para `SUCCESS_WITH_FAILURES`, nova invocação após 60 s.
12. **Timeout recomendado:** 300 segundos no HTTP Request do n8n; falha de timeout deve seguir a política de retry e idempotência acima.
13. **maxPosts recomendado:** 5 por invocação inicial para limitar custo e duração; máximo aceito 20.

Contrato coleta → analytics para branches n8n:

```text
trigger.ok=true AND trigger.status IN [SUCCESS_COMPLETE, SUCCESS_PARTIAL]
  → POST /api/automations/facebook/analyze

analyze.status=SUCCESS | NOTHING_TO_PROCESS
  → encerrar sucesso

analyze.status=SUCCESS_WITH_FAILURES
  → registrar + retry controlado

analyze.ok=false
  → decidir por HTTP/code conforme item 11
```

## 25. Veredito

| Critério | Resultado |
|---|---|
| FACEBOOK_ANALYZE_ENDPOINT | PASS |
| AUTOMATION_AUTH | PASS |
| PAYLOAD_VALIDATION | PASS |
| RESPONSE_CONTRACT | PASS |
| ANALYTICS_IDEMPOTENCY | PASS |
| TENANT_ISOLATION | PASS |
| CONCURRENCY_SAFETY | DOCUMENTED_SAFE_LIMITATION |
| COLLECTION_TO_ANALYTICS_CONTRACT | PASS |
| NOTHING_TO_PROCESS | PASS |
| PARTIAL_FAILURE_HANDLING | PASS |
| N8N_HANDOFF | PASS |
| INSTAGRAM_REGRESSION | PASS |
| X_REGRESSION | PASS |
| TYPECHECK | PASS |
| ESLINT | PASS |
| BUILD | PASS |

`VEREDITO = GO_WITH_DOCUMENTED_LIMITATION`

## 26. Próximo passo

Entregar o `N8N_HANDOFF` ao Claude para concluir a frente paralela. Não ativar workflow, schedule ou deploy nesta etapa. Se a automação futura exigir paralelismo entre múltiplas instâncias, abrir bloco específico para claim/lock distribuído antes de elevar concorrência.

Não iniciei o Bloco 6.
