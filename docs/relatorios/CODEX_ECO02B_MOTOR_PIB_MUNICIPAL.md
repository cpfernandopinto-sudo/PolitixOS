# POLITIXOS Territórios — ECO-02B — Motor PIB Municipal / IBGE

**Data da homologação:** 16/08/2026  
**Responsável:** Codex  
**Escopo:** implementação controlada, coleta oficial real, normalização, persistência e testes.  
**Resultado:** **PASS — pronto para auditoria independente do Claude; não integrado ao Orquestrador.**

## 1. Estado inicial

O repositório já estava com alterações não commitadas de trabalhos paralelos (INTEL-01/Claude, FRONT-02.7/Antigravity e ECO-01). O HEAD inicial e final deste gate permaneceu `5ee77df`; nenhuma alteração paralela foi descartada, sobrescrita ou incorporada ao escopo.

## 2. Branch/worktree

Execução em `main`, no worktree principal. Um worktree isolado não permitiria consumir com segurança o ECO-01 ainda não commitado. A decisão foi trabalhar no diretório compartilhado, restringindo mudanças aos arquivos próprios do ECO-02B e a uma refatoração mínima compatível no transporte IBGE.

## 3. Baseline ECO-02A

O baseline homologado `CODEX_ECO02A_DISCOVERY_PIB_MUNICIPAL.md` foi lido integralmente e usado sem refazer o discovery. Tabela, variáveis, bases complementares, layouts, cobertura e semântica seguem suas conclusões.

## 4. Arquitetura implementada

Fluxo: transporte comum IBGE → cliente PIB (SIDRA + bases oficiais) → parser estrito → normalizador canônico → persistência territorial. Os componentes permanecem independentes do frontend, do n8n e do Orquestrador.

## 5. Reutilização do ibge-client

`fetchIbgeJson` passou a ser exportado e recebeu injeção opcional de `fetch`, preservando timeout, retry, backoff, 429/5xx e compatibilidade com o motor populacional. Não houve duplicação do transporte HTTP.

## 6. Tabela 5938

Consulta real via API de Agregados/SIDRA, nível N6, código municipal de sete dígitos, tabela 5938 e 11 variáveis homologadas. Cada município retorna 242 células: 11 variáveis × 22 anos.

## 7. Parser

O parser valida shape, cabeçalhos, período, código municipal e valor. A base per capita usa o layout oficial e leitura Latin-1 dos ZIPs 2002–2009 e 2010–2023; os campos fixos foram validados contra a documentação oficial antes da implementação.

## 8. Caracteres especiais

`...`, `..`, `X`, `-`, campos vazios e faixas textuais são indisponibilidade, nunca número. O normalizador registra `availability_status` e não cria indicador numérico para esses casos.

## 9. Variáveis

Implementadas: 37, 543, 498, 513, 516, 517, 520, 6575, 6574, 525 e 528, com nomes oficiais preservados em metadata.

## 10. Unidades

Valores SIDRA em `Mil Reais` tornam-se `BRL`; participações permanecem em `%` (pontos percentuais); PIB per capita permanece `BRL/habitante`.

## 11. Normalização

Conversão monetária exclusiva de unidade: valor × 1.000. Metadata mantém `raw_value`, `raw_unit` e `normalization_factor=1000`. Não há deflacionamento, preços constantes ou correção monetária.

## 12. PIB total

`pib_municipal_precos_correntes`, variável 37, dataset `IBGE_SIDRA_5938`, anual, 2002–2023, em BRL.

## 13. PIB per capita

`pib_per_capita_precos_correntes`, dataset `IBGE_PIB_MUNICIPIOS_BASE`, anual, 2002–2023. O valor oficial foi lido diretamente; não há cálculo PIB/população.

## 14. Base oficial

Os dois ZIPs oficiais são baixados sob demanda, validados e mantidos em cache de processo. O parser exige exatamente uma linha municipal por ano e cobertura contínua de 22 anos.

## 15. VAB

VAB total e quatro componentes são persistidos somente de 2002 a 2021. Identidade VAB validada com tolerância de R$ 2.000, compatível com o arredondamento em mil reais.

## 16. Participações

As quatro participações permanecem em pontos percentuais, 2002–2021. Soma aproximada validada com tolerância de 0,02 p.p.; `30,81` torna-se `30.81`, não `0.3081`.

## 17. Impostos

`impostos_liquidos_subsidios_produtos_precos_correntes` representa impostos líquidos de subsídios sobre produtos, não impostos municipais, arrecadação ou receita SICONFI.

## 18. Precisão

PIB total é persistido somente da SIDRA. A maior divergência observada na identidade PIB foi compatível com tolerância de R$ 1.000. A precisão da base complementar não cria uma segunda observação de PIB total.

## 19. Cobertura

Por município: 244 indicadores numéricos (222 SIDRA + 22 per capita) e 20 indisponibilidades oficiais em 2022–2023 para dez séries detalhadas. Não houve preenchimento, interpolação ou zero artificial.

## 20. Temporalidade

Para o ano AAAA: `periodo_inicio=AAAA-01-01` e `periodo_fim=AAAA-12-31`. `reference_year`, `collected_at` e `source_updated_at` são campos semanticamente separados.

## 21. Defasagem

Todos os valores monetários são nominais, a preços correntes, e o último ano oficial é 2023. Nenhum valor de 2023 é apresentado como dado corrente de 2026.

## 22. Metadata

Inclui modo REAL, tabela/variável, nome e valor bruto, unidade bruta, fator, ano, URL, disponibilidade, referência metodológica, datas, hash, arquivo e hash da linha quando aplicável.

## 23. Datasets

SIDRA: `IBGE_SIDRA_5938`. Per capita: `IBGE_PIB_MUNICIPIOS_BASE`. A origem não é atribuída ao dataset errado.

## 24. Source record

SIDRA usa identidade determinística tabela:variável:município:ano. A base usa identidade determinística com arquivo, município, ano e hash da linha.

## 25. Natural key

Preservada a chave existente: território + categoria + indicador + fonte + dataset + período inicial + período final. Nenhuma migration foi necessária.

## 26. Evidence

Foram conciliadas 44 evidências em Contagem: uma evidência SIDRA e uma da base per capita por ano. O hash inclui dataset, município, ano, registros e indisponibilidades, permitindo rastrear fonte, valor, unidade e transformação.

## 27. Collection runs

Cada execução cria run `running` e termina `completed`, `partial` ou `failed`, com contagens, cobertura, reconciliação, warnings, source hash e tempos. Falha complementar do per capita admite resultado parcial; falha SIDRA interrompe corretamente.

## 28. Compatibilidade ECO-01

ECO-01 permaneceu com 42 indicadores SICONFI antes e depois de todas as cargas. ECO-02 usa fonte IBGE e datasets próprios; não houve colisão nem alteração de dado fiscal.

## 29. Tratamento de erros

Cobertos: código inválido, território ausente, timeout, 429/5xx, payload inválido, valor especial, ZIP/layout/encoding inválido, cobertura incompleta e download complementar indisponível.

## 30. Performance

Persistência foi convertida para lotes (até 200 inserts), atualizações controladas em grupos de 20 e uma conciliação de evidências. Uma reexecução idempotente caiu de aproximadamente 11,0 s de persistência na versão preliminar para 0,90 s; total 1,40 s com cache aquecido.

## 31. Estratégia sob demanda

O coletor recebe um código IBGE e processa apenas um município, respeitando o limite SIDRA e a estratégia territorial sob demanda. Não houve consulta nacional.

## 32. Cache/freshness

Há cache em memória para arquivos oficiais e resultados per capita por município durante o processo. Recomenda-se ao Orquestrador futuro respeitar a freshness já existente e recolher PIB anual apenas por expiração ou refresh explícito; nenhuma política arbitrária foi implantada neste gate.

## 33. Testes unitários

Resultado: **57/57 PASS**, seis arquivos. Cobertura direcionada inclui especiais SIDRA, unidades, percentuais, PIB, VAB, participações, impostos, períodos, metadata, natural key, per capita, precisão, lacunas 2022/2023 e regressões ECO-01/IBGE. O TypeScript global permanece bloqueado por erro de sintaxe no arquivo paralelo não rastreado `app/dashboard/territorios/sandbox/page.tsx:306`; os arquivos ECO-02B não aparecem no diagnóstico.

## 34. Testes de integração

Três consultas reais oficiais passaram, com 11 variáveis, 242 células SIDRA, cobertura 2002–2023, 244 indicadores e 20 indisponibilidades por município.

## 35. Contagem

PASS. PIB 2023: R$ 45.092.393.000; PIB per capita oficial: R$ 72.511,78. Valores vieram da consulta real, sem hardcode.

## 36. Betim

PASS. PIB 2023: R$ 52.614.325.000; PIB per capita oficial: R$ 127.752,43.

## 37. Belo Horizonte

PASS. PIB 2023: R$ 130.197.671.000; PIB per capita oficial: R$ 56.227,29.

## 38. Persistência real

Contagem foi persistida em `territory_indicators`, `territory_evidence` e `territory_collection_runs`. Estado homologado: 244 indicadores IBGE, 44 evidências e zero duplicatas de chave/hash.

## 39. Primeira execução

Na carga inaugural: `inserted=244`, `updated=0`, `unchanged=0`, `skipped=20`, `failed=0`, `evidencePersisted=44`.

## 40. Segunda execução

Na repetição inaugural: `inserted=0`, `updated=0`, `unchanged=244`, `skipped=20`, `failed=0`, `evidencePersisted=0`.

## 41. Idempotência

Nova homologação após otimização repetiu duas vezes: ambas com 244 unchanged, zero insert/update e zero evidência nova. Auditoria: zero duplicatas de natural key, zero hashes duplicados e source hash estável.

## 42. Banco após coleta

Contagem: 244 indicadores ECO-02, 44 evidências ECO-02 e 42 indicadores ECO-01 intactos. Runs registram 264 itens coletados, 244 processados e 20 descartados por indisponibilidade oficial.

## 43. Arquivos criados

- `lib/territorios/economia-pib-client.ts`
- `lib/territorios/economia-pib-normalizer.ts`
- `lib/territorios/economia-pib-collector.ts`
- `lib/territorios/economia-pib-normalizer.test.ts`
- `scripts/audit-economia-pib-municipal.ts`
- `docs/relatorios/CODEX_ECO02B_MOTOR_PIB_MUNICIPAL.md`

## 44. Arquivos alterados

- `lib/territorios/ibge-client.ts` — exportação/injeção mínima do transporte comum; quatro linhas modificadas, sem quebra do consumidor existente.

## 45. Git diff --stat

Arquivos novos estavam untracked no worktree compartilhado e, por isso, não aparecem no `git diff --stat` padrão. Escopo ECO-02B: seis arquivos novos; o arquivo rastreado `ibge-client.ts` apresenta 2 inserções e 2 remoções. Nenhum arquivo frontend foi alterado pelo ECO-02B.

## 46. Conflitos

Não houve conflito de conteúdo. O worktree continua sujo por trabalhos paralelos já existentes; o ECO-02B não os tocou. Diretórios de worktrees Claude aparecem removidos no status por estado externo prévio e ficaram fora do escopo.

## 47. Débitos técnicos

- Incorporar o coletor ao Orquestrador somente após auditoria independente.
- Definir freshness central anual, sem acoplá-la ao motor.
- Corrigir no fluxo FRONT paralelo o erro TypeScript em `app/dashboard/territorios/sandbox/page.tsx:306`; ele impede o `tsc` global, mas não pertence ao ECO-02B.
- Migrar runtime operacional para Node 22+; o changelog oficial do Supabase informa encerramento do suporte das bibliotecas a Node 20 após 30/06/2026.
- Acrescentar fixture oficial versionada apenas se a política futura exigir testes offline completos do arquivo fixo.

## 48. Riscos

Mudança futura no layout/encoding dos arquivos oficiais causa falha explícita, não corrupção silenciosa. Revisões IBGE podem gerar updates controlados. Indisponibilidade da base complementar produz partial. O maior risco operacional remanescente é integrar antes de auditar o worktree compartilhado.

## 49. Recomendação para auditoria Claude

Auditar os 12 indicadores canônicos, semântica dos especiais, posições do layout oficial, tolerâncias, ausência de derivados/inteligência, natural key, reconciliação em lote, evidência e os registros reais de Contagem. Repetir os testes e comparar o source hash `29aeeaf37b567c8eed218406b26f4a266b5d0b3998dfde23e096632c4e367c09`.

## 50. Recomendação para ECO-03

Não iniciar agora. Depois da auditoria Claude, o próximo gate pode conectar este motor ao Orquestrador/freshness sob demanda. Qualquer camada derivada ou interpretativa deve permanecer separada e só começar mediante autorização explícita.

## Declaração de segurança

| Declaração | Resultado |
|---|---:|
| DADOS REAIS | SIM |
| FONTE OFICIAL | SIM |
| PIB PREÇOS CORRENTES | SIM |
| PIB PER CAPITA OFICIAL | SIM |
| VAB 2022/2023 INVENTADO | NÃO |
| `...` CONVERTIDO EM ZERO | NÃO |
| CRESCIMENTO REAL CALCULADO | NÃO |
| INTERPRETAÇÃO POLÍTICA | NÃO |
| FRONTEND ALTERADO | NÃO |
| ORQUESTRADOR ALTERADO | NÃO |
| N8N ALTERADO | NÃO |
| ECO-01 QUEBRADO | NÃO |

## Gate final

| Gate | Resultado |
|---|---:|
| SIDRA 5938 | PASS |
| PIB TOTAL | PASS |
| PIB PER CAPITA | PASS |
| VAB | PASS |
| PARTICIPAÇÕES | PASS |
| IMPOSTOS | PASS |
| CARACTERES ESPECIAIS | PASS |
| NORMALIZAÇÃO | PASS |
| TEMPORALIDADE | PASS |
| EVIDENCE | PASS |
| PERSISTÊNCIA | PASS |
| IDEMPOTÊNCIA | PASS |
| CONTAGEM | PASS |
| BETIM | PASS |
| BELO HORIZONTE | PASS |
| COMPATIBILIDADE ECO-01 | PASS |
| TESTES | PASS |
| PRONTO PARA AUDITORIA CLAUDE | SIM |
| PRONTO PARA ORQUESTRADOR | NÃO |

**Encerramento:** ECO-02B concluído. Nenhum deploy, carga nacional, integração ao Orquestrador ou início do ECO-03 foi realizado.
