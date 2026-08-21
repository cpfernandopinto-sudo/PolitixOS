# RELATÓRIO — BLOCO 2.1: DEPLOY E FECHAMENTO MULTI-TENANT

**Baseline:** [RELATORIO_INSTAGRAM_MULTITENANT_CLIENT_ID_01.md](RELATORIO_INSTAGRAM_MULTITENANT_CLIENT_ID_01.md)
**Data:** 2026-08-21
**Escopo:** Deploy do código do Bloco 2, validação real, decisão sobre `read_targets_legacy_anon`. Nenhuma feature nova.

---

## 1. Resumo executivo

O código do Bloco 2 foi commitado e enviado a produção (`main`). Banco revalidado antes e depois do deploy — 100% consistente, zero registros sem `client_id` onde esperado. O pipeline de coleta do Instagram foi reexecutado com dado real depois do deploy e continua saudável, com `client_id` correto propagando automaticamente. A página de login carrega sem erro em produção.

**Não foi possível** completar a validação visual dos dashboards logados (`/dashboard/instagram`, `/dashboard/x`, `/dashboard/noticias`, `/dashboard/candidatos`, `/dashboard/automacoes`) nem o teste de `client_id` forjado com uma sessão real de usuário não-admin — nos dois casos, isso exigiria eu autenticar em uma conta (mesmo uma de teste que eu mesmo criei) digitando uma senha em um formulário, o que é uma ação que minhas regras de segurança proíbem explicitamente e sem exceção ("nunca inserir senhas em nenhum campo"). Cheguei a criar dois usuários de teste diretamente no banco para viabilizar isso sem depender de credenciais reais de ninguém, mas interrompi antes de digitar a senha no formulário de login e removi os usuários de teste imediatamente (zero rastro). Por isso, **`read_targets_legacy_anon` não foi removida nesta etapa** — a ordem exigida (código → deploy → validação → policy) não pôde ser completada no passo de validação visual, e a instrução foi explícita: não inverter essa ordem.

---

## 2. Commit SHA

`32d9553` (`32d95536322b422abf3646773ec33ab8b72f30b9`) — `feat(multitenant): add client isolation foundation`, branch `main`, fast-forward de `dea5853` (hotfix do Bloco 1, que já estava em produção).

## 3. Deployment

Push aceito por `origin/main` (`dea5853..32d9553`). **Não consegui confirmar o SHA exato do deployment pela API da Vercel** — o MCP retornou `403 Forbidden` (mesmo problema de escopo/autenticação já registrado no relatório do hotfix do Bloco 1: `"Not authorized: ... scope 'cpfernandopinto-4810s-projects'"`). Confirmação indireta: `https://politix-os.vercel.app/login` responde `HTTP 200`, sem erros de console, depois de aguardado o tempo típico de build deste projeto (~1min, mesmo padrão observado no hotfix do Bloco 1). Como as mudanças deste bloco são quase inteiramente server-side (Server Actions, DAL, rota de API), não há um sinal client-side observável (ex.: hash de bundle JS) que prove definitivamente qual versão está servindo — recomendo o usuário confirmar o SHA no painel da Vercel quando possível.

## 4. Build

```
✓ Compiled successfully in 5.2s
```

## 5. Vitest

```
Test Files  125 passed | 5 skipped (130)
     Tests  1109 passed | 5 skipped (1114)
```
Baseline confirmado — 1109 testes, 0 falhas, antes do commit.

## 6. Estado do banco antes do deploy

```
clients = 1
targets sem client_id = 0
social_accounts sem client_id = 0
social_posts sem client_id = 0
instagram_comments sem client_id = 0
ai_analysis sem client_id = 0
collection_logs sem client_id = 0
admins com client_id indevido = 0
não-admins sem client_id = 0
```

## 7. Estado do banco depois do deploy

Idêntico ao item 6 — o deploy é só de código (Server Actions/rota/DAL), nenhuma migration nova foi aplicada nesta etapa. Reconfirmado após uma execução real de coleta pós-deploy (item 18): nenhuma linha nova ficou sem `client_id`.

---

## 8. Dashboard Overview

**Não validado com login.** Ver seção 15 (limitação de segurança). Validação indireta: nenhuma mudança de código neste bloco toca `overview.ts` ou seus consumidores.

## 9. Instagram

**Não validado visualmente.** Validado end-to-end via execução real do n8n pós-deploy (seção 18): dado novo gravado corretamente com `client_id`, o que é exatamente o dado que `/dashboard/instagram` vai ler.

## 10. X

**Não validado visualmente.** Nenhuma mudança de código em `x.ts` neste bloco (só no Bloco 1); suíte de testes sem regressão.

## 11. Notícias

**Não validado visualmente.** Validação indireta: `lib/queries/noticias.ts` (agora em `createAdminClient()`) compila e todos os testes relacionados a Notícias continuam passando; a troca é idêntica em padrão à já comprovada em `instagram.ts`/`x.ts` no Bloco 1.

## 12. Candidatos

**Não validado visualmente.** Mecanismo de `client_id` em novo target validado via transação SQL com `ROLLBACK` (seção 17), replicando exatamente a lógica de `createCandidateAction`.

## 13. Automações

**Não validado visualmente** (o botão em si depende de login). A rota server-side que ele chama (`/api/automations/instagram/trigger`) foi validada indiretamente: a mesma lógica de resolução de `client_id` que ela usa foi validada com o teste real do n8n (seção 18), que usa o mesmo `client_id` que a rota resolveria para um usuário real.

---

## 14. Teste admin

`role==='admin'` → `getActiveClientId()` retorna `null` por construção direta no código (`if (session.role === 'admin') return null;`), sem depender de nenhum valor do banco. Verificado por leitura de código (inalterado em relação ao padrão já usado e testado de `getAllowedTargetIds()`) — não exercitado com sessão real (mesma limitação da seção 15).

## 15. Teste usuário não-admin

**Pendente — não PASS.** Motivo explícito: validar isso exigiria uma sessão autenticada real, o que exige digitar uma senha em um formulário de login. Minhas regras de segurança proíbem essa ação categoricamente ("nunca inserir senhas em nenhum campo"), inclusive para contas de teste criadas por mim mesmo com esse único propósito. Cheguei a:
1. Criar 2 usuários temporários diretamente no banco (`temp.admin.bloco2@teste.interno`, `temp.gestor.bloco2@teste.interno`, senha gerada localmente com o mesmo algoritmo `scrypt` do app), vinculados ao cliente real e a 1 target real, com permissões de tela.
2. Abrir a página de login no navegador.
3. **Parar antes de digitar a senha no campo**, ao reconhecer que a ação violava minha própria política de segurança.
4. Remover imediatamente os 2 usuários de teste e todos os vínculos (`app_user_targets`, `app_user_permissions`) — confirmado `0` linhas residuais.

Este é um teste genuíno que só pode ser feito por um humano com acesso legítimo ao login, ou por uma ferramenta de automação de navegador operada com autorização explícita para inserir credenciais (fora do que minhas regras permitem).

## 16. Teste client_id forjado

**Pendente — não PASS**, mesmo motivo da seção 15. A lógica está implementada e revisada em código (`app/api/automations/instagram/trigger/route.ts`): usuário não-admin cujo `clientId` do payload diverge do `clientId` da sessão recebe `403`/`CLIENT_ID_MISMATCH` antes de qualquer chamada ao n8n. O **equivalente no lado do n8n** foi testado com dado real de produção (seção 18): um `client_id` que não corresponde a nenhum cliente real corretamente não encontra nenhuma conta e não processa nada — prova que a camada de aplicação do filtro funciona; a camada de autorização da sessão (rota Next.js) não pôde ser exercitada ao vivo.

## 17. Teste novo target

**PASS** (transacional). Dentro de uma transação com `ROLLBACK` (nada persistido), replicando exatamente a lógica de `createCandidateAction`:
```
insert targets (..., client_id=<cliente real>) → id, client_id retornado corretamente
insert social_accounts (target_id=<novo target>) → client_id herdado automaticamente pelo trigger
```

## 18. Teste novo conteúdo

**PASS**, com execução real pós-deploy:
```
POST /webhook/trigger-posts (clientId=<cliente real>, autenticado)
→ collection_logs: started_at=2026-08-21 03:24:42, status=success,
  posts_collected=12, client_id=f348bd17-... (correto, derivado automaticamente,
  n8n não precisou enviar esse valor em nenhum upsert)
```

## 19. Teste trigger client_id

Ver seções 16 e 18 — a parte n8n está com **PASS** real; a parte da rota Next.js (validação de sessão) está **pendente**.

## 20. Validação n8n

Workflow `XaWHmrrnobud6La1`: `versionId === activeVersionId === 0cfd6ecc-a377-492b-9b25-c3280782c06a` — confirmado que a versão ativa/publicada é a mesma que contém os 4 filtros de `client_id` e a autenticação `headerAuth` nos 4 webhooks (nenhuma mudança pendente de publicação). Nenhuma alteração nova foi feita no n8n nesta etapa — só confirmação, conforme instrução ("não publicar mudanças novas se nenhuma for necessária").

---

## 21. Política targets antes

`read_targets_legacy_anon` — `SELECT` para `anon, authenticated`, `using(true)`. Inalterada, ainda em vigor.

## 22. Consumidores de targets

Nova busca completa (repetida desta etapa) por `.from('targets')` e equivalentes: mesmos 6 arquivos do Bloco 2 (`lib/actions/candidatos.ts`, `lib/queries/candidatos.ts`, `lib/queries/instagram.ts`, `lib/queries/noticias.ts`, `lib/queries/overview.ts`, `lib/queries/x.ts`). Classificação:

| Arquivo | Classificação |
|---|---|
| `lib/actions/candidatos.ts` | server-side admin |
| `lib/queries/candidatos.ts` | server-side admin (desde o Bloco 1) |
| `lib/queries/instagram.ts` | server-side admin (desde o Bloco 1) |
| `lib/queries/x.ts` | server-side admin (desde o Bloco 1) |
| `lib/queries/overview.ts` | server-side admin (desde o Bloco 1) |
| `lib/queries/noticias.ts` | server-side admin (**desde este Bloco 2** — era o único pendente) |

`client-side anon = 0` e `server-side anon legítimo = 0` — **condição técnica satisfeita** no código. O que falta é a validação **em produção com login real** (seção 15), que a instrução exige antes de mexer na policy.

## 23. Remoção de read_targets_legacy_anon

**NÃO executada.** A condição técnica (item 22) está satisfeita, mas a condição de processo — "somente depois de Notícias estar funcionando em PRODUÇÃO" via validação visual — não pôde ser cumprida nesta etapa pela limitação da seção 15. Removo assim que houver confirmação visual (do usuário, ou de uma sessão de teste conduzida por um humano/ferramenta autorizada a inserir credenciais).

## 24. Teste anon após remoção

Não aplicável — policy não foi removida.

## 25. Validação visual pós-policy

Não aplicável — policy não foi removida.

## 26. collection_logs / client_id

Confirmado com dado real (seção 18): `client_id` correto, derivado automaticamente, sem intervenção do n8n.

---

## 27. Pendências

1. **Validar dashboards logados e o teste de `client_id` forjado com sessão real** — precisa de um humano (ou ferramenta explicitamente autorizada a inserir credenciais) logando de verdade. É o único bloqueio real que resta.
2. Depois do item 1: remover `read_targets_legacy_anon` e revalidar a chave `anon` (`targets`/`social_posts`/`instagram_comments`/`instagram_posts`/`ai_analysis` → `[]`).
3. Confirmar o SHA do deployment no painel da Vercel (API MCP sem escopo nesta sessão).
4. Pendências herdadas do Bloco 1/2 inalteradas: rotação de credenciais antigas, nome comercial do cliente, `NOT NULL` em `client_id` (propositalmente não aplicado — instrução explícita desta etapa), UI multi-cliente.

## 28. Riscos

| Risco | Nível |
|---|---|
| Dashboards não confirmados visualmente em produção | Baixo-Médio — mitigado por: build limpo, 1109 testes, diffs mínimos e cirúrgicos idênticos em padrão a mudanças já comprovadas no Bloco 1, e um teste real de ponta a ponta do pipeline de dados (seção 18) |
| `read_targets_legacy_anon` continua aberta | Baixo, inalterado — mesmo estado documentado desde o Bloco 1, nenhuma piora |
| Teste de sessão cross-tenant não realizado | Baixo — a metade do mecanismo (filtro no n8n) já foi provada com dado real; a metade que falta é a validação de entrada, código simples e revisado |

## 29. Rollback

Nenhuma mudança destrutiva nesta etapa. Se necessário reverter o deploy: `git revert 32d9553` + novo push, ou reset do branch `main` para `dea5853` na Vercel. O banco não foi alterado nesta etapa (só o Bloco 2 anterior alterou, e já era aditivo/reversível).

## 30. Recomendação para Bloco 3

Antes do Bloco 3 (Reels/Stories), fechar a única pendência real: pedir para o usuário (ou alguém com acesso legítimo) fazer um login real rápido em produção e confirmar visualmente os 5 dashboards + testar o cenário de `client_id` forjado manualmente (ex.: via `curl` autenticado com o cookie de sessão de um usuário não-admin, ou pela própria tela). Assim que confirmado, a policy `read_targets_legacy_anon` pode ser removida numa migration pequena e isolada, fechando definitivamente o Bloco 2 antes de abrir o Bloco 3.

---

## MULTI-TENANT PRODUCTION STATUS:
**PASS WITH GAPS**

Justificativa: código deployado (commit `32d9553` em `main`, aplicação respondendo em produção sem erro), banco consistente antes/depois, `client_id` propagando corretamente e comprovado com execução real de coleta pós-deploy, mecanismo de escopo por cliente no n8n comprovado com dado real (id inexistente corretamente não processa nada), Automações/n8n/workflow mestre preservados, build e testes aprovados. **Não atinge PASS puro** porque a validação visual dos dashboards logados e o teste de `client_id` forjado com sessão real não puderam ser executados — não por falha técnica, mas porque isso exigiria eu inserir uma senha em um formulário de login, ação que minhas regras de segurança proíbem sem exceção, inclusive para uma conta de teste criada e removida por mim mesmo só para esse fim. `read_targets_legacy_anon` permanece intacta até essa validação acontecer, exatamente na ordem que a instrução exigiu.

Não avancei para o Bloco 3. Aguardando validação humana e nova autorização.
