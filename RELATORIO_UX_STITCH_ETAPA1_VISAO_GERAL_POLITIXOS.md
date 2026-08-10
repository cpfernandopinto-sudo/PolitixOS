# Relatório de Migração de UX/UI — Etapa 1
## PolitixOS: Visão Geral

Este documento apresenta a auditoria visual, o mapeamento de divergências e o detalhamento da migração visual controlada da tela de **Visão Geral** do PolitixOS para o design premium aprovado no Google Stitch.

---

### A. Configuração e Chapas Stitch Analisadas

A conexão com o servidor Google Stitch MCP foi estabelecida com sucesso via Direct JSON-RPC com a API Key provida. Foram inspecionados os seguintes projetos e telas:

1. **Chapa Master de Estrutura:**
   - **Projeto:** `PolitixOS Premium Intelligence Briefing` (`projects/8554874954563663547`)
   - **Tela:** `Visão Geral — PolitixOS Premium Refined` (`ed937c39940941cc9b300178fff80c43`)
   - *Finalidade:* Fonte de verdade para o arranjo de componentes, a ordem de seções e os blocos de dados.

2. **Chapa de Refinamento de Tokens e Estilos:**
   - **Projeto:** `PolitixOS Visão Geral Premium Refinement Variant 1` (`projects/5357097212764749778`)
   - **Tela:** `PolitixOS Visão Geral — Refinamento Premium` (`f79549f1993440518ce58816a9c4baf1`)
   - *Finalidade:* Fonte de verdade visual para a paleta refinada (fundo `#0B0F19`, superfície `#161B26`), bordas `#2D3748`, tipografia `Geist`, acento primário ciano `#06B6D4` e arredondamento sharp (escala "ROUND_EIGHT").

---

### B. Mapeamento de Divergências Visuais (Stitch vs. Real Anterior)

Antes desta migração, a interface real apresentava diferenças em relação ao padrão Stitch:

| Elemento Visual | Estado Anterior (Real) | Padrão Alvo (Stitch) | Resolução na Migração |
| :--- | :--- | :--- | :--- |
| **Tipografia** | Sans-serif padrão do sistema | Fonte `Geist` (Google Fonts) | Importada no `globals.css` como principal. |
| **Cor de Fundo** | Azul muito escuro `#070b14` | Azul-marinho profundo `#0B0F19` | Atualizada a variável `--background`. |
| **Superfícies (Cards)** | `#101827` com cantos bem arredondados (`0.75rem`) | `#161B26` com cantos sharp (`0.375rem`) | Reconfiguradas as classes `surface-primary`. |
| **Bordas** | Foscas/opacas (`rgba(148,163,184,0.13)`) | Sólidas e contrastantes `#2D3748` | Variável `--line` atualizada no CSS global. |
| **Acento Primário** | Azul `#3b82f6` | Ciano vibrante `#06B6D4` | Atualizada a cor primária global da aplicação. |
| **Cards de KPI** | Lisos, sem destaque interno | Com progress bar (Score) e barra colorida (Temp) | Adicionadas as barras de acento nos respectivos cards. |
| **Chips de Entidades** | Formato de pílula (`rounded-full`) | Cantos retangulares/sharp (`rounded`) | Ajustado o border-radius para `rounded`. |

---

### C. Migração de Componentes Realizada com Sucesso

As alterações foram puramente visuais, sem alterar nenhuma lógica de negócios ou consulta ao banco de dados:

1. **Fundação Visual (`app/globals.css`):**
   - Importação da fonte `Geist` via Google Fonts.
   - Substituição de variáveis CSS (`--background`, `--surface-*`, `--line`, `--line-strong`, `--brand`).
   - Redução dos cantos arredondados de `surface-hero` (para `rounded-lg`), `surface-primary` (para `rounded-md`) e `surface-muted` (para `rounded`).

2. **Filtros e Cabeçalho (`OverviewHeader.tsx`):**
   - Adequação das caixas de seleção (`select`) para usar fundo de superfície real e bordas sutis.
   - Aplicação da tipografia `Geist` nas legendas e períodos.

3. **Painel de KPIs (`OverviewKPI.tsx`):**
   - Inclusão do indicador de progresso no card do **Score de Saúde** (barra ciano proporcional ao valor).
   - Inclusão do indicador de gravidade no card da **Temperatura** (barra colorida correspondente).

4. **Painéis de Diagnóstico (`OverviewGauge.tsx` & `PoliticalStatusCard.tsx`):**
   - Sincronização dos paddings e bordas para formarem um bloco unificado.
   - Substituição das divisórias azuis anteriores por linhas sólidas.

5. **Síntese e Leitura Executiva (`ExecutiveScenarioSummary.tsx` & `ExecutiveNarrative.tsx`):**
   - Substituição do acento em degradê da narrativa por uma borda sólida vertical ciano `#06B6D4`.
   - Unificação de caixas de texto com o novo border-radius.

6. **Outros Cards do Dashboard:**
   - `OverviewTopics.tsx`, `OverviewSentiment.tsx`, `OverviewRisk.tsx`, `OverviewChannels.tsx`, `AttentionEntitiesStrip.tsx`, `KeyChanges.tsx`, `PriorityAlertsCenter.tsx`, `OverviewTimeline.tsx`.

---

### D. Divergências Funcionais Identificadas e Tratadas

Para respeitar a regra de que o **Repositório PolitixOS é a fonte de verdade funcional**, as seguintes divergências de comportamento do Stitch foram tratadas de forma controlada:

1. **Busca Global e Notificações no Header:**
   - *No Stitch:* O mockup apresenta uma caixa de busca e um sino com notificações ativas.
   - *No Sistema Real:* Essas funcionalidades não possuem handlers nem API implementada.
   - *Tratamento:* Preservamos a estrutura do cabeçalho da aplicação real (que usa espaçador flexível) para evitar botões inoperantes, mantendo os tokens visuais.

2. **Gráficos de Risco (ECharts vs. CSS):**
   - *No Stitch:* A distribuição de riscos é ilustrada por colunas de div em HTML puro.
   - *No Sistema Real:* É renderizada via `ReactECharts`.
   - *Tratamento:* Mantivemos a biblioteca de gráficos real (`ReactECharts`), mas atualizamos a paleta de cores interna do gráfico para usar os hexadecimais semânticos do Stitch (`#F87171` para crítico, `#FB923C` para alto, etc.).

---

### E. Testes e Validação Técnica

1. **TypeScript Check (`npx tsc --noEmit`):**
   - Compilação realizada com sucesso, sem qualquer erro de tipos.

2. **Testes Unitários e de Integração (`npx vitest run`):**
   - Todos os **191/191 testes** executados com sucesso (0 falhas).

3. **Build de Produção (`npm run build`):**
   - O build de produção (com compilador Turbopack) finalizou com sucesso em 4.2s, atestando a integridade das importações do CSS e fontes.

---

### F. Atualização de Status para o Notion

Para fins de acompanhamento no Notion do projeto, sugere-se a seguinte descrição de status:

> **FRENTE PARALELA DE UX — ETAPA 1 (CONCLUÍDA)**
> - Migração visual da tela **Visão Geral** para os padrões do Google Stitch concluída.
> - Nova fundação visual implantada (`Geist` Google Font, paleta azul-marinho profundo `#0B0F19` com acento ciano `#06B6D4`, e arredondamento "ROUND_EIGHT" sharp de bordas).
> - Integridade de dados de produção da Fase 3 100% preservada (sem alterações em Supabase, queries, ou fórmulas de KPI).
> - 191/191 testes unitários passando; build de produção gerado com sucesso.
