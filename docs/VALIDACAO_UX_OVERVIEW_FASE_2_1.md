# Validação — Refinamento Visual da Visão Geral (Fase 2.1)

Branch: `release/radar-real-plus-overview`. Nenhum commit, merge, push ou deploy feito. Nenhuma
alteração em dados, queries, cálculos, ordem de seções ou no Radar de Notícias.

Esta fase corrige uma correção-passada-do-ponto: a Fase 2 ganhou sobriedade mas perdeu presença
visual. Cada gráfico foi recalibrado individualmente (não uma redução/ampliação genérica igual
para os quatro).

## Processo: uma correção intermediária durante a validação

Na primeira tentativa, o radar foi ampliado para `radius: '85%'`, o que **cortou os rótulos dos
eixos** ("Risco" virou "lisco", "Vol./Engaj." virou "Vol./Eng") nas bordas do card. Detectado na
captura de tela antes de finalizar, corrigido em duas iterações (`72%` ainda cortava o final de
"Vol./Engaj."; `66%` cortava só o ponto final; `62%` com `center: ['45%','48%']` resolveu
completamente, sem sacrificar o ganho de tamanho pretendido). O valor final é o que está
documentado abaixo e nos screenshots.

## Tabela comparativa

| Elemento | Estado anterior (Fase 2) | Meta (Fase 2.1) | Resultado |
|---|---|---|---|
| **Radar — raio** | `64%`, centro `['50%','46%']`, container 320px | +60-80% relativo, 180-220px de diâmetro visual, sem cortar labels | `radius: '62%'`, `center: ['45%','48%']`, container 340px — labels "Risco" e "Vol./Engaj." completos, radar claramente dominante no card (ver `radar-before-after.png`) |
| **Radar — labels/grade** | `axisName` 11px, grade em 0.18 de opacidade | Labels +10%, grade com mais contraste | `axisName` 12px, grade em 0.24 de opacidade |
| **Donut — diâmetro** | `radius: ['58%','78%']` dentro de container 192px → ~150px de diâmetro | +35-45%, 150-180px de diâmetro, mantendo anel fino | Container do gráfico 192px→230px, `radius: ['58%','78%']` mantido → ~179px de diâmetro; texto central 24px→28px | 
| **Donut — legenda/estrutura** | Legenda compacta 2 colunas, sem mini-cards | Preservar, não retornar aos mini-cards | Inalterado — apenas o `gap` do container ajustado para `justify-center` distribuir melhor o espaço |
| **Risco — largura de barras** | `barWidth: '58%'` | +15-25% | `barWidth: '70%'`, `barCategoryGap: '20%'` adicionado para reduzir vãos entre categorias |
| **Risco — margens** | `grid: {left:4,right:12,top:16,bottom:18}` | Reduzir vazio, mais altura útil | `grid: {left:8,right:16,top:12,bottom:20}` — label do eixo Y com `fontSize:12` no eixo X para melhor leitura |
| **Temas Dominantes** | Nome em cima, valor à direita, barra full-width embaixo, top 5, sem scroll | Preservar estrutura; barra +1-2px; espaçamento vertical maior; valor com mais peso | Barra `h-2`(8px)→`h-2.5`(10px); `gap-4`(16px)→`gap-5`(20px); valor `text-xs`→`text-sm` (peso visual maior). Estrutura 100% preservada |
| **"Panorama Analítico"** | 24px (`text-2xl`) | 21-23px | `text-[22px]` |
| **"Termômetro de Crise Master"** | 18px (`text-lg`) | 16-17px | `text-[17px]` |
| **"Estado Político"** | 18px (`text-lg`) | 16-17px | `text-[17px]` |
| **"Visão Geral" / subtítulo / "Síntese do Cenário" / títulos dos 4 gráficos** | 27px / 11px / 18px / 18px | 26-28px / 11-12px / 18px / 16-18px | Já conformes na Fase 2 — nenhuma alteração necessária |

## Validação

| Verificação | Resultado |
|---|---|
| Diff do Radar vs. `origin/rescue/radar-production-20260727` | Vazio |
| Diff de Instagram/X/Candidatos/Automação/Investigações/Usuários | Vazio |
| `npx tsc --noEmit` | Limpo |
| `npx vitest run` | 164/164 passando |
| `npm run build` | Compilado com sucesso, 15 rotas |

## Arquivos alterados

`app/dashboard/overview/page.tsx` (título "Panorama Analítico"), `OverviewChannels.tsx` (radar),
`OverviewSentiment.tsx` (donut), `OverviewRisk.tsx` (barras), `OverviewTopics.tsx` (Temas
Dominantes), `OverviewGauge.tsx` (título Termômetro), `PoliticalStatusCard.tsx` (título Estado
Político). Nenhum componente compartilhado com o Radar foi tocado.

## Screenshots

Em `docs/screenshots/overview-ux-refinement-phase-2-1/`: `panorama-before-1600.png` (estado da
Fase 2), `panorama-after-1600/1440/1280/390.png`, e as comparações lado a lado
`radar-before-after.png`, `sentiment-before-after.png`, `risk-before-after.png`,
`typography-before-after.png`.

## Localhost

Ativo em `http://127.0.0.1:3003`. Nenhum commit feito — aguardando aprovação visual.
