# Validação — Refinamento Visual da Visão Geral (Fase 1)

Branch: `release/radar-real-plus-overview`. Nenhum merge, push ou deploy feito. Nenhuma alteração em
dados, queries, gráficos, cálculos ou no Radar de Notícias.

## Problema

Os cards novos da Visão Geral (Sprints 4-6) foram construídos contra o tema antigo de `origin/main`
(`--color-background: #0D0D0D`, cards em `bg-[#1A1A1A]`/`border-white/5`, textos em `text-gray-*`).
Quando integrados sobre a base real da rescue — que já usa uma identidade azul-marinho
(`--surface-1/2/3`, `--brand`, `--line`, e o próprio `KpiCard.tsx`/`DataTable.tsx` com
`bg-[#0E1727]`/`border-blue-300/10`/`text-slate-*`) — os cards da Visão Geral destoavam, parecendo
caixas pretas/cinzas soltas dentro de uma plataforma azul-marinho.

## O que foi feito

### 1. Tokens de superfície (`app/globals.css`)

Os 3 utilitários acrescentados na integração anterior (`surface-hero`, `surface-primary`,
`surface-muted`) e o `text-label` foram redefinidos para usar as variáveis navy já existentes na
rescue, em vez dos hexadecimais cinza/preto originais:

| Utilitário | Antes | Depois |
|---|---|---|
| `surface-hero` | `background-color: #161B22; border: rgba(255,255,255,0.08)` | `background-color: var(--surface-3); border: var(--line-strong)` |
| `surface-primary` | `background-color: #1A1A1A; border: rgba(255,255,255,0.05)` | `background-color: var(--surface-2); border: var(--line)` |
| `surface-muted` | `background-color: rgba(255,255,255,0.03)` | `background-color: rgba(59,130,246,0.04)` (tint azul) |
| `text-label` | `color: #6B7280` | `color: var(--muted)` |

Nenhuma variável/classe da rescue foi alterada — apenas os valores destes 4 utilitários, que são
exclusivos da Visão Geral.

### 2. Cores hardcoded nos 17 componentes do Overview

Substituição mecânica (mesmo texto, mesma estrutura, só a cor) em
`app/dashboard/overview/page.tsx` e todos os `components/dashboard/overview/*.tsx`:

| Classe antiga | Classe nova |
|---|---|
| `bg-[#1A1A1A]` | `bg-[#0E1727]` |
| `bg-[#0D0D0D]` | `bg-[#070b14]` |
| `border-white/5` | `border-blue-300/10` |
| `border-white/10` | `border-blue-300/15` |
| `bg-white/5` | `bg-blue-500/5` |
| `bg-white/[0.02]` | `bg-blue-400/[0.03]` |
| `bg-white/[0.03]` | `bg-blue-400/[0.05]` |
| `bg-white/[0.04]` | `bg-blue-400/[0.06]` |
| `text-gray-200` a `text-gray-600` | `text-slate-200` a `text-slate-600` |
| `bg-gray-600` | `bg-slate-600` |

Cores semânticas (ciano, verde, amarelo, vermelho, roxo) **não foram tocadas**.

### 3. Compactação dos 5 KPIs (`OverviewKPI.tsx`)

| Métrica | Antes | Depois |
|---|---|---|
| Padding | `p-5` (20px todos os lados) | `px-4 py-3` (16px horizontal / 12px vertical) |
| Altura | Variável, ~130–140px (3 blocos com `mb-2`/`mb-1`) | Fixa em `84px` |
| Ícone | `size={20}`, canto superior direito | `size={16}`, canto superior direito |
| Rótulo | `text-xs` | `text-[10px]` |
| Valor | `text-3xl`/`text-2xl` | `text-2xl` uniforme |
| Descrição | `text-xs`, podia quebrar linha | `text-[10px]` + `truncate` (uma linha) |
| Superfície | `bg-[#1A1A1A] border-white/5` | `bg-[#0E1727] border-blue-300/10` (idêntico ao `KpiCard.tsx` `compact` já usado em produção) |

Conteúdo, valores, ícones, cores semânticas e `title` de acessibilidade preservados integralmente.

### 4. Panorama Analítico (4 gráficos)

Cores já corrigidas pela substituição mecânica (item 2). Ajustes adicionais de consistência:
`OverviewChannels.tsx` ganhou `h-full` no card externo (o `h-[300px]` interno do gráfico, que existe
para evitar a corrida de montagem do ECharts, não foi tocado) e `#analytics-grid` ganhou
`items-stretch`, igualando a altura dos 4 cards aos outros dois grids da página que já usavam essa
classe.

## Tabela comparativa

| Elemento | Antes (Fase anterior) | Referência produção | Depois (Fase 1) |
|---|---|---|---|
| Fundo dos 5 KPIs | `#1A1A1A` (cinza quase preto) | `#0E1727` (navy, `KpiCard.tsx` compact) | `#0E1727` ✅ |
| Borda dos 5 KPIs | `border-white/5` | `border-blue-300/10` | `border-blue-300/10` ✅ |
| Altura dos KPIs | ~130–140px | ~90px (`KpiCard.tsx` compact) | 84px ✅ |
| 4 gráficos (Panorama Analítico) | `#1A1A1A`, alturas por vezes distintas | `#0E1727`, mesma altura | `#0E1727`, `items-stretch` ✅ |
| Textos auxiliares | `text-gray-400/500/600` | `text-slate-400/500/600` (`DataTable.tsx`) | `text-slate-*` ✅ |
| Narrativa/Síntese/Termômetro/Estado Político/Riscos/Alertas/Entidades/Temas/Timeline/Leitura Assistida/Tabela | `#1A1A1A`/`bg-white/5`/`text-gray-*` | Mesma paleta navy do resto do app | Convertidos via a mesma substituição mecânica ✅ |
| Cores semânticas (ciano/verde/amarelo/vermelho/roxo) | — | — | Inalteradas ✅ |

## Validação

| Verificação | Resultado |
|---|---|
| Diff do Radar (`app/dashboard/noticias`, `components/news`, `lib/queries/noticias.ts`, `lib/types/noticias.ts`) vs. `origin/rescue/radar-production-20260727` | Vazio — confirmado depois do refinamento |
| `npx tsc --noEmit` | Limpo |
| `npx vitest run` | 164/164 passando (nenhum teste alterado — mudança é só visual) |
| `npm run build` | Compilado com sucesso, 15 rotas |
| Bug real encontrado e corrigido durante a validação | Um comentário CSS adicionado nesta fase continha a sequência `-*/-`, que fecha prematuramente um comentário `/* */`. O `next build` (parser de produção) tolerou, mas o `next dev` (Turbopack incremental) acusou erro de parse. Reescrito sem a sequência ambígua; confirmado limpo em dev e build |

## Screenshots

Em `docs/screenshots/overview-ux-refinement-phase-1/`:
- `before-1600.png` — estado anterior a este refinamento (reaproveitado da captura da integração anterior, mesma branch, antes desta sessão)
- `after-1600.png`, `after-1440.png`, `after-1280.png`, `after-1024.png`, `after-768.png`, `after-390.png` — breakpoints solicitados
- `kpi-comparison.png` — recorte dos 5 KPIs compactados
- `surface-comparison.png` — recorte dos 4 cards do Panorama Analítico

## Responsividade confirmada

- **1600/1440/1280**: 5 KPIs em uma linha, 4 gráficos em uma linha (grid `xl:grid-cols-4`).
- **1024/768**: grids adaptam via `md:grid-cols-2`; KPIs continuam legíveis, sem texto cortado.
- **390**: uma coluna, sem scroll horizontal, cards compactos (confirmado por screenshot full-page).

## Localhost

Servidor ativo em `http://127.0.0.1:3003` (branch `release/radar-real-plus-overview`). Nada foi
commitado ainda — aguardando aprovação visual antes do commit, conforme pedido.
