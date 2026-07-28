# Auditoria Visual — Sprint 5

Ambiente: `npm run dev` local (`http://127.0.0.1:3000`), autenticação via `app/api/dev-login` (dev-only), dados reais do Supabase configurado em `.env.local`. Branch: `claude/politixos-audit-enhancement-f4d793`, commit no momento da auditoria: `7e7d5d5`. Screenshots "antes" capturados via Playwright em `docs/screenshots/sprint-5/before/` nos 4 viewports pedidos (1600, 1280, 768, 390).

## Problemas encontrados

### 1. CRÍTICO — "Principal Risco" usa o título da notícia como nome do risco

Na Síntese do Cenário e no board de Riscos Prioritários, o texto principal do risco é literalmente o título da notícia/post de origem (ex.: *"Flávio Bolsonaro: Motivos para as desculpas de Flávio - blogs.correiobraziliense.com.br"*), não uma leitura executiva da regra disparada.

- **Causa raiz**: `deriveRisksFromAlerts` (`lib/analytics/executive-summary.ts`) atribuía `descricao: a.titulo` — o título bruto do item de origem — em vez de um texto derivado da regra (`a.nome`/`a.descricao`, já em linguagem executiva em `lib/config/alert-thresholds.ts`).
- **Componentes afetados**: `ExecutiveScenarioSummary.tsx` (campo "Principal Risco"), `RiskOpportunityBoard.tsx` (`RiskItem`).
- **Proposta**: nova função pura `formatExecutiveRisk` (`lib/analytics/risk-language.ts`) que separa `headline` (linguagem executiva, ex. "Notícia de risco crítico envolvendo Flávio Bolsonaro") de `evidenciaPrincipal` (o título original, exibido à parte, rotulado como evidência, com link).
- **Prioridade**: Alta.
- **Risco de regressão**: baixo — `RiskCard.descricao` só é lido pelos dois componentes acima; nenhuma consulta muda.

### 2. ALTO — Três riscos "CRÍTICO" empilhados criam uma parede vermelha

Com múltiplos alertas críticos simultâneos, o board de Riscos mostra 3 badges "CRÍTICO" idênticos em sequência, sem nenhuma agregação — o peso visual não diferencia "3 críticos" de "1 crítico repetido 3x", e a cor vermelha domina o bloco.

- **Componentes afetados**: `RiskOpportunityBoard.tsx`.
- **Proposta**: um resumo compacto de contagem por severidade acima da lista (ex. "3 críticos · 1 alto"), badges com tratamento mais discreto (borda + texto, sem preenchimento sólido) e borda de acento lateral por severidade (reaproveitando o padrão já usado em `PoliticalStatusCard`), para não repetir a mesma mancha vermelha em cada card.
- **Prioridade**: Média.
- **Risco de regressão**: baixo — mudança apenas visual, dados inalterados.

### 3. ALTO — Não existe camada narrativa; a tela abre direto em 6 cards de peso igual

Não há nenhuma frase de abertura explicando o cenário. A "Síntese do Cenário" já é o primeiro bloco de conteúdo, com 6 tiles (Estado Geral, Principal Risco, Principal Oportunidade, Tema em Destaque, Maior Exposição, Mudança Relevante) todos do mesmo tamanho, mesma tipografia, mesmo peso — força o usuário a ler os 6 antes de entender "o que importa agora".

- **Componentes afetados**: `app/dashboard/overview/page.tsx`, `ExecutiveScenarioSummary.tsx`.
- **Proposta**: `ExecutiveNarrative` (nova, determinística) no topo, e reorganização dos 6 tiles em dois níveis (Estado Geral + Principal Risco em destaque; os outros 4 como tiles secundários menores).
- **Prioridade**: Alta.

### 4. MÉDIO — Entidades e Temas em Atenção parecem uma tabela

Os cards de `AttentionEntitiesThemes.tsx` são linhas de texto empilhadas sem nenhuma identidade visual (sem avatar/inicial, sem indicador visual de risco) — a diferença para uma tabela HTML comum é só o `border-radius`.

- **Proposta**: avatar por iniciais (determinístico, sem busca externa), diferenciação visual (borda/acento) para entidades com risco alto/crítico.
- **Prioridade**: Média.

### 5. MÉDIO — Estado vazio de "Oportunidades" não explica o motivo

O estado vazio mostra apenas "Nenhuma oportunidade com regra objetiva identificada no período." — não diz **por que** (sem período anterior comparável? sem queda de negatividade? nenhuma entidade top-3 sem risco?), como pedido na Parte 11.

- **Proposta**: `explainOpportunityAbsence` (nova função pura, determinística, deriva o motivo real das mesmas condições de `evaluateOpportunities`).
- **Prioridade**: Média.

### 6. MÉDIO — Leitura Analítica Assistida sem provedor parece erro técnico

O estado "indisponível" (sem `ANTHROPIC_API_KEY`) usa a mesma linguagem para todos os papéis, sem explicar o benefício da funcionalidade nem oferecer uma ação administrativa.

- **Proposta**: estado "não configurado" reformulado (benefício + confirmação de que o resto funciona), detalhe técnico restrito a admin.
- **Prioridade**: Média.

### 7. ALTO — Mobile: sidebar fixa consome ~20% da largura em 390px

`components/Sidebar.tsx` renderiza um `<aside>` fixo (`w-20` mesmo "recolhido") em **todos** os breakpoints — não existe variante mobile (drawer/overlay). Em 390px de largura, ~80px (>20%) ficam permanentemente ocupados pela coluna de ícones, mesmo sem uso ativo do menu, comprimindo todo o conteúdo principal.

- **Componentes afetados**: `components/Sidebar.tsx`, `app/dashboard/layout.tsx`, `components/Header.tsx`.
- **Proposta**: abaixo de `lg`, ocultar a sidebar fixa e oferecer um botão de menu no cabeçalho que abre um overlay (reaproveitando o componente `Drawer` já existente) com a mesma navegação.
- **Prioridade**: Alta.

### 8. BAIXO — Timeline é uma lista de bullets, não um feed

`OverviewTimeline.tsx` (modo cronológico) usa um ponto colorido genérico por severidade, sem ícone de canal, sem separação visual clara entre itens, dificultando o escaneamento.

- **Proposta**: ícone de canal (reaproveitar `XChannelIcon`/`InstagramChannelIcon` do Sidebar ou equivalente), separação de card por item, entidade/tema visíveis por item.
- **Prioridade**: Baixa (o modo agrupado já tem mais estrutura).

## Pontos que já estão adequados (não mexer)

- Identidade escura, paleta e tipografia base — consistentes, sem necessidade de recriação.
- `PoliticalStatusCard`: já usa acento lateral por severidade + drawer "Entenda o cálculo" com metodologia completa — bom padrão de hierarquia a ser **reaproveitado**, não substituído.
- `Drawer` genérico: acessível (Esc, focus trap, retorno de foco) — será reaproveitado para o menu mobile em vez de recriado.
- Estados vazios de "Mudanças Relevantes" e "Nenhum risco prioritário" já são honestos (não fabricam zero) — mantidos.
- Contraste geral AA em texto branco/cinza sobre `#0D0D0D`/`#1A1A1A` — adequado, não alterado.

## Prioridades de intervenção

1. Separar risco de evidência (#1) — bug de confiança do dado, maior prioridade.
2. Narrativa executiva + hierarquia da primeira dobra (#3).
3. Mobile sidebar overlay (#7) — perda de largura útil em todo o app, não só na Visão Geral.
4. Board de riscos: agregação por severidade (#2).
5. Identidade visual de entidades (#4) e motivo de ausência de oportunidade (#5).
6. Leitura Assistida — estados amigáveis (#6).
7. Timeline como feed (#8).

## Riscos de regressão gerais

- Nenhuma consulta nova é necessária para nenhum item acima — todos os dados já são buscados por `getExecutiveOverviewData` (cacheada).
- Mudanças em `RiskCard`/`ExecutiveSynthesis` são aditivas ou de conteúdo de campo (não de forma), sem impacto em outros consumidores fora da Visão Geral.
- Sidebar: a versão desktop (`lg:` e acima) mantém o comportamento atual (recolhida/expandida, `localStorage`); só o comportamento abaixo de `lg` muda.

## Revisão da densidade analítica — reintegração dos gráficos

Data: 2026-07-28 (mesma sessão, após feedback do responsável pelo produto de que a hierarquia executiva escondeu gráficos estratégicos importantes dentro de "Análises Complementares", recolhida por padrão).

### Mapeamento — onde cada componente está hoje

| Componente | Posição atual | Query/fonte real | Consulta nova? | Achado |
|---|---|---|---|---|
| `OverviewKPI` (5 cards) | Dentro de "Análises Complementares" (recolhida) | `getOverviewKPIs(filters)` → `fetchOverviewData` (cache) + `getTrendOverview` (cache) | Não | Nenhum problema de dado — só de posição. Volta para a Camada 1, logo após a narrativa. |
| `OverviewGauge` (Termômetro de Crise Master) | Dentro de "Análises Complementares" | `getCrisisOverview(filters)` → `fetchOverviewData` (cache) | Não | Mesmo `score` consumido por `classifyPoliticalStatus` (Estado Político). Precisa de texto explícito diferenciando as duas leituras (executiva vs. decomposição por canal). |
| `OverviewAlerts` (Alertas Prioritários) | Dentro de "Análises Complementares" | **Bug real encontrado**: `getPriorityAlerts(filters)` — função separada, com critério de severidade/ordenação diferente da Central de Alertas, e `resumo: n.title` / `p.text.substring(0,100)` (título/texto bruto do item de origem usado como texto do alerta) — o **mesmo bug** já corrigido no Sprint 5 para `RiskOpportunityBoard`, presente aqui sem correção. | Não (mas era computação paralela redundante) | Corrigido: fonte trocada para `getExecutiveOverviewData(filters).risks` (já `RiskCard[]`, já passado por `formatExecutiveRisk`, já calculado — zero consulta nova). `getPriorityAlerts` removida por ficar sem nenhum consumidor. |
| `OverviewTopics` (Temas Dominantes) | Dentro de "Análises Complementares" | `getDominantTopics(filters)` → `fetchOverviewData` (cache) | Não | Sem problema. Volta para a Camada 2. Distinto de "Entidades/Temas em Atenção" (Camada 3): aqui é o ranking bruto (top 10, "o que pauta a conversa"); lá é o recorte executivo (top 5, "quem/o que precisa de atenção"). Contextos diferentes — não fundir. |
| `OverviewChannels` (radar "Distribuição por Canal") | Dentro de "Análises Complementares" | `getChannelDistribution(filters)` → `fetchOverviewData` (cache) | Não | **Bug real encontrado**: a dimensão "Alcance" do radar usava constantes fixas (`80`, `60`, `90`) sem nenhuma origem em dado real — não há contagem de seguidores/alcance em nenhuma tabela do projeto (mesma limitação já documentada em `docs/AUDITORIA_UX_PERFORMANCE_POLITIXOS.md`). A dimensão "Polarização" também usava constantes fixas (`0.2`, `0.4`) para Notícias/Instagram — só X tem `polarização` real calculada. Ambas violam "não inventar métricas". **Corrigido**: as duas dimensões fabricadas foram removidas do radar; ficaram apenas as 3 dimensões com dado real para os três canais (Sentimento, Risco, Volume/Engajamento). |
| `OverviewSentiment` (Sentimento Consolidado) | Dentro de "Análises Complementares" | `getSentimentOverview(filters)` → `fetchOverviewData` (cache) | Não | Sem problema. Volta para a Camada 2. |
| `OverviewRisk` (Distribuição de Risco) | Dentro de "Análises Complementares" | `getRiskOverview(filters)` → `fetchOverviewData` (cache) | Não | Sem problema. Volta para a Camada 2. |
| `OverviewStrategicMap` (Mapa de Ação Estratégica) | Dentro de "Análises Complementares" | `getStrategicActions(filters)` → `fetchOverviewData` (cache) | Não | Não está na lista de reintegração do pedido — continua em "Análises Complementares" (é uma recomendação operacional, item secundário por natureza). |

### Por que devem voltar

Todos os 7 primeiros itens da tabela usam dados já buscados por `fetchOverviewData(filters)` (cacheado via `React.cache()`) — nenhum é uma consulta nova, e nenhum duplica o Centro Executivo: KPIs/Termômetro/Alertas/Temas/Canais/Sentimento/Risco respondem perguntas analíticas específicas ("como cada canal contribui", "qual a percepção predominante", "qual a gravidade") que a síntese executiva (Sprint 3-5) resume, mas não substitui — a síntese é uma LEITURA do mesmo dado, não uma segunda fonte.

### Como serão posicionados (Camada 2 — sempre visível)

1. Cards executivos (5) — logo após a Narrativa Executiva.
2. Termômetro de Crise Master + Alertas Prioritários lado a lado (desktop) / empilhados (mobile).
3. Faixa "Panorama Analítico" (nome escolhido para não ser confundido com "Leitura Analítica Assistida", que é o bloco de IA).
4. Grid com Temas Dominantes, Distribuição por Canal, Sentimento Consolidado, Distribuição de Risco.

### Quais dados serão reutilizados

100% dos dados já existentes: `getOverviewKPIs`, `getCrisisOverview`, `getDominantTopics`, `getChannelDistribution`, `getSentimentOverview`, `getRiskOverview` (todas já cacheadas via `fetchOverviewData`), mais `getExecutiveOverviewData(filters).risks` (substituindo `getPriorityAlerts`, que é removida).

### Quais redundâncias serão evitadas

- `getPriorityAlerts` removida (função inteira) — sem consumidores após a mudança, e sua lógica duplicava (com critério diferente) o que `deriveRisksFromAlerts`/Central de Alertas já calculam.
- Nenhum componente é duplicado em duas posições — cada um sai de "Análises Complementares" e entra na Camada 2 correspondente, sem cópia.
- "Análises Complementares" passa a conter apenas `OverviewStrategicMap` (ação recomendada, item secundário por natureza).

## Critérios de aceite desta auditoria

- Cada problema acima tem componente(s) afetado(s) identificado(s) e proposta correspondente.
- Nenhuma proposta introduz consulta nova, biblioteca de animação, ou mudança de schema/RLS.
- Screenshots reais "antes" anexados (ver `docs/screenshots/sprint-5/before/`), comparação "depois" em `docs/VALIDACAO_VISUAL_SPRINT_5.md` ao final do sprint.
