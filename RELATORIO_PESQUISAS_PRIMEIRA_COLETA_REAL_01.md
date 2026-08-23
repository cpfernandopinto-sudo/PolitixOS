# POLITIXOS — PRIMEIRA COLETA REAL DE PESQUISAS

**Resultado desta rodada: BLOQUEADO na Etapa 2 (auditoria do endpoint) por um achado real — a rota nova não está em produção. Etapas 4–13 não puderam ser executadas. Nenhuma alteração de código/schema/frontend foi feita, conforme solicitado.**

---

## SECRET
**CONFIGURADO:** PENDENTE — gerado, mas **não posso inserir o valor em nenhum campo** (Vercel ou n8n). Isso não é uma limitação de ferramenta apenas: é uma regra de segurança que sigo sempre, mesmo com autorização explícita — nunca digito senha/API key/token em um formulário ou credencial em nome do usuário. Além disso, confirmei que não há ferramenta MCP disponível aqui para setar variável de ambiente na Vercel nem para gravar valor de credencial no n8n (busquei explicitamente por ambas antes de reportar isso).

Gerei um valor aleatório criptograficamente seguro (32 bytes, hex) e enviei a você diretamente nesta resposta (não gravado em nenhum arquivo do repositório nem no relatório). Ação necessária sua, nos dois lados:

1. **Vercel** → Project Settings → Environment Variables → adicionar `PESQUISAS_CALLBACK_SECRET` (Production) com o valor gerado.
2. **n8n** → credencial "PolitixOS — Pesquisas Callback Secret" (Header Auth) no workflow `PolitixOS — Pesquisas Eleitorais — Collector` → Header Name = `x-pesquisas-secret`, Header Value = o mesmo valor.

**MATCH ENTRE VERCEL E N8N:** NÃO TESTÁVEL AINDA (nenhum dos dois lados está configurado).

---

## N8N
**ATIVO / INATIVO:** INATIVO (confirmado via `get_workflow_details` — `active: false`, sem alteração desde a criação).

Atualizei apenas o campo de URL do node HTTP Request (não é segredo) de placeholder para a URL real de produção confirmada:
`https://politix-os.vercel.app/api/automation/pesquisas/collect`
(Aplicado via `update_workflow`, operação `setNodeParameter`.)

---

## ETAPA 2 — AUDITORIA DO WORKFLOW (antes de ativar)

| Item | Estado |
|---|---|
| Schedule | A cada 6 horas (`hoursInterval: 6`) — dentro do range sugerido (2-4x/dia) |
| Endpoint chamado | `https://politix-os.vercel.app/api/automation/pesquisas/collect` (corrigido nesta rodada) |
| Método HTTP | POST |
| Headers | Nenhum hardcoded — autenticação via credencial genérica Header Auth (pendente de valor, ver acima) |
| Autenticação | `genericCredentialType` / `httpHeaderAuth`, credencial nomeada, **sem valor configurado ainda** |
| Timeout | 60.000ms (60s) configurado no node |
| Retry | **NÃO CONFIGURADO** — o node não tem `retryOnFail` habilitado. Não é bloqueador para o piloto (execução manual/observada), mas fica registrado como ajuste recomendado antes de deixar o Schedule rodando sem supervisão. |
| Tratamento de HTTP ≠ 2xx | **NÃO CONFIGURADO** — sem `onError: continueRegularOutput` nem branch de erro dedicada; hoje uma falha do endpoint marca a execução do workflow como falha (comportamento padrão do n8n), sem apagar nada no PolitixOS (a escrita é responsabilidade do endpoint, que é transacional por linha). |
| Logging | Node "Registrar Resultado da Coleta" extrai os contadores da resposta para o painel de execuções do n8n |
| Credenciais hardcoded | **NENHUMA** — confirmado lendo o JSON completo do workflow via `get_workflow_details` |

### Rota canônica — verificação direta (não presumida)

Fiz chamadas HTTP reais contra produção para não presumir nada:

| Rota | Resultado | Interpretação |
|---|---|---|
| `POST /api/automation/pesquisas/collect` | **404** | **A rota não existe em produção.** O código deste sprint (endpoint, coletor seletivo, migration de código) nunca foi commitado/pushado/deployado — permanece só neste worktree local, exatamente como reportado ao final da rodada anterior ("COMMIT: NÃO REALIZADO, PUSH: NÃO REALIZADO, DEPLOY: NÃO REALIZADO"). |
| `POST /api/pesquisas/collect` (rota antiga, manual/admin) | 401 (existe, exige sessão) | Confirma que produção está no ar e essa rota antiga está lá, sem mudanças |
| `POST /api/territorios/ibge/collect` (endpoint irmão, outro módulo) | 401 (existe, exige segredo de header) | Confirma que o *padrão* de endpoint autenticado já funciona em produção para outros módulos — só falta este ser deployado |
| `GET /dashboard/pesquisas` | 307 (redirect de login) | Produção saudável |

**Isso é o achado central desta rodada.** O relatório anterior deixou claro que nada havia sido deployado; esta rodada assumia implicitamente que a validação em produção já tinha ocorrido ("PRODUÇÃO: PASS"). Essa validação foi feita **localmente** (build, testes, typecheck) — nunca contra o ambiente Vercel real. Confirmei isso com `git log origin/main..HEAD` (branch local ainda não mesclada) e com a chamada HTTP acima.

**Consequência:** não há como executar as Etapas 4 (teste de autenticação), 6 (primeira coleta real), 7-11 (validação de seletividade/corrida/frontend) e 13 (ativar Schedule) — todas dependem do endpoint estar no ar. Meguindo a própria regra desta rodada ("Se falhar: PARAR"), parei aqui em vez de simular ou presumir resultados.

---

## ETAPA 3 — CANDIDATOS MONITORADOS

**Antes desta rodada:** 0 candidatos com `poll_monitoring_enabled=true` (confirmado por query direta).

Conforme instruído ("utilizar preferencialmente um universo controlado relacionado ao caso já validado de DF"), habilitei o piloto controlado com os 2 candidatos citados como referência:

| Candidato | UF | Cargo monitorado | `is_active` |
|---|---|---|---|
| Michelle Bolsonaro | DF | Senador | **true** |
| Celina Leão | DF | Governador | **false** |

**Achado relevante:** o campo `targets.state` de Celina Leão estava gravado como `"Distrito Federal"` (nome por extenso), enquanto `electoral_polls.uf` usa sempre a sigla de 2 letras (`"DF"`) e todos os demais 18 candidatos cadastrados já usam sigla. Sem correção, o matcher (`targetMatcher.ts`, código já existente desta implementação, não alterado agora) nunca casaria essa UF — Celina Leão nunca seria descoberta por nenhuma pesquisa. Corrigi apenas esse valor de dado (`"Distrito Federal"` → `"DF"`), por ser uma inconsistência isolada de cadastro, não uma mudança de schema ou de código.

**Atenção — Celina Leão não vai entrar na coleta ainda:** `getPollMonitoringTargets()` (código já existente) filtra por `poll_monitoring_enabled=true` **E** `is_active=true`. Celina Leão está com `is_active=false` no cadastro (candidato inativo, por razão anterior a este sprint). Não ativei o candidato — isso é uma decisão fora do escopo desta rodada (ativar um candidato tem efeitos em outros módulos, não só em pesquisas). **Resultado prático: só Michelle Bolsonaro (Senador/DF) está de fato elegível para a coleta seletiva agora.** Se quiser testar o caso de Governador/DF também, será necessário reativar Celina Leão como candidato — ação separada, sua.

---

## ETAPA 5 — SNAPSHOT DO BANCO (ANTES)

| Tabela | Contagem |
|---|---|
| `electoral_polls` | 1.695 |
| `electoral_poll_results` | 205 |
| `electoral_poll_scenarios` | **NÃO EXISTE** — não há essa tabela no schema; `cenario` é uma coluna de `electoral_poll_results`, confirmado por `information_schema.tables` |
| `source_collection_runs` (todas) | 22 |
| `source_collection_runs` (source='TSE/PESQUISA_ELEITORAL') | 5 |

Nenhuma execução nova do coletor rodou nesta sessão (impossível sem o endpoint em produção), então este é também o estado "depois" no momento — não há nada para comparar ainda.

---

## RESUMO — CHECKLIST OBRIGATÓRIO

**SECRET:** CONFIGURADO: PENDENTE (gerado, entrega feita, ação de configuração é sua)
**N8N:** INATIVO
**ENDPOINT CANÔNICO:** `POST /api/automation/pesquisas/collect` — **existe no código, NÃO existe em produção (404 confirmado)**
**AUTENTICAÇÃO:** NÃO TESTÁVEL (endpoint não está no ar)
**CANDIDATOS MONITORADOS:** Michelle Bolsonaro | DF | Senador (elegível) · Celina Leão | DF | Governador (habilitado, mas `is_active=false` — não elegível ainda)
**EXECUÇÃO MANUAL:** NÃO REALIZADA (bloqueada pela Etapa 2)
**TARGETS VERIFICADOS:** NÃO DISPONÍVEL NO RETORNO ATUAL (nenhuma execução ocorreu)
**PESQUISAS DESCOBERTAS:** NÃO DISPONÍVEL NO RETORNO ATUAL
**PESQUISAS COMPATÍVEIS:** NÃO DISPONÍVEL NO RETORNO ATUAL
**NOVAS PESQUISAS:** 0
**RESULTADOS NOVOS:** 0
**DUPLICATAS:** 0
**ERROS:** 0 (nada rodou)

**BANCO:**
- `electoral_polls`: 1.695 → 1.695 (sem alteração)
- `electoral_poll_scenarios`: NÃO EXISTE (tabela inexistente)
- `electoral_poll_results`: 205 → 205 (sem alteração)

**SELETIVIDADE UF + CARGO:** NÃO TESTÁVEL (sem execução real)
**CORRIDA COMPLETA:** NÃO TESTÁVEL
**COCKPIT:** SEM NOVOS DADOS
**BASE DE PESQUISAS:** SEM NOVOS DADOS
**POLITIX IA:** SEM DADOS SUFICIENTES (nenhum sinal eleitoral novo — `getElectoralSignalsSummaryForCandidate` depende de `electoral_poll_results` populado para a corrida do candidato filtrado; hoje só há as 205 linhas legadas, sem relação com a coleta seletiva)
**WORKFLOW DEIXADO:** INATIVO

**RESULTADOS/PERCENTUAIS:** Nenhum resultado novo foi gravado nesta rodada (nenhuma coleta rodou). Os 205 resultados já existentes em produção continuam exatamente como antes — não foram tocados, lidos criticamente ou reinterpretados nesta rodada.

---

## BLOQUEADORES REAIS

**P0 — impede a ativação real do pipeline:**
1. **Endpoint `/api/automation/pesquisas/collect` não está deployado em produção** (404 confirmado). Todo o código desta feature existe apenas neste worktree local (branch `claude/pesquisas-eleitorais-relatorio-07b34e`, não mesclada). Sem isso, nada nas Etapas 4-13 é executável — não é possível testar autenticação, rodar coleta real, validar seletividade ou ativar o Schedule.
2. **`PESQUISAS_CALLBACK_SECRET` não está configurado nem na Vercel nem no n8n** — ação manual sua, não posso realizá-la (política de segurança: nunca insiro senha/token/API key em um campo, mesmo autorizado).

## BACKLOG NÃO BLOQUEADOR
1. Retry e tratamento de erro (`onError`) não configurados no node HTTP Request do n8n — recomendável antes de deixar o Schedule rodando sem supervisão, não impede o teste piloto manual.
2. Celina Leão (Governador/DF) só entrará na coleta quando o candidato for reativado (`is_active=true`) — decisão separada, fora deste escopo.
3. Fonte de resultados de intenção de voto (já documentado nas rodadas anteriores) continua em aberto.

## PRÓXIMA ETAPA

Depende de uma decisão sua antes de eu continuar:

**Quer que eu faça commit + push desta branch e você mesmo dispare o deploy pela Vercel (ou peça explicitamente que eu também acione o deploy)?** Até agora, em nenhuma rodada anterior você pediu push/deploy — por isso não presumi. Assim que o endpoint estiver de fato em produção e você tiver configurado `PESQUISAS_CALLBACK_SECRET` nos dois lados, retomo exatamente nas Etapas 4-13 (teste de autenticação → primeira coleta real → validação de seletividade/corrida/frontend → decisão de ativar o Schedule).
