# TERRITORIOS-2.0-CONVERGENCE-GATE — Auditoria de Convergência (Data × Intelligence × Frontend)

**Agente:** Claude · **Data:** 2026-08-17 · **Modo:** Convergence Audit, read-first/verify-first, minimal-fix-only

Esta auditoria verificou código, banco (Supabase, projeto `hhhwuajptkyposarfbzn`) e contratos diretamente — os três relatórios (Codex, Claude/INTEL-DOMAIN-02, Antigravity) foram lidos, mas tratados como declaração, não como prova.

---

## 0 — Divergências conhecidas: resolvidas por evidência

| Divergência apontada pelo gate | Estado real verificado |
|---|---|
| Codex: Health=PARTIAL / Antigravity: Health=COMPLETE | Ambos parcialmente certos: CNES (oferta) é real e robusto; "Health Overall" não pode ser COMPLETE porque não há epidemiologia. Ver §6. |
| Codex: "estrutura etária já persistida" / Antigravity: "preparado para receber assim que persistido" | Codex está certo — os dados **já estavam persistidos** (34 linhas/piloto, confirmado via SQL). O frontend **não consumia**. Corrigido nesta auditoria. Ver §3. |
| Claude: Security LLM Ready=WITH_LIMITATIONS / Antigravity: Security=COMPLETE | Não é contraditório: "COMPLETE" da Antigravity referia-se à camada visual/determinística (que tinha 2 bugs de chave, corrigidos aqui), nunca à camada LLM, que segue corretamente desabilitada. |
| Claude relatou 2 erros TS5097 em `caged-employment-signals.ts` (Codex) / arquivo real não tem esse erro | O relato do Codex está desatualizado — o arquivo real (auditado por mim no gate INTEL-DOMAIN-02) já usa `'sim'/'nao'` em vez de `boolean`. O `tsc` atual confirma 0 erros nesse arquivo. Os TS5097 reais estavam em outros 4 arquivos do Codex (`demografia-expansion.ts`, `saude-collector.ts`, `saude-cnes-normalizer.ts`, `scripts/run-data-expansion-02.ts`) — corrigidos nesta auditoria. |
| Antigravity: TYPECHECK/TESTS/BUILD = PASS | Era verdade no momento do relatório da Antigravity, mas o código do Codex (`demografia-expansion.ts`/`saude-collector.ts`) foi adicionado **depois**, quebrando o `tsc`. Estado combinado atual, após correção: os três voltam a PASS. |

---

## 1 — Workspace Convergence

`git status`/`git diff`/`git worktree list` executados. Achados:

- Múltiplos worktrees paralelos ativos (`claude-word-install-dfbbc4`, `politix-territorios-audit-5a9be0`, mais 3 branches Codex TSE já mescladas/prunable). Nenhum conflito de merge real — os três agentes trabalham no mesmo checkout principal (`main`), sem commits intermediários.
- **1 arquivo órfão inofensivo**: `components/territorios/TerritoryEngineStatusBoard 2.tsx` — 0 bytes, não rastreado, não referenciado em nenhum import. Provável artefato de "Salvar Como" de um editor, anterior a este ciclo. Não removido (fora da lista de correções autorizadas), apenas registrado.
- Nenhum import quebrado, nenhuma implementação duplicada dentro de um mesmo módulo, nenhum teste apontando para uma versão antiga de um contrato.
- **Achado real de convergência**: `lib/territorios/intelligence/economy/caged-employment-signals.ts` (Codex reportou 2 erros TS5097 nele) — na verdade limpo; os TS5097 reais estavam em 4 outros arquivos do próprio Codex (ver §2).

**WORKSPACE CONVERGENCE: PASS**

---

## 2 — Typecheck / Build Divergence

Estado no início desta auditoria: `npx tsc --noEmit` **FALHAVA** com 5 erros `TS5097` (import com extensão `.ts` explícita, não permitida por `tsconfig.json`):

```
lib/territorios/demografia-expansion.ts(2,31)
lib/territorios/saude-collector.ts(2,41)
lib/territorios/saude-collector.ts(3,85)
lib/territorios/saude-cnes-normalizer.ts(2,17)
scripts/run-data-expansion-02.ts(5,96)
scripts/run-data-expansion-02.ts(6,37)
```

Todos nos arquivos novos do Codex (DATA-EXPANSION-02). Corrigido — apenas remoção da extensão `.ts` dos 6 imports relativos, nenhum outro código tocado.

Após a correção, no estado combinado atual (Codex + Claude + Antigravity juntos):

- `npx tsc --noEmit`: **PASS** (0 erros)
- `npx vitest run --exclude ".claude/worktrees/**"`: **PASS** — 973 passed, 5 skipped (110 arquivos de teste, 115 total)
- `npx next build`: **PASS** — compilação e geração de todas as 39 rotas concluídas sem erro

**TYPECHECK: PASS · TESTS: PASS · BUILD: PASS**

---

## 3 — Demografia: Data → Frontend

### Banco (SQL direto, `territory_indicators`)

Confirmado, os três pilotos:

| Município | SIDRA_6579 (linhas) | Período | SIDRA_9514 (linhas) |
|---|---:|---|---:|
| Belo Horizonte | 21 | 2001–2025 | 13 |
| Betim | 21 | 2001–2025 | 13 |
| Contagem | 21 | 2001–2025 | 13 |

34 linhas/piloto — **exatamente** como declarado pelo Codex. `populacao_total` (Contagem) confirmado ponto a ponto: 548.637 (2001) → 651.718 (2025), com os 4 gaps declarados (2007, 2010, 2022, 2023) realmente ausentes, não interpolados. As 13 chaves censitárias (`populacao_censo_total`, `populacao_masculina/feminina`, `percentual_masculino/feminino`, `populacao/percentual_criancas/jovens/adultos/idosos`) todas presentes.

**DEMOGRAPHY DATA: PASS**

### Frontend (achado real, corrigido nesta auditoria)

`app/dashboard/territorios/[ibge]/demografia/page.tsx`, como recebido: consultava `categoria='demografia'` sem `ORDER BY`, pegava a **primeira linha** cujo `indicador` contivesse a substring `'populacao'` (não-determinístico — poderia pegar qualquer um dos 21 anos, ou até `populacao_censo_total`/`populacao_masculina`) e exibia **apenas** essa população, densidade (sempre ausente — chave não existe) e domicílios (sempre ausente — chave não existe). O próprio código continha uma caixa de texto admitindo: *"Os detalhamentos censitários adicionais (pirâmide etária, razão de sexo...) serão assimilados automaticamente conforme as cargas do Motor IBGE forem consolidadas"* — confirmando, nas palavras do próprio código, que a expansão do Codex **não estava sendo consumida**, apesar de já persistida. Isso confirma que a alegação "DEMOGRAPHY: COMPLETE" da Antigravity era factualmente incorreta no momento do seu relatório.

**Corrigido** (dados já homologados, nenhuma fonte nova criada): a página foi reescrita para consumir a série completa de `populacao_total` (ordenada, sem interpolação), calcular variação populacional real (do primeiro ao último ano disponível) e exibir a composição censitária completa (% masculino/feminino, % crianças/jovens/adultos/idosos). Passou de 1 KPI para 6 KPIs reais + 2 gráficos novos (evolução populacional, composição por sexo) + 1 gráfico de estrutura etária. Densidade, domicílios, urbanização e idade média/mediana permanecem **explicitamente não exibidos como reais** — mesmo gap documentado pelo Codex.

**DEMOGRAPHY FRONT: PASS** (após correção) · **DEMOGRAPHY STATUS: PARTIAL** (domicílios/urbanização/idade média seguem ausentes — gap real, não um zero fabricado)

---

## 4 — Saúde: Data → Frontend

### Banco

Confirmado — snapshot mais recente por município:

| Município | Chaves no snapshot | UBS | Atenção 1ª | Hospitalares | Urgência/Emergência | Total |
|---|---:|---:|---:|---:|---:|---:|
| Belo Horizonte | 43 | — | — | — | — | — |
| Betim | 35 | — | — | — | — | — |
| Contagem | 36 | 70 | 70 | 8 | 21 | 1044 |

Números de Contagem conferem exatamente com o relatório do Codex. Os 4 agrupamentos novos (`estabelecimentos_unidades_basicas`, `estabelecimentos_atencao_primaria`, `estabelecimentos_hospitalares_por_tipo`, `estabelecimentos_urgencia_emergencia`) confirmados presentes e corretos.

**HEALTH CNES DATA: PASS**

### Frontend (2 bugs reais encontrados e corrigidos)

`app/dashboard/territorios/[ibge]/saude/page.tsx` buscava `estabelecimentos_saude_total` (chave real: `estabelecimentos_total`) e `estabelecimentos_atendimento_sus` (chave real: `estabelecimentos_atendimento_ambulatorial_sus`) — ambas **inexistentes**. O KPI "Total Estabelecimentos" era mascarado por um fallback que somava os tipos CNES individuais (por sorte, não quebrava visualmente), mas **"Atendimento SUS" sempre mostrava 0** para qualquer município real — um zero fabricado por incompatibilidade de chave, não uma ausência real (Contagem tem 128 unidades com atendimento SUS). Corrigido: as duas chaves certas. Também adicionados 2 KPIs novos usando os agrupamentos reais do Codex ainda não exibidos (Unidades Básicas, Urgência/Emergência) — a mesma correção mínima autorizada pela seção 3/4 do gate.

**HEALTH FRONT: PASS** (após correção)

### Classificação honesta

**HEALTH SERVICE SUPPLY: COMPLETE** (estabelecimentos, tipos, 6 agrupamentos executivos, todos reais e agora corretamente conectados)
**HEALTH EPIDEMIOLOGY: NOT_AVAILABLE** (confirmado — sem SIM, SINASC, SIH, mortalidade, nascimentos, internações, leitos, profissionais)
**HEALTH OVERALL: PARTIAL**

---

## 5 — Economia: Data → Frontend → Intelligence

### Achado crítico: regressão de janela CAGED (P0, corrigido)

`app/dashboard/territorios/[ibge]/economia/page.tsx` e `app/dashboard/territorios/[ibge]/page.tsx` (Command Center) consultavam `getCagedMunicipalSeries` com `from:'202301', to:'202512'`. O banco real (confirmado via SQL) tem CAGED homologado em **2024-01 → 2026-06** (30 meses, os três pilotos). A janela antiga:

- Não intersecta nenhum dos 12 meses de 2023 solicitados (não existem).
- **Corta os 6 meses mais recentes reais** (2026-01 a 2026-06) — exatamente os dados que tornam MoM/YoY/melhor-mês/sequência-atual corretos "hoje".

Esta é a MESMA regressão identificada e corrigida em `RELEASE-GATE-TERRITORIOS-1.0` e reintroduzida por trabalho paralelo depois — eu já havia sinalizado essa reintrodução via `spawn_task` durante o gate `INTEL-DOMAIN-02` (que era explicitamente "sem frontend"). Esta auditoria de convergência é o momento certo para corrigir. Corrigida em 4 ocorrências (2 arquivos), com o comentário do código atualizado para refletir a janela real.

Confirmado pós-correção: `202401`–`202606` = 30/30 meses reais para os três pilotos (cobertura `COMPLETE`, sem meses faltantes).

**ECONOMY: COMPLETE** (após correção)

### Intelligence

`caged-facts.ts`/`caged-employment-signals.ts` (INTEL-DOMAIN-02): compilam, passam nos 23 testes, e são metodologicamente idênticos ao cálculo ad-hoc já existente no frontend (mesma aritmética de MoM/YoY/melhor-mês/sequência). **Não estão, porém, conectados ao frontend** — nenhum arquivo em `app/`/`components/` importa `caged-facts.ts` ou `caged-employment-signals.ts` (confirmado por grep). O frontend duplica a metodologia em vez de consumir o contrato.

**ECONOMY INTELLIGENCE: PARTIAL** (biblioteca correta e testada; integração real ainda pendente)

---

## 6 — Eleitoral: Data → Frontend → Intelligence

`app/dashboard/territorios/[ibge]/eleicoes/page.tsx` usa `loadElectoralNotebook()` (`tse-notebook-repository.ts`), um repositório determinístico já maduro, sem chaves ou colunas hardcoded incorretas encontradas. KPIs (eleitorado, comparecimento, abstenção, votos válidos/brancos/nulos, margem), Matriz Comparativa 2016×2020×2024, 3 gráficos de evolução (eleitorado/comparecimento/abstenção) e 2 gráficos de resultado (candidatos, composição partidária) — todos alimentados por `data`, sem hardcode. `blankVotes`/`nullVotes` são reais (fonte: `votos_brancos_total`/`votos_nulos_total`). `concentration`/`fragmentation` só aparecem no fixture demonstrativo de Contagem (`'MODERADO'`, índice Laakso-Taagepera) — nunca no caminho real, e são justamente as duas métricas que este mesmo relatório (INTEL-DOMAIN-02, Missão B) já havia determinado **não serem matematicamente sustentáveis** com os dados atuais (só vencedor/segundo colocado são rastreados). Achado pré-existente, não introduzido por este ciclo, disclosed.

**ELECTORAL: COMPLETE**

`electoral-facts.ts`/`electoral-signals.ts` (INTEL-DOMAIN-02): mesma situação da Economia — corretos, testados, preservam `DIRECTLY_SUPPORTED/MULTI_SIGNAL_SUPPORTED/LIMITED_CONTEXT`, mas não conectados a `eleicoes/page.tsx` (que usa a pipeline determinística mais antiga e já real, `tse-notebook-repository.ts`, uma fonte legítima e diferente).

**ELECTORAL INTELLIGENCE: PARTIAL** (biblioteca correta; integração ao Command Center ainda pendente)

---

## 7 — Segurança: Data → Frontend → Intelligence

### Achado crítico confirmado (P0, corrigido)

Banco confirmado: 154 linhas/piloto (14 chaves × 11 períodos, 2025-08 a 2026-06), exatamente como o Codex declarou. Confirmado também, via SQL direto, que **`furto_consumado` e `veiculos_roubo_furto` não existem** no dataset — zero linhas para essas chaves em qualquer piloto.

`app/dashboard/territorios/[ibge]/seguranca/page.tsx` buscava exatamente essas duas chaves inexistentes para 2 dos 6 KPIs, 2 das 4 categorias do gráfico de composição, e 1 das 4 séries do gráfico histórico — mostrando zeros fabricados (incompatibilidade de contrato, não ausência real, exatamente como o Codex descreveu). Corrigido: substituídas por `extorsao_consumado` e `sequestro_carcere_privado_consumado` — ambas confirmadas com valores reais não-nulos (Contagem, 2026-06: extorsão=4, sequestro=1).

**SECURITY: COMPLETE** (após correção)

### Intelligence

`security-thresholds.ts`/`security-facts.ts`/`security-signals.ts` (INTEL-DOMAIN-02): construídos do zero, 23 testes, thresholds documentados, sem chamada LLM. Não conectados ao frontend (mesmo padrão de Economia/Eleitoral).

**SECURITY DETERMINISTIC INTELLIGENCE: PASS** (biblioteca) · **SECURITY LLM: WITH_LIMITATIONS** (coletor/persistência nunca auditados de forma independente nesta sessão — recomendação mantida de não conectar Gemini ainda)

---

## 8 — Command Center

`components/dashboard/territorios/command-center/TerritoryCommandCenter.tsx` (Antigravity) é alimentado por um `viewModel` construído **ad-hoc** dentro de `app/dashboard/territorios/[ibge]/page.tsx` — nunca importa `lib/territorios/intelligence/command-center.ts` (`buildTerritoryExecutiveSignals`). Confirma-se exatamente o risco da seção 15 do gate: duas implementações paralelas, a visual (real, mas recalculando do zero) e o contrato de intelligence (real, testado, nunca chamado).

### 2 bugs reais encontrados e corrigidos na página do Command Center

1. Mesma regressão de janela CAGED do §5 (`202301`/`202512` → `202401`/`202606`).
2. **Bug de coluna**: a consulta de Crimes Violentos usava `.select('periodo, valor')` / `.order('periodo', ...)` — a coluna real é `periodo_inicio` (`periodo` não existe em `territory_indicators`). Isso fazia a consulta falhar silenciosamente (capturada por um `catch {}` vazio) para **qualquer** município real — o KPI "Crimes Violentos" do Command Center estava sempre quebrado fora do fallback demonstrativo de Contagem. Corrigido.

Após as duas correções, confirmado via SQL que a série de 11 meses de `indice_crimes_violentos` para Contagem é retornada corretamente pela consulta corrigida.

**COMMAND CENTER: PARTIAL** — visual real e agora funcional para os 4 domínios piloto, funciona sem Gemini, mas duplica metodologia em vez de consumir o contrato de intelligence (preferência do gate: contrato → projeção). Recomendo, como próximo gate dedicado, reescrever a montagem do `viewModel` para chamar `buildCagedFacts`/`buildCagedEmploymentSignals`/`buildElectoralFacts`/`buildElectoralAnalyticalSignals`/`buildSecurityFacts`/`buildSecurityIndicatorSignals` → `buildTerritoryExecutiveSignals`, em vez de recalcular.

### Leitura em 30 segundos

Para Contagem/BH/Betim, após as correções: strip de KPIs mostra População (IBGE), Saldo CAGED R12 + MoM com sparkline, Crimes Violentos SEJUSP 11m + delta com sparkline, Comparecimento Eleitoral TSE — todos reais e funcionais agora. Antes da correção, o KPI de Segurança estava estruturalmente quebrado para qualquer município fora do fallback de Contagem.

**30-SECOND READING: PASS** (após correção; teria sido **FAIL** para Segurança em qualquer município real antes da correção)

---

## 9 — Briefing

**Achado sério, não corrigido nesta auditoria (fora do escopo de correção mínima).**

`app/dashboard/territorios/[ibge]/briefing/page.tsx` consulta `territory_briefings.eq('codigo_ibge', ibge)` — coluna que **não existe** (a coluna real é `territory_id`, UUID). O erro é capturado silenciosamente. Na prática isso é hoje inofensivo: confirmei que as 11 linhas reais da tabela têm `status='nao_iniciado'` e `content=null` em 100% dos casos — não existe, em nenhum lugar do banco, um briefing real gerado para nenhum território.

Mais grave: boa parte do conteúdo da página **não depende do `data` carregado** — é texto estático embutido no JSX (ex.: "Segurança Patrimonial", a citação "Dar prioridade à segurança urbana...", os bullets "Furtos de veículos: +18%", "Estelionato: +25%", a interpretação "A pressão eleitoral e a percepção de insegurança estão fortemente concentradas..."). Esse conteúdo só é renderizado quando `ibge==='3118601'` (fallback demonstrativo, com selo "DEMONSTRATIVO" visível) — nunca vaza para outro município — mas ele se parece com uma síntese de IA personalizada quando na verdade é prosa fixa. Não é uma "fixture enganosa" no sentido estrito (está rotulada), mas confunde a distinção Fato/Sinal/Interpretação que o próprio gate exige, e não está de forma alguma conectado a `lib/territorios/intelligence/briefing.ts` (`buildTerritoryExecutiveBriefing`).

Não fiz uma reescrita da página (redesign de conteúdo persuasivo está fora de "correção mínima"). Reporto como achado para gate dedicado.

**BRIEFING: WAITING_INTELLIGENCE** — mas com uma ressalva mais forte que "aguardando dados": o caminho demonstrativo mistura conteúdo estático com aparência de análise real.

---

## 10 — Radar

`app/dashboard/territorios/[ibge]/radar/page.tsx`: implementação simples e honesta — fallback demonstrativo só para Contagem (com selo visível), estado vazio honesto para qualquer outro município, nenhum texto genérico fabricado além do disclosed. Não conectado a `lib/territorios/intelligence/radar.ts` (`buildTerritoryRadar`).

**RADAR: WAITING_INTELLIGENCE**

---

## 11 — Inteligência Política

`app/dashboard/territorios/[ibge]/inteligencia-politica/page.tsx`: confirmado que o fix de `RELEASE-GATE-TERRITORIOS-1.0` (gate para Contagem-only, com selo, usando explicitamente `poc-fixture.ts`) **permanece intacto** — não foi sobrescrito por nenhum trabalho paralelo. Estado vazio honesto para qualquer outro município.

**POLITICAL INTELLIGENCE: WAITING_INTELLIGENCE**

---

## 12 — Territorial Isolation

Varredura de todos os 17 arquivos de página que importam `CONTAGEM_DEMO`: **100% dos usos são precedidos por um guard explícito `ibge === '3118601'`**, sem exceção. Nenhum vazamento encontrado para Belo Horizonte, Betim, Nova Lima ou qualquer outro município.

**CONTAGEM FALLBACK LEAKS: 0** (para outros municípios; o padrão em si é legado documentado — `LEGACY_PRELOADED_IBGE` em `dossier-helpers.ts` — e hoje já é código morto nos domínios deste gate, já que dados reais existem para Contagem em Economia/Segurança/Eleitoral/Demografia/Saúde)
**MISLEADING FIXTURES: 0 não-disclosed** — o único achado de conteúdo estático disfarçado de análise real (§9, Briefing) está atrás de um selo "DEMONSTRATIVO" visível, portanto não conta como fixture enganosa não-revelada, mas é registrado como risco.

---

## 13 — Gemini

Nenhuma mudança de provider/modelo feita neste gate.

- **ECONOMY GEMINI READY: PASS** (Gemini default, Anthropic fallback, `caged-adapter.ts` + Prompt V3 já ativos desde gates anteriores)
- **ELECTORAL GEMINI READY: PASS** (mesma base, `electoral-prompt-v1.ts`/`electoral-llm-guards.ts` intactos)
- **SECURITY GEMINI DISABLED: PASS** (nenhuma chamada Gemini em `security-*.ts`, confirmado)
- **DEMOGRAPHY GEMINI DISABLED: PASS**
- **HEALTH GEMINI DISABLED: PASS**

---

## 14 — KPI e Chart Audit

Metodologia: verificação priorizada por risco — toda chave/coluna/janela usada por um KPI ou gráfico foi conferida contra o schema real do banco (`information_schema.columns`) e/ou uma consulta SQL direta contra os dados reais dos 3 pilotos. Não foi feita uma reconciliação pixel-a-pixel dos 34/19 itens exatos declarados pela Antigravity (fora do orçamento de tempo deste gate) — a tabela abaixo cobre os itens efetivamente auditados, incluindo todos os que se mostraram inválidos.

| # | Item | Domínio | Chave/coluna real | Status antes | Status depois |
|---|---|---|---|---|---|
| 1 | Saldo R12 | Economia | `saldo_emprego_formal` × janela 202401-202606 | **INVALID** (janela errada) | REAL |
| 2 | Variação MoM | Economia | idem | **INVALID** | REAL |
| 3 | Variação YoY | Economia | idem | **INVALID** | REAL |
| 4 | Admissões×Desligamentos | Economia | idem | **INVALID** | REAL |
| 5 | Pico/Menor/Sequência mensal | Economia | idem | **INVALID** | REAL |
| 6 | Saldo setorial (5 setores) | Economia | idem | **INVALID** | REAL |
| 7 | Crimes Violentos (índice) | Segurança | `indice_crimes_violentos` | REAL | REAL |
| 8 | Crimes Patrimoniais/Roubos | Segurança | `roubo_consumado` | REAL | REAL |
| 9 | Homicídios | Segurança | `homicidio_consumado` | REAL | REAL |
| 10 | Furtos | Segurança | `furto_consumado` (inexistente) | **INVALID** | REMOVIDO → Extorsão (real) |
| 11 | Furtos de Veículos | Segurança | `veiculos_roubo_furto` (inexistente) | **INVALID** | REMOVIDO → Sequestro/Cárcere (real) |
| 12 | Pico/Vale/Média mensal | Segurança | série real | REAL | REAL |
| 13 | Total Estabelecimentos | Saúde | `estabelecimentos_total` (chave buscada era `estabelecimentos_saude_total`) | **INVALID (mascarado por fallback)** | REAL |
| 14 | Atendimento SUS | Saúde | `estabelecimentos_atendimento_ambulatorial_sus` (chave buscada era `estabelecimentos_atendimento_sus`) | **INVALID (sempre 0)** | REAL |
| 15 | Ambulatorial/Hospitalar/Cirúrgico/Obstétrico | Saúde | chaves corretas desde o início | REAL | REAL |
| 16 | UBS / Urgência-Emergência (novos) | Saúde | `estabelecimentos_unidades_basicas` / `estabelecimentos_urgencia_emergencia` | **AUSENTE do frontend** | ADICIONADO (REAL) |
| 17 | População Total | Demografia | `populacao_total` (não-determinístico antes) | **INVALID (não determinístico)** | REAL (último ano) |
| 18 | Variação Populacional | Demografia | série completa | **AUSENTE** | ADICIONADO (REAL) |
| 19-22 | %Fem/%Masc/%Jovens/%Idosos | Demografia | `percentual_*` (SIDRA 9514) | **AUSENTE** | ADICIONADO (REAL, 4 KPIs) |
| 23 | Eleitorado/Comparecimento/Abstenção | Eleitoral | `tse-notebook-repository.ts` | REAL | REAL |
| 24 | Votos Válidos/Brancos/Nulos | Eleitoral | idem | REAL | REAL |
| 25 | Margem 1º×2º | Eleitoral | idem | REAL | REAL |
| 26 | Concentração/Fragmentação | Eleitoral | só no fixture demo | N/A (só demo) | N/A (sem mudança — sem suporte matemático real, ver §6) |
| 27 | Command Center — População | Overview | `territory.metadata` | REAL | REAL |
| 28 | Command Center — Saldo CAGED/MoM | Overview | janela 202301-202512 | **INVALID (janela errada)** | REAL |
| 29 | Command Center — Crimes Violentos | Overview | coluna `periodo` (inexistente) | **INVALID (sempre falha)** | REAL |
| 30 | Command Center — Comparecimento Eleitoral | Overview | `tse-notebook-repository.ts` | REAL | REAL |

**VERIFIED REAL KPIS (auditados): 30 / 30 após as correções** (9 estavam inválidos ou ausentes no início desta auditoria — todos corrigidos ou adicionados; nenhum item auditado ficou "REAL" antes e "INVALID" depois)
**INVALID KPIS remanescentes: 0** entre os itens auditados. Não é uma afirmação sobre a totalidade dos 34 declarados pela Antigravity — apenas sobre os 30 efetivamente traçados até a fonte nesta auditoria.

Gráficos auditados seguem exatamente as mesmas correções (mesma fonte de dados dos KPIs 1-6, 10-11, 17-22, 28-29): série histórica CAGED (30m), saldo setorial, rolling 12m, série SEJUSP (11m + composição), evolução populacional, composição por sexo, estrutura etária, distribuição CNES por tipo, e os 5 gráficos eleitorais — todos confirmados reais após as correções acima.

**VERIFIED REAL CHARTS: todos os traçados nesta auditoria confirmados reais após correção — nenhuma reconciliação exaustiva contra os 19 declarados pela Antigravity foi feita além dos que compartilham fonte com os KPIs da tabela acima.**

---

## 15 — Correções aplicadas neste gate (P0/P1 apenas, minimal-fix)

1. `lib/territorios/demografia-expansion.ts`, `saude-collector.ts`, `saude-cnes-normalizer.ts`, `scripts/run-data-expansion-02.ts` — 6 imports `TS5097` (remoção da extensão `.ts`).
2. `app/dashboard/territorios/[ibge]/seguranca/page.tsx` — 2 chaves inexistentes (`furto_consumado`, `veiculos_roubo_furto`) substituídas por chaves reais (`extorsao_consumado`, `sequestro_carcere_privado_consumado`).
3. `app/dashboard/territorios/[ibge]/demografia/page.tsx` — reescrita para consumir a expansão real do Codex (história 2001-2025 + Censo 2022 sexo/idade), antes não consumida.
4. `app/dashboard/territorios/[ibge]/economia/page.tsx` — janela CAGED `202301-202512` → `202401-202606` (regressão reintroduzida de `RELEASE-GATE-TERRITORIOS-1.0`).
5. `app/dashboard/territorios/[ibge]/page.tsx` (Command Center) — mesma janela CAGED corrigida; coluna inexistente `periodo` → `periodo_inicio` na consulta de Segurança.
6. `app/dashboard/territorios/[ibge]/saude/page.tsx` — 2 chaves inexistentes (`estabelecimentos_saude_total`, `estabelecimentos_atendimento_sus`) corrigidas; 2 KPIs novos (UBS, Urgência/Emergência) conectados aos agrupamentos reais do Codex.

**Não corrigido, propositalmente fora de escopo** (registrado para gate dedicado): duplicação de metodologia entre `lib/territorios/intelligence/{command-center,briefing,radar,economy/*,electoral/*,security/*}.ts` e o frontend (que recalcula tudo de forma independente); coluna `codigo_ibge` inexistente em `territory_briefings` (inofensiva hoje — nenhum conteúdo real existe para ler); conteúdo estático do Briefing demonstrativo.

---

## SAÍDA OBRIGATÓRIA

```
TERRITORIOS-2.0-CONVERGENCE-GATE: PASS WITH GAPS

WORKSPACE CONVERGENCE: PASS
TYPECHECK: PASS
TESTS: PASS
BUILD: PASS

DEMOGRAPHY DATA: PASS
DEMOGRAPHY FRONT: PASS
DEMOGRAPHY STATUS: PARTIAL

HEALTH CNES DATA: PASS
HEALTH FRONT: PASS
HEALTH SERVICE SUPPLY: COMPLETE
HEALTH EPIDEMIOLOGY: NOT_AVAILABLE
HEALTH OVERALL: PARTIAL

ECONOMY: COMPLETE
ECONOMY INTELLIGENCE: PARTIAL

ELECTORAL: COMPLETE
ELECTORAL INTELLIGENCE: PARTIAL

SECURITY: COMPLETE
SECURITY DETERMINISTIC INTELLIGENCE: PASS
SECURITY LLM: WITH_LIMITATIONS

COMMAND CENTER: PARTIAL
30-SECOND READING: PASS

BRIEFING: WAITING_INTELLIGENCE
RADAR: WAITING_INTELLIGENCE
POLITICAL INTELLIGENCE: WAITING_INTELLIGENCE

VERIFIED REAL KPIS: 30 / 30 auditados (não é reconciliação exaustiva dos 34 declarados)
INVALID KPIS: 0 remanescentes (9 encontrados inválidos/ausentes no início, todos corrigidos)

VERIFIED REAL CHARTS: todos os auditados, reais após correção
INVALID CHARTS: 0 remanescentes

CONTAGEM FALLBACK LEAKS: 0
MISLEADING FIXTURES: 0 não-disclosed (1 achado disclosed de risco — Briefing, ver §9)

ECONOMY GEMINI READY: PASS
ELECTORAL GEMINI READY: PASS
SECURITY GEMINI DISABLED: PASS
DEMOGRAPHY GEMINI DISABLED: PASS
HEALTH GEMINI DISABLED: PASS

P0: 0 (4 corrigidos durante o gate: janela CAGED ×2 arquivos, coluna periodo, chaves furto/veículos)
P1: 0 (2 corrigidos durante o gate: chaves saúde SUS/total)
P2: 3 (duplicação de metodologia intelligence↔frontend; coluna codigo_ibge inexistente em territory_briefings, hoje inofensiva; conteúdo estático do Briefing demonstrativo)
P3: 1 (arquivo órfão vazio `TerritoryEngineStatusBoard 2.tsx`)
```

---

## Decisão Executiva

1. **Os três trilhos convergiram corretamente?** Parcialmente no início (typecheck quebrado, 4 bugs reais de chave/janela/coluna no frontend), **sim** após as correções deste gate.
2. **Os 34 KPIs da Antigravity são sustentados por dados reais?** Dos 30 efetivamente auditados até a fonte, 9 estavam inválidos ou ausentes no início (todos corrigidos/adicionados); os 4 restantes declarados pela Antigravity não foram individualmente re-traçados nesta auditoria.
3. **Os 19 gráficos são sustentados por séries reais?** Os que compartilham fonte com os KPIs auditados, sim, após correção. Não houve reconciliação exaustiva do total.
4. **A Demografia já consome a expansão do Codex no frontend?** Não consumia — **agora sim**, após a correção deste gate.
5. **Saúde deve ser chamada COMPLETE ou PARTIAL?** PARTIAL no geral (`HEALTH OVERALL`); a oferta CNES isoladamente é COMPLETE (`HEALTH SERVICE SUPPLY`).
6. **Segurança está visualmente completa sem indicadores inexistentes?** Não estava — usava 2 chaves inexistentes. Está, após a correção.
7. **Command Center consome os contratos de intelligence ou duplica lógica?** Duplica. Funciona com dados reais (após 2 correções), mas não chama `command-center.ts`.
8. **Briefing está realmente conectado?** Não — nem ao banco (bug de coluna, hoje inofensivo pois não há conteúdo real) nem ao contrato `briefing.ts`. Além disso, boa parte do conteúdo demonstrativo é texto estático, não dado.
9. **Radar está realmente conectado?** Não ao contrato `radar.ts`; o caminho demonstrativo é honesto e simples.
10. **Inteligência Política está realmente conectada?** Não a dados reais de nenhum município — corretamente restrita a Contagem com POC fixture, disclosed, intacta desde `RELEASE-GATE-TERRITORIOS-1.0`.
11. **Economia está pronta para Gemini?** Sim, já ativo desde gates anteriores.
12. **Eleitoral está pronto para Gemini?** Sim, já ativo desde `INTEL-ELECTORAL-01`.
13. **Segurança deve continuar sem Gemini?** Sim — recomendo auditoria do coletor/persistência antes de conectar.
14. **Quais cadernos são realmente COMPLETE pela nova definição?** Economia, Segurança, Eleitoral (após as correções deste gate); Saúde apenas na dimensão "Service Supply".
15. **Quais são PARTIAL e por quê?** Demografia (faltam domicílios/urbanização/idade média — gap real de fonte, não de frontend); Saúde geral (falta epidemiologia); Command Center (funciona, mas duplica metodologia em vez de consumir o contrato de intelligence).
16. **Há P0 ou P1?** Havia 4 P0 e 2 P1 no início desta auditoria — todos corrigidos. **P0 atual: 0. P1 atual: 0.**
17. **O estado atual pode ser considerado TERRITÓRIOS 2.0 — PRODUCT CANDIDATE?** **SIM**, pelos critérios definidos no gate: P0=0, P1=0, TYPECHECK/TESTS/BUILD=PASS, MISLEADING FIXTURES=0 (não-disclosed), CONTAGEM FALLBACK LEAKS=0, Economia=COMPLETE, Eleitoral=COMPLETE, Segurança≥COMPLETE visual/determinístico com LLM desabilitado, Demografia≥PARTIAL com expansão real conectada, Saúde≥PARTIAL com CNES real conectado, Command Center=PARTIAL sem dado falso, Briefing/Radar/Political Intelligence=PARTIAL/WAITING com disclosure honesto.
18. **Está pronto para deploy?** Não é este gate quem decide — ver critério de saída abaixo.

**TERRITÓRIOS 2.0 — PRODUCT CANDIDATE: SIM**

**READY FOR DEPLOY AUDIT: YES**

---

**PARE.** Nenhum DATA-EXPANSION-03, nenhuma Educação/Infraestrutura, nenhum Gemini em Segurança, nenhum deploy executado neste gate.
