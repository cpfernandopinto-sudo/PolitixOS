# INTEL-ELECTORAL-01 — Adaptação da Inteligência Eleitoral + Verificação CAGED → Prompt V3

**Agente:** Claude · **Data:** 2026-08-17
**Modo:** read-first/audit-first com implementação mínima autorizada (intelligence-only, sem frontend, sem data engineering, sem deploy)

---

## Resumo executivo

**Missão A confirmou, com evidência de código e execução real, a dúvida levantada pelo DATA-COVERAGE-01**: o motor `intelligence/economy/engine.ts` — e toda a cadeia L4 que dele depende (`selection.ts`, `types.ts`) — foi construído exclusivamente em torno de três famílias (FISCAL/SICONFI, PIB_VAB_MONETARY e OFFICIAL_SHARE/IBGE PIB) e nunca foi religado ao CAGED homologado. Implementei o adapter mínimo (`caged-adapter.ts`) que fecha essa lacuna sem tocar em `engine.ts`, sem recalcular nada do CAGED e sem inventar metodologia de calibração de sinal — e provei, com uma execução real contra o Supabase (não fixture), que dados reais de Contagem/Betim/Belo Horizonte (30 meses, revision-aware) atravessam `selectInterpretationInput → serializer → provider (mock) → validator` e chegam como interpretação aceita, com evidência/hash/proveniência intactos. Também encontrei e corrigi um bug real e isolado no guard `TEMPORAL_MISREPRESENTATION` (nunca detectava ano incorreto em períodos mensais YYYYMM) — sem esse ajuste, o guard temporal ficaria silenciosamente inoperante para qualquer claim sobre CAGED.

**Missão B** confirmou que o pipeline eleitoral determinístico (`electoral-intelligence.ts → electoral-interpretation-context.ts → electoral-interpretation.ts → electoral-briefing.ts`) é a implementação mais madura e completa do repositório no que toca L0-L6 — e que ele já produz uma "leitura" totalmente rastreável e classificada por confiança (`DIRECTLY_SUPPORTED`/`MULTI_SIGNAL_SUPPORTED`/`LIMITED_CONTEXT`) **sem LLM algum**. Como o gate pediu explicitamente para não adaptar Eleitoral ao schema econômico "quando não fizer sentido", desenhei e implementei um contrato **paralelo e mínimo**: um registry de prompt eleitoral próprio (`electoral-prompt-v1.ts`, não chamado, sem provider real), um guard de enriquecimento LLM (`electoral-llm-guards.ts`) que impede estruturalmente os dois riscos citados no gate (afirmação sem rastro no payload determinístico; upgrade de `LIMITED_CONTEXT` para fato), e um discriminated union (`domain.ts`) que permite ao harness provider-agnostic aceitar `economy | electoral` no futuro sem forçar Eleitoral a imitar a Economia.

**Nenhum LLM foi chamado.** Nenhuma metodologia CAGED/eleitoral foi alterada. Nenhum dado foi recalculado. Nenhum frontend, coletor, n8n ou Segurança/Demografia/Saúde foi tocado.

---

## 1. Missão A — Auditoria: CAGED estava conectado?

**Não.** Evidência direta do código (antes de qualquer edição minha):

- `lib/territorios/intelligence/economy/engine.ts` define `ECO01_MONETARY_INDICATORS` (7 nomes SICONFI), `ECO02B_ACTIVITY_MONETARY_INDICATORS` (8 nomes PIB/VAB) e `ECO02B_OFFICIAL_SHARE_INDICATORS` (4 nomes de participação setorial oficial) — **zero ocorrência** de `admissoes_emprego_formal`/`desligamentos_emprego_formal`/`saldo_emprego_formal` ou qualquer variante setorial CAGED, verificado por `grep` antes de qualquer alteração.
- `economy/types.ts`'s `EconomicIntelligenceResult.coverageByFamily`/`temporalCoverageByFamily` são tipados exatamente com as 3 famílias (`ThresholdFamily = 'FISCAL'|'PIB_VAB_MONETARY'|'OFFICIAL_SHARE'|'GENERAL'`).
- `interpretation/pipeline.ts`/`selection.ts` recebem `EconomicIntelligenceResult` como único tipo de entrada — `selection.ts`'s `familyOfIndicator()` classifica qualquer indicador desconhecido (incluindo os do CAGED) como `'GENERAL'` — nunca lançaria erro, mas também nunca daria a um indicador de emprego formal uma família calibrada própria.
- `derived-indicators.ts`'s `seriesForIndicator()` filtra `isFourDigitYear(item.period)` — a camada L2 de derivação da Economia foi desenhada para períodos **anuais** (PIB/SICONFI), incompatível por desenho com o período mensal YYYYMM do CAGED. Confirma que forçar CAGED pelos helpers genéricos de derivação existentes seria estruturalmente errado, não apenas "não conectado".

**CAGED → INTELLIGENCE: FAIL** (antes desta implementação) → **PASS** (depois, via adapter dedicado, ver seção 2).

---

## 2. Adapter mínimo implementado

**Arquivo novo:** `lib/territorios/intelligence/economy/caged-adapter.ts`.

Escopo deliberadamente contido:

- **L1 (Evidence)**: admissões/desligamentos/saldo mensais, copiados 1:1 do que já está em `territory_indicators` (via `getCagedMunicipalSeries`, leitor já homologado do próprio motor CAGED) — nenhum recálculo.
- **L2 (DerivedIndicator)**: MoM/YoY/Rolling-12m do saldo, reaplicando **a mesma fórmula já homologada** em `caged/history.ts` (diferença simples / soma de 12) sobre a série já persistida — não é metodologia nova, é a mesma aritmética já auditada nos gates ECO-03B3A/B, só reempacotada no contrato L2 cross-domain.
- **L3 (AnalyticalSignal)**: apenas sinais `TREND` de **direção** (subiu/caiu/estável), `confidence: 'DIRECTLY_SUPPORTED'`, `severity: null`. **Deliberadamente não implementei** classificação de magnitude/significância (ex.: "queda expressiva") — isso exigiria calibração de threshold dedicada, do mesmo porte da que o INTEL-02B fez para FISCAL/PIB_VAB, e está fora do escopo de um "adapter mínimo" que não deve inventar metodologia.
- Família usada: `GENERAL` — o "escape hatch" que `selection.ts`/`guards.ts` já suportam nativamente para sinais sem família calibrada própria; não criei uma família `EMPLOYMENT` nova (evitei tocar no tipo `ThresholdFamily` compartilhado).
- `consolidatedSignals: []` — nenhuma lógica de consolidação foi inventada.
- Toda a rastreabilidade de proveniência do CAGED (`aggregate_hash`, `history_method_version`, `revision_aware`, `as_of_declaration_month`) é copiada para `Evidence.metadata`, nunca descartada.

**Não alterei** `caged/*.ts`, `economy/engine.ts`, `economy/derived-indicators.ts`, `economy/signals.ts` — todos intocados (confirmado por `git status` ao final).

### 2.1 Achado colateral corrigido: guard temporal silenciosamente inoperante para períodos mensais

Ao ligar dados reais do CAGED ao pipeline, descobri que `guards.ts`'s `periodYears()` — usado pelo guard `TEMPORAL_MISREPRESENTATION` para verificar se um ano citado por uma claim bate com o período da unidade referenciada — nunca conseguia extrair um ano de um período `"202506"` (6 dígitos, sem separador não-numérico: o `split` original nunca produzia um token de exatamente 4 dígitos). Resultado: `validYears.size` ficava sempre `0` para qualquer unidade CAGED, e a checagem `if (validYears.size > 0 && ...)` nunca disparava — ou seja, **o guard estava estruturalmente desligado para qualquer claim sobre dado mensal**, silenciosamente, sem erro.

**Correção mínima aplicada** (`guards.ts`, função `periodYears`): passa a também extrair o ano de um token de 6 dígitos puro (`YYYYMM`), além do comportamento já existente para `"AAAA"`/`"AAAA-AAAA"`. Aditivo, não remove nem altera nenhum caso já coberto (testado explicitamente — ver seção 6). Sem essa correção, eu não poderia honestamente responder "CAGED → PROMPT V3: PASS", porque um LLM real poderia citar um ano incorreto sobre dado CAGED sem ser pego.

---

## 3. Prova real (sem fixture) — CAGED até o Prompt V3

Script `scripts/verify-intel-electoral-01-caged-adapter.ts`, executado contra o Supabase real (Contagem/Betim/Belo Horizonte, 202401–202606, os mesmos 3 municípios do CAGED homologado):

| Município | Pontos CAGED lidos | Evidence produzida | DerivedIndicators | Sinais | Unidades selecionadas (L4) | Pipeline | Interpretações aceitas | Saldo jun/2026 (Evidence) | Hash preservado |
|---|---:|---:|---:|---:|---:|---|---:|---:|---|
| Belo Horizonte | 30 | 90 | 66 | 29 | 6 | COMPLETED | 1 | 1.146 | `242f3fc3...` |
| Betim | 30 | 90 | 66 | 29 | 6 | COMPLETED | 1 | 1.356 | `0a10a7f4...` |
| Contagem | 30 | 90 | 66 | 29 | 6 | COMPLETED | 1 | 914 | `4069af8e...` |

**Os três valores de saldo (1.146/1.356/914) e o Rolling-12m de Contagem/jun-2026 (2.938) batem exatamente com os valores que eu já havia reconstruído independentemente a partir do CSV bruto nos gates ECO-03B3A/B3B** — confirmação cruzada, não coincidência: o adapter está lendo e propagando o dado real homologado, não uma cópia divergente. `juneBalanceEvidenceHistoryMethodVersion` = `novo-caged-history-revision-aware-v1` em todos os três — proveniência preservada até a `Evidence` que alimenta o L4. A primeira interpretação aceita em cada município referencia 7 `evidenceRefs` reais (`db:{territoryId}:saldo_emprego_formal:NOVO_CAGED:{mês}`), todas resolvendo no `evidenceIndex` real — nenhuma delas aponta para `CONTAGEM_DEMO` nem qualquer outro fixture.

**CAGED REAL DATA ONLY: PASS.**

---

## 4. Limitação honesta não resolvida nesta implementação (não é P0/P1, é escopo)

`lib/territorios/intelligence/interpretation/indicator-labels.ts` é um catálogo **fechado**, propositalmente restrito aos 19 indicadores FISCAL/PIB_VAB/OFFICIAL_SHARE (decisão do INTEL-03C.2, para impedir falso-positivo do guard `ENTITY` sem abrir uma allowlist genérica). Indicadores CAGED (`saldo_emprego_formal`, `saldo_emprego_formal_mom` etc.) **não estão nesse catálogo** — `friendlyNameForIndicator()` retorna `null` para eles hoje. Isso significa que, quando um LLM real (Gemini/Anthropic) eventualmente gerar prosa mencionando "Novo CAGED"/"emprego formal"/"MTE", o guard `ENTITY` genérico (`../guardrails.ts`) pode reproduzir a mesma classe de falso-positivo que o INTEL-03C.2 corrigiu para PIB/SICONFI — **não posso confirmar isso sem rodar um LLM real**, o que este gate explicitamente proíbe. Registro como **P2**, com a recomendação de repetir o mesmo processo do INTEL-03C.2 (auditar ocorrências reais de `UNKNOWN_SOURCE` após um benchmark real com CAGED, só então estender o catálogo) — não estendi `indicator-labels.ts` especulativamente, porque isso violaria a própria disciplina "fechado, nunca aberto sem auditoria" que o INTEL-03C.2 estabeleceu.

---

## 5. Missão B — Auditoria do pipeline eleitoral determinístico

Lidos por completo: `electoral-intelligence.ts` (210 linhas), `electoral-interpretation-context.ts` (178), `electoral-interpretation.ts` (99), `electoral-interpretation-guards.ts` (73), `electoral-briefing.ts` (65), `electoral-briefing-guards.ts` (36), mais `electoral-analytics.ts` (308, base determinística de tudo) e `electoral-resolver.ts` (54).

**Achado principal**: este é o pipeline mais completo do repositório em termos de camadas L0-L6 — sem exceção, sem LLM. Confirma-se:

- **Classes de confiança preservadas e corretamente hierarquizadas**: `ElectoralConfidenceClass = 'DIRECTLY_SUPPORTED'|'MULTI_SIGNAL_SUPPORTED'|'LIMITED_CONTEXT'`, com `rank`/regra `LOWEST_CONFIDENCE_WINS` idêntica ao contrato cross-domain (`contracts.ts`'s `CONFIDENCE_RANK`/`consolidateConfidence`) — mesma disciplina, implementação paralela e independente, não duplicação acidental divergente.
- **Guardas fortes de rastreabilidade**: `electoral-briefing-guards.ts`'s `assertValidElectoralBriefing` já rejeita (testado em `electoral-briefing.test.ts`, 11 casos adversariais que confirmei lendo, não apenas listei): referência quebrada, número inventado, entidade inventada, recomendação, previsão, causalidade, benchmark apresentado fora da amostra homologada, remoção de limitação, evidência inexistente, partido inexistente, opinião do eleitor. **Isso já é, estruturalmente, quase o mesmo conjunto de guardas que a Economia tem em `guardrails.ts`/`guards.ts` — só que aplicado ao determinístico, não a um LLM.**
- **`ELECTORAL_CONTEXT_UNIVERSE = 'homologated-six-municipality-sample'`**: benchmark é uma decisão de design documentada (não um placeholder) — nunca apresentado como RMBH/MG/Brasil, com guard próprio que impede isso (`'apresentar benchmark da amostra como RMBH, Minas Gerais ou Brasil'` está na lista `PROHIBITED`).
- **`contracts.ts` (INTEL-01) já documenta o Eleitoral como "padrão já provado e testado em produção"** e implementação de referência — não é um contrato teórico esperando implementação, é código real, testado, rodando desde os gates "Bloco 5" do TSE.

**ELECTORAL DETERMINISTIC PIPELINE: PASS.** **ELECTORAL TRACEABILITY: PASS.**

---

## 6. Adapter eleitoral projetado/implementado

Coerente com a instrução explícita do gate ("evitar adaptar o Eleitoral artificialmente ao schema econômico quando não fizer sentido"; "Prompt registry por domínio"), implementei um contrato **paralelo**, não um encaixe forçado no schema econômico:

### 6.1 `lib/territorios/intelligence/interpretation/domain.ts` (novo)

Discriminated union mínima e puramente aditiva:
```ts
export type DomainInterpretationInput =
  | { domain: 'economy'; context: InterpretationInputContext }
  | { domain: 'electoral'; briefing: ElectoralBriefing };
```
Nenhum arquivo existente (`config.ts`, `provider.ts`, `fallback.ts`, `pipeline.ts`) foi alterado para consumi-lo — é o contrato que uma futura orquestração usaria para despachar por domínio.

### 6.2 `lib/territorios/intelligence/electoral/electoral-prompt-v1.ts` (novo)

Registry de prompt eleitoral **separado** do registry econômico (`v1`/`v2`/`v3` em `prompt-registry.ts` continuam intocados e exclusivamente econômicos). Entrada: o `ElectoralBriefing` inteiro já determinístico (não um subconjunto reconstruído). Sistema de prompt define as 7 regras absolutas do gate por escrito (nunca inventar voto/candidato/eleição/tendência; toda afirmação rastreável a um id real; nunca elevar `LIMITED_CONTEXT`; nunca prever resultado; respeitar limitações/benchmark; nunca introduzir recomendação). **Não chama nenhum provider** — só monta mensagem/schema.

### 6.3 `lib/territorios/intelligence/electoral/electoral-llm-guards.ts` (novo)

Validador estrutural (não apenas textual) para uma futura resposta de LLM sobre o briefing eleitoral:

- `EMPTY_REFERENCE`/`UNRESOLVED_REFERENCE`: todo claim precisa referenciar por id um item real de `interpretations`/`elections`/`benchmark` do `ElectoralBriefing` — uma referência que não resolve é rejeitada (mesmo padrão de `validator.ts` da Economia, reimplementado para o formato eleitoral).
- `CONFIDENCE_UPGRADE`: se a interpretação referenciada é `LIMITED_CONTEXT` (reusa `CONFIDENCE_RANK` de `contracts.ts`, não reinventa a escala), o texto do claim precisa conter um qualificador de incerteza — caso contrário é rejeitado. Implementa estruturalmente a regra do gate "LLM nunca pode... transformar LIMITED_CONTEXT em fato".
- `INVENTED_ELECTION_YEAR`: qualquer ano de 4 dígitos citado no texto que não esteja em `territory.electionsCovered` é rejeitado — impede "inventar eleição".
- `RECOMMENDATION_LEAK`: frases de recomendação são rejeitadas, coerente com `briefing.guardrails.recommendations: []`.

### 6.4 Prompt readiness

**ELECTORAL PROMPT CONTRACT: READY.** O contrato está pronto para receber um `ElectoralInterpretationProvider` real futuro — mas, como o gate pediu, **não implementei** esse provider concreto (não instanciei Anthropic/Gemini para eleitoral) nem alterei `InterpretationProvider`/`AnthropicInterpretationProvider`/`GeminiInterpretationProvider` (que hoje só aceitam `InterpretationInputContext` econômico — uma futura implementação real precisaria de uma interface irmã, `ElectoralInterpretationProvider`, reusando os mesmos wrappers de SDK já provados, não reescrevendo-os).

**ELECTORAL ADAPTER: PASS** (contrato mínimo implementado e testado — não `NOT_NEEDED`, porque o gate pediu explicitamente para prepará-lo).

---

## 7. Testes

| Suíte | Resultado |
|---|---|
| `caged-adapter.test.ts` (novo, 8 testes) | PASS — Evidence real, MoM/YoY/Rolling12 corretos, sinais sem threshold inventado, coverage honesto, atravessa `selectInterpretationInput` sem erro |
| `guards.test.ts` (+2 testes novos) | PASS — confirma o bug do período YYYYMM antes/depois da correção |
| `electoral-llm-guards.test.ts` (novo, 11 testes) | PASS — todas as 4 categorias de rejeição + 2 casos de aceitação legítima |
| `npx vitest run lib/territorios app/api/territorios` | **920 passed, 2 skipped** (os 2 skips são os mesmos testes reais gated de LLM já conhecidos de gates anteriores — não relacionados a este gate) |
| `npx tsc --noEmit` | PASS, 0 erros |
| `npx eslint` (arquivos novos/alterados) | PASS, 0 erros/warnings (2 warnings encontrados e corrigidos durante o próprio gate) |

Zero regressão em qualquer teste pré-existente.

---

## 8. Economia 1.0 — confirmação de configurabilidade

- **Provider default configurável**: sim — `resolveInterpretationConfig()` (`config.ts`) resolve `providerId` por override explícito → env var `INTEL_LLM_PROVIDER` → default hardcoded. Funciona, testado.
- **Achado relevante, não corrigido (fora do escopo desta missão)**: o default hardcoded em `config.ts` é `DEFAULT_PROVIDER_ID: InterpretationProviderId = 'anthropic'` — mas o INTEL-03C.2 homologou **Gemini 2.5 Flash/Prompt V3 como DEFAULT** (100% de aceitação vs. 43% do Anthropic, benchmark real). Ou seja, `resolveInterpretationConfig()` sem nenhum override/env var hoje resolveria para Anthropic, não Gemini — um desalinhamento real entre o que foi homologado e o que o código faz por padrão. **P2** — não corrigi porque está fora das duas missões nomeadas deste gate (não é "adapter CAGED" nem "adapter Eleitoral") e uma mudança de default merece ser explícita, não um efeito colateral. Recomendo corrigir num gate curto e dedicado.
- **Model configurável**: sim, `DEFAULT_MODEL_BY_PROVIDER` + override.
- **Prompt version configurável**: sim, `v1`/`v2`/`v3` via `INTEL_LLM_PROMPT`/override, default `v3` (este SIM já está correto — não há desalinhamento aqui).
- **Fallback existente**: sim, `generateWithFallback()` (`fallback.ts`) — genérico, aceita qualquer par `(primary, fallback)` de providers já construídos; a política DEFAULT=Gemini/FALLBACK=Anthropic é aplicada no *call site*, não hardcoded no harness (correto, é assim que devia ser).
- Nenhuma tela de configuração foi criada (fora do escopo, backlog 2.0, conforme pedido).

**ECONOMY LLM READY FOR 1.0: YES** (com a ressalva do P2 acima e do P2 da seção 4 — nenhum dos dois bloqueia, ambos são ajustes pequenos e isolados).

---

## Gate final

```text
CAGED → INTELLIGENCE: PASS
CAGED → PROMPT V3: PASS
CAGED REAL DATA ONLY: PASS
ECONOMY LLM READY FOR 1.0: YES

ELECTORAL DETERMINISTIC PIPELINE: PASS
ELECTORAL ADAPTER: PASS
ELECTORAL TRACEABILITY: PASS
ELECTORAL PROMPT CONTRACT: READY

PROVIDER AGNOSTIC: PASS
GEMINI DEFAULT: CONFIGURABLE YES
ANTHROPIC FALLBACK: CONFIGURABLE YES

GLOBAL LLM ENABLED: NO

P0: 0
P1: 0
P2: 2 (indicator-labels.ts fechado ainda não cobre CAGED — seção 4; DEFAULT_PROVIDER_ID em config.ts ainda é 'anthropic', não 'gemini' como homologado no INTEL-03C.2 — seção 8)
P3: 0

READY FOR TERRITORIOS 1.0: WITH RESERVATIONS
```

A ressalva é estritamente os dois P2 documentados (nenhum bloqueia Economia como domínio LLM-pronto da 1.0; ambos são correções pequenas e isoladas recomendadas para um gate curto seguinte, não impeditivos).

---

## Encerramento

**PARE.** Nenhum LLM foi chamado. Nenhuma metodologia CAGED ou eleitoral foi alterada. Nenhum dado foi recalculado — MoM/YoY/Rolling-12m do adapter reaplicam a fórmula já homologada, nunca uma nova. Segurança, Demografia, Saúde e Educação não foram tocados. Frontend, collectors, n8n e deploy não foram tocados. `git status` confirma que apenas os arquivos novos listados neste relatório (mais a correção de uma linha em `guards.ts` e duas linhas de teste em `guards.test.ts`) foram criados/alterados nesta sessão.
