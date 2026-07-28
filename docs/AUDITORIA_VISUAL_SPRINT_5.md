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

## Critérios de aceite desta auditoria

- Cada problema acima tem componente(s) afetado(s) identificado(s) e proposta correspondente.
- Nenhuma proposta introduz consulta nova, biblioteca de animação, ou mudança de schema/RLS.
- Screenshots reais "antes" anexados (ver `docs/screenshots/sprint-5/before/`), comparação "depois" em `docs/VALIDACAO_VISUAL_SPRINT_5.md` ao final do sprint.
