# PolitixOS Territórios — INTEL-02
## Motor Determinístico de Inteligência Econômica Territorial
### Evidence → Derived Indicator → Analytical Signal

**Data:** 16/08/2026
**Agente:** Claude
**Modo:** arquitetura + implementação determinística, sem LLM

## 1. Estado inicial

`git status`/`git diff`/`git branch`/`git worktree list` executados antes de qualquer edição. Branch `main`, worktree principal compartilhado.

## 2. Branch/worktree

Permaneci no worktree compartilhado, sem criar branch/worktree isolado — mesma justificativa do INTEL-01: preciso inspecionar (somente leitura) o trabalho concorrente de Codex (ECO-02B) e Antigravity (FRONT-03) para não duplicar/colidir arquitetura, e esse trabalho existe apenas como arquivos não commitados no worktree principal. Todas as minhas escritas foram estritamente novas (`lib/territorios/intelligence/economy/`, `scripts/poc-intel02-economia-contagem.ts`, este relatório) — nenhum arquivo de terceiros foi tocado.

## 3. Concorrência identificada

- **Codex/ECO-02B**: `lib/territorios/economia-pib-client.ts`, `economia-pib-collector.ts`, `economia-pib-normalizer.ts(.test.ts)`, `scripts/audit-economia-pib-municipal.ts` — em execução. Não lidos para edição, não alterados.
- **Antigravity/FRONT-03**: `lib/territorios/intelligence/frontend-adapters.ts(.test.ts)`, `app/dashboard/territorios/sandbox/page.tsx`, `components/dashboard/territorios/command-center/`, e outros 13 arquivos de frontend território modificados. Lidos (somente leitura) para a auditoria do gate 0. Não alterados.
- `lib/territorios/ibge-client.ts` modificado (M) por linha paralela não identificada — não tocado.

Nenhuma colisão de arquivo com este gate.

## 4. Baseline INTEL-01

Lido integralmente `docs/relatorios/CLAUDE_INTEL01_ARQUITETURA_INTELIGENCIA_POLITICA.md` (relatório próprio, sessão anterior). Contrato canônico (`contracts.ts`) e infraestrutura de lineage/guardrails (`lineage.ts`, `guardrails.ts`) reutilizados integralmente, sem alteração.

## 5. Auditoria FRONT-03 (gate 0 do bloco)

Lido integralmente `docs/relatorios/ANTIGRAVITY_FRONT03_INTEGRACAO_CONTRATO_INTELIGENCIA.md` e o código real de `lib/territorios/intelligence/frontend-adapters.ts`.

### RESSALVA A — `Evidence.id` no ViewModel

O relatório FRONT-03 contém uma tensão interna real: a seção 9 afirma que `toEvidenceDetail()` "preserva `id`, `evidenceHash`, `dataset`, `source`, `indicator` e `period`", enquanto a resposta obrigatória #3 diz que "`Evidence.id` é preservado no campo `description`/`metadata`". **Verificação do código real** (`frontend-adapters.ts:78-89`):

```ts
export function toEvidenceDetail(evidence: Evidence): EvidenceDetail {
  return {
    label: evidence.indicator.replace(/_/g, ' ').toUpperCase(),
    value: evidence.value !== null ? String(evidence.value) : '—',
    unit: evidence.unit ?? undefined,
    period: evidence.period,
    source: evidence.source,
    dataset: evidence.dataset,
    domain: evidence.domain,
    description: `Hash de Rastreabilidade: ${evidence.evidenceHash ?? 'N/A'} (ID: ${evidence.id})`,
  };
}
```

**Confirmado: `Evidence.id` e `evidenceHash` NÃO possuem identidade estrutural explícita no ViewModel.** `EvidenceDetail` (definido em `EvidencePanel.tsx`) não tem campo `id` nem `metadata` — apenas `description?: string`. O ID/hash está embutido como **texto formatado dentro de uma string de exibição**, recuperável apenas por parsing de regex frágil (`/\(ID: (.+)\)/`), não por acesso a campo tipado.

**Classificação de risco: MODERADO, não bloqueante para este gate.** `label`, `value`, `unit`, `period`, `source`, `dataset`, `domain` — os campos realmente usados para exibição — estão corretos e presentes como campos estruturados. O que falta é apenas a identidade programática (necessária para, por exemplo, um clique em "ver evidência" reabrir exatamente aquela evidência via API, ou para deduplicação por ID no frontend). Não corrigi `EvidencePanel.tsx`/`frontend-adapters.ts` neste gate (proibido pela instrução "não corrigir frontend arbitrariamente"). **Recomendação registrada para FRONT-04**: adicionar `id: string` (e, se necessário, `evidenceHash: string`) como campo estruturado explícito em `EvidenceDetail`, mantendo `description` como está para exibição textual.

### RESSALVA B — divergência 528 (INTEL-01) vs 522 (FRONT-03) testes

Investigação direta, não apenas leitura dos relatórios:

1. **Contagem atual real** (antes de qualquer alteração deste gate), escopo `lib/territorios app/api/territorios` (o mesmo escopo usado para produzir o número 528 do INTEL-01): **66 arquivos, 554 testes**. Consistente com o crescimento esperado desde o INTEL-01 (64/528) + FRONT-03 (+1 arquivo/+7 testes, `frontend-adapters.test.ts`, confirmado presente e com exatamente 7 testes) + trabalho concorrente do Codex (ECO-02B) no meio tempo.
2. **Aritmética que não fecha**: FRONT-03 alega adicionar 1 arquivo novo com "7/7 testes passados" sobre a baseline de 528 — isso deveria produzir no mínimo 535 testes, não 522 (uma diferença de 13 testes não explicada pelo próprio relatório FRONT-03).
3. **Achado de causa provável**: um `npx vitest run` **sem escopo** (que é o que "Total do Projeto" em FRONT-03 seção 44 sugere ter sido usado) varre recursivamente `.claude/worktrees/politix-territorios-audit-5a9be0/` — um worktree Git **aninhado dentro do próprio repositório principal** — e mistura os testes desse worktree aninhado com os do worktree principal, de forma não-determinística (depende do que está checked-out no worktree aninhado no momento exato da execução). Reproduzido nesta auditoria: `npx vitest run` sem escopo neste momento retornou **148 arquivos / 1244 testes com 2 arquivos falhando** (falhas exclusivamente em `.claude/worktrees/politix-territorios-audit-5a9be0/app/dashboard/territorios/TerritoriosClient.test.tsx` — uma cópia do worktree aninhado, não o arquivo real do worktree principal).
4. **Conclusão**: a divergência **não é uma regressão de testes perdidos**. É uma diferença de metodologia de medição — o número do INTEL-01 (528) foi deliberadamente escopado (`lib/territorios app/api/territorios`); o número "Total do Projeto" do FRONT-03 (522) foi presumivelmente um `vitest run` sem escopo, cujo resultado é **inerentemente não-reprodutível** neste repositório específico por causa do worktree aninhado. Isso não é um problema introduzido por FRONT-03 nem por INTEL-01 — é uma característica estrutural do ambiente compartilhado (múltiplos worktrees Claude sob `.claude/worktrees/`) que nenhum dos dois relatórios anteriores havia diagnosticado.
5. **Nenhuma correção foi feita** (nem no INTEL nem no FRONT-03) — isto pertence à camada de configuração de testes/CI (`vitest.config`), fora do escopo deste gate determinístico. **Registrado como débito técnico e recomendação de processo**: todo relatório futuro deve declarar o comando `vitest` exato usado (com escopo explícito), nunca apenas "X testes / Y arquivos" sem o comando.

## 6. Evidence.id (resumo da RESSALVA A)

Ver seção 5. Estruturalmente presente em `Evidence` (contrato canônico), ausente como campo estruturado em `EvidenceDetail` (ViewModel).

## 7. Investigação 528 vs 522

Ver seção 5.

## 8. Arquitetura INTEL-02

```
lib/territorios/intelligence/economy/
  types.ts               — tipos de suporte específicos do domínio (não duplica contracts.ts)
  thresholds.ts           — catálogo centralizado de thresholds (nenhum magic number solto)
  derived-indicators.ts   — catálogo + cálculo de DerivedIndicator (L2)
  signals.ts               — 7 regras de AnalyticalSignal (L3) + estado INSUFFICIENT_EVIDENCE
  engine.ts                — orquestrador puro: Evidence[] -> DerivedIndicator[] -> Signal[]
  fixtures.ts               — 12 fixtures sintéticas (A-L)
  *.test.ts                 — 56 testes
```

## 9. Pure core

`engine.ts` não importa `@/lib/supabaseClient`, não faz `fetch`, não conhece n8n, não conhece React. Recebe apenas `Evidence[]` (contrato canônico) e retorna `EconomicIntelligenceResult` em memória. Testado via `runEconomicIntelligenceEngine` chamado diretamente com fixtures em memória, sem qualquer I/O.

## 10. Inputs

Único ponto de entrada: `Evidence[]` já normalizada, no formato canônico do INTEL-01. O motor não consulta SICONFI, não consulta IBGE. A leitura de `territory_indicators`/`territory_evidence` para construir `Evidence[]` acontece **fora** do motor, no script de POC (`scripts/poc-intel02-economia-contagem.ts`), mantendo a separação SOURCE ENGINE vs. INTELLIGENCE ENGINE exigida pela seção 5 do gate.

## 11. ECO-01 como base real

7 indicadores identificados no código real (`lib/territorios/economia-siconfi-normalizer.ts`, `ECONOMY_INDICATOR_DEFINITIONS`) e confirmados persistidos no banco real para Contagem/3118601: `receita_total_bruta_realizada`, `receita_corrente_bruta_realizada`, `receita_tributaria_bruta_realizada`, `transferencias_correntes_brutas_realizadas`, `despesa_corrente_empenhada`, `despesa_capital_empenhada`, `investimento_empenhado` — 6 exercícios (2020-2025), 42 registros. Nenhum indicador foi presumido além destes 7.

## 12. Readiness ECO-02

`engine.ts` expõe `EconomyEngineConfig` (`monetaryIndicators`, `sharePairs`, `pressurePair`, `divergencePair`) como parâmetros — o catálogo ECO-01 é o **default**, não um hardcode. ECO-02B (ainda em execução pelo Codex) poderá ser conectado passando os nomes dos indicadores PIB propostos em `CODEX_ECO02A_DISCOVERY_PIB_MUNICIPAL.md` (`pib_municipal_precos_correntes`, `vab_*`, etc.) como configuração adicional, sem qualquer alteração em `engine.ts`. **Não implementado nem testado com dados PIB neste gate** — apenas o extension point existe.

## 13. Catálogo de DerivedIndicators

Ver `ECONOMY_DERIVED_INDICATOR_CATALOG` em `derived-indicators.ts` — 2 famílias de método priorizadas (não dezenas, por instrução do gate):

| id | fórmula | inputs | unidade | comparabilidade |
|---|---|---|---|---|
| `variacao_nominal_interanual` | `(valor_t - valor_t-1) / |valor_t-1| * 100` | 2 evidências, mesmo indicador, anos consecutivos | % | exige anos consecutivos, ambos anuais completos |
| `participacao_percentual` | `componente / agregador * 100` | 2 evidências, mesmo período | % | exige mesmo período exato |

## 14. Fórmulas

Ver seção 13. Testadas com valor conhecido: `100 → 110` produz exatamente `10%` (teste `derived-indicators.test.ts`).

## 15. Unidades

`BRL` (entrada), `%` (saída de ambos os métodos). Nenhuma conversão de unidade é feita pelo motor — os valores de `Evidence` já chegam em `BRL` do ECO-01.

## 16. Nominalidade

Todo `DerivedIndicator`/`AnalyticalSignal` derivado de `ECON_VAR_YOY_V1` carrega `Limitation{code:'NOMINAL_VALUE'}` explicitamente. Testado (`engine.test.ts`: "todo DerivedIndicator de variação carrega a limitação NOMINAL_VALUE"). Nenhuma ocorrência da palavra "real" referindo-se a crescimento em nenhum lugar do código — confirmado por leitura direta de todo o módulo.

## 17. Temporalidade

`referencePeriod` (ano dos dados) nunca é confundido com `collectedAt`/timestamp de execução. `TemporalCoverage.periodStart`/`periodEnd` derivam exclusivamente dos anos presentes em `Evidence[].period`, nunca de `new Date()`. Testado explicitamente.

## 18. Missing data

Ausência nunca vira zero (testado: valor `null` é ignorado, não produz variação). Ano intermediário ausente não é comparado como se fosse consecutivo (fixture F, testado). Quando um indicador configurado não tem nenhuma evidência, o motor emite um `Signal` explícito com `status:'INSUFFICIENT_EVIDENCE'` em vez de omitir silenciosamente ou inventar.

## 19. Outliers

Nenhum outlier é removido da série — `calculateNominalYoyVariations` preserva todos os pontos. `detectAnomaly` apenas **sinaliza** via IQR (Tukey, multiplicador 1,5), nunca corrige a fonte. No POC real de Contagem, a volatilidade de `investimento_empenhado` (-51%, +119%) foi avaliada e **não** cruzou os limites de IQR daquela série específica (ver seção 41) — resultado matematicamente correto, não um bug.

## 20. Método/versionamento

Todo `DerivedIndicator` carrega `methodId`+`methodVersion` fixos (`ECON_VAR_YOY_V1`/`ECON_SHARE_V1`, sempre `v1` nesta versão). Todo `AnalyticalSignal` carrega `methodId` próprio da regra (`ECON_SIGNAL_TREND_V1` etc.) + `methodVersion` do motor (`v1`). Nenhuma versão é gerada por execução — são constantes de código.

## 21. Thresholds

Centralizados em `thresholds.ts` (`ECON_THRESHOLDS`), cada um com `name`, `value`, `unit`, `justification`, `version`. Nenhum número mágico solto no restante do código — confirmado por não haver literais numéricos de comparação fora de `thresholds.ts` (exceto o `4` de tamanho mínimo de amostra para IQR em `detectAnomaly`, documentado inline como requisito estatístico mínimo, não um threshold de negócio).

## 22. Regras TREND

Mínimo de 3 intervalos consecutivos com o mesmo sinal (`ECON_THRESHOLDS.TREND_MIN_CONSECUTIVE_PERIODS`). Cadeia deve ser verdadeiramente consecutiva (`toYear[i] === fromYear[i+1]`), não apenas N variações quaisquer. **PASS** — produziu 4 sinais reais em Contagem (`receita_corrente`, `receita_total`, `receita_tributaria`, `despesa_corrente`, todos 2022-2025 crescentes).

## 23. Regras CHANGE

Threshold de 15% de variação nominal absoluta (`ECON_THRESHOLDS.CHANGE_YOY_THRESHOLD_PCT`). **PASS** — 20 sinais reais em Contagem.

## 24. Regras PRESSURE

Despesa corrente crescendo mais que receita corrente em pelo menos 2 dos últimos 3 intervalos comparáveis. **NÃO APLICÁVEL para Contagem real** — apenas 1 dos últimos 3 intervalos mostrou despesa crescendo mais que receita (2022-2023), abaixo do mínimo de 2. Testado com fixture sintética positiva e negativa.

## 25. Regras CONCENTRATION

Participação ≥80% no período mais recente. **PASS** — investimento representa 78,4% da despesa de capital em 2025 (abaixo do limiar 80% — NÃO disparou CONCENTRATION em 2025, mas disparou em anos anteriores da mesma série, ex. 90,9% em 2020, 91,2% em 2023; apenas o período **mais recente** é avaliado, por desenho). Testado com fixture sintética.

## 26. Regras DIVERGENCE

Dois indicadores relacionados (`receita_corrente` × `despesa_corrente`) com sinais opostos no mesmo intervalo. **NÃO APLICÁVEL para Contagem real** — ambos cresceram em todos os 5 intervalos 2020-2025 (nunca divergem). Testado com fixture sintética positiva (K) e negativa.

## 27. Regras ANOMALY

IQR (Tukey, multiplicador 1,5), mínimo de 4 observações. **PASS metodologicamente, mas 0 sinais reais em Contagem** — nenhuma das séries de 5 variações produziu um ponto fora dos limites de IQR da própria série, mesmo a série de `investimento_empenhado` sendo visualmente muito volátil (-51% a +119%). Isso é o resultado correto de um método estatístico robusto aplicado a uma amostra pequena e já inerentemente volátil (IQR se ajusta à dispersão observada) — não um defeito. Testado com fixture sintética H (outlier real em série majoritariamente estável), onde o método corretamente detecta.

## 28. Regras ATTENTION

Participação do período mais recente abaixo do mínimo dos 3 exercícios anteriores comparáveis. **PASS** — 1 sinal real: participação de investimento em despesa de capital caiu para 78,4% em 2025, abaixo do mínimo de 87,1% observado em 2022-2024.

## 29. Severity

`HIGH`/`MODERATE`/`LOW`, calculado deterministicamente por regra (ex.: CHANGE é `HIGH` se a variação for ≥2× o threshold, senão `MODERATE`). Testado.

## 30. Priority

**Sempre `null`** neste gate — por decisão metodológica explícita (seção 31 do gate): transformar magnitude em prioridade de decisão exige metodologia política que não existe ainda neste bloco determinístico. `SignalPriority` permanece no contrato canônico para uso futuro (L4+), mas o motor de Economia L3 nunca a preenche.

## 31. Confidence

Todo `AnalyticalSignal` ativo recebe `'DIRECTLY_SUPPORTED'` (sustentado diretamente por evidência oficial, sem inferência intermediária). `INSUFFICIENT_EVIDENCE` recebe `confidence: null`. Nenhum score percentual em nenhum lugar do código — testado explicitamente (`engine.test.ts`).

## 32. Coverage

`available`/`partial`/`unavailable` calculado pela fração de indicadores configurados com evidência presente. Testado nos 3 estados.

## 33. Temporal coverage

Ver seção 17.

## 34. Limitations

`NOMINAL_VALUE` (todo indicador monetário), `PARTICIPATION_NOT_CAUSATION` (toda participação), `NO_CAUSALITY` (PRESSURE/DIVERGENCE), `SHORT_SERIES` (ANOMALY), `HISTORICAL_WINDOW_LIMITED` (ATTENTION), `PARTIAL_COVERAGE` (nível do resultado). Sempre anexadas ao objeto afetado (`DerivedIndicator.limitations`/`AnalyticalSignal.limitations`/`EconomicIntelligenceResult.limitations`), nunca apenas em log.

## 35. Lineage

Todo `AnalyticalSignal.evidenceRefs` e todo `DerivedIndicator.inputs[].evidenceRef` resolve dentro do `evidenceIndex` retornado — testado exaustivamente (`engine.test.ts`), incluindo uma prova de compatibilidade direta com `assertLineageResolves()` do INTEL-01 (uma `Interpretation`/`Recommendation` fictícia construída sobre um `Signal` real do motor resolve sem erro).

## 36. IDs

Determinísticos: `derivedIndicatorId(indicador, método, período, territoryId)` e IDs de sinal (`signal:economia:{tipo}:{indicador}:{período}`) — nunca `randomUUID()`, nunca timestamp. Testado: mesmos inputs produzem sempre o mesmo ID.

## 37. Deduplicação

`deduplicateSignals()` em `engine.ts`, por `Map` chaveado em `id` — defensivo, já que as regras produzem IDs estáveis por fenômeno/período. Testado: nenhum ID duplicado no resultado final.

## 38. Ordenação

`compareSignals()`: `priority → severity → type → id`, totalmente determinístico (nunca depende de ordem de inserção). Testado.

## 39. Tratamento de erros

`EconomyEngineError` com códigos `INVALID_INPUT | INSUFFICIENT_EVIDENCE | INCOMPARABLE_PERIODS | MISSING_REQUIRED_INDICATOR | BROKEN_LINEAGE | METHOD_ERROR` (`types.ts`). `INVALID_INPUT` testado (territoryId ausente; evidence de território divergente).

## 40. Observabilidade

Não implementada como infraestrutura de log neste gate (desproporcional ao escopo determinístico puro). `EconomicIntelligenceResult.methodology`/`engineVersion` já carregam o essencial para reconstrução de auditoria (seção 74 do gate lista territoryId/engine/methodVersion/evidenceCount/etc. — todos já disponíveis nos campos do resultado retornado, sem necessidade de um logger dedicado neste gate).

## 41. POC real

Executado via `scripts/poc-intel02-economia-contagem.ts`, somente leitura, sem persistência.

**Contagem/MG (3118601)**: 42 itens de evidência real carregados (6 exercícios). **53 DerivedIndicators** gerados (35 variações interanuais + 18 participações). **25 Signals reais**: 20 CHANGE, 4 TREND, 1 ATTENTION. 0 PRESSURE, 0 DIVERGENCE, 0 ANOMALY — todos avaliados e corretamente não disparados pelos dados reais (não por falha do motor). Coverage `available`. TemporalCoverage `2020-2025`.

**Betim/MG (3106705)**: 0 itens de evidência (ECO-01 nunca persistiu dados de Betim — apenas testou leitura sem persistir, conforme já documentado na auditoria ECO-01). Coverage `unavailable`. **10 Signals com `status:'INSUFFICIENT_EVIDENCE'`**, um por indicador/par configurado, nenhum dado inventado. Prova direta da seção 83 do gate: "Se os dados reais NÃO suportarem signal: NÃO INVENTAR... Isso também é sucesso."

## 42. Território utilizado

Contagem/3118601 (dados reais ECO-01 completos) e Betim/3106705 (teste de ausência de hardcode + evidência insuficiente real). Nenhuma interpretação política foi gerada para nenhum dos dois.

## 43. Evidências utilizadas

42 registros reais de `territory_indicators` (Contagem) + 6 hashes reais de `territory_evidence` (`SICONFI_DCA:3118601:2020` a `:2025`), lidos diretamente do banco de produção, nunca modificados.

## 44. DerivedIndicators gerados

53 (Contagem) / 0 (Betim, corretamente vazio). Ver seção 41 para amostra completa.

## 45. Signals gerados

25 (Contagem, todos `ACTIVE`) / 10 (Betim, todos `INSUFFICIENT_EVIDENCE`). Ver seção 41.

## 46. Casos insufficient evidence

Betim: 10/10 sinais. Fixture E (uma única observação): 0 variações calculáveis, sem erro. Fixture sintética de coverage parcial (J): 1 de 2 indicadores ausente, gerando `INSUFFICIENT_EVIDENCE` para o ausente e `PARTIAL_COVERAGE` como limitation do resultado.

## 47. Integração contrato INTEL-01

Nenhum novo tipo canônico foi criado. `Evidence`, `DerivedIndicator`, `AnalyticalSignal`, `Coverage`, `TemporalCoverage`, `ConfidenceClass`, `Limitation` — todos importados diretamente de `../contracts.ts`, sem duplicação. `EconomicIntelligenceResult` (novo, em `economy/types.ts`) é uma composição desses tipos, não um contrato paralelo concorrente.

## 48. Compatibilidade FRONT-03

Não testada em runtime (frontend não foi tocado, por instrução). Verificação estrutural: `frontend-adapters.ts` já sabe converter `AnalyticalSignal` (`toPoliticalSignalViewModel`), `Evidence` (`toEvidenceDetail`) e demais tipos canônicos — os `Signal`s produzidos pelo motor de Economia usam exatamente os mesmos campos (`id`, `territoryId`, `domains`, `type`, `priority`, `severity`, `title`, `summary`, `evidenceRefs`, `derivedIndicatorRefs`, `period`, `status`, `confidence`, `limitations`, `methodId`, `methodVersion`) que os adapters já esperam. Nenhuma incompatibilidade estrutural identificada por inspeção de tipo. **Ressalva**: `frontend-adapters.ts` monta `evidenceText` a partir de `signal.evidenceRefs.length` e `signal.period` (string livre) — funciona com os sinais do motor de Economia sem alteração.

## 49. Extensão ECO-02B

Ver seção 12. Extension point pronto (`EconomyEngineConfig`), não testado com dados PIB reais (ECO-02B não homologado).

## 50. Extensão CAGED/RAIS

Não implementada — arquitetura (`EconomyEngineConfig` com listas de indicadores configuráveis, sem acoplamento a nomes SICONFI/DCA no `engine.ts`) já comporta adicionar `monetaryIndicators`/`sharePairs` de outra fonte sem alterar o motor, quando esses dados existirem.

## 51. Testes unitários

Ver seções 52-62. Total do módulo: **7 arquivos, 90 testes** (`lib/territorios/intelligence` completo, incluindo INTEL-01/FRONT-03 já existentes + os 56 novos do INTEL-02).

## 52. Testes de fórmula

`derived-indicators.test.ts`, 15 testes: 100→110=10% exato; queda -25% exata; denominador zero não fabrica; valor null não vira zero; observação única não calcula; ano do meio ausente não compara; período não anual ignorado; precisão da série real de crescimento; evidenceRefs corretos; participação 50/200=25%; período divergente não calcula; denominador zero na participação não calcula; ordenação determinística independente da entrada; ID determinístico (2 testes).

## 53. Testes de signals

`signals.test.ts`, 27 testes: TREND (5: positivo crescente, positivo decrescente, negativo estável, boundary 2 intervalos, insuficiente), CHANGE (4: positivo, negativo, boundary exato 15%, boundary 14,99%), ANOMALY (3: positivo outlier real, negativo estável, insuficiente <4 obs.), CONCENTRATION (4: positivo 85%, negativo 50%, boundary exato 80%, insuficiente), DIVERGENCE (2: positivo sinais opostos, negativo mesmo sentido), PRESSURE (3: positivo persistente, negativo mesmo ritmo, insuficiente <2 intervalos), ATTENTION (3: positivo abaixo do histórico, negativo dentro da janela, insuficiente janela incompleta), insufficientEvidenceSignal (1), segurança semântica RISK/OPPORTUNITY nunca como type (1).

## 54. Testes de determinismo

`engine.test.ts`: mesma execução duas vezes produz `DerivedIndicators`/`Signals` idênticos (`toEqual` profundo, incluindo IDs e ordem).

## 55. Testes de ordem

Fixture L (dados de A embaralhados) produz resultado `toEqual` idêntico ao da fixture A original.

## 56. Testes de lineage

Todo `evidenceRef` de todo `Signal`/`DerivedIndicator` resolve no `evidenceIndex`; interoperabilidade direta com `assertLineageResolves()` do INTEL-01 testada com uma `Interpretation`/`Recommendation` fictícia construída sobre um `Signal` real do motor.

## 57. Testes de missing

Cobertos em `derived-indicators.test.ts` (seção 52) e `engine.test.ts` (coverage partial/unavailable + sinais INSUFFICIENT_EVIDENCE).

## 58. Testes de temporalidade

`engine.test.ts`: `periodStart`/`periodEnd` corretos e nunca contêm timestamp ISO de execução.

## 59. Testes de nominalidade

`engine.test.ts`: todo `DerivedIndicator` de variação carrega `Limitation{code:'NOMINAL_VALUE'}`.

## 60. Testes de coverage

`engine.test.ts`: os 3 estados (`available`/`partial`/`unavailable`) testados com fixtures dedicadas.

## 61. Testes de confidence

`engine.test.ts`: apenas as 3 classes qualitativas ou `null`, nunca percentual.

## 62. Testes de limitations

Cobertos transversalmente (seção 34) — toda limitation testada no contexto do teste da regra/objeto que a produz.

## 63. Regressão

`lib/territorios/economia` (ECO-01, não tocado): 4 arquivos, 28 testes, PASS (idêntico ao baseline pré-INTEL-02). Suíte territorial ampliada (`lib/territorios app/api/territorios`): **69 arquivos, 610 testes, PASS** (66/554 antes deste gate — aumento de exatamente 3 arquivos/56 testes, sem regressão).

## 64. Typecheck

`npx tsc --noEmit`: **0 erros em `lib/territorios/intelligence`** (incluindo `economy/`). 3 erros pré-existentes em `app/dashboard/territorios/sandbox/page.tsx` (Antigravity, untracked, não tocado) — não relacionados a este gate.

## 65. Lint

`npx eslint lib/territorios/intelligence/economy scripts/poc-intel02-economia-contagem.ts --max-warnings=0`: **0 erros, 0 warnings**. 5 warnings pré-existentes em `frontend-adapters.ts`/`.test.ts` (Antigravity, untracked) — não relacionados.

## 66. Build

`npm run build` falha — **exclusivamente** por um erro de sintaxe JSX real em `app/dashboard/territorios/sandbox/page.tsx:306` (Antigravity, um `->` literal dentro de texto JSX que precisa ser `{'->'}`), untracked, não tocado por este gate. Não é uma regressão introduzida pelo INTEL-02.

## 67. Arquivos criados

- `lib/territorios/intelligence/economy/types.ts`
- `lib/territorios/intelligence/economy/thresholds.ts`
- `lib/territorios/intelligence/economy/derived-indicators.ts`
- `lib/territorios/intelligence/economy/signals.ts`
- `lib/territorios/intelligence/economy/engine.ts`
- `lib/territorios/intelligence/economy/fixtures.ts`
- `lib/territorios/intelligence/economy/derived-indicators.test.ts`
- `lib/territorios/intelligence/economy/signals.test.ts`
- `lib/territorios/intelligence/economy/engine.test.ts`
- `scripts/poc-intel02-economia-contagem.ts`
- `docs/relatorios/CLAUDE_INTEL02_MOTOR_DETERMINISTICO_ECONOMIA.md`

## 68. Arquivos alterados

**Nenhum.** `contracts.ts`, `lineage.ts`, `guardrails.ts` (INTEL-01), todos os arquivos de ECO-01/ECO-02B, todos os arquivos de frontend/FRONT-03 permanecem exatamente como estavam.

## 69. `git diff --stat`

```
 lib/territorios/intelligence/economy/derived-indicators.test.ts | novo, ~100 linhas
 lib/territorios/intelligence/economy/derived-indicators.ts      | novo, ~135 linhas
 lib/territorios/intelligence/economy/engine.test.ts             | novo, ~110 linhas
 lib/territorios/intelligence/economy/engine.ts                  | novo, ~185 linhas
 lib/territorios/intelligence/economy/fixtures.ts                | novo, ~90 linhas
 lib/territorios/intelligence/economy/signals.test.ts            | novo, ~150 linhas
 lib/territorios/intelligence/economy/signals.ts                 | novo, ~220 linhas
 lib/territorios/intelligence/economy/thresholds.ts               | novo, ~85 linhas
 lib/territorios/intelligence/economy/types.ts                    | novo, ~50 linhas
 scripts/poc-intel02-economia-contagem.ts                          | novo, ~90 linhas
```
`git status` confirmado ao final: apenas `lib/territorios/intelligence/economy/` e `scripts/poc-intel02-economia-contagem.ts` como `??`. Todo o restante do worktree permanece exatamente como estava.

## 70. Conflitos

Nenhum. Ver seção 3.

## 71. Migrations

**Nenhuma.** Não persisti `DerivedIndicators`/`Signals` em nenhuma tabela. O `EconomicIntelligenceResult` retorna em memória; persistência (se desejada no futuro) seguiria a mesma recomendação já registrada no INTEL-01 (`territory_briefings.content`), sem necessidade de novo schema.

## 72. Banco

Apenas leitura (`territory_indicators`, `territory_evidence`) no script de POC — nenhum `INSERT`/`UPDATE`/`DELETE` foi executado por este gate.

## 73. n8n

Não tocado.

## 74. Orquestrador

Não tocado, não integrado.

## 75. Débitos técnicos

1. Divergência de metodologia de medição de testes ("total do projeto" vs. escopo explícito) causada por worktrees aninhados sob `.claude/worktrees/` — não corrigida (fora de escopo), apenas diagnosticada e documentada (seção 5, RESSALVA B).
2. `Evidence.id`/`evidenceHash` sem identidade estruturada em `EvidenceDetail` (RESSALVA A) — recomendado para FRONT-04, não corrigido aqui.
3. `app/dashboard/territorios/sandbox/page.tsx` tem um erro de sintaxe JSX real que quebra o build do projeto inteiro — pré-existente, não corrigido (fora de escopo, pertence ao Antigravity).

## 76. Riscos metodológicos

- Os thresholds (`CHANGE_YOY_THRESHOLD_PCT=15%`, `CONCENTRATION_SHARE_THRESHOLD_PCT=80%`, `TREND_MIN_CONSECUTIVE_PERIODS=3`) foram calibrados por raciocínio estatístico/econômico geral e pela distribuição observada em Contagem, não por um estudo formal cross-município. Podem precisar de recalibração quando o motor for testado em municípios de porte muito diferente.
- `detectAnomaly` com IQR exige pelo menos 4 observações; séries municipais mais curtas que isso nunca produzirão ANOMALY, mesmo com um ponto genuinamente extremo — comportamento correto (evita falsa precisão) mas é uma limitação de poder estatístico a comunicar.
- `PRESSURE`/`DIVERGENCE` dependem de pares de indicadores fixos configurados (`ECO01_PRESSURE_PAIR`, `ECO01_DIVERGENCE_PAIR`) — não descobrem pares relacionados automaticamente; se o catálogo de indicadores crescer (ECO-02B), novos pares precisarão ser configurados explicitamente, não serão inferidos.

## 77. Recomendação para INTEL-03

Antes de qualquer camada generativa (L4-L6 com LLM): (1) resolver o débito técnico da RESSALVA B junto à configuração de testes; (2) decidir com Antigravity se `EvidenceDetail` ganha `id` estruturado antes ou depois de dados reais chegarem ao frontend; (3) validar o motor de Economia com um segundo território que tenha dados reais completos (não apenas Contagem) assim que outro município tiver ECO-01 persistido, para calibrar thresholds com mais de uma amostra; (4) só então avaliar um provider de Interpretation (regra determinística primeiro, LLM depois, sempre atrás dos guardrails do INTEL-01).

## 78. Recomendação para integração ECO-02B

Aguardar homologação do ECO-02B. Quando homologado: adicionar os indicadores PIB (`pib_municipal_precos_correntes` etc.) a `EconomyEngineConfig.monetaryIndicators` como uma segunda chamada ao motor (ou um `sharePairs` estendido para participações setoriais VAB), preservando a fronteira semântica já registrada no ECO-02A e na auditoria ECO-01: finanças públicas (SICONFI) ≠ atividade econômica (PIB/IBGE) — nunca combinar os dois em um único `DerivedIndicator` sem metodologia explícita (ex.: "impostos do PIB" ≠ "arrecadação SICONFI", já sinalizado como risco proibido no ECO-02A).

---

## DECLARAÇÃO DE SEGURANÇA

- DADOS REAIS UTILIZADOS: **SIM**
- FONTE OFICIAL: **SIM**
- DERIVED INDICATORS DETERMINÍSTICOS: **SIM**
- SIGNALS DETERMINÍSTICOS: **SIM**
- LINEAGE COMPLETO: **SIM**
- LLM CHAMADO: **NÃO**
- PROMPT CRIADO: **NÃO**
- INTERPRETATION GERADA: **NÃO**
- IMPLICATION GERADA: **NÃO**
- RECOMMENDATION GERADA: **NÃO**
- RISK CRIADO COMO SIGNAL: **NÃO**
- OPPORTUNITY CRIADO COMO SIGNAL: **NÃO**
- CAUSALIDADE INFERIDA: **NÃO**
- FORECAST GERADO: **NÃO**
- CRESCIMENTO REAL INFERIDO DE SÉRIE NOMINAL: **NÃO**
- FRONTEND ALTERADO: **NÃO**
- ECO-02B ALTERADO: **NÃO**
- N8N ALTERADO: **NÃO**
- ORQUESTRADOR ALTERADO: **NÃO**
- DEPLOY: **NÃO**

## GATE FINAL

- AUDITORIA FRONT-03: **PASS** (2 ressalvas documentadas, nenhuma bloqueante)
- EVIDENCE.ID: **PASS** (risco classificado: moderado, não bloqueante, registrado para FRONT-04)
- DIVERGÊNCIA TESTES EXPLICADA: **PASS** (causa raiz identificada: worktree aninhado contaminando runs sem escopo)
- PURE CORE: **PASS**
- EVIDENCE → DERIVED INDICATOR: **PASS**
- DERIVED INDICATOR → SIGNAL: **PASS**
- DETERMINISMO: **PASS**
- LINEAGE: **PASS**
- NOMINALIDADE: **PASS**
- TEMPORALIDADE: **PASS**
- MISSING DATA: **PASS**
- THRESHOLDS: **PASS**
- TREND: **PASS**
- CHANGE: **PASS**
- PRESSURE: **PASS/NÃO APLICÁVEL** (metodologia testada e validada; dados reais de Contagem não sustentam o sinal)
- CONCENTRATION: **PASS**
- DIVERGENCE: **PASS/NÃO APLICÁVEL** (metodologia testada e validada; dados reais de Contagem não sustentam o sinal)
- ANOMALY: **PASS/NÃO APLICÁVEL** (metodologia testada e validada; dados reais de Contagem não cruzam os limites de IQR da própria série)
- ATTENTION: **PASS**
- SEVERITY: **PASS**
- PRIORITY: **PASS** (sempre `null`, por decisão metodológica documentada)
- CONFIDENCE: **PASS**
- COVERAGE: **PASS**
- TEMPORAL COVERAGE: **PASS**
- LIMITATIONS: **PASS**
- POC REAL: **PASS** (Contagem com dados completos + Betim com evidência insuficiente real)
- ECO-01: **PASS**
- COMPATIBILIDADE ECO-02B: **AGUARDANDO CODEX** (extension point pronto, não testado com dados reais)
- COMPATIBILIDADE FRONT-03: **PASS** (verificação estrutural de tipo; não testado em runtime de frontend)
- TESTES: **PASS**
- REGRESSÃO: **NÃO**
- LLM: **NÃO**

**PRONTO PARA ECO-02B: SIM** (quando homologado)

**PRONTO PARA INTEL-03: SIM, COM RESSALVAS** (resolver débitos técnicos da seção 75 antes de introduzir camada generativa)

**PRONTO PARA BACKEND/API: SIM, COM RESSALVAS** (motor pronto; API HTTP e persistência ainda não implementadas, por design deste gate)

---

Ao concluir: **PARE.** Não iniciar INTEL-03. Nenhum LLM provider criado. Nenhum prompt criado. Nenhuma Interpretation/Implication/Recommendation gerada. Orquestrador não integrado. Nenhum deploy.
