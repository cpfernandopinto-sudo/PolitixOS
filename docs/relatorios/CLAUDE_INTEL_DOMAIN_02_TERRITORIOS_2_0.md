# INTEL-DOMAIN-02 — Inteligência Territorial por Domínio (Economia + Eleitoral + Segurança)

**Agente:** Claude · **Gate:** INTEL-DOMAIN-02 · **Território:** Politix Territórios 2.0
**Data:** 2026-08-17 · **Escopo:** Missões A–F, sem frontend, sem deploy, sem integrar Demografia/Saúde ao Gemini.

---

## 1. Princípio aplicado

Em todos os módulos novos deste gate, o fluxo determinístico foi mantido estrito:

```
DADOS REAIS → INDICADORES → DERIVED INDICATORS → FACTS → SIGNALS → EVIDENCE → (LLM opcional) → SÍNTESE EXECUTIVA
```

`Fact` (`lib/territorios/intelligence/contracts.ts`) foi adicionado como tipo **aditivo** — ponte legível L1/L2 → L3, nunca uma interpretação, nunca parte do enum `IntelligenceLayer` estrito. Nenhum tipo existente foi alterado; confirmado via `tsc --noEmit` antes e depois da mudança.

Nenhum módulo criado ou modificado neste gate chama LLM. Onde uma camada LLM já existia (Eleitoral, de `INTEL-ELECTORAL-01`) ou é avaliada como pronta (Economia), ela permanece **opcional e separada** da camada determinística — nunca a substitui.

---

## 2. Missão A — Economia

### Facts (`lib/territorios/intelligence/economy/caged-facts.ts`, novo)

`buildCagedFacts(territoryId, points, options?)` produz, sobre `CagedAdapterPoint[]` já homologado (nenhuma reconstrução de MoM/YoY/Rolling12 — mesma aritmética do `caged-adapter.ts` reconciliado no hotfix anterior):

- `current_balance`, `current_admissions`, `current_dismissals`
- `mom_change`, `yoy_change`, `rolling12`
- `best_month`, `worst_month`
- `trend_direction` (`'subindo'|'caindo'|'misto'|null`, exige ≥3 variações MoM)
- `acceleration` (`'acelerando'|'desacelerando'|'estavel'|null`)
- `direction_reversal` (`'sim'|'nao'|null` — representado como string, não boolean, para caber no tipo `Fact.value: number|string|null`)
- Facts setoriais opcionais (`sector_leader`, `sector_worst`, `sectors_positive`, `sectors_negative`) quando `sectorSeries` é fornecida

Todo fact declara `supported:false`/`value:null`/`limitations` explícitas quando o dado é matematicamente insuficiente (ex.: `mom_change` com 1 ponto só) — nunca fabrica um número.

**13 testes** (`caged-facts.test.ts`), incluindo casos negativos (1 ponto só, séries curtas).

### Signals (`caged-employment-signals.ts`, novo)

`buildCagedEmploymentSignals(territoryId, facts)` produz os 8 tipos sugeridos pelo gate: `EMPLOYMENT_ACCELERATING/DECELERATING/REVERSAL`, `SECTOR_CONCENTRATION`, `BROAD_BASED_EXPANSION/CONTRACTION`, `RECENT_RECOVERY/DETERIORATION`. Threshold documentado explicitamente: `BROAD_BASED` exige que **todos** os setores avaliados estejam no mesmo sentido (critério mais conservador possível, não maioria). Nenhum signal nasce de um fact `supported:false`.

**10 testes** (`caged-employment-signals.test.ts`), com os 2 casos negativos obrigatórios do gate (facts vazio, série de 1 mês).

### Prompt V3 e catálogo de indicadores

Avaliação: **Prompt V3 já suporta a densidade exigida** (guards genéricos de entidade/temporal/normativo/atribuição política já cobrem qualquer domínio, incluindo CAGED). Decisão: **preservar V3 intacto** — nenhuma V4 criada, nenhuma mudança versionada no prompt.

O gap real identificado era o catálogo `indicator-labels.ts` (usado por `deriveKnownEntitiesFromContext()` para popular a allowlist do guard ENTITY): faltavam os 6 indicatorId reais que `caged-adapter.ts`/`caged-facts.ts` emitem. Estendido (catálogo fechado e auditável, de 19 → 25 entradas):

```
saldo_emprego_formal, saldo_emprego_formal_mom, saldo_emprego_formal_yoy,
saldo_emprego_formal_rolling12, admissoes_emprego_formal, desligamentos_emprego_formal
```

Decisão deliberada: **nenhuma variante setorial** foi adicionada ao catálogo, porque o adapter nunca gera um `indicatorId` por setor — o setor só aparece como sufixo do id de evidência, nunca em `derivedIndicatorRefs`/`unitIndicators()`. Adicionar entradas setoriais seria inventar indicadores que o motor não produz.

Teste de contagem atualizado (`indicator-labels.test.ts`) + 2 novos testes (resolução dos 6 indicadores CAGED, rejeição de variante setorial inventada).

**ECONOMY LLM READY: YES** — Gemini default/Anthropic fallback já ativos via `caged-adapter.ts` + Prompt V3 desde gates anteriores; nada mudou nessa integração.

---

## 3. Missão B — Eleitoral

### Auditoria da pipeline existente

Antes de escrever qualquer código novo, o pipeline determinístico eleitoral foi lido por completo: `electoral-analytics.ts` → `electoral-intelligence.ts` → `electoral-interpretation-context.ts` → `electoral-interpretation.ts` → `electoral-briefing.ts`. Achado: **é uma cadeia já madura, completa e 100% testada** (113 testes passando antes de qualquer mudança deste gate) — não construída neste gate, mas de gates anteriores.

Ela já:
- Preserva `DIRECTLY_SUPPORTED`/`MULTI_SIGNAL_SUPPORTED`/`LIMITED_CONTEXT` (`ElectoralConfidenceClass`) em toda a cadeia.
- Calcula facts por eleição (comparecimento, abstenção, votos válidos, margem, vencedor/partido, turno decisivo) e `comparisons` (deltas 2016→2020→2024).
- Já implementa, com `ElectoralSignalType`, todos os sinais conceituais sugeridos pelo gate: `PARTICIPATION_INCREASED/DECREASED` (≈TURNOUT_RISING/FALLING), `ABSTENTION_INCREASED/DECREASED`, `MARGIN_EXPANDED/NARROWED` (≈COMPETITIVENESS_SHIFT), mais `WINNER_CHANGED/MAINTAINED`, `WINNING_PARTY_CHANGED/MAINTAINED`, `DECISION_MOVED_TO_RUNOFF/FIRST_ROUND`, e comparações de benchmark (`ABOVE/BELOW/AT_SAMPLE_*`).
- Já tem a camada opcional LLM (`electoral-prompt-v1.ts` + `electoral-llm-guards.ts`, de `INTEL-ELECTORAL-01`): recebe o `ElectoralBriefing` inteiro (facts + signals + interpretations classificadas + evidence hashes + datasets + `guardrails.assertionClasses` + `limitations` + território + eleições cobertas) — **já satisfaz literalmente** o requisito do gate sem nenhuma mudança.

**Decisão**: não recriar nem duplicar essa cadeia. Construir apenas uma camada de **projeção** (não recomputação) para alimentar o novo contrato cross-domain.

### Facts e Signals (novo, `lib/territorios/intelligence/electoral/`)

- `electoral-facts.ts`: projeta `ElectoralTerritoryIntelligence` (facts por eleição + `comparisons`) para `Fact[]` no formato cross-domain, com `evidenceRefs` no padrão `db:{territoryId}:eleitoral_{metrica}:TSE:{ano}`. Nunca recalcula nada — só traduz formato. **7 testes**, incluindo os casos negativos (proveniência incompleta, métrica ausente).
- `electoral-signals.ts`: projeta `ElectoralSignal[]` (já computados) para `AnalyticalSignal[]`, resolvendo `evidenceRefs` contra os `Fact[]` reais (nunca sintetiza uma referência nova — mesma disciplina de `caged-employment-signals.ts`). **6 testes**.

**Achado documentado, não corrigido (fora de escopo)**: `buildElectoralTerritoryIntelligence` exige exatamente 3 eleições (pares fixos 2016/2020/2024) — não há uma trilha "menos de 3 eleições" no código de produção. Os testes de caso vazio usam um `ElectoralTerritoryIntelligence` construído diretamente, já que `buildElectoralFacts` não depende de como os facts foram gerados.

**Decisão explícita e documentada — ELECTORAL_FRAGMENTATION / ELECTORAL_CONCENTRATION não implementados**: `ElectionTerritoryYearAnalysis` só rastreia vencedor e segundo colocado (`winner`/`runnerUp`), nunca a distribuição de votos entre todos os candidatos. Não existe definição matemática documentável de fragmentação/concentração partidária com o dado disponível — implementar exigiria inventar uma distribuição que a fonte não fornece, violando a regra explícita do próprio gate ("só implementar quando houver definição matemática documentável"). `MARGIN_EXPANDED`/`MARGIN_NARROWED` (já existente) cobre a leitura de competitividade com os dois candidatos realmente disponíveis.

**ELECTORAL LLM READY: YES** — já construído e testado em `INTEL-ELECTORAL-01`, confirmado intacto (113 testes eleitorais + os 13 novos, todos passando).

---

## 4. Missão C — Segurança

Confirmado no início: **não existia nenhuma pasta de inteligência de Segurança** — apenas o coletor (`seguranca-collector.ts`) e um catálogo/summary mínimo (`seguranca-analytics.ts`, usado por nenhum consumidor real). Construído do zero, sem conectar Gemini, em `lib/territorios/intelligence/security/` (novo):

### Thresholds (`security-thresholds.ts`)

Todas as constantes usadas pelos signals, documentadas para auditoria: `SPIKE_MULTIPLIER=1.5`, `IMPROVEMENT_DIVISOR=1.5`, `PERSISTENT_HIGH_MIN_PERIODS=3`, `TREND_MIN_CONSECUTIVE_DELTAS=3`.

### Facts (`security-facts.ts`)

`buildSecurityFacts(territoryId, indicatorKey, label, points, options?)` produz, por indicador (tipicamente `indice_crimes_violentos`, o índice oficial agregado): `current_value`, `previous_value`, `delta`, `delta_percent`, `average`, `peak`, `low`, `trend` (mesma regra de ≥3 variações consecutivas do CAGED), `direction_change`, `persistent_high_level`. Com `options.peerSeries` (as demais 13 naturezas de crime), produz também os facts cross-indicador `dominant_nature` (atual e anterior) e `natures_rising`/`natures_falling`. Evidence refs no padrão `db:{territoryId}:{indicador}:crimes-violentos:{periodo}`.

**12 testes**, incluindo os casos negativos obrigatórios (série vazia, 1 ponto, peerSeries com período divergente ignorada).

### Signals (`security-signals.ts`)

`buildSecurityIndicatorSignals` produz `VIOLENCE_RISING/FALLING`, `RECENT_SPIKE`/`RECENT_IMPROVEMENT` (exigem que o valor atual seja literalmente o pico/mínimo da série **e** ultrapasse o threshold da média — nunca dispara em qualquer variação), `PERSISTENT_HIGH_LEVEL`. `buildSecurityCategoryShiftSignal` produz `CATEGORY_SHIFT` a partir dos dois facts `dominant_nature` consecutivos (só dispara quando a natureza dominante realmente muda).

**11 testes**, incluindo os 2 casos negativos obrigatórios (facts vazio, 1 ponto).

### SECURITY LLM READY: **WITH_LIMITATIONS**

A camada determinística está sólida (facts+signals com evidência real, thresholds documentados, 23 testes verdes). Mas, diferente de CAGED (auditado em profundidade em múltiplos gates: download/parse/hash/idempotência/persistência) e de Eleitoral (pipeline auditado em `INTEL-ELECTORAL-01`), **o coletor/persistência de Segurança nunca foi auditado de forma independente nesta sessão** — este gate construiu inteligência em cima de `seguranca-collector.ts`/`seguranca-analytics.ts` sem verificar cardinalidade, idempotência ou integridade de hash de evidência no banco. Além disso, a série tem apenas 11 períodos (vs. 30 meses do CAGED), o que limita a robustez estatística de qualquer sinal de tendência.

**Recomendação**: antes de conectar Gemini, rodar um gate de auditoria no estilo `ECO-03B1` sobre o coletor/persistência de Segurança; depois disso, replicar o padrão `electoral-prompt-v1.ts`/`electoral-llm-guards.ts` para Segurança.

---

## 5. Missão D — Command Center Contract

`lib/territorios/intelligence/command-center.ts` (novo): `TerritoryExecutiveSignals = { territoryId, economy, electoral, security }`, cada `DomainExecutiveSignal` com `status` (`AVAILABLE`/`INSUFFICIENT_DATA`), `headline`, `direction`, `severity`, `confidence`, `period`, `evidenceRefs`, `signalId`. Nenhum texto de LLM exigido — funciona mesmo sem Gemini disponível, porque é pura projeção sobre `AnalyticalSignal[]` já computados.

**Decisão de design registrada**: `direction` usa vocabulário neutro `RISING/FALLING/STABLE/MIXED/UNKNOWN` — nunca `IMPROVING/WORSENING`. Um domínio como Eleitoral não tem eixo natural de "bom"/"ruim" (comparecimento subir não é uma vitória ou derrota para ninguém, por si só); usar um vocabulário normativo no contrato cross-domain embutiria juízo político não solicitado. `direction` descreve o sinal mais relevante escolhido, nunca uma "média" do domínio inteiro.

**4 testes**, incluindo caso negativo (domínio sem sinal → `INSUFFICIENT_DATA`, nunca um headline fabricado) e o critério "signal ACTIVE sem evidência nunca é escolhido".

---

## 6. Missão E — Briefing Executivo

`lib/territorios/intelligence/briefing.ts` (novo): `TerritoryExecutiveBriefing = { territoryId, facts, topSignals, whatChanged, attention, limitations, llmSynthesis: null }`. Responde às 5 perguntas do gate:

1. **O que mudou** → `whatChanged` (signals `TREND`/`CHANGE`)
2. **Top 3 sinais** → `topSignals`
3. **Onde está o risco** / 4. **Onde está a oportunidade** → `attention` (categorias `RISK`/`OPPORTUNITY`)
5. **O que precisa de monitoramento** → `attention` (categoria `MONITOR`)

Nenhuma recomendação factual é inventada: todo item de `attention` reusa literalmente `signal.title` — este módulo nunca gera prosa nova. `llmSynthesis` é sempre `null` (camada opcional, nunca preenchida deterministicamente por este módulo).

**Regra crítica registrada e testada**: sinais do domínio **Eleitoral nunca são classificados como RISK ou OPPORTUNITY** — mesma disciplina já estabelecida em `electoral-intelligence.test.ts` (lista de termos proibidos incluindo "risco eleitoral"/"oportunidade eleitoral") e em `electoral-briefing.ts` (`guardrails.recommendations: []`). Sinais eleitorais só entram em `attention` como `MONITOR`, e apenas para eventos factuais claramente relevantes (mudança de vencedor/partido/turno decisivo) — nunca sinais de participação/abstenção, que não têm polaridade política inerente.

**6 testes**, incluindo os 2 testes que verificam explicitamente essa regra crítica (nenhum sinal eleitoral em RISK/OPPORTUNITY; sinais de participação/abstenção nunca entram em `attention`).

---

## 7. Missão F — Radar Territorial

`lib/territorios/intelligence/radar.ts` (novo): `RadarItem[]` nasce estritamente de `AnalyticalSignal` com `status:'ACTIVE'` e `evidenceRefs` não-vazio — `headline` reusa `signal.title` literalmente, nunca texto genérico. Um item como "Saldo de empregos desacelerou pelo terceiro mês" só apareceria se fosse literalmente verdade, porque é garantido por construção: sem um `AnalyticalSignal` real por trás, não existe `RadarItem`.

**4 testes**, incluindo os 2 casos negativos (signal não-`ACTIVE`, signal sem evidência).

---

## 8. Regressão completa

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` (arquivos deste gate) | **0 erros novos** |
| `npx tsc --noEmit` (repo inteiro) | 5 erros — **pré-existentes**, confirmados na baseline antes deste gate (`demografia-expansion.ts`, `saude-collector.ts` ×2, `scripts/run-data-expansion-02.ts` ×2, todos `TS5097` de import com extensão `.ts` explícita) — nenhum arquivo deste gate |
| `npx eslint` (arquivos deste gate) | **0 erros, 0 warnings** |
| `npx eslint lib/territorios app/dashboard/territorios` (repo) | 11 erros + 55 warnings — **todos pré-existentes**, em arquivos não tocados neste gate (páginas frontend, `electoral-resolver.ts`, `frontend-adapters.ts`) |
| `npx vitest run lib/territorios/` | **903 passed, 2 skipped, 0 failed** |
| `npx vitest run` (repo inteiro, excluindo o worktree paralelo `.claude/worktrees/claude-word-install-dfbbc4`) | **973 passed, 5 skipped, 0 failed** |
| `npx next build` | Falha — **mesma causa pré-existente** (`TS5097` em `demografia-expansion.ts`), não relacionada a este gate |

Nota sobre o `vitest run` sem escopo: o comando padrão, na raiz do repo, também varre `.claude/worktrees/claude-word-install-dfbbc4/` (checkout paralelo de outro agente presente neste mesmo diretório de trabalho) e reporta 4 falhas de UI ali — confirmado não relacionado a este gate (falha de `selectOptions` em um teste de componente React de outro worktree). Excluído explicitamente do escopo da regressão.

**Testes novos criados neste gate**: 1 (contracts) + 13 (caged-facts) + 10 (caged-employment-signals) + 2 (indicator-labels) + 7 (electoral-facts) + 6 (electoral-signals) + 12 (security-facts) + 11 (security-signals) + 4 (command-center) + 6 (briefing) + 4 (radar) = **76 testes novos**, todos verdes.

---

## 9. Gate final

- **INTEL-DOMAIN-02**: executado
- **ECONOMY FACTS**: PASS (12 facts base + 4 setoriais, 13 testes)
- **ECONOMY SIGNALS**: PASS (8 tipos, 10 testes)
- **ECONOMY PROMPT**: PASS (V3 preservado; catálogo estendido 19→25)
- **ECONOMY LLM READY**: YES
- **ELECTORAL FACTS**: PASS (projeção sobre pipeline já auditada, 7 testes)
- **ELECTORAL SIGNALS**: PASS (projeção, 6 testes; FRAGMENTATION/CONCENTRATION deliberadamente não implementados — sem suporte matemático nos dados)
- **ELECTORAL PROMPT**: PASS (já existia, confirmado suficiente sem mudanças)
- **ELECTORAL LLM READY**: YES
- **SECURITY FACTS**: PASS (12 facts por indicador + cross-indicador, 12 testes)
- **SECURITY SIGNALS**: PASS (6 tipos, 11 testes)
- **SECURITY LLM READY**: WITH_LIMITATIONS (coletor/persistência nunca auditados nesta sessão; recomendado gate de auditoria antes de conectar Gemini)
- **COMMAND CENTER CONTRACT**: PASS (4 testes, funciona sem Gemini)
- **BRIEFING CONTRACT**: PASS (6 testes, inclui guardrail político para Eleitoral)
- **RADAR CONTRACT**: PASS (4 testes, itens só nascem de sinais reais)
- **GEMINI DEFAULT PRESERVED**: YES (nenhuma mudança em `config.ts`/seleção de provider)
- **ANTHROPIC FALLBACK PRESERVED**: YES (nenhuma mudança)
- **P0**: 0 · **P1**: 0 · **P2**: 1 (pré-existente, fora de escopo — `TS5097` bloqueando `next build`, em `demografia-expansion.ts`/`saude-collector.ts`/`scripts/run-data-expansion-02.ts`) · **P3**: 0
- **READY FOR ANTIGRAVITY**: YES, para consumir os contratos `command-center.ts`/`briefing.ts`/`radar.ts` e os builders de Facts/Signals de Economia/Eleitoral/Segurança — nenhum frontend foi tocado neste gate

### Decisão executiva (7 perguntas)

1. **Economia produz inteligência realmente útil?** Sim — Facts+Signals com evidência real, 8 tipos de sinal respondendo tendência/aceleração/reversão/concentração setorial.
2. **Eleitoral está pronto para Gemini sem comprometer rastreabilidade?** Sim — a camada LLM já existia (`INTEL-ELECTORAL-01`) e permanece intacta; as novas projeções Facts/Signals adicionam visibilidade cross-domain sem tocar a pipeline guardada.
3. **Segurança está pronto para LLM ou deve continuar determinístico?** Continuar determinístico por ora (`WITH_LIMITATIONS`) — recomendado auditar o coletor/persistência antes de conectar Gemini.
4. **Command Center pode receber sinais reais?** Sim — contrato construído e testado, degrada com segurança para `INSUFFICIENT_DATA` por domínio.
5. **Briefing pode ser construído sem narrativa fake?** Sim — apenas passthrough de facts/signals já governados; `llmSynthesis` explicitamente `null`; categorias de atenção baseadas em regra, nunca em juízo político para Eleitoral.
6. **Radar pode nascer de eventos mensuráveis?** Sim — `RadarItem` é projeção 1:1 de sinais `ACTIVE` com evidência real.
7. **Quais domínios devem continuar sem Gemini?** Segurança (até auditoria do coletor), Demografia e Saúde (por instrução explícita do gate, não tocados).

---

**PARE** — nenhuma alteração de frontend, nenhum deploy realizado neste gate.
