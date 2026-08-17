# PolitixOS Territórios — Auditoria Independente ECO-01 (Motor Economia)
## SICONFI/DCA — Fundação Fiscal Municipal

**Data:** 16/08/2026
**Auditor:** Claude (independente, não reimplementador)
**Branch:** `main`, worktree principal compartilhado
**Baseline auditado:** `docs/relatorios/CODEX_ECO01_MOTOR_ECONOMIA.md`

Metodologia: nenhuma afirmação do relatório da Codex foi aceita sem verificação direta — chamadas reais e controladas à API do SICONFI (fora de qualquer script da Codex), consultas diretas ao banco real (incluindo ao catálogo do Postgres, não apenas às tabelas de aplicação), e uma execução independente do coletor.

## 1. Baseline Codex

Relatório lido integralmente (30 seções). Escopo declarado: fundação fiscal municipal, Contagem/MG, 2020–2025, fonte Tesouro/SICONFI/DCA, 7 indicadores brutos, 42 registros persistidos, 6 evidências, 2 runs, 0 duplicações, idempotência confirmada na segunda execução.

## 2. Fonte auditada

Confirmada independentemente como oficial e funcional: `GET https://apidatalake.tesouro.gov.br/ords/cdwhprd/siconfi/tt/dca`, sem autenticação, JSON, paginação por `offset`/`hasMore`, limite de página 5.000 itens. Chamadas reais e controladas foram feitas para Contagem/3118601 em três exercícios (2020, 2023, 2025) — nunca em lote, nunca para outros municípios além do teste de ausência de hardcode (seção 22).

`id_ente` recebe o **código IBGE de 7 dígitos diretamente** (não convertido/truncado) — confirmado que a API responde corretamente e filtra pelo município correto com esse formato. `an_exercicio` e `offset` funcionam conforme documentado.

## 3. Endpoint

`https://apidatalake.tesouro.gov.br/ords/cdwhprd/siconfi/tt/dca?an_exercicio={ano}&id_ente={codigo_ibge}&offset={offset}` — confirmado real, sem chave de API, `count`/`hasMore`/`limit`/`offset` no envelope Oracle ORDS. `SICONFI_MIN_REQUEST_INTERVAL_MS=1000` no client respeita o limite documentado de 1 req/s.

## 4. Semântica DCA (gate crítico)

Para cada uma das 7 contas, a chamada real retornou **exatamente 1 linha** (confirmando que a combinação `anexo+cod_conta+coluna` é não ambígua, validando o design fail-fast de `SICONFI_EXPECTED_SINGLE_ROW`) e o rótulo (`conta`) confirma o significado pretendido:

| Indicador persistido | anexo/cod_conta/coluna | Rótulo oficial (`conta`) na fonte | Confirmado |
|---|---|---|---|
| `receita_total_bruta_realizada` | I-C / `TotalReceitas` / Receitas Brutas Realizadas | "TOTAL DAS RECEITAS (III) = (I + II)" | SIM |
| `receita_corrente_bruta_realizada` | I-C / `RO1.0.0.0.00.0.0` | "1.0.0.0.00.0.0 - Receitas Correntes" | SIM |
| `receita_tributaria_bruta_realizada` | I-C / `RO1.1.0.0.00.0.0` | "1.1.0.0.00.0.0 - Impostos, Taxas e Contribuições de Melhoria" | SIM |
| `transferencias_correntes_brutas_realizadas` | I-C / `RO1.7.0.0.00.0.0` | "1.7.0.0.00.0.0 - Transferências Correntes" | SIM |
| `despesa_corrente_empenhada` | I-D / `DO3.0.00.00.00.00` | "3.0.00.00.00 - Despesas Correntes" | SIM |
| `despesa_capital_empenhada` | I-D / `DO4.0.00.00.00.00` | "4.0.00.00.00 - Despesas de Capital" | SIM |
| `investimento_empenhado` | I-D / `DO4.4.00.00.00.00` | "4.4.00.00.00 - Investimentos" | SIM |

**Nota de precisão semântica:** `receita_tributaria_bruta_realizada` corresponde ao agregado oficial "Impostos, Taxas e Contribuições de Melhoria", não apenas a "impostos" no sentido estrito. O nome do indicador é uma simplificação aceitável (é o agrupamento padrão de "receita tributária" na contabilidade pública brasileira), mas a metadata (`raw_name`) preserva o rótulo completo, permitindo desambiguação por quem consumir o dado.

## 5. Colunas auditadas

Verificado diretamente na fonte que, para a mesma conta, **existem colunas alternativas não escolhidas** — confirmando que a seleção de "Receitas Brutas Realizadas" e "Despesas Empenhadas" é uma escolha real entre opções, não uma suposição:

- Para `RO1.0.0.0.00.0.0` (Receitas Correntes) existem também `Deduções - FUNDEB` (R$ 217.903.530,32 em 2025) e `Outras Deduções da Receita` (R$ 201.317.453,51 em 2025) — confirma que "bruta" de fato exclui essas deduções.
- Para `DO3.0.00.00.00.00` (Despesas Correntes) existem também `Despesas Liquidadas` (R$ 3.380.391.421,13) e `Despesas Pagas` (R$ 3.358.665.509,39) em 2025 — ambas **menores** que "Despesas Empenhadas" (R$ 3.491.213.406,76), confirmando que empenhado é a etapa mais ampla do ciclo (empenho → liquidação → pagamento), não o valor efetivamente desembolsado.

## 6. Valores Contagem — validação direta contra a fonte

Amostra 2025 comparada byte a byte entre a resposta real da API e o relatório da Codex: **100% de correspondência** para todos os 7 valores (receita total R$ 4.475.980.236,19; corrente R$ 4.017.044.518,27; tributária R$ 1.280.592.625,92; transferências R$ 2.139.220.074,39; despesa corrente R$ 3.491.213.406,76; despesa capital R$ 515.884.115,10; investimento R$ 404.242.795,23).

## 7. Validação 2020/2023/2025

Nos três exercícios, todas as 7 combinações retornaram exatamente 1 linha, com os mesmos rótulos de conta (taxonomia estável). Contagens brutas confirmadas: 2020=1.990, 2023=1.930, 2025=2.011 — idênticas ao relatório Codex. Valores 2020 e 2023 conferidos e coerentes com a trajetória fiscal do município (crescimento nominal ano a ano, sem saltos incompatíveis com a natureza do dado).

## 8. Temporalidade

`periodo_inicio`/`periodo_fim` = `AAAA-01-01`/`AAAA-12-31`, confirmado no banco para os 6 exercícios. `source_updated_at = null` para toda a amostra verificada — a fonte não fornece esse campo por linha e o motor corretamente não fabrica um timestamp artificial. `reference_year`/`reference_period`/`collected_at` presentes em metadata, semanticamente coerentes.

## 9. Natural key

Confirmado **no catálogo real do Postgres** (não apenas no código da aplicação) que existe o índice:

```sql
CREATE UNIQUE INDEX uq_territory_indicators_natural_key ON public.territory_indicators
USING btree (territory_id, categoria, indicador, fonte,
             COALESCE(source_dataset, ''), COALESCE(periodo_inicio, '0001-01-01'), COALESCE(periodo_fim, '0001-01-01'));
```

Isso é uma proteção de banco, não apenas de aplicação. `categoria=economia` + `fonte=SICONFI` + `source_dataset=SICONFI_DCA` + nomes de indicador específicos (`receita_total_bruta_realizada` etc.) tornam colisão futura com PIB/CAGED/RAIS/RREO/RGF/MSC/ESTBAN estruturalmente improvável, desde que cada fonte futura use `source_dataset` e nomes de indicador próprios — o que é responsabilidade de cada ECO-0X manter, não uma garantia automática do schema.

## 10. Idempotência

Verificado de duas formas independentes:
1. **Reconsulta do estado após as duas execuções da Codex**: 42 indicadores, 0 duplicidades de chave natural.
2. **Terceira execução, própria e independente**, rodada diretamente por mim contra o banco real (sem usar o script da Codex): `inserted=0, updated=0, unchanged=42, evidencePersisted=0`, `rawRecords=11758`, 6 páginas, 6× HTTP 200. Resultado idêntico ao comportamento relatado, confirmado por execução própria, não apenas por reler o relato da Codex.

## 11. Evidence

6 linhas confirmadas em `territory_evidence` para `source_name='Tesouro/SICONFI'`: `SICONFI_DCA:3118601:2020` até `:2025`, cada uma com `source_hash` SHA-256 distinto, sem duplicidade.

## 12. Collection runs

2 runs `completed`, `items_collected=11758`, `items_processed=42`, `items_discarded=11716` em ambas. A semântica de "descartado" é tecnicamente correta (são as ~11.716 linhas brutas do DCA que não correspondem a nenhuma das 7 contas selecionadas — não são erros nem dados problemáticos), mas o termo pode ser mal interpretado por quem não conhece o desenho ("descartado" soa como "perdido"/"erro" a um observador desavisado). **Ressalva registrada**: recomenda-se, em documentação futura de observabilidade (não neste gate), esclarecer que "discarded" no Motor Economia significa "fora do escopo do núcleo fiscal selecionado", não "falha".

## 13. População/join

Confirmado: `demografia/populacao_total/IBGE/SIDRA_6579` existe para Contagem, 2025, valor 651.718, `periodo_inicio=2025-01-01` — mesmo formato de chave de período usado pelo ECO-01, permitindo join futuro por `territory_id + periodo_inicio`. **Achado relevante**: o próprio campo `populacao` embutido no payload do DCA (615.621 para Contagem/2025) **diverge em ~5,6%** do valor oficial IBGE (651.718) — confirmação empírica direta de que usar a população do DCA seria semanticamente incorreto, validando a decisão de descartá-la (`source_population_discarded`, nunca usada em cálculo). Nenhum per capita foi calculado, conforme instruído.

## 14. Nominal vs real

Nenhuma ocorrência de "crescimento real"/"expansão real"/"queda real" foi encontrada em código ou metadata persistida — apenas no próprio relatório da Codex, exclusivamente como ressalva explícita ("valores são nominais... não significam crescimento real") ou como item de metodologia futura pendente (deflator). O campo `metodologia` de cada indicador persistido inclui, no código real, a frase: *"não é indicador político nem valor corrigido por inflação"* — disclaimer embutido no próprio dado, não apenas no relatório.

## 15. Receita bruta

Confirmado (seção 5) que "bruta" é uma escolha real e auditável: as deduções (FUNDEB e outras) existem como linhas separadas na fonte e não foram incorporadas. Os nomes dos indicadores (`..._bruta_realizada`) tornam isso explícito. Risco de interpretação incorreta considerado baixo dado o nome explícito, mas recomenda-se que qualquer consumo futuro em frontend/relatório repita "bruta" no rótulo visível, não apenas no nome técnico do indicador.

## 16. Despesa empenhada

Confirmado que empenhado > liquidado > pago para os valores reais de Contagem/2025 (diferença de ~R$ 133 milhões entre empenhado e pago só na despesa corrente). O nome dos indicadores (`..._empenhada`) e a metadata tornam essa distinção explícita. Regra semântica registrada para integração futura: **o frontend nunca deve rotular esses valores como "gasto efetivo" ou "gasto realizado"** — apenas como "empenhado", já que o dado não representa desembolso.

## 17/18. Indicadores deriváveis e fórmulas propostas (não implementados)

Apenas a possibilidade matemática foi auditada, nenhum derivado foi calculado ou persistido:

- Participação da receita tributária: `receita_tributaria / receita_corrente` (denominador correto: corrente, não total, pois tributária é subconjunto de corrente).
- Dependência de transferências: `transferencias_correntes / receita_corrente`.
- Participação do investimento na despesa de capital: `investimento_empenhado / despesa_capital_empenhada`.
- Per capita (com IBGE, mesmo `reference_year`): `receita_total_bruta_realizada / populacao_total` — **requer validação explícita de que os dois indicadores compartilham o mesmo exercício antes do cálculo**; ausência do ano correspondente deve bloquear o cálculo, nunca usar ano diferente silenciosamente.
- Trajetória/variação nominal ano a ano: diferença simples entre exercícios consecutivos — deve ser rotulada explicitamente como "nominal", nunca "real", sem deflator.

Todas essas fórmulas são propostas para o próximo gate, não implementações deste.

## 19. Fronteiras de Inteligência Política

Auditada a separação proposta pela Codex entre DADO → INDICADOR DERIVADO → SINAL ANALÍTICO → INTERPRETAÇÃO POLÍTICA. Concordo com a fronteira: `transferencias_correntes / receita_corrente` é um indicador quantitativo legítimo e diretamente calculável; rótulos como "município politicamente dependente" são inferência qualitativa que **não pode** ser produzida automaticamente a partir de um único indicador fiscal — exige metodologia, contexto comparativo (outros municípios de porte similar) e, no mínimo, revisão humana. Esta fronteira deve ser preservada explicitamente na futura camada de Inteligência Política do Claude: indicadores fiscais brutos podem alimentar sinais, mas rótulos político-interpretativos exigem uma camada de julgamento separada e auditável, nunca derivação automática direta do dado bruto.

## 20/21. Arquitetura futura (ECO-02/03/04) e risco de confusão Economia≠Fiscal

`categoria=economia` + `source_dataset` distinto por fonte é suficiente para coexistência sem migração de schema, seguindo o mesmo padrão já usado com sucesso por `categoria=saude`/`seguranca`/`demografia` neste projeto. Recomendo que a documentação futura registre explicitamente — como já sugerido pela Codex — que **ECO-01 é o núcleo fiscal do Motor Economia, não o Motor Economia completo**: PIB, emprego, renda, estrutura produtiva e crédito são dimensões econômicas genuínas que o SICONFI/DCA não cobre.

## 22. Teste de município adicional (sem hardcode)

Executado, **somente leitura, sem persistência**: chamada real e normalização (fetch + normalize, sem tocar o coletor/banco) para **Betim/3106705**, exercício 2025. Resultado: 1.840 registros brutos, 1 página, HTTP 200, todas as 7 contas encontradas com exatamente 1 correspondência cada, valores plausíveis e distintos de Contagem (ex.: receita total R$ 3.671.313.162,90). Confirma **ausência de hardcode** de Contagem em `economia-siconfi-client.ts`/`economia-siconfi-normalizer.ts`. Nenhum dado foi persistido no banco para Betim.

## 23. Testes

`npx vitest run lib/territorios/economia`: **3 arquivos, 9 testes, PASS** — confirmado, idêntico ao relatado. Cobertura revisada diretamente (não apenas contada): parâmetros oficiais, filtro defensivo por `cod_ibge`/`exercicio`, paginação por offset, throttling de 1 req/s, ordenação/deduplicação de anos, payload/entrada inválidos, extração exata das 7 contas com rastreabilidade, chave natural por exercício, e falha controlada para conta ausente/duplicada/valor nulo.

Suíte territorial ampliada (`lib/territorios` + `app/api/territorios`): **61 arquivos, 501 testes, PASS** (58/492 antes do ECO-01 nesta mesma sessão — aumento de 3 arquivos/9 testes explicado exatamente pelo ECO-01, sem regressão).

## 24. Typecheck

`npx tsc --noEmit`: **5 erros**, todos em `components/dashboard/territorios/analytical/*` (`MetricCard.tsx`, `TimeSeriesPanel.tsx`) — módulos ausentes (`TrendIndicator`, `MethodologyTooltip`) e um erro de tipagem. **Nenhum desses arquivos pertence ao ECO-01 nem importa de `lib/territorios/economia-*`**; é trabalho concorrente do Antigravity (diretório inteiramente não rastreado, em desenvolvimento). Confirmado via `git status` que esses arquivos já existiam como `??` antes de qualquer ação desta auditoria.

## 25. Lint

`npx eslint` restrito aos 7 arquivos do ECO-01 (client, normalizer, collector + testes + script de auditoria): **0 erros, 0 warnings**.

## 26. Build

`npm run build` falha — **exclusivamente** no mesmo arquivo do Antigravity (`TimeSeriesPanel.tsx:61`), erro de tipagem em prop de gráfico, sem qualquer relação com `lib/territorios/economia-*`. Não é uma regressão introduzida pelo ECO-01.

## 27. Regressões

**Nenhuma regressão atribuível ao ECO-01.** As únicas falhas observadas (typecheck e build) originam-se de arquivos 100% pertencentes ao trabalho concorrente do Antigravity, não tocados nesta auditoria, e devem ser resolvidos pela linha de trabalho responsável antes do próximo `npm run build` bem-sucedido do repositório como um todo — isso é uma constatação de estado do worktree compartilhado, não uma correção necessária no ECO-01.

## 28. Git status final

Confirmado ao final da auditoria: os 8 arquivos do ECO-01 permanecem exatamente como estavam — não rastreados (`??`), nenhuma linha alterada, nenhum commit, nenhum stage. Nenhum arquivo do Antigravity foi tocado, lido para edição ou incorporado. Nenhum `reset`/`rebase`/checkout destrutivo foi executado. Branch permanece `main`. Worktrees paralelos (TSE, Claude, releases) não foram alterados.

## 29. Riscos

- Termo "descartado" em `items_discarded` pode confundir observabilidade futura sem documentação (ressalva, não bloqueante).
- Mudança de taxonomia/código DCA entre exercícios futuros: mitigado pelo fail-fast (`SICONFI_EXPECTED_SINGLE_ROW`), que impede persistência silenciosa de dado errado — comportamento correto e já testado.
- Retificação histórica da fonte: o motor trata corretamente via `update` controlado na segunda coleta; não testado neste gate (fonte não mudou entre a coleta da Codex e a minha), documentado como comportamento esperado, não verificado ao vivo.
- `receita_tributaria_bruta_realizada` inclui "Contribuições de Melhoria" além de impostos e taxas — nome é uma simplificação aceitável mas não literal; mitigado por metadata completa (`raw_name`).

## 30. Correções necessárias

Nenhuma correção bloqueante identificada no código do ECO-01. Recomendação não bloqueante: documentar explicitamente a semântica de "discarded" quando o motor for exposto a qualquer camada de observabilidade voltada a não-desenvolvedores.

## 31. Recomendação

**HOMOLOGADO.** A fonte, os 7 indicadores, os valores, a temporalidade, a chave natural (confirmada até o nível de índice de banco), a idempotência (confirmada por execução própria e independente) e a evidência foram todos verificados diretamente contra a API real e o banco real — não apenas contra o relatório da Codex. O teste de Betim confirma ausência de hardcode. As únicas falhas de regressão observadas (typecheck/build) são inteiramente externas ao escopo do ECO-01.

## Gate final

- FONTE SICONFI: **PASS**
- SEMÂNTICA DAS 7 CONTAS: **PASS**
- COLUNAS (bruta/empenhada vs alternativas): **PASS**
- VALORES CONTAGEM: **PASS**
- SÉRIE 2020-2025: **PASS**
- TEMPORALIDADE: **PASS**
- NATURAL KEY (confirmada no banco): **PASS**
- IDEMPOTÊNCIA (verificada por execução independente): **PASS**
- EVIDENCE: **PASS**
- RUNS: **PASS COM RESSALVA** (semântica de "discarded" pode confundir observabilidade não-técnica futura)
- POPULAÇÃO/JOIN: **PASS COM RESSALVA** (join estruturalmente seguro; per capita ainda não implementado, deve validar ano explicitamente quando implementado)
- NOMINAL VS REAL: **PASS**
- RECEITA BRUTA: **PASS**
- DESPESA EMPENHADA: **PASS**
- DERIVADOS: **PASS COM RESSALVA** (matematicamente possíveis, corretamente não implementados; fórmulas e denominadores documentados para o próximo gate)
- FRONTEIRA POLÍTICA: **PASS**
- ARQUITETURA MULTIFONTE: **PASS**
- TESTE MUNICÍPIO ADICIONAL (Betim, read-only): **PASS**
- REGRESSÕES: **NÃO** (falhas observadas em typecheck/build são 100% de trabalho concorrente do Antigravity, não do ECO-01)
- RISCO BLOQUEANTE: **NÃO**

**STATUS: HOMOLOGADO**

**PRONTO PARA ECO-02: SIM**

**PRONTO PARA INTEGRAR AO ORQUESTRADOR: NÃO — integração depende de decisão posterior, conforme instruído.**
