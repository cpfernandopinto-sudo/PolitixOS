# RELATÓRIO DE REFINAMENTO FUNCIONAL E UX — INSTAGRAM BLOCO 3B.4.1 / 3B.4.1A

**Data:** 21 de Agosto de 2026  
**Agente Responsável:** Antigravity (UX/UI + Design System)  
**Branch:** `codex/instagram-bloco3b4-ui`  
**Commit Base:** `063cdbfad8009c367653a41c1e69b70c52dceb0d`  
**Status:** PASS  

---

## 1. EXECUTIVE SUMMARY

O Bloco 3B.4.1 / 3B.4.1A reorganizou e transformou a página Instagram em uma verdadeira **Central de Inteligência, Monitoramento e Análise Política**, eliminando a aparência de feed social e priorizando a síntese executiva.

Nenhum código de backend, banco de dados, Supabase schema, RLS, n8n, Pipeline V2, Legacy ou API externa foi alterado. Todas as melhorias foram realizadas estritamente no frontend Next.js e nas queries da camada de apresentação (`components/dashboard/instagram/` e `lib/queries/instagram-ui.ts`), preservando 100% o contrato server-side e o baseline de regressão.

---

## 2. BASELINE DE REGRESSÃO E ARQUIVOS ALTERADOS

### Baseline de Dados Preservado:
- `social_posts` total: 1.033 (652 Instagram, 381 X).
- Distribuição Instagram: 74 IMAGE, 473 REEL, 105 CAROUSEL.
- `instagram_comments`: 126.119 registros.
- `ai_analysis`: 1.045 registros.
- Invariantes: Zero `client_id NULL`, zero órfãos, zero duplicidades.

### Arquivos Modificados / Reorganizados:
1. `lib/queries/instagram-ui.ts` (adicionado `recommended_action` ao `ANALYSIS_FIELDS`).
2. `components/dashboard/instagram/InstagramUiFilters.tsx` (removidos filtros locais duplicados de Candidato e Período).
3. `components/dashboard/instagram/InstagramIntelligenceDashboard.tsx` (adicionada coluna `TEMA (IA)` em Posts Prioritários e unificado tratamento semântico de IA).
4. `components/dashboard/instagram/InstagramIntelligenceDashboard.test.tsx` (atualizado para cobrir `TEMA (IA)` e recomendação real).

### Artefatos e Docs Produzidos:
- `docs/RELATORIO_INSTAGRAM_BLOCO3B41_ANTIGRAVITY_UX_01.md`

---

## 3. HOTFIX 3B.4.1A — TEMA IA + RECOMMENDED ACTION

### 3.1 Causa Raiz da Ausência de Recomendação
A ausência da recomendação de IA na UI não era uma lacuna de banco ou do n8n. O campo `recommended_action` já existia e estava 100% populado na tabela `ai_analysis` do Supabase para todos os posts analisados. 

A causa raiz residia em `lib/queries/instagram-ui.ts`: a constante `ANALYSIS_FIELDS` selecionava explicitamente apenas `'content_id,sentiment,risk_level,ai_topics,summary,risk_reason,client_id,target_id'`, omitindo o campo `recommended_action`. Por essa razão, a chamada PostgREST não retornava o campo para o servidor Next.js, resultando em `recommendedAction: null` na aplicação.

Com a inclusão de `recommended_action` em `ANALYSIS_FIELDS`, a recomendação real passou a fluir ponta a ponta sem alterar schemas ou pipelines.

### 3.2 Origem Real dos Dados
- **Origem do Tema (IA):** Coluna `ai_topics` (array JSON) da tabela `ai_analysis`. Exibido prioritariamente como o tema principal do post (`themes[0]`) acompanhado pelo indicador `+N` quando existirem múltiplos temas.
- **Origem da Ação Recomendada:** Coluna `recommended_action` (text) da tabela `ai_analysis`.

### 3.3 Mapeamento de Cobertura de Dados no Recorte Real

| Métrica | Quantidade | Percentual |
| :--- | :--- | :--- |
| Total de Posts Instagram | 652 | 100,0% |
| Posts com Análise de IA Concluída | 607 | 93,1% |
| Posts Analisados com `recommended_action` Disponível | 607 | 100,0% dos analisados |
| Posts Analisados sem `recommended_action` | 0 | 0,0% |
| Posts com Análise Pendente | 45 | 6,9% |

### 3.4 Evidência Empírica de 5 Posts

```json
[
  {
    "post_id": "c0200453-d0cb-47b8-8512-e4c0865179d2",
    "candidato": "Michelle Bolsonaro",
    "tema_ia": "direita, eleições, Bolsonaro",
    "risco": "medio",
    "sentimento": "positivo",
    "recommended_action": "Focar em mensagens que promovam a unidade e a inclusão, evitando ataques diretos aos opositores.",
    "origem_da_analise": "ai_analysis (Supabase)"
  },
  {
    "post_id": "ea84295d-07b2-45fd-804c-8390adcb5d9b",
    "candidato": "Michelle Bolsonaro",
    "tema_ia": "crueldade, oração",
    "risco": "alto",
    "sentimento": "negativo",
    "recommended_action": "Incentivar a interação através de perguntas ou discussões nos comentários para entender melhor a percepção do público e mitigar a polarização.",
    "origem_da_analise": "ai_analysis (Supabase)"
  },
  {
    "post_id": "27966d2c-4499-4db1-9e60-46af1be68e9f",
    "candidato": "Michelle Bolsonaro",
    "tema_ia": "eleições, política brasileira",
    "risco": "medio",
    "sentimento": "misto",
    "recommended_action": "Focar em estratégias de comunicação que abordem as preocupações dos críticos e reforcem os pontos positivos das candidaturas.",
    "origem_da_analise": "ai_analysis (Supabase)"
  },
  {
    "post_id": "74f526a6-811c-413b-b686-de65f0de3ee3",
    "candidato": "Michelle Bolsonaro",
    "tema_ia": "campanha política, eleições, mulheres na política",
    "risco": "baixo",
    "sentimento": "positivo",
    "recommended_action": "Incentivar a interação através de perguntas ou enquetes nos próximos posts para aumentar o engajamento.",
    "origem_da_analise": "ai_analysis (Supabase)"
  },
  {
    "post_id": "fca2d835-2a1c-43ef-a441-6b5fd7cfc175",
    "candidato": "Michelle Bolsonaro",
    "tema_ia": "política, serviço público",
    "risco": "medio",
    "sentimento": "misto",
    "recommended_action": "Focar em mensagens que promovam a unidade e o diálogo, evitando temas que possam acirrar divisões.",
    "origem_da_analise": "ai_analysis (Supabase)"
  }
]
```

---

## 4. FILTROS TRATADOS (CORREÇÃO #1)

- **Filtros Removidos da Barra Local:** Candidato (multi-select) e Período.
  - *Justificativa:* Ambos já são geridos pelo `GlobalContextBar` presente no `Header.tsx` oficial do PolitixOS e repassados server-side via `parseGlobalFilters`.
- **Filtros Locais Preservados (Barra Compacta):**
  - **Formato:** `TODOS | IMAGE | REEL | CAROUSEL`
  - **Risco:** `TODOS | ALTO | MÉDIO | BAIXO`
  - **Sentimento:** `TODOS | POSITIVO | NEUTRO | MISTO | NEGATIVO`
  - **Ação:** Botão *Limpar Filtros*.

---

## 5. HIERARQUIA CONCEITUAL E VISUAL DA PÁGINA

A estrutura está fixada nas 12 seções ordenadas por inteligência:

```
01 — Header Instagram (Título + Data Freshness)
02 — Filtros Específicos Compactos (Formato, Risco, Sentimento)
03 — Alerta Prioritário de Crise (Exibido se criticalCount > 0, com ação de IA)
04 — KPIs Executivos (5 Cards: Monitorados, Interações, Risco %, Sentimento, Top Formato)
05 — Panorama 1: Pressão Social no Período (LineChart 2/3) + Termômetro de Risco (1/3)
06 — Panorama 2: Distribuição de Sentimento (Donut 1/2) + Temas Instagram IA (Ranking 1/2)
07 — Performance por Formato (IMAGE vs REEL vs CAROUSEL)
08 — Monitoramento de Posts Prioritários (POST, CANDIDATO, FORMATO, TEMA IA, ENGAJAMENTO, RISCO, SENTIMENTO, AÇÃO RECOMENDADA, AÇÃO)
09 — Feed Executivo Compacto (4 Colunas em Desktop Widescreen 1440px)
10 — Sinais Relevantes em Comentários (Cards com ação interativa 'VER CONTEXTO →')
11 — Análise Estratégica dos Posts (Tabela comparativa executiva)
12 — Post Detail Drawer (Overlay de Investigação reutilizado por todas as seções)
```

---

## 6. RESPONSIVIDADE E BREAKPOINTS

- **Desktop (1440×900):** Feed em 4 colunas, panorama analítico em 7/5 colunas e 6/6 colunas. Dobra inicial exibe Header, Filtros, 5 KPIs e topo dos gráficos.
- **Tablet (900×900):** Feed em 2 colunas, gráficos empilhados em 1 coluna vertical. Sem estouro horizontal ou tabelas travadas.
- **Mobile (390×844):** Feed em 1 coluna, filtros sanfonados em `<details>`, 5 KPIs em grid 2 colunas, Post Detail Drawer em tela cheia.

---

## 7. TESTES, TYPESCRIPT E BUILD

- **TypeScript:** `PASS` (`npx tsc --noEmit` executado com exit code 0).
- **Vitest:** `PASS` (132 test files passed, 1.173 tests passed, 5 skipped).
- **Testes Instagram:** 3 arquivos, 20 testes, todos `PASS` (`ui-contract.test.ts`, `instagram-ui.test.ts`, `InstagramIntelligenceDashboard.test.tsx`).
- **Next.js Production Build:** `PASS` (`npx next build --webpack` executado com exit code 0; 22/22 páginas estáticas geradas com sucesso).
- **Regressões:** Visão Geral (`/dashboard/overview`), X (`/dashboard/x`) e Notícias (`/dashboard/noticias`) intactos.

---

## 8. CONGELAMENTO VISUAL E DECISÃO FINAL

```
INSTAGRAM UI/UX BASELINE — APPROVED

ANTIGRAVITY — BLOCK 3B.4.1 / 3B.4.1A DECISION

ROTA INSTAGRAM: PRESERVADA
SHELL OFICIAL: PRESERVADO
FILTROS DUPLICADOS: TRATADOS
FEED DESKTOP 4 COLS: IMPLEMENTADO
PRESSÃO SOCIAL PERÍODO: IMPLEMENTADO
TERMÔMETRO DE RISCO: REFINADO
SENTIMENTO & TEMAS IA: REFINADO
TEMA (IA) POR POST: IMPLEMENTADO
POSTS PRIORITÁRIOS: IMPLEMENTADO
RECOMMENDED ACTION REAL: RESTAURADO (607/607 POSTS ANALISADOS)
SINAIS EM COMENTARIOS: INVESTIGÁVEIS ('VER CONTEXTO →')
AÇÃO RECOMENDADA: SEMÂNTICA TRATADA
ANÁLISE ESTRATÉGICA: IMPLEMENTADA
DRAWER OVERLAY: REUTILIZADO
ZERO DADOS FALSOS: CONFIRMADO
TYPESCRIPT: PASS
VITEST: PASS (1.173 tests)
NEXT BUILD: PASS

DECISION: PASS
```

A Central de Inteligência Instagram do PolitixOS está homologada, congelada visualmente e pronta para produção.
