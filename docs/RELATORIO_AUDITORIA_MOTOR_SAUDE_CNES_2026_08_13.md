# PolitixOS Territórios — Auditoria Independente do Motor Saúde v1 / CNES
## Confronto do Relatório do Codex com Código Real, Banco Real e Evidências

**Data:** 2026-08-13
**Baseline do Codex:** `RELATORIO_MOTOR_SAUDE_DATASUS_MICROBLOCO1.md` (localizado na raiz do repositório principal, **não** neste worktree de auditoria — ver Seção 0).
**Papel deste documento:** auditoria/homologação independente, não reimplementação.

---

## 0. Nota metodológica — localização do trabalho auditado

Uma busca inicial neste worktree e em todas as branches remotas (`git fetch --all`, `git log --all --grep`, `git ls-tree` em `origin/main`) **não encontrou nenhum arquivo, commit ou PR relacionado a Saúde/CNES**. Antes de concluir que o trabalho não existia, verifiquei o banco de produção diretamente e encontrei dados reais (`fonte='DATASUS', source_dataset='CNES_ESTABELECIMENTOS'`) — o que provou que a coleta realmente ocorreu. Investigando mais, localizei o trabalho do Codex no **diretório principal do repositório** (`.../PolitixOS/`, fora de qualquer worktree), como arquivos **não commitados** (`git status` = `??`). Este é o local a partir do qual toda esta auditoria foi conduzida. Registro isso porque é exatamente o tipo de divergência que "não confiar apenas no relatório" deveria capturar — o relatório em si não menciona onde o código reside nem que está fora do controle de versão.

---

## 1. Validar isolamento — RESULTADO: CONFIRMADO

```
git status --short (repositório principal):
?? RELATORIO_MOTOR_SAUDE_DATASUS_MICROBLOCO1.md
?? lib/territorios/saude-cnes-client.test.ts
?? lib/territorios/saude-cnes-client.ts
?? lib/territorios/saude-cnes-normalizer.test.ts
?? lib/territorios/saude-cnes-normalizer.ts
?? lib/territorios/saude-collector.ts
?? scripts/audit-saude-cnes-contagem.ts

git diff --stat (arquivos rastreados modificados):
 .claude/worktrees/cranky-carson-f7e9e6 | 1 -
 .claude/worktrees/epic-jennings-eb59e2 | 1 -
 (ambos são links simbólicos de worktrees obsoletos, sem relação com Saúde)
```

- **Todos os 7 arquivos são novos e não rastreados** — exatamente como o relatório afirma na Seção 17/18.
- **Nenhuma migration, nenhuma alteração de schema.**
- **IBGE, TSE, Segurança, Orquestrador Territorial: intactos** — nenhuma menção nesses caminhos em `git status`/`git diff`.
- **Frontend: intacto.** Encontrei `app/dashboard/territorios/[ibge]/saude/page.tsx` no disco, mas `git ls-files` confirma que **já era rastreado antes** (pré-existente, não criado pelo Codex) e `git status` não mostra nenhuma modificação nele. O Motor Saúde não está conectado a essa página.
- **Achado adicional não mencionado no relatório:** não existe `app/api/territorios/saude/collect/route.ts` — ao contrário de IBGE/TSE/Segurança, o Motor Saúde **não tem endpoint HTTP público**. Isso é coerente com "não integrar ainda", mas significa que o motor só é hoje invocável via chamada de função direta (o script de auditoria), não via rota callable. Vale registrar para o próximo microbloco.

## 2. Auditar fonte CNES — RESULTADO: CONFIRMADO, com uma ressalva

- **Endpoint real:** `https://apidadosabertos.saude.gov.br/cnes/estabelecimentos` — código lido diretamente em `saude-cnes-client.ts:1`. Bate com o relatório.
- **Paginação:** `limit=20, offset+=20`, parada quando a página retorna menos que 20 itens. Padrão correto e seguro (nunca para cedo demais).
- **Filtro municipal:** `codigo_municipio` enviado à API **e** revalidado no cliente (`filter` pós-resposta) — prática defensiva correta.
- **Conversão IBGE→CNES:** `codigoIbgeToCnesMunicipio()` é uma função pura, genérica: `codigoIbge.slice(0, 6)`, validando formato de 7 dígitos antes. **Não há hardcode de Contagem** — testei manualmente a lógica com outro código (`3106705` → `310670`) e o comportamento é idêntico ao de Contagem. Confirmado sem necessidade de nova coleta real.
- **Deduplicação:** por `codigo_cnes`, via `Map`, mantendo a última ocorrência — funciona corretamente para duplicatas entre páginas, mas **não protege contra perda silenciosa de registros** se a ordenação da API não for estável entre chamadas de paginação (a API não recebe parâmro de `sort`/`order_by` explícito no código). Não é um bug comprovado, é um risco não descartado.
- **Ressalva:** o cliente não tem retry/backoff para falhas de página individual — uma falha HTTP em qualquer página aborta a coleta inteira. Isso **se manifestou de fato** durante os próprios testes do Codex (ver Seção 9).

## 3. Auditar coleta real — RESULTADO: CONFIRMADO (1045 registros), com discrepância na narrativa dos testes

Reproduzi a validação via consulta direta ao banco de produção (não refiz a chamada HTTP real, para não gerar nova carga desnecessária — os dados já persistidos e o histórico de execuções são evidência suficiente e mais completa do que uma nova chamada isolada).

**Confirmado:** `estabelecimentos_total = 1045` para Contagem, batendo exatamente com o relatório.

**Discrepância significativa encontrada:** o relatório narra uma sequência limpa de 3 execuções (primeira carga → segunda execução idêntica → force refresh). O histórico real em `territory_collection_runs` mostra **7 execuções**, não 3:

| # | Início (UTC) | Status | force_refresh | Reconciliação | Observação |
|---|---|---|---|---|---|
| 1 | 19:23:19 | **failed** | false | — | `CNES_PAGINATION_LIMIT` — **falha real, não mencionada no relatório** |
| 2 | 19:26:40 | completed | false | inserted=32 | primeira carga |
| 3 | 19:27:01 | completed | false | **updated=32** | re-execução normal, mas **NÃO ficou `unchanged` como esperado de um repeat imediato** |
| 4 | 19:27:22 | completed | true | updated=32 | force refresh |
| 5 | 19:29:19 | completed | false | unchanged=32 | ✅ idempotência confirmada aqui |
| 6 | 19:29:30 | completed | false | unchanged=32 | repetição |
| 7 | 19:29:40 | completed | true | updated=32 | force refresh final (evidência salva a partir desta) |

**Interpretação:** entre as execuções 2 e 3 (menos de 30 segundos de intervalo, mesma `referenceDate=2026-08-13`), os valores e/ou o hash mudaram o suficiente para disparar `updated` em vez de `unchanged`. Isso indica que **a fonte oficial pode retornar dados sutilmente diferentes entre chamadas muito próximas no tempo** — um sinal real de volatilidade da fonte que o relatório não registra. A idempotência **foi**, de fato, alcançada (execuções 5 e 6), mas só depois de estabilizar — o relatório apresenta apenas o resultado final limpo, omitindo a falha de paginação e a primeira tentativa de repetição malsucedida. Isso não invalida a conclusão de idempotência, mas indica que a narrativa do relatório é seletiva/otimista em relação à evidência bruta.

**Testes de paginação/robustez auditados no código (não apenas confiados no relatório):**
- Paginação completa: coberta por teste unitário (`saude-cnes-client.test.ts`).
- Deduplicação: coberta por teste unitário.
- Payload inválido (`CNES_INVALID_PAYLOAD`): coberto por teste unitário.
- **Página vazia, API indisponível (`response.ok === false`), município inválido, e o próprio `CNES_PAGINATION_LIMIT`: NENHUM tem teste unitário dedicado** — apesar de `CNES_PAGINATION_LIMIT` ter ocorrido de fato em produção durante os próprios testes do Codex (execução 1). Esta é uma lacuna real de cobertura, evidenciada por uma falha real que ela deveria ter prevenido/documentado.

## 4. Auditar os 32 indicadores — RESULTADO: CONFIRMADO estruturalmente

Os 8 indicadores-base batem exatamente com o código (`CAPABILITIES` em `saude-cnes-normalizer.ts:9-18`), cada um com predicado booleano claro e independente (`=== 1` ou `?.toUpperCase() === 'SIM'`), sem contagem dupla entre si — são **flags independentes**, não categorias mutuamente exclusivas, então a soma dos 8 não precisa (e não deve) bater com `estabelecimentos_total`; confirmei isso é tratado corretamente (nenhum código assume mutuamente exclusividade). Os demais 24 indicadores são `estabelecimentos_tipo_unidade_N`, um por `codigo_tipo_unidade` distinto observado nos dados — dinâmico, não uma lista fixa hardcoded (confirmei lendo o `Map` de agregação em `saude-collector`/`normalizer`, que itera sobre os tipos realmente presentes nos 1045 registros). Total 8 + 24 = 32, bate com o relatório.

Não há tratamento explícito de "registros inativos" no normalizador porque o filtro `status=1` (ativo) já é aplicado na origem, na chamada à API (`saude-cnes-client.ts:30`) — não há dupla filtragem nem necessidade dela.

## 5. Auditar significado semântico — RESULTADO: **METADATA/DEFINIÇÃO NECESSÁRIA**

Este é o achado mais importante em termos de risco de interpretação política incorreta.

O predicado real de `estabelecimentos_atendimento_sus` é:
```ts
(r) => r.estabelecimento_faz_atendimento_ambulatorial_sus?.toUpperCase() === 'SIM'
```
O campo bruto da fonte chama-se **`estabelecimento_faz_atendimento_ambulatorial_sus`** — ou seja, mede especificamente atendimento **ambulatorial** SUS. O nome do indicador persistido, **`estabelecimentos_atendimento_sus`**, **omite a palavra "ambulatorial"**. Alguém consumindo esse indicador sem ler o código-fonte razoavelmente inferiria que ele representa TODO atendimento SUS (incluindo hospitalar), quando na verdade não inclui. O próprio relatório do Codex reconhece isso na Seção 35 ("O indicador SUS utilizado é especificamente atendimento ambulatorial SUS"), mas essa ressalva **não está em lugar nenhum acessível a quem consome o dado** — não está no nome, não está em `metodologia` (que é genérica: "Contagem municipal de estabelecimentos ativos e capacidades cadastradas no CNES, agregada por snapshot da fonte"), e não está em `metadata` (que só guarda `codigo_ibge, source_mode, source_hash, source_record_count, cnes_codes`).

**Classificação: METADATA/DEFINIÇÃO NECESSÁRIA** (não bloqueante, não precisa renomear imediatamente, mas o campo `metodologia` deveria dizer explicitamente "restrito a atendimento ambulatorial SUS" antes que qualquer análise política use esse número). Recomendo considerar `RENOMEAR` para `estabelecimentos_atendimento_ambulatorial_sus` num próximo ciclo, mas isso muda a natural key de indicadores já persistidos — não fazer sem decisão explícita.

## 6. Auditar temporalidade — RESULTADO: **RISCO CRÍTICO CONFIRMADO ESTRUTURALMENTE**

Esta era a pergunta mais importante do gate, e a resposta, após ler o código (não apenas o relatório), é preocupante.

```ts
// saude-cnes-normalizer.ts:22
const referenceDate = rows.map((item) => item.data_atualizacao).filter(Boolean).sort().at(-1);
```

`referenceDate` é a **data máxima de atualização entre TODOS os 1045 estabelecimentos** — uma única data para o snapshot inteiro. Essa mesma data vira `periodoInicio` **e** `periodoFim` de **todos os 32 indicadores**, e — crucialmente — `periodo_inicio`/`periodo_fim` fazem parte da **chave natural** usada para reconciliação (`saude-collector.ts:15,18`: `` `${indicador}|${periodo_inicio}|${periodo_fim}` ``).

**Consequência arquitetural:** não estamos criando um snapshot municipal estável no tempo. Estamos criando uma chave que muda **toda vez que qualquer um dos ~1045 estabelecimentos tiver uma atualização cadastral mais recente que a atual data máxima observada** — mesmo que os outros 31 indicadores não tenham mudado de valor nenhum. Como o próprio relatório documenta (Seção 9), o CNES Estabelecimentos é anunciado como fonte de **atualização diária**. Isso significa que, em uso recorrente (ex.: coleta diária futura), é **altamente provável** que a data máxima mude a cada execução, gerando **32 novas linhas por execução** em vez de atualizar as existentes — crescimento não controlado da tabela `territory_indicators`, com linhas antigas ficando órfãs/obsoletas sem nunca serem substituídas.

Isso **não é um bug que já causou dano** — o motor nunca rodou em mais de um dia até agora, então o risco está latente, não manifestado. Mas é exatamente o tipo de decisão arquitetural que precisa ser resolvida **antes de qualquer agendamento recorrente**, como o próprio relatório reconhece implicitamente na Seção 38 ("política de cache/TTL" como pendência) sem nomear esse mecanismo específico.

**Não alterei nada.** Documento como exigido.

## 7. Auditar idempotência — RESULTADO: CONFIRMADO, com a ressalva da Seção 3

Reconstruí a sequência real via banco (Seção 3): a idempotência **foi** alcançada (execuções 5/6: `inserted=0, updated=0, unchanged=32`) e o `force_refresh=true` funcionou como esperado (`inserted=0, updated=32`, sem duplicação — confirmei contando fisicamente `territory_indicators` para Contagem/DATASUS: exatamente 32 linhas, nunca mais). Não confiei apenas no retorno do coletor — a contagem física no banco bate.

## 8. Auditar evidence — RESULTADO: CONFIRMADO parcialmente

- Apenas **1 linha** em `territory_evidence` para `DATASUS/CNES`, apesar de 6 execuções bem-sucedidas — consistente com `upsert(onConflict: 'territory_id,source_hash')`, mas eu não consegui reconstruir com certeza absoluta por que só uma linha sobrevive dado que a Seção 3 mostra o hash/valores mudando entre execuções (isso implicaria hashes diferentes gerando linhas diferentes). Não bloqueio o gate por isso, mas registro como **não totalmente explicado** — meritório de uma verificação futura, não investiguei mais a fundo para não estourar o escopo deste microgate.
- **Determinismo do hash confirmado por teste automatizado**: `saude-cnes-normalizer.test.ts` testa explicitamente que `normalizeCnesSnapshot(rows)` e `normalizeCnesSnapshot([...rows].reverse())` produzem o **mesmo hash** — ou seja, o hash é comprovadamente independente da ordem/páginas. Isso é uma prova direta em código, não uma alegação do relatório.
- Hash é sobre pares ordenados `[codigo_cnes, data_atualizacao]` de TODOS os registros — se um único estabelecimento mudar (entrar, sair, ou mudar `data_atualizacao`), o hash muda. Isso está correto para captar "mudança relevante", mas herda o mesmo problema semântico da Seção 6: um hash global reagindo a qualquer estabelecimento individual, não por indicador.

## 9. Auditar runs — RESULTADO: CONFIRMADO, boa observabilidade — E o teste de falha JÁ ACONTECEU de verdade

`territory_collection_runs` tem `status` (running/completed/failed), `started_at`, `finished_at`, `source='datasus'`, `workflow_name='datasus-cnes-health-v1'`, `items_collected`, `items_processed`, `error_message`, e `metadata` rico (timings, coverage, reconciliation). Não precisei simular uma falha de fonte — **uma já ocorreu de verdade** durante os próprios testes do Codex (execução 1, `CNES_PAGINATION_LIMIT`, `error_message` corretamente preenchido, `status='failed'`, sem fabricar sucesso). O mecanismo de observabilidade **funcionou exatamente como deveria** nesse caso real — mas o relatório do Codex não menciona esse incidente, o que é uma omissão relevante dado que ele é evidência direta e favorável de que o tratamento de erro funciona.

## 10. Cruzamento com IBGE — RESULTADO: CONFIRMADO, sem alterar IBGE

Consultei diretamente: `populacao_total = 651718` (fonte IBGE, período 2025) já existe para o `territory_id` de Contagem, o mesmo usado pelo Motor Saúde. Um `JOIN` por `territory_id` entre `fonte='DATASUS'` e `fonte='IBGE', indicador='populacao_total'` é tecnicamente viável hoje, sem nenhuma coleta nova. **Não materializei** nenhuma taxa per capita, conforme instruído.

## 11. Auditar potencial analítico — RESULTADO: classificação B/C do relatório faz sentido

A separação A (CNES Estabelecimentos, implementado) / B (Leitos, profissionais, SIM, SINASC, SIH/SIA, SINAN, vacinação) / C (SIOPS, SISAB/APS) / D (dados cadastrais individuais) é coerente com o que a Seção 4 do relatório descreve, e bate com o padrão já usado para classificar os dados de Segurança MG no microbloco anterior desta mesma auditoria.

**Ordem recomendada para os próximos microblocos de Saúde** (valor analítico × confiabilidade × granularidade × custo técnico × valor político-territorial):

1. **CNES Recursos Físicos/Leitos** — mesma fonte/família já homologada (baixo custo técnico de reuso do cliente CNES), granularidade mensal permite série temporal real desde já, altíssimo valor político (capacidade instalada é tema recorrente em debate público de saúde).
2. **SIM (mortalidade)** — fonte histórica extremamente confiável (desde 1996), granularidade municipal/causa/sexo/idade rica, mas exige desenho cuidadoso de período (evitar o mesmo erro de chave natural identificado na Seção 6, aqui de forma ainda mais crítica pois mortalidade é dado sensível).
3. **SINASC (nascidos vivos)** — mesma família de robustez do SIM, perfil materno tem forte valor territorial/político.
4. **SIH/SUS e SIA/SUS (internações/produção)** — alto valor mas granularidade por competência exige modelagem de período mais cuidadosa desde o início.
5. **Vacinação Covid-19** — alto volume, mas janela temporal mais restrita (desde 2021) e tema politicamente sensível; recomendo desenhar com cautela de escopo.
6. **SINAN (agravos de notificação)** — valor epidemiológico alto, mas "menor desagregação municipal" citada no próprio relatório sugere necessidade de validação de granularidade antes de comprometer.
7. **SIOPS/SISAB-APS** — corretamente classificados como C pelo relatório; exigem validação de contrato/estabilidade antes de qualquer implementação.

## 12. Testes — RESULTADO: SEM REGRESSÕES, mas **contagem do relatório não confere**

Reexecutei eu mesmo (não confiei no relatório):

```
npx tsc --noEmit                         → 0 erros (bate com o relatório)
npx eslint <6 arquivos novos>            → 0 erros (bate com o relatório)
npx vitest run lib/territorios           → 48 arquivos, 379 testes, todos PASS
npx vitest run lib/territorios app/api/territorios app/dashboard/territorios
  + lib/actions/territories.test.ts + lib/queries/territories.test.ts
                                          → 65 arquivos, 542 testes, todos PASS
npm run build                            → sucesso, inclui /dashboard/territorios/[ibge]/saude (rota pré-existente)
```

**Discrepância:** o relatório afirma "28 arquivos e 224 testes" para a suíte territorial completa. Em nenhum escopo que testei (nem o mais restrito, `lib/territorios` isolado) cheguei perto desse número — sempre encontrei bem mais (48-65 arquivos, 379-542 testes). Não há indício de que testes tenham sido removidos ou quebrados — pelo contrário, tudo passa. A explicação mais provável é que o número "28/224" citado no relatório é uma baseline desatualizada (de uma fase anterior do projeto) e não foi recalculado corretamente pelo Codex antes de reportar. Isso não é uma regressão, mas é uma imprecisão factual no relatório que deveria ser corrigida.

## 13. Divergências encontradas (resumo consolidado)

| # | Divergência | Gravidade |
|---|---|---|
| 1 | Trabalho auditado estava fora de controle de versão, em local não documentado pelo relatório | Processo — corrigir antes do commit |
| 2 | Natural key (`periodo_inicio`/`periodo_fim` = data máxima global) cria risco real de crescimento não controlado de linhas em uso recorrente | **CRÍTICO — arquitetural** |
| 3 | Nome `estabelecimentos_atendimento_sus` mais amplo que o campo real (ambulatorial apenas) | Médio — risco de interpretação política |
| 4 | Histórico real mostra 7 execuções incluindo 1 falha (`CNES_PAGINATION_LIMIT`) não mencionada no relatório, e uma reexecução que não ficou idempotente de imediato | Médio — relatório seletivo/incompleto |
| 5 | Ausência de testes para API indisponível, página vazia, `CNES_PAGINATION_LIMIT` — exatamente o que falhou de verdade | Médio — lacuna de cobertura comprovada por incidente real |
| 6 | Contagem de testes do relatório (28/224) não bate com nenhuma medição real (48-65/379-542) | Baixo — imprecisão documental, não funcional |
| 7 | Apenas 1 linha de evidência para 6 execuções bem-sucedidas com hashes aparentemente distintos — mecanismo não totalmente explicado | Baixo — não investigado a fundo, não bloqueante |
| 8 | Ausência de rota de API pública para o motor (diferente dos outros 3 motores) | Informativo — esperado neste estágio, necessário antes de integração |

## 14. Riscos

Além dos listados acima: ausência de retry/backoff no cliente HTTP significa que qualquer instabilidade transitória da API oficial aborta a coleta inteira sem tentativa de recuperação — comprovado pela falha real observada.

## 15. Correções recomendadas (NÃO aplicadas)

1. **Crítico, antes de qualquer integração ou agendamento:** redesenhar a relação entre `data_atualizacao` (por estabelecimento) e o período do indicador agregado — por exemplo, usar a data/mês da **coleta** como período do snapshot (estável, sob controle nosso) e mover `data_atualizacao` (individual, mín/máx) inteiramente para `metadata`, sem que participe da chave natural. Decisão de produto, não fiz sozinho.
2. Adicionar ao campo `metodologia` (ou criar campo de definição) o escopo exato de `estabelecimentos_atendimento_sus` (ambulatorial apenas).
3. Adicionar testes unitários para: resposta HTTP não-ok, payload com página vazia, e o cenário que já ocorreu de verdade (`CNES_PAGINATION_LIMIT`).
4. Adicionar retry/backoff limitado no cliente para falhas transitórias de página.
5. Corrigir a contagem de testes citada no relatório (Seção 31) para refletir a medição real.
6. Investigar por que só 1 linha de evidência persiste para 6 execuções bem-sucedidas com reconciliação variável.

## 16. Gate final

```
FONTE OFICIAL REAL: SIM (confirmado por leitura de código e endpoint)
CONTAGEM COLETADA COM DADOS REAIS: SIM (1045 registros, confirmado no banco)
CONVERSÃO IBGE→CNES GENÉRICA (NÃO HARDCODED): SIM (confirmado por leitura de código)
PERSISTÊNCIA CONFIRMADA: SIM (32 indicadores, contagem física confirmada)
IDEMPOTÊNCIA CONFIRMADA: SIM, mas só após 2 tentativas (evidência real mais complexa que a narrativa do relatório)
HASH DETERMINÍSTICO/ORDEM-INDEPENDENTE: SIM (provado por teste automatizado)
RISCO CRÍTICO DE CRESCIMENTO DE CHAVE NATURAL: SIM — CONFIRMADO ESTRUTURALMENTE, NÃO MITIGADO
RISCO SEMÂNTICO EM estabelecimentos_atendimento_sus: SIM — METADATA/DEFINIÇÃO NECESSÁRIA
CRUZAMENTO COM IBGE TECNICAMENTE VIÁVEL: SIM (populacao_total já persistido, join pronto)
IBGE/TSE/SEGURANÇA/ORQUESTRADOR/FRONTEND ALTERADOS: NÃO (confirmado por git status/diff)
REGRESSÕES DE TESTE/BUILD: NÃO (typecheck, lint, testes e build reexecutados por mim, todos verdes)
FALHA REAL JÁ OCORRIDA E TRATADA CORRETAMENTE (sem fabricar sucesso): SIM (CNES_PAGINATION_LIMIT, run registrada como failed)
```

**Classificação: CORREÇÃO NECESSÁRIA**

O motor está bem isolado, não corrompe nada, não afeta os outros motores, e a mecânica de coleta/persistência/evidência/runs é sólida em seus fundamentos. Mas existe um **risco arquitetural crítico e confirmado** (chave natural vinculada a uma data individual volátil) que deve ser corrigido **antes** de qualquer integração ao Orquestrador ou qualquer agendamento recorrente — rodar esse motor diariamente no design atual, com uma fonte de atualização diária como o CNES, provavelmente geraria crescimento não controlado da tabela `territory_indicators`. Não é um bloqueio para manter o código isolado como está hoje, mas é um bloqueio real para os próximos passos.

**Pronto para integrar ao Orquestrador: NÃO.**

## 17. Próximo passo recomendado

Decidir e aplicar a correção da Seção 15.1 (desacoplar `data_atualizacao` individual da chave natural do snapshot) como um microbloco dedicado, com nova auditoria focada especificamente em provar que a idempotência se mantém **entre dias diferentes** (não apenas dentro da mesma sessão de teste) antes de considerar integração ao Orquestrador.
