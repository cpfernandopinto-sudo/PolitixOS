# Validação Visual — Sprint 4

## Causa raiz de as Fases 1–3 não terem sido percebidas

**Confirmado por evidência real (Git + GitHub Deployments API), não por suposição:**

```
$ git rev-list --left-right --count main...HEAD
0	3
```

A branch principal (`main` = `origin/main`, HEAD em `9bc5f36 "fix investigation payload fallbacks"`) está **0 commits à frente e 3 atrás** da branch de trabalho `claude/politixos-audit-enhancement-f4d793` (Fases 1, 2 e 3 = commits `831e89d`, `11fa5c8`, `89e08b3`). A branch de feature nunca foi mergeada.

Consultando a API de Deployments do GitHub (populada pela integração Vercel):

| Commit | Ambiente Vercel | Estado |
|---|---|---|
| `9bc5f36` (tip de `main`) | **Production** | success — último deploy de produção |
| `831e89d` (Fase 1) | Preview | success |
| `11fa5c8` (Fase 2) | Preview | success |
| `89e08b3` (Fase 3) | Preview | success |

**Nenhum commit das Fases 1–3 gerou deploy de Produção.** Cada push na branch de feature gerou apenas uma Preview Deployment (comportamento padrão da integração Vercel↔GitHub para branches que não são a branch de produção). Se o responsável pelo produto abriu a URL de produção (o domínio principal), ele nunca poderia ter visto essas mudanças — elas só existiam em URLs de preview efêmeras, que além disso estão protegidas por autenticação da própria Vercel (confirmado ao tentar abrir a preview URL: redirecionamento para login da Vercel).

## Ambiente testado

- **Branch**: `claude/politixos-audit-enhancement-f4d793`
- **Commit no momento da validação**: `89e08b3` (+ correções aplicadas nesta sessão, commitadas em seguida)
- **URL**: `http://localhost:52749` (servidor de desenvolvimento local, `npm run dev`, porta atribuída automaticamente)
- **Autenticação**: sessão sintética via `app/api/dev-login` (rota exclusiva de desenvolvimento — ver detalhes de segurança no cabeçalho do arquivo). Dados exibidos são **reais**, vindos do Supabase de produção configurado em `.env.local` — apenas a sessão é sintética, nenhum dado foi simulado.
- **Ferramenta de captura**: Playwright (Chromium), instalado nesta sessão para permitir screenshots reais persistidos em disco.

## Componentes verificados

| Componente | Verificação | Resultado | Screenshot |
|---|---|---|---|
| Cabeçalho (título, subtítulo, período, filtros, última atualização) | Renderização + inspeção de texto | ✅ OK (subtítulo "Centro Executivo..." estava ausente — corrigido nesta sessão) | `overview-desktop-top.png` |
| ExecutiveScenarioSummary | Renderização com dados reais (Flávio Bolsonaro, tema "política" etc.) | ✅ OK | `overview-desktop-top.png` |
| PoliticalStatusCard | Score, classificação, fatores, gauge ECharts | ✅ OK | `overview-desktop-top.png` |
| Drawer "Entenda o cálculo" | Clique abre drawer com regra/thresholds/fatores | ✅ OK | `political-status-drawer.png` |
| RiskOpportunityBoard | Riscos reais (CRÍTICO, com "Ver detalhes"); oportunidades com estado vazio honesto | ✅ OK | `overview-desktop-full.png` |
| KeyChanges | Cards com valor atual/anterior/variação | ✅ OK (bug de rótulo "pontos percentuais" incorreto para variação de volume — corrigido) | `overview-desktop-full.png` |
| AttentionEntitiesThemes | Entidades reais com "Filtrar", temas reais | ✅ OK | `overview-desktop-full.png` |
| Timeline — modo cronológico | Lista ordenada, filtro por canal | ✅ OK | `overview-desktop-full.png` |
| Timeline — modo agrupado | Alternância funcional, agrupamento real por tema | ✅ OK | `timeline-grouped.png` |
| Análises Complementares — recolhida | Estado inicial fechado | ✅ OK | `analyses-collapsed.png` |
| Análises Complementares — expandida | KPIs, Termômetro original, Alertas originais | ✅ OK | `analyses-expanded.png` |
| Tabela Executiva (posição secundária) | Ao final da página, com links reais | ✅ OK (bug "SEM LINK" em 100% das linhas — corrigido) | `overview-desktop-full.png` |
| Leitura Analítica Assistida — estado inicial | Botão "Gerar leitura analítica", nenhuma chamada automática | ✅ OK | incluído no fluxo abaixo |
| Leitura Analítica Assistida — sem provedor configurado | Estado "indisponível", mensagem clara, resto da tela funcional | ✅ OK | `assisted-insight-unavailable.png` |
| Responsividade — desktop (1600px) | Grid completo, sem scroll horizontal | ✅ OK | `overview-desktop-top.png`, `overview-desktop-full.png` |
| Responsividade — notebook (1280px) | Layout adapta sem quebrar | ✅ OK | `overview-notebook.png` |
| Responsividade — mobile (390px) | Coluna única, sem scroll horizontal | ✅ OK | `overview-mobile.png` |

## Correções aplicadas nesta sessão (Parte 3/4)

| # | Problema encontrado | Evidência | Correção |
|---|---|---|---|
| 1 | Subtítulo "Centro Executivo de Inteligência Política" ausente no cabeçalho visual (só existia no `<meta description>`) | Comparação com o pedido original do Sprint 3 + screenshot | Adicionado `<p>` dedicado em `OverviewHeader.tsx` |
| 2 | "Mudança Relevante" rotulava qualquer variação como "pontos percentuais", incorreto para a métrica de volume (que é variação percentual, não diferença em pp) | Screenshot mostrando "aumentou 800 pontos percentuais" para uma variação de volume | `composeExecutiveSynthesis` não fixa mais a unidade no texto — o valor exato (com unidade correta) fica na justificativa |
| 3 | Tabela Executiva sempre mostrava "SEM LINK" em 100% das linhas | Screenshot da tabela + leitura de `getExecutiveTable` (não populava `url`) | `getExecutiveTable` agora repassa `n.url`/`p.url` de notícias/posts |
| 4 | `fetchInstagramData`/`fetchXData` disparando repetidamente para os mesmos filtros dentro da mesma requisição (visível no console: múltiplas linhas `[fetchInstagramData] filters: {...}` idênticas) | Console do navegador durante a primeira validação | `getExecutiveOverviewData` e `getTrendOverview` agora compartilham a MESMA consulta de "período completo" via `getAllPeriodOverviewData` (cache()-deduplicada) |

## Tabela de hipóteses (Parte 3 do pedido)

| Hipótese | Verificação | Resultado | Correção |
|---|---|---|---|
| Branch de feature não mergeada | `git rev-list --left-right --count main...HEAD` | **Confirmado** — 0 à frente / 3 atrás | Preparar/atualizar PR (ver seção Git abaixo); merge não executado sem autorização |
| Deploy vinculado à branch errada | GitHub Deployments API | Não é bem "errada" — o deploy de Produção segue `main` corretamente; o problema é que `main` nunca recebeu os commits | — |
| Deploy antigo / build cache da Vercel | Deployments API mostra `state: success` para o commit atual de `main`, sem sinais de falha de cache | Não aplicável — o deploy de produção está atualizado EM RELAÇÃO ao que `main` contém | — |
| URL apontando para projeto diferente | Mesma URL de produção (`politix-h4z38rm5y-...vercel.app`) associada ao mesmo repositório no GitHub Deployments | Não é o caso | — |
| Componente criado mas não importado em `page.tsx` | Inspeção de `app/dashboard/overview/page.tsx` + renderização real | Todos os componentes do Sprint 3 estão importados e renderizados | — |
| Componente dentro de condição nunca satisfeita | Inspeção de código + screenshot mostrando todos os blocos visíveis | Não encontrado | — |
| Permissões bloqueando dados | Sessão de teste é `role: admin` (sem restrição); dados reais aparecem normalmente | Não é o caso para admin; não testado para outros papéis nesta sessão | Registrado como pendência |
| Todos os campos retornando sem dados | Screenshot mostra dados reais (Flávio Bolsonaro, 446 menções, etc.) | Não é o caso — há volume real no banco | — |
| Skeleton permanecendo por erro silencioso | Nenhum skeleton preso observado; console sem erros | Não encontrado | — |
| Seção iniciando recolhida | "Análises Complementares" inicia recolhida **por design** (Sprint 3), não por erro | Comportamento esperado, documentado | — |
| CSS tornando conteúdo invisível / contraste insuficiente | Inspeção visual de todos os screenshots | Não encontrado | — |
| Cabeçalho ainda apontando para componente antigo | Inspeção de `page.tsx` | `OverviewHeader` é o único cabeçalho, já atualizado | Subtítulo corrigido (ver item 1 da tabela de correções) |
| Middleware redirecionando para rota diferente | Teste manual: usuário autenticado em `/` → `/dashboard/overview` | Correto (corrigido na Fase 1) | — |
| Filtros padrão produzindo conjunto vazio | Filtro padrão é "Todos os Candidatos" / "Todo período" — maior conjunto possível | Não é o caso | — |
| Hydration error | Console do navegador limpo em todas as capturas | Não encontrado | — |
| Erro de Server Component | Nenhum erro de servidor nos logs do `next dev` durante a validação | Não encontrado | — |
| Cache de navegador / service worker | Projeto não registra service worker; testado em contexto de navegador limpo (Playwright) | Não é o caso | — |
| Variável de ambiente diferente entre local e produção | Não verificável sem acesso ao painel Vercel (fora do escopo desta sessão) — mas irrelevante para a causa raiz confirmada (branch não mergeada) | Não aplicável à causa raiz | Registrado como algo a confirmar no painel Vercel antes do merge |

## Comparativo

**ANTES** (o que o responsável pelo produto via em produção, commit `9bc5f36`):
- Visão Geral com 9 blocos "soltos" sem síntese executiva, sem estado político explicado, sem central de riscos/oportunidades, sem leitura assistida — a Visão Geral das Fases 1–3 nunca existiu no ambiente que ele acessava.

**DEPOIS** (branch `claude/politixos-audit-enhancement-f4d793`, ainda não em produção):
- Cabeçalho com "Centro Executivo de Inteligência Política".
- Síntese executiva + Estado Político lado a lado.
- Leitura Analítica Assistida (Sprint 4) sob demanda.
- Riscos e Oportunidades Prioritários lado a lado com linguagens visuais distintas.
- Mudanças Mais Relevantes com comparação real.
- Entidades e Temas em Atenção com ação de filtrar.
- Timeline cronológica **e** agrupada por tema.
- Análises Complementares recolhidas por padrão (KPIs, Termômetro original, Alertas originais preservados).
- Tabela Executiva em posição secundária, agora com links reais.

## Pendências

- Validação com um usuário de papel `gestor`/`visualizador` (permissões restritas) não foi feita nesta sessão — a sessão de teste usada é sempre `admin`.
- Não foi possível confirmar se as variáveis de ambiente da Vercel (produção) estão sincronizadas com `.env.local` — requer acesso ao painel Vercel, fora do alcance desta sessão (a integração Vercel MCP disponível não está associada a nenhum time/projeto).
