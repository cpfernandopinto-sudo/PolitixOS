# PolitixOS — Territórios — Bloco 5.7A

## Correção de idempotência e reconciliação TSE acima de 1.000 indicadores

Data da homologação: 12/08/2026  
Escopo: correção exclusiva de `persistIndicators`, sem alteração de schema, natural key, semântica eleitoral, frontend, UX, n8n ou outros motores.

## 1. Baseline 5.7

O baseline obrigatório foi lido integralmente em `docs/RELATORIO_TERRITORIOS_BLOCO5_7_COMPLETUDE_HISTORICA_TSE.md`. A primeira carga histórica de 2016, 2020 e 2024 estava íntegra. A segunda execução falhava em territórios com mais de 1.000 indicadores, começando por Contagem, com violação de `uq_territory_indicators_natural_key`.

Nenhum dado histórico foi apagado ou refeito.

## 2. Causa raiz

O `select` que construía o inventário existente em `persistIndicators` não possuía paginação. O PostgREST retornava somente as primeiras 1.000 linhas. Contagem possuía 1.838 indicadores TSE; portanto, chaves da segunda página não entravam no mapa de reconciliação e eram classificadas incorretamente como inserts.

Log de confirmação anterior à correção:

```text
CAUSA CONFIRMADA: SIM
LINHAS TSE CONTAGEM: 1838
LIMITE OBSERVADO: 1000
NATURAL KEY ÍNTEGRA: SIM
```

A causa estava exclusivamente na leitura truncada do inventário. A natural key permaneceu correta e inalterada.

## 3. Alteração aplicada

Foi implementada a opção A: paginação completa e determinística do inventário existente.

- páginas explícitas de 1.000 linhas com `range(start, end)`;
- leitura até uma página menor que o limite;
- mapa de reconciliação construído somente após reunir o inventário completo;
- classificação explícita em insert, update e skip;
- inserts e updates persistidos nos lotes existentes de 100;
- erros de integridade continuam sendo propagados;
- nenhuma estratégia de captura e supressão de duplicidade foi usada.

A telemetria do resultado passou a expor, localmente no contrato do coletor, `existingRead`, `pagesRead`, `inserts`, `updates` e `skips`.

## 4. Estratégia de paginação e lotes

Para um inventário de tamanho `N`, a leitura solicita intervalos inclusivos `0–999`, `1000–1999` e assim sucessivamente. Mesmo quando `N` é múltiplo exato de 1.000, a página vazia seguinte encerra a leitura sem ambiguidade. Isso elimina qualquer limite implícito e garante que chaves após a posição 1.000 sejam reconciliadas.

As gravações preservam `TSE_BATCH_SIZE = 100`. Não houve alteração de schema, índice ou natural key.

## 5. Testes acima de 1.000 linhas

O teste determinístico `lib/territorios/tse-reconciliation.test.ts` cobre:

| Inventário | Resultado | Páginas |
|---:|---|---:|
| 999 | PASS | 1 |
| 1.000 | PASS | 2 |
| 1.001 | PASS | 2 |
| 1.201 (1200+) | PASS | 2 |

No cenário de 1.201 linhas, o teste também confirmou:

- chave existente na posição 1.100 classificada como skip;
- chave existente na posição 1.050 com valor alterado classificada como update;
- chave nova classificada como insert;
- nenhuma chave existente após 1.000 classificada como insert.

## 6. Amostra reexecutada

A mesma amostra homologada no 5.7 foi executada duas vezes para os pleitos de 2016, 2020 e 2024:

- Contagem — 3118601;
- Belo Horizonte — 3106200;
- Betim — 3106705;
- Nova Lima — 3144805;
- Ribeirão das Neves — 3154606;
- Taquaraçu de Minas — 3168309.

Inventário global antes e depois: **9.330 indicadores e 54 evidências**.

## 7. Primeira reexecução

| Município | Indicadores antes/depois | Páginas | Inserts | Updates | Skips | Duplicações | Erros | Retries | Evidências antes/depois |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Contagem | 1.838 / 1.838 | 2 | 0 | 0 | 1.838 | 0 | 0 | 0 | 9 / 9 |
| Belo Horizonte | 3.826 / 3.826 | 4 | 0 | 0 | 3.826 | 0 | 0 | 0 | 9 / 9 |
| Betim | 1.575 / 1.575 | 2 | 0 | 0 | 1.575 | 0 | 0 | 0 | 9 / 9 |
| Nova Lima | 717 / 717 | 1 | 0 | 0 | 717 | 0 | 0 | 0 | 9 / 9 |
| Ribeirão das Neves | 1.122 / 1.122 | 2 | 0 | 0 | 1.122 | 0 | 0 | 0 | 9 / 9 |
| Taquaraçu de Minas | 252 / 252 | 1 | 0 | 0 | 252 | 0 | 0 | 0 | 9 / 9 |

Resultado: 6 `completed`, 0 `failed`, 0 operação de persistência e nenhuma variação física.

## 8. Segunda reexecução

A segunda reexecução produziu exatamente os mesmos números da primeira: 6 `completed`, 0 `failed`, 0 insert, 0 update, 9.330 skips, 0 duplicação, 0 erro, 0 retry e nenhuma variação nas 54 evidências.

## 9. Idempotência

**PASS.** A reconciliação leu todas as páginas em ambas as execuções. O inventário físico permaneceu em 9.330 indicadores e 54 evidências. Nenhuma operação de escrita de indicador foi necessária.

## 10. Duplicações e integridade

Auditoria read-only após a segunda execução:

| Verificação | Resultado |
|---|---:|
| Duplicação por natural key | 0 |
| Candidato duplicado indevidamente | 0 |
| Partido duplicado indevidamente | 0 |
| Evidência duplicada | 0 |
| Collection run `running` órfão | 0 |
| `territory_id` da amostra | PASS |
| Anos 2016/2020/2024 | PASS |
| `source_dataset` esperado | PASS |
| `source_hash` recalculado | PASS |

## 11. Regressão 2024

Nova leitura independente dos arquivos oficiais do TSE foi comparada com o banco.

| Município | Eleitorado | Comparecimento | Abstenção | Válidos | Vencedor / segundo | Margem votos | Margem p.p. | Partido e status | Resultado |
|---|---:|---:|---:|---:|---|---:|---:|---|---|
| Contagem | 459.110 | 352.354 | 106.756 | 310.076 | MARÍLIA / JUNIO AMARAL | 67.452 | 21,753377 | PT, ELEITO, 1º turno | PASS |
| Belo Horizonte | 1.992.984 | 1.356.232 | 636.752 | 1.248.111 | FUAD NOMAN / BRUNO ENGLER | 93.037 | 7,454225 | PSD, ELEITO, 2º turno | PASS |
| Betim | 297.070 | 239.200 | 57.870 | 206.941 | HERON GUIMARAES / DR.VINICIUS | 29.461 | 14,236425 | UNIÃO, ELEITO, 1º turno | PASS |

Todos os valores do banco coincidiram exatamente com a nova normalização da fonte oficial. A correção não alterou 2024.

## 12. Validação histórica 2016/2020

Os desfechos persistidos foram comparados com nova leitura e normalização dos arquivos oficiais TSE.

| Município/ano | Vencedor / segundo | Votos | Margem votos | Margem p.p. | Partido / turno | Resultado |
|---|---|---|---:|---:|---|---|
| Contagem 2016 | ALEX DE FREITAS / CARLIN MOURA | 223.902 / 82.986 | 140.916 | 45,917729 | PSDB / 2º | PASS |
| Contagem 2020 | MARÍLIA / FELIPE SALIBA | 147.768 / 139.987 | 7.781 | 2,704036 | PT / 2º | PASS |
| Belo Horizonte 2016 | KALIL / JOÃO LEITE | 628.050 / 557.356 | 70.694 | 5,963695 | PHS / 2º | PASS |
| Belo Horizonte 2020 | KALIL / BRUNO ENGLER | 784.307 / 123.215 | 661.092 | 53,410182 | PSD / 1º | PASS |
| Betim 2016 | VITTORIO MEDIOLI / IVAIR NOGUEIRA | 119.750 / 30.001 | 89.749 | 46,198788 | PHS / 1º | PASS |
| Betim 2020 | VITTORIO MEDIOLI / MARIA DO CARMO | 153.144 / 28.906 | 124.238 | 61,934127 | PSD / 1º | PASS |

Os seis vencedores possuem status oficial `ELEITO` validado. Não houve divergência a registrar.

## 13. Evidências

- 54 evidências TSE na amostra, sem crescimento entre execuções;
- 0 duplicação por `territory_id + source_hash`;
- hashes recalculados e íntegros;
- URLs, datasets e referências brutas preservados;
- 36 referências históricas de 2016/2020 no inventário total, considerando os três datasets oficiais por pleito e município.

## 14. Testes e verificações

- confirmação empírica do limite: PASS;
- testes 999/1000/1001/1201: PASS;
- reconciliação insert/update/skip após posição 1.000: PASS;
- amostra controlada, primeira e segunda execução: PASS;
- auditoria read-only de integridade: PASS;
- regressão externa 2024: PASS;
- validação externa histórica 2016/2020: PASS;
- `npx tsc --noEmit`: PASS;
- 9 arquivos de teste TSE/territoriais, 33 testes: PASS;
- ESLint nos cinco arquivos do microbloco: PASS, sem warnings;
- `npm run build` com Next.js 16.2.6/Turbopack: PASS.

## 15. Arquivos alterados no microbloco

- `lib/territorios/tse-collector.ts`;
- `lib/territorios/tse-reconciliation.test.ts`;
- `scripts/load-rmbh-tse-history-sample.ts`;
- `scripts/audit-rmbh-tse-57a.ts`;
- `docs/RELATORIO_TERRITORIOS_BLOCO5_7A_CORRECAO_IDEMPOTENCIA_TSE.md`.

## 16. Limitações

- a homologação foi deliberadamente limitada à amostra de seis municípios e aos pleitos 2016/2020/2024;
- não houve expansão para Minas Gerais;
- o escopo não altera a forma de obtenção nem a semântica dos dados eleitorais;
- o script de auditoria é read-only e depende de acesso ao Supabase e aos arquivos oficiais do TSE.

## 17. Gate final

O microbloco está homologado: causa confirmada, paginação completa, reconciliação determinística, idempotência em duas execuções, integridade sem duplicações, regressão 2024 e validação histórica oficial aprovadas. Nenhuma trava absoluta foi violada.
