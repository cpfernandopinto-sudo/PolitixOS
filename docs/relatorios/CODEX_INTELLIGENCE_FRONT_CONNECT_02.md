# POLITIXOS — INTELLIGENCE-FRONT-CONNECT-02

**Data:** 17/08/2026  
**Modo:** integration-only / minimal-change  
**Deploy:** não executado

## 1. Resultado executivo

Os contratos canônicos de inteligência territorial foram conectados às três superfícies executivas do Politix Territórios:

- **Command Center:** consome `buildTerritoryExecutiveSignals`.
- **Briefing Executivo:** consome `buildTerritoryExecutiveBriefing` em runtime, com `llmSynthesis: null`.
- **Radar Territorial:** consome `buildTerritoryRadar` e só exibe signals `ACTIVE` com `evidenceRefs`.

Foi criado um runtime server-side único, indexado exclusivamente por `territory_id`, que carrega os dados oficiais já persistidos, monta Facts e Signals e entrega os três contratos sem recalcular metodologias no frontend.

## 2. Arquivos alterados

- `lib/territorios/intelligence/territory-runtime.ts`
- `lib/territorios/intelligence/frontend-connect.test.ts`
- `app/dashboard/territorios/[ibge]/page.tsx`
- `app/dashboard/territorios/[ibge]/briefing/page.tsx`
- `app/dashboard/territorios/[ibge]/radar/page.tsx`
- `docs/relatorios/CODEX_INTELLIGENCE_FRONT_CONNECT_02.md`

## 3. Integração por domínio

### Economia

Fluxo: série canônica Novo CAGED → `buildCagedFacts` → `buildCagedEmploymentSignals` → Command Center / Briefing / Radar.

- MoM, R12, tendência, aceleração, pico e mínimo não são recalculados na camada visual.
- A consulta usa `territory_id` exato.
- Ausência de série resulta em estado indisponível, sem fallback cruzado.

### Eleitoral

Fluxo: indicadores/evidências TSE → `buildElectionTerritoryAnalysis` → `buildElectoralTerritoryIntelligence` → `buildElectoralFacts` → `buildElectoralAnalyticalSignals`.

- O caderno/repositório eleitoral existente foi preservado.
- As classes `DIRECTLY_SUPPORTED`, `MULTI_SIGNAL_SUPPORTED` e `LIMITED_CONTEXT` permanecem no contrato.
- Não há classificação político-partidária de risco/oportunidade inventada.

### Segurança

Fluxo: chaves reais do catálogo SEJUSP-MG → `buildSecurityFacts` → `buildSecurityIndicatorSignals` / `buildSecurityCategoryShiftSignal`.

- Nenhuma nova chave foi criada.
- Nenhum threshold foi alterado.
- Nenhum provider LLM/Gemini foi conectado.
- Facts podem estar disponíveis sem que exista signal ativo: isso é um resultado metodologicamente válido.

## 4. Correções de frontend

- Removida a síntese ad hoc do Command Center.
- Removidos hashes fictícios e sinal demonstrativo da Visão Geral.
- Removida a consulta inválida de `territory_briefings.codigo_ibge`; o briefing agora é montado diretamente pelo contrato canônico usando o UUID territorial já resolvido.
- Removida a dependência de `CONTAGEM_DEMO` nas três superfícies integradas.
- Radar demonstrativo substituído por itens mensuráveis reais; sem signals, mostra estado vazio.
- A estrutura visual existente foi mantida: cards, navegação, cores e tipografia não foram redesenhados.

## 5. Auditoria de isolamento municipal

Todas as consultas do novo runtime aplicam igualdade por `territory_id`. Homologação somente-leitura no Supabase:

| Município | IBGE | Economia MTE | Eleitoral TSE | Segurança SEJUSP | Último saldo CAGED |
|---|---:|---:|---:|---:|---:|
| Belo Horizonte | 3106200 | 540 registros | 3.826 | 154 | 1.146 em 2026-06 |
| Betim | 3106705 | 540 registros | 1.575 | 154 | 1.356 em 2026-06 |
| Contagem | 3118601 | 540 registros | 1.838 | 154 | 914 em 2026-06 |
| Nova Lima | 3144805 | **0 registros** | 717 | 154 | **indisponível** |

Conclusão: Nova Lima não recebeu o CAGED de Contagem; a ausência real foi preservada.

## 6. Homologação do runtime

| Município | Economy Facts | Electoral Facts | Security Facts | Economy Signal | Electoral Signal | Security Signal | Briefing | Radar |
|---|---:|---:|---:|---|---|---|---:|---:|
| Belo Horizonte | 11 | 26 | 13 | AVAILABLE | AVAILABLE | INSUFFICIENT_DATA | 3 | 5 |
| Betim | 11 | 45 | 13 | AVAILABLE | AVAILABLE | INSUFFICIENT_DATA | 3 | 19 |
| Contagem | 11 | 26 | 13 | AVAILABLE | AVAILABLE | INSUFFICIENT_DATA | 3 | 5 |
| Nova Lima | 0 | 45 | 13 | INSUFFICIENT_DATA | AVAILABLE | AVAILABLE | 3 | 19 |

Em todos os quatro casos, `llmSynthesis` permaneceu `null` e o produto continuou funcional.

## 7. Matriz REAL / DEMO / PARCIAL / DESABILITADO

| Superfície | Estado | Observação |
|---|---|---|
| Command Center | **REAL/PARCIAL** | Facts e Signals reais; parcial quando algum domínio não produz signal suficiente |
| Briefing Executivo | **REAL/PARCIAL** | Síntese determinística; sem LLM obrigatório |
| Radar Territorial | **REAL/PARCIAL** | Somente signals ativos com evidência; vazio quando não há mudança mensurável |
| Economia | **REAL** nos 3 municípios com CAGED; **PARCIAL** em Nova Lima | ausência não é substituída por demo |
| Eleitoral | **REAL** | proveniência TSE preservada |
| Segurança | **REAL/PARCIAL** | Facts reais; signal apenas quando thresholds existentes são satisfeitos |
| Gemini Economia | **READY / não obrigatório no render** | sem alteração de provider |
| Gemini Eleitoral | **READY / não obrigatório no render** | sem alteração de provider |
| Gemini Segurança | **DESABILITADO** | mantido |
| Gemini Demografia | **DESABILITADO** | mantido |
| Gemini Saúde | **DESABILITADO** | mantido |
| Fixture Contagem nas três superfícies | **DESABILITADO** | real > demo; sem vazamento municipal |

## 8. Testes e validações

- `npx tsc --noEmit` — **PASS**
- `npx vitest run --exclude '.claude/worktrees/**'` — **PASS**
  - 111 arquivos passaram; 5 ignorados
  - 976 testes passaram; 5 ignorados
- `npm run build` — **PASS**
- `git diff --check` no escopo — **PASS**
- Busca por `CONTAGEM_DEMO`, `poc-fixture`, `LEGACY_PRELOADED_IBGE`, query de `territory_briefings.codigo_ibge` no escopo — **0 ocorrências**

O teste `frontend-connect.test.ts` cobre explicitamente:

- Economy Facts → Command Center;
- Electoral Facts → Command Center;
- Security Facts → Command Center;
- Signals → Briefing;
- Signals → Radar;
- ausência de signals;
- dados parciais;
- evidência ausente;
- LLM indisponível.

## 9. Pendências deliberadas

- Nenhum deploy foi executado.
- Nenhum threshold, prompt, provider, schema ou motor bruto foi alterado.
- Segurança em Belo Horizonte, Betim e Contagem possui Facts reais, mas não produz signal executivo no recorte atual porque os thresholds homologados não foram satisfeitos; o estado `INSUFFICIENT_DATA` foi preservado em vez de fabricar narrativa.

## 10. Caderno Matrix

| Caderno | Data | Facts | Signals | Front connected | LLM | Disclosure | Status |
|---|---|---|---|---|---|---|---|
| Overview | REAL | REAL | REAL/PARCIAL | SIM, contrato executivo | não obrigatório | cobertura por domínio | READY |
| Economy | REAL onde disponível | REAL | REAL | SIM | READY, não obrigatório | fonte/período | READY/PARCIAL em Nova Lima |
| Electoral | REAL | REAL | REAL | SIM | READY, não obrigatório | proveniência/confiança | READY |
| Security | REAL | REAL | REAL quando threshold satisfeito | SIM | DISABLED | insuficiência explícita | READY/PARCIAL |
| Demography | REAL/PARCIAL | não integrado neste bloco | não integrado neste bloco | KPI existente | DISABLED | indisponibilidade explícita | PARTIAL |
| Health | REAL/PARCIAL | não integrado neste bloco | não integrado neste bloco | caderno existente | DISABLED | indisponibilidade explícita | PARTIAL |
| Briefing | REAL/PARCIAL | SIM | SIM | SIM, contrato canônico | opcional; null aceito | limitações exibidas | READY |
| Radar | REAL/PARCIAL | via signals | SIM | SIM, contrato canônico | não usado | vazio sem signal | READY |
| Political Intelligence | REAL/PARCIAL | via contrato existente | via contrato existente | PARCIAL | configuração preservada | confiança/coverage existentes | PARTIAL |

## 11. Fechamento obrigatório

```text
COMMAND CENTER CONTRACT:
CANONICAL

BRIEFING CONTRACT:
CANONICAL

RADAR CONTRACT:
CANONICAL

ECONOMY FACTS/SIGNALS:
CONNECTED

ELECTORAL FACTS/SIGNALS:
CONNECTED

SECURITY FACTS/SIGNALS:
CONNECTED

ECONOMY GEMINI:
READY

ELECTORAL GEMINI:
READY

SECURITY GEMINI:
DISABLED

DEMOGRAPHY GEMINI:
DISABLED

HEALTH GEMINI:
DISABLED

CONTAGEM FALLBACK LEAKS:
0

MISLEADING FIXTURES:
0 NO ESCOPO INTEGRADO

TYPECHECK:
PASS

TESTS:
976 passed
5 skipped

BUILD:
PASS

P0:
0

P1:
0

P2:
0

P3:
0

TERRITÓRIOS 2.0 INTELLIGENCE CONVERGENCE:
PASS

READY FOR FINAL DEPLOY AUDIT:
YES
```
