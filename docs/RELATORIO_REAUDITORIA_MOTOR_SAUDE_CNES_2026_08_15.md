# PolitixOS Territórios — Reauditoria Cirúrgica do Motor Saúde v1 / CNES
## Verificação Independente das Correções do Microbloco 2

**Data:** 2026-08-15
**Baselines utilizados:** `RELATORIO_MOTOR_SAUDE_DATASUS_MICROBLOCO1.md`, `docs/RELATORIO_AUDITORIA_MOTOR_SAUDE_CNES_2026_08_13.md`, `docs/RELATORIO_MOTOR_SAUDE_CNES_MICROBLOCO2_CORRECOES_2026_08_15.md`.
**Escopo:** verificação independente e cirúrgica das 6 correções alegadas pelo Codex. Não recomeçada do zero — todo o restante do Microbloco 1 (fonte, coleta, contagens brutas, cruzamento com IBGE) é dado como já homologado e não foi reexaminado.

Todo trabalho foi verificado no diretório principal do repositório (`.../PolitixOS/`), local onde o código do motor efetivamente reside (não commitado, conforme já registrado na auditoria anterior).

---

## 1. Temporalidade — **PASS**

Código real (`saude-cnes-normalizer.ts:25,27,36`):
```ts
export function normalizeCnesSnapshot(codigoIbge, rows, referenceDate) {
  ...
  const snapshotDate = normalizeReferenceDate(referenceDate);
  ...
  const common = { ..., periodoInicio: snapshotDate, periodoFim: snapshotDate, ... };
```
`referenceDate` agora é **parâmetro explícito e obrigatório** da função de normalização — não é mais derivado de `data_atualizacao` das linhas. No coletor (`saude-collector.ts:48`):
```ts
const referenceDate = normalizeReferenceDate(input.referenceDate ?? new Date().toISOString().slice(0, 10));
```
Confirma exatamente o alegado: `referenceDate` pode vir do contrato de entrada (`RunHealthCollectionInput.referenceDate?: string`) ou, na ausência, usa a data UTC da coleta. `data_atualizacao` individual não influencia mais `periodo_inicio`/`periodo_fim` em nenhum ponto do código.

`source_updated_at_min`/`source_updated_at_max` são calculados separadamente (`normalizer.ts:28-31`) e vão **apenas** para `metadata` (linha 35) — nunca para `periodo_inicio`/`periodo_fim`, nunca para a chave natural. Confirmado.

## 2. Natural key — **PASS** (confirmado em código, teste automatizado e banco real)

`healthIndicatorNaturalKey()` (`saude-collector.ts:14-16`) continua `indicador|periodoInicio|periodoFim`, mas agora `periodoInicio`/`periodoFim` = `snapshotDate` controlada, não uma data volátil da fonte.

**Verificação física direta no banco de produção** (não confiei apenas no relatório):

```sql
periodo_inicio | periodo_fim | n  | indicadores_distintos
2026-08-13     | 2026-08-13  | 32 | 32
2026-08-15     | 2026-08-15  | 32 | 32
```
Total: **64 linhas**. Query de duplicatas por `(indicador, periodo_inicio, periodo_fim)` com `HAVING COUNT(*) > 1`: **0 resultados** — zero duplicações naturais, confirmado fisicamente, não apenas pelo retorno do coletor.

## 3. Teste de alteração de `data_atualizacao` sem mudar `referenceDate` — **PASS**

Teste automatizado real, `saude-cnes-normalizer.test.ts:34-39`:
```ts
it('desacopla mudança individual da fonte do período do snapshot', () => {
  const d1 = normalizeCnesSnapshot('3118601', [row()], '2026-08-13');
  const changedSourceDate = normalizeCnesSnapshot('3118601', [row({ data_atualizacao: '2026-08-14' })], '2026-08-13');
  expect(changedSourceDate.sourceHash).not.toBe(d1.sourceHash);
  expect(changedSourceDate.indicators.map(...)).toEqual(d1.indicators.map(...)); // períodos idênticos
});
```
Prova exatamente o que foi pedido: `data_atualizacao` muda, `referenceDate` (parâmetro explícito) permanece igual → hash muda (mudança real detectada) mas período/natural key **não mudam**. Complementado por `saude-collector.test.ts:10-15`, que confirma que, nesse cenário, a ação de reconciliação é `update` (não `insert`) — ou seja, o mesmo snapshot é atualizado em vez de duplicado.

## 4. Semântica SUS — **PASS**

- `CAPABILITIES` em `saude-cnes-normalizer.ts:11` usa agora `'estabelecimentos_atendimento_ambulatorial_sus'`. O nome antigo `estabelecimentos_atendimento_sus` **não existe mais em nenhum lugar do código-fonte** (confirmado por leitura completa dos 3 arquivos principais).
- `metodologia`/`definition` em `saude-collector.ts:33-36`: `"Quantidade de estabelecimentos ativos do CNES com indicação de atendimento ambulatorial SUS."` — exatamente a definição pedida, aplicada condicionalmente só a esse indicador.
- **Verificação física no banco**: consulta por `indicador IN ('estabelecimentos_atendimento_sus', 'estabelecimentos_atendimento_ambulatorial_sus')` retorna **0 linhas** com o nome antigo e **2 linhas** (13/08 e 15/08, valor=128 em ambas) com o nome novo, `metodologia` idêntica à esperada em ambas.

## 5. Reconciliação dos dados antigos — **PASS**, escopo verificado linha a linha

Li `scripts/reconcile-saude-cnes-microbloco2.ts` por completo:
- Filtro estrito: `territory_id` (Contagem) + `categoria='saude'` + `fonte='DATASUS'` + `source_dataset='CNES_ESTABELECIMENTOS'`.
- **Preflight obrigatório**: script lança `RECONCILIATION_PREFLIGHT_FAILED` a menos que existam **exatamente** 1 linha com nome antigo e 0 com nome novo antes de agir — proteção real contra reconciliação duplicada ou fora de escopo.
- **Um único `UPDATE ... WHERE id = <id específico> AND indicador = OLD_INDICATOR`** — não há nenhum `DELETE` no script inteiro, não há filtro amplo, não há referência a nenhuma outra tabela além de leitura de `territory_evidence` para relatório.
- Confirmado: nenhum outro motor, nenhuma migration, nenhum schema tocado.

## 6. Retry/backoff — **PASS**

Código real, `saude-cnes-client.ts`:
```ts
export const CNES_MAX_ATTEMPTS_PER_PAGE = 3;
const TRANSIENT_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
...
await options.sleep(options.retryBaseDelayMs * 2 ** (attempt - 1)); // 250ms, depois 500ms (base=250)
```
- Máximo 3 tentativas por página (2 repetições) — confirmado.
- Delays 250ms/500ms (backoff exponencial, base 250) — confirmado.
- Retry **apenas** para os status transitórios listados + erros de rede transitórios (`TypeError`, `AbortError`, `TimeoutError`) — confirmado por leitura de `isTransientNetworkError()` e do `Set` de status.
- **Sem retry** para 400/404/`INVALID_CODIGO_IBGE`/`CNES_NOT_AVAILABLE`/`CNES_PAGINATION_LIMIT`: confirmado — status não-transitórios lançam erro imediatamente (`if (!TRANSIENT_HTTP_STATUS.has(response.status) || attempt === maxAttemptsPerPage) throw`), e `INVALID_CODIGO_IBGE`/`CNES_PAGINATION_LIMIT` são lançados **antes** de qualquer tentativa de rede.

## 7. Testes de falha — **COBERTURA SUFICIENTE: SIM**

Contagem exata: **16 testes em 3 arquivos** (bate com o relatório). Li os 3 arquivos de teste por completo — todos os cenários pedidos estão presentes e passam:

| Cenário pedido | Encontrado? | Arquivo |
|---|---|---|
| HTTP 503 → retry → falha após 3 tentativas | ✅ | `saude-cnes-client.test.ts:66-72` |
| HTTP 404 → falha imediata, 1 chamada | ✅ | `saude-cnes-client.test.ts:37-41` |
| Página vazia | ✅ | `saude-cnes-client.test.ts:43-46` |
| `CNES_PAGINATION_LIMIT` (`maxPages=1`) | ✅ | `saude-cnes-client.test.ts:48-53` |
| `codigo_ibge` inválido, sem chamar rede | ✅ | `saude-cnes-client.test.ts:74-78` |
| Retry com recuperação | ✅ | `saude-cnes-client.test.ts:55-64` |
| Retry esgotado | ✅ | `saude-cnes-client.test.ts:66-72` |
| D1/D2 (natural key distinta) | ✅ | `saude-cnes-normalizer.test.ts:41-46`, `saude-collector.test.ts:17-19` |
| Mesma `referenceDate` + `data_atualizacao` diferente | ✅ | `saude-cnes-normalizer.test.ts:34-39`, `saude-collector.test.ts:10-15` |
| `force_refresh` | ✅ | `saude-collector.test.ts:21-27` |

## 8. Evidence — **PASS**

Explicação do Codex ("evidence = estado da fonte, runs = execuções") confirmada por:
- Código: `onConflict: 'territory_id,source_hash', ignoreDuplicates: true` + `evidencePersisted: evidence.data?.length ?? 0` — uma repetição idêntica (mesmo hash) faz o upsert não inserir nada, `.select('id')` retorna array vazio, `evidencePersisted=0`. Uma mudança real de hash gera nova linha.
- **Verificação física**: exatamente **2 linhas** em `territory_evidence` para `DATASUS/CNES`:
  - `79e761be...00cd8`, publicado 13/08, 1045 registros.
  - `a3bee8e4...f2d69`, publicado 15/08, 1044 registros.
  Ambos os hashes batem exatamente com os citados no relatório do Codex.
- Hash agora inclui código CNES, `data_atualizacao`, tipo de unidade, flag ambulatorial SUS e as 6 flags de capacidade (`normalizer.ts:33-34`) — mais rico que a versão anterior (só código+data). Determinismo/independência de ordem continua provado por teste (`normalizer.test.ts:19,23`: mesmo hash com array invertido).

## 9. Idempotência real — **PASS**

Histórico real de `territory_collection_runs` para D2 (2026-08-15), 4 execuções:

| Execução | Reconciliação |
|---|---|
| 23:47:17 (primeira) | `inserted=32` |
| 23:47:36 (segunda) | `unchanged=32` ✅ |
| 23:47:46 (terceira) | `updated=32` (force_refresh) |
| 23:50:24 (quarta, verificação adicional) | `unchanged=32` ✅ |

Diferente do D1 (que precisou de várias tentativas na primeira auditoria até estabilizar — ver relatório anterior), o D2 alcançou `unchanged=32` já na **segunda** tentativa e manteve-se estável na verificação adicional — evidência (ainda que amostra pequena) de que desacoplar a chave da data da fonte reduziu a sensibilidade a ruído. Total geral: 64 indicadores, 0 duplicações, confirmado fisicamente.

## 10. Controle de versão — **RESSALVA**

```
git status --short (repositório principal):
 D .claude/worktrees/cranky-carson-f7e9e6      (pré-existente, não relacionado)
 D .claude/worktrees/epic-jennings-eb59e2      (pré-existente, não relacionado)
A  RELATORIO_MOTOR_SAUDE_DATASUS_MICROBLOCO1.md
A  docs/RELATORIO_AUDITORIA_MOTOR_SAUDE_CNES_2026_08_13.md
A  docs/RELATORIO_MOTOR_SAUDE_CNES_MICROBLOCO2_CORRECOES_2026_08_15.md
A  lib/territorios/saude-cnes-client.test.ts
A  lib/territorios/saude-cnes-client.ts
A  lib/territorios/saude-cnes-normalizer.test.ts
A  lib/territorios/saude-cnes-normalizer.ts
A  lib/territorios/saude-collector.test.ts   (novo desde a primeira auditoria)
A  lib/territorios/saude-collector.ts
A  scripts/audit-saude-cnes-contagem.ts
A  scripts/reconcile-saude-cnes-microbloco2.ts   (novo desde a primeira auditoria)
```

Todos os arquivos do Motor Saúde estão em **staged (`A`)**, nenhum commitado — confirma exatamente a afirmação do Codex. Não há sinal de trabalho concorrente de outro agente nesses caminhos. As duas exclusões de worktrees são pré-existentes (já apareciam na primeira auditoria, dia 13/08) e não têm relação com Saúde. **Não realizei commit** — apenas documentei, conforme instruído.

## 11. Regressões — **NÃO**

Reexecutei eu mesmo, sem confiar no relatório:

```
npx tsc --noEmit                          → 0 erros
eslint (8 arquivos Saúde)                 → 0 erros
npx vitest run lib/territorios            → 49 arquivos, 390 testes, PASS (bate exatamente com a baseline esperada)
suíte territorial ampliada                → 66 arquivos, 553 testes, PASS (bate exatamente com a baseline esperada)
npm run build                             → sucesso, Next.js 16.2.6/Turbopack, todas as rotas geradas
```

Diferente da primeira auditoria (onde a contagem de testes do relatório não batia com nenhuma medição real), desta vez **as contagens do relatório do Codex batem exatamente** com o que reexecutei de forma independente.

## 12. Riscos remanescentes

| Risco | Classificação |
|---|---|
| API CNES sem ordenação explícita nas páginas | NÃO BLOQUEANTE (deduplicação por código CNES já mitiga; hash é comprovadamente independente de ordem) |
| Cadastro ativo ≠ serviço efetivamente disponível | NÃO BLOQUEANTE (limitação semântica conhecida e documentada, não um bug) |
| D1 legado sem `source_updated_at_min/max` retroativo (linha renomeada de 13/08 tem esses campos `null`) | NÃO BLOQUEANTE (confirmado fisicamente no banco; cosmético, não afeta reconciliação nem novos snapshots) |
| Política de TTL/cache ainda não definida | NÃO BLOQUEANTE para o motor isolado como está hoje; **BLOQUEANTE para qualquer agendamento recorrente futuro** — precisa ser resolvida antes de qualquer scheduler |
| Diferença conceitual `evidencePersisted` vs `recordsPersisted` | NÃO BLOQUEANTE (comportamento correto e intencional, só precisa estar claro na documentação do futuro contrato de endpoint) |

Nenhum risco bloqueante para o estado atual (motor isolado, não integrado).

---

## GATE FINAL

```
TEMPORALIDADE: PASS
NATURAL KEY: PASS
D1/D2: PASS
IDEMPOTÊNCIA: PASS
SEMÂNTICA SUS: PASS
RETRY/BACKOFF: PASS
TESTES DE FALHA: PASS (cobertura suficiente: SIM)
EVIDENCE: PASS
CONTROLE DE VERSÃO: RESSALVA (staged, não commitado — como o próprio Codex declarou)
REGRESSÕES: NÃO
RISCO BLOQUEANTE REMANESCENTE: NÃO (para o escopo atual, isolado)

STATUS FINAL: HOMOLOGADO COM RESSALVAS

PRONTO PARA CRIAR ENDPOINT SAÚDE: SIM (tecnicamente — a lógica interna está sólida, testada e sem os riscos críticos identificados na primeira auditoria)
PRONTO PARA INTEGRAR AO ORQUESTRADOR: NÃO (não existe endpoint ainda; política de TTL/cache para uso recorrente ainda não definida; decisão de integração é maior que este microgate)
```

Todas as 6 correções alegadas pelo Codex foram verificadas de forma independente — em código-fonte lido diretamente (não apenas o relatório), em testes automatizados executados por mim, e em consultas físicas diretas ao banco de produção. Nenhuma alegação relevante foi encontrada como falsa ou exagerada nesta rodada — diferença notável em relação à primeira auditoria, que havia encontrado uma narrativa seletiva sobre o histórico real de execuções e uma contagem de testes incorreta. Desta vez, ambos os pontos foram corrigidos e conferem exatamente com a evidência física.

## Próximo passo recomendado

Definir a política de TTL/cache/frequência de coleta (mesmo que simples, ex.: "não recoletar Saúde para o mesmo território dentro de X horas, salvo `force_refresh`") antes de criar o endpoint HTTP e considerar integração ao Orquestrador — resolvendo o único risco ainda marcado como bloqueante para uso recorrente.
