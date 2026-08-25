# RELATÓRIO SPRINT 12 — Deploy Intermediário de Produção

**Data:** 2026-08-25
**Natureza:** checkpoint de produção autorizado pelo usuário após aprovação da validação visual local. **A Sprint 12 permanece ABERTA** — este deploy não encerra o trabalho, apenas consolida o estado aprovado.

---

## 1. Branch de origem

`claude/pesquisas-auditoria-mg-7fe692`

## 2. Worktree

`/Users/fernandooliveirapinto/Developer/PolitixOS/.claude/worktrees/sprint-12-pesquisas-commit-9bd599`

## 3. HEAD antes da operação

`eac42be7c4dfa90099458efc9865b7f0ed617566` — `fix(pesquisas): reconcilia Visão Geral, elimina duplicação de cenário e corrige semântica de comparáveis` (já mesclado em produção via PR #17 antes desta rodada; todo o trabalho das Sprints 2A/2B/12 estava, até este ponto, apenas no working tree local, não commitado).

Produção (branch `main`) antes desta operação: `d73918d` — `Merge pull request #17 from cpfernandopinto-sudo/claude/pesquisas-auditoria-mg-7fe692`. `git log origin/main..HEAD` e `git log HEAD..origin/main` confirmaram zero divergência entre `HEAD` e `origin/main` além do próprio commit de merge — nenhum conflito, nenhum trabalho alheio mais recente a sobrescrever.

---

## 4. Arquivos efetivamente commitados

Auditoria prévia (P0) classificou todos os 50 caminhos alterados no working tree em:

- **A — trabalho aprovado de Pesquisas (Sprints 2A/2B):** todos os componentes de `app/dashboard/pesquisas/components/*`, `lib/pesquisas/analyticsEngine.ts`, `lib/pesquisas/cockpitAnalytics.ts`, `lib/pesquisas/types.ts`, e os módulos novos `evolucaoCandidatoSeries.ts`, `observedHistory.ts`, `periodFilter.ts`, `scenarioSelection.ts`.
- **B — correção do filtro global (Sprint 12):** `components/GlobalContextBar.tsx`, `lib/navigation/appScreens.ts` (flag `supportsGlobalCandidate`), `app/dashboard/pesquisas/page.tsx` (resolução do candidato do contexto global, reaproveitando `lib/filters/global.ts`).
- **C — testes correspondentes:** todos os `*.test.ts`/`*.test.tsx` pareados com os arquivos acima, incluindo os 4 testes novos de `GlobalContextBar.test.tsx` (portal/Escape/clique-fora).
- **D — arquivos suspeitos ou não relacionados:** **nenhum encontrado.** `git status --porcelain` grepado por `.env|secret|supabase|migrat|schema|auth|vercel\.json|next\.config|package\.json|package-lock` retornou vazio. `lib/pesquisas/comparability.ts` confirmado com diff zero.

Commit único `5793acb` — 49 arquivos alterados, 2887 inserções, 903 deleções. Inclui também o relatório da rodada anterior (`RELATORIO_SPRINT12_CORRECAO_UI_FILTRO_GLOBAL.md`).

Lista completa: `RELATORIO_SPRINT12_CORRECAO_UI_FILTRO_GLOBAL.md`; `app/dashboard/pesquisas/components/{CenarioEleitoralChart,CoberturaDosDados(+.test),ComparacaoInstitutos,DiagnosticoPolitix,EvolucaoCandidatoChart,EvolucaoGapChart,GapEleitoral(+.test),HistoricoDasPesquisas,IntencaoPorPerfilPlaceholder,ListaPesquisasRecentes,MovimentoEleitoral(+.test),PerfilAmostralCard,PesquisasCockpitView(+.test),PesquisasComparativoView,PesquisasFilterBar(+.test),PesquisasListView,RankingCandidatos,ResumoEleitoral(+.test),SegundoTurnoSection,SegundoTurnoToggle,SinaisCenarioCard}.tsx`; `app/dashboard/pesquisas/page.tsx`; `components/GlobalContextBar.{tsx,test.tsx}`; `lib/navigation/appScreens.ts`; `lib/pesquisas/{analyticsEngine(+.test),cockpitAnalytics,evolucaoCandidatoSeries(+.test),observedHistory(+.test),periodFilter(+.test),scenarioSelection(+.test),signals.test,types}.ts`.

Removidos (substituídos pelas versões novas do Cockpit reestruturado): `EvolucaoTemporalChart.tsx`, `ExecutiveSnapshotCards.tsx`, `IndicadoresMovimentoCards.tsx`, `PolitixAiCard.tsx`. Renomeado: `PesquisasExplicamCenario.tsx` → `HistoricoDasPesquisas.tsx` (63% de similaridade detectada pelo Git).

## 5. Arquivos que permaneceram fora do commit

Nenhum. `git status --porcelain` retornou vazio imediatamente após o commit — o working tree ficou limpo.

---

## 6. Resultado dos testes

```
npx vitest run
Test Files  180 passed | 5 skipped (185)
     Tests  1562 passed | 5 skipped (1567)
```
Executado novamente (P2) imediatamente antes do commit, com o mesmo resultado da rodada de validação local anterior.

## 7. Resultado do typecheck

```
npx tsc --noEmit
```
Sem erros (saída vazia).

## 8. Resultado do build

```
npm run build
✓ Compiled successfully in 10.8s
✓ Finished TypeScript
✓ Generating static pages using 7 workers (28/28)
```
Build de produção completo, todas as 28 rotas geradas sem erro.

---

## 9. Hash do novo commit

`5793acb` — `feat(pesquisas): consolidate electoral cockpit and global candidate filter`

## 10. Branch que recebeu a integração

`main`

## 11. Método utilizado para integração

Pull Request via `gh pr create` (PR [#18](https://github.com/cpfernandopinto-sudo/PolitixOS/pull/18)), seguido de `gh pr merge 18 --merge` (merge commit, mesmo método usado nas PRs #15/#16/#17 anteriores do projeto — confirmado por inspeção do commit de merge de PR #17 antes de reproduzir o método). Nenhum force-push, nenhum rebase de histórico, nenhuma branch apagada.

## 12. Resultado do push

```
git push origin claude/pesquisas-auditoria-mg-7fe692
eac42be..5793acb  claude/pesquisas-auditoria-mg-7fe692 -> claude/pesquisas-auditoria-mg-7fe692
```
Fast-forward, sem conflito (branch remota estava exatamente em `eac42be`, idêntica ao HEAD anterior local).

PR #18 aberto com `mergeable: MERGEABLE`; verificação `Vercel Preview Comments` passou; check `Vercel` (preview) estava `pending` no momento da abertura (deploy de preview, não bloqueante para o merge). `gh pr merge 18 --merge` executado com sucesso, gerando o commit de merge `e779acd` em `main`.

`origin/main` após o merge: `e779acd` — `Merge pull request #18 from cpfernandopinto-sudo/claude/pesquisas-auditoria-mg-7fe692`.

## 13. Resultado do deploy

Deploy de produção disparado automaticamente pela integração Git↔Vercel já existente no projeto (nenhuma configuração alterada, nenhum projeto novo criado). Acompanhado via GitHub Commit Status API no commit `e779acd`:

```
tentativa 1: pending — "Vercel is deploying your app"
tentativa 2: success — "Deployment has completed"
```

## 14. URL de produção

`https://app.politixos.ia.br` (domínio custom; mesmo deployment também responde em `https://politix-os.vercel.app`, confirmado em rodadas anteriores do projeto).

## 15. Commit efetivamente publicado

`e779acd` (commit de merge do PR #18, que inclui o commit de conteúdo `5793acb`).

---

## 16. Smoke tests executados

Executados por este agente, sem inserir credenciais (restrição absoluta):

| Verificação | Método | Resultado |
|---|---|---|
| 1. Aplicação abre | `curl -L https://app.politixos.ia.br/` | HTTP 200 (via redirect 307 → `/login`) |
| 2. Login carrega | `curl` + navegador (screenshot) | HTTP 200; formulário "E-mail Corporativo / Senha / Acessar Plataforma" renderizado corretamente, CSS/fontes carregados, **sem erros no console** |
| 3. `/dashboard/pesquisas` responde | `curl -L` | HTTP 200 (redireciona corretamente para `/login` por falta de sessão — comportamento esperado do middleware de auth) |
| 4. Visão Geral responde | `curl -L /dashboard/overview` | HTTP 200 (mesmo padrão de redirect) |
| 5. Notícias responde | `curl -L /dashboard/noticias` | HTTP 200 (mesmo padrão de redirect) |
| 6. Instagram responde | `curl -L /dashboard/instagram` | HTTP 200 (mesmo padrão de redirect) |
| 7. GlobalContextBar carregado | — | **PENDENTE DE VALIDAÇÃO DO USUÁRIO** — exige sessão autenticada para confirmar visualmente; a árvore de componentes (`Header` → `GlobalContextBar`) é a mesma em todas as rotas do dashboard, mas a confirmação visual/funcional pós-deploy depende de login humano |
| 8. Nenhuma exceção nova | Console do navegador (`/login`) | Confirmado limpo; páginas autenticadas não verificáveis sem login |
| 9. Assets/CSS carregam | Screenshot | Confirmado — tipografia, cores e layout do PolitixOS renderizados normalmente em produção |

**Login (item 2 do checklist original) continua operacional do ponto de vista de disponibilidade** (formulário responde, sem erro 5xx, sem exceção JS) — mas a confirmação de que a autenticação efetivamente funciona ponta a ponta em produção (usuário real + senha) é, como sempre, **PENDENTE DE VALIDAÇÃO DO USUÁRIO**, pela mesma restrição já registrada nas rodadas anteriores.

## 17. Qualquer divergência encontrada

Nenhuma. `origin/main` e `HEAD` local estavam sincronizados antes do push (zero commits de terceiros à frente); o merge do PR #18 foi limpo, sem conflitos; nenhuma branch precisou de rebase.

## 18. Confirmação de banco/schema/Supabase/n8n/Auth intactos

Verificado via `git diff d73918d..e779acd --stat -- lib/pesquisas/comparability.ts lib/auth lib/supabase supabase migrations app/api .env` — **saída vazia**, ou seja, **zero alterações** nesses caminhos entre o commit de produção anterior (`d73918d`) e o novo (`e779acd`). Nenhuma chamada a ferramentas MCP de Supabase ou n8n foi feita nesta rodada. Nenhuma variável de ambiente foi lida, exibida ou alterada. Nenhuma configuração de projeto Vercel foi tocada — o deploy usou exclusivamente a integração Git já existente.

## 19. SPRINT 12: ABERTA

Confirmado explicitamente conforme instrução do usuário:

**SPRINT 12: ABERTA**

Este deploy é um checkpoint de produção, não um encerramento. A worktree, a branch local `claude/pesquisas-auditoria-mg-7fe692` e o ambiente de trabalho permanecem intactos para continuidade.

## 20. Pendências para continuação da Sprint

1. **Validação manual autenticada em produção** — o usuário precisa logar em `https://app.politixos.ia.br` e confirmar: (a) o dropdown global de candidatos abre e funciona em Pesquisas, Visão Geral e Notícias; (b) a analítica de Pesquisas (Cleitinho 35%, Kalil 12%, GAP +23pp, INCONCLUSIVO, INCONCLUSIVA) segue correta em produção; (c) nenhuma regressão visual nova.
2. **2 erros de lint pré-existentes**, já registrados no relatório da rodada anterior (`RELATORIO_SPRINT12_CORRECAO_UI_FILTRO_GLOBAL.md`, §14/§19) — `CenarioEleitoralChart.tsx` (`no-explicit-any` no tooltip do ECharts) e `PesquisasListView.tsx` (`set-state-in-effect` no filtro local de cargo) — não fazem parte do escopo autorizado desta rodada de deploy, seguem pendentes para uma rodada dedicada.
3. **Continuação da Sprint 12** — este checkpoint não esgota o trabalho planejado; próximas rodadas continuam a partir deste estado publicado, sem necessidade de nova auditoria de ambiente/autenticação (já resolvida em rodada anterior).

---

Caminho completo do relatório:
`/Users/fernandooliveirapinto/Developer/PolitixOS/.claude/worktrees/sprint-12-pesquisas-commit-9bd599/RELATORIO_SPRINT12_DEPLOY_INTERMEDIARIO_PRODUCAO.md`
