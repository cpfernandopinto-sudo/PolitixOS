# POLITIXOS TERRITÓRIOS — Bloco 5.5A — Homologação canônica da RMBH

**Data:** 11/08/2026

**Escopo:** identificação, registro e homologação territorial da Região Metropolitana de Belo Horizonte.

**Fora do escopo:** carga RMBH, downloads ou processamento TSE, indicadores, evidências, UX, n8n, schema, migration, deploy e merge.

## 1. Gate de segurança

O trabalho foi executado em `main`, sobre worktree com alterações preexistentes de terceiros. Não houve reset, stash, merge ou modificação dos arquivos visuais. O microbloco ficou isolado em um registro territorial, seu teste, um validador somente leitura e este relatório.

```text
WORKTREE SEGURO:                     SIM, com isolamento estrito
ALTERAÇÕES DE TERCEIROS DETECTADAS:  SIM
RISCO DE CONFLITO:                   MÉDIO
SCHEMA/BANCO ALTERADO:               NÃO
CARGA RMBH EXECUTADA:                NÃO
DOWNLOAD TSE EXECUTADO:              NÃO
```

## 2. Inventário das fontes internas

| Fonte interna | Conteúdo encontrado | Autoridade para pertencimento metropolitano | Decisão |
|---|---|---|---|
| Catálogo `territories` | município, UF, código IBGE e recortes geográficos do IBGE | insuficiente: não registra pertencimento legal à RMBH | usado para resolver e conferir os 34 códigos |
| Motor Segurança/SEJUSP-MG | campo temático bruto `rmbh`, RISP e indicadores de segurança | não: preserva a classificação da fonte temática | auditado, sem alteração |
| Motor TSE | resolução IBGE↔TSE e dados eleitorais | não: TSE não define região metropolitana | apenas compatibilidade pelo catálogo; motor não executado nem alterado |
| Fixtures e tipos | comparações rotuladas como RMBH | não: são contratos/valores de apresentação, não inventário legal | não alterados |
| Relatórios anteriores | recomendação de carga controlada | não continham lista canônica homologada | usados apenas como contexto |

Não existia no repositório um registro central, versionado e juridicamente referenciado para a RMBH.

## 3. Fonte canônica e critério

A autoridade selecionada foi a **Assembleia Legislativa do Estado de Minas Gerais (ALMG)**, por meio da **Lei Complementar estadual nº 89, de 12 de janeiro de 2006, art. 2º**, no texto oficial vigente disponibilizado em:

<https://www.almg.gov.br/legislacao-mineira/texto/LCP/89/2006/>

O art. 2º enumera expressamente os municípios que compõem a Região Metropolitana de Belo Horizonte. Essa definição legal é superior, para a pergunta de pertencimento territorial, a flags oriundas de motores temáticos. A versão interna foi identificada como `LCP-MG-89-2006-art-2` e registra a data de consulta `2026-08-11`.

## 4. Implementação

Foi criado um registro territorial central e extensível em `lib/territorios/regional-registry.ts`, fora dos motores Segurança e TSE. O contrato usa código IBGE como chave e expõe:

- `getCanonicalRegion("RMBH")`;
- `getTerritoriesByRegion("RMBH")`;
- `isTerritoryInRegion("RMBH", ibgeCode)`;
- `compareRegionClassification("RMBH", externalByIbge)`.

A implementação não contém condicionais especiais para Belo Horizonte nem listas dispersas por consumidor. Uma atualização legal futura deve gerar uma nova versão explícita do registro.

## 5. Matriz canônica homologada

| # | IBGE | Município | UF | Catálogo `territories` | Segurança/SEJUSP | Compatibilidade TSE |
|---:|---|---|---|---|---|---|
| 1 | 3105004 | Baldim | MG | OK | SIM | resolvível pelo catálogo |
| 2 | 3106200 | Belo Horizonte | MG | OK | **NÃO** | resolvível pelo catálogo |
| 3 | 3106705 | Betim | MG | OK | SIM | resolvível pelo catálogo |
| 4 | 3109006 | Brumadinho | MG | OK | SIM | resolvível pelo catálogo |
| 5 | 3110004 | Caeté | MG | OK | SIM | resolvível pelo catálogo |
| 6 | 3112505 | Capim Branco | MG | OK | SIM | resolvível pelo catálogo |
| 7 | 3117876 | Confins | MG | OK | SIM | resolvível pelo catálogo |
| 8 | 3118601 | Contagem | MG | OK | SIM | resolvível pelo catálogo |
| 9 | 3124104 | Esmeraldas | MG | OK | SIM | resolvível pelo catálogo |
| 10 | 3126000 | Florestal | MG | OK | SIM | resolvível pelo catálogo |
| 11 | 3129806 | Ibirité | MG | OK | SIM | resolvível pelo catálogo |
| 12 | 3130101 | Igarapé | MG | OK | SIM | resolvível pelo catálogo |
| 13 | 3132206 | Itaguara | MG | OK | SIM | resolvível pelo catálogo |
| 14 | 3133709 | Itatiaiuçu | MG | OK | SIM | resolvível pelo catálogo |
| 15 | 3134608 | Jaboticatubas | MG | OK | SIM | resolvível pelo catálogo |
| 16 | 3136652 | Juatuba | MG | OK | SIM | resolvível pelo catálogo |
| 17 | 3137601 | Lagoa Santa | MG | OK | SIM | resolvível pelo catálogo |
| 18 | 3140159 | Mário Campos | MG | OK | SIM | resolvível pelo catálogo |
| 19 | 3140704 | Mateus Leme | MG | OK | SIM | resolvível pelo catálogo |
| 20 | 3141108 | Matozinhos | MG | OK | SIM | resolvível pelo catálogo |
| 21 | 3144805 | Nova Lima | MG | OK | SIM | resolvível pelo catálogo |
| 22 | 3136603 | Nova União | MG | OK | SIM | resolvível pelo catálogo |
| 23 | 3149309 | Pedro Leopoldo | MG | OK | SIM | resolvível pelo catálogo |
| 24 | 3153905 | Raposos | MG | OK | SIM | resolvível pelo catálogo |
| 25 | 3154606 | Ribeirão das Neves | MG | OK | SIM | resolvível pelo catálogo |
| 26 | 3154804 | Rio Acima | MG | OK | SIM | resolvível pelo catálogo |
| 27 | 3155306 | Rio Manso | MG | OK | SIM | resolvível pelo catálogo |
| 28 | 3156700 | Sabará | MG | OK | SIM | resolvível pelo catálogo |
| 29 | 3157807 | Santa Luzia | MG | OK | SIM | resolvível pelo catálogo |
| 30 | 3162922 | São Joaquim de Bicas | MG | OK | SIM | resolvível pelo catálogo |
| 31 | 3162955 | São José da Lapa | MG | OK | SIM | resolvível pelo catálogo |
| 32 | 3165537 | Sarzedo | MG | OK | SIM | resolvível pelo catálogo |
| 33 | 3168309 | Taquaraçu de Minas | MG | OK | SIM | resolvível pelo catálogo |
| 34 | 3171204 | Vespasiano | MG | OK | SIM | resolvível pelo catálogo |

Resultado: 34 municípios, 34 códigos IBGE únicos, todos em Minas Gerais, nenhum município indevido e nenhuma ausência no catálogo interno.

## 6. Auditoria da divergência de Belo Horizonte

A leitura paginada dos 10.164 indicadores de Segurança relacionados ao conjunto regional mostrou:

- 33 municípios únicos marcados `metadata.rmbh = "SIM"`;
- todos os registros de Belo Horizonte marcados `metadata.rmbh = "NÃO"`;
- Belo Horizonte corretamente associado a `RISP 1 - BH`;
- nenhuma inconsistência de classificação dentro de um mesmo município;
- ausência de erro de join, código IBGE, normalização ou registro faltante.

O cliente de Segurança lê a coluna `rmbh` do CSV e o coletor a preserva diretamente em `metadata`. Logo, a divergência é uma classificação da fonte temática SEJUSP-MG, não um defeito do inventário municipal do PolitixOS.

**Decisão:** não reescrever o dado da Segurança. Alterá-lo apagaria a proveniência da fonte. Para perguntas territoriais, o registro canônico legal é a autoridade; para auditoria da fonte de Segurança, o valor bruto permanece disponível. A única divergência encontrada e esperada é Belo Horizonte: membro canônico `SIM`, classificação temática `NÃO`.

## 7. Validação e testes

O teste automatizado do registro cobre:

- total exato de 34 municípios;
- presença de Belo Horizonte e Contagem;
- unicidade de códigos IBGE e de município+UF;
- somente códigos IBGE mineiros válidos;
- comparação explícita com a Segurança, mantendo Belo Horizonte no conjunto canônico.

O validador `scripts/validate-rmbh-registry.ts` faz somente leituras no Supabase, compara os 34 membros com `territories` e com o metadado SEJUSP e produz a matriz operacional. Ele não persiste dados nem aciona o TSE.

Resultados finais:

```text
RMBH canônica:              34
Correspondências catálogo:  34
Códigos IBGE duplicados:     0
Municípios fora de MG:       0
Divergências Segurança:      1 (Belo Horizonte)
TypeScript:                  PASS
Testes impactados:           PASS
ESLint do microbloco:        PASS
git diff --check:            PASS
```

## 8. Limites e liberação

O catálogo territorial foi alterado **somente no domínio de código**, com um registro central versionado. A tabela Supabase `territories`, o schema e os dados persistidos não foram alterados. Não houve carga RMBH, coleta eleitoral, download, indicadores ou evidências.

Com a composição legal homologada e todos os membros resolvidos no catálogo interno, o inventário está liberado para o Bloco 5.5B. Essa liberação não executa nem autoriza implicitamente a carga neste microbloco.

## 9. Arquivos do Bloco 5.5A

```text
lib/territorios/regional-registry.ts
lib/territorios/regional-registry.test.ts
scripts/validate-rmbh-registry.ts
docs/RELATORIO_TERRITORIOS_BLOCO5_5A_HOMOLOGACAO_RMBH.md
```
