# RELATÓRIO FINAL — MÓDULO PESQUISAS ELEITORAIS E AUTOMAÇÃO N8N

**Tipo:** Levantamento factual, somente leitura (código + banco de produção via MCP Supabase, projeto `hhhwuajptkyposarfbzn`).
**Nenhuma alteração** foi feita em código, banco, migrations, workflows ou commits nesta rodada.
**Nota de nomenclatura:** o briefing original citava as tabelas `electoral_polls_mvp` e `electoral_poll_results_provenance`. Essas tabelas **não existem**. As tabelas reais são `public.electoral_polls` e `public.electoral_poll_results` — proveniência é uma **coluna `jsonb`** dentro de `electoral_poll_results`, não uma tabela separada. Todo o relatório abaixo usa os nomes reais.

---

## 1. ESTADO REAL DO MÓDULO

### Superfícies (`app/dashboard/pesquisas`)
- **Cockpit Executivo** — [page.tsx](app/dashboard/pesquisas/page.tsx) → [PesquisasCockpitView.tsx](app/dashboard/pesquisas/components/PesquisasCockpitView.tsx)
- **Base de Pesquisas / Comparativo** — [PesquisasListView.tsx](app/dashboard/pesquisas/components/PesquisasListView.tsx), [PesquisasComparativoView.tsx](app/dashboard/pesquisas/components/PesquisasComparativoView.tsx)
- **Visão Executiva (corridas prioritárias fixas)** — [executivo/page.tsx](app/dashboard/pesquisas/executivo/page.tsx)
- **Ficha individual da pesquisa** — [\[id\]/page.tsx](app/dashboard/pesquisas/[id]/page.tsx) + 8 componentes em `[id]/components/` (Header, Methodology, QualityControl, QualityRepresentativeness, ResultsSection, SampleProfile, SummaryCards, TerritorialCoverage, FooterAuditing)

### Arquivos principais (`lib/pesquisas/`, 3.598 linhas de código + 1.379 linhas de teste)
| Arquivo | Papel |
|---|---|
| [types.ts](lib/pesquisas/types.ts) | Modelo de domínio (`ElectoralPoll`, `ElectoralPollResult`, métricas) |
| [collector.ts](lib/pesquisas/collector.ts) | Coletor: baixa, normaliza e grava dados do TSE |
| [source.ts](lib/pesquisas/source.ts) | URL/descriptor da fonte oficial |
| [csv.ts](lib/pesquisas/csv.ts) | Extração de ZIP/CSV (unzipper + iconv-lite + csv-parse) |
| [normalizer.ts](lib/pesquisas/normalizer.ts) | Mapeamento coluna TSE → coluna PolitixOS |
| [parser.ts](lib/pesquisas/parser.ts) | Extração heurística (regex) de metadados de texto livre |
| [repository.ts](lib/pesquisas/repository.ts) | Leitura de `electoral_polls` (KPIs, filtros, listagens) |
| [results-repository.ts](lib/pesquisas/results-repository.ts) | Leitura/upsert de `electoral_poll_results`, série temporal |
| [comparability.ts](lib/pesquisas/comparability.ts) | Regras de comparabilidade entre pesquisas/resultados |
| [analyticsEngine.ts](lib/pesquisas/analyticsEngine.ts) | Status analítico, sinais de cenário, "Politix IA" local |
| [cockpitAnalytics.ts](lib/pesquisas/cockpitAnalytics.ts) | Métricas do cockpit (gap, variação, volatilidade, ranking) |

Cada arquivo acima tem um `.test.ts` correspondente (9 suítes, 1.379 linhas totais).

### APIs / Server Actions
- **1 API route**: [app/api/pesquisas/collect/route.ts](app/api/pesquisas/collect/route.ts) — `POST`, exige sessão admin, dispara `runPesquisasCollector`.
- **Nenhuma Server Action** (`'use server'`) encontrada no módulo — toda leitura é feita via `repository.ts`/`results-repository.ts` chamados diretamente em Server Components (`page.tsx`).

### Fluxo real: BANCO → repository/service → analytics → cockpit → Politix IA
```
electoral_polls / electoral_poll_results (Supabase)
   → repository.ts / results-repository.ts (leitura, mapRow, upsert)
   → cockpitAnalytics.ts (métricas) + comparability.ts (filtros de comparabilidade)
   → analyticsEngine.ts (status analítico, sinais, "Politix IA" local/determinístico)
   → PesquisasCockpitView.tsx / executivo/page.tsx (UI)
```
Este fluxo é **inteiramente local ao módulo** — não há chamada a `lib/ai/*` (o "Politix IA" global do resto do sistema) nem a nenhum outro módulo (ver Seção 9).

---

## 2. BANCO — CONTRATO QUE O N8N PRECISARÁ ALIMENTAR

Confirmado ao vivo no banco de produção (`hhhwuajptkyposarfbzn`): **1.695 linhas** em `electoral_polls`, **205 linhas** em `electoral_poll_results`, **22 execuções** em `source_collection_runs`.

### `public.electoral_polls`
- **Finalidade:** registro oficial de pesquisas eleitorais (ficha técnica/metodológica), 1 linha por pesquisa registrada no TSE.
- **PK:** `id uuid`.
- **Natural key / deduplicação:** `tse_registration_number text UNIQUE` (upsert por `onConflict`, `collector.ts:235`).
- **Campos obrigatórios (NOT NULL):** `tse_registration_number`, `source`, `source_dataset`, `election_year`.
- **Campos importantes:** `uf`, `municipio` (sempre null hoje — sem coluna estruturada na fonte), `cargo` (**texto multi-valor bruto**, ex. `"Governador, Senador"`), `abrangencia` (= `NM_UE`, unidade eleitoral de **registro**, não confirmação de área real da amostra), `instituto`, `contratante`/`pagante`/`valor` (contratante/pagante sempre null — recursos TSE separados ainda não ingeridos), `metodologia`, `data_registro`, `campo_inicio`, `campo_fim`, `amostra`, `margem_erro`/`nivel_confianca` (sempre null — não estruturados na fonte).
- **Relacionamentos:** `electoral_poll_results.poll_id → electoral_polls.id` (`ON DELETE CASCADE`).
- **Campo de cargo/office:** `cargo` (multi-valor, string bruta do TSE — ver Seção 3).
- **Campo de cenário:** não existe em `electoral_polls` (está em `electoral_poll_results.cenario`).
- **Campo de candidato:** não existe em `electoral_polls` (esta tabela não contém resultado de intenção de voto — ver Seção 12).
- **Campos demográficos:** nenhum estruturado; existe apenas texto livre em `raw_source_row` (ver Seção 5).
- **Provenance:** `raw_source_row jsonb` — linha bruta original do CSV do TSE, preserva 100% do dado de origem mesmo quando a normalização não cobre um campo.
- **Timestamps:** `ingested_at`, `created_at`, `updated_at`.

### `public.electoral_poll_results`
- **Finalidade:** resultado de intenção de voto por candidato/cenário. Populada **manualmente/fora de banda** — não por nenhum coletor automático (ver Seção 12).
- **PK:** `id uuid`.
- **Natural key / deduplicação:** **não é constraint de banco** — é checagem em código, na camada de aplicação (`upsertPollResult`, [results-repository.ts:13-25](lib/pesquisas/results-repository.ts:13)): `(poll_id, cenario, turno, tipo_pergunta, candidate_name)`.
- **Campos obrigatórios:** `poll_id`, `cenario`, `turno`, `tipo_pergunta`, `candidate_name`, `percentage`.
- **Campos importantes:** `office`, `result_type` (`STIMULATED|SPONTANEOUS|REJECTION|SECOND_ROUND|OTHER`, texto livre não-enum), `candidate_id` (FK opcional para `targets`), `source_name`/`source_url`/`source_date`, `verified boolean` (default `false` — hoje **100% das 205 linhas têm `verified = true` e `office` preenchido**, confirmado via query).
- **Relacionamentos:** `poll_id → electoral_polls.id`; `candidate_id → targets.id`.
- **Campo de cargo/office:** `office` — complementa (não substitui) `cargo` da pesquisa-pai; é o campo usado para desambiguar pesquisa multi-cargo (Seção 3).
- **Campo de cenário:** `cenario text NOT NULL`.
- **Campo de candidato:** `candidate_name text NOT NULL` (+ `candidate_id` opcional quando há match seguro com `targets`).
- **Campos demográficos:** nenhum. Não existe segmentação por sexo/idade/renda etc. nesta tabela (ver Seção 5).
- **Provenance:** coluna `provenance jsonb NOT NULL DEFAULT '{}'`. Nas 205 linhas reais, as chaves usadas são: `cargo_confirmado`, `campo_confirmado`, `territorio_confirmado`, `amostra_confirmada`, `sample_confirmed`, `margem_erro_confirmada`, `margin_of_error_pp`, `nivel_confianca_confirmado`, `confidence_level_pct`, `field_dates_confirmed`, `tse_registration_cited`, `nota` — é um checklist de conferência manual (auditoria de correspondência com a pesquisa registrada), não um payload de origem de dados.
- **Timestamps:** `collected_at`, `created_at`.

### Tabela auxiliar reaproveitada: `source_collection_runs`
Não é exclusiva de Pesquisas — é a mesma tabela genérica já usada pelo módulo CAGED (`supabase_migration_caged_eco03b15_hardening.sql`). O coletor de pesquisas grava nela com `source='TSE/PESQUISA_ELEITORAL'`, `scope='BR'`, `workflow_name='pesquisas-eleitorais-collector'`, e usa `metadata jsonb` para `discovered_resources`, `sha256`, `source_url`. `getPesquisasKpis()` lê a última execução daqui para exibir `sourceStatus`/`lastSyncAt` honestos (nunca "0 pesquisas" silencioso).

---

## 3. PESQUISA MULTI-CARGO

**Confirmado como regra oficial, com dado real de produção.** `poll_id` sozinho **não** define uma corrida.

- **1.695 pesquisas** em `electoral_polls`; **973 delas** têm `cargo` com múltiplos valores separados por vírgula (ex.: 510 com `"Governador, Senador"`, 384 com `"Governador, Senador, Deputado Federal, Deputado Estadual"`).
- Exemplo real confirmado no banco: `DF023562026` → `cargo = "Governador, Senador, Deputado Distrital"`. (O exemplo `DF078492026`/Celina Leão×Michelle Bolsonaro citado no briefing é ilustrativo — não corresponde a um registro real encontrado no banco atual, mas o padrão estrutural que ele descreve é exatamente o de `DF023562026` e análogos.)
- **Onde a regra é aplicada no código:**
  - `getPriorityRacePolls(uf, cargoLike)` ([results-repository.ts:158-199](lib/pesquisas/results-repository.ts:158)) filtra por `poll.cargo ilike '%cargoLike%'` **e depois** valida `office` de cada resultado individualmente — nunca assume que todo resultado de um `poll_id` pertence ao mesmo cargo.
  - `arePollsComparable()` ([comparability.ts:4-16](lib/pesquisas/comparability.ts:4)) exige match de `cargo` (com tolerância de substring) **e** UF/abrangência.
  - `areResultsComparable()` ([comparability.ts:31-39](lib/pesquisas/comparability.ts:31)) exige `office` igual quando ambos os lados o possuem.
  - `getInstituteComparisonPoints()` ([cockpitAnalytics.ts:335-366](lib/pesquisas/cockpitAnalytics.ts:335)) agrupa por chave composta `pollId::office::cenario` — nunca só por `pollId`.
- **Estado real de dados:** hoje as 205 linhas de `electoral_poll_results` têm `office` preenchido em 100% dos casos — a identidade analítica `poll + office + cenario` já é a prática real, não apenas teórica.

---

## 4. COMPARABILIDADE

Lógica **já implementada** em [comparability.ts](lib/pesquisas/comparability.ts) e consumida por [cockpitAnalytics.ts](lib/pesquisas/cockpitAnalytics.ts). Não há fórmula nova proposta aqui — apenas a existente, documentada.

Campos considerados, na ordem em que o código decide (`explainComparabilityReason`, [comparability.ts:41-83](lib/pesquisas/comparability.ts:41)):
1. **Cargo** (`arePollsComparable` — match exato ou substring, case-insensitive)
2. **UF/abrangência** (`uf ?? abrangencia ?? 'BR'`, igualdade estrita)
3. **Office do resultado** (quando ambos os lados têm `office` preenchido, precisa ser igual)
4. **Turno** (`turno` igual)
5. **Tipo de pergunta** (`tipo_pergunta`: espontânea vs. estimulada, igual)
6. **Equivalência de cenário** (`areScenariosEquivalent` — mesmo **conjunto** de nomes de candidato, não apenas mesmo texto de `cenario`)

Campos **não** usados hoje na decisão de comparabilidade, mas presentes no schema e citados no briefing como relevantes: instituto, metodologia, quantidade de escolhas, datas de campo, população pesquisada — a lógica atual é estrutural (cargo/UF/turno/tipo/candidatos), não pondera esses campos.

`buildTemporalSeries()` ([results-repository.ts:78-98](lib/pesquisas/results-repository.ts:78)) aplica um critério ainda mais estrito para série temporal: só inclui pesquisa com **exatamente 1 cenário** de 1º turno estimulado — pesquisas com cenários fragmentados (ex.: MG/abril, que testa candidatos em pares) ficam de fora automaticamente, documentado em `executivo/page.tsx:87-92`.

---

## 5. DADOS DEMOGRÁFICOS / PERFIL DO ELEITORADO

**Prioritário conforme solicitado — mapeamento completo por categoria.**

| Dado | Categoria | Evidência |
|---|---|---|
| Sexo/gênero (perfil da amostra) | **B** (raw, extraído heuristicamente) | `extractGenderDistribution()`, regex sobre `DS_PLANO_AMOSTRAL` texto livre ([parser.ts:93-134](lib/pesquisas/parser.ts:93)) |
| Idade/faixa etária (perfil da amostra) | **B** | `extractAgeDistribution()` ([parser.ts:136-168](lib/pesquisas/parser.ts:136)) |
| Escolaridade (perfil da amostra) | **B** | `extractEducationDistribution()` ([parser.ts:170-198](lib/pesquisas/parser.ts:170)) |
| Renda (perfil da amostra, em faixas de SM) | **B** | `extractIncomeDistribution()` ([parser.ts:200-223](lib/pesquisas/parser.ts:200)) |
| Religião | **D** | Nenhuma coluna, nenhum extrator, nenhuma menção no dataset TSE (26 colunas verificadas, nenhuma é religião) |
| Região (dentro da UF) | **D/B parcial** | Só como texto livre em `DS_DADO_MUNICIPIO`, "formato inconsistente entre institutos" — não extraído (`normalizer.ts:25-29`) |
| Município | **D** | `municipio` sempre `null` — sem coluna estruturada confiável na fonte (`normalizer.ts:85`) |
| Bairro | **D** | Decisão definitiva de não implementar (doc `CLAUDE_PESQUISAS_01A_CORE_TSE.md:76`: "não implementado na UI — decisão definitiva, não pendência") |
| Classe social | **D** (proxy parcial via renda) | Sem campo próprio; renda em SM é o único proxy, categoria B |
| Voto anterior | **D** | Não existe no dataset TSE nem em nenhuma tabela |
| Aprovação/rejeição | **D** | `REJECTION` existe como valor possível de `result_type`, mas é um enum de string livre, sem nenhuma linha real usando esse valor hoje |
| **Crosstabs (intenção de voto por perfil demográfico)** | **D — explicitamente ausente na UI** | [IntencaoPorPerfilPlaceholder.tsx](app/dashboard/pesquisas/components/IntencaoPorPerfilPlaceholder.tsx): card com selo "Contrato Preparado (Futuro)", texto explícito "O dataset oficial (...) contém o perfil da amostra coletada, mas não divulga o resultado de intenção de voto cruzado por estratos demográficos. NENHUM DADO MOCK É EXIBIDO" |
| Perfil da amostra (não-cruzado) — exibição em UI | **C** | [PollSampleProfile.tsx](app/dashboard/pesquisas/[id]/components/PollSampleProfile.tsx), [PerfilAmostralCard.tsx](app/dashboard/pesquisas/components/PerfilAmostralCard.tsx) — exibem o resultado de A/B acima quando extraído |

**Conclusão desta seção:** o sistema consegue **extrair e exibir o perfil da amostra pesquisada** (quem foi entrevistado) a partir de texto livre, com confiança marcada (`high`/`medium`) e trecho de origem (`rawSnippet`) para auditoria. O sistema **não tem, e a fonte oficial TSE não fornece**, o cruzamento "intenção de voto por segmento demográfico" (quem vota em quem, por perfil) — isso está corretamente sinalizado na UI como indisponível, não mockado.

Um modelo de tabela para esse cruzamento já foi **desenhado mas não implementado**, documentado em `docs/relatorios/CLAUDE_PESQUISAS_DATA_02_HISTORICO.md:81`: `electoral_poll_result_segments (poll_result_id FK, dimension, segment_label, percentage, + campos de proveniência)` — relevante para o contrato n8n futuro (Seção 11) caso uma fonte com crosstabs seja identificada.

---

## 6. DADOS METODOLÓGICOS

| Campo | Status | Onde |
|---|---|---|
| Instituto | **ESTRUTURADO** | `electoral_polls.instituto` (`NM_EMPRESA`) |
| Contratante | **AUSENTE** | Coluna existe, sempre `null` — recurso TSE separado não ingerido |
| Pagante | **AUSENTE** | Idem |
| Registro TSE | **ESTRUTURADO** | `tse_registration_number` (`NR_PROTOCOLO_REGISTRO`) — natural key |
| Data de registro | **ESTRUTURADO** | `data_registro` (`DT_REGISTRO`) |
| Data de divulgação | **RAW** | Presente só em `raw_source_row.DT_DIVULGACAO`, não normalizada em coluna própria |
| Início/fim de campo | **ESTRUTURADO** | `campo_inicio`/`campo_fim` |
| Amostra | **ESTRUTURADO** | `amostra` (`QT_ENTREVISTADO`) |
| Margem de erro | **RAW** (extraível) | Coluna existe (`margem_erro`), sempre `null` na fonte; extraída via regex de `DS_PLANO_AMOSTRAL` quando presente (`extractMarginOfError`) |
| Confiança | **RAW** (extraível) | Idem, `extractConfidenceLevel` |
| Método de coleta | **RAW** (extraível) | `extractCollectionType()` sobre `DS_METODOLOGIA_PESQUISA` |
| População pesquisada | **RAW** (extraível, fixo) | `extractSamplingMethod`/`targetPublic` — hoje hardcoded como "Eleitores com 16 anos ou mais" quando há método de amostragem detectado |
| Abrangência | **ESTRUTURADO (com ressalva)** | `abrangencia` = `NM_UE`, é a unidade de **registro**, não confirmação de área real da amostra (ver Seção 2) |
| Quantidade de escolhas | **AUSENTE** | Não existe no dataset TSE nem em coluna própria |
| Tipo espontânea/estimulada | **ESTRUTURADO** | `electoral_poll_results.tipo_pergunta` (não está em `electoral_polls`, só existe por resultado) |
| Turno | **ESTRUTURADO** | `electoral_poll_results.turno` |
| Cargo | **ESTRUTURADO (multi-valor bruto)** | `electoral_polls.cargo` |
| UF | **ESTRUTURADO** | `electoral_polls.uf` |
| Municípios | **AUSENTE** | Sempre `null` |
| Questionário | **AUSENTE** | Não existe no dataset |
| Fonte | **ESTRUTURADO** | `source`, `source_dataset` |
| URL | **ESTRUTURADO** | `source_url` |
| Provenance/raw payload | **ESTRUTURADO** | `raw_source_row` (polls) / `provenance` (results) |

---

## 7. ANALYTICS ENGINE

| Indicador | Input | Output | Arquivo/Função |
|---|---|---|---|
| Líder / segundo colocado | `ElectoralPollResultWithPoll[]` | `intencaoMaisRecente`, `runnerUpResult` | `calculateCockpitMetrics()` [cockpitAnalytics.ts:31](lib/pesquisas/cockpitAnalytics.ts:31) |
| Gap concorrente | top-2 candidatos do cenário mais recente | `gapConcorrente: {gap, leader, runnerUp}` | idem, [cockpitAnalytics.ts:139](lib/pesquisas/cockpitAnalytics.ts:139) |
| Variação vs. pesquisa anterior | série de pesquisas comparáveis (2+) | `variacaoAnterior: {diff, candidateName, previousPollDate}` | idem, [cockpitAnalytics.ts:225-234](lib/pesquisas/cockpitAnalytics.ts:225) |
| Evolução temporal (série) | pesquisas com 1 cenário único de 1º turno estimulado | `TemporalSeriesEntry[]` | `buildTemporalSeries()` [results-repository.ts:78](lib/pesquisas/results-repository.ts:78) |
| Ranking (com/sem não-candidatos) | resultados de um cenário | `{realCandidates, nonCandidates}` | `getCandidateRanking()` [cockpitAnalytics.ts:300](lib/pesquisas/cockpitAnalytics.ts:300) |
| Volatilidade | range (max-min) da série do candidato-alvo | `volatility: BAIXA/MODERADA/ALTA` | [cockpitAnalytics.ts:257](lib/pesquisas/cockpitAnalytics.ts:257) |
| Consistência entre institutos | mesmo range da série | `instituteConsistency: CONVERGENTE/MODERADA/DIVERGENTE` | [cockpitAnalytics.ts:258](lib/pesquisas/cockpitAnalytics.ts:258) |
| Comparáveis / trend count | `arePollsComparable` + `areScenariosEquivalent` | `pesquisasComparaveisCount`, `trendPollsCount` | [cockpitAnalytics.ts:170-186](lib/pesquisas/cockpitAnalytics.ts:170) |
| Tendência do líder / movimento do 2º | diff ponto-a-ponto na série comparável | `leaderMovement`/`runnerUpMovement: UP/DOWN/STABLE` | [cockpitAnalytics.ts:236,243](lib/pesquisas/cockpitAnalytics.ts:236) |
| Comportamento do gap | gap atual vs. gap anterior | `gapBehavior: EXPANDING/NARROWING/STABLE` | [cockpitAnalytics.ts:249](lib/pesquisas/cockpitAnalytics.ts:249) |
| Status analítico (situação da corrida) | ranking + métricas + candidato-alvo | `ESTÁVEL/ATENÇÃO/CRÍTICO/SEM CLASSIFICAÇÃO` | `calculateAnalyticalStatus()` [analyticsEngine.ts:44](lib/pesquisas/analyticsEngine.ts:44) |
| Sinais de cenário (cards) | métricas + série + ranking | `ScenarioSignal[]` (growth/drop/stability/gap_reduction/divergence/insufficient_data) | `calculateScenarioSignals()` [analyticsEngine.ts:137](lib/pesquisas/analyticsEngine.ts:137) |
| Comparativo entre institutos | resultados agrupados por `pollId::office::cenario` | `InstituteComparisonPoint[]` | `getInstituteComparisonPoints()` [cockpitAnalytics.ts:335](lib/pesquisas/cockpitAnalytics.ts:335) |
| Segundo turno | `turno=2` nos resultados | agrupamento por cenário em `executivo/page.tsx` | [executivo/page.tsx:84-85](app/dashboard/pesquisas/executivo/page.tsx:84) (sem função dedicada em `cockpitAnalytics.ts`) |

Todos os indicadores acima são **cálculo determinístico em TypeScript puro**, sem chamada a serviço externo ou IA.

---

## 8. POLITIX IA (leitura executiva do módulo Pesquisas)

**É template/cálculo determinístico — não é IA generativa.** `generatePolitixInsight()` ([analyticsEngine.ts:207-300](lib/pesquisas/analyticsEngine.ts:207)) monta as 4 strings de saída por concatenação de template literals condicionais sobre os números já calculados pelo `cockpitAnalytics.ts` — não há chamada a nenhum SDK de LLM. Confirmado por busca no módulo inteiro: nenhuma referência a `openai`/`anthropic`/`@anthropic-ai/sdk`/`generateText` dentro de `lib/pesquisas/*` ou `app/dashboard/pesquisas/*`.

| Bloco | Como é produzido | Dados reais que alimentam |
|---|---|---|
| Cenário Atual | template condicional | líder/2º/3º colocado, percentuais, instituto, gap |
| Principal Movimento | template condicional | `variacaoAnterior.diff`, `gapBehavior` |
| Risco/Oportunidade | template condicional | `pesquisasComparaveisCount`, `gapConcorrente` |
| Orientação Estratégica | template condicional | `hasSufficientSeries`, candidato analisado vs. líder |

Isso é **homônimo, mas tecnicamente separado** do "Politix IA" global do resto do sistema (`lib/ai/analytics-service.ts`, que usa `@anthropic-ai/sdk` de fato — ver Seção 9). O card `PolitixAiCard.tsx` do módulo Pesquisas consome exclusivamente `PolitixAiInsight` de `analyticsEngine.ts`, não o serviço de IA global.

---

## 9. INTEGRAÇÃO COM CRISE

Busca exaustiva (grep) em `app/dashboard/crise`/`lib/crise` (não existem como módulo dedicado — "Crise" vive dentro de "Visão Geral", `app/dashboard/overview/`) e em sentido inverso dentro de `lib/pesquisas/*`/`app/dashboard/pesquisas/*`: **zero ocorrências cruzadas** de `electoral_poll`/`pesquisas` fora do próprio módulo, e zero ocorrências de `overview`/`crise`/`political-status`/`analytics-service` dentro do módulo Pesquisas.

| Alvo | Classificação | Evidência |
|---|---|---|
| Visão Geral | **NÃO INTEGRADO** | `lib/queries/overview.ts` agrega apenas menções/notícias + Instagram + X + Facebook |
| Termômetro de Crise | **NÃO INTEGRADO** | `getCrisisOverview()` (`lib/queries/overview.ts`) sem fonte de pesquisas |
| Estado Político | **NÃO INTEGRADO** | `lib/analytics/political-status.ts` não referencia `electoral_poll*` |
| Risco | **NÃO INTEGRADO** | "Risco/Oportunidade" em Pesquisas é card local (Seção 8), não linkado ao Risco global |
| Alertas | **NÃO INTEGRADO** | `lib/queries/alerts.ts` sem menção a pesquisas |
| Briefing | **NÃO INTEGRADO** | Briefing territorial não referencia pesquisas |
| Politix IA global | **NÃO INTEGRADO** | `lib/ai/analytics-context.ts`/`analytics-service.ts` (usa `@anthropic-ai/sdk`) não citam pesquisas |

**Conclusão:** o módulo Pesquisas Eleitorais é hoje **totalmente autocontido**. Não alimenta nem é alimentado por nenhum outro módulo do PolitixOS.

---

## 10. O QUE PODE VIRAR SINAL ELEITORAL

| Sinal | Dados necessários | Dados já disponíveis |
|---|---|---|
| `POLL_RISE` / `POLL_DROP` | série comparável (2+ pesquisas), % por candidato | **SIM** — `variacaoAnterior`, `leaderMovement`/`runnerUpMovement` já calculados |
| `LEAD_CHANGE` | ranking histórico por pesquisa comparável | **PARCIAL** — dá para derivar comparando `topCandidateResult` entre pesquisas consecutivas, mas não há função dedicada que já emita esse evento |
| `GAP_OPENING` / `GAP_CLOSING` | gap atual vs. anterior | **SIM** — `gapBehavior: EXPANDING/NARROWING/STABLE` já existe |
| `SECOND_ROUND_RISK` | resultados `turno=2`, gap 1º turno | **PARCIAL** — `turno` e agrupamento por cenário de 2º turno existem (`executivo/page.tsx`); não há regra determinística "risco de 2º turno" formalizada |
| `DEMOGRAPHIC_GAIN` / `DEMOGRAPHIC_LOSS` | intenção de voto cruzada por segmento demográfico | **NÃO** — crosstab não existe na fonte nem no schema (Seção 5) |
| `INSTITUTE_DIVERGENCE` | resultados do mesmo cenário por instituto distinto | **SIM** — `getInstituteComparisonPoints()` já monta os pontos; falta só a regra de threshold para virar "sinal" |
| `HIGH_VOLATILITY` | range percentual na série | **SIM** — `volatility: ALTA` já calculado |
| `STABLE_LEAD` | ausência de variação relevante + gap largo | **SIM** — combinação de `leaderMovement=STABLE` + `gapBehavior=STABLE`/`EXPANDING` já disponível |
| `LOW_CONFIDENCE_DATA` | `pesquisasComparaveisCount` baixo, `hasSufficientSeries=false` | **SIM** — já exposto e já usado para o sinal `insufficient_data` em `calculateScenarioSignals()` |

---

## 11. N8N — CONTRATO DE ENTRADA (proposta, não implementada)

Baseado nos campos reais de `normalizePesquisaRow()` ([normalizer.ts:71-102](lib/pesquisas/normalizer.ts:71)) e `upsertPollResult()` ([results-repository.ts:13-53](lib/pesquisas/results-repository.ts:13)):

```jsonc
{
  "poll": {
    "tseRegistrationNumber": "string (natural key, obrigatório)",
    "source": "string (default 'TSE/PesqEle')",
    "sourceUrl": "string | null",
    "sourceDataset": "string",
    "electionYear": "number (obrigatório)",
    "uf": "string | null",
    "municipio": "string | null",
    "cargo": "string (multi-valor bruto, ex. 'Governador, Senador')",
    "abrangencia": "string | null (unidade de REGISTRO, não área real da amostra)",
    "instituto": "string | null",
    "contratante": "string | null",
    "pagante": "string | null",
    "valor": "number | null",
    "metodologia": "string | null",
    "dataRegistro": "date | null",
    "campoInicio": "date | null",
    "campoFim": "date | null",
    "amostra": "number | null",
    "margemErro": "number | null",
    "nivelConfianca": "number | null",
    "rawSourceRow": "objeto — linha bruta completa da fonte, sempre preservado"
  },
  "results": [
    {
      "cenario": "string (obrigatório)",
      "turno": "number (obrigatório)",
      "tipoPergunta": "'espontanea' | 'estimulada' (obrigatório)",
      "candidateName": "string (obrigatório)",
      "percentage": "number (obrigatório)",
      "office": "string | null (cargo específico deste resultado — chave de desambiguação multi-cargo)",
      "resultType": "'STIMULATED'|'SPONTANEOUS'|'REJECTION'|'SECOND_ROUND'|'OTHER' | null",
      "sourceName": "string | null",
      "sourceUrl": "string | null",
      "sourceDate": "date | null",
      "provenance": "objeto livre (checklist de conferência)",
      "verified": "boolean (default false — nunca true automaticamente por similaridade)"
    }
  ]
}
```

**Observações que o n8n precisa respeitar:**
- Não existe hoje campo `methodology`/`demographics`/`offices`/`scenarios` como estruturas separadas no contrato real — `office` vive dentro de cada item de `results`, e "metodologia" é um campo de texto único dentro de `poll`, não um objeto.
- `demographics` **não tem contrato real hoje** (Seção 5) — se uma fonte com crosstabs for identificada no futuro, o modelo já desenhado (não implementado) é `electoral_poll_result_segments` (Seção 5), não um array dentro deste payload.
- `poll.rawSourceRow` deve **sempre** ser enviado, mesmo quando todos os campos normalizados já foram preenchidos — é o mecanismo de nunca perder dado de origem.
- Upsert de `poll` é por `tseRegistrationNumber`; upsert de cada `result` é pela 5-upla `(poll_id, cenario, turno, tipoPergunta, candidateName)` — nenhum dos dois é UNIQUE constraint de banco no caso de `results` (checagem em aplicação).

---

## 12. FONTES DE CAPTAÇÃO

| Mecanismo | Classificação | Evidência |
|---|---|---|
| `runPesquisasCollector()` — download+parse+ingest do ZIP oficial TSE (`https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip`) | **PRODUÇÃO** | [collector.ts](lib/pesquisas/collector.ts) — já rodou contra a fonte real e ingeriu 1.640+ pesquisas (hoje 1.695 no banco) |
| Acesso HTTP à fonte TSE | **Funciona** via `fetch()` do runtime Node da aplicação; **historicamente bloqueado (403)** via `curl`/`WebFetch` externos ao domínio `tse.jus.br` | `docs/relatorios/CLAUDE_PESQUISAS_01A_CORE_TSE.md:10` — relevante porque o n8n fará requisição HTTP externa e pode sofrer o mesmo bloqueio dependendo do IP/user-agent |
| `CollectButton.tsx` + `POST /api/pesquisas/collect` | **MANUAL** | Requer clique de admin autenticado; **sem** header de segredo/token de serviço para acionamento externo (diferente de outros coletores territoriais do projeto que já têm esse padrão) |
| `source_collection_runs` (auditoria de execuções) | **PRODUÇÃO** (reaproveitada do CAGED) | 22 execuções reais registradas |
| `upsertPollResult()` / população de `electoral_poll_results` | **LEGADO/MANUAL** | Função existe e é testada, mas **nenhum chamador em produção** (nenhuma rota, botão ou job a invoca) — as 205 linhas reais foram inseridas fora de banda em uma sessão de trabalho anterior, documentada em `docs/relatorios/CLAUDE_PESQUISAS_01B_RESULTADOS.md` |
| Scraper/crawler dedicado a pesquisas | **NÃO EXISTE** | Únicas ocorrências de "scraper" no projeto são do módulo Facebook/Instagram (RapidAPI), não relacionadas |
| Recursos TSE de contratante/pagante (`pesquisa_contratante_2026.zip`, `pesquisa_pagante_2026.zip`) | **NÃO INGERIDOS** (identificados, não implementados) | `normalizer.ts:13-14` |

---

## 13. IDEMPOTÊNCIA

- **Poll natural key:** `electoral_polls.tse_registration_number` — **UNIQUE constraint real no banco**, upsert via `onConflict` no coletor ([collector.ts:235](lib/pesquisas/collector.ts:235)). N8N pode confiar 100% nisso para diferenciar "pesquisa nova" de "pesquisa já importada".
- **Result natural key:** `(poll_id, cenario, turno, tipo_pergunta, candidate_name)` — **não é constraint de banco**, é um `SELECT` antes do `INSERT/UPDATE` em `upsertPollResult()` ([results-repository.ts:17-25](lib/pesquisas/results-repository.ts:17)). Existente = `UPDATE`; inexistente = `INSERT`. N8N precisa replicar essa mesma checagem (ou o workflow precisa chamar um endpoint que já a encapsule — hoje não existe esse endpoint, só a função de aplicação).
- **"Pesquisa existente com novos resultados":** decidido pela combinação das duas chaves acima — mesmo `poll_id` (via `tse_registration_number` já existente) + nova combinação `cenario/turno/tipo_pergunta/candidate_name` não vista antes = `INSERT` de resultado novo sob pesquisa já existente. Isso já é exatamente o comportamento de `upsertPollResult`.
- **Provenance natural key:** não aplicável — proveniência é coluna (`jsonb`), não linha própria; não tem chave natural separada.

---

## 14. PIPELINE ALVO (com base no que já existe)

```
COLETA            → runPesquisasCollector() já busca o ZIP oficial (produção); resultados hoje são
                     inseridos fora deste fluxo (manual)
↓
NORMALIZAÇÃO       → normalizePesquisaRow() já mapeia colunas TSE → schema PolitixOS (produção)
↓
VALIDAÇÃO          → normalizer.ts descarta linha sem tse_registration_number/election_year;
                     parser.ts extrai metadados com nível de confiança (high/medium) quando aplicável
↓
DEDUPLICAÇÃO       → UNIQUE(tse_registration_number) no banco (polls); checagem em aplicação
                     por 5-upla natural key (results)
↓
UPSERT             → upsertPolls() (onConflict) já existe; upsertPollResult() já existe mas sem
                     chamador em produção
↓
PROVENANCE         → raw_source_row (polls) e provenance jsonb (results) já são gravados sempre
↓
ANALYTICS          → cockpitAnalytics.ts + analyticsEngine.ts já calculam tudo da Seção 7 em
                     tempo real, sem persistência de resultado analítico
↓
SINAIS ELEITORAIS  → parcialmente disponíveis como campos de métrica (Seção 10); não há tabela/
                     evento de "sinal" emitido e persistido
↓
COCKPIT            → PesquisasCockpitView.tsx / executivo/page.tsx já consomem o pipeline acima
↓
CRISE / INTEL. POLÍTICA → NÃO INTEGRADO (Seção 9) — pipeline termina no cockpit do próprio módulo
```

---

## 15. BLOQUEADORES REAIS

**P0 — impede automação real:**
- Nenhum. O caminho de POLL (coleta → normalização → upsert → cockpit) já roda em produção com dados reais. O único ponto que impediria "automação real" — falta de endpoint com autenticação de serviço para o n8n acionar a coleta — é considerado **P1** abaixo, não P0, porque hoje já existe um caminho funcional (mesmo que manual) e o n8n pode ser desenhado para chamar a mesma lógica de normalização/upsert diretamente, sem depender da rota HTTP existente.

**P1 — importante para inteligência:**
1. `/api/pesquisas/collect` não tem autenticação por header/token de serviço — só sessão admin de UI. N8N precisará de uma rota (ou chamada direta às funções de `collector.ts`/`normalizer.ts`) com autenticação de automação, no padrão já usado por outros coletores do projeto.
2. `upsertPollResult()` não tem nenhum chamador em produção — não há hoje *nenhum* caminho automatizado (nem manual via UI) para popular `electoral_poll_results`; as 205 linhas existentes foram inseridas fora de banda. Sem uma fonte real de resultado de intenção de voto (o TSE/PesqEle não fornece isso — Seção 12), o n8n não tem o que ingerir aqui além de fontes alternativas ainda não definidas (imprensa, institutos direto).
3. Acesso HTTP à fonte TSE historicamente bloqueado (403) via ferramentas externas de scraping — o workflow n8n precisa validar, na prática, se consegue baixar o ZIP do IP/ambiente onde vai rodar, antes de assumir que funcionará como funcionou dentro do runtime Node da aplicação.
4. Contratante/pagante/margem de erro/nível de confiança estruturados dependem de recursos TSE adicionais (`pesquisa_contratante_2026.zip`, `pesquisa_pagante_2026.zip`) ainda não ingeridos — hoje ficam `null` ou dependem de extração heurística de texto livre.

**BACKLOG:**
- Tabela `electoral_poll_result_segments` para crosstabs demográficos — desenhada, não implementada, sem fonte de dados identificada ainda.
- Formalização de `LEAD_CHANGE`/`SECOND_ROUND_RISK`/`INSTITUTE_DIVERGENCE` como sinais persistidos/emitidos (hoje os dados de entrada existem, mas não há tabela de "sinal" nem regra de threshold codificada).
- Integração do módulo Pesquisas com Visão Geral/Crise/Politix IA global (Seção 9) — puramente futuro, sem qualquer trabalho parcial hoje.
- Extração de "região"/"bairro" de `DS_DADO_MUNICIPIO` — decisão definitiva de não fazer (formato inconsistente entre institutos), não é uma pendência técnica simples.

---

## 16. STATUS FINAL

**STATUS DO MÓDULO:**
Monitor de pesquisas registradas (metodologia/ficha técnica) em produção com dados reais (1.695 pesquisas, 1.640+ ingeridas pelo coletor oficial). Resultados de intenção de voto (205 linhas) existem mas foram inseridos manualmente, fora de qualquer pipeline automatizado — a fonte oficial (TSE/PesqEle) não contém resultado de intenção de voto, apenas registro/metodologia.

**PRONTO PARA COLETA AUTOMÁTICA:**
PARCIAL — o lado "poll" (registro/metodologia) tem coletor de produção funcional e idempotente; o lado "results" (intenção de voto) não tem nenhuma automação, nem manual reproduzível, porque não há fonte oficial confirmada para esse dado.

**SCHEMA PRONTO:**
SIM — `electoral_polls`/`electoral_poll_results` cobrem os campos reais disponíveis na fonte, com natural keys claras e proveniência sempre preservada.

**MULTI-CARGO:**
PRONTO — regra aplicada em `comparability.ts`, `results-repository.ts` e `cockpitAnalytics.ts`; confirmado com dado real (973 de 1.695 pesquisas são multi-cargo).

**COMPARABILIDADE:**
PRONTA — lógica implementada e testada (cargo + UF/abrangência + turno + tipo de pergunta + equivalência de conjunto de candidatos).

**DEMOGRAFIA:**
PARCIAL — perfil da amostra (quem foi entrevistado) é extraível de texto livre com nível de confiança; cruzamento de intenção de voto por segmento demográfico está AUSENTE (não existe na fonte oficial) e a UI já sinaliza isso corretamente, sem mock.

**ANALYTICS:**
PRONTO — motor determinístico completo (gap, variação, volatilidade, consistência entre institutos, ranking, status analítico, sinais de cenário).

**POLITIX IA:**
PRONTA (como template determinístico local) — não é IA generativa e não é o mesmo serviço do "Politix IA" global do sistema (que usa `@anthropic-ai/sdk` mas não recebe dados de Pesquisas).

**INTEGRAÇÃO COM CRISE:**
AUSENTE — módulo totalmente isolado do restante do PolitixOS (Visão Geral, Termômetro de Crise, Estado Político, Risco, Alertas, Briefing, Politix IA global).

**IDEMPOTÊNCIA:**
PRONTA — natural key real de banco para `polls` (UNIQUE constraint); natural key de aplicação bem definida e testada para `results`.

**FONTES DE COLETA EXISTENTES:**
1 fonte oficial em produção (ZIP TSE/PesqEle, via `collector.ts`) + 1 gatilho manual de UI (`CollectButton`) sem token de automação + 1 fluxo manual fora de banda para resultados (sem código reproduzível).

**P0 PARA PRODUÇÃO:**
Nenhum bloqueador real que impeça iniciar a automação do lado "poll" hoje.

**P1:**
Autenticação de serviço para acionamento externo da coleta; ausência total de mecanismo (mesmo manual) para resultados; validação de acesso HTTP à fonte TSE a partir do ambiente do n8n; recursos TSE de contratante/pagante/margem de erro ainda não ingeridos.

**BACKLOG:**
Crosstabs demográficos (tabela desenhada, sem fonte); sinais eleitorais como eventos persistidos; integração com Crise/Politix IA global; extração de região/bairro (decisão definitiva de não fazer).

**PRÓXIMA AÇÃO RECOMENDADA:**
Implementar o workflow n8n para o fluxo **COLETA → NORMALIZAÇÃO → UPSERT** do lado "poll", reaproveitando a lógica real já existente em `normalizer.ts`/`collector.ts` (mesmo mapeamento de colunas, mesma natural key, mesma preservação de `raw_source_row`), com um novo endpoint autenticado por token de serviço em vez do botão manual atual. Em paralelo, decidir explicitamente a fonte para resultados de intenção de voto (Seção 12, pergunta em aberto desde a rodada anterior) antes de tentar automatizar esse lado — não há bloqueador técnico impedindo isso, é uma decisão de fonte de dados pendente.
