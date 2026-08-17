# DATA-COVERAGE-01 — Auditoria Transversal de Cobertura Territorial

**Auditor:** Claude · **Data:** 2026-08-17
**Método:** inventário direto do banco (Supabase, `execute_sql`/`list_tables`), leitura de código-fonte (própria + 2 agentes Explore em paralelo, um para `lib/territorios`/API/migrations, outro para o frontend do Dossiê e caça a mock/placeholder), sem execução de LLM, sem alteração de banco/frontend/n8n.

---

## 1. Resumo executivo

O Politix Territórios tem **um motor de dados verdadeiramente maduro (Economia/CAGED, homologado nos gates ECO-03B1→ECO-03B3B)** e **um segundo pipeline surpreendentemente avançado no lado determinístico (Eleitoral/TSE, com contexto→sinais→interpretação→briefing todo funcionando sem LLM)**. Fora isso, a "matéria-prima" territorial é real mas **fina e desigual**: Demografia tem 1 indicador para os 854 municípios e zero evidência; Segurança tem 14 indicadores reais e robustos mas só para Minas Gerais e zero evidência formal (embora com metadata rica por linha); Saúde cobre apenas contagem de estabelecimentos CNES (nenhum dado epidemiológico) e só foi testada em 2 municípios; Fiscal (SICONFI) e PIB (IBGE) são reais mas restritos a 1 único município cada. **Educação e Infraestrutura/Território não têm nenhum motor de dados — não existe cliente, coletor nem linha no banco além de texto de fixture.**

A resposta à pergunta que motivou este gate é, portanto, **não**: os demais domínios não estão "só faltando plugar o LLM". A maioria ainda precisa de engenharia de dados real (expandir cobertura territorial/temporal, adicionar evidence, rotular indicadores). E, crucialmente — **achado não previsto no roteiro do gate, mas o mais importante desta auditoria**: mesmo onde o backend já tem dado bom (CAGED homologado, TSE homologado, Segurança real), **o frontend do Dossiê Territorial não consome nenhum deles hoje**. Todas as páginas temáticas (Economia, Demografia, Saúde, Segurança) chamam `getTerritoryDossierContext(ibge)`, que só retorna algo não-nulo para `ibge==='3118601'` (Contagem) e, mesmo nesse caso, devolve um **fixture estático de 868 linhas** (`CONTAGEM_DEMO`), não uma consulta ao banco. A página "Economia" — rotulada "Motor Economia / CAGED" — importa `CagedEmploymentSection`, mas alimenta esse componente com o mesmo fixture estático, nunca com `getCagedMunicipalSeries()`. A página Eleitoral é a única com um caminho real (`loadElectoralNotebook`), mas ele só é exercitado quando o fixture-fallback de Contagem já existe primeiro — um efeito colateral arquitetural que hoje o restringe também a um único município.

**Não recomendo "ligar LLM em tudo".** Recomendo integração progressiva: Economia (LLM já homologado no motor, falta só religar a persistência real ao frontend) e Eleitoral (dados + determinístico prontos, falta a camada LLM) primeiro; os demais domínios continuam com Codex em paralelo fechando lacunas de matéria-prima e o frontend real.

---

## 2. Resposta à pergunta principal

> "Os demais dados territoriais já passaram pelo refinamento necessário e falta apenas ligar o LLM, ou ainda existem lacunas na matéria-prima?"

**Ainda existem lacunas reais na matéria-prima**, de dois tipos distintos:

1. **Lacunas de dados** (Codex/engenharia de dados): Demografia (1 indicador, 0 evidence), Saúde (só CNES estrutural, 2 municípios), Segurança (só MG, 0 evidence formal), Fiscal/PIB (1 município cada), Educação e Infraestrutura (inexistentes).
2. **Lacuna de integração** (nem Codex nem LLM — é "fiação" entre backend e produto): o frontend do Dossiê não lê os motores reais nem para os domínios que já estão maduros (CAGED homologado, TSE homologado). Isso não é um problema de dado nem de IA — é um gap de conexão puro, e é hoje o maior risco de percepção do produto, porque a UI parece completa sem estar.

Só depois de fechar essas duas lacunas — **em paralelo, não em série** — faz sentido "ligar o LLM globalmente".

---

## 3. Metodologia

Read-only em toda a auditoria: `git status`/`diff` no início; inventário do schema real via `list_tables(verbose=true)` e `execute_sql` (Supabase, projeto `hhhwuajptkyposarfbzn`); leitura de código própria para os caminhos mais críticos (dossier-helpers, economia page, persistence, contracts.ts, lib/actions/territories.ts); dois agentes Explore em paralelo, em background, cobrindo (a) todo `lib/territorios/**` exceto `caged/`, todas as rotas `app/api/territorios/**` e todas as migrações `.sql` do repositório, e (b) todo o frontend do Dossiê (`app/dashboard/territorios/**`, `components/territorios/**`, `components/dashboard/territorios/**`) com varredura explícita de termos mock/placeholder/fallback/demo/hardcoded. Nenhum arquivo foi alterado; nenhuma query de escrita foi executada.

---

## 4. Inventário de motores (síntese)

| Motor | Arquivos-chave | Fonte real | Rota API | Status |
|---|---|---|---|---|
| IBGE / Demografia | `ibge-client.ts`, `ibge-collector.ts` | `servicodados.ibge.gov.br` (Localidades v1, Agregados/SIDRA v3, tabela 6579) | `app/api/territorios/ibge/collect` | REAL, nacional (854 municípios), 1 indicador |
| Economia — CAGED | `lib/territorios/caged/**` (26 arquivos) | FTP oficial MTE | **nenhuma** | REAL, **HOMOLOGADO** (ECO-03B1→B3B), 3 municípios |
| Economia — PIB | `economia-pib-client.ts/-collector.ts/-normalizer.ts` | IBGE SIDRA 5938 + FTP IBGE (zips fixed-width) | **nenhuma** | REAL, 1 município |
| Economia — SICONFI | `economia-siconfi-client.ts/-collector.ts/-normalizer.ts` | `apidatalake.tesouro.gov.br` (DCA) | **nenhuma** | REAL, 1 município |
| Saúde | `saude-cnes-client.ts/-collector.ts/-normalizer.ts` | `apidadosabertos.saude.gov.br/cnes` | `app/api/territorios/saude/collect` | REAL, só estrutura (CNES), 2 municípios |
| Segurança | `seguranca-mg-client.ts/-collector.ts/-nature-map.ts/-territory-resolver.ts` | `dados.mg.gov.br` (CKAN, SEJUSP-MG) | `app/api/territorios/seguranca/collect` | REAL, só MG, 66 municípios |
| Eleitoral/TSE | `tse-client.ts/-collector.ts/-normalizer.ts/-notebook-repository.ts` + `electoral-*.ts` (12 arquivos, pipeline completo) | `dadosabertos.tse.jus.br` / CDN TSE | `app/api/territorios/tse/collect` | REAL, mais maduro determinísticamente, 2016/2020/2024 |
| Educação | — | — | — | **NÃO_IMPLEMENTADO** |
| Infraestrutura/Território | — (só `territories.geometria`, sempre null) | — | — | **NÃO_IMPLEMENTADO** |
| Intelligence L1-L4 (determinístico + LLM) | `lib/territorios/intelligence/**` (60 arquivos) | — | — | Só **economia**; eleitoral tem pipeline próprio equivalente fora dessa pasta |

---

## 5. Inventário de tabelas

Confirmado via schema real (não suposto): **não existem** `territory_sources`, `territory_profiles`, `territory_intelligence`, `territory_jobs`, `territory_snapshots` — essas tabelas hipotéticas do gate não foram implementadas. O desenho real, consolidado, é:

| Tabela | Linhas | Papel |
|---|---:|---|
| `territories` | 854 | Catálogo (chave natural `codigo_ibge`); `geometria` sempre null; `metadata` só tem hierarquia IBGE + mapeamento TSE |
| `territory_indicators` | 29.290 | Contrato único de indicador (todas as categorias) |
| `territory_evidence` | 808 | Contrato único de evidência/proveniência |
| `territory_collection_runs` | 1.992 | Observabilidade por execução de motor (usada por IBGE/DATASUS/SEJUSP/TSE; CAGED usa uma tabela paralela própria, `source_collection_runs`/`source_collection_leases`, criada num hardening posterior — duplicidade arquitetural documentada, não corrigida aqui) |
| `territory_briefings` | 11 | Briefing gerado — **100% (11/11) em `status='nao_iniciado'`, `model=null`, `content=null`** |

**Achado de segurança fora de escopo, mas relevante o suficiente para reportar** (não corrigido, apenas surfaced): o advisory do Supabase aponta RLS desabilitado em 7 tabelas do banco (`targets`, `tweet_replies`, `investigations` e derivadas) — nenhuma delas é `territory_*`, então não afeta este domínio, mas fica registrado porque expõe dados a qualquer chamador com a chave anon.

---

## 6. Inventário de source_datasets

| SOURCE_DATASET | DOMAIN | ROWS | TERRITORIES | MIN_PERIOD | MAX_PERIOD | EVIDENCE | LINEAGE | STATUS |
|---|---|---:|---:|---|---|---:|---|---|
| `SIDRA_6579` (IBGE) | Demografia | 854 | 854 | 2025-01 | 2025-01 | 0 | NONE | PARCIAL |
| `NOVO_CAGED` (MTE) | Economia | 1.620 | 3 | 2024-01 | 2026-06 | 558 | FULL | **HOMOLOGADO** |
| `IBGE_SIDRA_5938` + `IBGE_PIB_MUNICIPIOS_BASE` | Economia (PIB) | 244 | 1 | 2002 | 2023 | 44 | FULL | PARCIAL (1 município) |
| `SICONFI_DCA` (Tesouro) | Economia (Fiscal) | 42 | 1 | 2020 | 2025 | 6 | FULL | PARCIAL (1 município) |
| `CNES_ESTABELECIMENTOS` (DATASUS) | Saúde | 127 | 2 | snapshot 2026-08 | snapshot 2026-08 | 3 | PARTIAL | PARCIAL |
| `crimes-violentos` (SEJUSP-MG) | Segurança | 10.164 | 66 | 2025-08 | 2026-06 | 0 (tabela) | PARTIAL (metadata inline por linha) | PARCIAL |
| `detalhe_votacao_munzona_*` + `votacao_candidato/partido_munzona_*` (TSE) | Eleitoral | 16.239 | 6–35 (varia por dataset/ano) | 2016 | 2024 | 197 | FULL | PASS (não re-auditado a fundo aqui) |

---

## 7. Matriz mestra

| DOMAIN | SOURCE | COLLECTOR | PERSISTENCE | HISTORY | SERIES | INDICATORS | EVIDENCE | LINEAGE | API | FRONT | LLM READY | GLOBAL STATUS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Economia — CAGED | PASS | PASS | PASS | PASS (30m) | PASS (MoM/YoY/R12) | PASS (1620) | PASS | FULL | MISSING | **MISSING** | READY | **HOMOLOGADO** |
| Economia — PIB/SICONFI | PASS | PASS | PASS | PARTIAL (1 mun.) | PARTIAL | PARTIAL | PASS | FULL | MISSING | MISSING | READY_WITH_LIMITATIONS | PARCIAL |
| Demografia | PASS | PASS | PASS | MISSING (1 período) | MISSING | PARTIAL (1 ind.) | MISSING | NONE | PASS | MISSING | NOT_READY | PARCIAL |
| Saúde | PASS | PASS | PASS | MISSING | MISSING | PARTIAL (34 ind., sem rótulo) | PARTIAL | PARTIAL | PASS | MISSING | NOT_READY | PARCIAL |
| Segurança | PASS | PASS | PASS | PARTIAL (11m) | PARTIAL (não explorado) | PASS (14 ind.) | MISSING (tabela) | PARTIAL | PASS | MISSING | READY_WITH_LIMITATIONS | PARCIAL |
| Eleitoral | PASS | PASS | PASS | PASS (2016/20/24) | N/A (eleitoral, não mensal) | PASS | PASS | FULL | PASS | PARTIAL (só Contagem) | READY_WITH_LIMITATIONS | PASS |
| Educação | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING | NONE | MISSING | MISSING | NOT_READY | **NÃO_IMPLEMENTADO** |
| Infraestrutura/Território | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING | NONE | MISSING | MISSING | NOT_READY | **NÃO_IMPLEMENTADO** |

---

## 8. Economia

Tratada como **BASELINE HOMOLOGADA** conforme instrução do gate — não reauditada em profundidade (ver `CLAUDE_AUDITORIA_ECO03B3A_CAGED_HISTORICO.md`, `CLAUDE_AUDITORIA_ECO03B3A1_EVIDENCE_PROVENANCE_FIX.md`, `CLAUDE_AUDITORIA_ECO03B3B_EXPANSAO_HISTORICA.md`).

**Separado corretamente por fonte, como pedido**:
- **CAGED**: 1.620 indicadores, 30 meses, 3 municípios, revision-aware, 100% metadata/lineage, idempotente. Único ponto fraco *fora* do próprio motor: **nenhuma rota API** e **nenhuma conexão de frontend real** (seção 25).
- **PIB (IBGE SIDRA 5938 + FTP)**: real, com validação de identidade contábil (PIB=VAB+impostos) — mas só 1 município, 2002-2023, nunca auditado com o rigor do CAGED.
- **SICONFI (Tesouro)**: real, 7 indicadores fiscais — só 1 município, 2020-2025.

PIB e SICONFI são "ECONOMIA — OUTRAS FONTES", nunca expandidas para os 3 pilotos do CAGED nem para além disso.

---

## 9. Demografia

Fonte real (IBGE SIDRA 6579, "População residente estimada"), coletor real, cobertura territorial excepcional (**854/854 municípios**, único domínio com escala nacional real). Mas: **1 único indicador** (`populacao_total`), **1 único período** (2025-01), **zero evidência** (`territory_evidence` para esse dataset = 0 linhas), `metadata` do indicador vazia (`{}`) e `source_record_id` é só o próprio código IBGE — sem rastreabilidade real até uma resposta de API específica. Sem histórico, sem pirâmide etária, sem urbanização, sem domicílios, sem sexo/raça — nenhum desses campos do `types.ts` (`DemographyNotebook`) tem dado real por trás; o que aparece no frontend para eles vem do fixture.

**LLM READINESS: NOT_READY** (matéria-prima insuficiente: um número sem série, sem evidência, sem contexto temporal não sustenta uma interpretação responsável).

---

## 10. Saúde

Fonte real (DATASUS "Dados Abertos Saúde", CNES), coletor real com cache TTL de 24h (boa prática de freshness), API route real e testada (`maxDuration=300`). Mas o escopo é **só estrutura** — contagem de estabelecimentos por capacidade/tipo — nunca testado além de 2 municípios, e os 34 indicadores incluem nomes como `estabelecimentos_tipo_unidade_43`, `_69`, `_76` etc.: **códigos numéricos crus do CNES, sem rótulo semântico** (diferente do padrão que o CAGED já resolveu com `indicator-labels.ts`). SIM (mortalidade), SINASC (nascidos vivos), SIH (internações) e qualquer indicador epidemiológico **não existem** — só aparecem como texto "DATASUS Demo" no fixture.

**LLM READINESS: NOT_READY** (falta rótulo semântico dos indicadores e falta série temporal; um LLM tentando narrar "estabelecimentos_tipo_unidade_43 subiu" produziria algo sem sentido para um gestor de campanha sem uma camada de tradução antes).

---

## 11. Educação

**NÃO_IMPLEMENTADO.** Nenhum cliente, coletor, normalizador ou linha em `territory_indicators`/`territory_evidence` para INEP/Censo Escolar/IDEB. Existe apenas o tipo `EducationNotebook` em `types.ts` e texto "INEP (Demo)" no fixture de Contagem. Não inventar indicadores aqui — este domínio precisa de um motor novo do zero (Codex).

---

## 12. Segurança

Fonte real e territorialmente robusta para o que cobre: SEJUSP-MG (portal CKAN oficial de Minas Gerais), **66 municípios, 11 meses, 14 indicadores de criminalidade violenta reais** (homicídio, roubo, extorsão, estupro, sequestro consumado/tentado + índice agregado), com valores variados e plausíveis (não zeros de placeholder). API route real, com `maxDuration=60` calibrado a partir de um lote real medido (indício forte de operação real, não teórica).

**Distinção real vs placeholder**: os valores são **DADO REAL**, não mock. O gap é de proveniência formal: **zero linhas em `territory_evidence`** para os 10.164 indicadores (diferente do CAGED, que tem 558 evidências para 1.620 indicadores). Mitigante real: cada linha de `territory_indicators.metadata` carrega `source_year`, `collected_at`, `source_resource` ("Crimes Violentos 2025") e a `natureza_original` do CSV bruto — então **LINEAGE é PARTIAL, não NONE**: dá para saber de onde veio, mas não há uma tabela de evidência formal nem hash do arquivo bruto como no CAGED. Segurança é **estritamente estadual (MG)** — categoria chamada `seguranca_publica` no schema, mas não é uma fonte nacional.

**LLM READINESS: READY_WITH_LIMITATIONS** — dados reais, plausíveis, com proveniência mínima suficiente; falta série mais longa e evidência formal antes de uma leitura "com confiança total".

---

## 13. Fiscal

Não existe categoria `fiscal` separada no schema — SICONFI é gravado como `categoria='economia'`. Coberto na seção 8.

---

## 14. Eleitoral/Político

**O domínio mais maduro no lado determinístico do produto**, e nunca antes auditado com este nível de detalhe nesta sessão (recomendo um gate dedicado se o produto for depender fortemente dele). Coletor TSE real (`dadosabertos.tse.jus.br`), normalizador real, e — único caso no repositório — uma cadeia **completa e testada** `electoral-intelligence.ts → electoral-interpretation-context.ts → electoral-interpretation.ts → electoral-briefing.ts`, com classes de confiança (`DIRECTLY_SUPPORTED`/`MULTI_SIGNAL_SUPPORTED`/`LIMITED_CONTEXT`), guardas de rastreabilidade (toda afirmação precisa apontar para fato/sinal/evidência) e um "benchmark homologado de seis municípios" documentado como decisão de design, não como placeholder. Tudo isso **sem nenhuma chamada de LLM** — é geração de narrativa 100% determinística/template-based.

Dado eleitoral oficial (votos, participação, resultado) está claramente separado de interpretação política (os arquivos `electoral-interpretation*`/`electoral-briefing*` são explicitamente uma camada por cima, com `assertionClass: 'INTERPRETATION'`).

Cobertura territorial varia por dataset TSE (6 a 35 municípios conforme o ano/tabela) — não é a mesma amostra de 3 pilotos do CAGED. Frontend: única página com um caminho de banco real (`loadElectoralNotebook`), mas hoje só é exercitada quando o fixture-fallback de Contagem existe primeiro (seção 21).

**LLM READINESS: READY_WITH_LIMITATIONS.** A matéria-prima e até a "interpretação" já existem — falta decidir se/como uma camada LLM adicionaria valor sobre o que já é gerado deterministicamente (não é óbvio que precise).

---

## 15. Infraestrutura/Território

**NÃO_IMPLEMENTADO.** `territories.geometria` é `null` em 100% da amostra verificada; `territories.metadata` só tem hierarquia administrativa IBGE e mapeamento TSE, nada de saneamento/habitação/mobilidade/área. Não existe cliente nem coletor. Aparece só como texto narrativo no fixture.

---

## 16. Outros domínios encontrados

Nenhum. Busca ampla (grep + 2 agentes Explore) não encontrou meio ambiente, assistência social, agro, empresas, renda (fora do que já está em CAGED/PIB), desigualdade, conectividade, turismo ou religião em nenhum lugar do código ou do banco além de texto de fixture.

---

## 17. Cobertura temporal

| Fonte | MIN | MAX | Nº períodos | Gaps | Granularidade |
|---|---|---|---|---|---|
| CAGED | 2024-01 | 2026-06 | 30 | 0 | Mensal |
| Demografia | 2025-01 | 2025-01 | 1 | N/A | Snapshot anual (só 1 capturado) |
| PIB | 2002 | 2023 | 22 | não auditado | Anual |
| SICONFI | 2020 | 2025 | 6 | não auditado | Anual |
| CNES | snapshot 2026-08-13/16 | — | 1 efetivo | N/A | Snapshot sob demanda |
| Segurança (SEJUSP) | 2025-08 | 2026-06 | 11 | não auditado nesta rodada | Mensal |
| TSE | 2016 | 2024 | 3 eleições | esperado (eleitoral, não contínuo) | Eleitoral (a cada 2/4 anos) |

---

## 18. Séries temporais

Só CAGED tem MoM/YoY/Rolling-12m implementados e homologados. PIB/SICONFI têm série anual persistida mas sem MoM/YoY calculado em código (não verificado se o frontend faz isso ad-hoc — o fixture provavelmente simula). Demografia/Saúde não têm série (1 ponto cada). Segurança tem 11 meses persistidos, suficiente para uma tendência simples, mas nenhum MoM/YoY foi encontrado implementado. Eleitoral tem comparação entre eleições (2016→2020→2024) via `electoral-analytics.ts`, não meses.

---

## 19. Evidence coverage

| Domínio | Indicator rows | Evidence rows | Evidence coverage |
|---|---:|---:|---|
| CAGED | 1.620 | 558 | Alta (nível de ponto lógico, homologado) |
| PIB | 22 | 22 | 100% |
| SICONFI | 42 | 6 | Baixa (nível de ponto lógico agregado) |
| Demografia | 854 | 0 | **0%** |
| Saúde | 127 | 3 | Baixa |
| Segurança | 10.164 | 0 | **0%** (mitigado por metadata inline por linha) |
| Eleitoral | ~16.239 | 197 | Baixa (nível de ponto lógico agregado) |

---

## 20. Lineage

| Domínio | Classificação |
|---|---|
| CAGED | **FULL** (indicador → evidência → vintage → arquivo raw → URL oficial, homologado) |
| PIB / SICONFI | **FULL** para a amostra existente (evidência presente, raw_reference com URL oficial) |
| Eleitoral | **FULL** para a amostra existente |
| Segurança | **PARTIAL** (metadata rica por linha, sem tabela de evidência formal nem hash de arquivo) |
| Saúde | **PARTIAL** (evidência existe mas cobre só uma fração dos indicadores) |
| Demografia | **NONE** (metadata vazia, sem evidência, `source_record_id` não rastreável) |
| Educação / Infraestrutura | N/A (sem dado) |

---

## 21. Freshness

- **CAGED**: sob demanda, cache local de artefatos raw + checkpoints, sem scheduler automático — atualização é sempre um script manual.
- **Saúde**: TTL de 24h documentado no coletor — única fonte com política de freshness explícita e testada.
- **Segurança**: `collected_at` real por linha (agosto/2026), mas sem TTL/scheduler visível — dataset "Crimes Violentos 2025" sugere ser reexecutado manualmente por ano-calendário.
- **Demografia**: 1 coleta única, 2025-01 — sem indício de atualização programada.
- **TSE**: eleitoral por natureza — atualiza só quando uma nova eleição ocorre (2016/2020/2024 confirmam isso).
- **PIB/SICONFI**: dados históricos oficiais (2002-2025) que mudam raramente — atualização apropriadamente rara/manual.

Nenhuma fonte territorial tem hoje um `scheduler` automático (nem n8n, nem cron) — todas as coletas observadas neste gate foram disparadas manualmente (script ou rota API chamada manualmente/por teste).

---

## 22. On-demand readiness

| Motor | Classificação |
|---|---|
| CAGED | **ON_DEMAND_READY** (homologado: seleciona município → verifica cache/DB → coleta só o necessário) |
| IBGE/Demografia | **ON_DEMAND_READY** (`single`/`uf`/`national`, nacional bloqueado por padrão) |
| Saúde | **ON_DEMAND_READY** (por município, TTL 24h) |
| Segurança | **PARTIAL** (baixa e filtra um CSV estadual inteiro por chamada — mais pesado que "1 município por vez", mas não processa o Brasil todo) |
| TSE | **ON_DEMAND_READY** (single e batch suportados) |
| PIB/SICONFI | **ON_DEMAND_READY** (por `codigoIbge`) |

Nenhum motor processa os 5.570 municípios do Brasil de uma vez — a diretriz "não pré-carregar" está sendo respeitada em todos os domínios com dado real.

---

## 23. API coverage

**4 de 6 fontes com motor real têm rota HTTP de coleta**: `ibge/collect`, `saude/collect`, `seguranca/collect`, `tse/collect` — todas com autenticação por segredo de callback (`x-territorios-*-secret`), testadas (`route.test.ts`). **Economia (CAGED, PIB, SICONFI) não tem nenhuma rota** — os três só são acionáveis via `npx tsx scripts/...`. Não existe nenhuma rota de leitura genérica (`GET /api/territorios/.../indicators`) — o consumo esperado é via Server Component lendo o Supabase diretamente no servidor, não uma API REST própria.

---

## 24. Frontend coverage / 25. Backend vs frontend

**Achado central desta seção**: o Dossiê Territorial tem **um único caminho de dado real** hoje — a query `loadElectoralNotebook` da página `/eleicoes`. Todo o resto passa por `getTerritoryDossierContext(ibge)`, que devolve `CONTAGEM_DEMO` (fixture estático, 868 linhas) se `ibge==='3118601'`, e `null` para qualquer outro dos 853 demais municípios.

| BACKEND DATA (real, no banco) | API EXPOSED | FRONTEND EXPOSED | HIDDEN OPPORTUNITY |
|---|---|---|---|
| CAGED: 1.620 indicadores, 30 meses, 3 municípios, revision-aware | Não | **Não** — página "Economia" usa `CONTAGEM_DEMO.economy`, nunca `getCagedMunicipalSeries()` | **Sim — a maior desta auditoria.** Um motor totalmente homologado, correto, com histórico de 30 meses, está 100% invisível. |
| Demografia: 854 municípios, população real | Sim (collect) | Não (fixture) | Sim — cobertura nacional real, zero visibilidade |
| Segurança: 66 municípios MG, 14 indicadores reais | Sim (collect) | Não (fixture, e o badge trata `demo`=`real` igual) | Sim |
| Saúde: CNES real, 2 municípios | Sim (collect) | Não (fixture) | Sim |
| TSE: 2016/2020/2024, real | Sim (collect) | **Parcial** — único caminho real, mas só dispara quando o fixture de Contagem já existe | Parcial |

---

## 26. Placeholders/mocks

Achado sistêmico, não pontual — reproduzido integralmente do agente frontend (ver relatório completo na transcrição desta sessão; resumo priorizado abaixo). Classificação conforme a política do gate (P1 = pode enganar o usuário; P2 = claramente sinalizado).

**P1 — sem sinalização visível ao usuário:**
1. `app/dashboard/territorios/[ibge]/page.tsx` (Visão Geral — página inicial de todo dossiê): `signals`/`risks`/`opportunities`/`agendaItems` são arrays literais fixos, renderizados para **qualquer** `ibge` digitado na URL, mesmo sem `CONTAGEM_DEMO`.
2. `app/dashboard/territorios/TerritoriosClient.tsx`: a barra de progresso "Coletando fontes / Processando / Concluído" é **inteiramente simulada por `setTimeout`** (600ms/1200ms), sem qualquer vínculo com status real de coleta.
3. `[ibge]/inteligencia-politica/page.tsx`: consome `poc-fixture.ts`, que o próprio código documenta como "prova conceitual... SEM município real" — mas está numa rota de produção, sem selo de demo.
4. `[ibge]/inteligencia-ia/page.tsx`: narrativa de "análise de IA" 100% hardcoded, gate por Contagem mas zero selo visível.
5. `[ibge]/briefing/page.tsx`: `CONTAGEM_DEMO.aiRecommendation` renderizado **sem nenhum gate de `ibge`** — aparece para qualquer município digitado na URL.
6. `[ibge]/inteligencia-externa/page.tsx`: contadores, "temas em movimento" e narrativa de investigação hardcoded; só 3 dos vários itens de feed têm chip "DEMO" visível.
7. `DossierHeader.tsx`/`CoverageBadge`: trata `status==='real'` e `status==='demo'` como **idênticos** (mesmo selo verde "Ativo/Disponível") — o usuário não tem como distinguir dado real de demo olhando o cabeçalho.

**P2 — claramente sinalizado (badge "MVP • DADOS DEMONSTRATIVOS" ou equivalente visível):** `educacao`, `ambiente-politico`, `desenvolvimento-social`, `emprego-renda` (+`/emprego`), `financas-publicas`, `infraestrutura`, `mobilidade`, `radar`, `inteligencia-ia/analise-integrada`. Todas essas páginas **não estão no menu de navegação principal** (`navigation.ts` só lista Demografia/Eleitoral/Segurança/Saúde/Economia/Inteligência Política/Radar/Briefing/Fontes) — são acessíveis só por URL direta, o que reduz (mas não zera) o risco real.

O sandbox (`app/dashboard/territorios/sandbox`) está corretamente isolado e rotulado, e suas fixtures não vazam para produção — **exceto** `poc-fixture.ts`, que vaza para `inteligencia-politica/page.tsx` (achado 3 acima).

---

## 27. KPI matrix (amostra — só o que a matéria-prima já sustenta)

| DOMAIN | KPI | SOURCE | CURRENTLY AVAILABLE? | FRONTEND EXPOSED? | RECOMMENDED? | NOTES |
|---|---|---|---|---|---|---|
| Economia | Saldo de emprego formal (mês, 5 setores) | CAGED | Sim (banco) | Não | **Sim, alta prioridade** | Dado homologado, só falta ligar o frontend |
| Economia | MoM/YoY/Rolling-12m do saldo | CAGED | Sim (calculado) | Não | Sim | Idem |
| Economia | PIB per capita | IBGE PIB | Sim, 1 município | Não | Com ressalva | Expandir cobertura antes de expor amplamente |
| Segurança | Índice de crimes violentos (mês) | SEJUSP-MG | Sim, 66 municípios | Não (fixture) | Sim | MG-only, deixar isso explícito no produto |
| Demografia | População total | IBGE SIDRA | Sim, 854 municípios | Não (fixture) | Com ressalva | Só 1 corte no tempo, sem tendência |
| Eleitoral | Comparecimento/abstenção por eleição | TSE | Sim | Parcial | Sim | Já tem narrativa determinística pronta |
| Saúde | Nº de estabelecimentos por tipo | CNES | Sim, 2 municípios | Não (fixture) | Não ainda | Precisa rotulagem semântica antes |
| Educação | — | — | Não | — | Não | Sem matéria-prima |
| Infraestrutura | — | — | Não | — | Não | Sem matéria-prima |

---

## 28. Chart matrix (amostra)

| DOMAIN | CHART | DATA AVAILABLE | API READY | FRONTEND EXISTS | RECOMMENDED |
|---|---|---|---|---|---|
| Economia (CAGED) | Linha temporal de saldo (30 meses) | Sim | Não | Componente existe (`CagedEmploymentSection`) mas desconectado | Sim — reconectar, não recriar |
| Economia (CAGED) | Barras por setor (5 setores) | Sim | Não | Idem | Sim |
| Segurança | Linha temporal por tipo de crime | Sim (11 meses) | Sim (rota collect, não leitura) | Não | Sim |
| Segurança | Ranking de municípios por índice | Sim (66 municípios) | Não | Não | Sim |
| Demografia | Mapa/ranking de população | Sim (854 municípios) | Não | Componente `PopulationPyramid` existe mas alimentado por fixture | Com ressalva (só 1 corte) |
| Eleitoral | Comparação entre eleições | Sim | Sim | Parcial | Sim |
| Saúde | Distribuição por tipo de estabelecimento | Sim, mas sem rótulo | Não | Não | Não ainda (rotular primeiro) |

---

## 29. Intelligence readiness

Determinístico (L1-L3) só existe para **Economia** (`lib/territorios/intelligence/economy/*`: engine, signals, derived-indicators, consolidation, thresholds — mas historicamente sobre o catálogo PIB/SICONFI de 19 indicadores, não sobre o CAGED recém-homologado; não verificado nesta auditoria se já foi religado ao CAGED). **Eleitoral** tem uma cadeia equivalente e mais completa (chega a L4/L6-ish com "interpretation"/"briefing"), só que **fora** da pasta `intelligence/` e **sem LLM** — é 100% template/regra. Nenhum outro domínio tem qualquer camada determinística.

---

## 30. LLM readiness

| Domínio | Classificação | Por quê |
|---|---|---|
| Economia (CAGED) | **READY** | Dados homologados, evidência/lineage completos, prompt V3 + fallback Gemini/Anthropic já testados em produção (INTEL-03C.2) |
| Eleitoral | READY_WITH_LIMITATIONS | Dados e até "interpretação" prontos, mas sem adaptação ao contrato L4/prompt ainda |
| Segurança | READY_WITH_LIMITATIONS | Dados reais e plausíveis, mas sem evidência formal e cobertura só-MG |
| Demografia | NOT_READY | 1 indicador, 1 período, 0 evidência |
| Saúde | NOT_READY | Indicadores sem rótulo semântico, sem série |
| Educação / Infraestrutura | NOT_READY | Sem matéria-prima |

---

## 31. Prompt readiness

`config.ts`/`prompt-registry.ts`/`anthropic-provider.ts`/`gemini-provider.ts`/`fallback.ts`/`cache.ts`/`validator.ts`/`guards.ts` formam um harness **genérico e já provado provider-agnostic** (troca Anthropic↔Gemini sem tocar no motor de dados, confirmado nos gates INTEL-03B/C). Mas os **prompts em si (V1/V2/V3) são todos sobre indicadores econômicos** — nenhum schema, guard ou seção de prompt existe para demografia/saúde/segurança/eleitoral hoje.

- **PROMPT_READY**: Economia.
- **ADAPTER_NEEDED**: Eleitoral (já tem contrato de sinais/interpretação equivalente — adaptar, não recriar).
- **NOT_IMPLEMENTED**: Demografia, Saúde, Segurança, Educação, Infraestrutura.

---

## 32. Provider agnostic

**Confirmado, arquiteturalmente**: a troca DEFAULT (Gemini 2.5 Flash / Prompt V3) ↔ FALLBACK (Anthropic) já acontece hoje via `config.ts` sem alterar nenhum motor de dados — prova real de que a arquitetura suporta múltiplos providers. Gap: nunca testado fora do domínio Economia.

---

## 33. Configuração futura de LLM

Registrado como backlog decidido, não implementado agora, conforme instrução do gate: tela de configuração (provider/modelo/prompt/versão/parâmetros/fallback) fica para depois da entrega funcional.

---

## 34. Domínios onde falta apenas LLM

**Nenhum**, estritamente. O mais próximo é **Economia (CAGED)**, mas mesmo ali "falta apenas LLM" não é exato — falta também **religar o frontend ao dado real** (seção 24), que é um gap de integração, não de IA. Eleitoral está perto (ADAPTER_NEEDED), mas tecnicamente já tem uma "narrativa" determinística funcionando sem LLM.

---

## 35. Domínios que precisam de Data Engineering (Codex)

- **Demografia**: expandir para série histórica + indicadores demográficos adicionais (idade, sexo, urbanização, domicílios) + evidência.
- **Saúde**: rotular semanticamente os `estabelecimentos_tipo_unidade_NN`, expandir cobertura territorial, avaliar SIM/SINASC/SIH.
- **Segurança**: formalizar evidência em `territory_evidence` (hoje só metadata inline), avaliar expansão além de MG se o produto precisar.
- **Economia — PIB/SICONFI**: expandir dos atuais 1 município para os pilotos (ou mais), com o mesmo rigor do ECO-03B3B.
- **Educação**: motor novo do zero (INEP).
- **Infraestrutura/Território**: motor novo do zero (saneamento/mobilidade/habitação) + preencher `territories.geometria`.

---

## 36. Itens liberados para Antigravity

Com contrato de dados já confirmado e pronto para consumo real (sem inventar contrato novo):
- Reconectar a página **Economia** ao CAGED real (`getCagedMunicipalSeries`) em vez de `CONTAGEM_DEMO` — o componente `CagedEmploymentSection` já existe e já tem o formato certo, só precisa do dado real entrando.
- Gráfico de série temporal de saldo/setores CAGED (30 meses, 3 municípios).
- Reconectar **Segurança** aos dados reais SEJUSP-MG (66 municípios, 14 indicadores).
- Reconectar **Demografia** aos 854 municípios reais (mesmo que só com o único indicador disponível hoje).
- Corrigir `CoverageBadge` para distinguir visualmente `real` de `demo`.
- Adicionar selo de "dado demonstrativo" nas páginas P1 listadas na seção 26 (mínimo: Visão Geral, Briefing, Inteligência Política, Inteligência IA, Inteligência Externa) até que sejam reconectadas.

**Não liberado ainda** (sem contrato de dados suficiente): Educação, Infraestrutura, qualquer gráfico de série temporal de Saúde (sem rótulo semântico) ou de PIB/SICONFI (sem expansão de cobertura).

---

## 37. Gaps (backlog técnico)

| GAP | DOMAIN | SEVERITY | OWNER | DEPENDENCY | NEXT GATE |
|---|---|---|---|---|---|
| Frontend não consome CAGED real | Economia | **P1** | Antigravity | Nenhuma — dado já pronto | FRONT-CAGED-01 |
| Página "Visão Geral" e "Briefing" mostram narrativa fixa sem gate/selo | Cross-domain | **P1** | Antigravity | Nenhuma | FRONT-DISCLOSURE-01 |
| Progresso de coleta simulado por `setTimeout` | Cross-domain | **P1** | Antigravity | Depende de sinal real de status (pode vir de `territory_collection_runs`) | FRONT-PROGRESS-01 |
| `poc-fixture.ts` vazando para rota de produção | Inteligência Política | P1 | Antigravity | Nenhuma | FRONT-DISCLOSURE-01 |
| `CoverageBadge` não distingue real de demo | Cross-domain | P2 | Antigravity | Nenhuma | FRONT-DISCLOSURE-01 |
| Segurança sem evidência formal | Segurança | P2 | Codex | Nenhuma | SEG-EVIDENCE-01 |
| Demografia com 1 indicador/1 período | Demografia | P2 | Codex | Nenhuma | DEMO-EXPAND-01 |
| Saúde sem rótulo semântico de indicador | Saúde | P2 | Codex | Nenhuma | SAUDE-LABELS-01 |
| Economia PIB/SICONFI restritos a 1 município | Economia | P2 | Codex | Nenhuma | ECO-PIB-SICONFI-EXPAND-01 |
| Sem rota API para CAGED/PIB/SICONFI | Economia | P2 | Codex | Nenhuma | ECO-API-01 |
| Educação inexistente | Educação | P3 | Codex | Nenhuma | EDU-01 |
| Infraestrutura inexistente | Infraestrutura | P3 | Codex | Nenhuma | INFRA-01 |
| Duplicidade `territory_collection_runs` vs `source_collection_runs` | Cross-domain | P3 | Codex | Nenhuma | — |

---

## 38. Decisão final

**1. A matéria-prima territorial está completa?** Não. É real onde existe, mas fina/desigual entre domínios, e desconectada do frontend mesmo onde é excelente (CAGED).

**2. Quais domínios estão realmente completos?** Só **Economia/CAGED** no sentido de auditoria formal ("HOMOLOGADO"). Eleitoral está funcionalmente mais completo em alguns aspectos (interpretação determinística já funciona) mas nunca passou por um gate de auditoria equivalente.

**3. Quais têm dados bons mas não homologados?** Segurança (14 indicadores reais, plausíveis, MG) e Eleitoral (TSE + pipeline determinístico completo).

**4. Quais ainda têm gaps?** Demografia (thin), Saúde (thin, sem rótulo), Economia PIB/SICONFI (1 município), Educação e Infraestrutura (inexistentes).

**5. Onde falta SOMENTE LLM?** Estritamente, nenhum — mesmo Economia precisa primeiro da reconexão de frontend.

**6. Onde ainda precisamos de Codex?** Demografia, Saúde, Segurança (evidência), Economia PIB/SICONFI, Educação, Infraestrutura — ver seção 35.

**7. Quais KPIs já podem aparecer no produto?** Ver seção 27 — CAGED e Segurança têm o dado pronto hoje.

**8. Quais gráficos evolutivos já podem aparecer?** Série de 30 meses do CAGED; série de 11 meses de Segurança; comparação eleitoral 2016-2024.

**9. Existem dados bons no backend invisíveis no frontend?** Sim — é o achado central desta auditoria (seção 24-25): CAGED homologado, Segurança real e Demografia nacional, todos invisíveis hoje.

**10. Existe placeholder que pode enganar o usuário?** Sim — 7 achados P1 concretos na seção 26, com destaque para a página inicial de todo dossiê (Visão Geral) e a barra de progresso de coleta simulada.

**11. Podemos liberar Antigravity para nova rodada de KPIs/gráficos?** Sim, com escopo explícito (seção 36) — priorizando reconectar o que já existe antes de construir telas novas.

**12. Iniciar LLM globalmente ou progressivamente?** **Progressivamente.** Economia primeiro (dado + LLM já prontos, só falta a reconexão de frontend), Eleitoral em seguida (adaptar o L4 ao pipeline determinístico já existente), os demais depois que Codex fechar as lacunas de dados.

**13. Sequência que maximiza velocidade sem sacrificar confiabilidade:** (a) Antigravity reconecta CAGED real ao frontend + corrige disclosure de demo/real — paralelo a (b) Codex fecha evidência de Segurança e expande Demografia/Saúde/PIB-SICONFI — paralelo a (c) Claude adapta o contrato L4 para Eleitoral. Só depois: LLM em produção para Economia, seguido de Eleitoral, seguido dos demais conforme Codex for entregando.

---

## GATE FINAL

```text
DATA-COVERAGE-01: PASS WITH GAPS

DOMAINS DISCOVERED: 8 (Economia[CAGED+PIB+SICONFI], Demografia, Saúde, Segurança, Eleitoral, Educação, Infraestrutura)

HOMOLOGATED: 1 (Economia/CAGED)
PASS: 1 (Eleitoral)
PARTIAL: 4 (Economia-PIB/SICONFI, Demografia, Saúde, Segurança)
MISSING: 0
NOT IMPLEMENTED: 2 (Educação, Infraestrutura)

ECONOMY: HOMOLOGATED (CAGED) / PARTIAL (PIB, SICONFI)
DEMOGRAPHICS: PARTIAL
HEALTH: PARTIAL
EDUCATION: NOT_IMPLEMENTED
SECURITY: PARTIAL
FISCAL: PARTIAL (subsumido em Economia/SICONFI no schema real)
ELECTORAL: PASS
INFRASTRUCTURE: NOT_IMPLEMENTED

DATASETS: 7 source_datasets ativos com dado real
INDICATORS: 29.290 (territory_indicators, todas as categorias)
EVIDENCE COVERAGE: desigual — 0% (Demografia), 0% tabela/PARTIAL metadata (Segurança), alta (CAGED/PIB/Eleitoral)

LINEAGE FULL: 3 domínios (CAGED, PIB/SICONFI, Eleitoral)
LINEAGE PARTIAL: 2 domínios (Segurança, Saúde)
LINEAGE NONE: 1 domínio (Demografia)

ON-DEMAND READY: 5 de 6 motores reais (Segurança é PARTIAL)

LLM READY: 1 (Economia/CAGED)
LLM READY WITH LIMITATIONS: 2 (Eleitoral, Segurança)
LLM NOT READY: 3 (Demografia, Saúde) + 2 domínios sem dado (Educação, Infraestrutura)

FRONTEND DATA UTILIZATION: ~5% (1 caminho real de N domínios com dado real — Eleitoral parcialmente; todo o resto usa fixture estático)

STRATEGIC KPIS DISCOVERED: 8 (amostra, seção 27)
STRATEGIC KPIS CURRENTLY EXPOSED: 0 dos 8 amostrados (todos via fixture, nenhum via dado real)

RECOMMENDED NEW CHARTS: 7 (amostra, seção 28)

PLACEHOLDER/MOCK RISKS: 7 P1 + 9 P2 (seção 26)

P0: 0
P1: 4 (frontend não consome CAGED; Visão Geral/Briefing sem gate/selo; progresso de coleta simulado; poc-fixture.ts em rota de produção)
P2: 8 (ver seção 37)
P3: 3 (ver seção 37)

DOMAINS ONLY MISSING LLM: []
DOMAINS NEEDING DATA ENGINEERING: [Demografia, Saúde, Segurança(evidência), Economia-PIB, Economia-SICONFI, Educação, Infraestrutura]
DOMAINS READY FOR ANTIGRAVITY: [Economia/CAGED (reconexão), Segurança (reconexão), Demografia (reconexão), correção de disclosure real/demo cross-domain]

READY TO CONNECT LLM GLOBALLY: NO
READY TO EXPAND FRONTEND: PARTIALLY (reconectar o que já existe, não construir novo ainda)
```

---

## Encerramento

**PARE.** Nenhuma correção foi implementada. Nenhum novo gate foi iniciado. Nenhuma alteração de banco, frontend, Prompt V3, provider LLM ou n8n foi feita — apenas leitura, queries read-only e dois agentes de exploração em modo read-only. Aguardando revisão deste relatório para a divisão definitiva entre Codex, Claude e Antigravity.
