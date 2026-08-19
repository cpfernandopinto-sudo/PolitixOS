# CLAUDE_PESQUISAS_01C — Convergência Final: Core TSE + Resultados + UX Metodológica

**Agente:** Claude · **Prioridade:** P0 — Apresentação amanhã
**Modo:** CONVERGENCE · READ-FIRST · MINIMAL-FIX · NO-NEW-FEATURE · NO-PUSH · NO-DEPLOY
**Data:** 2026-08-19 · **Workspace:** `/Users/fernandooliveirapinto/Developer/PolitixOS` (branch `main`)

---

## 1. Workspace

```
pwd:            /Users/fernandooliveirapinto/Developer/PolitixOS
branch:         main
HEAD:           80eae0be4459ca45ea83c873ec153aef43cbdaec
git diff --check: OK (sem trailing whitespace/conflict markers)
```

## 2. Nota crítica — conflito ao vivo durante esta convergência

Durante a auditoria, a sessão concorrente (Antigravity, PESQUISAS-UX-01→UX-02) estava **ativamente escrevendo** um novo "Cockpit" para `/dashboard/pesquisas` (substituindo a lista simples por `PesquisasCockpitView` com `EvolucaoTemporalChart`, `ComparacaoInstitutos`, `RankingCandidatos`, `SegundoTurnoToggle`, `lib/pesquisas/cockpitAnalytics.ts`) — capturado em pleno erro de sintaxe (`ExecutiveKpiCards.tsx`, build quebrado por ~2 min) exatamente no momento em que eu rodava a regressão. Esse trabalho constrói itens que o item 10 desta própria brief lista como "NÃO IMPLEMENTAR AINDA" (evolução temporal, comparação entre institutos, novos filtros) — indicando que a outra sessão está operando sob uma brief posterior (UX-02) não sincronizada com esta.

Perguntei ao usuário como proceder. Decisão: **convergir apenas o que é meu** — commitar só os arquivos exclusivamente sob minha responsabilidade, deixar o Cockpit da outra sessão fora do commit (ela commita quando terminar), e registrar no relatório o estado real encontrado. O erro de sintaxe se resolveu sozinho poucos minutos depois (a outra sessão continuou trabalhando); a regressão final abaixo já reflete o estado estabilizado.

## 3. Auditoria de arquivos (classificação)

| Categoria | Arquivos |
|---|---|
| CORE | `supabase_migration_electoral_polls.sql`, `lib/pesquisas/collector.ts`, `normalizer.ts`, `csv.ts`, `source.ts`, `comparability.ts` |
| RESULTS (meu) | `supabase_migration_electoral_poll_results_provenance.sql`, `lib/pesquisas/results-repository.ts` (+test), `app/dashboard/pesquisas/executivo/page.tsx` |
| UX (Antigravity) | `app/dashboard/pesquisas/[id]/page.tsx` + `components/*` (ficha individual), `lib/pesquisas/parser.ts` (+test), `app/dashboard/pesquisas/page.tsx` + `components/*` (Cockpit, UX-02), `lib/pesquisas/cockpitAnalytics.ts` (+test) |
| SHARED | `lib/pesquisas/types.ts`, `lib/pesquisas/repository.ts` |
| TESTS | co-localizados com cada módulo acima |
| REPORTS | `docs/relatorios/CLAUDE_PESQUISAS_01A_CORE_TSE.md`, `CLAUDE_PESQUISAS_01B_RESULTADOS.md`, `ANTIGRAVITY_PESQUISAS_UX_01.md`, `ANTIGRAVITY_PESQUISAS_UX_02.md` |
| UNRELATED | 0 (confirmado — nenhum arquivo fora do escopo `lib/pesquisas/*` ou `app/dashboard/pesquisas/*` foi tocado por nenhuma das duas frentes) |

## 4. Shared files — coexistência confirmada

**`lib/pesquisas/types.ts`**: `rawSourceRow`, `ExtractedValue<T>`, `SampleProfileItem`, `ExtractedPollMetadata` (UX) coexistem sem sobreposição com `ResultType`, campos de proveniência em `ElectoralPollResult`, `ElectoralPollResultUpsert` (RESULTS). Nenhum tipo foi sobrescrito.

**`lib/pesquisas/repository.ts`**: `mapPollRow` ganhou `raw_source_row` (UX); `mapResultRow` ganhou os 8 campos de proveniência (RESULTS); `getAvailableFilterOptions`/`listPollResultsWithPoll` foram adicionados pela outra sessão (Cockpit) sem tocar nas funções existentes. Todas as funções coexistem — nenhuma foi removida ou alterada de assinatura.

Nenhuma frente sobrescreveu a outra em nenhum dos dois arquivos.

## 5. Migrações e banco (Supabase, project `hhhwuajptkyposarfbzn`)

Ambas as migrações aplicadas e coexistindo — nenhuma tabela recriada, nenhum dado apagado:

```sql
electoral_polls        → 1.640 registros oficiais (inalterado desde 01A)
electoral_poll_results → 90 resultados verificados (verified=true, 0 sem proveniência)
```

**Correção ao relatório 01B**: o relatório anterior declarava 91 linhas; a contagem real confirmada agora no banco é **90**. Erro de contagem no relatório anterior (nenhuma linha foi perdida — a distribuição por corrida bate exatamente com o desenho original: BR=31, DF=20, MG=39). Corrigido aqui.

## 6. Resultados — 3 corridas prioritárias

| Corrida | Status | Cenário(s) 1º turno | Cenários 2º turno | Candidatos com `candidate_id` |
|---|---|---|---|---|
| Presidente / Brasil | ✅ Funcional | 1 (15 linhas) | 4 (4 linhas cada) | Lula, Flávio Bolsonaro, Renan Santos |
| Governador / Distrito Federal | ✅ Funcional | 1 (8 linhas) | 3 (4 linhas cada) | Celina Leão, José Roberto Arruda |
| Governador / Minas Gerais | ✅ Funcional | 2 (10+9 linhas) | 5 (4 linhas cada) | Cleitinho |

90/90 linhas com `source_name`, `source_url`, `source_date` e `provenance` preenchidos, `verified = true`. 0 resultados inventados.

## 7. Ficha individual (`/dashboard/pesquisas/[id]`) — convivência confirmada

`page.tsx` (Antigravity) chama `getPollResults(poll.id)` (meu, do repository compartilhado) e passa `hasResults`/`results` para `PollHeader` e `PollResultsSection`. Convergência real, não apenas coexistência:

- **`PollHeader.tsx:30-39`**: badge `RESULTADOS DISPONÍVEIS` (azul) quando `hasResults`, `RESULTADOS PENDENTES` (âmbar) caso contrário — confirmado no código.
- **`PollResultsSection.tsx:23-32`**: empty state honesto ("Resultados divulgados ainda não integrados... resultados serão integrados à medida que forem homologados") quando `results.length === 0`; lista os resultados reais quando existem.

## 8. Parser — preservado, sem expansão

Todas as 10 funções de extração confirmadas presentes e intocadas nesta rodada: `extractMarginOfError`, `extractConfidenceLevel`, `extractGenderDistribution`, `extractAgeDistribution`, `extractEducationDistribution`, `extractIncomeDistribution`, `extractCollectionType`, `extractSamplingMethod`, `extractQualityControl`, `extractTerritorialCoverage` (+ `extractWeightingInfo`, `parsePollMetadata`). Nenhuma regex foi tocada por mim nesta rodada.

## 9. Visão executiva (`/dashboard/pesquisas/executivo`)

Rota confirmada com as 3 abas fixas (Presidente—Brasil, Governador—Distrito Federal, Governador—Minas Gerais), sem cruzamento cargo×território inválido. Nenhuma alteração estrutural nesta rodada, só o ajuste do item 10 abaixo.

## 10. Correção visual pequena — labels do ranking

**Problema confirmado**: `components/charts/BarChart.tsx` trunca labels do eixo Y por contagem bruta de caracteres (`> 12 → substring(0,10)+'...'`) quando `labelWidth` não é passado — cortando nomes como "José Roberto Arruda" → "José Rober...". O componente já suporta `gridLeft`/`labelWidth` (usado hoje em `NoticiasDashboardClient.tsx:549,604` com valores 105-126px) para truncamento por largura real (com reticências) em vez de contagem de caracteres.

**Fix aplicado** (`app/dashboard/pesquisas/executivo/page.tsx`, 2 linhas): passei `gridLeft={150}` e `labelWidth={135}` ao `<BarChart>` do ranking — mesmo padrão já em produção, sem alterar o componente compartilhado. Nenhum redesign.

**Limitação de verificação**: não há credenciais de login válidas para este ambiente (mesma limitação documentada nos relatórios UX-ACCESS-FILTERS-01/01B — banco real, sem conta de teste autorizada). Não criei conta nem rodei `scripts/seed-admin.mjs` (sobrescreveria senha real) sem autorização explícita. Fix verificado por leitura de código e por ser idêntico a um padrão já comprovado em produção — recomenda-se confirmação visual rápida com credenciais reais antes da apresentação.

## 11. Regressão (estado combinado: minhas mudanças + Cockpit/UX-02 em andamento da outra sessão)

```
TYPECHECK: PASS (0 erros)
TESTS:     PASS — 1097 passed, 5 skipped, 0 failed
BUILD:     PASS — /dashboard/pesquisas, /dashboard/pesquisas/[id], /dashboard/pesquisas/executivo todas presentes
```

## 12. Commit

Um commit local, escopo mínimo (só o fix visual — o restante do módulo RESULTS já estava commitado em `9274934` de uma rodada anterior):

```
80eae0b fix(pesquisas): prevent candidate name truncation in ranking chart labels
9274934 feat(pesquisas): integrate real verified poll results for 3 priority races
7d51d0a feat: add Pesquisas Eleitorais module (TSE/PesqEle registered-poll monitor)
```

Não commitei o Cockpit/UX-02 da outra sessão (`app/dashboard/pesquisas/page.tsx`, `app/dashboard/pesquisas/components/*`, `lib/pesquisas/cockpitAnalytics.*`, `app/dashboard/pesquisas/[id]/*`, `lib/pesquisas/parser.*`, `ANTIGRAVITY_*.md`) — permanece no working tree para a outra sessão commitar quando considerar pronto. `types.ts`/`repository.ts` também ficam não commitados por conterem as adições dela ainda em andamento.

**NÃO PUSH. NÃO DEPLOY.**

---

## SAÍDA OBRIGATÓRIA

```
PESQUISAS-01C: PASS WITH GAPS

CORE TSE: PASS
RESULTS: PASS
METHODOLOGY UX: PASS
SHARED TYPES: PASS
SHARED REPOSITORY: PASS

PRESIDENT BR: PASS
GOVERNOR DF: PASS
GOVERNOR MG: PASS

OFFICIAL POLLS: 1640
VERIFIED RESULT ROWS: 90
FAKE RESULTS: 0

RESULT PROVENANCE: PASS
PARSER: PASS
RANKING LABELS: PASS (fix aplicado; não verificado em navegador ao vivo — ver §10)

TYPECHECK: PASS
TESTS: 1097 passed
5 skipped
0 failed

BUILD: PASS

WORKING TREE: DIRTY (Cockpit/UX-02 da outra sessão ainda não commitado por ela — esperado, fora do meu escopo)

COMMIT: 80eae0b (+ 9274934 da rodada anterior)

P0: 0
P1: 2 — (1) confirmação visual do fix de truncamento pendente de sessão com credenciais reais; (2) types.ts/repository.ts precisam de um commit final depois que a outra sessão fechar o Cockpit/UX-02

PUSH: NOT_EXECUTED
DEPLOY: NOT_EXECUTED

READY FOR UX-02 + DATA-02: YES
```
