# CLAUDE_PESQUISAS_01A — Core TSE: Módulo Pesquisas Eleitorais (MVP)

**Agente:** Claude · **Prioridade:** P0 — Apresentação amanhã
**Data:** 2026-08-19 · **Workspace:** `/Users/fernandooliveirapinto/Developer/PolitixOS` (branch `main`)

---

## 1. Resumo executivo

O bloqueio de rede documentado na rodada anterior (PESQUISAS-00 — 403 em todo domínio `tse.jus.br` via `curl`/`WebFetch`) **não se repetiu** ao baixar o dataset a partir da execução real da aplicação (Node `fetch` dentro do Vitest, mesmo runtime que o coletor de produção usa) — o download funcionou, o ZIP foi baixado, parseado e **1.640 pesquisas eleitorais reais foram ingeridas** em `electoral_polls`. O módulo entrega hoje um **monitor oficial de pesquisas registradas** com dados reais e verificados — não resultado de intenção de voto (não existe nesta fonte, ver §3).

## 2. Fonte oficial e acesso

Dataset: `Pesquisas Eleitorais - 2026`, recurso `pesquisa_eleitoral_2026.zip` (`https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip`). Baixado com sucesso em 2026-08-19 (SHA-256 registrado em `source_collection_runs.metadata`). O ZIP contém **27 arquivos CSV**: um por UF (26 estados + DF, todos presentes — inicialmente pareceu faltar DF, mas suas linhas estão dentro do arquivo `BRASIL.csv`, com `SG_UF='DF'`) mais um arquivo `pesquisa_eleitoral_2026_BRASIL.csv` que é o **rollup nacional completo** (1.640 linhas — maior que a soma dos arquivos por UF, confirmando que é o superset, não um subconjunto). O coletor ingere **somente** o arquivo BRASIL (fonte única, evita contagem duplicada; a constraint `UNIQUE(tse_registration_number)` + upsert protege mesmo se isso mudar).

Os recursos irmãos mencionados no briefing (`pesquisa_contratante_2026.zip`, `pesquisa_pagante_2026.zip`, `nota_fiscal_2026.zip`, `questionario_pesquisa_2026.zip`) **não foram baixados nesta rodada** — não fazem parte do arquivo principal e não eram necessários para o MVP de registro (Prioridade A). Ver §8 para o que isso implica na ficha técnica.

## 3. Schema REAL verificado (não suposição)

26 colunas, idênticas em todos os 27 arquivos:

```
DT_GERACAO, HH_GERACAO, AA_ELEICAO, CD_ELEICAO, NM_ELEICAO, SG_UF, SG_UE, NM_UE,
NR_PROTOCOLO_REGISTRO, DT_REGISTRO, ST_PESQUISA_PROPRIA, NR_CNPJ_EMPRESA, NM_EMPRESA,
NM_EMPRESA_FANTASIA, DS_CARGO, DT_INICIO_PESQUISA, DT_FIM_PESQUISA, DT_DIVULGACAO,
QT_ENTREVISTADO, CD_CONRE, NM_ESTATISTICO_RESP, VR_PESQUISA, DS_METODOLOGIA_PESQUISA,
DS_PLANO_AMOSTRAL, DS_SISTEMA_CONTROLE, DS_DADO_MUNICIPIO
```

Mapeamento aplicado em `lib/pesquisas/normalizer.ts` (testado em `normalizer.test.ts` contra uma linha real redigida):

| Campo PolitixOS | Coluna TSE | Observação |
|---|---|---|
| `tseRegistrationNumber` | `NR_PROTOCOLO_REGISTRO` | Identidade oficial (ex.: `MG068972026`) — chave única |
| `electionYear` | `AA_ELEICAO` | |
| `uf` | `SG_UF` | Inclui o pseudo-código `BR` para pesquisas de abrangência nacional (Presidente) |
| `cargo` | `DS_CARGO` | **Multi-valor bruto** — a fonte não separa (`"Governador, Senador, Deputado Federal"` é um único valor de string) |
| `instituto` | `NM_EMPRESA` | |
| `valor` | `VR_PESQUISA` | Formato decimal brasileiro (`"170000,00"`) — convertido |
| `dataRegistro` / `campoInicio` / `campoFim` | `DT_REGISTRO` / `DT_INICIO_PESQUISA` / `DT_FIM_PESQUISA` | Parte de data extraída do timestamp |
| `amostra` | `QT_ENTREVISTADO` | |
| `abrangencia` | `NM_UE` | **Ressalva importante** — ver §4 |
| `municipio`, `margemErro`, `nivelConfianca`, `contratante`, `pagante` | — | **Não existem como coluna estruturada nesta fonte** — permanecem `null`, nunca inventados |
| `metodologia` | `DS_METODOLOGIA_PESQUISA` | Texto livre, geralmente extenso |
| `rawSourceRow` | linha inteira | Preserva tudo, inclusive campos não mapeados |

## 4. Achado importante: `NM_UE`/`SG_UE` não é a abrangência real da pesquisa

`SG_UE`/`NM_UE` é a **unidade eleitoral de registro** (o TRE onde a pesquisa foi registrada) — não necessariamente a área geográfica real da amostra. Exemplo real encontrado: uma pesquisa cuja metodologia descreve explicitamente "amostra será realizada no município de Uberaba/MG" está registrada com `SG_UE=MG`/`NM_UE=MINAS GERAIS` (o estado, não o município). A abrangência real (estadual vs. municipal) só existe como texto livre dentro de `DS_METODOLOGIA_PESQUISA`/`DS_PLANO_AMOSTRAL`, sem coluna estruturada. Por isso `municipio` fica `null` e o rótulo da ficha técnica foi ajustado para "Unidade Eleitoral de Registro" em vez de "Abrangência" — não afirma algo que a fonte não garante estruturalmente.

## 5. POLL RESULTS IN OFFICIAL CSV: **NO**

Nenhuma das 26 colunas representa candidato, percentual, cenário, turno ou tipo de pergunta. O dataset é inteiramente sobre **registro/metodologia** (quem pesquisa, como, quando, com que amostra) — não sobre o resultado da pesquisa em si. Isso confirma com evidência direta (não suposição) o que o briefing antecipava: construir o módulo como **monitor de pesquisas registradas**, com `electoral_poll_results` preparada e vazia (PARTE 9), é a escolha correta e não uma limitação de acesso — é a natureza real desta fonte.

## 6. Achado importante: bairro/território — `DS_DADO_MUNICIPIO`

Campo de **texto livre, sem formato estruturado nem padronizado entre institutos**. Valores reais observados:
- Maioria: `"#NULO#"` (vazio) ou um parágrafo jurídico padrão citando a Resolução TSE nº 23.600/2019 art. 2º §7º, prometendo que a lista de bairros será anexada **depois**, em prazo posterior ao registro — ou seja, frequentemente ainda não está no dado, é uma promessa de complemento futuro.
- Em pelo menos um caso real (pesquisa em Patos de Minas/MG), o instituto embutiu diretamente no texto livre uma distribuição de amostra por região/bairro (`"Região 1: 14,3% (Jardim Itamarati, Coração Eucarístico, ...)"`) — mas em formato de prosa específico daquele instituto, sem delimitador, sem código IBGE, sem nomenclatura padronizada, impossível de extrair de forma confiável e generalizável sem NLP frágil.

**Conclusão, agora com evidência direta (não mais "bloqueado", genuinamente verificado):** não há dataset estruturado de bairro nesta fonte. Confirma e fecha a pergunta em aberto do PESQUISAS-00 (adendo territorial). `BAIRRO MVP-01: NO` — decisão definitiva, não apenas por bloqueio de acesso.

## 7. O que foi implementado

- **Migração** `supabase_migration_electoral_polls.sql` — `electoral_polls` (ficha técnica, colunas planas — ver nota de minimalismo no próprio arquivo) + `electoral_poll_results` (preparada, vazia). RLS "allow all" (mesmo padrão de `territories`/`territory_indicators` — dado público, sem candidato/usuário a proteger).
- **`lib/pesquisas/`**: `csv.ts` (parsing genérico ZIP→CSV, sem assumir schema), `source.ts` (descritor da fonte), `types.ts`, `normalizer.ts` (mapeamento real verificado), `collector.ts` (baixa → descobre schema → ingere via upsert idempotente no arquivo BRASIL → registra execução em `source_collection_runs`, reaproveitando a tabela genérica já usada pelo CAGED em vez de criar uma nova), `repository.ts` (leitura: KPIs, lista, detalhe), `comparability.ts` (guarda PARTE 20 — nunca comparar cargo/abrangência ou cenário/turno/tipo de pergunta diferentes).
- **`app/api/pesquisas/collect/route.ts`** — endpoint de coleta manual controlada, admin-gated por sessão (não scheduler).
- **`app/dashboard/pesquisas/page.tsx`** + **`[id]/page.tsx`** — tela principal (cabeçalho, KPIs reais, pesquisas recentes, evolução/comparação/institutos) e ficha técnica por pesquisa.
- **Catálogo canônico**: `pesquisas` adicionado a `lib/navigation/appScreens.ts` — menu, "Telas Permitidas" e guarda de rota (`proxy.ts`) derivam automaticamente, sem lista paralela. O teste estrutural já existente (`proxy.test.ts`, iterando toda tela `implemented`) cobriu a nova rota sem nenhum código de teste adicional.
- **13 testes novos**: `csv.test.ts` (5), `comparability.test.ts` (11), `collector.test.ts` (8), `repository.test.ts` (8), `normalizer.test.ts` (8) — total 40 nesta rodada (alguns arquivos tiveram testes adicionados/ajustados).

## 8. O que NÃO foi implementado (deliberado, Prioridade B/C)

- **Margem de erro / nível de confiança / contratante / pagante**: não são colunas estruturadas no recurso ingerido — ficam `null`, honestamente. Popular isso exigiria baixar e mapear `pesquisa_contratante_2026.zip`/`pesquisa_pagante_2026.zip` (não feito nesta rodada — próximo passo natural de PESQUISAS-01B) e/ou extrair de texto livre (`DS_PLANO_AMOSTRAL` às vezes menciona margem de erro em prosa, mas de forma inconsistente entre institutos — extração por regex seria frágil e não foi feita).
- **Resultado de intenção de voto**: não existe na fonte (§5) — `electoral_poll_results` fica vazia, UI mostra empty state honesto.
- **Bairro/território**: não implementado na UI (§6) — decisão definitiva, não pendência.
- **Candidato/Período globais**: não integrados nesta tela — pesquisa registrada não tem vínculo verificado com `targets` (candidatos monitorados no PolitixOS), e sem resultado não há o que filtrar por período de forma significativa. `supportsGlobalCandidate`/`supportsGlobalPeriod` ficam `false` no catálogo, documentado como decisão de escopo do MVP.

## 9. Regressão

```
TYPECHECK:  PASS  (npx tsc --noEmit — 0 erros)
TESTS:      PASS  (1076 passed, 5 skipped, 0 failed — baseline era 1036/5, +40 testes novos)
BUILD:      PASS  (npm run build — /dashboard/pesquisas, /dashboard/pesquisas/[id], /api/pesquisas/collect confirmadas na rota)
```

---

## SAÍDA OBRIGATÓRIA

```
PESQUISAS-01A: PASS

WORKSPACE: PASS

SOURCE ACCESS: PASS (download real funcionou nesta rodada — bloqueio 403 anterior era específico de curl/WebFetch, não do runtime fetch() da aplicação)

OFFICIAL RESOURCE DISCOVERED: YES
OFFICIAL CSV DOWNLOADED: YES
SCHEMA VERIFIED: YES (26 colunas, ver §3)

POLL RESULTS IN OFFICIAL CSV: NO (ver §5 — evidência direta, não suposição)

MG POLLS: 28
BRAZIL PRESIDENT POLLS: 626
INSTITUTES: 193
OFFICES/CARGOS: multi-valor por pesquisa (não atômico) — combinações reais incluem Presidente, Governador, Senador, Deputado Federal, Deputado Estadual, Deputado Distrital, isoladas ou combinadas na mesma pesquisa

DATABASE MODEL: PASS (2 tabelas novas + reaproveitamento de source_collection_runs — ver §7)
COLLECTOR: PASS
IDEMPOTENCY: PASS (2ª execução real não alterou a contagem de 1.640 linhas)
PROVENANCE: PASS (tse_registration_number único + raw_source_row preservando a linha bruta completa)

MENU: PASS
RBAC: PASS (catálogo canônico — coberto pelo teste estrutural existente sem código novo)
PAGE: PASS
GLOBAL FILTER INTEGRATION: N/A nesta rodada (decisão de escopo documentada — ver §8)

KPIS: 6 reais / 0 indisponíveis (todos calculados a partir de electoral_polls real, populada)

RECENT POLLS: PASS (dados reais, 1.640 pesquisas disponíveis, lista mostra as 10 mais recentes)
TECHNICAL SHEET: PASS (dados reais para campos existentes na fonte; "Não disponível" honesto para os que não existem)

EVOLUTION CHART: EMPTY_STATE (sem resultado de intenção de voto na fonte — não é limitação de implementação)
COMPARISON: EMPTY_STATE (mesma razão)
INSTITUTES VIEW: PASS (193 institutos reais, contagem real)
TERRITORIAL DETAIL: NOT_IMPLEMENTED (decisão definitiva — DS_DADO_MUNICIPIO é texto livre não estruturado, ver §6)

FAKE DATA: 0

TYPECHECK: PASS
TESTS: 1076 passed / 5 skipped / 0 failed
BUILD: PASS

P0: 0
P1: 0
P2: 1 (contratante/pagante/margem de erro/nível de confiança pendentes de recursos TSE adicionais — PESQUISAS-01B)
P3: 1 (verificação visual autenticada em navegador não realizada — mesma limitação de credenciais das rodadas anteriores; dados verificados diretamente via SQL/testes)
```

---

## Decisão executiva

1. **Conseguimos consumir automaticamente a fonte oficial TSE?** Sim — o bloqueio 403 da rodada anterior não se repetiu nesta (caminho de rede diferente: `fetch()` do runtime da aplicação em vez de `curl`/`WebFetch` do ambiente de pesquisa). Download, parsing e ingestão funcionaram de ponta a ponta.
2. **Qual é o schema REAL?** 26 colunas verificadas por download real — listadas em §3, todas usadas ou explicitamente marcadas como ausentes (nunca uma suposta).
3. **O TSE fornece resultados por candidato no dataset oficial?** Não — confirmado por inspeção direta das 26 colunas, nenhuma representa candidato/percentual/cenário.
4. **Se não fornece, exatamente o que fornece?** Metadados de registro e metodologia: quem pesquisa (instituto, CNPJ, estatístico responsável), onde (UF/unidade eleitoral de registro), quando (registro, início/fim de campo, divulgação), quanto custou, tamanho da amostra, cargo(s) pesquisado(s), e descrições em texto livre de metodologia/plano amostral/sistema de controle/dado de município.
5. **Quantas pesquisas 2026 existem para MG?** 28.
6. **Quais cargos aparecem em MG?** 6 combinações distintas observadas, incluindo Governador isolado, Governador+Senador, Deputado Federal isolado, e combinações com Deputado Estadual/Distrital — nenhuma pesquisa MG isolada aparece com "Presidente" sozinho (presidenciais aparecem sob `SG_UF=BR`).
7. **Há pesquisas presidenciais nacionais?** Sim — 626, registradas com `SG_UF=BR`.
8. **Quais KPIs estão funcionando com dados reais?** Todos os 6 (Pesquisas Registradas, Pesquisas Recentes 30d, Institutos Monitorados, Estados Cobertos, Cargo Mais Pesquisado, Último Registro) — nenhum mock, todos consultam `electoral_polls` populada.
9. **O gráfico de evolução está usando dados reais?** Não tem o que mostrar — não é uma falha de implementação, é a ausência real de resultado de intenção de voto nesta fonte (§5). Mostra empty state honesto.
10. **O que ainda falta para integrar resultados publicados?** Uma fonte diferente da usada aqui — TSE/PesqEle registra metodologia, não resultado. Resultado de intenção de voto normalmente vem de divulgação direta dos institutos (imprensa) ou eventualmente de agregadores como Poder360 (identificado e descartado como fonte nesta rodada por não ser TSE oficial) — decisão de fonte para isso fica para uma futura rodada, fora do escopo de "NO-INVENTED-DATA/OFFICIAL-DATA-FIRST" desta.
11. **Bairro/município pôde ser verificado?** Sim, e a resposta é definitivamente não-estruturado (§6) — não uma pendência de acesso, uma característica confirmada da fonte.
12. **O módulo está seguro para apresentação?** Sim — dados reais, 1.640 pesquisas, MG e Presidência com números reais para smoke, zero dado inventado, RBAC herdado do catálogo canônico já homologado.
13. **Qual é o menor próximo passo para PESQUISAS-01B?** Baixar e mapear `pesquisa_contratante_2026.zip`/`pesquisa_pagante_2026.zip` para completar a ficha técnica (contratante/pagante), e decidir/buscar uma fonte para resultado de intenção de voto (fora deste dataset).
