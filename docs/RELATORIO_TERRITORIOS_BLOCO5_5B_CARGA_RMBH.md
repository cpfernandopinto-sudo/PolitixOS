# POLITIXOS TERRITÓRIOS — Bloco 5.5B — Carga controlada da RMBH

**Data:** 11/08/2026

**Escopo:** carga TSE real e controlada dos 34 municípios canônicos da RMBH, com checkpoint, resume, observabilidade e idempotência.

## 1. Baseline e gates

Foi reutilizado sem reinterpretação o registro `RMBH`, versão `LCP-MG-89-2006-art-2`, homologado no Bloco 5.5A. Antes da execução foram confirmados: 34 municípios, códigos IBGE únicos, Belo Horizonte e Contagem presentes, todos em MG e nenhum externo. O campo bruto `metadata.rmbh` da Segurança não participou da seleção e não foi alterado.

O worktree continha alterações preexistentes de terceiros. Este bloco ficou isolado em executor, testes, scripts e documentação; não houve reset, schema, migration, UX, n8n, deploy ou merge.

## 2. Arquitetura utilizada

```text
regional-registry.ts (RMBH/34)
→ gate territorial estrito
→ executor regional único e sequencial (concorrência máxima 1)
→ runTseCollection homologado, pleitos 2016/2020/2024
→ cache de processo por dataset+ano+UF, TTL 6h e SHA-256
→ parsing compartilhado
→ persistência existente em batches de 100
→ collection run por município
→ checkpoint JSON atômico após cada município
```

Não foi criado pipeline TSE paralelo nem alterado o Motor TSE. O checkpoint fica fora do banco, com permissão `0600`, escrita em arquivo temporário seguida de rename atômico. Ele registra run, região/versão, inventário, estados, pleitos, contagens, erros, duração e timestamps. Nenhum subprocesso foi criado.

## 3. Checkpoint e resume real

Checkpoint operacional: `/private/tmp/politixos-rmbh-5_5b-checkpoint.json`.

Primeira execução interrompida de forma controlada após dois municípios:

- Baldim: `COMPLETED`;
- Belo Horizonte: `COMPLETED`;
- 32 municípios: `PENDING`.

A retomada usou o mesmo `runId` e checkpoint, ignorou os dois `COMPLETED` e começou em Betim. Terminou com 34 `COMPLETED`. O resume foi, portanto, testado com persistência e fontes reais, não apenas por simulação unitária.

O cache é de processo. Por isso, a retomada em novo processo fez novamente os cinco downloads; dentro de cada processo, todos os municípios seguintes reutilizaram os mesmos recursos.

## 4. Resultado por município

As contagens abaixo são operações de indicadores efetivamente inseridos/atualizados na primeira carga regional; evidências são itens processados por `upsert`.

| Município | IBGE | Status | Pleitos | Indicadores processados | Evidências | Erros | Duração aprox. |
|---|---|---|---|---:|---:|---|---:|
| Baldim | 3105004 | COMPLETED | 2016/2020/2024 | 119 | 5 | 0 | 3,33 s |
| Belo Horizonte | 3106200 | COMPLETED | 2016/2020/2024 | 0 | 5 | 0 | 1,91 s |
| Betim | 3106705 | COMPLETED | 2016/2020/2024 | 0 | 5 | 0 | 1,42 s |
| Brumadinho | 3109006 | COMPLETED | 2016/2020/2024 | 252 | 5 | 0 | 2,73 s |
| Caeté | 3110004 | COMPLETED | 2016/2020/2024 | 270 | 5 | 0 | 2,12 s |
| Capim Branco | 3112505 | COMPLETED | 2016/2020/2024 | 126 | 5 | 0 | 1,61 s |
| Confins | 3117876 | COMPLETED | 2016/2020/2024 | 136 | 5 | 0 | 2,12 s |
| Contagem | 3118601 | COMPLETED | 2016/2020/2024 | 0 | 5 | 0 | 1,85 s |
| Esmeraldas | 3124104 | COMPLETED | 2016/2020/2024 | 270 | 5 | 0 | 2,33 s |
| Florestal | 3126000 | COMPLETED | 2016/2020/2024 | 109 | 5 | 0 | 1,71 s |
| Ibirité | 3129806 | COMPLETED | 2016/2020/2024 | 289 | 5 | 0 | 2,11 s |
| Igarapé | 3130101 | COMPLETED | 2016/2020/2024 | 223 | 5 | 0 | 1,96 s |
| Itaguara | 3132206 | COMPLETED | 2016/2020/2024 | 162 | 5 | 0 | 1,71 s |
| Itatiaiuçu | 3133709 | COMPLETED | 2016/2020/2024 | 139 | 5 | 0 | 1,62 s |
| Jaboticatubas | 3134608 | COMPLETED | 2016/2020/2024 | 164 | 5 | 0 | 1,61 s |
| Juatuba | 3136652 | COMPLETED | 2016/2020/2024 | 171 | 5 | 0 | 1,90 s |
| Lagoa Santa | 3137601 | COMPLETED | 2016/2020/2024 | 272 | 5 | 0 | 2,04 s |
| Mário Campos | 3140159 | COMPLETED | 2016/2020/2024 | 127 | 5 | 0 | 2,22 s |
| Mateus Leme | 3140704 | COMPLETED | 2016/2020/2024 | 217 | 5 | 0 | 2,10 s |
| Matozinhos | 3141108 | COMPLETED | 2016/2020/2024 | 202 | 5 | 0 | 1,98 s |
| Nova Lima | 3144805 | COMPLETED | 2016/2020/2024 | 268 | 5 | 0 | 2,18 s |
| Nova União | 3136603 | COMPLETED | 2016/2020/2024 | 122 | 5 | 0 | 1,57 s |
| Pedro Leopoldo | 3149309 | COMPLETED | 2016/2020/2024 | 183 | 5 | 0 | 1,81 s |
| Raposos | 3153905 | COMPLETED | 2016/2020/2024 | 258 | 5 | 0 | 2,04 s |
| Ribeirão das Neves | 3154606 | COMPLETED | 2016/2020/2024 | 313 | 5 | 0 | 2,52 s |
| Rio Acima | 3154804 | COMPLETED | 2016/2020/2024 | 153 | 5 | 0 | 1,80 s |
| Rio Manso | 3155306 | COMPLETED | 2016/2020/2024 | 115 | 5 | 0 | 1,78 s |
| Sabará | 3156700 | COMPLETED | 2016/2020/2024 | 310 | 5 | 0 | 2,63 s |
| Santa Luzia | 3157807 | COMPLETED | 2016/2020/2024 | 456 | 5 | 0 | 2,97 s |
| São Joaquim de Bicas | 3162922 | COMPLETED | 2016/2020/2024 | 258 | 5 | 0 | 1,98 s |
| São José da Lapa | 3162955 | COMPLETED | 2016/2020/2024 | 219 | 5 | 0 | 2,05 s |
| Sarzedo | 3165537 | COMPLETED | 2016/2020/2024 | 223 | 5 | 0 | 2,07 s |
| Taquaraçu de Minas | 3168309 | COMPLETED | 2016/2020/2024 | 95 | 5 | 0 | 1,39 s |
| Vespasiano | 3171204 | COMPLETED | 2016/2020/2024 | 315 | 5 | 0 | 2,34 s |

Soma: `COMPLETED 34 + PARTIAL 0 + FAILED 0 + PENDING 0 = 34`.

## 5. Métricas da carga inicial com interrupção e retomada

| Métrica | Valor |
|---|---:|
| Tempo efetivo dos dois processos | 98,975 s |
| Tempo médio por município | 2,044 s |
| Downloads | 10 (5 antes + 5 após restart) |
| Cache hits | 160 |
| Parses | 10 |
| Bytes baixados | 118.197.992 |
| Indicadores processados/escritos | 6.536 |
| Evidências processadas por upsert | 170 |
| Erros | 0 |
| Retries | 0 |
| Concorrência máxima | 1 |
| Processos órfãos | 0 |

Memória RSS, amostrada no início, após cada município e no fim:

| Métrica | Valor |
|---|---:|
| Inicial | 120.176.640 bytes (114,61 MiB) |
| Média das amostras combinadas | 130.712.846 bytes (124,66 MiB) |
| Pico | 268.582.912 bytes (256,14 MiB) |
| Final | 38.993.920 bytes (37,19 MiB) |

Os valores representam RSS do processo Node e não uma medição contínua entre amostras.

## 6. Idempotência regional

Uma segunda execução completa, com novo checkpoint e os mesmos 34 municípios, produziu:

- 0 indicadores inseridos ou atualizados em todos os municípios;
- 170 evidências reconciliadas por `upsert`;
- 0 duplicações físicas de indicador por chave natural;
- 0 duplicações físicas de evidência por `territory_id + source_hash`;
- 0 runs deixados como `running`;
- 34 novos collection runs concluídos, preservando o histórico de execução por design.

Inventário físico final do recorte RMBH/TSE: 8.363 indicadores e 170 evidências.

## 7. Sanity checks

| Município | IBGE | Indicadores físicos | Evidências físicas | Pleitos | Resultado |
|---|---|---:|---:|---|---|
| Contagem | 3118601 | 489 | 5 | 2016/2020/2024 | PASS |
| Belo Horizonte | 3106200 | 945 | 5 | 2016/2020/2024 | PASS |
| Betim | 3106705 | 393 | 5 | 2016/2020/2024 | PASS |

## 8. Limitações e decisão

O checkpoint é durável no filesystem do executor, mas não é distribuído entre hosts e deve ser preservado externamente em ambientes efêmeros. O cache continua sendo de processo; um restart exige cinco novos downloads. Essas limitações são explícitas e não exigiram schema ou dependência nova.

A carga regional controlada foi concluída e homologada. O próximo passo recomendado é auditoria humana deste relatório e dos dados regionais antes de desenhar qualquer expansão. Nenhuma expansão é iniciada aqui.

## 9. Arquivos do Bloco 5.5B

```text
lib/territorios/regional-load-runner.ts
lib/territorios/regional-load-runner.test.ts
scripts/load-rmbh-tse-controlled.ts
scripts/validate-rmbh-tse-load.ts
docs/RELATORIO_TERRITORIOS_BLOCO5_5B_CARGA_RMBH.md
```
