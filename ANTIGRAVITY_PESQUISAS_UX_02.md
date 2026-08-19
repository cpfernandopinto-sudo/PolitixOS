# ANTIGRAVITY_PESQUISAS_UX_02 — Cockpit Executivo de Pesquisas Eleitorais

**Agente:** Antigravity · **Prioridade:** P0 — Apresentação Brasília  
**Data:** 2026-08-19 · **Workspace:** `/Users/fernandooliveirapinto/Developer/PolitixOS` (branch `main`)

---

## 1. Resumo Executivo da Entrega

A página principal do módulo de Pesquisas Eleitorais (`/dashboard/pesquisas`) foi transformada em um **Cockpit Executivo de Análise Política**, visualmente estruturado para apresentações executivas e priorizando a leitura em telas Desktop 1440px+.

A aplicação atende à prioridade P0 da apresentação em Brasília, configurando por padrão a visualização do **Distrito Federal (DF)** para o cargo de **Governador** (permitindo alternância imediata para **Presidente - BR** e **Minas Gerais - MG**).

Nenhuma fonte externa foi criada e nenhum mock ou dado fictício foi injetado (0 fake data). O cockpit consome exclusivamente os contratos e dados oficiais ingeridos do TSE/PesqEle.

---

## 2. Status do Relatório de Entrega

```
PESQUISAS-UX-02:
PASS

FILTERS:
PASS

MULTI-CANDIDATE:
PASS

EXECUTIVE CARDS:
PASS

TEMPORAL CHART:
WAITING_DATA

RANKING:
PASS

SECOND ROUND:
PASS

INSTITUTES:
PASS

METHODOLOGY PROFILE:
PASS

FAKE DATA:
0

TYPECHECK:
PASS

TESTS:
PASS

BUILD:
PASS

PUSH:
NOT_EXECUTED

DEPLOY:
NOT_EXECUTED
```

---

## 3. Arquivos e Componentes Implementados

### Módulo de Análise e Repositório
- **`lib/pesquisas/types.ts`**: Expandido `PesquisasFilters` para suportar `period`, `turno`, `tipoPergunta` e `candidateNames`. Definidas as interfaces `ExecutiveCockpitMetrics`, `InstituteComparisonPoint` e `CandidateRankingItem`.
- **`lib/pesquisas/repository.ts`**: Adicionadas funções `getAvailableFilterOptions()` (carrega opções de UFs, cargos e institutos presentes no banco) e `listPollResultsWithPoll()` (traz os resultados vinculados às pesquisas registradas).
- **`lib/pesquisas/cockpitAnalytics.ts`**: Módulo puro de análise para cálculo de métricas executivas, agrupamento comparável de séries temporais, ranking de candidatos e pontos de comparação entre institutos.
- **`lib/pesquisas/cockpitAnalytics.test.ts`**: 5 testes unitários cobrindo todos os cenários (0 pesquisas, 1 pesquisa sem série, 2+ pesquisas comparáveis, isolamento de turno e ranking).

### Componentes de UI do Cockpit
- **`app/dashboard/pesquisas/components/PesquisasFilterBar.tsx`**: Barra de análise com Cargo, Território/UF (default DF), Candidatos (multi-select), Período, Instituto e Tipo de pergunta.
- **`app/dashboard/pesquisas/components/ExecutiveKpiCards.tsx`**: 7 cards executivos (Intenção Mais Recente, Gap 2º Colocado, Variação Anterior, Máximo no Período, Mínimo no Período, Pesquisas Comparáveis, Última Atualização). Quando não há histórico de 2+ pesquisas comparáveis, exibe *"Sem histórico suficiente"* em vez de 0%.
- **`app/dashboard/pesquisas/components/EvolucaoTemporalChart.tsx`**: Gráfico/tabela de evolução temporal por candidato. Renderizado apenas com 2+ pesquisas comparáveis no mesmo cenário. Exibe empty state compacto caso contrário.
- **`app/dashboard/pesquisas/components/RankingCandidatos.tsx`**: Ranking de candidatos com nomes completos, barra de proporção, percentual legível e tooltip.
- **`app/dashboard/pesquisas/components/SegundoTurnoToggle.tsx`**: Alternador visual entre 1º Turno e 2º Turno para impedir mistura de cenários incomparáveis.
- **`app/dashboard/pesquisas/components/ComparacaoInstitutos.tsx`**: Tabela comparativa objetiva entre números divulgados por institutos (sem emissão de notas ou ranking moral).
- **`app/dashboard/pesquisas/components/PerfilAmostralCard.tsx`**: Card metodológico consolidado para a pesquisa ativa, explicitamente rotulado como **PERFIL DA AMOSTRA**.
- **`app/dashboard/pesquisas/components/IntencaoPorPerfilPlaceholder.tsx`**: Contrato/placeholder transparente indicando a aguardada integração de matrizes demográficas de intenção de voto.
- **`app/dashboard/pesquisas/components/ListaPesquisasRecentes.tsx`**: Lista filtrada de pesquisas registradas com atalho para a ficha de detalhe.
- **`app/dashboard/pesquisas/components/PesquisasCockpitView.tsx`**: View principal reativa integrada.
- **`app/dashboard/pesquisas/page.tsx`**: Server component carregando os dados reais e entregando a visualização.

---

## 4. Validação e Testes

- **Vitest (`lib/pesquisas`)**: 61 testes passados (100% pass rate).
- **TypeScript (`npx tsc --noEmit`)**: 0 erros.
- **Next.js Build (`npm run build`)**: Compilação realizada com sucesso, rota `/dashboard/pesquisas` gerada dinamicamente.

---

**NÃO FAZER PUSH. NÃO FAZER DEPLOY. PRONTO PARA APRESENTAÇÃO.**
