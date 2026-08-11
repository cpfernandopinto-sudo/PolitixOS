# Relatório — Bloco 4.6: Validação Final do Batch + Adaptação do n8n

**Data:** 2026-08-11
**Escopo:** validação real do caminho INSERT com amostra maior; adaptação do workflow n8n `POLITIX TERRITÓRIOS — SEGURANÇA MG — ORQUESTRADOR` (`HYzP2jdG5DtlceQp`) para `mode=batch`; homologação real ponta-a-ponta (n8n → PolitixOS → SEJUSP → Supabase → checkpoint).
**Não executado neste bloco:** os 853 municípios de MG.

---

## 1. Auditoria inicial

`docs/RELATORIO_TERRITORIOS_BLOCO4_5_BATCH_SEGURANCA.md` relido integralmente. Workflow `HYzP2jdG5DtlceQp` auditado via `get_workflow_history`: última alteração real em **2026-08-11T15:21:07Z**, dentro do Bloco 4.4 — confirmado que não foi tocado desde então, antes de qualquer alteração deste bloco.

---

## 2. Seleção dos 5 municípios genuinamente novos

Consulta direta ao Supabase confirmou **838 municípios de MG** ainda sem nenhum registro em `territory_indicators` (categoria `seguranca_publica`). Seleção determinística por **percentil populacional** (min/p25/p50/p75/max, mesmo critério objetivo do Bloco 4.4) entre esse conjunto:

| Critério | codigo_ibge | Município | População |
|---|---|---|---|
| min | 3115607 | Cedro do Abaeté | 1.084 |
| p25 | 3120409 | Cristiano Otoni | 4.719 |
| p50 | 3154150 | Reduto | 8.246 |
| p75 | 3159902 | Santo Antônio do Amparo | 17.657 |
| max | 3170206 | Uberlândia | 761.835 |

Confirmado por SQL direto: **0 registros** de segurança pública para os 5 antes da execução.

(Duas amostras adicionais, também por percentil sobre o conjunto ainda não coletado, foram usadas depois para os testes reais via n8n — Fases 12 e 13 — para não reutilizar municípios já tocados pela validação direta.)

---

## 3-4. Teste real batch-5 (caminho INSERT) + performance

Execução direta (`runSecurityCollection`, `mode=batch`, `months=12`) contra Supabase e SEJUSP-MG reais:

- **5/5 territórios completos**, `overallStatus: partial` (esperado — municípios de MG fora do lote aparecem em `unmatchedMunicipalities`, não é falha; ver §16).
- **1 download** (2 arquivos anuais — janela cruza 2025/2026 —, nunca 5), **770 indicadores** persistidos (154/município — Uberlândia, apesar de ~700× mais populosa, gerou o mesmo número de indicadores, já que o volume de linhas de origem não afeta a contagem de indicadores agregados).
- Verificado fisicamente: 154 linhas por município em `territory_indicators`, `collection_run` por território com `metadata.mode=batch` e o mesmo `request_id` do lote.

**Timings medidos:**

| Fase | ms |
|---|---|
| download | 2.468 |
| parse | 126 |
| normalization | 20 |
| processing (resolução território) | 1.980 |
| persistência (total, 5 territórios) | 8.198 |
| **total** | **12.803** |

**Persistência por território (ms):** 2.627 / 1.762 / 1.122 / 1.489 / 1.198 → **média 1.640, mín 1.122, máx 2.627, p50 1.489, p95≈2.454** (interpolado; `n=5`, próximo do máximo por amostra pequena).

Comparação com a medição anterior do Bloco 4.5 (`n=1`, 1.690 ms): **consistente** — reforça que a estimativa de custo por território no caminho INSERT é estável, não um outlier.

---

## 5. Reestimativa da projeção 853

| | Base (sem margem) | Com margem de segurança |
|---|---|---|
| **batch-5** (171 lotes) | ~36,5 min | ~48 min (margem 1,5×, reduzida do 2× do Bloco 4.5 — agora `n=5` real, não `n=1`) |
| **batch-10** (86 lotes, comparação) | ~30,4 min | ~42,2 min |

Premissa: os 853 municípios são, em sua esmagadora maioria, coleta nova (caminho INSERT) — a mesma premissa do Bloco 4.5, agora com evidência mais robusta.

**Achado novo, real, não hipotético:** o total medido do lote-5 (12,8 s) já excedia o limite padrão da Vercel no plano Hobby (10 s) e ficava justo no default do Pro (15 s), sem `maxDuration` explícito na rota. **Corrigido** adicionando `export const maxDuration = 60` a `app/api/territorios/seguranca/collect/route.ts` — cobre o caminho INSERT com folga (~5×), mas **não** cobre com segurança um lote que caia inteiramente no caminho de reprocessamento (UPDATE) — comprovado adiante, na Fase 14.

---

## 6-11. Adaptação do workflow n8n

Arquitetura anterior (Bloco 4.4): 1 chamada `mode=single` por município, com tentativa (nunca totalmente confiável) de concorrência controlada via `options.batching` do nó HTTP. Nova arquitetura: **1 chamada `mode=batch` por grupo de até 5 municípios**, reaproveitando o pipeline já homologado no Bloco 4.5.

**Preservado, sem recriar do zero:** fila município-a-município (`seguranca_mg_queue`), execução/checkpoint (`seguranca_mg_runs`), retomada por `mg_run_id`, credencial `Header Auth segurança` (reutilizada — nenhum novo secret criado, nenhum valor impresso em nenhum momento).

**Novo:**
- `MAX_BATCH_OPERACIONAL = 5` — teto operacional desta versão, aplicado via `Math.min()` em `Normalizar Payload`, mesmo o contrato de `mode=batch` aceitando até 10 (`MAX_BATCH_SIZE`).
- Data Table `seguranca_mg_batches` — checkpoint por lote: `mgRunId`, `batchNumber`, `batchTotal`, `requestIdBatch`, `territoriesJson`, `status`, `startedAt`, `finishedAt`, `attempts`.
- Coluna `indicatorsPersisted` adicionada a `seguranca_mg_queue`.
- Nó `Montar Payload Lote` — agrupa os itens do lote corrente em uma única chamada `{ mode: "batch", territories: [...], months }`, com `request_id` único por lote.
- `Classificar Resposta` reescrito: interpreta **sempre** `body.territories[]` por município — nunca `overall_status` (ver §16).
- `Classificar Status Lote` + `Registrar Lote` — grava o resultado do lote inteiro.

### Bugs reais encontrados e corrigidos durante a homologação (não hipotéticos — cada um causou uma falha real observada em execução real do n8n):

1. **Corrida entre `Carregar Lotes Final` e `Calcular Resumo`** (execução 25053, `error`): duas conexões de origens diferentes para o mesmo nó **não esperam uma pela outra** em n8n — não é um merge automático. `Calcular Resumo` tentou ler `$('Carregar Lotes Final')` antes desse nó executar. Corrigido encadeando `Recarregar Fila Final → Carregar Lotes Final → Calcular Resumo`, sequencial.
2. **Mesma classe de corrida entre `Registrar Lote` e o fim do loop** (execução 25062, sem erro mas `total_batches=0` mesmo com o lote gravado): `Registrar Lote` corria em paralelo com `Aguardar Entre Lotes`/próxima iteração, sem garantia de terminar antes do resumo final ler a tabela. Corrigido encadeando `Atualizar Fila → Classificar Status Lote → Registrar Lote → Aguardar Entre Lotes`.
3. **`executeOnce` ausente em `Carregar Lotes Final` e `Recarregar Fila Final`** (execução 25063/25064, `total_batches`/`territories_total` multiplicados pelo número de lotes): nós de leitura de Data Table, por padrão, executam **uma vez por item de entrada** — encadeados após um nó que emite N itens (um por lote/território concluído), cada leitura rodava N vezes e o resumo final concatenava resultados duplicados. **Confirmado que os dados reais no Supabase nunca foram afetados** (sempre 154 indicadores/município, sem duplicação) — o bug era exclusivamente no resumo/observabilidade do n8n. Corrigido com `executeOnce: true`, mesmo padrão já usado em `Criar Execucao` neste workflow.

Todos os 3 bugs foram descobertos e corrigidos **durante execuções reais** (não em teste simulado), com evidência de antes/depois documentada abaixo.

---

## 12-14. Homologação real via n8n

### Bloqueio e resolução: `mode=batch` não estava em produção

A primeira tentativa real (execução 25053/25062) falhou porque a API de produção (`politix-os.vercel.app`) ainda rodava o código pré-Bloco-4.5 (`INVALID_MODE`, únicos válidos `single`/`mg`) — o PR #10 (Bloco 4.5) havia sido deliberadamente deixado sem merge. O preview do PR existia mas está atrás do SSO de proteção de deployment da Vercel, inacessível para uma chamada servidor-a-servidor do n8n sem bypass configurado. **Apresentada a decisão ao usuário**, que autorizou explicitamente o merge do PR #10. Mergeado (`2026-08-11T18:03:23Z`), deploy de produção confirmado ativo por volta de `18:05:56Z`.

### Teste 1 lote (execução 25063)

5 municípios (São Sebastião do Rio Preto, Campanário, Coronel Xavier Chaves, Santo Antônio do Grama, Descoberto) — **caminho INSERT** (nunca coletados). Resultado: **5/5 `completed`**, 770 indicadores, `overall_status: partial` da API (por municípios fora do lote no CSV) **corretamente não tratado como falha** pelo n8n. `files_downloaded: 2`, `request_id` único compartilhado por todos os 5. Tempo total do lote: 11,7 s (medido pela API) / 17 s (execução n8n completa, incluindo leituras/escritas de Data Table). Verificado fisicamente: 154 indicadores/município.

### Teste 2 lotes sequenciais (execução 25064)

10 municípios (Juvenília, Estrela do Sul, Tiros, Bela Vista de Minas, Mato Verde, Capinópolis, Monte Alegre de Minas, Prata, Pirapora, Juiz de Fora), `batch_size=5` → 2 lotes. **10/10 `completed`**, `batch_number` 1/2 e 2/2 corretos, **nenhum paralelismo**: lote 1 iniciou `18:07:50`, terminou `18:08:04`; lote 2 só iniciou `18:08:06` (após o `Aguardar Entre Lotes`), terminou `18:08:16` — sequencial, comprovado pelos timestamps reais, não apenas pelo desenho do workflow. `total_batches: 2, completed_batches: 2, failed_batches: 0`. Verificado fisicamente: 154 indicadores × 10 municípios, sem duplicação.

### Retomada e retry (Fase 14)

Uma interrupção literal (matar o processo n8n no meio de uma execução) não é possível com as ferramentas disponíveis nesta sessão (não há controle interativo de execução exposto via MCP). Em vez disso, foram validadas as garantias equivalentes que a Fase 14 pede, com dados reais:

**Teste A — retomada de execução já 100% completa** (execução 25065, reenviando o `mg_run_id` da execução 25064 já finalizada): retorno em **129 ms**, sem reprocessar nenhum município, `territories_total: 10, total_batches: 2` inalterados — confirma que **batches concluídos não executam novamente** e a **fila não duplica**.

**Teste B — retry de lote com falha de chamada** (execuções 25066/25067, reenviando o `mg_run_id` de uma falha real anterior — 25062, quando `mode=batch` ainda não estava em produção): como os 5 municípios daquele lote já haviam sido coletados por outra execução nesse meio-tempo, o reenvio caiu no **caminho de UPDATE** (154 municípios × ~40-47 ms/indicador medidos no Bloco 4.5) e **excedeu `maxDuration=60`** — a Vercel matou a função com `504 FUNCTION_INVOCATION_TIMEOUT` real. O n8n classificou corretamente como falha recuperável (504 está na lista de retry), incrementou `attempts` e reenfileirou. Uma segunda tentativa repetiu o mesmo timeout, levando `attempts` a 3 = `max_retries`, transicionando corretamente para **`failed_max_retries`**, com `failures[]` preenchido (código, município, status, erro) e `status: partial_with_failures`. **Nenhuma corrupção de dado**: os 154 indicadores/município permaneceram intactos e sem duplicação em todas as etapas.

Este teste, embora não planejado como tal, é uma prova real e valiosa de dois pontos: (1) a máquina de estados de retry funciona corretamente ponta-a-ponta, incluindo o estado terminal; (2) **reprocessar municípios já coletados em lotes de 5 é um cenário genuinamente arriscado sob `maxDuration=60`** — risco relevante para qualquer reprocessamento futuro, não para a carga inicial dos 853 (que será predominantemente INSERT, ~1,6 s/território, não ~40 s/território).

---

## 15-16. Observabilidade e interpretação de `partial`

Confirmado nas respostas reais das execuções acima: `mg_run_id`, `territories_total`, `territories_completed`, `total_batches`, `current_batch`, `completed_batches`, `failed_batches`, `percent_complete`, `duration_total_ms`, `indicator_total`, `failures[]` — todos presentes e corretos após as correções da Fase 6-11.

**Regra documentada e comprovada real**: `overall_status: partial` da resposta do PolitixOS **nunca** foi tratado como falha pelo n8n, em nenhuma das 5 execuções reais — o critério é exclusivamente `territoryResults[]` por município. Isso está documentado tanto em comentário no código do nó `Classificar Resposta` quanto no sticky note do workflow.

---

## 17. Regressão

- `npx tsc --noEmit`: limpo.
- `npx vitest run`: **313/313** (inalterado do Bloco 4.5 — nenhum teste automatizado novo neste bloco, já que as mudanças foram no workflow n8n e em uma linha de configuração da rota).
- `npm run build`: sucesso.
- `mode=single`/`mode=mg`/`mode=batch`: nenhuma regressão de contrato — só foi adicionado `export const maxDuration = 60`.
- Motor IBGE: intacto, nenhum arquivo tocado.

---

## 18. Riscos

1. **Reprocessamento em lote pode exceder `maxDuration=60`** — comprovado real (§14). Mitigado para a carga inicial dos 853 (caminho INSERT, ~1,6 s/território); relevante para qualquer futura reexecução de municípios já coletados.
2. **Amostra de performance ainda modesta**: `n=15` municípios reais medidos no caminho INSERT no total (Blocos 4.5+4.6) — suficiente para confiança razoável na projeção, mas não é uma amostra estatisticamente grande.
3. **Vercel Hobby vs Pro**: `maxDuration=60` requer, na prática, um plano que suporte configuração de timeout acima do padrão do Hobby — não foi possível confirmar o plano exato da conta via as ferramentas disponíveis; recomenda-se confirmação manual antes da carga completa.
4. **PR #10 mergeado neste bloco** por autorização explícita do usuário — mudança de produção real, não reversível trivialmente sem novo deploy.

---

## 19. Não executado

Os 853 municípios de MG **não foram executados** neste bloco, conforme instrução explícita.

---

## 20. Gate final

```
BATCH NOVO 5: 5/5 completo (validação direta) + 5/5 completo (via n8n, execução 25063)
MUNICÍPIOS: Cedro do Abaeté, Cristiano Otoni, Reduto, Santo Antônio do Amparo, Uberlândia (critério: percentil populacional entre não coletados)
CAMINHO INSERT: confirmado (0 registros antes, 154/município depois, sem coleta prévia)
DOWNLOAD ÚNICO: sim (2 arquivos anuais, 1x por chamada, nunca por município)
INDICADORES: 770 (154 × 5)
TEMPO TOTAL: 12.803 ms (medição direta) / 11.715 ms (medição via API na execução n8n)
TEMPO MÉDIO/MUNICÍPIO: 1.640 ms (persistência)
P50: 1.489 ms
P95: ≈2.454 ms (interpolado, n=5)
PROJEÇÃO 853 BATCH 5: ~36,5 min (base) / ~48 min (com margem)
PROJEÇÃO 853 BATCH 10: ~30,4 min (base) / ~42,2 min (com margem)
WORKFLOW N8N: adaptado para mode=batch — 3 bugs reais de corrida/duplicação encontrados e corrigidos durante homologação real
MODE BATCH: implementado e homologado (direto + via n8n)
BATCH SIZE OPERACIONAL: 5 (teto aplicado em Normalizar Payload, contrato aceita até 10)
CONCORRÊNCIA: 1 — comprovado real por timestamps (lote 2 só inicia após lote 1 + espera)
CHECKPOINT: por município (seguranca_mg_queue) + por lote (seguranca_mg_batches, novo) — ambos validados reais
RETRY: por chamada (429/5xx/timeout) — comprovado real com um 504 genuíno (Vercel timeout)
RETOMADA: validada — run completo reenviado = no-op (129ms); lote falho reenviado = retry correto até failed_max_retries, sem duplicar dados
TESTE 1 BATCH: PASSOU (execução 25063, real)
TESTE 2 BATCHES: PASSOU (execução 25064, real, sequencial comprovado por timestamps)
INTERRUPÇÃO/RETOMADA: equivalente funcional validado com dados reais (retomada pós-completo + retry pós-falha real até estado terminal); interrupção literal (kill de processo) não testável com as ferramentas MCP disponíveis nesta sessão
PARTIAL INTERPRETADO CORRETAMENTE: sim — comprovado em 5 execuções reais, overall_status=partial nunca causou falha
OBSERVABILIDADE: completa, campos confirmados reais na resposta final
TSC: limpo
TESTES: 313/313
BUILD: sucesso
IBGE REGRESSÃO: nenhuma
SEGURANÇA REGRESSÃO: nenhuma — credencial reutilizada, nenhum secret novo, nenhum valor de secret exposto em nenhum momento
BLOCO 4.6 HOMOLOGADO: sim
SEGURO PARA CARGA 853: SIM, com ressalvas — (1) manter batch_size operacional em 5, não 10; (2) confirmar o plano Vercel suporta maxDuration=60 antes da carga; (3) não reenviar municípios já coletados em lote (caminho UPDATE é ~28× mais lento e pode estourar o timeout); (4) considerar monitorar a primeira leva da carga real antes de deixá-la rodar sem supervisão
TEMPO ESTIMADO CARGA MG: ~36-48 minutos (batch-5), assumindo caminho INSERT predominante
PRÓXIMA AÇÃO: aguardar autorização explícita do usuário para a carga completa dos 853 municípios
```

**Conforme instrução explícita: mesmo com o resultado acima, os 853 municípios NÃO foram executados. Parando aqui, aguardando autorização explícita para a carga estadual.**
