# Relatório — Bloco 4.5: Arquitetura Batch para Processamento Estadual (Motor Segurança Pública)

**Data:** 2026-08-11
**Escopo:** `lib/territorios/seguranca-collector.ts`, `lib/territorios/seguranca-territory-resolver.ts`, `app/api/territorios/seguranca/collect/route.ts` + testes.
**Não executado neste bloco:** os 853 municípios de MG, qualquer outro motor (DATASUS/TSE/SICONFI), alteração do workflow n8n em produção.

---

## 1. Arquitetura anterior (Bloco 4.4) e problema comprovado

O Bloco 4.4 tentou resolver o custo de coletar segurança pública para os 853 municípios de MG via **concorrência controlada no n8n** (`options.batching` no nó HTTP Request, disparando várias chamadas `mode=single` em paralelo, limitadas por um nó de lote). Duas tentativas reais e verificadas de configurar isso corretamente falharam — lotes de 5 e 10 municípios completaram em tempo de parede consistente com execução **concorrente**, não sequencial, indicando que o controle de concorrência do n8n não estava realmente sendo respeitado pela API.

Havia também a hipótese, não comprovada por código até este bloco, de que cada chamada `mode=single` **redundantemente baixava e reparseava** os mesmos CSVs anuais da SEJUSP-MG.

### 1.1 Auditoria por código (Fase 1)

Antes de qualquer alteração, o código de `runSecurityCollection` foi lido integralmente. Confirmado **por código, não por suposição**: download e parse já ocorriam **exatamente uma vez por chamada** da função, tanto para `mode=single` quanto `mode=mg` — a redundância do Bloco 4.4 era **entre chamadas separadas** (cada uma das 853 chamadas individuais pagando seu próprio custo de download), não dentro de uma chamada. Isso definiu o desenho do Bloco 4.5: criar um `mode=batch` que reaproveita o mesmo pipeline, resolvendo N territórios explícitos em vez de 1 (single) ou todos-da-UF (mg).

---

## 2. Arquitetura batch implementada

### 2.1 Contrato

Mesmo endpoint, `POST /api/territorios/seguranca/collect`, novo `mode=batch`:

```json
{ "mode": "batch", "territories": [{ "codigo_ibge": "3118601" }, { "codigo_ibge": "3106200" }], "months": 12 }
```

`mode=single` e `mode=mg` permanecem **inalterados em contrato** — nenhuma quebra de compatibilidade. Não foi necessário criar endpoint separado.

### 2.2 Limite explícito

```ts
export const MAX_BATCH_SIZE = 10;
```

Centralizado em `lib/territorios/seguranca-collector.ts`, validado **antes** de qualquer download/consulta ao banco (tanto na função quanto na validação HTTP da rota, com erro de contrato explícito — `EMPTY_BATCH`, `BATCH_TOO_LARGE`, `INVALID_BATCH_ITEM` — nunca silencioso).

### 2.3 Download e parse únicos por execução

O trecho de download/parse (já único por chamada, confirmado na Fase 1) é reaproveitado sem alteração — `mode=batch` só muda a etapa de **resolução de território**: em vez de 1 lookup (single) ou o mapa completo da UF (mg), usa `resolveTerritoriesByCodigosIbge` (nova função em `seguranca-territory-resolver.ts`), que resolve a lista pedida em **uma única query** (`IN`). Códigos não encontrados voltam em `notFound`, tratados depois como falha isolada — nunca invalidam o lote inteiro.

Prova mandatória (Fase 9): testes automatizados e homologação real confirmam **1 download por execução de lote**, independentemente do tamanho do lote (1, 5 ou 10 municípios) — nunca N downloads.

### 2.4 Isolamento por território

Cada território do lote é processado e persistido isoladamente. Resultado mínimo por território (`TerritoryOutcome`): `codigoIbge`, `status` (`completed` | `partial` | `failed`), `requestId`, `indicatorsPersisted`, `error`, `durationMs`. Um código inexistente ou uma falha de persistência em um território **não invalida** os demais — comprovado nos testes de "isolamento" e "mistura válido+inválido" e na homologação real com código inexistente.

### 2.5 Persistência — otimização real descoberta durante a homologação (Fase 6)

A primeira execução real de homologação (`single1`, Contagem, código pré-Bloco-4.5) revelou, pela primeira vez com instrumentação por fase, que **a persistência era o gargalo real, não o download**:

| Fase | Tempo medido (single1, código anterior) |
|---|---|
| download | 2.017 ms |
| parse | 128 ms |
| **persistência** | **79.785 ms (95,2% do total)** |
| **total** | **83.847 ms** |

Isso contradisse a hipótese original do Bloco 4.4 (de que o redownload era o principal custo) e obrigou a revisar o desenho antes de prosseguir com a homologação do lote — batchear apenas o download, mantendo 2 round trips por indicador (`select` + `insert`/`update`) na persistência, teria trazido ganho real mas modesto, já que o download nunca foi o gargalo dominante.

**Otimização implementada:** `persistTerritoryIndicators` substitui o antigo `upsertSecurityIndicator` (select + insert/update **por indicador**, 2 round trips × até 154 indicadores/território) por, **por território**:

1. **1 SELECT em lote** — busca todos os indicadores já persistidos no escopo do Motor Segurança (`territory_id` + `categoria` + `fonte` + `source_dataset`) para aquele território.
2. **1 INSERT em lote** — todas as linhas realmente novas, em uma única chamada (`.insert([...])`, confirmado no Postgres via `pg_stat_statements` como uma única instrução `INSERT ... json_to_recordset` — não N inserts individuais).
3. **updates individuais** — só para as linhas que já existiam (reprocessamento de um período já coletado); PostgREST não suporta update condicional em lote sem RPC, mas esse é o caminho menos comum.

Mesma chave natural, mesma semântica de idempotência do código anterior — **nenhuma migração de schema**, `territory_indicators`/`territory_collection_runs` inalterados (Fase 7 confirmou que a estrutura de 1 `collection_run` por território já supre a auditabilidade do lote — ver §2.6). RLS (`allow_all_territory_indicators`) e ausência de triggers em `territory_indicators` foram confirmadas via consulta direta ao Postgres antes de concluir que o gargalo era round-trip, não processamento no servidor.

### 2.6 Auditabilidade do lote (Fase 7)

Adotada a opção **(A)**: cada território mantém seu próprio `territory_collection_run` (mesma tabela, sem migração), com `metadata.mode = 'batch'`. Todos os `collection_runs` de uma mesma chamada de lote compartilham o mesmo `request_id`, o que permite reconstruir "quais municípios participaram de qual execução de lote" com uma query simples (`WHERE request_id = ...`), sem necessidade de uma tabela pai/filha nova.

### 2.7 Observabilidade

`SecurityCollectionTimings` expõe, por chamada: `downloadMs`, `parseMs`, `normalizationMs`, `processingMs`, `persistenceMs`, `totalMs`. `SecurityCollectionResult` expõe `filesDownloaded` e `territoryResults[]`. Nenhum segredo é exposto em nenhum desses campos (auditado — ver §7).

---

## 3. Testes automatizados

20 testes em `lib/territorios/seguranca-collector.test.ts` (10 novos de `mode=batch`, cobrindo: lote vazio, lote acima do limite, 1 município, 5 municípios (download único), 10 municípios/`MAX_BATCH_SIZE` (download único), código inválido isolado, mistura válido+inválido, erro parcial dentro de um território sem afetar os demais, idempotência do lote, observabilidade de timings) + 5 novos em `route.test.ts` (`EMPTY_BATCH`, `BATCH_TOO_LARGE`, `INVALID_BATCH_ITEM`, payload válido repassado ao coletor, formato da resposta com `territories[]`/`files_downloaded`/`timings`). Todos os testes de persistência (single/mg/batch) foram reescritos para o novo padrão de mocks (select em lote + insert em lote, em vez de select+insert por indicador).

**Suíte completa: 313/313 testes passando.** `npx tsc --noEmit` limpo. `npm run build` bem-sucedido.

---

## 4. Homologação real (dados reais, Supabase + SEJUSP-MG)

Metodologia: execução local via `tsx` contra o Supabase real e a fonte SEJUSP-MG real (mesma técnica usada nos Blocos 4.2/4.4), sem depender de deploy/merge. Toda a persistência foi verificada **fisicamente no banco** via SQL direto (`territory_indicators`, `territory_collection_runs`), não apenas confiando na resposta JSON.

### 4.1 Achado metodológico importante

As amostras oficiais de 5 e 10 municípios (fixadas no Bloco 4.4 e reutilizadas sem alteração neste bloco, por instrução explícita) **já haviam sido coletadas** durante os testes reais do Bloco 4.4 via n8n (`request_id`s de hoje, ~15:12–15:22, antes deste bloco começar). Isso significa que as execuções reais de `batch5` e `batch10` abaixo exercitam o **caminho de UPDATE** (idempotência/recoleta), não o caminho de INSERT (coleta nova). Para medir o caminho de INSERT — o que efetivamente vai acontecer nos 853 municípios, todos em primeira coleta — foi feita uma **medição diagnóstica adicional**, fora da amostra oficial, com um município nunca antes coletado (Abadia dos Dourados, `3100104`), via `mode=single` (mesmo código de persistência do `mode=batch`).

### 4.2 Batch 1 — Contagem (`3118601`)

154 indicadores persistidos, idênticos ao baseline `single` já homologado. `filesDownloaded: 1` download por chamada (não 5, não 853). `overallStatus: partial` — esperado: `mode=batch` não filtra `scopedRows` por território antes de agregar (mesma lógica de `mode=mg`), então o CSV inteiro do MG gera `unmatchedMunicipalities` para os municípios fora do lote, o que é um comportamento correto e já documentado, não um defeito.

### 4.3 Batch 5 — amostra oficial (Serra da Saudade, Japaraíba, Coronel Murta, Malacacheta, Belo Horizonte)

5/5 completados, 154 indicadores cada (770 total), 1 download único confirmado (não 5). Caminho de UPDATE (municípios pré-coletados no Bloco 4.4).

### 4.4 Batch 10 — amostra oficial

10/10 completados, 154 indicadores cada (1.540 total), 1 download único confirmado (não 10). Caminho de UPDATE.

### 4.5 Verificação física no Supabase

Consulta direta confirmou, para todos os municípios testados (Contagem + amostra de 5 + amostra de 10 + Abadia dos Dourados): exatamente 154 linhas em `territory_indicators` por município, sem duplicação, `updated_at` avançando a cada reexecução. `pg_stat_statements` confirmou que o insert em lote gera **1 única instrução SQL** (`INSERT ... json_to_recordset`, 53 ms de execução no servidor para as 154 linhas) — não 154 inserts individuais.

### 4.6 Idempotência

Reexecução do mesmo lote (Contagem via `batch1`, e depois Abadia dos Dourados via a medição diagnóstica) **atualiza, não duplica** — confirmado tanto pela resposta (`indicatorsPersisted` inalterado) quanto por SQL direto (contagem de linhas e de IDs distintos inalterada).

---

## 5. Desempenho — MEDIDO vs. PROJETADO

### 5.1 MEDIDO (execuções reais, dados reais)

| Cenário | Municípios | Caminho | download_ms | parse_ms | processing_ms | persistence_ms | total_ms |
|---|---|---|---|---|---|---|---|
| `single1` (código pré-Bloco 4.5) | 1 | UPDATE | 2.017 | 128 | 1.906 | **79.785** | 83.847 |
| `single1` (reexecução, código otimizado) | 1 | UPDATE | 1.657 | 235 | 1.974 | 45.676 | 49.555 |
| `batch1` | 1 | UPDATE | 2.007 | 120 | 332 | 40.507 | 42.992 |
| `batch5` (amostra oficial) | 5 | UPDATE | 1.681 | 128 | 1.237 | 211.825 | 214.897 |
| `batch10` (amostra oficial) | 10 | UPDATE | 1.844 | 120 | 1.418 | 409.116 | 412.522 |
| diagnóstico — 1ª execução (Abadia dos Dourados) | 1 | **INSERT (coleta nova)** | 1.941 | 133 | 909 | **1.690** | 4.684 |
| diagnóstico — 2ª execução (mesmo município) | 1 | UPDATE | 1.996 | 129 | 1.288 | 47.359 | 50.783 |

**Achados medidos:**

- **A otimização de persistência em lote (Fase 6) reduz o caminho de UPDATE em ~43–48%** (79.785 ms → 40.507–47.359 ms para 154 indicadores/154 chamadas de update, já que passou de 308 round trips — select+insert por indicador — para 155 — 1 select em lote + N updates individuais).
- **No caminho de INSERT (coleta nova, o que efetivamente ocorre nos 853 municípios), o ganho é dramático: ~28× mais rápido que o UPDATE equivalente (1.690 ms vs. 47.359 ms para o mesmo município, 154 indicadores) e ~47× mais rápido que a persistência original pré-Bloco-4.5 (79.785 ms).** Confirmado que 1 único `INSERT ... json_to_recordset` no Postgres processa as 154 linhas em 53 ms no servidor — o tempo restante é overhead de rede (1 select + 1 insert = 2 round trips, contra 308 no código original).
- O download nunca foi o gargalo dominante (sempre ~1,6–2,0 s, ~2–4% do tempo total) — a hipótese original do Bloco 4.4 de que o redownload explicava a maior parte do custo **não se confirmou**; o Bloco 4.5 corrigiu o problema real (persistência sequencial), não apenas o problema suposto (redownload).
- **Ressalva de amostra:** a medição do caminho INSERT tem `n=1` (Abadia dos Dourados) — os 5 e 10 municípios oficiais já estavam coletados e por isso só permitiram medir UPDATE. A projeção abaixo aplica uma margem de segurança por causa disso.

### 5.2 PROJETADO — 853 municípios (não executado)

Premissa: os 853 municípios são, em sua esmagadora maioria, **coleta nova** (caminho INSERT) — apenas os ~16 já testados nos Blocos 4.4/4.5 estariam no caminho UPDATE. Projeção usa o dado real de INSERT (1.690 ms/território), com margem de segurança de 2× para cobrir a incerteza de `n=1` e variação real de rede/carga.

**Lote de 10 (batch-10), caso base (sem margem):**
download (~2,0 s, único) + parse (~0,15 s) + resolução de território (~1,5 s p/ 10 códigos) + persistência (10 × ~1,7 s ≈ 17 s) ≈ **~20,6 s/lote**
86 lotes (⌈853/10⌉) × 20,6 s ≈ **~29,5 minutos**

**Lote de 10, com margem de segurança 2×:**
persistência (10 × ~3,4 s ≈ 34 s) + overhead ≈ **~37,6 s/lote** → 86 lotes ≈ **~53,9 minutos**

**Lote de 5 (batch-5), para comparação:**
Tempo total é comparável (mesmo total de round trips de persistência, distribuído em mais chamadas menores): caso base ≈ **~38 min**; com margem ≈ **~64 min**.

**Recomendação de tamanho de lote:** `batch-5`, não `batch-10`, para a execução real dos 853 — o tempo total agregado é semelhante, mas cada chamada HTTP individual fica com folga maior sob o timeout padrão de funções serverless da Vercel (o pior caso observado — todos os territórios do lote no caminho UPDATE — levou 412 s para um lote de 10; um lote de 5 no mesmo cenário ficaria em ~215 s, ainda alto, mas mais gerenciável). Isso é relevante para futuras **reexecuções** (retentativas de um lote que já tenha persistido parte dos dados cairiam no caminho UPDATE, muito mais lento).

**Risco residual explícito:** se qualquer lote, por qualquer motivo (reprocessamento, correção de dados), acabar processando municípios já coletados, aquele lote específico volta ao custo do caminho UPDATE (~40–47 s/município) — um lote de 10 nesse cenário pode ultrapassar 400 s, o que **exigiria configuração de duração estendida de função na Vercel** (disponível em planos Pro/Enterprise) ou quebra manual em lotes menores para esse caso específico.

---

## 6. Evolução futura do n8n (desenho, não implementado — Fase 14)

**Não alterado neste bloco.** Desenho recomendado para quando a execução real dos 853 for autorizada:

1. n8n gera a lista dos 853 `codigo_ibge` de MG (já disponível via Motor IBGE).
2. n8n divide em lotes de 5 (`MAX_BATCH_SIZE` recomendado operacionalmente, embora o limite técnico do contrato seja 10).
3. n8n chama `POST /api/territorios/seguranca/collect` com `mode=batch` **um lote de cada vez, sequencialmente** (aguardando a resposta antes do próximo) — o n8n deixa de tentar controlar concorrência interna por município (a causa raiz da falha do Bloco 4.4); a responsabilidade de processar o lote com segurança passa a ser inteiramente do PolitixOS.
4. Checkpoint após cada lote (registrar `request_id` e resultado por território) para permitir retomar de onde parou em caso de falha.
5. Consolidação final: soma de `indicators_persisted`, lista de `territories[]` com `status=failed` para nova tentativa pontual.

Nenhuma alteração foi feita no workflow n8n existente (`HYzP2jdG5DtlceQp`) neste bloco — a homologação do backend veio primeiro, como instruído.

---

## 7. Segurança

- Nenhum segredo novo introduzido — `mode=batch` reaproveita a mesma autenticação (`TERRITORIOS_SEGURANCA_CALLBACK_SECRET` / header `x-territorios-seguranca-secret`) do `mode=single`/`mode=mg`, sem reuso de credenciais do Motor IBGE.
- `git diff` das alterações revisado — nenhum segredo hardcoded (apenas nomes de variáveis contendo "key" no sentido de chave de dedup/indicador, não credenciais).
- RLS de `territory_indicators` confirmada como `allow_all` (mesma política já homologada antes deste bloco — não alterada). Nenhum trigger novo.
- Script de homologação local (`.tmp-batch-real-test.mts`, continha a chave anon pública do Supabase — segura por design, RLS permissiva) **apagado** ao final do bloco; nunca foi commitado (confirmado — não aparece no histórico do git).

---

## 8. Regressão final

- `npx tsc --noEmit`: limpo.
- `npx vitest run`: **313/313 testes passando** (34 arquivos).
- `npm run build`: sucesso (Next.js 16.2.6, todas as rotas compiladas, incluindo `/api/territorios/seguranca/collect`).
- `mode=single` e `mode=mg`: contrato e comportamento preservados (testes de compatibilidade passando; homologação real de `single1` confirma 154 indicadores, mesmo resultado de antes).
- Motor IBGE: nenhum arquivo do Motor IBGE foi tocado neste bloco.

---

## 9. Riscos e recomendação

**Riscos:**
1. Reexecução de um lote com municípios já coletados é ~28× mais lenta (caminho UPDATE) — pode se aproximar de limites de timeout serverless em lotes de 10.
2. A projeção dos 853 usa `n=1` para o caminho INSERT — recomenda-se validar com uma amostra maior (ex.: 1 lote real de 5 municípios genuinamente novos) antes da execução completa, se o operador quiser reduzir a incerteza da projeção.
3. `overallStatus: partial` em `mode=batch` por causa de `unmatchedMunicipalities` (linhas de outros municípios do MG no mesmo CSV) é esperado, não um defeito — mas deve ser interpretado corretamente por quem consumir a resposta (n8n/dashboard), para não ser confundido com falha real do lote.

**Recomendação:** a arquitetura batch está homologada para uso incremental controlado (lotes de até 10, operacionalmente recomendado 5). Antes de autorizar a execução dos 853 municípios, sugere-se rodar um lote real adicional com municípios genuinamente não coletados (para reduzir a incerteza `n=1` da projeção) e decidir o tamanho de lote operacional definitivo com base nesse dado.

---

## 10. Gate final

```
ARQUITETURA BATCH: implementada, mode=batch no mesmo endpoint, sem migração de schema
ENDPOINT: POST /api/territorios/seguranca/collect (mode=batch)
MODE SINGLE PRESERVADO: sim, contrato e comportamento inalterados
MAX_BATCH_SIZE: 10 (centralizado, validado antes de download/DB)
DOWNLOAD ÚNICO: sim — confirmado por testes e homologação real (1, 5 e 10 municípios = 1 download)
PARSE ÚNICO: sim — mesmo trecho de código de single/mg, reaproveitado sem alteração
BATCH 1: 1/1 completo, 154 indicadores (igual ao single homologado)
BATCH 5: 5/5 completo, 770 indicadores, 1 download único
BATCH 10: 10/10 completo, 1.540 indicadores, 1 download único
IDEMPOTÊNCIA: confirmada (batch e caminho INSERT/UPDATE isolado) — sem duplicação, verificado via SQL direto
ERRO PARCIAL: confirmado — código inexistente e falha de indicador isolados, sem invalidar o lote
OBSERVABILIDADE: timings por fase + territoryResults[] + filesDownloaded, sem exposição de segredos
DOWNLOAD_MS: ~1.657–2.017 ms (medido, único por chamada, independente do tamanho do lote)
PARSE_MS: ~120–235 ms (medido)
PROCESSING_MS: ~332–1.974 ms (medido, resolução de território)
PERSISTENCE_MS: UPDATE 40.507–409.116 ms (proporcional a N); INSERT 1.690 ms/território (medido 1x, caminho relevante para os 853)
TEMPO SINGLE 1: 83.847 ms (código anterior) / 49.555 ms (código otimizado, mesmo caminho UPDATE)
TEMPO BATCH 1: 42.992 ms
TEMPO BATCH 5: 214.897 ms
TEMPO BATCH 10: 412.522 ms
GANHO PERFORMANCE: ~43–48% no caminho UPDATE; ~28–47× no caminho INSERT (o relevante para 853 municípios em coleta nova) — MEDIDO, não projetado
PROJEÇÃO 853: ~30–54 min (batch-10) / ~38–64 min (batch-5), PROJETADO com margem de segurança 2×, baseado em n=1 amostra real de INSERT — NÃO EXECUTADO
TSC: limpo
TESTES: 313/313 passando
BUILD: sucesso
MOTOR SEGURANÇA REGRESSÃO: nenhuma — mode=single/mg preservados e revalidados com dados reais
IBGE REGRESSÃO: nenhuma — nenhum arquivo do Motor IBGE alterado
SECRETS: nenhum segredo novo, nenhum hardcoded, script de homologação local apagado e nunca commitado
PRONTO PARA ADAPTAR N8N: desenho documentado (§6), workflow em produção não alterado
SEGURO PARA EXECUTAR 853: condicional — recomenda-se 1 lote adicional real com municípios genuinamente novos antes da execução completa, para reduzir incerteza da projeção (n=1)
PRÓXIMA AÇÃO: aguardar autorização explícita do usuário para (a) validar projeção com lote adicional e/ou (b) autorizar execução dos 853 municípios
```

**Não executado, conforme instrução explícita:** os 853 municípios, qualquer outro motor (DATASUS/TSE/SICONFI), alteração do workflow n8n em produção. Aguardando autorização.
