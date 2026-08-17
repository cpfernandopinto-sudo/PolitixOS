# POLITIXOS — TERRITÓRIOS 1.0

## DATA-CRITICAL-01 — Hardening dos dados críticos

**Data da homologação:** 17/08/2026  
**Escopo executado:** evidências de Segurança Pública, rótulos CNES, evidências demográficas e expansão controlada dos pilotos PIB/SICONFI.  
**Escopo preservado:** frontend, CAGED, Prompt V3, n8n, LLM, deploy, Educação, Infraestrutura e expansão nacional.

## Resultado executivo

O hardening foi concluído sem alterar nenhum valor canônico de Segurança ou Demografia. A execução criou 726 evidências mensais de Segurança para 66 municípios e 854 evidências demográficas para os 854 municípios existentes. Uma segunda aplicação do mesmo processo manteve exatamente os mesmos totais e zero duplicatas, comprovando idempotência.

Os 26 códigos de tipo de unidade CNES atualmente persistidos passaram a ter rótulo humano determinístico, sem renomear as chaves canônicas do banco. A expansão econômica controlada também foi concluída: Belo Horizonte, Betim e Contagem possuem agora a mesma cobertura homologada de PIB e SICONFI.

## 1. SEG-EVIDENCE-01 — Segurança Pública

### Cobertura homologada

| Item | Resultado |
|---|---:|
| Municípios | 66 |
| Períodos mensais | 11 |
| Indicadores por município/período | 14 |
| Indicadores antes | 10.164 |
| Indicadores depois | 10.164 |
| Evidências lógicas | 726 |
| Duplicatas lógicas | 0 |
| Duplicatas por `territory_id + source_hash` | 0 |
| Valores alterados | Não |

Cada evidência preserva território, código IBGE, período de referência, ano da fonte, recurso oficial, indicador, valor, unidade e `natureza_original`. A fonte registrada é SEJUSP-MG, dataset `crimes-violentos`, com referência ao Portal de Dados Abertos de Minas Gerais.

### Amostragem obrigatória

| Município | Evidências | Referências completas |
|---|---:|---:|
| Belo Horizonte | 11 | 11 |
| Betim | 11 | 11 |
| Contagem | 11 | 11 |

As 33 evidências amostradas contêm os 14 registros mensais esperados e todos os campos de proveniência exigidos.

## 2. SAUDE-LABELS-01 — Tipos de unidade CNES

Foi criada uma camada de leitura reutilizável em `lib/territorios/saude-indicator-labels.ts`. Ela não modifica o indicador persistido `estabelecimentos_tipo_unidade_XX`; apenas resolve o código para um nome humano.

Fontes oficiais usadas:

- catálogo histórico `TP_UNID`: `https://cnes2.datasus.gov.br/Mod_Ind_Unidade.asp?VEstado=00`;
- classificação atual do CNES: `https://cnes2.datasus.gov.br/Mod_Ind_Unidade_Novo.asp?VEstado=00`.

O código 16, ausente da listagem histórica vigente, foi explicitamente vinculado ao código 016 da classificação oficial atual, “Ambulatório”. Essa distinção de catálogo fica registrada no retorno do helper; não houve inferência silenciosa.

### Cobertura

- códigos atualmente persistidos: `2, 4, 5, 7, 16, 22, 36, 39, 40, 42, 43, 50, 60, 62, 68, 69, 70, 73, 75, 76, 77, 79, 81, 83, 84, 85`;
- códigos rotulados: 26;
- códigos sem rótulo: 0;
- testes determinísticos: 27 aprovados.

## 3. DEMO-EVIDENCE-01 — Demografia

| Item | Resultado |
|---|---:|
| Indicadores `populacao_total` | 854 |
| Territórios | 854 |
| Tabela SIDRA | 6579 |
| Variável SIDRA | 9324 |
| Evidências | 854 |
| Referências completas | 854 |
| Duplicatas lógicas | 0 |
| Duplicatas por hash | 0 |
| Valores alterados | Não |
| Linhagem | FULL |

Cada evidência contém IBGE/SIDRA, tabela 6579, variável 9324, território, período, valor, unidade, `source_record_id`, URL oficial e data de coleta preservada. Nenhum valor, histórico ou dado demográfico sintético foi criado.

## 4. PIB/SICONFI — expansão controlada dos pilotos

Os coletores existentes permitiram expansão segura e idempotente. Foram carregados Belo Horizonte e Betim; Contagem já estava homologada e foi mantida.

| Município | PIB | SICONFI | Evidências econômicas | Duplicatas de indicadores | Duplicatas de evidências |
|---|---:|---:|---:|---:|---:|
| Belo Horizonte | 244 | 42 | 50 | 0 | 0 |
| Betim | 244 | 42 | 50 | 0 | 0 |
| Contagem | 244 | 42 | 50 | 0 | 0 |

As duas novas execuções terminaram com status `completed`, sem warnings no PIB e sem falhas no SICONFI.

## 5. Verificações técnicas

- aplicação inicial das evidências: aprovada;
- reaplicação idempotente: aprovada, sem crescimento de linhas;
- impressão digital dos valores de Segurança antes/depois: idêntica;
- impressão digital dos valores demográficos antes/depois: idêntica;
- lint dos arquivos deste bloco: aprovado;
- typecheck direcionado aos arquivos deste bloco: aprovado;
- testes do helper CNES: 27/27 aprovados;
- changelog atual do Supabase consultado em 17/08/2026: nenhuma mudança incompatível com as operações PostgREST usadas neste bloco;
- typecheck global do repositório: permanece vermelho por erros já existentes e fora deste escopo em frontend e na trilha CAGED/intelligence; nenhum erro é originado pelos arquivos deste bloco.

## 6. Arquivos do bloco

- `lib/territorios/saude-indicator-labels.ts`
- `lib/territorios/saude-indicator-labels.test.ts`
- `scripts/harden-data-critical-01.ts`
- `scripts/expand-economy-pilots-data-critical-01.ts`
- `scripts/node-typescript-loader.mjs`
- `scripts/inventory-data-critical-01.ts`
- `docs/relatorios/CODEX_DATA_CRITICAL_01_TERRITORIOS_1_0.md`

## Fechamento obrigatório

```text
SEG-EVIDENCE PASS
SECURITY INDICATORS BEFORE/AFTER 10164/10164
SECURITY VALUES CHANGED NO
SECURITY EVIDENCE 726
SAUDE-LABELS PASS
CNES TYPES / LABELED / UNLABELED 26 / 26 / 0
DEMOGRAPHY EVIDENCE PASS
DEMOGRAPHY INDICATORS 854
DEMOGRAPHY VALUES CHANGED NO
DEMOGRAPHY EVIDENCE ROWS 854
DEMOGRAPHY LINEAGE FULL
PIB PILOTS DONE
SICONFI PILOTS DONE
P0 0
P1 0
P2 1 — typecheck global já estava vermelho em arquivos fora do escopo deste bloco
P3 0
READY FOR TERRITORIOS 1.0 WITH RESERVATIONS
```

### Reserva objetiva

A reserva não está nos dados homologados: ela se limita ao estado global do typecheck do repositório, afetado por alterações paralelas de frontend/CAGED/intelligence que não poderiam ser tocadas neste bloco. As quatro missões de dados deste contrato estão concluídas.
