# PolitixOS Territórios — Motor Saúde v1 / CNES
## Microbloco 2 — Correção de temporalidade, robustez e semântica

**Data:** 15/08/2026

**Branch:** `main`

**Escopo:** Motor Saúde interno e isolado; sem endpoint, Orquestrador, frontend, schema ou deploy.

## 1. Baseline da auditoria Claude

Foram usados `RELATORIO_MOTOR_SAUDE_DATASUS_MICROBLOCO1.md` e `docs/RELATORIO_AUDITORIA_MOTOR_SAUDE_CNES_2026_08_13.md`. Baseline: fonte real e 1.045 estabelecimentos confirmados, 32 indicadores, testes/build aprovados, porém status **CORREÇÃO NECESSÁRIA** por temporalidade crítica, semântica SUS, ausência de retry/testes e evidence não totalmente explicada.

## 2. Problemas recebidos

1. período agregado derivado da maior `data_atualizacao` individual; 2. nome SUS excessivamente amplo; 3. ausência de retry/backoff por página; 4. testes de falha ausentes; 5. apenas uma evidence sem explicação; 6. artefatos não rastreados.

## 3. Correções realizadas

Foi introduzida `referenceDate` explícita, com fallback para data UTC da coleta; freshness foi movida para metadata; indicador SUS renomeado; retry limitado foi implementado; testes passaram de 5 para 16; evidence foi investigada e sua contagem tornou-se precisa; dado antigo de Contagem foi reconciliado com preflight estrito; arquivos foram adicionados ao staging.

## 4. Temporalidade antes

`periodo_inicio/fim = max(rows.data_atualizacao)`. Uma alteração cadastral individual podia mudar a chave natural dos 32 agregados.

## 5. Temporalidade depois

`periodo_inicio/fim = referenceDate` controlada pelo PolitixOS. `referenceDate` pode ser fornecida no contrato; na ausência, usa `new Date().toISOString().slice(0,10)`. A data da fonte não define o snapshot.

## 6. Natural key antes

Território + categoria + indicador + fonte + dataset + período, sendo o período uma data volátil oriunda do CNES.

## 7. Natural key depois

A estrutura do índice não mudou, mas o período agora é o snapshot analítico controlado. Mesmo `referenceDate` reconcilia a mesma chave; nova `referenceDate` cria série temporal intencional.

## 8. Comportamento entre datas

D1 `2026-08-13` preserva 32 linhas. D2 `2026-08-15` criou outras 32 linhas válidas. Total: 64 linhas e zero duplicidades naturais. Repetir D2 não criou linhas.

## 9. `source_updated_at_min/max`

No snapshot real D2: mínimo `2025-09-03`, máximo `2026-08-13`. Ambos estão em metadata dos indicadores, evidence e run. `source_updated_at` da linha preserva o máximo observado apenas como provenance.

## 10. Semântica do indicador SUS

O campo bruto é `estabelecimento_faz_atendimento_ambulatorial_sus`; portanto mede somente atendimento ambulatorial SUS, não todo atendimento SUS.

## 11. Rename

Realizado: `estabelecimentos_atendimento_sus` → `estabelecimentos_atendimento_ambulatorial_sus`. Metodologia/definition: “Quantidade de estabelecimentos ativos do CNES com indicação de atendimento ambulatorial SUS.”

## 12. Dados existentes reconciliados

Preflight encontrou exatamente 32 linhas CNES de Contagem, 1 nome antigo e 0 nomes novos. Uma única linha (`valor=128`, período `2026-08-13`) foi renomeada. Depois: 32 totais, 0 antigas, 1 renomeada. Nenhum DELETE ou alteração de outro motor.

## 13. Retry/backoff

Máximo de 3 tentativas por página (duas repetições), delays padrão de 250 ms e 500 ms. A repetição ocorre na página falha, sem reiniciar a coleta. Limite global permanece 1.000 páginas.

## 14. Erros que disparam retry

HTTP `408`, `425`, `429`, `500`, `502`, `503`, `504`; falhas de rede `TypeError`; abort/timeout transitório. Não há retry para 400/404, município inválido, payload inválido, ausência de registros, referência inválida ou limite de paginação.

## 15. Testes novos

Foram adicionados testes de HTTP determinístico, página vazia, limite de paginação, retry recuperado, retry esgotado, município inválido, D1/D2, mudança de data da fonte no mesmo snapshot, natural key e force refresh. Saúde: 3 arquivos, 16 testes, todos aprovados.

## 16. Teste `CNES_PAGINATION_LIMIT`

Com `maxPages=1` e página cheia, o cliente aborta antes de consultar outra página e retorna `CNES_PAGINATION_LIMIT`.

## 17. Teste API indisponível

HTTP 503 é repetido três vezes e então retorna `CNES_HTTP_503`. HTTP 404 é retornado imediatamente, com uma chamada.

## 18. Teste página vazia

Uma página vazia termina normalmente com `rows=[]` e `pages=1`; o normalizador subsequente recusa fabricar zero e retorna `CNES_NOT_AVAILABLE`.

## 19. Teste município inválido

Código fora do padrão IBGE de sete dígitos retorna `INVALID_CODIGO_IBGE` antes de qualquer chamada HTTP.

## 20. Evidence investigada

Natural key compartilhada: `territory_id + source_hash`. `onConflict` usa esses campos. O hash é SHA-256 canônico dos campos CNES analiticamente relevantes, independente da ordem.

## 21. Resultado da investigação de evidence

Evidence representa um **estado de conteúdo oficial**, não cada execução; runs representam execuções. Em 13/08 havia hash `79e761...00cd8`, 1.045 registros. Em 15/08 o conteúdo mudou para hash `a3bee8...f2d69`, 1.044 registros, gerando a segunda evidence. Repetição idêntica retornou `evidencePersisted=0` e manteve duas linhas. `ignoreDuplicates=true` impede sobrescrever a evidência original.

## 22. Coleta real Contagem

Endpoint oficial `https://apidadosabertos.saude.gov.br/cnes/estabelecimentos`, código IBGE `3118601` convertido genericamente para `311860`. D2 coletou 1.044 estabelecimentos em 53 páginas.

## 23. Contagens antes/depois

Antes do D2: 32 indicadores, 1 evidence, 7 runs históricos. Depois: 64 indicadores (32 por snapshot), 2 evidences. Zero duplicidades por natural key e zero hashes duplicados.

## 24. Idempotência

Segunda execução de `2026-08-15`: `inserted=0`, `updated=0`, `unchanged=32`; indicadores 64→64; evidences 2→2. Verificação adicional repetiu o mesmo resultado.

## 25. Simulação D1/D2

Teste automatizado prova que D1 e D2 produzem períodos/natural keys distintos. Banco real contém snapshots 13/08 e 15/08, cada um com 32 linhas.

## 26. Force refresh

No D2: `inserted=0`, `updated=32`, `unchanged=0`; total permaneceu 64 e evidence permaneceu 2. A natural key não mudou.

## 27. Source hash

Agora inclui código CNES, data de atualização, tipo de unidade, flag ambulatorial SUS e flags de capacidade usadas nos agregados. Mudança de fonte altera hash/metadata, mas não o período quando `referenceDate` é a mesma.

## 28. Controle de versão

Branch `main`. Antes, os arquivos Saúde estavam untracked. Ao final foram adicionados ao staging de forma seletiva. Não houve checkout, reset, rebase, merge, commit ou deploy. Exclusões preexistentes em `.claude/worktrees` não foram tocadas.

## 29. Arquivos adicionados

- `RELATORIO_MOTOR_SAUDE_DATASUS_MICROBLOCO1.md`
- `docs/RELATORIO_AUDITORIA_MOTOR_SAUDE_CNES_2026_08_13.md`
- `docs/RELATORIO_MOTOR_SAUDE_CNES_MICROBLOCO2_CORRECOES_2026_08_15.md`
- `lib/territorios/saude-cnes-client.ts`
- `lib/territorios/saude-cnes-normalizer.ts`
- `lib/territorios/saude-collector.ts`
- três testes Saúde
- `scripts/audit-saude-cnes-contagem.ts`
- `scripts/reconcile-saude-cnes-microbloco2.ts`

## 30. Arquivos alterados

Como o Microbloco 1 ainda estava untracked, as correções estão nos mesmos arquivos novos do motor. Nenhum arquivo rastreado de IBGE, TSE, Segurança, Orquestrador ou frontend foi alterado.

## 31. Testes completos

- Saúde: 3 arquivos, 16 testes, PASS.
- `lib/territorios`: 49 arquivos, 390 testes, PASS (baseline Claude: 48/379; aumento explicado pelos novos testes).
- suíte territorial ampliada: 66 arquivos, 553 testes, PASS (baseline Claude: 65/542; aumento explicado pelos novos testes).

## 32. Typecheck

`npx tsc --noEmit`: PASS, zero erros.

## 33. Lint

ESLint de todos os arquivos Saúde e scripts: PASS, zero erros.

## 34. Build

`npm run build`: PASS com Next.js 16.2.6/Turbopack. Compilação, TypeScript, geração de 18 páginas estáticas e finalização concluídas.

## 35. Regressões

Nenhuma. IBGE, TSE, Segurança, Orquestrador e frontend não foram modificados; todas as baselines ampliadas passaram.

## 36. Riscos restantes

A API não oferece ordenação explícita; cadastro não equivale a serviço efetivamente disponível; D1 legado não possui min/max retroativos; política de TTL/cache ainda depende da integração; `evidencePersisted` mede nova linha de evidence, enquanto `recordsPersisted` preserva o contrato histórico de indicadores processados.

## 37. Rollback

Código: retirar somente os arquivos Saúde staged. Banco: para desfazer este microbloco, renomear de volta apenas o indicador reconciliado do período 13/08 e remover, em transação e pelo escopo exato, somente indicadores CNES de Contagem com período 15/08, evidence de hash `a3bee8...f2d69` e runs pelos requestIds deste relatório. Não executar DELETE amplo; não tocar schema ou outros motores.

## 38. Status final

Correções do Microbloco 2 concluídas e verificadas em testes e banco real. O motor permanece interno e isolado.

## 39. Pronto para auditoria Claude?

**SIM.** Código, dados reais, runs, evidence, reconciliação e relatório estão disponíveis.

## 40. Pronto para integração?

**NÃO — depende de nova auditoria independente.** Nenhum endpoint ou integração foi criado.

## Gate final

- TEMPORALIDADE CORRIGIDA: **SIM**
- DATA_ATUALIZACAO DESACOPLADA DA NATURAL KEY: **SIM**
- SNAPSHOT D1/D2 COMPROVADO: **SIM**
- IDEMPOTÊNCIA MESMO DIA: **SIM**
- INDICADOR SUS SEMANTICAMENTE CORRETO: **SIM**
- RETRY/BACKOFF IMPLEMENTADO: **SIM**
- TESTES DE FALHA IMPLEMENTADOS: **SIM**
- EVIDENCE INVESTIGADA: **SIM**
- CONTAGEM REAL TESTADA: **SIM**
- IBGE ALTERADO: **NÃO**
- TSE ALTERADO: **NÃO**
- SEGURANÇA ALTERADA: **NÃO**
- ORQUESTRADOR ALTERADO: **NÃO**
- FRONTEND ALTERADO: **NÃO**
- ENDPOINT SAÚDE CRIADO: **NÃO**
- INTEGRADO AO ORQUESTRADOR: **NÃO**
- REGRESSÕES: **NÃO**
- RELATÓRIO GERADO: **SIM**
- PRONTO PARA AUDITORIA CLAUDE: **SIM**
- PRONTO PARA INTEGRAÇÃO: **NÃO — depende de nova auditoria.**
