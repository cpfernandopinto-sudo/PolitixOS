# Relatório Final — Reestruturação Executiva da Visão Geral (UX)

**Branch:** `feature/overview-executive-ux-refinement`
**Base:** `origin/main` @ `0566c0c` (inclui a Sprint de Performance Core, PR #5, já mesclada em produção)
**Commit:** `931d7dd589b5e717de7794eb3aecafffe85a2833`
**PR:** [#6](https://github.com/cpfernandopinto-sudo/PolitixOS/pull/6)
**Preview (Vercel):** https://politix-os-git-feature-ov-e20620-cpfernandopinto-4810s-projects.vercel.app (protegido por SSO da Vercel — validação manual necessária)

## 1. Objetivo da entrega

Transformar a Visão Geral do PolitixOS em um painel executivo compacto, hierárquico e orientado a decisão — sem alterar dados, cálculos, queries, regras de negócio, autenticação, cache ou performance. Todo o trabalho descrito aqui é estritamente de UX/UI: reorganização visual, densidade, hierarquia tipográfica, consistência de superfícies e correção de um bug de acessibilidade (stacking do Drawer).

## 2. Estado inicial

A Visão Geral já existia em produção com o Radar de Notícias/Instagram/X e a Sprint de Performance Core (eliminação de consultas redundantes). A tela, porém, ainda tinha:

- blocos duplicados ("Riscos Prioritários" e "Alertas Prioritários" liam os mesmos dados);
- um painel de IA permanente e vazio na maior parte do tempo;
- inconsistências visuais entre componentes construídos em fases diferentes (cores, radius, tipografia);
- uma Tabela Executiva solta ao final da página, sem contenção de scroll;
- um bug de stacking que escondia o cabeçalho do Drawer atrás da barra superior.

## 3. Resumo das Etapas 1 a 7

| Etapa | Entrega |
|---|---|
| **Cabeçalho e KPIs** (pré-Etapa 1) | Cabeçalho reorganizado em duas zonas (identidade + filtros) numa única fileira; 5 cards de KPI compactos. |
| **1 — Entidades em Atenção** | Substituído o painel duplo (Entidades + Temas, que duplicava Temas Dominantes) por uma faixa compacta de chips clicáveis. |
| **2 — Síntese e Leitura Executiva** | Nova linha lado a lado (~42/58): Síntese do Cenário (grid 2×2 determinístico) + Leitura Executiva (narrativa A-B-C-D). |
| **3 — Termômetro e Estado Político** | Os dois cards viraram um painel de diagnóstico único (mesmo padding/borda/raio); gauge com ponteiro; Estado Político dividido em duas zonas internas (status + fatores). |
| **4 — Centro de Alertas Prioritários** | Consolidação de "Riscos Prioritários" e "Alertas Prioritários" (confirmado em código: liam os mesmos `risks`) num único componente, com deep link interno para o Radar de origem como ação primária. |
| **5 — Relatório Executivo com IA** | O bloco de IA, antes permanente, virou um CTA compacto que abre o resultado em Drawer, gerado sob demanda. |
| **6 — Análises Complementares** | Accordion com ícone + título + descrição curta quando fechado; Tabela Executiva passou a viver dentro dele; densidade da tabela revisada; scroll contido com fade nas bordas. |
| **7 — Refinamento visual final** | Padronização de superfícies (`surface-primary` em ~13 componentes que usavam hex hardcoded), tipografia de títulos de card unificada, ícones com `aria-hidden`, e correção do bug de stacking do Drawer (ver seção 9). |

## 4. Lista final de componentes alterados

**Novos:**
- `components/dashboard/overview/AttentionEntitiesStrip.tsx` (+ `.test.tsx`)
- `components/dashboard/overview/PriorityAlertsCenter.tsx` (+ `.test.tsx`)

**Renomeado:**
- `RiskOpportunityBoard.tsx` → `OpportunityBoard.tsx` (simplificado: só Oportunidades, já que Riscos foi consolidado no Centro de Alertas)

**Removidos** (substituídos pelos componentes acima):
- `AttentionEntitiesThemes.tsx` (+ `.test.tsx`)
- `OverviewAlerts.tsx` (+ `.test.tsx`)

**Modificados:**
- `app/dashboard/overview/page.tsx` — ordem/composição das seções (Etapas 2, 4, 6)
- `components/dashboard/overview/OverviewHeader.tsx` — cabeçalho em duas zonas
- `components/dashboard/overview/OverviewKPI.tsx` — superfície padronizada
- `components/dashboard/overview/ExecutiveScenarioSummary.tsx` — modo `compact` (grid 2×2)
- `components/dashboard/overview/ExecutiveNarrative.tsx` — título + acento visual
- `components/dashboard/overview/OverviewGauge.tsx` — ponteiro, superfície padronizada
- `components/dashboard/overview/PoliticalStatusCard.tsx` — duas zonas internas, superfície padronizada
- `components/dashboard/overview/AssistedInsight.tsx` — CTA + Drawer (Etapa 5) e correção de foco (`aria-disabled`, Etapa 7)
- `components/dashboard/overview/OverviewChannels.tsx`, `OverviewTopics.tsx`, `OverviewSentiment.tsx`, `OverviewRisk.tsx`, `OverviewStrategicMap.tsx`, `KeyChanges.tsx` — superfície e tipografia padronizadas (Etapa 7)
- `components/dashboard/overview/OverviewExecutiveTable.tsx` — densidade, cabeçalho, scroll contido com fade (Etapa 6)
- `components/ui/CollapsibleSection.tsx` — ícone, animação de altura, densidade (Etapa 6)
- `components/ui/Drawer.tsx` — `createPortal` (Etapa 7, ver seção 9)

## 5. Principais decisões de UX

- **Consolidação em vez de duplicação**: sempre que dois blocos liam a mesma fonte de dados (Riscos/Alertas; Temas/Entidades), um foi removido em favor do outro, nunca os dois mantidos "por segurança".
- **Ação sob demanda em vez de painel permanente**: a IA só ocupa espaço quando o usuário pede.
- **Poucos níveis de superfície**: `surface-hero` (Leitura Executiva), `surface-primary` (cards de conteúdo), `surface-muted` (accordion, CTA de IA) — em vez de hex duplicado por componente.
- **Deep link interno como ação primária**: alertas levam ao módulo Radar de origem (usando parâmetros reais já suportados — `candidate_name` em Notícias, `target_id` em Instagram/X) antes da fonte externa, nunca inventando um ID.

## 6. Correções funcionais incidentais

1. **Bug de stacking do Drawer** (encontrado na Etapa 5, corrigido na Etapa 7): `.dashboard-main > *` em `app/globals.css` usa `animation-fill-mode: both`, criando um stacking context implícito permanente no wrapper raiz da página. Como o `Drawer` renderizava dentro dessa árvore, seu `z-index: 150` nunca era comparado com o `z-index: 40` da barra superior (sticky), e a barra sempre pintava por cima. Corrigido com `createPortal(..., document.body)` — sem tocar na animação global (compartilhada com outras páginas).
2. **Bug de retorno de foco** (encontrado durante a validação do fix acima): o CTA "Gerar Relatório Executivo" usava `disabled={isPending}`; o navegador tira o foco automaticamente de um botão que vira `disabled`, antes do Drawer conseguir capturá-lo como "elemento a devolver o foco". Trocado por `aria-disabled` (mesma aparência, mesma proteção contra duplo-clique, sem forçar perda de foco).

## 7. Confirmação de preservação de dados e regras

Comparação `git diff --stat` contra `origin/main` (`0566c0c`) confirma **zero alterações** em:
- `lib/queries/**`, `lib/perf/**`, `lib/actions/**`, `lib/auth/**`
- `lib/supabaseClient.ts`, `supabase_migration_*.sql`
- `proxy.ts` (middleware)
- `package.json` / `package-lock.json`
- qualquer arquivo de `app/dashboard/{noticias,instagram,x,...}` ou seus componentes

Todas as mudanças estão restritas a `app/dashboard/overview/page.tsx`, `components/dashboard/overview/*` e dois componentes de UI compartilhados (`CollapsibleSection`, `Drawer`) usados apenas pela Visão Geral neste momento.

## 8. Matriz de responsividade

Validado nos 6 breakpoints solicitados, sem scroll horizontal (`scrollWidth === clientWidth` confirmado via Playwright) e visualmente (screenshots completos enviados na Etapa 7, reconfirmado nesta etapa final sem mudança de código desde então):

| Breakpoint | Scroll horizontal | Observações |
|---|---|---|
| 1600px | Não | Grid 2 colunas no Centro de Alertas, 4 colunas no Panorama Analítico |
| 1440px | Não | Idem |
| 1280px | Não | Idem |
| 1024px | Não | Diagnóstico (Termômetro/Estado Político) em 50/50 |
| 768px | Não | Panorama Analítico em 2×2, cards empilham |
| 390px | Não | Tudo empilhado, Drawer quase tela cheia, tabela com scroll interno próprio |

## 9. Testes executados (rodada final desta etapa)

- `npx tsc --noEmit` — **limpo**, ~4.3s.
- `npx vitest run` — **189/189 testes, 21 arquivos**, ~3.9s (execução) / ~5.1s (total com setup).
- `npm run build` — **sucesso**, ~11.2s, **15 rotas** geradas (`/`, `/_not-found`, `/api/investigations/start`, `/dashboard`, `/dashboard/automacoes`, `/dashboard/candidatos`, `/dashboard/instagram`, `/dashboard/investigacoes`, `/dashboard/investigacoes/[id]`, `/dashboard/noticias`, `/dashboard/overview`, `/dashboard/sem-permissao`, `/dashboard/usuarios`, `/dashboard/x`, `/login`), **zero warnings, zero erros**.
- Validação funcional manual (via Playwright, dados reais, usuário admin): login, redirecionamento, filtro de candidato, filtro de período, botão Atualizar, Entidades em Atenção + filtro por chip, ações da Leitura Executiva, Termômetro, Drawer "Entenda o cálculo" (abre/Esc), Centro de Alertas, Ver todos/Ver menos, deep link interno, link externo, Timeline, Drawer do Relatório Executivo (abre/Esc/clique fora), accordion (Oportunidades + Mapa de Ação dentro dele), busca da Tabela Executiva, logout, acesso a rota protegida sem sessão — **todos confirmados funcionando**.

## 10. Riscos conhecidos / observações não tratadas como regressão

- **Latência do backend nas queries do Instagram/X**: alterar o filtro de candidato/período pode levar de 7 a 15 segundos para refletir na URL e nos dados, e ocasionalmente aparece `canceling statement due to statement timeout` no console do servidor sob carga. Isso é uma característica **pré-existente** da camada de dados (Supabase), já documentada em `docs/AUDITORIA_PERFORMANCE_OVERVIEW.md` antes desta sprint de UX, e fora do escopo autorizado (não alterar performance/queries).
- **Geração do Relatório Executivo é lenta neste ambiente** (~50s) porque `ANTHROPIC_API_KEY` não está configurada localmente — a função corretamente cai no estado "indisponível" após esse tempo. Isso é comportamento esperado da função (não uma regressão) e depende apenas de configuração de ambiente, não de código.

## 11. Itens deliberadamente não alterados

Por instrução explícita do usuário, mantidos exatamente como estavam: `lib/queries/*`, `lib/perf/*`, `lib/actions/*`, autenticação, cache, performance, cálculos, KPIs (lógica), filtros (lógica), permissões, regras de negócio, destinos de links, `OverviewTimeline.tsx` (Timeline), comportamento funcional do Relatório Executivo, comportamento dos accordions/drawers, e todos os componentes dos demais módulos (Radar de Notícias, Instagram, X).

## 12. Instruções rápidas de rollback

- **Antes do merge**: a branch `feature/overview-executive-ux-refinement` pode ser simplesmente descartada ou não mesclada — `main` permanece intacta.
- **Depois do merge em `main`**: reverter com `git revert -m 1 <hash-do-merge-commit>` (ou o hash do commit único, se squash) e novo deploy automático da Vercel a partir do revert.
- **Em produção após deploy**: a Vercel mantém deployments anteriores acessíveis — é possível promover o deployment de produção anterior a este PR diretamente pelo painel da Vercel ("Promote to Production") sem precisar de um revert de código, se uma reação imediata for necessária.

## 13. Branch, commit, PR e Preview

- **Branch:** `feature/overview-executive-ux-refinement`
- **Commit:** `931d7dd589b5e717de7794eb3aecafffe85a2833`
- **PR:** https://github.com/cpfernandopinto-sudo/PolitixOS/pull/6
- **Preview (Vercel):** https://politix-os-git-feature-ov-e20620-cpfernandopinto-4810s-projects.vercel.app — status **Ready**, protegido por SSO da Vercel (validação manual do usuário necessária)
