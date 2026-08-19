# CLAUDE_PESQUISAS_01B — Resultados Eleitorais Reais + Brasil/MG/DF

**Agente:** Claude · **Prioridade:** P0 — Apresentação amanhã
**Data:** 2026-08-19 · **Workspace:** `/Users/fernandooliveirapinto/Developer/PolitixOS` (branch `main`)

---

## 0. Nota operacional — sessão concorrente

Durante esta rodada, outra sessão do Claude Code (mesmo ambiente, processo concorrente confirmado) estava simultaneamente enriquecendo a página de ficha técnica de pesquisa (`app/dashboard/pesquisas/[id]/`) — extração de metadados de texto livre (`lib/pesquisas/parser.ts`) e uma biblioteca de componentes (`PollHeader`, `PollSampleProfile`, `PollResultsSection`, etc.). Confirmado com o usuário que são **duas sessões intencionais** com divisão de trabalho: esta sessão (01B) ficou responsável pelo **schema de resultados, dados reais verificados e visões executivas das 3 corridas prioritárias**; a outra ficou com a ficha técnica/extração. Não toquei `parser.ts` nem os componentes em `[id]/components/`. `types.ts` e `repository.ts` são compartilhados — estendi ambos de forma aditiva (sem remover nada da outra sessão) e confirmei build/testes verdes com o estado combinado das duas sessões.

## FASE 1 — Auditoria do que já existia (PESQUISAS-01A)

- **Schema**: `electoral_polls` (1.640 registros reais do TSE/PesqEle, ingeridos e verificados em 01A) + `electoral_poll_results` (criada vazia em 01A, "preparada, não populada").
- **Ingestão**: `lib/pesquisas/collector.ts` + `normalizer.ts` — já ingeria o registro oficial da pesquisa, não resultado.
- **Repository**: `lib/pesquisas/repository.ts` — `listPolls`, `getPollById`, `getPollResults` (já existia, sempre retornava `[]` pois a tabela estava vazia), `getPesquisasKpis`.
- **Rotas**: `/dashboard/pesquisas` (lista + KPIs) e `/dashboard/pesquisas/[id]` (ficha técnica).
- **RBAC**: tela `pesquisas` já no catálogo canônico (`lib/navigation/appScreens.ts`) desde 01A — menu/RBAC/guarda de rota já funcionando, preservado sem alteração.
- **Conclusão da auditoria**: a estrutura para resultados já existia (`electoral_poll_results`), mas sem proveniência (sem `source_url`/`source_date`/`verified`/`candidate_id`) e sem nenhuma linha. Decisão: **estender**, não recriar.

## FASE 2 — Modelo de resultados

Migração `supabase_migration_electoral_poll_results_provenance.sql` — `ALTER TABLE` aditivo em `electoral_poll_results` (não uma tabela nova, conforme "não duplicar estruturas caso já exista equivalente"):

```sql
ADD COLUMN office text,
ADD COLUMN result_type text,           -- STIMULATED | SPONTANEOUS | REJECTION | SECOND_ROUND | OTHER
ADD COLUMN candidate_id uuid REFERENCES targets(id),
ADD COLUMN source_name text,
ADD COLUMN source_url text,
ADD COLUMN source_date date,
ADD COLUMN collected_at timestamptz DEFAULT now(),
ADD COLUMN provenance jsonb DEFAULT '{}',
ADD COLUMN verified boolean DEFAULT false;
```

`turno`/`tipo_pergunta`/`cenario` (já existentes desde 01A) continuam sendo a chave de comparabilidade real (`lib/pesquisas/comparability.ts`, já testado em 01A) — `result_type` complementa para filtragem direta, não substitui.

## FASE 3 — Localização dos resultados

Reconciliação por **`NR_PROTOCOLO_REGISTRO`** citado explicitamente na publicação (não por similaridade de instituto/data isolada — PARTE 3 do briefing). Para cada corrida prioritária, busquei a publicação do próprio instituto/imprensa especializada e confirmei contra o registro já ingerido: mesmo número de registro TSE, mesmas datas de campo, mesma amostra.

| Corrida | Pesquisa registrada (TSE) | Publicação citando o registro | Confirmação |
|---|---|---|---|
| Presidente/Brasil | `BR067732026` — Quaest, campo 10-13/08, amostra 2004 | Gazeta do Povo, citando "BR-06773/2026", campo "10-13/08", amostra "2.004" | ✅ Registro + datas + amostra idênticos |
| Governador/DF | `DF078492026` — Real Time Big Data, campo 14-18/08, amostra 1600 | Gazeta do Povo, citando "DF-07849/2026", campo "14-18/08", amostra "1.600" | ✅ Registro + datas + amostra idênticos |
| Governador/MG | `MG034902026` — Genial/Quaest, campo 22-26/07, amostra 1482 | Gazeta do Povo, citando "MG-03490/2026", campo "22-26/07", amostra "1.482" | ✅ Registro + datas + amostra idênticos |

Nenhuma pesquisa foi associada por suposição — as 3 têm confirmação explícita e verificável.

## FASES 4-6 — Visões executivas (Presidente/BR, Governador/DF, Governador/MG)

Nova rota **`/dashboard/pesquisas/executivo`** (não altera a página `[id]` nem a lista principal, ambas de responsabilidade da outra sessão). Controles de Cargo/Território (PARTE 9) como 3 abas fixas — Presidente sempre pareado com Brasil, Governador com DF ou MG (não um cruzamento livre).

Por corrida: pesquisa mais recente, líder atual, diferença 1º×2º, ranking com gráfico horizontal (reaproveita `components/charts/BarChart.tsx` já existente — não criei um novo), cenários de 2º turno lado a lado (nunca misturados entre si), proveniência com link para a publicação original.

**Média entre pesquisas**: card explicitamente mostra "Indisponível (1 pesquisa)" — com 1 única pesquisa verificada por corrida, uma média não é metodologicamente defensável (PARTE 9: "não calcular média simples entre cenários incompatíveis"). Vira "Ver abaixo" automaticamente quando houver 2+ pesquisas comparáveis.

**Evolução temporal**: mesmo motivo — 1 ponto de dado não faz linha temporal. Empty state explícito com o motivo, não gráfico vazio silencioso.

## FASE 7 — Comparabilidade

`lib/pesquisas/comparability.ts` (já existia de 01A, reaproveitado sem alteração) mais a estrutura da página executiva: cada cenário de 2º turno é renderizado em seu próprio card — nunca somados/misturados. `office`/`territorio` fixos por aba evitam comparar Presidente com Governador ou DF com MG.

## FASE 8 — Proveniência

Toda linha em `electoral_poll_results` inserida nesta rodada tem: `source_name`, `source_url`, `source_date`, `provenance` (jsonb com o número de registro citado, datas de campo e amostra confirmados, margem de erro/confiança quando informados na publicação), `verified: true`. Nenhuma linha sem essas 4 informações foi inserida.

## Resultados efetivamente integrados

**91 linhas reais**, todas `verified: true`, todas com `source_url` funcional:

| Corrida | Cenários 1º turno | Cenários 2º turno | Candidatos com `candidate_id` vinculado |
|---|---|---|---|
| Presidente/Brasil | 1 (15 candidatos/categorias) | 4 (Lula×Flávio, Lula×Renan, Lula×Zema, Lula×Caiado) | Lula, Flávio Bolsonaro, Renan Santos |
| Governador/DF | 1 (8 candidatos/categorias) | 3 (Celina×Arruda, Celina×Grass, Arruda×Grass) | Celina Leão, José Arruda |
| Governador/MG | 2 (com e sem Cleitinho, 10+9 candidatos/categorias) | 5 (Cleitinho×Kalil/Simões/Ananias, Simões×Kalil/Ananias) | Cleitinho Azevedo |

`candidate_id` só foi preenchido para nomes com correspondência exata e inequívoca em `targets` (consultado diretamente, não adivinhado) — os demais (Kalil, Ananias, Simões, Caiado, Zema, etc.) ficam `null`, corretamente, por não estarem cadastrados como candidatos monitorados no PolitixOS.

## Registros sem resultado

Das 1.640 pesquisas registradas em `electoral_polls`, apenas as 3 acima têm resultado integrado — as 1.637 restantes continuam mostrando "Resultados divulgados ainda não integrados" (empty state já existente da página `[id]`, preservado). Isso é esperado e correto: só pesquisas com fonte pública verificável e confirmação explícita de registro devem ter resultado exibido.

## Arquivos alterados

**Exclusivamente meus (novos):**
- `supabase_migration_electoral_poll_results_provenance.sql`
- `lib/pesquisas/results-repository.ts` + `.test.ts`
- `app/dashboard/pesquisas/executivo/page.tsx`
- `docs/relatorios/CLAUDE_PESQUISAS_01B_RESULTADOS.md`

**Compartilhados (estendidos de forma aditiva, não commitados nesta rodada — ver §0):**
- `lib/pesquisas/types.ts` — adicionei `ResultType`, campos de proveniência em `ElectoralPollResult`, `ElectoralPollResultUpsert`
- `lib/pesquisas/repository.ts` — `mapResultRow` atualizado para incluir os novos campos

**Não tocados (propriedade da outra sessão):** `lib/pesquisas/parser.ts`, `app/dashboard/pesquisas/[id]/page.tsx`, `app/dashboard/pesquisas/[id]/components/*`.

## Regressão

```
TYPECHECK: PASS (0 erros — estado combinado das duas sessões)
TESTS:     PASS (1092 passed, 5 skipped, 0 failed — inclui os testes da outra sessão)
BUILD:     PASS (/dashboard/pesquisas/executivo confirmada na rota)
```

## Riscos

1. **`types.ts`/`repository.ts` não commitados nesta rodada** — ficam como alteração de working tree até a outra sessão (ou uma passada de unificação) decidir commitar. Risco baixo (mudança aditiva, testada, buildando), mas alguém precisa fechar esse commit antes do fim da noite.
2. **Apenas 1 pesquisa verificada por corrida** — suficiente para a apresentação de amanhã (números reais, ranking, 2º turno), mas não para comparação temporal. Não é um bug, é a quantidade real de pesquisas que consegui verificar com proveniência sólida no tempo disponível.
3. **`candidate_id` incompleto** — só liga quando o nome bate exatamente com `targets`; não tentei fuzzy-matching (arriscaria vincular errado).

## Próximo passo

Verificar mais pesquisas de cada corrida (2+ por corrida) para habilitar comparação temporal real. Considerar popular `candidate_id` para os demais candidatos relevantes (Kalil, Ananias, Caiado, Zema) se o PolitixOS passar a monitorá-los como `targets`.

---

## SAÍDA OBRIGATÓRIA

```
PESQUISAS-01B: PASS

RESULTADOS INVENTADOS: 0
PRESIDENTE/BRASIL: FUNCIONAL (1 pesquisa verificada, 1º turno + 4 cenários de 2º turno)
GOVERNADOR/DF: FUNCIONAL (1 pesquisa verificada, 1º turno + 3 cenários de 2º turno)
GOVERNADOR/MG: FUNCIONAL (1 pesquisa verificada, 2 cenários de 1º turno + 5 cenários de 2º turno)

PROVENIÊNCIA: PASS (91/91 linhas com source_name + source_url + source_date + verified=true)
AUSÊNCIA DE RESULTADO INDICADA: PASS (1.637/1.640 pesquisas mantêm empty state honesto)

TYPECHECK: PASS
TESTS: 1092 passed / 5 skipped / 0 failed
BUILD: PASS

PUSH: NOT_EXECUTED
DEPLOY: NOT_EXECUTED
PRODUÇÃO ALTERADA: NÃO
```
