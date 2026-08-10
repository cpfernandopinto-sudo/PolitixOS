# Relatório de Migração de UX/UI — Etapa 2: Radar de Notícias
## PolitixOS: Google Stitch → Aplicação Real

Este documento detalha o processo de migração visual e estrutural da tela de **Radar de Notícias**, alinhando-a ao padrão premium de war room consolidado no Google Stitch e estabelecido na Etapa 1B.

---

### 1. Baseline Encontrado e Inventário
Antes do início dos trabalhos, a branch local contava com os seguintes arquivos e status técnico:
* **TypeScript:** Limpo (0 erros compiler).
* **Testes unitários:** 191 testes passando.
* **Componentes funcionais em `app/dashboard/noticias/`:**
  - `page.tsx`: Componente de servidor que resolve queries de candidatos, cidades, fontes e menções.
  - `NewsGlobalFilters.tsx`: Filtros integrados que atualizam a URL do Next.js.
  - `NoticiasDashboardClient.tsx`: Painel de visualização cliente contendo KPIs, Termômetro, Status em Tempo Real, Feed Crítico, Gráficos (ECharts) e DataTable de Monitoramento.

---

### 2. Matriz de Correspondência Estrutural (Atual × Stitch)

| Bloco Atual | Stitch / Padrão Premium | Ação |
| :--- | :--- | :--- |
| **Cabeçalho (Título/Subtítulo)** | Título "Radar de Notícias", Subtítulo "Monitoramento e análise de risco em notícias e mídia" | **REESTILIZAR/REPOSICIONAR** (Cabeçalho limpo sem breadcrumbs ou duplicação com shell) |
| **Filtros Globais (`NewsGlobalFilters.tsx`)** | Visual limpo, bg escuro `#0B0F19`, alinhamento Geist e Cyan | **REESTILIZAR** (Bordas `border-white/[0.08]`, select styling e busca com focus ciano) |
| **Alertas de Crise (`CrisisAlert.tsx`)** | Estilo premium integrado | **PRESERVAR e REESTILIZAR** (Fundo translúcido e bordas adequadas) |
| **Faixa Executiva de KPIs (5 Cards)** | Cards executivos no estilo Visão Geral | **REESTILIZAR/REAGRUPAR** (Redesenhados com hover premium, acentos de severidade inferiores e legendas descritivas distintas) |
| **Termômetro de Crise** | Lado esquerdo de grid de duas áreas (com Status em Tempo Real) | **REAGRUPAR/REESTILIZAR** (Grid reorganizado, ocupando `lg:col-span-5` de altura `340px`) |
| **Status em Tempo Real** | Lado direito de grid de duas áreas | **REAGRUPAR/REESTILIZAR** (Grid reorganizado, ocupando `lg:col-span-7` de altura `340px`) |
| **Feed Crítico — Últimas** | Linha própria abaixo da camada executiva com alta legibilidade e ações claras | **REPOSICIONAR/REESTILIZAR** (Mover para baixo do grid executivo de primeira dobra, ocupando largura total, linhas compactas, severidade clara, horário e link de Investigação Profunda) |
| **Leitura Analítica (Seção de Gráficos)** | Grid analítico compacto com 5 gráficos | **REESTILIZAR/REAGRUPAR** (Cores hexadecimais do Stitch no ECharts, fontes dos eixos limpas e tooltips integrados) |
| **Base Completa de Monitoramento** | Tabela de monitoramento de alta densidade | **REESTILIZAR** (DataTable compacta, cabeçalho discreto, sentimento/risco com badges e paginação premium) |
| **Ação Investigação Profunda** | CTAs de ação no novo sistema visual | **PRESERVAR e REESTILIZAR** (Ações de CTAs em ciano e bordas arredondadas discretas no DataTable e no feed) |
| **Detalhes da Notícia (NewsDetailModal)** | Modal escuro premium e integrado | **PRESERVAR e REESTILIZAR** (Fundo `#161B26` e botões ciano) |

---

### 3. Alterações Estruturais Implementadas

* **Primeira Dobra (KPIs e Diagnóstico Executivo):**
  - KPI Cards redesenhados para usar `surface-primary` (`#161B26`), borda `#white/[0.08]` e barra de progresso colorida por severidade.
  - Termômetro de Crise e Status em Tempo Real alinhados em grid de 12 colunas (`col-span-5` e `col-span-7`), permitindo rápida visualização comparativa de risco e velocidade do fluxo de notícias.
* **Segunda Dobra (Feed Crítico Protagonista):**
  - O Feed Crítico foi retirado do antigo grid de 3 colunas e posicionado como uma faixa horizontal de largura completa logo abaixo da primeira dobra.
  - Cada item exibe agora de forma linear: severidade, fonte, candidato, data, título resumido, relevância e o botão de **Investigação Profunda** perfeitamente visível.
* **Terceira Camada (Leitura Analítica e Gráficos):**
  - Seção reorganizada com um cabeçalho executivo limpo (ícone de atividade, título Leitura Analítica e legenda explicativa integrados por uma linha sutil).
  - Cards de ECharts e Donut adaptados para utilizar o fundo `#161B26` e as cores de severidade exatas do design (crítico `#FF3B3B`, alto `#FB923C`, atenção `#FACC15`, normal `#22C55E`, ciano `#00FFFF`).
* **Quarta Camada (Monitoramento Detalhado e DataTable):**
  - A tabela de notícias foi compactada para exibir mais registros na viewport com um design profissional (cabeçalho com divisórias sutis, hover suave de linhas, badges circulares de sentimento e CTAs ciano).

---

### 4. Componentes Globais Reutilizados e Preservados

* **Shell Global:** Herança automática da Sidebar lateral unificada (com logo PolitixOS completo e fixo) e Header minimalista (operacional) implementados na Etapa 1B.
* **Lógica e Queries:** Todas as queries em `lib/queries/noticias.ts` (como `getKPIs`, `getGaugeScore`, `getFeedNoticias`, `getRealTimeStatus`) foram mantidas integralmente. Nenhuma linha de lógica de dados foi modificada.
* **Investigação Profunda:** O componente `InvestigationButton` foi mantido inalterado em seu funcionamento operacional de disparo de fluxo e cadastro, sendo integrado visualmente no feed e na tabela.

---

### 5. Validação e Testes Técnicos (Gate 1)

1. **TypeScript compilation:** `npx tsc --noEmit` finalizado com **sucesso** (0 erros de tipagem).
2. **Vitest unit tests:** `npx vitest run --exclude ".claude/**"` finalizado com **sucesso** (todos os 191/191 testes aprovados).
3. **Next.js Production Build:** `npm run build` finalizado com **sucesso** em 4.2 segundos.

---

### 6. Resultado da Comparação Visual (Gate 2)

* **Sidebar & Header:** ALINHADOS (Seguem o shell global aprovado)
* **Primeira Dobra & KPIs:** ALINHADOS (Mesma escala de visualização de war room)
* **Termômetro & Status:** ALINHADOS (Uniformidade de 340px de altura)
* **Feed Crítico:** ALINHADO (Ação de Investigação e tags de severidade visualmente integradas)
* **Leitura Analítica & Gráficos:** ALINHADOS (Paletas semânticas, bordas discretas e tooltips integrados)
* **Base Completa (DataTable):** ALINHADO (Densidade correta e paginação premium)

---

### 7. Arquivos Alterados

* [`app/dashboard/noticias/page.tsx`](file:///Users/fernandooliveirapinto/Library/CloudStorage/GoogleDrive-cp.fernandopinto@gmail.com/Meu%20Drive/_Clientes/PolitixOS/_Git/PolitixOS/app/dashboard/noticias/page.tsx)
* [`app/dashboard/noticias/NewsGlobalFilters.tsx`](file:///Users/fernandooliveirapinto/Library/CloudStorage/GoogleDrive-cp.fernandopinto@gmail.com/Meu%20Drive/_Clientes/PolitixOS/_Git/PolitixOS/app/dashboard/noticias/NewsGlobalFilters.tsx)
* [`app/dashboard/noticias/NoticiasDashboardClient.tsx`](file:///Users/fernandooliveirapinto/Library/CloudStorage/GoogleDrive-cp.fernandopinto@gmail.com/Meu%20Drive/_Clientes/PolitixOS/_Git/PolitixOS/app/dashboard/noticias/NoticiasDashboardClient.tsx)
* [`components/ui/DataTable.tsx`](file:///Users/fernandooliveirapinto/Library/CloudStorage/GoogleDrive-cp.fernandopinto@gmail.com/Meu%20Drive/_Clientes/PolitixOS/_Git/PolitixOS/components/ui/DataTable.tsx)
* [`components/news/NewsDetailModal.tsx`](file:///Users/fernandooliveirapinto/Library/CloudStorage/GoogleDrive-cp.fernandopinto@gmail.com/Meu%20Drive/_Clientes/PolitixOS/_Git/PolitixOS/components/news/NewsDetailModal.tsx)

---

### 8. Etapa 2B — Correção do Shell Global

Esta sub-etapa implementou correções estruturais globais na arquitetura do shell do dashboard, garantindo um comportamento de aplicação desktop premium estável e eliminando os defeitos visuais relatados na validação.

#### Causa dos Problemas Identificados
* **Problema A (Ícone de Notícias/primeiro item cortado):** Na implementação anterior, o deslocamento da `NavigationArea` em relação à `BrandArea` absoluta era feito via margem (`mt-[72px]`) no próprio componente `nav`. No entanto, em layouts baseados em Flexbox com `flex-1` e scroll vertical nativo, a margem superior interagia de forma incorreta com o fluxo do flex container, forçando o primeiro item da navegação para baixo do z-index e limites da `BrandArea` fixa.
* **Problema B (Elementos do Shell acompanhando a rolagem):** O layout de dashboard anterior em `app/dashboard/layout.tsx` usava `min-h-screen`, permitindo que toda a página (incluindo o wrapper global do documento) rolasse verticalmente se o conteúdo principal fosse longo. Com isso, ao rolar a tela do Radar de Notícias, o menu lateral (`Sidebar`) e o `Header` se deslocavam para cima junto com a página, perdendo suas posições fixas.

#### Solução & Arquitetura Corrigida
* **Ajuste na Sidebar (`components/Sidebar.tsx`):**
  - Removido o offset de margem `mt-[72px]` do elemento `nav`.
  - Aplicado o offset diretamente como padding-top (`pt-[72px]`) no container `aside` pai da Sidebar. Isso garante que a `NavigationArea` (fluxo flex) seja renderizada nativamente abaixo dos 72px ocupados pela `BrandArea` (posicionada de forma absoluta), eliminando qualquer risco de sobreposição e cortes do primeiro ícone ("Visão Geral").
  - Adicionado fundo sólido `bg-[#0B0F19]` ao elemento `aside` para evitar qualquer transparência durante transições.
* **Layout Fixo no Viewport (`app/dashboard/layout.tsx`):**
  - Substituído `min-h-screen` por `h-screen w-screen overflow-hidden` no container pai do DashboardLayout.
  - A coluna da direita (Header + Main) foi configurada com `h-screen overflow-hidden`.
  - O container de conteúdo principal (`main` com a classe `.dashboard-main`) foi configurado como a única área com scroll vertical (`flex-1 overflow-y-auto overflow-x-hidden`).
  - Desta forma, a **Sidebar**, a **Brand Area** e o **Header** permanecem perfeitamente travados em suas posições fixas na viewport durante qualquer scroll do conteúdo.
* **Páginas Impactadas:**
  - O ajuste do Shell é global e afeta automaticamente: **Visão Geral** (`/dashboard/overview`), **Radar de Notícias** (`/dashboard/noticias`), **Instagram** (`/dashboard/instagram`), **X** (`/dashboard/x`) e **Investigações** (`/dashboard/investigacoes`), sem requerer duplicações de código.

---

### 9. Confirmação de Integridade Absoluta

```
SUPABASE: NÃO ALTERADO
QUERIES: NÃO ALTERADAS
APIS: NÃO ALTERADAS
LOGICA DE NEGÓCIO: NÃO ALTERADA
N8N: NÃO ALTERADO
WORKFLOWS: NÃO ALTERADOS
PUSH: NÃO REALIZADO
PR: NÃO REALIZADO
DEPLOY: NÃO REALIZADO
```
