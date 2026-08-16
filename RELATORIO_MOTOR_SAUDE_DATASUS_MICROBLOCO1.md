# PolitixOS Territórios — Motor Saúde v1 / Microbloco 1

## 1. Resumo executivo

Foi construído, de forma isolada, o primeiro motor municipal de Saúde baseado em fonte oficial real. O MVP coleta estabelecimentos ativos do CNES para um `codigo_ibge`, normaliza capacidades e tipos de unidade, persiste no modelo territorial genérico e produz evidência e execução auditáveis. Em Contagem/MG foram coletados 1.045 registros brutos e materializados 32 indicadores, sem duplicidade. Não houve integração ao Orquestrador, alteração de frontend ou deploy.

## 2. Estado anterior

O repositório já possuía `territories`, `territory_indicators`, `territory_evidence` e `territory_collection_runs`, motores IBGE/TSE/Segurança e o indicador demográfico `populacao_total`. Não havia coletor Saúde/CNES.

## 3. Objetivo executado

Inventariar fontes oficiais, selecionar um MVP de alto valor e provar o fluxo fonte oficial → coleta → normalização → território → persistência → contrato padronizado, usando Contagem (`3118601`).

## 4. Fontes oficiais investigadas

| Classe | Órgão/base | Valor municipal | Decisão |
|---|---|---|---|
| A | Ministério da Saúde — CNES Estabelecimentos | oferta, rede, capacidades e tipos | implementado |
| B | DATASUS — CNES Recursos Físicos/Leitos | capacidade instalada, leitos SUS/não SUS, série mensal | próximo microbloco |
| B | DATASUS — SIM | mortalidade por município, causa, sexo e idade | motor histórico específico |
| B | DATASUS — SINASC | nascidos vivos e perfil materno/recém-nascido | motor histórico específico |
| B | DATASUS — SIH/SUS e SIA/SUS | internações e produção assistencial | motor por competência |
| B | Ministério da Saúde — SINAN | agravos de notificação, menor desagregação municipal | motor epidemiológico |
| B | Ministério da Saúde — vacinação Covid-19 | doses por município/dia desde 2021 | motor próprio/alto volume |
| C | SIOPS/informações financeiras | despesas e receitas municipais de saúde | motor fiscal de Saúde |
| C | SISAB/e-Gestor APS | atenção primária e cobertura | validar acesso e contrato estável |
| D | campos cadastrais de contato/endereço individual | baixo valor agregado e risco de excesso de dados | não persistidos |

## 5. URLs, endpoints e datasets

- Portal oficial: https://dadosabertos.saude.gov.br
- Documentação da API: https://apidadosabertos.saude.gov.br/v1/
- Endpoint implementado: https://apidadosabertos.saude.gov.br/cnes/estabelecimentos
- CNES Estabelecimentos: https://datasus.saude.gov.br/cnes-estabelecimentos
- CNES Recursos Físicos: https://datasus.saude.gov.br/cnes-recursos-fisicos/
- Catálogo Hospitais e Leitos: https://dadosabertos.saude.gov.br/dataset/hospitais-e-leitos/resource/e375527a-6793-4992-ad3a-8cf6a01fbaa3
- SIM: https://datasus.saude.gov.br/mortalidade-desde-1996-pela-cid-10/
- SINASC: https://datasus.saude.gov.br/nascidos-vivos-desde-1994/
- SINAN: https://www.gov.br/saude/pt-br/composicao/svsa/sistemas-de-informacao/sinan/sinan
- Transparência SINAN: https://www.gov.br/saude/pt-br/acesso-a-informacao/sic/dados-em-transparencia-ativa/svsa/agravos-de-notificacoes/agravos-de-notificacoes
- SIH/SIA/SIOPS: https://datasus.saude.gov.br/informacoes-financeiras/
- Vacinação Covid-19: https://dadosabertos.saude.gov.br/dataset/covid-19-vacinacao

## 6. Inventário de campos relevantes

O endpoint CNES expõe código CNES, CNPJ, nomes, gestão/esfera, tipo de unidade, município/UF, natureza jurídica, localização/endereço/contato, turno, atendimento ambulatorial SUS, capacidades cirúrgica/obstétrica/neonatal, atendimento hospitalar, apoio, atendimento ambulatorial, atividade de ensino e data de atualização. O MVP usa apenas códigos, tipo, capacidades, indicador SUS, município e data; não replica contato, e-mail, endereço, CNPJ ou nomes individuais.

## 7. Granularidade territorial

Registro por estabelecimento, filtrável por código municipal CNES de seis dígitos. A conversão validada é `3118601` (IBGE) → `311860` (CNES). A persistência agregada permanece ligada ao `territory_id` de Contagem.

## 8. Granularidade temporal

Snapshot com `data_atualizacao` da fonte preservada em `periodo_inicio`, `periodo_fim` e `source_updated_at`. Novas datas formam novas chaves naturais e preservam histórico.

## 9. Frequência de atualização

CNES Estabelecimentos é anunciado no catálogo oficial como diário; CNES Leitos possui competência/atualização mensal. A coleta deve respeitar cache/cobertura quando integrada futuramente.

## 10. Cobertura histórica

O endpoint MVP fornece estado cadastral atual e datas de atualização. O catálogo de Leitos oferece recursos mensais históricos (identificados desde 2007). SIM cobre desde 1996; SINASC desde 1994; vacinação Covid-19 desde 2021. O MVP não mistura séries heterogêneas.

## 11. Mapa de valor analítico

- **A:** estoque de estabelecimentos, atendimento SUS e capacidades; comparável territorialmente, per capita, ranqueável e apto a alertas de mudança de capacidade.
- **B:** leitos, profissionais/equipamentos, mortalidade, nascimentos, internações, produção, notificações e vacinação; permitem tendências, pressão assistencial, sazonalidade, benchmark e alertas.
- **C:** finanças/SIOPS e APS/SISAB após contratos específicos e validação de custo/estabilidade.
- **D:** dados cadastrais individuais e campos redundantes sem ganho analítico agregado.

Para A/B, os dados são municipais e periódicos; podem gerar comparação temporal e territorial, taxas com IBGE, ranking, benchmark e alertas. Interpretação política possível: suficiência/pressão da rede, dependência de tipos de unidade, lacunas obstétricas/neonatais, capacidade SUS e evolução da oferta. Não se deve inferir qualidade assistencial apenas da existência cadastral.

## 12. Indicadores implementados

`estabelecimentos_total`, `estabelecimentos_atendimento_sus`, `estabelecimentos_atendimento_hospitalar`, `estabelecimentos_atendimento_ambulatorial`, `estabelecimentos_servico_apoio`, `estabelecimentos_centro_cirurgico`, `estabelecimentos_centro_obstetrico`, `estabelecimentos_centro_neonatal` e um indicador por `codigo_tipo_unidade`. Total: 32 indicadores no snapshot de Contagem.

## 13. Indicadores deriváveis

Estabelecimentos/capacidades por 1 mil, 10 mil ou 100 mil habitantes; participação SUS; composição percentual por tipo; concentração de oferta; variação entre snapshots. As taxas não foram materializadas para evitar redundância.

## 14. Cruzamento com IBGE

O `populacao_total=651718` (referência 2025) já existe para o mesmo `territory_id`; o join está pronto sem nova coleta nem alteração do Motor IBGE.

## 15. Comparação territorial futura

Município × estado, pares populacionais, RMBH e clusters socioeconômicos; ranking por capacidade per capita; distância da mediana; evolução e alertas de redução/aumento.

## 16. Arquitetura implementada

Cliente paginado CNES → normalizador determinístico → resolução em `territories` → reconciliação por chave natural → indicadores + evidência oficial + run observável. Sem rota pública ou acoplamento ao Orquestrador.

## 17. Arquivos criados

- `lib/territorios/saude-cnes-client.ts`
- `lib/territorios/saude-cnes-normalizer.ts`
- `lib/territorios/saude-collector.ts`
- `lib/territorios/saude-cnes-client.test.ts`
- `lib/territorios/saude-cnes-normalizer.test.ts`
- `scripts/audit-saude-cnes-contagem.ts`
- `RELATORIO_MOTOR_SAUDE_DATASUS_MICROBLOCO1.md`

## 18. Arquivos alterados

Nenhum arquivo pré-existente foi alterado. Todos os artefatos do motor são novos e isolados.

## 19. Banco/schema utilizado

Reutilizados `territories`, `territory_indicators`, `territory_evidence` e `territory_collection_runs`. Nenhuma migration e nenhuma tabela específica de Saúde.

## 20. Natural keys

Indicadores: território + categoria + indicador + fonte + dataset + período inicial/final, conforme índice existente. Evidência: território + `source_hash`. O hash é SHA-256 determinístico dos pares ordenados código CNES/data de atualização.

## 21. Idempotência

Reconciliação por chave natural e `source_hash`: fonte idêntica fica `unchanged`; alteração real atualiza; `force_refresh=true` regrava explicitamente sem inserir outra linha; evidência usa upsert pelo hash.

## 22. Contrato de entrada

```json
{"codigoIbge":"3118601","forceRefresh":false,"requestId":null}
```

## 23. Contrato de saída

Inclui `engine`, `status`, `codigoIbge`, `requestId`, `inserted`, `updated`, `unchanged`, `recordsPersisted`, `evidencePersisted`, `coverage` (dataset/data/registros/páginas), `error` e `timings`.

## 24. Teste real de Contagem

Executado em 13/08/2026 contra API oficial e Supabase configurado, território `3118601`, sem fixture.

## 25. Registros coletados

1.045 estabelecimentos ativos em 53 páginas; referência máxima `2026-08-13`.

## 26. Quantidade persistida

32 indicadores normalizados e uma evidência oficial única.

## 27. Contagens antes/depois

Primeira carga efetiva: indicadores 0 → 32; evidências 0 → 1. Auditoria final partiu de 32/1 e permaneceu 32/1 em todas as rodadas.

## 28. Segunda execução

`inserted=0`, `updated=0`, `unchanged=32`; indicadores adicionais 0; evidências adicionais 0; duplicidades 0.

## 29. Force refresh

`inserted=0`, `updated=32`, `unchanged=0`; indicadores adicionais 0; evidências adicionais 0; duplicidades 0.

## 30. Tempos

Auditoria final: execução normal 10,13 s (fetch 7,61 s; normalização 0,02 s; persistência 1,81 s); repetição 8,38 s (fetch 6,75 s; normalização 0,02 s; persistência 1,11 s); force refresh 18,52 s (fetch 7,04 s; normalização 0,001 s; persistência 10,91 s). A qualidade/cobertura foi preservada.

## 31. Testes executados

TypeScript sem erros; ESLint dos arquivos novos sem erros; 5 testes unitários do cliente/normalizador aprovados; prova real e reconciliação real aprovadas; suíte territorial completa com **28 arquivos e 224 testes aprovados**.

## 32. Build

`npm run build` aprovado com Next.js 16.2.6/Turbopack: compilação, TypeScript, coleta de dados, 18 páginas estáticas e finalização concluídos sem erro.

## 33. Regressões

IBGE, TSE e Segurança não foram editados. Orquestrador e frontend não foram editados. A suíte territorial completa passou (28/28 arquivos; 224/224 testes). **Regressões identificadas: não.**

## 34. Riscos

Mudança de contrato/paginação da API; cadastro ativo não equivale a serviço efetivamente disponível; datas heterogêneas por estabelecimento; códigos de tipo ainda precisam de dimensão descritiva oficial; volume cresce na expansão regional; ausência/atraso da fonte deve ser tratado sem fabricar zero.

## 35. Limitações

CNES é cadastro administrativo; pode ter defasagem e inconsistências locais. O endpoint limita 20 itens por página. O indicador SUS utilizado é especificamente atendimento ambulatorial SUS. Não há inferência de qualidade, ocupação ou demanda.

## 36. Dados não implementados

Leitos, profissionais, equipamentos, SIM, SINASC, SIH, SIA, SINAN, vacinação, SIOPS e APS foram deliberadamente preservados para motores/etapas próprias, evitando agregação prematura e perda temporal.

## 37. Oportunidades futuras

Leitos por 10 mil habitantes, profissionais por mil, pressão internações/leitos, causas evitáveis de mortalidade, cobertura/produção APS, sazonalidade epidemiológica, benchmark RMBH e alertas de perda de capacidade.

## 38. Pendências

Auditoria independente do Claude; homologar dimensão dos tipos CNES; política de cache/TTL; tratamento padronizado `not_available` no contrato global; testes de falha do coletor com mock de banco; decidir e implementar datasets B em microblocos; integrar somente após gate.

## 39. Rollback

O código é removível apagando apenas os sete arquivos listados. Para dados, rollback deve ser transacional e restrito ao `territory_id` de Contagem, `categoria='saude'`, `fonte='DATASUS'`, `source_dataset='CNES_ESTABELECIMENTOS'`, evidências `tema='saude' AND source_name='DATASUS/CNES'` e runs `source='datasus' AND workflow_name='datasus-cnes-health-v1'`. Não executar rollback amplo e não tocar outros motores.

## 40. Gate final

- MOTOR SAÚDE v1 CONSTRUÍDO? **SIM**
- FONTE OFICIAL REAL? **SIM**
- CONTAGEM COLETADA COM DADOS REAIS? **SIM**
- PERSISTÊNCIA CONFIRMADA? **SIM**
- IDEMPOTÊNCIA CONFIRMADA? **SIM**
- HISTÓRICO TEMPORAL PRESERVADO? **SIM**, por data de referência; série profunda depende dos datasets B
- CRUZAMENTO COM IBGE POSSÍVEL? **SIM**
- IBGE ALTERADO? **NÃO**
- TSE ALTERADO? **NÃO**
- SEGURANÇA ALTERADA? **NÃO**
- ORQUESTRADOR ALTERADO? **NÃO**
- FRONTEND ALTERADO? **NÃO**
- REGRESSÕES? **NÃO**
- RELATÓRIO GERADO? **SIM**
- PRONTO PARA AUDITORIA DO CLAUDE? **SIM**
- PRONTO PARA INTEGRAR AO ORQUESTRADOR? **NÃO — integração depende de auditoria/homologação.**
