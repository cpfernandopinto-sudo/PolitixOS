# CLAUDE_PESQUISAS_DATA_02 — Expansão de Pesquisas Comparáveis

**Agente:** Claude · **Prioridade:** P0 — Apresentação
**Modo:** RESEARCH + VERIFIED INGESTION · NO-INVENTED-DATA · SOURCE-FIRST · NO-FRONTEND-REDESIGN · NO-DEPLOY
**Data:** 2026-08-19 · **Workspace:** `/Users/fernandooliveirapinto/Developer/PolitixOS` (branch `main`)

---

## 1. Metodologia de busca

Para cada corrida prioritária, parti do `tse_registration_number` das pesquisas já registradas em `electoral_polls` (1.640 registros, base herdada de PESQUISAS-01A) e busquei publicações externas que citassem explicitamente o registro TSE — nunca associação por instituto+data aproximada isolada. Toda pesquisa abaixo tem o número de registro citado literalmente na fonte, confirmado por leitura direta do artigo (não por snippet de busca).

## 2. Distrito Federal — Governador (prioridade máxima)

**2 pesquisas novas, ambas com registro TSE citado e confirmado:**

| Registro | Instituto | Campo | Amostra (TSE / fonte) | Fonte |
|---|---|---|---|---|
| `DF-04077/2026` | Instituto Opinião | 30/07–01/08/2026 | 1.085 / **1.109** ⚠️ | [Congresso em Foco](https://www.congressoemfoco.com.br/noticia/121057/celina-leao-abre-8-4-pontos-sobre-arruda-e-lidera-disputa-pelo-gdf) |
| `DF-02390/2026` | Igape / Instituto Gazeta | 10–15/08/2026 | 2.000 / 2.000 ✓ | [Expressão Brasiliense](https://expressaobrasiliense.com/eleicoes-2026/pesquisa-igape-celina-abre-97-pontos-de-vantagem-sobre-arruda-em-novo-levantamento-para-o-gdf/) |

**Nota de transparência (Opinião/DF-04077)**: a amostra do artigo (1.109) diverge da amostra registrada no TSE (1.085) — uma diferença de 24 entrevistas (~2%). O número de registro TSE citado é exato e inequívoco (chave primária de reconciliação, conforme regra do briefing), então a pesquisa foi aceita; a divergência de amostra está documentada no campo `provenance` da própria linha, não ocultada.

A pesquisa Opinião distingue explicitamente leitura **espontânea** (sem lista de nomes) de **estimulada** (com lista) — inseri as duas separadamente, sem misturar tipos de pergunta.

DF agora tem **3 pesquisas com resultado** (as 2 novas + `DF-07849/2026` de PESQUISAS-01B), todas com cenário único de 1º turno estimulado → **série temporal real ativada**:

| Data de campo | Celina Leão | Arruda |
|---|---|---|
| 30/07–01/08 | 32,4% | 24,0% |
| 10–15/08 | 33,4% | 23,7% |
| 14–18/08 | 34,0% | 22,0% |

## 3. Presidente — Brasil

**1 pesquisa nova, mesmo instituto (Quaest) da já integrada:**

| Registro | Instituto | Campo | Amostra | Fonte |
|---|---|---|---|---|
| `BR-06591/2026` | Genial/Quaest | 31/07–03/08/2026 | 2.004 | [Gazeta do Povo](https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-presidente-agosto-2026/) |

**Correção durante a busca**: uma pesquisa web inicial retornou números (39%/30% no 1º turno) que pareciam divergir da pesquisa já integrada (`BR-06773/2026`, 38%/31%). Investigando a fundo, descobri que esses números eram na verdade de **outra pesquisa Quaest** (`BR-06591/2026`, uma semana antes) — não um erro na pesquisa já integrada. Re-confirmei `BR-06773/2026` diretamente (Poder360/Gazeta do Povo): 38%/31% no 1º turno e 43%/40% no 2º turno batem exatamente com o que já estava no banco. Nenhuma correção foi necessária nos dados de 01B; a nova pesquisa (`BR-06591/2026`) foi inserida como ponto adicional real.

**Mudança de composição do cenário**: a pesquisa de 31/07–03/08 inclui "Cabo Daciolo" (1%), ausente na leitura de 10–13/08. Documentado no campo `provenance`, não ocultado.

BR agora tem **2 pesquisas com resultado**, ambas com cenário único de 1º turno estimulado → **série temporal real ativada**:

| Data de campo | Lula | Flávio Bolsonaro |
|---|---|---|
| 31/07–03/08 | 39% | 30% |
| 10–13/08 | 38% | 31% |

**Crosstabs encontrados** para esta mesma pesquisa (`BR-06591/2026`) — ver §5.

## 4. Governador — Minas Gerais

**1 pesquisa nova, mesmo instituto (Quaest) da já integrada, campo bem anterior:**

| Registro | Instituto | Campo | Amostra | Fonte |
|---|---|---|---|---|
| `MG-08646/2026` | Genial/Quaest | 22–26/04/2026 | 1.482 | [Gazeta do Povo](https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-minas-gerais-abril-2026/) |

**Atenção — estrutura de cenário incompatível com a pesquisa de julho**: a pesquisa de abril testa Cleitinho contra um adversário por vez em 4 cenários pareados (Cleitinho×Kalil×Pacheco; Cleitinho×Pacheco; Cleitinho×Kalil; Kalil×Pacheco sem Cleitinho), enquanto a pesquisa de julho (`MG-03490/2026`) tem 2 cenários com todos os candidatos relevantes juntos ("com Cleitinho" / "sem Cleitinho"). **Os dois desenhos não são comparáveis cenário-a-cenário** — inseri as 2 pesquisas com os nomes de cenário exatamente como publicados (sem forçar um mapeamento comum), o que automaticamente impede a função de série temporal de misturá-los (ver §6). Documentado explicitamente no campo `provenance` da pesquisa de abril.

Também há mudança de composição de candidatos: abril tem "Rodrigo Pacheco" (ausente em julho); julho tem "Ananias", "Azevedo", "Mendes", "Consolação" (ausentes em abril). Não inventei correspondência entre os dois conjuntos.

MG agora tem **2 pesquisas com resultado**, mas a série temporal automática **não ativa** para MG — corretamente, pela incompatibilidade de cenário acima (ver §6, "nunca escolher cenário representativo").

## 5. Crosstabs

```
CROSSTABS FOUND: YES
SOURCE: Brasil247 e TVT News, ambos citando a mesma pesquisa Genial/Quaest BR-06591/2026 (31/07–03/08/2026)
DIMENSIONS: sexo, idade (16-34 / 35-59 / 60+), escolaridade, renda, religião, região
```

Exemplo do que a fonte publica: entre mulheres, Lula tem 47% contra 35% de Flávio; entre 16-34 anos, Lula 44% x Flávio 38%; entre 35-59 anos, empate técnico 42%-42%.

**Não ingeri esses números** — o schema atual (`electoral_poll_results`) tem granularidade "candidato × cenário × turno × tipo de pergunta" para o eleitorado geral, sem dimensão demográfica. Inserir um crosstab aqui exigiria ou (a) uma coluna de segmento improvisada na tabela existente (misturaria duas granularidades semanticamente diferentes na mesma tabela, dificultando toda consulta futura) ou (b) uma tabela nova.

**Modelo recomendado** (não implementado nesta rodada — fora do escopo NO-FRONTEND-REDESIGN e do objetivo desta tarefa): uma tabela `electoral_poll_result_segments` com `poll_result_id` (FK para a linha agregada em `electoral_poll_results`), `dimension` (`'sexo'|'idade'|'escolaridade'|'renda'|'religiao'|'regiao'`), `segment_label` (texto livre do segmento, ex. "Mulheres", "16 a 34 anos"), `percentage`, mais os mesmos campos de proveniência (`source_name`, `source_url`, `source_date`, `verified`). Fica para uma rodada futura dedicada.

## 6. Comparabilidade e série temporal

`lib/pesquisas/comparability.ts` (de PESQUISAS-01A, intocado) compara por `cenario` exato — correto para não misturar cenários *dentro* de uma pesquisa, mas texto de cenário varia entre publicações diferentes (cada veículo frasea diferente), então não serve sozinho para agrupar a mesma leitura ao longo do tempo entre pesquisas distintas.

Adicionei `buildTemporalSeries()` em [`lib/pesquisas/results-repository.ts`](../../lib/pesquisas/results-repository.ts) — função pura, testada, que:
- só inclui uma pesquisa quando ela tem **exatamente um** cenário de 1º turno com pergunta estimulada (leitura principal sem ambiguidade);
- exclui automaticamente pesquisas com cenários fragmentados (ex.: MG/abril, 4 cenários pareados) — nunca escolhe um cenário "representativo" entre vários, isso seria inventar comparabilidade;
- exige 2+ pesquisas elegíveis antes de produzir qualquer série;
- agrupa por candidato, ordenado cronologicamente por `campoInicio`.

Resultado real por corrida:
- **DF**: 3/3 pesquisas elegíveis → série ativa (Celina, Arruda, e Leandro Grass onde presente).
- **Presidente/BR**: 2/2 pesquisas elegíveis → série ativa.
- **MG**: 0/2 elegíveis (a de abril tem 4 cenários fragmentados) → série **não** ativa, com mensagem explicando o motivo.

Fiz um ajuste mínimo em `app/dashboard/pesquisas/executivo/page.tsx` (meu arquivo, já existente desde PESQUISAS-01B) para usar essa função real em vez do placeholder de texto ("Ver abaixo") que existia — a seção "Evolução Temporal" agora mostra os percentuais reais por candidato ao longo do tempo quando a série está disponível, usando a mesma lista/estilo já existente na página (sem componente novo, sem gráfico novo — não é redesign).

## 7. Testes

Adicionei 4 testes em [`lib/pesquisas/results-repository.test.ts`](../../lib/pesquisas/results-repository.test.ts) para `buildTemporalSeries`:
- menos de 2 pesquisas elegíveis → série vazia;
- 2+ pesquisas com cenário único → agrupa por candidato, ordenado por data;
- pesquisa com cenários fragmentados (caso MG/abril) → fica de fora, nunca escolhe cenário representativo;
- turno 2 e tipo espontânea nunca entram na série (só 1º turno estimulado).

Dedup/idempotência (`upsertPollResult` — natural key `poll_id+cenario+turno+tipo_pergunta+candidate_name`) e proveniência (`getPriorityRacePolls` só retorna pesquisas com resultado) já cobertos pelos 6 testes existentes de PESQUISAS-01B — não precisaram de mudança, a expansão de dados não altera esse contrato.

## 8. Regressão

```
TYPECHECK: PASS (0 erros)
TESTS:     PASS — 1101 passed, 5 skipped, 0 failed (4 testes novos)
BUILD:     PASS — /dashboard/pesquisas/executivo presente e funcional
```

## 9. Banco (Supabase, project `hhhwuajptkyposarfbzn`)

```
electoral_polls        → 1.640 (inalterado)
electoral_poll_results → 178 (90 de PESQUISAS-01B + 88 novas desta rodada)
verified = true em 178/178, 0 sem proveniência
```

## 10. Arquivos alterados

**Exclusivamente meus:**
- `app/dashboard/pesquisas/executivo/page.tsx` (evolução temporal real)
- `lib/pesquisas/results-repository.ts` (`buildTemporalSeries`)
- `lib/pesquisas/results-repository.test.ts` (+4 testes)
- `docs/relatorios/CLAUDE_PESQUISAS_DATA_02_HISTORICO.md`

**Não tocados** (permanecem no working tree, propriedade da outra sessão, que segue seu próprio "Cockpit"/UX-02 em `app/dashboard/pesquisas/page.tsx`, `components/`, `lib/pesquisas/cockpitAnalytics.*`, `[id]/*`, `parser.*`): sem alteração nesta rodada.

**NÃO PUSH. NÃO DEPLOY.**

---

## SAÍDA OBRIGATÓRIA

```
PESQUISAS-DATA-02: PASS

DF VERIFIED POLLS: 3
PRESIDENT VERIFIED POLLS: 2
MG VERIFIED POLLS: 2

DF TEMPORAL READY: YES
PRESIDENT TEMPORAL READY: YES
MG TEMPORAL READY: NO (2 pesquisas com resultado, mas estrutura de cenário incompatível entre elas — documentado em §4, não forçado)

NEW RESULT ROWS: 88
FAKE RESULTS: 0

CROSSTABS FOUND: YES
CROSSTAB DIMENSIONS: sexo, idade, escolaridade, renda, religião, região (fonte: Brasil247/TVT News sobre BR-06591/2026) — não ingeridos, modelo recomendado em §5

PROVENANCE: PASS (178/178 com source_name+source_url+source_date+verified=true)

TYPECHECK: PASS
TESTS: PASS (1101 passed, 5 skipped, 0 failed)
BUILD: PASS

PUSH: NOT_EXECUTED
DEPLOY: NOT_EXECUTED
```
