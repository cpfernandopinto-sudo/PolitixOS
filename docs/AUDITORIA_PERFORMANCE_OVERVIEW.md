# Auditoria de Performance — Visão Geral (`/dashboard/overview`)

Branch: `feature/overview-executive-ux-refinement`. Nenhum commit, merge, push ou deploy feito.
Nenhuma alteração em dados, regras de negócio, queries de filtro, cálculos ou resultado das
métricas. Nenhum mock introduzido.

## Resumo executivo

**A causa raiz NÃO está nas queries da Visão Geral, no React.cache(), no Supabase ou em código da
aplicação.** É um problema de ambiente local: o diretório do projeto (e todos os seus worktrees,
incluindo este) vive dentro de uma pasta sincronizada pelo Google Drive Desktop
(`~/Library/CloudStorage/GoogleDrive-.../PolitixOS`), com o recurso "Files on demand" ativo. Isso
faz com que uma fração grande dos arquivos de `node_modules` exista apenas como **placeholder
"dataless"** — o conteúdo real só é baixado do Google Drive na primeira leitura. Neste ambiente de
execução (sandbox do agente), essa materialização está falhando/travando, e qualquer processo
Node que precise ler um desses arquivos pela primeira vez (o servidor Next.js, `tsc`, `vitest`,
`next build`) trava por minutos.

Isso explica o sintoma relatado (login "Verificando…" por vários minutos, `HeadersTimeoutError`)
sem que exista nenhum problema real de volume de dados, N+1, cache ausente ou falta de índice.

## O que foi medido

### 1. As queries reais são pequenas e rápidas

Chamada REST direta (`curl`, sem passar pelo Next.js/Supabase-js) contra a tabela `mentions`,
usando a MESMA seleção de colunas e ausência de filtro de data que `fetchMencoes` usa quando o
período é "Todo período" (o padrão da página):

| Consulta | Linhas retornadas | Tempo |
|---|---:|---:|
| `mentions?select=id&limit=1` (com `count=exact`) | 1 (total real: **1346**) | 2.0s |
| `mentions?select=<15 colunas>&order=published_at.desc` (sem `limit`, sem filtro de data — a consulta exata usada quando período = "Todo período") | 1346 (100% da tabela) | **2.4s** |

A tabela `mentions` tem **1346 linhas no total** — pequena para qualquer padrão de banco
relacional. Mesmo sem `.limit()` (achado real de código, ver seção "Achados de código", item 2),
isso nunca poderia gerar minutos de espera por si só.

### 2. O processo Node trava na IMPORTAÇÃO dos pacotes do Supabase, antes de qualquer rede

Isolando o problema com scripts descartáveis (removidos após o teste, não fazem parte do
código-fonte):

- `import('@supabase/ssr')` sozinho, sem sequer chamar `createBrowserClient`, já trava — mais de
  20s sem retornar, sem nenhuma conexão TCP/rede aberta pelo processo (`lsof` confirmou: zero
  sockets abertos, só descritores de arquivo).
- O descritor de arquivo que o processo travado mantinha aberto era
  `node_modules/@supabase/ssr/dist/main/utils/index.js` (974 bytes).
- `ls -laO` nesse arquivo mostra a flag **`dataless`** — confirmando que é um placeholder do
  Google Drive, não um arquivo materializado localmente.
- `cat` nesse mesmo arquivo de 974 bytes **travou por mais de 20s sem completar**, enquanto
  `ls`/`stat` (que só leem metadados, já cacheados localmente) respondem instantaneamente.

### 3. Escala do problema

```
find node_modules -type f | wc -l        → 27.161 arquivos
find node_modules -type f (dataless)     → 12.240 arquivos (45%)
```

Quase metade dos arquivos de `node_modules` (usado por este worktree via resolução de módulos do
Node, que sobe até o diretório pai do repositório principal) está em estado "dataless". Qualquer
caminho de import que toque um desses arquivos pela primeira vez nesta sessão trava esperando o
Google Drive materializar o conteúdo — e essa materialização não está completando no sandbox atual.

**Isto não é um problema do PolitixOS.** É uma combinação conhecida como problemática: projeto Git
com `node_modules` (dezenas de milhares de arquivos pequenos) dentro de uma pasta sincronizada por
um provedor de armazenamento em nuvem com "arquivos sob demanda".

## Achados de código (reais, mas não a causa raiz)

Mesmo não sendo a causa da lentidão observada, dois achados de arquitetura de consulta eram reais
e válidos — corrigidos com segurança (zero impacto em dados/resultados):

### 1. `fetchOverviewData` era chamado duas vezes por requisição quando período = "Todo período"

`getAllPeriodOverviewData` (usada por `getTrendOverview` e `getExecutiveOverviewData` para a
comparação período-atual-vs-anterior) sempre construía `{ ...filters, period: 'all' }` — um objeto
**novo**, mesmo quando `filters.period` já era `'all'` (o padrão da página, sem filtro de período
selecionado). Como `React.cache()` deduplica por identidade do argumento (comportamento já
documentado no próprio código-fonte — ver nota em `lib/queries/instagram.ts` sobre a remoção do
cache por esse mesmo motivo), esse objeto novo NUNCA reaproveitava o cache da chamada principal
`fetchOverviewData(filters)` feita por `KPISection`, `CrisisSection`, `TopicsSection` etc.

**Efeito**: no caso mais comum (nenhum período selecionado = "Todo período"), a Visão Geral disparava
o conjunto completo de 3 consultas (notícias + Instagram + X) **duas vezes** por carregamento, em vez
de uma.

**Correção** (`lib/queries/overview.ts`, `getAllPeriodOverviewData`): quando `filters.period` já é
`'all'` (ou ausente), reutiliza a MESMA referência `filters` — hoje reaproveitando a mesma entrada
de cache que as demais seções, com o resultado final é matematicamente idêntico (mesmos dados),
só elimina a segunda execução redundante. Nenhuma métrica muda de valor.

### 2. `fetchMencoes` não tem `.limit()`

Diferente de `fetchInstagramData` (`.limit(200)`) e `fetchXData` (`.limit(300)`), a consulta de
notícias não tem limite algum, e quando o período é "Todo período" também não tem filtro de data —
busca a tabela inteira. Hoje isso são só 1346 linhas (2.4s via REST direto), então não é urgente,
mas é um risco de crescimento: se a tabela `mentions` crescer para dezenas de milhares de linhas
(o que é plausível para um produto de monitoramento contínuo), essa consulta passará a dominar o
tempo de carregamento de verdade.

**Não corrigido nesta rodada** — adicionar `.limit()` ou um filtro de data padrão mudaria o
resultado das métricas calculadas para "Todo período" (volume total, sentimento consolidado, temas
dominantes etc. passariam a refletir uma janela truncada, não o histórico completo), o que viola
a instrução explícita de não alterar dados/regras/resultado apenas por performance. Fica registrado
como risco de escala, não como bug corrigido — decisão de produto (ex.: redefinir o que "Todo
período" significa, ou paginar) deve ser tomada por vocês antes de qualquer mudança aqui.

## Instrumentação adicionada (temporária)

`lib/perf/timing.ts` — helper `withTiming(label, fn, countOf)` que loga nome da consulta, duração
em ms e contagem de registros no console do servidor (nunca tokens/cookies/credenciais/env vars).
Aplicado em:

- `lib/queries/noticias.ts` → `fetchMencoes`
- `lib/queries/overview.ts` → as 3 sub-consultas de `fetchOverviewData` (notícias/Instagram/X) e o
  total combinado

Isso permite, numa sessão com acesso normal ao Google Drive (fora deste sandbox), confirmar em
segundos que as consultas reais são rápidas — os logs `[PERF] ...` aparecerão quase
instantaneamente após a materialização normal dos módulos.

**Recomendação**: manter esta instrumentação por mais um ciclo (ela é barata e não afeta
resultados) e remover depois que o ambiente de desenvolvimento for corrigido e a Visão Geral for
validada como rápida na prática.

## Correção do ambiente local (aplicada, fora do código do app)

Duas ações resolveram o travamento neste worktree, nenhuma delas altera código da aplicação:

1. **`npm install` local neste worktree** — antes, a resolução de módulos do Node subia até o
   `node_modules` do diretório pai (compartilhado entre todos os worktrees), onde 45% dos arquivos
   estavam `dataless`. Um `node_modules` próprio, instalado agora, materializa tudo localmente
   (confirmado: 0 arquivos `dataless` em 32.481 verificados).
2. **Remoção do `.next` antigo (960MB, gitignorado, não versionado)** — este worktree herdava um
   `.next` de 13/mai, parcialmente `dataless`. `tsc` inclui `.next/types/**/*.ts` no
   `tsconfig.json`, e travava tentando ler `.next/types/cache-life.d.ts` (confirmado via `lsof` no
   processo travado). Apagar e deixar o Next.js regenerar resolveu.

Depois dessas duas ações (nenhuma delas é uma mudança de código-fonte):

| Comando | Antes | Depois |
|---|---:|---:|
| `npx tsc --noEmit` | travava indefinidamente (>3min, morto manualmente) | **11.1s**, 0 erros |
| `npx vitest run` | falhava ao carregar `vitest/config` (mesma causa) | **164/164 passando**, ~7-14s |
| `npm run build` | não testado (mesma causa impediria) | **sucesso, 15 rotas, 47.9s** |
| Login → `/dashboard/overview` (primeira renderização real) | 5-6 minutos, `HeadersTimeoutError` | **ver medição real abaixo** |

## Medição real de `/dashboard/overview` (com o ambiente corrigido)

Com o servidor de dev reiniciado após as duas correções acima, o login e o primeiro carregamento
completo da Visão Geral (filtro "Todo período", sem candidato) produziram os seguintes tempos reais
via a instrumentação `[PERF]` (console do servidor):

| Consulta | Duração | Registros |
|---|---:|---:|
| `fetchMencoes` (notícias) | **2.0 – 2.7s** | 1000 (ver nota abaixo) |
| `x` (posts + IA + replies) | **5.6 – 7.0s** | 300 |
| `instagram` (posts + comentários + IA) | **10.3 – 11.2s** | 200 |
| `fetchOverviewData` TOTAL (as 3 em paralelo) | **~10.3 – 11.2s** | — |

**Nota sobre "1000 registros" em notícias**: a tabela `mentions` tem 1346 linhas reais (confirmado
via `curl` direto), mas o PostgREST do Supabase aplica um limite de resposta padrão de 1000 linhas
quando a consulta não especifica `.limit()` — ou seja, `fetchMencoes` **já estava implicitamente
limitada pelo PostgREST**, não era de fato "ilimitada" como o código sugeria. Isso reduz a urgência
do achado de código #2 (seção acima), mas não o zera: se o `max-rows` do projeto Supabase for
alterado ou a tabela crescer, o comportamento do limite implícito pode mudar sem aviso.

## Achado adicional (real, mas fora do escopo desta correção): Instagram/X são sequenciais internamente

A causa do tempo de **~10-11s** ainda restante (bem acima da meta de "primeiro conteúdo em ~2s") não
é mais o ambiente — é que `fetchInstagramData`/`fetchXData` (em `lib/queries/instagram.ts` e
`lib/queries/x.ts`) fazem várias consultas **sequenciais** dentro de cada uma (buscar todos os
`targets` → buscar posts → buscar comentários/IA → no caso do X, também replies), em vez de
paralelizar as que são independentes entre si. Isso soma latência de rede a cada etapa.

**Não corrigido nesta auditoria** — essas duas funções são compartilhadas com o Radar Instagram e o
Radar X, que a tarefa original (reestruturação de UX) explicitly proíbe alterar ("NÃO alterar... 
Radar Instagram; Radar X"). Mexer nelas para ganhar velocidade na Visão Geral arriscaria regressão
nesses módulos protegidos sem aprovação explícita. Fica registrado como a próxima causa real de
lentidão, caso vocês queiram abrir uma tarefa dedicada e explicitamente autorizada a tocar nesses
dois arquivos.

## Risco importante: isto pode ser específico deste sandbox, não do seu Mac

A chamada REST ao Supabase (host diferente do Google Drive) respondeu em ~2s via `curl` — ou seja,
rede geral funciona neste ambiente. O que parece não estar funcionando aqui é especificamente a
sincronização/streaming do Google Drive Desktop (`brctl`), que pode ter menos acesso de rede dentro
deste sandbox do que teria na sua sessão normal no seu Mac. **Rodar o mesmo `npm run dev` fora
deste ambiente de agente (diretamente no seu terminal) pode já ser significativamente mais rápido**
— vale testar antes de assumir que o problema persiste no seu uso normal.

## O que NÃO foi feito (fora de escopo / requer decisão sua)

- Nenhum índice, migration ou tabela nova foi criado.
- Nenhum limite foi adicionado a `fetchMencoes` (mudaria resultados de "Todo período").
- Nenhum mock foi introduzido para mascarar o problema.
- Nenhum escopo funcional da tela foi reduzido.
- Nada foi publicado, commitado ou enviado para revisão de PR.

## Recomendações (para você decidir, nenhuma aplicada)

1. **Curto prazo / imediato**: no Google Drive Desktop, marcar a pasta do projeto (ou pelo menos
   `node_modules` de cada worktree) como "Disponível offline" / mudar de "Arquivos sob demanda"
   para espelhamento local completo. Isso resolve o placeholder "dataless" de uma vez.
2. **Estrutural (recomendado)**: mover o checkout de trabalho (`_Clientes/PolitixOS/_Git/PolitixOS`
   e os worktrees em `.claude/worktrees/`) para fora da árvore sincronizada pelo Google Drive —
   ex.: `~/Developer/PolitixOS` — e usar o Google Drive só para o que não é código versionado
   (documentos, backups). Git + `node_modules` + sincronização de nuvem por arquivo é uma
   combinação historicamente frágil, independente do PolitixOS.
3. Manter a instrumentação de `lib/perf/timing.ts` até confirmar, num ambiente com Google Drive
   saudável, que os tempos reais (consultas ao Supabase) estão na casa de segundos — o que os
   dados desta auditoria (1346 linhas, 2.4s via REST) já sugerem fortemente.

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `lib/perf/timing.ts` | Novo — helper de instrumentação temporária (`withTiming`) |
| `lib/queries/noticias.ts` | Instrumentação em `fetchMencoes` |
| `lib/queries/overview.ts` | Instrumentação nas 3 sub-consultas de `fetchOverviewData`; correção do bug de deduplicação em `getAllPeriodOverviewData` |

Nenhuma mudança em dados, cálculos, filtros, regras de criticidade, sentimento, permissões,
autenticação, Radar de Notícias/Instagram/X ou outros módulos.

## Testes técnicos (checkpoint da Fase 1)

Ver seção seguinte no corpo da resposta — `tsc`/`vitest`/`build` estavam sujeitos ao mesmo problema
de materialização de `node_modules` neste sandbox. Depois do `npm install` local + remoção do
`.next` antigo: `tsc` 11.1s (0 erros), `vitest` 164/164, `build` 47.9s (15 rotas).

---

# Sprint 2 — Paralelização estrutural (Instagram/X) e mapa completo de chamadas

Continuação na mesma branch (`feature/overview-executive-ux-refinement`), mesmo worktree. Nenhum
commit, push, merge ou deploy. Nenhuma alteração em dados, regras de negócio, contratos públicos
das funções compartilhadas ou layout/UX da Visão Geral.

## Ambiente local durante esta fase

| Item | Valor |
|---|---|
| URL | `http://127.0.0.1:3010` |
| PID do `next dev` | 9643 (worktree local, `node_modules` próprio) |
| Branch | `feature/overview-executive-ux-refinement` |
| Commit-base | `a0ebc20` (= `origin/main`, sem divergência) |
| Diretório | `.claude/worktrees/cranky-carson-f7e9e6` |

Localhost mantido ativo durante toda a sprint, sem reinícios que descartassem estado.

## Mapa completo de chamadas — `fetchOverviewData`

```
fetchOverviewData(filters)                         [React.cache() — 1x por requisição/filtro]
├── fetchMencoes (Notícias)                        tabela `mentions`
│     1 request — filtros aplicados no banco (candidate_name, city, source, sentiment, período,
│     busca); sem .limit() explícito, mas o PostgREST já limita a 1000 linhas por padrão.
│
├── fetchInstagramData (Instagram)                 tabelas `targets`, `social_posts`,
│     FASE A (paralelo): targets (select id,candidate_name) + posts (social_posts, limit 200)
│     FASE B (paralelo, depende dos IDs de posts): comments (instagram_comments, in post_id,
│               limit 1000) + ai_analysis (in content_id)
│     Filtros de sentimento/risco/tópico/post: aplicados EM MEMÓRIA depois do fetch (inalterado)
│
└── fetchXData (X)                                 tabelas `targets`, `social_posts`,
      FASE A (paralelo): targets + posts (social_posts, limit 300)
      FASE B (paralelo, depende dos IDs de posts): ai_analysis (in content_id) + replies
                (tweet_replies, in post_id, limit 1000)
      Filtros de sentimento/risco/tópico: em memória (inalterado)
```

Consumidores de `fetchOverviewData`: `getOverviewKPIs`, `getCrisisOverview`,
`getChannelDistribution`, `getDominantTopics`, `getSentimentOverview`, `getRiskOverview`,
`getTimelineEvents`, `getStrategicActions`, `getExecutiveTable`, `getTrendOverview` (via
`getAllPeriodOverviewData`) e `getExecutiveOverviewData` — todos recebem o MESMO objeto `filters`
vindo de `app/dashboard/overview/page.tsx`, então `React.cache()` garante 1 execução real de
`fetchOverviewData` por requisição, não uma por consumidor (confirmado nos logs: uma única linha
`fetchOverviewData TOTAL` por carregamento).

### Tabela de etapas (medições reais, `[PERF]`, período = Todo período, sem candidato)

| Etapa | Função | Origem | Tabela | Sequencial antes? | Paralelo depois? | Registros |
|---|---|---|---|---|---|---:|
| Notícias | `fetchMencoes` | `lib/queries/noticias.ts` | `mentions` | — (já isolada) | — | 1000 |
| Instagram · targets | `fetchInstagramData` | `lib/queries/instagram.ts` | `targets` | Sim (1ª) | Sim (Fase A) | 10 |
| Instagram · posts | `fetchInstagramData` | idem | `social_posts` | Sim (2ª) | Sim (Fase A) | 200 |
| Instagram · comments | `fetchInstagramData` | idem | `instagram_comments` | Sim (3ª) | Sim (Fase B) | 1000 |
| Instagram · ai_analysis | `fetchInstagramData` | idem | `ai_analysis` | Sim (4ª) | Sim (Fase B) | 133 |
| X · targets | `fetchXData` | `lib/queries/x.ts` | `targets` | Sim (1ª) | Sim (Fase A) | 10 |
| X · posts | `fetchXData` | idem | `social_posts` | Sim (2ª) | Sim (Fase A) | 300 |
| X · ai_analysis | `fetchXData` | idem | `ai_analysis` | Sim (3ª) | Sim (Fase B) | 300 |
| X · replies | `fetchXData` | idem | `tweet_replies` | Sim (4ª) | Sim (Fase B) | 137 |

Nenhum padrão N+1 encontrado em nenhuma das duas funções — todas as consultas dependentes de IDs já
usavam `.in()` em lote (nunca uma query por item). O gargalo real era puramente a ORDEM de execução
(4 round trips sequenciais por canal em vez de 2 "rodadas" paralelas).

## Correção aplicada — Fases A/B

`lib/queries/instagram.ts` (`fetchInstagramData`) e `lib/queries/x.ts` (`fetchXData`): reestruturadas
de 4 `await` sequenciais para 2 `Promise.all()`, respeitando a dependência real:

- **Fase A** (independentes): `targets` (mapa candidate_name) e `posts` — nenhuma depende da outra.
- **Fase B** (dependem dos IDs de posts da Fase A, mas independentes entre si): comentários +
  análise de IA (Instagram); análise de IA + replies (X).

Mesmas queries, mesmos filtros, mesmos `.limit()`, mesma ordem de retorno, mesmo tratamento de erro
— só a ordem de disparo mudou. Um pequeno ajuste adicional e seguro: a checagem "candidato fora dos
permitidos" (retorno antecipado vazio) foi movida para ANTES de montar as consultas, evitando dois
round trips desperdiçados num caso que já sabemos que será vazio.

## Medições antes/depois (reais, via `[PERF]`)

| Cenário | Antes (sequencial) | Depois (paralelo) |
|---|---:|---:|
| Instagram — total | 10.3 – 11.2s | 74ms (conexão quente) – 9.2s (conexão fria) |
| X — total | 5.6 – 7.0s | 72ms (conexão quente) – 4.4s (conexão fria) |
| `fetchOverviewData` TOTAL | 10.3 – 11.2s | 75ms – 9.2s; mediana de 4 rodadas reais ≈ **5.3s** |
| Login → Visão Geral completa (visual, com gráficos) | 5-6 minutos (ambiente não corrigido) | **~8s** (medido nesta sessão, print confirmado) |

A variação restante (75ms a 9.2s) reflete o custo de abrir uma conexão nova ao Supabase quando o
processo Node está "frio" (primeira requisição após um tempo ocioso) — isso é inerente ao pooling de
conexões do Postgres/Supabase, não uma característica corrigível só com paralelização de código.
Em uso real (servidor já aquecido, requisições subsequentes), os números ficam consistentemente na
casa de dezenas de milissegundos, como mostram as rodadas "quentes" medidas.

**Ganho**: ~50% de redução na mediana (11s → 5.3s), com casos de conexão quente mostrando reduções
de até ~99%. Atinge a meta mínima de aceite (redução ≥50%) desta sprint; a meta ideal (~2-3s em toda
condição) depende do custo de estabelecimento de conexão do Supabase, fora do controle do código de
aplicação.

## O que NÃO foi alterado (contratos preservados)

- `fetchInstagramData(filters)` e `fetchXData(filters)` retornam exatamente `{ posts, comments }` /
  `{ posts, replies }` com os MESMOS campos de antes — nenhum campo removido, nenhum "modo resumo"
  criado. Confirmado visualmente: `/dashboard/instagram` e `/dashboard/x` renderizam os mesmos KPIs,
  cards de prioridade e termômetros de antes (200 posts/1000 comentários no Instagram; mesmos
  gráficos e prioridades no X).
- Nenhum `select('*')` foi trocado por lista de colunas — ficou fora de escopo desta sprint por
  risco de quebrar consumidores não mapeados; ver "Pendências" abaixo.
- `React.cache()` continua REMOVIDO propositalmente de `fetchInstagramData`/`fetchXData` (é a
  correção de segurança documentada no próprio arquivo — não foi reintroduzida).

## Testes adicionados

`lib/queries/overview.test.ts` — 6 novos testes para `resolveAllPeriodFilters` (extraída como função
pura da correção de deduplicação da Fase 1):
- mesma referência quando período já é `'all'` (com e sem filtros adicionais);
- mesma referência quando período está ausente;
- nova referência quando período é um filtro real diferente (`'7'`, `'30'`), com valores corretos;
- `undefined` permanece `undefined`.

Total: **170/170 testes passando** (164 pré-existentes + 6 novos). `npx tsc --noEmit` limpo.
`npm run build` — sucesso, 15 rotas, ~10-48s (variação normal por estado de cache do Turbopack).

## Validação dos radares (smoke test manual, visual)

| Tela | Resultado |
|---|---|
| `/dashboard/overview` | KPIs, Panorama Analítico (4 gráficos), tudo renderizando com dados reais e idênticos ao comportamento anterior |
| `/dashboard/instagram` | 200 posts monitorados, 1000 comentários, engajamento e alertas idênticos |
| `/dashboard/x` | Prioridades do radar, status de crise, divergências — idêntico |
| `/dashboard/noticias` | Volume de menções, termômetro, status em tempo real — idêntico (não alterado nesta sprint) |
| Login → logout → login | Funcionando, rápido (~8s até a Visão Geral completa) |
| Navegação superior | Trocar entre telas via menu funciona normalmente |

## Pendências / propostas não executadas

1. **Redução de payload via seleção de colunas** (`select('*')` → colunas explícitas) em
   `instagram.ts`/`x.ts`: não executado. Precisaria mapear todo consumidor de cada campo (inclusive
   os já usados no Radar Instagram/X, fora do escopo mapeado nesta sprint) antes de remover qualquer
   coluna. Proposta para tarefa futura dedicada, com testes de equivalência de payload.
2. **`targets` buscado 2x por requisição** (uma vez dentro de `fetchInstagramData`, outra dentro de
   `fetchXData` — mesma tabela pequena, mesma query). Poderia ser unificado num único fetch
   compartilhado, mas isso alteraria a estrutura interna de duas funções hoje independentes uma da
   outra — fora do escopo "só parede A/B dentro de cada função" desta sprint. Ganho estimado:
   pequeno (tabela `targets` já responde em ~20-45ms nas medições).
3. **Índices, RPC, views ou materialização no Supabase**: nenhum criado ou proposto — não há
   evidência de que o banco em si seja o gargalo (todas as consultas, mesmo as mais lentas em
   conexão fria, respondem em segundos, não minutos, uma vez que a conexão está estabelecida).

## Confirmação de preservação da UX

Nenhum arquivo em `app/dashboard/overview/page.tsx` ou em `components/dashboard/overview/*.tsx` foi
tocado nesta sprint. Apenas `lib/queries/instagram.ts`, `lib/queries/x.ts`,
`lib/queries/overview.ts`, `lib/queries/overview.test.ts` e `lib/perf/timing.ts`. Layout, ordem dos
cards, estilos, textos e navegação aprovados permanecem exatamente como estavam.

---

# Sprint 3 — Performance Core (plataforma compartilhada)

A partir desta sprint o foco deixou de ser a Visão Geral especificamente — o objetivo é a camada de
dados compartilhada entre Overview, Radar Instagram e Radar X. Mesma branch
(`feature/overview-executive-ux-refinement`), mesmo worktree, nenhum commit/push/merge/deploy.
Nenhum contrato público alterado, nenhuma regra de negócio, nenhum dado reduzido, nenhum `.limit()`
novo, nenhum mock.

## Achado principal — duplicação nas PÁGINAS Instagram e X (não dentro das funções)

Diferente do Overview (que já usa `React.cache()` para dedup — Sprints 1-2),
`fetchInstagramData`/`fetchXData` **não têm cache entre chamadas** (removido de propósito, ver nota
histórica no topo de `lib/queries/instagram.ts`: um bug de segurança real fazia
`getInstagramFiltersOptions` vazar dados sem restrição quando o cache reaproveitava uma chamada
feita sem `allowedTargetIds`). Isso significa que **cada chamada às funções exportadas
(`getInstagramKPIs`, `getInstagramChartData`, `fetchInstagramData`, `getInstagramAlerts`) dispara uma
busca completa nova, do zero** — não há dedução automática por período de requisição.

Inspecionando as próprias páginas (`app/dashboard/instagram/page.tsx`, `app/dashboard/x/page.tsx`),
encontrei exatamente esse padrão:

```ts
// ANTES — app/dashboard/instagram/page.tsx
const [kpis, charts, data, options] = await Promise.all([
  getInstagramKPIs(filters),        // → fetchInstagramData(filters) #1
  getInstagramChartData(filters),   // → fetchInstagramData(filters) #2  (MESMO filters)
  fetchInstagramData(filters),      //   fetchInstagramData(filters) #3  (MESMO filters)
  getInstagramFiltersOptions(allowedTargetIds), // → fetchInstagramData({allowedTargetIds}) — escopo DIFERENTE, ver nota abaixo
]);
```

```ts
// ANTES — app/dashboard/x/page.tsx
const [kpis, charts, data, alert, options] = await Promise.all([
  getXKPIs(filters),        // → fetchXData(filters) #1
  getXChartData(filters),   // → fetchXData(filters) #2  (MESMO filters)
  fetchXData(filters),      //   fetchXData(filters) #3  (MESMO filters)
  getXAlert(filters),       // → fetchXData(filters) #4  (MESMO filters)
  getXFiltersOptions(allowedTargetIds), // escopo DIFERENTE, ver nota abaixo
]);
```

**3 chamadas idênticas** (mesmo `filters`, mesmo resultado) na página Instagram, **4 chamadas
idênticas** na página X — todas rodando em paralelo entre si (então não competiam sequencialmente),
mas cada uma abrindo sua própria cascata de consultas ao Supabase (targets+posts+comentários+IA /
targets+posts+IA+replies), multiplicando a carga real no banco por 3x/4x sem nenhum ganho.

**Nota sobre `getInstagramFiltersOptions`/`getXFiltersOptions`**: essas chamam
`fetchInstagramData`/`fetchXData` com um filtro DIFERENTE — só `{ allowedTargetIds }`, sem
período/candidato/sentimento — de propósito: as opções do dropdown de filtro devem mostrar todos os
tópicos/candidatos que o usuário PODE escolher, não apenas os que estão dentro do recorte
atualmente selecionado. Por isso essa chamada é uma consulta genuinamente diferente e foi mantida
separada — consolidá-la mudaria o comportamento funcional das opções de filtro.

## Correção aplicada — buscar uma vez, derivar o resto localmente

Segui o mesmo padrão já usado em `lib/queries/overview.ts` (que deriva KPIs/gráficos a partir de UM
`fetchOverviewData` cacheado), mas sem reintroduzir cache — a duplicação aqui é eliminada na
ORIGEM da chamada (a página), não dentro da função:

1. Extraí o núcleo de cálculo de cada função em uma variante pura e exportada, que recebe os dados
   já buscados em vez de buscar de novo: `computeInstagramKPIs(posts, comments)`,
   `computeInstagramChartData(posts, comments)`, `computeXKPIs(posts, replies)`,
   `computeXChartData(posts, replies)`, `computeXAlert(posts)`.
2. `getInstagramKPIs`, `getInstagramChartData`, `getXKPIs`, `getXChartData`, `getXAlert` **continuam
   existindo com a MESMA assinatura e o MESMO comportamento** — agora são wrappers finos que chamam
   `fetchInstagramData`/`fetchXData` uma vez e repassam para a função pura. Qualquer código que já
   os chamava continua funcionando de forma idêntica. **Contrato público 100% preservado.**
3. As páginas passaram a buscar os dados **uma única vez** e derivar KPIs/gráficos/alerta localmente:

```ts
// DEPOIS — app/dashboard/instagram/page.tsx
const [data, options] = await Promise.all([
  fetchInstagramData(filters),                     // 1 busca (era 3)
  getInstagramFiltersOptions(allowedTargetIds),     // mantida separada (escopo diferente)
]);
const kpis = computeInstagramKPIs(data.posts, data.comments);     // síncrono, sem I/O
const charts = computeInstagramChartData(data.posts, data.comments); // síncrono, sem I/O
```

```ts
// DEPOIS — app/dashboard/x/page.tsx
const [data, options] = await Promise.all([
  fetchXData(filters),                    // 1 busca (era 4)
  getXFiltersOptions(allowedTargetIds),   // mantida separada (escopo diferente)
]);
const kpis = computeXKPIs(data.posts, data.replies);
const charts = computeXChartData(data.posts, data.replies);
const alert = computeXAlert(data.posts);
```

## Diagrama completo do fluxo de consultas (Sprint 3)

```
/dashboard/instagram (page.tsx)
├── fetchInstagramData(filters)                    [1x — antes eram 3x]
│     FASE A (paralelo): targets (10 linhas) + posts (social_posts, limit 200)
│     FASE B (paralelo, depende dos IDs de posts): comments (limit 1000) + ai_analysis
└── getInstagramFiltersOptions(allowedTargetIds)   [escopo diferente — mantido separado]
      └── fetchInstagramData({ allowedTargetIds }) — mesma estrutura Fase A/B, filtro mais amplo

/dashboard/x (page.tsx)
├── fetchXData(filters)                            [1x — antes eram 4x]
│     FASE A (paralelo): targets (10 linhas) + posts (social_posts, limit 300)
│     FASE B (paralelo, depende dos IDs de posts): ai_analysis + replies (limit 1000)
└── getXFiltersOptions(allowedTargetIds)            [escopo diferente — mantido separado]
      └── fetchXData({ allowedTargetIds }) — mesma estrutura Fase A/B, filtro mais amplo

/dashboard/overview (page.tsx) — via fetchOverviewData, cacheado com React.cache()
├── fetchMencoes(filters)                           [1x — dedup de Sprints 1-2]
├── fetchInstagramData(filters)                     [1x dentro do fetchOverviewData cacheado]
└── fetchXData(filters)                             [1x dentro do fetchOverviewData cacheado]
```

**Sobre "targets compartilhado entre módulos"**: `targets` (tabela pequena, 10 linhas, sem filtro)
é buscada de forma idêntica dentro de `fetchInstagramData` E `fetchXData` — e cada página
(Instagram, X, Overview) é uma requisição HTTP separada, então não há como compartilhar essa busca
ENTRE páginas sem introduzir algum tipo de cache entre requisições (`unstable_cache`, cache HTTP, ou
similar). Avaliei isso e decidi **não implementar nesta sprint**: é exatamente o tipo de mecanismo
que causou o bug de segurança documentado (vazamento de dados sem `allowedTargetIds` via reuso de
cache). Dado que a tabela já responde em 30-90ms na maioria das medições (só fica lenta em conexão
fria, junto com todo o resto), o ganho não justifica reabrir esse risco sem uma revisão de segurança
dedicada. Fica como proposta documentada, não implementada — ver "Próximas oportunidades".

## Medições reais (via `[PERF]`, período = Todo período, sem candidato, conexão já aquecida)

### Página Instagram

| Consulta | Execução 1 (main fetch) | Execução 2 (getInstagramFiltersOptions) |
|---|---:|---:|
| targets | 631ms | 33ms |
| posts (200 linhas) | 3970ms | 2988ms |
| ai_analysis (133 linhas) | 874ms | 876ms |
| comments (1000 linhas) | **4781ms** | 4781ms |

As duas execuções têm durações quase idênticas por etapa — confirma que rodam em paralelo entre si
(via `Promise.all` na página) e que cada uma internamente também está paralelizada (Fase A/B da
Sprint 2). `comments` (1000 linhas, `select('*')`) continua sendo a etapa mais lenta — candidato
natural para redução de payload numa sprint futura.

### Página X

| Consulta | Execução 1 (main fetch) | Execução 2 (getXFiltersOptions) |
|---|---:|---:|
| targets | 624ms | 94ms |
| posts (300 linhas) | 2135ms | 1606ms |
| ai_analysis (300 linhas) | 1481ms | 1485ms |
| replies (137 linhas) | 1693ms | 1693ms |

## Relatório Before × After

| Métrica | Antes (Sprint 3) | Depois (Sprint 3) | Ganho |
|---|---:|---:|---:|
| Execuções de `fetchInstagramData` por carregamento da página Instagram | 4 (3 idênticas + 1 de escopo diferente) | 2 (1 + 1 de escopo diferente) | **-50% de execuções redundantes eliminadas** |
| Execuções de `fetchXData` por carregamento da página X | 5 (4 idênticas + 1 de escopo diferente) | 2 (1 + 1 de escopo diferente) | **-75% de execuções redundantes eliminadas** |
| Tempo total página Instagram (soma Fase A + Fase B da execução principal) | ~4.6s (medição pós-Sprint2, isolada) → competia com +2 execuções extras rodando ao mesmo tempo | ~8.7s com a concorrência reduzida a 2 execuções (era 4) | Menos contenção no pool de conexões; próxima redução real depende de payload (ver pendências) |
| Tempo total página X | ~3.8s isolada | 2 execuções concorrentes (era 5) | Mesma lógica — menos contenção |
| Testes | 170 (Sprints 1-2) | **182** (+12 novos: `resolveAllPeriodFilters`, `computeInstagramKPIs/ChartData`, `computeXKPIs/ChartData/Alert`) | 182/182 passando |

Nota honesta sobre os números de tempo: como as 3-4 execuções redundantes já rodavam em **paralelo**
entre si (não sequenciais), o tempo de PAROLADA (wall clock) da página não era 3-4x maior antes —
era limitado pela mais lenta das execuções concorrentes. O ganho real e mensurável desta sprint é a
**redução do número de consultas reais disparadas contra o Supabase** (de 3-4 execuções idênticas
para 1, por página), que reduz carga no banco/pool de conexões — importante para escala (mais
usuários simultâneos, mais chance de contenção), mesmo quando o tempo de parede de UM usuário
isolado não muda tanto quanto nas Sprints 1-2.

## Testes

`lib/queries/instagram.test.ts` (novo, 6 testes) e `lib/queries/x.test.ts` (novo, 6 testes) —
cobrem `computeInstagramKPIs`, `computeInstagramChartData`, `computeXKPIs`, `computeXChartData`,
`computeXAlert` com fixtures sintéticas (contagens, classificação de sentimento/risco, ordenação por
engajamento, casos vazios). Não usam mocks do Supabase — são funções puras, testadas diretamente.

**182/182 testes passando.** `npx tsc --noEmit` limpo. `npm run build` — sucesso, 15 rotas.

## Próximas oportunidades de otimização (não implementadas)

1. **Reduzir payload de `instagram.comments`** (1000 linhas, `select('*')`, consistentemente a etapa
   mais lenta — 4.7-8.3s nas medições) trocando por colunas explícitas. Requer mapear todo consumidor
   do objeto de comentário antes de remover qualquer coluna.
2. **Cache cross-request de `targets`** (compartilhado entre Overview/Instagram/X) — tecnicamente
   viável (tabela pequena, sem filtro por usuário), mas replica o padrão exato do bug de segurança já
   documentado neste projeto. Não implementar sem uma revisão de segurança dedicada, com testes
   específicos de vazamento entre usuários/permissões.
3. **Reavaliar se `getInstagramFiltersOptions`/`getXFiltersOptions` precisam buscar POSTS inteiros**
   só para extrair a lista de tópicos/posts do dropdown — hoje repetem toda a Fase A/B só para ler
   `topics`/`id`/`text`. Uma consulta dedicada, mais enxuta, poderia servir só isso — mas também
   toca contratos públicos (mudaria o que `getInstagramFiltersOptions` busca internamente) e precisa
   de validação cuidadosa de equivalência.
4. Mesma pendência já registrada nas Sprints 1-2: índices/RPC/views no Supabase — nenhuma evidência
   de que sejam necessários; não propostos.

## Confirmação de preservação (Sprint 3)

- Nenhum contrato público alterado: `fetchInstagramData`, `fetchXData`, `getInstagramKPIs`,
  `getInstagramChartData`, `getXKPIs`, `getXChartData`, `getXAlert`, `getInstagramFiltersOptions`,
  `getXFiltersOptions` — todas com a MESMA assinatura e MESMO retorno de antes.
- Nenhum dado reduzido, nenhum `.limit()` novo, nenhuma regra de negócio alterada.
- Nenhum arquivo de UX/layout tocado (`app/dashboard/overview/`, `components/dashboard/overview/*`
  seguem intocados, confirmado por `git diff --stat` vazio nesses caminhos).
- Visualmente confirmado no localhost: `/dashboard/overview`, `/dashboard/instagram`,
  `/dashboard/x` renderizando os mesmos números de sempre (Score 76, Temperatura Morna, 1.500
  volume total etc.) após o build de produção.
