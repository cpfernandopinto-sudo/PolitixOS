# AUDITORIA UX & CONTRATO VISUAL FINAL — MÓDULO INSTAGRAM (BLOCO 3B.4 — FRENTE D)

**Data:** 21 de Agosto de 2026  
**Responsável:** Antigravity (UX/UI + Design System)  
**Destinatário:** Codex (Engenharia/Dados)  
**Status:** Auditado e Refinado / Contrato Visual Pronto  

---

## 1. ETAPA 1 — AUDITORIA DA PÁGINA ATUAL (`/dashboard/instagram`)

### 1.1 Diagnóstico do Frontend Atual

A página atual (`app/dashboard/instagram/page.tsx` + `InstagramDashboard.tsx` + `InstagramFilterBar.tsx`) cumpre a função de leitura básica, mas apresenta severos gargalos de hierarquia, densidade, excesso de informação operacional e baixo valor executivo.

#### A. Hierarquia & Densidade Visual
- **Alert Banner Super dimensionado:** O card de alerta crítico ocupa 100% da largura inicial com altura excessiva, forçando o conteúdo principal para baixo da dobra (below the fold).
- **Excessiva Quantidade de KPIs (6 Cards):** Exibe 6 KPIs no topo (`Posts Monitorados`, `Total Comentários`, `Engajamento Total`, `Posts Positivos`, `Posts Negativos`, `Posts c/ Risco Alto`). KPIs de contagem bruta como "Posts Positivos" e "Posts Negativos" repetem a donut chart de sentimento e poluem o dashboard.
- **Tabelas Operacionais Redundantes no Rodapé:**
  - *Tabela de Análise Estratégica dos Posts:* Possui 11 colunas horizontais (`Data`, `Candidato`, `Legenda`, `Tema`, `Sentimento`, `Risco`, `Motivo do Risco`, `Resumo IA`, `Ação Recomendada`, `Engajamento`, `Link`). Força um scroll horizontal denso e exibe textos longos em células de tabela.
  - *Monitoramento de Comentários em Tempo Real:* Exibe 50 linhas de comentários crus sem qualquer filtro executivo ou agrupamento de risco, transformando o sistema analítico em um feed passivo.
- **Calculo Visual com Multiplicadores Arbitrários:** A barra de temas da IA usava um multiplicador fixo `* 3` no CSS inline (`style={{ width: ... * 3 }}`), gerando barras com estouro visual em relação ao container real.

#### B. Gestão de Formatos de Conteúdo (Gaps Existentes)
- O sistema atual trata o Instagram de forma genérica como "Post com Imagem ou Vídeo".
- **Não há diferenciação visual de formatos:** `IMAGE`, `REEL` e `CAROUSEL` são exibidos de forma indiferenciada.
- O player de mídia no modal tenta carregar HTML5 `<video>` ou `<img>` sem sinalização de formato (ex.: contagem de slides de Carrossel ou contagem de visualizações/plays de Reels).

#### C. Responsividade & Breakpoints
- Em **Desktop Widescreen (1440px+)**, o layout fica disperso com cartões de gráficos muito altos.
- Em **Tablet (768px - 1024px)** e **Mobile (<768px)**, as tabelas de 11 colunas quebram a visualização e tornam a navegação impraticável sem scroll horizontal exaustivo.

---

### 1.2 Matriz de Classificação de Componentes (KEEP / IMPROVE / REMOVE / REPLACE)

| Componente | Classificação | Justificativa UX / Ação Recomendada |
|---|---|---|
| **InstagramAlertCard** | `IMPROVE` | Manter no topo apenas quando houver **Risco ALTO / Crítico**. Reduzir altura vertical e remover botões genéricos de navegação. |
| **KPI Row (6 Cards)** | `REPLACE` | Substituir por **5 KPIs Estratégicos Sintéticos**: `Posts Monitorados`, `Total Engajamento`, `Risco Crítico %`, `Sentimento Dominante`, `Top Formato`. |
| **Pressão Social (LineChart)** | `IMPROVE` | Manter a análise temporal de engajamento e comentários, ajustando a densidade de linhas e legendas. |
| **Termômetro de Risco (GaugeChart)** | `KEEP` | Manter como indicador visual sintético de risco da marca/candidato no período. |
| **Donut Chart de Sentimento** | `KEEP` | Manter a distribuição percentual de Positivo / Neutro-Misto / Negativo. |
| **Barras de Temas IA** | `REPLACE` | Substituir pelo **Painel de Performance por Formato (IMAGE vs REEL vs CAROUSEL)**, alinhando ao novo escopo do módulo. |
| **Tabela de Posts Prioritários** | `IMPROVE` | Transformar no **Feed de Conteúdo Prioritário**, incluindo explicitamente os badges de formato (`IMAGE`, `REEL`, `CAROUSEL`), sentimento e nível de risco. |
| **Tabela de Análise Estratégica (11 colunas)** | `REMOVE` | Remover a tabela pesada do rodapé. A análise detalhada (Resumo IA, Motivo do Risco, Protocolo) pertence ao **Post Detail Drawer**. |
| **Comentários em Tempo Real (50 linhas)** | `REPLACE` | Substituir a listagem bruta por um card executivo de **Sinais de Risco em Comentários (Top Critical Comments)**. |
| **Post Detail Modal / Drawer** | `IMPROVE` | Transformar em Side Drawer / Overlay centralizado em 2 colunas (Mídia + Análise IA & Protocolo). Garantir preservação completa de estado e filtros de origem ao fechar. |

---

## 2. ETAPA 2 — AUDITORIA E REFINAMENTO DA PROPOSTA GOOGLE STITCH

### 2.1 Avaliação da Tela Gerada no Stitch (`PolitixOS - Instagram Intelligence Module`)

A proposta gerada no Google Stitch introduziu o conceito de **Command Center de Inteligência Política para o Instagram**.

#### Pontos Fortes Aprovados:
1. **Estética Executiva e Premium:** Uso rigoroso da paleta obsidian (`#0E131E`), acento Intelligence Cyan (`#00F0FF`), bordas de 1px discretas e tipografia Geist.
2. **Nova Matriz de Performance por Formato:** Apresentação clara do comparativo de engajamento/views entre `IMAGE`, `REEL` e `CAROUSEL`.
3. **Distribuição em 2 Colunas no Conteúdo Principal:** Separação limpa entre Feed de Posts Prioritários (70% de largura) e Destaque de Comentários Críticos (30% de largura).
4. **Post Detail Drawer Side Overlay:** Drawer lateral para exibição de análise de inteligência sem perder de vista o dashboard de fundo.

#### Refinamentos e Ajustes Exigidos (Filtro Anti-Stitch):
1. **Rejeitar Elementos de "Social Media Manager":** O Stitch incluiu botões de ação social direta (ex.: "Responder comentário", "Curtir post"). **REMOVER.** O PolitixOS é uma ferramenta analítica e estratégica, não um gerenciador de publicação ou sac de redes sociais.
2. **Badging de Formatos Rigoroso:** Garantir que badges de formato sejam discretos e padronizados no header dos cards (`[REEL]`, `[CAROUSEL]`, `[IMAGE]`), sem poluição de cores neon não semânticas.
3. **Restrição de Funcionalidades Não Disponíveis no Pipeline V2:** 
   - Confirmar a **AUSÊNCIA TOTAL** de Stories, Highlights, Transcripts e respostas completas em árvore. O layout do Stitch deve tratar apenas o que o pipeline V2 entrega.
4. **Ajuste de Densidade em 1440px:** Garantir que o texto de títulos da tabela de posts seja truncado em 1 linha com ellipsis (`truncate`) para evitar quebras em telas padrão de 1440px.

---

## 3. UX SPEC FINAL INSTAGRAM — CONTRATO VISUAL PARA O CODEX

### 3.1 Arquitetura Visual e Grid Layout

- **Grid Base:** 12 colunas, gutter de 16px, container padding de 24px (desktop).
- **Escala de Espaçamento:** Múltiplos de 4px (4px, 8px, 12px, 16px, 24px, 32px).
- **Corner Radius:** Rígido 4px a 6px (`rounded-md` / `rounded-lg`). Proibido usar bordas ovais super arredondadas (`rounded-3xl` / `rounded-full` em cards).

```
+-----------------------------------------------------------------------------------+
| 1. GLOBAL & LOCAL FILTER BAR (Sticky Top)                                         |
| [ Candidato(s) ] [ Período ] [ Formato: TODOS | IMAGE | REEL | CAROUSEL ] [ Risco ]|
+-----------------------------------------------------------------------------------+
| 2. CRISIS ALERT BANNER (Condicional - Exibido apenas se houver Risco ALTO > 0)    |
+-----------------------------------------------------------------------------------+
| 3. STRATEGIC KPI ROW (5 Colunas Equivalentes)                                      |
| [ Posts Monitorados ] [ Engajamento Total ] [ Risco Crítico % ] [ Sentimento ] [ Top Formato ] |
+-----------------------------------------------------------------------------------+
| 4. ANALYTICAL PANORAMA (12 Colunas)                                                |
| +-----------------------------------------+---------------------------------------+
| | 4.1 Performance por Formato (7 cols)    | 4.2 Pressão Social & Gauge (5 cols)   |
| | (Bar chart: IMAGE vs REEL vs CAROUSEL)  | (Line Chart 24h + Termômetro Risco)   |
+-------------------------------------------+---------------------------------------+
| 5. FEED & CRITICAL SIGNALS AREA (12 Colunas)                                      |
| +-----------------------------------------+---------------------------------------+
| | 5.1 Feed de Conteúdo Prioritário (8 cols)| 5.2 Sinais Críticos em Comentários(4c)|
| | (Tabela compacta com badges e ações)    | (Cards com comentários de risco ALTO) |
+-------------------------------------------+---------------------------------------+
| 6. POST DETAIL & AI ANALYSIS DRAWER (Side Drawer Overlay - 768px max-width)       |
+-----------------------------------------------------------------------------------+
```

---

### 3.2 Badges & Semântica Visual

#### Badges de Formato de Mídia:
- **`[REEL]`**: Background `#00F0FF`/10, texto `#00F0FF`, border 1px `#00F0FF`/30. Ícone Play.
- **`[CAROUSEL]`**: Background `#A855F7`/10, texto `#C084FC`, border 1px `#A855F7`/30. Ícone Layers + Indicador (ex: `1/5`).
- **`[IMAGE]`**: Background `#64748B`/10, texto `#94A3B8`, border 1px `#64748B`/30. Ícone Image.

#### Badges de Risco:
- **`[ALTO]`**: Background `#EF4444`/15, texto `#EF4444`, border 1px `#EF4444`/40 (Pulsante sutil se for Alerta Crítico).
- **`[MÉDIO]`**: Background `#EAB308`/15, texto `#EAB308`, border 1px `#EAB308`/40.
- **`[BAIXO]`**: Background `#22C55E`/15, texto `#22C55E`, border 1px `#22C55E`/40.

#### Badges de Sentimento:
- **`[POSITIVO]`**: Texto `#22C55E`, bg `#22C55E`/10.
- **`[NEUTRO]`**: Texto `#3B82F6`, bg `#3B82F6`/10.
- **`[MISTO]`**: Texto `#EAB308`, bg `#EAB308`/10.
- **`[NEGATIVO]`**: Texto `#EF4444`, bg `#EF4444`/10.

---

### 3.3 Comportamento dos Estados UI (Loading, Empty, Error, Fallbacks)

1. **Loading State:**
   - Exibir Skeleton Loaders com efeito Shimmer (`#12192A` pulsante) em todos os 5 cards de KPI, nos gráficos e na tabela de feed.
   - Manter a barra de filtros interativa mas desabilitada durante o fetch.
2. **Empty State (Filtro sem resultados):**
   - Container centralizado com ícone discreto (`SearchX`), título "Nenhum conteúdo encontrado para os filtros selecionados" e botão primário "Limpar Filtros".
3. **Error State (Falha de API / Conexão):**
   - Card de erro com borda `#EF4444`/30, mensagem "Não foi possível carregar os dados atualizados do Instagram." e botão "Tentar Novamente".
4. **Mídia Indisponível (Fallback na MediaRenderer):**
   - Quando a imagem/vídeo do post falhar no carregamento ou tiver URL expirada: exibir container `#0F172A` com ícone de mídia indisponível, texto "Mídia indisponível na origem" e botão secundário "Abrir post original no Instagram".
5. **Sem Comentários:**
   - No painel de comentários ou no drawer, se o post não tiver comentários coletados: exibir "Nenhum comentário registrado para este conteúdo."
6. **Sem Métrica:**
   - Em caso de dados nulos de engajamento/views, exibir `—` em vez de `0`.

---

### 3.4 Interações & Fluxo de Navegação (Post Detail Drawer)

- **Fluxo:** Dashboard → Clique em post/detalhe → Abertura do **Post Detail Side Drawer** (slide-in da direita).
- **Conteúdo do Drawer:**
  - Coluna 1 (Esquerda - 45%): Media Viewer (`IMAGE`, `REEL` ou `CAROUSEL`), links originais, data e autor.
  - Coluna 2 (Direita - 55%): Tema IA, Sentimento, Risco & Motivo do Risco, Relatório Executivo e **Protocolo Recomendado** (Destaque em container `#00F0FF`/10).
- **Preservação de Contexto:**
  - O clique no fechamento (`✕` ou tecla `ESC`) fecha o drawer.
  - A URL (`searchParams`) e o scroll da página do dashboard mantêm-se **100% inalterados**, permitindo que o decisor continue analisando os posts sem perder os filtros aplicados.

---

### 3.5 Responsividade & Breakpoints

- **Desktop Widescreen (≥1440px):** Layout completo em 12 colunas, visualização simultânea de Feed (8 cols) e Sinais de Comentários (4 cols).
- **Laptop (1024px - 1439px):** 12 colunas com paddings reduzidos (16px), títulos truncados em 1 linha na tabela.
- **Tablet (768px - 1023px):**
  - Matriz Analytics empilha em 1 coluna (100% Formatos / 100% Pressão Social).
  - Area de Conteúdo empilha em 1 coluna (100% Feed / 100% Sinais de Comentários).
- **Mobile (<768px):**
  - Filter Bar vira seletor retrátil (Accordion/Modal).
  - 5 KPIs viram grid 2x3.
  - Tabela vira lista de cards executivos verticais.
  - Post Detail Drawer abre em modo Full Screen.

---

### 3.6 Resumo de Modificações para o Codex

```diff
+ MANTER: Termômetro de Risco (GaugeChart), Donut Chart de Sentimento, Overlay de Detalhes do Post.
+ ADICIONAR: Suporte visual explícito a IMAGE, REEL, CAROUSEL com Badges dedicados.
+ ADICIONAR: Painel de Performance Comparativa por Formato (IMAGE vs REEL vs CAROUSEL).
+ ADICIONAR: Card de Sinais Críticos de Comentários (substituindo a tabela bruta).
+ ADICIONAR: Estados completos de UI (Skeleton loading, Empty state, Error state, Fallback de mídia).
- REMOVER: Tabela operacional de 11 colunas no rodapé.
- REMOVER: Listagem bruta de 50 comentários em tempo real.
- REMOVER: Multiplicadores arbitrários (* 3) no CSS de temas.
- REMOVER: Botões e interações de rede social pública (curtir, responder).
```

---

**CONTRATO VISUAL CONCLUÍDO — ENTREGUE AO CODEX PARA IMPLEMENTAÇÃO NO BLOCO 3B.4.**
