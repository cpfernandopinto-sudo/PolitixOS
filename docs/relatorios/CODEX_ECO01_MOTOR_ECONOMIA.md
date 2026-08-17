# PolitixOS Territórios — ECO-01 Motor Economia

**Status:** concluído para auditoria do Claude  
**Data:** 16/08/2026  
**Escopo executado:** fundação fiscal municipal anual, fonte real SICONFI/DCA, Contagem/MG (IBGE 3118601), exercícios 2020–2025.  
**Gate:** não avançar para ECO-02 antes da auditoria.

## 1. Arquitetura encontrada

O repositório possui motores territoriais isolados em `lib/territorios`, divididos em client, normalizer, collector e testes. O contrato persistente compartilhado é formado por `territories`, `territory_indicators`, `territory_evidence` e `territory_collection_runs`. A chave natural de indicadores já é protegida por índice único com `COALESCE`. O ECO-01 segue essa arquitetura, sem frontend, rota, n8n, alteração de contrato global ou nova tabela.

## 2. Fontes investigadas

- **Tesouro Nacional/SICONFI:** API aberta JSON; DCA, RREO, RGF, MSC e cadastros de entes. O DCA contém contas anuais de receitas e despesas municipais.
- **IBGE/SIDRA — PIB dos Municípios:** PIB, impostos líquidos de subsídios e valor adicionado por atividade, anual e municipal; tabela 5938.
- **MTE/PDET — Novo CAGED:** movimentação mensal do emprego formal, com microdados TXT e dimensão municipal.
- **MTE/PDET — RAIS:** estoque e perfil anual do emprego formal, com microdados TXT e dimensão municipal.
- **BCB/ESTBAN:** saldos bancários mensais por município, com `CODMUN_IBGE`; arquivos, não API JSON transacional simples.
- **BCB/SGS:** séries macroeconômicas úteis como contexto, porém em regra sem granularidade municipal diretamente aplicável.
- **SICONFI RREO/RGF/MSC e Tesouro/SADIPEM:** fontes fiscais de aprofundamento, não necessárias à fundação pequena do ECO-01.

Referências oficiais consultadas:

- Tesouro, API SICONFI: https://www.tesourotransparente.gov.br/consultas/consultas-siconfi/siconfi-api-de-dados-abertos
- Swagger SICONFI: https://apidatalake.tesouro.gov.br/docs/siconfi/
- Tesouro, DCA: https://www.tesourotransparente.gov.br/ckan/dataset/api-dca-entes/resource/9de882a6-36a1-4db2-b35b-a80780db393e
- IBGE, PIB dos Municípios: https://www.ibge.gov.br/estatisticas/economicas/contas-nacionais/9088-produto-interno-bruto-dos-municipios.html
- MTE, microdados RAIS/CAGED: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/microdados-rais-e-caged
- MTE/PDET: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho
- BCB, ESTBAN: https://www.bcb.gov.br/estatisticas/estatisticabancariamunicipios
- BCB, SGS: https://www3.bcb.gov.br/sgspub/

## 3. Matriz A/B/C/D das fontes

| Classe | Fonte | Granularidade / periodicidade | Cobertura e código | Acesso / formato | Valor político-territorial |
|---|---|---|---|---|---|
| A — essencial agora | SICONFI/DCA | Município / anual | Entes subnacionais; `id_ente`/`cod_ibge` | Sem autenticação; JSON; 5.000/página; 1 req/s | Capacidade fiscal, arrecadação, transferências, gasto e investimento |
| B — próxima etapa | IBGE/SIDRA 5938 PIB-Munic | Município / anual | Brasil; código IBGE | API SIDRA/JSON | Porte econômico, estrutura produtiva e PIB per capita |
| B — próxima etapa | Novo CAGED | Município / mensal | Brasil; código municipal | Microdados TXT/UTF-8; arquivos grandes | Fluxo do emprego formal e dinâmica recente |
| B — próxima etapa | RAIS | Município / anual | Brasil; código municipal | Microdados TXT; arquivos grandes | Estoque, remuneração e estrutura ocupacional |
| C — complementar | BCB/ESTBAN | Município / mensal | Brasil; `CODMUN_IBGE`; publicação com defasagem | Arquivos | Crédito, depósitos e presença bancária local |
| C — complementar | SICONFI RREO/RGF/MSC | Ente / bimestral, quadrimestral ou mensal | Entes declarantes | API JSON, 1 req/s | Resultado fiscal, dívida, limites e execução mais fina |
| C — complementar | Tesouro/SADIPEM | Ente / eventos e operações | Entes subnacionais | API/arquivos | Operações de crédito e endividamento |
| D — não necessária no núcleo | BCB/SGS | Predominantemente nacional/estadual | Sem chave municipal uniforme | API/sistema público | Contexto macro; não sustenta sozinho diagnóstico municipal |

## 4. Fonte escolhida

Tesouro Nacional — SICONFI, endpoint DCA (Declaração de Contas Anuais).

## 5. Justificativa

É oficial, aberta, programática, anual, municipal, identificada pelo código IBGE e fornece diretamente contas fiscais brutas. Na validação de Contagem, os sete registros escolhidos existiram de modo estável em todos os exercícios de 2020 a 2025. Isso permite começar pequeno, real e auditável sem criar cálculo político.

## 6. Endpoints/datasets utilizados

- Dataset interno: `SICONFI_DCA`.
- Endpoint: `GET https://apidatalake.tesouro.gov.br/ords/cdwhprd/siconfi/tt/dca`.
- Parâmetros: `an_exercicio`, `id_ente`, `offset`.
- Limites observados/documentados: 5.000 itens por página; no máximo uma requisição por segundo; sem autenticação; JSON.
- O client implementa paginação, tentativas apenas para falhas transitórias, timeout e throttling entre páginas/exercícios.

## 7. Campos brutos disponíveis

`exercicio`, `instituicao`, `cod_ibge`, `uf`, `anexo`, `rotulo`, `coluna`, `cod_conta`, `conta`, `valor` e `populacao`, além do envelope Oracle (`items`, `hasMore`, `count`, `limit`, `offset`, `links`).

## 8. Campos utilizados

- Filtro/rastreio: `exercicio`, `cod_ibge`, `anexo`, `coluna`, `cod_conta`.
- Valor: `valor`.
- Metadata: `instituicao`, `uf`, `conta`, `coluna`, `cod_conta`, `anexo`.
- Envelope: `hasMore`, `limit`, `offset`.

## 9. Campos descartados

- `rotulo`: redundante frente a anexo/conta/coluna no núcleo selecionado.
- `links`: navegação do envelope, não dado analítico.
- `populacao`: guardada apenas em metadata como `source_population_discarded`, não usada em cálculo, pois o PolitixOS já possui população oficial IBGE.
- Todas as demais contas/colunas do DCA: não foram persistidas; permanecem auditáveis pela evidência bruta referenciada. Deduções, liquidação, pagamento, restos a pagar e outros anexos devem ter modelagem própria futura.

## 10. Indicadores persistidos

Todos são **dados brutos**, em BRL, sem correção inflacionária:

1. `receita_total_bruta_realizada` — `TotalReceitas`, Receitas Brutas Realizadas.
2. `receita_corrente_bruta_realizada` — `RO1.0.0.0.00.0.0`.
3. `receita_tributaria_bruta_realizada` — `RO1.1.0.0.00.0.0` (Impostos, Taxas e Contribuições de Melhoria).
4. `transferencias_correntes_brutas_realizadas` — `RO1.7.0.0.00.0.0`.
5. `despesa_corrente_empenhada` — `DO3.0.00.00.00.00`.
6. `despesa_capital_empenhada` — `DO4.0.00.00.00.00`.
7. `investimento_empenhado` — `DO4.4.00.00.00.00`.

## 11. Temporalidade

Série anual 2020–2025. Cada linha preserva `periodo_inicio = AAAA-01-01`, `periodo_fim = AAAA-12-31`; `reference_year` e `reference_period` ficam em metadata; `collected_at` registra a coleta. O DCA não fornece `source_updated_at` por linha, portanto ele permanece `null`, sem simulação.

## 12. Metadata

Cada indicador preserva: `source_mode=REAL`, `source_resource`, `source_url`, `reference_year`, `reference_period`, `unit`, `natureza`, `classification`, `raw_name`, `raw_column`, `raw_account_code`, `institution`, `uf`, `source_population_discarded`, `derivation=raw_source_row`, `source_record_id`, `collected_at` e definição metodológica. Execuções preservam cobertura, status HTTP, reconciliação e tempos. Evidências preservam contagem bruta, páginas e exercício.

## 13. Natural key

No banco: `(territory_id, categoria, indicador, fonte, COALESCE(source_dataset,''), COALESCE(periodo_inicio,'0001-01-01'), COALESCE(periodo_fim,'0001-01-01'))`.

No reconciliador do motor: `indicador|periodoInicio|periodoFim`, dentro do escopo previamente filtrado por `territory_id + economia + SICONFI + SICONFI_DCA`. A segunda coleta compara valor e `source_record_id`; somente fonte alterada ou `forceRefresh` produz update.

## 14. População/join

O Motor IBGE já persiste `demografia / populacao_total / IBGE / SIDRA_6579`. Em Contagem existe 2025: **651.718 pessoas**, período 2025. A chave de join é `territory_id + reference_year` (`periodo_inicio`). Para per capita, usar o mesmo exercício; ausência anual deve ser tratada explicitamente, nunca por população embutida do DCA ou interpolação silenciosa.

## 15. Indicadores deriváveis

**Derivável diretamente dos sete brutos:** participação da receita tributária na receita corrente/total; dependência de transferências; participação do investimento na despesa de capital; trajetória nominal e variação anual nominal.  
**Derivável com IBGE:** receita, despesa e investimento per capita.  
**Derivável com outra fonte:** crescimento real (IPCA/deflator com metodologia), PIB per capita e peso fiscal/PIB, emprego e renda, estrutura produtiva, crédito local.  
Nenhum derivado foi persistido no ECO-01.

## 16. Potencial para Inteligência Política

- **Derivável diretamente:** dependência de transferências, força relativa da arrecadação, trajetória nominal de investimento e pressão relativa do gasto.
- **Derivável com outra fonte:** capacidade fiscal per capita, esforço fiscal frente ao PIB, investimento real, emprego/renda e vulnerabilidade setorial.
- **Hipótese futura:** discrepância entre porte populacional e capacidade fiscal, dependência do setor público e oportunidade narrativa. Essas hipóteses exigem regras e auditoria; não são conclusões deste motor.

## 17. Arquivos criados

- `lib/territorios/economia-siconfi-client.ts`
- `lib/territorios/economia-siconfi-client.test.ts`
- `lib/territorios/economia-siconfi-normalizer.ts`
- `lib/territorios/economia-siconfi-normalizer.test.ts`
- `lib/territorios/economia-collector.ts`
- `lib/territorios/economia-collector.test.ts`
- `scripts/audit-economia-siconfi-contagem.ts`
- `docs/relatorios/CODEX_ECO01_MOTOR_ECONOMIA.md`

## 18. Arquivos alterados

Nenhum arquivo preexistente foi alterado pelo ECO-01.

## 19. Migrations

Nenhuma. O contrato existente comporta `categoria=economia`, `fonte=SICONFI`, dataset, períodos, metadata, evidências e runs.

## 20. Testes

- 3 arquivos e 9 testes específicos: client, normalizer e reconciliação.
- Casos: parâmetros oficiais, filtro defensivo, paginação/offset, throttling, ordenação/deduplicação de anos, entrada/payload inválidos, sete contas exatas, metadata, chave anual, ausência/duplicidade/valor nulo e ações insert/update/unchanged.
- `npx vitest run ...`: **9/9 aprovados**.
- `npx tsc --noEmit`: **aprovado**.
- ESLint dos arquivos ECO-01: **aprovado**.

## 21. Coleta real de Contagem

- Fonte chamada: Tesouro/SICONFI DCA.
- Exercícios: 2020–2025.
- HTTP: seis respostas 200.
- Brutos: 11.758 (1.990, 1.971, 1.939, 1.930, 1.917 e 2.011).
- Normalizados/persistidos: 42 (7 por ano).
- Evidências: 6 (uma por exercício).
- Duplicações: 0.
- Primeira execução total: 28,13 s; fetch 14,30 s; normalize 12,16 ms; persistência 12,58 s.
- Amostra 2025: receita total R$ 4.475.980.236,19; receita corrente R$ 4.017.044.518,27; receita tributária R$ 1.280.592.625,92; transferências correntes R$ 2.139.220.074,39; despesa corrente empenhada R$ 3.491.213.406,76; despesa de capital empenhada R$ 515.884.115,10; investimento empenhado R$ 404.242.795,23.

## 22. Segunda execução/idempotência

- Segunda execução total: 12,87 s.
- Brutos: 11.758; normalizados: 42.
- `inserted=0`, `updated=0`, `unchanged=42`.
- Novos indicadores: 0; novas evidências: 0.
- Duplicações por chave natural: 0; duplicações de hash de evidência: 0.

## 23. Evidências do banco

Após as duas execuções:

- 42 linhas em `territory_indicators` para Contagem + economia + SICONFI + SICONFI_DCA.
- 6 linhas em `territory_evidence`, `source_name=Tesouro/SICONFI`, IDs externos `SICONFI_DCA:3118601:2020` a `:2025`, hashes SHA-256 distintos e contagens brutas por ano.
- 2 runs `completed` em `territory_collection_runs`, 11.758 coletados, 42 processados e 11.716 descartados seletivamente em cada run, sem erro.
- Consulta real pós-gravação confirmou população IBGE disponível para join.

## 24. Limitações

- Valores são nominais e declaratórios; não significam crescimento real.
- DCA é anual e pode sofrer retificação na fonte.
- Apenas sete contas/colunas foram selecionadas; não representa todo o universo fiscal.
- Empenho não equivale a liquidação ou pagamento.
- Receita bruta não incorpora deduções; o nome do indicador torna isso explícito.
- Não há `source_updated_at` por registro no endpoint.
- Não foram homologados Betim/Belo Horizonte para evitar ampliar o núcleo além do teste exigido.

## 25. Riscos

- Mudanças de taxonomia/códigos DCA; o fail-fast impede persistência silenciosamente errada.
- Revisões históricas alterarem valores; uma recoleta fará update controlado e nova evidência de conteúdo.
- Comparações nominais confundidas com desempenho real; a camada analítica futura deve exigir deflator e metodologia.
- Rate limit/bloqueio; client limita frequência e tenta novamente somente falhas transitórias.
- Usar população de exercício diferente; o contrato futuro deve validar o ano antes de calcular per capita.

## 26. Conflitos encontrados com trabalho paralelo

Havia alterações não relacionadas no frontend territorial (`app/dashboard/territorios/*`, `components/territorios/*`), dois ponteiros de worktree removidos e relatórios não rastreados. Nenhum desses arquivos foi tocado. Não houve colisão nos arquivos do ECO-01.

## 27. Git diff --stat

O `git diff --stat` comum não inclui arquivos ainda não rastreados do ECO-01; o escopo criado contém **8 arquivos**. O worktree já possuía, antes do ECO-01, diff paralelo de **6 arquivos, 450 inserções e 130 remoções**, que não pertence a este bloco. O status final deve ser auditado separando os arquivos listados na seção 17.

## 28. Branch/worktree

- Branch: `main`.
- HEAD inicial: `5ee77df` (`feat(territorios): Motor Saúde v1/CNES com TTL 24h e endpoint dedicado`).
- Worktree principal compartilhado, com outros worktrees TSE/Claude/release listados na auditoria inicial.
- ECO-01 foi executado no worktree principal sem alterar branches/worktrees paralelos.

## 29. Commit

Não realizado. O usuário não solicitou commit neste microbloco e o worktree contém alterações paralelas; deixar sem commit reduz o risco de agregar trabalho alheio.

## 30. Recomendação para ECO-02

Após auditoria do Claude, priorizar **IBGE/SIDRA 5938 — PIB dos Municípios** como segunda dimensão, preservando valores correntes, VAB por atividade e períodos. Só depois incorporar derivados fiscal/PIB e per capita com contratos explícitos. Novo CAGED/RAIS deve formar um microbloco próprio devido a tamanho, formato de microdados e reconciliação temporal. RREO/RGF/MSC e ESTBAN ficam para aprofundamentos especializados. Não integrar ao n8n antes da homologação arquitetural e semântica do ECO-01.
