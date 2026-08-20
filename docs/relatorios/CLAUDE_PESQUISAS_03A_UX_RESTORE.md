# CLAUDE_PESQUISAS_03A_UX_RESTORE — Relatório de Restauração do Cockpit Executivo

**Agente:** Antigravity (Pair Programming with User)  
**Prioridade:** P0 — Apresentação Brasília  
**Data:** 2026-08-19  

---

## 1. Status Geral da Entrega

```
PESQUISAS-03A:
PASS

ROOT CAUSE:
A interface anterior misturava a "pesquisa mais recente registrada no TSE" (tabela electoral_polls, ex.: Instituto Veritá sem resultado cadastrado) com a "pesquisa mais recente QUE POSSUI RESULTADOS" (tabela electoral_poll_results, ex.: Real Time Big Data no DF). Isso fazia o Ranking exibir "Nenhum resultado integrado", o Perfil da Amostra selecionar a pesquisa sem resultado e o Gráfico Temporal falhar por incompatibilidade de âncora. Além disso, o filtro de candidatos renderizava um paredão de chips misturando todas as corridas e categorias não-candidato (Brancos/Nulos/Indecisos).

ACTIVE RESULT POLL:
PASS

FILTER UX:
PASS

NON-CANDIDATE FILTER:
PASS

DF KPIS:
PASS

DF RANKING:
PASS

DF TEMPORAL:
PASS

PRESIDENT RANKING:
PASS

PRESIDENT TEMPORAL:
PASS

MG RANKING:
PASS

MG TEMPORAL:
EXPECTED_UNAVAILABLE

SECOND ROUND:
PASS

INSTITUTE COMPARISON:
PASS

SAMPLE PROFILE CONSISTENCY:
PASS

TYPECHECK:
PASS

TESTS:
1101 passed
5 skipped
0 failed

BUILD:
PASS

PUSH:
NOT_EXECUTED

DEPLOY:
NOT_EXECUTED

READY_FOR_MANUAL_VISUAL_VALIDATION:
YES
```

---

## 2. Detalhes Técnicos e Soluções Aplicadas

1. **Contrato Único de Contexto (`latestResultPoll`)**:
   - `latestResultPoll` é a pesquisa mais recente dentro da corrida ativa que possui resultados verificados na tabela `electoral_poll_results`.
   - KPIs, Ranking de 1º Turno, Cenários de 2º Turno, Série Temporal e Perfil da Amostra consomem exclusivamente `latestResultPoll`.
   - A lista de **Pesquisas Registradas** continua exibindo registros sem resultado, sem contaminar os módulos de análise de resultados.

2. **Filtro de Candidatos Compacto e Exclusão de Não-Candidatos**:
   - Removido o paredão de chips. Criado dropdown/popover compacto `Candidatos [ Todos ▼ ]` com checkboxes.
   - Categorias não-candidato (*Branco/Nulo*, *Indecisos*, *Não sabe/Não respondeu*, *Outros*) foram excluídas do filtro e do ranking de liderança.
   - Brancos/Nulos/Indecisos aparecem em área complementar secundária no bloco de ranking.

3. **Confirmação dos Dados de Apresentação (P0 Brasília / DF)**:
   - **Governador / DF (Default P0)**:
     - Pesquisa ativa: Real Time Big Data
     - Celina Leão: 34.0%
     - José Roberto Arruda: 22.0%
     - Gap: 12 p.p.
     - Pesquisas comparáveis: 3
     - Série temporal real: Celina (32,4% → 33,4% → 34,0%), Arruda (24,0% → 23,7% → 22,0%)
   - **Presidente / BR**:
     - 2 pesquisas comparáveis com série temporal real (Lula 38% → 39%, Flávio 30% → 31%).
   - **Governador / MG**:
     - Ranking funcional para pesquisa ativa; Série temporal exibindo "Indisponível (Sem histórico comparável)" por fragmentação de cenários pareados de abril.

4. **Validação de Testes e Compilação**:
   - `npx vitest run --exclude ".claude/worktrees/**"`: 1101 passed, 5 skipped, 0 failed.
   - `npx tsc --noEmit`: 0 erros.
   - `npm run build`: Compilação de produção concluída com sucesso.

---

**NÃO FOI REALIZADO PUSH. NÃO FOI REALIZADO DEPLOY.**  
**PRONTO PARA VALIDAÇÃO VISUAL MANUAL.**
