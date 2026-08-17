# PolitixOS Territórios — Integração do Motor Saúde ao Orquestrador Sob Demanda

**Data:** 15-16/08/2026

**Branch:** `main` (commit `5ee77df` para o código do motor; workflow n8n editado diretamente na instância)

**Escopo:** TTL/cache de 24h para o Motor Saúde, endpoint HTTP dedicado, integração como 4º motor no `PolitixOS - Territórios - Orquestrador Sob Demanda` (`KOjiVtITEOrCm2AP`).

**Autor:** Claude, como executor desta microbloco final, após dois ciclos de auditoria independente do Motor Saúde construído pela Codex (`docs/RELATORIO_AUDITORIA_MOTOR_SAUDE_CNES_2026_08_13.md`, `docs/RELATORIO_REAUDITORIA_MOTOR_SAUDE_CNES_2026_08_15.md`).

---

## 1. Contexto e trabalho concorrente preservado

Antes de qualquer edição, `git status`/`git diff` foram executados conforme instrução explícita. Foi encontrado que a Codex já havia implementado, concorrentemente, a lógica de TTL em `lib/territorios/saude-collector.ts` e o endpoint `app/api/territorios/saude/collect/route.ts` (com testes). Esse trabalho foi **verificado e preservado integralmente**, não reimplementado. A única ação neste arquivo, além da verificação, foi o commit do que já estava pronto — nenhuma linha de `saude-collector.ts`, `saude-cnes-client.ts` ou `saude-cnes-normalizer.ts` foi reescrita por mim.

## 2. TTL de 24h — verificação real contra o banco

Implementação (Codex, verificada): `HEALTH_CACHE_TTL_MS = 24h`; `isHealthCacheFresh()` compara `lastUpdated` da run mais recente `status='completed'` com `now`; `readHealthCache()` só é consultado quando `force_refresh=false`.

Teste independente rodado via `npx tsx` diretamente contra o Supabase real (Contagem/3118601), fora de qualquer script preexistente da Codex:

1. `force_refresh:false` → `cacheHit:true`, `fetchMs:0`, `recordsPersisted:0` (snapshot de 15/08 ainda dentro do TTL).
2. `force_refresh:true` → `cacheHit:false`, coleta real (~19s), novo snapshot `referenceDate:2026-08-16`, `inserted:32`.
3. `force_refresh:false` novamente → `cacheHit:true`, refletindo o snapshot recém-criado.

**Achado importante:** cache hits **não criam uma nova linha em `territory_collection_runs`** — o TTL é lido a partir da run real mais recente, nunca "renovado" por um hit. Isso foi confirmado contando runs antes/depois (13 → 13 após dois hits; 13 → 14 após o `force_refresh:true`). Sem esse comportamento, chamadas periódicas com `force_refresh:false` poderiam manter um snapshot antigo artificialmente "fresco" para sempre — não é o caso.

Duplicidade de chave natural: 0 (96 indicadores = 32 × 3 períodos distintos: 13/08, 15/08, 16/08). Evidence: 2 linhas, sem duplicidade (o `force_refresh:true` de teste não gerou evidence nova pois o hash do conteúdo não mudou, apenas o `referenceDate`).

## 3. Endpoint `POST /api/territorios/saude/collect`

Criado pela Codex, verificado por mim. Segue exatamente o padrão dos outros 3 motores:
- Autenticação dedicada: env `TERRITORIOS_SAUDE_CALLBACK_SECRET` + header `x-territorios-saude-secret`, comparação via `timingSafeEqual`. **Não reaproveita** nenhum secret existente.
- Validação: `codigo_ibge` obrigatório, 7 dígitos (aceita `codigoIbge` como compatibilidade interna); `force_refresh` opcional booleano; `request_id` opcional string. Payload inválido → 400 controlado.
- Env ausente → 503 `TERRITORIOS_ENV_MISSING`; header ausente/errado → 401 `UNAUTHORIZED`.
- Envelope de saída: `{engine:'saude', status, codigo_ibge, requestId, updated, recordsPersisted, lastUpdated, coverage, cacheHit, error}` — compatível com o padrão dos demais motores.

Testes automatizados do endpoint (mock do collector): 4/4 PASS, cobrindo 401 sem header, 400 para payload/código/`force_refresh` inválidos, envelope de cache hit, e propagação de `force_refresh`/`codigoIbge`.

Teste HTTP real (não mockado): contra o servidor local rodando, sem secret e com secret errado → 401 real em ambos os casos (round-trip TCP de verdade, não apenas chamada direta ao handler).

## 4. Deploy em produção

O código do endpoint estava pronto localmente mas nunca havia sido commitado. n8n (remoto) não alcança `localhost`, então a integração real ao Orquestrador exigia deploy. **Autorização explícita do usuário obtida antes de commitar/dar push/fazer deploy.**

- Commit `5ee77df` na `main`, push para `origin/main`.
- `TERRITORIOS_SAUDE_CALLBACK_SECRET` provisionado via `vercel env add` (Production + Preview, `--sensitive`), com o mesmo padrão já usado por `TERRITORIOS_IBGE_CALLBACK_SECRET`/`TSE`/`SEGURANCA`. Valor gerado via `openssl rand -hex 32`, nunca impresso em log/arquivo persistente.
- Primeiro deploy automático (GitHub → Vercel) não incluiu a env var (adicionada depois do build). Foi necessário um segundo `vercel deploy --prod` explícito para a env var ser injetada no runtime — confirmado via probe HTTP real ao endpoint de produção (`503` → `200` após o redeploy).
- Credencial dedicada `x-territorios-saude-secret` criada no n8n pelo próprio usuário (Header Auth, mesmo valor do Vercel), pois o MCP do n8n não expõe uma ferramenta de criação de credenciais (apenas leitura/listagem).

## 5. Achado crítico não solicitado: Orquestrador em produção estava desatualizado

Antes de tocar em qualquer coisa, `get_workflow_details` revelou que a versão **ativa/publicada** do Orquestrador (`activeVersionId` de 13/08 03:54) era **anterior** a todas as correções da Thread A (URLs corretas, retry em Segurança, mecanismo de fallback) — essas correções existiam apenas como **rascunho nunca publicado** (`versionId` de 13/08 19:04). Ou seja, o homologado anterior (fallback de Segurança) nunca havia chegado à produção real; toda a validação anterior foi feita contra o rascunho via `test_workflow`/execução manual.

Isso foi reportado ao usuário, que autorizou publicar a versão correta antes de prosseguir. Publicado e confirmado com uma execução real (`mode:"webhook"`, execução 26014): IBGE completed, TSE completed, Segurança completed via fallback (`fallbackUsed:true`), `overallStatus:completed` — a primeira confirmação real, em produção, de que o fallback de Segurança funciona.

## 6. Integração do 4º motor no Orquestrador

Nós adicionados: `Preparar Saude` (Code) → `Chamar Saude` (HTTP Request) → `Classificar Saude` (Code) → `Consolidar Resultado`.

- `Preparar Saude` captura o resultado de Segurança (`$json`, que pode vir de `Classificar Seguranca` ou `Classificar Seguranca Fallback`) em um campo nomeado estável, evitando a mesma ambiguidade de referência por nome que já havia sido corrigida uma vez em `Consolidar Resultado` (dois caminhos possíveis não podem ser referenciados por `$('Nome Fixo')`).
- `Chamar Saude`: `POST https://politix-os.vercel.app/api/territorios/saude/collect`, credencial dedicada (Header Auth, criada pelo usuário), `onError:continueErrorOutput`, timeout 300s (igual ao `maxDuration` do endpoint).
- `Classificar Saude`: mesmo padrão defensivo de IBGE/TSE (verifica `statusCode`+`body.status`+`body.engine`; senão monta envelope `failed`).
- `Consolidar Resultado`: passou a ler `seguranca` via `Preparar Saude` (não mais via `$json` direto) e incluir `saude` no objeto `engines` e no cálculo de `overallStatus`. **IBGE, TSE e Segurança não tiveram nenhuma linha de sua própria lógica interna alterada** — apenas o destino da conexão de saída de Segurança mudou (de `Consolidar Resultado` direto para `Preparar Saude`), e o código de `Consolidar Resultado` (que é código de consolidação, não de nenhum motor específico) foi estendido.

Publicado após teste bem-sucedido em rascunho (execução manual 26018/26030, Contagem).

## 7. Testes conjuntos reais (execuções via `execute_workflow`, `mode:"webhook"` ou `manual` contra a versão publicada)

### Contagem (3118601) — execução 26030
IBGE completed · TSE completed · Segurança completed (via fallback) · **Saúde completed, `cacheHit:true`** · **`overallStatus:completed`**.

### Betim (3106705), `force_refresh:true` — execução 26034
IBGE completed · TSE completed · Segurança completed (via fallback) · **Saúde completed, `cacheHit:false` (coleta real, 31 indicadores, `recordsPersisted:31`)** · **`overallStatus:completed`**. Município resolvido corretamente ("Betim", sem qualquer hardcode).

### São Paulo (3550308) — execuções 26038/26042 (fora de MG)
IBGE completed · TSE completed · **Segurança `not_available`** (sem carga de MG, comportamento já existente e intocado) · **Saúde `failed`, `error:"CNES_PAGINATION_LIMIT"`** · **`overallStatus:partial`**.

**Achado honesto, não escondido:** São Paulo é o maior município do Brasil e seu volume de estabelecimentos CNES excede o limite de paginação pré-existente no cliente CNES (`saude-cnes-client.ts`, escrito pela Codex, não alterado nesta microbloco). O usuário havia pedido "Saúde=completed ou resultado válido" para este caso — o resultado obtido é um `failed` controlado, com `overallStatus` corretamente rebaixado a `partial` pela semântica **já existente e não alterada** ("failed vira partial se outros completaram"). A lógica de isolamento de falha funcionou exatamente como desenhado: a falha de Saúde não afetou IBGE/TSE/Segurança nem quebrou a resposta do Orquestrador. Verificado no banco: **zero linhas órfãs** — `items_collected:0`, `items_processed:0`, run registrada como `failed` em ambas as tentativas, nenhum indicador ou evidence parcial gravado.

Ajustar o limite de paginação do cliente CNES para suportar municípios muito grandes como São Paulo está **fora do escopo autorizado** desta microbloco (que não incluía alterar a lógica interna do cliente CNES) e é reportado aqui como item em aberto, não corrigido silenciosamente.

Nas 3 primeiras execuções reais do Orquestrador já publicado, foi observada uma execução (São Paulo, tentativa 26038) travada por ~4m37s na fila do n8n antes de progredir — anomalia pontual de infraestrutura do n8n, não reproduzida nas demais chamadas (Contagem e Betim resolveram-se normalmente em 45-55s cada), e não relacionada à lógica do 4º motor.

## 8. Verificação de duplicação (banco real, pós-testes)

- Contagem: 96 indicadores CNES (32 × 3 períodos: 13/08, 15/08, 16/08), **0 duplicidades de chave natural**.
- Betim: 31 indicadores CNES (1 período: 16/08), **0 duplicidades**.
- São Paulo: 0 indicadores (coleta nunca completou), **0 dados órfãos**.

## 9. Regressão final

- `npx tsc --noEmit`: **0 erros**.
- ESLint no escopo Saúde (`lib/territorios/saude-*`, `app/api/territorios/saude/*`): **0 erros, 0 warnings**. (Lint irrestrito do repositório mostra 72 erros pré-existentes em `lib/queries/*` e `scripts/seed-admin.mjs`, não relacionados a este trabalho e fora do escopo autorizado.)
- `npx vitest run lib/territorios app/api/territorios`: **58 arquivos, 492 testes, PASS** (inclui os 4 novos testes do endpoint Saúde).
- `npm run build`: **PASS**, Next.js 16.2.6/Turbopack, rota `/api/territorios/saude/collect` presente na listagem de rotas geradas.

## 10. Estado final do git

Commit `5ee77df` já enviado a `origin/main` antes da redação deste relatório. `git status` ao final: árvore de trabalho limpa, exceto duas deleções pré-existentes e não relacionadas (`.claude/worktrees/cranky-carson-f7e9e6`, `.claude/worktrees/epic-jennings-eb59e2`), que não foram tocadas em nenhum momento desta sessão.

## 11. Confirmações explícitas de escopo

- Scheduler/cron: **NÃO criado.**
- Carga completa de Brasil/MG: **NÃO disparada** em nenhum teste (todas as chamadas foram por `codigo_ibge` único).
- Frontend: **NÃO alterado.**
- IBGE: **NÃO alterado** (lógica interna intocada).
- TSE: **NÃO alterado** (lógica interna intocada).
- Segurança: **NÃO alterada** (lógica interna intocada; apenas o destino de sua conexão de saída no Orquestrador mudou).
- Novos datasets de Saúde: **NÃO implementados** (apenas o dataset CNES já existente).
- Economia: **NÃO iniciado.**

## Gate final

- TTL 24H IMPLEMENTADO: **SIM**
- CACHE HIT TESTADO (BANCO REAL): **SIM**
- FORCE_REFRESH TESTADO (BANCO REAL): **SIM**
- ENDPOINT `/api/territorios/saude/collect` CRIADO: **SIM**
- AUTENTICAÇÃO DEDICADA (NÃO REAPROVEITADA): **SIM**
- TESTE HTTP REAL (NÃO MOCKADO) DO ENDPOINT: **SIM (401 sem secret / secret errado)**
- DEPLOY EM PRODUÇÃO: **SIM**
- INTEGRADO AO ORQUESTRADOR: **SIM**
- ORQUESTRADOR PUBLICADO COM SAÚDE: **SIM**
- ACHADO: VERSÃO ANTERIOR DO ORQUESTRADOR NUNCA HAVIA SIDO PUBLICADA: **SIM, corrigido e confirmado em produção**
- TESTE CONTAGEM (4 MOTORES): **SIM — overallStatus completed**
- TESTE BETIM (4 MOTORES, FORCE_REFRESH): **SIM — overallStatus completed**
- TESTE SÃO PAULO (FORA DE MG): **PARCIAL — overallStatus partial, Saúde falhou por CNES_PAGINATION_LIMIT (limite pré-existente, fora de escopo)**
- SEGURANÇA FORA DE MG NÃO DISPAROU CARGA: **SIM**
- IDEMPOTÊNCIA / SEM DUPLICAÇÃO (BANCO REAL): **SIM**
- IBGE ALTERADO: **NÃO**
- TSE ALTERADO: **NÃO**
- SEGURANÇA ALTERADA (LÓGICA INTERNA): **NÃO**
- FRONTEND ALTERADO: **NÃO**
- SCHEDULER/CRON CRIADO: **NÃO**
- CARGA EM MASSA (BRASIL/MG) DISPARADA: **NÃO**
- NOVOS DATASETS DE SAÚDE IMPLEMENTADOS: **NÃO**
- ECONOMIA INICIADA: **NÃO**
- REGRESSÕES (TYPECHECK/LINT/TESTES/BUILD): **NÃO**
- RELATÓRIO GERADO: **SIM**

## Item em aberto (não corrigido nesta microbloco)

O limite de paginação do cliente CNES (`saude-cnes-client.ts`) impede a coleta completa para municípios muito grandes como São Paulo (`CNES_PAGINATION_LIMIT`). Ajustar esse limite está fora do escopo autorizado desta microbloco e requer decisão explícita antes de qualquer alteração.
