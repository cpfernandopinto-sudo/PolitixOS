# POLITIXOS TERRITÓRIOS — Bloco 5.4 — Homologação, cache e batch do Motor TSE

**Data:** 11/08/2026  
**Escopo:** Motor TSE municipal, sem UX, migration, n8n, deploy ou outros motores.  
**Amostra real:** Contagem, Belo Horizonte e Betim/MG — pleitos 2016, 2020 e 2024.

## 1. Estado inicial e gate de segurança

O trabalho começou em `main`, com worktree contendo muitas alterações locais de terceiros, sobretudo no módulo visual de Territórios. Os arquivos do Motor TSE do bloco anterior ainda estavam novos/não rastreados. Nenhum arquivo visual foi alterado, nenhum reset/stash/merge foi executado e a implementação ficou isolada em cliente, coletor, testes, script e documentação TSE.

```text
WORKTREE SEGURO:                     SIM, com isolamento estrito
ALTERAÇÕES DE TERCEIROS DETECTADAS:  SIM
RISCO DE CONFLITO:                   MÉDIO
PRs TSE ABERTOS:                     INCONCLUSIVO (GitHub indisponível no gate)
```

## 2. Arquitetura anterior

Cada chamada municipal executava cinco ciclos independentes de download, unzip e parsing:

```text
município
→ detalhe 2016 (download + unzip + parse)
→ detalhe 2020 (download + unzip + parse)
→ detalhe 2024 (download + unzip + parse)
→ candidatos 2024 (download + unzip + parse)
→ partidos 2024 (download + unzip + parse)
→ SELECT indicadores existentes
→ 1 INSERT/UPDATE por indicador
→ 1 UPSERT por evidência
→ collection_run apenas ao final
```

Para três municípios da mesma UF isso significaria conceitualmente 15 downloads, 15 unzips e 15 parsings. A persistência de Contagem fazia até 489 operações individuais de indicador após o SELECT.

## 3. Matriz auditada de arquivos

| Arquivo | Pleito | Tipo | URL oficial | Tamanho estimado/medido | Cacheável | Chave | TTL | Reutilizável | Risco |
|---|---:|---|---|---:|---|---|---|---|---|
| `detalhe_votacao_munzona_2016.zip` | 2016 | estadual dentro de ZIP nacional | CDN TSE `/detalhe_votacao_munzona/...` | parte dos 59,1 MB totais medidos | sim | `tse:detail:2016:MG` | 6 h | sim, MG inteira | baixo |
| `detalhe_votacao_munzona_2020.zip` | 2020 | idem | CDN TSE `/detalhe_votacao_munzona/...` | idem | sim | `tse:detail:2020:MG` | 6 h | sim | baixo |
| `detalhe_votacao_munzona_2024.zip` | 2024 | idem | CDN TSE `/detalhe_votacao_munzona/...` | idem | sim | `tse:detail:2024:MG` | 6 h | sim | baixo |
| `votacao_candidato_munzona_2024.zip` | 2024 | estadual dentro de ZIP nacional | CDN TSE `/votacao_candidato_munzona/...` | maior componente do conjunto | sim | `tse:candidate:2024:MG` | 6 h | sim | médio (volume) |
| `votacao_partido_munzona_2024.zip` | 2024 | estadual dentro de ZIP nacional | CDN TSE `/votacao_partido_munzona/...` | parte dos 59,1 MB totais medidos | sim | `tse:party:2024:MG` | 6 h | sim | baixo |

O tamanho combinado efetivamente baixado na homologação foi **59.098.996 bytes**. Não foi inventada divisão por arquivo onde a medição consolidada não forneceu esse detalhamento.

## 4. Arquitetura nova

```text
5 arquivos oficiais por UF/pleitos
→ cache de processo por promessa compartilhada
→ hash SHA-256 + metadados de download/expiração/tamanho
→ 1 unzip e 1 parse por arquivo
→ índice Map<CD_MUNICIPIO, rows[]>
→ municípios A/B/C em sequência conservadora
→ normalização isolada por código TSE
→ SELECT de chaves naturais por território
→ INSERT/UPDATE em chunks
→ evidências em upsert de chunk
→ collection_run RUNNING → COMPLETED/PARTIAL/FAILED
```

## 5. Cache

Foi adotado cache em memória de processo, sem Redis, banco ou infraestrutura nova. A entrada armazena uma `Promise`, portanto chamadas concorrentes com a mesma chave compartilham inclusive o download ainda em andamento. Falhas removem a entrada, permitindo nova tentativa explícita sem loop de retry.

Metadados preservados:

- chave determinística;
- SHA-256 do ZIP oficial;
- instante de download;
- expiração;
- bytes do ZIP;
- indicador de cache hit;
- URL e descritor oficial continuam sendo a origem de verdade.

O cache não sobrevive a cold start/restart. Essa limitação é intencional nesta fase: é seguro na arquitetura atual e deixa o contrato pronto para cache persistente futuro sem criar infraestrutura agora.

## 6. Parsing compartilhado

Cada CSV é parseado uma vez e indexado por `CD_MUNICIPIO`. A normalização recebe somente as linhas do município correspondente. Os testes confirmam que linhas de Contagem não entram em Belo Horizonte e vice-versa.

Na homologação de três municípios:

```text
downloads: 5 (não 15)
parses:    5 (não 15)
cache hits na segunda rodada: 5
tempo de parsing medido: 2.416 ms
```

## 7. Batch e tamanho dos chunks

`TSE_BATCH_SIZE = 100`, constante conservadora.

- novos indicadores: INSERT em arrays de até 100;
- indicadores existentes com valor/unidade diferentes: atualizações agrupadas em blocos de até 100, sem concorrência entre blocos;
- indicadores existentes equivalentes: zero write;
- evidências: UPSERT em arrays de até 100 usando a chave existente `territory_id,source_hash`;
- sem retry automático e sem loop infinito;
- erro de lote identifica seu tamanho e leva o município a `FAILED`, sem falso `COMPLETED`.

A chave natural de indicadores continua sendo respeitada pela busca existente. Não foi usado `onConflict` para indicadores porque o índice físico usa expressões com `COALESCE`, incompatíveis com a lista simples de colunas do PostgREST.

## 8. Persistência e idempotência

Contagens físicas antes e depois da rodada final:

| Município | Indicadores antes | Indicadores depois 1 | depois 2 | Evidências antes | depois 1 | depois 2 |
|---|---:|---:|---:|---:|---:|---:|
| Contagem | 489 | 489 | 489 | 5 | 5 | 5 |
| Belo Horizonte | 945 | 945 | 945 | 5 | 5 | 5 |
| Betim | 393 | 393 | 393 | 5 | 5 | 5 |

Total físico estável: **1.827 indicadores** e **15 evidências**. `collection_runs` cresceu uma linha por território e execução, como histórico observável por design.

## 9. Collection runs e transação lógica

Cada município cria uma linha `running` antes de normalizar/persistir. Ao final, a mesma linha vira:

- `completed`: todas as fontes/etapas concluídas;
- `partial`: uma série anual secundária falhou e o erro ficou registrado;
- `failed`: exceção de mapeamento, banco, persistência ou fonte impede conclusão.

O resumo inclui códigos IBGE/TSE, anos, datasets, contagens e métricas. Não existe falso `completed`: qualquer exceção após a abertura do run tenta registrar `failed` antes de propagar o erro.

## 10. Teste real multimunicípio

| Município | IBGE | TSE resolvido pelo motor | Totais históricos | Indicadores físicos | Evidências |
|---|---|---|---:|---:|---:|
| Contagem | `3118601` | `43710` | 8 | 489 | 5 |
| Belo Horizonte | `3106200` | `41238` | 8 | 945 | 5 |
| Betim | `3106705` | `41335` | 6 | 393 | 5 |

Foram usados 2016, 2020 e 2024. O recorte comparável do Caderno permanece eleições municipais, Prefeito, primeiro turno; candidato/partido de 2024 também alimenta o contrato já homologado, sem transformar campos DEMO não cobertos em REAL.

## 11. Métricas finais

Rodada final sobre dados já persistidos, dentro do mesmo processo:

| Métrica | Primeira passagem | Segunda passagem |
|---|---:|---:|
| downloads acumulados | 5 | 5 |
| cache hits acumulados | 0 | 5 |
| parses acumulados | 5 | 5 |
| tempo total | 9.684 ms | 5.138 ms |
| tempo médio por município (pipeline total / 3) | 3.228 ms | 1.713 ms |
| writes de indicadores | 0 | 0 |
| evidências processadas por upsert | 15 | 15 |
| erros | 0 | 0 |
| retries | 0 | 0 |

Na primeira carga real que introduziu Belo Horizonte e Betim, foram persistidos 945 e 393 indicadores respectivamente, em 10 e 4 chunks; Contagem já existente foi reconciliada. Não existe baseline cronometrado do código antigo para três municípios, portanto nenhum ganho percentual histórico é alegado.

## 12. Testes e regressão

Testes adicionados cobrem:

- chave de cache por dataset/ano/UF;
- compartilhamento de promessa/download/parse;
- hash e metadados;
- remoção segura de cache após falha;
- chunk completo e último lote menor;
- isolamento de dados por município;
- contrato REAL/DERIVADO/DEMO existente.

Resultados:

```text
Motor/territórios/API: 14 arquivos, 109 testes, 109 aprovados
TSE focado:            6 arquivos, 15 testes, 15 aprovados
TypeScript:            OK
ESLint do escopo TSE:  OK
git diff --check:      OK
Next.js build:         OK
```

## 13. Riscos e limitações

1. O cache é de processo; cold starts voltam a baixar os cinco arquivos.
2. A rota HTTP existente continua single-município. O batch controlado está exposto como função interna e script de homologação, evitando ampliar prematuramente a superfície pública.
3. A evidência usa upsert em lote e permanece uma operação por lote mesmo quando idêntica; não duplica fisicamente.
4. Updates realmente divergentes ainda exigem updates condicionais via PostgREST; não foi criada RPC/migration.
5. O ZIP de candidatos é volumoso; expansão longa deve observar memória do runtime. Não houve leitura confiável de RSS isolado nesta execução, portanto memória não foi inventada.
6. O GitHub estava indisponível durante a consulta de PRs; o histórico local não mostrou merge novo do Motor TSE após o bloco anterior.
7. O changelog online do Supabase não ficou acessível por DNS no ambiente. A implementação evitou API nova: usa somente `select`, `insert`, `update` e `upsert` já presentes e homologados no repositório.

## 14. Arquivos alterados

```text
lib/territorios/tse-client.ts
lib/territorios/tse-collector.ts
lib/territorios/tse-client.test.ts
lib/territorios/tse-batch.test.ts
scripts/homologate-tse-multimunicipality.ts
docs/RELATORIO_TERRITORIOS_BLOCO5_4_TSE_CACHE_BATCH.md
```

## 15. Gate final e recomendação RMBH

O motor está seguro para uma carga **RMBH controlada**, executada por um processo único e com monitoramento de duração/memória. Recomenda-se, no próximo bloco autorizado, criar um comando operacional RMBH que reutilize `runTseMultiCollection`, limite a quantidade de municípios por chamada e gere checkpoint/resumo; não rodar MG inteira nem iniciar outro motor antes dessa validação regional.

Não houve alteração de schema, migration, n8n, UX, outros motores, deploy ou merge.
