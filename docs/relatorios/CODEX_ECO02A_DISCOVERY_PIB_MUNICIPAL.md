# POLITIXOS — TERRITÓRIOS — ECO-02A

## Discovery técnico do PIB dos Municípios / IBGE

**Data da validação:** 16/08/2026  
**Modo:** discovery e validação real somente leitura  
**Escopo:** Motor Economia — dimensão de atividade econômica municipal  
**Resultado executivo:** fonte oficial validada; implementação ECO-02B recomendada **com ressalvas metodológicas e de origem**.

> Este documento não autoriza interpretar variação do PIB a preços correntes como crescimento econômico real. O ano de referência do dado deve permanecer separado da data de coleta.

## 1. Estado inicial do repositório

O repositório já estava sujo antes deste bloco. Havia alterações paralelas de frontend territorial, arquivos de trabalho de Claude/Antigravity, arquivos do ECO-01 ainda não rastreados e dois apontamentos de worktrees Claude removidos. Nenhum desses itens foi movido, revertido, incluído ou alterado pelo ECO-02A.

Estado inicial relevante:

- branch `main`;
- HEAD `5ee77df`;
- modificações paralelas em `app/dashboard/territorios/**` e `components/**`;
- implementação ECO-01 não rastreada em `lib/territorios/economia-*` e `scripts/audit-economia-siconfi-contagem.ts`;
- diretório `docs/relatorios/` já não rastreado e contendo relatórios de blocos paralelos.

## 2. Branch e worktree

O trabalho foi realizado na worktree principal, em `main`, sem criar branch nem worktree isolada. A criação de uma worktree baseada apenas no HEAD seria inadequada porque impediria a auditoria de compatibilidade com o ECO-01 ainda não commitado. Como o bloco é read-only e produz somente este relatório, a opção segura foi preservar a worktree compartilhada e não tocar nos arquivos concorrentes.

Worktrees observadas incluíam três worktrees Codex antigas/prunable e worktrees Claude ativas ou prunable. Nenhuma foi alterada.

## 3. Infraestrutura SIDRA já existente

Existe infraestrutura IBGE/SIDRA em `lib/territorios/ibge-client.ts`:

- API de Localidades e Agregados v3;
- timeout de 20 segundos;
- até 3 retries com backoff para 429/5xx;
- classificação de erros;
- leitura municipal por código IBGE de 7 dígitos;
- parser e contrato específicos para população, tabela 6579, variável 9324.

O transporte interno `fetchIbgeJson` é tecnicamente reaproveitável, mas é privado e o parser atual é específico de população. O ECO-02B deve **generalizar sem duplicar** o transporte/retry e criar contrato próprio para séries multivariáveis do PIB. Não foi criado client neste discovery.

O contrato territorial já oferece `territory_indicators`, `territory_evidence` e `territory_collection_runs`. O ECO-01 usa `categoria=economia`, `fonte=SICONFI` e `source_dataset=SICONFI_DCA`.

## 4. Fonte oficial

Fonte validada: **IBGE — Produto Interno Bruto dos Municípios**, pesquisa anual integrada às Contas Nacionais e Regionais, referência 2010, compatível com SNA 2008 e CNAE 2.0.

Superfícies oficiais necessárias:

1. API de Agregados/SIDRA v3, tabela 5938;
2. base completa oficial do produto PIB dos Municípios, arquivos 2002–2009 e 2010–2023, para o PIB per capita publicado.

Referências:

- [Produto Interno Bruto dos Municípios — IBGE](https://www.ibge.gov.br/estatisticas/economicas/contas-nacionais/9088-produto-interno-bruto-dos-municipios.html)
- [Metadados oficiais da tabela 5938](https://servicodados.ibge.gov.br/api/v3/agregados/5938/metadados)
- [Ajuda oficial da API SIDRA](https://apisidra.ibge.gov.br/home/ajuda)
- [Base oficial em FTP](https://ftp.ibge.gov.br/Pib_Municipios/2022_2023/base/)

## 5. Tabela 5938: validada, com escopo parcial em 2022–2023

**ID:** 5938  
**Nome oficial:** Produto interno bruto a preços correntes, impostos, líquidos de subsídios, sobre produtos a preços correntes e valor adicionado bruto a preços correntes total e por atividade econômica, e respectivas participações — Referência 2010.  
**Pesquisa:** Produto Interno Bruto dos Municípios.  
**Periodicidade:** anual.  
**Cobertura temporal declarada:** 2002–2023.  
**Cobertura territorial:** inclui município (`N6`), além de outros níveis.  
**Classificações:** nenhuma (`classificacoes: []`).

Validação: a tabela é a fonte SIDRA correta para PIB municipal e, até 2021, para VAB, setores, impostos e participações. Para 2022 e 2023, a API devolve PIB, mas devolve `...` para as dez variáveis detalhadas testadas. Conforme a documentação SIDRA, `...` significa **valor não disponível**, nunca zero.

## 6. Outras tabelas encontradas

| Tabela | Nome/abrangência | Anos | Nível | Utilidade/decisão |
|---|---|---:|---|---|
| 21 | Mesmo núcleo do PIB Municipal, referência 2002, série encerrada | 1999–2012 | inclui N6 | Histórica legada; não deve ser concatenada automaticamente com 5938. A série 5938 já foi retropolada a 2002 sob referência 2010. |
| 5939 | Índices de Gini do PIB e VAB por atividade, referência 2010 | 2002–2023 | N1/N2/N3 | Complementar para concentração regional/estadual; não oferece valor municipal N6 e não é necessária ao ECO-02B básico. |
| 599 | Gini do PIB/VAB, referência 2002, série encerrada | 1999–2012 | N1/N2/N3 | Legada; não municipal. |
| 6784 | PIB, PIB per capita, população e deflator — Contas Nacionais Anuais | 1996–2023 | somente N1 | **Rejeitada para município.** É nacional, embora tenha PIB per capita, volume e deflator. |

Não foi localizada tabela SIDRA municipal separada com PIB per capita. O valor oficial municipal está na base completa do produto.

## 7. Variáveis validadas

| Código | Variável oficial | Disponibilidade validada |
|---:|---|---|
| 37 | Produto Interno Bruto a preços correntes | 2002–2023 |
| 543 | Impostos, líquidos de subsídios, sobre produtos a preços correntes | 2002–2021; indisponível em 2022–2023 |
| 498 | Valor adicionado bruto a preços correntes total | 2002–2021; indisponível em 2022–2023 |
| 513 | VAB a preços correntes da agropecuária | 2002–2021; indisponível em 2022–2023 |
| 516 | Participação do VAB da agropecuária no VAB total | 2002–2021; indisponível em 2022–2023 |
| 517 | VAB a preços correntes da indústria | 2002–2021; indisponível em 2022–2023 |
| 520 | Participação do VAB da indústria no VAB total | 2002–2021; indisponível em 2022–2023 |
| 6575 | VAB dos serviços, exclusive administração, defesa, educação e saúde públicas e seguridade social | 2002–2021; indisponível em 2022–2023 |
| 6574 | Participação do VAB desses serviços no VAB total | 2002–2021; indisponível em 2022–2023 |
| 525 | VAB da administração, defesa, educação e saúde públicas e seguridade social | 2002–2021; indisponível em 2022–2023 |
| 528 | Participação desse VAB público no VAB total | 2002–2021; indisponível em 2022–2023 |

## 8. Classificações

A tabela 5938 não possui dimensão de classificação. Agropecuária, indústria, serviços e administração pública estão modelados como **variáveis distintas**, não como categorias de uma classificação SIDRA. Logo, o ECO-02B não deve inventar um código de classificação setorial para representar a origem.

## 9. Unidades

- variáveis monetárias 37, 543, 498, 513, 517, 6575 e 525: `Mil Reais`;
- variáveis 516, 520, 6574 e 528: `%`;
- PIB per capita da base oficial: `Reais` por habitante.

Na API de Agregados, `unidade` permanece `Mil Reais`/`%` mesmo quando o valor anual é `...`. O parser deve validar o valor especial antes de convertê-lo em número.

## 10. Cobertura histórica

A série de referência 2010 cobre 22 exercícios, de 2002 a 2023. Para antes de 2010, o IBGE realizou retropolação até 2002, adaptada à CNAE 2.0. A série de referência 2002 (tabela 21) começa em 1999, mas está encerrada e não deve ser mesclada silenciosamente.

Cobertura efetiva por grupo:

- PIB total e PIB per capita: 2002–2023;
- VAB total, impostos, VAB setoriais e participações: 2002–2021.

## 11. Último ano

Último ano efetivamente disponível na edição validada: **2023**. Os metadados dos períodos 2021–2023 indicavam revisão/publicação em 19/12/2025. O produto está sujeito à política oficial de revisão; `source_updated_at` e hash da origem devem ser preservados no futuro.

## 12. Defasagem

Na coleta de 16/08/2026, o último ano era 2023: defasagem aproximada de três anos civis em relação à data de coleta. Isso é normal para contas econômicas estruturais e impede apresentar o dado como “economia atual”.

Obrigatório no produto:

- exibir **ano de referência: 2023**;
- exibir separadamente **data da coleta** e, quando disponível, data de atualização da fonte;
- evitar termos como “agora”, “hoje” ou “situação corrente” para PIB Municipal.

## 13. Consulta real — Contagem/MG

**Código IBGE:** 3118601  
**HTTP:** 200  
**Tempo observado:** 0,298 s  
**Payload:** 7.202 bytes  
**Retorno:** 11 objetos de variável × 22 anos = 242 células; 222 numéricas e 20 `...`.  
**Períodos:** 2002–2023.  
**Classificações:** nenhuma.

Amostra:

- PIB 2023: `45.092.393 mil R$` na API (base oficial com precisão: `45.092.392,887 mil R$`);
- PIB per capita oficial 2023: `R$ 72.511,78`;
- PIB 2021: `36.478.511 mil R$`;
- VAB total 2021: `29.628.361 mil R$`;
- indústria 2021: `9.128.035 mil R$` e `30,81%` do VAB;
- serviços exclusive setor público 2021: `17.512.659 mil R$` e `59,11%`;
- administração/defesa/educação e saúde públicas/seguridade 2021: `2.984.614 mil R$` e `10,07%`.

## 14. Consulta real — Betim/MG

**Código IBGE:** 3106705  
**HTTP:** 200  
**Tempo observado:** 0,272 s  
**Payload:** 7.181 bytes  
**Retorno:** 11 × 22 = 242 células; 222 numéricas e 20 `...`.  
**Períodos:** 2002–2023.  
**Classificações:** nenhuma.

Amostra:

- PIB 2023: `52.614.325 mil R$` na API (base: `52.614.325,377 mil R$`);
- PIB per capita oficial 2023: `R$ 127.752,43`;
- PIB 2021: `33.125.378 mil R$`;
- VAB total 2021: `27.439.860 mil R$`;
- indústria 2021: `14.547.208 mil R$`, `53,01%`;
- serviços exclusive setor público: `10.568.799 mil R$`, `38,52%`;
- setor público ampliado: `2.305.734 mil R$`, `8,40%`.

## 15. Consulta real — Belo Horizonte/MG

**Código IBGE:** 3106200  
**HTTP:** 200  
**Tempo observado:** 0,229 s  
**Payload:** 7.332 bytes  
**Retorno:** 11 × 22 = 242 células; 222 numéricas e 20 `...`.  
**Períodos:** 2002–2023.  
**Classificações:** nenhuma.

Amostra:

- PIB 2023: `130.197.671 mil R$` na API (base: `130.197.670,721 mil R$`);
- PIB per capita oficial 2023: `R$ 56.227,29`;
- PIB 2021: `105.920.859 mil R$`;
- VAB total 2021: `92.163.918 mil R$`;
- indústria 2021: `16.146.070 mil R$`, `17,52%`;
- serviços exclusive setor público: `63.270.427 mil R$`, `68,65%`;
- setor público ampliado: `12.743.033 mil R$`, `13,83%`.

## 16. PIB total

O PIB total está diretamente disponível na variável 37, a preços correntes, em **mil reais**. A API arredonda os resultados consultados a unidades de mil reais; a base oficial possui casas decimais em mil reais.

Proposta futura: armazenar canonicamente em `BRL`, multiplicando o valor de origem por 1.000, **sem descartar** `raw_value`, `raw_unit=Mil Reais`, precisão e `normalization_factor=1000` em metadata. Essa transformação é de unidade, não deflacionamento.

## 17. PIB per capita

O PIB per capita municipal é publicado diretamente pelo IBGE na base completa 2002–2009/2010–2023, em reais. Não foi encontrado como variável municipal na tabela 5938. A tabela 6784 possui PIB per capita, mas somente para Brasil (`N1`) e foi rejeitada para este uso.

Deve-se preferir o indicador oficial. Não recalcular automaticamente `PIB / população_total` porque a população usada pelo IBGE segue o conceito de cada edição:

- 2002–2021: estimativas municipais de população na referência definida pelo produto;
- 2022: primeira apuração do Censo 2022;
- 2023: população encaminhada ao TCU, com atualizações territoriais.

Uma razão calculada com a população mais recente de outra tabela pode divergir por referência temporal, revisão de limites, arredondamento do PIB e precisão. Se oferecida, deve ser outro indicador explicitamente derivado, nunca substituir o oficial.

## 18. VAB setorial

Semântica oficial a preservar:

1. `Valor adicionado bruto a preços correntes da agropecuária`;
2. `Valor adicionado bruto a preços correntes da indústria`;
3. `Valor adicionado bruto a preços correntes dos serviços, exclusive administração, defesa, educação e saúde públicas e seguridade social`;
4. `Valor adicionado bruto a preços correntes da administração, defesa, educação e saúde públicas e seguridade social`.

Não abreviar o item 4 para “administração pública” sem manter a descrição oficial em metadata/UI. Não somar silenciosamente serviços e setor público ampliado sob outro conceito.

Validação matemática: para Contagem/2021, os quatro componentes somam exatamente o VAB total; as participações somam 100,00%. Em 2020, houve diferença de 1 mil R$ e soma de 100,01% por arredondamento. Tolerância futura proposta: diferença monetária compatível com arredondamento da unidade e até 0,02 ponto percentual na soma das participações.

## 19. Impostos

A variável 543 publica `Impostos, líquidos de subsídios, sobre produtos a preços correntes`, em mil reais, até 2021. Identidade esperada: `PIB = VAB total + impostos líquidos de subsídios`, admitindo arredondamento. O termo “impostos municipais” seria incorreto: o indicador é componente do PIB por localização, não arrecadação fiscal do município.

## 20. Preços correntes versus reais

A tabela 5938 publica **valores a preços correntes** e percentuais. Não fornece série municipal de volume, preços constantes, deflator municipal ou crescimento real. A tabela 6784 fornece volume/deflator apenas no nível nacional e não pode converter automaticamente o PIB de cada município em série real.

Portanto:

- variação anual calculada com 5938 = **variação nominal**;
- “crescimento real do PIB municipal” não deve ser produzido neste motor sem metodologia e fonte oficial adequadas;
- aplicar IPCA ou deflator nacional mecanicamente exigiria decisão metodológica explícita e ainda não recriaria uma medida oficial de volume municipal.

## 21. Comparabilidade temporal

A série 5938 referência 2010 foi retropolada de 2010 até 2002 e é a série preferencial internamente comparável. Ainda assim:

- resultados podem ser revisados;
- mudanças de limites municipais/população afetam PIB per capita;
- 2022–2023 têm quebra de **disponibilidade dimensional**, sem VAB e impostos, durante reformulação do SCN;
- o IBGE prevê retomar a abertura setorial após a nova série do SCN, base 2021, prevista para 2027;
- tabela 21 referência 2002 não deve ser emendada à 5938 como se fosse a mesma base.

## 22. Proposta de indicadores oficiais diretos

| Indicador canônico | Origem | Unidade canônica | Natureza/período |
|---|---|---|---|
| `pib_municipal_precos_correntes` | 5938/v37 | BRL | direto anual, 2002–2023 |
| `pib_per_capita_precos_correntes` | base PIB Municípios | BRL por habitante | direto anual, 2002–2023 |
| `vab_total_precos_correntes` | 5938/v498 | BRL | direto anual, 2002–2021 |
| `vab_agropecuaria_precos_correntes` | 5938/v513 | BRL | direto anual, 2002–2021 |
| `participacao_vab_agropecuaria` | 5938/v516 | % | direto anual, 2002–2021 |
| `vab_industria_precos_correntes` | 5938/v517 | BRL | direto anual, 2002–2021 |
| `participacao_vab_industria` | 5938/v520 | % | direto anual, 2002–2021 |
| `vab_servicos_exceto_setor_publico_ampliado_precos_correntes` | 5938/v6575 | BRL | direto anual, 2002–2021 |
| `participacao_vab_servicos_exceto_setor_publico_ampliado` | 5938/v6574 | % | direto anual, 2002–2021 |
| `vab_administracao_defesa_educacao_saude_publicas_seguridade_precos_correntes` | 5938/v525 | BRL | direto anual, 2002–2021 |
| `participacao_vab_administracao_defesa_educacao_saude_publicas_seguridade` | 5938/v528 | % | direto anual, 2002–2021 |
| `impostos_liquidos_subsidios_produtos_precos_correntes` | 5938/v543 | BRL | direto anual, 2002–2021 |

## 23. Proposta de indicadores deriváveis

Não persistir por padrão no primeiro coletor; calcular em camada analítica com linhagem:

- `variacao_nominal_pib_percentual` entre anos comparáveis;
- `variacao_nominal_pib_per_capita_percentual`;
- participações setoriais recomputadas como controle de qualidade, não substituição do valor oficial;
- participação de impostos no PIB;
- posição/ranking municipal dentro de universo e ano explicitamente definidos;
- índice simples de concentração estrutural apenas com metodologia aprovada;
- cruzamentos futuros PIB × receita SICONFI, PIB × emprego CAGED e PIB × massa salarial RAIS.

Não derivar automaticamente: crescimento real, causalidade política, produtividade, riqueza das famílias ou qualidade de gestão.

## 24. Proposta de normalização

Contrato proposto por registro:

- `categoria`: `economia`;
- `fonte`: `IBGE`;
- `granularidade`: `municipal`;
- `periodo_inicio`: `AAAA-01-01`;
- `periodo_fim`: `AAAA-12-31`;
- `valor`: valor canônico;
- `unidade`: `BRL`, `BRL/habitante` ou `%`;
- `source_record_id`: `tabela:variavel:codigo_ibge:ano` para SIDRA; identificação equivalente da linha da base para per capita;
- `source_updated_at`: data oficial de revisão quando disponível;
- `metodologia`: descrição que declare preços correntes, origem direta e cobertura;
- `metadata`: `source_mode=REAL`, `table_id`, `variable_id`, `raw_name`, `raw_value`, `raw_unit`, `normalization_factor`, `reference_year`, `source_url`, `availability_status`, `methodological_reference`, `collected_at` e hash.

Regras:

- `...`, `..`, `X`, `-` e faixas alfabéticas precisam de tratamento semântico conforme a documentação SIDRA;
- `...` não vira zero nem linha numérica;
- conversão de `Mil Reais` para `BRL` usa fator 1.000 e preserva o valor bruto;
- percentuais permanecem pontos percentuais no valor publicado, sem dividir por 100 silenciosamente.

## 25. `source_dataset` proposto

- `IBGE_SIDRA_5938` para PIB, VAB, setores, participações e impostos lidos da API;
- `IBGE_PIB_MUNICIPIOS_BASE` para o PIB per capita oficial da base completa.

Usar dois datasets torna a linhagem explícita e evita alegar que o PIB per capita veio da tabela 5938. Ambos pertencem ao mesmo produto estatístico IBGE, mas possuem superfícies e precisão de distribuição distintas.

## 26. Natural key

O índice vigente usa:

`territory_id + categoria + indicador + fonte + source_dataset + periodo_inicio + periodo_fim`

É adequado e não colide com ECO-01. Para o mesmo indicador/ano, SIDRA e base oficial seriam registros distintos somente se o nome canônico também fosse duplicado; a proposta evita isso usando a base apenas para per capita. `source_record_id` e hash continuam necessários para reconciliação e revisão, embora não componham a unique key.

## 27. Compatibilidade com ECO-01

Coexistência validada:

- ECO-01: `categoria=economia`, `fonte=SICONFI`, `source_dataset=SICONFI_DCA`;
- ECO-02: `categoria=economia`, `fonte=IBGE`, datasets propostos acima.

Não há colisão na natural key. Há complementaridade semântica: ECO-01 mede finanças públicas municipais; ECO-02 mede dimensão e estrutura da atividade econômica. Receita SICONFI e impostos líquidos de subsídios do PIB são conceitos diferentes e não devem compartilhar nome ou rótulo.

## 28. Potencial para Inteligência Política

| Sinal | Classificação | Condição |
|---|---|---|
| Tamanho da economia municipal | Diretamente derivável | PIB, ano e universo explícitos |
| Estrutura produtiva setorial | Diretamente derivável | disponível até 2021 |
| Peso do setor público ampliado no VAB | Diretamente derivável | usar semântica oficial; não equivale a emprego público |
| Especialização/concentração setorial | Exige metodologia | definir índice, comparação e limiares |
| Mudança estrutural | Exige metodologia | série comparável e janela explícita |
| Variação nominal | Diretamente derivável | rotular nominal, não real |
| Crescimento real | Depende de outra fonte/metodologia | não disponível municipalmente em 5938 |
| Dependência econômica de um setor | Exige metodologia | participação alta não prova dependência causal |
| Qualidade de governo/gestão | Não deve ser inferido automaticamente | PIB não identifica causalidade administrativa |
| Humor eleitoral decorrente da economia | Não deve ser inferido automaticamente | exige pesquisas/comportamento e desenho causal |

## 29. Dependências CAGED/RAIS

Relações futuras possíveis, sem joins neste bloco:

- PIB/VAB setorial × estoque e fluxo de emprego formal;
- estrutura produtiva × estrutura ocupacional;
- PIB per capita × rendimento/massa salarial formal;
- variação nominal da atividade × admissões/desligamentos;
- peso setorial × resiliência/volatilidade do emprego.

Novo CAGED mede fluxo mensal do emprego formal; RAIS mede estoque e características anuais. Nenhuma delas cobre integralmente informalidade, produção ou renda domiciliar. Os joins devem usar código IBGE harmonizado, período de referência compatível, CNAE agregada e notas sobre mudanças metodológicas.

## 30. Limitações

- API SIDRA limita cada consulta a **100.000 valores**, calculados pelo produto das dimensões selecionadas;
- não há SLA público no client existente; prever timeout, retry, cache e lote controlado;
- endpoint `/variaveis` da API de Agregados apresentou erro durante a descoberta; metadados completos funcionaram e são o fallback oficial;
- 2022–2023: apenas PIB no 5938; VAB/impostos/participações retornam `...`;
- PIB per capita exige base oficial fora da tabela 5938;
- base TXT é grande, de largura fixa e requer layout/encoding controlados;
- dados são anuais e defasados;
- não há crescimento real municipal na fonte validada;
- valores da API e da base podem ter precisão diferente por arredondamento;
- revisões do IBGE exigem reconciliação idempotente.

## 31. Riscos

1. Converter `...` em zero e produzir falsa queda setorial em 2022–2023.
2. Chamar variação nominal de crescimento real.
3. Recalcular PIB per capita com população de referência incompatível.
4. Confundir impostos líquidos de subsídios do PIB com arrecadação municipal.
5. Simplificar a categoria pública e perder educação, saúde, defesa e seguridade.
6. Concatenar tabela 21 e 5938 sem tratar a mudança de referência.
7. Ocultar a defasagem e apresentar 2023 como quadro corrente de 2026.
8. Carregar todo o Brasil em uma consulta superior ao limite SIDRA.
9. Persistir duas precisões do PIB como se fossem observações distintas.
10. Inferir causalidade política a partir de indicadores estruturais.

## 32. Arquivos criados

- `docs/relatorios/CODEX_ECO02A_DISCOVERY_PIB_MUNICIPAL.md` — este relatório.

Arquivos temporários de consulta foram usados somente em `/private/tmp`; não integram o projeto nem representam persistência de produto.

## 33. Arquivos alterados

Nenhum arquivo preexistente foi alterado pelo ECO-02A.

## 34. `git diff --stat`

O `git diff --stat` da worktree contém alterações concorrentes preexistentes: **15 arquivos rastreados, 1.370 inserções e 1.068 remoções**, além de dois apontamentos removidos em `.claude/worktrees`. Como este relatório está em diretório não rastreado, ele não aparece no `git diff --stat` padrão até ser adicionado ao índice.

O ECO-02A não produziu diff em código, migration, frontend, ECO-01 ou orquestrador.

## 35. Recomendação para ECO-02B

**Avançar com ressalvas**, em microbloco isolado e sem carga nacional inicial.

Escopo recomendado para ECO-02B:

1. generalizar o transporte SIDRA existente, sem duplicar retry/timeout;
2. criar parser estrito dos caracteres especiais SIDRA;
3. implementar tabela 5938 para PIB 2002–2023 e detalhes somente 2002–2021;
4. integrar a base oficial somente para PIB per capita, com parser validado pelo layout;
5. começar com Contagem e testes Betim/Belo Horizonte;
6. persistir apenas indicadores diretos, preços correntes e linhagem completa;
7. testar conversão `Mil Reais → BRL`, identidades PIB/VAB e tolerância de arredondamento;
8. registrar cobertura diferenciada por indicador, sem preencher lacunas 2022–2023;
9. submeter contrato e amostras a gate independente antes de carga regional/nacional.

### Gate final

| Gate | Status |
|---|---|
| FONTE OFICIAL VALIDADA | **SIM** |
| TABELA(S) IDENTIFICADA(S) | **SIM** |
| CONTAGEM REAL | **PASS** |
| BETIM REAL | **PASS** |
| BELO HORIZONTE REAL | **PASS** |
| PIB TOTAL | **DISPONÍVEL** |
| PIB PER CAPITA | **DISPONÍVEL** |
| VAB SETORIAL | **DISPONÍVEL** (até 2021) |
| SÉRIE HISTÓRICA | **VALIDADA** |
| SEMÂNTICA NOMINAL/REAL | **VALIDADA** |
| PROPOSTA DE NORMALIZAÇÃO | **SIM** |
| PERSISTÊNCIA REALIZADA | **NÃO** |
| ORQUESTRADOR ALTERADO | **NÃO** |
| FRONTEND ALTERADO | **NÃO** |
| ECO-01 ALTERADO | **NÃO** |
| PRONTO PARA ECO-02B | **COM RESSALVAS** |

