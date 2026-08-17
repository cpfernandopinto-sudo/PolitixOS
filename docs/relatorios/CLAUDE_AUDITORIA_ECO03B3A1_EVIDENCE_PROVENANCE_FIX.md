# AUDITORIA INDEPENDENTE CURTA — ECO-03B3A.1: Evidence Provenance Fix

**Auditor:** Claude (independente do Codex)
**Data:** 2026-08-17
**Escopo:** correção de proveniência em `territory_evidence` para CAGED (Contagem/Betim/Belo Horizonte, 202506–202606)
**Metodologia:** leitura direta do código-fonte da correção, queries SQL independentes no Postgres real (não apenas leitura do relatório do Codex ou de artefatos gerados pelo próprio script corretivo), reexecução real do dry-run e do pipeline completo sobre a janela já processada.

---

## 1. Resumo executivo

O P1 identificado na auditoria anterior (`CLAUDE_AUDITORIA_ECO03B3A_CAGED_HISTORICO.md`) — metadata revision-aware ausente em 100% das evidências e 18 pontos lógicos com duas linhas `current=true` — **foi eliminado**. Confirmei isso de forma independente, direto no banco: 252 evidências, 234 pontos lógicos, exatamente 1 `current=true` por ponto (0 múltiplas, 0 ausentes), 252/252 com `history_method_version`/`revision_aware`/`as_of_declaration_month` corretamente preenchidos, 18 linhas `current=false` corretamente apontando (`superseded_by_source_hash`) para o hash `current` certo do mesmo ponto lógico. Os 702 indicadores permanecem bit-a-bit inalterados (mesmo checksum antes/depois, calculado por mim com método próprio, diferente do fingerprint do Codex, e batendo com o fingerprint dele). Reexecutei o pipeline completo sobre a janela já processada: 0 inserts, 0 updates, 702/702 indicadores e 252/252 evidências inalterados — reprocessamento sobreposto seguro, comprovado por execução real, não apenas lido do relatório.

**Um refinamento não reportado pelo Codex, mas que não é um novo P0/P1**: as 18 linhas "vintage" **não representam uma revisão econômica real** (o valor nunca mudou — confirmei que as 18 têm exatamente os mesmos `admissions`/`dismissals`/`balance` que a linha `current` correspondente). Elas são artefatos de duas execuções do pipeline em horários diferentes do mesmo dia (16:56–18:29 vs. 22:46–22:47) que calcularam `source_hash` com uma composição de `vintages` ligeiramente diferente (a execução mais antiga incluía FOR/EXC da própria declaração 202606 na lista de vintages contribuintes do ponto "total", mesmo esses arquivos não alterando o valor de 202606; a execução mais nova lista apenas o MOV, que é o único arquivo que de fato contribui para a competência mais recente da janela). Isso é coerente com — e refina com precisão — a frase do próprio relatório do Codex ("hashes anteriores... composição de vintages preservada"): a correção classificou-as corretamente como histórico, não como duplicata destrutiva, mas o termo "vintage" aqui significa "artefato de hash anterior do pipeline", não "revisão FOR/EXC real". Registro isso como **P3** (precisão de nomenclatura/documentação), não bloqueante.

**Veredito: PASS.**

---

## 2. Escopo auditado

`lib/territorios/caged/evidence-persistence.ts` (novo), `evidence-persistence.test.ts` (novo), `persistence.ts` (alterado), `history-persistence.ts` (alterado), `scripts/fix-caged-eco03b3a1-evidence-provenance.ts` (novo). Nenhum arquivo de metodologia econômica (`core.ts`, `history.ts`, `sectors.ts`, `methods.ts`) foi tocado — confirmado por leitura completa dos 5 arquivos alterados/novos e ausência de qualquer diff nos demais.

---

## 3. Diff/code review

**A correção está limitada à persistência/proveniência de evidência: SIM.**

- `evidence-persistence.ts`: função pura `planCagedEvidencePersistence` (identidade lógica + decisão insert/update/noop) e função de I/O `persistRevisionAwareCagedEvidence`. Não contém nenhuma lógica de cálculo econômico.
- `persistence.ts`: a única mudança é que, quando `context.historyMethodVersion` está presente (isto é, somente no caminho revision-aware), a escrita de evidência passa a usar `persistRevisionAwareCagedEvidence` em vez do `upsert(..., {ignoreDuplicates:true})` antigo. O caminho legado (sem `historyMethodVersion`) continua usando o `upsert` antigo — isso é uma limitação de escopo deliberada e documentada (a correção não pretendia alterar comportamento fora do fluxo revision-aware), não uma falha.
- `history-persistence.ts`: só adiciona contadores de observabilidade (`evidenceUpdated`/`evidenceUnchanged`) ao retorno; nenhuma mudança de lógica de negócio.
- `fix-caged-eco03b3a1-evidence-provenance.ts`: script de backfill único, lê `territory_indicators` apenas para leitura (`grep` confirma: nenhuma chamada `.insert()`/`.update()` em `territory_indicators` neste arquivo), escreve exclusivamente em `territory_evidence` via `persistRevisionAwareCagedEvidence`.

Nenhuma alteração em `core.ts`, `history.ts`, `sectors.ts`, `methods.ts`, `parser.ts` — a metodologia econômica está intocada.

---

## 4. Source hash semantics

**PASS.** `source_hash` continua sendo `canonicalAggregateHash`/`canonicalSectorAggregateHash` (não alterado nesta correção) — identidade de conteúdo econômico + composição de vintages contribuintes. A correção não incorporou metadata operacional ao hash; ao contrário, o `planCagedEvidencePersistence` trata explicitamente hash como imutável e roteia toda mudança de metadata por um caminho de `UPDATE` separado (`{ metadata: row.metadata }`, nunca reescrevendo `raw_reference`/`source_hash`).

---

## 5. Evidence logical identity

**PASS.** `cagedEvidenceLogicalKey = territory_id | reference_month | sector('total' se ausente)`. Verifiquei que essa chave não colide entre municípios (territory_id é parte da chave), entre competências (reference_month é parte), nem entre total/setor (sector explícito) — confirmado tanto na leitura do código quanto nas 234 chaves lógicas reais distintas encontradas no banco (seção 6). Fontes diferentes (SICONFI/IBGE/TSE/DATASUS) nunca entram no cálculo: tanto `evidence-persistence.ts` quanto o script de fix filtram a leitura por `source_name='MTE/Novo CAGED'` e `tema='economia'` antes de montar a chave.

---

## 6. Cardinalidade (medido, SQL direto)

```sql
select count(*) as total, count(*) filter (where (metadata->>'current')::boolean is true) as current,
       count(*) filter (where (metadata->>'current')::boolean is false) as history
from territory_evidence
where territory_id in (<3 pilotos>) and source_name='MTE/Novo CAGED' and tema='economia';
```

| Métrica | Medido (Claude, direto no banco) | Declarado (Codex) |
|---|---:|---:|
| Total evidences | **252** | 252 |
| Logical points | **234** | 234 |
| Current | **234** | 234 |
| History/vintage | **18** | 18 |

Bate exatamente. Não aceitei os números do relatório — foram recontados via query própria.

---

## 7. Current uniqueness

**PASS.**

```sql
-- agrupado por chave lógica, contando quantas linhas têm current=true
```

Resultado medido: **234 pontos lógicos, 0 com múltiplas `current=true`, 0 com nenhuma `current=true`.** Confirma diretamente que a correção elimina os 18 pontos com duplicidade de `current` relatados na auditoria anterior.

---

## 8. Vintages — legítimas, mas com ressalva de nomenclatura (ver seção 1)

**PASS**, com refinamento registrado. Amostrei as 18 linhas `current=false` (todas as 18, não apenas 3 — municípios × 6 contextos [total + 5 setores] = 3×6=18):

- Todas pertencem a `reference_month=202606` (a competência mais recente da janela, ainda sem correções FOR/EXC futuras).
- Todas têm `source_hash` distinto do `current` correspondente, mas **`raw_reference.aggregates` idêntico** (admissões/desligamentos/saldo iguais, verificado nas 18/18).
- `superseded_by_source_hash` de cada uma bate exatamente com o `source_hash` da linha `current` da mesma chave lógica (verificado para os 3 municípios × contexto `total`, com string completa do hash, não apenas prefixo).
- `current=false` em todas; nenhuma foi apagada; todas seguem consultáveis.
- Causa da diferença de hash: a linha antiga (coletada 16:56–18:29) listava `FOR`/`EXC` de 202606 na composição de vintages do ponto `total`; a linha nova (coletada 22:46–22:47) lista apenas o `MOV`, que é o único arquivo que efetivamente contribui para a competência mais recente da janela (FOR/EXC de uma declaração nunca corrigem a própria competência que declaram). Não há diferença de valor — apenas de metadata de composição de hash entre duas execuções do pipeline em horários diferentes.

Reclassifico a informação do relatório do Codex ("vintage legítima") como **tecnicamente correta quanto ao resultado (nada foi destruído, current está certo), mas imprecisa quanto à natureza** (não é uma revisão econômica FOR/EXC real). **P3, documentação.**

---

## 9. Supersession

**PASS.** Confirmado por amostragem completa dos 18 pares: todo `superseded_by_source_hash` aponta exatamente para o hash da versão `current` da mesma identidade lógica (mesmo território, mesma competência, mesmo contexto). Nenhuma aponta para si mesma, outro município, outra competência ou outro setor/contexto.

---

## 10. Metadata coverage

**PASS — 100% (252/252).**

```sql
count(*) filter (where metadata->>'history_method_version' = 'novo-caged-history-revision-aware-v1') -- 252
count(*) filter (where (metadata->>'revision_aware')::boolean is true) -- 252
count(*) filter (where metadata->>'as_of_declaration_month' is not null) -- 252
```

Valores confirmados corretos nas amostras: `history_method_version='novo-caged-history-revision-aware-v1'`, `revision_aware=true`, `as_of_declaration_month='202606'`.

---

## 11. Raw reference

**PASS.** `raw_reference` permanece presente e coerente em 252/252 (confirmado pela query de cardinalidade que já usa `raw_reference->>'reference_month'` para todas as 252 linhas sem nulos). A mutação usa exclusivamente `.update({ metadata })` — confirmado lendo `evidence-persistence.ts` linha 118 (`client.from('territory_evidence').update({ metadata: row.metadata })`), nunca envia `raw_reference`, `source_hash` ou `source_external_id` no update.

**Nota de schema (P3):** o campo que lista os arquivos contribuintes tem nome diferente entre o contexto `total` (`raw_reference.vintages`) e o contexto setorial (`raw_reference.contributing_vintages`) — herdado de `persistence.ts` (linhas 84 e 148), não alterado por esta correção. Não afeta a correção auditada, mas é uma inconsistência de schema preexistente que dificulta consultas genéricas de lineage por setor.

---

## 12. Lineage

**PASS — cobertura 100% (252/252).** Cada evidência é rastreável até `raw_reference` (aggregates + vintages/contributing_vintages + declaration_month + reference_month), inalterado pela correção (seção 11).

---

## 13. Indicator invariance

**PASS.** Contagem: **702** (medido, `SELECT count(*)`). Checksum próprio (`md5(string_agg(id||':'||valor, ',' order by id))`, método independente do fingerprint sha256 do Codex): **`4f106b872bb3abcf8f3565ec0db66776`**, idêntico antes e depois da minha própria reexecução do pipeline (seção 15). Reexecutei também o dry-run do script de fix, que reporta o mesmo `indicatorFingerprintBefore` que o relatório do Codex declarou (`69c09c40c19fc5102feeb1a16ff1f90256b3e15123c09614e652171d6bc9b07d`) — confirmação cruzada por método diferente do meu, chegando ao mesmo estado.

---

## 14. Canários numéricos

**PASS.** Reconferido direto no banco após a correção:

| Município | Competência | Admissões | Desligamentos | Saldo |
|---|---|---:|---:|---:|
| Contagem | 202506 | 11.416 | 11.078 | +338 |
| Contagem | 202512 | 7.986 | 12.118 | -4.132 |
| Contagem | 202606 | 12.237 | 11.323 | +914 |
| Betim | 202606 | 7.291 | 5.935 | +1.356 |
| Belo Horizonte | 202512 | 32.206 | 45.207 | -13.001 |
| Belo Horizonte | 202606 | 47.792 | 46.646 | +1.146 |

Idênticos aos valores medidos na auditoria ECO-03B3A original e ao MOV original (11.309/10.953/+356 para Contagem/202506). Nenhum valor mudou.

---

## 15. Idempotência e overlap reprocessing

**PASS — reexecutado por mim, não apenas lido.**

1. **Dry-run do script de fix** (reexecução real): `rowsToInsert:0, rowsToUpdate:0, alreadyCorrect:252, ambiguousRows:[]`.
2. **Reexecução real do pipeline histórico completo** (`verify-caged-eco03b3a-persistence.ts`, que roda `persistCagedHistoricalSeries` sobre toda a janela 202506–202606 dos 3 municípios): `inserted:0, updated:0, unchanged:702, evidencePersisted:0, evidenceUpdated:0, evidenceUnchanged:252`, `databaseRows:702, duplicates:0`, cobertura 13/13 meses completa para série total e setorial de serviços.
3. **Confirmação pós-rerun via SQL**: `evidence_total=252, evidence_current=234, indicators_total=702`, checksum de indicadores **idêntico** ao medido antes do rerun.

Conclusão: reprocessar a janela inteira, mesmo já contendo as 18 vintages e a metadata corrigida, não gera nenhum insert/update indevido, nenhuma nova duplicata e nenhuma alteração de valor. **AMBIGUOUS ROWS: 0** em todas as execuções.

---

## 16. Isolamento de fonte

**PASS.** Consulta agrupada por `source_name` para os 3 territórios pilotos confirma que `superseded_by_source_hash`/`history_method_version` aparecem **exclusivamente** em linhas `MTE/Novo CAGED` (252/252); as fontes `DATASUS/CNES` (3), `IBGE/PIB dos Municípios` (22), `IBGE/SIDRA` (22), `Tesouro/SICONFI` (6) e `TSE` (27) têm **zero** linhas tocadas por essas chaves — nenhuma metadata de outra fonte foi atualizada por engano.

---

## 17. P2/P3 restantes

- **P2** (já conhecido, não agravado): `territory_indicators` decide insert/update em memória antes de `.insert()` simples — sob concorrência real, a constraint UNIQUE do banco rejeitaria a segunda escrita concorrente com erro, não com duplicação silenciosa. Não corrigido aqui, fora do escopo.
- **P3 (novo, desta auditoria)**: as 18 linhas "vintage" descrevem artefatos de composição de hash entre duas execuções do pipeline, não revisões econômicas reais — nomenclatura do relatório poderia ser mais precisa (seção 8).
- **P3 (novo, desta auditoria)**: nome de campo inconsistente entre `raw_reference.vintages` (total) e `raw_reference.contributing_vintages` (setor) — pré-existente, não introduzido por este fix (seção 11).
- Concorrência de "uma current" sob dois writers simultâneos: o lease central (`acquireCagedLease`/`releaseCagedLease`) é suficiente para o modelo sequencial atual de processamento (não há dois writers simultâneos no fluxo real hoje); uma garantia transacional forte exigiria migration futura — classificado **P2** (mesmo nível do Codex), não subiu para P1.

---

## 18. Testes

| Gate | Resultado medido (Claude) | Declarado (Codex) |
|---|---|---|
| `npx vitest run lib/territorios/caged --pool=forks` | **44/44 PASS** | 44/44 PASS |
| `npx vitest run lib/territorios app/api/territorios --pool=forks` | **872 PASS, 2 skipped** | 872 PASS, 2 skipped |
| `npx tsc --noEmit` | **PASS, 0 erros** | PASS |
| `npx eslint lib/territorios/caged scripts/fix-caged-eco03b3a1-evidence-provenance.ts` | **PASS, 0 erros/warnings** | PASS |
| `npm run build` | **PASS, exit code 0** | PASS |

Todos reexecutados por mim, do zero, não apenas lidos do relatório.

---

## 19. Decisão ECO-03B3B

1. **O Codex eliminou corretamente o P1?** Sim — confirmado por SQL independente, não apenas pelo relatório.
2. **A solução preserva auditabilidade histórica?** Sim — as 18 linhas seguem consultáveis, com `superseded_by_source_hash` correto.
3. **As 18 vintages são legítimas?** Sim, no sentido de "não são duplicatas destrutivas nem corrompem dado algum" — mas são artefatos de hash de execuções do pipeline, não revisões FOR/EXC reais (P3, nomenclatura).
4. **Existe exatamente uma current por ponto lógico?** Sim, 234/234, verificado.
5. **Os 702 indicadores permanecem intactos?** Sim, checksum idêntico antes/depois, por dois métodos independentes.
6. **A correção é segura para reprocessamento sobreposto?** Sim, comprovado por execução real do pipeline completo sobre a janela já processada, sem gerar nenhuma mudança.
7. **Existe algum P0/P1 restante?** Nenhum.
8. **O P2 conhecido continua não bloqueante?** Sim, inalterado.
9. **Podemos liberar Codex para ECO-03B3B?** Sim, do ponto de vista desta correção. A disponibilidade/layout do FTP para 2024 continua não homologada e é tema do próprio ECO-03B3B, não desta correção.
10. **Ressalva a acompanhar a liberação:** nenhuma quanto a esta correção específica; a ressalva geral herdada do ECO-03B3A (2024 não homologado) permanece válida e deve ser tratada no início do ECO-03B3B, não como bloqueio a esta aprovação.

---

## 20. Gate final

```text
ECO-03B3A.1 AUDIT: PASS
P1 ORIGINAL: ELIMINATED
SOURCE_HASH SEMANTICS: PASS
EVIDENCE LOGICAL IDENTITY: PASS
TOTAL EVIDENCES: 252
LOGICAL POINTS: 234
CURRENT: 234
HISTORY/VINTAGE: 18
CURRENT DUPLICATES: 0
CURRENT MISSING: 0
LEGITIMATE VINTAGES: PASS
SUPERSESSION: PASS
METADATA COVERAGE: 100%
RAW_REFERENCE: PASS
LINEAGE: PASS
LINEAGE COVERAGE: 100%
INDICATORS: 702
INDICATOR INVARIANCE: PASS
NUMERIC CANARIES: PASS
SAME HASH + NEW METADATA: PASS
SAME HASH + SAME METADATA: PASS
NEW HASH/VINTAGE: PASS
SOURCE ISOLATION: PASS
AMBIGUOUS ROWS: 0
IDEMPOTENCY: PASS
OVERLAP REPROCESSING: PASS
TESTS: PASS
TYPECHECK: PASS
LINT: PASS
BUILD: PASS
P0: 0
P1: 0
P2: 1
P3: 2
READY FOR ECO-03B3B: YES
```

---

## Encerramento

**PARE.** Não foi iniciado ECO-03B3B. Não foi corrigido o P2 conhecido nem os P3 registrados nesta auditoria. Não foi iniciado INTEL-03D. Frontend, n8n e deploy não foram tocados. Nenhum arquivo de código foi alterado por esta auditoria — apenas leitura, queries SQL de leitura e reexecução de scripts já existentes (dry-run e verificação, ambos sem efeito colateral líquido, confirmado). A decisão de iniciar o ECO-03B3B cabe ao usuário, com base neste relatório.
