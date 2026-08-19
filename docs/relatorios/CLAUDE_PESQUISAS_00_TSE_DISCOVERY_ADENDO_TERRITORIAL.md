# PESQUISAS-00 — TSE Data Discovery — Adendo: Granularidade Territorial

**Agente:** Claude · **Status:** BLOQUEADO — acesso à fonte primária indisponível nesta sessão
**Data:** 2026-08-19

---

## Bloqueio de acesso (leia isto primeiro)

Todo domínio `tse.jus.br` retorna **403 Forbidden** a partir deste ambiente — confirmado de forma consistente em múltiplas tentativas, por dois caminhos diferentes (`curl` com user-agent de navegador, e a ferramenta `WebFetch`):

| URL tentada | Método | Resultado |
|---|---|---|
| `dadosabertos.tse.jus.br/dataset/pesquisas-eleitorais-2026` | WebFetch | 403 |
| `dadosabertos.tse.jus.br/dataset/.../resource/769a663e-...` | WebFetch | 403 |
| `dadosabertos.tse.jus.br` (página do dataset) | curl | 403 |
| `dadosabertos.tse.jus.br/api/3/action/package_show?...` (API CKAN) | curl | 403 (bloqueio Akamai/edgesuite) |
| `cdn.tse.jus.br/.../pesquisa_eleitoral_2026.zip` (download direto) | curl | 403 |
| `www.tse.jus.br/eleicoes/pesquisa-eleitorais/consulta-as-pesquisas-registradas` | WebFetch | 403 |

Não é um problema de uma ferramenta específica nem de uma URL específica — é um bloqueio estrutural (provável WAF/Akamai barrando o range de IP deste ambiente) que impede acesso a **qualquer** recurso em `tse.jus.br`, incluindo a página HTML, a API, e o arquivo ZIP bruto. Também verifiquei o repositório local (`lib/territorios/tse-client.ts`) — a integração TSE já existente no PolitixOS cobre apenas o dataset **Resultados** (votação por município/zona), um dataset diferente de **Pesquisas Eleitorais**; não há fixture local do dataset de pesquisas para usar como referência.

**Consequência:** não tive acesso ao `leiame.pdf` (dicionário de dados oficial) nem aos cabeçalhos reais dos CSVs. Todas as respostas abaixo que dependem dessa fonte primária estão marcadas como **NÃO VERIFICADO** — não vou apresentar nomes de campo, chaves ou semântica de bairro como fato confirmado quando na verdade são inferência ou eco de resumo de busca.

## O que pude confirmar indiretamente (busca, não fonte primária)

- O Portal de Dados Abertos do TSE publica um dataset **"Pesquisas Eleitorais - 2026"** em `dadosabertos.tse.jus.br/dataset/pesquisas-eleitorais-2026`, com download em `cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip`.
- Múltiplos resumos de busca independentes (não uma fonte única) mencionam que o pacote de dados de pesquisas eleitorais do TSE inclui, além do registro principal da pesquisa: **notas fiscais**, **questionário de pesquisa**, e um recurso de **"detalhamento de bairro/município"**. Isso é um indício razoavelmente forte de que existe uma tabela relacionada de granularidade sub-municipal — mas é um eco de resumo de mecanismo de busca, não uma inspeção direta do arquivo. Não sei o nome exato do arquivo/tabela, suas colunas, nem sua semântica.
- Formato: CSV dentro de um ZIP, com um `leiame.pdf` (dicionário de dados) incluso — mencionado nos avisos padrão do portal, consistente com o padrão dos demais datasets do TSE (que também usam esse formato).
- Existe uma consulta interativa separada, `pesqele-divulgacao.tse.jus.br`, para consulta ao registro de pesquisas — não testada (mesma família de domínio bloqueada).
- Descartei uma pista falsa: **Base dos Dados** (`basedosdados.org/dataset/fb38dbe8-...`) tem um dataset chamado "Pesquisas Eleitorais", mas é compilado pelo **Poder360** (agregador de mídia de resultados de pesquisas já publicadas), não o registro oficial de metodologia/amostra do TSE — fontes diferentes, não devem ser confundidas.

## Respostas às 13 perguntas

| # | Pergunta | Resposta |
|---|---|---|
| 1 | Existe dataset estruturado de municípios/bairros por pesquisa? | **Indício indireto: provavelmente sim** (recurso "detalhamento de bairro/município" mencionado). **NÃO VERIFICADO** na fonte primária. |
| 2 | Chave de ligação com o registro principal? | **NÃO VERIFICÁVEL** sem o arquivo. (Nos outros datasets do TSE a família costuma usar um identificador de registro repetido entre tabelas relacionadas — isso é um padrão observado em *outros* datasets do TSE, não uma confirmação para este.) |
| 3 | O detalhamento representa área pesquisada / amostra / bairros pesquisados / resultado por bairro / só documentação? | **NÃO VERIFICÁVEL.** Esta é exatamente a pergunta que só o dicionário de dados real responde com segurança — não vou arriscar uma resposta aqui (ver §12 abaixo). |
| 4 | Campos (codigo_ibge, município, bairro, zona, região, localidade, nº entrevistas, % amostra)? | **NÃO VERIFICÁVEL** sem o arquivo/dicionário. |
| 5 | Bairro é nomenclatura padronizada ou texto livre? | **NÃO VERIFICÁVEL.** |
| 6 | Há duplicidade/variação de grafia? | **NÃO VERIFICÁVEL** sem inspecionar os dados reais. |
| 7 | É possível relacionar bairro à estrutura territorial do PolitixOS sem geocodificação? | **NÃO VERIFICÁVEL** — depende diretamente de #5/#6. |
| 8 | Existem coordenadas/geometria? | **NÃO VERIFICADO.** Por instrução explícita, não vou inventar — assumir ausência também seria uma afirmação não verificada; a resposta correta agora é "desconhecido". |
| 9 | CSV/tabular ou só PDF/documento? | **Indício indireto: CSV** dentro do ZIP (consistente com o padrão de todos os outros datasets do TSE no mesmo portal), com o dicionário em PDF (`leiame.pdf`) separado do dado em si. Não confirmado por inspeção direta. |
| 10 | Para MG: pesquisas com detalhamento de município / de bairro / nº de bairros por pesquisa | **NÃO VERIFICÁVEL** sem os dados. |
| 11 | Classificação SUPORTADO/PARCIAL/NÃO SUPORTADO para as 4 capacidades | Ver tabela abaixo — todas **INDETERMINADO** nesta rodada, não vou forçar uma classificação sem evidência. |
| 12 | Não confundir "pesquisa realizada nesses bairros" com "resultado eleitoral por bairro" | Concordo integralmente — e é exatamente por isso que não respondo #3/#4/#11 com base em suposição. Pesquisas eleitorais registram **onde a amostra foi coletada**, não têm por definição resultado de votação por bairro (isso seria dado do dataset de **Resultados**, outra fonte). Mas não posso nem confirmar que o detalhamento existente é de amostra e não de outra coisa sem ver o dicionário real. |
| 13 | Recomendação BAIRRO MVP-01 | **NO** — ver §Recomendação. |

### Classificação das 4 capacidades (§11)

| Capacidade | Classificação |
|---|---|
| A) Mapa de cobertura da amostra | **INDETERMINADO** — requer confirmar #1/#4/#8 |
| B) Ranking de bairros pesquisados | **INDETERMINADO** — requer confirmar #4/#5/#6 |
| C) Distribuição da amostra por bairro | **INDETERMINADO** — requer confirmar #3/#4 (existência de "quantidade de entrevistas"/"% amostra" por bairro) |
| D) Resultado por candidato por bairro | **PROVAVELMENTE NÃO SUPORTADO** — pesquisas eleitorais registram intenção de voto agregada (normalmente por UF/município, respondida pelo entrevistado), não haveria motivo metodológico para o TSE exigir declaração de resultado de intenção de voto segmentado por bairro em uma pesquisa amostral; mas mantenho como não 100% confirmado até ver o dicionário. |

## Recomendação

```
BAIRRO MVP-01: NO
```

**Motivo:** não tenho evidência de fonte primária suficiente para determinar com rigor o que a tabela de detalhamento territorial realmente representa. Lançar um MVP de "bairro" amanhã com base em suposição arrisca exatamente o erro que a pergunta #12 pede para evitar — apresentar "pesquisa foi feita neste bairro" como se fosse "resultado eleitoral por bairro", ou apresentar um campo de texto livre não normalizado como se fosse uma chave territorial confiável.

**O que pode aparecer amanhã sem induzir interpretação errada, hoje:** nada específico de bairro ainda — o discovery real está bloqueado. Se houver pressão de prazo, a opção honesta é mostrar apenas o que o dataset de **Resultados** (já integrado ao PolitixOS) comprovadamente suporta hoje — município/zona, não bairro — e rotular qualquer coisa de pesquisas eleitorais como "em investigação", não como feature pronta.

## Próximo passo necessário

Preciso de uma destas três coisas para completar o discovery real:

1. **Você baixar `pesquisa_eleitoral_2026.zip`** (funciona normalmente num navegador comum, o bloqueio parece ser específico deste ambiente sandboxado) e me passar o `leiame.pdf` + uma amostra do CSV de detalhamento de bairro/município; ou
2. **Liberar acesso de rede** a `tse.jus.br`/`cdn.tse.jus.br` neste ambiente, se isso for possível do seu lado; ou
3. Me indicar outra fonte espelhada/já baixada que eu possa inspecionar.

Assim que eu tiver o dicionário de dados real, retorno com as 13 respostas completas e a classificação SUPORTADO/PARCIAL/NÃO SUPORTADO com evidência de verdade, em vez de "indeterminado".
