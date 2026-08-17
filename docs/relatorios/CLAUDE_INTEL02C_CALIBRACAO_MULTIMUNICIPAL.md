# INTEL-02C — Calibração Multi-Municipal + Consolidação Metodológica do Motor Econômico + Controle de Densidade Analítica

**Autor:** Claude (arquitetura, auditoria e inteligência — trilha Territórios)
**Data:** 2026-08-16
**Gate anterior:** INTEL-02B (integração PIB/VAB) — `CLAUDE_INTEL02B_INTEGRACAO_PIB_VAB.md`, HOMOLOGADO.
**Municípios de calibração (dados reais):** Contagem/MG (3118601), Betim/MG (3106705), Belo Horizonte/MG (3106200).

---

## 1. Objetivo do gate

Calibrar o Motor de Inteligência Econômica (INTEL-02/02B) com dados reais de 3 municípios, avaliando — e só ajustando quando metodologicamente justificado — os thresholds herdados de fixtures sintéticas e de um único município (Contagem). Princípio orientador declarado pelo usuário e seguido à risca neste gate:

> "NÃO calibrar o motor para 'produzir menos sinais'. Calibrar para: produzir sinais metodologicamente defensáveis. Se 99 sinais forem corretos: não alterar thresholds artificialmente apenas para reduzir número. Se houver redundância: resolver redundância. NÃO mascarar informação."

Todo ajuste documentado abaixo tem uma justificativa empírica e estatística — nenhum foi escolhido para produzir uma contagem de sinais "mais bonita" nos 3 municípios de teste.

## 2. Escopo executado

- Avaliação de thresholds com dados reais multi-municipais (percentis empíricos).
- Comparação de comportamento do motor entre os 3 municípios.
- Remoção/ajuste de `THRESHOLD_PRELIMINARY` apenas onde havia evidência suficiente — substituído por `THRESHOLD_PILOT_CALIBRATED` (nunca `CALIBRATED` simples — ver seção 8).
- Identificação de regra excessivamente sensível (CONCENTRATION setorial disparando quase permanentemente) e correção metodológica (não um simples aumento de threshold).
- Avaliação de densidade de sinal (contagem, redundância, distribuição por tipo/família).
- Implementação de mecanismo determinístico de consolidação de sinais `CHANGE` consecutivos (`ECON_CONSOLIDATION_V1`), aditivo — nunca remove sinais brutos.
- Preservação de lineage completo — **e correção de um bug real de rastreabilidade pré-existente, encontrado durante a verificação de lineage com dados reais** (seção 9).
- Preparação do motor para INTEL-03 (decisão explícita na seção 15 — não é um "SIM" automático).

## 3. Escopo explicitamente NÃO executado (proibições do gate, respeitadas)

- Nenhum LLM, Interpretation, Implication, Recommendation, ou tipo de sinal RISK/OPPORTUNITY.
- Nenhuma prioridade política, julgamento de governo ou linguagem avaliativa.
- Nenhuma alteração em frontend, n8n, Orquestrador Territorial, ou deploy.
- Nenhuma integração com CAGED/ECO-03B1 — `lib/territorios/caged/` não foi tocado (confirmado via `git status`, ver seção 14).
- Nenhuma alteração nos arquivos homologados do ECO-02B (`economia-pib-client.ts`, `economia-pib-normalizer.ts`, `economia-pib-collector.ts`) — usados apenas via import read-only.
- Nenhuma persistência de dados de Betim/BH — fetch → normalize → `Evidence[]` em memória → motor, sempre. Confirmado por inspeção de código: as funções de leitura usadas (`fetchPibMunicipalSidra`, `fetchOfficialPibPerCapita`, chamadas `.select()` ao Supabase) nunca chamam `.insert()`/`.upsert()`.
- Nenhum HHI implementado automaticamente no motor — avaliado apenas conceitualmente (seção 10).
- **INTEL-03 não foi iniciado.**

## 4. Concorrência com outros agentes

CODEX trabalha em paralelo no ECO-03B1 (`lib/territorios/caged/`, `scripts/audit-caged-eco03b1.ts`). Nenhum arquivo dessa área foi lido além de sua existência via `git status`, e nenhum foi modificado. Nenhuma colisão de arquivo ocorreu neste gate.

## 5. Dados reais utilizados

| Município | Código IBGE | Origem dos dados | Evidence (itens) | Observação |
|---|---|---|---|---|
| Contagem | 3118601 | Banco real (ECO-01 SICONFI + ECO-02B PIB/VAB já persistidos) | 286 | Já homologado em gates anteriores |
| Betim | 3106705 | Fetch ao vivo (SIDRA 5938 + base oficial per capita), via client ECO-02B homologado, **sem persistir** | 244 | Apenas PIB/VAB — sem SICONFI para Betim neste gate (fora de escopo) |
| Belo Horizonte | 3106200 | Fetch ao vivo, idêntico a Betim, **sem persistir** | 244 | Idem |

Nenhuma fixture sintética foi usada para calibrar threshold algum — todos os percentis e frequências citados abaixo vêm exclusivamente desses dados reais.

## 6. Metodologia de calibração

Para cada família de indicador (`PIB_VAB_MONETARY`, `OFFICIAL_SHARE`), calculou-se a distribuição real de variação (YoY nominal % para PIB/VAB; mudança em p.p. para participação setorial) combinando os 3 municípios, e usou-se o **percentil P90** como corte-padrão para thresholds de `CHANGE` — um limiar que captura o decil superior (as ~10% variações mais atípicas de cada série), consistente com a lógica já usada no threshold FISCAL original (calibrado por observação direta de que 15% é atipicamente alto para SICONFI).

### 6.1 PIB/VAB monetário — distribuição real (N=57–63 por indicador, 2002–2023)

| Indicador | N | P25 | mediana | P75 | P90 | P95 | max |
|---|---|---|---|---|---|---|---|
| pib_municipal_precos_correntes | 63 | 4.15 | 9.45 | 14.66 | 20.56 | 24.30 | 44.23 |
| pib_per_capita_precos_correntes | 63 | 3.40 | 8.65 | 14.52 | 22.39 | 24.92 | 57.60 |
| vab_total_precos_correntes | 57 | 4.20 | 9.71 | 15.72 | 21.05 | 24.00 | 39.48 |
| vab_agropecuaria_precos_correntes | 57 | 4.02 | 10.59 | 21.02 | 33.03 | 37.86 | 53.38 |
| vab_industria_precos_correntes | 57 | -0.37 | 7.97 | 18.17 | 33.76 | 40.62 | 62.56 |
| vab_servicos_exceto_setor_publico_ampliado | 57 | 3.52 | 9.55 | 15.30 | 21.44 | 22.88 | 45.00 |
| vab_administracao_defesa_educacao_saude_publicas_seguridade | 57 | 4.49 | 9.82 | 12.58 | 15.27 | 16.10 | 17.85 |
| impostos_liquidos_subsidios_produtos | 57 | 0.38 | 6.86 | 15.72 | 27.73 | 32.12 | 47.27 |

Achado central (seção 12/13 do gate): a volatilidade **não é uniforme**. Agropecuária, indústria e impostos têm P90 entre 27.7% e 33.8% — quase o dobro do threshold único anterior (15%). Administração pública é o mais estável (P90=15.3%). Um único threshold de 15% para todo PIB/VAB estava, na prática, **sub-calibrado para o núcleo estável e sobre-sensível para o núcleo volátil simultaneamente** — capturando ~25-30% das observações do núcleo volátil (pouco seletivo) e sendo coincidentalmente adequado só para administração pública.

**Decisão:** o threshold único `CHANGE_YOY_THRESHOLD_PCT_PIB_VAB` foi removido e substituído por 3 thresholds por subgrupo, roteados pela nova função `pibVabChangeThresholdFor(indicator)`:

| Novo threshold | Valor | Aplica-se a | Base empírica |
|---|---|---|---|
| `CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_STANDARD` | 20% | pib_municipal, pib_per_capita, vab_total, vab_serviços | P90 combinado 20.6%–21.4% |
| `CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_VOLATILE` | 30% | vab_agropecuária, vab_indústria, impostos | P90 combinado 27.7%–33.8% |
| `CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_ADMIN_PUBLIC` | 15% | vab_administração pública | P90 15.3%, P95 16.1%, máx 17.9% (valor antigo já estava bem calibrado por coincidência para este indicador específico) |

Status: `THRESHOLD_PILOT_CALIBRATED` (nunca `CALIBRATED` simples) para os três, com `calibrationSample` machine-readable no código (`lib/territorios/intelligence/economy/thresholds.ts`).

### 6.2 Participação setorial oficial (p.p.) — distribuição real (N=57 por setor, 228 combinado, 2002–2021)

| Setor | N | P25 | mediana | P75 | P90 | P95 | max |
|---|---|---|---|---|---|---|---|
| agropecuária | 57 | 0.00 | 0.00 | 0.00 | 0.00 | 0.01 | 0.02 |
| indústria | 57 | -1.59 | -0.31 | 1.14 | 4.09 | 5.80 | 12.49 |
| serviços | 57 | -1.28 | 0.53 | 1.48 | 2.97 | 5.70 | 7.24 |
| administração pública | 57 | -0.53 | 0.00 | 0.50 | 0.91 | 1.07 | 1.72 |
| **combinado (4 setores)** | **228** | -0.68 | 0.00 | 0.63 | 2.03 | **3.89** | 12.49 |

**Decisão:** `CHANGE_PP_THRESHOLD_OFFICIAL_SHARE` mantido em **3pp** — o P95 combinado (3.89pp) confirma o valor já em uso como um corte razoável do "top 5%" de mudanças estruturais anuais. Ressalva honesta documentada no código: por setor o comportamento diverge muito (agropecuária quase nunca cruza 3pp, administração pública raramente ultrapassa 1.1pp, indústria/serviços cruzam com mais frequência) — avaliou-se e **descartou-se** dividir em subthresholds por setor neste gate, por não haver ganho claro que justifique a complexidade adicional. Status: `THRESHOLD_PILOT_CALIBRATED`.

## 7. CONCENTRATION setorial — achado e correção metodológica (seção 16/17 do gate)

### 7.1 Achado empírico (antes da correção)

Contando quantos dos últimos 20 anos (2002–2021) cada município teve um setor com participação ≥50% do VAB:

| Município | Setor dominante | Anos com share ≥50% |
|---|---|---|
| Contagem | serviços | **18/20** |
| Betim | indústria | 10/20 |
| Betim | serviços | 3/20 |
| Belo Horizonte | serviços | **20/20** |

Ou seja: o threshold de 50% fazia o sinal `CONCENTRATION` disparar em praticamente **todo ano avaliável** para Contagem e Belo Horizonte — um sinal quase permanente carrega pouca informação nova a cada disparo.

### 7.2 Correção aplicada — NÃO foi um aumento arbitrário de threshold

A seção 17 do gate proíbe explicitamente "aumentar threshold arbitrariamente" quando o disparo é quase permanente, exigindo avaliação de mudança metodológica. A correção implementada foi adicionar uma segunda condição: distância mínima ao segundo colocado.

- **Novo threshold:** `CONCENTRATION_GAP_TO_SECOND_PCT_OFFICIAL_SHARE = 15pp`.
- **Nova regra:** `CONCENTRATION` só dispara se `share_líder >= 50%` **E** `share_líder - share_segundo_colocado >= 15pp`.
- **Assinatura de `detectOfficialShareConcentration` alterada** (breaking, documentada): agora recebe as séries de **todos** os setores oficiais configurados (`allSectorSeries: OfficialShareObservation[][]`) em vez de uma única série, para poder calcular a distância ao segundo colocado no mesmo ano.

### 7.3 Validação empírica da correção (ano mais recente disponível, 2021)

| Município | Líder | Share | Segundo | Share | Gap | Resultado |
|---|---|---|---|---|---|---|
| Contagem | serviços | 59.1% | indústria | 30.8% | 28.3pp | **Dispara** (dominância inequívoca) |
| Betim | indústria | 53.0% | serviços | 38.5% | 14.5pp | **NÃO dispara** (disputa próxima — abaixo dos 15pp) |
| Belo Horizonte | serviços | 68.7% | indústria | 17.5% | 51.2pp | **Dispara** (dominância inequívoca) |

A correção discrimina corretamente: Betim, cuja estrutura produtiva não tem um setor claramente hegemônico, deixou de disparar; Contagem e BH, onde a dominância é real, mantiveram o sinal. **Limitação reconhecida e não escondida:** para Belo Horizonte especificamente, mesmo com a correção, o sinal permanece estruturalmente quase-permanente ao longo da série histórica (serviços nunca caiu de ~65% de participação) — isso é uma característica real da economia de BH, não um artefato do motor, e é documentado como limitação aberta, não resolvida neste gate.

## 8. `CalibrationStatus` — nunca "calibração nacional" a partir de 3 municípios (seção 40 do gate)

Novo valor de enum `THRESHOLD_PILOT_CALIBRATED`, distinto de `CALIBRATED` (regras puramente metodológicas, não dependentes de amostra — ex.: `TREND_MIN_CONSECUTIVE_PERIODS`) e de `THRESHOLD_PRELIMINARY` (sem amostra real nenhuma, herdado de fixture). Todo threshold calibrado neste gate carrega:

```ts
interface CalibrationSample {
  municipalities: readonly string[]; // ['3118601','3106705','3106200']
  observationCount: number;
  periodRange: string;
  method: string;
}
```

Isso torna a limitação amostral **legível programaticamente** (não apenas em texto de relatório), por decisão explícita do gate (seção 49: "preferir catálogo no código, não deixar justificativa apenas no relatório").

## 9. Sinais brutos: antes × depois da calibração

| Município | Sinais ANTES (thresholds INTEL-02B) | Sinais DEPOIS (thresholds INTEL-02C) | Δ |
|---|---|---|---|
| Contagem | 99 | **70** | -29 |
| Betim | 105 | **80** | -25 |
| Belo Horizonte | 61 | **36** | -25 |

**Importante — por que essa redução é legítima e não viola o princípio "não calibrar para produzir menos sinais":** a redução não veio de "apertar" um número para ficar mais bonito. Ela é o resultado direto e auditável de duas mudanças com justificativa empírica independente:

1. O split do threshold PIB/VAB de 15% único (sub-calibrado para 4 dos 8 indicadores) para 3 thresholds por subgrupo de volatilidade real — reduz `CHANGE` apenas onde o threshold anterior estava, comprovadamente, capturando ruído estatístico normal da série (ex.: agropecuária variando 20-25% ano a ano é seu comportamento típico, não uma mudança relevante).
2. A exigência de distância ao segundo colocado em `CONCENTRATION` — elimina disparos redundantes/quase-permanentes sem eliminar o sinal em nenhum caso onde a dominância setorial é real (Contagem e BH continuam disparando).

Distribuição por tipo (depois da calibração):

| Município | ANOMALY | CHANGE | ATTENTION | CONCENTRATION | DIVERGENCE | TREND |
|---|---|---|---|---|---|---|
| Contagem | 6 | 46 | 4 | 1 | 5 | 8 |
| Betim | 3 | 51 | 13 | 0 | 7 | 6 |
| Belo Horizonte | 2 | 11 | 11 | 1 | 4 | 7 |

Distribuição por família:

| Município | FISCAL | PIB_VAB_MONETARY | OFFICIAL_SHARE |
|---|---|---|---|
| Contagem | 26 | 33 | 11 |
| Betim | 12 | 44 | 24 |
| Belo Horizonte | 11 | 21 | 4 |

Nenhum sinal foi suprimido "silenciosamente" — toda a diferença é rastreável às duas mudanças de threshold acima, ambas documentadas com `justification` e `calibrationSample` no próprio código (`thresholds.ts`).

## 10. HHI (Herfindahl-Hirschman Index) — avaliação conceitual apenas (seção 18 do gate)

Por instrução explícita, o HHI foi **calculado apenas para avaliação neste relatório**, não implementado como métrica automática do motor:

| Município (2021) | shares (agro/ind/serv/adm) | HHI |
|---|---|---|
| Contagem | 0.0 / 30.8 / 59.1 / 10.1 | 0.4545 |
| Betim | 0.1 / 53.0 / 38.5 / 8.4 | 0.4364 |
| Belo Horizonte | 0.0 / 17.5 / 68.7 / 13.8 | 0.5211 |

**Recomendação para gate futuro (INTEL-02D ou INTEL-03):** HHI é uma métrica contínua de concentração estrutural que complementaria (não substituiria) o `CONCENTRATION_GAP_TO_SECOND_PCT` binário atual — poderia, por exemplo, alimentar um `DerivedIndicator` de "índice de diversificação econômica" sem introduzir interpretação. Não implementado neste gate para não introduzir metodologia nova silenciosamente.

## 11. Consolidação de sinais `CHANGE` (seções 26–34 do gate)

### 11.1 Motivação

Uma sequência de `CHANGE` consecutivos no mesmo sentido (ex.: PIB crescendo >20% em 3 anos seguidos) hoje aparece como N sinais independentes — factualmente correto, mas com densidade informacional redundante quando lido como lista plana. O gate propôs, como exemplo de trabalho, um mecanismo de consolidação que **descreva a sequência como um único evento de nível superior sem apagar as detecções brutas**.

### 11.2 Design implementado — `lib/territorios/intelligence/economy/consolidation.ts`

- Novo método `ECON_CONSOLIDATION_V1`, novo tipo `ConsolidatedSignal` (não é um `AnalyticalSignal` L3 novo — é uma camada agregadora sobre sinais `CHANGE` já existentes, com seu próprio `methodId`).
- `consolidateChangeEvents(territoryId, family, indicator, events)` agrupa eventos `CHANGE` consecutivos (mesmo território/família/indicador/direção, `toYear[i] === fromYear[i+1]`) em sequências (`eventCount`, `constituentSignalRefs`, `derivedIndicatorRefs`, `evidenceRefs`).
- **Escopo restrito a `CHANGE`** — decisão deliberada, não expansão de escopo: `TREND` já se autoconsolida (janela fixa de 3 períodos, sem re-detecção incremental); os demais tipos (`PRESSURE`, `CONCENTRATION`, `DIVERGENCE`, `ANOMALY`, `ATTENTION`) não têm a mesma noção de "sequência de eventos pontuais no tempo" que motivou o pedido do gate.
- **Um evento isolado também produz uma sequência (`eventCount=1`)** — cobertura de 100% dos `CHANGE` brutos, não apenas das sequências de 2+ (exigido pela seção 61 do gate como caso de teste explícito).
- **Aditivo, nunca destrutivo:** `EconomicIntelligenceResult.consolidatedSignals` é um campo novo e separado — `signals` continua contendo *todos* os sinais brutos, sem remoção (seção 29 do gate, verificado por teste — seção 11.4 abaixo).
- Escopo por família/indicador/território é garantido **estruturalmente**: `engine.ts` chama `consolidateChangeEvents` uma vez por indicador dentro de cada loop de família (FISCAL, PIB_VAB_MONETARY, OFFICIAL_SHARE) — eventos de indicadores/famílias/territórios diferentes nunca chegam à mesma chamada, então nunca podem se misturar (não é uma checagem em runtime, é a própria arquitetura da chamada).

### 11.3 Resultado real (dados multi-municipais, depois da calibração)

| Município | CHANGE brutos | Sequências consolidadas | eventCount=1 | eventCount=2 | eventCount=3 |
|---|---|---|---|---|---|
| Contagem | 46 | 39 | 34 | 3 | 2 |
| Betim | 51 | 41 | 31 | 10 | 0 |
| Belo Horizonte | 11 | 10 | 9 | 1 | 0 |

Em todos os 3 municípios, `Σ eventCount das sequências == CHANGE brutos` — nenhuma perda, confirmado programaticamente (script de verificação, seção 13).

### 11.4 Cobertura de teste — `consolidation.test.ts` (26 casos)

Matriz de casos exigida pela seção 61 do gate, todos unitários sobre `consolidateChangeEvents`:

- 0 eventos → array vazio.
- 1 evento isolado → `eventCount=1`.
- 2 e 3 eventos consecutivos mesma direção → uma sequência, `eventCount` correto.
- Período interrompido (gap de anos) → duas sequências separadas.
- Direção invertida (mesmo com anos consecutivos) → quebra a sequência.
- Indicadores/famílias/territórios diferentes → nunca se misturam (verificado explicitamente chamando a função duas vezes com escopos diferentes).
- `methodId` diferente → não é um campo de `ChangeEvent` (por design — ver seção 11.2); a segregação por método é garantida estruturalmente pela chamada separada por família em `engine.ts`, documentado no teste.
- Determinismo de agrupamento independente da ordem de entrada.

Testes de integração (motor completo, seções 62-64):

- **Lineage (seção 62):** todo `constituentSignalRefs` resolve em `result.signals`; todo `derivedIndicatorRefs` resolve em `result.derivedIndicators`; todo `evidenceRefs` resolve em `result.evidenceIndex`.
- **Determinismo (seção 63):** evidência em ordem original vs. invertida produz exatamente os mesmos `signals` e `consolidatedSignals` (mesmos IDs, mesmo conteúdo).
- **Não-perda (seção 64):** todo sinal `CHANGE` bruto em `result.signals` aparece em pelo menos um `constituentSignalRefs`; `signals` nunca é filtrado pela consolidação.

## 12. Achado e correção: bug real de lineage pré-existente (transparência total)

Durante a verificação de lineage com **dados reais** (seção 62, rodada contra os 3 municípios), a checagem `derivedIndicatorRefs ⊆ result.derivedIndicators.ids` falhou:

- Contagem: 7 referências quebradas.
- Betim: 21 referências quebradas.
- Belo Horizonte: 2 referências quebradas.

Todas quebradas exclusivamente na família `OFFICIAL_SHARE`, tipos `CHANGE` e `TREND`.

**Causa raiz:** `ECON_OFFICIAL_SHARE_SERIES_V1` indexa `DerivedIndicator` por **ano único** (`period: String(item.year)` — consumo direto do valor oficial, sem cálculo de intervalo). Porém `detectOfficialShareChange` e `detectOfficialShareTrend` (escritos no INTEL-02B, portanto **pré-existentes a este gate**) construíam `derivedIndicatorRefs` no formato de intervalo `fromYear-toYear` — um ID que nunca existiu no catálogo de `DerivedIndicator`. As fixtures sintéticas usadas nos testes originais do INTEL-02B nunca expuseram o problema porque nenhum teste checava a resolução efetiva de `derivedIndicatorRefs` contra `result.derivedIndicators` — só a *presença* do campo era testada.

**Correção aplicada** (`signals.ts`): `detectOfficialShareChange` agora referencia os dois `DerivedIndicator` de ano único que delimitam o intervalo (`fromYear`, `toYear`); `detectOfficialShareTrend` referencia todos os anos distintos cobertos pela janela. `ChangeEvent.derivedIndicatorRef` (singular) foi generalizado para `derivedIndicatorRefs: string[]` em `consolidation.ts`/`engine.ts` para suportar corretamente ambos os casos (1 ref para família com `DerivedIndicator` por intervalo — FISCAL/PIB_VAB; 2+ refs para família com `DerivedIndicator` por ano — OFFICIAL_SHARE).

**Verificação pós-correção:** lineage quebrado = **0** nos 3 municípios reais (Contagem, Betim, BH), reconfirmado após a correção. Suíte completa (101 testes do módulo de economia, 675 testes da suíte territorial) permanece 100% verde.

Esse achado é reportado integralmente por ser exatamente o tipo de problema que a seção 62 do gate pediu para caçar — "não mascarar informação" se aplica também a bugs do próprio motor descobertos no processo, não apenas a decisões de threshold.

## 13. Verificação de determinismo e performance (dados reais)

| Município | Evidence | DerivedIndicators | Tempo de execução |
|---|---|---|---|
| Contagem | 286 | 289 | ~11–20ms |
| Betim | 244 | 236 | ~2ms |
| Belo Horizonte | 244 | 236 | ~1.3–2.3ms |
| **Sequencial (3 municípios)** | 774 | 761 | **< 25ms total** |

Motor continua *pure core* — nenhuma chamada de rede/DB dentro de `runEconomicIntelligenceEngine`; toda a variação de tempo entre execuções é ruído de JIT/GC, não I/O.

Determinismo verificado com dados reais (não apenas fixture): reexecução do motor com a mesma evidência produz os mesmos `signals`/`consolidatedSignals` (IDs e conteúdo idênticos) — coberto por teste automatizado (seção 11.4) e por reexecução manual do script de calibração.

## 14. Regressão completa

| Verificação | Comando (prefixo de diretório, nunca nome de arquivo isolado) | Resultado |
|---|---|---|
| Testes — módulo de economia | `vitest run lib/territorios/intelligence/economy` | **101/101 passed** (6 arquivos, incluindo o novo `consolidation.test.ts`) |
| Testes — suíte territorial completa | `vitest run lib/territorios app/api/territorios` | **675/675 passed** (76 arquivos) |
| Typecheck | `tsc --noEmit -p tsconfig.json` | **0 erros** |
| Lint — economia | `eslint lib/territorios/intelligence/economy` | **0 erros, 0 warnings** |
| Lint — territórios completo | `eslint lib/territorios app/api/territorios` | **0 erros**, 4 warnings pré-existentes e não relacionados (variáveis não usadas em arquivos de teste/adapter fora do escopo deste gate) |
| Build de produção | `next build` | **Sucesso** — compilação, typecheck e geração de páginas estática/dinâmica sem erro |

`git status` confirma escopo respeitado:

```
?? lib/territorios/intelligence/economy/     (alterado/criado neste gate)
?? scripts/calibracao-intel02c-multimunicipal.ts  (criado neste gate)
?? lib/territorios/caged/                    (pré-existente, INTOCADO — ECO-03B1/CODEX)
?? docs/RELATORIO_INTEGRACAO_MOTOR_SAUDE_ORQUESTRADOR_2026_08_15.md  (gate anterior, não relacionado)
```

Nenhum arquivo de frontend, n8n ou Orquestrador foi tocado. Nenhum dado de Betim/BH foi persistido (funções usadas são exclusivamente `.select()`/fetch read-only).

## 15. Declaração de segurança

| Pergunta | Resposta |
|---|---|
| Este gate usa LLM em qualquer etapa do motor de economia? | **NÃO** |
| Este gate produz Interpretation, Implication ou Recommendation (L4-L6)? | **NÃO** |
| Este gate introduz SignalType RISK ou OPPORTUNITY? | **NÃO** |
| Este gate atribui prioridade política ou julgamento de governo a qualquer sinal? | **NÃO** |
| Este gate altera frontend, n8n ou o Orquestrador Territorial? | **NÃO** |
| Este gate faz deploy? | **NÃO** |
| Este gate integra CAGED/ECO-03B1? | **NÃO** |
| Este gate persiste dados de Betim ou Belo Horizonte? | **NÃO** |
| Este gate altera os arquivos homologados do ECO-02B (client/normalizer/collector)? | **NÃO** |
| Este gate declara "calibração nacional" a partir de 3 municípios de MG? | **NÃO** — status `THRESHOLD_PILOT_CALIBRATED` usado consistentemente, nunca `CALIBRATED` para thresholds derivados de amostra |
| Este gate implementa HHI automaticamente no motor? | **NÃO** — avaliado apenas conceitualmente, documentado para gate futuro |
| Este gate remove ou oculta algum sinal bruto (`signals`) pela consolidação? | **NÃO** — `consolidatedSignals` é aditivo, verificado por teste |
| Este gate encontrou e corrigiu algum bug pré-existente fora do escopo original do pedido? | **SIM** — bug de lineage em `detectOfficialShareChange`/`detectOfficialShareTrend` (seção 12), corrigido e verificado, por ser um problema de rastreabilidade que a própria seção 62 do gate pediu para investigar |

## 16. Checklist final do gate

| Item | Status |
|---|---|
| Dados reais de 3 municípios usados para toda decisão de threshold | **PASS** |
| Nenhuma calibração feita com fixture sintética | **PASS** |
| `THRESHOLD_PRELIMINARY` removido onde havia evidência suficiente | **AJUSTADO** → `THRESHOLD_PILOT_CALIBRATED` (PIB/VAB ×3, OFFICIAL_SHARE p.p., OFFICIAL_SHARE concentration, gap-to-second) |
| Threshold FISCAL (15%, herdado do ECO-01) | **MANTIDO** — fora do escopo de recalibração deste gate (dados SICONFI só para Contagem) |
| Regra excessivamente sensível identificada e corrigida metodologicamente (não threshold arbitrário) | **PASS** — CONCENTRATION setorial (gap ao segundo colocado) |
| Densidade analítica avaliada (contagem, tipo, família, redundância) | **PASS** — seção 9 |
| HHI avaliado, não implementado automaticamente | **PASS** — seção 10 |
| Consolidação de `CHANGE` implementada, aditiva, testada | **PASS** — seção 11 |
| Lineage completo preservado (após correção do bug encontrado) | **PASS** — seção 12, verificado com dados reais dos 3 municípios (0 quebras) |
| Determinismo verificado (fixture + dados reais) | **PASS** |
| Motor pure core, sem I/O | **PASS** — < 25ms para os 3 municípios sequencialmente |
| Regressão completa (testes/lint/typecheck/build) | **PASS** — 101 + 675 testes, 0 erros |
| Nenhuma persistência de Betim/BH | **PASS** |
| Nenhum arquivo fora de escopo tocado (CAGED/frontend/n8n/Orquestrador) | **PASS** |

## 17. Decisão final — "Pronto para INTEL-03?"

Conforme a regra de decisão final estabelecida pelo próprio gate, "PRONTO PARA INTEL-03: SIM" não pode ser declarado apenas porque os testes passam — exige simultaneamente dados reais multi-municipais, thresholds defensáveis, densidade avaliada, redundância entendida, lineage completo, determinismo e ausência de problemas metodológicos abertos de severidade HIGH/BLOCKER.

**Decisão: PRONTO PARA INTEL-03 — COM RESSALVAS.**

Justificativa:

- Todos os critérios técnicos objetivos foram atendidos (dados reais, thresholds documentados com amostra, lineage 100% íntegro após correção, determinismo, regressão completa).
- **Ressalva 1 (amostral):** a calibração cobre apenas 3 municípios de Minas Gerais, todos de porte médio/grande metropolitano — não há amostra de municípios pequenos, de outras regiões do país, ou de perfis econômicos muito distintos (ex.: baseados fortemente em agropecuária, turismo, mineração). Os thresholds `THRESHOLD_PILOT_CALIBRATED` refletem isso explicitamente no `calibrationSample` de cada um.
- **Ressalva 2 (CONCENTRATION em BH):** mesmo após a correção do gap-to-second, o sinal de concentração em serviços permanece estruturalmente quase-permanente para Belo Horizonte — limitação real da economia do município, não resolvida, documentada na seção 7.3.
- **Ressalva 3 (threshold FISCAL não recalibrado):** o threshold de 15% para variação fiscal segue com amostra de apenas 1 município (Contagem) — fora do escopo deste gate, mas relevante para qualquer decisão de "motor pronto" mais ampla.
- Nenhuma dessas ressalvas é um BLOCKER — todas são limitações amostrais conhecidas e documentadas, compatíveis com prosseguir para INTEL-03 desde que a equipe esteja ciente de que os thresholds continuam sendo *piloto*, não nacionais.

## 18. Arquivos alterados/criados neste gate

**Modificados:**
- `lib/territorios/intelligence/economy/thresholds.ts` — reescrito (novos thresholds, `CalibrationStatus`/`CalibrationSample`).
- `lib/territorios/intelligence/economy/signals.ts` — `detectOfficialShareConcentration` (nova assinatura), `detectOfficialShareChange`/`detectOfficialShareTrend` (correção de lineage).
- `lib/territorios/intelligence/economy/engine.ts` — thresholds por indicador, coleta de séries antes de `detectOfficialShareConcentration`, wiring da consolidação.
- `lib/territorios/intelligence/economy/types.ts` — campo `consolidatedSignals`.
- `lib/territorios/intelligence/economy/fixtures.ts` — fixture `FIXTURE_R2_SHARE_CLOSE_RUNNER_UP` (teste de gap).
- `lib/territorios/intelligence/economy/official-share.test.ts` — adaptado à nova assinatura de `detectOfficialShareConcentration`.

**Criados:**
- `lib/territorios/intelligence/economy/consolidation.ts` — mecanismo de consolidação.
- `lib/territorios/intelligence/economy/consolidation.test.ts` — 26 casos (unitários + integração).
- `scripts/calibracao-intel02c-multimunicipal.ts` — script de calibração multi-municipal (mantido como infraestrutura reexecutável, read-only).

## 19. Encerramento

Gate INTEL-02C concluído. Relatório entregue em `docs/relatorios/CLAUDE_INTEL02C_CALIBRACAO_MULTIMUNICIPAL.md`.

Conforme instrução: **PARE.** Nenhuma etapa de INTEL-03 foi iniciada. Nenhum LLM foi criado. Nenhuma integração com o Orquestrador foi feita. Nenhuma alteração de frontend foi feita. Nenhum deploy foi feito. Aguardando auditoria/decisão do usuário antes do próximo gate.
