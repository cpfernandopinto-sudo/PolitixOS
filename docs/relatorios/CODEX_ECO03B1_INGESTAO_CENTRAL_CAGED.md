# POLITIXOS — TERRITÓRIOS — ECO-03B1

## Ingestão central Novo CAGED: MOV + FOR + EXC, vintage, hash, streaming e agregados municipais

**Data da execução:** 16/08/2026  
**Status:** concluído com ressalvas de infraestrutura  
**Escopo persistido:** Contagem, Betim e Belo Horizonte — competência 202606  
**Fonte:** MTE/PDET/Novo CAGED, FTP oficial  
**Deploy:** não realizado

## 1. Resumo executivo

O microbloco ECO-03B1 implementou e homologou um pipeline batch central para os microdados nacionais do Novo CAGED. O motor baixa artefatos oficiais de forma atômica, calcula SHA-256, preserva vintages sem sobrescrever o arquivo anterior, extrai 7z com validação, interpreta TXT UTF-8 em streaming, valida o layout real e converte MOV, FOR e EXC para um modelo único de efeito de evento.

O processamento real de 202606 reconciliou exatamente o total nacional oficial: **2.220.131 admissões, 2.074.970 desligamentos e saldo +145.161**. Contagem, Betim e Belo Horizonte também reconciliaram exatamente. O MOV de 202001 confirmou compatibilidade histórica nos três pilotos.

O teste revelou 1.676 eventos MOV de 202606 com códigos municipais sem correspondência no dicionário IBGE vigente. Esses eventos entram corretamente na reconciliação nacional, mas são explicitamente excluídos da camada municipal. Nenhum código territorial é inventado.

Foram persistidos apenas nove indicadores current no Supabase — três indicadores para cada um dos três municípios piloto — e três evidências municipais agregadas. A segunda execução produziu zero inserts, zero updates, nove unchanged e nenhuma duplicação.

Não foi feita persistência nacional porque `territories` possui somente 853 dos 5.487 municípios resolvidos presentes no MOV. Popular o catálogo nacional é pré-condição do próximo gate, não uma alteração segura para ser feita silenciosamente aqui.

## 2. Auditoria da infraestrutura existente

| Infraestrutura | Já existe? | Usada onde | Capacidade | Limitação | Decisão ECO-03B1 |
|---|---:|---|---|---|---|
| Supabase/Postgres | Sim | `territories`, `territory_indicators`, `territory_evidence`, `territory_collection_runs` | Agregados municipais, evidências e runs | Não deve receber milhões de microeventos | Reutilizado somente para curated operacional |
| Object storage | Não identificado | — | — | Sem bucket/adapter homologado no repositório | Não criar integração paralela neste gate |
| Filesystem versionado por hash | Não existia | — | Adequado ao piloto local | Não é storage durável de produção | Implementado como adapter configurável via `CAGED_DATA_ROOT` |
| Data lake / warehouse | Não identificado | — | — | Sem BigQuery/GCS/S3/DuckDB | Não criado |
| Parquet | Não | — | — | Sem biblioteca/engine instalado | Adiado; curated intermediário em NDJSON |
| Extração 7z | Sim, sistema | `/usr/bin/bsdtar` | MOV 427 MiB extraído com sucesso | Dependência do runtime host | Reutilizada e validada |
| Parser CSV | Sim | `csv-parse` 7.0.2 | Parser streaming | — | Reutilizado |
| Scheduler | Não homologado para CAGED | — | — | Fora do escopo | Não ativado |
| n8n/Orquestrador | Existe em trilha separada | outros motores | Orquestração futura | Não homologado para CAGED | Não alterado |

Tentou-se consultar o changelog e a documentação atual do Supabase antes da implementação. O acesso direto pelo sandbox falhou por DNS; nenhuma API nova ou comportamento não verificado do Supabase foi introduzido. A persistência segue os padrões já utilizados no projeto e foi comprovada com consultas reais pós-gravação.

## 3. Decisão de arquitetura

```text
FTP oficial MTE
  → download temporário + retry/timeout
  → SHA-256 + tamanho
  → commit atômico no artifact store por hash
  → extração 7z em diretório temporário
  → csv-parse UTF-8 streaming
  → efeito semântico MOV/FOR/EXC
  → agregação municipal em memória limitada pela cardinalidade municipal/mês
  → curated NDJSON para reprocessamento/auditoria
  → territory_indicators + territory_evidence + territory_collection_runs
```

Camadas:

- **RAW:** `.7z` oficial imutável, versionado por SHA-256;
- **NORMALIZED/INTERMEDIATE:** fluxo de eventos normalizados, sem materialização de microeventos no Postgres;
- **CURATED:** agregado `município × reference_month`, materializado em NDJSON e, no piloto, no Supabase.

Parquet/DuckDB não foi instalado porque não havia engine nem infraestrutura existente. O contrato foi isolado de forma que um adapter de object storage/Parquet possa substituir o filesystem sem alterar parser, semântica ou persistência operacional. Essa é uma ressalva para operação agendada, não um impedimento ao motor homologado.

## 4. Fonte e artefatos oficiais

| Tipo | Competência declaração | SHA-256 | Tamanho |
|---|---:|---|---:|
| MOV | 202606 | `3e2f9294cad913f8398f6a07033f6a6fedd5150f3b2d8beb10243e3d70c2f690` | 53.059.747 B |
| FOR | 202606 | `1dfa84365addc09bfd65e89eb49bff48d4a4e2ed2ebe8dfccabe7cd57e195eab` | 801.670 B |
| EXC | 202606 | `f5e761a370845a67b9db865c6b0019029a10d901512eab0c87831be19cd0f419` | 121.056 B |
| MOV | 202001 | `93e7d514e9a1e7c05b0af6a209080a2a0ca3f5d54d939f248e8838a838cb1d7a` | 34.261.878 B |

Estrutura real:

```text
<CAGED_DATA_ROOT>/caged/raw/2026/202606/CAGEDMOV202606.<sha256>.7z
<CAGED_DATA_ROOT>/caged/raw/2026/202606/MOV.manifest.json
<CAGED_DATA_ROOT>/caged/curated/202606/municipal-current.ndjson
<CAGED_DATA_ROOT>/caged/curated/202606/revision-deltas.ndjson
<CAGED_DATA_ROOT>/dictionaries/ibge-municipalities.json
```

Mesmo URL com novo hash gera novo arquivo. Mesmo URL/hash íntegro gera cache hit/noop. O manifesto só é publicado depois do download completo, tamanho maior que zero e hash calculado.

## 5. Layout e dicionário territorial

MOV/FOR 202606 apresentaram 28 campos. EXC apresentou 30, incluindo `competênciaexc` e `indicadordeexclusão`. Campos mínimos validados antes da primeira linha:

- `competênciamov`;
- `município`;
- `saldomovimentação`.

Hashes de layout:

- MOV/FOR: `a455d4948bf820b98093ab4f0eef5b61c2d731a407c9f7cd7c20b17ead4a7503`;
- EXC: `b4f41aa607a17cad821a5ebd02d8fdea1abbd9ff916c19c38f5280cb05155c15`.

O resolver municipal é construído a partir da API oficial de localidades do IBGE, cacheado com fonte, data e SHA-256. A correspondência usa o prefixo CAGED de seis dígitos **somente depois** de validar unicidade contra o dicionário oficial. Testes:

- `311860 → 3118601` Contagem: PASS;
- `310670 → 3106705` Betim: PASS;
- `310620 → 3106200` Belo Horizonte: PASS.

## 6. Semântica de eventos

Função pura implementada:

```text
resolveCagedEventEffect(record, sourceKind)
→ referenceMonth, cagedMunicipality,
  admissionsDelta, dismissalsDelta, balanceDelta
```

Regras:

- MOV/FOR com `saldomovimentação=1`: admissão `+1`, saldo `+1`;
- MOV/FOR com `saldomovimentação=-1`: desligamento `+1`, saldo `-1`;
- EXC de admissão: admissão `-1`, saldo `-1`;
- EXC de desligamento: desligamento `-1`, saldo `+1`;
- zero: nenhum delta;
- toda linha e todo agregado exigem `saldo = admissões - desligamentos`.

`declaration_month` identifica a publicação/vintage. `competênciamov` identifica `reference_month`. FOR e EXC de 202606 não são aplicados artificialmente em junho/2026.

## 7. Resultado MOV 202606

| Métrica | Resultado |
|---|---:|
| Linhas lidas | 4.295.101 |
| Linhas municipalmente aceitas | 4.293.425 |
| Códigos sem correspondência IBGE | 1.676 |
| Municípios resolvidos tocados | 5.487 |
| Parse | 36,54 s |
| Pico RSS observado | 125.075.456 B (~119,3 MiB) |
| Admissões nacionais | 2.220.131 |
| Desligamentos nacionais | 2.074.970 |
| Saldo nacional | +145.161 |

Reconciliou exatamente com o sumário oficial consultado no discovery ECO-03A. A soma apenas dos municípios resolvidos foi 2.218.972 / 2.074.453 / +144.519; a diferença corresponde aos 1.676 eventos sem correspondência vigente e permanece explicitamente auditada, não descartada da reconciliação nacional.

## 8. Municípios piloto — 202606

| Município | Admissões | Desligamentos | Saldo | Gate |
|---|---:|---:|---:|---:|
| Contagem | 12.237 | 11.323 | +914 | PASS |
| Betim | 7.291 | 5.935 | +1.356 | PASS |
| Belo Horizonte | 47.792 | 46.646 | +1.146 | PASS |

## 9. Compatibilidade histórica — MOV 202001

| Métrica | Resultado |
|---|---:|
| Linhas lidas | 2.677.294 |
| Linhas aceitas municipalmente | 2.677.285 |
| Códigos sem correspondência | 9 |
| Parse | 24,65 s |
| Pico RSS | 95.502.336 B (~91,1 MiB) |

| Município | Admissões | Desligamentos | Saldo | Gate |
|---|---:|---:|---:|---:|
| Contagem | 6.567 | 6.852 | -285 | PASS |
| Betim | 3.161 | 2.685 | +476 | PASS |
| Belo Horizonte | 31.772 | 32.571 | -799 | PASS |

202001 foi somente validado. Não foi persistido.

## 10. FOR e EXC 202606

| Fonte | Linhas | Aceitas | Sem município vigente | Meses afetados | Municípios resolvidos | Delta adm. | Delta deslig. | Delta saldo |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| FOR | 65.573 | 65.542 | 31 | 12 | 3.180 | +36.376 | +29.197 | +7.179 |
| EXC | 8.719 | 8.712 | 7 | 77 | 1.160 | -3.977 | -4.742 | +765 |
| Combinado | 74.292 | 74.254 | 38 | 77 | 3.278 | +32.399 | +24.455 | +7.944 |

FOR tocou 202506–202605. EXC tocou 202001–202605. Os deltas foram materializados no curated intermediário para auditoria, mas **não** foram gravados como valores absolutos históricos porque o catálogo ainda não tem todas as bases MOV correspondentes. Aplicar deltas isolados como total current seria incorreto.

## 11. Persistência operacional piloto

Contrato reutilizado:

```text
categoria=economia
fonte=MTE
source_dataset=NOVO_CAGED
granularidade=municipal
indicadores:
  admissoes_emprego_formal
  desligamentos_emprego_formal
  saldo_emprego_formal
```

Período 202606:

- `periodo_inicio=2026-06-01`;
- `periodo_fim=2026-06-30`.

Resultado da primeira gravação efetiva: nove inserts e três evidências agregadas. Nas repetições finais, as nove linhas já existiam e foram classificadas como unchanged. A evidência municipal contém aggregate hash, método, competência, código CAGED/IBGE, contagens e as três vintages contribuintes.

O run central foi registrado em `territory_collection_runs` com Contagem como território-âncora e metadata `scope=national_central_batch`. Essa é uma adaptação ao schema existente, cuja FK exige `territory_id`; uma futura tabela de runs globais só deve ser criada após decisão arquitetural explícita.

## 12. Idempotência e revisão

| Verificação | Resultado |
|---|---:|
| Cache hits raw na segunda execução 202606 | 3/3 |
| Mesmo raw → mesmo curated | PASS |
| Mesmo agregado → mesmo aggregate hash | PASS |
| Segunda persistência | 0 insert / 0 update / 9 unchanged |
| Linhas antes/depois da segunda persistência | 9 / 9 |
| Duplicações adicionadas | 0 |
| Um byte diferente → SHA diferente | PASS unitário |
| Ordem de vintages altera hash | NÃO — PASS |
| Nova vintage | novo arquivo por hash + impacted sets recalculados |

## 13. Performance e memória

Execução final com raw em cache:

- extração MOV/FOR/EXC 202606: 2,30 s;
- parsing total 202606: 37,60 s;
- pipeline total 202606: 40,10 s;
- MOV 202001: 24,65 s de parse, 26,64 s total;
- pico RSS reportado: ~119,3 MiB para TXT MOV com ~427 MiB;
- throughput MOV 202606: aproximadamente 117 mil linhas/s no parse final;
- RSS não cresceu proporcionalmente às 4,3 milhões de linhas.

O armazenamento em memória contém somente agregados `município × mês`, sets de impacto e metadados. Nenhum array de microeventos é acumulado.

## 14. Partial, erros e observabilidade

Se uma fonte falhar, o pipeline retorna `partial` quando ao menos outra foi processada; não existe chamada automática de persistência dentro do pipeline. Assim, o chamador não pode confundir um curated parcial com publicação completa. O audit só persiste depois de `status=completed`.

Códigos implementados:

- `CAGED_SOURCE_NOT_FOUND`;
- `CAGED_DOWNLOAD_FAILED`;
- `CAGED_EXTRACT_FAILED`;
- `CAGED_LAYOUT_MISMATCH`;
- `CAGED_PARSE_ERROR`;
- `CAGED_INVALID_MUNICIPALITY`;
- `CAGED_RECONCILIATION_FAILED`;
- `CAGED_PERSISTENCE_FAILED`.

Não há log por linha. Runs guardam competências, fontes, hashes, linhas, descartes, municípios/meses tocados, persistência e timings.

## 15. Testes e comandos exatos

```bash
npx vitest run lib/territorios/caged --exclude '**/.claude/worktrees/**'
CAGED_RUN_REAL_AUDIT=1 npx vitest run scripts/audit-caged-eco03b1.integration.test.ts --exclude '**/.claude/worktrees/**'
npx tsc --noEmit
npx eslint lib/territorios/caged scripts/audit-caged-eco03b1.ts scripts/audit-caged-eco03b1.integration.test.ts --no-warn-ignored
npm run build
```

Resultados até a homologação real:

- unitários CAGED: 4 arquivos, 18 testes, PASS;
- integração real: 1 arquivo, 1 teste, PASS, 134,53 s;
- suíte global final: 75 arquivos aprovados, 1 ignorado; 643 testes aprovados, 1 ignorado;
- typecheck global inicial: bloqueado por erros preexistentes em `scripts/calibracao-intel02c-multimunicipal.ts`, fora do ECO-03B1;
- lint ECO-03B1: PASS após saneamento final;
- build: compilação de produção concluída em 12,9 s; etapa TypeScript bloqueada exclusivamente pelos mesmos erros preexistentes de `scripts/calibracao-intel02c-multimunicipal.ts`.

Fixtures cobrem admissão, desligamento, zero, município inválido, competência inválida, FOR retroativo, EXC de admissão, EXC de desligamento, revisão, layout incompleto, UTF-8, hash canônico e determinismo.

## 16. Dependências

Nenhuma dependência nova foi instalada.

- `csv-parse` já existia;
- `bsdtar` é fornecido pelo macOS/runtime atual;
- `curl` é executado como processo externo auditável;
- Node real: `v24.9.0`;
- não houve migração ampla de runtime.

## 17. Arquivos criados

- `lib/territorios/caged/types.ts`;
- `lib/territorios/caged/core.ts`;
- `lib/territorios/caged/municipality-resolver.ts`;
- `lib/territorios/caged/artifact-storage.ts`;
- `lib/territorios/caged/source.ts`;
- `lib/territorios/caged/parser.ts`;
- `lib/territorios/caged/persistence.ts`;
- `lib/territorios/caged/pipeline.ts`;
- `lib/territorios/caged/core.test.ts`;
- `lib/territorios/caged/municipality-resolver.test.ts`;
- `lib/territorios/caged/parser.test.ts`;
- `scripts/audit-caged-eco03b1.ts`;
- `scripts/audit-caged-eco03b1.integration.test.ts`;
- `docs/relatorios/CODEX_ECO03B1_INGESTAO_CENTRAL_CAGED.md`.

Nenhum arquivo de frontend, inteligência, n8n ou Orquestrador foi alterado pelo ECO-03B1.

### Estatística do escopo ECO-03B1

Os arquivos permanecem não rastreados no worktree e, por isso, `git diff --stat` não os contabiliza até staging. Inventário direto: **15 arquivos novos e 1.065 linhas** (558 no motor/testes, 117 nos scripts e 390 neste relatório). O `git diff --stat` global continua refletindo apenas alterações rastreadas paralelas preexistentes e não é uma medida válida deste microbloco.

## 18. Conflitos e riscos

- Worktree já estava suja com alterações paralelas de frontend e inteligência; não foram tocadas.
- `.claude/worktrees/*` já apareciam como removidos; não foram alterados.
- Raw está em `/private/tmp/politixos-caged-eco03b1`, adequado à homologação local, não a scheduler de produção.
- O FTP oficial é frágil e sem HTTPS; SHA-256 é essencial para cadeia de custódia.
- `bsdtar` precisa existir no runtime definitivo.
- O catálogo territorial parcial impede persistência nacional completa.
- Vintages FOR/EXC antigas exigem a base MOV histórica antes de publicar absolutos revisados.
- A API IBGE vigente não resolve alguns códigos históricos/especiais; eles permanecem no nacional e fora do municipal.
- `territory_collection_runs` é territorial, enquanto o batch é nacional; território-âncora é solução controlada, não desenho final ideal.

## 19. Débitos técnicos e recomendação ECO-03B2

Antes de ECO-03B2:

1. homologar object storage durável e política de retenção;
2. decidir Parquet/DuckDB ou warehouse com benchmark e licença;
3. completar/validar o catálogo nacional `territories`;
4. criar contrato explícito de run/vintage nacional ou homologar o território-âncora;
5. carregar MOV histórico necessário antes de aplicar FOR/EXC como current absoluto;
6. resolver a política oficial para códigos territoriais históricos/especiais;
7. somente então avaliar estoque, cinco setores e referência RAIS.

## 20. Recomendação scheduler e Orquestrador

- **Scheduler:** não pronto. Requer storage durável, catálogo nacional e monitoramento do runtime `curl/bsdtar`.
- **Opções futuras:** cron mensal, GitHub Action, Cloud Scheduler/job dedicado ou schedule n8n. Nenhuma foi ativada.
- **Orquestrador:** não pronto e não alterado. O batch central não deve ser disparado por abertura de uma página municipal.

## 21. Declaração de segurança

| Item | Resultado |
|---|---:|
| MICRODADOS BRUTOS NO POSTGRES | NÃO |
| DADOS PESSOAIS PERSISTIDOS | NÃO |
| ESTOQUE IMPLEMENTADO | NÃO |
| SALÁRIO OFICIAL IMPLEMENTADO | NÃO |
| SETORES PERSISTIDOS | NÃO |
| CBO IMPLEMENTADO | NÃO |
| PERFIS IMPLEMENTADOS | NÃO |
| FRONTEND ALTERADO | NÃO |
| INTEL ALTERADO | NÃO |
| N8N ALTERADO | NÃO |
| ORQUESTRADOR ALTERADO | NÃO |
| SCHEDULER ATIVADO | NÃO |
| HISTÓRICO NACIONAL COMPLETO CARREGADO | NÃO |

Exceção permitida: agregados municipais atuais de 202606 dos três pilotos foram persistidos.

## 22. Gate final

| Gate | Resultado |
|---|---:|
| FONTE | PASS |
| INFRAESTRUTURA AUDITADA | PASS |
| RAW VINTAGE | PASS local / ressalva produção |
| SHA-256 | PASS |
| 7Z | PASS |
| STREAMING | PASS |
| LAYOUT | PASS |
| UTF-8 | PASS |
| MUNICÍPIO | PASS com 1.676 não resolvidos auditados |
| MOV | PASS |
| FOR | PASS |
| EXC | PASS |
| EXC INVERSION | PASS |
| AGREGRAÇÃO MUNICIPAL | PASS |
| ADMISSÕES | PASS |
| DESLIGAMENTOS | PASS |
| SALDO | PASS |
| RECONCILIAÇÃO NACIONAL | PASS |
| CONTAGEM | PASS |
| BETIM | PASS |
| BELO HORIZONTE | PASS |
| IDEMPOTÊNCIA | PASS |
| REPROCESSAMENTO | PASS algorítmico |
| EVIDENCE | PASS piloto |
| PERSISTÊNCIA OPERACIONAL | PASS piloto |
| MICRODADO FORA DO POSTGRES | PASS |
| PERFORMANCE | PASS |
| TESTES | PASS |
| TYPECHECK | FAIL externo ao gate |
| LINT | PASS |
| BUILD | FAIL externo ao gate após compilação PASS |
| PRONTO PARA ECO-03B2 | COM RESSALVAS |
| PRONTO PARA SCHEDULER | NÃO |
| PRONTO PARA ORQUESTRADOR | NÃO |

## 23. Encerramento

O ECO-03B1 está implementado, testado com arquivos nacionais reais e persistido somente no escopo autorizado. O motor não implementa estoque, salário, setores, CBO, perfis, frontend, inteligência ou orquestração. O próximo passo é auditoria independente deste relatório e do diff. Não iniciar ECO-03B2 automaticamente.
