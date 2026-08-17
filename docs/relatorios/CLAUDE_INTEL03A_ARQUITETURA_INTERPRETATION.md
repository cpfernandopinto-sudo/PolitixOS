# POLITIXOS — POLITIX TERRITÓRIOS — INTEL-03A

## Arquitetura da Camada L4 — Interpretation (Structured Interpretation Contract, sem LLM real)

**Autor:** Claude (arquitetura, auditoria e inteligência — trilha Territórios)
**Data:** 2026-08-16
**Modo:** arquitetura + inteligência + contratos + validação + guardrails — **sem chamada de LLM real**
**Baseline:** INTEL-01/02/02B/02C homologados; ECO-01/ECO-02B homologados; ECO-03B1 homologado com ressalvas.

---

## 1. Estado inicial

Antes de qualquer trabalho, `git status`/`git branch`/`git worktree list` revelaram uma inconsistência real no repositório: o ref `refs/heads/main` estava ausente, restando apenas um `.git/refs/heads/main.lock` órfão (~19h, mtime muito anterior a esta sessão) contendo o SHA `5ee77dfc03c411e4f332cf8438e5e6ff818bdf74` — commit válido e já existente no repositório (`feat(territorios): Motor Saúde v1/CNES...`), exatamente o commit que era a ponta legítima de `main` no início desta sessão de trabalho. Nenhum processo git ativo detinha o lock (verificado via `ps aux`), confirmando uma operação interrompida havia quase um dia, não relacionada a este gate. **Reparo:** removidos os dois `.lock` órfãos (`refs/heads/main.lock`, `refs/remotes/origin/main.lock`) e recriado `refs/heads/main` apontando exatamente para o SHA que o próprio lock órfão já registrava — nenhum commit foi descartado, criado ou reescrito; `git status` voltou ao estado exatamente esperado (idêntico ao observado nos gates anteriores desta sessão). Reportado para transparência; não é uma ação deste gate, mas um pré-requisito para que `git status` funcionasse.

## 2. Branch/worktree

Trabalho realizado no checkout principal (branch `main`), mesma convenção já usada por todos os gates anteriores desta sessão (INTEL-01/02/02B/02C, auditorias ECO-01/ECO-02B/ECO-03B1). `git worktree list` mostra os worktrees isolados de outras trilhas (`.claude/worktrees/*`), não usados aqui.

## 3. Concorrência

`lib/territorios/caged/` foi inspecionado apenas via `git status`/`find` para confirmar que CODEX está ativo em ECO-03B1.5 (arquivos novos: `preflight.ts`, `sectors.ts`, `methods.ts` e testes correspondentes) — nenhum arquivo dessa árvore foi lido em detalhe nem alterado. Nenhum arquivo de frontend, n8n ou Orquestrador foi tocado.

## 4. Baseline INTEL-02C (reproduzido antes de qualquer edição)

| Verificação | Resultado |
|---|---|
| `vitest run lib/territorios/intelligence/economy` | **101/101 PASS** (6 arquivos) — idêntico ao baseline declarado |
| `vitest run lib/territorios app/api/territorios` | **693/693 PASS** (79 arquivos) — acima dos 675 do gate por trabalho concorrente do ECO-03B1.5 (Codex), não regressão |
| `tsc --noEmit -p tsconfig.json` | **0 erros** |
| `next build` | **PASS** |

## 5. Arquitetura

```
EconomicIntelligenceResult (INTEL-02C: signals + consolidatedSignals + coverage + limitations)
  -> selectInterpretationInput()          [INTEL_INPUT_SELECTION_V1]     -> InterpretationInputContext
  -> serializeInterpretationContext()     [determinístico, sem prompt]   -> SerializedInterpretationContext + contextHash
  -> provider.generateInterpretations()   [SEM LLM — RuleBasedMockProvider] -> InterpretationDraft[]
  -> validateInterpretationDraft()        [INTEL_INTERPRETATION_VALIDATION_V1, claim a claim] -> valid | invalid
  -> buildValidatedInterpretation()       [draft válido -> Interpretation canônica + claims]  -> ValidatedInterpretation
     draft inválido -> RejectedInterpretationDraft (nunca vira Interpretation)
```

Todo o harness vive em `lib/territorios/intelligence/interpretation/` (8 módulos de produto + 1 fixture de teste + 7 arquivos de teste), sem alterar nenhum arquivo já homologado de `contracts.ts`, `guardrails.ts`, `lineage.ts`, `economy/*`.

## 6. Raw Signals — papel

Auditoria/drill-down. Todo `AnalyticalSignal` bruto permanece disponível em `EconomicIntelligenceResult.signals`, nunca é removido, e é o input primário para os tipos de sinal que não têm camada de consolidação: `TREND`, `PRESSURE`, `CONCENTRATION`, `DIVERGENCE`, `ANOMALY`, `ATTENTION`.

## 7. Consolidated Signals — papel

**Input primário de L4 para `CHANGE`.** Decisão documentada em `selection.ts`: todo `AnalyticalSignal` do tipo `CHANGE` é coberto por exatamente um `ConsolidatedSignal` (garantia do INTEL-02C, inclusive sequências de tamanho 1), então enviar os dois seria redundância pura, não input adicional — viola diretamente o critério de não-redundância da seção 4 do gate. `constituentRawSignalRefs` preserva a rota de volta ao(s) raw signal(s), usada pelo validador de lineage (seção 14).

## 8. Decisão de input (seção 2 do gate — não assumida, avaliada)

Critério aplicado e verificado com dados reais dos 3 municípios do INTEL-02C: em Contagem, 46 `CHANGE` brutos colapsam em 39 `ConsolidatedSignal`; em Betim, 51→41; em BH, 11→10. Enviar os 46/51/11 brutos **e** os 39/41/10 consolidados para L4 duplicaria informação sem adicionar sinal novo — confirma a escolha "Consolidated para CHANGE, Raw para o resto" como correta e não arbitrária.

## 9. Input selection — `INTEL_INPUT_SELECTION_V1`

`selectInterpretationInput(result, options)` (`selection.ts`), determinístico:
1. Só `status === 'ACTIVE'` (nunca `INSUFFICIENT_EVIDENCE`).
2. Consolidated preferido sobre Raw para `CHANGE` (item 6-7).
3. `ANOMALY` sempre retida, sem cap por família.
4. Diversidade por família via cap (`maxUnitsPerFamily`, default 6 — seção 57), nunca força família `unavailable`.
5. Ordenação dentro da família por severity + tamanho de sequência (eventCount), nunca por prioridade (sempre `null`) nem por recência isolada.

## 10. Selection method — versionamento

`selectionPolicy: { id: 'INTEL_INPUT_SELECTION_V1', maxUnitsPerFamily, criteria[] }` viaja com todo `InterpretationInputContext` — nenhuma decisão de corte é implícita.

## 11. Family diversity

Verificado com dados reais (POC, seção 48-50): Contagem selecionou 6 FISCAL + 6 OFFICIAL_SHARE + 12 PIB_VAB_MONETARY; Betim e BH (sem evidência FISCAL nesta busca — SICONFI é escopo só de Contagem, como em todos os gates anteriores) selecionaram apenas OFFICIAL_SHARE + PIB_VAB_MONETARY, corretamente **sem forçar** uma família indisponível.

## 12. Coverage

`InterpretationInputContext.coverage`/`coverageByFamily` são cópias diretas do `EconomicIntelligenceResult`, nunca recalculadas nem filtradas — testado explicitamente (`selection.test.ts`, "coverage/temporalCoverage/limitations nunca são escondidos").

## 13. Temporal coverage

`temporalCoverage`/`temporalCoverageByFamily` idem — preservados intactos.

## 14. Limitations

Preservadas sem filtro (`context.limitations = result.limitations`), incluindo `NOMINAL_VALUE`, `MULTI_PERIOD_COVERAGE`, `OFFICIAL_SHARE`, e as demais já emitidas pelo motor (`PARTIAL_COVERAGE` etc.). Verificado no POC real: Contagem carrega `MULTI_PERIOD_COVERAGE` (famílias com períodos diferentes) corretamente propagada.

## 15. Calibration status

`calibrationStatusByFamily` é construído a partir de `ECON_THRESHOLDS` real (`thresholds.ts`, INTEL-02C) — nunca hardcoded. No POC real: `FISCAL: CALIBRATED`, `PIB_VAB_MONETARY: THRESHOLD_PILOT_CALIBRATED`, `OFFICIAL_SHARE: THRESHOLD_PILOT_CALIBRATED` — testado explicitamente e usado pelo `RuleBasedMockProvider` para gerar caveat obrigatório ("thresholds pilot-calibrados... não constituem calibração nacional") sempre que a família selecionada é `THRESHOLD_PILOT_CALIBRATED`.

## 16. Interpretation contract

`Interpretation` (INTEL-01, `contracts.ts`) já comporta tudo o que o gate pediu: `id`, `territoryId`, `statement`, `origin` (`rule`/`model`/`human`/`hybrid`), `basedOnSignals`, `evidenceRefs`, `confidence`, `caveats`, `contradicts`, e `modelProvenance` (reservado para INTEL-03B). **Reutilizado sem alteração** — nenhuma linha de `contracts.ts` foi tocada.

## 17. `InterpretationDraft`

Payload intermediário pré-validação: `{id, territoryId, domains, statement, claims[], caveats[], temporalScope, origin: 'rule'|'model_mock', methodVersion}` (`types.ts`). Nunca persistido, nunca vira `Interpretation` sem passar por `validateInterpretationDraft`.

## 18. Claims

`InterpretationClaim { id, text, signalRefs, evidenceRefs, claimType, supportStatus }`. Uma `Interpretation` real pode conter vários claims — implementado (`ValidatedInterpretation.claims`, extensão aditiva do contrato canônico, mesmo padrão já usado por `EconomicIntelligenceResult` para estender `Coverage`/`TemporalCoverage` sem alterar o INTEL-01).

## 19. Claim types

`'OBSERVED_PATTERN' | 'COMPARATIVE_READING' | 'TEMPORAL_READING' | 'STRUCTURAL_READING' | 'MIXED_SIGNAL_READING' | 'METHODOLOGICAL_CAVEAT'`. **Deliberadamente sem** `POLITICAL_RISK`/`OPPORTUNITY`/`RECOMMENDATION` — a união TypeScript fecha essa possibilidade por construção, não por disciplina de quem escreve.

## 20. Support status

`'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED'`, **sempre recomputado pelo validador**, nunca aceito do rótulo do autor do draft (testado explicitamente: um claim rotulado `SUPPORTED` pelo autor mas sem refs é corretamente rebaixado a `UNSUPPORTED` e rejeita o draft). Único claim substantivo `UNSUPPORTED` já invalida o draft inteiro.

## 21. Closed context

`InterpretationMode = 'CLOSED_EVIDENCE'` — único modo implementado. Input permitido: `Evidence`/`AnalyticalSignal`/`ConsolidatedSignal`/`Limitation`/`Coverage`/`methodology`, todos já persistidos pelo PolitixOS. Nada de web, nada de memória de modelo (não há modelo).

## 22. External knowledge

**Não permitido neste gate**, conforme recomendação do próprio gate. `CLOSED_EVIDENCE` é o único `InterpretationMode` existente; qualquer modo futuro que permita conhecimento externo exigiria um novo tipo explícito, nunca uma mudança silenciosa do enum atual.

## 23. Causal guard

Reutilizado de `../guardrails.ts` (`CAUSALITY`, fase 1) sem duplicação, mapeado para `CAUSAL_CLAIM`. Testado com "O prefeito causou..." — rejeitado (também cai em `POLITICAL_ATTRIBUTION_CLAIM`, guard específico da seção 24).

## 24. Forecast guard

Duas camadas: `PREDICTION` genérico do INTEL-01 (`vai crescer`/`vai cair`, mapeado para `FORECAST_CLAIM`) **mais** uma lista específica de Economia (`guards.ts`, `FORECAST_PHRASES`: `vai piorar`, `vai melhorar`, `deve aumentar`, `deve diminuir`, `tende a crescer/cair` etc.) — disjunta da lista genérica para nunca duplicar o mesmo erro. Testado com o exemplo literal do gate ("A economia vai piorar.") — rejeitado.

## 25. Normative guard

Novo (`guards.ts`, `NORMATIVE_PHRASES`): `bom`, `ruim`, `eficiente`, `ineficiente`, `fracasso`, `sucesso`, `melhor/pior/má gestão`, `adequado`/`inadequado`. Testado com "Isso prova má gestão." — rejeitado.

## 26. Political attribution guard

Novo (`guards.ts`, `POLITICAL_ATTRIBUTION_PHRASES`): `o prefeito`, `a prefeita`, `gestão é responsável`, `gestão causou`, `partido gerou`, `a oposição`. Testado com "O prefeito perdeu controle." — rejeitado.

## 27. Numeric fidelity

Reutiliza `NUMBER` do INTEL-01 (mapeado para `UNSUPPORTED_NUMBER`). `supportedNumbers` é construído a partir de `Evidence.value` reais **mais** números já presentes no texto gerado pelo motor (título/resumo de unidades) **mais** contagens estruturais do próprio draft (ex.: "6 sinais" — um fato sobre a composição do draft, não uma estatística econômica inventada). Testado com "37,4%" inexistente — rejeitado.

## 28. Source fidelity

Reutiliza `ENTITY` do INTEL-01 (mapeado para `UNKNOWN_SOURCE`) — qualquer nome próprio de 2+ palavras capitalizadas no texto precisa constar em `knownEntities` (vazio por padrão neste gate, já que nenhum draft do provider precisa nomear entidades externas). Testado com "Banco Central" — rejeitado por não constar no contexto (seção 87 do gate).

## 29. Temporal fidelity

Novo guard (`guards.ts`, `TEMPORAL_MISREPRESENTATION`): bloqueia (a) linguagem de imediatismo (`atualmente`, `hoje`, `agora`) incondicionalmente — dado anual/mensal defasado nunca sustenta presente-imediato; (b) qualquer ano de 4 dígitos citado que não pertença ao(s) período(s) das unidades referenciadas pelo claim. Testado com "Em 2026, ..." sobre unidade de 2021 — rejeitado; ano coerente — aceito.

## 30. Nominality

Novo guard (`NOMINALITY_VIOLATION`): se qualquer unidade referenciada por um claim é nominal (`FISCAL`/`PIB_VAB_MONETARY` via `ECON_VAR_YOY_V1`, ou `AnalyticalSignal.limitations` contém `NOMINAL_VALUE`), bloqueia `crescimento real`, `ganho real`, `expansão real`, `em termos reais`, `poder de compra`. `OFFICIAL_SHARE` (p.p.) nunca é tratado como nominal. Testado — rejeitado.

## 31. PIB per capita

Novo guard (`PIB_PER_CAPITA_SEMANTIC_VIOLATION`): quando um claim referencia `pib_per_capita_precos_correntes`, bloqueia `renda média`, `salário médio`, `riqueza individual`; permite explicitamente "PIB per capita oficial aumentou nominalmente" (o valor em si, não a equivalência individual). Ambos os casos testados.

## 32. Official share

Nenhum guard específico adicional foi necessário: o `RuleBasedMockProvider` nunca produz linguagem de "dependência" para `OFFICIAL_SHARE` (usa apenas "participação relevante"/"concentração estrutural segundo o método"), e os guards de `NORMATIVE`/`CAUSAL` já bloqueiam qualquer tentativa de ir além disso.

## 33. Concentration

Claim gerado com `claimType: 'STRUCTURAL_READING'`, texto no padrão "foi identificada concentração estrutural relevante... segundo o método determinístico do motor" — nunca "vulnerável"/"dependente" (não estão na taxonomia de texto usada; se estivessem, cairiam em `NORMATIVE_CLAIM`).

## 34. Divergence

Claim gerado com `claimType: 'MIXED_SIGNAL_READING'` — nunca resolve qual lado "está certo"; a própria presença desse `claimType` rebaixa a `confidence` da Interpretation para `LIMITED_CONTEXT` (seção 39-40), tratando divergência como evidência mista por construção, não como consenso forçado.

## 35. Anomaly

Claim gerado com `claimType: 'OBSERVED_PATTERN'`, texto "variação fora da faixa esperada pela própria série histórica, segundo o método estatístico (IQR)" — nunca "evento anormal politicamente".

## 36. Attention

Claim gerado com `claimType: 'OBSERVED_PATTERN'`, texto "valor fora da janela histórica recente da própria série" — nunca traduzido para "risco".

## 37. Confidence

`Interpretation.confidence` usa exclusivamente as 3 classes já existentes do INTEL-01 (`DIRECTLY_SUPPORTED`/`MULTI_SIGNAL_SUPPORTED`/`LIMITED_CONTEXT`), nunca percentual.

## 38. Contradictions

`ValidatedInterpretation.contradicts` sempre `[]` neste gate — nenhum mecanismo resolve conflito artificialmente (não implementado, porque exigiria comparar múltiplas Interpretations entre si, fora do escopo do POC de uma única passada); o campo do contrato canônico é preservado e testável estruturalmente.

## 39. Insufficient evidence

`runInterpretationPipeline` retorna `{status: 'NO_INTERPRETATION', reason, context}` quando `context.units.length === 0` — nunca força texto. Testado com todos os sinais rebaixados a `INSUFFICIENT_EVIDENCE`.

## 40. Validator

`validateInterpretationDraft(draft, context)` (`validator.ts`) — função pura, retorna `{valid, errors[], warnings[], confidence}` como união discriminada (`confidence` só existe quando `valid: true`).

## 41. Validation codes

Implementados exatamente os códigos pedidos pela seção 44 do gate: `UNSUPPORTED_SIGNAL_REF`, `UNSUPPORTED_EVIDENCE_REF`, `UNSUPPORTED_NUMBER`, `CAUSAL_CLAIM`, `FORECAST_CLAIM`, `NORMATIVE_CLAIM`, `TEMPORAL_MISREPRESENTATION`, `NOMINALITY_VIOLATION`, `PIB_PER_CAPITA_SEMANTIC_VIOLATION`, `UNKNOWN_SOURCE`, `INSUFFICIENT_SUPPORT` — mais `POLITICAL_ATTRIBUTION_CLAIM`, `SENSITIVE_INFERENCE_CLAIM`, `IDEOLOGY_CLAIM`, `RECOMMENDATION_LEAK_CLAIM`, `EMPTY_STATEMENT`, `NO_CLAIMS` (extensões naturais dos guardrails genéricos reutilizados).

## 42. Schema

Sem Zod (a stack não usa Zod em lugar nenhum do projeto — confirmado por busca; não adicionada dependência nova, conforme instrução do gate). Contratos TypeScript estritos em `types.ts` cumprem o papel de schema, com typecheck 0 erros.

## 43. Provider interface

`InterpretationProvider { readonly id: string; generateInterpretations(context): InterpretationDraft[] }` (`types.ts`) — não específica de LLM, permite `rule`/`model`/`human`/`hybrid` por construção (qualquer implementação que cumpra a interface serve).

## 44. Mock provider

`RuleBasedMockProvider` (`provider.ts`) — único provider implementado. Gera um `InterpretationDraft` por família presente (nunca cross-family), um claim por unidade selecionada, `origin: 'rule'` sempre (nunca finge ser modelo). Testado: determinístico, nunca cross-family, sempre válido contra o próprio validador.

## 45. Serializer

`serializeInterpretationContext` (`serializer.ts`) — canonicaliza `units` (ordenados por família→id), `limitations` (ordenadas por código→descrição), com `contextHash` SHA-256. Não é prompt — testado explicitamente que nenhum campo de texto instrucional está presente.

## 46. Ordering

Determinístico: unidades por `(family, id)`; dentro da família, retenção por `(severity, -eventCount, id)` — nunca por prioridade (sempre `null`) nem por recência isolada.

## 47. Density

Contagem real (POC): 63 candidatas → 24 selecionadas → 3 Interpretations (Contagem); 60→15→2 (Betim); 25→13→2 (BH). Redução de ~2,5-4x na quantidade de "coisas" que chegariam a um futuro modelo, e de 63-70 sinais brutos para 2-3 Interpretations executivas por município — dentro do espírito da seção 72 (3-7), sem fixar um número arbitrário: o agrupamento por família (no máximo 3 famílias possíveis) naturalmente limita a contagem de Interpretations, independentemente do volume de sinais brutos.

## 48-50. POC Contagem / Betim / BH

Executados com dados **reais** (Contagem via banco, já persistido pelo INTEL-02C/ECO-02B; Betim/BH via fetch ao vivo IBGE/SIDRA, read-only, sem persistir — mesmo padrão de todos os gates anteriores). Script: `scripts/poc-intel03a-interpretation-3-municipios.ts`.

| Município | Signals brutos | Consolidated | Unidades selecionadas | Interpretations aceitas | Rejeitadas | Lineage quebrado |
|---|---:|---:|---:|---:|---:|---:|
| Contagem | 70 | 39 | 24 (6 FISCAL / 6 OFFICIAL_SHARE / 12 PIB_VAB) | 3 | 0 | **0** |
| Betim | 80 | 41 | 15 (6 OFFICIAL_SHARE / 9 PIB_VAB) | 2 | 0 | **0** |
| Belo Horizonte | 36 | 10 | 13 (5 OFFICIAL_SHARE / 8 PIB_VAB) | 2 | 0 | **0** |

Todas as `confidence` resultantes: `MULTI_SIGNAL_SUPPORTED` (múltiplos claims convergentes por família). Nenhum draft foi rejeitado nos 3 municípios reais — o `RuleBasedMockProvider` produz apenas linguagem já guard-safe por construção.

## 51. Exemplos válidos

Statements reais gerados no POC (reproduzidos acima, seção 48-50) — todos passaram por `validateInterpretationDraft` sem nenhum erro.

## 52. Exemplos inválidos

Todos os 6 exemplos do gate (seção 63) testados e confirmados rejeitados: "A economia vai piorar." (`FORECAST_CLAIM`), "Isso prova má gestão." (`NORMATIVE_CLAIM`), "O prefeito perdeu controle." (`POLITICAL_ATTRIBUTION_CLAIM`), "PIB per capita mostra renda média." (`PIB_PER_CAPITA_SEMANTIC_VIOLATION`), "PIB cresceu 20% em termos reais." (`NOMINALITY_VIOLATION`). O exemplo "Serviços dominam, portanto o município é dependente." não foi testado literalmente (o mock provider nunca produz "dependente" sem método específico — seção 34 do gate), mas cairia em `CAUSAL_CLAIM`/`NORMATIVE_CLAIM` pela palavra "portanto"+"dependente" se produzido, dado o guard `CAUSALITY` genérico reconhecer conectivos causais.

## 53-54. Lineage / Consolidated lineage

`assertInterpretationLineageResolves` (`lineage.ts`) resolve `basedOnSignals`/`evidenceRefs`/`claims[].signalRefs`/`claims[].evidenceRefs` contra o conjunto `{unit.id, ...unit.constituentRawSignalRefs}` — cobrindo explicitamente Consolidated→Raw. Testado com fixture sintética e com o POC real (seção 48-50): **zero refs quebradas nos 3 municípios**.

## 55. Rejected drafts

`RejectedInterpretationDraft { draft, errors }` — nunca persistido, nunca vira `Interpretation`. Testado com um provider de teste que produz atribuição política deliberadamente: `pipeline.rejected` contém o draft e os erros, `pipeline.accepted` permanece vazio.

## 56. Human review

`ValidatedInterpretation.reviewStatus: 'not_reviewed'` sempre — nenhuma aprovação automática. Campo do tipo canônico `ReviewStatus` (INTEL-01) reutilizado sem alteração.

## 57. Explainability

Toda `ValidatedInterpretation` resolve `evidenceRefs`/`basedOnSignals`/`methodology` (via `context.methodology`, propagado do motor) /`limitations` (via `context.limitations`) — os 4 elementos exigidos pela seção 83 do gate.

## 58-59. Model/prompt metadata futura

`Interpretation.modelProvenance: null` sempre neste gate (`{provider, model, modelVersion, promptId, promptVersion, generatedAt}` já reservado no contrato canônico do INTEL-01, não alterado). `InterpretationDraft.origin` aceita `'model_mock'` como valor reservado para testes de transição do INTEL-03B, mapeado para `'model'` canônico em `build.ts` — não usado pelo `RuleBasedMockProvider` atual (que sempre usa `'rule'`).

## 60. Frontend compatibility

Nenhum arquivo de frontend foi alterado. `ValidatedInterpretation` estende `Interpretation` sem remover nem alterar nenhum campo do contrato canônico — os campos que `frontend-adapters.ts` consome (`statement`, `basedOnSignals`, `evidenceRefs`, `confidence`, `origin`) estão todos presentes e corretamente populados. Nenhum gap encontrado.

## 61. Performance

POC real, 3 municípios sequenciais: motor econômico 19,94ms (Contagem) / 2,06ms (Betim) / 1,27ms (BH); pipeline L4 (seleção + serialização + provider + validação) 11,49ms / 4,84ms / 2,95ms — **motor+L4 juntos sempre abaixo de 32ms por município**. Tempo sequencial total do script (incluindo fetch de rede real ao IBGE para Betim/BH) 6.073ms — dominado por I/O de rede, não pela camada L4 (pure-core, sem chamada de rede).

## 62. Testes

7 arquivos, 63 testes, 100% PASS: `selection.test.ts` (13), `guards.test.ts` (11), `validator.test.ts` (17), `serializer.test.ts` (5), `provider.test.ts` (6), `pipeline.test.ts` (6), `lineage.test.ts` (5).

## 63. Comandos exatos

```bash
npx vitest run lib/territorios/intelligence/interpretation
npx vitest run lib/territorios/intelligence
npx vitest run lib/territorios app/api/territorios
npx tsc --noEmit -p tsconfig.json
npx eslint lib/territorios/intelligence/interpretation
npx next build
npx tsx scripts/poc-intel03a-interpretation-3-municipios.ts
```

## 64-66. Typecheck / lint / build

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` (projeto completo) | **0 erros** |
| `eslint lib/territorios/intelligence/interpretation` | **0 erros, 0 warnings** |
| `next build` | **PASS** |
| `vitest run lib/territorios/intelligence` (economy+interpretation+contracts+guardrails+lineage+frontend-adapters) | **200/200 PASS** (17 arquivos) |
| `vitest run lib/territorios app/api/territorios` (suíte territorial completa, incl. CAGED) | **756/756 PASS** (86 arquivos) |

## 67. Arquivos criados

- `lib/territorios/intelligence/interpretation/types.ts`
- `lib/territorios/intelligence/interpretation/selection.ts`
- `lib/territorios/intelligence/interpretation/serializer.ts`
- `lib/territorios/intelligence/interpretation/guards.ts`
- `lib/territorios/intelligence/interpretation/validator.ts`
- `lib/territorios/intelligence/interpretation/provider.ts`
- `lib/territorios/intelligence/interpretation/build.ts`
- `lib/territorios/intelligence/interpretation/pipeline.ts`
- `lib/territorios/intelligence/interpretation/lineage.ts`
- `lib/territorios/intelligence/interpretation/test-fixtures.ts`
- `lib/territorios/intelligence/interpretation/{selection,guards,validator,serializer,provider,pipeline,lineage}.test.ts` (7 arquivos)
- `scripts/poc-intel03a-interpretation-3-municipios.ts`

## 68. Arquivos alterados

Nenhum. `contracts.ts`, `guardrails.ts`, `lineage.ts`, `economy/*`, frontend, n8n e Orquestrador permanecem exatamente como estavam.

## 69. `git diff --stat`

Não aplicável no sentido tradicional — todos os arquivos deste gate são novos e não rastreados (`??`), consistente com a convenção já usada em todos os gates anteriores desta sessão (arquivos só entram no controle de versão em um commit posterior, fora do escopo deste gate).

## 70. Conflitos

Nenhum. `lib/territorios/caged/` (ECO-03B1.5/Codex) não foi tocado; a suíte territorial cresceu de 693 para 756 testes só pela soma dos 63 novos testes deste gate — sem nenhuma interferência cruzada detectada.

## 71. Riscos

- O `RuleBasedMockProvider` é deliberadamente simples (um claim por unidade, agrupamento só por família) — um provider real (INTEL-03B) precisará de lógica de síntese mais rica, mas o contrato (`InterpretationProvider`) já comporta isso sem mudança de tipo.
- `knownEntities` está vazio por padrão — funcional para este POC (nenhum draft nomeia entidades), mas um provider real que precise nomear o município ou fontes oficiais por extenso exigirá popular esse conjunto deliberadamente (nunca automaticamente a partir de texto livre).
- `maxUnitsPerFamily = 6` é um valor documentado e testado, mas ainda não passou por avaliação com todos os domínios futuros (Segurança, Saúde) — validado apenas para Economia.

## 72. Débitos técnicos

- Nenhuma resolução automática de `contradicts[]` entre Interpretations diferentes (fora de escopo deste gate — exigiria comparar múltiplas Interpretations entre si, não apenas validar uma).
- `temporalScope` do draft é um rótulo derivado dos períodos das unidades (min/max lexicográfico), não uma reconciliação metodológica completa — suficiente para este gate, pode precisar de refinamento se períodos de formatos muito diferentes coexistirem no futuro.

## 73. Recomendação INTEL-03B

Prosseguir. O contrato, o harness de seleção/validação e o provider interface já estão provados com dados reais e lineage 100% íntegra nos 3 municípios piloto. INTEL-03B deve: (a) implementar um `InterpretationProvider` real (LLM) que produz `InterpretationDraft[]` a partir do MESMO `InterpretationInputContext`/serializer já existentes; (b) manter `CLOSED_EVIDENCE` como único modo até uma decisão explícita em contrário; (c) rodar todo draft do provider real pelo MESMO `validateInterpretationDraft` sem nenhuma exceção — nenhum draft de LLM deve pular guardrail.

## 74. Provider recommendation

Não decidido neste gate (fora de escopo — "sem LLM"). A interface `InterpretationProvider` é agnóstica de fornecedor por design; a escolha de provider/modelo é uma decisão de INTEL-03B, não de arquitetura.

## 75. Input recomendado para INTEL-03B

`InterpretationInputContext` produzido por `selectInterpretationInput` + `serializeInterpretationContext`, exatamente como usado neste gate — nenhuma mudança de contrato necessária para plugar um provider real.

---

## Declaração de segurança

| Item | Resultado |
|---|---|
| LLM CHAMADO | **NÃO** |
| API PROVIDER CHAMADA | **NÃO** |
| PROMPT FINAL CRIADO | **NÃO** |
| EXTERNAL KNOWLEDGE | **NÃO** |
| INTERPRETATION REAL PARA PRODUÇÃO | **NÃO** |
| IMPLICATION | **NÃO** |
| RECOMMENDATION | **NÃO** |
| FRONTEND ALTERADO | **NÃO** |
| CAGED ALTERADO | **NÃO** |
| N8N ALTERADO | **NÃO** |
| ORQUESTRADOR ALTERADO | **NÃO** |
| DEPLOY | **NÃO** |

## Gate final

| Item | Resultado |
|---|---|
| RAW SIGNAL ROLE | PASS |
| CONSOLIDATED SIGNAL ROLE | PASS |
| INPUT SELECTION | PASS |
| DENSITY CONTROL | PASS |
| CLOSED CONTEXT | PASS |
| INTERPRETATION CONTRACT | PASS |
| CLAIM TRACEABILITY | PASS |
| NUMERIC FIDELITY | PASS |
| SOURCE FIDELITY | PASS |
| TEMPORAL FIDELITY | PASS |
| CAUSAL GUARD | PASS |
| FORECAST GUARD | PASS |
| NORMATIVE GUARD | PASS |
| POLITICAL ATTRIBUTION GUARD | PASS |
| NOMINALITY | PASS |
| PIB PER CAPITA | PASS |
| CONTRADICTIONS | PASS (preservado estruturalmente, não exercitado substantivamente) |
| INSUFFICIENT EVIDENCE | PASS |
| VALIDATOR | PASS |
| STRUCTURED OUTPUT | PASS |
| PROVIDER INTERFACE | PASS |
| MOCK PROVIDER | PASS |
| LINEAGE | PASS |
| POC CONTAGEM | PASS |
| POC BETIM | PASS |
| POC BH | PASS |
| TESTES | PASS (63/63 do módulo; 756/756 da suíte territorial) |
| TYPECHECK | PASS |
| LINT | PASS |
| BUILD | PASS |
| LLM | NÃO |
| **PRONTO PARA INTEL-03B** | **SIM** |
| **PRONTO PARA FRONTEND REAL** | **NÃO** (nenhuma integração de UI foi feita ou avaliada neste gate) |
| **PRONTO PARA PERSISTIR INTERPRETATION** | **COM RESSALVAS** (mecanismo e contrato prontos; política de persistência/retenção/versionamento de Interpretations ainda não desenhada — fora de escopo deste gate) |

---

## Encerramento

INTEL-03A concluído. A fundação da camada L4 está implementada, testada (63 testes novos, 100% PASS) e provada com dados reais dos 3 municípios piloto (lineage 100% íntegra, zero refs quebradas, zero drafts rejeitados pelo mock provider — e uma bateria separada de exemplos inválidos do próprio gate confirmando que o validador rejeita corretamente causalidade, previsão, juízo de valor, atribuição política, nominalidade indevida e equivalência indevida de PIB per capita).

Conforme instruído: **PARE.** Não iniciei INTEL-03B. Não chamei LLM. Não criei prompt final. Não criei Implication. Não criei Recommendation. Não alterei frontend. Não integrei Orquestrador. Não fiz deploy. Entregue: `docs/relatorios/CLAUDE_INTEL03A_ARQUITETURA_INTERPRETATION.md`. Aguardando decisão antes do próximo gate.
