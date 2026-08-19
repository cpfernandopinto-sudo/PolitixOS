# CLAUDE_UX_ACCESS_FILTERS_01B — Reconciliação da Implementação de Filtros com o Main Oficial Atual

**Agente:** Claude · **Prioridade:** P0 — Pré-apresentação
**Data:** 2026-08-19

---

## 1. Diagnóstico — por que a implementação não aparecia

**A hipótese de divergência de base estava incorreta.** Verificação de ancestralidade Git:

```
$ git rev-parse origin/main
9ac49d55f8b2346d71ce0b84dd74f9234efc8726          ← idêntico ao HEAD de partida do UX-ACCESS-FILTERS-01

$ git merge-base c6e606d origin/main
9ac49d55f8b2346d71ce0b84dd74f9234efc8726          ← merge-base == origin/main (não um commit mais antigo)

$ git merge-base --is-ancestor origin/main c6e606d && echo YES
YES                                                ← origin/main é ancestral direto de c6e606d
```

`origin/main` **não se moveu** desde a execução anterior. O commit `c6e606d` (e sua base `66a4377`) é um **fast-forward puro** a partir do main atual — zero divergência, zero conflito, nada para "portar" no sentido de reaplicar diffs manualmente.

**Causa raiz real, confirmada por processo:**

```
$ lsof -nP -iTCP:3000 -sTCP:LISTEN
node  21309  ...  TCP 127.0.0.1:3000 (LISTEN)
$ ps aux | grep next-server
.../PolitixOS/node_modules/.bin/next dev -H 127.0.0.1
```

Havia um `next dev` rodando **na checkout principal** (`/Users/fernandooliveirapinto/Developer/PolitixOS`), que está e sempre esteve na branch `main` (`9ac49d5` — o baseline anterior, sem a implementação). O trabalho do UX-ACCESS-FILTERS-01 foi commitado, **conforme instruído explicitamente** ("NÃO fazer push automaticamente. NÃO fazer deploy."), apenas na branch `claude/politixos-filter-standardization-34e02d`, dentro de um worktree separado — nunca mesclado em `main`, nunca servido por esse processo. Os prints mostravam exatamente o que deveriam mostrar: o `main` sem alterações, porque o `main` de fato não tinha as alterações.

Não foi necessário nenhum reset destrutivo, rebase, ou cópia de árvore — a implementação sempre esteve correta e íntegra, apenas não publicada onde o ambiente local estava olhando.

## 2. Ação tomada

Como não há divergência a reconciliar, criar uma branch nova a partir de `main` e reaplicar os 38 arquivos manualmente file-by-file introduziria **risco de erro de transcrição sem nenhum benefício** — o resultado seria byte-a-byte idêntico ao fast-forward. Em vez disso:

```
git branch fix/global-filters-rbac-current-main c6e606d
git worktree add .claude/worktrees/fix-global-filters-rbac-current-main fix/global-filters-rbac-current-main
```

A nova branch aponta exatamente para o commit já validado (`c6e606d`), cuja árvore de arquivos é idêntica ao que seria produzido por qualquer "porte" manual — verificável por `git diff` vazio entre as duas referências. Um worktree novo e limpo foi criado a partir dela (sem `node_modules` instalado ainda — instalação não foi necessária para as verificações desta rodada, que reaproveitaram o worktree original já validado, com árvore de trabalho confirmadamente limpa no mesmo commit).

## 3. Diff categorizado (idêntico ao relatório anterior — nenhum arquivo rejeitado como stale, pois não havia staleness)

| Categoria | Arquivos |
|---|---|
| A. Global Filter Contract | `lib/filters/global.ts`, `lib/filters/global.test.ts` |
| B. Candidate Multiselect | `components/GlobalContextBar.tsx` |
| C. Global Period | `components/GlobalContextBar.tsx` (mesmo arquivo), `lib/queries/overview.ts` |
| D. Filter Persistence | `components/Sidebar.tsx`, `components/navigation/MobileNavigationDrawer.tsx`, `components/Header.tsx`, `app/dashboard/layout.tsx` |
| E. Screen Catalog | `lib/navigation/appScreens.ts` (+test), `lib/navigation/navIcons.tsx`, `lib/navigation/dashboardNavigation.tsx`, `lib/auth/types.ts` |
| F. Menu RBAC | `lib/navigation/dashboardNavigation.tsx` (mesmo arquivo de E) |
| G. Route RBAC | `proxy.ts` (+test) |
| H. Server/Query RBAC | `lib/actions/candidatos.ts` (+test), `lib/queries/investigations.ts` (+test), `lib/auth/actions.ts`, `lib/queries/instagram.ts`, `lib/queries/x.ts`, `lib/queries/noticias.ts`, `lib/types/noticias.ts`, `app/dashboard/investigacoes/page.tsx`, `app/dashboard/investigacoes/[id]/page.tsx`, `app/dashboard/overview/page.tsx` |
| I. User Management | `app/dashboard/usuarios/UsuariosClient.tsx` (+test) |
| J. Page wiring (Notícias/Instagram/X) | `app/dashboard/noticias/page.tsx`, `app/dashboard/noticias/NewsGlobalFilters.tsx`, `app/dashboard/instagram/page.tsx`, `app/dashboard/x/page.tsx`, `components/dashboard/InstagramFilterBar.tsx`, `components/dashboard/XFilterBar.tsx` |
| K. Unrelated / stale | **nenhum** — dead code removido (`components/FilterBar.tsx`, `components/dashboard/overview/OverviewHeader.tsx`) é parte do escopo (2ª/3ª implementação divergente dos mesmos conceitos), não código alheio à tarefa |
| — Documentação | `docs/relatorios/CLAUDE_UX_ACCESS_FILTERS_01.md` |

**Território:** confirmado via `git diff --name-only main..fix/global-filters-rbac-current-main -- app/dashboard/territorios lib/territorios components/dashboard/territorios` → saída vazia. Nenhum arquivo territorial tocado.

## 4. Verificação das 5 correções P0 (presentes, confirmadas por grep direto no diff)

| # | Correção | Evidência |
|---|---|---|
| 1 | `lib/actions/candidatos.ts` — auth/escopo | `requireAuth`/`assertCandidateAllowed`/`assertSocialAccountAllowed`: 13 ocorrências |
| 2 | `lib/queries/investigations.ts` — auth/escopo | `allowedTargetIds`: 9 ocorrências |
| 3 | `proxy.ts` — guarda de `/dashboard/x` | `SCREEN_MAP` derivado de `APP_SCREENS` (linha 19) — gap não pode mais existir por construção |
| 4 | `overview/page.tsx` — campo correto | Superado pelo refactor da Fase E: usa `getAllowedTargetIds()` (helper canônico) em vez de qualquer campo de sessão direto — mais robusto que o fix pontual original |
| 5 | `lib/auth/actions.ts` — checagem interna admin | `requireAdmin`: 7 ocorrências |

## 5. Regressão (re-executada nesta rodada, árvore de trabalho confirmadamente limpa no commit validado)

```
TYPECHECK:  PASS  (npx tsc --noEmit — 0 erros)
TESTS:      PASS  (1031 passed, 5 skipped, 0 failed)
BUILD:      PASS  (npm run build — 20 rotas, incluindo /dashboard/x e todos os 21 cadernos territoriais)
```

## 6. Smoke visual — não executado (mesma limitação da rodada anterior)

Sem credenciais de login válidas para este ambiente (tentativa com as credenciais padrão de `scripts/seed-admin.mjs` já havia falhado na rodada anterior — banco real, senha real diferente). Criar uma conta de teste requer autorização explícita do usuário, que não foi solicitada nesta execução. A verificação visual das telas autenticadas (Visão Geral, Notícias, Instagram, X) permanece pendente de uma passada manual com credenciais reais.

O que **foi** verificado sem autenticação: a árvore de arquivos da branch nova contém exatamente o código já testado/buildado (prova por diff + grep acima), o que — junto da suíte de testes unitários/integrados que exercita `GlobalContextBar`'s lógica de estado (`lib/filters/global.test.ts`), o catálogo de telas e o enforcement de servidor — é a evidência disponível nesta sessão de que a implementação está correta e presente.

## 7. Próximo passo recomendado (não executado — fora do escopo desta rodada por instrução explícita)

Para que a implementação apareça no ambiente que está sendo visualizado, uma destas ações (nenhuma executada aqui, aguardando decisão do usuário):

- Parar o `next dev` atual (PID 21309, servindo `main`) e reiniciá-lo a partir de `.claude/worktrees/fix-global-filters-rbac-current-main` (branch `fix/global-filters-rbac-current-main`) — não fiz isso porque altera um processo já em uso pelo usuário sem pedido explícito;
- Ou: `git switch fix/global-filters-rbac-current-main` na checkout principal e reiniciar o dev server lá;
- Ou, quando aprovado visualmente: merge (fast-forward, sem conflito) em `main`.

---

## SAÍDA OBRIGATÓRIA

```
UX-ACCESS-FILTERS-01B: PASS WITH GAPS

CURRENT MAIN HEAD: 9ac49d55f8b2346d71ce0b84dd74f9234efc8726
ORIGIN MAIN HEAD:  9ac49d55f8b2346d71ce0b84dd74f9234efc8726

OLD FILTER COMMIT: c6e606d
OLD FILTER BASE:   66a4377

NEW BRANCH BASE: main (9ac49d5) — confirmado ancestral direto, fast-forward puro
NEW COMMIT: c6e606d (mesma referência de conteúdo — branch nova aponta para o commit já
            validado; nenhuma reaplicação manual foi necessária pois não havia divergência
            a reconciliar; ver §2)

FILES IN OLD DIFF: 38 (+1 doc)
FILES PORTED: 38 (+1 doc) — 100%, fast-forward exato
FILES REJECTED AS STALE: 0 — não havia staleness (main não se moveu)

GLOBAL FILTER CONTRACT: PASS
MULTI-CANDIDATE: PASS
GLOBAL PERIOD: PASS

VISÃO GERAL: PASS (por código/teste — ver §6)
NOTÍCIAS: PASS (por código/teste)
INSTAGRAM: PASS (por código/teste)
X: PASS (por código/teste)

LOCAL CANDIDATE FILTERS REMAINING: 0 (removidos de Instagram/X — confirmado por diff)
LOCAL PERIOD FILTERS REMAINING: 0 (removidos de Instagram/X — confirmado por diff)

SELECTION PERSISTENCE: PASS (buildNavHref — coberto por lib/filters/global.test.ts)

SCREEN CATALOG: PASS
MENU RBAC: PASS
ROUTE RBAC: PASS
SERVER/QUERY RBAC: PASS

P0 SECURITY FIXES PRESERVED: 5/5 (ver §4)

TERRITORIOS REGRESSIONS: 0 (nenhum arquivo territorial no diff — ver §3)

TYPECHECK: PASS
TESTS: 1031 passed / 5 skipped / 0 failed
BUILD: PASS

VISUAL SMOKE: NOT_EXECUTED (sem credenciais válidas — ver §6)

P0: 0
P1: 0
P2: 1 (smoke visual autenticado ainda não executado — mesma ressalva da rodada anterior)
P3: 0

PUSH: NOT_EXECUTED
DEPLOY: NOT_EXECUTED
```

---

## Decisão executiva

1. **Por que a alteração anterior não aparecia no ambiente local?** Porque nunca foi mesclada em `main` (conforme instruído: sem push, sem deploy) e o `next dev` que o usuário estava observando roda a partir da checkout principal, na branch `main` — que nunca recebeu os commits. Os prints estavam corretos para o que estavam de fato servindo.
2. **`c6e606d` estava realmente baseado em branch/base diferente do main oficial?** Não. `origin/main` é ancestral direto de `c6e606d`, sem nenhum commit intermediário — fast-forward puro, zero divergência.
3. **Quais mudanças foram portadas?** Todas as 38 (+1 doc) — por criação de branch apontando para o commit já validado, não por reaplicação manual (desnecessária e mais arriscada dado o fast-forward).
4. **Alguma mudança antiga foi rejeitada por causar regressão?** Nenhuma — não havia regressão a evitar, pois não havia mudança concorrente em `main` para conflitar.
5. **O GlobalContextBar está realmente ativo?** Sim, no código da branch `fix/global-filters-rbac-current-main` (idêntico ao validado). Ainda não visível no ambiente que o usuário está rodando até que essa branch seja a que o `next dev` serve (ver §7).
6. **Visão Geral agora possui multiselect?** Sim, por código (`GlobalContextBar.tsx`) e por teste (`lib/filters/global.test.ts`).
7. **Notícias possui candidato global?** Sim — filtros locais (Cidade/Fonte/Sentimento/Busca) preservados, candidato/período vêm do `GlobalContextBar`.
8. **Instagram deixou de possuir candidato/período local?** Sim — confirmado por diff (`components/dashboard/InstagramFilterBar.tsx`), os dois `<select>` locais de candidato e período foram removidos.
9. **X deixou de possuir candidato/período local?** Sim — mesmo tratamento, confirmado por diff em `components/dashboard/XFilterBar.tsx`.
10. **Celina + Michelle podem ser selecionadas juntas?** Sim, por construção (`GlobalFiltersState.candidateIds: string[]`) e teste (`getEffectiveCandidateIds` com múltiplos ids) — não verificado visualmente nesta rodada (sem credenciais).
11. **A seleção permanece entre telas?** Sim, por construção (`buildNavHref` nos links do menu) — mesma ressalva de verificação visual.
12. **As 5 correções P0 foram preservadas?** Sim, 5/5, confirmadas por grep direto no diff (§4).
13. **Os cadernos Territórios permaneceram intactos?** Sim — zero arquivos territoriais no diff, confirmado por `git diff --name-only` filtrado.
14. **Está pronto para a validação visual final?** O código está pronto e testado. Falta apenas apontar um `next dev` para a branch `fix/global-filters-rbac-current-main` (ou `claude/politixos-filter-standardization-34e02d`, idêntica em conteúdo) para que a validação visual aconteça — ação que não executei por alterar um processo que o usuário já tem rodando, sem pedido explícito para isso.
