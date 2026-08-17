# AUDITORIA INDEPENDENTE — ECO-03B3B: Expansão Histórica CAGED 2024-01 → 2026-06

**Auditor:** Claude (independente do Codex)
**Data:** 2026-08-17
**Escopo:** motor Economia/Novo CAGED, Belo Horizonte/Betim/Contagem, janela 202401–202606 (30 competências)
**Metodologia:** leitura de código, extração e recálculo direto dos arquivos raw (MOV/FOR/EXC) via `bsdtar`+`awk`, sem usar `reconstructCagedHistoricalSeries` nem qualquer código do pipeline no cálculo comparativo; queries SQL diretas no Postgres; reexecução real do script de expansão (dry-run e `--apply`).

---

## 1. Resumo executivo

A expansão 2024-01→2026-06 foi auditada tentando quebrá-la, não confirmá-la. **Não encontrei nenhum P0 nem P1.** Reconstruí de forma totalmente independente (raw CSV → awk, sem tocar em `history.ts`) 9 pontos totais (3 municípios × 202401/202406/202412) e 2 pontos setoriais (Contagem/202401, serviços e comércio) — **11/11 bateram exatamente, diferença zero** — incluindo a prova concreta de uma revisão FOR/EXC real em 2024 (Contagem/202401: MOV +552 → final +496, uma alteração de -56 vindas de correções retroativas genuínas). Confirmei a integridade de hash de 9 artefatos raw de 2024 recomputando SHA-256 eu mesmo, e confirmei — via comparação de `layoutVersion` (hash do cabeçalho) entre manifests de 2024 e evidências já persistidas de 2026 — que o layout é **byte-idêntico** entre 2024 e 2026, não apenas "compatível por inspeção".

Cardinalidade (1.620 indicadores = 18×3×30; 558 evidências = 540 correntes + 18 vintages herdadas, inalteradas), continuidade (30/30 meses, 0 gaps), unicidade de `current` (0 duplicadas, 0 ausentes), cobertura de metadata (100% nos campos obrigatórios do ECO-03B3A.1 em 558/558; 100% nos campos novos — `reference_month`/`context`/`contributing_vintages` — nas 540 correntes, 0% nas 18 vintages herdadas, que predatam essa adição e não deveriam mesmo tê-los) e invariância da baseline anterior (9 pontos + checksum de 702 linhas idêntico ao medido no ECO-03B3A.1) foram todos **reconfirmados por consulta direta ao banco**, não por leitura do relatório do Codex. Reexecutei eu mesmo (não apenas li) o script de expansão em modo `--apply` sobre a janela inteira: 0 inserts, 0 updates, 1620/1620 indicadores e 558/558 evidências "unchanged" — idempotência e reprocessamento do overlap 202506–202507 comprovados por execução real.

**Veredito: PASS.**

---

## 2. Escopo

Somente motor Economia/Novo CAGED, 3 municípios-piloto, janela 202401–202606. `git status` confirma que nenhum arquivo de frontend, n8n, LLM/intelligence ou deploy foi tocado nesta expansão.

---

## 3. Diff/scope isolation

**PASS.** Únicos arquivos novos/alterados desde o ECO-03B3A.1 (confirmado por timestamp de modificação, já que o diretório inteiro é não rastreado pelo git):

- `scripts/expand-caged-eco03b3b.ts` (novo) — orquestra download/checkpoint/reconstrução/persistência em 6 blocos.
- `scripts/audit-caged-eco03b3b.ts` (novo) — script de autoverificação do Codex.
- `lib/territorios/caged/persistence.ts` (alterado) — **único arquivo de produção tocado**. Diff isolado a duas linhas: `evidenceRows.push({...})` em `persistCagedAggregates`/`persistCagedSectorAggregates` passou a incluir `reference_month`, `context` (e `sector`, no caso setorial) e `contributing_vintages` dentro de `metadata` (antes só existiam em `raw_reference`). Não altera `source_hash`, não altera a decisão insert/update/unchanged, não altera MOV/FOR/EXC, não altera setores.

`core.ts`, `history.ts`, `sectors.ts`, `methods.ts`, `parser.ts`, `evidence-persistence.ts` — **intocados** (timestamps de 16/08, antes do ECO-03B3B). Nenhuma alteração de metodologia econômica.

---

## 4. Fonte 2024

**PASS.** Confirmei diretamente no cache local (`/private/tmp/politixos-caged-eco03b1/caged/raw/2024/`) a presença de `202401`–`202412`, cada um com `CAGEDMOV/FOR/EXC*.7z` + manifests. Extraí e recontei linhas dos 9 arquivos de 202401/202406/202412 via `wc -l`:

| Mês | MOV | FOR | EXC |
|---|---:|---:|---:|
| 202401 | 3.955.239 | 49.453 | 6.840 |
| 202406 | 3.941.593 | 55.414 | 8.430 |
| 202412 | 3.584.049 | 44.193 | 5.122 |

Bate exatamente com a "Matriz MOV/FOR/EXC" do relatório do Codex (seção 6) — recontado por mim a partir do arquivo bruto, não copiado do relatório.

---

## 5. Hashes/manifests

**PASS.** Recomputei SHA-256 dos 9 artefatos `.7z` de 202401/202406/202412 com `shasum -a 256` e comparei contra (a) o hash embutido no nome do arquivo e (b) o campo `sha256` do manifest JSON correspondente — **9/9 idênticos** nas três comparações. Nenhum arquivo trocado, nenhum manifest incorreto, nenhum cache contaminado.

---

## 6. Layout/schema 2024

**PASS.** Header extraído diretamente dos 9 arquivos: MOV e FOR têm **28 colunas**, EXC tem **30 colunas**, idêntico nas três competências amostradas. Delimitador `;`, UTF-8 sem BOM (primeiro byte é `c` de `competência`, não `EF BB BF`). Campos essenciais confirmados nas posições: `município`=coluna 4, `saldomovimentação`=coluna 7, `seção`=coluna 5, `competênciamov`=coluna 1 (usada tanto como referência do próprio MOV quanto como "mês corrigido" em FOR/EXC — é o identificador que relaciona uma revisão à sua competência-alvo).

**Compatibilidade 2024/2025/2026 — prova por hash, não por inspeção visual:** o manifest de cada artefato grava um `layoutVersion` (hash do cabeçalho canônico). Os 9 artefatos de 2024 produziram exatamente `a455d4948bf820b98093ab4f0eef5b61c2d731a407c9f7cd7c20b17ead4a7503` (MOV/FOR) e `b4f41aa607a17cad821a5ebd02d8fdea1abbd9ff916c19c38f5280cb05155c15` (EXC) — **os mesmos dois hashes** que eu já havia observado nas evidências de 202606 persistidas no banco durante a auditoria ECO-03B3A.1 (sessão anterior, fonte de dados completamente diferente). Dois hashes idênticos computados a partir de fontes independentes (arquivo raw de 2024 vs. metadata de evidência de 2026) é prova de que o cabeçalho é **byte-idêntico** entre janeiro/2024 e junho/2026, não apenas "parecido".

---

## 7. Município

**PASS.** Os três códigos CAGED (311860, 310670, 310620 — prefixo de 6 dígitos dos códigos IBGE 3118601/3106705/3106200) aparecem nos arquivos MOV/FOR/EXC de 202401/202406/202412, confirmados diretamente pelo filtro `awk -F';' '$4=="311860"'` etc., sem qualquer fuzzy matching — comparação de string exata.

---

## 8. Revision model

**PASS.** Reli `resolveCagedEventEffect` em `core.ts` (não alterado): `sign = EXC ? -1 : 1`; `admissionsDelta`/`dismissalsDelta` conforme `movement`. Confirmei que a implementação de 2024 usa exatamente essa função — não há branch condicional por ano em nenhum arquivo do motor. Nenhuma regra especial para 2024.

---

## 9. Revision canary 2024 (reconstrução 100% independente)

**PASS.** Escolhi Contagem/202401 e recalculei diretamente do raw, sem usar `reconstructCagedHistoricalSeries`:

| Componente | Admissões | Desligamentos |
|---|---:|---:|
| **MOV original** (só CAGEDMOV202401.txt) | 10.556 | 10.004 |
| **FOR effect** (soma de todas as 30 declarações 202401→202606, filtrado por competência corrigida = 202401) | +117 | +246 |
| **EXC effect** (idem) | -7 | -80 |
| **FINAL REVISION-AWARE** | **10.666** | **10.170** |

**MOV ORIGINAL saldo = 10.556 − 10.004 = +552. FINAL REVISION-AWARE saldo = 10.666 − 10.170 = +496.** Delta de revisão = −56, causado por correções retroativas genuínas registradas em declarações posteriores (não um artefato de reprocessamento). Persistido no banco: `admissoes=10666, desligamentos=10170, saldo=496` — **bate exatamente**.

Esse cálculo somou eventos de **60 arquivos FOR/EXC diferentes** (um par por cada uma das 30 declarações 202401–202606), todos extraídos e filtrados por mim via `awk`, nunca pela função de produção. Confirma de forma robusta a declaração do Codex "2024 REVISION CANARY: FOUND".

---

## 10. Continuidade

**PASS.** Consulta direta: os 3 municípios têm exatamente 30 meses cada, de `2024-01-01` a `2026-06-01`, sem duplicatas (`count(*) group by período` sempre =1) e sequência mensal completa e ordenada (verificado listando o array completo de 30 datas para Contagem — nenhum mês ausente).

---

## 11. Cardinalidade dos indicadores

**PASS. TOTAL: 1.620** (medido, `SELECT count(*)`). Composição demonstrada: **18 indicadores distintos** (`admissoes/desligamentos/saldo_emprego_formal` + 5 setores × 3 métricas = 3+15=18) **× 3 municípios × 30 meses = 1.620**, confirmado via `count(distinct indicador)=18` e `count(distinct periodo_inicio)=30` na mesma query. **0 duplicatas** (`group by território/indicador/período having count>1` retornou vazio).

---

## 12. Raw reconciliation independente

**PASS. SAMPLES: 9 (total) + 2 (setorial) = 11. DIVERGENCES: 0.**

Reconstrução manual via `awk` (MOV base + Σ FOR − Σ EXC de todas as 30 declarações, filtrado por competência-alvo), comparada ao valor persistido:

| Município | Competência | RAW adm | RAW desl | RAW saldo | Persistido | Diferença |
|---|---|---:|---:|---:|---:|---:|
| Contagem | 202401 | 10.666 | 10.170 | +496 | +496 | **0** |
| Contagem | 202406 | 10.907 | 10.090 | +817 | +817 | **0** |
| Contagem | 202412 | 8.093 | 11.473 | -3.380 | -3.380 | **0** |
| Betim | 202401 | 4.854 | 4.280 | +574 | +574 | **0** |
| Betim | 202406 | 5.813 | 4.865 | +948 | +948 | **0** |
| Betim | 202412 | 3.955 | 4.678 | -723 | -723 | **0** |
| Belo Horizonte | 202401 | 46.070 | 44.216 | +1.854 | +1.854 | **0** |
| Belo Horizonte | 202406 | 47.174 | 43.694 | +3.480 | +3.480 | **0** |
| Belo Horizonte | 202412 | 33.978 | 44.984 | -11.006 | -11.006 | **0** |

202506 não foi re-extraído do raw nesta auditoria porque já havia sido reconstruído do raw, byte a byte, duas vezes em auditorias anteriores desta mesma sessão (ECO-03B3A e ECO-03B3A.1) com resultado idêntico (+338) — reconfirmado aqui apenas via leitura do banco (seção 20, invariância de baseline), o que é suficiente para provar que a expansão não alterou esse ponto.

**9/9 PASS, diferença zero**, calculado inteiramente a partir de arquivo bruto, nunca do pipeline.

---

## 13. Reconciliação setorial

**PASS.** Amostra adicional independente (Contagem/202401, comércio e serviços), recalculada do raw filtrando `seção` (coluna 5): comércio (seção G) e serviços (seções H–U):

| Indicador | RAW (awk) | Persistido |
|---|---:|---:|
| Admissões comércio | 3.418 | 3.418 |
| Desligamentos comércio | 3.705 | 3.705 |
| Saldo comércio | -287 | -287 |
| Admissões serviços | 4.498 | 4.498 |
| Saldo desligamentos serviços | 3.817 | 3.817 |
| Saldo serviços | 681 | 681 |

Além disso, soma dos 5 setores vs. total municipal, para os 9 pontos totais da seção 12, consultada diretamente no banco: **9/9 bateram exatamente** (soma = total, sem resíduo em nenhum dos 9 pontos amostrados de 2024). Cinco setores oficiais confirmados: `agropecuaria, industria_geral, construcao, comercio, servicos`; `nao_classificado` segue existindo apenas como controle interno de reconciliação, nunca publicado como indicador (confirmado por `distinct indicador` = 18, sem nenhum `_nao_classificado`).

---

## 14. MoM

**PASS.** Metodologia inalterada: diferença aritmética simples contra o mês anterior, `null` se não houver mês anterior. Recalculado manualmente a partir da série completa de saldo de Contagem lida do banco:
- 202402 vs 202401: 863 − 496 = **367**
- 202501 vs 202412: −39 − (−3.380) = **3.341**
- 202606 vs 202605: 914 − 495 = **419**

Todos consistentes com a definição homologada (nunca percentual sobre saldo, que poderia ser negativo/zero).

---

## 15. YoY

**PASS.** Recalculado manualmente:
- 202501 vs 202401: −39 − 496 = **−535**
- 202506 vs 202406: 338 − 817 = **−479**
- 202606 vs 202506: 914 − 338 = **576** (idêntico ao já verificado na auditoria ECO-03B3A)

Antes de existir par comparável do ano anterior (todo 2024, já que não há 2023 na janela), o YoY é corretamente `null` — a série de 2024 nunca apresenta um YoY fabricado.

---

## 16. Rolling 12m

**PASS.** Confirmado como soma de fluxo (nunca estoque). Recalculado manualmente a partir da série de saldo de Contagem:
- **202412** (primeira competência elegível — primeiros 12 meses da janela, 202401–202412): soma = **6.501**.
- **202506** (janela 202407–202506): soma = **4.843**.
- **202606** (janela 202507–202606): soma = **2.938** (idêntico ao já calculado independentemente na auditoria ECO-03B3A — não afetado pela expansão, já que essa janela de 12 meses não toca dados de 2024).

Nenhuma janela parcial apresentada como completa; meses antes de 202412 corretamente não têm rolling12 disponível.

---

## 17. Evidence

**PASS. TOTAL: 558. LOGICAL: 540. CURRENT: 540. HISTORY: 18.**

Consulta direta: 540 pontos lógicos únicos (`território|competência|contexto`), demonstrados matematicamente como **3 municípios × 30 meses × 6 contextos (total + 5 setores) = 540**. 18 vintages herdadas do ECO-03B3A.1 (nenhuma nova).

---

## 18. Current/history

**PASS. CURRENT DUPLICATES: 0. CURRENT MISSING: 0.**

```sql
-- agrupado por chave lógica, contando current=true
```
Resultado: 540 chaves lógicas, 0 com mais de uma `current=true`, 0 sem nenhuma. **HISTORY BEFORE: 18. HISTORY AFTER: 18. NEW ARTIFICIAL HISTORY: 0** — a expansão para 2024 não criou nenhuma vintage nova por mudança de hash/composição de metadata; as 18 linhas herdadas do ECO-03B3A.1 continuam sendo exatamente as mesmas 18 (todas de 202606, já documentadas e explicadas naquele relatório como artefatos de composição de hash entre duas execuções do pipeline, não revisões econômicas).

---

## 19. Metadata

**PASS — mas com uma distinção importante que verifiquei explicitamente (não apenas aceitei o "100%" do relatório):**

| Campo | Cobertura em 558 (todas) | Cobertura em 540 (correntes) | Cobertura em 18 (históricas) |
|---|---:|---:|---:|
| `history_method_version` | 558/558 (100%) | 540/540 | 18/18 |
| `revision_aware` | 558/558 (100%) | 540/540 | 18/18 |
| `as_of_declaration_month` | 558/558 (100%) | 540/540 | 18/18 |
| `aggregate_hash` | 558/558 (100%) | 540/540 | 18/18 |
| `reference_month` (novo campo) | 540/558 | **540/540 (100%)** | **0/18** |
| `context` (novo campo) | 540/558 | **540/540 (100%)** | **0/18** |
| `contributing_vintages` (novo campo) | 540/558 | **540/540 (100%)** | **0/18** |

O relatório do Codex declara "100% nas 540 evidências correntes" (seção 30) — **essa afirmação está correta e eu confirmei que ela se refere exatamente às 540 linhas correntes**, não às 558 totais. As 18 linhas históricas não têm os três campos novos porque predatam a mudança de `persistence.ts` desta expansão (elas foram escritas pela correção ECO-03B3A.1, antes da adição de `reference_month`/`context`/`contributing_vintages` ao `metadata`) — isso é esperado e coerente com a política de "nunca reescrever vintages sem necessidade", não é uma lacuna nova. **METADATA COVERAGE: 100% (no escopo correto, 540/540 correntes).**

---

## 20. Lineage

**PASS. LINEAGE COVERAGE: 100%.** Amostrei 202401 (total, Contagem), 202406 (setor comércio, Contagem) e 202412 (total, Belo Horizonte): cada evidência tem `raw_reference.vintages`/`contributing_vintages` com hash, tamanho, URL FTP oficial e `object_key` local, todos rastreáveis até o arquivo `.7z` correspondente no cache — confirmado batendo com os manifests lidos na seção 5.

---

## 21. Baseline invariance

**PASS.** Reconferidos direto no banco após a expansão:

| Ponto | Persistido |
|---|---|
| Contagem 202506 | 11.416/11.078/+338 |
| Contagem 202512 | 7.986/12.118/-4.132 |
| Contagem 202606 | 12.237/11.323/+914 |
| Betim 202606 | 7.291/5.935/+1.356 |
| Belo Horizonte 202512 | 32.206/45.207/-13.001 |
| Belo Horizonte 202606 | 47.792/46.646/+1.146 |

**Idênticos aos valores homologados no ECO-03B3A/ECO-03B3A.1.** Além disso, recalculei o checksum das 702 linhas de indicadores do período 202506–202606 (`md5(string_agg(id||':'||valor))`) e obtive **`4f106b872bb3abcf8f3565ec0db66776`** — **exatamente o mesmo checksum** que eu havia calculado na auditoria ECO-03B3A.1, antes da expansão. Prova que as 702 linhas da baseline são bit-a-bit idênticas (mesmo `id`, mesmo `valor`), não apenas "parecidas".

---

## 22. Overlap

**PASS.** Reexecutei o script de expansão real (`--apply`) especificamente sobre o bloco `202506–202507`: **0 inserts, 0 updates, 108 indicadores "unchanged", 0 evidências novas, 36 evidências "unchanged"** — confirmado por execução real, não lido do relatório. A janela sobreposta não criou indicador novo indevido, não duplicou evidência, não alterou valor e não criou current paralela.

---

## 23. Idempotência

**PASS — reexecutado por mim sobre a janela inteira, não apenas lido.**

```
$ npx tsx scripts/expand-caged-eco03b3b.ts --apply
```

Resultado real (6 blocos, cobrindo toda a janela 202401–202606):

| Bloco | Indicadores inseridos/atualizados/inalterados | Evidências inseridas/atualizadas/inalteradas |
|---|---|---|
| 202401–202403 | 0/0/162 | 0/0/54 |
| 202404–202406 | 0/0/162 | 0/0/54 |
| 202407–202412 | 0/0/324 | 0/0/108 |
| 202501–202505 | 0/0/270 | 0/0/90 |
| 202506–202507 | 0/0/108 | 0/0/36 |
| 202508–202606 | 0/0/594 | 0/0/216 |
| **Total** | **0/0/1.620** | **0/0/558** |

Confirmado via SQL após o rerun: `indicators=1620, evidence_total=558, evidence_current=540` — **idêntico ao estado anterior à reexecução.**

---

## 24. Checkpoints/cache

**PASS.** 30 arquivos de checkpoint em `checkpoints/eco03b3b/`, um por competência (202401–202606). Verifiquei o checkpoint de 202401: `declarationMonth=202401`, `status=completed`, vintages com os mesmos SHA-256 confirmados na seção 5, e `summaries[].rowsRead` = **3.955.239/49.453/6.840** — idêntico à minha própria contagem de linhas do arquivo raw (seção 4), confirmando que o checkpoint reflete fielmente o artefato original. Cache local: **1,8 GiB** medido via `du -sh` (bate com "1,8 GiB" declarado). Reexecução (seção 23) usou 100% dos checkpoints sem re-baixar nada — cache-first confirmado por execução real.

---

## 25. On-demand architecture

**PASS.** `SELECT count(distinct territory_id) FROM territory_indicators WHERE source_dataset='NOVO_CAGED'` = **3** — nenhum município adicional, nenhum processamento de MG inteiro (853) nem do Brasil. `PILOTS` está hardcoded a 3 entradas em ambos os scripts novos, sem nenhum parâmetro que amplie o escopo territorial.

---

## 26. Performance

| Métrica declarada (Codex) | Minha verificação |
|---|---|
| ~29 min processamento inicial | **NOT_VERIFIED** (não refiz o download completo — reprocessar do zero destruiria o cache e violaria a arquitetura on-demand sem necessidade; não há como verificar sem repetir o custo integral) |
| ~242 MiB RSS pico (carga inicial) | **NOT_VERIFIED** (mesma razão acima) |
| ~106 MiB RSS reexecução por checkpoint | **PLAUSIBLE/VERIFIED** — minha própria reexecução (dry-run e `--apply`) reportou `peakRssBytes` ≈ 100.0 MB (99.958.784 e 100.007.936 bytes), mesma ordem de grandeza |
| 51 downloads novos / 39 reutilizados | **VERIFIED matematicamente**: janela anterior (ECO-03B3A) tinha 13 meses × 3 = 39 artefatos já em cache; expansão adiciona 17 meses novos (202401–202505) × 3 = 51; 39+51=90=30×3 ✓ |
| Cache 808 MiB → 1,8 GiB | **VERIFIED**: `du -sh` mediu 1,8G após a expansão; 808 MiB era o valor já medido antes, na auditoria ECO-03B3A |

Classificação agregada: **PLAUSIBLE.** Não há indício de número fabricado; os itens não re-verificados são caros de re-verificar sem repetir download completo e não afetam a correção dos dados.

---

## 27. Testes

| Suíte | Resultado (Claude, reexecutado) | Declarado (Codex) |
|---|---|---|
| `npx vitest run lib/territorios/caged --pool=forks` | **44/44 PASS** | 44/44 PASS |
| `npx vitest run lib/territorios app/api/territorios --pool=forks` | **872 PASS, 2 skipped** | (não declarado neste relatório, mas consistente com ECO-03B3A.1) |

Zero regressões.

---

## 28. P0/P1/P2/P3

- **P0: 0.**
- **P1: 0.**
- **P2: 2, herdados, ambos reconfirmados como não escalados:**
  1. `territory_indicators` decide insert/update em memória antes de `.insert()` — sob concorrência real, a constraint UNIQUE do banco rejeitaria com erro, não duplicação silenciosa. Código inalterado nesta expansão.
  2. Garantia transacional absoluta de "uma current" sob múltiplos writers simultâneos exigiria migration futura — o lease central (`acquireCagedLease`, inalterado) é suficiente para o modelo sequencial atual.
- **P3: 1, herdado** (inconsistência de nomenclatura entre `raw_reference.vintages` (contexto total) e `raw_reference.contributing_vintages` (contexto setorial), documentada no ECO-03B3A.1) **+ 1 observação nova, também P3, não bloqueante:** os campos `reference_month`/`context`/`contributing_vintages` recém-adicionados ao `metadata` de evidência existem apenas nas 540 linhas correntes, não nas 18 históricas — comportamento esperado e correto (seção 19), mas vale documentar para não confundir consumidores futuros que iterem sobre `territory_evidence` sem filtrar por `current=true`.

---

## 29. Decisão

1. **A expansão 202401–202606 é confiável?** Sim — 11 pontos (9 total + 2 setoriais) recalculados 100% do raw bateram exatamente.
2. **O CAGED 2024 foi realmente homologado?** Sim — fonte, hash, schema e layout (por hash de header) confirmados independentemente.
3. **Existe prova independente de revisão FOR/EXC em 2024?** Sim — Contagem/202401 reconstruído do raw: MOV +552 → final +496, com FOR/EXC de 60 arquivos somados manualmente.
4. **Os 1.620 indicadores estão corretos?** Sim, cardinalidade demonstrada matematicamente e batendo com `count(*)`.
5. **As 558 evidências estão semanticamente consistentes?** Sim — 540 correntes (1 por ponto lógico) + 18 históricas estáveis, nenhuma nova.
6. **As 18 versões históricas permaneceram estáveis?** Sim — mesmas 18 de antes da expansão, nenhuma nova criada.
7. **Metadata e lineage estão em 100%?** Sim, no escopo correto (540 correntes); as 18 históricas mantêm cobertura 100% dos campos que já possuíam desde o ECO-03B3A.1.
8. **A baseline anterior permaneceu invariável?** Sim — 9 canários e checksum de 702 linhas idênticos ao medido antes da expansão.
9. **Reprocessamento continua idempotente?** Sim, comprovado por execução real (`--apply`) sobre toda a janela: 0 inserts/updates.
10. **Existe algum P0/P1?** Não.
11. **Podemos congelar ECO-03B3B como homologado?** Sim.
12. **Podemos iniciar DATA-COVERAGE-01?** Essa decisão cabe ao usuário; tecnicamente não há bloqueio dos critérios auditados aqui.
13. **Qual deve ser o próximo gate de Economia?** Sugestão técnica (não decisão): tratar o P2 nº2 (garantia transacional de `current`) antes de qualquer cenário de múltiplos writers concorrentes, e considerar unificar a nomenclatura `vintages`/`contributing_vintages` do `raw_reference` antes de expandir para mais municípios — nenhum dos dois bloqueia o presente gate.

---

## 30. Gate final

```text
ECO-03B3B AUDIT: PASS
2024 SOURCE: PASS
RAW HASH INTEGRITY: PASS
2024 SCHEMA: PASS
2024/2025/2026 COMPATIBILITY: PASS
MUNICIPALITY MAPPING: PASS
REVISION MODEL: PASS
2024 REVISION CANARY: PASS
START: 202401
END: 202606
MONTHS: 30
SERIES CONTINUITY: PASS
GAPS: 0
INDICATOR CARDINALITY: PASS
TOTAL INDICATORS: 1620
RAW RECONCILIATION: PASS
RAW SAMPLES: 11
RAW DIVERGENCES: 0
SECTOR RECONCILIATION: PASS
MoM: PASS
YoY: PASS
ROLLING 12M: PASS
EVIDENCE CARDINALITY: PASS
TOTAL EVIDENCES: 558
LOGICAL EVIDENCES: 540
CURRENT: 540
HISTORY: 18
CURRENT DUPLICATES: 0
CURRENT MISSING: 0
HISTORY STABILITY: PASS
NEW ARTIFICIAL HISTORY: 0
METADATA: PASS
METADATA COVERAGE: 100%
LINEAGE: PASS
LINEAGE COVERAGE: 100%
BASELINE INVARIANCE: PASS
OVERLAP: PASS
IDEMPOTENCY: PASS
CHECKPOINT INTEGRITY: PASS
CACHE STRATEGY: PASS
ON-DEMAND ARCHITECTURE: PASS
PERFORMANCE: PLAUSIBLE
TESTS: PASS
TYPECHECK: PASS
LINT: PASS
BUILD: PASS
P0: 0
P1: 0
P2: 2
P3: 2
READY FOR DATA-COVERAGE-01: YES
READY FOR NEXT ECONOMY GATE: YES
```

---

## Encerramento

**PARE.** Não foi iniciado DATA-COVERAGE-01, nem qualquer próximo gate de Economia, nem INTEL-03D. Frontend, n8n e deploy não foram tocados. Nenhum código de produção foi alterado por esta auditoria — apenas leitura, extração read-only de arquivos raw já em cache (posteriormente removidos do scratchpad), queries SQL de leitura e reexecução de um script já existente (`expand-caged-eco03b3b.ts`, em dry-run e `--apply`, ambos idempotentes por design e comprovados sem efeito líquido). A decisão de iniciar o próximo gate de Economia cabe ao usuário, com base neste relatório.
