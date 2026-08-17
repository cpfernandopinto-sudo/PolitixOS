# POLITIXOS — Territórios — ECO-03B2

**Expansão analítica operacional do Novo CAGED: setores, estoque, variação relativa e salário de admissão**  
**Data:** 16/08/2026  
**Resultado:** cinco setores implementados e validados; estoque, variação relativa e salário mantidos como `METHODOLOGY_PENDING`  
**Escopo persistido:** Contagem, Betim e Belo Horizonte, competência 202606  
**Deploy:** não realizado

## 1. Resumo executivo

O motor passou a agregar, no mesmo streaming nacional, admissões, desligamentos e saldo pelos cinco grandes grupamentos oficiais do Novo CAGED. A POC real reconciliou exatamente os seis totais publicados pelo MTE — cinco setores e não identificado — e os totais gerais dos três pilotos. Foram persistidos 45 indicadores setoriais e 15 evidências; a segunda execução foi noop e os nove indicadores anteriores permaneceram byte-a-byte equivalentes em hash canônico.

## 2. Decisão

Publicar somente fluxos setoriais comprovados. Não publicar estoque, variação relativa ou salário até existir base/fonte e validação municipal reproduzível completa.

## 3. Estado inicial

Branch `main`, HEAD inicial `5ee77df`, worktree previamente sujo por trilhas paralelas e pelos artefatos CAGED ainda não rastreados. Nada foi descartado.

## 4. Branch/worktree

Execução no worktree principal para preservar acesso ao estado não commitado do ECO-03B1.5. Nenhuma branch, commit ou worktree foi criada.

## 5. Concorrência

Alterações paralelas de frontend, INTEL, saúde, economia e eleições foram preservadas e não tocadas.

## 6. Baseline ECO-03B1.5

Baseline confirmado antes das edições: 31 testes CAGED, integração real 202606/202001, storage, lease, run nacional e nove indicadores piloto idempotentes.

## 7. Baseline tests

Antes da alteração: CAGED 31/31; territorial 406/406; INTEL economia 101/101; typecheck, lint e build PASS; integração real PASS em 99,74 s.

## 8. Documentação oficial consultada

MTE/PDET: microdados, sumário executivo de junho/2026, apresentações por grupamento, comunicado do estoque de referência e notas metodológicas; IBGE/CONCLA: estrutura oficial CNAE 2.0.

## 9. URLs/fontes oficiais

- [Microdados RAIS e CAGED/MTE](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/microdados-rais-e-caged)
- [Sumário Executivo Novo CAGED — junho/2026](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/novo-caged/2026/junho/sumario-executivo_junho-de-2026.pdf)
- [Comunicado do estoque de referência 2026](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/comunicados/comunicado-estoque-de-referencia-de-2026)
- [CNAE 2.0 — IBGE/CONCLA](https://cnae.ibge.gov.br/classificacoes/por-tema/atividades-economicas/classificacao-nacional-de-atividades-economicas.html)

## 10. Layouts

MOV/FOR: 28 campos; EXC: 30 campos. O layout real 202606 contém `seção`, e o parser agora a exige junto de competência, município e saldo.

## 11. Campos reais

Foram verificados `seção`, `subclasse`, `salário`, `unidadesaláriocódigo`, `valorsaláriofixo`, `indtrabintermitente`, `competênciamov`, `município` e `saldomovimentação`.

## 12. Arquitetura

RAW privado versionado → extração controlada → parser UTF-8 streaming → efeito MOV/FOR/EXC → agregação geral e setorial simultânea → NDJSON curated → Supabase operacional somente agregado.

## 13. Alterações realizadas

Contrato de capability, mapping CNAE, acumulador setorial, hash canônico setorial, novos curated NDJSON, persistência setorial piloto, auditoria real e testes.

## 14. Streaming

Setores são derivados dentro do loop existente. Não há segunda varredura, array de eventos nem cubagem individual.

## 15. Privacidade

Somente `município × mês × setor` é materializado. Idade, sexo, raça/cor, CBO, salário e subclasse não aparecem no agregado nem na evidence.

## 16. CNAE

Campo oficial usado: `seção`, CNAE 2.0.

## 17. Nível CNAE

Primeiro nível hierárquico, com 21 seções de `A` a `U`.

## 18. Metodologia 5 setores

Reprodução dos cinco grandes grupamentos divulgados pelo MTE a partir das seções CNAE 2.0, sem taxonomia própria.

## 19. Mapping completo

`A → Agropecuária`; `B–E → Indústria geral`; `F → Construção`; `G → Comércio`; `H–U → Serviços`; vazio/desconhecido → `não_classificado`.

## 20. Versionamento mapping

Método `novo-caged-five-sectors-v1`; mapping `mte-cnae2-sections-2026-v1`. Ambos entram no metadata e no hash.

## 21. Agropecuária

Seção A: agricultura, pecuária, produção florestal, pesca e aquicultura.

## 22. Indústria

Seções B, C, D e E: extrativas, transformação, eletricidade/gás e água/esgoto/resíduos/descontaminação.

## 23. Construção

Seção F.

## 24. Comércio

Seção G: comércio e reparação de veículos automotores e motocicletas.

## 25. Serviços

Seções H a U, cobrindo transporte, alojamento, informação, finanças, imobiliárias, profissionais, administrativas, administração pública, educação, saúde, artes, outros serviços, domésticos e extraterritoriais.

## 26. Unclassified

Nacional MOV 202606: 12 eventos, sendo 5 admissões e 7 desligamentos, saldo -2. Foram quantificados e reconciliados, mas não persistidos como sexto setor.

## 27. Reconciliação setorial

Soma dos cinco setores + não classificado = 2.220.131 admissões, 2.074.970 desligamentos e +145.161 de saldo, exatamente o total geral.

## 28. Indicadores setoriais

15 códigos: `admissoes_`, `desligamentos_` e `saldo_emprego_formal_` para os sufixos `agropecuaria`, `industria_geral`, `construcao`, `comercio` e `servicos`.

## 29. Evidence setorial

Uma evidence por território/setor observado, com hash, competência, método, mapping e vintages. POC: 15 evidências.

## 30. Lineage setorial

Cada indicador registra competência, setor, versão de método/mapping, linhas contribuintes e IDs SHA-256 das vintages MOV/FOR/EXC.

## 31. FOR setorial

65.573 eventos distribuídos por setor, 12 competências afetadas; sinal original preservado e reconciliação PASS.

## 32. EXC setorial

8.719 exclusões distribuídas por setor, 77 competências afetadas; efeito inverso preservado e reconciliação PASS.

## 33. POC Contagem setores

Agro 7/5/+2; Indústria 2.056/1.941/+115; Construção 645/542/+103; Comércio 4.247/4.066/+181; Serviços 5.282/4.769/+513. Total 12.237/11.323/+914: PASS.

## 34. POC Betim setores

Agro 5/2/+3; Indústria 2.439/1.535/+904; Construção 415/313/+102; Comércio 1.457/1.438/+19; Serviços 2.975/2.647/+328. Total 7.291/5.935/+1.356: PASS.

## 35. POC BH setores

Agro 34/13/+21; Indústria 2.296/2.464/-168; Construção 7.130/6.523/+607; Comércio 9.258/9.432/-174; Serviços 29.074/28.214/+860. Total 47.792/46.646/+1.146: PASS.

## 36. Brasil setores

| Grupamento | Admissões | Desligamentos | Saldo | Oficial |
|---|---:|---:|---:|---:|
| Agropecuária | 114.801 | 91.903 | 22.898 | PASS |
| Indústria geral | 331.149 | 316.711 | 14.438 | PASS |
| Construção | 208.989 | 194.853 | 14.136 | PASS |
| Comércio | 507.660 | 488.483 | 19.177 | PASS |
| Serviços | 1.057.527 | 983.013 | 74.514 | PASS |
| Não identificado | 5 | 7 | -2 | PASS |

## 37. Estoque — discovery

O estoque é oficial, porém não existe como campo no microdado MOV/FOR/EXC.

## 38. Estoque — metodologia

Estoque de referência RAIS recalibrado anualmente, com saldos mensais encadeados e recálculo retroativo.

## 39. Estoque — fonte base

RAIS consolidada mais recente, acertos, baixas e movimentações Novo CAGED.

## 40. Papel RAIS

A RAIS ancora/recalibra o nível; somar fluxos sem essa base cria um número não oficial.

## 41. Estoque — implementação ou pending

`METHODOLOGY_PENDING`. Nenhum indicador criado.

## 42. Estoque — validação oficial

Não aplicável. O nacional oficial de junho/2026 é 48.032.308 com ajustes, mas o motor não possui a série-base necessária para reproduzi-lo.

## 43. Variação relativa — metodologia

Saldo do mês dividido pelo estoque no primeiro dia do mês, multiplicado por 100.

## 44. Denominador

Estoque inicial oficial recalibrado; não validado no motor atual.

## 45. Implementação ou pending

`METHODOLOGY_PENDING`. Sem denominador validado, nenhuma taxa foi publicada.

## 46. Salário — discovery

O MTE publica salário médio nominal de admissão e comparadores nacionais/UF/setor, mas não foi localizado contrato municipal estável para homologação automática.

## 47. Campo salário

Campo candidato: `salário`; campos auxiliares: `unidadesaláriocódigo` e `valorsaláriofixo`.

## 48. Unidade

Valor mensal nominal em reais após normalização oficial; não implementado.

## 49. Filtros oficiais

Somente admissões; excluir abaixo de 0,3 e acima de 150 salários mínimos e vínculos intermitentes. Esses filtros foram documentados, não codificados como indicador disponível.

## 50. Tratamento missing/zero/outlier

Não homologado. Missing/zero e limites exigem política explícita compatível com a versão de salário mínimo e unidade salarial.

## 51. FOR salário

Não implementado. A competência do FOR teria de revisar numerador e denominador históricos do mês do evento.

## 52. EXC salário

Não implementado. Exclusão de admissão teria de retirar valor e contagem da média histórica correspondente.

## 53. Numerador/denominador

Conceitualmente soma dos salários admissíveis / número de admissões admissíveis, ambos revision-aware; não homologado.

## 54. Média ponderada

Não deve ser reconstruída por média de médias. A futura implementação deve manter soma e contagem elegível.

## 55. Implementação ou pending

`METHODOLOGY_PENDING`. Nenhum valor exploratório foi persistido.

## 56. Validação salário oficial

Não aplicável neste gate; o valor nacional oficial é R$ 2.404,34, mas não foi rotulado como reproduzido.

## 57. Capability status

| Capability | Status | Source | Method | Validation |
|---|---|---|---|---|
| Total flows | AVAILABLE | MTE microdados | MOV/FOR sinal; EXC inverso | nacional + pilotos |
| Five sectors | AVAILABLE | `seção` CNAE 2.0 | mapping oficial versionado | tabela MTE exata |
| Formal employment stock | METHODOLOGY_PENDING | RAIS + CAGED | encadeamento/rebase | não executada |
| Relative stock change | METHODOLOGY_PENDING | estoque inicial + saldo | saldo/estoque inicial | não executada |
| Average admission salary | METHODOLOGY_PENDING | microdados + regras MTE | soma/contagem elegível | insuficiente municipal |

## 58. Method catalog

Catálogo machine-readable em `methods.ts`, com status, versão, fonte/campo, escopo e motivo de pending.

## 59. Aggregate hashes

SHA-256 canônico inclui território, competência, setor, três valores, vintages ordenadas, versão do método e mapping.

## 60. Provenance

Fonte MTE/PDET, SHA-256 dos artefatos oficiais e metadata suficiente para reconstruir cada agregado sem expor microdados.

## 61. Persistência

Somente três pilotos e 202606. Nenhuma persistência nacional.

## 62. Indicadores criados

45 linhas: 3 municípios × 5 setores × 3 fluxos.

## 63. Evidence criadas

15 linhas na primeira execução; zero duplicações na segunda.

## 64. Migrations

Nenhuma. O schema existente comporta os novos indicadores.

## 65. Idempotência

Primeira execução: 45 inserts; segunda: 0 insert, 0 update, 45 unchanged.

## 66. Revisão

FOR/EXC são materializados como deltas setoriais por competência, sem publicar absolutos históricos incompletos.

## 67. Reconciliação

Nacional, pilotos, setor e identidade saldo = admissões − desligamentos: PASS.

## 68. Qualidade

Layout obrigatório, unclassified explícito, mapping fechado, falha rápida e testes de privacidade/determinismo.

## 69. Performance

Execução ECO-03B2 com cache: 39,66 s; parse 36,66 s; extração 2,80 s; sem download.

## 70. Memória

Complexidade proporcional a municípios × meses × seis classes, não a 4,3 milhões de eventos.

## 71. Disco

Dois novos curated NDJSON por competência: setorial current e deltas de revisão.

## 72. Storage

Adapter privado ECO-03B1.5 reutilizado; nenhuma política ou bucket alterado.

## 73. Lease

Lease nacional adquirido antes da POC e liberado em `finally`: PASS.

## 74. Source collection run

Run nacional registrado com scope `ECO03B2_PILOTS`, contagens, persistência e reconciliação.

## 75. Integração real

ECO-03B2 real PASS em 49,68 s de teste, incluindo banco e segunda persistência.

## 76. Regressão nacional

2.220.131 / 2.074.970 / +145.161 preservados: PASS.

## 77. Regressão 202001

Auditoria ECO-03B1 repetida após as mudanças: Contagem, Betim e BH históricos PASS.

## 78. Regressão pilotos

Os nove indicadores-base mantiveram 9 linhas e hash `ba6c12ed...0875` antes/depois: PASS.

## 79. Regressão INTEL

101/101 testes de economia PASS; `lib/territorios/intelligence/` não alterado.

## 80. Testes CAGED

7 arquivos, 36 testes, PASS.

## 81. Suíte territorial

48 arquivos, 411 testes, PASS.

## 82. Typecheck

`npx tsc --noEmit -p tsconfig.json`: PASS.

## 83. Lint

Escopo CAGED/ECO-03B2: PASS.

## 84. Build

Next.js 16.2.6: compilação, TypeScript e 20 páginas estáticas PASS.

## 85. Comandos exatos

```text
npx vitest run lib/territorios/caged --exclude '**/.claude/worktrees/**'
CAGED_RUN_REAL_AUDIT=1 npx vitest run scripts/audit-caged-eco03b2.integration.test.ts --exclude '**/.claude/worktrees/**'
CAGED_RUN_REAL_AUDIT=1 npx vitest run scripts/audit-caged-eco03b1.integration.test.ts --exclude '**/.claude/worktrees/**'
npx vitest run lib/territorios app/api/territorios --exclude '**/.claude/worktrees/**'
npx vitest run lib/territorios/intelligence/economy --exclude '**/.claude/worktrees/**'
npx tsc --noEmit -p tsconfig.json
npx eslint lib/territorios/caged scripts/audit-caged-eco03b2.ts scripts/audit-caged-eco03b2.integration.test.ts --no-warn-ignored
npm run build
```

## 86. Arquivos criados

`methods.ts`, `sectors.ts`, `sectors.test.ts`, `audit-caged-eco03b2.ts`, `audit-caged-eco03b2.integration.test.ts` e este relatório.

## 87. Arquivos alterados

`types.ts`, `core.ts`, `parser.ts`, `pipeline.ts`, `persistence.ts` e `parser.test.ts`.

## 88. Git diff --stat

Os arquivos CAGED já estavam não rastreados no baseline; `git diff --stat` não os contabiliza. Inventário direto ECO-03B2: 6 novos e 6 alterados, sem stage/commit.

## 89. Conflitos

Nenhum conflito funcional. A árvore suja paralela permanece preservada.

## 90. Riscos

Revisões históricas, mudança futura do mapping oficial, códigos territoriais não resolvidos, ausência de RAIS/estoque, fragilidade do FTP e necessidade de auditoria independente.

## 91. Débitos técnicos

Homologar RAIS/estoque; definir comparador municipal salarial; testar substituição real de vintage setorial; ampliar catálogo nacional antes de qualquer carga Brasil.

## 92. Métricas methodology pending

`estoque_emprego_formal`, `variacao_relativa_estoque_emprego_formal` e `salario_medio_admissao_nominal`.

## 93. Recomendação para auditoria Claude

Auditar mapping A–U, igualdade com a Tabela 1, semântica EXC, hash/idempotência, ausência de dados individuais, contagem exata de 45 indicadores e preservação dos nove anteriores.

## 94. Recomendação ECO-03B3

Não iniciar automaticamente. Próximo gate deve ser decidido após auditoria, priorizando base RAIS/estoque ou operação histórica revision-aware.

## 95. Recomendação futura INTEL-CAGED

Somente após séries históricas revisadas: tendências/YoY/sazonalidade por setor. Não inferir causalidade política nem usar um único mês como diagnóstico estrutural.

## Tabela de indicadores

| Code/padrão | Label/family | Unit | Source/period | Method/version | Filters/limitations | Persisted | Validated |
|---|---|---|---|---|---|---:|---:|
| `admissoes_emprego_formal_{setor}` | Admissões / fluxo setorial | movimentações | MTE, mensal | five-sectors/v1 | seção oficial; revisável | SIM, pilotos | SIM |
| `desligamentos_emprego_formal_{setor}` | Desligamentos / fluxo setorial | movimentações | MTE, mensal | five-sectors/v1 | seção oficial; revisável | SIM, pilotos | SIM |
| `saldo_emprego_formal_{setor}` | Saldo / fluxo setorial | vínculos (saldo) | MTE, mensal | five-sectors/v1 | adm. − deslig.; revisável | SIM, pilotos | SIM |
| `estoque_emprego_formal` | Estoque / nível | vínculos | RAIS+CAGED, mensal | pendente | exige rebase | NÃO | NÃO |
| `variacao_relativa_estoque_emprego_formal` | Variação / taxa | % | RAIS+CAGED, mensal | pendente | exige estoque inicial | NÃO | NÃO |
| `salario_medio_admissao_nominal` | Salário / média | R$ nominal | MTE, mensal | pendente | filtros/outliers/revisões | NÃO | NÃO |

Setores substituídos em `{setor}`: `agropecuaria`, `industria_geral`, `construcao`, `comercio`, `servicos`.

## Respostas às 24 decisões obrigatórias

1. `seção`. 2. Seção CNAE 2.0. 3. Cinco grandes grupamentos MTE. 4. B–E. 5. H–U. 6. 12 eventos nacionais MOV. 7. Sim, exatamente. 8. Sim. 9. Não com a base atual. 10. RAIS + fluxos/revisões CAGED. 11. Não aplicável. 12. Não sem estoque validado. 13. Estoque no primeiro dia do mês. 14. Conceitualmente sim, operacionalmente ainda não homologado. 15. `salário`, com unidade/valor fixo auxiliares. 16. Admissões, 0,3–150 salários mínimos, excluir intermitentes. 17. Revisam soma e contagem da competência original; EXC remove. 18. Não homologado. 19. Estoque, variação relativa e salário. 20. Os 15 fluxos setoriais. 21. Sim. 22. Sim. 23. Sim. 24. Sim, com ressalvas documentadas.

## Declaração de segurança

| Item | Resultado |
|---|---:|
| Semântica MOV alterada | NÃO |
| Semântica FOR alterada | NÃO |
| Semântica EXC alterada | NÃO |
| ECO-03B1.5 regrediu | NÃO |
| Microdados no Postgres | NÃO |
| Dados individuais persistidos | NÃO |
| CBO implementado | NÃO |
| Demografia implementada | NÃO |
| INTEL alterado | NÃO |
| Frontend alterado | NÃO |
| n8n alterado | NÃO |
| Orquestrador alterado | NÃO |
| Scheduler ativado | NÃO |
| Deploy | NÃO |
| RLS externo alterado | NÃO |

## Gate final

| Gate | Resultado |
|---|---:|
| BASELINE ECO-03B1.5 | PASS |
| DOCUMENTAÇÃO OFICIAL | PASS |
| CNAE FIELD / MAPPING | PASS / PASS |
| FIVE SECTORS / RECONCILIATION | PASS / PASS |
| UNCLASSIFIED | QUANTIFICADO |
| SECTOR FOR / EXC | PASS / PASS |
| CONTAGEM / BETIM / BH / NATIONAL | PASS / PASS / PASS / PASS |
| EMPLOYMENT STOCK | METHODOLOGY_PENDING |
| STOCK OFFICIAL VALIDATION | NA |
| RELATIVE STOCK CHANGE | METHODOLOGY_PENDING |
| STOCK DENOMINATOR | NOT_VALIDATED |
| AVERAGE ADMISSION SALARY | METHODOLOGY_PENDING |
| SALARY OFFICIAL FILTERS | VALIDATED documentalmente |
| SALARY FOR / EXC / OFFICIAL VALIDATION | NA / NA / NA |
| STREAMING / PRIVACY | PASS / PASS |
| LINEAGE / PROVENANCE / DETERMINISM | PASS / PASS / PASS |
| IDEMPOTENCY / NATIONAL RECONCILIATION | PASS / PASS |
| 202001 / PILOT REGRESSION | PASS / PASS |
| STORAGE / LEASE / NATIONAL RUN | PASS / PASS / PASS |
| INTEL REGRESSION | PASS |
| TESTS / TYPECHECK / LINT / BUILD | PASS / PASS / PASS / PASS |
| PRONTO PARA AUDITORIA CLAUDE | SIM, COM RESSALVAS |
| PRONTO PARA ECO-03B3 | COM RESSALVAS; aguardar decisão |
| DADOS PRONTOS PARA FUTURA INTEL-CAGED | COM RESSALVAS; faltam séries históricas |

**Encerramento:** ECO-03B2 concluído. Nenhum ECO-03B3, CBO, demografia, frontend, INTEL, scheduler, n8n, Orquestrador ou deploy foi iniciado.
