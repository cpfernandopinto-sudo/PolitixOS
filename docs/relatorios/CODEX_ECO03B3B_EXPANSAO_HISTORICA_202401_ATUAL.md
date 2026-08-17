# POLITIXOS — Territórios — ECO-03B3B

## 1. Resumo executivo

A série revision-aware do Novo CAGED foi expandida de 2024-01 até a última declaração oficial disponível, 2026-06, exclusivamente para Belo Horizonte, Betim e Contagem. A carga final contém 1.620 indicadores, 540 evidências correntes e 18 versões históricas legítimas. Não há lacunas, divergências de valor, duplicatas correntes ou metadados obrigatórios ausentes.

## 2. Gate final

**PASS.** P0=0 e P1=0. O avanço ao próximo gate fica condicionado à auditoria independente do Claude.

## 3. Escopo

Somente motor Economia/Novo CAGED, três municípios-piloto, MOV/FOR/EXC, cinco setores oficiais e janela 202401–202606. Nenhum frontend, n8n, IA, LLM, deploy ou município adicional foi alterado.

## 4. Baseline herdado

ECO-03B3A.1 estava homologado em 202506–202606, com 702 indicadores, 234 evidências correntes, 18 versões históricas e zero duplicatas correntes.

## 5. Homologação fonte 2024

O diretório oficial contém 202401–202412 e os três artefatos em cada mês. Amostras 202401, 202406 e 202412 foram baixadas, extraídas e processadas integralmente antes da expansão. Resultado: PASS.

## 6. Matriz MOV/FOR/EXC

| Tipo | 202401 | 202406 | 202412 | Resultado |
|---|---:|---:|---:|---|
| MOV | 3.955.239 linhas | 3.941.593 | 3.584.049 | PASS |
| FOR | 49.453 linhas | 55.414 | 44.193 | PASS |
| EXC | 6.840 linhas | 8.430 | 5.122 | PASS |

## 7. Schema 2024

MOV/FOR mantiveram o mesmo hash de layout e 28 colunas nas três amostras. EXC manteve seu hash próprio e 30 colunas. Os campos essenciais foram reconhecidos sem adaptador. PASS.

## 8. Compatibilidade 2025/2026

Os 30 meses foram processados pelo mesmo parser e contrato canônico, sem falha ou lote parcial. PASS.

## 9. Encoding

Leitura streaming com remoção de BOM, delimitador oficial e normalização dos cabeçalhos/acentos foi exercitada nos nove arquivos de homologação sem descarte por schema. PASS.

## 10. Município

Os códigos 3106200, 3106705 e 3118601 foram encontrados em MOV, FOR e EXC nas três amostras. PASS.

## 11. Setores

Agropecuária, indústria geral, construção, comércio e serviços foram encontrados e reconciliados. `nao_classificado` permanece apenas como controle de ingestão, não como indicador publicado.

## 12. Revision model

MOV estabelece a base mensal; FOR aplica inclusões retroativas e EXC aplica o efeito inverso. Foram encontradas revisões reais de meses de 2024 em declarações posteriores. PASS.

## 13. Cutoff

Cutoff canônico: declaração 202606.

## 14. Janela final

202401–202606, 30 meses por município.

## 15. Plano de download

Foi feita descoberta remota antes da carga, homologação de três amostras e expansão sequencial. Foram baixados 51 artefatos novos; 39 artefatos da faixa herdada foram reutilizados.

## 16. Cache reuse

Cache-first confirmado. A segunda execução usou 30/30 checkpoints e não repetiu downloads nem parsing nacional.

## 17. Chunk strategy

Blocos: 202401–03, 202404–06, 202407–12, 202501–05, overlap 202506–07 e reconciliação da baseline 202508–202606.

## 18. 202401–202403

162 indicadores e 54 evidências inseridos na primeira execução. Segunda execução: 162 indicadores e 54 evidências inalterados.

## 19. 202404–202406

162 indicadores e 54 evidências inseridos. Segunda execução integralmente inalterada.

## 20. 202407–202412

324 indicadores e 108 evidências inseridos. Segunda execução integralmente inalterada.

## 21. 202501–202505

270 indicadores e 90 evidências inseridos. Segunda execução integralmente inalterada.

## 22. Overlap com baseline

202506–202507: zero insert/update de indicador e 108 indicadores reconhecidos como inalterados. A reconciliação de 202508–202606 também manteve 594 indicadores inalterados; somente 198 metadados correntes foram completados.

## 23. Série final

Três séries com 30 pontos mensais, três medidas totais e 15 medidas setoriais por mês: 3 × 30 × 18 = 1.620 indicadores.

## 24. Continuidade

Primeiro período 202401, último 202606, 30/30 meses em cada município, gaps=0.

## 25. MoM

Calculado a partir da série mensal canônica; nulo somente quando não existe mês anterior dentro da série. PASS.

## 26. YoY

Calculado quando existe o mesmo mês do ano anterior. A janela contém pares completos a partir de 202501. PASS.

## 27. Rolling 12m

Calculado quando existem 12 meses consecutivos, a partir de 202412. PASS.

## 28. Evidence

558 linhas totais: 540 correntes e 18 vintages históricos legítimos.

## 29. Current/history

Uma e somente uma evidência corrente por território, mês e contexto (total ou setor). Versões anteriores permanecem imutáveis e `current=false`.

## 30. Metadata

Cobertura de `reference_month`, `context`, `contributing_vintages`, `history_method_version`, `as_of_declaration_month`, `aggregate_hash`, `revision_aware` e `current`: 100% nas 540 evidências correntes.

## 31. Lineage

Cobertura de vintages contribuintes: 100%. Hashes e URLs oficiais permanecem nos artefatos/evidências.

## 32. Cardinalidade

1.620 indicadores; 558 evidências físicas; 540 pontos lógicos correntes; 18 versões históricas; duplicatas de indicador=0; duplicatas correntes=0; current missing=0; ambiguidades=0.

## 33. Raw reconciliation

36 comparações controladas (3 municípios × 4 meses × total/serviços/comércio) foram recalculadas a partir dos checkpoints produzidos dos artefatos oficiais e confrontadas com o banco. Divergências=0.

## 34. Setorial reconciliation

Para cada um dos 90 pontos municipais, a soma dos cinco setores foi confrontada com total em admissões, desligamentos e saldo durante a reconstrução. Divergências=0.

## 35. Revision canary 2024

Revisões FOR/EXC reais foram encontradas para competências de 2024, incluindo 202401. FOUND.

## 36. Baseline canaries

Contagem 202506/202512/202606, Betim 202606 e Belo Horizonte 202512/202606 foram confrontados com a reconstrução canônica. PASS.

## 37. Idempotência

Segunda execução: inserts=0, updates de indicador=0, updates de evidência=0 no escopo já completado; todos os registros foram `unchanged`. PASS.

## 38. Overlap reprocessing

202506–202507 não criou indicadores/evidências duplicados nem alterou valores. PASS.

## 39. Performance

Pico de RSS observado na carga: aproximadamente 242 MiB. Reexecução por checkpoint: aproximadamente 106 MiB. Processamento inicial completo: aproximadamente 29 minutos.

## 40. Cache

Antes: ~808 MiB. Depois: 1,8 GiB. Delta aproximado: 1,0 GiB. Espaço livre final: 19 GiB. Checkpoints: 30.

## 41. Testes

9 arquivos, 44 testes do motor CAGED: PASS.

## 42. Typecheck

`tsc --noEmit`: PASS.

## 43. Lint

Arquivos alterados: PASS.

## 44. Build

Build Next.js 16.2.6: PASS.

## 45. P0/P1/P2/P3

- P0: 0.
- P1: 0. O P1 temporário de cobertura de metadados herdados foi eliminado antes do gate final.
- P2: 2 herdados — concorrência em `territory_indicators`; garantia transacional absoluta do marcador `current` entre múltiplas operações.
- P3: 1 herdado — inconsistência histórica de nomenclatura/raw reference já documentada no gate anterior e não ampliada neste bloco.

## 46. Riscos

O cache é local e removível; sua perda exige novo download/processamento, mas não compromete o banco. A origem FTP pode alterar disponibilidade/latência. Os riscos P2 herdados permanecem não bloqueantes no escopo serial controlado.

## 47. Dívidas técnicas

Evoluir checkpoint para armazenamento durável compartilhado; reforçar transação/constraint do current; harmonizar nomenclatura histórica em bloco próprio; criar auditor independente que leia o raw sem reutilizar o reconstrutor de produção.

## 48. Prontidão para próximo gate

Dados e motor estão prontos. Próximo gate: somente após auditoria Claude.

## 49. Recomendação de auditoria Claude

Auditar hashes/manifests, layouts, cardinalidade, 36 canários, uma revisão 2024, unicidade current, 18 vintages legítimos, metadados/lineage 100%, idempotência e invariância dos canários da baseline. Não expandir municípios durante a auditoria.

---

ECO-03B3B:
PASS

2024 SOURCE:
PASS

2024 SCHEMA:
PASS

2024 MOV:
PASS

2024 FOR:
PASS

2024 EXC:
PASS

2024 REVISION MODEL:
PASS

2024 SECTOR MAPPING:
PASS

START MONTH:
202401

END MONTH:
202606

TOTAL MONTHS:
30

TERRITORIES:
3

SERIES CONTINUITY:
PASS

GAPS:
0

RAW RECONCILIATION:
PASS

SECTOR RECONCILIATION:
PASS

MoM:
PASS

YoY:
PASS

ROLLING 12M:
PASS

TOTAL INDICATORS:
1620

TOTAL EVIDENCES:
558

LOGICAL EVIDENCE POINTS:
540

CURRENT EVIDENCES:
540

HISTORY/VINTAGE EVIDENCES:
18

INDICATOR DUPLICATES:
0

CURRENT DUPLICATES:
0

CURRENT MISSING:
0

AMBIGUOUS ROWS:
0

METADATA COVERAGE:
100%

LINEAGE COVERAGE:
100%

IDEMPOTENCY:
PASS

OVERLAP REPROCESSING:
PASS

CONTAGEM 202506:
PASS

CONTAGEM 202512:
PASS

CONTAGEM 202606:
PASS

BETIM 202606:
PASS

BH 202512:
PASS

BH 202606:
PASS

2024 REVISION CANARY:
FOUND

CACHE BEFORE:
808 MiB

CACHE AFTER:
1.8 GiB

CACHE DELTA:
~1.0 GiB

DOWNLOADS:
51

PROCESSING TIME:
~29 min

TESTS:
PASS

TYPECHECK:
PASS

LINT:
PASS

BUILD:
PASS

P0:
0

P1:
0

P2:
2

P3:
1

READY FOR CLAUDE AUDIT:
YES

READY FOR NEXT ECONOMY GATE:
AFTER_AUDIT

## Decisão final

O bloco ECO-03B3B está aprovado no escopo dos três municípios-piloto. A expansão histórica oficial de 202401 a 202606 está completa, revision-aware, reconciliada, auditável e idempotente. Não iniciar o próximo bloco de Economia antes da auditoria independente do Claude.
