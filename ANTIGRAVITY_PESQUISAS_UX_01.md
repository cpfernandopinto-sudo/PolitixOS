# PESQUISAS-UX-01 — Inteligência Metodológica e Redesign da Ficha de Pesquisa

**Status:** PASS · **Data:** 2026-08-19  
**Workspace:** `/Users/fernandooliveirapinto/Developer/PolitixOS` (branch `main`)

---

## 1. Resumo da Entrega

A tela de detalhe de uma Pesquisa Eleitoral (`/dashboard/pesquisas/[id]`) no PolitixOS passou por um redesign completo de UX e visual, evoluindo de uma listagem em coluna única com grandes blocos textuais para uma **Ficha de Inteligência Eleitoral** estruturada em um grid principal de **12 colunas**, dividida em cartões executivos e módulos com expansão sob demanda.

Adicionalmente, foi desenvolvido um **Parser Conservador de Metadados Metodológicos** (`lib/pesquisas/parser.ts`) capaz de extrair dados das descrições em texto livre do TSE (`DS_PLANO_AMOSTRAL`, `DS_METODOLOGIA_PESQUISA`, `DS_SISTEMA_CONTROLE`, `DS_DADO_MUNICIPIO`) preservando a regra fundamental do PolitixOS:

> **Regra Fundamental Preservada:** Diferenciação estrita entre Dado Estruturado do TSE, Dado Extraído Conservadoramente do Texto e Dado Indisponível. Nenhuma suposição incerta vira dado factual.

---

## 2. Antes vs. Depois

| Aspecto | Antes | Depois (PESQUISAS-UX-01) |
|---|---|---|
| **Arquitetura Visual** | 1 coluna única estreita (`max-w-3xl`) com muito espaço vazio nas laterais | Grid principal de 12 colunas (`max-w-7xl`), aproveitando toda a largura da tela desktop |
| **Metodologia** | Paredão de texto corrido em bloco gigante | Resumo executivo em chips visuais (Tipo, Método, Público, Abrangência, Ponderação) + "Ver metodologia completa" expandível |
| **Plano Amostral** | Texto longo corrido misturando margem de erro, confiança e amostragem | Gráficos visuais de Perfil da Amostra (mini barras horizontais com percentuais) para Sexo, Idade, Escolaridade e Renda + fallback com botão para ver texto original |
| **Margem de Erro & Confiança** | Ocultas ou perdidas no texto livre quando não presentes em colunas atômicas | Destacadas no Resumo com badges indicando origem ("Dado estruturado" vs "Extraído do texto" vs "Não disponível") |
| **Controle de Qualidade** | Texto livre corrido | Painel de Auditoria de Campo com checkmarks (✓) exclusivamente para itens fundamentados no registro (Estatístico/CONRE, checagem %, consistência) |
| **Qualidade & Representatividade** | Ausente | Painel de características técnicas objetivas da amostragem (sem atribuição de notas, rankings ou julgamentos morais) |
| **Cobertura Territorial** | Oculta ou confusa | Painel dedicado tratando explicitamente a pendência regimental de anexação (Res. TSE nº 23.600/2019 art. 2º §7º) |
| **Proveniência & Auditoria** | Link simples ao rodapé | Rodapé de auditoria com metadados de geração do TSE, timestamp de ingestão, link direto e modais para inspeção do JSON bruto original |

---

## 3. Arquivos Alterados e Componentes Criados

### Modelos de Dados e Repositório
- **`lib/pesquisas/types.ts`**: Adicionado campo `rawSourceRow` ao modelo `ElectoralPoll` e definidos os tipos `ExtractedValue<T>`, `SampleProfileItem` e `ExtractedPollMetadata`.
- **`lib/pesquisas/repository.ts`**: Atualizado `mapPollRow` para incluir o mapeamento de `raw_source_row`.

### Parser de Inteligência Metodológica (Novo)
- **`lib/pesquisas/parser.ts`**: Conjunto de funções determinísticas e conservadoras de extração baseadas em regex e análise gramatical semântica.
- **`lib/pesquisas/parser.test.ts`**: Suíte de 9 testes unitários cobrindo todos os cenários de extração, fallback e borda.

### Componentes de UI (Novos)
- **`app/dashboard/pesquisas/[id]/components/PollHeader.tsx`**: Cabeçalho executivo com protocolo TSE, instituto, cargo, UF/UE e badges (`OFICIAL TSE`, `PESQUISA PRÓPRIA`, `RESULTADOS DISPONÍVEIS/PENDENTES`).
- **`app/dashboard/pesquisas/[id]/components/PollSummaryCards.tsx`**: 6 cards compactos (Amostra, Campo, Divulgação, Valor, Margem de Erro, Confiança).
- **`app/dashboard/pesquisas/[id]/components/PollSampleProfile.tsx`**: Mini barras horizontais para Sexo, Idade, Escolaridade e Renda ou fallback para texto não estruturado com sanfona.
- **`app/dashboard/pesquisas/[id]/components/PollMethodologySection.tsx`**: Quadro resumo de metodologia e toggle para expansão do texto original.
- **`app/dashboard/pesquisas/[id]/components/PollQualityRepresentativeness.tsx`**: Painel de características da amostragem sem score ou nota moral.
- **`app/dashboard/pesquisas/[id]/components/PollQualityControl.tsx`**: Estatístico responsável, registro CONRE e pontos de auditoria de campo com checkmarks.
- **`app/dashboard/pesquisas/[id]/components/PollTerritorialCoverage.tsx`**: Detalhamento territorial ou aviso padronizado de complementação regimental.
- **`app/dashboard/pesquisas/[id]/components/PollResultsSection.tsx`**: Área preservada para intenção de voto com empty state honesto quando não integrado.
- **`app/dashboard/pesquisas/[id]/components/PollFooterAuditing.tsx`**: Rodapé de proveniência com timestamps e modais para inspeção dos dados originais (JSON e Metodologia).

### Tela Principal
- **`app/dashboard/pesquisas/[id]/page.tsx`**: Reestruturada no layout 12 colunas consumindo os metadados do parser.

---

## 4. Parser Criado e Campos Extraídos

O parser (`lib/pesquisas/parser.ts`) executa extrações determinísticas com nível de confiança e indicação de origem:

1. **`marginError`**: Extrai margem de erro estimada em percentual (ex.: `2,19%`) de `DS_PLANO_AMOSTRAL`.
2. **`confidenceLevel`**: Extrai nível/intervalo de confiança (ex.: `95%`) de `DS_PLANO_AMOSTRAL`.
3. **`genderDistribution`**: Reconhece distribuições percentuais por sexo/gênero (ex.: Masculino 48.2%, Feminino 51.8%).
4. **`ageDistribution`**: Agrupa faixas etárias e percentuais (ex.: 16-24, 25-34, 35-44, 45-59, 60+).
5. **`educationDistribution`**: Mapeia níveis de instrução (Fundamental, Médio, Superior).
6. **`incomeDistribution`**: Mapeia faixas de renda em salários mínimos.
7. **`collectionType`**: Mapeia o tipo de entrevista (Presencial Domiciliar, Presencial Ponto de Fluxo, Telefônica CATI, Digital).
8. **`samplingMethod`**: Mapeia a amostragem (PPT, Quotas, Conglomerados, Estratificada, Probabilística).
9. **`qualityControl`**: Extrai estatístico responsável, registro CONRE, percentual de checagem/fiscalização auditado (ex.: 20%) e procedimentos de consistência.
10. **`territorialCoverage`**: Identifica se há lista de bairros ou se a pesquisa se enquadra no aviso de anexação posterior da Resolução TSE nº 23.600/2019 art. 2º §7º.

---

## 5. Fallbacks e Isenção Moral

- **Sem score/rating:** O PolitixOS não calcula nota de 0 a 10 nem classifica institutos como "bons" ou "ruins". O painel de representatividade foca estritamente em apresentar as propriedades declaradas da amostra.
- **Detalhamento não estruturado:** Quando um campo do plano amostral está em prosa ambígua sem percentuais atômicos, o sistema exibe a mensagem *"Detalhamento não estruturado no registro"* e disponibiliza o texto oficial completo para consulta sem inventar dados.
- **Cobertura territorial:** Quando `DS_DADO_MUNICIPIO` refere-se à anexação posterior regimental, o sistema exibe *"Detalhamento territorial previsto para complementação do registro"*, evitando inventar bairros fictícios.
- **Resultados de Intenção de Voto:** Mantém o aviso *"Resultados divulgados ainda não integrados para esta pesquisa"* quando a tabela `electoral_poll_results` estiver vazia.

---

## 6. Resultados de Validação e Testes

```
VITEST (lib/pesquisas): PASS (49/49 testes passados)
TYPECHECK (tsc):         PASS (0 erros)
NEXT.JS BUILD:          PASS (Compiled & static/dynamic routes generated)
```

---

## 7. Limitações Conhecidas

- **Formato heterogêneo do TSE:** Como a descrição de `DS_PLANO_AMOSTRAL` é preenchida em texto livre por centenas de institutos diferentes no Brasil, o parser opera de forma conservadora. Textos muito informais continuam sendo exibidos via fallback no formato original completo.
- **Resultados de intenção de voto:** Não constam no dataset de registros do TSE (PesqEle registra apenas a metodologia); a área de resultados permanece preparada para a integração da frente paralela.

---

**NÃO FAZER PUSH. NÃO FAZER DEPLOY. PRONTO PARA VALIDAÇÃO VISUAL.**
