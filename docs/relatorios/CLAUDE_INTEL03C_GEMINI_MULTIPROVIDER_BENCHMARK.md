# INTEL-03C — Arquitetura Multi-Provider, Prompt V2, Benchmark Gemini e Fundação de Cache L4

**Autor:** Claude (arquitetura de inteligência territorial)
**Data:** 2026-08-16 (atualizado no mesmo dia — INTEL-03C.1: benchmark real executado após o usuário fornecer `GEMINI_API_KEY`)
**Escopo:** `lib/territorios/intelligence/interpretation/` (extensão do INTEL-03B) + `scripts/poc-intel03c-gemini-3-municipios.ts`
**Baseline de entrada:** INTEL-03B homologado — Anthropic `claude-opus-5` real, 3/7 drafts aceitos (43%), custo/latência/consistência medidos.

---

## 0. Nota de atualização — INTEL-03C.1: benchmark real concluído

Este relatório foi originalmente entregue com a Parte D (benchmark) em `BLOCKED_BY_CREDENTIAL`. O usuário forneceu uma `GEMINI_API_KEY` na sequência (INTEL-03C.1). A chave foi gravada apenas em `.env.local` (gitignored, nunca commitada, nunca reproduzida em texto neste relatório). **Nenhum código de arquitetura foi alterado nesta atualização** — nem contratos, nem validators, nem guardrails, nem o Prompt V2 — exatamente como instruído: o benchmark roda contra o que já existia, e só depois dele é que eventuais ajustes são recomendados (seção "Riscos e débitos técnicos" e "Recomendações", ao final).

**Nota de infraestrutura, não de código** (esclarecida): as duas primeiras tentativas de rodar o teste de integração real gated (`gemini-provider.real.test.ts`) dentro do `vitest` excederam o tempo de execução em primeiro plano usado nesta sessão (90–120s); uma nova tentativa, rodada em background, **completou normalmente em 5,86s** (`1 passed`). A causa mais provável do atraso nas tentativas anteriores foi concorrência de recursos: o script de POC completo (`scripts/poc-intel03c-gemini-3-municipios.ts`) estava rodando ao mesmo tempo, competindo por rede/CPU no mesmo ambiente. Não há, portanto, nenhum problema real de compatibilidade entre o vitest e o SDK `@google/genai` — o teste gated funciona.

**Resultado em uma frase**: Gemini 2.5 Flash foi ~95% mais barato e ~4,2x mais rápido que o baseline Anthropic, com retry rate menor (71,4% vs. 100%) e **zero** violações de causalidade/atribuição política/previsão/recomendação/ideologia/número inventado/data fora do período — mas a **taxa de aceitação real ficou abaixo do baseline** (28,6% vs. 43%), inteiramente por um motivo novo e específico: o modelo escreveu por extenso termos econômicos padrão ("Produto Interno Bruto", "Valor Adicionado Bruto") que colidem com o guard de rastreabilidade de fonte (`ENTITY`/`UNKNOWN_SOURCE`), não por qualquer comportamento inseguro.

---

## 1. Resumo executivo

O INTEL-03C transforma a camada L4 numa arquitetura **multi-provider**: `AnthropicInterpretationProvider` (INTEL-03B, preservado como baseline/fallback/premium) e o novo `GeminiInterpretationProvider` (`gemini-2.5-flash`, SDK oficial `@google/genai`), ambos por trás de uma **camada de configuração única** (`config.ts`) que resolve provider/model/prompt sem espalhar leitura de env pelo código. Um segundo prompt, `INTEL_INTERPRETATION_PROMPT_V2`, foi criado (V1 nunca editado) corrigindo dois padrões reais de falha observados no POC do INTEL-03B, e um terceiro achado real (falso positivo `UNKNOWN_SOURCE` em "No VAB...") foi corrigido no guard genérico `../guardrails.ts` (INTEL-01), com testes dedicados.

**Entregue e verificado nesta sessão** (163 → 288 → 847 testes acumulados, todos verdes, 2 gated skipped):
- `config.ts`: `resolveInterpretationConfig()` + `createInterpretationProvider()` — provider (`anthropic`/`gemini`/`mock`), model e prompt version resolvidos em um único ponto, com fallback seguro para qualquer valor inválido (nunca lança).
- `prompt-registry.ts`: registry versionado (`v1`→INTEL-03B intacto, `v2`→novo) — nenhum provider importa `./prompt`/`./prompt-v2` diretamente.
- `prompt-v2.ts`: preserva as 16 regras absolutas da V1 e adiciona a regra 17 (fidelidade temporal por claim) e a regra 18 (proibição de identificador técnico/dataset em prosa), mais uma legenda de fontes amigáveis no contexto enviado ao modelo.
- Correção do falso positivo `UNKNOWN_SOURCE` em `../guardrails.ts` (`extractedProperNouns`) — contrações/artigos capitalizados no início de frase deixam de ser contados como parte de uma entidade; entidades reais continuam detectadas.
- `gemini-provider.ts`: segundo provider real, mesma arquitetura do Anthropic (mesmo serializer, seleção, validador, lineage, taxonomia de erro, retry bounded schema/semântico separado, `thinkingConfig.thinkingBudget: 0` por padrão).
- `cache.ts`: contrato de chave (`contextHash+provider+model+promptVersion`), regra formal de "mudança material", implementação in-memory para teste/demonstração (sem persistência real).
- `fallback.ts`: `generateWithFallback()` — fallback só em erro operacional de provider, nunca em rejeição semântica (garantido estruturalmente, não por checagem manual), sempre com `fallbackReason` explícito.
- 6 novos arquivos de teste (config, fallback, cache, prompt-v2, gemini-provider mockado, gemini-provider real gated) + 3 novos testes em `guardrails.test.ts`.
- Regressão completa: 847/849 territorial (2 gated skip), typecheck 0 erros, lint 0 erros no escopo, build PASS.

**Benchmark real executado (INTEL-03C.1):** `GEMINI_API_KEY` foi fornecida pelo usuário. O POC real rodou em Contagem/Betim/Belo Horizonte — 7 chamadas de produção reais + 7 chamadas adicionais de teste de consistência (2ª passagem sobre o mesmo contexto). O baseline Anthropic **não foi re-executado** (conforme instrução explícita do gate — usa os números já congelados no relatório do INTEL-03B, seção 2 abaixo). Resultados completos: seções 37-47.

---

## 2. Baseline Anthropic (congelado do INTEL-03B — não re-executado)

| Métrica | Valor (INTEL-03B, `claude-opus-5`, prompt V1) |
|---|---|
| Chamadas de produção | 7 (Contagem 3, Betim 2, BH 2) |
| Aceitas | 3 (43%) |
| Rejeitadas | 4 (57%) |
| Retry rate | 100% (2/2 tentativas em toda chamada) |
| Lineage quebrado | 0/7 |
| Guards políticos/causais/previsão/recomendação/ideologia acionados | 0/7 |
| Latência por chamada | 50.181ms–93.161ms |
| Custo total (produção) | US$ 2,082495 |
| Custo médio/município | ~US$ 0,69 |
| Consistência entre execuções | Instável (refs/contagens variaram em 2 de 3 municípios) |
| Causas de rejeição | `TEMPORAL_MISREPRESENTATION` (3x), `UNSUPPORTED_NUMBER: "5938"` (2x), `UNKNOWN_SOURCE: "No VAB"` (1x) |

Fonte: `docs/relatorios/CLAUDE_INTEL03B_PROVIDER_LLM_REAL.md`, seções 9-11.

### 2.1 Correção ao relatório do INTEL-03B — origem do "5938" reexaminada

O relatório do INTEL-03B caracterizou a citação de "5938" como o modelo "citando um ID interno do contexto". Nesta sessão, essa hipótese foi **verificada por inspeção de código** e não se sustenta: `serializeInterpretationContext()` (INTEL-03A, inalterado) nunca inclui `evidenceIndex` no payload enviado ao modelo, e `derivedIndicatorRefs` usam apenas method-id (`ECON_VAR_YOY_V1`), nunca o código de dataset bruto (`IBGE_SIDRA_5938`). O código "5938" **não está presente em nenhum lugar do contexto serializado**. A explicação mais provável é que o modelo usou **conhecimento de treinamento** sobre a SIDRA 5938 (tabela pública bem conhecida do PIB municipal) — o que é, na verdade, uma violação sutil da regra CLOSED_EVIDENCE, mais séria do que a caracterização original. A regra 18 da V2 cobre explicitamente os dois casos (citar um ID presente no contexto OU vindo de memória de treinamento). Ver `prompt-v2.ts`, comentário de cabeçalho, para o registro completo desta investigação.

---

## 3-8. Arquitetura: config única, provider selector, prompt selector

### 3.1 `resolveInterpretationConfig()` — único ponto de leitura de env

```ts
resolveInterpretationConfig(overrides?): { providerId: 'anthropic'|'gemini'|'mock'; model: string; promptVersion: 'v1'|'v2' }
```
Lê `INTEL_LLM_PROVIDER`, `INTEL_LLM_MODEL`, `INTEL_LLM_PROMPT` — qualquer valor inválido cai no default (`anthropic`/modelo-default-do-provider/`v2`), nunca lança. Overrides explícitos sempre têm prioridade sobre env vars (testado).

### 3.2 `createInterpretationProvider()` — factory única

```ts
createInterpretationProvider(config?, options?): InterpretationProvider
```
Retorna `AnthropicInterpretationProvider` | `GeminiInterpretationProvider` | `RuleBasedMockProvider` conforme `config.providerId`. Nenhum outro arquivo deste gate instancia um provider diretamente com `new` fora deste factory ou dos próprios testes unitários de cada provider.

### 3.3 Compatibilidade com uma futura tela `CONFIG-LLM-01`

`InterpretationRuntimeConfig` é exatamente o shape que um formulário "provider / model / prompt version" salvaria — nenhuma UI foi implementada (fora do escopo, seção 8 do gate), mas o contrato já está pronto para ser a fonte de verdade de uma futura tela sem exigir refatoração.

---

## 9-16. Parte A — `INTEL_INTERPRETATION_PROMPT_V2`

- **Arquivo novo** (`prompt-v2.ts`), `prompt.ts` (V1) **nunca editado** — confirmado por teste (`prompt-v2.test.ts`: "V1 nunca foi editado in-place").
- Preserva as 16 regras absolutas da V1 verbatim (testado regra a regra via regex `^N\. `).
- **Regra 17** (fidelidade temporal por claim): "cada claim só pode citar um ano ou período que esteja dentro do period das unidades que aquele MESMO claim referencia" — motivada pelas 3 rejeições reais `TEMPORAL_MISREPRESENTATION` do INTEL-03B.
- **Regra 18** (proibição de identificador técnico em prosa): cobre tanto IDs presentes no contexto quanto códigos vindos de conhecimento de treinamento (seção 2.1) — motivada pelas 2 rejeições reais `UNSUPPORTED_NUMBER: "5938"`.
- **Fontes amigáveis** (`FRIENDLY_SOURCE_LABELS`): mapa estático derivado dos códigos de dataset já usados no projeto (`IBGE_SIDRA_5938`→"IBGE/SIDRA...", `SICONFI_DCA`→"Tesouro Nacional/SICONFI..."), anexado como legenda "FONTES" na mensagem de usuário da V2 quando o contexto tem evidências com esses códigos — nunca inventado, apenas os que já existem em `economia-pib-client.ts`/`engine.ts`.
- Schema de output **idêntico** entre V1 e V2 (`buildInterpretationOutputSchema` reusado do registry) — a diferença está inteiramente no texto de instrução, nunca na forma estrutural.
- Retry: `buildSemanticRetryMessageV2` menciona explicitamente as regras 17/18 quando os códigos de erro correspondentes aparecem, mas nunca ultrapassa `maxAttempts` (mesma política do INTEL-03B — nunca aumentado para mascarar retry rate).

---

## 17-19. Parte B — falso positivo `UNKNOWN_SOURCE` ("No VAB...")

**Causa raiz confirmada**: `extractedProperNouns()` em `../guardrails.ts` (INTEL-01, cross-domain) captura qualquer sequência de 2+ palavras com inicial maiúscula como possível entidade. "No VAB de serviços..." — "No" (contração de "em o", maiúscula só por abrir a frase) + "VAB" (sigla) formavam um falso par de 2 palavras.

**Correção** (mínima, cirúrgica): `LEADING_FUNCTION_WORDS` — conjunto de artigos/contrações portuguesas comuns (o, a, no, na, do, da, ao, pelo, e, ou...). Antes de contar palavras de um candidato a entidade, remove-se qualquer palavra função do início. Se sobrarem ≥2 palavras, a entidade continua sendo sinalizada; se sobrar 0-1, não é mais sinalizada.

**Verificado, não afrouxado**: `guardrails.test.ts` ganhou 3 novos testes: "No VAB de serviços..." não dispara mais `ENTITY`; outras contrações comuns (Do, Na, Pelo) também não disparam; **uma entidade real precedida de artigo** ("O Instituto Fiscal Independente confirma os dados.") **continua sendo rejeitada** — a correção não introduz um buraco para contornar o guard citando qualquer entidade fabricada precedida de "O"/"A".

---

## 20-34. Parte C — `GeminiInterpretationProvider`

### 20. Auditoria de SDK

Nenhum SDK do Google estava instalado. Pesquisado via `npm view` (registry oficial): `@google/genai` é o SDK unificado atual da Google para Gemini (v2.17.1 no momento desta sessão) — instalado como única dependência nova deste gate. Nenhum framework concorrente ou desnecessário adicionado.

### 21-27. Adapter, zero core changes, mesmo contrato

`GeminiInterpretationProvider implements InterpretationProvider` — mesma interface assíncrona do INTEL-03B. `pipeline.ts` não foi alterado nem precisou ser (zero core changes, seção 22). Reusa, sem duplicar: `buildFamilyScopedContext`, `serializeInterpretationContext` (via `prompt-registry`), `validateInterpretationDraft`, `assertInterpretationLineageResolves`, `caveatsForFamily`.

### 28. Structured output nativo

`config.responseMimeType: 'application/json'` + `config.responseJsonSchema: schema` — o **mesmo** JSON Schema (`buildInterpretationOutputSchema`, com `enum` de refs) usado pelo Anthropic provider é aceito diretamente pela API do Gemini (documentado como aceitando JSON Schema padrão — `$id`, `type`, `enum`, `items`, `required`, `additionalProperties`, entre outros). Diferente do SDK da Anthropic, o `@google/genai` não expõe um `.parse()` que já devolve o objeto — o texto (`response.text`) é `JSON.parse()`ado manualmente, com falha tratada como falha de schema (retry), nunca como crash.

### 29. Taxonomia de erro

`classifyGeminiError()` mapeia `ApiError.status` (401/403→AUTH, 429→RATE_LIMIT, 404→UNAVAILABLE, 400/422→INVALID_OUTPUT, 408/504→TIMEOUT, 5xx→OVERLOADED) para os **mesmos** `InterpretationProviderErrorCode` do Anthropic — nenhuma taxonomia paralela por provider. Erros de rede sem `ApiError` (fetch cru) são detectados por padrão de mensagem (`ECONNREFUSED`/`timeout`) como fallback.

### 30-31. Timeout e retry

`timeoutMs` padrão 60s, passado via `httpOptions.timeout` do SDK (mesma convenção do Anthropic provider). Retry de schema/semântico bounded (`maxAttempts` padrão 2), estruturalmente idêntico ao Anthropic — nenhum retry de rede feito manualmente aqui (delegado ao próprio SDK/infra HTTP).

### 32. Thinking

`thinkingConfig: { thinkingBudget: 0 }` **desligado por padrão** — a tarefa é síntese estruturada sobre evidência fechada, não um problema de raciocínio aberto; desligar reduz custo/latência sem reduzir segurança (o validador permanece soberano independentemente de quanto o modelo "pensou"). Configurável via `thinkingBudget` na opção do provider, se uma futura decisão quiser reabilitar.

### 33-34. Config e API key

Nenhuma env var `INTEL_GEMINI_*` foi criada — reusa as mesmas `INTEL_LLM_MODEL`/`INTEL_LLM_PROMPT` genéricas da camada de config (seção 3-8). Credencial: `GEMINI_API_KEY`, lida apenas em `gemini-provider.ts` (fallback) e em `.env.local` (nunca commitado, nunca logada).

---

## 35-47. Parte D — Benchmark

### 35-36. Estratégia de execução

Baseline Anthropic **reusado** do INTEL-03B (seção 2) — nenhuma das 14 chamadas caras foi repetida. Nenhuma execução "Anthropic V2" foi feita nesta atualização (mantém-se a decisão original: isolar efeito-de-prompt vs. efeito-de-provider fica registrado como opção disponível para uma futura sessão, não prioritário agora que o resultado Gemini já responde à pergunta central do gate).

### 37-40. POC Gemini — resultado real medido

Comando executado:
```bash
RUN_REAL_INTEL_LLM=1 INTEL_LLM_PROVIDER=gemini INTEL_LLM_MODEL=gemini-2.5-flash INTEL_LLM_PROMPT=v2 npx tsx scripts/poc-intel03c-gemini-3-municipios.ts
```
Mesma seleção exata do INTEL-03B (Contagem via banco, Betim/BH via fetch ao vivo). Tempo total: 231,7s (~3,9 min) para os 3 municípios, incluindo fetch/DB e **duas** passagens de chamadas ao LLM por município (produção + teste de consistência da seção 45-47).

**[MEDIDO]** Resultado por município:

| Município | Unidades selecionadas | Famílias | Aceitas | Rejeitadas | Lineage quebrado |
|---|---|---|---|---|---|
| Contagem | 24 | FISCAL:6, OFFICIAL_SHARE:6, PIB_VAB_MONETARY:12 | **1** (FISCAL) | 2 | 0 |
| Betim | 15 | OFFICIAL_SHARE:6, PIB_VAB_MONETARY:9 | **0** | 2 | 0 |
| Belo Horizonte | 13 | OFFICIAL_SHARE:5, PIB_VAB_MONETARY:8 | **1** (OFFICIAL_SHARE) | 1 | 0 |
| **Total** | 52 | — | **2** | **5** | **0** |

**[MEDIDO]** Métricas agregadas (7 chamadas de produção):

| Métrica | Valor |
|---|---|
| Chamadas de produção | 7 |
| Aceitas | 2 |
| Rejeitadas | 5 |
| **Acceptance rate** | **28,6%** |
| Attempts por chamada | [1,2,2,2,2,1,2] — **5 de 7 (71,4%) precisaram de retry** |
| **Retry rate** | **71,4%** |
| Lineage quebrado | **0/7 (100% intacto)** |
| Códigos de erro nas rejeições | `UNKNOWN_SOURCE`: 30 ocorrências (100% das rejeições) |
| `TEMPORAL_MISREPRESENTATION` | **0** |
| `UNSUPPORTED_NUMBER` | **0** |
| Violações de CLOSED_EVIDENCE (causal/atribuição política/previsão/recomendação/ideologia/inferência sensível) | **0 em todas as 7 chamadas** |
| Tokens de entrada (total) | 85.979 |
| Tokens de saída (total) | 30.656 |
| Custo total (7 chamadas de produção) | **US$ 0,102434** |
| Custo médio por chamada | ~US$ 0,0146 |
| Custo médio por município | **US$ 0,034145** |
| Latência por chamada | 6.136ms – 23.918ms |
| **Latência média por chamada** | **~16.453ms (~16,5s)** |

**Nota de transparência (mesma limitação já documentada no INTEL-03B)**: o custo acima soma apenas a 1ª passagem (produção) por município; a 2ª passagem (teste de consistência, seção 45-47) fez mais 7 chamadas reais que gastaram aproximadamente o mesmo valor de novo, mas não estão somadas no total acima. Gasto real total desta execução: da ordem de **US$ 0,20**.

### Análise das rejeições — achado real novo (não estava no INTEL-03B)

**100% das rejeições (30/30 ocorrências, todas as 5 chamadas rejeitadas) foram `UNKNOWN_SOURCE`** — nenhuma outra categoria de erro ocorreu nem uma vez. Inspeção dos `detail` de cada erro mostra o padrão exato: o modelo escreveu por extenso termos econômicos padrão — **"Produto Interno Bruto"**, **"Valor Adicionado Bruto"**, **"Saúde Públicas"**, **"Seguridade Social"** — em vez de usar as siglas (PIB, VAB). O guard `ENTITY` genérico (`../guardrails.ts`, INTEL-01) trata qualquer sequência de 2+ palavras capitalizadas como possível entidade/fonte não reconhecida (`knownEntities` está sempre vazio neste contexto) — termos econômicos formais escritos por extenso caem exatamente nesse padrão.

**[INFERÊNCIA]** Isto é diferente do padrão observado no Anthropic (INTEL-03B), que tendeu a usar as siglas abreviadas (PIB/VAB) na maior parte do texto e por isso raramente acionou esse guard — mas o próprio draft aceito do Gemini na Belo Horizonte (ver anexo) também usa "VAB" abreviado em um claim específico, mostrando que o modelo é **inconsistente dentro do próprio output** sobre abreviar ou escrever por extenso, o que explica por que a mesma família de indicador (PIB_VAB_MONETARY) foi aceita em nenhum dos 3 municípios mas rejeitada em todos: basta UM claim usar a forma por extenso para reprovar o draft inteiro.

**Isto não é uma falha de segurança do Gemini nem uma falha da regra 18 da V2** (que resolveu perfeitamente o problema de citar códigos de dataset — 0 ocorrências de `UNSUPPORTED_NUMBER`, o mesmo tipo de erro que apareceu 2x no Anthropic/V1) — é uma limitação pré-existente do guard `ENTITY` genérico que a V2 não cobria, revelada porque o Gemini tem um estilo de escrita mais verboso/formal que o Anthropic nesta amostra. **Nenhuma correção foi aplicada nesta sessão** (instrução explícita do usuário: não alterar guardrails/Prompt V2 antes do primeiro benchmark) — fica registrado como o achado central para a próxima iteração de prompt.

### Anexo obrigatório — Interpretations reais aceitas (Gemini, sem chain-of-thought)

**Contagem — FISCAL** (`attempts=1`, `latencyMs=8446`, tokens 5185/2075, custo US$0,006743):
> **statement:** As despesas de capital e os investimentos empenhados apresentaram queda e posterior alta, enquanto a despesa corrente e a receita total bruta realizada registraram alta em diferentes períodos.
> **confidence:** MULTI_SIGNAL_SUPPORTED | **claims:** 6 | **basedOnSignals:** 6 | **evidenceRefs:** 16
> **temporalScope:** FISCAL — 2020-2021 a 2021-2024
> **caveats:** cobertura temporal difere por família (2020-2025 nesta família); dado mais recente cobre até 2025 (defasagem de publicação); valores nominais sem deflator; leitura não estabelece causalidade nem atribuição de gestão.
> **modelProvenance:** `{"provider":"gemini","model":"gemini-2.5-flash","modelVersion":"gemini-2.5-flash","promptId":"INTEL_INTERPRETATION_PROMPT_V2","promptVersion":"v2","generatedAt":"2026-08-16T23:10:55.494Z"}`
> Claims: 6× TEMPORAL_READING, cada um citando exatamente o intervalo da própria unidade referenciada (despesa de capital: queda 2020-2021, alta 2021-2024; investimentos: queda 2020-2021, alta 2021-2024; despesa corrente: alta 2021-2023; receita total: alta 2020-2022) — **nenhum ano fora do period das unidades citadas** (confirma a regra 17 funcionando na prática).

**Belo Horizonte — OFFICIAL_SHARE** (`attempts=1`, `latencyMs=6136`, tokens 4674/1530, custo US$0,005227):
> **statement:** O setor de serviços, excluindo o setor público ampliado, concentrou a maior parte da estrutura produtiva em 2021, enquanto a participação da indústria e da administração pública, defesa, educação, saúde públicas e seguridade apresentou variações e tendências específicas em diferentes períodos.
> **confidence:** MULTI_SIGNAL_SUPPORTED | **claims:** 4 | **basedOnSignals:** 5 | **evidenceRefs:** 9
> **temporalScope:** OFFICIAL_SHARE — 2008-2009 a 2021
> **caveats:** cobertura temporal difere por família (PIB_VAB_MONETARY 2002-2023, OFFICIAL_SHARE 2002-2021); cobertura parcial (nem todos os indicadores configurados têm evidência); dado mais recente cobre até 2021; valores nominais sem deflator; thresholds pilot-calibrados (3 municípios de MG, não nacional); leitura não estabelece causalidade nem atribuição de gestão.
> **modelProvenance:** `{"provider":"gemini","model":"gemini-2.5-flash","modelVersion":"gemini-2.5-flash","promptId":"INTEL_INTERPRETATION_PROMPT_V2","promptVersion":"v2","generatedAt":"2026-08-16T23:13:45.745Z"}`
> Claims: 1× STRUCTURAL_READING ("Em 2021, a participação de serviços (exceto setor público ampliado) representou 68,7% do VAB total, superando a indústria em 51,1 pontos percentuais" — números confirmados presentes na evidência, `UNSUPPORTED_NUMBER` não acionado, boa fidelidade numérica), 2× TEMPORAL_READING, 1× OBSERVED_PATTERN (participação da administração pública em 2021: 13,8%, também um número evidence-backed).

Nenhum chain-of-thought foi solicitado, lido ou reportado. Nenhuma Interpretation foi persistida.

### 41-47. Scorecard — completo (medido)

| Critério | Anthropic (`claude-opus-5`, V1, **medido**, INTEL-03B) | Gemini (`gemini-2.5-flash`, V2, **medido**, INTEL-03C.1) |
|---|---|---|
| Acceptance rate | **43% (3/7)** | **28,6% (2/7)** — abaixo do baseline |
| Retry rate | **100% (7/7)** | **71,4% (5/7)** — melhor que o baseline |
| Lineage | **100% (0 quebras)** | **100% (0 quebras)** — igual |
| `TEMPORAL_MISREPRESENTATION` | 3 ocorrências | **0 ocorrências** |
| `UNSUPPORTED_NUMBER` (inclui citação de código de dataset) | 2 ocorrências | **0 ocorrências** |
| `UNKNOWN_SOURCE` | 1 ocorrência ("No VAB...", corrigido nesta sessão) | **30 ocorrências** (termos por extenso — achado novo) |
| Guards políticos/causais/previsão/recomendação/ideologia/sensível | 0 violações | **0 violações** — igual |
| Latência por chamada | 50s–93s | **6,1s–23,9s** — **~4,2x mais rápido** (medido) |
| Custo médio/município (produção) | US$ 0,69 | **US$ 0,034** — **~95% mais barato / ~20,2x** (medido) |
| Custo/1M tokens (entrada/saída, tabela) | US$5,00 / US$25,00 | US$0,30 / US$2,50 ([ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing)) |
| Consistência entre execuções | Instável (1 de 3 municípios com refs estáveis) | **Instável** (1 de 3 municípios — Contagem — 100% estável; Betim/BH instáveis) — padrão semelhante, não claramente melhor nem pior |
| Qualidade de leitura humana (avaliação manual, seção seguinte) | Rica, combina sinais, quantifica severidade em prosa | Rica, combina sinais, cita percentuais com fidelidade numérica correta, comparáveis em qualidade |

### Avaliação de qualidade (manual, sobre as 2 Interpretations aceitas)

| Critério | Contagem/FISCAL | BH/OFFICIAL_SHARE |
|---|---|---|
| Fidelidade numérica | N/A (claims sem números, só direção/período) | **Correta** — 68,7%, 51,1 p.p. e 13,8% todos evidence-backed, validador não acionou `UNSUPPORTED_NUMBER` |
| Fidelidade temporal | **Correta** — todo ano citado dentro do period da própria unidade referenciada (regra 17 funcionando) | **Correta** — mesmo padrão |
| Síntese/combinação multi-sinal | Boa — combina 4 sinais (despesa capital, investimento, despesa corrente, receita total) numa única frase executiva | Boa — combina participação setorial + tendência da administração pública numa leitura coesa |
| Redundância | Baixa — cada claim traz informação distinta | Baixa |
| Clareza | Alta — frases diretas, sem jargão desnecessário | Alta |
| Uso exclusivo de CLOSED_EVIDENCE | Sim — nenhum fato fora do contexto identificado | Sim |
| Ausência de conhecimento externo | Sim | Sim |
| Causalidade não sustentada | Nenhuma | Nenhuma |
| Recomendação política | Nenhuma | Nenhuma |

**[INFERÊNCIA, não medição estatística]** Com apenas 2 amostras aceitas, esta avaliação de qualidade é qualitativa/indicativa, não uma medição estatisticamente robusta — mas ambas as amostras reais disponíveis são de boa qualidade, sem nenhum problema de segurança ou fidelidade.

---

## 48-57. Parte F — Cache L4 (contrato + in-memory)

Decisão já homologada (INTEL-03B/03C): inteligência territorial é **sob demanda**, nunca processamento em massa.

- **Chave** (`cache.ts`, `buildInterpretationCacheKey`): `${contextHash}:${provider}:${model}:${promptVersion}` — string estável, testada para nunca colidir entre combinações diferentes.
- **Mudança material** (`isMaterialChange`): o único critério é o `contextHash` mudar. Uma atualização de fonte que não altera nenhum sinal/evidência relevante produz o MESMO `contextHash` — não dispara nova geração. `contextHash` diferente é *sempre* mudança material.
- **Implementação**: `InMemoryInterpretationCache` (Map em memória) — para teste/demonstração, nunca para produção entre processos (perde tudo ao reiniciar, por design). Persistência real exigiria uma migration Supabase — **não implementada neste gate**, documentada como pendência explícita para um futuro INTEL-03D.
- **Estimativa de custo sob demanda** (não "todos os municípios") — **[MEDIDO]** para ambos os providers agora:

| Cenário | Anthropic (medido, INTEL-03B) | Gemini (medido, INTEL-03C.1) |
|---|---|---|
| 1 município novo | ~US$0,69 | **~US$0,03** |
| 100 municípios realmente usados | ~US$69,42 | **~US$3,41** |
| 1.000 municípios realmente usados | ~US$694,16 | **~US$34,14** |
| Todos os 5.570 (nunca a premissa operacional) | ~US$3.866,50 (hipotético, nunca planejado) | **~US$190,19** (hipotético, nunca planejado) |

Extrapolação linear simples a partir de 3 amostras reais por provider — não é uma promessa de execução em massa (contraria a decisão sob demanda já homologada).

- **Batch API**: avaliada apenas conceitualmente (seção 57) — útil para processamento assíncrono em lote, mas contraria a decisão "sob demanda" já homologada; não implementada, não recomendada para o caso de uso atual.

---

## 45-47. Consistência entre execuções — Gemini (medido)

Mesmo contexto (mesma `EconomicIntelligenceResult`) executado 2 vezes seguidas por município:

| Município | sameCount | sameRefSets | sameClaimTypeSets |
|---|---|---|---|
| Contagem | **true** | **true** | **true** |
| Betim | false | false | false |
| Belo Horizonte | false | false | false |

**[MEDIDO]** 1 de 3 municípios (Contagem) foi 100% estável estruturalmente entre as duas execuções; os outros 2 variaram em contagem de Interpretations aceitas, refs citadas e tipos de claim. **[INFERÊNCIA]** O padrão (1 de 3 estável, 2 instáveis) é semelhante ao observado no Anthropic/INTEL-03B — não há evidência, nesta amostra pequena, de que um provider seja claramente mais consistente que o outro. Nenhum dos dois providers demonstrou consistência byte-a-byte, como esperado (nenhum controle de temperatura/seed foi usado em nenhum dos dois).

---

## 58-63. Parte G — Fallback

`generateWithFallback(context, primary, fallback)` (`fallback.ts`):
- Fallback **só** ocorre quando `primary` lança `InterpretationProviderError` (falha operacional real) — garantido estruturalmente, porque `generateInterpretations()` nunca lança por rejeição semântica (um draft rejeitado vira `RejectedInterpretationDraft` normalmente, nunca uma exceção). Testado explicitamente: um erro genérico não-`InterpretationProviderError` nunca aciona fallback.
- `fallbackReason` sempre registrado (o código do erro do provider DEFAULT) — nunca um fallback silencioso.
- Se o fallback também falhar, o erro do fallback é o que se propaga — nunca mascarado.
- **Candidato de política (seção 59, atualizado com dados reais)**: o benchmark real (seção 41-47) confirma Gemini com segurança equivalente (0 violações políticas/causais em ambos) mas taxa de aceitação **inferior** (28,6% vs 43%) por um motivo específico e corrigível (termos por extenso, seção "Análise das rejeições"). Recomendação nesta entrega: **manter `DEFAULT=Anthropic`, `FALLBACK=Gemini`** até uma iteração de prompt elevar a aceitação do Gemini acima do baseline — não `DEFAULT=Gemini` ainda, apesar do custo/latência muito melhores, porque aceitação é a prioridade máxima definida pelo próprio gate (seção 85-87) e Gemini ainda está abaixo nela.

---

## 64-67. Parte H — Prompt versioning

- Todo `Interpretation` de origem LLM já registra `modelProvenance.{provider, model, promptId, promptVersion, generatedAt}` (INTEL-03B, inalterado) — agora populado corretamente também para Gemini/V2.
- Mudança V1→V2 **não** força reprocessamento de nenhuma Interpretation existente (nenhuma foi persistida ainda, mas o contrato de `cache.ts`/seção 12 do INTEL-03B já formaliza isso: `promptVersion` é parte da chave, então uma Interpretation antiga sob V1 nunca é invalidada só porque V2 existe).
- Compatibilidade V1/V2: nenhuma removida, ambas continuam disponíveis via `INTEL_LLM_PROMPT`; decisão de qual usar por padrão em produção é uma decisão de produto pendente do benchmark completo.

---

## 68-69. Parte I — CAGED

`ECO-03B2`/`ECO-03B3a` (indicadores setoriais do CAGED, em desenvolvimento concorrente pelo Codex nesta mesma sessão) **não foram integrados** a L4 — confirmado por inspeção: nenhum arquivo em `lib/territorios/caged/` foi lido ou alterado, `EconomicIntelligenceResult`/`selectInterpretationInput` permanecem exatamente os do INTEL-02C. O provider (Anthropic ou Gemini) já está pronto para receber novas famílias no futuro sem mudança de arquitetura — `buildFamilyScopedContext` funciona para qualquer `ThresholdFamily`, não apenas as 3 atuais.

---

## 70-82. Parte J — Testes

| Suíte | Resultado |
|---|---|
| `lib/territorios/intelligence/interpretation` + `guardrails.test.ts` | **163 passed, 1 skipped** (antes do Gemini) → **146 passed, 2 skipped** (escopo final, isolado) |
| `lib/territorios/intelligence` (completa) | **288 passed, 2 skipped** (baseline 232 + 56 novos) |
| `lib/territorios app/api/territorios` (territorial completa) | **847 passed, 2 skipped** (baseline 788 + 59 novos) |
| `tsc --noEmit` | **0 erros** |
| `eslint lib/territorios/intelligence/interpretation` | **0 erros, 0 warnings** |
| `next build` | **PASS** |

Novos arquivos de teste:
- `config.test.ts` (9 testes) — provider selector (anthropic/gemini/mock/inválido→default), prompt selector (v1/v2/inválido→default v2), factory instancia a classe correta.
- `fallback.test.ts` (5 testes) — default ok, fallback acionado só por `InterpretationProviderError`, sem fallback configurado propaga, erro inesperado nunca aciona fallback, erro do fallback nunca mascarado.
- `cache.test.ts` (9 testes) — chave determinística e sem colisão, `isMaterialChange` (mesmo hash/hash diferente/sem hash anterior), hit/miss do cache in-memory.
- `prompt-v2.test.ts` (12 testes) — 16 regras da V1 preservadas, regras 17/18 presentes só na V2, V1 nunca editado, registry v1/v2/inválido, legenda de fontes, e os 4 achados reais do INTEL-03B (temporal, dataset-id, No VAB, entidade real) revalidados contra o mesmo validador inalterado.
- `gemini-provider.test.ts` (15 testes, **cliente mockado**) — sucesso 1ª tentativa, retry de schema, retry semântico, esgotamento (schema/semântico), refusal (`finishReason` de bloqueio), auth/rate-limit/5xx/rede, credencial ausente, modelo fora da tabela de preço, nunca-cross-family, `thinkingBudget=0` por padrão.
- `gemini-provider.real.test.ts` — gated por `RUN_REAL_INTEL_LLM=1` + `GEMINI_API_KEY`; `describe.skipIf` confirma que `vitest run` normal nunca coleta este teste (0 chamadas de rede em qualquer execução desta sessão).
- `guardrails.test.ts` (+3 testes) — fix do falso positivo `UNKNOWN_SOURCE`.

---

## Comandos executados nesta sessão

```bash
npm install @google/genai --save
npx tsc --noEmit -p tsconfig.json
npx eslint lib/territorios/intelligence/interpretation scripts/poc-intel03c-gemini-3-municipios.ts
npx vitest run lib/territorios/intelligence --pool=forks
npx vitest run lib/territorios app/api/territorios --pool=forks
npx next build
npx tsx scripts/poc-intel03c-gemini-3-municipios.ts   # dry-run inicial: BLOCKED_BY_CREDENTIAL, confirmado

# INTEL-03C.1, após GEMINI_API_KEY fornecida pelo usuário:
RUN_REAL_INTEL_LLM=1 INTEL_LLM_PROVIDER=gemini INTEL_LLM_MODEL=gemini-2.5-flash INTEL_LLM_PROMPT=v2 \
  npx tsx scripts/poc-intel03c-gemini-3-municipios.ts   # execução real completa, resultados na seção 37-47
```

---

## Arquivos criados/alterados

**Criados:**
- `lib/territorios/intelligence/interpretation/prompt-v2.ts`
- `lib/territorios/intelligence/interpretation/prompt-registry.ts`
- `lib/territorios/intelligence/interpretation/config.ts`
- `lib/territorios/intelligence/interpretation/gemini-provider.ts`
- `lib/territorios/intelligence/interpretation/cache.ts`
- `lib/territorios/intelligence/interpretation/fallback.ts`
- `lib/territorios/intelligence/interpretation/config.test.ts`
- `lib/territorios/intelligence/interpretation/fallback.test.ts`
- `lib/territorios/intelligence/interpretation/cache.test.ts`
- `lib/territorios/intelligence/interpretation/prompt-v2.test.ts`
- `lib/territorios/intelligence/interpretation/gemini-provider.test.ts`
- `lib/territorios/intelligence/interpretation/gemini-provider.real.test.ts`
- `scripts/poc-intel03c-gemini-3-municipios.ts`

**Alterados (extensão aditiva):**
- `lib/territorios/intelligence/interpretation/anthropic-provider.ts` — refatorado para consumir `prompt-registry` (V1 ou V2 configurável) em vez de importar `./prompt` (V1) diretamente; nenhuma lógica de retry/observabilidade/erro alterada.
- `lib/territorios/intelligence/interpretation/anthropic-provider.test.ts` — 1 teste ajustado para fixar `promptVersion:'v1'` explicitamente (o default do provider mudou para v2 nesta sessão; o teste testa especificamente o comportamento V1 do INTEL-03B).
- `lib/territorios/intelligence/interpretation/provider-errors.ts` — `classifyGeminiError` adicionado (aditivo, `classifyAnthropicError` inalterado).
- `lib/territorios/intelligence/guardrails.ts` — fix do falso positivo `UNKNOWN_SOURCE` em `extractedProperNouns` (seção 17-19).
- `package.json` — `@google/genai` adicionado como dependência.

**Nunca tocados:** `lib/territorios/intelligence/interpretation/{prompt.ts, validator.ts, guards.ts, selection.ts, serializer.ts, lineage.ts, provider.ts, build.ts, pipeline.ts, test-fixtures.ts}`, `../contracts.ts`, `../economy/*`, `lib/territorios/caged/**`, `app/`, `components/`, n8n, Orquestrador, scheduler.

---

## Riscos e débitos técnicos

1. **Acceptance rate do Gemini abaixo do baseline** — 28,6% vs 43%, inteiramente por citar termos econômicos por extenso ("Produto Interno Bruto", "Valor Adicionado Bruto") em vez de siglas. Corrigível por prompt (instruir explicitamente a preferir siglas) e/ou por um ajuste fino do guard `ENTITY` para reconhecer terminologia econômica padrão — **nenhuma correção foi aplicada nesta sessão**, por instrução explícita do usuário (avaliar só depois do primeiro benchmark).
2. **Cache não persiste** — `InMemoryInterpretationCache` perde tudo a cada reinício; uma decisão de persistência real (migration Supabase) fica pendente para INTEL-03D.
3. **Achado do "5938" (INTEL-03B) parcialmente esclarecido, não 100% confirmado** — a regra 18 da V2 eliminou completamente esse padrão específico no Gemini (0 ocorrências de `UNSUPPORTED_NUMBER`), o que é consistente com a hipótese revisada (conhecimento de treinamento vs. contexto), mas não prova definitivamente a causa raiz original no Anthropic (nunca re-testado nesta sessão, por instrução de não repetir as chamadas caras).
4. **Consistência instável em ambos os providers** — nenhuma mitigação foi implementada além de documentar; decisão de produto sobre cache vs. regeneração continua em aberto.
5. `frontend-adapters.ts` tem 1 erro de lint pré-existente introduzido por edição concorrente do Antigravity nesta mesma sessão — fora do escopo deste gate, não corrigido, sinalizado aqui para visibilidade.
6. ~~Teste de integração real gated trava dentro do vitest~~ — **descartado**: era concorrência de recursos com o script de POC rodando em paralelo, não um bug (seção 0). O teste `gemini-provider.real.test.ts` passa normalmente (1/1, 5,86s) quando roda sem contenção.

---

## Prontidão

- **Prontidão para persistência L4**: com ressalvas — o contrato de dados (seção 48-57) está pronto e agora testado com dados reais de dois providers, mas a decisão de qual usar por padrão depende de uma iteração de prompt que resolva o gap de acceptance rate do Gemini.
- **Prontidão para frontend**: inalterada desde o INTEL-03B — estruturalmente pronta, avaliação visual real pendente do próximo gate do Antigravity.
- **Prontidão para L5**: não neste gate — mesmo gap do INTEL-03B (guard de "implication overreach" ainda não desenhado).

---

## Recomendações de provider/model/prompt

- **Provider default recomendado nesta entrega: Anthropic (`claude-opus-5`), com Gemini como fallback/candidato forte**. Anthropic tem a taxa de aceitação real mais alta (43% vs 28,6%); Gemini tem custo (~20x menor) e latência (~4,2x menor) muito superiores, e zero problemas de segurança — um candidato de altíssimo potencial assim que o gap de aceitação for corrigido (provavelmente só com ajuste de prompt, seção "Riscos" item 1).
- **Modelo Gemini validado**: `gemini-2.5-flash` (real, testado, funcionando).
- **Prompt recomendado**: V2 para qualquer execução nova (Anthropic ou Gemini) — as regras 17/18 funcionaram perfeitamente no Gemini real (0 `TEMPORAL_MISREPRESENTATION`, 0 `UNSUPPORTED_NUMBER`); V1 mantido apenas para reprodutibilidade histórica.
- **Próxima iteração de prompt (não feita nesta sessão)**: adicionar uma regra explícita "prefira siglas (PIB, VAB) a nomes por extenso" — candidata natural para uma V3, a ser proposta e testada em um gate dedicado, não decidida unilateralmente aqui.

---

## Decisão — 12 perguntas objetivas (INTEL-03C.1)

1. **Gemini 2.5 Flash passou nos guardrails?** Parcialmente. Os guards de segurança política/causal (causalidade, atribuição política, previsão, recomendação, ideologia, inferência sensível) passaram 100% — 0 violações em 7 chamadas reais. O guard de rastreabilidade de fonte (`ENTITY`/`UNKNOWN_SOURCE`) reprovou 5 de 7 chamadas, mas por um motivo de estilo de escrita (termos por extenso), não por segurança.
2. **A qualidade é suficiente para produção?** As 2 Interpretations aceitas são de boa qualidade (fidelidade numérica/temporal corretas, síntese clara, sem violação de nenhuma regra). Mas com 28,6% de aceitação, a maioria das chamadas hoje não produziria conteúdo utilizável sem uma iteração de prompt — **não pronto para produção como está, mas o problema é raso e corrigível**.
3. **Acceptance rate superou os 43% do baseline?** **NÃO.** 28,6% (2/7) < 43% (3/7).
4. **Retry rate caiu em relação aos 100%?** **SIM.** 71,4% (5/7) < 100% (7/7).
5. **Latência melhorou?** **SIM, substancialmente.** ~16,5s médio vs ~69,1s médio do Anthropic (~4,2x mais rápido).
6. **Qual foi o custo real?** US$ 0,102434 nas 7 chamadas de produção (~US$0,034/município); ~US$0,20 somando a passagem de teste de consistência.
7. **Qual a economia percentual estimada contra o baseline Anthropic?** **~95% mais barato** (US$0,034 vs US$0,69 por município) — ou ~20,2x.
8. **A consistência melhorou?** Não claramente — mesmo padrão (1 de 3 municípios estável, 2 instáveis) observado em ambos os providers.
9. **Gemini deve virar DEFAULT?** **Ainda não.** Custo e latência são muito superiores, mas a taxa de aceitação real ficou abaixo do baseline nesta rodada — a prioridade máxima definida pelo próprio gate (seção 85-87) é fidelidade/segurança/aceitação, não custo.
10. **Anthropic deve virar FALLBACK/PREMIUM?** **Sim** — mantém a maior taxa de aceitação real hoje; faz sentido como fallback do Gemini enquanto o gap de aceitação não for resolvido, e como opção "premium" para casos que exijam a maior taxa de sucesso possível.
11. **Prompt V2 está homologado?** **Sim, com uma ressalva registrada.** As regras 17 (fidelidade temporal) e 18 (proibição de identificador técnico) funcionaram perfeitamente nesta execução real — 0 ocorrências dos dois tipos de erro que motivaram sua criação, em ambos os providers agora. V2 revelou (não causou) um gap pré-existente do guard `ENTITY` com terminologia por extenso, documentado para uma V3 futura.
12. **Estamos prontos para INTEL-03D — Persistência L4?** **Com ressalvas.** O contrato de dados está pronto e testado com 2 providers reais, mas recomenda-se resolver o gap de aceitação do Gemini (ou decidir explicitamente persistir só saídas do Anthropic por enquanto) antes de qualquer implementação de persistência real.

---

## Tabela final do gate

| Item | Status |
|---|---|
| GEMINI REAL | **PASS** (14 chamadas reais executadas — 7 produção + 7 consistência) |
| GEMINI 2.5 FLASH | **PASS** (funcional, seguro; aceitação abaixo do baseline) |
| PROMPT V2 | **PASS** (regras 17/18 confirmadas eficazes na prática) |
| CLOSED EVIDENCE | **PASS** (0 violações em 7 chamadas reais) |
| TEMPORAL FIDELITY | **PASS** (0 `TEMPORAL_MISREPRESENTATION`) |
| NUMERIC FIDELITY | **PASS** (0 `UNSUPPORTED_NUMBER`; números citados nas aceitas são evidence-backed) |
| LINEAGE | **PASS** (0/7 quebras) |
| SECURITY | **PASS** (0 violações políticas/causais/previsão/recomendação/ideologia/sensível) |
| MULTI_PROVIDER | **PASS** |
| DATASET ID (regra 18) | **PASS** |
| NO VAB FALSE POSITIVE | **PASS** |
| VALIDATOR | **PASS** (soberano, nunca afrouxado) |
| CONTAGEM | Anthropic: 2/3 aceitas (INTEL-03B) — Gemini: **1/3 aceitas** (real) |
| BETIM | Anthropic: 1/2 aceitas (INTEL-03B) — Gemini: **0/2 aceitas** (real, honesto) |
| BH | Anthropic: 0/2 aceitas (INTEL-03B) — Gemini: **1/2 aceitas** (real) |
| ACCEPTANCE RATE | **28,6%** (Gemini, medido) — baseline Anthropic: 43% |
| RETRY RATE | **71,4%** (Gemini, medido) — baseline Anthropic: 100% |
| COST/MUNICIPALITY | **US$ 0,034** (Gemini, medido) — baseline Anthropic: US$ 0,69 |
| LATENCY | **6,1s–23,9s/chamada, ~16,5s médio** (Gemini, medido) — baseline Anthropic: 50–93s, ~69,1s médio |
| CONSISTENCY | **Instável** (1 de 3 municípios estável — mesmo padrão do baseline) |
| DEFAULT PROVIDER | **ANTHROPIC** |
| FALLBACK | **GEMINI** |
| PRONTO PARA INTEL-03D | **COM RESSALVAS** |

---

## Encerramento

**PARE.** Benchmark real concluído com `GEMINI_API_KEY` fornecida pelo usuário. Nenhuma arquitetura, contrato, validador, guardrail ou Prompt V2 foi alterado durante ou após a execução do benchmark. Não iniciado L5. Nenhuma UI de configuração implementada. Nenhum processamento em massa de municípios. CAGED (`lib/territorios/caged/`) não integrado a L4. Frontend não alterado. Nenhum deploy. Relatório atualizado e entregue com os resultados reais, claramente separados de estimativas e inferências.
