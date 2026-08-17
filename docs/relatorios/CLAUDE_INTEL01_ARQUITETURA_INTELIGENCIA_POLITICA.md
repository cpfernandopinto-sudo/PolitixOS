# PolitixOS Territórios — INTEL-01
## Arquitetura e Contrato Canônico da Inteligência Política Territorial

**Data:** 16/08/2026
**Agente:** Claude (arquitetura, contratos, não geração de análise real)
**Modo:** Design + implementação controlada da fundação da camada de inteligência

**Resultado central:** a arquitetura eleitoral já existente (`electoral-intelligence.ts` → `electoral-interpretation-context.ts` → `electoral-interpretation.ts` → `electoral-briefing.ts` → `electoral-interpretation-guards.ts`) já implementa, testada e funcionando para um domínio, praticamente todo o modelo que este gate pede para formalizar cross-domain — incluindo lineage por referência, confiança qualitativa por força evidencial, guardrails anti-alucinação (rastreabilidade/número/entidade/causalidade/previsão/recomendação/ideologia), estado de evidência insuficiente e separação FACT/INTERPRETATION/RECOMMENDATION. O INTEL-01 **generaliza esse padrão já provado**, não o substitui nem inventa um modelo teórico desconectado do que já funciona.

## 1. Estado inicial

Antes de qualquer implementação: `git status`, `git diff`, `git branch`, `git worktree list` executados. Confirmado: branch `main`, worktree principal compartilhado, sem worktree isolado ativado para este bloco (decisão justificada na seção 51).

## 2. Branch/worktree

Permaneci no worktree principal compartilhado, deliberadamente **sem** criar worktree isolado. Justificativa: o mapeamento de frontend (seção 33) exige inspecionar os contratos visuais em progresso do Antigravity (`components/dashboard/territorios/intelligence/*.tsx`, `app/dashboard/territorios/[ibge]/inteligencia-politica/`, `lib/territorios/fixtures/sandbox-fixtures.ts`), que existem apenas como arquivos **não commitados** no worktree principal. Um worktree isolado (criado a partir do HEAD commitado) não teria acesso a esse trabalho em progresso, cegando exatamente a parte do gate que pede para reutilizar/mapear contratos existentes. Todas as minhas escritas foram estritamente arquivos novos em `lib/territorios/intelligence/` (caminho inexistente antes deste bloco) e o próprio relatório — nenhum arquivo de terceiros foi lido para edição, staged ou commitado.

## 3. Arquitetura existente encontrada

- **`lib/territorios/types.ts`**: contrato de frontend já existente (`TerritoryDossier`, `IntegratedTerritoryAnalysis`, `AIRecommendationData`, `RiskOpportunityBoardData`), com `EvidenceTrace` (referência de evidência já embrionária), `TerritoryTopicInsight` (`type: FATO|INTERPRETAÇÃO|HIPÓTESE|MÉTRICA DERIVADA` — uma distinção de camada já presente, porém achatada em um único campo) e `confidence: 'ALTA'|'MÉDIA'|'BAIXA'` (convenção qualitativa já estabelecida no projeto, sem score numérico fabricado). É um contrato **de exibição** (`DataSourceMode: real|demo|loading|error|unavailable`), não um contrato de domínio com lineage estruturado — evidência é string solta, não referência a ID.
- **`lib/territorios/electoral-*.ts`** (7 arquivos): arquitetura backend completa e testada de L2→L4 para o domínio eleitoral. Descrita em detalhe nas seções 5–7 abaixo.
- **`territory_indicators` / `territory_evidence` / `territory_collection_runs`**: contrato territorial já homologado (auditado em ECO-01), com índice único de chave natural confirmado no catálogo real do Postgres.
- **`territory_briefings`**: tabela já existente (`id, territory_id, target_id, requested_by, request_id, status, content jsonb, model, prompt_version, generated_at, expires_at, error_message`). Hoje usada apenas como *stub* de rastreamento de solicitação (`lib/actions/territories.ts`, `createTerritoryBriefingRequest`) — cria uma linha com `status='nao_iniciado'`, sem geração de conteúdo real. É a estrutura de persistência **pronta** para o Briefing canônico definido neste gate (ver seção 35).
- **Frontend do Antigravity (FRONT-02.6, em progresso, não commitado)**: `components/dashboard/territorios/intelligence/` já contém 10 componentes cujos nomes correspondem quase 1:1 ao vocabulário deste gate (`EvidencePanel`, `PoliticalSignalStack`, `AnalysisCoveragePanel`, `TemporalCoveragePanel`, `StrategicRecommendationCard`, `IntelligenceExplicabilityPanel`, `ExecutiveBriefing`/`PoliticalIntelligenceSummary`, `TerritoryAgendaPanel`). `lib/territorios/fixtures/sandbox-fixtures.ts` contém 10 cenários fictícios (`MUNICÍPIO DEMONSTRATIVO ALFA...`) já seguindo a mesma regra de não usar município real que este gate exige.
- **Nenhuma estrutura de LLM/prompt/provider existente foi encontrada.** Nenhuma chamada a modelo de linguagem existe hoje no repositório para inteligência territorial.

## 4. Estruturas reutilizadas

Não dupliquei arquitetura. Especificamente reutilizei/generalizei:

- O padrão de `Provenance` (`territoryId`, anos/períodos, `metricKeys`, `datasets`, `evidenceHashes`) de `ElectoralIntelligenceProvenance` → `IntelligenceProvenance`.
- A classe de confiança qualitativa de 3 níveis (`DIRECTLY_SUPPORTED | MULTI_SIGNAL_SUPPORTED | LIMITED_CONTEXT`) e a regra de consolidação `LOWEST_CONFIDENCE_WINS` de `electoral-briefing.ts`.
- O validador de guardrails (`electoral-interpretation-guards.ts`) — generalizei os 6 guards (rastreabilidade, número, entidade, causalidade, previsão, ideologia) para qualquer domínio e adicionei 2 novos (`RECOMMENDATION_LEAK`, `SENSITIVE_INFERENCE`) cobrindo lacunas explícitas do gate (seção 44) não cobertas pelo validador eleitoral original.
- O padrão `assertionClass` (`FACT|INTERPRETATION|RECOMMENDATION` em `electoral-interpretation-context.ts`) → generalizado para `FACT|SIGNAL|INTERPRETATION|IMPLICATION|RECOMMENDATION`.
- O padrão de lineage por array de IDs (não grafo genérico, não cópia integral) de `electoral-briefing.ts` (`interpretationRefs`, `factRefs`, `signalRefs`).
- A convenção `confidence: 'ALTA'|'MÉDIA'|'BAIXA'` do frontend **não** foi adotada literalmente no contrato de domínio (mantive a classe de 3 níveis em inglês, já usada no backend eleitoral, para consistência interna do backend); a tradução para o rótulo em português é responsabilidade da camada de view-model (seção 33), não do contrato de domínio.

Não criei uma tabela nova, não criei um segundo padrão incompatível de provenance, e não recriei a lógica eleitoral — o domínio eleitoral continua com sua própria implementação de referência.

## 5. Modelo L0–L6

| Camada | Nome | Natureza | Pergunta que responde |
|---|---|---|---|
| L0 | Source Data | dado oficial persistido (`territory_indicators`) | "o que foi coletado?" |
| L1 | Evidence | referência rastreável a L0 | "de onde veio?" |
| L2 | Derived Indicator | resultado determinístico | "o que se calcula disso?" |
| L3 | Analytical Signal | padrão/condição identificada | "o que mudou/se destaca?" |
| L4 | Interpretation | leitura qualitativa | "o que isso pode significar?" |
| L5 | Implication | relevância | "por que isso importa?" |
| L6 | Recommendation | ação sugerida | "o que fazer com isso?" |

Implementado em `lib/territorios/intelligence/contracts.ts` como `IntelligenceLayer` e um tipo TypeScript por camada. Nenhuma camada é opcional de pular na prática: uma `Recommendation` só é válida se resolver até `Interpretation`/`Implication`, que só são válidas se resolverem até `Signal`, que só é válido se resolver até `Evidence` (ver seção 12, `lineage.ts`).

## 6. Evidence

```ts
interface Evidence { id; territoryId; domain; indicator; value; unit; period; source; dataset; evidenceHash; metadata }
```
Referência, não cópia: `evidenceHash` correlaciona com `territory_evidence.source_hash` ou o par indicador+período de `territory_indicators`. `metadata` é aberto para preservar contexto de proveniência sem forçar todo domínio ao mesmo shape.

## 7. DerivedIndicator

```ts
interface DerivedIndicator { id; territoryId; domain; indicator; methodId; methodVersion; inputs: {evidenceRef, role}[]; result; unit; period; formulaDescription; limitations }
```
Exemplo formalizado (não implementado como cálculo real): `transferencias_correntes_brutas_realizadas / receita_corrente_bruta_realizada`, `methodId: 'ratio-transferencias-receita-corrente'`, `inputs` referenciando os dois `Evidence` do ECO-01. **Resultado determinístico não é interpretação política** — reforçado pelo tipo não ter nenhum campo de `statement`/`confidence`/`origin`.

## 8. Signal

```ts
interface AnalyticalSignal { id; territoryId; domains[]; type; priority; severity; title; summary; evidenceRefs[]; derivedIndicatorRefs[]; period; status; confidence; limitations[]; methodId; methodVersion }
```
`type: TREND|CHANGE|PRESSURE|CONCENTRATION|DIVERGENCE|ANOMALY|ATTENTION`. **Decisão metodológica explícita (seção 16 do gate)**: `risk`/`opportunity` **não** são `SignalType`. Justificativa: um `Signal` é uma constatação quantitativa/descritiva ("a razão X aumentou"); rotular algo como risco ou oportunidade exige um juízo de valor sobre o que é bom ou ruim para um objetivo — isso é inerentemente uma `Interpretation` ou `Implication`, não um padrão bruto detectável deterministicamente. **Tensão observada e documentada, não escondida**: as fixtures de sandbox do Antigravity (`DEV_SANDBOX_SIGNALS`, `DEV_INTELLIGENCE_SCENARIOS.*.signals`) já usam `category: 'oportunidade'|'atencao'` no nível visual que chamam de "signal". Isso é uma tensão de nomenclatura real entre a camada visual (que precisa de uma categoria acionável para o usuário) e o contrato de domínio (que separa L3 de L4/L5) — registrada aqui para resolução explícita na integração futura (provavelmente: o `PoliticalSignalStack` visual consome uma combinação de `Signal` + `Implication`, não `Signal` isolado).

## 9. Interpretation

```ts
interface Interpretation { id; territoryId; assertionClass:'INTERPRETATION'; statement; domains[]; origin; modelProvenance; basedOnSignals[]; evidenceRefs[]; confidence; caveats[]; contradicts[] }
```
`origin: 'rule'|'model'|'human'|'hybrid'` sempre declarado, generalizando o padrão já usado em `interpretElectoralContext` (hoje sempre `'rule'`, já que é 100% determinístico). `modelProvenance` (`provider, model, modelVersion, promptId, promptVersion, generatedAt`) só é preenchido quando `origin` envolve modelo — nulo neste gate, já que nenhuma chamada de LLM foi feita.

## 10. Implication

```ts
interface Implication { id; territoryId; assertionClass:'IMPLICATION'; statement; dimension; origin; modelProvenance; basedOnInterpretations[]; confidence; caveats[] }
```
`dimension: gestao|agenda_publica|percepcao|territorio|campanha|comunicacao|politica_publica|visita|mobilizacao`. Nunca existe sem `basedOnInterpretations` não vazio (validado por `lineage.ts`, embora não haja um guard de "implication órfã" tão estrito quanto para `Recommendation` — decisão documentada: uma `Implication` pode legitimamente derivar de múltiplas `Interpretation`s de domínios diferentes, mas nunca de zero).

## 11. Recommendation

```ts
interface Recommendation { id; territoryId; assertionClass:'RECOMMENDATION'; action; priority; justification; origin; modelProvenance; basedOnImplications[]; basedOnInterpretations[]; evidenceRefs[]; caveats[]; validUntil; reviewStatus }
```
**Nunca órfã** — `assertRecommendationNotOrphan()` em `lineage.ts` lança `OrphanRecommendationError` se `basedOnImplications` e `basedOnInterpretations` estiverem ambos vazios. Testado (seção 46).

## 12. Lineage

Mecanismo escolhido: **referência por ID em arrays simples**, resolvidos contra índices (`evidenceIndex` no Briefing), não um grafo genérico nem duplicação da árvore inteira em cada objeto — mesmo padrão já usado com sucesso em `electoral-briefing.ts`. `lib/territorios/intelligence/lineage.ts` implementa:

- `assertRecommendationNotOrphan()` — regra da seção 6 do gate.
- `assertLineageResolves()` — confirma que **toda** referência declarada (Recommendation→Implication/Interpretation/Evidence, Implication→Interpretation, Interpretation→Signal/Evidence, Signal→Evidence) resolve para um item realmente fornecido, lançando `BrokenLineageError` com o par `(tipo de aresta, ref quebrada)` caso contrário.
- `resolveRecommendationToEvidence()` — responde diretamente ao critério de sucesso #7 ("como uma recomendação volta até a fonte oficial?"): percorre Recommendation → Implication → Interpretation → Evidence e retorna a lista real de `Evidence` (com `source`/`dataset` originais), não uma cópia narrativa.

Prova concreta em `poc-fixture.ts` + `lineage.test.ts` (seção 46).

## 13. Temporalidade

```ts
interface TemporalCoverage { periodStart; periodEnd; referencePeriodLabel; sourceReferencePeriods: Record<Domain, string|null> }
```
`sourceReferencePeriods` registra explicitamente que Demografia pode ser 2025, Eleitoral 2024, Fiscal 2025 e Saúde outro período — **nunca finge simultaneidade**. Nenhum campo de período é opcional silencioso: ausência é `null` explícito, nunca omissão.

## 14. Freshness

```ts
interface Freshness { referencePeriod; collectedAt; sourceUpdatedAt; analysisGeneratedAt }
```
Quatro conceitos deliberadamente separados. **Nota de auditoria sobre o precedente existente**: `electoral-briefing.ts` usa `generatedAt = "${ultimoAno}-12-31T00:00:00.000Z"` — isto é, conflita `referencePeriod` com `analysisGeneratedAt` (usa a data de referência do dado como se fosse o timestamp de geração). Funciona no domínio eleitoral porque o briefing é reconstruído a cada chamada a partir do mesmo contexto determinístico, mas **não deve ser replicado** no contrato canônico: `Freshness.analysisGeneratedAt` aqui é sempre o instante real de geração (`new Date().toISOString()`), nunca derivado do período dos dados. Registrado como lição para a próxima integração real.

## 15. Coverage

```ts
interface Coverage { byDomain: Record<Domain,'available'|'partial'|'unavailable'>; domainsAvailable; domainsExpected; missingData }
```
Testado explicitamente que `Coverage` **não** carrega nenhum campo de confiança (seção contract.test.ts: `expect('confidence' in coverage).toBe(false)`) — separação estrutural, não apenas documental, entre "quanto do território está representado" e "quão bem sustentada é a conclusão".

## 16. Confidence

`ConfidenceClass = 'DIRECTLY_SUPPORTED' | 'MULTI_SIGNAL_SUPPORTED' | 'LIMITED_CONTEXT'` — generaliza a classe já usada e testada no domínio eleitoral. Representa **força evidencial** (quantos sinais independentes sustentam a afirmação, não uma probabilidade estatística). `consolidateConfidence()` implementa a regra `LOWEST_CONFIDENCE_WINS` (a confiança de um conjunto é sempre a mais fraca do conjunto — nunca uma média que dilui um item fracamente sustentado). `confidenceFromEvidenceCount()` **lança erro** (`INSUFFICIENT_EVIDENCE`) se chamado com zero evidências — impossível, por construção do tipo, produzir uma confiança "do nada". Nenhum score percentual (`87%`) existe em nenhum lugar do contrato — testado explicitamente.

## 17. Limitations

```ts
interface Limitation { code; description; domain? }
```
Toda camada (`DerivedIndicator`, `AnalyticalSignal`, `Interpretation`, `Implication`, `Recommendation`, `Coverage`, `ExecutiveSummary`, `Explainability`) carrega `limitations: Limitation[]` — estruturado (código + descrição), não apenas texto livre, permitindo agregação/filtragem futura por tipo de limitação.

## 18. Contradições

Modeladas em `Interpretation.contradicts: string[]` (refs a outras `Interpretation`s). O padrão eleitoral já prova isso funcionando (`contradictions` em `ElectoralInterpretationResult`, ex.: participação caiu **e** margem aumentou simultaneamente, sem forçar uma causa comum). O contrato canônico generaliza: nenhum `Interpretation` é obrigado a "resolver" uma contradição — ela é um item de primeira classe, não um erro a esconder.

## 19. Insufficient evidence

`EvidenceSufficiency = 'SUFFICIENT' | 'INSUFFICIENT_EVIDENCE'` e `SignalStatus` incluindo `'INSUFFICIENT_EVIDENCE'`. Segue o padrão já comprovado de `interpretElectoralContext`: quando o contexto não tem dados suficientes (`context.elections.length < 2`), a função retorna um resultado válido, vazio, com `status: 'INSUFFICIENT_CONTEXT'` — **nunca lança exceção nem fabrica interpretação**. O contrato canônico preserva essa distinção: evidência insuficiente é um **estado de saída válido**, não uma falha do sistema.

## 20. Cross-domain

`AnalyticalSignal.domains: IntelligenceDomain[]` (array, não campo singular) — um sinal pode nascer de mais de um domínio (ex.: dependência fiscal cruzando Economia + Demografia via per capita). `IntelligenceDomain` é `'demografia'|'eleitoral'|'seguranca'|'saude'|'economia'|(string & {})` — o `(string & {})` permite domínios futuros (PIB, CAGED, RAIS) sem quebrar o tipo nem exigir union exaustiva hardcoded, mantendo autocomplete para os já conhecidos.

## 21. Taxonomia de sinais

`TREND | CHANGE | PRESSURE | CONCENTRATION | DIVERGENCE | ANOMALY | ATTENTION`. Decisão documentada na seção 8: `risk`/`opportunity` excluídos deliberadamente (são L4/L5, não L3).

## 22. Prioridade

`SignalPriority = 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'` — reutilizada também em `Recommendation.priority`. Não calculada neste gate (nenhuma regra de atribuição automática foi implementada); apenas o contrato.

## 23. Severidade

`SignalSeverity = 'HIGH'|'MODERATE'|'LOW'` — eixo **independente** de `priority`, testado explicitamente (`contracts.test.ts`: sinal com `priority: 'LOW'` e `severity: 'HIGH'` simultaneamente, comprovando que não são campos redundantes). Justificativa: severidade é a magnitude do fenômeno observado (quão grande é a mudança); prioridade é a importância para a decisão (um fenômeno de baixa magnitude pode ser alta prioridade por razões de agenda, e vice-versa). Campos não redundantes — documentado, não assumido.

## 24. Domínio eleitoral

Já plenamente coberto pela arquitetura existente (`electoral-*.ts`) — tendência, comparecimento, abstenção, votos, força partidária, competitividade, fragmentação e histórico já são `ElectoralSignal`/`ElectoralInterpretationItem`. O contrato canônico deste gate é compatível por design: um adaptador (não implementado, apenas viável) poderia mapear `ElectoralSignal` → `AnalyticalSignal` sem perda estrutural, já que os campos (`metric`, `period`, `provenance`) correspondem diretamente.

## 25. Demografia

Extensível via `domain: 'demografia'` sem nenhuma alteração de tipo. Nenhuma regra implementada (crescimento, estrutura etária, urbanização, densidade ficam para quando houver motor de derivados demográficos).

## 26. Segurança

Extensível via `domain: 'seguranca'`. Registrado explicitamente na metodologia (seção 44/guardrails): `SENSITIVE_INFERENCE` bloqueia qualquer afirmação do tipo "aumento = crise política" — esse é exatamente o tipo de inferência causal/política automática que o guard de `CAUSALITY` e `PREDICTION` já rejeitam estruturalmente.

## 27. Saúde

Extensível via `domain: 'saude'`. Mesma cautela: nenhuma inferência de qualidade de gestão a partir de indicador de capacidade/cobertura é permitida pelo contrato (isso seria uma `Interpretation` com `origin` declarada e sujeita aos mesmos guards).

## 28. Economia

`domain: 'economia'` já comporta ECO-01 (fiscal), e comportará ECO-02 (PIB), ECO-03 (CAGED), ECO-04 (RAIS) sem migração de schema, via `source_dataset` distinto por fonte — mesmo padrão já usado com sucesso por 4 motores distintos neste projeto (IBGE/TSE/Segurança/Saúde, todos com `categoria`+`fonte`+`source_dataset` próprios). **Fronteira reafirmada explicitamente**: ECO-01 é o núcleo fiscal do Motor Economia, não a Economia inteira — decisão já registrada na auditoria ECO-01 e preservada aqui sem alteração.

## 29. Derivados fiscais formalizados (não implementados)

Per seção 24 do gate, registro as regras críticas como parte do contrato (não como código de cálculo):

- Participação da receita tributária: `receita_tributaria / receita_corrente`.
- Dependência de transferências: `transferencias_correntes / receita_corrente` — **implementado apenas como fixture fictícia** em `poc-fixture.ts` (`pocDerivedIndicatorResult = 0.5326`), nunca calculado para um município real.
- Participação do investimento na despesa de capital: `investimento_empenhado / despesa_capital_empenhada`.
- Per capita: **bloqueia** se não houver população IBGE do mesmo `reference_year` — regra que deve ser imposta no `methodId` do `DerivedIndicator` correspondente quando implementado, lançando erro em vez de usar ano diferente silenciosamente (mesmo padrão de fail-fast já usado em `economia-siconfi-normalizer.ts`).
- Variação anual: sempre nominal sem deflator — `Limitation` obrigatória (`code: 'NOMINAL_VALUE'`) em qualquer `DerivedIndicator` de variação, replicando o mesmo texto de ressalva já usado em `economia-collector.ts`.
- Despesa empenhada nunca é rotulada "gasto efetivo" — regra de nomenclatura, não de cálculo, mas registrada aqui como guardrail textual futuro (poderia ser adicionada como um guard adicional em `guardrails.ts` quando a integração real ocorrer).
- Receita bruta permanece identificada como bruta no nome de qualquer indicador derivado dela.

## 30. Metodologia versionada

Todo `DerivedIndicator`, `AnalyticalSignal` e (implicitamente) toda `ExecutiveSummary`/`Briefing` carrega `methodId`+`methodVersion` (ou `methodology: {methodId, methodVersion, description}` no nível do Briefing). Generaliza `ELECTORAL_INTERPRETATION_SCHEMA_VERSION`/`ELECTORAL_BRIEFING_SCHEMA_VERSION` (`schemaVersion` como string versionada, já usada e validada em runtime pelo domínio eleitoral).

## 31. Model version

`ModelProvenance { provider; model; modelVersion; promptId; promptVersion; generatedAt }`. Campo `modelVersion: string | null` (nem toda API de modelo expõe uma versão estável). **Não implementado** — nenhuma chamada de LLM foi feita; o tipo existe apenas como contrato para quando isso ocorrer.

## 32. Prompt versioning

`promptId` + `promptVersion` dentro de `ModelProvenance` — permite saber qual prompt produziu qual `Interpretation`/`Implication`/`Recommendation`, sem escrever nenhum prompt definitivo neste gate (nenhum texto de prompt existe no repositório).

## 33. Human review

`ReviewStatus = 'not_reviewed' | 'reviewed' | 'approved' | 'rejected' | 'edited'`. Aplicado a `Recommendation.reviewStatus` e ao `TerritorialPoliticalIntelligenceBriefing.reviewStatus` como um todo. Nenhum workflow de revisão foi implementado — apenas o enum de estados.

## 34. Audit log

Não implementei infraestrutura de log dedicada neste gate (desproporcional ao escopo). Recomendação arquitetural: o próprio `TerritorialPoliticalIntelligenceBriefing`, ao ser persistido em `territory_briefings.content` (jsonb), **já constitui** o registro auditável mínimo — carrega `id`, `territoryId`, `generatedAt`, `methodology`, `explainability`, `evidenceIndex` e `reviewStatus` no mesmo objeto. Para auditoria "meses depois" (critério de sucesso #20), isso é suficiente sem tabela nova: basta que `territory_briefings` nunca sofra `UPDATE` destrutivo de `content` (cada nova análise gera uma nova linha, preservando o histórico) — uma política operacional a decidir na integração real, não um gate deste bloco.

## 35. Briefing contract

`TerritorialPoliticalIntelligenceBriefing` implementado em `contracts.ts`, com todos os campos pedidos na seção 30 do gate (`identity` via `id`+`territoryId`; `generatedAt`; `referenceDate`; `coverage`; `temporalCoverage`; `executiveSummary`; `signals`; `crossDomainSignals`; `interpretations`; `implications`; `recommendations`; `limitations`; `evidenceIndex`; `methodology`; `reviewStatus`) mais `freshnessStatus`, `agenda` e `guardrails` (não listados explicitamente no gate mas necessários para fechar as seções 37 e 41). Nenhum campo é assumido obrigatório em tempo de execução além do que o TypeScript já expressa — arrays vazios são o estado válido de "nada a reportar", não `undefined`.

## 36. Executive summary

```ts
interface ExecutiveSummary { headline; summary[]; keySignals[]; risks[]; opportunities[]; attentionPoints[]; coverage; limitations[] }
```
`keySignals`/`risks`/`opportunities`/`attentionPoints` são **arrays de string** neste gate por simplicidade de contrato — na integração real, a recomendação é que cada string seja substituída por uma referência de ID (`interpretationRef`/`implicationRef`), seguindo o padrão já usado em `ElectoralBriefing.executiveSummary.keyPoints` (`{text, interpretationRef}`). Registrado como decisão pendente (seção 52), não implementado aqui para não introduzir um segundo padrão de referência incompatível com o eleitoral sem primeiro alinhar qual dos dois vira o padrão único.

## 37. Agenda territorial

```ts
interface TerritorialAgendaItem { id; title; rationale; basedOnRecommendations[]; basedOnImplications[] }
```
Decisão documentada: **não** é um subtipo de `Recommendation` — é uma estrutura própria que agrega uma ou mais `Recommendation`/`Implication` em um item de agenda com racional textual, permitindo que uma agenda combine múltiplas recomendações menores em uma pauta maior sem forçar 1:1.

## 38. Explainability

```ts
interface Explainability { evidenceRefs[]; sourceRefs[]; methodology; coverage; limitations[] }
```
Deliberadamente **não** contém nenhum campo de raciocínio livre, chain-of-thought ou scratchpad — apenas referências e metodologia, exatamente como pedido. "Quais evidências e métodos sustentam a conclusão", nada além disso.

## 39. Frontend mapping

Inspecionados (somente leitura) os componentes existentes do Antigravity. Mapeamento contrato canônico → necessidade visual, sem exigir que o backend copie props de React:

| Contrato canônico | Componente visual (Antigravity, em progresso) |
|---|---|
| `AnalyticalSignal[]` (+ `Interpretation`/`Implication` associadas) | `PoliticalSignalStack.tsx` |
| `Evidence[]` (via `evidenceIndex`) | `EvidencePanel.tsx` (usa um `EvidenceDetail` próprio, mais simples — ver nota abaixo) |
| `Coverage` | `AnalysisCoveragePanel.tsx` |
| `TemporalCoverage` | `TemporalCoveragePanel.tsx` |
| `Recommendation[]` | `StrategicRecommendationCard.tsx` |
| `Explainability` | `IntelligenceExplicabilityPanel.tsx` |
| `ExecutiveSummary` | `ExecutiveBriefing.tsx` / `PoliticalIntelligenceSummary.tsx` |
| `TerritorialAgendaItem[]` | `TerritoryAgendaPanel.tsx` |

**Nota de separação domain contract vs. view model**: `EvidencePanel.tsx` já define seu próprio `EvidenceDetail` (label/value/unit/period/source/dataset/domain/description/methodology) — um view-model de exibição, deliberadamente mais simples que `Evidence` (sem `id`/`evidenceHash`/`metadata`). Isso é o padrão correto: o contrato de domínio não deve ser injetado diretamente como props de React. Uma função adaptadora futura (`toEvidenceDetail(evidence: Evidence): EvidenceDetail`, não implementada aqui) faria essa tradução — não implementada neste gate para não acoplar prematuramente ao componente Antigravity ainda em desenvolvimento.

## 40. API futura

Não implementada (evitaria integração prematura). Proposta, alinhada ao padrão REST já usado pelos endpoints territoriais (`/api/territorios/{motor}/collect`):

- `GET /api/territorios/{codigo_ibge}/briefing` — retorna o `TerritorialPoliticalIntelligenceBriefing` mais recente persistido (ou `202`/estado `needs_reanalysis` se não existir).
- `GET /api/territorios/{codigo_ibge}/briefing/evidence/{evidenceId}` — resolve uma única referência de evidência (usado pelo `EvidencePanel` ao expandir um item).
- `GET /api/territorios/{codigo_ibge}/briefing/status` — apenas `coverage`+`freshnessStatus`, para polling leve sem baixar o briefing inteiro.

## 41. Persistência recomendada

**Recomendação: persistida, versionada por linha, sem migration nova.** `territory_briefings.content` (jsonb) já comporta o `TerritorialPoliticalIntelligenceBriefing` inteiro sem qualquer alteração de schema — os campos `model`/`prompt_version`/`generated_at`/`status` da tabela já correspondem 1:1 a `ModelProvenance`/`freshnessStatus`. Calcular on-demand a cada visualização é descartado (custo de LLM futuro, latência, e quebra de auditabilidade — duas visualizações no mesmo minuto poderiam gerar dois textos diferentes de um LLM não determinístico). Cache simples (TTL) também é insuficiente porque não versiona por metodologia. A cada nova análise, **inserir uma nova linha** (nunca `UPDATE` de `content`) preserva histórico auditável automaticamente, ao custo de armazenamento — aceitável dado o volume (um briefing por território por evento de análise, não por request). Nenhuma migration foi executada ou é necessária neste gate.

## 42. Invalidação

Estratégia proposta, não implementada: `freshnessStatus: 'fresh' | 'stale' | 'partial' | 'needs_reanalysis'` no próprio Briefing.
- `fresh`: todos os domínios usados no briefing têm `territory_collection_runs` mais recentes que `generatedAt` do briefing.
- `stale`: pelo menos um domínio tem coleta mais recente que o briefing, mas o briefing ainda é a última análise disponível — servível com aviso.
- `partial`: gerado com `Coverage.domainsAvailable < domainsExpected` desde o início.
- `needs_reanalysis`: `stale` há mais que um limiar de tempo a definir (não fixado neste gate), ou uma correção retroativa foi detectada em uma fonte já usada (ex.: retificação SICONFI, ver riscos do ECO-01).
Cálculo de `freshnessStatus` seria feito na leitura (comparando `territory_briefings.generated_at` com `MAX(territory_collection_runs.finished_at)` por domínio), não armazenado de forma que fique desatualizado.

## 43. Orquestrador futuro

**Não integrado neste gate.** Sequência proposta para quando a integração for autorizada, preservando a trava de "nunca lote, nunca carga estadual/nacional" já aplicada aos 4 motores existentes:
```
Orquestrador recebe codigo_ibge
  → chama os motores já homologados (IBGE/TSE/Segurança/Saúde/Economia) [já existe]
  → BUILD EVIDENCE (novo: lê territory_indicators/territory_evidence recém-persistidos)
  → CALCULATE DERIVED INDICATORS (novo, determinístico)
  → DETECT SIGNALS (novo, determinístico — mesmo padrão de buildElectoralTerritoryIntelligence)
  → BUILD INTERPRETATION CONTEXT (novo — mesmo padrão de buildElectoralInterpretationContext)
  → INTERPRET (novo — provider determinístico primeiro; LLM só depois, atrás do mesmo validador)
  → BUILD IMPLICATIONS / RECOMMEND (novo, com guardrail de não-órfã)
  → VALIDATE (assertValidGuardableStatements + assertLineageResolves)
  → PERSIST BRIEFING (INSERT em territory_briefings, nunca UPDATE de content)
  → SERVE FRONTEND (via API futura, seção 40)
```

## 44. Pipeline canônico

Ver seção 43 — o pipeline É a resposta a esta seção, já que o gate as trata como a mesma pergunta em duas seções (38/39 do gate). Reafirmado aqui: cada seta é uma fronteira de camada (L0→L1→L2→L3→L4→L5→L6), nunca pulada.

## 45. Determinístico vs. generativo

**Determinístico, sempre:** `DerivedIndicator` (razões, variações), `Signal` (detecção de padrão via regra), `Coverage`, `consolidateConfidence`, todos os guardrails de validação. **Pode ser generativo (futuro, não implementado):** a síntese textual de `Interpretation.statement`/`Implication.statement`/`Recommendation.action`/`ExecutiveSummary.summary` — mas mesmo quando gerado por modelo, o `statement` produzido passa pelos mesmos guardrails determinísticos (`validateGuardableStatements`) antes de ser aceito. **Um LLM nunca deve fazer a aritmética que o `DerivedIndicator` já calcula** — o `ratio`/variação é sempre calculado em código antes de qualquer texto ser gerado, e o texto gerado é validado contra os números já calculados (guard `NUMBER`), não o contrário.

## 46. LLM guardrails

`INTELLIGENCE_ALLOWED_ACTIONS`/`INTELLIGENCE_PROHIBITED_ACTIONS` em `guardrails.ts`, generalizando a lista já usada no domínio eleitoral e ampliada com itens explícitos do gate (seção 41/44): não inventar dado ausente, não alterar número, não criar fonte, não criar evento/candidato, não inferir contexto factual externo sem fonte, deve referenciar evidence IDs, deve declarar insuficiência. Este objeto é dado **junto com o contexto** para qualquer provider futuro (regra ou LLM) — não é apenas documentação, é um valor que o pipeline pode literalmente incluir no prompt quando LLM for introduzido.

## 47. Structured output

Recomendado (não implementado): quando um provider LLM existir, sua saída deve ser um JSON validado contra o shape de `Interpretation`/`Implication`/`Recommendation` (os mesmos tipos TypeScript, validados em runtime — o mesmo padrão já usado por `validateElectoralInterpretationResult`, que rejeita saída malformada com `MALFORMED_PROVIDER_OUTPUT` antes de aceitar qualquer resultado de um `ElectoralInterpretationProvider`). Nenhum campo de texto livre não estruturado deve ser aceito como saída final de um provider.

## 48. Hallucination control

Implementado e testado (`guardrails.ts`, 12 testes): `TRACEABILITY` (evidência deve existir e ser referenciada), `NUMBER` (todo número no texto deve corresponder a um valor real do contexto), `ENTITY` (nomes próprios devem ser conhecidos), `CAUSALITY` (bloqueia causalidade não ressalvada), `PREDICTION` (bloqueia previsão), `RECOMMENDATION_LEAK` (bloqueia recomendação vazando para interpretação), `IDEOLOGY` (bloqueia rótulo ideológico), `SENSITIVE_INFERENCE` (bloqueia inferência sobre intenção/opinião de indivíduo ou acusação sem evidência direta). `assertValidGuardableStatements` lança e interrompe o pipeline (`FAIL_CLOSED`) em vez de aceitar uma afirmação não sustentada.

## 49. Princípios de segurança política/metodologia

Registrados como `INTELLIGENCE_PROHIBITED_ACTIONS` (lista viva, gerenciável em código, não apenas prosa): não inventar acusação, não inferir corrupção sem evidência direta, não inferir intenção de eleitor, não inferir característica sensível de indivíduo, não transformar correlação em causalidade, não fabricar consenso quando há sinais conflitantes, não criar fatos sobre adversários. Cada item tem um guard correspondente testado (seção 48), não é apenas uma política de prosa sem aplicação.

## 50. Benchmarking futuro

Não implementado. `ElectoralContextBenchmark`/`ELECTORAL_CONTEXT_UNIVERSE` (`'homologated-six-municipality-sample'`) já prova o padrão funcionando no domínio eleitoral: comparação **sempre contra uma amostra explicitamente nomeada e rotulada**, nunca contra "a média de Minas Gerais" ou "o Brasil" sem que isso seja realmente a amostra usada — inclusive um guard eleitoral (`'apresentar benchmark da amostra como RMBH, Minas Gerais ou Brasil'`) já proíbe essa confusão especificamente. O contrato canônico recomenda o mesmo princípio para futuros domínios: benchmark contra universo nomeado, nunca implícito.

## 51. Municípios comparáveis

Registrado como problema metodológico futuro, não resolvido aqui. Similaridade apenas por população é insuficiente (dois municípios de mesmo porte podem ter estruturas fiscais/econômicas completamente distintas). Não definido neste gate — decisão explicitamente adiada, não default.

## 52. Testes

`npx vitest run lib/territorios/intelligence`: **3 arquivos, 27 testes, PASS**:
- `contracts.test.ts` (9 testes): separação de camadas (Evidence não é Interpretation), priority≠severity, origin declarado, reviewStatus nunca pré-aprovado, coverage≠confidence, mesmo territoryId em toda a cadeia, consolidateConfidence dentro do enum, recommendation resolve no índice.
- `guardrails.test.ts` (14 testes): os 8 guards individualmente (aceitação e rejeição), consolidação de confidence, `confidenceFromEvidenceCount` nunca fabrica confiança sem evidência.
- `lineage.test.ts` (5 testes): cadeia completa resolve, recommendation órfã rejeitada, 3 variantes de lineage quebrada rejeitadas.

Suíte territorial ampliada (`lib/territorios` + `app/api/territorios`): **64 arquivos, 528 testes, PASS** (61/501 antes deste gate — aumento de exatamente 3 arquivos/27 testes, sem regressão).

`npx tsc --noEmit`: 0 erros em `lib/territorios/intelligence` (os 5 erros pré-existentes em `components/dashboard/territorios/analytical/*` são do Antigravity, não tocados, já documentados na auditoria ECO-01).
`npx eslint lib/territorios/intelligence --max-warnings=0`: 0 erros, 0 warnings.

## 53. Fixture/POC

`lib/territorios/intelligence/poc-fixture.ts`: cadeia fictícia completa `Evidence → Signal → Interpretation → Implication → Recommendation` para `MUNICIPIO_DEMONSTRATIVO` (`POC_TERRITORY_ID = 'fixture-municipio-demonstrativo'`), usando os mesmos 2 valores do ECO-01 (transferências correntes e receita corrente de 2025) como se fossem de um município fictício — não persiste, não chama LLM, não analisa Contagem/Betim/BH real (os valores são reaproveitados apenas como números plausíveis, dissociados do `territoryId` real). `lineage.test.ts` prova, com esses dados, que a cadeia é totalmente rastreável até a fonte oficial (`resolveRecommendationToEvidence` retorna os 2 `Evidence` reais com `source: 'Tesouro/SICONFI'`).

## 54. Arquivos criados

- `lib/territorios/intelligence/contracts.ts`
- `lib/territorios/intelligence/guardrails.ts`
- `lib/territorios/intelligence/lineage.ts`
- `lib/territorios/intelligence/poc-fixture.ts`
- `lib/territorios/intelligence/contracts.test.ts`
- `lib/territorios/intelligence/guardrails.test.ts`
- `lib/territorios/intelligence/lineage.test.ts`
- `docs/relatorios/CLAUDE_INTEL01_ARQUITETURA_INTELIGENCIA_POLITICA.md`

## Arquivos alterados

**Nenhum.** Nenhum arquivo eleitoral, nenhum arquivo do Antigravity, nenhum motor homologado (IBGE/TSE/Segurança/Saúde/ECO-01), nenhum arquivo de `lib/territorios/types.ts` foi modificado.

## Git diff --stat

```
 lib/territorios/intelligence/contracts.ts       | novo, ~240 linhas
 lib/territorios/intelligence/guardrails.ts      | novo, ~120 linhas
 lib/territorios/intelligence/lineage.ts         | novo, ~65 linhas
 lib/territorios/intelligence/poc-fixture.ts     | novo, ~95 linhas
 lib/territorios/intelligence/contracts.test.ts  | novo, ~45 linhas
 lib/territorios/intelligence/guardrails.test.ts | novo, ~85 linhas
 lib/territorios/intelligence/lineage.test.ts    | novo, ~50 linhas
```
`git status` confirmado ao final: apenas `lib/territorios/intelligence/` como `??` (não rastreado). Todo o restante do worktree (Antigravity FRONT-02.6/FRONT-02.6.5, Codex ECO-02A se presente, relatórios anteriores) permanece exatamente como estava — não lido para edição, não staged, não commitado.

## Conflitos com trabalho paralelo

Nenhuma colisão de arquivo. Identificado (não tocado): Antigravity expandindo `components/dashboard/territorios/analytical/` e `components/dashboard/territorios/intelligence/` + `app/dashboard/territorios/sandbox/` (FRONT-02.6/02.6.5); 13 arquivos de frontend territorial modificados; `lib/utils/` novo. Nenhuma evidência de trabalho concorrente do Codex em `lib/territorios/eco02*` ou similar foi encontrada no momento desta auditoria — se ECO-02A já estiver em andamento em outro worktree/sessão, não foi tocado nem lido por este gate.

## Decisões pendentes

1. Padrão único de referência para `ExecutiveSummary` (string solta vs. `{text, ref}` como no eleitoral) — não resolvido, ver seção 36.
2. Se `PoliticalSignalStack` do frontend deve consumir `Signal` puro ou `Signal`+`Implication` combinados, dada a tensão de nomenclatura risco/oportunidade (seção 8).
3. Limiar de tempo para `stale` → `needs_reanalysis` (seção 42) — não fixado.
4. Se um guard textual dedicado para "despesa empenhada ≠ gasto efetivo" deve ser adicionado a `guardrails.ts` na integração real (seção 29).

## Riscos

- O contrato canônico e o contrato eleitoral existente **não foram unificados** (deliberadamente, para não arriscar quebrar o domínio eleitoral já homologado) — existe hoje uma duplicação conceitual (não de código) entre `ElectoralConfidenceClass` e `ConfidenceClass` (mesmos 3 valores, tipos TypeScript distintos). Migração futura do domínio eleitoral para importar o tipo canônico é possível mas não foi feita aqui.
- `EvidencePanel.tsx`/fixtures do Antigravity usam `evidence: string` solta em vez de referência estruturada — se a integração real usar o contrato canônico, essa camada visual precisará de um adaptador (seção 39), trabalho não estimado aqui.
- Nenhuma regra automática de atribuição de `priority`/`severity` existe — quando implementada, deve evitar os mesmos vieses que os guards hoje bloqueiam em texto (ex.: não usar volume de menções negativas como proxy de severidade sem metodologia).

## Recomendação para INTEL-02

Antes de qualquer geração real de inteligência: (1) resolver as decisões pendentes acima; (2) implementar um `provider` **determinístico** (não LLM) para pelo menos um domínio não-eleitoral (Economia é o candidato natural, dado ECO-01 homologado), replicando o padrão `buildXIntelligence → buildXInterpretationContext → interpretX` já provado; (3) só então avaliar introdução de um provider LLM, sempre atrás dos guardrails aqui definidos e nunca substituindo o provider determinístico, apenas complementando a síntese textual.

## Gate final

- MODELO L0–L6: **PASS**
- EVIDENCE: **PASS**
- DERIVED INDICATOR: **PASS**
- SIGNAL: **PASS**
- INTERPRETATION: **PASS**
- IMPLICATION: **PASS**
- RECOMMENDATION: **PASS**
- LINEAGE: **PASS** (testado: cadeia completa + 3 variantes de quebra rejeitadas)
- TEMPORALIDADE: **PASS**
- COVERAGE: **PASS**
- CONFIDENCE: **PASS**
- LIMITATIONS: **PASS**
- INSUFFICIENT EVIDENCE: **PASS**
- CROSS-DOMAIN: **PASS**
- VERSIONAMENTO: **PASS**
- EXPLAINABILITY: **PASS**
- FRONTEND MAPPING: **PASS**
- PIPELINE FUTURO: **PASS**
- DETERMINÍSTICO VS GENERATIVO: **PASS**
- LLM GUARDRAILS: **PASS**
- HALLUCINATION CONTROL: **PASS** (12 testes cobrindo 8 guards)
- AUDITABILIDADE: **PASS**

- LLM CHAMADO: **NÃO**
- ANÁLISE POLÍTICA REAL GERADA: **NÃO**
- MUNICÍPIO REAL ANALISADO: **NÃO**
- MOTOR ALTERADO: **NÃO**
- FRONTEND ALTERADO: **NÃO**
- N8N ALTERADO: **NÃO**
- MIGRATION: **NÃO**

**STATUS FINAL: HOMOLOGADO**

**PRONTO PARA INTEL-02: SIM**

**PRONTO PARA INTEGRAÇÃO AO ORQUESTRADOR: NÃO — depende de decisão posterior, conforme instruído.**
