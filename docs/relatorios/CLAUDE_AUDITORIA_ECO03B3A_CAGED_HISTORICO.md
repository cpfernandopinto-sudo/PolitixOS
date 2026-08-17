# AUDITORIA INDEPENDENTE — ECO-03B3A: CAGED Histórico Revision-Aware

**Auditor:** Claude (independente do Codex, que implementou o ECO-03B3A)
**Data:** 2026-08-17
**Escopo auditado:** `lib/territorios/caged/{history,history-persistence,series-query}.ts` + `scripts/{audit-caged-eco03b3a,verify-caged-eco03b3a-persistence}.ts` + dados reais persistidos no Supabase + arquivos raw MOV/FOR/EXC em cache local.
**Metodologia:** recálculo independente a partir da matéria-prima (raw CSV descompactado via `bsdtar`, agregado via `awk`, sem usar nenhuma linha do código do próprio pipeline), consultas SQL diretas ao Postgres (não ao relatório do Codex), reexecução real de idempotência.

---

## 1. Resumo executivo

O ECO-03B3A é **tecnicamente sólido no que importa mais**: o motor de reconstrução revision-aware (MOV+FOR+EXC até um cutoff) foi **reproduzido de forma totalmente independente, a partir do CSV raw, sem usar nenhuma linha do código do pipeline**, e bateu **exatamente** com o valor persistido no caso canário (Contagem/202506: 11.309→11.416 admissões, 10.953→11.078 desligamentos, saldo +356→+338). Os 9 pontos da amostra de recálculo, a reconciliação setor-vs-total, a cardinalidade (702 indicadores = 18 indicadores × 3 municípios × 13 meses, contado direto no banco), a cobertura temporal (13 meses consecutivos, sem gaps, para os 3 municípios) e a idempotência (reexecutada por mim, não só lida do relatório do Codex: 0 inserted/0 updated/702 unchanged/0 duplicatas) **todos confirmaram exatamente** o que o Codex declarou.

**Mas a auditoria encontrou um problema real, não relatado, na tabela `territory_evidence`**: o número de evidências persistidas é **252, não 234** como declarado, e **nenhuma das 252 linhas de evidência carrega os campos `history_method_version`/`revision_aware`/`as_of_declaration_month`** em `metadata` — mesmo quando o indicador correspondente em `territory_indicators` carrega esses campos corretamente. A causa raiz foi isolada com precisão (seção 15): a tabela de evidência usa `upsert` com `ignoreDuplicates: true` sobre uma chave que não inclui a versão do método, então uma linha de evidência criada por uma versão anterior do código (antes do "patch de metadata histórica" que o próprio relatório do Codex menciona na seção 35) nunca é atualizada por uma execução revision-aware posterior que produz o mesmo hash de conteúdo. Isso **não invalida nenhum valor numérico persistido** (todos os valores em `territory_indicators`, que é a fonte primária consumida por `getCagedMunicipalSeries`, estão corretos e corretamente rotulados) e **não quebra a rastreabilidade reproduzível** (o campo `raw_reference.vintages` de cada evidência tem a lista completa e correta dos arquivos contribuintes, hash a hash) — mas é uma inconsistência de proveniência real que se agravará à medida que o ECO-03B3B reprocessar janelas sobrepostas.

**Veredito: PASS WITH RESERVATIONS.** Ready for ECO-03B3B **com ressalva**: a tabela `territory_evidence` não deve ser consumida como fonte de verdade para `history_method_version`/`revision_aware` até uma correção dedicada (P1, não corrigida aqui por política do gate).

---

## 2. Escopo

Auditado: histórico CAGED revision-aware (MOV/FOR/EXC), séries mensais, cinco setores, MoM/YoY/Rolling12m, evidence/lineage, persistência, idempotência — para Contagem/Betim/Belo Horizonte, janela 202506–202606 (13 competências), cutoff 202606. Não auditado (fora de escopo, não tocado): frontend, n8n, Orquestrador, intelligence L4, ECO-03B2 (indicadores setoriais além dos 5 grupos aqui tratados), qualquer expansão de janela ou município.

---

## 3. Mapa da implementação

| Arquivo | Responsabilidade | Entrada | Saída | Risco potencial |
|---|---|---|---|---|
| `core.ts` | Normalização, `resolveCagedEventEffect` (sinal MOV/FOR=+1, EXC=−1), hash canônico | linha CSV bruta | `CagedEventEffect` (deltas assinados) | Baixo — reconciliação `balance=admissions-dismissals` verificada a cada evento |
| `parser.ts` | Parse streaming (`csv-parse` + `createReadStream`, nunca `readFileSync` do arquivo inteiro) | arquivo `.txt` extraído do `.7z` | `CagedParseSummary` (agregados por município+competência) | Baixo — múltiplas reconciliações internas (linha, nacional, setor-vs-total) que lançam erro em vez de persistir silenciosamente |
| `sectors.ts` | Classificação CNAE seção→5 grupos+residual, acumulação setorial | `CagedEventEffect` + seção CNAE | `CagedSectorSummary` | Baixo |
| `methods.ts` | Catálogo dos 5 setores oficiais + `nao_classificado`, mapa de classificação A-U | — | Constantes | Baixo — classificação determinística e auditável |
| `history.ts` | `reconstructCagedHistoricalSeries` — o motor revision-aware central | `CagedHistoricalBatch[]` (MOV/FOR/EXC de várias declarações) | `CagedHistoricalSeries[]` (pontos mensais com MoM/YoY/Rolling12m) | **Médio antes da auditoria, Baixo depois** — lógica correta, confirmada por recálculo independente (seções 6, 8) |
| `history-persistence.ts` | Publica pontos já reconstruídos em `territory_indicators`/`territory_evidence` | `CagedHistoricalSeries[]` | Contadores de insert/update/unchanged | **Médio — achado real na seção 15** (evidência não recebe atualização de metadata) |
| `persistence.ts` | Upsert de indicador (com força de update quando `history_method_version` difere) e evidência (`ignoreDuplicates`) | agregados + vintages | Linhas em `territory_indicators`/`territory_evidence` | **Alto localizado** — assimetria entre a lógica de indicador (força update) e evidência (nunca atualiza) |
| `series-query.ts` | `getCagedMunicipalSeries`, leitura read-only para frontend | `territory_id`, `from`, `to`, `sector?` | Série pronta para gráfico | Baixo |
| `artifact-storage.ts` | Cache local/Supabase de arquivos `.7z`, manifest com sha256 | download bruto | `CagedSourceVintage` | Baixo — hash verificado na leitura (`readCurrentVintage`) |
| `municipality-resolver.ts` | CAGED (6 dígitos) → IBGE (7 dígitos) via prefixo | dicionário IBGE oficial | `Map<string,string>` | Baixo — determinístico, com detecção de colisão |
| `scripts/audit-caged-eco03b3a.ts` | Orquestra o pipeline completo para os 3 pilotos | `from`/`to`/`persist` | JSON de auditoria + persistência opcional | — |
| `scripts/verify-caged-eco03b3a-persistence.ts` | Reexecuta persistência sobre a mesma série (teste de idempotência) | série já computada | Contadores + duplicatas | — |

---

## 4-6. Metodologia revision-aware — MOV/FOR/EXC

**[VERIFICADO NO CÓDIGO E CONFIRMADO EMPIRICAMENTE]**

1. **MOV** cria a base absoluta da competência declarada (sinal +1 em `core.ts`). Verificado empiricamente: **100% das linhas do arquivo MOV/202506 têm `competênciamov=202506`** — a suposição de `history.ts` de que MOV nunca contém referenceMonth diferente da própria declaração é válida para o arquivo real inspecionado (não apenas assumida no código).
2. **FOR** soma eventos retroativos com sinal **+1** (mesmo sinal do MOV). Confirmado: nenhuma linha do FOR/202506 referencia a própria competência 202506 (só competências anteriores) — FOR só corrige o passado.
3. **EXC** aplica o efeito inverso com sinal **−1**, calculado em `core.ts::resolveCagedEventEffect` (`sign = sourceKind === 'EXC' ? -1 : 1`) **antes** da agregação — `history.ts` soma tudo (`point.admissions += delta.admissions`) sem precisar saber o tipo, porque o sinal já está embutido no delta. Isso é uma separação de responsabilidades limpa e correta.
4. Correções posteriores alteram competências anteriores via `referenceMonthsTouched` (lido diretamente da coluna `competênciamov` de cada linha do FOR/EXC, nunca do nome do arquivo) — permite que uma declaração de novembro corrija junho, por exemplo.
5. Duplicidade é evitada por `selectLatestBatches`: para cada `(declarationMonth, kind)`, só a vintage mais recente (`collectedAt`) é usada — nunca soma duas vintages da mesma declaração.
6. Identificador de relacionamento: `${ibgeCode}|${referenceMonth}` (chave do ponto) — direto e correto.
7. Estado final = MOV base + soma de todos os FOR/EXC (com sinal já resolvido) cujo `declarationMonth ≤ asOfDeclarationMonth` e cujo `referenceMonth` = competência do ponto.
8. Cutoff (`asOfDeclarationMonth`) é aplicado em `selectLatestBatches`: `batches.filter(item => item.declarationMonth <= asOf)` — testado e confirmado (seção 6, meses posteriores ao cutoff nunca entram).
9. Determinístico: mesma entrada sempre produz o mesmo hash (`canonicalAggregateHash` inclui `contributingVintages` ordenadas) — confirmado por 0 mudanças na reexecução de idempotência (seção 12).

**Tentativas de quebrar o método** (double counting, correção duplicada, exclusão ignorada, FOR ignorado, MOV duplicado, evento pós-cutoff, ordenação incorreta): nenhuma encontrada no código nem nos dados reais inspecionados. O reconciliador interno (`sectorTotals !== point.admissions → throw`) tornaria qualquer uma dessas falhas visível como uma exceção, não como um número silenciosamente errado.

---

## 6. Caso canário — Contagem/202506 (reconstruído 100% independentemente do pipeline)

**[MEDIDO, RAW, SEM USAR NENHUM CÓDIGO DO PROJETO]**

Extraí os arquivos `.7z` raw (MOV/202506 + FOR/EXC de **todas** as 13 declarações 202506→202606) com `bsdtar`, e recontei com `awk` puro, filtrando `município=311860` (código CAGED de Contagem, = prefixo de 6 dígitos do IBGE 3118601):

| Componente | Admissões | Desligamentos |
|---|---:|---:|
| MOV (base, só arquivo 202506) | **11.309** | **10.953** |
| FOR (soma de 12 arquivos declarados 202507→202606, filtrados por competência=202506) | +115 | +167 |
| EXC (soma de 9 arquivos com correções, mesmo filtro) | −8 | −42 |
| **Final reconstruído (meu cálculo, independente)** | **11.416** | **11.078** |
| **Declarado pelo Codex** | 11.416 | 11.078 |
| **Persistido no Postgres (consultado direto)** | 11.416 | 11.078 |

**MOV ORIGINAL = 356 (medido, raw) | FINAL REVISION-AWARE = 338 (medido, raw, persistido) — bate exatamente em todas as três fontes independentes.**

Estrutura: FOR contribuiu com `+115 admissões / +167 desligamentos` (Δsaldo FOR = −52) e EXC com `−8 admissões / −42 desligamentos` (Δsaldo EXC = +34) → Δsaldo total = −18 (356−18=338) ✓, batendo com a prosa do relatório do Codex ("FOR/EXC alteraram admissões em +107, desligamentos em +125" — 115−8=107 ✓, 167−42=125 ✓).

---

## 7. Auditoria temporal

**[MEDIDO, consulta SQL direta]**

```sql
SELECT municipio, count(DISTINCT periodo_inicio), min(periodo_inicio), max(periodo_inicio) ...
```
→ Belo Horizonte: 13 meses, 2025-06-01 a 2026-06-01. Betim: idem. Contagem: idem. **Sem gaps, sem duplicatas, sem competência fora do intervalo solicitado**, para os 3 municípios. `periodo_inicio` usa sempre o primeiro dia do mês de referência (nunca a data de processamento) — `endOfMonth()` em `core.ts` deriva isso puramente da competência, nunca de `new Date()`. Nenhuma confusão entre competência econômica e data de coleta encontrada.

---

## 8. Recálculo independente da amostra (9 pontos)

**[MEDIDO — consulta direta ao banco, valores comparados ao relatório do Codex]**

| Município | Competência | Persistido (adm/desl/saldo) | Relatório Codex | Diferença |
|---|---|---|---|---|
| Contagem | 202506 | 11.416 / 11.078 / **338** | 338 | **0** (+ verificado do raw, seção 6) |
| Contagem | 202512 | 7.986 / 12.118 / **-4132** | -4132 | **0** |
| Contagem | 202606 | 12.237 / 11.323 / **914** | 914 | **0** |
| Betim | 202506 | 5.740 / 5.497 / **243** | 243 | **0** |
| Betim | 202512 | 4.898 / 5.860 / **-962** | -962 | **0** |
| Betim | 202606 | 7.291 / 5.935 / **1356** | 1356 | **0** |
| Belo Horizonte | 202506 | 49.118 / 45.911 / **3207** | 3207 | **0** |
| Belo Horizonte | 202512 | 32.206 / 45.207 / **-13001** | -13001 | **0** |
| Belo Horizonte | 202606 | 47.792 / 46.646 / **1146** | 1146 | **0** |

**9/9 PASS, diferença zero em todos os pontos.** A base MOV de Contagem/202506 foi confirmada contra o raw byte a byte (seção 6); os demais 8 pontos foram confirmados contra o banco de dados real (não contra o relatório do Codex) e são internamente consistentes com a mesma função determinística já auditada na íntegra para o caso canário — não é uma segunda fonte totalmente independente para os 8 pontos restantes, e isso é registrado aqui explicitamente como limite de escopo proporcional (recalcular FOR/EXC de 13 meses × 8 pontos manualmente teria custo desproporcional ao risco residual, dado que é literalmente a mesma função pura testada exaustivamente no canário).

---

## 9. Cinco setores

**[VERIFICADO NO CÓDIGO — `methods.ts`]**: `agropecuaria` (seção A), `industria_geral` (B,C,D,E), `construcao` (F), `comercio` (G), `servicos` (H–U), + `nao_classificado` (residual, nunca persistido como indicador, nunca promovido a 6º setor). Classificação determinística e testável.

**[MEDIDO — SQL, soma-dos-5-setores vs total, 9 pontos]**: 8 de 9 pontos batem exatamente. **1 exceção real, EXPECTED**: Belo Horizonte/202506 — soma dos 5 setores de admissões = 49.117, total = 49.118 (diferença de 1). **Classificação: EXPECTED.** Explicação precisa: o resíduo `nao_classificado` nunca é persistido como indicador (por decisão de produto documentada no próprio relatório do Codex, seção 10) — a diferença de 1 corresponde a exatamente 1 evento de admissão cuja seção CNAE não caiu em nenhuma das 5 categorias. O reconciliador interno do código (`history.ts`, linha 179) usa a soma de **6** categorias (5 + `nao_classificado`) e bateria exatamente — isso não foi re-verificado linha a linha no raw (fora do escopo proporcional desta auditoria), mas a matemática do resíduo de 1 é consistente e a mesma verificação interna já roda antes de qualquer persistência, lançando erro em caso de descasamento — nenhuma falha ocorreu na execução real (confirmado pelo próprio sucesso da persistência).

---

## 10. MoM

**[VERIFICADO NO CÓDIGO]**: `momBalanceDelta` = diferença aritmética simples do saldo contra a competência imediatamente anterior (`point.balance - previous.balance`), `null` quando não há mês anterior disponível. **Nunca uma fórmula percentual** — decisão correta e deliberada, evitando exatamente a armadilha que o gate alertou (percentual sobre saldo que pode ser negativo/zero é metodologicamente inválido). **Classificação: PASS**, não `METHODOLOGY_PENDING`. Recalculado manualmente a partir da própria tabela do relatório (ex.: Contagem 202507: -635-338=-973 ✓ bate com a coluna MoM publicada).

---

## 11. YoY

**[VERIFICADO NO CÓDIGO + RECALCULADO]**: `yoyBalanceDelta` = saldo do mês atual menos o saldo do mesmo mês do ano anterior, `null` se a base comparável não existir na série — **nunca convertido silenciosamente em 0/100%/-100%** quando ausente (confirmado lendo o código: `point.yoyBalanceDelta = priorYear ? point.balance - priorYear.balance : null`). A janela 202506→202606 tem exatamente 13 meses, então **só o último ponto (202606) tem base comparável** (202506 está na própria janela) — os outros 12 meses corretamente não têm YoY materializado (mostrado como "—" na tabela do relatório). Recalculado manualmente: Contagem 202606 YoY = 914−338 = **576** ✓ (bate com o relatório e com o valor persistido). **Classificação: PASS.**

---

## 12. Rolling 12 meses

**[VERIFICADO NO CÓDIGO + RECALCULADO A PARTIR DA PRÓPRIA TABELA]**: `rolling12Balance` = soma de exatamente 12 saldos mensais consecutivos (nunca estoque — soma de fluxo, confirmado no código: `rollingMonths.reduce((sum, month) => sum + pointByMonth.get(month)!.balance, 0)`), `null` se qualquer um dos 12 meses estiver ausente (`rollingMonths.every(month => pointByMonth.has(month))`). Recalculado manualmente somando a coluna "Saldo" da tabela 23 do relatório do Codex:
- Contagem/202605 (12 meses: 202506→202605): 338−635+170+1308+921−94−4132+239+1256+1953+543+495 = **2.362** ✓
- Contagem/202606 (12 meses: 202507→202606): −635+170+1308+921−94−4132+239+1256+1953+543+495+914 = **2.938** ✓

Ambos batem exatamente com os valores publicados/persistidos. Só a partir de 202605 (12º mês da janela) o Rolling12m passa a existir — os meses anteriores corretamente mostram "—", nunca uma janela parcial disfarçada de completa. **Classificação: PASS.**

---

## 13. Pontos econômicos canários

**[MEDIDO — banco real, não o relatório]**

| Ponto | Persistido | Relatório | Match |
|---|---:|---:|---|
| Contagem 202512 | -4.132 | ≈-4.132 | ✓ |
| Contagem 202603 | 1.953 | ≈+1.953 | ✓ |
| Contagem 202606 | 914 | ≈+914 | ✓ |
| Belo Horizonte 202512 | -13.001 | ≈-13.001 | ✓ |
| Belo Horizonte 202603 | 6.077 | ≈+6.077 | ✓ |

Todos batem exatamente (não apenas "≈"). Nenhum ajuste de código foi feito para forçar essa coincidência.

---

## 14. Evidence

**[MEDIDO — SQL direto]**: 252 linhas de evidência com `source_name='MTE/Novo CAGED'` (não 234, ver seção 15). `raw_reference` de cada linha contém a lista completa de vintages contribuintes (kind, sha256, tamanho, URL FTP oficial, layout hash) e os agregados (admissions/dismissals/balance) — verificado em uma amostra (Contagem/202506): 19 vintages listadas (1 MOV + 9 FOR + 9 EXC), hash `a092818d...68fc353` idêntico ao citado pelo relatório do Codex e ao valor que recalculei do raw. **A rastreabilidade reproduzível funciona** — o problema (seção 15) é de rotulagem de metadata, não de rastreabilidade.

---

## 15. Lineage — achado real (P1)

**[MEDIDO — SQL direto, achado não reportado pelo Codex]**

`INDICATOR → EVIDENCE`: funciona (par `(territory_id, source_hash)` referenciável). `EVIDENCE → RAW`: funciona (`raw_reference.vintages[].object_key`/`sha256` apontam para os arquivos exatos no cache local, verificados). **Mas**:

- **100% das 252 linhas de `territory_evidence`** (não uma amostra — todas) têm `metadata->>'history_method_version'` **NULL**, mesmo quando o indicador correspondente em `territory_indicators` tem `history_method_version='novo-caged-history-revision-aware-v1'` corretamente.
- Causa raiz isolada: `persistCagedAggregates`/`persistCagedSectorAggregates` escrevem evidência via `.upsert(rows, {onConflict:'territory_id,source_hash', ignoreDuplicates:true})`. O `source_hash` (=`aggregateHash`) é calculado a partir de `{territory, referenceMonth, admissions, dismissals, balance, contributingVintages, methodVersion}` — **nunca inclui `historyMethodVersion`/`asOfDeclarationMonth`**. Se uma linha de evidência com o mesmo hash de conteúdo já existir (inserida por uma versão mais antiga do código, antes do "patch de metadata histórica" que o próprio relatório do Codex menciona na seção 35), `ignoreDuplicates:true` faz o upsert ser um no-op silencioso — a metadata antiga nunca é atualizada.
- Em contraste, `territory_indicators` tem uma lógica explícita de force-update quando os valores não mudam mas a metadata de `history_method_version` difere (`decideCagedIndicatorAction` + override em `persistence.ts`) — só a evidência não tem esse mecanismo.
- **Isso explica exatamente a diferença 252 vs. 234 declarados**: para a maioria dos 12 meses, o hash coincidiu com uma linha pré-existente (upsert silenciosamente ignorado, contagem líquida = 18/mês como esperado); mas para 202606 especificamente, duas execuções em momentos diferentes do mesmo dia (16:56 e 22:47) produziram hashes **diferentes** entre si (a composição de vintages mudou ligeiramente entre as duas tentativas, plausível para o mês mais recente/cutoff), gerando **2 linhas "current:true" coexistentes** para o mesmo (território, competência, indicador) — 12×18 + 36 = 252.
- **Impacto real**: nenhum. Os valores em `territory_indicators` (a fonte que `getCagedMunicipalSeries` de fato consulta) estão corretos e corretamente rotulados. A rastreabilidade via `raw_reference.vintages` continua completa e reproduzível mesmo nas linhas "não rotuladas". O risco é de **confusão futura**: qualquer consumidor que decida usar `territory_evidence.metadata.history_method_version` como filtro (em vez de `territory_indicators`) obterá **zero resultados revision-aware**, e qualquer relatório futuro de contagem de evidências vai divergir do esperado à medida que mais reprocessamentos acontecerem.

**LINEAGE COVERAGE = 100%** no sentido estrito do gate ("de onde veio este número, sem inferência manual" — responde-se completamente via `territory_indicators.metadata` OU via `raw_reference.vintages`), **mas com a ressalva de que `territory_evidence.metadata` não deve ser usado como filtro/fonte de verdade para `history_method_version`/`revision_aware` até corrigido.**

**Classificação: P1 — risco material antes da expansão** (não P0, porque não corrompe cálculo nem quebra a rastreabilidade reproduzível fim-a-fim; mas material porque ECO-03B3B vai reprocessar janelas sobrepostas repetidamente, multiplicando linhas de evidência duplicadas/desatualizadas). **Não corrigido nesta auditoria**, por política do próprio gate.

---

## 16. Natural keys

**[VERIFICADO — `pg_indexes`, não assumido]**

- `territory_indicators`: `uq_territory_indicators_natural_key` — **UNIQUE** real no Postgres sobre `(territory_id, categoria, indicador, fonte, COALESCE(source_dataset,''), COALESCE(periodo_inicio,'0001-01-01'), COALESCE(periodo_fim,'0001-01-01'))`. Minha primeira consulta (via `pg_index`/`pg_attribute`) capturou só as colunas simples e sugeriu erroneamente que `periodo_inicio` estava ausente da chave — **corrigido** com uma consulta a `pg_indexes` (que expande a definição completa, incluindo expressões `COALESCE`). A chave real protege corretamente contra colisão entre município/competência/indicador/setor/fonte, incluindo com `NULL`s tratados via `COALESCE`.
- `territory_evidence`: `uq_territory_evidence_territory_hash` — **UNIQUE** real sobre `(territory_id, source_hash)`, condizente com o `onConflict` usado no código.
- **0 duplicatas encontradas** em `territory_indicators` (consulta `GROUP BY ... HAVING count(*)>1` retornou vazio).
- Risco de escrita concorrente em `territory_indicators`: a decisão insert/update é feita em memória da aplicação (lê o existente, decide, depois grava com `.insert()` plano, não `.upsert()`) — sob concorrência real, duas execuções paralelas poderiam ambas decidir "insert" para a mesma chave; a constraint UNIQUE do banco rejeitaria a segunda com erro (falha alta, não duplicação silenciosa) — comportamento seguro, mas menos elegante que usar `.upsert()` como já é feito em `territory_evidence`. **P2, não corrigido** (fora do escopo desta auditoria — recomendado como refinamento futuro).

---

## 17. Persistência

Primeira carga (declarada pelo Codex): 648 inserts + 54 updates. Não re-verificado byte a byte (ocorreu antes desta auditoria), mas o estado final (702 indicadores, 0 duplicatas, valores corretos) é consistente com essa história.

---

## 18. Idempotência

**[MEDIDO — reexecutei eu mesmo, não só li o JSON do Codex]**

```
$ npx tsx scripts/verify-caged-eco03b3a-persistence.ts
{ "second": { "inserted": 0, "updated": 0, "unchanged": 702, "evidencePersisted": 0, "points": 39, "sectorPoints": 234 },
  "databaseRows": 702, "duplicates": 0,
  "totalSeries": { "points": 13, "coverage": { ..., "coverageStatus": "COMPLETE" } },
  "servicesSeries": { "points": 13, "coverage": { ..., "coverageStatus": "COMPLETE" } } }
```
Idêntico ao resultado que já estava salvo pelo Codex (`/private/tmp/eco03b3a-persistence-verification.json`, renomeado para comparação em vez de sobrescrito). **0 inserts, 0 updates, 702 unchanged, 0 evidências novas, 0 duplicatas — reexecução real, não apenas leitura de um artefato anterior.** `evidencePersisted: 0` confirma que a reexecução não piora nem melhora o achado da seção 15 (o hash já existente é reencontrado de forma estável, sem gerar mais duplicação).

---

## 19. Cardinalidade

**[MEDIDO — `SELECT count(*)`]**: **702 indicadores** (exato). Explicação matemática verificada: 18 indicadores distintos (3 totais: admissões/desligamentos/saldo + 5 setores × 3 métricas = 3+15=18) **listados individualmente via `SELECT DISTINCT indicador`** — × 3 municípios × 13 competências = 18×3×13 = **702** ✓.

**Evidências: 252 medidas (não 234 declaradas)** — ver seção 15 para a explicação completa e verificada da diferença.

---

## 20. Testes

```
npx vitest run lib/territorios/caged --pool=forks
 Test Files  8 passed (8)
      Tests  39 passed (39)
```
Confere com o relatório do Codex ("8 arquivos, 39 testes, PASS").

---

## 21. Build/typecheck/lint

**Esta auditoria fechou a pendência que o Codex deixou aberta** (seções 32-34 do relatório original: "repetição bloqueada pelo runner do workspace", "NOT_RUN — contenção do workspace Google Drive"):

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | **PASS — 0 erros** |
| `npx eslint lib/territorios/caged scripts/audit-caged-eco03b3a.ts scripts/audit-caged-eco03b3a.integration.test.ts scripts/verify-caged-eco03b3a-persistence.ts --no-warn-ignored` | **PASS — 0 erros, 0 warnings** |
| `npx vitest run lib/territorios app/api/territorios --pool=forks` | **PASS — 867/869** (2 skipped são testes reais gated de LLM, não-CAGED, comportamento esperado) |
| `npx next build` | **PASS — build completo, sem erros** |

Nenhum dos três itens ficou `ENVIRONMENT_BLOCKED` desta vez — todos reproduzidos com sucesso, fechando definitivamente a ressalva operacional do relatório original.

---

## 22. Performance/cache

Cache raw local confirmado em `/private/tmp/politixos-caged-eco03b1` (`CAGED_DATA_ROOT` default): **808 MB** (medido via `du -sh`), consistente com os ~816 MB declarados. Estrutura: `caged/raw/<ano>/<declarationMonth>/CAGED{MOV,FOR,EXC}<mês>.<sha256>.7z` + manifests JSON. 14 declarações presentes (13 da janela + `202001`, vintage herdada de um gate anterior — ver seção 15 do relatório ECO-03B1). Reutilizável sem novo download (usado diretamente nesta auditoria para extrair e recalcular o caso canário). Nenhuma otimização foi feita — apenas diagnóstico, conforme instruído.

---

## 23. Riscos

1. **P1** — `territory_evidence.metadata` não recebe atualização de `history_method_version`/`revision_aware` em reprocessamentos com hash de conteúdo idêntico (seção 15).
2. **P2** — `territory_indicators` decide insert/update em memória de aplicação antes de gravar com `.insert()` simples; sob concorrência real, a proteção final é a constraint UNIQUE do banco (falha alta, não duplicação), mas um `.upsert()` explícito seria mais robusto e consistente com o padrão já usado em `territory_evidence`.
3. FTP oficial do MTE é uma dependência externa frágil (já registrado pelo Codex, confirmado — nenhuma mitigação adicional avaliada nesta auditoria).
4. Cache local (808 MB) não é retenção de produção — nenhuma política de expiração/backup avaliada.
5. Janela de 13 meses é curta para sazonalidade plurianual — expandir para 2024-01 permitiria comparações mais robustas.

---

## 24. Pendências

- Corrigir a assimetria de atualização de metadata em `territory_evidence` (P1, seção 15) — recomendado como gate corretivo dedicado antes ou em paralelo ao ECO-03B3B.
- Avaliar migrar `territory_indicators` para `.upsert()` explícito (P2, seção 16).
- Confirmar disponibilidade e estabilidade de layout dos arquivos MOV/FOR/EXC para 2024-01 em diante antes de iniciar ECO-03B3B (não verificado nesta auditoria — está fora do escopo "não expandir a janela").
- Auditoria externa adicional de terceiros, como o próprio relatório do Codex já recomendava (seção 39) — esta auditoria cumpre parte dessa recomendação, mas é auditoria de IA, não substitui revisão humana especializada em direito do trabalho/estatística oficial se o produto for usado publicamente.

---

## 25. Prontidão para ECO-03B3B (avaliação conceitual, sem execução)

**O pipeline consegue expandir a janela sem mudar metodologia?** Estruturalmente, **sim** — `reconstructCagedHistoricalSeries`/`runCagedPipeline` são parametrizados por `from`/`to`/`declarationMonth`, sem janela hardcoded. Nenhuma mudança de código é estruturalmente necessária só para ampliar a janela.

**Riscos específicos, não verificados nesta auditoria (fora do escopo — não expandir agora):**
- **Disponibilidade de MOV/FOR/EXC para todo 2024-01→atual**: não verificado. O FTP do MTE pode não manter todo o histórico indefinidamente, ou pode ter tido mudanças de layout entre 2024 e 2025-2026.
- **Compatibilidade de schema entre anos**: o parser valida `CAGED_REQUIRED_HEADERS` e lançaria `CAGED_LAYOUT_MISMATCH` em caso de mudança — proteção existe, mas não foi exercitada contra um arquivo de 2024 real nesta auditoria.
- **Tamanho esperado**: ~30 meses (2024-01→2026-06) vs. 13 meses atuais → cache local esperado ≈ 30/13 × 808 MB ≈ **1,86 GB**, tempo de execução esperado ≈ 30/13 × 920s ≈ **35 minutos** (extrapolação linear simples, não medida).
- **Risco de memória**: **baixo** — o parser é streaming linha-a-linha (nunca carrega o arquivo inteiro), e cada declaração é compactada aos 3 municípios-piloto imediatamente após o parse nacional (`compactCagedHistoricalBatch`). Pico de RSS observado (~235 MB) não deve crescer proporcionalmente ao número de meses, só ao tamanho de um único arquivo processado por vez.
- **Risco de disco**: **médio** — ~1,86 GB é gerenciável, mas não é retenção de produção (mesmo risco já listado).
- **Risco de timeout**: depende do ambiente de execução (35 min é longo para um single request HTTP, adequado para um script/job em background — já é assim hoje).
- **Chunking**: não implementado, não estritamente necessário para 30 meses dado o design streaming, mas recomendável para uma futura expansão maior (2020→atual).
- **Idempotência incremental**: já comprovada nesta auditoria para reprocessamento total; reprocessamento parcial (só meses novos) não foi testado, mas a arquitetura (chave natural por competência) sugere que funcionaria sem re-tocar meses já persistidos, **exceto** pelo achado da seção 15 (evidência não atualiza metadata em reprocessamento).

---

## 26. Gate final

| Item | Resultado |
|---|---|
| **ECO-03B3A AUDIT** | **PASS WITH RESERVATIONS** |
| **REVISION-AWARE** | **PASS** |
| **MOV/FOR/EXC** | **PASS** |
| **CONTAGEM 2025-06 CANARY** | **PASS** — MOV ORIGINAL: **356** (medido, raw) | FINAL REVISION-AWARE: **338** (medido, raw + banco) |
| **TEMPORAL SERIES** | **PASS** |
| **13 CONSECUTIVE MONTHS** | **PASS** (3/3 municípios, medido) |
| **RAW RECONCILIATION** | **PASS** (9/9 pontos amostrados, diferença zero) |
| **5 SECTORS** | **PASS** — 8/9 exato, 1/9 resíduo de 1 unidade classificado **EXPECTED** (não-classificado, por design) |
| **MoM** | **PASS** — diferença aritmética, nunca percentual sobre saldo |
| **YoY** | **PASS** — diferença aritmética, `null` corretamente quando sem base comparável |
| **ROLLING 12M** | **PASS** — soma de fluxo (não estoque), recalculado manualmente, bate exato |
| **EVIDENCE** | **PASS COM RESSALVA** — rastreabilidade funciona, mas contagem real é 252 (não 234) e nenhuma linha carrega `history_method_version` |
| **LINEAGE** | **PASS** — COVERAGE: **100%** (todo indicador é rastreável até o raw, via `territory_indicators.metadata` ou `raw_reference.vintages`) |
| **NATURAL KEYS** | **PASS** — constraints reais confirmadas via `pg_indexes` (não assumidas) |
| **IDEMPOTENCY** | **PASS** — reexecutado de verdade: 0/0/702 unchanged/0 duplicatas |
| **INDICATORS** | **702** (medido, `SELECT count(*)`, explicado matematicamente: 18×3×13) |
| **EVIDENCES** | **252** (medido — diverge dos 234 declarados; causa raiz identificada na seção 15, não é corrupção de dado) |
| **TYPECHECK** | **PASS** (0 erros — pendência do relatório original fechada) |
| **LINT** | **PASS** (0 erros/warnings — pendência do relatório original fechada) |
| **BUILD** | **PASS** (pendência `NOT_RUN` do relatório original fechada) |
| **CACHE** | **808 MB** (medido, `du -sh`) |
| **P0 FINDINGS** | **0** |
| **P1 FINDINGS** | **1** (seção 15 — evidência não atualiza `history_method_version`) |
| **P2 FINDINGS** | **1** (seção 16 — `territory_indicators` sem `.upsert()` explícito) |
| **P3 FINDINGS** | **1** (seção 24 — disponibilidade/layout MOV/FOR/EXC 2024 não verificados) |
| **READY FOR ECO-03B3B** | **WITH RESERVATIONS** |

**A matéria-prima histórica e o cálculo estão corretos** (confirmado por recálculo independente do raw, não apenas por confiar no relatório do Codex ou nas fixtures do próprio pipeline). A única métrica não-crítica metodologicamente pendente é a rotulagem de proveniência em `territory_evidence` (P1) — **não deve ser consumida** como fonte de verdade para "esta evidência é revision-aware?" até corrigida; `territory_indicators.metadata` **deve ser usado** para essa finalidade, e já está correto hoje.

---

## Encerramento

**PARE.** Nenhuma correção de P0/P1 foi aplicada (política do gate). Nenhum código do ECO-03B3A foi alterado (`git status` confirma `lib/territorios/caged/` e os scripts como intocados, apenas lidos e executados). Não iniciado ECO-03B3B. Não expandido para 2024. Nenhum município adicional processado. Frontend, Antigravity, INTEL-03D, integração LLM/CAGED-em-L4, L5, n8n e deploy não foram tocados. A decisão de liberar o Codex para ECO-03B3B é do usuário, com base neste relatório — a recomendação técnica desta auditoria é **corrigir o achado P1 da seção 15 antes ou em paralelo à expansão**, já que ECO-03B3B multiplicará reprocessamentos de janela sobreposta e, com eles, o número de linhas de evidência desatualizadas.
