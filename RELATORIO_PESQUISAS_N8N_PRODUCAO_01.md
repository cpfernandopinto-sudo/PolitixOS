# RELATÓRIO — PESQUISAS N8N PRODUÇÃO 01
## Sprint: Monitoramento Seletivo + n8n + Inteligência Eleitoral

Implementação real conforme o plano aprovado. Nenhum `git commit`, `push` ou deploy foi feito nesta sessão. Migration e workflow n8n foram aplicados/criados em produção porque o usuário confirmou explicitamente essas duas ações antes da implementação.

---

## STATUS

**STATUS:** READY FOR VALIDATION

**MONITORAMENTO POR CANDIDATO:** PASS

**CAMPO IMPLEMENTADO:** `targets.poll_monitoring_enabled` (boolean) + `targets.poll_monitoring_office` (text) — migration `electoral_polls_target_monitoring` aplicada em produção (`hhhwuajptkyposarfbzn`). UI: switch "Capturar pesquisas eleitorais" em [CandidatoForm.tsx](components/candidatos/CandidatoForm.tsx), com campo de cargo condicional.

**DEFAULT:** `false` (confirmado no schema: `poll_monitoring_enabled boolean not null default false`). Nenhum candidato existente foi ligado automaticamente.

**TARGETS MONITORADOS:** 0 no momento deste relatório — o campo foi criado desligado para todos os 19 candidatos hoje cadastrados (comportamento esperado; ligar é uma ação manual do usuário por candidato).

**COLETA SELETIVA:** PASS — `runPesquisasCollector({ mode: 'monitored' })` ([collector.ts](lib/pesquisas/collector.ts)) delega a `runMonitoredPollIngestion()` ([monitoring.ts](lib/pesquisas/monitoring.ts)), que só persiste pesquisa com pelo menos 1 target monitorado casando UF+cargo ([targetMatcher.ts](lib/pesquisas/targetMatcher.ts)). `mode='all'` (default, usado por `CollectButton.tsx`) preserva o comportamento histórico — UX não alterada.

**PESQUISAS IRRELEVANTES DESCARTADAS ANTES DO BANCO:** PASS — `matchPollToTargets()` roda em memória, sobre os dados normalizados, antes de qualquer `upsertPolls()`. Coberto por TESTE C/D e "zero targets monitorados" em [monitoring.test.ts](lib/pesquisas/monitoring.test.ts).

**CORRIDA COMPLETA PRESERVADA:** PASS — `ingestRaceResults()` grava todos os `RaceResultInput[]` recebidos (concorrentes, branco/nulo, indecisos) para o mesmo `office`, nunca filtra para "só o candidato monitorado". Coberto por TESTE E (5 posições, incluindo branco/nulo e indecisos).

**MULTI-CARGO:** PASS — `matchPollToTargets()` casa cada target pelo seu próprio `office`, então uma pesquisa "Governador, Senador" é relevante para os dois targets monitorados independentemente; ao nível de resultado, `office` agora entra na chave natural de `upsertPollResult()` (Fase 10), então Governador e Senador do mesmo poll/cenário/turno nunca colidem. Coberto por TESTE F/I.

**TSE:** PASS — `runPesquisasCollector()` (lado registro/metodologia) não foi alterado em sua lógica de download/parse/normalização; só ganhou o parâmetro `mode`. Continua batendo na mesma URL oficial já verificada em produção.

**RESULTADOS:** PARCIAL — o caminho produtivo de ingestão (`ingestRaceResults()`, reaproveitando `upsertPollResult()` com o fix de natural key) está pronto e testado, mas **não existe fonte automática de resultados de intenção de voto** (TSE/PesqEle não fornece isso — confirmado no relatório anterior). Nenhum adapter de scraping de imprensa/institutos foi inventado: seria dado não verificável. `ingestRaceResults()` fica pronto para ser chamado por um workflow n8n futuro assim que uma fonte oficial/verificável for identificada — isso é uma decisão de fonte de dados pendente, não um bloqueador técnico.

**ENDPOINT N8N:** PASS — `POST /api/automation/pesquisas/collect` ([route.ts](app/api/automation/pesquisas/collect/route.ts)), autenticado por `x-pesquisas-secret` / `PESQUISAS_CALLBACK_SECRET`, mesmo padrão de `timingSafeEqual` já usado pelos coletores territoriais. Confirmado no build (`next build` lista a rota).

**AUTENTICAÇÃO:** PASS — segredo comparado em tempo constante, nunca logado; 503 se a env var não estiver configurada, 401 se o header estiver ausente/errado. `POST /api/pesquisas/collect` (sessão admin, UI) não foi tocado.

**IDEMPOTÊNCIA POLL:** PASS — natural key real de banco (`tse_registration_number UNIQUE`) inalterada; `runMonitoredPollIngestion()` distingue inserted vs. updated consultando existência antes do upsert (TESTE G).

**IDEMPOTÊNCIA RESULT:** PASS — natural key de aplicação agora é `(poll_id, cenario, turno, tipo_pergunta, candidate_name, office)`; verificado contra produção que não havia colisão nas 205 linhas existentes antes do fix (0 colisões reais), e a correção é preventiva para o pipeline contínuo. Testes em [results-repository.test.ts](lib/pesquisas/results-repository.test.ts) (TESTE I) e [monitoring.test.ts](lib/pesquisas/monitoring.test.ts) (TESTE H/J via `ingestRaceResults`).

**PROVENANCE:** PASS — `raw_source_row` (polls) continua sempre gravado; `provenance` (results) continua sendo passado integralmente pelo chamador de `ingestRaceResults()` — nenhuma alteração na garantia já existente de nunca perder a fonte.

**SOURCE_COLLECTION_RUNS:** PASS — `source_collection_runs.metadata` agora inclui `mode` e, quando `mode='monitored'`, o bloco `monitored` com `pollsDiscovered/pollsRelevant/pollsInserted/pollsUpdated/duplicatesSkipped/errors`. Nenhuma tabela nova criada (reaproveitada conforme Fase 14).

**SINAIS ELEITORAIS:** PARCIAL — os 9 sinais do briefing (POLL_RISE, POLL_DROP, LEAD_CHANGE, GAP_OPENING, GAP_CLOSING, HIGH_VOLATILITY, STABLE_LEAD, INSTITUTE_DIVERGENCE, LOW_CONFIDENCE_DATA) estão implementados de forma determinística em [signals.ts](lib/pesquisas/signals.ts), com `movementTier` (OBSERVADO/CONSISTENTE/RELEVANTE) respeitando margem de erro conhecida. PARCIAL porque os sinais são calculados sob demanda (nunca persistidos/emitidos como evento) — não há tabela de "sinal eleitoral" nem trigger que os dispare automaticamente; isso é o próximo passo natural, não um bloqueador.

**INTEGRAÇÃO CRISE:** PARCIAL — sinais eleitorais agora alimentam o **Politix IA global** (`lib/ai/analytics-context.ts`/`analytics-schema.ts`, campo `pesquisasEleitorais`), respeitando o desenho pedido na Fase 22 (camada analítica, sem acoplar diretamente um "score de crise"). **Não** há integração com Termômetro de Crise/Estado Político/Alertas — permanece fora de escopo (nenhum desses módulos foi tocado, por instrução explícita de não mexer em módulos não relacionados além do combinado).

**POLITIX IA GLOBAL:** PASS — `lib/actions/analytics-insight.ts` chama `getElectoralSignalsSummaryForCandidate()` quando há candidato filtrado, com fallback silencioso (`catch` + `[]`) se a busca falhar — a Leitura Analítica Assistida nunca quebra por causa de dado eleitoral ausente ou erroneo. `AnalyticsContextSchema` valida o novo bloco via Zod antes de qualquer chamada ao modelo.

**TESTES:** PASS (com 1 ressalva) — 145 testes novos/atualizados no módulo Pesquisas + candidatos + AI, todos passando. Suíte completa do repositório: 1480 passed, 1 pré-existente falhou por timeout sob carga (`components/AutomationPanel.test.tsx`, módulo X/Twitter — não relacionado a este sprint, confirmado passando isoladamente). TESTE L (falha da IA não derruba coleta) coberto por inspeção de código (`try/catch` explícito em `analytics-insight.ts`), não por teste automatizado dedicado — o restante dos testes A–K tem cobertura automatizada direta.

**BUILD:** PASS — `next build` concluído com sucesso, TypeScript sem erros, nova rota `/api/automation/pesquisas/collect` listada.

**BANCO:** 1 migration aplicada em produção (`hhhwuajptkyposarfbzn`): `targets.poll_monitoring_enabled` (boolean, default false) e `targets.poll_monitoring_office` (text, nullable). Nenhuma outra alteração de schema. Nenhum dado existente foi modificado (colunas aditivas).

**MIGRATIONS:** [supabase_migration_electoral_polls_target_monitoring.sql](supabase_migration_electoral_polls_target_monitoring.sql) — aplicada via Supabase MCP em 2026-08-23, confirmada por `information_schema.columns`.

**ARQUIVOS ALTERADOS:**
- Novos: `lib/pesquisas/targetMatcher.ts(+.test.ts)`, `lib/pesquisas/monitoring.ts(+.test.ts)`, `lib/pesquisas/signals.ts(+.test.ts)`, `app/api/automation/pesquisas/collect/route.ts`, `supabase_migration_electoral_polls_target_monitoring.sql`
- Modificados: `lib/pesquisas/collector.ts`, `lib/pesquisas/results-repository.ts(+.test.ts)`, `lib/queries/candidatos.ts`, `lib/actions/candidatos.ts(+.test.ts)`, `components/candidatos/CandidatoForm.tsx`, `lib/ai/analytics-schema.ts`, `lib/ai/analytics-context.ts`, `lib/actions/analytics-insight.ts`

**N8N:** Workflow real criado — **"PolitixOS — Pesquisas Eleitorais — Collector"** (`itDvgODThooivlUR`), projeto pessoal, **inativo** (`active: false`) deliberadamente. URL: `https://n8n.srv1271569.hstgr.cloud/workflow/itDvgODThooivlUR`. Fluxo: Schedule Trigger (a cada 6h) → HTTP Request `POST /api/automation/pesquisas/collect` (`mode: "monitored"`, autenticação via credencial Header Auth) → Set com resumo dos contadores. Antes de ativar, o usuário precisa: (1) configurar a credencial "PolitixOS — Pesquisas Callback Secret" com header `x-pesquisas-secret` = mesmo valor de `PESQUISAS_CALLBACK_SECRET`; (2) substituir a URL placeholder pela URL real de produção do PolitixOS.

**BLOCKERS:**
Nenhum (P0 = 0).

**BACKLOG:**
1. Fonte de dados para resultados de intenção de voto (`electoral_poll_results`) — decisão de fonte pendente, não técnica.
2. Persistir/emitir sinais eleitorais como eventos (hoje calculados sob demanda).
3. Integração com Termômetro de Crise/Estado Político/Alertas — fora de escopo deste sprint.
4. Crosstabs demográficos (`electoral_poll_result_segments`) — já desenhado, sem fonte.
5. Teste automatizado dedicado para TESTE L (hoje coberto só por inspeção de código).
6. `PESQUISAS_CALLBACK_SECRET` precisa ser configurada na Vercel (env var) antes do endpoint funcionar em produção — ação do usuário, fora do escopo de código.

**PRÓXIMA ETAPA:**
1. Usuário liga "Capturar pesquisas eleitorais" para os candidatos monitorados reais e preenche o cargo.
2. Usuário configura `PESQUISAS_CALLBACK_SECRET` na Vercel e a credencial Header Auth correspondente no n8n.
3. Usuário substitui a URL placeholder no node HTTP Request do workflow pela URL de produção.
4. Ativar o workflow no n8n e observar 1–2 execuções reais antes de considerar produção estável.
5. Decidir a fonte de resultados de intenção de voto para fechar o lado "results" do pipeline.

**COMMIT:** NÃO REALIZADO
**PUSH:** NÃO REALIZADO
**DEPLOY:** NÃO REALIZADO
