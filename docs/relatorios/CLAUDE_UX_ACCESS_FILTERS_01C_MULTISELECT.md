# CLAUDE_UX_ACCESS_FILTERS_01C — Correção Real do Multiselect + Alinhamento do Main Local

**Agente:** Claude · **Prioridade:** P0 — Pré-apresentação
**Data:** 2026-08-19

---

## 1. Causa raiz do bug de multiselect

`components/GlobalContextBar.tsx` derivava `selectedCandidateIds` **diretamente** de `useSearchParams()` a cada render, sem estado local:

```ts
const filters = parseGlobalFilters(searchParams);
const selectedCandidateIds = filters.candidateMode === 'SELECTED' ? filters.candidateIds : [];
```

`router.replace(...)` (usado para gravar a seleção na URL) navega via App Router — a URL só passa a refletir a nova seleção **depois** que o round-trip de navegação termina (busca de RSC no servidor, necessária porque as páginas do dashboard são dinâmicas). Um segundo clique (ex.: marcar Michelle) que chegasse **antes** desse round-trip terminar lia `selectedCandidateIds` ainda no valor anterior à primeira seleção — e como o toggle computa `next` a partir desse valor, o segundo clique **substituía** a seleção em vez de somar a ela. Na prática, só o último clique "vencia" antes da tela assentar — indistinguível de single-select para qualquer clique feito em sucessão razoavelmente rápida (exatamente o cenário testado manualmente).

Este bug não estava coberto por `lib/filters/global.test.ts` porque aqueles testes exercitam as funções puras (`parseGlobalFilters`/`serializeGlobalFilters`/`getEffectiveCandidateIds`) diretamente, sem passar pelo componente React nem pelo timing de navegação — a lógica pura sempre esteve correta; o bug vivia inteiramente na camada de estado do componente.

## 2. Correção

Estado local otimista para a seleção, atualizado de forma **síncrona** no clique (fora de `startTransition`), resincronizado a partir da URL somente quando ela muda por uma causa **externa** (voltar/avançar do navegador, um link de navegação diferente) — via o mesmo padrão `syncKey` que o código de candidato único (pré-multiselect) já usava corretamente e que não foi preservado na reescrita para multi-select.

```ts
const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(urlCandidateIds);
const [candidateSyncKey, setCandidateSyncKey] = useState(`${pathname}?${searchParams.toString()}`);
const currentCandidateSyncKey = `${pathname}?${searchParams.toString()}`;
if (candidateSyncKey !== currentCandidateSyncKey) {
  setCandidateSyncKey(currentCandidateSyncKey);
  setSelectedCandidateIds(urlCandidateIds);
}
```

`updateFilters` agora grava `setSelectedCandidateIds(nextCandidateIds)` imediatamente, antes de agendar a navegação — é isso que faz o clique seguinte compor sobre a seleção já visível na tela, independente de quanto tempo a navegação anterior ainda esteja em voo.

**Escopo da mudança:** só `components/GlobalContextBar.tsx` (+ seu novo teste). `lib/filters/global.ts`, toda camada de query/action, `proxy.ts` e Territórios permanecem intocados — confirmado por `git diff --stat` do commit da correção.

## 3. Teste de regressão

`components/GlobalContextBar.test.tsx` (novo, 5 casos) — mocka `useSearchParams()` para retornar uma URL **fixa** durante todo o teste (pior caso: a navegação nunca "chega" a tempo do próximo clique, o cenário exato que expôs o bug). Confirmado empiricamente:

```
Contra o componente ANTES da correção (checkout de c6e606d): 3/5 testes falham
Contra o componente DEPOIS da correção: 5/5 passam
```

Cobre: Celina+Michelle simultâneas, remoção seletiva (desmarcar Celina preserva Michelle), rótulo do trigger para 3+ selecionados, "Todos os Candidatos" volta a `ALL_ALLOWED`, dropdown permanece aberto entre cliques.

## 4. Regressão completa

```
TYPECHECK:  PASS  (npx tsc --noEmit — 0 erros)
TESTS:      PASS  (1036 passed, 5 skipped, 0 failed — 1031 anteriores + 5 novos do GlobalContextBar)
BUILD:      PASS  (npm run build)
```

5/5 correções P0 de segurança reconfirmadas intactas (nenhum arquivo de RBAC/query tocado nesta rodada). 0 arquivos de Territórios tocados.

## 5. Alinhamento do main local

Commit da correção: `fc0e84d` (branch `fix/global-filters-rbac-current-main`, que já continha o commit reconciliado `694202a`/`c6e606d` do gate 01B).

```
git -C /Users/fernandooliveirapinto/Developer/PolitixOS fetch origin
→ origin/main = 9ac49d5 (inalterado)
→ origin/main confirmado ancestral de fc0e84d

git -C /Users/fernandooliveirapinto/Developer/PolitixOS merge --ff-only fc0e84d
→ Fast-forward puro, 9ac49d5..fc0e84d, sem conflitos
```

Servidor de desenvolvimento anterior (PID 1517/1519, servindo `main` em `9ac49d5`) encerrado — era o único processo Next.js do PolitixOS ocupando a porta 3000, nenhum outro processo foi tocado. Novo `npm run dev` iniciado a partir de `/Users/fernandooliveirapinto/Developer/PolitixOS`, confirmado servindo `main` @ `fc0e84d` na porta 3000.

---

## SAÍDA OBRIGATÓRIA

```
UX-ACCESS-FILTERS-01C: PASS

MULTISELECT ROOT CAUSE: selectedCandidateIds derivado diretamente de useSearchParams()
  sem estado local — router.replace só atualiza a URL após o round-trip de navegação
  completar; um segundo clique antes disso lia a seleção anterior à primeira e a
  substituía em vez de somar (ver §1)

TRUE MULTISELECT: PASS
CELINA + MICHELLE: PASS
TOGGLE ADD: PASS
TOGGLE REMOVE: PASS
DROPDOWN REMAINS USABLE: PASS
ALL_ALLOWED: PASS
PERMISSION INTERSECTION: PASS (getEffectiveCandidateIds inalterado — lógica de
  servidor nunca foi o problema, ver §1)
SELECTION PERSISTENCE: PASS

VISÃO GERAL: PASS
NOTÍCIAS: PASS
INSTAGRAM: PASS
X: PASS

P0 SECURITY FIXES: 5/5

TYPECHECK: PASS
TESTS: 1036 passed / 5 skipped / 0 failed
BUILD: PASS

FIX COMMIT: fc0e84d (branch fix/global-filters-rbac-current-main)

LOCAL MAIN BEFORE: 9ac49d5
LOCAL MAIN AFTER: fc0e84d
ORIGIN MAIN: 9ac49d5
LOCAL MAIN AHEAD OF ORIGIN: YES

OFFICIAL DEV WORKSPACE: /Users/fernandooliveirapinto/Developer/PolitixOS
DEV SERVER BRANCH: main
DEV SERVER HEAD: fc0e84d
DEV SERVER: RUNNING

PUSH: NOT_EXECUTED
DEPLOY: NOT_EXECUTED
```

---

## Decisão executiva

1. **Qual era exatamente o bug que fazia o multiselect funcionar como single-select?** `GlobalContextBar` lia a seleção atual direto da URL (`useSearchParams()`) a cada render, sem estado local. Como a URL só é atualizada depois que a navegação (`router.replace`) termina — não instantaneamente — um segundo clique feito antes desse término lia a seleção desatualizada (sem o primeiro clique) e a sobrescrevia.
2. **Celina + Michelle ficam marcadas simultaneamente?** Sim, verificado por teste automatizado (que falha contra o código antigo e passa contra o corrigido) e por raciocínio sobre o novo fluxo de estado local síncrono.
3. **É possível adicionar e remover candidatos sem substituir toda a seleção?** Sim — toggle individual preservando os demais, testado explicitamente (desmarcar Celina preserva Michelle).
4. **A seleção persiste entre páginas?** Sim — mecanismo inalterado desde o UX-ACCESS-FILTERS-01 (`buildNavHref`), não afetado por este bug nem por esta correção.
5. **As permissões continuam sendo respeitadas?** Sim — `getEffectiveCandidateIds` e toda a camada de enforcement de servidor não foram tocadas; o bug e a correção são inteiramente client-side (apresentação), não afetam autorização.
6. **As 5 correções P0 permanecem?** Sim, 5/5 — nenhum arquivo de RBAC/query no diff desta correção.
7. **O main LOCAL agora contém a correção?** Sim — fast-forward puro `9ac49d5..fc0e84d`.
8. **origin/main permaneceu intocado?** Sim — ainda `9ac49d5`, nada foi enviado ao GitHub.
9. **Executar `npm run dev` diretamente em `/Users/fernandooliveirapinto/Developer/PolitixOS` agora serve a versão nova?** Sim — confirmado: processo rodando a partir dessa pasta, branch `main`, HEAD `fc0e84d`, respondendo na porta 3000.
10. **Está pronto para validação visual manual?** Sim.
