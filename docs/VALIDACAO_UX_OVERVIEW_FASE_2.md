# Validação — Refinamento Visual da Visão Geral (Fase 2)

Branch: `release/radar-real-plus-overview`. Nenhum commit, merge, push ou deploy feito. Nenhuma
alteração em dados, queries, cálculos, ordem de seções ou no Radar de Notícias.

## Descoberta que orientou a correção tipográfica

O problema de "títulos grandes e desproporcionais" **não estava nos componentes** — é uma regra
global em `app/globals.css` (herdada da rescue, compartilhada com Radar/Instagram/X/todos os
módulos):

```css
.dashboard-main h1 { font-size: clamp(1.65rem, 2.4vw, 2.25rem); }  /* 26.4px–36px */
.dashboard-main h2 { font-size: clamp(1.55rem, 2.1vw, 2rem); }     /* 24.8px–32px */
```

Como `.dashboard-main` envolve `<main>` no `layout.tsx` compartilhado, **qualquer** `<h1>`/`<h2>`
em qualquer módulo é forçado a esse tamanho por especificidade CSS, não importa a classe Tailwind
declarada no componente. Os títulos dos 4 gráficos e de "Estado Político"/"Termômetro de Crise
Master" já usavam `<h3>` (não afetada pela regra) e por isso já estavam corretos. Só 3 pontos
usavam `<h1>`/`<h2>`: "Visão Geral", "Panorama Analítico" e "Síntese do Cenário".

**Correção aplicada**: trocada a tag desses 3 títulos para `<p role="heading" aria-level={N}>`
(preserva a semântica de acessibilidade, mas escapa da regra `.dashboard-main h1/h2` sem tocar
nela — a regra continua intacta e em uso pelo Radar/demais módulos, que não foram alterados).

## Tabela comparativa

| Elemento | Problema anterior | Alteração | Resultado |
|---|---|---|---|
| **Distribuição por Canal** (radar) | `radius: '46%'`, centro `['50%','44%']`, container 300px — radar pequeno cercado de espaço vazio | `radius: '64%'` (+39%), centro `['50%','46%']`, container 320px, `axisName` 9px→11px, contraste da grade 0.05→0.18 opacidade, legenda mais próxima (`bottom: 2`, `itemGap` 12) | Radar ocupa a maior parte do card; grade e labels mais legíveis; mantidas as 3 séries (Notícias/Instagram/X) e as 3 dimensões reais (Sentimento/Risco/Vol.-Engaj.) — nenhuma dimensão fabricada reintroduzida |
| **Sentimento Consolidado** (donut) | Anel espesso (`radius: ['40%','70%']`, banda de 30pp), `borderRadius: 10` (pontas arredondadas, aparência lúdica), 4 mini-cards com borda/fundo parecendo botões | Anel fino (`radius: ['62%','78%']`, banda de 16pp), `borderRadius: 1`, diâmetro do gráfico maior (160px→192px), centro com % e classificação predominante, legenda compacta 2 colunas sem borda/fundo (`nome · valor · %` em uma linha) | Visual sóbrio/institucional; informação central imediata ("57% NEUTRO"); legenda lê como texto, não como botões |
| **Temas Dominantes** | Nome ao lado da barra (`w-32 truncate`), truncava nomes médios, mostrava todos os temas com scroll | Nome + valor na linha de cima, barra full-width na linha de baixo, apenas top 5, sem scroll, subtítulo "Top 5 pautas monitoradas" | Nomes não truncam mais (têm a largura toda do card), leitura mais clara, mesma altura dos outros 3 cards |
| **Distribuição de Risco** | `barWidth: '46%'`, margens `left:8/right:8/top:12` | `barWidth: '58%'`, margens `left:4/right:12/top:16`, cor dos labels de eixo de `#666` para `#94a3b8` (legibilidade sobre navy) | Barras mais largas, melhor aproveitamento da área, mesma escala/valores/cores de dados |
| **Altura dos 4 cards** | Já usavam `h-[300px]` internos, mas Temas Dominantes tinha padding/estrutura ligeiramente diferente | Uniformizados em 300–320px internos (Temas 300px para compensar o novo subtítulo; Sentimento/Risco/Canal 320px), `#analytics-grid` com `items-stretch` | 4 cards com altura visualmente uniforme, sem vazios grandes |
| **"Visão Geral" (h1)** | `text-3xl` (30px) forçado pela regra global para até 36px | Tag trocada para `<p role="heading" aria-level={1}>`, `text-[27px]` explícito | 27px — dentro da meta de 26–28px |
| **Subtítulo "Centro Executivo..."** | `text-sm` (14px) — também tinha a cor sobrescrita para cinza pela regra `.dashboard-main h1 + p` | `text-[11px]` — deixou de ser adjacente a um `<h1>` real, então a cor ciano pretendida (`text-cyan-400/80`) também passou a valer | 11px, ciano correto |
| **"Panorama Analítico" (h2)** | `text-sm` (14px) forçado pela regra global para até 32px | Tag trocada para `<p role="heading" aria-level={2}>`, `text-2xl` (24px) | 24px — dentro da meta de 22–24px |
| **"Síntese do Cenário" (h2)** | `text-base` (16px) forçado pela regra global para até 32px — ficava maior que "Estado Político"/"Termômetro" (ambos 18px) | Tag trocada, `text-lg` (18px) — igual ao peso dos outros 2 títulos da fileira | 18px — nenhum dos 3 cards domina mais pela tipografia |

## Validação

| Verificação | Resultado |
|---|---|
| Diff do Radar vs. `origin/rescue/radar-production-20260727` | Vazio |
| Diff de Instagram/X/Candidatos/Automação/Investigações/Usuários | Vazio |
| `npx tsc --noEmit` | Limpo |
| `npx vitest run` | 164/164 passando (nenhum teste alterado) |
| `npm run build` | Compilado com sucesso, 15 rotas |

## Arquivos alterados

`app/dashboard/overview/page.tsx`, `components/dashboard/overview/OverviewChannels.tsx`,
`OverviewSentiment.tsx`, `OverviewTopics.tsx`, `OverviewRisk.tsx`, `OverviewHeader.tsx`. Nenhum
componente compartilhado com o Radar foi tocado (`app/globals.css` não foi alterado nesta fase).

## Screenshots

Em `docs/screenshots/overview-ux-refinement-phase-2/`: `overview-top-1600.png`,
`analytics-1600/1440/1280/390.png`, `diagnostic-row.png`, e as 4 comparações lado a lado
`themes-before-after.png`, `sentiment-before-after.png`, `channel-radar-before-after.png`,
`typography-before-after.png`.

## Localhost

Ativo em `http://127.0.0.1:3003`. Nenhum commit feito — aguardando aprovação visual.
