# RELATÓRIO — HOTFIX: DADOS ZERADOS EM INSTAGRAM/X (PRODUÇÃO)

**Data:** 2026-08-21
**Gatilho:** `/dashboard/instagram` e `/dashboard/x` com todos os dados zerados em produção, logo após o Bloco 1 (Hardening P0).
**Escopo:** Restaurar leitura de dados, sem desfazer nenhuma parte do hardening de segurança. Nada de `client_id`, multi-tenant, schema, ou reabertura de policies `anon`.

---

## 1. Causa raiz

A migration de RLS do Bloco 1 (`instagram_p0_hardening_rls`) foi aplicada **diretamente em produção** contra o Supabase, removendo a leitura pública (`anon`) de `social_posts`, `instagram_comments`, `instagram_posts` e `ai_analysis`. Isso é permanente e independe de deploy — migrations de banco não passam pelo Git/Vercel.

Já as mudanças de **código** que tornam essa migration segura — trocar `lib/queries/instagram.ts` e `lib/queries/x.ts` de `createClient()` (chave anônima) para `createAdminClient()` (`service_role`, server-only) — ficaram só no **working tree** deste worktree, sem commit, sem push, sem deploy, exatamente como o próprio relatório do Bloco 1 registrou.

Resultado: o banco parou de responder para a chave anônima, mas a produção continuava rodando o código antigo, que ainda tentava ler com essa chave. `social_posts`/`instagram_comments`/`ai_analysis` passaram a retornar `[]` para o app, e os dashboards de Instagram e X (que leem as mesmas tabelas) zeraram — **sem nenhum dado ter sido apagado**.

**Confirmação da hipótese, ponto a ponto (Fase 1 do pedido):**

| Condição a confirmar | Resultado |
|---|---|
| Banco tem dados | ✅ Confirmado — `social_posts`: 652 linhas Instagram + 381 linhas X; `instagram_comments`: 125.985; `ai_analysis`: 1.045. Coleta seguiu rodando normalmente (última antes do hotfix: `2026-08-21 02:30:59 UTC`) |
| Produção ainda usava `createClient()`/anon | ✅ Confirmado — `origin/main` (branch de produção) tinha `import { createClient } from '@/lib/supabaseClient'` em `lib/queries/instagram.ts`, e a rota `app/api/automations/instagram/trigger` **não existia** em `origin/main` |
| Working tree possuía `createAdminClient()` | ✅ Confirmado — `git status`/`git diff` mostravam as 4 alterações do Bloco 1 (`components/AutomationPanel.tsx`, `lib/n8n.ts`, `lib/queries/instagram.ts`, `lib/queries/x.ts`) e a rota nova como não commitadas |

As três condições bateram → causa raiz **confirmada**, sem ambiguidade, antes de qualquer alteração.

---

## 2. Commit anterior de produção

`6891292` — `fix(pesquisas): isolate electoral results by office across cockpit and base` (branch `main`, mesmo commit que já era `HEAD` local antes do Bloco 1 — nenhum commit intermediário havia sido criado até este hotfix).

## 3. Commit do hotfix

`dea585357512ec351a465e8fe7ac751fd49c732a` (`dea5853`) — `fix(security): deploy Instagram/X P0 hardening server-side reads`, enviado via `git push origin HEAD:main` (fast-forward de `6891292` → `dea5853`).

---

## 4. Arquivos incluídos

Só os arquivos efetivamente produzidos pelo Bloco 1 — nada do Bloco 2:

- `lib/queries/instagram.ts` (`createClient()` → `createAdminClient()`)
- `lib/queries/x.ts` (idem)
- `lib/n8n.ts` (`triggerInstagramAutomation`, sentinela nas URLs de Instagram)
- `components/AutomationPanel.tsx` (trigger dos fluxos de Instagram via rota nova)
- `app/api/automations/instagram/trigger/route.ts` (rota nova)
- `docs/AUDITORIA_INSTAGRAM_POLITIXOS_01.md`, `docs/RELATORIO_INSTAGRAM_HARDENING_P0_01.md` (documentação do próprio Bloco 1, incluída para manter o histórico do que foi deployado junto)

Conferido via `git diff --cached` antes do commit: nenhuma ocorrência de `client_id`, `clients`, `tenant`, `Reels`, `Stories` como implementação (só menções analíticas dentro dos dois relatórios, como achados/recomendações — não código), e nenhum valor de secret/API key/JWT/service_role em texto plano.

---

## 5. Confirmação de que os dados nunca foram apagados

Consulta direta ao Supabase (antes e durante o hotfix, mesmos números):

```
social_posts (platform='instagram'): 652
social_posts (platform='x'/'twitter'): 381
instagram_comments: 125.985
ai_analysis: 1.045
último post Instagram coletado: 2026-08-21 02:30:59 UTC
```

A coleta automática (schedule trigger de 30min do n8n) continuou rodando e gravando normalmente durante todo o incidente — o problema era 100% de leitura no lado do PolitixOS, nunca de escrita/perda de dado.

---

## 6. Build

```
✓ Compiled successfully
  Running TypeScript ... sem erros
✓ Generating static pages using 7 workers (22/22)
```
Executado 1x antes do commit (re-confirmação — já validado 2x no Bloco 1).

## 7. Testes

```
Test Files  125 passed | 5 skipped (130)
     Tests  1109 passed | 5 skipped (1114)
```
0 falhas.

---

## 8. Deployment Vercel

Push para `main` feito às ~02:47 UTC. O MCP da Vercel retornou `403 Forbidden` (`Not authorized: ... scope "cpfernandopinto-4810s-projects"`) ao tentar consultar projeto/deployments diretamente — a conexão MCP não tem acesso a esse escopo/team nesta sessão; não consegui puxar o SHA/status oficial pela API. Isso **não bloqueou** a confirmação: o deploy automático do GitHub→Vercel é o mecanismo padrão deste projeto (confirmado por `docs/RELATORIO_FINAL_OVERVIEW_EXECUTIVE_UX.md` e outros relatórios do repo que documentam o mesmo fluxo).

Validado por HTTP direto contra `https://politix-os.vercel.app` (domínio de produção, confirmado em `lib/territorios/seguranca-mg-client.ts`):
- Antes do deploy: `POST /api/automations/instagram/trigger` → `HTTP 404` (rota não existia ainda).
- Após ~35s de polling: `POST /api/automations/instagram/trigger` (sem sessão) → `HTTP 401 {"error":"Não autenticado."}` — exatamente o comportamento esperado da rota nova, confirmando que o build com o hotfix está **ao vivo em produção**.

**Recomendo** o usuário confirmar o SHA exato no painel da Vercel (Deployments → Production) quando puder, já que não consegui puxar isso pela API — o teste funcional acima é uma confirmação indireta forte, mas não substitui o SHA oficial.

---

## 9. Instagram — antes/depois

- **Antes:** `/dashboard/instagram` sem dados (KPIs zerados) — código em produção ainda usava a chave anônima, que o banco já não atendia mais.
- **Depois:** código de produção passou a usar `createAdminClient()` (confirmado ao vivo via a rota `/api/automations/instagram/trigger` respondendo `401` em vez de `404`). Dados no banco confirmados presentes e agrupáveis por candidato real (ex.: Flávio Bolsonaro — 136 posts, Lula — 130, Celina Leão — 93, José Arruda — 46, Michelle Bolsonaro — 40), exatamente o formato que `lib/queries/instagram.ts` consome.
- **Limitação honesta:** não tenho credencial de login do PolitixOS e não devo tentar autenticar como um usuário real — não consegui abrir `/dashboard/instagram` logado e ver os KPIs na tela. Confirmei que a rota redireciona corretamente para `/login` quando não autenticado (sem erro de runtime, console limpo), o que mostra a aplicação saudável, mas o clique final no dashboard logado precisa ser feito pelo usuário.

## 10. X — antes/depois

Mesmo diagnóstico e mesma correção (`lib/queries/x.ts`), já que `social_posts`/`ai_analysis` são compartilhadas entre Instagram e X. Dados confirmados no banco: 381 posts com `platform` `x`/`twitter`. Mesma limitação de validação visual (sem login) descrita acima.

---

## 11. Teste anon/RLS

Repetido **depois** do deploy, para garantir que o hotfix não reabriu nada:

```
GET /rest/v1/social_posts?select=id&limit=1        (chave anon) → HTTP 200, []
GET /rest/v1/instagram_comments?select=id&limit=1  (chave anon) → HTTP 200, []
GET /rest/v1/instagram_posts?select=id&limit=1     (chave anon) → HTTP 200, []
GET /rest/v1/ai_analysis?select=id&limit=1         (chave anon) → HTTP 200, []
```

**PASS.** Nenhuma policy `Allow anon read` foi recriada, RLS não foi desabilitada em nenhuma tabela — o hotfix foi só deploy de código, nenhuma alteração de banco/policy.

## 12. Teste allowedTargetIds

`lib/queries/instagram.ts`/`lib/queries/x.ts` não tiveram a lógica de filtro alterada em nenhum momento (nem no Bloco 1, nem neste hotfix) — o diff inteiro dessas duas mudanças é a troca do cliente Supabase (`createClient()` → `createAdminClient()`); as linhas que aplicam `allowedTargetIds` (`.in('target_id', allowedTargetIds)`, tratamento de `null`=admin/`[]`=sem acesso) são exatamente as mesmas de antes, só que agora rodando sobre uma conexão que ignora RLS por padrão do Supabase — por isso o filtro em código continua sendo a **única** linha de defesa para não-admins, e ele não foi tocado.

Não foi possível testar com uma sessão real de "usuário restrito" vs. "admin" neste ambiente (mesma limitação de login da seção 9) — a garantia aqui é por leitura de código (diff mínimo, cirúrgico) + o teste de build/tipos, não por um clique real na tela com dois usuários diferentes. Fica registrado como pendência para validação humana.

---

## 13. Pendências

1. Usuário confirmar visualmente `/dashboard/instagram`, `/dashboard/x`, `/dashboard`, `/dashboard/automacoes` logado em produção — para fechar o ciclo com um clique humano real (KPIs, posts, comentários, análise de IA aparecendo; nenhuma regressão nas outras telas).
2. Confirmar o SHA exato do deployment de produção no painel da Vercel (não consegui puxar via API nesta sessão — 403 de escopo).
3. Pendências que já vinham do Bloco 1 e continuam as mesmas: rotação das credenciais antigas de RapidAPI/Supabase `service_role` (depende de coordenar com outros workflows n8n fora do escopo); `collection_logs` sem registro nas branches de Comentários/Análise/Reprocessamento.
4. Considerar, para o futuro, sempre incluir "deploy" como etapa explícita e confirmada de qualquer bloco que misture mudança de código + mudança de banco/infra — esse foi o gap real que causou o incidente.

---

## HOTFIX INSTAGRAM/X STATUS:
**PASS WITH GAPS**

Justificativa: causa raiz confirmada com evidência direta (não suposição), hotfix restrito exatamente ao escopo do Bloco 1 (nada de Bloco 2), build e testes aprovados, push para `main` concluído, deploy confirmado **funcionalmente** (rota nova respondendo em produção) mas **não confirmado pelo SHA oficial da Vercel** (falha de acesso à API nesta sessão), e a validação visual final do dashboard logado depende de uma checagem humana que não pude fazer sem credenciais. RLS/isolamento seguem intactos e re-testados depois do deploy.

Bloco 2 (`client_id`) permanece **parado**, aguardando nova autorização.
