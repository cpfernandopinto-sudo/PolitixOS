# POLITIXOS — TERRITÓRIOS — AUDITORIA INDEPENDENTE ECO-03B1

## Novo CAGED — Ingestão Central (MOV + FOR + EXC, vintage, hash, agregação municipal, persistência)

**Auditor:** Claude (arquitetura, auditoria, inteligência)
**Data:** 2026-08-16
**Modo:** auditoria independente, read-only por padrão, com validação de código e dados reais
**Implementado por:** Codex (ECO-03B1)
**Relatório auditado:** `docs/relatorios/CODEX_ECO03B1_INGESTAO_CENTRAL_CAGED.md`
**Baseline não tocado:** `docs/relatorios/CLAUDE_INTEL02C_CALIBRACAO_MULTIMUNICIPAL.md` (INTEL-02C, homologado)

---

## 1. Resumo executivo

Esta auditoria não confiou no relatório do Codex como prova. Todo achado central foi refeito de forma independente: recomputei SHA-256 dos 4 artefatos brutos reais em disco; extraí os `.7z` originais eu mesmo e inspecionei o header e os campos reais de MOV/FOR/EXC linha a linha; recontei — via `awk` puro, sem usar nenhuma linha do código auditado — a reconciliação nacional e dos 3 municípios-piloto para 202606 e para 202001; consultei o Supabase real (não o relatório) para os 9 indicadores, as 3 evidências e o schema/constraints das tabelas; e reexecutei o pipeline TypeScript completo (incluindo o teste de integração real) sob minha própria invocação, obtendo uma 3ª execução persistida no banco.

**Resultado: todas as afirmações centrais do Codex sobre MOV/FOR/EXC, reconciliação nacional e municipal, idempotência, persistência-piloto, streaming/memória e ausência de microdados no Postgres foram confirmadas de forma independente e byte-exata.** Não encontrei nenhum achado BLOCKER nem HIGH. Encontrei 6 achados MODERATE/LOW — nenhum exige redesenho, a maioria já era reconhecida como ressalva pelo próprio Codex; um deles é uma correção de precisão na interpretação do "1.676" (ver seção 30-32) e outro é uma correção real de severidade: uma suspeita inicial de risco de duplicação por concorrência (a partir da leitura do código de persistência) foi **rebaixada** depois de consultar o schema real do Postgres e confirmar a existência de um índice único genuíno protegendo `territory_indicators`.

## 2. Decisão preliminar

**ECO-03B1: HOMOLOGADO COM RESSALVAS.** As ressalvas são as mesmas naturezas já identificadas pelo Codex (storage efêmero, catálogo territorial incompleto, ausência de contrato de run nacional, dependência de `curl`/`bsdtar` do host, scheduler não pronto) — nenhuma delas é um erro de dado, de semântica ou de rastreabilidade. MOV, FOR, EXC, agregação, idempotência e lineage estão corretos.

## 3. Estado inicial / branch / worktree / concorrência

Trabalho realizado no checkout principal (branch `main`), o mesmo diretório onde as trilhas Codex/Claude/Antigravity operam concorrentemente nesta sessão (convenção já estabelecida nos gates anteriores desta mesma sequência, incluindo INTEL-02C). `git worktree list` mostra worktrees adicionais isolados (`.claude/worktrees/*`) não utilizados nesta auditoria. `git branch` não mostra nenhuma branch dedicada para ECO-03B1 — os arquivos chegaram como não rastreados (`??`) no checkout principal, consistente com o padrão já usado pelos gates anteriores desta sessão.

Nada em `lib/territorios/intelligence/economy/`, `scripts/calibracao-intel02c-multimunicipal.ts`, frontend, n8n ou Orquestrador foi alterado por esta auditoria — apenas lidos e usados como baseline de não-regressão (seção 14).

## 4. Arquivos auditados

12 arquivos de produto (`lib/territorios/caged/*.ts` + `*.test.ts`) e 2 scripts (`scripts/audit-caged-eco03b1.ts`, `scripts/audit-caged-eco03b1.integration.test.ts`) — os mesmos 14 listados pelo relatório Codex, mais o próprio relatório. Todos os 12 arquivos de `lib/territorios/caged/` foram lidos por completo, linha a linha, não apenas amostrados. Nenhuma divergência entre o inventário do Codex e o inventário real encontrado via `find`.

## 5. Arquitetura reconstruída a partir do código (não do relatório)

```
officialCagedUrl(kind, declarationMonth)                      [source.ts]
  → curl --fail --location --retry 3 --output <partial>.7z
  → CagedArtifactStorage.commitDownloaded                     [artifact-storage.ts]
      sha256File (stream, chunk a chunk)
      storagePath = CAGED{kind}{mes}.{sha256}.7z               ← endereçado por conteúdo
      manifest .partial → rename atômico
  → extractCagedText: bsdtar -xf <7z> -C <tmpdir>              [source.ts]
      exige exatamente 1 .txt no diretório raiz, não-vazio
  → parseCagedFile: createReadStream → csv-parse (stream)      [parser.ts]
      valida header obrigatório antes da 1ª linha
      resolveCagedEventEffect(record, kind)                    [core.ts]
      resolver.resolve(cagedMunicipality)                      [municipality-resolver.ts]
      agregação em Map<município|mês> — nunca array de eventos
  → mergeCagedAggregates(MOV) filtrado a referenceMonth==declarationMonth → currentAggregates
  → mergeCagedAggregates(FOR+EXC) → revisionDeltas (NUNCA persistido como current)
  → NDJSON curated (municipal-current, revision-deltas)         [pipeline.ts]
  → persistCagedAggregates (chamada externa, não faz parte do pipeline puro) [persistence.ts]
      territory_indicators (insert/update/unchanged por hash)
      territory_evidence (upsert onConflict territory_id,source_hash)
  → territory_collection_runs (território-âncora, scope=national_central_batch)
```

Esta reconstrução bate com o diagrama do relatório Codex (seção 3) em todos os pontos materiais. Uma diferença de precisão que vale registrar: `pipeline.ts` **não importa `persistence.ts`** — a persistência é uma etapa explicitamente externa, disparada apenas por quem chama o pipeline (o script de auditoria). O motor puro (download→extração→parse→agregação→NDJSON) não tem nenhuma dependência de Supabase. Isso confirma, por construção, que rodar o pipeline sozinho nunca grava no banco — só `persistCagedAggregates` grava, e só é chamada explicitamente.

## 6. Infraestrutura existente (reauditada)

Confirmo a tabela do Codex (seção 2 do relatório dele) por inspeção direta do Supabase real: `territories`/`territory_indicators`/`territory_evidence`/`territory_collection_runs` já existiam e foram reutilizadas sem alteração de schema. Nenhuma tabela nova foi criada para CAGED — busquei todo o schema `public` (14 tabelas) e não existe nenhuma tabela de microdados/eventos CAGED. Não há bucket de Object Storage, DuckDB, Parquet, BigQuery ou GCS/S3 configurado no repositório ou no projeto Supabase consultado. A escolha por filesystem local foi tecnicamente necessária para o piloto (nenhum storage durável estava configurado) — não é apenas preferência.

## 7. Fonte oficial (revalidada)

Confirmei a URL construída por `officialCagedUrl`: `ftp://ftp.mtps.gov.br/pdet/microdados/NOVO%20CAGED/{ano}/{competência}/CAGED{tipo}{competência}.7z` — idêntica ao padrão documentado no discovery ECO-03A. Os 4 manifestos reais em disco (MOV/FOR/EXC 202606, MOV 202001) têm `sourceUrl` exatamente nesse formato, apontando para o FTP oficial do MTE. Não usei o relatório como prova única: recomputei o SHA-256 de cada um dos 4 arquivos `.7z` cacheados localmente e confirmei que bate exatamente com o hash tanto do nome do arquivo quanto do manifesto (seção 11).

## 8-13. MOV / FOR / EXC / documentação oficial / download / curl

### 8.1 Header real dos 3 arquivos (extraídos por mim, não pelo Codex)

Extraí eu mesmo os 3 `.7z` de 202606 com `bsdtar` e li os headers reais:

- **MOV** (4.295.101 linhas): 28 colunas, `indicadordeforadoprazo` sempre `0`, `competênciamov` sempre `202606`.
- **FOR** (65.573 linhas): mesmas 28 colunas do MOV, `indicadordeforadoprazo` sempre `1`, `competênciamov` variando entre 202506 e 202605 (12 meses distintos).
- **EXC** (8.719 linhas): 30 colunas — as 28 de MOV/FOR **mais** `competênciaexc` e `indicadordeexclusão`. `indicadordeexclusão` sempre `1` (8.719/8.719) — toda linha do arquivo EXC é, de fato, uma exclusão, sem exceção; `competênciaexc` sempre `202606` (a competência da própria exclusão); `competênciamov` varia entre 202001 e 202605 (77 meses distintos) — é a competência do evento **original** sendo excluído.

Isso resolve diretamente a preocupação da seção 22 do gate ("não assumir que todo EXC possui comportamento uniforme sem ler os campos reais"): **li os campos reais e confirmei que o comportamento é de fato uniforme neste arquivo** (`indicadordeexclusão` não varia), então a implementação atual (aplicar sinal invertido a toda linha de EXC, sem ramificar por esse indicador) está correta para os dados reais observados — não é uma suposição não verificada.

### 8.2 Download / curl

`source.ts` invoca `curl --fail --location --retry 3 --retry-delay 2 --connect-timeout 30 --max-time 900 --output <tmp>.partial <url>`, grava em arquivo temporário e só depois `commitDownloaded` move para o destino final — download nunca escreve direto no caminho final (atomicidade real). `stderr` é capturado (últimos 2000 caracteres) para diagnóstico em caso de falha. Timeout de conexão (30s) e timeout total (900s) presentes; `--retry 3` cobre falhas transitórias de rede. Curl real instalado: `curl 8.7.1 (x86_64-apple-darwin25.0)`. Portável — `curl` está disponível por padrão em praticamente qualquer runtime Linux/macOS usado para batch, mas não é garantido em toda imagem serverless mínima (ver seção 25, recomendação de runtime).

### 8.3 Semântica do evento — verificação de código + dados reais combinados

`resolveCagedEventEffect` (`core.ts`):

```
sign = (kind === 'EXC') ? -1 : 1
admissionsDelta = (movement === 1)  ? sign : 0
dismissalsDelta = (movement === -1) ? sign : 0
balanceDelta    = sign * movement
```

Verificação analítica (não apenas leitura): para MOV/FOR (`sign=1`) — admissão vira `+1/+1`, desligamento vira `dismissals+1/balance-1`, zero não gera efeito algum (nenhum evento é "inventado" — confirmado pelo teste `aceita movimento zero sem inventar evento`). Para EXC (`sign=-1`) — exclusão de admissão (`movement=1`) vira `admissionsDelta=-1, balanceDelta=-1`; exclusão de desligamento (`movement=-1`) vira `dismissalsDelta=-1, balanceDelta=+1`. **Isso bate exatamente com a semântica exigida pela seção 21 do gate.**

Confirmação com dados reais (independente do código, via `awk` puro sobre o EXC extraído por mim): 3.977 linhas com `saldomovimentação=1` (exclusões de admissão) e 4.742 linhas com `saldomovimentação=-1` (exclusões de desligamento). Aplicando a regra manualmente: delta admissões = -3.977, delta desligamentos = -4.742, delta saldo = -3.977·(-1) + 4.742·(+1)... — mais diretamente: `balanceDelta` soma = (-1)×3.977 + (+1)×4.742 = **+765**. Isso bate **exatamente** com os números que o relatório Codex publicou na tabela da seção 10 (`EXC: Delta adm. -3.977, Delta deslig. -4.742, Delta saldo +765`) — só que eu cheguei a esses números direto do arquivo bruto, sem rodar nenhuma linha do TypeScript auditado.

O mesmo exercício para FOR (`sign=1`): 36.376 linhas com `saldomovimentação=1`, 29.197 com `-1` → delta admissões +36.376, delta desligamentos +29.197, delta saldo +7.179 — bate exatamente com a tabela do Codex.

### 8.4 `declaration_month` × `reference_month`

`parser.ts` usa `raw['competênciamov']` (não `competênciaexc`, não o nome do arquivo) como `referenceMonth` para **todos** os tipos, inclusive EXC. Com dados reais eu confirmei que essa é a escolha metodologicamente correta: `competênciamov` no arquivo EXC 202606 varia (202001–202605, é a competência do evento original), enquanto `competênciaexc` é sempre 202606 (a competência da publicação/exclusão em si). Se o código usasse `competênciaexc` ou o nome do arquivo, todas as revisões históricas colapsariam incorretamente em junho/2026 — o que **não acontece**: o `pipeline.ts` filtra `currentAggregates` para `referenceMonth === declarationMonth` (só MOV do próprio mês vira "current"), e mantém FOR/EXC — cujos `referenceMonth` corretamente apontam para o passado — isolados em `revisionDeltas`, nunca persistidos como valor absoluto (ver seção 11.5).

**Gate PASS: MOV, FOR, EXC, EXC INVERSION, DECLARATION_MONTH, REFERENCE_MONTH — todos confirmados com dados reais, não apenas com o código.**

## 14. Segurança de extração / 15. `bsdtar`

`/usr/bin/bsdtar` real instalado: **bsdtar 3.5.3 — libarchive 3.7.4**. Esta é uma versão moderna do libarchive, que desde a correção histórica de CVE-2013-0211 sanitiza por padrão entradas de arquivo com `../` ou caminho absoluto durante a extração (não escreve fora do diretório alvo, a menos que flags explícitas de "modo inseguro" sejam passadas). O código **não** passa `--absolute-paths`/`-P` nem desabilita as proteções padrão — usa apenas `bsdtar -xf <arquivo> -C <diretório>`. Depois da extração, o código valida que existe **exatamente 1** arquivo `.txt` na raiz do diretório (não recursivo) e que não está vazio; se o `.7z` tivesse conteúdo inesperado (múltiplos arquivos, subdiretórios, nomes diferentes), a extração falharia de forma segura (`CAGED_EXTRACT_FAILED`), não silenciosamente.

**Achado MODERATE (não bloqueante):** a proteção contra path traversal depende inteiramente do comportamento padrão do `bsdtar`/libarchive do host, sem uma validação própria no código (por exemplo, listar (`bsdtar -tf`) e validar nomes de entrada antes de extrair). Como a fonte é oficial e confiável e o comportamento padrão do libarchive já é seguro, o risco atual é baixo — mas antes de produção/scheduler, recomendo adicionar uma validação explícita própria como defesa em profundidade, já que o comportamento depende de uma dependência externa do host, não de uma garantia do próprio código.

## 16-17. SHA-256 / vintage

Recomputei o SHA-256 dos 4 arquivos `.7z` reais em cache (`shasum -a 256`, ferramenta do sistema, independente de qualquer código do repositório):

| Arquivo | SHA-256 recomputado por mim | Igual ao manifesto? | Igual ao relatório Codex? |
|---|---|---|---|
| MOV 202606 | `3e2f9294cad913f8398f6a07033f6a6fedd5150f3b2d8beb10243e3d70c2f690` | Sim | Sim |
| FOR 202606 | `1dfa84365addc09bfd65e89eb49bff48d4a4e2ed2ebe8dfccabe7cd57e195eab` | Sim | Sim |
| EXC 202606 | `f5e761a370845a67b9db865c6b0019029a10d901512eab0c87831be19cd0f419` | Sim | Sim |
| MOV 202001 | `93e7d514e9a1e7c05b0af6a209080a2a0ca3f5d54d939f248e8838a838cb1d7a` | Sim | Sim |

`sha256File` (`artifact-storage.ts`) faz streaming via `createReadStream` chunk a chunk — nunca carrega o arquivo inteiro em memória para hashear. O teste unitário `artifact-storage.test.ts` prova que 1 byte diferente muda o hash e o mesmo conteúdo produz o mesmo hash — reexecutei esse teste (seção 25).

## 18. Imutabilidade do raw

`storagePath = CAGED{kind}{mes}.{sha256}.7z` — o **nome do arquivo é derivado do próprio conteúdo**. Por construção, é arquiteturalmente impossível sobrescrever um arquivo já existente com conteúdo diferente: um hash diferente sempre produz um caminho diferente; um hash igual produz o mesmo caminho e o código simplesmente descarta o download temporário (`fs.access` bem-sucedido → `fs.unlink(tempPath)`) em vez de sobrescrever. Isso é uma garantia por design, não uma checagem em runtime que possa ser burlada. `readCurrentVintage` ainda **re-hasheia o arquivo em disco a cada leitura** e invalida o cache se o hash real divergir do manifesto — proteção adicional contra corrupção silenciosa. **PASS.**

## 19-20. Layout / UTF-8

Header MOV/FOR (28 colunas) e EXC (30 colunas) confirmados por leitura direta dos arquivos reais extraídos por mim (seção 8.1). Os 3 campos mínimos exigidos pelo parser (`competênciamov`, `município`, `saldomovimentação`) estão presentes nos 3 arquivos. `normalizeHeader` remove BOM UTF-8 (`﻿`) e faz `toLocaleLowerCase('pt-BR')` — testei visualmente que os nomes de coluna com acentuação (`competênciamov`, `município`, `saldomovimentação`, `raçacor`) foram lidos corretamente pelo meu próprio `awk`/`python3` (que assumem UTF-8), confirmando que o conteúdo real é UTF-8, como declarado pela fonte oficial.

**Teste de layout incompatível:** já coberto por `parser.test.ts` (`falha imediatamente com layout incompatível` — fixture com apenas 2 colunas, espera `CAGED_LAYOUT_MISMATCH`). Reexecutei esse teste (seção 25) — PASS. Fail-fast confirmado: a validação ocorre no callback `columns` do `csv-parse`, **antes** de qualquer linha de dado ser processada.

## 21-22. Streaming / memória

Por inspeção de código: `parser.ts` usa `createReadStream(textPath).pipe(parse(...))` e itera com `for await` — nunca há `readFile`/`readFileSync` do arquivo completo, nunca há `split('\n')` de um buffer inteiro, e o único estado acumulado é `aggregates: Map<string, ...>` (chave `município|mês`, cardinalidade máxima de milhares, nunca milhões) — nenhum array de eventos brutos é retido.

Confirmação empírica, **na minha própria execução** (não a do Codex), reexecutando o teste de integração real:

| Arquivo | Linhas | Tamanho TXT | Pico RSS (minha execução) | Pico RSS (Codex) |
|---|---:|---:|---:|---:|
| MOV 202606 | 4.295.101 | 427 MiB | 113.098.752 B (~107,8 MiB) | ~119,3 MiB |
| MOV 202001 | 2.677.294 | 263 MiB | 135.233.536 B (~129,0 MiB) | ~91,1 MiB |
| FOR 202606 | 65.573 | 6,5 MiB | 84.541.440 B | — |
| EXC 202606 | 8.719 | 964 KiB | 85.688.320 B | — |

A memória de pico **não escala linearmente com o tamanho do arquivo** (427 MiB → ~108 MiB de pico; 263 MiB → ~129 MiB de pico — a ordem nem é monotônica com o tamanho do arquivo, o que é exatamente o comportamento esperado de um processo que agrega por chave e não acumula linhas). Os números diferem um pouco dos do Codex (esperado — hardware/momento de medição diferentes, GC não determinístico), mas estão na mesma ordem de grandeza e confirmam a mesma conclusão. **PASS — streaming real, sem risco de OOM proporcional ao volume de microdados.**

## 23. Event effect / 24-25. declaration/reference month / revisão histórica

Já cobertos com evidência real nas seções 8.3–8.4. Adicionalmente, simulei o caso explícito pedido pelo gate (`FOR declarationMonth=202606, referenceMonth=202604`): o teste unitário existente `core.test.ts` já cobre exatamente esse caso (`aplica FOR à competência do evento`, com `referenceMonth: '202604'`) e o confirmei rodando a suíte (seção 25). Com dados reais, encontrei um caso ainda mais antigo: EXC 202606 contém eventos com `competênciamov=202001` — ou seja, uma publicação de junho/2026 pode alterar (via exclusão) um evento de janeiro/2020, 77 meses no passado. **Revisão histórica: PASS, comprovado com dado real, não apenas fixture.**

## 26-27. Impacted months / impacted municipalities

`referenceMonthsTouched`/`municipalitiesTouched` são `Set`s construídos durante o parse (não recalculam o histórico nacional inteiro — apenas os meses/municípios que efetivamente aparecem nas linhas de FOR/EXC processadas). Na minha execução real: FOR tocou 12 meses (202506–202605) e 3.180 municípios; EXC tocou 77 meses (202001–202605) e 1.160 municípios — exatamente os números do Codex, reconfirmados. O algoritmo não varre nem recalcula competências fora das efetivamente presentes nos arquivos processados.

## 28-32. Resolver territorial / CAGED→IBGE / códigos não resolvidos

### 28.1 Origem e construção do dicionário

`loadOfficialMunicipalityResolver` consome a API oficial `https://servicodados.ibge.gov.br/api/v1/localidades/municipios` (cacheada localmente com fonte, `collectedAt` e SHA-256 do array ordenado). `CagedMunicipalityResolver.fromIbgeRows` filtra apenas IDs de 7 dígitos, ordena, e constrói `Map<código_caged_6_dígitos, código_ibge_7_dígitos>` **detectando colisões** (se dois códigos IBGE distintos truncassem para o mesmo prefixo de 6 dígitos, o construtor lançaria `CagedError`). Isso **não é** "remover o dígito verificador sem validar" — é construir a tabela a partir da lista oficial completa e vigente e provar que não há ambiguidade nela. Executei essa mesma lógica eu mesmo em Python contra o dicionário real em cache (5.571 municípios, 0 colisões) e contra os 4 arquivos brutos reais — resultado idêntico ao do resolver TypeScript.

### 28.2 CORREÇÃO DE PRECISÃO NECESSÁRIA — "1.676" é EVENTOS, não CÓDIGOS DISTINTOS

Este é o achado mais importante desta seção e responde diretamente à seção 30 do gate. Reproduzindo a lógica do resolver em Python e escaneando os 4 arquivos brutos reais:

| Arquivo | Linhas totais | Eventos não resolvidos | **Códigos distintos não resolvidos** | Município(s)/código(s) |
|---|---:|---:|---:|---|
| MOV 202606 | 4.295.101 | 1.676 | **1** | `999999` |
| FOR 202606 | 65.573 | 31 | **1** | `999999` |
| EXC 202606 | 8.719 | 7 | **1** | `999999` |
| MOV 202001 | 2.677.294 | 9 | **1** | `999999` |

**Correção da interpretação:** "1.676 códigos não resolvidos" do relatório Codex está tecnicamente certo em chamá-los de "eventos" no texto corrido — mas o número induz a pensar em uma dispersão de dezenas/centenas de municípios históricos, extintos ou especiais. **Na realidade, é um único código sentinela (`999999`) que se repete 1.676 vezes** — e o mesmo padrão único se repete, de forma perfeitamente consistente, nos outros 3 arquivos (FOR, EXC, e no MOV histórico de 2020). Isso é consistente com um código de placeholder do tipo "ignorado/não identificado" comum em microdados administrativos brasileiros — não consegui confirmar textualmente esse significado exato na documentação disponível nesta auditoria (não fazia parte do escopo revalidar o dicionário de domínio completo do layout XLSX), mas o padrão observado (mesmo valor, em 100% dos casos, nos 4 arquivos de 2 competências muito distantes) é característico de um código reservado, não de erro de dado disperso.

**Isso é uma boa notícia para a robustez do resolver:** não há evidência de fragilidade sistemática do dicionário IBGE contra códigos históricos/extintos reais — o "não resolvido" inteiro observado nestes 4 arquivos reais colapsa em um único valor sentinela conhecido.

**Ação necessária:** nenhuma correção de código é obrigatória para este gate (o comportamento atual — descartar da camada municipal, manter na reconciliação nacional — já é correto e seguro para este código). Recomendo, para clareza futura, que o pipeline rotule explicitamente `999999` como "código reservado/ignorado" em vez de tratá-lo de forma indistinguível de um código genuinamente não mapeado — melhoria de observabilidade, não correção de bug (classificado LOW).

### 28.3 Impacto quantitativo

`999999` representa 1.676/4.295.101 = 0,039% das linhas do MOV 202606. A diferença entre o total nacional (2.220.131/2.074.970/+145.161) e a soma apenas dos municípios resolvidos (2.218.972/2.074.453/+144.519, valores que recomputei eu mesmo somando `currentAggregates`) é exatamente atribuível a esse único código, e o pipeline **mantém essa diferença auditável e visível** (não descarta silenciosamente da reconciliação nacional, só da camada municipal). PASS.

## 33-37. Reconciliação nacional, municipal e histórica — recalculada independentemente

Toda esta seção foi recomputada por mim com `awk` puro, direto sobre os arquivos `.7z` extraídos por mim mesmo com `bsdtar`, **sem executar uma única linha do código TypeScript auditado** para chegar a estes números:

| Métrica | Meu recálculo (awk) | Claim Codex | Fonte oficial (sumário executivo, via ECO-03A) | Resultado |
|---|---:|---:|---:|---|
| Nacional MOV 202606 — admissões | 2.220.131 | 2.220.131 | 2.220.131 | **PASS** |
| Nacional MOV 202606 — desligamentos | 2.074.970 | 2.074.970 | 2.074.970 | **PASS** |
| Nacional MOV 202606 — saldo | +145.161 | +145.161 | +145.161 | **PASS** |
| Contagem 202606 | 12.237 / 11.323 / +914 | idem | — | **PASS** |
| Betim 202606 | 7.291 / 5.935 / +1.356 | idem | — | **PASS** |
| Belo Horizonte 202606 | 47.792 / 46.646 / +1.146 | idem | — | **PASS** |
| Contagem 202001 | 6.567 / 6.852 / -285 | idem | — | **PASS** |
| Betim 202001 | 3.161 / 2.685 / +476 | idem | — | **PASS** |
| Belo Horizonte 202001 | 31.772 / 32.571 / -799 | idem | — | **PASS** |
| FOR 202606 (linhas / delta adm. / deslig. / saldo) | 65.573 / +36.376 / +29.197 / +7.179 | idem | — | **PASS** |
| EXC 202606 (linhas / delta adm. / deslig. / saldo) | 8.719 / -3.977 / -4.742 / +765 | idem | — | **PASS** |

Adicionalmente, reexecutei o **pipeline TypeScript completo** (não apenas o `awk`) via `CAGED_RUN_REAL_AUDIT=1 npx vitest run scripts/audit-caged-eco03b1.integration.test.ts`, minha própria 3ª execução real do sistema (as duas anteriores foram do Codex), e o resultado bateu, byte a byte, com os dois métodos anteriores — três fontes independentes (awk manual, TypeScript do Codex, TypeScript da minha própria execução) convergindo no mesmo número. **Não há dúvida razoável sobre a correção da reconciliação.**

## 38. Base histórica / proteção contra publicar delta como absoluto

Confirmado por leitura de código (`pipeline.ts`): `currentAggregates` é construído **exclusivamente** a partir de `mergeCagedAggregates(mov)` filtrado a `referenceMonth === declarationMonth` — ou seja, só a base MOV do próprio mês. Os deltas de FOR/EXC vão para `revisionDeltas`, escrito apenas em `revision-deltas.ndjson` (auditoria/curated), e **nunca** são passados para `persistCagedAggregates`. Não existe nenhum caminho de código, hoje, que aplicaria um delta FOR/EXC sobre uma base ausente/zero e o publicasse como total histórico absoluto. **Não é BLOCKER — confirmado ausente por construção, não apenas por promessa do relatório.**

## 39. Estrutura curated / 39-bis Balance identity

Estrutura `CagedMunicipalAggregate {ibgeCode, cagedMunicipality, referenceMonth, admissions, dismissals, balance, rowsRead}`. Toda vez que um evento é somado a um agregado (`parser.ts`, linha do loop) e toda vez que agregados são combinados (`mergeCagedAggregates`), o código verifica explicitamente `if (current.balance !== current.admissions - current.dismissals) throw CAGED_RECONCILIATION_FAILED` — a identidade é uma invariante ativamente checada em runtime a cada linha e a cada merge, não apenas uma expectativa de teste. **PASS.**

## 40-41. Determinismo / aggregate hash

`canonicalAggregateHash` serializa `{territory, referenceMonth, admissions, dismissals, balance, contributingVintages: [...].sort(), methodVersion}` e hasheia com SHA-256 — `contributingVintages` é ordenado antes de hashear, tornando o hash independente da ordem de chegada das fontes. O teste `hash agregado é determinístico para ordem de vintages` (reexecutado, PASS) prova isso diretamente.

**Pergunta do gate — mesmo valor final, vintage diferente, mesmo hash ou diferente?** Resposta encontrada no código e confirmada por teste: **hash diferente**, deliberadamente. O hash inclui `contributingVintages`, então uma republicação do MTE com o mesmo conteúdo final mas hash de arquivo diferente gera um hash de agregado diferente, o que força `decideCagedIndicatorAction` a marcar `update` mesmo sem o `valor` ter mudado (teste `nova vintage muda o hash e força update do current`, reexecutado, PASS). Essa é uma decisão de design coerente e documentada: o hash rastreia proveniência, não apenas o resultado numérico — permite detectar "o MTE republicou este arquivo" mesmo quando os números finais coincidem.

## 42-43. Current vs vintage / natural key

`persistence.ts` só grava um registro `current` por `(territory_id, indicador, período)`; revisões atualizam o mesmo registro via `decideCagedIndicatorAction` (nunca criam uma segunda linha "current" para a mesma chave). Consultei o schema real do Postgres (`pg_indexes`) e confirmei a existência de um **índice único genuíno** `uq_territory_indicators_natural_key` sobre `(territory_id, categoria, indicador, fonte, COALESCE(source_dataset,''), COALESCE(periodo_inicio,'0001-01-01'), COALESCE(periodo_fim,'0001-01-01'))` — a chave natural proposta no discovery ECO-03A está de fato implementada como constraint de banco, não apenas como convenção de aplicação. **PASS, confirmado no schema real, não apenas no código.**

## 44-46. Persistência piloto / 9 indicators / evidence

Consultei o Supabase real diretamente (não o relatório) para `territory_indicators` com `categoria=economia, fonte=MTE, source_dataset=NOVO_CAGED`: **exatamente 9 linhas**, 3 por município (admissões/desligamentos/saldo) × 3 municípios. Todos os 9 valores batem exatamente com os totais que recomputei via `awk` independentemente (seção 33-37). Cada linha carrega `metadata.aggregate_hash`, `metadata.contributing_vintages` (as 3 vintages MOV+FOR+EXC), `metadata.reference_month=202606`, `metadata.declaration_month=202606`, `metadata.rows_contributing` — lineage completo e correto.

`territory_evidence` com `source_name='MTE/Novo CAGED'`: **exatamente 3 linhas**, uma por município, cada uma com `raw_reference.vintages` contendo, para MOV/FOR/EXC, `kind, sha256, size_bytes, source_url, storage_path, layout_version` — permitindo seguir de volta até o arquivo bruto e a URL FTP oficial.

## 47-48. Raw evidence / lineage

Segui manualmente a cadeia para os 3 municípios: `territory_indicators.metadata.aggregate_hash` → `territory_evidence.source_hash` (idêntico) → `territory_evidence.raw_reference.vintages[].sha256` → confere exatamente com o SHA-256 que recomputei eu mesmo do arquivo `.7z` em disco (seção 16-17) → `raw_reference.vintages[].source_url` aponta para o FTP oficial do MTE. Cadeia completa e verificada para Contagem, Betim e Belo Horizonte, ponta a ponta. **PASS.**

## 49-50. Microdados no Postgres / dados pessoais

Enumerei **todo o schema `public`** do projeto Supabase real via `list_tables` — 14 tabelas no total. Não existe nenhuma tabela de microdados/eventos CAGED (nem `caged_events`, nem qualquer nome equivalente). `territory_indicators` tem 27.679 linhas no total (todos os motores/domínios combinados, não só CAGED) e `territory_evidence` tem 253 — nenhum desses números é compatível com ter recebido os 4,3 milhões de eventos brutos de MOV+FOR+EXC. `territory_evidence.raw_reference` e `territory_indicators.metadata` contêm apenas agregados municipais (contagens, hashes, datas) — nenhum campo de trabalhador individual (idade, sexo, CBO, salário individual, etc.) foi encontrado em nenhuma das 9+3 linhas inspecionadas. **PASS — microdados fora do Postgres confirmado por enumeração direta do schema, não por confiança no relatório. PASS — nenhum dado pessoal persistido.**

## 51-52. Idempotência / vintage nova

Reexecutei a suíte completa de idempotência sob minha própria invocação (3ª execução real do sistema, distinta das 2 do Codex):

| Verificação | Resultado (minha execução) |
|---|---|
| Cache hits de raw na 2ª chamada de `runCagedPipeline` dentro do mesmo script | 3/3 |
| `sameCurrent` (mesmo `currentAggregates` entre as duas chamadas) | `true` |
| 1ª persistência (registros já existiam do Codex) | 0 insert / 0 update / 9 unchanged |
| 2ª persistência (mesma execução) | 0 insert / 0 update / 9 unchanged |
| Linhas de indicador antes/depois da 2ª persistência | 9 / 9 |
| `secondRunAddedIndicatorRows` | 0 |

Todos os 9 indicadores já existiam de execuções anteriores do Codex — minha execução prova que uma **3ª chamada, de um processo/dia diferente**, continua idempotente: zero duplicação, zero drift. `territory_collection_runs` para `workflow_name='novo-caged-central-v1'` mostra 3 execuções reais (2 do Codex + 1 minha), todas `status=completed`, todas com os mesmos `items_collected=4.369.393` e `items_discarded=1.714` — perfeitamente consistentes entre si.

Teste de "novo hash → nova vintage" já coberto por teste unitário determinístico (`nova vintage muda o hash e força update do current`, reexecutado nesta auditoria, PASS) — optei por não corromper o raw oficial real para simular isso em produção, conforme instrução do gate.

## 53. Revisão simulada

Não simulei uma revisão real contra o dado de produção (evitando qualquer escrita fora do piloto autorizado), mas o mecanismo já está coberto e comprovado: `decideCagedIndicatorAction` retorna `update` sempre que `valor` OU `aggregate_hash` mudam para uma chave já existente — e a chave é sempre `(territory, indicador, período)`, nunca `(território, indicador, período, vintage)` — ou seja, uma revisão **atualiza** o registro current existente, nunca cria um segundo "current" para o mesmo município/mês. Combinado com o índice único real do banco (seção 42-43), uma revisão está estruturalmente impedida de duplicar.

## 54-55. Partial / completude de fontes

`resolveCagedRunStatus` retorna `'completed'` apenas se as 3 fontes solicitadas (MOV, FOR, EXC) foram processadas; caso contrário, `'partial'`. `runCagedPipeline` captura falhas por fonte individualmente (`try/catch` dentro do loop) e só propaga uma exceção se **todas** as fontes falharem; se pelo menos uma tiver sucesso, retorna normalmente com `status:'partial'`. `persistCagedAggregates` não é chamada automaticamente dentro do pipeline — só o script externo decide persistir, e o faz sempre depois de inspecionar o `status`. **Achado LOW:** o array `failures` (com o motivo específico de cada fonte que falhou) é descartado — não faz parte de `CagedPipelineResult` — dificultando diagnosticar *qual* fonte falhou e *por quê* quando `status='partial'`, sem reprocessar/logar manualmente. Recomendo incluir isso no retorno antes do scheduler.

Não testei "arquivo vazio pode ser válido" com um caso real (fora do escopo prudente para não gerar falso artefato oficial), mas o código valida `sizeBytes <= 0` como erro tanto no download quanto na extração — um arquivo genuinamente vazio nunca seria aceito como sucesso silencioso.

## 56-58. Collection runs / território-âncora / run nacional futuro

Confirmado por consulta direta ao banco: as 3 execuções de `novo-caged-central-v1` usam `territory_id` de Contagem (`0f4cb1d5-...`) com `metadata.scope='national_central_batch'` e `metadata.anchor_territory_only=true` — exatamente como descrito pelo Codex. **Risco real, não hipotético:** qualquer painel/dashboard futuro que liste "execuções recentes de Contagem" sem filtrar por esse metadata mostraria um batch nacional de 4,3 milhões de linhas como se fosse uma coleta específica de Contagem — confuso para um operador, mas não corrompe dado nenhum (o metadata correto está lá para quem souber olhar). Classificação: **MODERATE** (débito de observabilidade/arquitetura, aceitável para piloto, não aceitável como desenho final). Recomendação para gate futuro, sem implementar agora: uma tabela `source_collection_runs`/`national_collection_runs` com `territory_id` nullable e um `scope_type`/`scope_id` explícito, mantendo `territory_collection_runs` para os motores realmente por-território.

## 59-62. Territories / cobertura nacional / catálogo territorial

Consultei `territories` diretamente: **854 linhas** (não 853 — 1 a mais que o relatório do Codex, provavelmente uma linha adicionada por outro workstream concorrente entre a execução deles e esta auditoria; diferença não material, não afeta nenhuma conclusão). O MOV 202606 resolveu **5.487** municípios distintos (recomputado por mim via Python, batendo com o `municipalities_touched` gravado no `territory_collection_runs` real). Isso confirma o gargalo real: `territories` cobre ~15,6% dos municípios que o CAGED nacional consegue resolver — persistência nacional completa está corretamente bloqueada até o catálogo ser expandido. O motivo real (não investigado a fundo nesta auditoria, fora do escopo) é que `territories` foi populado sob demanda pelos motores existentes (SICONFI/PIB/eleições/segurança), não como um seed nacional completo — design intencional herdado, não um bug do ECO-03B1.

**Recomendação (não implementada, apenas avaliada):** das 4 opções listadas no gate, a mais alinhada ao padrão já usado no restante do produto é a **C — upsert sob demanda**, com uma extensão pontual: ao processar um município CAGED resolvido pelo IBGE mas ausente em `territories`, criar a linha mínima (`codigo_ibge`, `municipio`, `uf`) automaticamente, no mesmo espírito do resolver municipal (fonte oficial, sem inventar dado) — evita tanto o seed nacional completo de uma vez (opção A, mais arriscada) quanto uma tabela de mapeamento paralela (opção D, duplicação de conceito).

## 63-66. Storage durável / recomendação / Parquet / DuckDB

Nenhum object storage está configurado no projeto Supabase consultado nem no repositório. Como o Supabase já é a infraestrutura existente e homologada do projeto (usada por todos os outros motores), a recomendação específica (não genérica) é: **Supabase Storage**, no mesmo projeto, como bucket dedicado para os `.7z`/manifests brutos — elimina a necessidade de introduzir um vendor novo (GCS/S3) só para isto, e mantém credenciais/observabilidade em um único lugar. Parquet/DuckDB não foram implementados pelo Codex; concordo que isso é aceitável — o parser streaming atual já resolve o volume real observado (427 MiB / 4,3M linhas em ~32s, pico de memória ~108 MiB) sem necessidade de um motor colunar adicional. Parquet/DuckDB deve ser tratado como otimização futura (útil se granularidade CNAE/CBO/perfil for adicionada em ECO-03B2+, não antes).

## 67-71. Performance / throughput / memória / disco / cleanup

Já cobertos com números reais da minha própria execução na seção 21-22. Throughput MOV 202606 (minha execução): 4.295.101 linhas / 32,06s de parse ≈ **134 mil linhas/s** (mesma ordem de grandeza do ~117 mil linhas/s reportado pelo Codex). Disco: 4 arquivos `.7z` cacheados somam ~88 MiB; os TXT extraídos (427+263+6,5+1 MiB ≈ 698 MiB) são gravados em diretórios temporários (`fs.mkdtemp`) e **removidos via `fs.rm(directory, {recursive:true, force:true})` no bloco `finally`** de `runCagedPipeline`, tanto em sucesso quanto em falha — confirmei isso por leitura de código, e por observação direta: depois de rodar o teste de integração, `/tmp` do sistema não acumulou diretórios `politixos-caged-extract-*` órfãos. **PASS — cleanup confirmado, não vaza espaço em disco por execução.**

## 72-73. Concorrência / locking

Esta seção contém uma **correção de severidade** desta auditoria em relação à minha própria leitura inicial de código: ao ler apenas `persistence.ts`, `persistCagedAggregates` usa um padrão "ler existentes → decidir insert/update/unchanged → `.insert()` simples" **sem** `onConflict`/upsert para `territory_indicators` — isso pareceria, só pela leitura do código da aplicação, um risco real de duplicação em corrida (dois runs concorrentes decidindo `insert` para a mesma chave antes de qualquer um gravar). **Consultei o schema real do Postgres** (não confiei na leitura do código isoladamente) e confirmei a existência do índice único `uq_territory_indicators_natural_key` (seção 42-43): em uma corrida real, a segunda gravação falharia com violação de constraint (erro `CAGED_PERSISTENCE_FAILED`, run marcado `failed`) — **não duplicaria dado**. Rebaixo a severidade de "risco de corrupção de dado" (que seria HIGH) para **MODERATE** (falha barulhenta e desperdício de trabalho concorrente, não corrupção). `territory_evidence` está ainda mais protegida: o `.upsert(..., {onConflict:'territory_id,source_hash', ignoreDuplicates:true})` já usa exatamente o índice único real que existe no banco.

Não existe lock/mutex explícito (nem em nível de aplicação nem via `advisory lock` do Postgres) impedindo que dois runs comecem simultaneamente e disputem I/O de download/extração no mesmo `dataRoot` — o download usa diretórios temporários únicos por chamada (`fs.mkdtemp`) então não há corrupção de arquivo parcial entre execuções concorrentes, mas há trabalho duplicado (dois downloads/parses do mesmo arquivo nacional rodando ao mesmo tempo) até a gravação final. **Recomendação antes do scheduler:** um advisory lock do Postgres (`pg_try_advisory_lock`) chaveado por `declarationMonth`, ou um lock de arquivo simples no `dataRoot` — não implementado neste gate, apenas recomendado.

## 74-78. Scheduler readiness / Vercel / runtime / dependências do host / Node

**Scheduler: NOT_READY** (concordo com a conclusão do Codex, confirmada pelos achados desta auditoria). Critérios não atendidos: storage durável (filesystem efêmero, seção 63), catálogo territorial nacional incompleto (seção 59-62), sem contrato explícito de run nacional (seção 56-58), sem locking (seção 72-73).

**Vercel:** o pipeline real processa um arquivo de 427 MiB, roda `curl`/`bsdtar` como processos externos via `child_process.spawn`, e levou ~36s só para extrair+parsear 202606 nesta auditoria (mais o tempo de download em produção, que aqui foi 0 por cache) — isso não cabe no modelo de Vercel Functions (limites de duração, ausência de garantia de `curl`/`bsdtar` na imagem serverless, filesystem não persistente entre invocações). **Confirmo a hipótese do gate: não cabe em Vercel Functions.**

**Runtime recomendado (não implementado):** um worker externo de longa duração — GitHub Actions com schedule mensal (mais simples de operar, sem infra nova) ou Cloud Run Job (se already usando GCP em outro lugar) são as opções mais compatíveis com a stack atual do projeto sem introduzir uma peça de infraestrutura totalmente nova.

**Dependências do host:** `curl 8.7.1` e `bsdtar 3.5.3` confirmados presentes e funcionais no ambiente onde rodei esta auditoria. `bsdtar` especificamente é dependência do sistema operacional (não do Node), então precisa ser garantido explicitamente na imagem do runtime de produção escolhido — não é dado como certo em toda imagem Linux mínima.

**Node:** `v24.9.0` real, mesmo runtime declarado pelo relatório Codex. Nenhuma incompatibilidade encontrada.

## 79-82. Testes existentes / unitários / integração real / suíte territorial

Não confiei na contagem do relatório — reexecutei tudo com comandos explícitos, com prefixo de diretório (nunca nome de arquivo isolado, evitando a contaminação de worktree aninhado já documentada em gates anteriores desta sessão):

| Comando | Resultado (minha execução, 2026-08-16) |
|---|---|
| `npx vitest run lib/territorios/caged` | **4 arquivos, 18 testes, PASS** — igual ao Codex |
| `CAGED_RUN_REAL_AUDIT=1 npx vitest run scripts/audit-caged-eco03b1.integration.test.ts` | **1 arquivo, 1 teste, PASS, 102,09s** — reexecução real, minha própria 3ª persistência |
| `npx vitest run lib/territorios app/api/territorios` | **76 arquivos, 675 testes, PASS** (0 falhas) |

A suíte territorial completa mostra 76 arquivos/675 testes contra os 75/643(+1 skip) que o Codex reportou — a diferença **não é regressão**: o INTEL-02C (gate seguinte ao ECO-03A, concluído antes desta auditoria) adicionou `consolidation.test.ts` e ajustou `official-share.test.ts` **depois** do Codex ter capturado o número dele. O estado atual, com ambos os gates somados, está 100% verde.

## 83. Regressão INTEL-02C

```
npx vitest run lib/territorios/intelligence/economy
→ 6 arquivos, 101 testes, PASS
```

Baseline idêntico ao declarado no encerramento do gate INTEL-02C (101/101). **Nenhuma regressão.** Nenhum arquivo de `lib/territorios/intelligence/` foi tocado por esta auditoria nem pelo ECO-03B1.

## 84-86. Typecheck / lint / build

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | **0 erros** |
| `npx eslint lib/territorios/caged scripts/audit-caged-eco03b1.ts scripts/audit-caged-eco03b1.integration.test.ts` | **0 erros, 0 warnings** |
| `npx next build` | **Sucesso completo** — compilação, typecheck e geração de páginas sem erro |

O relatório Codex atribuía a falha de typecheck/build global a erros externos em `scripts/calibracao-intel02c-multimunicipal.ts`, que era, de fato, um trabalho do INTEL-02C ainda em andamento no momento da execução do ECO-03B1. O INTEL-02C corrigiu esse arquivo antes do encerramento do gate dele (relatório `CLAUDE_INTEL02C_CALIBRACAO_MULTIMUNICIPAL.md`, seção de regressão) — **typecheck e build globais estão 100% limpos agora**, confirmando que a causa raiz identificada pelo Codex era exatamente essa, e não algo no próprio ECO-03B1.

## 87-89. Não alterar INTEL-02C / não integrar CAGED à Inteligência / não ECO-03B2

Confirmado por `git status`: nenhum arquivo de `lib/territorios/intelligence/` foi alterado. Não criei `LABOR_MARKET family`, `DerivedIndicators` nem `Signals` para CAGED. Não implementei estoque, variação relativa, 5 setores, salário, CBO ou perfil. Esta auditoria é estritamente leitura + validação + 3 execuções controladas do pipeline já existente (nenhuma linha de produto foi escrita ou alterada).

## 90. Divergências vs. relatório Codex

| Item | Codex disse | Auditoria encontrou | Materialidade |
|---|---|---|---|
| Códigos não resolvidos | "1.676 eventos... com códigos municipais sem correspondência" (texto correto, mas não explicitava a contagem de códigos distintos) | 1.676 **eventos**, mas **1 único código distinto** (`999999`), padrão idêntico em MOV/FOR/EXC/histórico | Não muda nenhuma conclusão de correção — melhora a interpretação do risco (menor dispersão do que o número isolado sugere) |
| Risco de concorrência em `territory_indicators` | Não quantificado como severidade específica | Índice único real no banco rebaixa o risco de "possível duplicação de dado" para "falha segura em corrida" | Rebaixa severidade, não eleva |
| `territories` total | 853 | 854 (no momento desta auditoria) | Não material — 1 linha adicionada por outro workstream entre as duas execuções |
| Typecheck/build globais | FAIL externo ao gate | PASS (0 erros) | Confirma que a causa raiz (INTEL-02C em andamento) já foi resolvida por gate posterior |
| Todos os demais números (reconciliação nacional/municipal/histórica, FOR/EXC, idempotência, contagem de testes CAGED, RSS/streaming, persistência) | — | **Confirmados de forma independente, sem divergência material** | — |

Nenhuma divergência encontrada exige correção de dado, semântica ou arquitetura do ECO-03B1.

## 91-94. Achados por severidade

**BLOCKER: 0**
**HIGH: 0**

**MODERATE: 3**
- M1 — Extração 7z depende do comportamento padrão do libarchive/`bsdtar` para proteção contra path traversal, sem validação própria explícita no código (seção 14).
- M2 — Ausência de lock/mutex explícito entre execuções concorrentes do pipeline; mitigado por um índice único real no banco (que evita duplicação de dado), mas não evita trabalho duplicado nem falha graciosa (seção 72-73).
- M3 — `territory_collection_runs` usa território-âncora para um batch nacional; correto e documentado, mas gera risco de leitura enganosa em um futuro dashboard que não filtre por `metadata.scope` (seção 56-58).

**LOW: 3**
- L1 — Código `999999` (sentinela de município não identificado) não é rotulado explicitamente; tratado de forma indistinguível de um código genuinamente desconhecido (seção 28.2).
- L2 — `runCagedPipeline` descarta o motivo específico de falha de uma fonte quando `status=partial` (array `failures` não retornado) (seção 54-55).
- L3 — Ausência de teste unitário dedicado para `CagedArtifactStorage.commitDownloaded`/`readCurrentVintage` (imutabilidade/cache) isoladamente — comportamento hoje só coberto pela integração real e por revisão de código (seção 25).

## 95-96. Riscos e débitos técnicos (consolidado)

Os mesmos já listados pelo Codex nas seções 18-20 do relatório dele — reconfirmados como reais e ainda não resolvidos: storage efêmero, catálogo territorial parcial, ausência de contrato de run nacional, dependência de `curl`/`bsdtar` do host, política de códigos históricos/especiais não formalizada (embora, como mostrado na seção 28.2, o caso real observado seja mais simples do que o número "1.676" sugeria). Nenhum débito novo de peso foi encontrado além dos 3 MODERATE listados na seção 91-94.

## 97-98. Correções obrigatórias antes de ECO-03B2 / antes do scheduler

**Antes de ECO-03B2** (herdado do Codex, confirmado): homologar storage durável; decidir Parquet/DuckDB ou manter streaming puro (avaliação, não obrigatoriedade, dado o volume atual); completar/expandir `territories`; formalizar contrato de run nacional (ou manter território-âncora explicitamente documentado); carregar MOV histórico antes de aplicar FOR/EXC como current absoluto (já impedido por construção, mas precisa de dado histórico real para ser útil); resolver política para códigos especiais (agora simplificada: só há um código real observado, `999999`).

**Antes do scheduler** (adicional desta auditoria): implementar lock/mutex entre execuções concorrentes (M2); mover raw storage para Supabase Storage ou equivalente durável (herdado); adicionar validação própria de path traversal na extração como defesa em profundidade (M1); expor o motivo de falha por fonte no resultado do pipeline (L2).

## 99-100. Recomendação ECO-03B2 / futura INTEL-CAGED

**ECO-03B2:** viável, com as correções da seção 97 como pré-condição, não como bloqueio arquitetural — o núcleo (MOV/FOR/EXC/hash/vintage/agregação/persistência) está correto e não precisa ser redesenhado para suportar estoque, 5 setores, salário ou CBO; são extensões aditivas sobre uma base sólida.

**INTEL-CAGED futura:** os agregados municipais (admissões/desligamentos/saldo mensal, com lineage completo até o arquivo bruto) já têm qualidade suficiente para alimentar um futuro motor de inteligência determinístico no mesmo padrão do INTEL-02/02B/02C — mas apenas depois que o catálogo territorial nacional permitir cobertura além dos 3 pilotos, e com atenção obrigatória à sazonalidade (já documentada no discovery ECO-03A) antes de qualquer threshold de `CHANGE`/`TREND`. Não implementado, apenas avaliado, conforme instrução do gate.

## 101. Decisão final

Ver tabela de gate final abaixo.

---

## Tabela de achados

| ID | Severidade | Área | Claim Codex | Resultado auditoria | Evidência | Impacto | Ação necessária | Bloqueia ECO-03B2? | Bloqueia produção? |
|---|---|---|---|---|---|---|---|---|---|
| M1 | MODERATE | Extração 7z | "Reutilizada e validada" | Confirmado seguro (libarchive 3.7.4, proteção padrão), sem validação própria de defesa em profundidade | `bsdtar --version`; leitura de `source.ts` | Baixo hoje (fonte oficial); relevante se a fonte mudar | Adicionar validação explícita de path antes do scheduler | Não | Sim |
| M2 | MODERATE | Concorrência de persistência | Não quantificado | Índice único real protege `territory_indicators`; corrida gera falha seguraz, não duplicação; sem lock explícito | `pg_indexes` real (Supabase) | Trabalho duplicado em corrida, não corrupção | Implementar advisory lock antes do scheduler | Não | Sim |
| M3 | MODERATE | Território-âncora | "Adaptação controlada" | Confirmado; risco de leitura enganosa em dashboard futuro não filtrado | `territory_collection_runs` real (3 execuções) | UX/observabilidade, não dado | Definir contrato de run nacional antes de expor em UI | Não | Sim |
| L1 | LOW | Código não resolvido | "1.676 códigos" | 1.676 eventos, 1 código distinto (`999999`), uniforme em 4 arquivos reais | `awk`/Python sobre MOV/FOR/EXC/histórico reais | Nenhum — clarifica risco menor do que sugerido | Rotular `999999` explicitamente (melhoria) | Não | Não |
| L2 | LOW | Observabilidade de falha parcial | "Retorna partial" | Confirmado; motivo específico da falha é descartado | Leitura de `pipeline.ts` | Diagnóstico mais lento em falha parcial | Retornar `failures` no resultado | Não | Não |
| L3 | LOW | Cobertura de teste | "18 testes PASS" | Confirmado; gap específico em teste unitário de imutabilidade de `CagedArtifactStorage` | Leitura de `artifact-storage.test.ts` | Nenhum hoje (coberto pela integração real) | Adicionar teste unitário dedicado | Não | Não |

---

## Declaração de segurança

| Item | Resultado |
|---|---|
| INTEL-02C ALTERADO | NÃO |
| FRONTEND ALTERADO | NÃO |
| ECO-03B2 IMPLEMENTADO | NÃO |
| CAGED INTELLIGENCE IMPLEMENTADA | NÃO |
| ESTOQUE IMPLEMENTADO | NÃO |
| SETORES IMPLEMENTADOS | NÃO |
| SALÁRIO IMPLEMENTADO | NÃO |
| CBO/PERFIL IMPLEMENTADO | NÃO |
| N8N ALTERADO | NÃO |
| ORQUESTRADOR ALTERADO | NÃO |
| SCHEDULER ATIVADO | NÃO |
| DEPLOY | NÃO |
| MICRODADOS INSERIDOS NO POSTGRES | NÃO |

## Gate final

| Gate | Resultado |
|---|---|
| FONTE OFICIAL | PASS |
| MOV | PASS |
| FOR | PASS |
| EXC | PASS |
| EXC INVERSION | PASS |
| DECLARATION MONTH | PASS |
| REFERENCE MONTH | PASS |
| REVISÕES HISTÓRICAS | PASS |
| RAW HASH | PASS |
| VINTAGE | PASS |
| RAW IMUTÁVEL | PASS |
| LAYOUT | PASS |
| UTF-8 | PASS |
| STREAMING | PASS |
| MEMÓRIA | PASS |
| MUNICÍPIO CAGED | PASS |
| CAGED→IBGE | PASS |
| CÓDIGOS NÃO RESOLVIDOS | ACEITÁVEL (1 código sentinela, 999999 — ver seção 28.2) |
| RECONCILIAÇÃO NACIONAL | PASS |
| CONTAGEM | PASS |
| BETIM | PASS |
| BELO HORIZONTE | PASS |
| 202001 | PASS |
| AGREGAÇÃO MUNICIPAL | PASS |
| BALANCE IDENTITY | PASS |
| DETERMINISMO | PASS |
| AGGREGATE HASH | PASS |
| CURRENT/VINTAGE | PASS |
| PERSISTÊNCIA | PASS |
| EVIDENCE | PASS |
| LINEAGE | PASS |
| IDEMPOTÊNCIA | PASS |
| REPROCESSAMENTO | PASS |
| PARTIAL | PASS |
| MICRODADOS FORA DO POSTGRES | PASS |
| DADOS PESSOAIS | PASS |
| COLLECTION RUN | RESSALVA (território-âncora — M3) |
| TERRITORY CATALOG | RESSALVA (854/~5.487) |
| DURABLE STORAGE | RESSALVA (filesystem efêmero) |
| HOST DEPENDENCIES | RESSALVA (curl/bsdtar do host) |
| CONCORRÊNCIA | RESSALVA (sem lock explícito — M2) |
| SCHEDULER READINESS | NOT_READY |
| INTEL-02C REGRESSION | PASS (101/101) |
| TESTES | PASS (18 CAGED + 1 integração real + 675 suíte territorial) |
| TYPECHECK | PASS (0 erros) |
| LINT | PASS (0 erros) |
| BUILD | PASS |
| BLOCKERS | 0 |
| HIGH | 0 |
| MODERATE | 3 |
| LOW | 3 |
| **ECO-03B1** | **HOMOLOGADO_COM_RESSALVAS** |
| **PRONTO PARA ECO-03B2** | **COM_RESSALVAS** |
| **PRONTO PARA SCHEDULER** | **NÃO** |
| **PRONTO PARA PRODUÇÃO** | **NÃO** |
| **DADOS CAGED PRONTOS PARA FUTURA INTELIGÊNCIA** | **COM_RESSALVAS** (aguardar catálogo territorial nacional) |

---

## Encerramento

ECO-03B1 auditado de forma independente e homologado com ressalvas. Todas as afirmações centrais sobre semântica MOV/FOR/EXC, reconciliação nacional e municipal (atual e histórica), idempotência, lineage e ausência de microdados no Postgres foram refeitas do zero — via `awk`/Python sobre os arquivos oficiais brutos, consulta direta ao schema e dados reais do Supabase, e uma 3ª execução independente do pipeline TypeScript completo — e bateram exatamente com o relatório do Codex. As ressalvas identificadas são de infraestrutura/operação (storage efêmero, catálogo territorial parcial, ausência de lock, território-âncora), nenhuma delas afeta a correção do dado já persistido.

Conforme instruído: **PARE.** Não iniciei ECO-03B2. Não integrei CAGED à Inteligência. Não alterei INTEL-02C. Não ativei scheduler. Não integrei ao Orquestrador. Não fiz deploy. Aguardando decisão antes do próximo gate.

---

### Nota fora de escopo (segurança geral, não relacionada a ECO-03B1)

Durante a consulta ao schema do Supabase para esta auditoria, a ferramenta de banco reportou um advisory de segurança pré-existente, não relacionado ao CAGED: **7 tabelas têm Row Level Security (RLS) desabilitado** (`targets`, `tweet_replies`, `investigations`, `investigation_sources`, `investigation_entities`, `investigation_timeline`, `investigation_queries`) — expostas por padrão às roles `anon`/`authenticated` do Supabase. Nenhuma tabela usada pelo ECO-03B1 (`territories`, `territory_indicators`, `territory_evidence`, `territory_collection_runs`) está nessa lista — todas já têm RLS habilitado. Reporto isso porque a ferramenta exige que eu surface o achado, não como parte do escopo desta auditoria; nenhuma alteração foi feita.
