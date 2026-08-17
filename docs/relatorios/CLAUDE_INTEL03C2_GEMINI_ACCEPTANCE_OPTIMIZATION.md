# INTEL-03C.2 — Otimização da Taxa de Aceitação do Gemini (Correção Mínima + Benchmark Controlado)

**Autor:** Claude (arquitetura de inteligência territorial)
**Data:** 2026-08-17
**Escopo:** `lib/territorios/intelligence/interpretation/`, `lib/territorios/intelligence/guardrails.ts`, `scripts/poc-intel03c-gemini-3-municipios.ts`
**Ponto de partida:** INTEL-03C.1 — Gemini 2.5 Flash / Prompt V2, acceptance 28,6%, 100% das rejeições por `UNKNOWN_SOURCE`.

---

## Resultado em uma frase

A causa raiz era estrutural, não do modelo: `knownEntities` estava sempre `[]` em `validator.ts` desde o INTEL-03A — o guard de rastreabilidade de fonte nunca teve nenhuma entidade legítima para reconhecer. Corrigido isso (allowlist derivada só do contexto, nunca inventada) mais uma regra de reforço no Prompt V3, a taxa de aceitação real do Gemini foi de **28,6% → 100% (7/7)**, retry rate de **71,4% → 0%**, custo de **US$0,034 → US$0,0175/município**, mantendo **100% dos guards de segurança/fidelidade/lineage intactos**. Por critério explícito deste gate (acceptance ≥ 43% E todos os guards PASS), **Gemini está homologado como DEFAULT**.

---

## 1. Auditoria das 30 ocorrências `UNKNOWN_SOURCE` (INTEL-03C.1)

Reconstituídas a partir do output real salvo da execução anterior (`/tmp/intel03c-poc-gemini-output.txt`), contagem exata confirmada por script:

| Termo | Ocorrências | Classificação | Origem provável | Deve continuar bloqueado? |
|---|---|---|---|---|
| "Produto Interno Bruto" | 16 | **A** — terminologia econômica válida | Nome por extenso do indicador `pib_municipal_precos_correntes` (ECO-02B), presente no contexto via `derivedIndicatorRefs` | **NÃO** |
| "Valor Adicionado Bruto" | 8 | **A** | Nome por extenso de `vab_total_precos_correntes` e variantes (`vab_agropecuaria_*`, `vab_industria_*`, `vab_servicos_*`), todas presentes no contexto | **NÃO** |
| "Saúde Públicas" | 3 | **A** | Fragmento do nome composto do indicador `vab_administracao_defesa_educacao_saude_publicas_seguridade_precos_correntes` (ECO-02B), presente no contexto | **NÃO** |
| "Seguridade Social" | 3 | **A** | Fragmento do mesmo indicador composto acima | **NÃO** |
| **Total** | **30** | **100% Classe A** | — | — |

**Verificação, não suposição**: os 4 termos foram confrontados contra o catálogo fechado e real de 19 indicadores definidos em `lib/territorios/intelligence/economy/engine.ts` (`ECO01_MONETARY_INDICATORS`, `ECO02B_ACTIVITY_MONETARY_INDICATORS`, `ECO02B_OFFICIAL_SHARE_INDICATORS`) — todos os 4 correspondem exatamente a indicadores reais desse catálogo, nenhum inventado. **Zero ocorrências das classes B (fonte legítima não reconhecida), C (possível entidade externa), D (entidade externa real) ou E (ambígua)** nesta amostra de 30.

**Causa raiz real** (não é sobre o Gemini "se comportar mal"): `validator.ts` populava `GuardrailContext.knownEntities` como `[] as string[]` — hardcoded, sempre vazio — desde a criação do harness no INTEL-03A. O guard `ENTITY` genérico (`../guardrails.ts`, INTEL-01) nunca teve, em nenhum momento, nenhuma entidade legítima contra a qual comparar. Qualquer sequência de 2+ palavras capitalizadas — inclusive o nome por extenso de um indicador presente no próprio contexto — era, por construção, "desconhecida". Isso afetou (potencialmente) qualquer draft de qualquer provider (Anthropic incluído) sempre que o texto citasse um indicador por extenso — o Anthropic/V1 evitou isso por tender a usar siglas, não porque o guard estivesse correto.

---

## 2. Causa raiz

**Estrutural, em `validator.ts`**: `knownEntities: [] as string[]` nunca foi populado com nada desde a fundação do módulo (INTEL-03A). Não é uma falha de prompt nem uma falha do Gemini.

---

## 3. Correção escolhida

Seguindo a prioridade do gate (1. Prompt, 2. Allowlist semanticamente controlada, 3. Guard cirúrgico), a auditoria da Etapa 1 (100% Classe A, causa estrutural) apontou diretamente para a **Opção 2 como correção primária**, complementada por um reforço de prompt (V3) e um ajuste mínimo no matching do guard (necessário para os fragmentos "Saúde Públicas"/"Seguridade Social"):

### 3.1 Allowlist derivada do contexto (correção primária)

- **Novo arquivo `indicator-labels.ts`**: catálogo FECHADO, `INDICATOR_FRIENDLY_NAMES: Record<string,string>` — exatamente os 19 indicadores de `economy/engine.ts`, cada um traduzido literalmente para português por extenso. Nenhuma fonte/instituição/entidade externa é ou pode ser incluída aqui — o catálogo só conhece nomes de indicador.
- **Nova função `deriveKnownEntitiesFromContext()`** (`guards.ts`): para um `InterpretationInputContext`, retorna os nomes amigáveis apenas dos indicadores REALMENTE presentes nas unidades selecionadas (via `unitIndicators()`, já existente) — nunca a lista inteira do catálogo, apenas o que é relevante a este contexto específico.
- **`validator.ts`**: `knownEntities: [] as string[]` → `knownEntities: deriveKnownEntitiesFromContext(context)`.

### 3.2 Ajuste cirúrgico no guard `ENTITY` (`../guardrails.ts`, INTEL-01)

Necessário porque "Saúde Públicas"/"Seguridade Social" são *fragmentos* de um nome composto mais longo ("Administração, Defesa, Educação, Saúde Públicas e Seguridade Social") — o matching original exigia igualdade exata. Alterado para: candidato aceito se **exatamente igual** a um `knownEntity` OU se for **substring** de um `knownEntity` mais longo (nunca o inverso — um `knownEntity` nunca é aceito como substring de um candidato maior, o que impediria um nome fabricado tipo "Instituto Produto Interno Bruto Nacional" de "se esconder" atrás de um termo legítimo mais curto). Ver seção "Guardrails" abaixo para os testes que provam essa proteção.

### 3.3 Prompt V3 (reforço complementar, não a correção primária)

`INTEL_INTERPRETATION_PROMPT_V3` — novo arquivo, herda as 18 regras da V2 (16 da V1 + 17-18 da V2) integralmente, adiciona a regra 19: preferir siglas (PIB, VAB) a nomes por extenso, e descrever categorias compostas em minúsculas, nunca como título formal.

### Por que a combinação, não só uma opção isolada

O gate pediu para não assumir antecipadamente que só o prompt resolveria. Dado o custo real desprezível de uma chamada adicional (~US$0,05-0,07) frente ao valor de uma resposta definitiva, testamos empiricamente **ambas as camadas em sequência** (ver seção 8) em vez de escolher uma sem dado: primeiro a correção estrutural sozinha (com V2, por um bug de execução — seção 8.1), depois a correção estrutural + V3 juntas (seção 8.2). Isso permitiu isolar a contribuição de cada camada com dados reais, não suposição.

---

## 4. Justificativa

- A allowlist é auditável e fechada (19 entradas, cada uma uma tradução literal e verificável de um slug de indicador real) — não abre a porta para "qualquer entidade econômica", só para os indicadores que o próprio motor determinístico já produziu.
- É escopada por contexto — um indicador que não está presente nas unidades selecionadas continua fora da allowlist (testado explicitamente, seção 7).
- O ajuste de matching (substring) é unidirecional e seguro contra padding (testado explicitamente).
- V3 é defesa em profundidade, nunca a única camada — mesmo que o modelo ignore a regra 19, a allowlist continua protegendo.

---

## 5. Alterações realizadas

**Criados:**
- `lib/territorios/intelligence/interpretation/indicator-labels.ts`
- `lib/territorios/intelligence/interpretation/indicator-labels.test.ts`
- `lib/territorios/intelligence/interpretation/prompt-v3.ts`
- `lib/territorios/intelligence/interpretation/prompt-v3.test.ts`

**Alterados (aditivo, cirúrgico):**
- `lib/territorios/intelligence/interpretation/guards.ts` — `deriveKnownEntitiesFromContext()` adicionada.
- `lib/territorios/intelligence/interpretation/validator.ts` — `knownEntities` agora populado (1 linha).
- `lib/territorios/intelligence/guardrails.ts` — matching do guard `ENTITY` aceita fragmento de `knownEntity` mais longo (não editado: a lógica de extração `extractedProperNouns`, corrigida no INTEL-03C, permanece intocada).
- `lib/territorios/intelligence/interpretation/prompt-registry.ts` — `v3` registrado; default do registry passou de `v2` para `v3`.
- `lib/territorios/intelligence/interpretation/config.ts` — default de `promptVersion` passou de `v2` para `v3`.
- `lib/territorios/intelligence/interpretation/config.test.ts`, `prompt-v2.test.ts` — 3 asserções de default atualizadas de `v2` para `v3` (mudança de comportamento esperada, documentada).
- `scripts/poc-intel03c-gemini-3-municipios.ts` — corrigido um bug próprio: `promptVersion: 'v2'` estava hardcoded, ignorando `INTEL_LLM_PROMPT`; agora lê a env var corretamente (ver seção 8).

**Nunca tocados:** `prompt.ts` (V1), `prompt-v2.ts` (V2, exceto reexportação já existente de `buildFamilyScopedContext`), `selection.ts`, `serializer.ts`, `lineage.ts`, `anthropic-provider.ts`, `gemini-provider.ts`, `pipeline.ts`, `../economy/*`, `lib/territorios/caged/**`, `app/`, `components/`, n8n, Orquestrador, scheduler.

---

## 6. Testes

Novos testes obrigatórios, todos verdes:

- `indicator-labels.test.ts` (13 testes): catálogo fechado com exatamente 19 entradas; indicador desconhecido retorna `null`; `deriveKnownEntitiesFromContext` nunca inclui entidade externa fabricada; lista vazia para contexto sem unidades; "Produto Interno Bruto"/"Valor Adicionado Bruto"/"Saúde Públicas"/"Seguridade Social" não disparam mais `UNKNOWN_SOURCE` quando o indicador correspondente está no contexto; **"Produto Interno Bruto" AINDA dispara `UNKNOWN_SOURCE` quando nenhum indicador de PIB está presente** (allowlist é escopada, não global); as 4 entidades externas obrigatórias do gate (Instituto Fiscal Independente, Banco Mundial, Fundação Getulio Vargas, Universidade Federal de Minas Gerais) continuam rejeitadas quando ausentes da evidência; proteção contra padding ("Instituto Produto Interno Bruto Nacional" continua rejeitado).
- `guardrails.test.ts` (+2 testes): mecanismo de fragmento genérico testado isoladamente (candidato-fragmento-de-knownEntity aceito; knownEntity-fragmento-de-candidato-maior rejeitado).
- `prompt-v3.test.ts` (4 testes): V3 contém integralmente o texto da V2; adiciona a regra 19; V1/V2 nunca editados in-place; registry resolve v1/v2/v3 corretamente.
- `config.test.ts`/`prompt-v2.test.ts`: 3 asserções de default atualizadas (v2→v3), mudança de comportamento esperada e documentada, não uma regressão.

**Resultado da suíte:**

| Suíte | Resultado |
|---|---|
| `interpretation` + `guardrails.test.ts` | **183 passed, 2 skipped** (163 anteriores + 20 novos) |
| `lib/territorios/intelligence` (completa) | **308 passed, 2 skipped** |
| `lib/territorios app/api/territorios` (territorial completa) | **867 passed, 2 skipped** |
| `tsc --noEmit` | **0 erros** |
| `eslint` (escopo alterado) | **0 erros, 0 warnings** |
| `next build` | **PASS** |

---

## 7. Guardrails — prova de que nada foi afrouxado

Casos negativos obrigatórios (todos passam, `UNKNOWN_SOURCE` continua disparando):

| Entidade testada | Presente na evidência? | Resultado |
|---|---|---|
| Instituto Fiscal Independente | Não | **Rejeitado** |
| Banco Mundial | Não | **Rejeitado** |
| Fundação Getulio Vargas | Não | **Rejeitado** |
| Universidade Federal de Minas Gerais | Não | **Rejeitado** |
| "Instituto Produto Interno Bruto Nacional" (padding em torno de termo legítimo) | Parcialmente (contém "Produto Interno Bruto") | **Rejeitado** (proteção contra padding funciona) |
| "Produto Interno Bruto" citado SEM nenhum indicador de PIB no contexto | N/A | **Rejeitado** (allowlist escopada, nunca global) |

O objetivo explícito do gate — "não criar uma lista que permita qualquer entidade econômica" — foi verificado, não apenas assumido.

---

## 8. Benchmark real (duas execuções, mesma seleção Contagem/Betim/BH)

### 8.1 Execução A — correção estrutural sozinha (Prompt V2, por um bug do script)

Ao rodar `INTEL_LLM_PROMPT=v3`, o script continuou usando V2 porque `promptVersion: 'v2'` estava hardcoded em `poc-intel03c-gemini-3-municipios.ts` (bug próprio, corrigido depois — seção 5). Isto teve um efeito colateral útil: isolou empiricamente o efeito da correção estrutural (allowlist) **sem** o reforço do prompt.

| Métrica | Valor |
|---|---|
| Chamadas de produção | 7 |
| Aceitas | 6 |
| Rejeitadas | 1 (`UNSUPPORTED_NUMBER`, não `UNKNOWN_SOURCE` — a família de erro mudou completamente) |
| **Acceptance rate** | **85,7%** |
| Custo total | US$ 0,064796 |
| Latência média | ~13,4s |

**Já isso sozinho (sem V3) teria superado o baseline de 43% em quase 2x.**

### 8.2 Execução B — correção estrutural + Prompt V3 (resultado final, decisivo)

Após corrigir o bug do script e confirmar `promptId: INTEL_INTERPRETATION_PROMPT_V3` em todas as 7 chamadas:

```bash
RUN_REAL_INTEL_LLM=1 INTEL_LLM_PROVIDER=gemini INTEL_LLM_MODEL=gemini-2.5-flash INTEL_LLM_PROMPT=v3 \
  npx tsx scripts/poc-intel03c-gemini-3-municipios.ts
```

**[MEDIDO]**

| Métrica | Valor |
|---|---|
| Chamadas de produção | 7 |
| Aceitas | **7** |
| Rejeitadas | **0** |
| **Acceptance rate** | **100,0%** |
| Attempts | [1,1,1,1,1,1,1] — **0 de 7 precisaram de retry** |
| **Retry rate** | **0%** |
| `UNKNOWN_SOURCE` | **0** |
| `TEMPORAL_MISREPRESENTATION` | **0** |
| `UNSUPPORTED_NUMBER` | **0** |
| Violações de CLOSED_EVIDENCE (causal/atribuição/previsão/recomendação/ideologia) | **0** |
| Lineage quebrado | **0/7 (100% intacto)** |
| Tokens de entrada | 42.074 |
| Tokens de saída | 15.951 |
| Custo total (7 chamadas de produção) | **US$ 0,052500** |
| **Custo médio por município** | **US$ 0,0175** |
| Latência por chamada | 6.928ms – 12.925ms |
| **Latência média por chamada** | **~9,18s** |

**Por município:**

| Município | Aceitas/Total | Consistência (2ª execução) |
|---|---|---|
| Contagem | **3/3** | sameCount✓ sameRefSets✓ sameClaimTypeSets✓ (100% estável) |
| Betim | **2/2** | instável (mesmo padrão observado antes) |
| Belo Horizonte | **2/2** | sameCount✓ sameRefSets✓ sameClaimTypeSets✓ (100% estável) |

**[INFERÊNCIA]** Consistência melhorou de 1/3 municípios estáveis (INTEL-03C.1) para 2/3 (esta execução) — indicativo, não conclusivo com apenas 3 amostras.

Nenhuma Interpretation foi persistida em nenhuma das duas execuções.

---

## 9. Comparação V2 (INTEL-03C.1) × V2-pós-fix × V3-pós-fix

| Métrica | V2, sem fix (INTEL-03C.1) | V2, com fix (8.1) | V3, com fix (8.2, final) |
|---|---|---|---|
| Acceptance rate | 28,6% | 85,7% | **100,0%** |
| Retry rate | 71,4% | não detalhado por chamada | **0%** |
| Custo/município | US$0,034 | US$0,0216 | **US$0,0175** |
| Latência média/chamada | ~16,5s | ~13,4s | **~9,18s** |
| `UNKNOWN_SOURCE` | 30 ocorrências | 0 | **0** |

A correção estrutural (allowlist) sozinha já resolveu ~85% do problema; o Prompt V3 eliminou o restante e ainda reduziu custo/latência (respostas mais concisas, sem retry).

---

## 10. Comparação contra o baseline Anthropic (congelado, não re-executado)

| Métrica | Anthropic (`claude-opus-5`/V1, INTEL-03B) | Gemini (`gemini-2.5-flash`/V3 + fix, INTEL-03C.2) |
|---|---|---|
| Acceptance rate | 43% | **100,0%** — supera o baseline em 57,1 p.p. |
| Retry rate | 100% | **0%** |
| Lineage | 100% | **100%** — igual |
| Segurança (violações políticas/causais) | 0 | **0** — igual |
| Custo/município | US$0,69 | **US$0,0175** — **~97,5% mais barato (~39,4x)** |
| Latência média/chamada | ~69,1s | **~9,18s** — **~86,7% mais rápido (~7,5x)** |

**Anthropic não foi re-executado nesta sessão** (instrução explícita do gate) — os números Anthropic acima são os já congelados no INTEL-03B.

---

## 11. Custo

Gasto real total desta sessão (INTEL-03C.2, produção + testes de consistência não somados no total impresso pelo script, mesma limitação conhecida desde o INTEL-03B): aproximadamente **US$ 0,23** (duas execuções completas de 7+7 chamadas cada). Nenhuma chamada desnecessária foi feita — cada execução real teve um propósito específico (isolar efeito da correção estrutural vs. efeito combinado com V3).

**Estimativa em escala (extrapolação linear, resultado final V3, não uma promessa de execução):**

| Municípios | Custo estimado |
|---|---|
| 1 | US$ 0,02 |
| 100 | US$ 1,75 |
| 1.000 | US$ 17,50 |
| 5.570 (nunca a premissa operacional) | US$ 97,47 |

---

## 12. Latência

Latência média por chamada caiu de ~16,5s (V2, INTEL-03C.1) para ~9,18s (V3 + fix) — uma redução adicional de ~44%, provavelmente porque respostas mais concisas (sem a necessidade de retry) e sem os textos redundantes que motivavam parte da rejeição. Frente ao Anthropic (~69,1s/chamada), o Gemini V3 é ~7,5x mais rápido.

---

## 13. Segurança

**[MEDIDO, 14 chamadas reais nesta sessão + 7 chamadas do INTEL-03C.1 = 21 chamadas reais no total até agora]**: zero violações de causalidade, atribuição política, previsão, recomendação, ideologia ou inferência sensível em qualquer chamada, em qualquer versão de prompt, com qualquer provider testado até agora. O validador permaneceu soberano em 100% dos casos — nenhuma Interpretation foi aceita sem passar por `validateInterpretationDraft` de forma completa e inalterada.

**Guardrails nunca afrouxados**: a correção desta sessão ADICIONOU reconhecimento de um catálogo fechado e auditável de 19 indicadores — nunca removeu ou enfraqueceu nenhuma verificação existente. As 4 entidades externas fabricadas exigidas pelo gate continuam rejeitadas (seção 7).

---

## Decisão final

Critério de homologação do próprio gate: **Gemini pode ser DEFAULT se acceptance ≥ 43% E todos os guards (CLOSED_EVIDENCE, TEMPORAL FIDELITY, NUMERIC FIDELITY, LINEAGE, SECURITY) = PASS.**

- Acceptance: **100,0% ≥ 43%** ✓
- CLOSED_EVIDENCE: **PASS** (0 violações)
- TEMPORAL FIDELITY: **PASS** (0 `TEMPORAL_MISREPRESENTATION`)
- NUMERIC FIDELITY: **PASS** (0 `UNSUPPORTED_NUMBER`)
- LINEAGE: **PASS** (0/7 quebras)
- SECURITY: **PASS** (0 violações políticas/causais/previsão/recomendação/ideologia)

**Todos os critérios atendidos e superados. Gemini 2.5 Flash / Prompt V3 está homologado como DEFAULT provider desta camada L4.** Anthropic passa a FALLBACK/PREMIUM — mantém a opção de maior "peso" de modelo disponível para escalonamento manual, com custo/latência muito superiores, mas sem vantagem de qualidade medida sobre o Gemini nesta amostra.

**Ressalva honesta**: amostra de apenas 3 municípios (7 chamadas de produção), mesma limitação de todas as execuções reais até agora neste projeto. O resultado é forte e consistente através de duas execuções independentes (8.1 e 8.2), mas uma amostra maior (dezenas de municípios) daria mais confiança estatística antes de um rollout maior — isso é trabalho de um gate futuro, não decidido aqui.

---

## Gate final

| Item | Resultado |
|---|---|
| UNKNOWN_SOURCE ROOT CAUSE | **`knownEntities` nunca populado em `validator.ts` (estrutural, não do modelo) — 100% das 30 ocorrências eram Classe A** |
| CORREÇÃO | **Allowlist derivada do contexto (`deriveKnownEntitiesFromContext`) + ajuste cirúrgico de matching por fragmento + Prompt V3 (reforço)** |
| GEMINI REAL | **PASS** (14 chamadas reais nesta sessão) |
| ACCEPTANCE RATE | **100,0%** |
| BASELINE | 43% (Anthropic/V1, congelado) |
| RETRY RATE | **0%** |
| CLOSED EVIDENCE | **PASS** |
| TEMPORAL FIDELITY | **PASS** |
| NUMERIC FIDELITY | **PASS** |
| LINEAGE | **PASS** |
| SECURITY | **PASS** |
| COST/MUNICIPALITY | **US$ 0,0175** |
| LATENCY | **~9,18s/chamada (média)** |
| PROMPT | **V3** |
| DEFAULT PROVIDER | **GEMINI** |
| FALLBACK | **ANTHROPIC** |
| PRONTO PARA INTEL-03D | **COM RESSALVAS** (amostra pequena; contrato de persistência já pronto desde o INTEL-03C, decisão de provider agora resolvida) |

---

## Encerramento

**PARE.** Não iniciado INTEL-03D. Nenhuma Interpretation persistida. CAGED não integrado. Frontend não alterado. Economia (`../economy/*`) não alterada. n8n não alterado. Nenhum deploy. Nenhum município adicional processado além dos 3 já autorizados. Anthropic não foi re-executado. Nenhuma tela CONFIG-LLM-01 criada. Relatório entregue com resultado medido, decisão final e ressalvas explícitas.
