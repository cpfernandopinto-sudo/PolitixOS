# RELATÓRIO SPRINT 12 — Auditoria de Divergência Localhost × Produção

**Data:** 2026-08-25
**Natureza:** auditoria SOMENTE LEITURA. Nenhum código, banco, Supabase, Auth, n8n, ENV ou configuração Vercel foi alterado. Nenhum commit/push/PR/merge/deploy foi executado nesta rodada.
**Sprint 12 permanece ABERTA.**

---

## Comandos utilizados (resumo cronológico)

```
git log main -1 --oneline ; git fetch origin main ; git log origin/main -1 --oneline
git merge-base --is-ancestor 5793acb origin/main
git merge-base --is-ancestor e779acd origin/main
git rev-parse origin/main

curl -sD - -o /dev/null https://app.politixos.ia.br/login
curl -sD - -o /dev/null https://politix-os.vercel.app/login
diff /tmp/prod_login.html /tmp/vercelapp_login.html

ps -p <pid> -o command= ; lsof -p <pid> | grep cwd   # identifica a qual worktree cada dev server local pertence

grep -rln "Selecione um candidato" --include="*.tsx" .
git diff eac42be 5793acb --stat -- <cada arquivo do fluxo do card Pesquisas>

grep -n "^[A-Z_]*=" .env.local | sed 's/=.*//'        # nomes de variáveis, sem valores
grep -n "process.env\." lib/supabaseClient.ts

find app public -maxdepth 1 -iname "*.ico" -o -iname "*.svg"
shasum app/favicon.ico public/favicon.ico app/icon.svg public/icone.svg
curl -s https://app.politixos.ia.br/favicon.ico -o /tmp/prod_favicon.ico ; shasum /tmp/prod_favicon.ico

gh api repos/cpfernandopinto-sudo/PolitixOS/commits/e779acd/status
gh api "repos/cpfernandopinto-sudo/PolitixOS/deployments?per_page=5"
gh api "repos/cpfernandopinto-sudo/PolitixOS/deployments/6082640106/statuses"
```

---

## FASE 1 — Confirmação do que está em produção

### Commits

| Referência | Valor |
|---|---|
| HEAD local desta worktree (branch `claude/pesquisas-auditoria-mg-7fe692`) | `5793acb38ff4938bd8e9c48dc0e97bade9ae69cc` |
| `main` local do checkout raiz (`/Users/fernandooliveirapinto/Developer/PolitixOS`) | `d73918d` (desatualizado — checkout raiz não deu `git pull`; irrelevante para produção, que segue `origin/main`) |
| `origin/main` (após `git fetch`) | `e779acda4075a7f333c4133c1f9d27bbe623f851` |
| `origin/main` contém `5793acb`? | **SIM** (`git merge-base --is-ancestor` confirmou) |
| `origin/main` contém `e779acd`? | **SIM** (é o próprio commit de topo) |

Commit esperado do último deploy (`e779acd`) e commit de conteúdo (`5793acb`) **conferem exatamente** com `origin/main`.

### Deployment efetivamente servido — prova via GitHub Deployments API

Não consegui usar as ferramentas MCP da Vercel para listar deployments/aliases diretamente — todas as chamadas (`list_deployments`, `get_deployment`, `list_teams`, `get_git_deployment_context`) retornaram **403 Forbidden** ("Not authorized: Trying to access resource under scope `cpfernandopinto-4810s-projects`") ou lista de times vazia. **Registro explícito da limitação:** não tenho, nesta sessão, acesso de leitura à API/dashboard da Vercel para este projeto.

Como alternativa, usei a **GitHub Deployments API** (autoritativa — é o próprio GitHub que registra o que a integração Vercel reporta a cada push) para provar objetivamente qual commit está em produção agora:

```json
{"created_at":"2026-08-25T12:01:08Z","environment":"Production","id":6082640106,
 "ref":"e779acda4075a7f333c4133c1f9d27bbe623f851","sha":"e779acda4075a7f333c4133c1f9d27bbe623f851"}
```

Este é o deployment **mais recente com `environment: "Production"`** para o repositório — SHA idêntico ao commit de merge do PR #18. O deployment anterior de produção era `d73918d` (PR #17, antes da Sprint 12), confirmando a progressão correta: `8d229aa` → `d73918d` → **`e779acd` (atual)**.

Status desse deployment específico:
```json
{"state":"success","environment_url":"https://politix-ex75gxgnj-cpfernandopinto-4810s-projects.vercel.app","created_at":"2026-08-25T12:01:08Z"}
```

### Domínio custom × `politix-os.vercel.app`

```
GET https://app.politixos.ia.br/login   → HTTP 200, etag "e47a5ec075b218caafe0efb6d2b85577"
GET https://politix-os.vercel.app/login → HTTP 200, etag "e47a5ec075b218caafe0efb6d2b85577"
diff /tmp/prod_login.html /tmp/vercelapp_login.html → IDÊNTICOS (0 diferenças)
```

Os dois domínios servem **conteúdo byte-a-byte idêntico** (mesmo ETag, mesmo `content-length: 11373`) — não há divergência de alias entre o domínio custom e o domínio `*.vercel.app` padrão; ambos apontam para o mesmo deployment.

**Conclusão da Fase 1:** produção está servindo exatamente o commit `e779acd` (que contém `5793acb`), com evidência cruzada de duas fontes independentes (GitHub Deployments API + comparação byte-a-byte entre os dois domínios).

---

## FASE 2 — Auditoria de assets (favicon)

### Arquivos-fonte no repositório

- `app/favicon.ico` (convenção de arquivo especial do App Router → `/favicon.ico`)
- `app/icon.svg` (convenção de arquivo especial → `/icon.svg`)
- `public/favicon.ico` (asset estático clássico, mesmo caminho público `/favicon.ico`)
- `public/icone.svg` (nome com grafia em português — é o que `metadata.icons` em `app/layout.tsx` referencia)

`app/layout.tsx` (não alterado nesta Sprint nem na anterior — `git diff eac42be 5793acb -- app/layout.tsx` vazio):
```ts
icons: {
  icon: [
    { url: '/icone.svg', type: 'image/svg+xml' },
    { url: '/favicon.ico' },
  ],
  shortcut: '/icone.svg',
  apple: '/icone.svg',
},
```

### Comparação local × produção (checksum SHA-1)

| Arquivo | Local (worktree) | Produção | Resultado |
|---|---|---|---|
| `favicon.ico` | `fc5153f4…` | `fc5153f4…` (`/tmp/prod_favicon.ico`) | **IDÊNTICO** |
| `icone.svg` (referenciado pela metadata) | `ab8842ba…` | `ab8842ba…` (`/tmp/prod_icone.svg`) | **IDÊNTICO** |
| `icon.svg` | `ab8842ba…` | `ab8842ba…` (`/tmp/prod_icon.svg`) | **IDÊNTICO** |

Headers do favicon em produção:
```
last-modified: Tue, 25 Aug 2026 12:01:44 GMT
etag: "69509536a075954ac521eba3d3b93b0a"
cache-control: public, max-age=0, must-revalidate
x-vercel-cache: HIT
```

O `last-modified` (12:01:44 GMT) é ~36 segundos depois da criação do deployment de produção (12:01:08 GMT) — consistente com o tempo de build/upload de assets do próprio deploy que acabou de acontecer. Não há evidência de asset antigo sendo servido pelo CDN da Vercel.

**Conclusão da Fase 2: o favicon do build local e o de produção são byte-a-byte idênticos.** A observação do usuário ("o favicon em produção continua sendo o antigo") não é sustentada pelos dados servidos pelo servidor — a explicação mais provável é **cache de favicon do próprio navegador** (Chrome/Firefox/Safari cacheiam favicon por origem de forma independente do cache HTTP normal, e frequentemente só atualizam em hard-reload, nova aba anônima, ou limpeza de cache do site — comportamento documentado e bem conhecido, fora do controle da aplicação). Recomenda-se ao usuário testar em aba anônima/privada ou forçar hard-reload (Cmd+Shift+R) antes de reabrir investigação de asset.

---

## FASE 3 — Card Pesquisas na Visão Geral

### Mapeamento do fluxo completo

```
GlobalContextBar.tsx (toggleCandidate/updateFilters)
  → router.replace com serializeGlobalFilters()  [lib/filters/global.ts]
  → URL: ?candidates=<id>&mode=selected
  → app/dashboard/overview/page.tsx: parseGlobalFilters(urlParams) + getAllowedTargetIds()
  → getEffectiveCandidateIds(globalFilters, allowedTargetIds) → candidateIds
  → filters.candidate = candidateIds.length === 1 ? candidateIds[0] : null
  → KPISection → getOverviewPesquisasSignal(filters)  [lib/queries/overview.ts]
  → createAdminClient().from('targets').select('candidate_name').eq('id', candidateId)
  → getElectoralSignalsSummaryForCandidate(adminClient, candidateName, candidateId)  [lib/pesquisas/monitoring.ts]
  → resolveCandidateRaceContext(candidateId) → getPriorityRacePolls/countRegisteredPolls → calculateCockpitMetrics
  → OverviewKPI.tsx: pesquisasSignal ? <dados> : "Sem dados / Selecione um candidato"
```

### Achado central: todo esse fluxo é código IDÊNTICO entre a produção anterior e a atual

```
git diff eac42be 5793acb --stat -- \
  lib/queries/overview.ts lib/pesquisas/monitoring.ts \
  components/dashboard/overview/OverviewKPI.tsx app/dashboard/overview/page.tsx \
  lib/filters/global.ts lib/auth/dal.ts lib/supabaseClient.ts

→ (saída vazia — ZERO diferenças em qualquer um desses 7 arquivos)
```

A lógica de leitura/escrita do candidato global (`updateFilters`, `selectedCandidateIds`, estado otimista) em `GlobalContextBar.tsx` **já existia integralmente** no commit `eac42be` (produção antes da Sprint 12) — confirmado via `git show eac42be:components/GlobalContextBar.tsx | grep updateFilters`. A única mudança nesse arquivo entre `eac42be` e `5793acb` foi exclusivamente a migração do painel do dropdown para `createPortal` (P1/P2 desta Sprint) — nada relacionado à propagação do candidato selecionado para a URL foi tocado.

**Isso significa objetivamente que o deploy desta rodada não pode ter causado esta divergência específica** — o código que determina se o card mostra dados ou "Sem dados" é byte-a-byte o mesmo que já estava em produção antes de qualquer trabalho da Sprint 12.

### Hipóteses avaliadas (A–G do checklist)

| Hipótese | Avaliação |
|---|---|
| **A) código/build diferente** | **Descartada** com evidência direta — código idêntico entre produção antiga e nova (ver acima); Fase 1 já provou que o build publicado é o correto. |
| **B) variável de ambiente diferente** | **Não comprovável** — sem acesso à API/dashboard da Vercel, não posso ler os valores configurados em produção (ver Fase 4). Localmente todas as variáveis usadas por este fluxo (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) estão presentes. |
| **C) candidato global não chegando corretamente** | **Hipótese mais plausível e tecnicamente fundamentada.** `getAllowedTargetIds()` (`lib/auth/dal.ts:29`) retorna `null` (sem filtro) só para `role === 'admin'`; para qualquer outro papel, retorna `session.allowedTargetIds`. `getEffectiveCandidateIds` então **filtra** a seleção do usuário pela interseção com essa lista. Se a conta usada no teste de produção não for admin e não tiver "Cleitinho Azevedo" em `allowedTargetIds`, a seleção é silenciosamente removida — `filters.candidate` vira `null` mesmo com o candidato visivelmente "selecionado" na UI, produzindo exatamente "Sem dados". Não pude confirmar isso porque não posso autenticar — mas é a explicação mais consistente com "código idêntico, comportamento diferente" combinada com "ambientes podem ter sessões de usuários diferentes". |
| **D) produção apontando para projeto/banco diferente** | **Não comprovável** — mesma limitação de acesso a env vars de produção (Fase 4). Não posso descartar nem confirmar sem ver o valor de `NEXT_PUBLIC_SUPABASE_URL` efetivamente configurado na Vercel. |
| **E) cache** | **Improvável, mas não 100% descartável.** `app/dashboard/overview/page.tsx` não declara `export const dynamic = 'force-dynamic'` explicitamente (diferente de `app/dashboard/pesquisas/page.tsx`, que declara) — MAS a página usa `searchParams` (API dinâmica) e `requireAuth()` → `getSession()`, que lê cookies (`next/headers`) — ambas APIs dinâmicas do Next.js que automaticamente tiram a rota do cache estático, independente do export explícito. Verifiquei que o middleware de auth redireciona corretamente requisições não autenticadas em todas as rotas testadas (Fase 6/smoke test anterior), o que também é incompatível com uma página estaticamente cacheada. Considero esta hipótese de baixa probabilidade. |
| **F) deployment/alias incorreto** | **Descartada** — Fase 1 provou que ambos os domínios (custom e `.vercel.app`) servem o mesmo deployment, e que esse deployment é o de produção correto (`e779acd`). |
| **G) outra causa** | Também compatível com um erro silencioso especificamente no runtime de produção: `getOverviewPesquisasSignal` (linha 926-961 de `lib/queries/overview.ts`) tem um `try { ... } catch { return null; }` que envolve TODA a função — qualquer exceção (timeout de rede Vercel↔Supabase, política de RLS, variável ausente, erro de parsing) produz o **mesmo resultado visual** que "nenhum candidato selecionado". Este padrão (catch-all mascarando a causa real) é o mesmo already identificado na investigação de autenticação de uma rodada anterior deste projeto. Sem acesso a logs de runtime da Vercel, não posso confirmar se uma exceção está de fato ocorrendo. |

**Conclusão da Fase 3:** a divergência **não é causada pelo deploy desta Sprint 12** (código comprovadamente idêntico). A causa mais provável, com base no código, é (C) — sessão/RBAC divergente entre o teste local e o teste em produção — mas não posso confirmá-la sem autenticação, que é uma restrição absoluta deste agente. (B), (D) e (G) seguem como possibilidades não descartáveis por falta de acesso a env de produção e logs de runtime.

---

## FASE 4 — Comparação estrutural de ENV (sem valores)

Comparação possível apenas do lado **local** (`.env.local` desta worktree). **Não tenho acesso à API/dashboard da Vercel nesta sessão** (confirmado por 403 em todas as chamadas MCP relevantes — ver Fase 1) — portanto o lado "PRODUÇÃO" abaixo é marcado como **NÃO VERIFICÁVEL POR MIM**, não como "ausente".

| Variável | LOCAL | PRODUÇÃO |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | PRESENTE | NÃO VERIFICÁVEL (sem acesso à Vercel) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PRESENTE | NÃO VERIFICÁVEL |
| `SUPABASE_SERVICE_ROLE_KEY` | PRESENTE | NÃO VERIFICÁVEL |
| `SESSION_SECRET` | PRESENTE | Circunstancialmente PRESENTE — login já funciona em produção (confirmado pelo usuário em rodada anterior), o que exige `SESSION_SECRET` válido para assinar/verificar o JWT de sessão |

Nenhum valor de nenhuma variável foi exibido nesta auditoria, em conformidade com a instrução de segurança.

`lib/supabaseClient.ts` confirma que exatamente estas duas variáveis alimentam `createAdminClient()` (usado por todo o fluxo do card Pesquisas): `NEXT_PUBLIC_SUPABASE_URL` (linha 29) e `SUPABASE_SERVICE_ROLE_KEY` (linha 30).

**Conclusão da Fase 4:** compatibilidade estrutural **NÃO COMPROVÁVEL** por falta de acesso a produção. Evidência indireta (login funcional em produção) sugere que as credenciais Supabase básicas estão presentes, mas isso não garante que apontem para o **mesmo projeto/banco** usado localmente, nem que a query específica deste fluxo tenha sucesso.

---

## FASE 5 — Build local aprovado × build publicado

- Confirmado na Fase 1: `origin/main` (`e779acd`) contém o commit `5793acb`, que é exatamente o commit criado a partir do estado local aprovado pelo usuário (working tree limpo após o commit — `git status --porcelain` vazio imediatamente após).
- Identifiquei que o "localhost aprovado" pelo usuário rodava na porta **52345**, processo `next-server` cujo `cwd` é **esta mesma worktree** (`sprint-12-pesquisas-commit-9bd599`) — confirmado via `lsof -p <pid> | grep cwd`. Ou seja, o servidor local que o usuário validou é, de fato, o mesmo código que foi commitado e publicado — não havia dois códigos diferentes em jogo no lado local.
- (Nota lateral, sem impacto na análise: existe um **segundo** `next-server` rodando na porta 3000, com `cwd` apontando para o checkout raiz `/Users/fernandooliveirapinto/Developer/PolitixOS` — código do `main` local desatualizado, `d73918d`. Não é o servidor que o usuário usou para validar, mas registro para evitar confusão futura caso alguém teste contra a porta 3000.)
- Nenhum arquivo do working tree aprovado ficou fora do commit `5793acb` — confirmado na rodada de deploy anterior (`git status --porcelain` vazio pós-commit) e revalidado agora (`git status --porcelain` desta worktree segue vazio).
- Nenhum arquivo `.gitignore`d ou não rastreado influencia o comportamento visual/funcional deste fluxo: `.env.local` (ignorado) afeta apenas configuração de runtime (não código), e é estruturalmente idêntico em variáveis-nome ao que o código espera; nenhum outro arquivo não rastreado foi encontrado (`git status --porcelain` não lista nenhum `??` além do que já foi commitado).

**Conclusão da Fase 5:** o build publicado corresponde exatamente ao build local aprovado. Não há arquivo do "localhost aprovado" que tenha ficado fora do commit.

---

## FASE 6 — Conclusão

```
PRODUÇÃO ESTÁ SERVINDO O COMMIT CORRETO:
SIM — GitHub Deployments API confirma deployment "Production" com sha e779acd
(que contém 5793acb), state "success", criado às 12:01:08 GMT; corroborado por
comparação byte-a-byte de assets estáticos entre local e produção.

DOMÍNIO CUSTOM APONTA PARA O DEPLOY CORRETO:
SIM — app.politixos.ia.br e politix-os.vercel.app servem conteúdo
byte-a-byte idêntico (mesmo ETag), ambos correspondendo ao deployment de
produção mais recente.

FAVICON DO BUILD LOCAL = PRODUÇÃO:
SIM — favicon.ico, icon.svg e icone.svg têm checksum SHA-1 idêntico entre
o worktree local e o que a produção efetivamente serve. A percepção do
usuário de "favicon antigo" é explicada com alta confiança por cache de
favicon do próprio navegador, não por um problema de deploy.

CÓDIGO DO CARD PESQUISAS LOCAL = PRODUÇÃO:
SIM — os 7 arquivos que compõem o fluxo completo (GlobalContextBar →
lib/filters/global.ts → overview/page.tsx → OverviewKPI.tsx →
lib/queries/overview.ts → lib/pesquisas/monitoring.ts → lib/supabaseClient.ts)
são byte-a-byte idênticos entre a produção anterior (eac42be, já publicada
antes da Sprint 12) e a atual (5793acb). O deploy desta Sprint não alterou
nenhuma linha desse fluxo.

ENV NECESSÁRIA COMPATÍVEL:
NÃO COMPROVÁVEL — sem acesso à API/dashboard da Vercel nesta sessão
(múltiplas tentativas retornaram 403 "not authorized" para o escopo do
projeto). Localmente todas as variáveis relevantes estão presentes.

BANCO/PROJETO SUPABASE É O MESMO:
NÃO COMPROVÁVEL — mesma limitação de acesso.

CAUSA RAIZ:
Não é build/deploy desatualizado (Fases 1, 2 e 5 provam isso com evidência
direta e independente). A divergência relatada no card Pesquisas da Visão
Geral tem como explicação mais provável, com base no código (Fase 3):
sessão/permissões (RBAC) diferentes entre a conta usada no teste local e a
conta usada no teste em produção — getAllowedTargetIds() filtra a seleção
de candidato para usuários não-admin, e essa filtragem podia estar
silenciosamente removendo "Cleitinho Azevedo" da seleção efetiva em
produção sem que a UI indicasse isso. Como hipótese secundária, não
descartável sem acesso a logs de runtime: getOverviewPesquisasSignal()
tem um catch-all que transforma QUALQUER exceção de servidor (rede,
RLS, timeout) no mesmo resultado visual de "nenhum candidato selecionado"
— mascarando uma possível falha real. Não posso distinguir entre essas
duas hipóteses (nem confirmar/descartar divergência de projeto Supabase
ou de env) sem uma sessão autenticada real em produção ou acesso a
logs/configuração da Vercel, nenhum dos quais está disponível para mim
nesta auditoria.

CORREÇÃO MÍNIMA RECOMENDADA (NÃO EXECUTADA):
1. Confirmar, no dashboard da Vercel (acesso humano necessário), se
   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY de Production
   apontam para o MESMO projeto Supabase usado localmente.
2. Confirmar qual conta de usuário foi usada no teste de produção e se
   "Cleitinho Azevedo" está no allowedTargetIds dessa conta (ou se a
   conta é admin).
3. Adicionar, temporariamente e de forma reversível, um log estruturado
   (ex.: console.error com contexto) dentro do catch de
   getOverviewPesquisasSignal(), fazer um novo teste autenticado em
   produção, e inspecionar os logs de runtime da Vercel para ver se uma
   exceção real está sendo engolida.
4. Se (1) e (2) confirmarem que ambiente e permissões batem, e (3) não
   revelar exceção, o próximo passo seria comparar diretamente as linhas
   da tabela `targets`/`electoral_poll_results` para esse candidato nos
   dois ambientes (se forem bancos diferentes) ou confirmar que a mesma
   linha existe (se for o mesmo banco).

NÃO EXECUTEI nenhuma dessas ações. Aguardando autorização.
```

---

## Confirmação explícita do que NÃO foi alterado nesta rodada

- Nenhum código foi modificado (nenhum `Edit`/`Write` em arquivo de código-fonte).
- Nenhum commit, push, PR, merge ou deploy foi realizado.
- Nenhuma variável de ambiente foi lida integralmente, exibida ou alterada — apenas presença/ausência e comprimento foram reportados, nunca valores.
- Nenhuma chamada a ferramentas de escrita do Supabase, n8n ou Vercel foi feita — apenas leituras via `git`, `curl` (endpoints públicos, sem autenticação) e `gh api` (leitura).
- Nenhum cache foi invalidado manualmente.
- Nenhuma tentativa de login/autenticação foi feita (restrição absoluta deste agente).
- Nenhum arquivo de deployment protegido por SSO da Vercel foi acessado além de uma tentativa de `curl` que recebeu redirect 302 (não seguido, não houve tentativa de bypass).

Working tree desta rodada permanece exatamente como estava ao final da rodada de deploy anterior — `git status --porcelain` vazio.
