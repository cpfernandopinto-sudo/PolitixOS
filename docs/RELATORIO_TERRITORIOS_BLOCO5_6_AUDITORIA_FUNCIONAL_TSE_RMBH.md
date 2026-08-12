# PolitixOS Territórios — Bloco 5.6 — Auditoria funcional TSE/RMBH

**Data:** 11/08/2026  
**Escopo:** auditoria read-only dos dados TSE já persistidos para uma amostra controlada da RMBH.  
**Gate:** **HOMOLOGADO COM RESSALVAS**.

## 1. Baseline

O baseline obrigatório foi o Bloco 5.5B: registro canônico `RMBH` com 34 municípios, 34 cargas concluídas, pleitos 2016/2020/2024, checkpoint, retomada, cache e idempotência homologados, inventário regional de 8.363 indicadores e 170 evidências. Também foram inspecionados registro regional, executor, coletor, normalizador, persistência, chaves naturais, evidências, collection runs e scripts anteriores.

O baseline foi preservado. Não houve carga, mutation no banco, schema, migration, alteração no motor, frontend, UX, n8n, deploy, merge ou expansão territorial.

## 2. Objetivo

Determinar se os dados persistidos estão territorial e temporalmente corretos, internamente coerentes, rastreáveis e semanticamente utilizáveis. O bloco não revalidou a capacidade operacional do pipeline nem tentou completar lacunas do modelo.

## 3. Amostra escolhida

| Município | IBGE | Papel na amostra |
|---|---|---|
| Contagem | 3118601 | município grande e baseline histórico |
| Belo Horizonte | 3106200 | capital e maior volume físico |
| Betim | 3106705 | município grande/intermediário e baseline histórico |
| Nova Lima | 3144805 | município intermediário carregado no 5.5B |
| Ribeirão das Neves | 3154606 | município populoso carregado no 5.5B |
| Taquaraçu de Minas | 3168309 | menor inventário físico produzido no Bloco 5.5B: 95 indicadores |

## 4. Justificativa da amostra

A seleção combina capital, municípios grandes, municípios com dados preexistentes, municípios efetivamente escritos no Bloco 5.5B e o menor inventário daquela carga. O sexto município foi escolhido por critério objetivo, não aleatório.

## 5. Inventário físico

Terminologia usada:

- **inventário físico:** linhas TSE existentes no banco no instante da auditoria;
- **escrito/processado no 5.5B:** operações de indicador reportadas pela primeira carga regional;
- **preexistente ao 5.5B:** inventário físico menos o escrito no 5.5B; é uma reconciliação de contagem, não datação linha a linha.

| Município | Indicadores físicos | Escritos no 5.5B | Preexistentes reconciliados | Evidências | Candidatos únicos | Partidos únicos | Runs TSE |
|---|---:|---:|---:|---:|---:|---:|---:|
| Contagem | 489 | 0 | 489 | 5 | 415 | 23 | 10 |
| Belo Horizonte | 945 | 0 | 945 | 5 | 854 | 29 | 8 |
| Betim | 393 | 0 | 393 | 5 | 333 | 21 | 8 |
| Nova Lima | 268 | 268 | 0 | 5 | 209 | 19 | 2 |
| Ribeirão das Neves | 313 | 313 | 0 | 5 | 255 | 19 | 2 |
| Taquaraçu de Minas | 95 | 95 | 0 | 5 | 51 | 6 | 2 |
| **Amostra** | **2.503** | **676** | **1.827** | **30** | — | — | **32** |

Os zeros de escrita em Contagem, Belo Horizonte e Betim são comportamento idempotente: as chaves já existiam. Não representam cobertura zero.

## 6. Matriz de cobertura

Classificação comum aos seis municípios:

| Dimensão | 2016 | 2020 | 2024 |
|---|---|---|---|
| Eleição municipal | PRESENTE | PRESENTE | PRESENTE |
| Prefeito | PRESENTE | PRESENTE | PRESENTE |
| Vereador | PRESENTE | PRESENTE | PRESENTE |
| Primeiro turno | PRESENTE | PRESENTE | PRESENTE |
| Segundo turno | NÃO APLICÁVEL ou PRESENTE, conforme fonte oficial | NÃO APLICÁVEL ou PRESENTE, conforme fonte oficial | NÃO APLICÁVEL ou PRESENTE, conforme fonte oficial |
| Eleitorado, comparecimento e abstenção | PRESENTE | PRESENTE | PRESENTE |
| Válidos, brancos e nulos | PRESENTE | PRESENTE | PRESENTE |
| Resultado nominal de candidato | AUSENTE POR DESIGN | AUSENTE POR DESIGN | PRESENTE |
| Resultado por partido | AUSENTE POR DESIGN | AUSENTE POR DESIGN | PRESENTE |
| Vencedor, segundo colocado e margem | NÃO DERIVÁVEL COM SEGURANÇA PELO MODELO ATUAL | NÃO DERIVÁVEL COM SEGURANÇA PELO MODELO ATUAL | PRESENTE/DERIVÁVEL |
| Colocação persistida | NÃO SUPORTADO | NÃO SUPORTADO | NÃO SUPORTADO; derivável por ordenação dos votos |

O coletor persiste os datasets de detalhe para os três anos, mas candidato e partido somente para o ano mais recente configurado, 2024. Nenhum indicador foi criado para completar a matriz.

## 7. Análise por município

Todos os seis municípios pertencem ao registro canônico RMBH, possuem o IBGE esperado, UF MG, datasets dos três pleitos, ambos os cargos municipais, valores não negativos e evidências válidas. Belo Horizonte apresenta o maior inventário pela quantidade de candidaturas e ocorrência de segundo turno. Taquaraçu de Minas tem o menor inventário, coerente com seu menor universo eleitoral. Nenhuma diferença de volume foi tratada como anomalia sem evidência.

## 8. Análise por pleito

- **2016:** totais de Prefeito/Vereador presentes; resultados nominais e partidários ausentes por design.
- **2020:** mesma cobertura de 2016; o eleitorado de Contagem foi reproduzido diretamente da fonte oficial.
- **2024:** totais, candidatos e partidos presentes; vencedor e margens deriváveis. O modelo não mistura candidaturas 2024 com pleitos anteriores.

Os únicos `source_dataset` observados foram `detalhe_votacao_munzona_2016`, `detalhe_votacao_munzona_2020`, `detalhe_votacao_munzona_2024`, `votacao_candidato_munzona_2024` e `votacao_partido_munzona_2024`.

## 9. Consistência interna

Foram auditados 40 grupos completos de totais:

- `eleitorado = comparecimento + abstenção`: 40/40 PASS;
- valores negativos: 0;
- percentuais de candidato fora de 0–100: 0;
- duplicações por chave natural: 0;
- duplicações de candidato por município/ano/turno/cargo/id: 0;
- combinações fora de 2016/2020/2024: 0.

Em 12 grupos, `comparecimento` não fecha apenas com `válidos + brancos + nulos`. Isso é uma **limitação semântica conhecida**, não prova de corrupção: a divulgação oficial também contempla categorias excepcionais como nulos técnicos, anulados e anulados sub judice, não persistidas separadamente pelo modelo atual. A identidade simplificada não deve ser usada como gate rígido.

Resultado: **PARCIAL**, sem inconsistência crítica nos dados fundamentais.

## 10. Validação temporal

Anos do indicador, período e dataset coincidem. Não foram encontrados ano trocado, pleito inesperado, município externo, IBGE divergente, candidato ligado a ano incompatível ou referência territorial incorreta. Mudanças reais entre pleitos não foram interpretadas como erro. Resultado: **PASS**.

## 11. Auditoria de vencedor e resultados

O resultado municipal de Prefeito em 2024 foi ordenado no turno decisivo e conferido com o status persistido `ELEITO`:

| Município | Turno | Vencedor | Partido | Votos | % | Margem (votos) | Margem (p.p.) |
|---|---:|---|---|---:|---:|---:|---:|
| Contagem | 1 | MARÍLIA | PT | 188.228 | 60,703827 | 67.452 | 21,753407 |
| Belo Horizonte | 2 | FUAD NOMAN | PSD | 670.574 | 53,727112 | 93.037 | 7,454224 |
| Betim | 1 | HERON GUIMARAES | UNIÃO | 108.557 | 52,457947 | 29.461 | 14,236420 |
| Nova Lima | 1 | João Marcelo | CIDADANIA | 47.321 | 85,597743 | 42.695 | 77,229890 |
| Ribeirão das Neves | 1 | TÚLIO | PP | 108.757 | 81,607738 | 91.352 | 68,547590 |
| Taquaraçu de Minas | 1 | MARCILIO BEZERRA | PP | 3.695 | 79,155955 | 2.722 | 58,311910 |

O segundo colocado e as margens são deriváveis em 2024; o status do primeiro é `ELEITO` e o do segundo `NÃO ELEITO`. Em 2016 e 2020: **NÃO DERIVÁVEL COM SEGURANÇA PELO MODELO ATUAL**, pois os resultados nominais históricos não são persistidos.

## 12. Rastreabilidade das evidências

Cada município possui exatamente cinco evidências, correspondentes aos cinco datasets efetivamente usados: três detalhes (2016, 2020 e 2024), candidatos 2024 e partidos 2024. Portanto, “cinco evidências para três pleitos” é comportamento esperado da arquitetura.

Foram validados vínculo territorial, `source_name=TSE`, identificador externo/dataset, ano, UF/origem, URL/referência, fórmula determinística de `source_hash` e ausência de duplicação por `territory_id + source_hash`. Resultado: **PASS**.

## 13. Validação externa controlada

Comparação read-only com os mesmos arquivos oficiais usados pelo Motor TSE:

| Município/pleito | Campo | Banco | Fonte TSE | Diferença | Resultado |
|---|---|---:|---:|---:|---|
| Contagem 2024 | eleitorado, Prefeito T1 | 459.110 | 459.110 | 0 | PASS |
| Contagem 2024 | soma votos candidatos, Prefeito T1 | 310.207 | 310.207 | 0 | PASS |
| Belo Horizonte 2024 | eleitorado, Prefeito T1 | 1.992.984 | 1.992.984 | 0 | PASS |
| Belo Horizonte 2024 | soma votos candidatos, Prefeito T1 | 1.267.794 | 1.267.794 | 0 | PASS |
| Betim 2024 | eleitorado, Prefeito T1 | 297.070 | 297.070 | 0 | PASS |
| Betim 2024 | soma votos candidatos, Prefeito T1 | 206.941 | 206.941 | 0 | PASS |
| Contagem 2020 | eleitorado, Prefeito T1 | 427.575 | 427.575 | 0 | PASS |

Fonte oficial: [TSE — informações técnicas sobre a divulgação dos resultados 2024](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados-2024). Resultado: **PASS**.

## 14. Anomalias

| Verificação | Resultado |
|---|---:|
| IBGE duplicado na amostra | 0 |
| Município/IBGE incorreto | 0 |
| Indicador duplicado por chave natural | 0 |
| Evidência duplicada | 0 |
| Candidato duplicado indevidamente | 0 |
| Ano/pleito impossível | 0 |
| Valor negativo | 0 |
| Percentual fora da faixa | 0 |
| Collection run `running` órfão | 0 |
| Território externo à RMBH no recorte | 0 |
| Anomalia crítica | 0 |

## 15. Divergências classificadas

- **A — comportamento esperado:** cinco evidências representam cinco datasets; segundo turno aparece apenas quando aplicável; grafia e espaços da urna são preservados como fornecidos.
- **B — diferença de telemetria:** Contagem, Belo Horizonte e Betim tiveram zero escrita no 5.5B, mas 489, 945 e 393 indicadores físicos, respectivamente, porque já estavam persistidos.
- **C — ausência por design:** candidatos e partidos de 2016/2020 não são coletados pelo desenho atual.
- **D — limitação do modelo atual:** vencedor histórico não é derivável; categorias excepcionais de votos não têm indicadores próprios, impedindo o fechamento universal da identidade simplificada do comparecimento.
- **E–I:** nenhuma ocorrência comprovada.

Divergências não explicadas: **0**.

## 16. Limitações

A homologação funcional não afirma completude nominal histórica. Também não afirma que `comparecimento = válidos + brancos + nulos` em toda divulgação TSE, pois o modelo não representa todas as categorias excepcionais. A reconciliação “preexistente” é quantitativa, baseada no relatório 5.5B, e não substitui auditoria temporal linha a linha.

Essas ressalvas não comprometem território, eleitorado, comparecimento, abstenção, totais persistidos, resultados nominais 2024 ou rastreabilidade.

## 17. Testes executados

- TypeScript sem emissão;
- suíte determinística de auditoria e testes TSE relacionados;
- ESLint restrito aos arquivos do Bloco 5.6;
- build de produção;
- script read-only de auditoria e comparação externa.

Os testes automatizados cobrem inventário versus telemetria, identidades matemáticas válidas, anos/valores/percentuais e duplicações. A rede permanece fora da suíte normal.

## 18. Arquivos alterados

```text
lib/territorios/tse-functional-audit.ts
lib/territorios/tse-functional-audit.test.ts
scripts/audit-rmbh-tse-functional.ts
docs/RELATORIO_TERRITORIOS_BLOCO5_6_AUDITORIA_FUNCIONAL_TSE_RMBH.md
```

Nenhum arquivo preexistente do Motor TSE foi alterado.

## 19. Conclusão

A amostra demonstra associação territorial correta, cobertura de totais municipais nos três pleitos, resultados nominais 2024 coerentes, ausência de duplicações críticas, rastreabilidade íntegra e correspondência exata nos valores oficiais comparados. Não foi encontrado erro estrutural que acione parada corretiva.

O modelo, contudo, não suporta homologação nominal histórica integral e não decompõe todas as categorias excepcionais de votos. Por isso, o estado correto é **HOMOLOGADO COM RESSALVAS**.

## 20. Gate final

**HOMOLOGADO COM RESSALVAS**

Ressalvas:

- resultados de candidato/partido de 2016 e 2020 são ausentes por design;
- vencedores e margens de 2016/2020 não são deriváveis com segurança;
- categorias excepcionais do total de votos não são persistidas separadamente.

O resultado libera apenas o planejamento do próximo bloco. Expansão para Minas Gerais não foi executada nem autorizada por esta auditoria.
