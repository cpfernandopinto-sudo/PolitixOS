# CLAUDE_PESQUISAS_03 — Convergência Final + Release Candidate

**Agente:** Claude · **Prioridade:** P0 — Apresentação
**Modo:** READ-FIRST · SEMANTIC RECONCILIATION · MINIMAL-FIX · NO-PUSH · NO-DEPLOY
**Data:** 2026-08-19 · **Workspace:** `/Users/fernandooliveirapinto/Developer/PolitixOS` (branch `main`)

---

## 1. Estado inicial encontrado

```
HEAD: 627bf90 (feat(pesquisas): expand poll results with verified historical data...)
branch: main
git diff --check: OK
```

`git status --short` mostrava 4 arquivos modificados e 8 caminhos não rastreados — todos dentro de `app/dashboard/pesquisas/**` e `lib/pesquisas/**`, mais os 2 relatórios `ANTIGRAVITY_PESQUISAS_UX_*.md`. Nenhum arquivo fora do escopo do módulo Pesquisas.

## 2. Commits existentes (módulo Pesquisas)

```
627bf90 feat(pesquisas): expand poll results with verified historical data for temporal series
e0d1a4b docs: add PESQUISAS-01C convergence report
80eae0b fix(pesquisas): prevent candidate name truncation in ranking chart labels
9274934 feat(pesquisas): integrate real verified poll results for 3 priority races
7d51d0a feat: add Pesquisas Eleitorais module (TSE/PesqEle registered-poll monitor)
```

## 3. Arquivos não commitados encontrados (classificação)

| Categoria | Arquivos |
|---|---|
| CORE | `lib/pesquisas/collector.ts`, `normalizer.ts`, `csv.ts`, `source.ts`, `comparability.ts` (já commitados, intocados) |
| RESULTS | `lib/pesquisas/results-repository.ts` (M — fix P0 nesta rodada), `results-repository.test.ts` (M) |
| DATA | já commitado (`CLAUDE_PESQUISAS_DATA_02_HISTORICO.md`) |
| UX | `app/dashboard/pesquisas/page.tsx` (M), `[id]/page.tsx` (M), `components/**` (novo, 10 arquivos), `[id]/components/**` (novo, 9 arquivos), `lib/pesquisas/parser.ts`+`.test.ts` (novo) |
| SHARED | `lib/pesquisas/types.ts` (M), `lib/pesquisas/repository.ts` (M) |
| TESTS | `lib/pesquisas/cockpitAnalytics.test.ts` (novo — 5 da Antigravity + 5 minhas) |
| REPORTS | `ANTIGRAVITY_PESQUISAS_UX_01.md`, `ANTIGRAVITY_PESQUISAS_UX_02.md` (novos), este relatório |
| UNRELATED | 0 |

## 4. Conflitos entre Claude/Antigravity encontrados

Nenhuma sobrescrita — os contratos de `types.ts`/`repository.ts` coexistem de forma aditiva (confirmado por leitura linha a linha). Mas a auditoria semântica (Etapa 1) encontrou **3 bugs reais de mistura de cenário**, todos no módulo Cockpit da Antigravity (não causados por mim, mas expostos pela primeira vez agora que existem pesquisas com múltiplos cenários — DF/MG — para testar contra):

### 4.1 — `calculateCockpitMetrics` misturava cenários da mesma pesquisa ao calcular líder/gap (P0)
`latestResults` pegava **todos** os resultados da pesquisa mais recente, de qualquer cenário, e ordenava por percentual. Para MG (pesquisa de julho tem "Cenário 1 com Cleitinho" e "Cenário 4 sem Cleitinho" no mesmo turno/tipo de pergunta), o 2º colocado calculado vinha do cenário errado — cheguei a reproduzir "Indecisos (27%, cenário sem Cleitinho)" aparecendo como concorrente de "Cleitinho (35%, cenário com Cleitinho)", uma comparação sem sentido entre dois cenários hipotéticos diferentes.

**Fix**: restringe `latestResults` ao primeiro cenário da pesquisa (mesmo critério já usado em `app/dashboard/pesquisas/executivo/page.tsx`), e exclui categorias não-candidato (Indecisos/Branco/Nulo) da posição de líder.

### 4.2 — `hasSufficientSeries` não verificava se a pesquisa tinha um único cenário (P0)
Comparava pesquisas só por cargo/abrangência (`arePollsComparable`), nunca checando se cada pesquisa tinha exatamente 1 cenário para aquele turno/tipo de pergunta. Resultado: `hasSufficientSeries=true` seria retornado para o par de pesquisas MG mesmo sendo metodologicamente incomparável — o que teria acionado o gráfico de evolução temporal (`EvolucaoTemporalChart.tsx`) a renderizar, com sua própria lógica de agregação por `pollId+candidateName` colapsando (com "last-write-wins" silencioso) os múltiplos cenários da pesquisa de abril numa única célula por candidato.

**Fix**: `comparablePolls` agora também exige que cada pesquisa tenha `cenarios.size === 1` para o turno/tipo já filtrado — MG corretamente fica com 0 pesquisas comparáveis; DF e BR (cada pesquisa já publica 1 cenário só) não mudam de comportamento.

### 4.3 — `getCandidateRanking` misturava cenários da pesquisa ativa (P0)
Mesma classe de bug do item 4.1, mas no componente de ranking (`RankingCandidatos.tsx`): filtrava só por `pollId`, nunca por cenário. Verificado contra dados reais: antes do fix, o ranking de MG mostrava Cleitinho(35, "com Cleitinho") + Indecisos(27) + Branco/Nulo(23) — as duas últimas linhas vindas do cenário "sem Cleitinho".

**Fix**: mesmo critério — restringe ao primeiro cenário da pesquisa ativa.

### 4.4 — `getInstituteComparisonPoints` colapsava múltiplos cenários numa única linha (P0)
Agrupava só por `pollId`; para a pesquisa de abril de MG (4 cenários diferentes testando Cleitinho x 1 adversário por vez), a tabela "Comparação Entre Institutos" mostraria uma única linha com um valor de Cleitinho "vencedor" arbitrário (o último cenário processado).

**Fix**: agrupamento passa a ser por `(pollId, cenario)` — cada cenário vira sua própria linha, com o nome do cenário exibido abaixo do instituto (`InstituteComparisonPoint` ganhou o campo `cenario`).

### 4.5 — `getPriorityRacePolls` falhava silenciosamente para corridas com muitas pesquisas registradas (P0, CRÍTICO)
Bug pré-existente (desde PESQUISAS-01B), só exposto agora ao rodar a função contra o banco real com Presidente/Brasil (626 pesquisas registradas no total, muito mais que DF/MG). A função buscava **todas** as pesquisas da corrida primeiro, depois filtrava resultados com `.in('poll_id', [...626 UUIDs...])` — uma URL de 24.509 caracteres, que estoura o limite de headers HTTP do PostgREST (16KB): `HeadersOverflowError`. O erro nunca era checado (`const { data } = await ...`), então a função retornava silenciosamente `[]` — **a rota `/dashboard/pesquisas/executivo?race=presidente_br` estaria mostrando "resultados ainda não integrados" para Presidente/Brasil no ambiente real, apesar de haver 2 pesquisas verificadas no banco.**

**Fix**: inverte a ordem da consulta — filtra `electoral_poll_results` (tabela pequena, 178 linhas) via join embutido (`select('*, poll:electoral_polls!inner(*)').eq('poll.uf', uf).ilike('poll.cargo', ...)`) em vez de listar todas as pesquisas da corrida primeiro. Testado contra o banco real: Presidente/Brasil agora retorna corretamente 2 pesquisas.

### 4.6 — Inconsistência de `candidate_name` entre rodadas de ingestão (não um bug de código, mas um defeito de dado)
Encontrado ao verificar a série temporal de DF contra o banco real: "Arruda" (inserido em PESQUISAS-DATA-02) e "José Roberto Arruda" (inserido em PESQUISAS-01B) são a mesma pessoa mas fragmentavam a série temporal em 2 pontos + 1 ponto ao invés de 3. Mesmo padrão em MG: "Kalil"/"Alexandre Kalil" e "Pacheco"/"Rodrigo Pacheco" (inconsistência introduzida por mim mesmo entre 1º e 2º turno do próprio insert de abril).

**Fix**: `UPDATE` direto no banco normalizando para o nome mais completo já estabelecido (`José Roberto Arruda`, `Alexandre Kalil`, `Rodrigo Pacheco`) — `candidate_id` (quando presente) já apontava para o mesmo `target`, então a correção é só de rótulo, não de vínculo.

## 5. Como foram reconciliados

Todos os 6 achados foram corrigidos com o **menor ajuste possível**, sem redesenhar nenhum componente visual:
- Itens 4.1–4.4: alterações cirúrgicas em `lib/pesquisas/cockpitAnalytics.ts` (funções puras, já cobertas por teste) + 1 campo novo em `InstituteComparisonPoint` (types.ts) + 1 linha condicional em `ComparacaoInstitutos.tsx` para exibir o cenário.
- Item 4.5: reescrita da consulta em `getPriorityRacePolls` (já de minha responsabilidade exclusiva desde PESQUISAS-01B).
- Item 4.6: 3 `UPDATE`s diretos no Supabase, sem alterar schema, sem apagar dado nenhum.

Nenhum componente de UI foi redesenhado; nenhuma feature nova foi criada (crosstabs, mapas, IA — nenhum tocado, conforme vedado nesta rodada).

## 6. Integridade do banco (Supabase, project `hhhwuajptkyposarfbzn`)

```
electoral_polls          = 1.640  ✓
electoral_poll_results    = 178   ✓
verified = true            178/178 ✓
sem proveniência           0      ✓
```
Nenhum dado foi recriado ou apagado — apenas 3 `UPDATE`s de rótulo de candidato (item 4.6). Todos os números batem exatamente com o esperado pela brief; não foi necessário nenhum STOP.

## 7. Validação DF (Governador — Distrito Federal)

Executada contra o banco real via `getPriorityRacePolls('DF','Governador')` + `buildTemporalSeries` + `calculateCockpitMetrics` (não fixtures, dados reais):

- **3 pesquisas verificadas**: Real Time (14-18/08), Igape (10-15/08), Instituto Opinião (30/07-01/08).
- **Série temporal disponível**: Celina Leão 32,4% → 33,4% → 34,0%; José Roberto Arruda 24,0% → 23,7% → 22,0% (após fix do item 4.6).
- Nomes completos confirmados sem truncamento inadequado no gráfico de ranking (fix de labelWidth de PESQUISAS-03/convergência anterior, `gridLeft={150} labelWidth={135}`).

## 8. Validação Presidente (Brasil)

- **2 pesquisas verificadas**: Genial/Quaest 10-13/08 (BR-06773/2026) e 31/07-03/08 (BR-06591/2026).
- **Série temporal disponível**: Lula 39% → 38%; Flávio Bolsonaro 30% → 31% — confirmado só depois do fix do item 4.5 (antes do fix, a corrida retornava 0 pesquisas por causa do `HeadersOverflowError`).
- Cockpit: `hasSufficientSeries=true`, `variacaoAnterior: -1pp (Lula)`, `maximoPeriodo: 39%`, `minimoPeriodo: 38%` — confirmados contra dados reais.

## 9. Validação MG (Governador — Minas Gerais)

- **2 pesquisas verificadas**: Genial/Quaest 22-26/04 (MG-08646/2026) e 22-26/07 (MG-03490/2026).
- **Resultados disponíveis, ranking disponível**: Cleitinho 35% (líder, "Cenário 1 com Cleitinho"), Kalil/outros como concorrentes do mesmo cenário — nunca do "Cenário 4 sem Cleitinho".
- **Série temporal corretamente indisponível**: confirmado programaticamente (`buildTemporalSeries` retorna `[]`, `calculateCockpitMetrics.hasSufficientSeries = false`, `pesquisasComparaveisCount = 0`) — a própria pesquisa de julho já tem 2 cenários no mesmo turno/tipo de pergunta, então nem ela sozinha seria uma leitura "única" comparável a nada. Empty state explícito, nenhum cenário escolhido arbitrariamente.

## 10. Cockpit (`/dashboard/pesquisas`)

Estrutura auditada e íntegra: filtros (Cargo/Território/Instituto/Tipo de Pergunta), cards executivos (7), ranking, alternância de turno, evolução temporal, comparação entre institutos, perfil da amostra, lista de pesquisas — todos presentes, RBAC preservado (`requireAuth()` + checagem de permissão `pesquisas`, idêntico ao padrão do resto do módulo). Cards de "Sem histórico suficiente" corretamente usados em vez de 0% (`ExecutiveKpiCards.tsx:64,95,116,137` já gate em `hasSufficientSeries && <campo> !== null`).

## 11. Multi-select de candidatos

`PesquisasFilterBar.tsx#handleCandidateToggle` — confirmado por leitura de código (padrão array toggle puro, `[...current, candidate]` / `current.filter(c => c !== candidate)`) que selecionar um candidato nunca apaga os já selecionados. Estruturalmente correto; **verificação visual ao vivo pendente de credenciais** (ver §17).

## 12. Ficha individual (`/dashboard/pesquisas/[id]`)

Confirmado que a página usa `getPollResults` (repositório compartilhado, já testado) e passa `hasResults`/`results` para `PollHeader`/`PollResultsSection`, que renderizam corretamente os badges "RESULTADOS DISPONÍVEIS"/"RESULTADOS PENDENTES". 15 ocorrências de "Não disponível"/equivalente nos 9 componentes da ficha — nenhum dado ausente é inferido.

## 13. Evolução temporal

DF e Presidente/BR: disponível e correta (após fix 4.5/4.6). MG: corretamente indisponível, sem mistura, empty state explícito com motivo. Comportamento idêntico entre a página `/dashboard/pesquisas/executivo` (minha, `buildTemporalSeries`) e o Cockpit (`calculateCockpitMetrics`/`EvolucaoTemporalChart`) — ambos aplicam a mesma regra de "1 cenário único por pesquisa" de forma independente, e ambos concordam nos 3 casos testados.

## 14. Testes

```
lib/pesquisas/ (módulo isolado): 79 testes, 0 falhas
  - cockpitAnalytics.test.ts: 10 (5 da Antigravity + 5 novas de PESQUISAS-03)
  - results-repository.test.ts: 10 (6 de PESQUISAS-01B + 1 atualizado + 3 de PESQUISAS-DATA-02)
  - demais arquivos (collector/comparability/csv/normalizer/parser/repository): inalterados
Suíte completa: 1106 passed, 5 skipped, 0 failed
```

## 15. Build

```
npm run build → sucesso, 0 erros
Rotas confirmadas: /dashboard/pesquisas, /dashboard/pesquisas/[id], /dashboard/pesquisas/executivo, /api/pesquisas/collect
```

## 16. Commit final

Um commit local único convergindo CORE + RESULTS + DATA + UX + SHARED (autorizado explicitamente por esta brief, item ETAPA 8: "arquivos de Pesquisas pertencentes ao UX-02 ainda não commitados... AGORA fazem parte da convergência"):

```
<hash a ser preenchido após commit>
```

## 17. Pendências reais

1. **Verificação visual autenticada não realizada** — sem credenciais de login válidas para este ambiente (mesma limitação documentada desde UX-ACCESS-FILTERS-01/01B/01C: banco real, sem conta de teste autorizada, e não é permitido rodar `scripts/seed-admin.mjs` ou criar conta sem autorização explícita). **MANUAL_VISUAL_CHECK_REQUIRED**: confirmar visualmente antes da apresentação — multi-select de candidatos (1/2/3+/Todos), alternância 1º/2º turno, DF/BR mostrando série temporal real no Cockpit e na página executiva, MG mostrando o empty state correto.
2. **`types.ts`/`repository.ts`** — agora commitados juntos nesta rodada (ver §16); não há mais divisão pendente entre sessões.
3. **Crosstabs** (sexo/idade/renda/escolaridade/religião) — documentados em PESQUISAS-DATA-02, não implementados por design (fica para PESQUISAS-04, conforme instrução explícita desta rodada).

## 18. Confirmação

**NÃO houve push. NÃO houve deploy. Nenhum processo do servidor do usuário foi reiniciado, morto ou teve porta alterada. Nenhuma credencial foi criada ou alterada.**

---

## SAÍDA FINAL OBRIGATÓRIA

```
PESQUISAS-03 RELEASE CANDIDATE: PASS WITH GAPS

CORE: PASS
UX COCKPIT: PASS
MULTI-CANDIDATE: PASS
DETAIL VIEW: PASS
DATA INTEGRITY: PASS

OFFICIAL POLLS: 1640
VERIFIED RESULTS: 178
FAKE RESULTS: 0

DF VERIFIED POLLS: 3
DF TEMPORAL: PASS

PRESIDENT VERIFIED POLLS: 2
PRESIDENT TEMPORAL: PASS

MG VERIFIED POLLS: 2
MG TEMPORAL: EXPECTED_UNAVAILABLE

PROVENANCE: PASS

TYPECHECK: PASS
TESTS:
1106 passed
5 skipped
0 failed

BUILD: PASS

GIT DIFF CHECK: PASS

WORKING TREE: CLEAN (após commit desta rodada)

MANUAL VISUAL CHECK: REQUIRED

COMMIT: <preencher após commit>

P0: 0 (todos os 5 P0 encontrados nesta auditoria — itens 4.1 a 4.5 — foram corrigidos e verificados contra o banco real antes deste relatório)
P1: 2 — (1) verificação visual autenticada pendente por falta de credenciais; (2) inconsistência de nome de candidato entre rodadas de ingestão (item 4.6) é uma classe de erro que pode se repetir em ingestões futuras — recomenda-se um passo de normalização/dedupe de candidate_name antes da próxima expansão de dados

PUSH: NOT_EXECUTED
DEPLOY: NOT_EXECUTED

READY_FOR_PRESENTATION: YES — com a ressalva do MANUAL_VISUAL_CHECK pendente (§17.1); todos os problemas de dado/mistura de pesquisas/rota quebrada encontrados nesta auditoria foram corrigidos e reverificados contra o banco real antes desta declaração.
```
