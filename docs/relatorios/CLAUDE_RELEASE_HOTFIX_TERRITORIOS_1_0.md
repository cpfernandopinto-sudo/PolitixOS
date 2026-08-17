# RELEASE-HOTFIX-TERRITORIOS-1.0 — Reconciliação Final do CAGED Adapter

**Agente:** Claude · **Data:** 2026-08-17
**Modo:** micro-hotfix, single-file-first, correção mínima

---

## Resumo executivo

Único bloqueador formal do `RELEASE-GATE-TERRITORIOS-1.0` (P1): `lib/territorios/intelligence/economy/caged-adapter.ts` havia sido sobrescrito, durante a execução paralela dos três trilhos, por uma implementação funcionalmente equivalente porém com tipagem degradada — `derivedIndicators: any[]`, quatro `as any` mascarando o contrato `DerivedIndicator`/`coverageByFamily`, e um parâmetro `sectorPoints` nunca lido.

Reconciliei o arquivo em um único commit lógico: tipagem forte restaurada integralmente, os 4 `as any` removidos, `sectorPoints` removido (não substituído por feature nova), e — achado adicional descoberto ao restaurar o contrato — corrigi uma referência órfã: o sinal TREND apontava, em `derivedIndicatorRefs`, para um id que nunca existia de fato em `derivedIndicators` (formato diferente do id realmente gerado no laço de MoM). Nenhum valor CAGED, nenhuma query, nenhum id de evidência e nenhuma metodologia foram alterados — MoM/YoY/Rolling-12m continuam a mesma diferença simples/soma de 12 já homologada em `caged/history.ts`. Os 8 testes originais continuam passando inalterados; adicionei 3 testes novos para provar o contrato restaurado (nenhum teste antigo foi removido ou reescrito para "passar por passar").

---

## 1. Read-first

Lido antes de qualquer alteração: `caged-adapter.ts` (versão sobrescrita, 227 linhas), `caged-adapter.test.ts` (8 testes originais), `../contracts.ts` (`DerivedIndicator`, `Evidence`, `AnalyticalSignal`, `Coverage`), `./types.ts` (`EconomicIntelligenceResult`), `./thresholds.ts` (`ThresholdFamily`), `./derived-indicators.ts` (`derivedIndicatorId`), e o relatório `CLAUDE_INTEL_ELECTORAL_01_TERRITORIOS_1_0.md` para recuperar a intenção arquitetural original (adapter mínimo, L1 Evidence real, L2 DerivedIndicator reaplicando fórmula já homologada, L3 apenas sinal de direção sem threshold inventado, família `GENERAL`).

**Achado confirmado antes de editar**: o `DerivedIndicator` do contrato exige `methodId`, `methodVersion`, `inputs: Array<{evidenceRef, role}>`, `formulaDescription`, `limitations` — a versão sobrescrita só populava `{id, territoryId, domain, indicator, result, unit, period}`, faltando os 5 campos acima, mascarado por `derivedIndicators: any[]`.

---

## 2. Tipagem degradada removida

Removidos:
- `derivedIndicators: any[]` → `derivedIndicators: DerivedIndicator[]` (import de `DerivedIndicator` de `../contracts`).
- `metadata: (pt.metadata as Record<string, any>) ?? {}` (×3, um por bloco de evidência) → `metadata: pt.metadata ?? {}` — o cast era desnecessário: `pt.metadata` já é `Record<string, unknown> | undefined` e `Evidence.metadata` espera exatamente `Record<string, unknown>`.
- `coverageByFamily as any` → tipado com `Record<ThresholdFamily, DomainAvailability>` (import de `ThresholdFamily` de `./thresholds`, a mesma fonte canônica usada pelo resto do motor de Economia, em vez de uma união literal redeclarada localmente).
- `(pt.metadata?.aggregate_hash as string) ?? fallback` (×3) → `evidenceHashOf()`, uma função pequena com checagem `typeof === 'string'` em runtime em vez de cast cego — mesmo comportamento para dado real (hash sempre é string), mas não finge que um `unknown` é `string` sem checar.

---

## 3. DerivedIndicator — contrato restaurado

Cada `DerivedIndicator` (MoM/YoY/Rolling12) agora tem:

- `methodId`: `CAGED_EMPLOYMENT_MOM_V1` / `CAGED_EMPLOYMENT_YOY_V1` / `CAGED_EMPLOYMENT_ROLLING12_V1` (constantes novas, nomeadas — não strings soltas).
- `methodVersion`: `intel-electoral-01-caged-adapter-v1` (mesma string já usada pelo `engineVersion`/`methodology` do arquivo — não introduzi uma versão divergente).
- `inputs`: refs reais de evidência com `role` (`previous_month`/`current_month` para MoM; `same_month_prior_year`/`current_month` para YoY; `rolling_window_month` × 12 para Rolling12).
- `formulaDescription`: texto explícito citando a fórmula exata e a origem homologada (`momBalanceDelta`/`yoyBalanceDelta`/`rolling12Balance` em `caged/history.ts`).
- `limitations: []` (válido — a limitação de família fica no nível do `EconomicIntelligenceResult`, como já era).

**Metodologia**: idêntica à da versão sobrescrita e à minha original do INTEL-ELECTORAL-01 — MoM = `curr.balance - prev.balance`; YoY = `curr.balance - prevMatch.balance` (mesmo mês, ano anterior); Rolling12 = soma dos 12 saldos mensais anteriores, só quando os 12 meses estão completos. **Nenhuma fórmula foi alterada.**

**Achado corrigido junto (rastreabilidade, não valor)**: o `AnalyticalSignal` de TREND referenciava em `derivedIndicatorRefs` um id (`derived:{territoryId}:saldo_emprego_formal:NOVO_CAGED:{período}`) que **nunca correspondia** a nenhum id realmente presente em `derivedIndicators` (cujos ids eram `derived:{territoryId}:saldo_emprego_formal_mom:{período}` etc., em formato de 4 partes, sem o segmento de `methodId` exigido pelo parser de `selection.ts`). Corrigido: os ids de `derivedIndicators` agora usam `derivedIndicatorId()` (helper canônico já existente em `derived-indicators.ts`, reaproveitado — não reinventado), e o sinal referencia o id real do DerivedIndicator de MoM do período mais recente, quando ele existe (vazio, nunca inventado, quando não há mês anterior para calcular MoM — coberto por teste novo).

---

## 4. sectorPoints

**Removido** (opção B do gate). Confirmado por grep no repositório inteiro: nenhum chamador de produção passava um 3º argumento — `buildCagedBlock` (o único outro export do arquivo) já chamava `buildCagedEconomicIntelligenceResult(territoryId, points)` com 2 argumentos. Nenhuma feature setorial foi criada; o parâmetro estava morto desde que o arquivo foi sobrescrito, nunca lido em nenhuma versão.

---

## 5. Comportamento preservado

Confirmado por leitura linha a linha e pelos 8 testes originais, inalterados, todos passando: mesma query/fonte (`territory_indicators` via `getCagedMunicipalSeries`, fora deste arquivo — não tocada), mesmos ids de evidência (`db:{territoryId}:{indicador}:NOVO_CAGED:{período}`), mesma cobertura (`coverageByFamily`/`temporalCoverage`), mesmos sinais (título/resumo/evidenceRefs), mesma metodologia MoM/YoY/Rolling12, mesmo `source_dataset`/`source`/proveniência. Nenhum valor numérico muda — confirmado tanto pela inspeção do código (fórmulas idênticas) quanto pelos testes (que travam valores exatos: MoM=`-635-338`, YoY=`914-338`, Rolling12=soma exata de 12 meses).

---

## 6. Não tocado

Confirmado por `git status`: nenhuma alteração em `lib/territorios/caged/**` (collectors/persistência/queries), banco, `territory_indicators`/`territory_evidence`, frontend (`app/dashboard/territorios/**`), janela 202401→202606, `config.ts` (Gemini default/Anthropic fallback, já corrigidos no gate anterior), pipeline eleitoral, Segurança, Demografia, Saúde, PIB/SICONFI, `prompt-v3.ts`/registry, providers, n8n.

---

## 7. Testes do adapter

```
npx vitest run lib/territorios/intelligence/economy/caged-adapter.test.ts
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

8 testes originais **inalterados**, todos PASS. 3 testes novos adicionados (só para provar o contrato restaurado, conforme instrução do gate):
1. Todo `DerivedIndicator` produzido tem `methodId`/`methodVersion`/`formulaDescription`/`inputs` não-vazios/`limitations` array — PASS.
2. Todo `signal.derivedIndicatorRefs` resolve para um id realmente presente em `derivedIndicators` — PASS (prova a correção da referência órfã).
3. Com um único ponto (sem MoM possível), `derivedIndicatorRefs` fica vazio, nunca um id inventado — PASS.

```text
MOM: PASS
YOY: PASS
ROLLING12: PASS
EVIDENCE: PASS
COVERAGE: PASS
```

---

## 8. Regressão final

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | **PASS, 0 erros** |
| `npx vitest run --exclude ".claude/worktrees/**"` | **894 passed, 5 skipped** (891+3 novos; skips = testes reais gated de LLM, inalterados) |
| `npm run build` | **PASS, exit code 0** |

---

## 9. Sweep

```text
DERIVED INDICATORS ANY: 0
CONTRACT-MASKING AS ANY: 0
DEAD SECTORPOINTS PARAMETER: 0
INCOMPLETE DERIVED INDICATORS: 0
```

Confirmado por `grep -n "\bany\b"` e `grep -n "sectorPoints"` no arquivo reconciliado: as únicas ocorrências restantes das duas strings estão no comentário de cabeçalho que **descreve o problema histórico corrigido**, não em código executável.

---

## 10. P2/P3

**Não tocados nesta correção** (pertencem ao próximo gate, conforme instrução): header/breadcrumb de Betim/BH, `CoverageBadge` real-vs-demo, indicadores inexistentes em `seguranca/page.tsx`, rótulos CNES no frontend, disclosure de `inteligencia-externa`, arquivo órfão `TerritoryEngineStatusBoard 2.tsx`, duplicidade `territory_collection_runs`/`source_collection_runs`.

---

## GATE FINAL

```text
CAGED ADAPTER RECONCILED: PASS
STRONG TYPING: PASS
DERIVED INDICATORS ANY: 0
CONTRACT-MASKING AS ANY: 0
DEAD SECTORPOINTS: 0
DERIVED INDICATOR CONTRACT: PASS
MOM: PASS
YOY: PASS
ROLLING12: PASS
EVIDENCE: PASS
COVERAGE: PASS
CAGED VALUES CHANGED: 0
TYPECHECK: PASS
TESTS: PASS
BUILD: PASS
P0: 0
P1: 0
P2: 0 (nenhum tocado neste hotfix — os já conhecidos do gate anterior seguem registrados, não recontados aqui)
P3: 0
```

```text
RELEASE-HOTFIX-TERRITORIOS-1.0: PASS

POLITIX TERRITÓRIOS 1.0: HOMOLOGADO

READY FOR DEPLOY: YES
```

---

## Encerramento

**PARE.** Nenhum deploy foi feito. Nenhuma feature nova, novo domínio ou nova UX foi criada. Nenhum P2/P3 foi corrigido neste hotfix — permanecem registrados em `CLAUDE_RELEASE_GATE_TERRITORIOS_1_0.md` para o próximo gate (2.0).
