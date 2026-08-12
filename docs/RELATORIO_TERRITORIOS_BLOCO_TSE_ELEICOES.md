# POLITIX TERRITÓRIOS — Motor TSE / Eleições / Substituição DEMO → REAL

**Data:** 11/08/2026  
**Território piloto:** Contagem/MG — IBGE `3118601` — TSE `43710`  
**Status:** implementado, persistido, ligado ao Caderno Eleições e validado localmente. Sem deploy, sem n8n e sem migration.

## 1. Arquitetura e escopo

Fluxo implantado:

```text
Dados Abertos TSE (ZIP/CSV oficial)
→ download e seleção do CSV da UF
→ normalização municipal/turno/cargo
→ mapeamento seguro IBGE ↔ TSE
→ indicadores + metadados de origem
→ territory_indicators / territory_evidence / territory_collection_runs
→ repositório eleitoral
→ resolução por campo REAL / DEMO / DERIVADO
→ Caderno Eleições
```

O motor não contém condição especial para Contagem. Recebe `codigo_ibge`, resolve território e UF no catálogo, resolve `codigo_tse` por correspondência única UF + nome normalizado na primeira coleta e persiste o código no `metadata.tse` do território. Depois disso reutiliza o código persistido; nome nunca é a chave definitiva.

## 2. Fontes oficiais

| Bloco | Fonte oficial | Dataset/recurso | Granularidade | Frequência | Licença |
|---|---|---|---|---|---|
| Eleitorado, comparecimento, abstenção, válidos, brancos e nulos | Tribunal Superior Eleitoral | `detalhe_votacao_munzona_{ano}` | município + zona + turno + cargo | uma vez por pleito | Creative Commons Atribuição |
| Candidatos e resultados | Tribunal Superior Eleitoral | `votacao_candidato_munzona_2024` | município + zona + turno + cargo + candidato | uma vez por pleito | Creative Commons Atribuição |
| Partidos | Tribunal Superior Eleitoral | `votacao_partido_munzona_2024` | município + zona + turno + cargo + partido | uma vez por pleito | Creative Commons Atribuição |

Portal: `https://dadosabertos.tse.jus.br`. Os arquivos são baixados do CDN oficial `https://cdn.tse.jus.br/estatistica/sead/odsele/`.

Série histórica comparável adotada: eleições **municipais** de 2016, 2020 e 2024, primeiro turno, cargo Prefeito. Eleições gerais não são misturadas nessa série.

## 3. Matriz dos KPIs atuais

| KPI atual | Fonte | Campo original | Cálculo | Classe | Status | Recomendação |
|---|---|---|---|---|---|---|
| Eleitorado total | detalhe da votação | `QT_APTOS` | soma das zonas, por ano/turno/cargo | A | REAL | manter |
| Evolução do eleitorado | detalhe da votação | `QT_APTOS`, `ANO_ELEICAO` | série municipal 2016/2020/2024 | A | REAL | manter contexto municipal explícito |
| Comparecimento | detalhe da votação | `QT_COMPARECIMENTO`, `QT_APTOS` | comparecimento ÷ aptos × 100 | B | REAL | manter denominador “eleitorado apto” |
| Abstenção | detalhe da votação | `QT_ABSTENCOES`, `QT_APTOS` | abstenções ÷ aptos × 100 | B | REAL | manter; validar soma com comparecimento |
| Votos válidos | detalhe da votação | `QT_TOTAL_VOTOS_VALIDOS`, `QT_COMPARECIMENTO` | válidos ÷ comparecimento × 100 | B | REAL | manter denominador explícito |
| Votos brancos | detalhe da votação | `QT_VOTOS_BRANCOS`, `QT_COMPARECIMENTO` | brancos ÷ comparecimento × 100 | B | REAL | manter denominador explícito |
| Votos nulos | detalhe da votação | `QT_TOTAL_VOTOS_NULOS`, `QT_COMPARECIMENTO` | nulos ÷ comparecimento × 100 | B | REAL | manter denominador explícito |
| Resultado do último pleito | votação de candidato | nome, urna, partido, votos, situação | soma das zonas; percentual ÷ válidos do cargo | B | REAL | manter turno/cargo explícitos |
| Margem 1º × 2º | votação de candidato | percentuais dos dois primeiros | percentual 1º − percentual 2º | C | DERIVADO | manter rotulado como cálculo |
| Composição partidária da Câmara | votação de candidato | partido + `DS_SIT_TOT_TURNO` | contagem de candidatos com situação iniciada por “ELEITO” | B | REAL | manter como resultado eleitoral; não confundir com mudanças posteriores de mandato |
| Concentração | — | — | índice não implementado nesta rodada | C | DEMO | ocultar ou identificar até metodologia homologada |
| Fragmentação / partidos efetivos | — | — | Laakso-Taagepera não implementado nesta rodada | C | DEMO | implementar apenas após homologar universo/denominador |
| Competitividade | — | — | interpretação | C | DEMO | não apresentar como dado oficial |
| Benchmark RMBH/MG | — | — | exigiria agregação regional/estadual própria | D | DEMO | manter fora do modo REAL nesta rodada |
| Narrativas “o que mudou” e insight | — | — | interpretação/IA | C | DEMO | não misturar silenciosamente com TSE oficial |

## 4. Contrato, rastreabilidade e fallback

Cada indicador persistido carrega: território, categoria, chave estável, valor, unidade, período, granularidade, fonte, dataset original, registro de origem quando aplicável, metodologia, data de coleta e metadados `ano/turno/cargo/tipo_eleicao/source_record_ids/source_mode`.

Cada dataset usado cria evidência oficial com URL, período, hash estável, licença e referência bruta. A deduplicação usa `territory_id + source_hash`.

O repositório do Caderno resolve cada campo isoladamente:

- valor oficial disponível → `REAL`;
- cálculo seguro a partir do oficial → `DERIVADO` quando aplicável;
- campo não coberto → preserva `CONTAGEM_DEMO` e marca `DEMO`;
- nenhum fallback é silencioso.

Quando o caderno entra em modo REAL, blocos narrativos e benchmarks ainda DEMO não são exibidos. A apresentação visual existente foi preservada; só houve ligação mínima de contrato e rótulos de origem.

## 5. Persistência e idempotência

Nenhuma migration foi necessária. Foram reutilizadas:

- `territories`;
- `territory_indicators` e seu índice natural com `COALESCE`;
- `territory_evidence` e seu índice `territory_id + source_hash`;
- `territory_collection_runs`.

Duas execuções reais controladas com os mesmos parâmetros produziram:

```text
territory_indicators TSE/eleicoes: 489 → 489
territory_evidence TSE/eleicoes:     5 → 5
territory_collection_runs:           1 → 2
```

Logo, indicadores e evidências foram atualizados/deduplicados; somente o histórico append-only de execuções cresceu.

## 6. Sanidade oficial do piloto

Para Contagem, eleição municipal de 2024, primeiro turno, Prefeito:

```text
eleitorado:      459.110
comparecimento:  352.354 (76,75%)
abstenção:       106.756 (23,25%)
válidos:         310.076 (88,00% do comparecimento)
brancos:          18.718 (5,31% do comparecimento)
nulos:            23.429 (6,65% do comparecimento)
```

Sanidades confirmadas:

- `459.110 = 352.354 + 106.756`;
- comparecimento + abstenção = 100%;
- resultado majoritário: Marília/PT 188.228 (60,70%), Junio Amaral/PL 120.776 (38,95%);
- margem derivada: 21,75 p.p.;
- 25 cadeiras municipais identificadas por situação eleitoral, sem contar “NÃO ELEITO” ou “SUPLENTE”.

## 7. Arquivos do motor

```text
lib/territorios/tse-client.ts
lib/territorios/tse-normalizer.ts
lib/territorios/tse-collector.ts
lib/territorios/electoral-resolver.ts
lib/territorios/tse-notebook-repository.ts
app/api/territorios/tse/collect/route.ts
scripts/validate-tse-source.ts
```

Testes:

```text
lib/territorios/tse-normalizer.test.ts
lib/territorios/electoral-resolver.test.ts
lib/territorios/tse-notebook-repository.test.ts
app/api/territorios/tse/collect/route.test.ts
```

## 8. Endpoint operacional

```http
POST /api/territorios/tse/collect
x-territorios-tse-secret: <TERRITORIOS_TSE_CALLBACK_SECRET>
Content-Type: application/json

{
  "request_id": "uuid-opcional",
  "codigo_ibge": "3118601",
  "years": [2016, 2020, 2024]
}
```

O segredo é exclusivo do motor. O endpoint retorna apenas resumo operacional, não o dataset completo.

## 9. Riscos e pendências

1. `TERRITORIOS_TSE_CALLBACK_SECRET` ainda precisa ser criado/configurado quando o deploy for autorizado.
2. Não existe workflow n8n para este motor nesta rodada, por instrução explícita.
3. O ZIP nacional de candidatos de 2024 é volumoso; a carga piloto é aceitável, mas a expansão nacional deve adotar cache do arquivo por pleito e persistência em lotes.
4. Persistência atual é sequencial por indicador; antes de carga nacional, implementar batch controlado.
5. `source_updated_at` permanece nulo porque os arquivos não fornecem no contrato uma data canônica de atualização do registro; `collected_at` não é falsamente reaproveitado como atualização da fonte.
6. A composição representa a situação oficial totalizada do pleito, não trocas de mandato posteriores.
7. Benchmark RMBH/MG, concentração, fragmentação e narrativa interpretativa seguem fora da cobertura REAL.
8. Dependências npm reportam vulnerabilidades pré-existentes/atuais; não foi aplicado `npm audit fix --force`.

## 10. Gate

```text
FONTE OFICIAL IDENTIFICADA:           SIM
MATRIZ KPI A/B/C/D:                   SIM
MAPEAMENTO IBGE ↔ TSE:                SIM (resolução única + persistência)
COLETA E NORMALIZAÇÃO:                SIM
PERSISTÊNCIA/CACHE EXISTENTE:         REUTILIZADOS
EVIDÊNCIA E RASTREABILIDADE:          SIM
FALLBACK POR CAMPO REAL/DEMO:         SIM
TESTE REAL CONTAGEM:                  SIM
IDEMPOTÊNCIA REAL:                    SIM
ALTERAÇÃO VISUAL:                     NÃO (somente ligação mínima)
MIGRATION:                            NÃO
N8N:                                  NÃO ALTERADO
DEPLOY:                               NÃO EXECUTADO
```
