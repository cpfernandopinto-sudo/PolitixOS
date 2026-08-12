# PolitixOS — Territórios — Bloco 5.8

## Camada analítica eleitoral territorial

Data: 12/08/2026  
Gate: **HOMOLOGADO**

## 1. Objetivo e baseline

Foi construída uma camada analítica read-only, tipada, pura e determinística sobre o inventário TSE homologado no Bloco 5.7A. Foram lidos integralmente os relatórios 5.5A, 5.5B, 5.6, 5.7 e 5.7A. A amostra permaneceu restrita a Contagem, Belo Horizonte, Betim, Nova Lima, Ribeirão das Neves e Taquaraçu de Minas, nos pleitos 2016, 2020 e 2024.

O baseline físico foi preservado: 9.330 indicadores e 54 evidências, sem inserts, updates ou deletes.

## 2. Inventário analítico encontrado

| Classe | Métricas/dimensões encontradas | Dataset |
|---|---|---|
| A — oficial direta | eleitorado, comparecimento, abstenção, votos válidos, brancos e nulos | `detalhe_votacao_munzona_{ano}` |
| B — dimensão | território, ano, turno, cargo, candidato, partido, status oficial | metadados das linhas canônicas |
| C — resultado eleitoral | votos nominais de candidato e totais partidários | `votacao_candidato_munzona_{ano}`, `votacao_partido_munzona_{ano}` |
| D — derivável | taxas, vencedor/segundo, margens, evolução, histórico partidário e benchmark da amostra | composição determinística de A–C |
| E — não utilizado | ideologia, polarização, alinhamento político e categorias excepcionais não modeladas | fora do escopo |

Cada linha oferece `indicador` como metric key, valor, unidade, período, território, dataset, identificador de origem e metadados. As evidências são vinculadas por dataset e território e preservam `source_hash`.

## 3. Arquitetura e contrato

O domínio foi implementado em `lib/territorios/electoral-analytics.ts`, sem alterar o repositório de apresentação existente. O contrato `ElectionTerritoryAnalysis` contém:

- território e três eleições ordenadas;
- eleição mais recente;
- evolução histórica;
- participação e competição quantitativas;
- histórico partidário e de vencedores;
- contagem de turnos decisivos;
- proveniência consolidada.

`ElectionTerritoryYearAnalysis` preserva ausência como `null`. Não foi criada classificação subjetiva de competitividade. `ElectoralSampleBenchmark` usa explicitamente o rótulo **“amostra homologada de seis municípios”**.

## 4. Fórmulas e consistência

- taxa de comparecimento = comparecimento ÷ eleitorado × 100;
- taxa de abstenção = abstenção ÷ eleitorado × 100;
- margem absoluta = votos do vencedor − votos do segundo;
- margem em p.p. = percentual oficial derivado do vencedor − percentual do segundo;
- evolução = valor do pleito atual − valor do pleito anterior;
- mudança partidária/de vencedor = transição entre valores consecutivos disponíveis;
- médias do benchmark = média aritmética somente dos valores não nulos da amostra.

A identidade `comparecimento + abstenção = eleitorado` foi verificada nos 18 município/pleito e passou em todos. Não foi imposta a identidade universal envolvendo válidos, brancos e nulos, preservando a ressalva das categorias excepcionais do TSE registrada no 5.6.

## 5. Ausência e proveniência

Ausência nunca vira zero. Valor, denominador, vencedor, segundo, margem e identidade incompletos retornam `null`. Divisão por denominador zero também retorna `null`.

Cada resultado mantém território, pleito, metric keys de origem, datasets ordenados e hashes das evidências correspondentes. Nenhuma evidência foi duplicada e nenhuma fonte fictícia foi criada.

## 6. Matriz homologada dos seis municípios

Taxas são apresentadas em percentual e margens em pontos percentuais.

| Município | Ano | Eleitorado | Comparecimento | Abstenção | Taxa comp. | Válidos | Vencedor (partido) | Segundo (partido) | Votos | Margem | p.p. | Turno | Status |
|---|---:|---:|---:|---:|---:|---:|---|---|---|---:|---:|---:|---|
| Belo Horizonte | 2016 | 1.927.456 | 1.488.488 | 438.968 | 77,226 | 1.185.406 | KALIL (PHS) | JOÃO LEITE (PSDB) | 628.050/557.356 | 70.694 | 5,964 | 2 | ELEITO |
| Belo Horizonte | 2020 | 1.943.184 | 1.392.551 | 550.633 | 71,663 | 1.237.764 | KALIL (PSD) | BRUNO ENGLER (PRTB) | 784.307/123.215 | 661.092 | 53,410 | 1 | ELEITO |
| Belo Horizonte | 2024 | 1.992.984 | 1.356.232 | 636.752 | 68,050 | 1.248.111 | FUAD NOMAN (PSD) | BRUNO ENGLER (PL) | 670.574/577.537 | 93.037 | 7,454 | 2 | ELEITO |
| Betim | 2016 | 278.233 | 236.007 | 42.226 | 84,824 | 194.267 | VITTORIO MEDIOLI (PHS) | IVAIR NOGUEIRA (PMDB) | 119.750/30.001 | 89.749 | 46,199 | 1 | ELEITO |
| Betim | 2020 | 274.502 | 229.695 | 44.807 | 83,677 | 200.597 | VITTORIO MEDIOLI (PSD) | MARIA DO CARMO (PT) | 153.144/28.906 | 124.238 | 61,934 | 1 | ELEITO |
| Betim | 2024 | 297.070 | 239.200 | 57.870 | 80,520 | 206.941 | HERON GUIMARAES (UNIÃO) | DR.VINICIUS (PV) | 108.557/79.096 | 29.461 | 14,236 | 1 | ELEITO |
| Contagem | 2016 | 456.931 | 361.858 | 95.073 | 79,193 | 306.888 | ALEX DE FREITAS (PSDB) | CARLIN MOURA (PC do B) | 223.902/82.986 | 140.916 | 45,918 | 2 | ELEITO |
| Contagem | 2020 | 427.575 | 329.489 | 98.086 | 77,060 | 287.755 | MARÍLIA (PT) | FELIPE SALIBA (DEM) | 147.768/139.987 | 7.781 | 2,704 | 2 | ELEITO |
| Contagem | 2024 | 459.110 | 352.354 | 106.756 | 76,747 | 310.076 | MARÍLIA (PT) | JUNIO AMARAL (PL) | 188.228/120.776 | 67.452 | 21,753 | 1 | ELEITO |
| Nova Lima | 2016 | 67.756 | 57.510 | 10.246 | 84,878 | 47.769 | VITOR PENIDO (DEM) | JACONIAS (PRB) | 33.414/12.475 | 20.939 | 43,834 | 1 | ELEITO |
| Nova Lima | 2020 | 73.621 | 58.479 | 15.142 | 79,432 | 43.190 | JOÃO MARCELO (CIDADANIA) | WESLEY DE JESUS (DEM) | 20.077/13.716 | 6.361 | 14,728 | 1 | ELEITO |
| Nova Lima | 2024 | 74.380 | 61.088 | 13.292 | 82,130 | 55.283 | JOÃO MARCELO (CIDADANIA) | GILSON AMORIM (REPUBLICANOS) | 47.321/4.626 | 42.695 | 77,230 | 1 | ELEITO |
| Ribeirão das Neves | 2016 | 196.133 | 160.709 | 35.424 | 81,939 | 125.576 | JUNYNHO MARTINS (PSC) | ANTONIO CARLOS CANTOR (PPS) | 68.656/39.167 | 29.489 | 23,483 | 1 | ELEITO |
| Ribeirão das Neves | 2020 | 214.845 | 165.873 | 48.972 | 77,206 | 134.015 | JUNYNHO MARTINS (DEM) | DELEI (REPUBLICANOS) | 72.679/35.398 | 37.281 | 27,819 | 1 | ELEITO |
| Ribeirão das Neves | 2024 | 213.114 | 164.886 | 48.228 | 77,370 | 133.268 | TÚLIO (PP) | VICENTE MENDONCA (PT) | 108.757/17.405 | 91.352 | 68,548 | 1 | ELEITO |
| Taquaraçu de Minas | 2016 | 4.479 | 3.914 | 565 | 87,386 | 3.669 | CIDINHO (PSC) | MARCILIO BEZERRA (SD) | 1.645/1.460 | 185 | 5,042 | 1 | ELEITO |
| Taquaraçu de Minas | 2020 | 4.666 | 3.958 | 708 | 84,826 | 3.783 | MARCILIO BEZERRA (PSD) | CIDINHO (PSC) | 2.053/1.578 | 475 | 12,556 | 1 | ELEITO |
| Taquaraçu de Minas | 2024 | 5.877 | 4.924 | 953 | 83,784 | 4.668 | MARCILIO BEZERRA (PP) | CLARTON DE ANACLETO (PL) | 3.695/973 | 2.722 | 58,312 | 1 | ELEITO |

Todas as 18 linhas possuem proveniência programática.

## 7. Evolução e histórico partidário

As séries preservam os valores de 2016 → 2020 → 2024 e calculam deltas absolutos/percentuais entre pleitos. Sequências partidárias:

- Belo Horizonte: PHS → PSD → PSD (1 mudança);
- Betim: PHS → PSD → UNIÃO (2 mudanças);
- Contagem: PSDB → PT → PT (1 mudança);
- Nova Lima: DEM → CIDADANIA → CIDADANIA (1 mudança);
- Ribeirão das Neves: PSC → DEM → PP (2 mudanças);
- Taquaraçu de Minas: PSC → PSD → PP (2 mudanças).

Não foram produzidas inferências ideológicas ou subjetivas.

## 8. Benchmark da amostra

| Ano | Comparecimento médio | Abstenção média | Margem média p.p. | Eleitorado médio | Válidos médios |
|---:|---:|---:|---:|---:|---:|
| 2016 | 82,574% | 17,426% | 28,407 | 488.498 | 310.595,83 |
| 2020 | 78,978% | 21,022% | 28,858 | 489.732,17 | 317.850,67 |
| 2024 | 78,100% | 21,900% | 41,256 | 507.089,17 | 326.391,17 |

Esses valores são exclusivamente a média da amostra homologada, não “média RMBH”.

## 9. Validações de regressão

Contagem, Belo Horizonte e Betim em 2024 coincidiram integralmente com o 5.7A em eleitorado, comparecimento, abstenção, válidos, vencedor, segundo, votos, partidos, margem, turno e status. As seis validações históricas obrigatórias de 2016/2020 também coincidiram integralmente. Resultado: **PASS**.

## 10. Testes

Os testes determinísticos cobrem taxas de comparecimento/abstenção, margens, vencedor/segundo, turno, histórico partidário e temporal, benchmark, ausência, proveniência, não mutação, determinismo, identidade matemática, denominador ausente/zero e regressão Contagem 2024.

Resultado final: 10 arquivos de teste relacionados, 40 testes, todos PASS.

## 11. Idempotência, inventário e performance

As duas execuções geraram o mesmo SHA-256:

`bf3024b959b7946785d47e3b6dcc09d1bc56e37c3af1aad4f9b3d60ae6962bd9`

Cada execução produziu seis territórios e 18 eleições. Inventário antes/depois: 9.330/9.330 indicadores e 54/54 evidências; mutações: 0.

Medição total, incluindo leituras paginadas antes e depois: 11.985,91 ms. A primeira transformação dos seis municípios consumiu aproximadamente 12,01 ms; a segunda, 6,96 ms. Memória RSS: inicial 116.310.016 bytes, média 115.720.192, pico 121.520.128 e final 116.932.608. Não foi identificado N+1 na transformação; as duas leituras completas são deliberadas para provar não mutação.

## 12. Limitações

- somente seis municípios e três pleitos;
- nenhuma classificação qualitativa de competitividade;
- médias simples, não ponderadas, explicitamente restritas à amostra;
- ausência depende da cobertura física do inventário;
- nenhuma UI foi criada;
- nenhuma categoria excepcional de votos foi reinterpretada.

## 13. Arquivos alterados

- `lib/territorios/electoral-analytics.ts`;
- `lib/territorios/electoral-analytics.test.ts`;
- `scripts/audit-rmbh-electoral-analytics.ts`;
- `docs/RELATORIO_TERRITORIOS_BLOCO5_8_CAMADA_ANALITICA_ELEITORAL.md`.

Nenhum arquivo do Motor TSE, persistência, registro regional, Segurança, frontend, fixture, schema, migration ou n8n foi alterado pelo 5.8.

## 14. Qualidade e gate

- `npx tsc --noEmit`: PASS;
- testes relacionados: PASS — 10 arquivos, 40 testes;
- ESLint no escopo alterado: PASS, sem warnings;
- `npm run build`: PASS — Next.js 16.2.6/Turbopack.

O gate está aprovado: camada tipada, proveniência, ausência, evolução, histórico, benchmark, consistência, validações e idempotência passaram sem mutação física.
