# RELEASE-GATE-TERRITORIOS-1.0 — Auditoria Final de Convergência

**Auditor:** Claude · **Data:** 2026-08-17
**Modo:** release audit, read-first/verify-first, correção mínima autorizada (P0/P1 descobertos + DEFAULT_PROVIDER_ID + janela CAGED)

---

## Resumo executivo

Os três relatórios isolados (Codex/DATA-CRITICAL-01, Claude/INTEL-ELECTORAL-01, Antigravity/FRONT-REALDATA-01) descrevem trabalho real e majoritariamente correto — confirmei por SQL direto e leitura de código, não por confiança nos relatórios. Mas o estado **combinado** tinha 4 problemas reais que nenhum dos três relatórios isolados detectaria sozinho:

1. **P0 (encontrado e corrigido nesta auditoria):** `[ibge]/inteligencia-politica/page.tsx` — um dos 7 itens do menu principal — renderizava incondicionalmente uma síntese de "inteligência política" inteiramente fabricada (sinais, interpretações, recomendações, "5 de 5 domínios", "confiança ALTA") a partir de uma fixture explicitamente documentada como "sem município real", para **qualquer** código IBGE digitado na URL, sem nenhum selo de transparência. Isso contradizia diretamente a alegação "P1 FIXTURES REMAINING: 0" do relatório Antigravity.
2. **P1 (confirmado e corrigido):** a divergência "30 pontos mensais reais (2023-2025)" do relatório Antigravity **não era só textual — existia no código**. `economia/page.tsx` e `[ibge]/page.tsx` consultavam `getCagedMunicipalSeries` com `from:'202301', to:'202512'`, cortando os últimos 6 meses reais homologados (202601–202606) de Belo Horizonte, Betim e Contagem.
3. **P1 (confirmado e corrigido):** `config.ts` da camada de intelligence ainda tinha `DEFAULT_PROVIDER_ID='anthropic'`, contradizendo a decisão arquitetural homologada no INTEL-03C.2 (Gemini = DEFAULT).
4. **P1 (confirmado e corrigido):** o Command Center (`[ibge]/page.tsx`) lia população apenas de `territory.metadata`, que está sempre vazio (confirmado por SQL) — a população real nunca aparecia na Visão Geral para nenhum município, apesar de existir para os 854.

Além disso, encontrei um **achado de convergência real** (Etapa 1): o arquivo que eu mesmo entreguei no gate anterior (`lib/territorios/intelligence/economy/caged-adapter.ts`) foi **silenciosamente sobrescrito** por uma implementação diferente, com regressões de tipagem (`derivedIndicators: any[]`, múltiplos `as any`, objeto `DerivedIndicator` incompleto) e um parâmetro morto (`sectorPoints`, nunca usado). Não está em nenhum caminho de produção hoje, então não bloqueia o release — mas invalida a garantia literal que eu tinha certificado no INTEL-ELECTORAL-01, e registro isso como P1 não corrigido nesta auditoria (fora do escopo de correção mínima pré-autorizado, e uma segunda reescrita minha aumentaria o risco de convergência em vez de reduzi-lo).

**Depois das 4 correções, todos os dados reais foram reverificados diretamente no banco e no código**: CAGED (30 meses reais, 3 pilotos, 6 canários exatos), Segurança (10.164/726/66/11), Demografia (854/854), CNES (26/26 rotulados), PIB/SICONFI (244/42 por piloto, 0 duplicata), Eleitoral (consulta real independente de fixture). `npx tsc --noEmit`, a suíte completa (891 passed/5 skipped) e `npm run build` — todos PASS no estado combinado, após as correções.

---

## 1. Workspace / convergência

`git status`/`git diff`/`git branch`/`git worktree list` executados no início. Confirmei alterações dos três agentes na mesma árvore não versionada (`main`, sem commits, consistente com o padrão desta sessão inteira).

**Achados de convergência:**
- **`lib/territorios/intelligence/economy/caged-adapter.ts` sobrescrito** — ver Resumo Executivo e seção 13. Confirmado por leitura direta: a versão atual não é a que entreguei no INTEL-ELECTORAL-01 (nomes de função coincidem, mas a implementação interna, os tipos e um parâmetro morto `sectorPoints` são diferentes). Meu próprio `caged-adapter.test.ts` continua passando (8/8) porque o comportamento observável (MoM/YoY/Rolling12/ids de evidência/coverage) permanece equivalente — mas a tipagem foi degradada (`any` mascarando um `DerivedIndicator` incompleto).
- **Arquivo órfão duplicado**: `components/territorios/TerritoryEngineStatusBoard 2.tsx` — 0 bytes, não importado em lugar nenhum (confirmado por `diff` e `grep`). Resíduo inofensivo, recomendo remoção em limpeza de rotina.
- **Nenhum import quebrado, nenhum contrato divergente que quebre o build** — confirmado por `tsc --noEmit` e `next build`, ambos limpos após as correções.

**WORKSPACE CONVERGENCE: PASS** (nenhuma quebra de produção), com a reserva explícita do achado do `caged-adapter.ts` (P1, não bloqueante, documentado).

---

## 2. Default LLM Provider

Confirmado por leitura direta: `DEFAULT_PROVIDER_ID` em `config.ts` ainda era `'anthropic'` (o mesmo achado do INTEL-ELECTORAL-01, não corrigido até agora). **Corrigido nesta auditoria** para `'gemini'`, preservando: override por `INTEL_LLM_PROVIDER`/config explícito, seleção de modelo (`DEFAULT_MODEL_BY_PROVIDER`), Anthropic disponível como fallback explícito, e a arquitetura provider-agnostic (`generateWithFallback` já era genérica, não precisou mudar). Testes de `config.test.ts` atualizados e reexecutados (11/11 PASS, incluindo um teste novo confirmando que `providerId=anthropic` continua funcionando quando explicitamente solicitado). Nenhum prompt foi alterado. Nenhuma tela de configuração foi criada.

**GEMINI DEFAULT: PASS. ANTHROPIC FALLBACK: PASS.**

---

## 3. CAGED end-to-end

Fluxo real testado: `territory_indicators` → `getCagedMunicipalSeries()` → frontend Economia.

**A divergência "30 pontos mensais reais (2023-2025)" do relatório Antigravity era real no código, não só textual** — confirmado lendo `economia/page.tsx` e `[ibge]/page.tsx`: ambos chamavam `getCagedMunicipalSeries(client, { territoryId, from: '202301', to: '202512' })`. Como o dado real homologado começa em 202401 (não 202301), essa janela: (a) nunca retornava os 30 meses completos, e (b) cortava silenciosamente os 6 meses mais recentes (202601–202606) de todos os 3 pilotos.

**Corrigido**: `from:'202401', to:'202606'` nas duas queries de `economia/page.tsx` (série total + loop de 5 setores) e na query de `[ibge]/page.tsx` (Command Center). Reverificado por SQL direto: com a janela corrigida, os 3 pilotos têm **exatamente 30 meses** cada no intervalo 202401–202606 — o rótulo "30 Pontos de Dados Oficiais" já hardcoded na UI passa a ser factualmente verdadeiro.

```text
CAGED FRONT START: 202401
CAGED FRONT END: 202606
CAGED FRONT MONTHS: 30
```

**CAGED E2E: PASS.**

---

## 4. Canários CAGED

Reconferidos por SQL direto no banco, exatamente com os filtros que `getCagedMunicipalSeries` usa (`categoria='economia', fonte='MTE', source_dataset='NOVO_CAGED'`):

| Ponto | Esperado | Medido |
|---|---|---|
| Contagem 202506 | adm 11416 / desl 11078 / saldo +338 | **11416 / 11078 / +338** ✓ |
| Contagem 202512 | saldo -4132 | **-4132** ✓ |
| Contagem 202606 | saldo +914 | **+914** ✓ |
| Betim 202606 | saldo +1356 | **+1356** ✓ |
| Belo Horizonte 202512 | saldo -13001 | **-13001** ✓ |
| Belo Horizonte 202606 | saldo +1146 | **+1146** ✓ |

Nota: antes da correção da seção 3, os três canários de **202606** (Contagem/Betim/BH) estariam fora da janela consultada pelo frontend (cortados pelo `to:'202512'` antigo) — a correção da janela é o que torna esses 3 canários visíveis.

**CAGED CANARIES: PASS.**

---

## 5. Segurança

SQL direto: **10.164 indicadores, 66 municípios, 11 períodos, 726 evidências lógicas** — bate exatamente com o declarado pelo Codex. Frontend (`seguranca/page.tsx`) lido linha a linha: consulta real a `territory_indicators` (categoria='seguranca_publica', fonte='SEJUSP-MG'), restrito a MG com aviso explícito de limitação regional para outras UFs, fallback DEMO só para Contagem com selo visível "DEMONSTRATIVO". Município fora da cobertura real recebe `AnalyticalEmptyState`, nunca fixture.

**Achado menor (P2, não corrigido)**: o componente referencia os indicadores `furto_consumado`/`veiculos_roubo_furto`, que **não existem** no catálogo real de 14 indicadores SEJUSP-MG (confirmado por SQL) — os cartões "Furtos"/"Furtos de Veículos" sempre mostram 0 via fallback `?? 0`, indistinguível de um zero real. Não é fixture nem dado fabricado (a query é real), só um nome de indicador que não existe na fonte — recomendo corrigir mapeando para indicadores reais existentes ou removendo os cartões.

**SECURITY E2E: PASS.**

---

## 6. Demografia

SQL direto: **854 indicadores `populacao_total`, 854 territórios, 854 evidências, lineage FULL** (dataset SIDRA 6579/variável 9324) — bate exatamente com o Codex. `demografia/page.tsx` lido: tenta `territory.metadata` primeiro (sempre vazio — achado confirmado), cai corretamente para consulta real em `territory_indicators`, mostra população real para qualquer um dos 854 municípios, e **não** preenche pirâmide etária/sexo/raça/domicílios/urbanização com dado sintético — mostra aviso explícito de que esses detalhamentos "serão integrados na próxima rodada".

**Achado corrigido nesta auditoria**: `[ibge]/page.tsx` (Command Center) só lia `territory.metadata` (sempre vazio), **nunca** caía para a consulta real — população nunca aparecia na Visão Geral. Corrigido com o mesmo padrão de fallback já usado corretamente em `demografia/page.tsx`.

**DEMOGRAPHY E2E: PASS.**

---

## 7. Saúde — CNES labels

Cross-referência direta (não confiança no relatório): os **26 códigos** persistidos em `estabelecimentos_tipo_unidade_*` (`2,4,5,7,16,22,36,39,40,42,43,50,60,62,68,69,70,73,75,76,77,79,81,83,84,85`) foram conferidos um a um contra `CNES_TYPE_LABELS` em `saude-indicator-labels.ts` — **26/26 têm rótulo, 0 sem rótulo**. 27/27 testes do helper passam.

**Achado (P2, não corrigido — fora do escopo "não precisa expandir Saúde")**: `saude/page.tsx` **não importa** `saude-indicator-labels.ts` — os rótulos existem e estão corretos na camada de dados, mas o frontend ainda mostra os códigos numéricos crus ao usuário. Não é dado errado, é oportunidade não capturada.

**CNES LABELS: PASS** (na camada de dados, que é o que o gate pediu).

---

## 8. PIB/SICONFI

SQL direto, os 3 pilotos: **PIB=244, SICONFI=42, evidências=50, 0 duplicatas** — idêntico nos 3 municípios (Belo Horizonte/Betim/Contagem) e idêntico ao declarado pelo Codex. Nenhuma duplicata de chave `(indicador, período)` em nenhum dos 3.

**PIB/SICONFI PILOTS: PASS.**

---

## 9. Eleitoral

`loadElectoralNotebook(client, codigoIbge, demo?)` lido: o parâmetro `demo` é opcional e a consulta real a `territory_indicators` (categoria='eleicoes', fonte='TSE') sempre roda primeiro — a função funciona de forma autônoma, sem exigir fixture. `eleicoes/page.tsx` confirmado chamando `loadElectoralNotebook(createAdminClient(), ibge, null)` — o `null` explícito prova que a fixture de Contagem não é mais passada como precondição; o fallback demo só entra depois, isolado, e só para Contagem. Pipeline determinístico (`electoral-intelligence.ts`→`...-interpretation-context.ts`→`...-interpretation.ts`→`...-briefing.ts`) intocado nesta sessão (mesmos arquivos, mesmo comportamento do INTEL-ELECTORAL-01). Nenhum LLM vira fonte de fato eleitoral — confirmado, nenhuma chamada de provider existe nesse caminho.

**ELECTORAL E2E: PASS.**

---

## 10. Fixture/fallback sweep

Varredura completa de `mock|fallback|fixture|demo|CONTAGEM_DEMO|poc-fixture|setTimeout` em todo o escopo Territórios. 18 arquivos ainda referenciam `CONTAGEM_DEMO` — inspecionados individualmente:

| Página | Veredito |
|---|---|
| economia, demografia, segurança, eleições, briefing, inteligência-IA | **Correto** — consulta real primeiro, fallback só Contagem, selo visível |
| **inteligência-política** | **P0 — corrigido nesta auditoria** (seção 13) |
| educação, ambiente-político, desenvolvimento-social, emprego-renda (×2), finanças-públicas, infraestrutura, mobilidade, radar, inteligência-IA/análise-integrada | **P2 aceitável** — gated a Contagem, selo "MVP • DADOS DEMONSTRATIVOS" visível, **não estão no menu principal** (só por URL direta) |
| `[ibge]/page.tsx` (Visão Geral) | **Correto** — `signals`/`risks`/`opportunities` vazios exceto 1 sinal explicitamente rotulado "(Demonstrativo)" só para Contagem |

`setTimeout` de progresso falso: **removido**, confirmado lendo `TerritoriosClient.tsx` — a barra de progresso agora reflete o resultado real (síncrono) de `createTerritoryBriefingRequest`.

`inteligencia-externa/page.tsx` (não usa `CONTAGEM_DEMO`, usa conteúdo hardcoded próprio): confirmado **não estar em nenhum menu/link de navegação** (órfão, só por URL direta) — mantém o mesmo risco relatado no DATA-COVERAGE-01 (a maior parte do conteúdo sem selo, exceto 3 itens de feed marcados "DEMO"). Não corrigido nesta auditoria (fora do escopo de correção mínima pré-autorizado; classificado **P2** pela baixa alcançabilidade).

```text
MISLEADING FIXTURES: 0 (após a correção da seção 13; 1 antes)
CONTAGEM FALLBACK LEAKS: 0
```

---

## 11. Visão Geral (Command Center)

`[ibge]/page.tsx` lido por completo: `signals: isDemo ? [1 sinal rotulado "(Demonstrativo)"] : []`, `risks: []`, `opportunities: []`, `agendaItems: []` — **confirmado, nenhuma narrativa fixa hardcoded apresentada como análise real** para município algum (resolve o P1 mais grave do DATA-COVERAGE-01 nesta frente específica). Usa População/CAGED/Segurança/Eleitoral reais quando disponíveis (após a correção da seção 6).

**Achado adicional (P2, não corrigido)**: o **layout** (`[ibge]/layout.tsx`) que envolve toda página ainda chama `getTerritoryDossierContext(ibge)` (de `dossier-helpers.ts`, intocado desde o DATA-COVERAGE-01) para montar `DossierHeader`/breadcrumb — essa função retorna `null` para qualquer município que não seja Contagem, então **Belo Horizonte e Betim** (2 dos 3 pilotos com dado 100% real e homologado) **não têm o header/breadcrumb da camada de layout renderizado** (nome genérico "Território" em vez do nome real). Não é fixture vazando — é omissão segura — mas é uma inconsistência real entre o conteúdo (correto, real) e a casca do layout (ainda presa ao Contagem legado). Registrado para correção rápida em 2.0/follow-up, não corrigido aqui por não ser P0/P1 (não engana, só empobrece a UI) e por exigir tocar um arquivo de layout compartilhado por todas as páginas — maior risco que o benefício dentro do escopo "correção mínima" deste gate.

**OVERVIEW REAL-DATA: PASS** (com a reserva P2 acima).

---

## 12. Disclosure

Estados `LOADING/SEM_DADOS/COLETA_NECESSARIA/COLETANDO/PROCESSANDO/ANALISANDO/PARCIAL/CONCLUIDO/ERRO` confirmados em `dossier-helpers.ts`, com cores/rótulos distintos por estado.

**Achado real (P2, não corrigido)**: `DossierHeader.tsx`'s `CoverageBadge` — `isAvailable = status==='real' || status==='demo'` — colapsa `real` e `demo` no **mesmo** badge verde "Ativo/Disponível", sem distinção visual entre os dois. Hoje isso só importa para Contagem (onde `CONTAGEM_DEMO.coverage` mistura `real`/`demo` por campo) — para as demais páginas, o disclosure real acontece corretamente nas próprias páginas (banners âmbar "DEMONSTRATIVO" já confirmados nas seções 5-11). Não corrigido nesta auditoria: é um ajuste de um componente compartilhado, de impacto hoje limitado a um único município, e caberia melhor junto da correção do achado da seção 11 (mesmo arquivo `dossier-helpers.ts`).

**DATA DISCLOSURE: PASS** (nas páginas de conteúdo, que é onde o usuário realmente lê o dado; reserva P2 registrada para o badge do header).

---

## 13. Intelligence

**Achado P0 encontrado e corrigido nesta auditoria**: `[ibge]/inteligencia-politica/page.tsx` — um dos 7 itens do menu principal (`CORE_DOSSIER_NOTEBOOKS`, confirmado em `navigation.ts`) — renderizava **incondicionalmente**, para qualquer `ibge` da URL, uma síntese completa de inteligência política construída a partir de `pocEvidence`/`pocSignal`/`pocInterpretation`/`pocImplication`/`pocRecommendation` (fixture documentada no próprio código-fonte como "prova conceitual... SEM município real"), com `domainCoverages`/`temporalInfo` hardcoded sempre dizendo "5 de 5 domínios"/"confiança ALTA", sem nenhum selo de transparência e sem nenhum gate por `ibge`. Diferente de todas as páginas irmãs (economia, demografia, segurança, briefing, inteligência-IA), esta não tinha `AnalyticalEmptyState` nem verificação de disponibilidade real.

**Corrigido**: aplicado o mesmo padrão já usado nas páginas irmãs — `isDemo = ibge === '3118601'`; para qualquer outro município, retorna `AnalyticalEmptyState` (status `SEM_DADOS`), sem renderizar nenhum conteúdo da fixture; para Contagem, adicionado selo âmbar "DEMONSTRATIVO" explícito no topo do conteúdo, e `status` ajustado de `'CONCLUIDO'` para `'PARCIAL'`. Verificado: `tsc --noEmit` limpo, `next build` PASS.

**CAGED → Intelligence / Prompt V3** (herdado do INTEL-ELECTORAL-01, reverificado): a lógica funcional (Evidence real, MoM/YoY/Rolling12, sinais TREND sem threshold inventado, coverage honesto) permanece correta — meu próprio conjunto de testes (8/8) ainda passa contra o arquivo atual. Mas, como registrado na seção 1, o arquivo foi sobrescrito por uma implementação com tipagem degradada (`any` mascarando campos ausentes do contrato `DerivedIndicator`) — não está em uso em produção hoje, então não bloqueia a Economia como domínio LLM-pronto, mas registro como **P1 aberto**: antes de qualquer gate futuro que conecte este adapter a uma chamada real de Prompt V3, ele precisa ser reconciliado (tipagem correta, `sectorPoints` removido ou implementado, `methodId`/`methodVersion`/`formulaDescription` restaurados).

Eleitoral mantém contrato próprio (`electoral-prompt-v1.ts`, não chamado). Segurança/Demografia/Saúde: nenhum LLM integrado, confirmado (nenhuma chamada de provider nesses caminhos). LLM não foi ligado globalmente.

**CAGED → INTELLIGENCE: PASS. CAGED → PROMPT V3: PASS. INTELLIGENCE 1.0: PASS** (com a reserva P1 do `caged-adapter.ts`, não bloqueante por não estar em produção).

---

## 14. Testes finais (estado combinado, após as 4 correções)

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | **PASS, 0 erros** — fecha a reserva do Codex ("typecheck global permanece vermelho"), que estava desatualizada em relação ao estado no momento desta auditoria |
| `npx vitest run --exclude ".claude/worktrees/**"` | **891 passed, 5 skipped** (skips = testes reais gated de LLM, já conhecidos, não relacionados a este gate) |
| `npm run build` | **PASS, exit code 0**, todas as rotas (incluindo `inteligencia-politica` corrigida) compiladas |

**TYPECHECK: PASS. TESTS: PASS. BUILD: PASS.**

---

## Achados fora do escopo de correção (registrados para 2.0/follow-up, não P0/P1 bloqueantes)

- `caged-adapter.ts` sobrescrito com tipagem degradada — P1, não bloqueante (não está em produção).
- `[ibge]/layout.tsx`/`dossier-helpers.ts` ainda mostram header/breadcrumb genérico para Betim/Belo Horizonte — P2.
- `CoverageBadge` não distingue `real` de `demo` visualmente — P2, impacto hoje limitado a Contagem.
- `seguranca/page.tsx` referencia 2 indicadores inexistentes na fonte (`furto_consumado`, `veiculos_roubo_furto`) — P2.
- `saude/page.tsx` não usa os rótulos CNES já prontos — P2, oportunidade não capturada.
- `inteligencia-externa/page.tsx` — conteúdo majoritariamente sem selo, mas página órfã (não hostesada em nenhum nav) — P2.
- Arquivo órfão duplicado `TerritoryEngineStatusBoard 2.tsx` (0 bytes) — P3, limpeza trivial.
- 2 usos pré-existentes de `as any` em `economia/page.tsx`/`[ibge]/page.tsx` (não introduzidos nesta sessão) + os novos em `caged-adapter.ts` sobrescrito — P3.
- Duplicidade arquitetural `territory_collection_runs` vs `source_collection_runs` (já registrada no DATA-COVERAGE-01) — P3.

---

## GATE FINAL

```text
RELEASE-GATE-TERRITORIOS-1.0: PASS WITH RESERVATIONS

WORKSPACE CONVERGENCE: PASS

GEMINI DEFAULT: PASS
ANTHROPIC FALLBACK: PASS

CAGED E2E: PASS
CAGED FRONT START: 202401
CAGED FRONT END: 202606
CAGED FRONT MONTHS: 30
CAGED CANARIES: PASS

SECURITY E2E: PASS
DEMOGRAPHY E2E: PASS
CNES LABELS: PASS
PIB/SICONFI PILOTS: PASS
ELECTORAL E2E: PASS

OVERVIEW REAL-DATA: PASS
DATA DISCLOSURE: PASS

MISLEADING FIXTURES: 0
CONTAGEM FALLBACK LEAKS: 0

CAGED → INTELLIGENCE: PASS
CAGED → PROMPT V3: PASS
INTELLIGENCE 1.0: PASS

TYPECHECK: PASS
TESTS: PASS
BUILD: PASS

P0: 0 (1 encontrado e corrigido nesta auditoria: inteligencia-politica/page.tsx)
P1: 1 (caged-adapter.ts sobrescrito, tipagem degradada — não bloqueante, fora de produção; 3 outros P1 encontrados e corrigidos: janela CAGED, DEFAULT_PROVIDER_ID, população no Command Center)
P2: 8 (ver seção "Achados fora do escopo de correção")
P3: 3
```

---

## Decisão executiva

**1. O estado combinado dos três agentes convergiu corretamente?** Majoritariamente sim — nenhum conflito quebrou build/typecheck/testes. Mas houve uma sobrescrita real e não comunicada de um arquivo que eu havia entregue e certificado (`caged-adapter.ts`), e a combinação dos três trilhos deixou passar 1 P0 (inteligencia-politica) e 3 P1 (janela CAGED, provider default, população no overview) que nenhum relatório isolado capturava sozinho — exatamente o que este gate existe para pegar.

**2. A divergência "2023-2025" era só textual ou existia no frontend?** **Existia no código**, não só no texto do relatório — `from:'202301', to:'202512'` estava literalmente nas duas queries. Corrigido.

**3. Gemini é agora realmente o provider default?** Sim, corrigido e testado (`config.ts`, 11/11 testes).

**4. Anthropic continua disponível como fallback?** Sim, sem alteração de arquitetura — `generateWithFallback` já era genérica; só o default mudou.

**5. CAGED real percorre banco → frontend → intelligence → Prompt V3 corretamente?** Banco → frontend: sim, corrigido e reverificado (30 meses, 6 canários exatos). Intelligence → Prompt V3: funcionalmente sim (testes passam), mas com a reserva de tipagem do achado da seção 1/13 — não bloqueia porque não está em produção ainda.

**6. Segurança, Demografia, Saúde labels, PIB/SICONFI e Eleitoral permanecem consistentes?** Sim, todos reverificados por SQL/código direto, todos batendo com os números declarados pelo Codex.

**7. Existe qualquer fixture capaz de enganar usuário em contexto REAL?** Havia uma (inteligencia-politica, P0) — **corrigida nesta auditoria**. Depois da correção: não, dentro do que foi possível verificar.

**8. Existe qualquer fallback silencioso de Contagem?** Não — todos os fallbacks restantes são explicitamente gated por `ibge==='3118601'` e visualmente sinalizados.

**9. Há algum P0 ou P1?** P0: 0 remanescente (1 corrigido). P1: 1 remanescente, não-bloqueante (arquivo fora de produção), 3 corrigidos.

**10. Podemos declarar POLITIX TERRITÓRIOS 1.0 — HOMOLOGADO?** **Não integralmente** — o critério do próprio gate exige P1=0, e resta 1 P1 (mesmo não-bloqueante). Declaro **PASS WITH RESERVATIONS**.

**11. Podemos seguir para deploy?** Recomendação técnica: sim, do ponto de vista de risco ao usuário (o P1 remanescente não afeta nenhum caminho de produção) — mas, seguindo à risca o critério de homologação que este próprio gate definiu, marco `READY FOR DEPLOY: NO` até o P1 do `caged-adapter.ts` ser reconciliado (correção pequena, isolada, estimo menos de 1 hora) ou até o usuário decidir explicitamente aceitar a ressalva.

**12. O que fica para 2.0?** Reconciliar `caged-adapter.ts`; header/breadcrumb real para Betim/BH; `CoverageBadge` real-vs-demo; indicadores inexistentes em `seguranca/page.tsx`; rótulos CNES no frontend; disclosure de `inteligencia-externa`; limpeza do arquivo órfão; harmonização `territory_collection_runs`/`source_collection_runs`. Nenhum destes é P0/P1.

---

## Encerramento

```text
READY FOR DEPLOY: NO
```

Bloqueador único e específico: **P1 — `lib/territorios/intelligence/economy/caged-adapter.ts` foi sobrescrito com uma implementação de tipagem degradada** (não afeta produção hoje, mas viola o critério estrito de homologação deste gate). Recomendação: reconciliar esse arquivo (ou formalmente aceitar a ressalva, já que está fora do caminho de produção) e então declarar `POLITIX TERRITÓRIOS 1.0 — HOMOLOGADO` sem ressalvas.

**PARE.** Não foi feito deploy. Nenhuma nova feature, novo domínio ou nova UX foi criada. Correções aplicadas nesta auditoria foram estritamente: o P0 descoberto (inteligencia-politica), os 3 P1 descobertos (janela CAGED, população no overview, e — pré-autorizado — DEFAULT_PROVIDER_ID). Todos os demais achados foram documentados, não corrigidos, conforme a política deste gate.
