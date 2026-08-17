# POLITIXOS Territórios — ECO-03A — Discovery Novo CAGED

**Data do discovery:** 16/08/2026

**Responsável:** Codex

**Modo:** pesquisa técnica read-only, fontes oficiais, zero persistência

**Resultado:** **fonte e granularidade validadas; ECO-03B viável com ressalvas e ingestão central recomendada.**

## 1. Estado inicial

HEAD `5ee77df`, branch `main`, worktree sujo por trabalhos paralelos e pelos artefatos ECO-01/ECO-02 ainda não consolidados. Nenhum desses arquivos foi descartado ou alterado pelo ECO-03A.

## 2. Branch/worktree

Discovery realizado no worktree principal. Como o resultado é somente documental e a árvore contém contratos ainda não commitados, criar worktree isolado não traria benefício sem copiar estado concorrente. Downloads e parsers exploratórios ficaram em `/private/tmp`.

## 3. Concorrência

INTEL-02B/Claude, frontend/Antigravity e ECO-02B foram preservados. Não houve alteração em `lib/territorios/intelligence/`, frontend, Orquestrador, n8n ou banco.

## 4. Fonte oficial

Fonte primária validada: Ministério do Trabalho e Emprego, Programa de Disseminação das Estatísticas do Trabalho (PDET), produto Novo CAGED. A página oficial declara microdados não identificados em TXT, delimitados por `;` e UTF-8, publicados no FTP institucional: [Microdados RAIS e CAGED/MTE](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/microdados-rais-e-caged).

## 5. Catálogo de fontes

1. FTP oficial `ftp://ftp.mtps.gov.br/pdet/microdados/NOVO CAGED/`: fonte programática dos microdados e layouts.
2. Materiais mensais MTE: sumário, apresentação, tabelas XLSX e comunicado de estoque.
3. Painel oficial Power BI: consulta agregada com filtros geográficos, inclusive município, mas sem contrato público estável de API.
4. Layout oficial XLSX e README no FTP.

## 6. API

Não foi localizada API pública, documentada e contratual para consulta municipal. O painel possui endpoints internos próprios do Power BI, mas eles não devem ser tratados como API pública reutilizável. A interface programática oficial auditável disponível é o FTP/download de arquivos nacionais.

## 7. Downloads

O FTP aceita acesso anônimo e organiza arquivos por ano/competência. Em 202606: `CAGEDMOV202606.7z` (53.059.747 bytes), `CAGEDFOR202606.7z` (801.670 bytes) e `CAGEDEXC202606.7z` (121.056 bytes).

## 8. Microdados

Três arquivos por publicação:

- `MOV`: movimentações declaradas dentro do prazo, com competência de declaração do mês;
- `FOR`: movimentações fora do prazo, atribuídas a competências anteriores;
- `EXC`: exclusões declaradas no mês, cujo efeito no saldo é inverso ao evento original.

Essa semântica foi confirmada no README oficial, não inferida pelos nomes.

## 9. Agregados

Os materiais oficiais publicam admissões, desligamentos, saldo, estoque e variação relativa, por região/atividade; o painel permite filtros municipais. Entretanto, não foi encontrado download agregado municipal mensal em formato estável comparável ao FTP. Para automação reproduzível, microdados são o contrato mais completo; materiais agregados são referência de reconciliação.

## 10. Formato

TXT tabular, cabeçalho, delimitador `;`, decimal `,`. MOV/FOR possuem 28 campos; EXC possui ainda `competênciaexc` e `indicadordeexclusão`. Os layouts são publicados em XLSX.

## 11. Compactação

Arquivos em 7z. O macOS deste ambiente conseguiu extrair com `bsdtar/libarchive`; em Node, a solução futura deve preferir extração 7z controlada ou processo externo homologado. ZIP nativo não basta.

## 12. Encoding

UTF-8 confirmado pela documentação e pela leitura real (`competênciamov`, `município`, `salário`). O layout XLSX contém labels e dicionários de domínio.

## 13. Autenticação

FTP público/anônimo, sem token, OAuth, login ou captcha. Navegadores modernos não suportam bem FTP, mas clientes programáticos funcionam.

## 14. Granularidade municipal

SIM. Cada movimentação contém `município`, além de UF/região. É possível agregar qualquer competência por município, CNAE, CBO e perfis disponíveis.

## 15. Identificador município

O código CAGED possui seis dígitos e corresponde aos seis primeiros dígitos do código IBGE de sete dígitos. Validação oficial no dicionário:

- `311860` = MG-Contagem → IBGE `3118601`;
- `310670` = MG-Betim → IBGE `3106705`;
- `310620` = MG-Belo Horizonte → IBGE `3106200`.

O dígito verificador não deve ser simplesmente removido sem validar a correspondência contra o dicionário vigente.

## 16. Periodicidade

Mensal por `competênciamov` (AAAA-MM). A publicação ocorre tipicamente no fim do mês seguinte; junho/2026 foi divulgado em 29/07/2026. Devem ser separados `reference_month`, `publication_date` e `collected_at`.

## 17. Histórico

Novo CAGED disponível desde janeiro/2020. O CAGED legado é anterior e não deve ser concatenado silenciosamente: a migração gradual para eSocial e as imputações de Empregador Web/CAGED introduzem quebra metodológica. A nota técnica registra reprocessamento completo desde janeiro/2020. [Nota Técnica Novo CAGED 11/2021](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/novo-caged/novo-caged-2023/outubro/nota_tecnica_novo_caged_11-2021.pdf)

## 18. Última competência

Em 16/08/2026, o FTP oficial terminava em **202606**. A publicação ocorreu em 29/07/2026. Não havia diretório 202607.

## 19. Revisões

Entendidas e críticas. FOR e EXC de uma publicação alteram competências passadas; arquivos históricos também podem ser substituídos por reprocessamentos/correções de variáveis. O MTE confirmou substituição de arquivos até fevereiro/2023 e reprocessamentos de salário. [Comunicado de correções](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/comunicados/1848-comunicado-atualizacoes-nos-microdados-do-novo-caged), [comunicado de salário](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/comunicados/1831-comunicado-atualizacao-dos-microdados-no-novo-caged/).

## 20. Admissões

Disponíveis. `saldomovimentação=1` identifica evento de entrada; `tipomovimentação` detalha primeiro emprego, reemprego, prazo determinado, reintegração, transferência e tipo ignorado. A contagem oficial do mês corrente deriva dos eventos MOV válidos.

## 21. Desligamentos

Disponíveis. `saldomovimentação=-1` identifica saída; motivos incluem sem/com justa causa, pedido, término de contrato, aposentadoria, morte, transferência e acordo.

## 22. Saldo

Disponível diretamente como soma de `saldomovimentação`, e também reconciliável como admissões menos desligamentos. Em EXC o efeito precisa ser invertido conforme README; somar cegamente todas as linhas produz erro.

## 23. Estoque

Disponível oficialmente nos agregados/painel, mas não como campo do microdado de movimentação. É estoque encadeado: referência RAIS + saldos mensais, com atualização anual que recalcula o nível desde janeiro/2020. A atualização RAIS 2025 reduziu a referência em 2.059.584 vínculos sem representar perda mensal de empregos. [Comunicado Estoque de Referência 2026](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/comunicados/comunicado-estoque-de-referencia-de-2026).

## 24. Salário

Microdados trazem `salário` mensalizado, `unidadesaláriocódigo` e `valorsaláriofixo`. O indicador oficial divulgado é salário médio de admissão nominal, excluindo valores abaixo de 0,3 e acima de 150 salários mínimos e vínculos intermitentes; comparação real mensal usa INPC. No ECO-03B, não reproduzir “salário oficial” sem implementar exatamente os filtros metodológicos.

## 25. CNAE

Disponíveis `seção` e `subclasse` CNAE 2.0. Divisão/grupo/classe podem ser derivados hierarquicamente da subclasse com dicionário oficial, mas não aparecem como colunas próprias.

## 26. Setores

O MTE divulga cinco grandes grupamentos: Agropecuária, Indústria, Construção, Comércio e Serviços. A agregação oficial deve ser reutilizada, documentando a correspondência de seções CNAE; não criar taxonomia PolitixOS alternativa.

## 27. CBO

`cbo2002ocupação`, seis dígitos, permite ocupações em expansão/retração. Alto valor analítico, mas alta cardinalidade; recomendado somente após agregado municipal geral + setor.

## 28. Perfil trabalhador

Disponíveis: sexo, idade, grau de instrução, raça/cor, deficiência, categoria, vínculo intermitente/parcial, aprendiz, horas contratuais e tipo de empregador/estabelecimento. Não há identificador pessoal. Uso futuro deve ser agregado, com supressão de células pequenas e sem inferência individual.

## 29. Tipos movimentação

O layout possui 18 categorias, não apenas admissão/desligamento. Há eventos de transferência, reintegração, acordo, morte, tipos ignorados e exclusões em arquivo próprio.

## 30. Sazonalidade

Muito alta. Comparação mês contra mês isolada não é sinal principal confiável. Futuro motor deve priorizar mesmo mês do ano anterior, acumulado 12 meses e média móvel, sempre distinguindo revisões.

## 31. Contagem

Junho/2026 MOV: 12.237 admissões, 11.323 desligamentos, saldo **+914**, 23.560 eventos. Salário bruto exploratório das admissões: R$ 2.322,27 — não rotulado como média oficial por ainda não aplicar todos os filtros metodológicos.

## 32. Betim

Junho/2026 MOV: 7.291 admissões, 5.935 desligamentos, saldo **+1.356**, 13.226 eventos. Salário bruto exploratório: R$ 2.386,91.

## 33. Belo Horizonte

Junho/2026 MOV: 47.792 admissões, 46.646 desligamentos, saldo **+1.146**, 94.438 eventos. Salário bruto exploratório: R$ 2.581,43.

## 34. Período recente

202606 validado sobre o arquivo nacional real. Total: 4.295.101 eventos MOV. MOV não continha fora do prazo; revisões vieram em FOR/EXC separados. O sumário oficial nacional confirma 2.220.131 admissões, 2.074.970 desligamentos e saldo +145.161. [Sumário Executivo Junho/2026](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/novo-caged/2026/junho/sumario-executivo_junho-de-2026.pdf)

## 35. Período histórico

202001 validado com o mesmo conjunto de 28 colunas. Contagem: 6.567 admissões, 6.852 desligamentos, saldo -285; Betim: 3.161, 2.685, +476; Belo Horizonte: 31.772, 32.571, -799. Isso prova compatibilidade estrutural, não comparabilidade perfeita com o CAGED legado.

## 36. Tamanhos de arquivo

Observados:

| Competência/arquivo | 7z | TXT | linhas |
|---|---:|---:|---:|
| MOV 202001 | 34.261.878 B (~32,7 MiB) | 263 MiB | 2.677.294 |
| MOV 202606 | 53.059.747 B (~50,6 MiB) | 427 MiB | 4.295.101 |
| FOR 202606 | 801.670 B | 6,5 MiB | 65.573 |
| EXC 202606 | 121.056 B | 964 KiB | 8.719 |

Uma série anual completa pode superar 5 GB descompactada. Isso inviabiliza baixar histórico nacional a cada abertura de município.

## 37. Performance

Em notebook local: download MOV 202606 ~16 s, extração ~6,6 s e varredura Python streaming ~8,4 s; 202001 parse ~5,6 s. Memória permaneceu controlada por streaming. O custo central é I/O/download, não a soma municipal.

## 38. Viabilidade sob demanda

**Parcial.** Para um mês ainda não ingerido, a fonte exige baixar e varrer arquivo nacional; não existe consulta oficial municipal direta. Depois de uma ingestão central, leitura municipal sob demanda é rápida e apropriada.

## 39. Necessidade ingestão central

**SIM, recomendada.** Um job mensal deve baixar MOV/FOR/EXC uma vez, guardar artefatos e hashes, aplicar revisões e publicar agregados municipais. Não repetir a ingestão nacional por usuário/território.

## 40. Opções arquiteturais

1. **Recomendada:** object storage dos 7z/TXT + DuckDB/Parquet para transformação + tabelas agregadas no Supabase/warehouse.
2. BigQuery para microdados e agregação incremental, se o volume/custo já justificar.
3. Supabase staging apenas para agregados; não inserir milhões de eventos brutos no Postgres operacional.
4. Processamento efêmero mensal em Node/stream é possível, mas 7z e revisões tornam um pipeline batch dedicado mais seguro.

## 41. Proposta indicadores diretos

Camada municipal mensal geral:

- `admissoes_emprego_formal`;
- `desligamentos_emprego_formal`;
- `saldo_emprego_formal`;
- `estoque_emprego_formal` (somente se importado do agregado oficial/referência correta);
- `variacao_relativa_estoque_emprego_formal` (oficial/reconciliada);
- `salario_medio_admissao_nominal` (apenas com filtros oficiais);
- os três primeiros também por grande grupamento oficial.

## 42. Proposta derivados

Futuros, separados: saldo acumulado 3m/12m, média móvel, YoY, taxas de admissão/desligamento sobre estoque, participação e concentração setorial. Nenhum foi implementado.

## 43. Proposta signals

Futuros `TREND`, `CHANGE`, `PRESSURE`, `CONCENTRATION`, `DIVERGENCE`, `ANOMALY`, `ATTENTION`, sempre determinísticos, sazonais, revision-aware e com evidência.

## 44. Fronteiras interpretativas

Saldo não prova força econômica, causalidade de gestão, criação de emprego pelo prefeito, motivo político de desligamento ou crescimento futuro. CAGED cobre emprego formal celetista, não informalidade, desemprego total, produção ou renda domiciliar.

## 45. Natural key

Agregado geral: `(territory_id, indicator, source_dataset, reference_month, revision_vintage)`, com apenas uma versão “current” e histórico de vintages em evidence/staging. Dimensional: acrescentar `dimension_type`, `dimension_code` e `aggregation_level`. `publication_date` não substitui `reference_month`.

## 46. Dimensionalidade

Recomendação por fases:

- A: municipal geral, mensal;
- B: municipal × cinco grupamentos oficiais;
- C: CNAE seção/subclasse, CBO e perfis apenas em storage analítico, com materializações selecionadas.

Não juntar sexo × idade × raça × CBO × CNAE numa única cubagem: cardinalidade e risco de células pequenas explodem.

## 47. Cardinalidade

Por município/mês: A ≈ 6 indicadores; B ≈ 5 setores × 3 fluxos + geral (~21); C pode chegar a centenas/milhares de combinações observadas. Brasil (5.570 municípios × 12 meses): A ~401 mil linhas/ano; B ~1,4 milhão/ano; cubo multidimensional completo é impróprio para o banco operacional.

## 48. Evidence

Uma evidence por arquivo/vintage com hash, tamanho, competência de declaração e source URL; uma evidence agregada por município/reference month contendo hashes dos arquivos/vintages contribuintes, contagens MOV/FOR/EXC e versão metodológica. Não criar evidence por evento individual.

## 49. Source hash

SHA-256 do 7z bruto para cadeia de custódia; hash canônico do agregado ordenado para idempotência. Se o MTE substituir arquivo no mesmo caminho, o hash muda e dispara reprocessamento das competências afetadas.

## 50. Idempotência futura

Registrar cada arquivo por `(kind, declaration_month, sha256)`. Arquivo já processado é noop. Novo hash no mesmo caminho gera nova vintage. FOR aplica novos eventos à `competênciamov`; EXC aplica efeito inverso e referencia `competênciaexc`. Recalcular somente municípios/meses tocados e fazer upsert controlado.

## 51. Freshness

Política conceitual mensal: verificar nova publicação conforme calendário; após ingerir mês M, manter janela móvel de reconciliação e aceitar revisões históricas. Não há TTL de interface. O dado deve exibir competência e vintage da última revisão.

## 52. Compatibilidade INTEL

| CAGED indicator | Tipo | futuro método INTEL | Limitação |
|---|---|---|---|
| admissões/desligamentos/saldo mensal | time series oficial | trend/change/YoY/média móvel | sazonal e revisável |
| estoque | nível oficial encadeado | taxa sobre estoque/benchmark | referência RAIS recalcula nível |
| variação relativa | taxa oficial | comparação temporal/coorte | depende do estoque revisado |
| saldo por setor | composição oficial | concentração/divergência | classificação CNAE e células pequenas |
| salário médio admissão | monetário nominal | trend real somente com INPC explícito | filtros metodológicos obrigatórios |

Não tratar fluxo CAGED como `monetaryIndicator`; salário pode entrar em contrato monetário próprio. Séries mensais são o principal valor para INTEL.

## 53. CAGED × PIB

PIB/VAB é anual, estrutural e defasado; CAGED é mensal, conjuntural e revisável. Cruzamentos futuros podem confrontar estrutura setorial do VAB com fluxo de emprego, mas exigem harmonização CNAE, janelas anuais e linguagem não causal.

## 54. CAGED × RAIS

CAGED: dinâmica mensal de vínculos celetistas. RAIS: estoque anual consolidado, estabelecimentos e estrutura profunda. RAIS deve fornecer/recalibrar referência; não duplicar a mesma observação mensal como se fossem fontes equivalentes.

## 55. Riscos

- FTP sem HTTPS e caminhos com acentos/Latin-1 nos nomes, embora conteúdo seja UTF-8;
- substituição silenciosa de arquivos no mesmo URL;
- revisão de competências antigas via FOR/EXC;
- estoque recalibrado por RAIS;
- 7z e arquivos nacionais grandes;
- salário com filtros metodológicos;
- exposição indevida de células pequenas em perfis;
- confusão entre CAGED antigo e Novo CAGED.

## 56. Bloqueios

Não há API municipal oficial documentada. O download XLSX mensal está em pasta Google Drive, menos adequado a automação do que o FTP. Estoque municipal precisa ser obtido de agregado oficial/painel ou reconstruído a partir de referência oficial — microdados MOV isolados não o fornecem. Esses pontos impedem um coletor simples “código IBGE → API”.

## 57. Dependências

Para ECO-03B: cliente FTP resiliente/download HTTP alternativo se publicado; SHA-256; stream CSV UTF-8; extração 7z; DuckDB/Parquet ou warehouse; object storage; dicionários oficiais; scheduler mensal. Não instalar dependências antes de escolher a arquitetura batch.

## 58. Arquivos criados

- `docs/relatorios/CODEX_ECO03A_DISCOVERY_NOVO_CAGED.md`.

Scripts exploratórios e arquivos oficiais foram criados somente em `/private/tmp` e não fazem parte do produto.

## 59. Arquivos alterados

Nenhum arquivo de aplicação, frontend, inteligência, Orquestrador, n8n, migration ou motor existente foi alterado.

## 60. Testes/comandos

Comandos representativos:

```text
curl --list-only ftp://ftp.mtps.gov.br/pdet/microdados/NOVO%20CAGED/
curl ftp://ftp.mtps.gov.br/pdet/microdados/NOVO%20CAGED/2026/202606/
bsdtar -xf CAGEDMOV202606.7z
python3 /private/tmp/eco03a_probe.py CAGEDMOV202606.txt
python3 /private/tmp/eco03a_probe.py CAGEDMOV202001.txt
python3 /private/tmp/eco03a_revisions.py CAGEDFOR202606.txt CAGEDEXC202606.txt
```

Resultados: layouts recente/histórico compatíveis; três municípios PASS; 0 inserts, 0 updates e 0 migrations.

## 61. Recomendação ECO-03B

Prosseguir **com ressalvas**, em dois microblocos:

1. ECO-03B1: ingestão central/vintage de MOV+FOR+EXC, hashes, Parquet, agregados municipais gerais, reconciliação com totais oficiais e três municípios piloto.
2. ECO-03B2: estoque/variação oficial e cinco setores, somente após validar fonte agregada estável e política de recalibração RAIS.

Não começar com perfis/CBO/subclasse nem integrar ao Orquestrador até homologar revisões e idempotência.

## Gate final

| Gate | Resultado |
|---|---:|
| FONTE OFICIAL | VALIDADA |
| GRANULARIDADE MUNICIPAL | SIM |
| CONTAGEM | PASS |
| BETIM | PASS |
| BELO HORIZONTE | PASS |
| ADMISSÕES | DISPONÍVEL |
| DESLIGAMENTOS | DISPONÍVEL |
| SALDO | DISPONÍVEL |
| ESTOQUE | DISPONÍVEL |
| SALÁRIO | DISPONÍVEL |
| CNAE | DISPONÍVEL |
| CBO | DISPONÍVEL |
| HISTÓRICO | VALIDADO |
| PERIODICIDADE | VALIDADA |
| REVISÕES | ENTENDIDAS |
| COLETA SOB DEMANDA | PARCIAL |
| INGESTÃO CENTRAL NECESSÁRIA | SIM |
| NATURAL KEY PROPOSTA | SIM |
| EVIDENCE PROPOSTA | SIM |
| PERSISTÊNCIA | NÃO |
| ORQUESTRADOR | NÃO ALTERADO |
| FRONTEND | NÃO ALTERADO |
| PRONTO PARA ECO-03B | COM RESSALVAS |

**Encerramento:** discovery ECO-03A concluído. Nenhum coletor definitivo, persistência, integração ou ECO-03B foi iniciado.
