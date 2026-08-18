# POLITIXOS — Territórios 2.0 — DATA-EXPANSION-02

Data da execução: 17/08/2026  
Agente: Codex  
Escopo: Demografia, Saúde, auditoria de Economia/SICONFI e contrato analítico de Segurança  
Pilotos: Belo Horizonte (3106200), Betim (3106705) e Contagem (3118601)

## Resultado executivo

**DATA-EXPANSION-02: PASS WITH GAPS**

- **Demografia: PASS.** A base deixou de ser apenas um número atual e passou a conter histórico anual, composição por sexo e estrutura etária censitária, com separação explícita entre estimativa e Censo.
- **Saúde: PARTIAL.** O CNES foi completado com quatro agrupamentos executivos seguros. SIM, SINASC e SIH não foram incorporados sem um pipeline municipal oficial, pequeno e reproduzível validado dentro deste gate.
- **PIB/SICONFI: PASS.** A matéria-prima existente dos três pilotos foi auditada e não foi recolhida novamente.
- **Segurança: PASS.** Foi criado catálogo canônico das 14 chaves realmente persistidas e contrato determinístico de série temporal.
- **Idempotência: PASS.** Segunda execução: Demografia 102/102 linhas `unchanged`; Saúde 114/114 indicadores em cache, sem inserção ou atualização; auditoria final com **0 duplicatas por chave natural**.
- **Frontend, CAGED, LLM, providers e deploy:** não alterados.

## Incremento implementado

### Demografia

Fontes oficiais:

- IBGE/SIDRA, tabela 6579, variável 9324 — população residente estimada, periodicidade anual: <https://sidra.ibge.gov.br/tabela/6579>
- IBGE/SIDRA, tabela 9514, variável 93 — Censo 2022 por sexo e idade: <https://sidra.ibge.gov.br/tabela/9514>

Por município-piloto foram reconciliadas 34 linhas:

- 21 observações anuais válidas de população estimada entre 2001 e 2025. A fonte não publica valores na tabela 6579 para 2007, 2010, 2022 e 2023; nenhum ponto foi interpolado.
- 13 indicadores do Censo 2022: população censitária total; população masculina e feminina; percentuais masculino e feminino; crianças, jovens, adultos e idosos em valor absoluto e percentual.
- As faixas analíticas foram somadas exclusivamente a partir das faixas quinquenais oficiais da tabela 9514: crianças 0–14; jovens 15–29; adultos 30–59; idosos 60+.
- Cada linha registra `reference_period`, `source_table`, `variable`, `territory`, `unit`, `method_context`, `source_url` e `collected_at`.
- Censo e estimativa usam datasets distintos (`SIDRA_9514` e `SIDRA_6579`) e não são misturados silenciosamente.

O histórico já permite ao produto calcular evolução, variação absoluta e percentual entre períodos sem persistir cópias derivadas. Não foram fabricadas idade média/mediana, domicílios ou urbanização sem uma fonte municipal atual homologada no gate.

### Saúde

Fonte oficial: API de Dados Abertos DATASUS/CNES — <https://apidadosabertos.saude.gov.br/cnes/estabelecimentos>

O snapshot de 17/08/2026 processou:

| Município | Registros CNES brutos | Indicadores no snapshot | UBS | Atenção primária | Hospitalares por tipo | Urgência/emergência |
|---|---:|---:|---:|---:|---:|---:|
| Belo Horizonte | 7.164 | 43 | 167 | 168 | 91 | 53 |
| Betim | 515 | 35 | 42 | 42 | 4 | 11 |
| Contagem | 1.044 | 36 | 70 | 70 | 8 | 21 |

Os quatro novos agrupamentos são derivados determinísticos de códigos oficiais do tipo de unidade CNES:

- UBS: tipo 2;
- atenção primária: tipos 1, 2, 15 e 71;
- hospitalares por tipo: tipos 5, 7 e 62;
- urgência/emergência: tipos 20, 21, 42, 73 e 76.

Eles não substituem os 26 rótulos semânticos já homologados e não inventam uma categoria “UPA” quando a fonte expõe apenas o tipo oficial “Pronto Atendimento”. Leitos e profissionais permanecem como discovery futuro. SIM, SINASC e SIH foram conscientemente mantidos fora: neste prazo, não foi validado um acesso municipal oficial com contrato estável, volume controlado, lineage completo e teste de idempotência.

### Economia / PIB / SICONFI

Nenhuma recolha foi feita. Cada piloto mantém 826 linhas de Economia no conjunto auditado, cobrindo:

- `IBGE_SIDRA_5938`;
- `IBGE_PIB_MUNICIPIOS_BASE`;
- `SICONFI_DCA`;
- `NOVO_CAGED`.

O conjunto vai de 2002-01-01 a 2026-06-30, com 52 períodos distintos. As 1.620 linhas homologadas do Novo CAGED (540 por piloto) não foram alteradas.

### Segurança

O banco contém, para cada piloto, 154 linhas: 14 indicadores × 11 períodos, de agosto/2025 a junho/2026.

Foi criado um catálogo fechado `indicator_key → label → grupo analítico` com os grupos:

- violência sexual;
- violência letal;
- roubo;
- extorsão;
- sequestro/cárcere privado;
- índice oficial de crimes violentos.

O contrato analítico calcula `current`, `previous`, `delta`, `trend`, `peak`, `low` e `average` a partir da série ordenada. O frontend anterior buscava `furto_consumado` e `veiculos_roubo_furto`, mas essas chaves **não existem** no dataset homologado de Crimes Violentos da SEJUSP-MG. O resultado zero era uma incompatibilidade de contrato, não ausência comprovada de ocorrências. Conforme o gate, o frontend não foi alterado.

## Matriz obrigatória

| Domínio | Source / dataset | Indicators before | Indicators after | Territories | Min / max | Periods | Evidence | Lineage | Idempotency | Frontend KPI potential | Frontend chart potential | LLM readiness |
|---|---|---:|---:|---:|---|---:|---|---|---|---|---|---|
| Demografia | IBGE/SIDRA 6579 + 9514 | 1 linha atual/piloto | 34 linhas e 14 chaves/piloto | 3 | 2001–2025; Censo 2022 | 22 | 3 registros/piloto no acervo, incluindo evidências novas 6579/9514 | FULL | PASS — 34 unchanged/piloto | população, crescimento, sexo, faixas etárias | linha histórica, composição, pirâmide/faixas | READY WITH KNOWN GAPS |
| Saúde | DATASUS/CNES | 8 capacidades + tipos presentes | +4 grupos executivos; 43/35/36 chaves no snapshot | 3 | snapshot 17/08/2026 | 1 novo snapshot, histórico preservado | 1–2 registros/piloto no acervo | FULL para CNES | PASS — cache hit e 0 writes | total, UBS, atenção primária, hospitalar, urgência | composição por tipo e capacidades | PARTIAL — sem epidemiologia |
| Economia / PIB | IBGE 5938 + base PIB | 286 linhas/piloto PIB/SICONFI no baseline | inalterado | 3 | 2002–2023 para PIB; conjunto Economia até 2026-06 | conforme fonte | já homologada | FULL | não reprocessado | PIB total/per capita, VA setorial, finanças | séries anuais e composição | READY |
| SICONFI | Tesouro/SICONFI DCA | presente nos 286 registros críticos/piloto | inalterado | 3 | conforme DCA persistida | conforme fonte | já homologada | FULL | não reprocessado | receita, despesa, investimento e resultado quando existentes | séries fiscais anuais | READY |
| Segurança | SEJUSP-MG crimes-violentos | 14 chaves reais | 14 chaves + catálogo e contrato analítico | 66 na base; 3 auditados | 2025-08 a 2026-06 | 11 | 726 na base homologada | FULL | sem reingestão; 0 duplicatas | índice, homicídio, roubo e grupos existentes | série, tendência, extremos e média | READY |

## Auditoria e testes

- Testes do escopo: **30 aprovados** em 7 arquivos.
- Lint dos arquivos alterados: **aprovado, 0 erros**.
- Typecheck global: bloqueado por dois erros preexistentes em `lib/territorios/intelligence/economy/caged-employment-signals.ts` (comparação de `string | number | null` com `boolean`). O arquivo pertence ao CAGED e não foi alterado por restrição expressa deste gate.
- Duplicatas por chave natural entre todos os indicadores dos três pilotos: **0**.
- Metadados vazios nos 102 indicadores demográficos: **0**.
- Total auditado nos três pilotos após o gate: 10.522 indicadores e 781 evidências em todos os domínios existentes.

## Readiness por motor

| Motor | Readiness | Observação |
|---|---|---|
| Demography | ON_DEMAND_READY | coleta pequena por lista de municípios; estimativa e Censo separados |
| Health | ON_DEMAND_READY / PARTIAL | CNES com cache de 24h; epidemiologia pendente |
| PIB | ON_DEMAND_READY | motor existente auditado |
| SICONFI | ON_DEMAND_READY | motor existente auditado |
| Security | ON_DEMAND_READY | matéria-prima existente; catálogo impede chaves imaginárias |

## Respostas executivas do gate

1. **A população possui evolução oficial?** Sim, 21 pontos anuais válidos por piloto, sem interpolação.
2. **Censo e estimativas estão separados?** Sim, por dataset, metodologia e metadados.
3. **A base suporta composição etária e por sexo?** Sim, com valores absolutos e percentuais do Censo 2022.
4. **Domicílios e urbanização estão prontos?** Não; são gaps explícitos, não zeros artificiais.
5. **Saúde já suporta leitura executiva de oferta?** Sim para estabelecimentos, tipos e quatro grupos; não para mortalidade, nascimentos, internações, leitos e profissionais.
6. **Economia precisou ser recolhida?** Não; PIB/SICONFI já estavam suficientes e foram preservados.
7. **Por que apareciam zeros de furtos?** Porque a camada consumidora buscava chaves ausentes do contrato real de Crimes Violentos.
8. **A expansão está pronta para consumo analítico/LLM?** Demografia, Economia e Segurança estão prontas com os limites documentados; Saúde está parcial até a homologação de pelo menos uma série epidemiológica.

## Próximo gate recomendado

`DATA-EXPANSION-03 — SAÚDE EPIDEMIOLÓGICA CONTROLADA`: discovery e homologação isolada de uma única série municipal (preferencialmente SIM ou SINASC), com dicionário oficial, período pequeno, denominadores explícitos, evidência e rerun idempotente. Em paralelo, homologar uma tabela municipal atual de domicílios/média de moradores antes de completar a Demografia. Não iniciar SIH, leitos e profissionais no mesmo microbloco.

