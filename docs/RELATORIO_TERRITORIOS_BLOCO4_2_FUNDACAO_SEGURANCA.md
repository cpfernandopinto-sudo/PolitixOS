# POLITIX TERRITÓRIOS — Bloco 4.2: Fundação Técnica do Motor Segurança Pública (MG)

**Sprint 12 · Relatório técnico**
**Status: FUNDAÇÃO IMPLEMENTADA, TESTADA E VALIDADA COM DADOS REAIS (Contagem/MG, 12 meses, 2 execuções, idempotência comprovada fisicamente no Supabase). Nenhuma tabela nova, nenhuma migration, nenhum workflow n8n, nenhuma carga completa de MG.**

---

## 1. Arquitetura criada

```
MinasGeraisSecurityAdapter (seguranca-mg-client.ts)
    ↓ discoverResources() / selectResourceForYear() / fetchAnnualCsv() / parseCrimesViolentosCsv()
SecurityCollector (seguranca-collector.ts)
    ↓ computeWindow() → normalizeAndAggregate() (usa seguranca-nature-map.ts + seguranca-territory-resolver.ts)
    ↓ persiste em territory_indicators + territory_collection_runs
runSecurityCollectionAction() (Server Action, admin-gated)
POST /api/territorios/seguranca/collect (machine-to-machine, secret próprio)
```

Pipeline com etapas separadas (Seção 9 do briefing — evitar função monolítica): `discoverResources → selectResourceForYear → fetchAnnualCsv → parseCrimesViolentosCsv → normalizeAndAggregate (nature-map + territory-resolver) → upsertSecurityIndicator → territory_collection_runs`.

## 2. Arquivos criados

```
lib/territorios/seguranca-nature-map.ts           — mapa fechado natureza → indicator_key
lib/territorios/seguranca-mg-client.ts             — MinasGeraisSecurityAdapter (I/O puro: CKAN + CSV)
lib/territorios/seguranca-territory-resolver.ts    — resolução cod SEJUSP (6 díg.) → território (7 díg.)
lib/territorios/seguranca-collector.ts             — SecurityCollector (janela, agregação, persistência)
lib/actions/territories-seguranca.ts               — Server Action admin-gated
app/api/territorios/seguranca/collect/route.ts     — endpoint machine-to-machine, secret próprio

lib/territorios/seguranca-nature-map.test.ts
lib/territorios/seguranca-mg-client.test.ts
lib/territorios/seguranca-territory-resolver.test.ts
lib/territorios/seguranca-collector.test.ts
app/api/territorios/seguranca/collect/route.test.ts
```

Nenhum arquivo do Motor IBGE foi tocado. Nenhuma migration criada.

## 3. Schema auditado (Seção 6/7 do briefing)

Antes de escrever qualquer código, consultei o schema **real e vigente** em produção (não o arquivo `.sql`, que poderia estar desatualizado em teoria — Seção 6: "Validar os nomes reais das colunas existentes... Não presumir schema"):

```sql
-- information_schema.columns (territory_indicators) — 18 colunas confirmadas,
-- incluindo exatamente as que o coletor usa: territory_id, categoria, indicador,
-- valor, unidade, periodo_inicio, periodo_fim, fonte, source_dataset, metadata,
-- updated_at (todas com o tipo esperado: uuid/text/numeric/date/jsonb/timestamptz).

-- pg_indexes (territory_indicators) — confirmado:
uq_territory_indicators_natural_key ON territory_indicators
  USING btree (territory_id, categoria, indicador, fonte,
               COALESCE(source_dataset, ''), COALESCE(periodo_inicio, '0001-01-01'),
               COALESCE(periodo_fim, '0001-01-01'))
```

**Conclusão do audit: a constraint única já existente cobre exatamente a chave lógica de idempotência pedida na Seção 7** (`territory_id + categoria + indicador + fonte + source_dataset + periodo_inicio + periodo_fim` — como `fonte` é sempre `'SEJUSP-MG'` e `source_dataset` sempre `'crimes-violentos'` neste motor, na prática colapsa exatamente para a chave pedida). **Nenhuma migration foi criada.** A idempotência é implementada em código (select-então-insert/update), reproduzindo a mesma semântica COALESCE do índice — mesmo padrão já usado e homologado no `upsertIndicador` do Motor IBGE.

## 4. Normalização de naturezas (Seção 4)

Mapa fechado em `seguranca-nature-map.ts`, com as strings **exatas** encontradas nos CSVs reais de 2025 e 2026 (baixados e inspecionados neste bloco, não presumidas):

**Achado deste bloco:** o arquivo real contém **15** naturezas distintas, não 13 — além das 13 que a própria SEJUSP soma oficialmente em "Crimes Violentos", o arquivo também traz `FEMINICIDIO CONSUMADO (REGISTROS)` e `FEMINICIDIO TENTADO`. Por instrução explícita da Seção 3 (não misturar feminicídio/violência doméstica no núcleo operacional agora, por causa da defasagem já identificada no Bloco 4.1 no dataset dedicado), essas 2 naturezas foram mapeadas (não caem em "desconhecida") mas marcadas `core: false` — reconhecidas, **excluídas da persistência** e reportadas separadamente (`excluded_out_of_scope_natures`), nunca confundidas com naturezas genuinamente desconhecidas (`unknown_natures`).

Outro achado: apenas 2 das 15 naturezas têm o sufixo `" (REGISTROS)"` (`HOMICIDIO CONSUMADO` e `FEMINICIDIO CONSUMADO`) — as outras 13 não. Confirma a decisão da Seção 4 de usar mapa fechado, não transformação automática de string (um `.replace()`/normalização genérica erraria exatamente esse caso).

`indice_crimes_violentos` é **derivado pelo coletor** (soma das 13 naturezas núcleo por território+mês) — não é uma entrada do mapa.

## 5. Resolução do código IBGE (Seção 5)

`seguranca-territory-resolver.ts` implementa a regra `LEFT(codigo_ibge, 6) = cod6` de duas formas:
- `resolveTerritoryBySejuspCode`: 1 código → 1 território (`.like('codigo_ibge', cod6+'%')`), retorna `found`/`unmatched`/`ambiguous` — nunca escolhe arbitrariamente.
- `resolveTerritoriesMapForUf`: carrega todos os territórios de uma UF em 1 única query e monta o mapa em memória (usado no `mode=mg`, para não fazer 853 queries individuais) — detecta colisão de prefixo como `ambiguous`, mesma regra.

Testado explicitamente com o caso pedido na Seção 13: **código SEJUSP `311860` → território Contagem `3118601`** (`lib/territorios/seguranca-territory-resolver.test.ts`).

O Motor Segurança **nunca cria território** — se `mode=single` recebe um `codigo_ibge` que não existe em `territories`, falha explicitamente (`TERRITORY_NOT_FOUND`). Territórios são responsabilidade exclusiva do Motor IBGE.

## 6. Ajuste de arquitetura — 1 download por ano (Seção 2)

`runSecurityCollection` calcula a janela de meses, deriva o conjunto de **anos** necessários (1 ou 2), chama `discoverResources` **uma vez**, e baixa **1 CSV por ano necessário** — nunca por município. Testado explicitamente (`lib/territorios/seguranca-collector.test.ts`, teste "janela atravessando dois anos") e **confirmado no teste real**: para a janela ago/2025–jul/2026, exatamente 2 downloads ocorreram (`crimes_violentos_2025.csv`, `crimes_violentos_2026.csv`), não 853×2.

## 7. Contrato do endpoint (Seção 11/12)

`POST /api/territorios/seguranca/collect` — endpoint **próprio**, não reaproveita `/ibge/collect`:

```
Header: x-territorios-seguranca-secret: <TERRITORIOS_SEGURANCA_CALLBACK_SECRET>
Body (single): { "request_id": "uuid", "mode": "single", "codigo_ibge": "3118601", "months": 12 }
Body (mg):     { "request_id": "uuid", "mode": "mg", "months": 12 }
```

`months` tem default 12, limitado a [1, 24] (400 `INVALID_MONTHS` fora do intervalo). Códigos de erro: `TERRITORIOS_ENV_MISSING` (503), `UNAUTHORIZED` (401), `INVALID_PAYLOAD`/`INVALID_MODE`/`MISSING_CODIGO_IBGE`/`INVALID_MONTHS` (400), `TERRITORY_NOT_FOUND` (404 — novo em relação ao Motor IBGE, adaptado ao domínio), `SOURCE_FETCH_FAILED` (502 — falha da fonte SEJUSP-MG), `SEGURANCA_COLLECTION_FAILED` (502 — erro genérico).

Resposta (adaptada ao domínio, não copiada do IBGE — Seção 12):
```json
{
  "success": true,
  "request_id": "...",
  "source": "SEJUSP-MG",
  "dataset": "crimes-violentos",
  "mode": "single",
  "months": 12,
  "window": { "from": {"year":2025,"month":8}, "to": {"year":2026,"month":7} },
  "territories_expected": 1,
  "territories_processed": 1,
  "indicators_persisted": 154,
  "rows_received": 165,
  "rows_discarded": 22,
  "unknown_natures": [],
  "excluded_out_of_scope_natures": ["FEMINICIDIO TENTADO", "FEMINICIDIO CONSUMADO (REGISTROS)"],
  "unmatched_municipalities": [],
  "overall_status": "completed"
}
```

Secret **próprio** (`TERRITORIOS_SEGURANCA_CALLBACK_SECRET`, header `x-territorios-seguranca-secret`) — testado explicitamente que o header/secret do Motor IBGE **não** autentica neste endpoint (Seção 15: nunca reutilizar secret do IBGE). Nenhum valor de secret real foi gerado neste bloco (não houve deploy) — fica registrado como pendência (Seção 12 deste relatório).

## 8. Testes (53 novos, todos passando)

```
seguranca-nature-map.test.ts        — 6 testes: as 13 naturezas núcleo, feminicídio como out_of_scope
                                        (não "unknown"), natureza desconhecida, sufixo "(REGISTROS)"
                                        não generalizado
seguranca-mg-client.test.ts         — 13 testes: discovery CKAN, seleção de recurso por ano (incl.
                                        ambíguo/não encontrado, sem fallback silencioso), parsing CSV
                                        real (BOM, colunas reordenadas, coluna faltando, vazio,
                                        malformado, valores não numéricos)
seguranca-territory-resolver.test.ts — 6 testes: 311860→3118601 (caso exigido pela Seção 13),
                                        unmatched, ambiguous (nunca escolhe arbitrariamente), mapa em
                                        lote por UF com detecção de colisão
seguranca-collector.test.ts         — ~19 testes: computeWindow (incl. virada de ano), validação de
                                        months/mode inválidos, mode=single completo (Contagem, com
                                        natureza desconhecida + fora de escopo + linha de outro
                                        município misturadas no mesmo CSV), território não encontrado,
                                        falha de download, idempotência (insert→update), janela de 2
                                        anos (1 download por ano), mode=mg (com município não
                                        resolvido)
route.test.ts                       — ~15 testes: auth (401/503, incl. secret do IBGE não funciona
                                        aqui), payload (mode/codigo_ibge/months inválidos, JSON
                                        inválido), contrato de resposta, 404 território, 502 fonte
```

```
npx tsc --noEmit → OK
npx vitest run   → 298/298 (245 pré-existentes + 53 novos)
```

## 9. Teste real controlado — Contagem/MG, 12 meses

Executado **duas vezes** com o código real (não uma reimplementação/simulação), contra o Supabase de produção (o mesmo projeto já usado em todos os blocos anteriores — nenhuma tabela/schema alterada, nenhum deploy feito). Rodado localmente via `tsx`, importando os módulos reais do coletor, autenticado com a chave `anon` pública do projeto (as tabelas territoriais têm RLS "allow all" desde o Bloco 2 — mesma política já em produção; nenhum novo mecanismo de acesso foi criado, nenhuma chave sensível foi exposta ou persistida — a chave anon é pública por natureza e o script temporário foi apagado ao final).

**1ª execução** (`request_id=e6b9f5a1-...`, janela ago/2025–jul/2026):
```json
{
  "territoriesProcessed": 1, "indicatorsPersisted": 154,
  "rowsReceived": 165, "rowsDiscarded": 22,
  "unknownNatures": [], "excludedOutOfScopeNatures": ["FEMINICIDIO TENTADO", "FEMINICIDIO CONSUMADO (REGISTROS)"],
  "unmatchedMunicipalities": [], "overallStatus": "completed"
}
```

**Verificação aritmética independente (não apenas "confiar" no resultado):** a fonte só tinha dado publicado até jun/2026 no momento do teste (confirmado no Bloco 4.1 — arquivo 2026 vai até o mês 6); logo, dos 12 meses pedidos, só 11 tinham linha na fonte. 11 meses × 15 naturezas = 165 = `rowsReceived` ✓. 11 × 2 (feminicídio) = 22 = `rowsDiscarded` ✓. 11 × 14 (13 núcleo + 1 índice) = 154 = `indicatorsPersisted` ✓. Os números batem exatamente com a aritmética esperada — não é só "o código não caiu", é matematicamente consistente com o que a fonte realmente continha.

**Verificação física no Supabase (não presumir sucesso pelo retorno da função):**
```sql
-- territory_indicators (território Contagem, categoria seguranca_publica)
total_indicadores: 154 | indicadores_distintos: 14 | linhas_indice: 11
primeiro_periodo: 2025-08-01 | ultimo_periodo: 2026-06-30
fontes_distintas: 1 (SEJUSP-MG) | datasets_distintos: 1 (crimes-violentos)

-- índice_crimes_violentos por mês (RISP corretamente capturado em metadata):
ago/25=133  set/25=152  out/25=142  nov/25=123  dez/25=116
jan/26=129  fev/26=110  mar/26=127  abr/26=141  mai/26=119  jun/26=134
(todos com metadata.risp = "RISP 2 - CONTAGEM")

-- territory_collection_runs
status=completed, workflow_name=politix-territorios-seguranca-mg, source=sejusp_mg,
items_collected=165, items_processed=154, items_discarded=0
```

## 10. Idempotência — teste real, 2ª execução

**2ª execução** (`request_id=f7c0a6b2-...`, mesmos parâmetros):
```json
{ "indicatorsPersisted": 154, "rowsReceived": 165, "rowsDiscarded": 22, "overallStatus": "completed" }
```
Verificação física pós-2ª execução:
```
total_indicadores_agora: 154   (INALTERADO — sem duplicação)
total_runs_agora: 2            (cresceu de 1 para 2 — 1 run por execução)
run_2a_execucao_existe: 1      (novo request_id tem seu próprio registro)
indice ago/2025: valor=133 (mesmo valor), updated_at mudou para o horário da 2ª execução (UPDATE, não INSERT)
```
**Idempotência comprovada com dados reais**, mesma metodologia de verificação física já usada e exigida nos blocos do Motor IBGE.

## 11. Erro real encontrado e corrigido — descoberto pelo próprio teste real

Na 1ª tentativa de execução real, o coletor lançou `RangeError: Maximum call stack size exceeded`. Causa: `allRows.push(...parseCrimesViolentosCsv(csvText))` — os CSVs anuais reais têm **76 mil a 153 mil linhas**; espalhar (`...spread`) um array desse tamanho como argumentos de uma chamada de função excede o limite de argumentos por chamada do V8. Um teste unitário com poucas linhas mockadas **nunca teria pego esse bug** — só apareceu com o volume real de dados, exatamente o tipo de coisa que a Seção 14 do briefing (exigir teste real, não só unitário) existe para capturar. **Corrigido** trocando o `push(...)` por um loop `for...of` (`lib/territorios/seguranca-collector.ts`), sem mudar nenhum comportamento — reexecutado com sucesso logo em seguida (resultado da Seção 9 já reflete a versão corrigida).

## 12. Pendências (registradas, não executadas — por instrução explícita)

1. **`TERRITORIOS_SEGURANCA_CALLBACK_SECRET`**: nenhum valor foi gerado neste bloco (não houve deploy/produção alterada). Precisa ser gerado e configurado na Vercel quando o deploy deste motor for autorizado — mesmo padrão do `TERRITORIOS_IBGE_CALLBACK_SECRET`, **nunca reaproveitando o mesmo valor** (Seção 15).
2. **Workflow n8n** (`POLITIX TERRITÓRIOS — SEGURANÇA (MG)`): não criado, por instrução explícita deste bloco.
3. **Carga completa de MG** (`mode=mg` real, 853 municípios): implementada e testada com mocks, mas **não executada de verdade** — por instrução explícita ("NÃO executar MG completo ainda").
4. **Adapters de outras UFs**: não implementados — fora de escopo (Seção 2/9 do Bloco 4.1, reafirmado aqui).
5. **Furto, Lesão Corporal e demais indicadores fora do dataset "Crimes Violentos"**: continuam fora do núcleo (achado do Bloco 4.1, sem mudança).
6. **Violência Doméstica/Feminicídio**: reconhecidos no mapa mas deliberadamente fora da persistência — decisão a ser revisitada quando a defasagem da fonte dedicada for reconfirmada (Bloco 4.1) ou quando confirmarmos se as naturezas de feminicídio dentro do próprio dataset "Crimes Violentos" (achado da Seção 4 deste relatório) têm atualização mais recente que o dataset dedicado — não decidido ainda, fica para homologação futura.

## Riscos

1. `resolveTerritoriesMapForUf` faz 1 query trazendo os 853 territórios de MG por execução em `mode=mg` — aceitável para uma carga territorial (não é um endpoint de alta frequência), mas vale monitorar se o payload de retorno crescer muito.
2. Persistência é sequencial (`for` com `await` por indicador) — para uma carga completa de MG (853 municípios × ~14 indicadores/mês × até 24 meses) isso pode ser lento; não otimizado neste bloco por não termos executado a carga completa ainda — decisão de performance (paralelismo controlado, batch) fica para quando `mode=mg` for de fato executado.
3. Mesma pendência de hardening já registrada para o Motor IBGE (rotação de secrets) se aplicará a este motor assim que ele for implantado.

## Regressão e confirmação do Motor IBGE

```
npx tsc --noEmit → OK
npx vitest run   → 298/298
npm run build    → OK (rota /api/territorios/seguranca/collect presente, nenhuma rota do IBGE alterada)

Motor IBGE (sem alteração nesta rodada):
  territories (uf=MG): 853         territories (total): 853
  territory_indicators (categoria=demografia): 853
  territory_collection_runs (source=ibge): 1712
```

---

## GATE

```
SCHEMA AUDITADO:              SIM (information_schema + pg_indexes consultados diretamente, não presumido)
MIGRATION NECESSÁRIA:         NÃO (índice único existente já cobre a chave de idempotência pedida)
ADAPTER MG:                   IMPLEMENTADO (seguranca-mg-client.ts — CKAN discovery + download + parse)
RESOURCE DISCOVERY:           IMPLEMENTADO E TESTADO (catálogo CKAN, falha explícita sem fallback silencioso)
PARSER CSV:                   IMPLEMENTADO E TESTADO (formato real, BOM, malformado/vazio, validado com CSVs reais de 76-153 mil linhas)
NORMALIZAÇÃO NATUREZAS:       IMPLEMENTADA (mapa fechado, 15 strings reais — 13 núcleo + 2 feminicídio reconhecidas-mas-excluídas)
RESOLUÇÃO IBGE 6→7:           IMPLEMENTADA E TESTADA (311860→3118601 confirmado)
AGREGAÇÃO MENSAL:             IMPLEMENTADA E VALIDADA (aritmética batida com dado real: 165/22/154)
CONTRATO ENDPOINT:            IMPLEMENTADO (/api/territorios/seguranca/collect, secret próprio, sem reuso do IBGE)
TESTES:                       53/53 NOVOS (298/298 total)
CONTAGEM REAL:                SIM (2 execuções reais, verificadas fisicamente no Supabase)
IDEMPOTÊNCIA:                 SIM (comprovada fisicamente — sem duplicação, collection_run cresceu +1)
IBGE REGRESSÃO:               OK (853 territories, 853 indicadores demografia, 1712 runs — inalterado)
TSC:                          OK
BUILD:                        OK
PRONTO PARA WORKFLOW N8N:     NÃO (aguardando homologação deste bloco + decisão sobre pendências da Seção 12)
```

**Gate respeitado:** nenhuma tabela nova, nenhuma migration aplicada, nenhum workflow n8n criado, nenhuma alteração em produção (Vercel/env vars), `mode=mg` não executado de verdade, nenhum outro motor (DATASUS/TSE/Google News/Perplexity) iniciado, Motor IBGE intocado e revalidado, nenhum secret exposto ou reaproveitado. Parando aqui, como pedido.
