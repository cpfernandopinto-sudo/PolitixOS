# PolitixOS Territórios — Bloco 5.7 — Completude histórica TSE

**Data:** 12/08/2026  
**Escopo:** expansão nominal controlada dos pleitos 2016/2020 na amostra homologada do Bloco 5.6.  
**Decisão:** **BLOQUEADO — PARADA OBRIGATÓRIA ACIONADA NA REEXECUÇÃO IDEMPOTENTE**.

## 1. Baseline

O relatório do Bloco 5.6 foi lido integralmente e preservado. Estado inicial confirmado: RMBH canônica com 34 municípios, totais municipais de 2016/2020/2024, candidatos e partidos apenas em 2024, evidências e carga regional homologadas, zero anomalia crítica e zero divergência não explicada.

Não houve expansão territorial, schema, migration, frontend, UX, n8n, Motor Segurança, outro motor, deploy ou merge.

## 2. Causa da ausência histórica

A causa foi localizada em `prepareResources` e `collectPreparedTerritory`: o coletor baixava `detail` para todos os anos, porém calculava `latestYear = Math.max(...years)` e baixava/normalizava `candidate` e `party` apenas para esse ano. Com `[2016, 2020, 2024]`, somente 2024 entrava em `dataset.results`, `dataset.parties` e evidências nominais/partidárias.

Não era ausência da fonte, incompatibilidade de schema nem limitação do banco.

## 3. Datasets encontrados

Foram baixados e inspecionados diretamente os datasets oficiais:

```text
votacao_candidato_munzona_2016
votacao_partido_munzona_2016
votacao_candidato_munzona_2020
votacao_partido_munzona_2020
votacao_candidato_munzona_2024
votacao_partido_munzona_2024
```

Todos usam ZIP oficial TSE, CSV por UF, encoding Latin-1 e delimitador `;`, já suportados pelo cliente atual.

## 4. Matriz de compatibilidade 2016/2020/2024

| Campo/semântica | 2016 | 2020 | 2024 | Normalização |
|---|---|---|---|---|
| `ANO_ELEICAO` | COMPATÍVEL | COMPATÍVEL | COMPATÍVEL | número |
| UF / município (`SG_UF`, `CD_MUNICIPIO`) | COMPATÍVEL | COMPATÍVEL | COMPATÍVEL | chave territorial existente |
| turno / cargo | COMPATÍVEL | COMPATÍVEL | COMPATÍVEL | número + código/string |
| candidato (`SQ_CANDIDATO`) | COMPATÍVEL | COMPATÍVEL | COMPATÍVEL | identificador oficial |
| número/nome/nome de urna | COMPATÍVEL | COMPATÍVEL | COMPATÍVEL | string preservada |
| partido (número/sigla/nome) | COMPATÍVEL | COMPATÍVEL | COMPATÍVEL | string preservada |
| votos nominais válidos | COMPATÍVEL | COMPATÍVEL | COMPATÍVEL | fallback já homologado |
| status oficial do turno | COMPATÍVEL | COMPATÍVEL | COMPATÍVEL | código + descrição |
| votos nominais/legenda partidários | COMPATÍVEL | COMPATÍVEL | COMPATÍVEL | categorias preservadas |

Não foi encontrada diferença estrutural que exigisse branches por ano ou migration.

## 5. Alterações realizadas

- `tse-collector.ts`: preparação e agregação de candidatos/partidos por ano; workflow `1.2.0`.
- `tse-normalizer.ts`: derivação determinística do resultado de Prefeito no turno decisivo, com validação do status oficial.
- testes multiano para 2016/2020/2024 e segundo turno.
- executor controlado da amostra e relatório deste bloco.

Nenhum schema ou dado foi alterado manualmente.

## 6. Natural keys

Identidade normalizada do candidato:

```text
territory_id + year + round + officeCode + SQ_CANDIDATO
```

Indicador persistido:

```text
resultado_candidato_{year}_t{round}_c{officeCode}_{SQ_CANDIDATO}
```

Partido:

```text
territory_id + year + round + officeCode + NR_PARTIDO
```

O índice físico inclui território, categoria, indicador, fonte, dataset e período. Não houve colisão entre entidades históricas distintas na primeira execução.

## 7. Estratégia de normalização

As diferenças são absorvidas na mesma camada `aggregateCandidateResults` / `aggregatePartyResults`. O coletor passou a manter mapas `detailByYear`, `candidatesByYear` e `partiesByYear`; o restante consome o mesmo `TerritorialElectionDataset`. Não foram espalhados condicionais por ano.

## 8. Amostra processada

A primeira execução foi concluída para exatamente:

- Contagem — 3118601;
- Belo Horizonte — 3106200;
- Betim — 3106705;
- Nova Lima — 3144805;
- Ribeirão das Neves — 3154606;
- Taquaraçu de Minas — 3168309.

A segunda execução parou em Contagem ao testar idempotência. Nenhum outro município ou território foi iniciado.

## 9. Inventário antes/depois

O baseline da amostra tinha 2.503 indicadores e 30 evidências. Após a primeira execução, os seis municípios possuem candidatos/partidos dos três anos e nove evidências por município — três detalhes, três candidatos e três partidos.

A telemetria da primeira execução registrou as seguintes operações de indicador:

| Município | Operações persistidas |
|---|---:|
| Contagem | 1.349 |
| Belo Horizonte | 2.881 |
| Betim | 1.182 |
| Nova Lima | 449 |
| Ribeirão das Neves | 809 |
| Taquaraçu de Minas | 157 |
| **Total** | **6.827** |

As operações incluem inserts históricos e possíveis atualizações semânticas de linhas existentes. O relatório não as reclassifica artificialmente como inserts/updates porque a telemetria atual não separa essas categorias.

## 10. Candidatos por município/ano

| Município | 2016 | 2020 | 2024 |
|---|---:|---:|---:|
| Contagem | 548 | 714 | 415 |
| Belo Horizonte | 1.380 | 1.406 | 856 |
| Betim | 536 | 574 | 333 |
| Nova Lima | 147 | 248 | 209 |
| Ribeirão das Neves | 263 | 481 | 255 |
| Taquaraçu de Minas | 73 | 57 | 51 |

As contagens são linhas agregadas por candidato/cargo/turno, não pessoas únicas entre cargos ou turnos.

## 11. Partidos por município/ano

| Município | 2016 | 2020 | 2024 |
|---|---:|---:|---:|
| Contagem | 45 | 42 | 26 |
| Belo Horizonte | 48 | 47 | 41 |
| Betim | 40 | 32 | 24 |
| Nova Lima | 26 | 28 | 23 |
| Ribeirão das Neves | 30 | 35 | 22 |
| Taquaraçu de Minas | 18 | 9 | 8 |

As linhas preservam voto nominal válido, voto de legenda válido e total, sem misturar categorias anuladas/sub judice.

## 12. Evidências

Os seis municípios possuem evidências distintas para candidatos e partidos de 2016 e 2020, além das cinco do baseline, totalizando nove por município. Cada evidência possui dataset/ano próprio, URL oficial, vínculo territorial e hash determinístico. Evidência 2024 não foi reutilizada como histórica.

## 13. Vencedor, segundo e margem

A função determinística:

1. filtra Prefeito no ano;
2. escolhe o maior turno disponível;
3. ordena votos decrescentes;
4. deriva vencedor, segundo, votos, percentuais e margens;
5. exige que o único status `ELEITO` corresponda ao primeiro colocado.

Os testes determinísticos passaram para 2016/2020/2024 e segundo turno. O inventário persistido demonstra cobertura nominal nos seis municípios, mas a homologação externa completa obrigatória foi interrompida pelo gate de idempotência.

## 14. Validação externa

Os schemas e arquivos oficiais foram validados diretamente. A comparação final obrigatória de vencedor/segundo/margem para Contagem, Belo Horizonte e Betim em 2016/2020 não foi concluída após a parada estrutural. Resultado: **PARCIAL**.

## 15. Idempotência — erro estrutural encontrado

Primeira execução: seis municípios `completed`, 6.827 operações de indicador, cobertura histórica e evidências presentes.

Segunda execução: Contagem `failed`, `items_processed=0`, com:

```text
duplicate key value violates unique constraint "uq_territory_indicators_natural_key"
```

### Causa provável comprovada pelo código e volume

`persistIndicators` consulta todas as linhas TSE do território sem paginação. O PostgREST retorna no máximo 1.000 linhas nesse caminho. Após a expansão, Contagem possui mais de 1.000 indicadores; linhas existentes fora da primeira página não entram em `byKey`, são classificadas como inserts e o índice único recusa a duplicação.

Não é colisão da natural key nominal nem corrupção da primeira carga. É defeito de reconciliação/persistência em alto volume.

### Impacto

- primeira cobertura histórica persistida nos seis municípios;
- segunda execução não homologada;
- lote conflitante rejeitado pelo banco;
- índice único preservou integridade;
- Contagem ficou com collection run `failed`, não `running`;
- demais municípios não foram reexecutados após a parada.

### Camada provável

Motor TSE — função `persistIndicators`, SELECT de inventário existente sem paginação.

### Correção recomendada para microbloco autorizado

Paginar o SELECT de reconciliação ou buscar somente as chaves candidatas em lotes seguros; criar teste com inventário acima de 1.000 linhas; reexecutar a amostra duas vezes; auditar duplicações e só então retomar o Bloco 5.7. Não é necessária migration.

Resultado: **FAIL**.

## 16. Regressão 2024

Os parsers/normalizadores 2024 passaram nos testes locais e as linhas 2024 permanecem presentes. Porém a regressão funcional completa dos seis municípios não foi encerrada após a parada. Resultado do gate: **FAIL por não conclusão**, não por divergência 2024 comprovada.

## 17. Divergências

- layouts históricos: nenhuma divergência estrutural;
- identidade nominal: nenhuma ambiguidade crítica identificada;
- primeira persistência: concluída nos seis municípios;
- reexecução: falha estrutural explicada na paginação da reconciliação;
- divergências não explicadas: 0.

## 18. Limitações

O bloco não separa inserts/updates/skips na telemetria de persistência. A validação externa final e a segunda execução dos seis municípios foram interrompidas. A cobertura histórica existente no banco não deve ser expandida regionalmente antes do microbloco corretivo e da re-homologação.

## 19. Testes

- TypeScript: PASS antes da parada;
- testes determinísticos multiano/cliente/batch/auditoria: 17 PASS;
- ESLint do escopo implementado: PASS antes da parada;
- auditoria read-only do estado persistido: PASS;
- idempotência integrada: FAIL;
- build final: não executado após a parada obrigatória.

## 20. Arquivos alterados

```text
lib/territorios/tse-collector.ts
lib/territorios/tse-normalizer.ts
lib/territorios/tse-normalizer.test.ts
scripts/load-rmbh-tse-history-sample.ts
docs/RELATORIO_TERRITORIOS_BLOCO5_7_COMPLETUDE_HISTORICA_TSE.md
```

## 21. Conclusão

Os datasets e o modelo canônico suportam a completude histórica sem schema novo, e a primeira carga controlada produziu cobertura nominal e evidências nos seis municípios. Entretanto, a reexecução revelou defeito estrutural de idempotência em territórios com mais de 1.000 indicadores. Conforme a parada obrigatória, nenhuma correção foi feita dentro deste bloco.

## 22. Gate final

**BLOQUEADO**

É necessário autorizar um microbloco corretivo exclusivo para paginação/reconciliação do `persistIndicators`, testes >1.000 linhas, reexecução idempotente da amostra, validação externa e regressão 2024. Bloco 5.8, expansão MG, deploy e merge permanecem bloqueados.
