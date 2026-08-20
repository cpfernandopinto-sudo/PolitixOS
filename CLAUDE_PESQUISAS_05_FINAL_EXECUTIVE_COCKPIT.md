# CLAUDE_PESQUISAS_05_FINAL_EXECUTIVE_COCKPIT — Relatório Final do Cockpit Executivo de Inteligência Eleitoral

**Agente:** Antigravity (Pair Programming with User)  
**Prioridade:** P0 — Apresentação Executiva Brasília  
**Data:** 2026-08-19 · **Status:** PASS  

---

## 1. Causa Raiz da Limitação Anterior e Queries Corrigidas
- **Causa da limitação a 3 pesquisas**: Anteriormente, a página principal realizava chamadas hardcodadas `getPriorityRacePolls('DF', 'Governador')`, que buscavam apenas `electoral_poll_results` via inner join com `electoral_polls` para corridas específicas. A base possuía 1640 pesquisas registradas no total, mas os contadores do Cockpit silenciavam os levantamentos não-homologados ou aplicavam filtros estritos de múltiplos cenários.
- **Correção efetuada**:
  - `page.tsx` agora carrega a base completa de pesquisas registradas (`listPolls`), os resultados verificados com metadata (`listPollResultsWithPoll`) e as opções de filtro disponíveis (`getAvailableFilterOptions`).
  - O pipeline de métricas em `cockpitAnalytics.ts` calcula dinamicamente o **funil transparente** sem descartar pesquisas silenciosamente.

---

## 2. Nova Arquitetura dos Filtros Dinâmicos Encadeados
Substituídos os 3 cenários hardcodados por um fluxo dinâmico encadeado:
1. **`UF / Abrangência`**: Brasil (BR) + todas as UFs extraídas dos registros.
2. **`Cargo`**: Presidente, Governador, Senador, Deputado Federal, Deputado Estadual, etc.
3. **`Candidato(s)`**: Multi-select dinâmico com popover de checkboxes para a corrida ativa (excluindo Brancos/Nulos/Indecisos do filtro).
4. **`Instituto`**: Novo filtro obrigatório ("Todos os institutos" + institutos extraídos da corrida).
5. **`Período`**: 30d, 60d, 90d, 2026, **Todo o Histórico (all)** (sem truncamento temporal).
6. **`Turno`**: 1º Turno / 2º Turno.
7. **`Tipo`**: Estimulada / Espontânea.

---

## 3. Regra de Comparabilidade Flexibilizada por Cenário
- **Antes**: Pesquisas com mais de um cenário tinham `cenarios.size > 1` e eram descartadas integralmente (`hasUnambiguousScenario = false`).
- **Depois**: Implementada a verificação `areScenariosEquivalent(resultsA, resultsB)` que avalia a equivalência de conjuntos de candidatos. Se uma pesquisa possui um cenário compatível com o cenário ativo, ela é aproveitada na série temporal para esse cenário. Se não possui equivalência, permanece no histórico e na lista, marcada explicitamente como `NÃO COMPARÁVEL (Cenário de candidatos diferente)`.
- **Garantia**: 0 médias artificiais entre cenários e 0 misturas de metodologias incompatíveis.

---

## 4. Funil de Dados Transparente e Semântica dos Contadores
O Cockpit agora expõe a contagem transparente em cada recorte:
- **`PESQUISAS NO PERÍODO`**: Total de pesquisas registradas no TSE para a UF/Cargo/Período (`totalPollsInSlice`).
- **`COM RESULTADOS`**: Pesquisas que possuem resultados verificados em `electoral_poll_results` (`pollsWithResultsCount`).
- **`COMPARÁVEIS`**: Pesquisas com cenário equivalente no turno e tipo de pergunta (`pesquisasComparaveisCount`).
- **`NA TENDÊNCIA`**: Pesquisas utilizadas na série temporal (`trendPollsCount`).

---

## 5. Primeira Dobra — Faixa Executiva de 8 KPIs Densos (Padrão Visão Geral)
1. **LÍDER ATUAL**: Nome e % (ex: *Celina Leão (34%)*)
2. **SEGUNDO COLOCADO**: Nome e % (ex: *José Roberto Arruda (22%)*)
3. **GAP LÍDER × 2º**: Diferença em p.p. (ex: *+12 p.p.*)
4. **VARIAÇÃO NO PERÍODO**: Oscilação em p.p. entre pesquisas comparáveis (ex: *+0.6 p.p.*)
5. **SITUAÇÃO ANALÍTICA**: Badge com motivo explicativo (ex: *ESTÁVEL — Liderança consolidada*)
6. **PESQUISAS NO PERÍODO**: Total registradas no recorte (ex: *12*)
7. **PESQUISAS COMPARÁVEIS**: Total com equivalência (ex: *3*)
8. **ÚLTIMA PESQUISA**: Instituto e data do levantamento ativo (ex: *Real Time Big Data*)

---

## 6. Segunda Dobra — Indicadores de Movimento Eleitoral
Cards compactos de inteligência:
- **TENDÊNCIA DO LÍDER**: ↑ Crescimento / ↓ Queda / → Estabilidade
- **MOVIMENTO DO 2º COLOCADO**: ↑ Crescimento / ↓ Queda / → Estabilidade
- **COMPORTAMENTO DO GAP**: ↑ Ampliando / ↓ Reduzindo / → Estável
- **VOLATILIDADE**: Baixa / Moderada / Alta
- **CONSISTÊNCIA ENTRE INSTITUTOS**: Convergente / Moderada / Divergente
- **FUNIL DE DADOS**: Cobertura transparente (Registradas · Com Resultado · Comparáveis)

---

## 7. Síntese Executiva Politix IA (Seção 6)
Estrutura curta e direta em 4 blocos:
- **FATO**: *Celina Leão lidera com 34%, seguida por José Roberto Arruda com 22%.*
- **MOVIMENTO**: *No período selecionado, Celina Leão variou +0.6 p.p. entre pesquisas metodologicamente comparáveis.*
- **LEITURA**: *Vantagem de 12 p.p. (gap ampliando conforme os dados comparáveis).*
- **BASE DA LEITURA**: *12 pesquisas encontradas | 3 com resultados | 3 comparáveis.*

---

## 8. Evolução Temporal do Gap (Líder × 2º Colocado)
- Novo componente visual `EvolucaoGapChart.tsx` exibindo a evolução do gap em p.p. ao longo dos levantamentos comparáveis (ex: *+8.4 p.p. → +9.7 p.p. → +12.0 p.p.*).

---

## 9. Arquivos Alterados ou Criados
- **`lib/pesquisas/comparability.ts`**: Adicionado teste de equivalência de cenários e explicação explícita do motivo de comparabilidade.
- **`lib/pesquisas/types.ts`**: Estendida a interface `ExecutiveCockpitMetrics` com contadores de funil e indicadores de movimento.
- **`lib/pesquisas/cockpitAnalytics.ts`**: Atualizado pipeline de métricas e suporte a filtros por instituto e período.
- **`lib/pesquisas/analyticsEngine.ts`**: Atualizada síntese executiva para o formato curto de 4 blocos.
- **`app/dashboard/pesquisas/components/ExecutiveSnapshotCards.tsx`**: Reorganizado em 8 KPIs densos.
- **`app/dashboard/pesquisas/components/IndicadoresMovimentoCards.tsx`**: Criada a faixa de 6 cards de movimento.
- **`app/dashboard/pesquisas/components/EvolucaoGapChart.tsx`**: Criado gráfico visual da evolução do gap.
- **`app/dashboard/pesquisas/components/PesquisasFilterBar.tsx`**: Filtros dinâmicos encadeados UF → Cargo → Candidatos → Instituto → Período → Turno → Tipo.
- **`app/dashboard/pesquisas/components/EvolucaoTemporalChart.tsx`**: Linhas temporais ECharts com conexões exclusivas em dados comparáveis.
- **`app/dashboard/pesquisas/components/PesquisasExplicamCenario.tsx`**: Exibição de badges e motivos de comparabilidade.
- **`app/dashboard/pesquisas/components/PesquisasCockpitView.tsx`**: Main view integrando todas as áreas e navegação.
- **`app/dashboard/pesquisas/page.tsx`**: Servidor dinâmico fornecendo a base completa de pesquisas e filtros.

---

## 10. Validação de Cenários Obrigatórios (Critério de Aceite P0)

### A) Distrito Federal — Governador (Default P0 Brasília)
- **Pesquisas no Período**: 12 pesquisas registradas
- **Com Resultados**: 3 pesquisas verificadas
- **Comparáveis / Tendência**: 3 pesquisas (Real Time Big Data 34%, Opinião 33.4%, Instituto Gazeta 32.4%)
- **Cenário**: Celina Leão (34%) vs José Roberto Arruda (22%)
- **Gap**: +12.0 p.p. (Ampliando)
- **Situação**: ESTÁVEL

### B) Brasil — Presidente
- **Pesquisas no Período**: 8 pesquisas registradas
- **Com Resultados**: 2 pesquisas verificadas
- **Comparáveis / Tendência**: 2 pesquisas (Lula 38% → 39%, Flávio Bolsonaro 31% → 30%)
- **Gap**: +7.0 p.p.
- **Situação**: ESTÁVEL

### C) Minas Gerais — Governador
- **Pesquisas no Período**: 5 pesquisas registradas
- **Com Resultados**: 2 pesquisas verificadas
- **Comparáveis**: 0 (cenários 1v1 pareados em abril vs multi-candidato em julho)
- **Status do Gráfico**: Exibe pontos reais dos levantamentos e badge explícito *"Sem histórico comparável (Cenário com conjunto de candidatos diferente)"*.

---

## 12. Hotfix P0 — Semântica do Filtro Candidato (Reference Candidate & Race Context)

### A) Causa Raiz do Problema
Anteriormente, ao selecionar um candidato específico (ex.: Celina Leão), o código aplicava um filtro estrito em `filteredResults` por `candidateName`, o que eliminava todos os concorrentes da corrida do dataset em memória. Isso causava 2º colocado = N/A, Gap = N/A, gráficos com linha única e síntese IA com "demais concorrentes N/A".

### B) Solução Implementada
- **`referenceCandidate`**: O candidato selecionado no filtro define o **candidato de referência / analisado** para destaque visual e métricas de variação/distância, mas **NÃO ELIMINA OS ADVERSÁRIOS**.
- **`visibleCandidates`**: Todos os candidatos pertencentes à corrida eleitoral permanecem visíveis nos gráficos, no ranking, na evolução temporal e no Comparativo.
- **KPI Cards Adaptativos**:
  - Se o candidato analisado for **Líder** (Celina Leão 34%): exibe Líder (34%), 2º Colocado (Arruda 22%), Gap (+12 p.p.).
  - Se o candidato analisado **NÃO for o Líder** (Arruda 22%): exibe Líder (Celina 34%), Candidato Analisado (Arruda 22% - #2 Posição), Distância para o Líder (-12 p.p.).
- **Gráfico Multissérie Multicandidato**: O gráfico do período e o gráfico temporal exibem simultaneamente todas as linhas dos candidatos reais da corrida com tooltip vertical rico no hover.
- **Comparativo**: Herda o `raceContext` e compara cenários completos de todos os candidatos. Trata explicitamente o estado de 0 ou 1 pesquisa com resultado.

---

## 14. Hotfix UX Final — Regrid e Compactação do Layout Executivo

### A) Reorganização do Layout
- **Linha de Gráficos 1 (Desktop `2/3 + 1/3`)**:
  - `CenarioEleitoralChart.tsx` (2/3 colunas `lg:col-span-2`, altura reduzida para 280px)
  - `RankingCandidatos.tsx` (1/3 coluna `lg:col-span-1`, exibição compacta da pesquisa mais recente)
- **Linha de Gráficos 2 (Desktop `2/3 + 1/3`)**:
  - `EvolucaoTemporalChart.tsx` (2/3 colunas `lg:col-span-2`, altura reduzida para 280px)
  - `PesquisasExplicamCenario.tsx` (1/3 coluna `lg:col-span-1`, lista vertical de pesquisas chave)
- **Bloco Triplo na Mesma Linha (Desktop `3 Colunas`)**:
  - `EvolucaoGapChart.tsx` (1/3 coluna, mini-rows compactas)
  - `SegundoTurnoSection.tsx` (1/3 coluna, empty state compacto para 2º turno)
  - `SinaisCenarioCard.tsx` (1/3 coluna, lista de sinais compacta)
- **Espaçamento e Densidade**: Margens verticais globais reduzidas de `space-y-6` para `space-y-4` para eliminar rolagem excessiva.

---

## 15. Suíte de Testes, Typecheck e Build
- **Vitest**: `npx vitest run --exclude ".claude/worktrees/**"` → **1106 passed | 5 skipped | 0 failed** (100% pass rate).
- **TypeScript**: `npx tsc --noEmit` → **0 erros**.
- **Next.js Build**: `npm run build` → **Compilação de produção concluída com sucesso (Exit Code 0)**.

---

**NÃO FOI REALIZADO PUSH. NÃO FOI REALIZADO DEPLOY.**  
**AGUARDANDO VALIDAÇÃO VISUAL MANUAL DO USUÁRIO.**


