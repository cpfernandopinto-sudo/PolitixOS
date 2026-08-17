# POLITIXOS — TERRITÓRIOS — CODEX ECO-03B1.5 HARDENING CAGED

**Data:** 2026-08-16  
**Decisão:** HOMOLOGADO  
**Scheduler:** NÃO ATIVADO  
**Deploy:** NÃO REALIZADO

## 1. Resumo executivo

ECO-03B1.5 concluído: storage durável selecionável, bucket privado, extração segura, lease distribuída, execução nacional, falha parcial observável, sentinela 999999 explícita, resolução territorial não destrutiva e preflight.

## 2. Escopo

Hardening do motor existente; sem ECO-03B2, inteligência, frontend, scheduler, n8n ou deploy.

## 3. Baseline Git

Branch main e worktree compartilhada auditados; alterações paralelas preexistentes foram preservadas.

## 4. Baseline funcional

4 arquivos/18 testes CAGED passaram antes das mudanças.

## 5. Auditoria Claude

Relatório independente lido integralmente; 0 blocker, 0 high e núcleo homologado.

## 6. Semântica preservada

MOV/FOR continuam +1; EXC continua -1; declaration/reference month inalterados.

## 7. Adapter de storage

Criada interface CagedArtifactStorageAdapter.

## 8. Modo local

CAGED_STORAGE_MODE=local preserva o comportamento anterior.

## 9. Modo Supabase

CAGED_STORAGE_MODE=supabase usa bucket privado e worker com service role.

## 10. Bucket

politixos-caged-raw criado privado, limite 1 GiB, MIME 7z/JSON.

## 11. Acesso

Nenhuma política anon/authenticated foi criada; service_role somente.

## 12. Endereçamento

Objetos: ano/mês/tipo/sha256.7z.

## 13. Imutabilidade

Upload do objeto raw usa upsert=false; hash igual não reenvia.

## 14. Hash

SHA-256 continua calculado no conteúdo oficial, nunca por ETag.

## 15. Manifesto

Manifesto current registra provider, bucket e object_key.

## 16. Atomicidade

Objeto é validado antes do manifesto ser atualizado.

## 17. Retenção

Nenhum purge automático foi criado.

## 18. Materialização

Objeto remoto é materializado em diretório temporário para bsdtar e removido no finally.

## 19. Lineage

sourceUrl, sha256 e methodVersion permanecem invariantes entre providers.

## 20. Aggregate hash

Não contém URI de storage; portanto não muda ao trocar provider.

## 21. Evidência

Novas evidências registram storage_provider, storage_bucket e object_key.

## 22. Legado

Evidências piloto existentes podem manter storage_path local.

## 23. Inventário 7z

bsdtar -tf é executado antes da extração.

## 24. Path traversal

Caminho absoluto, drive, ../, ponto e subdiretório são rejeitados.

## 25. Contrato do arquivo

Exatamente um TXT não vazio na raiz.

## 26. Testes de extração

Cobertos ../evil, absoluto, subdiretório, dois TXT, zero TXT, vazio e válido.

## 27. Execução parcial

CagedPipelineResult agora expõe failures[].

## 28. Estágios de falha

DISCOVERY, DOWNLOAD, HASH, STORAGE, EXTRACTION, LAYOUT, PARSE, RECONCILIATION e PERSISTENCE formalizados.

## 29. Sentinela 999999

Participa dos totais nacionais e não gera agregado municipal.

## 30. Desconhecidos

unresolvedMunicipalityEvents e distinctUnresolvedMunicipalityCodes separados.

## 31. Contadores

reservedMunicipalityEvents exposto por fonte.

## 32. Catálogo territorial

854 territórios existentes; não houve seed silencioso.

## 33. Resolução territorial

Persistência usa apenas IBGEs existentes e retorna absentIbgeCodes.

## 34. Ausência no catálogo

Não é mais classificada como erro da fonte.

## 35. Run nacional

Criada source_collection_runs sem territory_id.

## 36. Âncora Contagem

Novas execuções não usam território-âncora; legado permanece intacto.

## 37. Metadados de run

Suportam source, scope, mês, status, contagens, duração, falhas e persistência.

## 38. Lease

Criada source_collection_leases por source/scope/declaration_month.

## 39. TTL

Lease expira e pode ser recuperada após expires_at.

## 40. Concorrência mesma competência

Primeira aquisição true; segunda false.

## 41. Concorrência competências distintas

Competência diferente adquire em paralelo.

## 42. Pool de conexão

Lease persistente foi escolhida em vez de advisory lock de sessão.

## 43. Código de bloqueio

Aplicação converte lease negada em ALREADY_RUNNING.

## 44. Preflight Node

Versão do Node reportada.

## 45. Preflight host

curl e bsdtar obrigatórios e verificados.

## 46. Preflight storage

Modo inválido ou Supabase sem credenciais falha antes da carga.

## 47. Preflight disco

Diretório temporário recebe probe de escrita.

## 48. Runtime avaliado

Vercel Functions permanece inadequado para 427 MiB TXT e processos externos.

## 49. Runtime recomendado

Cloud Run Job como opção principal; GitHub Actions como alternativa simples. Nenhum scheduler ativado.

## 50. Supabase Storage integration

Objeto JSON pequeno: upload, download e cleanup passaram.

## 51. Storage test cleanup

Prefixo test/ removido ao final; nenhum objeto de teste retido.

## 52. Artifact tests

Commit, read, cache, mesma vintage, corrupção e manifesto divergente cobertos.

## 53. Regressão 202606

Integração real passou em 116,74 s usando artefatos oficiais.

## 54. Reconciliação nacional

2.220.131 admissões; 2.074.970 desligamentos; saldo +145.161, preservados.

## 55. Pilotos

Contagem, Betim e Belo Horizonte preservados; 9 indicadores sem regressão.

## 56. Histórico 202001

Regressão histórica permaneceu verde.

## 57. Idempotência

Reprocessamento não duplicou indicadores.

## 58. Teste CAGED final

6 arquivos, 31 testes, todos passaram.

## 59. Suíte territorial

78 arquivos, 688 testes, todos passaram.

## 60. Typecheck

0 erros.

## 61. Lint

0 erros/warnings no escopo CAGED e scripts.

## 62. Build

Next.js 16.2.6 build completo passou.

## 63. Migração

caged_eco03b15_hardening aplicada com sucesso no projeto hhhwuajptkyposarfbzn.

## 64. Advisors pós-DDL

Novas tabelas têm RLS sem policy intencionalmente e grants apenas para service_role.

## 65. Riscos externos

Persistem 7 tabelas antigas com RLS desabilitado e views security-definer fora do escopo CAGED.

## 66. Scheduler

Não ativado.

## 67. Deploy

Não realizado.

## 68. Segurança

Frontend, INTEL-02C, n8n, orquestrador, estoque, setores, salários e CBO não foram alterados.

## 69. Decisão final

ECO-03B1.5 HOMOLOGADO. Infra pronta para worker controlado; scheduler continua NOT_READY até decisão operacional explícita.

## Evidências de verificação

| Gate | Resultado |
|---|---|
| Storage privado | PASS |
| Round-trip Storage | PASS |
| Lock mesma competência | PASS (true/false) |
| Lock competências diferentes | PASS (true/true) |
| Extração segura | PASS |
| 999999 reservado | PASS |
| Falha parcial observável | PASS |
| Run nacional sem âncora | PASS |
| Resolução territorial explícita | PASS |
| Integração real | PASS |
| Testes CAGED | 31/31 PASS |
| Suíte territorial | 688/688 PASS |
| Typecheck/Lint/Build | PASS |

## Arquivos principais

- `lib/territorios/caged/artifact-storage.ts`
- `lib/territorios/caged/source.ts`
- `lib/territorios/caged/parser.ts`
- `lib/territorios/caged/pipeline.ts`
- `lib/territorios/caged/persistence.ts`
- `lib/territorios/caged/preflight.ts`
- `supabase_migration_caged_eco03b15_hardening.sql`

## Declaração de segurança

INTEL-02C: NÃO ALTERADO. FRONTEND: NÃO ALTERADO. ECO-03B2: NÃO IMPLEMENTADO. CAGED INTELLIGENCE: NÃO IMPLEMENTADA. ESTOQUE/SETORES/SALÁRIO/CBO: NÃO IMPLEMENTADOS. N8N/ORQUESTRADOR: NÃO ALTERADOS. SCHEDULER: NÃO ATIVADO. DEPLOY: NÃO REALIZADO. MICRODADOS NO POSTGRES: NÃO.

