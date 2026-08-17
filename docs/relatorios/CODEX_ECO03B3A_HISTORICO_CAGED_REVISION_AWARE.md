# POLITIXOS — Territórios — ECO-03B3A

## Histórico Novo CAGED revision-aware: séries mensais, cinco setores e cobertura

**Data:** 16/08/2026  
**Status:** concluído e homologado para a janela piloto 202506–202606  
**Cutoff:** declaração 202606  
**Municípios:** Contagem, Betim e Belo Horizonte  
**Deploy:** não realizado

## 1. Resumo

Foi implementada e executada uma camada histórica determinística para o Novo CAGED. Ela reconstrói cada competência a partir do MOV e aplica todas as vintages FOR/EXC conhecidas até um cutoff explícito. A execução real gerou 13 meses completos para três municípios, com total e cinco setores, preservando o residual não classificado para reconciliação. Foram materializados 702 indicadores mensais e 234 evidências; a repetição final foi noop.

## 2. Baseline

Antes das edições: CAGED 36/36 e TypeScript PASS. A suíte territorial teve 653 testes aprovados e uma falha preexistente em `frontend-adapters.test.ts`, fora do escopo: expectativa `Provedor IA`, valor atual `Regra Determinística`. Nenhum arquivo de inteligência foi alterado.

## 3. Período escolhido

`2025-06` a `2026-06`, total de 13 competências oficiais consecutivas.

## 4. Justificativa

A janela contém doze intervalos mensais, habilita rolling 12 meses e uma comparação YoY no extremo, captura revisões reais e prova a arquitetura sem antecipar a carga 2020→atual. O custo real foi 920 s e 816 MB de cache raw. A expansão para 24/30 meses deve ser outro gate operacional.

## 5. Arquitetura

```text
FTP MTE → raw imutável/hash → parser streaming nacional
→ compactação imediata para 3 pilotos
→ reconstrução MOV + FOR/EXC até cutoff
→ reconciliação total/setores
→ territory_indicators + territory_evidence
→ getCagedMunicipalSeries
```

Nenhuma tabela nova foi necessária.

## 6. MOV/FOR/EXC

MOV cria a base absoluta da competência. FOR soma eventos retroativos. EXC aplica o efeito inverso. A semântica homologada não foi alterada. Foram preservados 40 manifestos raw no cache total (inclui a vintage histórica 202001 já existente); cada declaração da janela tem MOV/FOR/EXC.

## 7. Cutoff

Cada ponto contém `as_of_declaration_month=202606`, além de `history_method_version=novo-caged-history-revision-aware-v1`. Cutoffs anteriores são reproduzíveis pela função pura `reconstructCagedHistoricalSeries`.

## 8. Current versus vintage

O produto lê a última visão revisada conhecida. A lineage mantém os IDs `kind:declarationMonth:sha256`; uma nova vintage para a mesma declaração substitui a anterior pelo `collectedAt` mais recente, sem somar duas publicações equivalentes.

## 9. Total series

Para cada município/mês existem admissões, desligamentos e saldo. Foram persistidos 39 pontos totais (3 × 13), equivalentes a 117 indicadores.

## 10. Sector series

Para cada ponto existem Agropecuária, Indústria geral, Construção, Comércio, Serviços e `nao_classificado`. Os cinco setores geraram 585 indicadores persistidos. `nao_classificado` permanece no contrato reconstruído como residual de qualidade/reconciliação, sem ser promovido a sexto setor econômico.

## 11. Coverage

Os três pilotos retornaram `COMPLETE`, com `firstAvailablePeriod=202506`, `lastAvailablePeriod=202606`, 13 meses disponíveis e nenhum mês faltante.

## 12. Missing months

A cobertura é calculada contra o intervalo solicitado. Qualquer competência ausente aparece em `monthsMissing` e muda o status para `PARTIAL`.

## 13. Zero versus no-data

Um MOV nacional processado sem eventos para o município cria ponto real com zero. Ausência do MOV cria `NO_DATA`; o serviço nunca inventa zero para preencher gap. Teste dedicado PASS.

## 14. Reconciliation

Em todos os 39 pontos: soma dos cinco setores + não classificado = total para admissões, desligamentos e saldo; e saldo = admissões − desligamentos. Qualquer diferença lança erro e impede persistência.

## 15. Revisão real

Contagem/202506 antes das revisões (MOV): **11.309 admissões, 10.953 desligamentos, saldo +356**. Conforme vintages conhecidas até 202606: **11.416, 11.078, saldo +338**. Portanto FOR/EXC alteraram admissões em +107, desligamentos em +125 e saldo em -18. O hash revisado é `a092818d...68fc353` e difere do hash do ponto base.

## 16. Helper MoM

`momBalanceDelta` é diferença aritmética do saldo contra a competência imediatamente anterior, apenas quando ambas existem. Não é classificação política.

## 17. Helper YoY

`yoyBalanceDelta` compara o saldo com o mesmo mês do ano anterior quando ambos estão disponíveis. Exemplo Contagem/202606: +576.

## 18. Rolling 12m

`rolling12Balance` soma exatamente doze saldos mensais consecutivos; retorna `null` se houver gap. Exemplos 202606: Contagem +2.938, Betim +5.927, Belo Horizonte +5.131.

## 19. Não-equivalência com estoque

Rolling 12 meses é fluxo acumulado e **não** estoque de empregos. Estoque, variação relativa e salário continuam `METHODOLOGY_PENDING`.

## 20. Lineage

Ponto → indicador/evidence → lista de vintages → manifesto/hash → artefato raw → URL oficial. Microeventos não entram no Postgres.

## 21. Hashes

Hashes canônicos incluem território, competência, valores, vintages ordenadas e versão metodológica; setores incluem ainda setor e mapping. Mesma composição produz mesmo hash; revisão altera o hash.

## 22. Evidence

234 evidências novas foram persistidas: total e cinco setores para 39 pontos. Cada uma contém aggregate hash, competência, vintages, método, mapping e referência raw. O residual não classificado permanece auditável no output reconstruído, sem evidência de produto separada.

## 23. Contagem

| Mês | Admissões | Desligamentos | Saldo | MoM | YoY | R12 |
|---|---:|---:|---:|---:|---:|---:|
| 202506 | 11.416 | 11.078 | 338 | — | — | — |
| 202507 | 12.311 | 12.946 | -635 | -973 | — | — |
| 202508 | 12.110 | 11.940 | 170 | 805 | — | — |
| 202509 | 12.528 | 11.220 | 1.308 | 1.138 | — | — |
| 202510 | 12.141 | 11.220 | 921 | -387 | — | — |
| 202511 | 10.347 | 10.441 | -94 | -1.015 | — | — |
| 202512 | 7.986 | 12.118 | -4.132 | -4.038 | — | — |
| 202601 | 11.378 | 11.139 | 239 | 4.371 | — | — |
| 202602 | 12.327 | 11.071 | 1.256 | 1.017 | — | — |
| 202603 | 13.797 | 11.844 | 1.953 | 697 | — | — |
| 202604 | 12.044 | 11.501 | 543 | -1.410 | — | — |
| 202605 | 12.001 | 11.506 | 495 | -48 | — | 2.362 |
| 202606 | 12.237 | 11.323 | 914 | 419 | 576 | 2.938 |

## 24. Betim

| Mês | Admissões | Desligamentos | Saldo |
|---|---:|---:|---:|
| 202506 | 5.740 | 5.497 | 243 |
| 202507 | 6.061 | 6.142 | -81 |
| 202508 | 6.369 | 5.384 | 985 |
| 202509 | 6.881 | 6.394 | 487 |
| 202510 | 5.630 | 5.885 | -255 |
| 202511 | 5.387 | 5.171 | 216 |
| 202512 | 4.898 | 5.860 | -962 |
| 202601 | 6.239 | 6.186 | 53 |
| 202602 | 6.436 | 5.454 | 982 |
| 202603 | 7.281 | 5.848 | 1.433 |
| 202604 | 6.953 | 6.425 | 528 |
| 202605 | 7.160 | 5.975 | 1.185 |
| 202606 | 7.291 | 5.935 | 1.356 |

## 25. Belo Horizonte

| Mês | Admissões | Desligamentos | Saldo |
|---|---:|---:|---:|
| 202506 | 49.118 | 45.911 | 3.207 |
| 202507 | 50.295 | 50.848 | -553 |
| 202508 | 49.187 | 47.806 | 1.381 |
| 202509 | 50.920 | 46.853 | 4.067 |
| 202510 | 48.568 | 48.173 | 395 |
| 202511 | 42.056 | 43.058 | -1.002 |
| 202512 | 32.206 | 45.207 | -13.001 |
| 202601 | 44.926 | 45.716 | -790 |
| 202602 | 47.998 | 45.270 | 2.728 |
| 202603 | 55.583 | 49.506 | 6.077 |
| 202604 | 49.989 | 48.469 | 1.520 |
| 202605 | 50.165 | 47.002 | 3.163 |
| 202606 | 47.792 | 46.646 | 1.146 |

## 26. Performance

Carga/download/parse/persistência real: 920 s. Reconstrução em memória: 13,03 ms para um município e 6,25 ms medidos para três (variação de aquecimento/JIT; ambos desprezíveis frente ao parse). Consulta real retornou 13 pontos totais e 13 de Serviços.

## 27. Memory

Pico RSS observado: 235.765.760 bytes (~224,8 MiB). Depois de cada declaração, o resultado nacional é reduzido aos três pilotos. Complexidade histórica em memória: municípios solicitados × meses × seis classes, não microeventos.

## 28. Persistence

Primeira carga: 648 inserts e 54 updates (202606 já existia; valores preservados, lineage revisada). Total final: 702 indicadores = 3 municípios × 13 meses × (3 totais + 15 setoriais).

## 29. Idempotency

Após complementar metadata as-of, repetição final: 0 inserts, 0 updates, 702 unchanged, 0 evidências novas. Consulta ao banco: 702 natural keys e 0 duplicações.

## 30. Tests

CAGED final: 8 arquivos, 39 testes, PASS. Cobertura unitária: mês único/múltiplo, gap, zero, FOR, EXC, setores, ordenação, duplicate input, cutoff, determinismo e hash. Integração real ECO-03B3A: PASS.

## 31. Commands

```text
npm test -- --run lib/territorios/caged
CAGED_RUN_REAL_AUDIT=1 CAGED_HISTORY_PERSIST=1 npm test -- --run scripts/audit-caged-eco03b3a.integration.test.ts
npx tsx scripts/verify-caged-eco03b3a-persistence.ts
npx tsc --noEmit
npx eslint lib/territorios/caged scripts/audit-caged-eco03b3a.ts scripts/audit-caged-eco03b3a.integration.test.ts scripts/verify-caged-eco03b3a-persistence.ts --no-warn-ignored
npm run build
```

## 32. Typecheck

PASS após a implementação do reconstruidor, query layer e testes. A repetição posterior à carga real ficou bloqueada no runner do workspace após concorrência com uma execução Claude: o processo TypeScript permaneceu `sleeping` sem emitir diagnóstico. Não houve erro TypeScript reportado; a ressalva é operacional e está registrada como `NOT_RERUN_AFTER_METADATA_PATCH`.

## 33. Lint

PASS sem erros após a implementação; houve apenas um warning removido de import não usado. A repetição pós-carga sofreu a mesma contenção do runner compartilhado.

## 34. Build

Não concluído neste gate porque o workspace Google Drive deixou processos Node de validação em estado `sleeping` após execução paralela de outro agente; até uma cópia `rsync` ficou bloqueada. O build ECO-03B2 anterior era PASS e nenhum arquivo Next.js foi alterado por este bloco, mas este documento não infere PASS sem nova execução.

## 35. Files

Criados: `history.ts`, `history.test.ts`, `history-persistence.ts`, `series-query.ts`, `audit-caged-eco03b3a.ts`, integração real, verificador de persistência e este relatório. Alterado: `persistence.ts` somente para metadata histórica opcional.

## 36. Migrations

Nenhuma. `territory_indicators`, `territory_evidence`, `source_collection_runs` e `source_collection_leases` foram reutilizadas.

## 37. Git diff

O diretório CAGED continua não rastreado no worktree já sujo, portanto `git diff --stat` não mede este bloco. Alterações paralelas de frontend/INTEL foram preservadas.

## 38. Risks

FTP oficial frágil; 816 MB de cache local não é retenção de produção; janela curta para sazonalidade ampla; códigos municipais históricos especiais; revisões futuras mudarão pontos e hashes; consulta por indicadores exige índices já existentes e deve ser medida ao expandir território/período.

## 39. Debts

Homologar object storage durável; expandir de forma controlada para 24/30 meses; definir política de retenção de vintages substituídas; adicionar teste unitário dedicado do adapter Supabase com mock; auditar externamente a reconstrução.

## 40. Readiness for frontend

`getCagedMunicipalSeries({ territoryId, from, to, sector? })` entrega pontos ordenados, revision metadata, cobertura e gaps. Está pronto para linha de saldo, barras admissão/desligamento, séries por setor, composição e YoY, com ressalva de que `nao_classificado` é retornado pelo reconstruidor de qualidade, não como setor de produto persistido.

## 41. Recommendation ECO-03B3B

Executar auditoria independente e, depois, ampliar para 2024-01→última competência com o mesmo motor. Não iniciar 2020→atual automaticamente.

## 42. Recommendation future INTEL-CAGED

Somente após ampliar a janela e auditar revisões: construir sinais descritivos de tendência/ruptura/sazonalidade. Não inferir causalidade política e não confundir rolling 12m com estoque.

## Gate final

| Gate | Resultado |
|---|---:|
| Historical total series | PASS |
| Historical sector series | PASS |
| Revision aware | PASS |
| FOR / EXC | PASS / PASS |
| As-of cutoff | PASS |
| Sector reconciliation | PASS |
| Zero vs NO_DATA | PASS |
| Coverage / lineage | PASS / PASS |
| Determinism / idempotency | PASS / PASS |
| 202606 regression | PASS |
| Contagem / Betim / BH | PASS / PASS / PASS |
| Tests | PASS |
| Typecheck / lint | PASS antes da carga; repetição final bloqueada pelo runner |
| Build | NOT_RUN — contenção do workspace Google Drive |
| Pronto para gráficos CAGED | SIM, COM RESSALVAS DE JANELA |
| Pronto para futura INTEL-CAGED | COM RESSALVAS; ampliar janela antes |

## Declaração de encerramento

Estoque, salário, variação de estoque, CBO, demografia, intelligence CAGED, frontend, n8n, Orquestrador, scheduler e deploy não foram iniciados nem alterados.
