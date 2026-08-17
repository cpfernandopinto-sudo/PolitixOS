# POLITIXOS — ECO-03B3A.1 — Correção de proveniência em `territory_evidence`

**Data:** 2026-08-16/17  
**Escopo:** Novo CAGED, Contagem/Betim/Belo Horizonte, competências 202506–202606, cutoff 202606  
**Decisão:** **PASS — P1 eliminado; pronto para auditoria independente do Claude**

## 1. Resumo executivo

A inconsistência de proveniência identificada pela auditoria independente foi reproduzida antes da correção e eliminada sem alterar metodologia, valores econômicos, indicadores, arquivos raw ou frontend. O banco continha 252 evidências CAGED para 234 pontos lógicos: 234 versões atuais esperadas e 18 vintages legítimas adicionais de 202606. Todas as 252 tinham lineage, mas nenhuma tinha metadata histórica revision-aware; 18 pontos lógicos possuíam duas linhas marcadas como `current=true`.

A correção passou a tratar `source_hash` como identidade imutável da versão de conteúdo e definiu a identidade lógica da evidência como `territory_id + reference_month + context`, sendo `context=total` ou o setor oficial. Em reprocessamento, a versão cujo hash coincide com o indicador canônico torna-se a única `current`; hashes anteriores são preservados como vintages com `current=false`. Atualizações são restritas à coluna `metadata`, preservando `raw_reference` byte-for-byte no fluxo de correção.

Resultado final: 252 evidências explicáveis, 234 current, 18 history/vintage, 100% de cobertura de metadata histórica, 100% de lineage, zero pontos com múltiplas current, 702 indicadores invariantes e reprocessamento sobreposto idempotente.

## 2. Baseline da auditoria Claude e reprodução do P1

O relatório `CLAUDE_AUDITORIA_ECO03B3A_CAGED_HISTORICO.md` declarou `PASS WITH RESERVATIONS` e apontou:

- 252 evidências, divergindo das 234 originalmente relatadas;
- 0/252 com `history_method_version`;
- 0/252 com `revision_aware=true`;
- 0/252 com `as_of_declaration_month`;
- 252/252 com lineage raw;
- 18 pontos lógicos de 202606 com duas versões `current=true`;
- 702/702 indicadores revision-aware corretos.

A reprodução Codex, antes de qualquer edição/mutação, confirmou exatamente esses números em `/private/tmp/eco03b3a1-before.json`.

## 3. SQL de diagnóstico

As consultas equivalentes usadas para o diagnóstico são:

```sql
-- Escopo dos três pilotos
with pilots as (
  select id from territories
  where codigo_ibge in ('3118601','3106705','3106200')
)
select count(*)
from territory_evidence
where territory_id in (select id from pilots)
  and source_name = 'MTE/Novo CAGED'
  and tema = 'economia';

-- Cobertura histórica
with scoped as (
  select e.* from territory_evidence e
  join territories t on t.id = e.territory_id
  where t.codigo_ibge in ('3118601','3106705','3106200')
    and e.source_name = 'MTE/Novo CAGED'
    and e.tema = 'economia'
)
select
  count(*) as total,
  count(*) filter (where metadata->>'history_method_version' = 'novo-caged-history-revision-aware-v1') as history_method_ok,
  count(*) filter (where (metadata->>'revision_aware')::boolean is true) as revision_aware_ok,
  count(*) filter (where metadata->>'as_of_declaration_month' = '202606') as as_of_ok
from scoped;

-- Mais de uma current por ponto lógico
with scoped as (
  select
    e.territory_id,
    e.raw_reference->>'reference_month' as reference_month,
    coalesce(e.raw_reference->>'sector','total') as context,
    count(*) filter (where (e.metadata->>'current')::boolean is true) as current_count
  from territory_evidence e
  join territories t on t.id = e.territory_id
  where t.codigo_ibge in ('3118601','3106705','3106200')
    and e.source_name = 'MTE/Novo CAGED'
    and e.tema = 'economia'
  group by 1,2,3
)
select * from scoped where current_count > 1;
```

## 4. Causa raiz e semântica

### Causa raiz confirmada

`persistence.ts` executava:

```ts
upsert(rows, {
  onConflict: 'territory_id,source_hash',
  ignoreDuplicates: true,
})
```

Quando o conteúdo econômico mantinha o mesmo hash, a linha antiga era ignorada e a nova metadata revision-aware nunca era aplicada. Quando a composição das vintages mudava e gerava novo hash, outra evidência era inserida, mas a anterior continuava `current=true`.

### Semântica de `source_hash`

`source_hash` identifica uma versão de conteúdo econômico e de sua composição de vintages. Ele não deve incorporar metadata operacional apenas para forçar escrita. Hash diferente representa vintage legítima; mesmo hash com metadata nova representa a mesma versão de conteúdo com proveniência corrigida.

### Identidade lógica

`territory_id | reference_month | context`, onde `context` é `total` ou o valor de `raw_reference.sector`.

Regras:

1. mesmo hash + mesma metadata: noop;
2. mesmo hash + metadata diferente: update apenas de metadata;
3. hash diferente para a mesma identidade lógica: preservar ambas as versões, marcar a versão canônica como current e a anterior como history/vintage;
4. exatamente uma current por identidade lógica;
5. fontes não CAGED permanecem fora da consulta e da mutação.

## 5. Alternativas avaliadas

- Incluir metadata no hash: rejeitado por misturar identidade econômica com estado operacional.
- Apagar evidências antigas: rejeitado por destruir auditabilidade e vintages legítimas.
- Alterar a constraint para uma chave lógica única: rejeitado porque impediria histórico de versões.
- Atualizar todas as colunas por upsert: rejeitado porque poderia reescrever lineage/raw sem necessidade.
- **Escolhida:** planner revision-aware, insert somente para novo hash, update somente de metadata para linha existente e supersession explícita das vintages anteriores.

Não foi necessária migration.

## 6. Arquivos alterados

- `lib/territorios/caged/evidence-persistence.ts`: identidade lógica, planejamento puro, dry-run e persistência controlada.
- `lib/territorios/caged/evidence-persistence.test.ts`: regressões de metadata, noop, vintage, current e isolamento lógico.
- `lib/territorios/caged/persistence.ts`: uso do reconciliador somente no contexto histórico revision-aware.
- `lib/territorios/caged/history-persistence.ts`: observabilidade de evidências inseridas/atualizadas/inalteradas.
- `scripts/fix-caged-eco03b3a1-evidence-provenance.ts`: auditoria, dry-run, backup e backfill restrito.
- `docs/relatorios/artefatos/ECO03B3A1_EVIDENCE_METADATA_BACKUP.json`: metadata anterior por ID/hash para rollback lógico.

## 7. Dry-run, segurança e rollback

Dry-run anterior à mutação:

| Métrica | Resultado |
|---|---:|
| rowsFound | 252 |
| logicalPoints | 234 |
| rowsToInsert | 0 |
| rowsToUpdate | 252 |
| alreadyCorrect | 0 |
| logicalDuplicates | 18 |
| legitimateVintages | 18 |
| ambiguousRows | **0** |
| indicatorsFound | 702 |

O gate `ambiguousRows > 0` encerraria a execução antes da mutação. Não foi acionado.

Antes do apply foi salvo backup lógico contendo `id`, `territory_id`, `source_hash` e metadata anterior das 252 linhas. Rollback lógico: atualizar `territory_evidence.metadata` pelo `id` usando esse artefato. Nenhum secret foi registrado.

## 8. Backfill e resultado

Escopo rígido: apenas `source_name='MTE/Novo CAGED'`, `tema='economia'`, os três códigos IBGE pilotos e 202506–202606.

Resultado do apply:

- inserted: 0;
- updated: 252;
- unchanged: 0;
- ambiguous: 0;
- indicators antes/depois: 702/702;
- fingerprint dos indicadores antes/depois: `69c09c40c19fc5102feeb1a16ff1f90256b3e15123c09614e652171d6bc9b07d`;
- indicator values changed: **NO**.

## 9. Verificação final

| Métrica | Antes | Depois |
|---|---:|---:|
| Evidências | 252 | 252 |
| Pontos lógicos | 234 | 234 |
| Current | 252 | 234 |
| History/vintage | 0 | 18 |
| `history_method_version` coverage | 0% | 100% (252/252) |
| `revision_aware` coverage | 0% | 100% (252/252) |
| `as_of_declaration_month` coverage | 0% | 100% (252/252) |
| Lineage coverage | 100% | 100% (252/252) |
| Pontos com múltiplas current | 18 | 0 |
| Indicadores | 702 | 702 |

As 18 linhas extras não são duplicatas destrutivas: são hashes anteriores de 202606, cada qual com composição de vintages preservada. Permanecem consultáveis como história, agora marcadas `current=false` e `superseded_by_source_hash=<hash atual>`.

### Integridade de `raw_reference`

**PASS.** A mutação executada pelo reconciliador usa exclusivamente `.update({ metadata })`; `raw_reference`, source hash, external ID, timestamps de coleta e demais campos não são enviados na atualização. A cobertura de lineage permaneceu 252/252 após o backfill.

### Isolamento de fonte

**PASS.** Tanto leitura quanto update são filtrados por territórios-piloto, `source_name='MTE/Novo CAGED'` e `tema='economia'`. O planner recebe somente os IDs desse conjunto. Teste unitário confirma isolamento entre contextos total/setor; fontes externas ao CAGED não entram no plano.

## 10. Canários numéricos

| Município | Competência | Admissões | Desligamentos | Saldo | Gate |
|---|---|---:|---:|---:|---|
| Contagem | 202506 | 11.416 | 11.078 | +338 | PASS |
| Contagem | 202512 | 7.986 | 12.118 | -4.132 | PASS |
| Contagem | 202606 | 12.237 | 11.323 | +914 | PASS |
| Betim | 202606 | 7.291 | 5.935 | +1.356 | PASS |
| Belo Horizonte | 202512 | 32.206 | 45.207 | -13.001 | PASS |
| Belo Horizonte | 202606 | 47.792 | 46.646 | +1.146 | PASS |

O MOV original do canário Contagem/202506 permanece 11.309 admissões, 10.953 desligamentos e saldo +356; a reconstrução revision-aware permanece +338. Nenhum valor mudou.

## 11. Idempotência e janela sobreposta

Após o backfill:

- dry-run imediato: 0 inserts, 0 updates, 252 already correct;
- reexecução real da janela já processada: 0 indicator inserts, 0 indicator updates, 702 unchanged, 0 evidence inserts;
- auditoria posterior à reexecução: 252 evidências, 234 current, 18 history, 0 current duplicates;
- dry-run final: 0 inserts, 0 updates, 252 unchanged.

Conclusão: o reprocessamento sobreposto não multiplica evidências defeituosas. A futura versão de conteúdo com novo hash será inserida como vintage nova e supersederá semanticamente a current anterior, sem apagá-la.

## 12. Testes e gates técnicos

| Gate | Resultado |
|---|---|
| Teste específico evidence | 5/5 PASS |
| `npx vitest run lib/territorios/caged --pool=forks` | 44/44 PASS |
| `npx vitest run lib/territorios app/api/territorios --pool=forks` | 872 PASS, 2 LLM skipped por design |
| Typecheck `npx tsc --noEmit` | PASS, 0 erros |
| Lint do escopo | PASS, 0 erros/warnings |
| `npm run build` | PASS, Next.js 16.2.6 |

Performance medida: dry-run remoto ~12,6 s; apply de 252 updates ~18,6 s; verificação sobreposta completa ~55 s. O volume é pequeno e paginado; nenhuma expansão, download ou alteração de cache foi executada.

## 13. Riscos e dívidas

- **P0:** 0.
- **P1:** 0 após esta correção.
- **P2:** 1 mantido e fora do escopo — `territory_indicators` ainda decide insert/update antes de usar `.insert()`; concorrência pode gerar falha por constraint, não duplicação. Não interfere neste gate.
- FTP/layout 2024 continua não homologado; é uma pendência do próximo bloco, não desta correção.
- Uma garantia transacional forte de “uma current” sob dois writers simultâneos exigiria migration/constraint parcial baseada em chave lógica materializada. O lease central existente e a reconciliação atual tornam o reprocessamento sequencial seguro; a evolução transacional pode ser tratada separadamente.

## 14. Gate final

```text
P1 REPRODUCED: PASS
ROOT CAUSE: CONFIRMED
EVIDENCE IDENTITY: DEFINED
SOURCE_HASH SEMANTICS: DEFINED
FIX: PASS
BACKFILL: PASS
AMBIGUOUS ROWS: 0
METADATA COVERAGE BEFORE: 0%
METADATA COVERAGE AFTER: 100%
CURRENT DUPLICATES BEFORE: 18 logical points
CURRENT DUPLICATES AFTER: 0
INDICATORS BEFORE: 702
INDICATORS AFTER: 702
INDICATOR VALUES CHANGED: NO
RAW_REFERENCE PRESERVED: PASS
LINEAGE COVERAGE: 100%
CONTAGEM 202506: PASS
CONTAGEM 202512: PASS
CONTAGEM 202606: PASS
BETIM 202606: PASS
BH 202512: PASS
BH 202606: PASS
IDEMPOTENCY: PASS
OVERLAP REPROCESSING: PASS
SAME HASH + NEW METADATA: PASS
SAME HASH + SAME METADATA: PASS
NEW HASH/VINTAGE: PASS
SOURCE ISOLATION: PASS
TESTS: PASS
TYPECHECK: PASS
LINT: PASS
BUILD: PASS
P0: 0
P1: 0
P2: 1
READY FOR CLAUDE AUDIT: YES
READY FOR ECO-03B3B AFTER AUDIT: YES
```

## 15. Decisão final obrigatória

1. **O P1 foi realmente eliminado?** Sim; cobertura 100%, current único e reprocessamento idempotente.
2. **Evidence metadata agora é confiável?** Sim, no escopo ECO-03B3A auditado.
3. **Há apenas uma evidence current por ponto lógico?** Sim, 234/234.
4. **Vintages legítimas foram preservadas?** Sim, 18 linhas históricas preservadas.
5. **Raw lineage permaneceu íntegro?** Sim, 252/252 com lineage.
6. **Territory indicators permaneceram inalterados?** Sim, 702 e fingerprint idêntico.
7. **Reprocessamento sobreposto é seguro?** Sim, no modelo sequencial/lease atual.
8. **Podemos expandir para 2024-01 sem multiplicar inconsistências?** Do ponto de vista desta falha de evidência, sim; disponibilidade/layout 2024 ainda precisa do gate próprio.
9. **Existe bloqueio restante para ECO-03B3B?** Nenhum P1 deste bloco; permanece apenas auditoria independente e a homologação de disponibilidade/layout 2024 prevista para o próximo gate.
10. **Próximo passo:** auditoria independente do Claude deste relatório e artefatos. Somente após aprovação, iniciar ECO-03B3B.

## Encerramento

ECO-03B3A.1 encerrado. Não foi iniciado ECO-03B3B, não houve expansão para 2024, alteração de metodologia econômica, intelligence, frontend, n8n ou deploy.
