# CLAUDE_PESQUISAS_04_INTELLIGENCE_COCKPIT — Relatório de Entrega do Cockpit de Inteligência Eleitoral

**Agente:** Antigravity (Pair Programming with User)  
**Prioridade:** P0 — Apresentação Brasília  
**Data:** 2026-08-19 · **Status:** PASS  

---

## 1. Arquivos Alterados
- **`lib/pesquisas/types.ts`**: Adicionados exportes de `NON_CANDIDATE_LABELS`, `isRealCandidate` e extensões de filtro (`period`).
- **`lib/pesquisas/cockpitAnalytics.ts`**: Refinada a ancoragem em `latestResultPoll` para métricas, ranking, perfil amostral e comparações de institutos.
- **`app/dashboard/pesquisas/page.tsx`**: Atualizado para carregar `priorityPollsByRace`, `registeredPolls`, `allResults` e `kpis`.
- **`app/dashboard/pesquisas/components/PesquisasFilterBar.tsx`**: Atualizado para suportar a navegação de 3 áreas (`Cockpit`, `Pesquisas`, `Comparativo`) e seletor de período.
- **`app/dashboard/pesquisas/components/PesquisasCockpitView.tsx`**: Main view integrando o Cockpit, a Base de Pesquisas e a Ferramenta Comparativa.
- **`app/dashboard/pesquisas/[id]/components/PollResultsSection.tsx`**: Restaurada a exibição visual de 1º turno e 2º turno na Ficha Individual.

---

## 2. Componentes Criados
- **`lib/pesquisas/analyticsEngine.ts`**: Engine determinístico de inteligência eleitoral (classificação de situação analítica, sinais e síntese Politix IA).
- **`lib/pesquisas/analyticsEngine.test.ts`**: Suíte de testes unitários do engine analítico.
- **`app/dashboard/pesquisas/components/ExecutiveSnapshotCards.tsx`**: Faixa de KPIs com Líder, Posição #1, Gap, Tendência, Qtd de Pesquisas, Última Pesquisa e **Situação Analítica**.
- **`app/dashboard/pesquisas/components/PolitixAiCard.tsx`**: Card da Inteligência Politix IA com Fato, Tendência e Interpretação.
- **`app/dashboard/pesquisas/components/CenarioEleitoralChart.tsx`**: Gráfico ECharts de observações do período (preserva cada levantamento individual sem médias artificiais).
- **`app/dashboard/pesquisas/components/SinaisCenarioCard.tsx`**: Card de sinais e alertas do cenário (crescimento ↑, queda ↓, estabilidade ↔, redução de gap ⚠).
- **`app/dashboard/pesquisas/components/PesquisasExplicamCenario.tsx`**: Bloco resumido das 3–5 pesquisas chave que sustentam a leitura.
- **`app/dashboard/pesquisas/components/PesquisasListView.tsx`**: Visão completa da Base de Pesquisas com busca, triagem e badges de situação analítica.
- **`app/dashboard/pesquisas/components/PesquisasComparativoView.tsx`**: Ferramenta de comparação lado a lado entre institutos (`Instituto A` vs `Instituto B`).

---

## 3. Componentes Reaproveitados
- `KpiCard` (`@/components/ui/KpiCard`)
- `BarChart` (`@/components/charts/BarChart`)
- `SegundoTurnoSection` (`app/dashboard/pesquisas/components/SegundoTurnoSection.tsx`)
- `EvolucaoTemporalChart` (`app/dashboard/pesquisas/components/EvolucaoTemporalChart.tsx`)
- `PerfilAmostralCard` (`app/dashboard/pesquisas/components/PerfilAmostralCard.tsx`)
- `IntencaoPorPerfilPlaceholder` (`app/dashboard/pesquisas/components/IntencaoPorPerfilPlaceholder.tsx`)
- `PollHeader`, `PollSummaryCards`, `PollSampleProfile`, `PollMethodologySection`, `PollQualityRepresentativeness`, `PollQualityControl`, `PollTerritorialCoverage`, `PollFooterAuditing` na Ficha Individual.

---

## 4. Queries Utilizadas
- `getPriorityRacePolls(uf, cargoLike)`: Busca `electoral_poll_results` via inner join com `electoral_polls` para a corrida selecionada (evitando estourar limites HTTP).
- `listPolls()`: Lista pesquisas registradas para a triagem.
- `listPollResultsWithPoll()`: Traz os resultados com objeto `poll` associado.

---

## 5. Regras de Comparabilidade Preservadas
- Exige correspondência estrita de `cargo`, `abrangencia`, `turno` e `tipoPergunta`.
- Exige que a pesquisa possua um único cenário no turno/tipo (pesquisas com cenários pareados fragmentados são desconsideradas da linha temporal para evitar inferência arbitrária).

---

## 6. Regras de Classificação Analítica (`calculateAnalyticalStatus`)
- **`CRÍTICO`**: Gap para o 2º colocado $\le 3.0$ p.p. OU recuo significativo $\ge 3.0$ p.p.
- **`ATENÇÃO`**: Oscilação negativa com gap estreito ($\le 5.0$ p.p.) OU recuo entre 1.0 e 2.9 p.p.
- **`ESTÁVEL`**: Liderança mantida ou ampliada com margem consistente.
- **`SEM CLASSIFICAÇÃO`**: Ausência de resultados integrados.

---

## 7. Arquitetura da Inteligência Politix IA
- Engine determinístico em `lib/pesquisas/analyticsEngine.ts` que analisa resultados reais e gera síntese executiva dividida em:
  - **Fato**: Posição e percentuais do líder e vice-líder.
  - **Tendência**: Variação em p.p. nas pesquisas comparáveis do período.
  - **Interpretação**: Consistência da vantagem e número de levantamentos que sustentam a leitura.

---

## 8. Comportamento dos Filtros
- Navegação entre 3 abas (`Cockpit`, `Pesquisas`, `Comparativo`).
- Seletor de Período (`30d`, `60d`, `90d`, `2026`, `all`).
- Multi-select compacto de candidatos com checkboxes (não-candidatos explicitamente excluídos).
- Alternador de Turno (`1º Turno` / `2º Turno`) e Tipo (`Estimulada` / `Espontânea`).

---

## 9. Comportamento do Gráfico Principal (Cenário Eleitoral no Período)
- Renderiza um gráfico ECharts com cada levantamento individual como ponto na linha do tempo.
- Preserva cada observação real sem calcular médias simples artificiais.
- Tooltip exibe Instituto, Data, Candidato, %, Amostra e Registro TSE.

---

## 10. Comportamento da Evolução Temporal
- Linha temporal (ECharts) que plota data vs % para séries comparáveis.
- Exibe ferramenta de tooltip e deltas em p.p.
- Para MG: Exibe "Indisponível (Sem histórico comparável)" devido à fragmentação de cenários pareados em abril.

---

## 11. Área: Base de Pesquisas (`PesquisasListView`)
- Triagem estilo PolitixOS Radar com KPIs de topo, busca textual (nº TSE, instituto, UF), filtros de cargo e situação analítica.
- Tabela executiva com badges de **Situação Analítica** (Estável / Atenção / Crítico) e link direto para a Ficha.

---

## 12. Ficha Individual (`/dashboard/pesquisas/[id]`)
- Preserva todos os blocos metodológicos originais.
- Restaurados os gráficos horizontais de 1º Turno (com separação visual de Brancos/Nulos/Indecisos) e os cards de 2º Turno.

---

## 13. Área: Comparativo (`PesquisasComparativoView`)
- Seleção lado a lado entre `Instituto A` e `Instituto B`.
- Tabela comparativa de intenção de voto com delta em p.p., ficha metodológica comparada e leitura de convergência técnica.

---

## 14. Validação P0 — Brasília (Distrito Federal)
- **Governador / DF (Default P0)**:
  - Pesquisa ativa: **Real Time Big Data**
  - Celina Leão: **34.0%**
  - José Roberto Arruda: **22.0%**
  - Gap: **12.0 p.p.**
  - Pesquisas comparáveis: **3**
  - Série temporal real: **Celina (32,4% → 33,4% → 34,0%)**, **Arruda (24,0% → 23,7% → 22,0%)**

---

## 15. Validação — Presidente (Brasil)
- **Presidente / BR**:
  - 2 pesquisas comparáveis com série temporal real: **Lula (39% → 38%)**, **Flávio Bolsonaro (30% → 31%)**.

---

## 16. Validação — Minas Gerais
- **Governador / MG**:
  - Ranking funcional para a pesquisa ativa.
  - Evolução temporal exibe "Indisponível (Sem histórico comparável)", respeitando a incompatibilidade de cenários pareados.

---

## 17. Testes Automáticos
- `npx vitest run --exclude ".claude/worktrees/**"`: **1106 passed | 5 skipped | 0 failed** (100% pass rate).

---

## 18. TypeScript Typecheck
- `npx tsc --noEmit`: **0 erros**.

---

## 19. Next.js Build
- `npm run build`: **Compilação de produção bem-sucedida** (Exit code 0).

---

## 20. Validação Visual & UX Flow
- A interface segue o fluxo executivo: **DADOS → CONTEXTO → TENDÊNCIA → INTELIGÊNCIA → EVIDÊNCIA → DETALHE**.
- Navegação fluida entre Cockpit, Lista e Comparativo.

---

## 21. Gaps Remanescentes
- Matrizes oficiais de cruzamento demográfico (Crosstabs) continuam aguardando integração do TSE (placeholders transparentes mantidos).

---

## 22. Riscos Encontrados
- Nenhum risco técnico detectado. Todos os testes e compilação em ambiente de produção estão verdes.

---

**NÃO FOI REALIZADO PUSH. NÃO FOI REALIZADO DEPLOY.**  
**PRONTO PARA VALIDAÇÃO VISUAL MANUAL DO USUÁRIO.**
