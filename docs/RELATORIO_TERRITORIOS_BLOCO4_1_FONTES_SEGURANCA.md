# POLITIX TERRITÓRIOS — Bloco 4.1: Pesquisa de Fontes — Motor Segurança Pública

**Sprint 12 · Relatório de descoberta e arquitetura (SEM implementação)**
**Status: PESQUISA CONCLUÍDA. Fonte estadual de MG (SEJUSP/SEDS via `dados.mg.gov.br`) verificada tecnicamente com dados reais baixados e inspecionados — é viável e suficiente para o MVP Contagem/MG. Fonte nacional (SINESP/MJSP) existe mas tem uma limitação estrutural relevante (documentada na Seção 1). Nenhum código, tabela, migration ou workflow foi criado.**

---

## Metodologia e nota de transparência

Toda fonte marcada como **VERIFICADA** foi testada com uma chamada HTTP real nesta sessão (não apenas citada de busca) — na maioria dos casos, com download efetivo de um CSV real e inspeção das colunas/linhas. Fontes marcadas como **NÃO VERIFICADA (rede)** existem e são amplamente documentadas publicamente, mas os domínios não responderam a partir do ambiente de rede desta sessão (DNS não resolveu ou a API retornou 401 por WAF) — isso é uma limitação do ambiente desta sessão, não necessariamente do serviço público. Nenhuma dessas fontes foi descartada por causa disso; a limitação está sinalizada explicitamente onde relevante.

---

## 1. Fontes pesquisadas

### 1.1 `dados.mg.gov.br` — Portal de Dados Abertos de Minas Gerais (SEJUSP/SEDS) — **VERIFICADA, RECOMENDADA**

```
NOME: Crimes Violentos (Banco de Crimes Violentos)
ÓRGÃO: Secretaria de Estado de Justiça e Segurança Pública de Minas Gerais (SEJUSP-MG)
URL: https://dados.mg.gov.br/dataset/crimes-violentos
OFICIAL: SIM (dado primário, extraído do Armazém do Sistema Integrado de Defesa Social / REDS)
API: SIM, mas apenas de CATÁLOGO (CKAN Action API — `/api/3/action/package_show`) — não é uma API de consulta por município/período; o dado em si vem como arquivo CSV completo para download (um CSV por ano)
FORMATO: CSV (+ datapackage.json de metadados)
AUTENTICAÇÃO: nenhuma (download público, sem chave)
GRANULARIDADE: município (853 municípios de MG) + RISP (Região Integrada de Segurança Pública, 19 regiões) + flag RMBH (Região Metropolitana de BH)
PERIODICIDADE: mensal — extração no 5º dia útil do mês seguinte
COBERTURA GEOGRÁFICA: Minas Gerais (todos os 853 municípios, sem corte por população)
HISTÓRICO: 2019 a 2026 (um CSV por ano; dado bruto do sistema REDS existe desde 2012, mas os CSVs publicados no CKAN começam em 2019)
LICENÇA/REUSO: dado público governamental; o campo `isopen` do CKAN retorna `false` (sem licença aberta formalmente declarada) — usar como dado público oficial, não redistribuir como "open data" com licença explícita sem confirmar com a SEJUSP
LIMITAÇÕES: cobre apenas os 13 tipos de "crimes violentos" (ver Seção 3); não cobre furto, roubo detalhado por alvo, lesão corporal simples, tráfico de drogas — esses aparecem no painel interativo do site (`seguranca.mg.gov.br`), mas **não encontrei pacote CKAN correspondente** (buscas por "furto", "roubo por alvo", "lesão corporal", "veículo" não retornaram pacotes próprios — só `crimes-violentos` e um pacote de acidentes de trânsito)
```

**Evidência técnica (verificação real feita nesta sessão):**
```
GET https://dados.mg.gov.br/api/3/action/package_show?id=crimes-violentos → HTTP 200
9 recursos: crimes_violentos_2019.csv ... crimes_violentos_2026.csv + datapackage.json
Organização: "Secretaria de Estado de Justiça e Segurança Pública – SEJUSP"
Última modificação: 2026-07-29 (dado corrente, não abandonado)

Download real: crimes_violentos_2026.csv → HTTP 200, 76.771 linhas
Colunas: registros;natureza;municipio;cod_municipio;mes;ano;risp;rmbh
Amostra real (Contagem, cod_municipio=311860, jan/2026):
  10;ESTUPRO CONSUMADO;CONTAGEM;311860;1;2026;RISP 2 - CONTAGEM;SIM
```

**Nota técnica importante para a implementação futura:** `cod_municipio` neste dataset usa o código IBGE de **6 dígitos** (ex.: `311860`), sem o dígito verificador. O Motor IBGE já homologado usa o código de **7 dígitos** (ex.: `3118601`) como `codigo_ibge`. A normalização (`codigo_ibge_7_digitos = cod_municipio_6_digitos + dígito verificador`, ou simplesmente comparar os 6 primeiros dígitos) será necessária no coletor — é uma regra determinística e bem conhecida (não precisa de nova chamada de API), mas precisa ser implementada e testada.

---

### 1.2 `dados.mg.gov.br` — Violência contra a Mulher — **VERIFICADA, RECOMENDADA**

```
NOME: Violência Doméstica e Familiar contra a Mulher / Vítimas de Feminicídio
ÓRGÃO: Polícia Civil de Minas Gerais (via SEJUSP/SEDS)
URL: https://dados.mg.gov.br/dataset/violencia-contra-mulher
OFICIAL: SIM
API: mesma limitação do item 1.1 (catálogo CKAN, dado real é CSV)
FORMATO: CSV
AUTENTICAÇÃO: nenhuma
GRANULARIDADE: incidente individual (não pré-agregado) — cada linha é 1 registro, com data exata do fato, município, RISP (nomeado como "Departamento" aqui — nomenclatura diferente do dataset de Crimes Violentos, ver Riscos), natureza do delito em texto livre, e quantidade de vítimas
PERIODICIDADE: os CSVs de "Violência Doméstica" vão de 2014 a 2023 (parecem não ter sido atualizados para 2024–2026 nesta consulta); os CSVs de "Feminicídio" vão de 2018 a 2023 — **defasagem maior que o dataset de Crimes Violentos**, precisa reconfirmar antes de depender dele para dado "recente"
COBERTURA GEOGRÁFICA: Minas Gerais, todos os municípios
HISTÓRICO: 2014–2023 (violência doméstica) / 2018–2023 (feminicídio)
LICENÇA/REUSO: mesma condição do item 1.1
LIMITAÇÕES: (a) atualização mais antiga que Crimes Violentos — precisa reverificação periódica; (b) `natureza_delito` é texto livre com dezenas de valores possíveis (ex.: "AMEACA", "LESAO CORPORAL", "DESCUMPRIMENTO DE MEDIDA PROTETIVA DE URGENCIA", "PERSEGUICAO", "ACOES PREVENTIVAS"), não uma lista fechada como Crimes Violentos — exige normalização/whitelist antes de virar indicador; (c) é dado a nível de incidente, não pré-agregado — o coletor precisará agregar por (município, mês, natureza) antes de persistir como indicador
```

**Evidência técnica (real, baixada e inspecionada):**
```
GET .../violencia_domestica_2023.csv → HTTP 200, 61.537 linhas
Colunas: municipio_cod;municipio_fato;data_fato;mes;ano;risp;rmbh;natureza_delito;tentado_consumado;qtde_vitimas
```

---

### 1.3 SINESP / MJSP — Ministério da Justiça e Segurança Pública — **PARCIALMENTE VERIFICADA, LIMITAÇÃO ESTRUTURAL IMPORTANTE**

```
NOME: Ocorrências Criminais - Sinesp / Dados Nacionais de Segurança Pública
ÓRGÃO: Ministério da Justiça e Segurança Pública (MJSP/SENASP)
URL: https://www.gov.br/mj/pt-br/assuntos/sua-seguranca/seguranca-publica/estatistica (acessível, HTTP 200)
     https://dados.mj.gov.br/dataset/sistema-nacional-de-estatisticas-de-seguranca-publica (NÃO acessível a partir desta sessão — DNS não resolveu; existência confirmada por múltiplas fontes secundárias e pelo domínio gov.br oficial)
OFICIAL: SIM
API: sem evidência de API de consulta programática oficial; dado disponibilizado como planilhas/arquivos para download nos portais de dados abertos. Existe pelo menos um wrapper de terceiros no GitHub que criou uma API por cima dos arquivos abertos — sinal de que não existe API nativa.
FORMATO: CSV/XLSX (download em lote, mesmo padrão do MG)
AUTENTICAÇÃO: nenhuma (portal público)
GRANULARIDADE: **Município, mas SOMENTE para municípios acima de 100 mil habitantes** — Estado, Região e Brasil para os demais. Esta é a limitação estrutural mais importante encontrada nesta pesquisa.
PERIODICIDADE: mensal — validação em até 30 dias, dado nacional oficial disponível por volta do dia 15 do mês seguinte
COBERTURA GEOGRÁFICA: nacional (todos os estados), mas o corte de 100 mil habitantes exclui a grande maioria dos municípios brasileiros e mineiros
HISTÓRICO: dados nacionais consolidados desde a criação do SINESP (2012); "Sinesp VDE" validado desde 2023
LICENÇA/REUSO: dado público oficial
LIMITAÇÕES: (a) o corte de 100 mil habitantes é crítico — de 853 municípios de MG, apenas uma pequena fração ultrapassa esse patamar (Contagem, ~660 mil hab., está incluída; a esmagadora maioria dos municípios mineiros não estaria); (b) qualidade/completude depende de cada gestor estadual de SINESP alimentar o sistema corretamente — dado "por Estado" agrega em cima da consolidação estadual, o que já temos de forma mais granular e verificada via `dados.mg.gov.br`.
```

**Conclusão sobre esta fonte:** útil como **fonte de comparação nacional/UF** e para estados que não tenham portal próprio tão bom quanto o de MG, mas **não é uma fonte primária adequada para o MVP MG** — a fonte estadual (Seção 1.1/1.2) já é mais granular, mais completa (todos os 853 municípios, não só os acima de 100 mil) e teve verificação técnica direta nesta sessão.

---

### 1.4 Atlas da Violência (IPEA + Fórum Brasileiro de Segurança Pública) — **NÃO VERIFICADA TECNICAMENTE (rede), RELEVANTE COMO REFERÊNCIA/BENCHMARK**

```
NOME: Atlas da Violência
ÓRGÃO: IPEA (Instituto de Pesquisa Econômica Aplicada) + Fórum Brasileiro de Segurança Pública (FBSP)
URL: https://www.ipea.gov.br/atlasviolencia/  |  https://basedosdados.org/dataset/6a369357-ae3e-438d-b56e-762974ba131e
OFICIAL: SIM (mas é um produto de pesquisa/análise, não um sistema administrativo primário)
API: acesso via Base dos Dados (BigQuery público) e downloads diretos no site do IPEA — não é uma API REST convencional
FORMATO: CSV / BigQuery (via Base dos Dados)
AUTENTICAÇÃO: Base dos Dados exige conta Google/GCP para consultas via BigQuery; downloads diretos do IPEA são públicos
GRANULARIDADE: município (mas fonte primária é o Sistema de Informação de Mortalidade do Ministério da Saúde — SIM/DATASUS — não é dado de ocorrência policial)
PERIODICIDADE: anual (uma edição por ano)
COBERTURA GEOGRÁFICA: nacional
HISTÓRICO: série longa (desde os anos 1980 para alguns indicadores)
LICENÇA/REUSO: dado público de pesquisa
LIMITAÇÕES: (a) é baseado em óbitos (dados de saúde/mortalidade), não em ocorrências policiais — mede principalmente homicídios/mortes violentas, não a gama completa de crimes; (b) defasagem grande (a edição mais recente usa "ano base" de 2 anos antes da publicação, tipicamente); (c) atualização anual não serve para o "mês atual/últimos 3 meses" pedido no briefing.
```

**Recomendação:** não usar como fonte primária de coleta recorrente; é candidata natural para uma futura funcionalidade de "comparação histórica de longo prazo" ou validação cruzada de homicídios, mas fora do escopo do MVP.

---

### 1.5 `dados.gov.br` — Portal Brasileiro de Dados Abertos (nacional) — **NÃO VERIFICADA TECNICAMENTE (rede)**

```
URL: https://dados.gov.br/dataset/sistema-nacional-de-estatisticas-de-seguranca-publica
RESULTADO NESTA SESSÃO: HTTP 401 tanto na página quanto na API CKAN (`/api/3/action/package_search`), a partir deste ambiente de rede — não consegui confirmar se é um bloqueio real de acesso público ou uma particularidade do ambiente desta sessão (user-agent, IP, WAF). Não descartar a fonte com base nisso; recomendo nova tentativa em ambiente de produção/n8n antes de decidir.
```

### 1.6 Dados de bairro/região dentro de município (Belo Horizonte e outros) — **PESQUISADA, NÃO ENCONTRADA COMO FONTE ESTRUTURADA**

Pesquisei especificamente por dados abertos de criminalidade por bairro em Belo Horizonte (a maior cidade de MG, onde esse tipo de dado teria mais chance de existir). Resultado: **não encontrei nenhum portal de dados abertos, API ou CSV oficial com granularidade de bairro**. O que existe são reportagens jornalísticas (Estado de Minas, O Tempo, Rádio Itatiaia) citando números fornecidos informalmente pela PMMG por bairro, sem link para um dataset público, estruturado e reprodutível. Sites privados de terceiros (ex. "Crime Brasil") publicam rankings por bairro, mas sem documentação clara de metodologia/fonte primária verificável, o que os torna inadequados como fonte oficial de um produto político.

**Conclusão: granularidade de bairro NÃO está disponível de forma territorial consistente hoje, nem em Contagem, nem em Belo Horizonte, nem — por extensão — em nenhum outro município de MG, como dado público estruturado.**

### 1.7 Efetivo policial por município — **PESQUISADA, NÃO ENCONTRADA COMO FONTE ESTRUTURADA E ATUAL**

Encontrei apenas: (a) uma página histórica da ALMG (Assembleia Legislativa de MG) com números de efetivo por município referentes a **2014** (obsoleta); (b) números agregados estaduais (total da PMMG) via notícias. Nenhuma fonte oficial, estruturada, atual e por-município foi localizada.

### 1.8 População prisional / apreensões de drogas e armas — **NÃO PESQUISADA A FUNDO NESTE BLOCO**

O briefing pediu para investigar apenas "se territorialmente útil". O SINESP nacional lista "apreensão de arma de fogo" como um dos 28 indicadores nacionais (mesma limitação de 100 mil habitantes da Seção 1.3). Não encontrei um dataset MG-específico equivalente ao de Crimes Violentos para esse tema. População prisional depende de outro órgão (SEAP-MG / DEPEN nacional) que não foi pesquisado nesta rodada — fica registrado como possível pesquisa futura, não como decisão tomada agora.

---

## 2. Fontes descartadas

| Fonte | Motivo do descarte (para este bloco) |
|---|---|
| Dashboards interativos do `seguranca.mg.gov.br` (Furto, Lesão Corporal, Roubos/Furtos por Alvo, Veículos) | Existem visualmente no site, mas não encontrei o pacote CKAN/CSV correspondente — sem endpoint estruturado e estável para automação. Não descartada definitivamente; fica como pendência de investigação futura (pode exigir contato direto com a SEJUSP ou raspagem, que não é uma prática que eu recomendo sem aprovação explícita). |
| Sites privados de ranking por bairro (Crime Brasil e similares) | Fonte não-oficial, metodologia não auditável, risco de dado impreciso indo para um produto político. |
| Atlas da Violência (IPEA/FBSP) como fonte primária de coleta recorrente | Anual, baseado em óbitos (não ocorrência policial), defasagem grande — não atende ao requisito de "mês atual/últimos 3-12 meses". Mantido apenas como referência de benchmark de longo prazo, não como fonte de ingestão do motor. |
| Página histórica ALMG (efetivo policial 2014) | Dado obsoleto (12 anos), não territorial-corrente. |

## 3. Fontes recomendadas (para o MVP MG)

1. **`dados.mg.gov.br/dataset/crimes-violentos`** — fonte primária, homicídios/roubos/estupros/sequestros/extorsões, mensal, todos os 853 municípios.
2. **`dados.mg.gov.br/dataset/violencia-contra-mulher`** — fonte primária para violência doméstica e feminicídio (com ressalva de defasagem — ver Seção 1.2).
3. SINESP/MJSP nacional — mantido apenas como **fonte de contexto/comparação nacional futura**, não como fonte primária de coleta de MG.

## 4. APIs/endpoints encontrados (resumo técnico)

```
CKAN Action API (catálogo, não consulta de dados):
  GET https://dados.mg.gov.br/api/3/action/package_show?id=crimes-violentos          → 200, testado
  GET https://dados.mg.gov.br/api/3/action/package_show?id=violencia-contra-mulher   → 200, testado
  GET https://dados.mg.gov.br/api/3/action/package_search?q=<termo>                  → 200, testado

Download direto de dado bruto (é isto que o coletor realmente vai consumir):
  GET https://dados.mg.gov.br/dataset/29d89d80-.../resource/<id>/download/crimes_violentos_<ano>.csv   → 200, testado
  GET https://dados.mg.gov.br/dataset/ab7e00b6-.../resource/<id>/download/violencia_domestica_<ano>.csv → 200, testado
  GET https://dados.mg.gov.br/dataset/ab7e00b6-.../resource/<id>/download/feminicidio_<ano>.csv         → não baixado (URL confirmada existir no manifesto)
```

**Importante:** diferente do Motor IBGE (que tem uma API REST de consulta pontual — "me dê o dado do município X"), o padrão aqui é **download em lote de arquivo anual completo**, com o coletor precisando filtrar/agregar linhas por município e período dentro do arquivo. Isso muda a forma de implementação do coletor (não é "chame a API para 1 município", é "baixe o CSV do ano, filtre as linhas do município e do período desejado").

## 5. Granularidade (resumo)

| Fonte | Menor granularidade confirmada |
|---|---|
| Crimes Violentos (MG) | Município + RISP (região) |
| Violência contra Mulher (MG) | Município + RISP, com data exata do fato (nível de incidente) |
| SINESP/MJSP nacional | Município **apenas acima de 100 mil hab.**; UF/Região/Brasil para o resto |
| Bairro/região intramunicipal | **Não disponível** como dado público estruturado (Seção 1.6) |

**Conclusão para mapas de calor/ranking intraurbano: não é viável hoje com fonte pública verificável.** RISP é a granularidade intermediária realista disponível (região do estado, não bairro).

## 6. Indicadores — classificação A/B/C

**A) Disponível e confiável (MG, verificado tecnicamente):**
- Homicídio Consumado
- Homicídio Tentado
- Roubo Consumado / Roubo Tentado
- Estupro Consumado / Estupro Tentado / Estupro de Vulnerável (Consumado/Tentado)
- Extorsão Consumado/Tentado / Extorsão Mediante Sequestro Consumado
- Sequestro e Cárcere Privado Consumado/Tentado
- Violência Doméstica/Familiar contra a Mulher (contagem de registros por natureza, agregando o CSV de incidentes)
- Feminicídio (recurso confirmado no manifesto, não baixado ainda)

**B) Disponível com limitações:**
- Furto, Lesão Corporal, Roubos/Furtos por Alvo, Veículos — existem no dashboard do SEJUSP, mas sem endpoint estruturado confirmado (Seção 2)
- Indicadores nacionais SINESP (qualquer um dos 28) — existem, mas com corte de 100 mil habitantes
- Violência Doméstica (MG) — fonte certa, mas defasagem de atualização observada (até 2023 nos arquivos verificados)

**C) Não disponível de forma territorial consistente:**
- Dados por bairro/região intramunicipal (qualquer indicador)
- Efetivo policial atual por município
- População prisional por município (não pesquisado a fundo)
- Apreensões de drogas/armas por município em MG (só existe agregado nacional, com corte de 100 mil hab.)

## 7. Cobertura geográfica

MG: 853/853 municípios cobertos pela fonte estadual (crimes-violentos), sem corte populacional. Nacional (SINESP): cobertura de todos os estados, mas com o corte de 100 mil habitantes já descrito.

## 8. Limitações gerais

1. Nenhuma das fontes de segurança oferece uma API de consulta pontual como a do IBGE — todas exigem baixar arquivos e filtrar localmente.
2. Nomenclatura de região (RISP) é inconsistente entre os dois datasets de MG verificados (um usa "RISP N - CIDADE", outro usa "Nº Departamento - CIDADE") — precisa de normalização se formos usar essa dimensão.
3. Defasagem de atualização não é uniforme entre datasets do mesmo portal (Crimes Violentos está atualizado até 2026; Violência contra Mulher parece parar em 2023 nos recursos encontrados) — **precisa reconfirmação técnica no momento da implementação**, não presumir que todos os datasets de um mesmo portal têm o mesmo SLA de atualização.
4. Licenciamento (`isopen: false`) não está formalmente declarado como aberto no CKAN de MG — uso como dado público governamental é razoável, mas não tratar como "licença aberta" sem confirmação.
5. Volume: ingerir o histórico completo (2019–2026) de Crimes Violentos para os 853 municípios × 13 naturezas × ~12 meses/ano geraria centenas de milhares de linhas de indicador — a Seção 11 propõe um MVP com janela temporal limitada, não a carga histórica completa de uma vez.

## 9. Proposta de arquitetura (para homologação futura — nada disto foi implementado)

### 9.1 Padrão de ingestão

Diferente do Motor IBGE (API de consulta pontual), o Motor Segurança Pública terá um padrão de **download de arquivo + parse + agregação + upsert**:

```
n8n (scheduler/webhook)
  → definição do território/período (ex.: UF=MG, ano=2026)
  → download do(s) CSV(s) da fonte oficial (dados.mg.gov.br)
  → normalização (código IBGE de 6→7 dígitos, mapeamento de "natureza" → indicador_key)
  → agregação quando necessário (ex.: violência doméstica, que é por incidente, agregada em contagem por município+mês+natureza)
  → chamada ao endpoint PolitixOS (mesmo padrão machine-to-machine do Motor IBGE: secret próprio, endpoint próprio)
  → validação de payload no PolitixOS
  → persistência em territory_indicators (upsert idempotente)
  → registro em territory_collection_runs (mesmo padrão já homologado)
  → resposta estruturada
```

**Decisão de design a favor de manter a filosofia já homologada:** o parsing/normalização do CSV pode acontecer no n8n (Code node) ou no PolitixOS (endpoint recebe o CSV bruto ou já as linhas normalizadas) — recomendo que o PolitixOS receba dados já normalizados por município/período (arrays de indicadores), mantendo o n8n responsável só por buscar e converter o formato, e o PolitixOS responsável por validar regras de negócio e persistir — o mesmo contrato de responsabilidades do Motor IBGE (Seção 9 do briefing: "evitar lógica duplicada entre n8n e aplicação").

### 9.2 Schema — reaproveitar `territory_indicators`, sem nova tabela

A tabela genérica já existente é suficiente:
```
territory_id      → resolvido via codigo_ibge (mapeamento 6→7 dígitos)
categoria          = "seguranca_publica"
indicador          = ex.: "homicidio_consumado", "violencia_domestica_ameaca", "feminicidio"
valor              = contagem agregada do período
unit               = "ocorrencias" (taxa por 100k é proposta como cálculo em tempo de leitura — ver 9.3)
fonte              = "SEJUSP-MG" (ou "SINESP/MJSP" no futuro, para outros estados)
source_dataset     = "crimes-violentos" | "violencia-contra-mulher"
periodo_inicio/fim = 1º e último dia do MÊS de referência (granularidade mensal, mais fina que a anual do IBGE)
metadata/provenance = { risp, rmbh, tentado_ou_consumado } quando aplicável
```

**Não recomendo criar tabela nova nem alterar `territories`** para guardar RISP como coluna própria — motivo: RISP é uma dimensão específica de MG (não existe nos outros estados), e guardá-la como metadata do indicador evita alterar o schema territorial genérico por causa de uma fonte específica. Se, no futuro, RISP (ou equivalente) se mostrar necessária como dimensão de consulta recorrente e presente em múltiplos estados, avaliar então uma coluna dedicada — não antecipar agora.

### 9.3 Taxas por 100 mil habitantes — calcular em tempo de leitura, não persistir

Como o Motor IBGE já persiste população por município, a taxa (`ocorrências ÷ população × 100.000`) pode ser calculada dinamicamente na camada de análise/leitura, cruzando `territory_indicators` (segurança) com `territory_indicators` (população, categoria já existente do Motor IBGE) via `territory_id`. **Recomendo não persistir a taxa como um indicador coletado** — evita duplicação e evita taxas desatualizadas se a população for revisada. Fica como proposta a homologar antes da implementação.

### 9.4 Comparação com média estadual / municípios de porte semelhante

Ambas as comparações são calculáveis com o schema atual, sem alteração:
- Média estadual: `AVG`/`SUM` de `territory_indicators` para todos os municípios de MG, por indicador+período, calculado em tempo de leitura (não persistido como uma linha de indicador "fake" — mantém a mesma regra já usada no Motor IBGE de que `territory_id` é sempre obrigatório e real).
- Municípios de porte semelhante: `JOIN` com o indicador de população (Motor IBGE) para bucketizar por faixa populacional, também em tempo de leitura.

Isso pertence à futura "camada de análise territorial", não ao motor de coleta em si.

### 9.5 Adapter por fonte (para cobertura multi-estado, não implementado agora)

Adotando o padrão sugerido no briefing:
```
SecurityCollector
  → SecuritySourceAdapter (interface)
       → MinasGeraisSecurityAdapter   (dados.mg.gov.br — implementar primeiro)
       → NationalSinespAdapter        (dados.mj.gov.br/dados.gov.br — fallback/comparação, limitado a municípios >100k hab.)
       → <UF>SecurityAdapter          (a pesquisar, um por estado, quando o motor expandir para fora de MG)
```
A aplicação escolheria o adapter pela UF do território sendo coletado. Cada estado precisará de pesquisa própria (nem todos publicam dados abertos com a qualidade de MG) — **não presumir que outros estados terão portal equivalente até verificar caso a caso**.

## 10. Cobertura nacional — decisão

**Não existe uma única fonte nacional suficientemente granular e completa para todos os municípios do Brasil.** A fonte nacional (SINESP/MJSP) só cobre municípios acima de 100 mil habitantes com granularidade municipal; abaixo disso, só há dado estadual/regional/nacional agregado. A arquitetura de adapters por fonte/UF (Seção 9.5) é a recomendação técnica correta, exatamente como intuído no briefing — mas a implementação de adapters para outros estados fica fora do escopo deste bloco e do MVP.

## 11. Proposta de MVP — Contagem → Minas Gerais

**Fase MVP 1 (Contagem):** validar o coletor com 1 município, todos os indicadores da lista de 10 abaixo, últimos 12 meses disponíveis (não o histórico completo 2019–2026, para manter o volume gerenciável e a homologação rápida).

**Fase MVP 2 (Minas Gerais completo):** expandir para os 853 municípios, mesma janela de 12 meses, reaproveitando o padrão de coleta território-por-território já usado no Motor IBGE (upsert de indicador por município, run de coleta próprio).

### Top 10 indicadores recomendados (valor político + qualidade + disponibilidade + atualização + granularidade)

1. Homicídio Consumado — maior valor político, dado confiável e atual
2. Homicídio Tentado
3. Roubo Consumado
4. Roubo Tentado
5. Estupro Consumado (+ Vulnerável Consumado, se optarmos por somar)
6. Violência Doméstica/Familiar contra a Mulher (contagem agregada de registros/mês)
7. Feminicídio
8. Sequestro e Cárcere Privado Consumado
9. **Índice de Crimes Violentos** (soma das 13 naturezas do dataset — headline number já usado pela própria SEJUSP)
10. **Taxa de Crimes Violentos por 100 mil habitantes** (calculada, cruzando com população do Motor IBGE — Seção 9.3)

Indicadores como Furto, Lesão Corporal e dados por bairro ficam **fora do MVP** por não terem fonte estruturada confirmada (categoria B/C).

## 12. Schema recomendado

Nenhuma tabela nova. Reaproveitar `territory_indicators` (Seção 9.2). Nenhuma migration necessária para o MVP proposto.

## 13. Arquitetura n8n recomendada

Um workflow novo, **`POLITIX TERRITÓRIOS — SEGURANÇA (MG)`**, seguindo o mesmo padrão de segurança e responsabilidades já homologado no Motor IBGE (webhook com Header Auth próprio, secret próprio, sem hardcode, endpoint PolitixOS próprio com seu próprio secret de callback) — mas com um Code node adicional para parsing/agregação de CSV, que o Motor IBGE não precisou ter (lá o dado já vinha estruturado da API do IBGE). Não criar agora — apenas registrar a proposta.

## 14. Riscos técnicos

1. Nomenclatura de RISP inconsistente entre datasets do mesmo portal (Seção 8.2) — exige normalização cuidadosa, testável antes de confiar no dado.
2. Defasagem de atualização não uniforme entre datasets (Seção 8.3) — o coletor precisa checar `last_modified` do recurso antes de assumir que o dado está atualizado.
3. Ausência de licença aberta formalmente declarada (`isopen:false`) — uso como dado público é razoável, mas vale confirmar com a SEJUSP antes de expor publicamente no produto se isso for relevante para o cliente.
4. Volume de dados ao expandir para histórico completo (Seção 8.5) — recomenda-se janela limitada no MVP.
5. Falha de rede/DNS para `dados.mj.gov.br` e 401 para `dados.gov.br` a partir desta sessão (Seções 1.3/1.5) — precisa reconfirmação técnica em ambiente de produção/n8n antes de se apoiar nessas fontes.
6. Dataset de Violência contra Mulher é a nível de incidente (não pré-agregado) — o coletor precisa agregar corretamente (grupo por município+mês+natureza) para não gerar milhares de linhas de indicador por município.

## 15. Decisões que dependem de aprovação

1. Confirmar que o MVP deve focar exclusivamente nos 10 indicadores da Seção 11 (excluindo Furto, Lesão Corporal, dados por bairro, efetivo policial e população prisional, por falta de fonte estruturada confiável).
2. Confirmar que taxas por 100 mil habitantes e comparações estaduais/por porte populacional serão calculadas em tempo de leitura (não persistidas como indicador coletado) — Seção 9.3/9.4.
3. Confirmar que RISP será guardada apenas como metadata do indicador, sem alterar o schema de `territories` — Seção 9.2.
4. Confirmar a janela temporal do MVP (últimos 12 meses, não o histórico completo 2019–2026) — Seção 11.
5. Confirmar se o Motor Segurança Pública deve reconfirmar tecnicamente as fontes nacionais (SINESP/dados.gov.br) num ambiente sem as restrições de rede desta sessão, antes de decidir seu papel definitivo (Seção 1.3/1.5).
6. Autorizar (ou não) uma etapa futura de contato direto com a SEJUSP/dados.mg.gov.br para tentar obter os datasets de Furto/Lesão Corporal/Roubos por Alvo que aparecem no dashboard mas não no CKAN.

---

## GATE DE HOMOLOGAÇÃO

```
FONTE NACIONAL VIÁVEL:              PARCIAL (existe, mas só município acima de 100 mil hab.; útil como comparação/futuro multi-estado, não como fonte primária de MG)
FONTE MG VIÁVEL:                    SIM (dados.mg.gov.br — verificada tecnicamente, CSV real baixado e inspecionado, 853/853 municípios, sem corte populacional)
MUNICÍPIO DISPONÍVEL:               SIM (granularidade municipal confirmada tecnicamente)
BAIRRO DISPONÍVEL:                  NÃO (nenhuma fonte pública estruturada encontrada, nem em Contagem nem em BH)
HISTÓRICO DISPONÍVEL:               SIM (2019-2026 em Crimes Violentos; 2014/2018-2023 em Violência contra Mulher, com defasagem a reconfirmar)
API DISPONÍVEL:                     PARCIAL (API de catálogo/metadados via CKAN, testada e funcional; dado em si é download de arquivo em lote, não consulta pontual como o IBGE)
TOP INDICADORES RECOMENDADOS:       Homicídio Consumado/Tentado, Roubo Consumado/Tentado, Estupro Consumado, Violência Doméstica, Feminicídio, Sequestro/Cárcere Privado, Índice de Crimes Violentos, Taxa por 100k hab.
ARQUITETURA RECOMENDADA:            n8n baixa/normaliza CSV → PolitixOS valida e persiste em territory_indicators (mesmo padrão do Motor IBGE) + adapters por fonte/UF para expansão futura
ALTERAÇÃO DE SCHEMA NECESSÁRIA:     NÃO (territory_indicators já comporta; RISP fica em metadata, não em coluna nova)
WORKFLOW N8N PROPOSTO:              POLITIX TERRITÓRIOS — SEGURANÇA (MG) — proposto, NÃO criado
MVP CONTAGEM VIÁVEL:                SIM
MVP MG VIÁVEL:                      SIM
PRONTO PARA IMPLEMENTAÇÃO:          NÃO — aguardando homologação das decisões da Seção 15
```

**Gate respeitado:** nenhuma tabela, migration, workflow n8n ou código de coleta foi criado; nenhuma alteração em Supabase ou produção; DATASUS, TSE, Google News e Perplexity não foram iniciados; Motor IBGE não foi alterado. Parando aqui, como pedido, aguardando sua homologação das decisões da Seção 15 antes de qualquer implementação.
