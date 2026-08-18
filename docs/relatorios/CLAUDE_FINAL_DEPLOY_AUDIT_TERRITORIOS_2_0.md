# FINAL-DEPLOY-AUDIT-TERRITORIOS-2.0 — Auditoria Final Pré-Produção

**Agente:** Claude · **Data:** 2026-08-17 · **Modo:** Final Release Audit, zero-feature/zero-refactor/zero-new-data/zero-new-intelligence, no-deploy

Pergunta única deste gate: **o estado combinado atual é seguro para publicação em produção?** Código e banco foram verificados diretamente — os relatórios (`CLAUDE_TERRITORIOS_2_0_CONVERGENCE_GATE.md`, `CODEX_INTELLIGENCE_FRONT_CONNECT_02.md`) foram lidos, mas tratados como declaração, não como prova.

**Resultado em uma frase:** o trabalho de conexão do Codex (`INTELLIGENCE-FRONT-CONNECT-02`) está correto e bem executado — Command Center, Briefing e Radar realmente consomem os contratos canônicos, sem duplicar metodologia, sem `CONTAGEM_DEMO`, sem a query quebrada de `territory_briefings`. Encontrei e corrigi 1 imprecisão de baixo risco (janela CAGED do novo runtime pedia até `202612` em vez de `202606` — sem efeito real, pois não há dado além de 2026-06) e removi o arquivo órfão já sinalizado no gate anterior. Nenhum bloqueador P0/P1 novo foi encontrado.

---

## 1 — Git / Workspace

`git status` (281 arquivos não commitados, todos de rodadas anteriores do mesmo épico Territórios — nenhum branch/worktree novo, nenhum merge pendente).

- **`TerritoryEngineStatusBoard 2.tsx`**: confirmado 0 bytes, `untracked`, 0 imports, 0 referências (`grep` vazio). Removido, conforme autorizado explicitamente pelo gate.
- Nenhum outro arquivo alterado por "limpeza estética".
- Nenhum conflito silencioso, nenhuma implementação duplicada nova, nenhum teste apontando para versão antiga de um contrato.

**WORKSPACE: PASS**

## 2 — Release Diff

Classificação do diff completo:

| Categoria | Exemplos |
|---|---|
| DATA | `lib/territorios/demografia-expansion.ts`, `saude-collector.ts`, `caged/*`, scripts de auditoria/expansão CAGED/PIB/SICONFI de rodadas anteriores |
| INTELLIGENCE | `lib/territorios/intelligence/**` (contracts, economy/electoral/security facts+signals, command-center/briefing/radar, `territory-runtime.ts` novo) |
| FRONTEND | `app/dashboard/territorios/**`, `components/dashboard/territorios/**`, `components/GlobalContextBar.tsx` (remove dependência de `CONTAGEM_DEMO`), `lib/utils/formatters.ts` (consumido só por componentes territoriais) |
| TEST | `*.test.ts`/`*.test.tsx` em todos os módulos acima, incluindo `frontend-connect.test.ts` novo |
| REPORT | `docs/relatorios/*.md`, `docs/RELATORIO_*.md` |
| UNRELATED | **0** |

`package.json`/`package-lock.json` mudam apenas para adicionar `@google/genai` — dependência do provider Gemini já auditado em gates anteriores (INTEL-03C), não uma feature nova.

**UNRELATED FILES: 0**

## 3-5 — Typecheck / Tests / Build

```
npx tsc --noEmit                                    → PASS (0 erros)
npx vitest run --exclude ".claude/worktrees/**"      → PASS — 976 passed, 5 skipped (111 arquivos, 116 total)
npm run build (npx next build)                       → PASS — 39 rotas compiladas
```

Números batem exatamente com os declarados pelo Codex.

**TYPECHECK: PASS · TESTS: 976 passed / 5 skipped · BUILD: PASS**

## 6 — Contract Connection (verificado por código)

Lido `lib/territorios/intelligence/territory-runtime.ts` (185 linhas) por completo. Confirmado:

- `loadTerritoryIntelligenceRuntime()` é a única porta de entrada server-side; roda `Promise.all` de 3 carregadores (`getCagedMunicipalSeries` + `buildCagedFacts`/`buildCagedEmploymentSignals`; `loadElectoral` → `buildElectionTerritoryAnalysis` → `buildElectoralTerritoryIntelligence` → `buildElectoralFacts`/`buildElectoralAnalyticalSignals`; `loadSecurity` → `buildSecurityFacts`/`buildSecurityIndicatorSignals`/`buildSecurityCategoryShiftSignal`), depois chama `buildTerritoryExecutiveSignals`, `buildTerritoryExecutiveBriefing`, `buildTerritoryRadar` — nessa ordem, sem nenhum recálculo alternativo.
- `app/dashboard/territorios/[ibge]/page.tsx` (82 linhas, era 236): só lê `factByKey()`/`runtime.executiveSignals`/`runtime.briefing`/`runtime.evidenceIndex` — nenhuma aritmética de MoM/YoY/tendência refeita na página.
- `app/dashboard/territorios/[ibge]/briefing/page.tsx` (61 linhas, era 233): renderiza exclusivamente `briefing.topSignals`/`briefing.attention`/`briefing.facts`/`briefing.limitations`. **O bloco inteiro de texto estático "Segurança Patrimonial"/"pressão eleitoral"/citações fixas que eu havia sinalizado como achado sério no gate de convergência anterior foi removido** — não existe mais prosa fixa na página.
- `app/dashboard/territorios/[ibge]/radar/page.tsx` (29 linhas, era 51): renderiza só `runtime.radar` (saída direta de `buildTerritoryRadar`), estado vazio honesto quando não há item.

**COMMAND CENTER CONTRACT: CANONICAL · BRIEFING CONTRACT: CANONICAL · RADAR CONTRACT: CANONICAL**

### Achado corrigido nesta auditoria (baixo risco)

`territory-runtime.ts` linha 142 pedia CAGED de `202401` a `202612` (deveria ser `202606`, a janela homologada). Verificado que isso **não tinha efeito funcional real**: o banco não tem nenhum dado além de 2026-06, `points` retornado já vinha correto (30 meses reais), e `territory-runtime.ts` nunca lê `coverage.monthsMissing`/`coverageStatus` — só `series.points`. Corrigido para `202606` por precisão, já que o próprio gate pede confirmação explícita dessa janela.

## 7 — Economia

Fluxo confirmado: Novo CAGED (`getCagedMunicipalSeries`, janela `202401`→`202606`) → `buildCagedFacts` → `buildCagedEmploymentSignals` → `buildTerritoryExecutiveSignals`/`buildTerritoryExecutiveBriefing`/`buildTerritoryRadar`. Nenhum recálculo de MoM/YoY/tendência duplicado no `page.tsx` do overview (confirmado por leitura completa). As páginas específicas de domínio (`economia/page.tsx`) continuam com sua própria lógica ad-hoc — correta desde a correção do gate de convergência anterior (mesma janela `202401`-`202606`, verificada intacta nesta auditoria via grep), mas não migrada para o contrato canônico; isso é esperado, o escopo do `INTELLIGENCE-FRONT-CONNECT-02` era as 3 superfícies executivas, não os cadernos de domínio.

**ECONOMY: READY**

## 8 — Eleitoral

Fluxo confirmado: indicadores/evidências TSE → `buildElectionTerritoryAnalysis` → `buildElectoralTerritoryIntelligence` → `buildElectoralFacts` → `buildElectoralAnalyticalSignals`. Grep em `electoral-signals.ts` confirma: `DIRECTLY_SUPPORTED` é atribuído apenas quando há `evidenceRefs` reais; `FRAGMENTATION`/`CONCENTRATION` aparecem **somente no comentário que explica por que não são implementados** — nenhum signal desses tipos é produzido em nenhum caminho do código.

**ELECTORAL: READY**

## 9 — Segurança

Confirmado via `SECURITY_INDICATOR_CATALOG` (`seguranca-analytics.ts`, 14 chaves reais) que `furto_consumado`/`veiculos_roubo_furto` não aparecem em nenhum lugar do runtime novo. `grep` por `gemini`/`genai`/`GoogleGenAI` em `territory-runtime.ts` e em toda `lib/territorios/intelligence/security/` retornou vazio — nenhuma chamada LLM. `INSUFFICIENT_DATA` é de fato produzido e tratado como resultado válido: confirmado no próprio `territory-runtime.ts` (signal vazio → `executiveSignalToUi` filtra, `DomainExecutiveSignal.status` cai para `INSUFFICIENT_DATA`) e na homologação do Codex (Segurança em BH/Betim/Contagem tem Facts reais mas `INSUFFICIENT_DATA` como signal, porque os thresholds não foram atingidos no recorte atual — comportamento correto, não um bug).

**SECURITY: READY**

## 10 — Demografia

Não tocada por `INTELLIGENCE-FRONT-CONNECT-02` (fora do escopo desse gate). Confirmado via grep que a reescrita feita no gate de convergência anterior (histórico 2001-2025 com os 4 gaps reais preservados, sexo, estrutura etária) segue intacta. Domicílios/urbanização/idade média continuam ausentes, disclosed, não fabricados.

**DEMOGRAPHY: READY_PARTIAL** (gap de matéria-prima, não bloqueador)

## 11 — Saúde

Não tocada por `INTELLIGENCE-FRONT-CONNECT-02`. Confirmado via grep que as 2 correções de chave (`estabelecimentos_total`, `estabelecimentos_atendimento_ambulatorial_sus`) do gate anterior seguem aplicadas. O badge de status "Consolidado" usado na página é o mesmo indicador genérico de frescor de dado usado em todos os cadernos (Economia/Segurança/Eleitoral também o usam) — não é uma alegação de completude epidemiológica; a própria descrição da página já se declara restrita a "estabelecimentos de saúde, leitos e cobertura do CNES".

**HEALTH SERVICE SUPPLY: READY · HEALTH OVERALL: PARTIAL** (sem epidemiologia — SIM/SINASC/SIH ausentes, corretamente não exibidos como zero real)

## 12 — Command Center

Confirmado (§6): não recalcula metodologia, usa `runtime.executiveSignals`/`runtime.briefing`/`runtime.evidenceIndex` diretamente. Domínios (População/Emprego/Segurança/Eleitoral) aparecem quando `Facts` existem; caem para `INDISPONIVEL` quando não. Funciona inteiramente sem LLM — `territory-runtime.ts` nunca importa um provider.

**COMMAND CENTER: READY**

## 13 — Briefing

Confirmado: nenhuma referência a `territory_briefings.codigo_ibge` em nenhum arquivo do escopo (grep vazio). `buildTerritoryExecutiveBriefing` é chamado diretamente pelo runtime, indexado por `territory_id` (UUID já resolvido), nunca pela coluna inexistente. Nenhum texto estático é apresentado como análise real — a página renderiza exclusivamente os campos do objeto `briefing` retornado pelo contrato. `llmSynthesis` não precisa ser lido pela página para funcionar (é `null` no contrato e simplesmente não há seção de síntese LLM) — comportamento correto.

**BRIEFING: READY**

## 14 — Radar

Confirmado: `runtime.radar` vem 1:1 de `buildTerritoryRadar(territoryId, signals)`, que só aceita `status:'ACTIVE'` + `evidenceRefs` não-vazio (contrato já auditado no `INTEL-DOMAIN-02`). Sem signal, a página mostra `AnalyticalEmptyState` — nenhum item genérico.

**RADAR: READY**

## 15 — Inteligência Política

Fora do escopo de `INTELLIGENCE-FRONT-CONNECT-02` e deste gate declarar como bloqueador. Confirmado (novamente) que `inteligencia-politica/page.tsx` permanece restrita a Contagem via `ibge === '3118601'`, com `poc-fixture.ts` explicitamente rotulado como fixture, selo visível, e estado vazio honesto para qualquer outro município. Nenhum dado falso, nenhum vazamento territorial.

**POLITICAL INTELLIGENCE: WAITING** (não exigido COMPLETE para deploy, conforme o próprio gate)

## 16-17 — Gemini / Provider Fallback

Nenhuma mudança de configuração de provider neste gate nem no `INTELLIGENCE-FRONT-CONNECT-02`. `territory-runtime.ts` e as 3 superfícies executivas não fazem nenhuma chamada Gemini/Anthropic — Gemini não é requisito para renderizar o produto (confirmado por leitura direta: zero import de provider nesses arquivos).

**ECONOMY GEMINI: READY · ELECTORAL GEMINI: READY · SECURITY GEMINI: DISABLED · DEMOGRAPHY GEMINI: DISABLED · HEALTH GEMINI: DISABLED · GEMINI DEFAULT: PASS · ANTHROPIC FALLBACK: PASS**

## 18 — Municipal Isolation

Consulta SQL independente (somente-leitura), 4 municípios:

| Município | IBGE | CAGED (NOVO_CAGED) | TSE | SEJUSP |
|---|---:|---:|---:|---:|
| Belo Horizonte | 3106200 | 540 | 3.826 | 154 |
| Betim | 3106705 | 540 | 1.575 | 154 |
| Contagem | 3118601 | 540 | 1.838 | 154 |
| Nova Lima | 3144805 | **0** | 717 | 154 |

Números batem exatamente com a tabela de homologação do Codex. Nova Lima genuinamente não tem CAGED — o runtime produzirá `Economy Facts: []` / `status: INSUFFICIENT_DATA` para esse domínio, nunca o saldo de Contagem ou de qualquer outro município.

**MUNICIPAL ISOLATION: PASS**

## 19 — Contagem Demo

`grep` por `CONTAGEM_DEMO`/`poc-fixture`/`LEGACY_PRELOADED_IBGE`/`3118601` em `page.tsx`, `briefing/page.tsx`, `radar/page.tsx` e `territory-runtime.ts`: **0 ocorrências** — exatamente como declarado pelo Codex. Nas páginas legadas de domínio (economia/segurança/demografia/saúde/eleições/e as ~10 páginas ainda não integradas), o uso de `CONTAGEM_DEMO` continua 100% guardado por `ibge === '3118601'` com selo visível, conforme já auditado e confirmado no gate de convergência anterior.

**CONTAGEM FALLBACK LEAKS: 0**

## 20 — Query Audit

Colunas usadas por `territory-runtime.ts` verificadas contra o schema real via `information_schema.columns`: `territory_indicators` (`territory_id`, `periodo_inicio`, `periodo_fim` — confirmado, sem uso de `periodo`) e `territory_evidence` (`territory_id`, `source_name`, `source_external_id`, `source_hash` — todos existem). Nenhuma query em `territory_briefings` no escopo (a query quebrada de `codigo_ibge` foi removida, não corrigida — o caminho antigo simplesmente não existe mais).

**Nenhuma query usa coluna inexistente no escopo integrado.**

## 21 — Silent Catch Audit

`territory-runtime.ts` usa `.catch(() => ({facts:[], signals:[]}))` nos 3 carregadores — um catch silencioso, mas seu valor de fallback (`facts`/`signals` vazios) sempre degrada para os estados corretos (`INDISPONIVEL`/`INSUFFICIENT_DATA`/estado vazio) em todas as camadas a jusante (`executiveSignals`, `briefing.topSignals`, `radar`) — nunca produz um número que pareça um valor real observado. Este é o padrão correto (fail-closed), não um risco.

**SILENT QUERY FAILURES THAT CAN FAKE DATA: 0**

## 22 — KPI Sanity

| Domínio | KPI | Status |
|---|---|---|
| Economia | Saldo R12, MoM, YoY, Admissões, Desligamentos | REAL (fonte: `buildCagedFacts` sobre janela homologada, confirmado §7) |
| Segurança | Crimes Violentos, Roubos, Homicídios, Extorsão, Sequestro/Cárcere | REAL (catálogo de 14 chaves, confirmado §9; chaves inexistentes ausentes) |
| Demografia | População, Variação, %Fem, %Masc, %Jovens, %Idosos | REAL (confirmado intacto do gate anterior) |
| Saúde | Total, Atendimento SUS, UBS, Urgência/Emergência | REAL (confirmado intacto do gate anterior) |
| Eleitoral | Eleitorado, Comparecimento, Abstenção, Válidos, Brancos/Nulos, Margem | REAL (`tse-notebook-repository.ts`, confirmado intacto do gate anterior) |

**INVALID KPI SANITY CHECKS: 0**

## 23 — Chart Sanity

CAGED 30m, CAGED setorial, CAGED R12, Segurança 11 períodos, Demografia histórica, Sexo, Estrutura etária, CNES composição, Eleitoral evolução — todos com fonte real confirmada nesta ou na auditoria anterior; nenhum usa janela ou chave incorreta remanescente.

**INVALID CHART SANITY CHECKS: 0**

## 24 — Disclosure

Estados `REAL`/`PARCIAL`/`INDISPONIVEL`/`DEMO`/`SEM_DADOS`/`COLETA_NECESSARIA` usados de forma consistente. Nenhuma ausência vira zero fabricado nas 3 superfícies integradas — confirmado que `factByKey()` só retorna facts com `supported: true`, e a ausência de fact resulta em `null` → `'Indisponível'`, nunca `0`.

## 25 — Runtime Without LLM

`territory-runtime.ts` não importa nenhum provider LLM — as 3 superfícies são inteiramente determinísticas por construção. Não há um "modo sem LLM" a testar separadamente: é o único modo que existe hoje neste runtime, e funciona.

## 26 — Security (secrets)

Nenhum dos 4 arquivos novos/alterados (`territory-runtime.ts`, `page.tsx`, `briefing/page.tsx`, `radar/page.tsx`) tem `'use client'` — todos são Server Components, `createAdminClient()` (service role) só é instanciado e usado no servidor. Nenhuma chave hardcoded, nenhum padrão de secret encontrado por busca textual.

**CLIENT-EXPOSED SECRETS: 0**

## 27 — Performance Sanity

`loadTerritoryIntelligenceRuntime` roda os 3 domínios em paralelo (`Promise.all`); `loadElectoral` roda suas 2 queries em paralelo; `loadSecurity` busca as 14 chaves em uma única query (`.in('indicador', keys)`), não uma por indicador. Nenhum N+1, nenhuma recursão, nenhum loop de render encontrado.

---

## 30 — Release Matrix

| Surface | Data | Facts | Signals | Front | LLM | Disclosure | Release Status |
|---|---|---|---|---|---|---|---|
| Overview / Command Center | REAL | REAL | REAL/PARCIAL | SIM (canônico) | não obrigatório | por domínio | READY |
| Economy | REAL (BH/Betim/Contagem); ausente em Nova Lima | REAL | REAL | SIM (canônico nas 3 superfícies; ad-hoc correto no caderno próprio) | READY, opcional | fonte/período | READY / PARTIAL em Nova Lima |
| Electoral | REAL | REAL | REAL | SIM | READY, opcional | proveniência/confiança | READY |
| Security | REAL | REAL | REAL quando threshold satisfeito, senão INSUFFICIENT_DATA (válido) | SIM | DISABLED | insuficiência explícita | READY |
| Demography | REAL/PARCIAL | não integrado ao runtime canônico (fora de escopo) | não integrado | caderno próprio real | DISABLED | gaps explícitos | PARTIAL (não bloqueador) |
| Health | REAL/PARCIAL | não integrado ao runtime canônico (fora de escopo) | não integrado | caderno próprio real | DISABLED | epidemiologia ausente, explícito | PARTIAL (não bloqueador) |
| Briefing | REAL/PARCIAL | SIM | SIM | SIM (canônico) | opcional, null aceito | limitações exibidas | READY |
| Radar | REAL/PARCIAL | via signals | SIM | SIM (canônico) | não usado | vazio sem signal | READY |
| Political Intelligence | DEMO restrito a Contagem, disclosed | via contrato pré-existente | via contrato pré-existente | parcial | configuração preservada | selo + estado vazio | WAITING (não bloqueador) |

---

## SAÍDA OBRIGATÓRIA

```
FINAL-DEPLOY-AUDIT-TERRITORIOS-2.0: PASS

WORKSPACE: PASS
UNRELATED FILES: 0

TYPECHECK: PASS
TESTS: 976 passed / 5 skipped
BUILD: PASS

COMMAND CENTER CONTRACT: CANONICAL
BRIEFING CONTRACT: CANONICAL
RADAR CONTRACT: CANONICAL

ECONOMY: READY
ELECTORAL: READY
SECURITY: READY

DEMOGRAPHY: READY_PARTIAL

HEALTH SERVICE SUPPLY: READY
HEALTH OVERALL: PARTIAL

BRIEFING: READY
RADAR: READY
POLITICAL INTELLIGENCE: WAITING

ECONOMY GEMINI: READY
ELECTORAL GEMINI: READY
SECURITY GEMINI: DISABLED
DEMOGRAPHY GEMINI: DISABLED
HEALTH GEMINI: DISABLED

GEMINI DEFAULT: PASS
ANTHROPIC FALLBACK: PASS

MUNICIPAL ISOLATION: PASS

CONTAGEM FALLBACK LEAKS: 0
MISLEADING FIXTURES: 0

INVALID KPI SANITY CHECKS: 0
INVALID CHART SANITY CHECKS: 0

SILENT QUERY FAILURES THAT CAN FAKE DATA: 0

CLIENT-EXPOSED SECRETS: 0

P0: 0
P1: 0
P2: 0
P3: 0
```

---

## Release Decision

Todos os critérios do gate para `APPROVED` foram atendidos:

- P0 = 0, P1 = 0
- TYPECHECK/TESTS/BUILD = PASS
- Command Center / Briefing / Radar = CANONICAL (verificado por código, não por relatório)
- Municipal Isolation = PASS (verificado por SQL independente)
- Contagem Fallback Leaks = 0
- Misleading Fixtures = 0
- Invalid KPI/Chart Sanity Checks = 0
- Silent Query Failures That Can Fake Data = 0
- Client-Exposed Secrets = 0

**TERRITÓRIOS 2.0 FINAL RELEASE: APPROVED**

---

## Deploy

Nenhum deploy foi executado.

**READY FOR PRODUCTION DEPLOY: YES**

---

**PARE.** Nenhuma nova feature, nenhum Territórios 2.1, nenhum deploy executado neste gate.
