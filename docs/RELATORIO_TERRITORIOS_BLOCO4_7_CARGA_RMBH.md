# Relatório — Bloco 4.7: Carga Controlada RMBH + Continuidade do Roadmap

**Data:** 2026-08-11
**Escopo:** carga real de Segurança Pública para os 34 municípios da Região Metropolitana de Belo Horizonte (RMBH), via pipeline homologado no Bloco 4.6 (n8n `mode=batch`). Definição do próximo bloco do roadmap.
**Não executado:** os demais ~819 municípios de MG fora da RMBH.

---

## 1. Identificação da RMBH (fonte oficial, não inventada)

Nenhuma coluna do schema atual (`territories.regiao`, `territories.metadata`) carrega a divisão "Região Metropolitana" — apenas a hierarquia padrão do IBGE (mesorregião/microrregião/região imediata/intermediária), que é uma classificação distinta de "Região Metropolitana" (esta é definida por lei estadual, não pelo IBGE).

**Fonte utilizada:** cruzamento de três fontes independentes —
1. Wikipédia (artigo "Região Metropolitana de Belo Horizonte"), citando **Lei Complementar Federal nº 14, de 8/6/1973** (criação) e **Leis Complementares Estaduais nº 88/2006 e nº 89/2006** (composição/regulamentação vigente);
2. Site institucional da **Agência RMBH** (agenciarmbh.mg.gov.br), confirmando "34 municípios" e a **Lei Complementar Estadual nº 107/2009** (criação da autarquia);
3. Múltiplos resultados de busca independentes (PBH, IPEA, Observatório das Metrópoles) confirmando o número de 34.

A lista nomeada (34 municípios) veio da Wikipédia — as fontes primárias (PDF da SECULT/MG, CSV do Portal de Dados Abertos da PBH) não puderam ser extraídas em texto pelas ferramentas disponíveis, mas o número e a base legal são consistentes entre todas as fontes checadas. **Validação adicional**: os 34 nomes foram cruzados contra `territories` (uf=MG) por correspondência exata de nome — **as 34 correspondências bateram sem nenhuma divergência ou ausência**, o que reforça a confiabilidade da lista.

| # | codigo_ibge | Município |
|---|---|---|
| 1 | 3105004 | Baldim |
| 2 | 3106200 | Belo Horizonte |
| 3 | 3106705 | Betim |
| 4 | 3109006 | Brumadinho |
| 5 | 3110004 | Caeté |
| 6 | 3112505 | Capim Branco |
| 7 | 3117876 | Confins |
| 8 | 3118601 | Contagem |
| 9 | 3124104 | Esmeraldas |
| 10 | 3126000 | Florestal |
| 11 | 3129806 | Ibirité |
| 12 | 3130101 | Igarapé |
| 13 | 3132206 | Itaguara |
| 14 | 3133709 | Itatiaiuçu |
| 15 | 3134608 | Jaboticatubas |
| 16 | 3136652 | Juatuba |
| 17 | 3137601 | Lagoa Santa |
| 18 | 3140159 | Mário Campos |
| 19 | 3140704 | Mateus Leme |
| 20 | 3141108 | Matozinhos |
| 21 | 3144805 | Nova Lima |
| 22 | 3136603 | Nova União |
| 23 | 3149309 | Pedro Leopoldo |
| 24 | 3153905 | Raposos |
| 25 | 3154606 | Ribeirão das Neves |
| 26 | 3154804 | Rio Acima |
| 27 | 3155306 | Rio Manso |
| 28 | 3156700 | Sabará |
| 29 | 3157807 | Santa Luzia |
| 30 | 3162922 | São Joaquim de Bicas |
| 31 | 3162955 | São José da Lapa |
| 32 | 3165537 | Sarzedo |
| 33 | 3168309 | Taquaraçu de Minas |
| 34 | 3171204 | Vespasiano |

---

## 2. Pré-check (Fase 1)

```
RMBH TOTAL: 34
JÁ COLETADOS: 3 (Belo Horizonte, Contagem, Itaguara — coletados em Blocos 4.4/4.5/4.6)
PENDENTES: 31
BATCHES NECESSÁRIOS: 7 (6 de 5 + 1 de 1)
```

Os 3 já coletados **não foram reenviados** — a fila foi montada só com os 31 pendentes.

---

## 3-4. Execução controlada e monitoramento

Como não há, nas ferramentas disponíveis nesta sessão, controle interativo para pausar uma execução do n8n no meio do processamento, a validação "observar o primeiro lote antes de continuar" foi feita com duas execuções separadas e reais (mesmo padrão usado no Bloco 4.6):

**Execução 1 (primeiro lote, 5 municípios pendentes)** — `mg_run_id=c57caeb6-...`: Baldim, Betim, Brumadinho, Caeté, Capim Branco. Resultado real: **5/5 `completed`**, 770 indicadores (154/município), `request_id` compartilhado, 1 download, **18,3 s totais**, sem timeout. Verificado fisicamente no Supabase antes de prosseguir: 154 indicadores/município, sem duplicação.

**Validação do primeiro lote (todos os critérios do Bloco 4.6):**
- 5/5 `completed` ✓
- 154 indicadores/município ✓
- sem duplicação ✓
- tempo do lote: 12,2 s (medido pela API) / 18,3 s (execução n8n completa) — bem abaixo de `maxDuration=60` ✓
- checkpoint correto (`total_batches:1, completed_batches:1`) ✓
- gravação correta no Supabase ✓

**Execução 2 (demais 26 pendentes, continuação automática)** — `mg_run_id=8cdf2f07-...`: Confins, Esmeraldas, Florestal, Ibirité, Igarapé, Itatiaiuçu, Jaboticatubas, Juatuba, Lagoa Santa, Mário Campos, Mateus Leme, Matozinhos, Nova Lima, Nova União, Pedro Leopoldo, Raposos, Ribeirão das Neves, Rio Acima, Rio Manso, Sabará, Santa Luzia, São Joaquim de Bicas, São José da Lapa, Sarzedo, Taquaraçu de Minas, Vespasiano — em **6 lotes sequenciais** (5×5 + 1×1). Resultado real: **26/26 `completed`**, 4.004 indicadores, **66,4 s totais**, `batch_number` 1 a 6 corretos e sequenciais (timestamps reais confirmam ausência de paralelismo — cada lote só inicia após o anterior terminar + espera), **0 falhas, 0 retries, 0 timeouts**.

Nenhuma anomalia (timeout recorrente, erro estrutural, duplicação, corrupção de checkpoint) foi observada em nenhum dos 7 lotes — a carga prosseguiu integralmente, conforme autorizado pelo comportamento saudável do primeiro lote.

---

## 5. Validação final (Fase 4) — Supabase, fisicamente

```sql
-- 34 municípios RMBH × territory_indicators (categoria seguranca_publica)
rmbh_total: 34 | com_indicadores: 34 | sem_indicadores: 0
total_indicadores: 5236 (34 × 154, sem exceção)
duplicação: n_rows = n_ids_distintos = 5236 → diferença = 0
```

```
RMBH TOTAL: 34
PROCESSADOS NESTA RODADA: 31
JÁ EXISTENTES E IGNORADOS: 3
COMPLETED: 31/31 (nesta rodada) — 34/34 (RMBH completa)
FAILED: 0
TOTAL DE INDICADORES: 5.236 (34 municípios × 154)
TOTAL DE BATCHES: 7
TEMPO TOTAL: 84,7 s (execução 1: 18,3 s + execução 2: 66,4 s — só o tempo de execução do workflow, não conta pesquisa/pré-check)
TEMPO MÉDIO/BATCH: ~12,1 s
TEMPO MÉDIO/MUNICÍPIO: ~2,73 s (84,7 s ÷ 31 processados)
DUPLICAÇÕES: NÃO
CHECKPOINT: OK
RETRY: 0
TIMEOUTS: 0
```

**Nenhum município terminou diferente de `completed`** — não há lista de pendências/falhas a reportar.

---

## 6. Não execução dos 853

Conforme instruído, a carga **parou ao final da RMBH**. O restante de MG será tratado em grupos/lotes progressivos futuros, sem bloquear o desenvolvimento dos próximos blocos.

---

## 7. Continuidade — próximo bloco do roadmap

O desenho original do módulo (Bloco 1 — Fundação) já previa o schema (`territory_indicators.fonte`, `territory_collection_runs.source`) para múltiplos motores: **`ibge` (feito) | `datasus` | `seguranca` (feito) | `tse` | `siconfi` | `perplexity` | `noticias`**. Motor IBGE e Motor Segurança Pública estão implementados, homologados e agora com dados reais carregados (RMBH completa). Os próximos candidatos, na mesma arquitetura já validada (fonte pública → coletor dedicado → endpoint próprio → orquestrador n8n → `mode=batch` → checkpoint), são:

| Candidato | Dado | Relevância para o MVP |
|---|---|---|
| **TSE** | Histórico eleitoral por município (votação, comparecimento, resultados por cargo) | **Alta** — dado eleitoral é central para uma ferramenta de monitoramento político/campanha, complementa diretamente o Dossiê Territorial |
| **SICONFI** | Dados fiscais/orçamentários municipais | Média-alta — relevante para análise de capacidade de gestão municipal |
| **DATASUS** | Indicadores de saúde pública municipal | Média — relevante, mas mais distante do núcleo político-eleitoral do produto |

**Recomendação:** iniciar o **Motor TSE** como próximo bloco (proposto: Bloco 5.1 — Fontes e Mapeamento TSE), pelo mesmo motivo estratégico que priorizou Segurança Pública antes de DATASUS/SICONFI — dado eleitoral é o mais diretamente acionável para o caso de uso central do PolitixOS.

**Escopo proposto (Bloco 5.1):**
- Mapear fonte oficial de dados eleitorais (TSE — Repositório de Dados Eleitorais, `dadosabertos.tse.jus.br`), granularidade municipal, cargos relevantes (prefeito, vereador, e possivelmente estadual/federal por município de domicílio eleitoral).
- Definir indicadores derivados (ex.: comparecimento, abstenção, votação por partido/coligação, resultado por cargo) seguindo o mesmo padrão de `categoria`/`indicador`/`periodo_inicio`/`periodo_fim` já usado nos Motores IBGE e Segurança.
- Nenhuma implementação de coleta neste próximo bloco inicial — só mapeamento e desenho de contrato (mesmo padrão do Bloco 4.1 para Segurança).

**Dependências:** nenhuma dependência da carga restante dos 853 municípios de MG — o Motor TSE pode ser desenvolvido e homologado em paralelo, usando a mesma amostra de municípios já testada (RMBH ou amostras determinísticas), sem qualquer bloqueio.

**Riscos antecipados:** volume de dados do TSE pode ser maior (múltiplos pleitos/anos/cargos por município); formato de origem (CSV compactado por UF, não por município) pode exigir uma estratégia de download/cache diferente da usada para SEJUSP-MG — a avaliar no bloco de mapeamento.

**Gate do Bloco 5.1 (proposto, a confirmar quando autorizado):** fonte de dados identificada e documentada; contrato de indicadores definido; nenhuma coleta real executada; nenhuma alteração de schema sem justificativa.

**Restrição confirmada e respeitada:** nenhuma mudança na camada de UX/apresentação do Dossiê Territorial ou na experiência visual da análise Politix IA foi feita ou é proposta neste ou no próximo bloco — o trabalho permanece 100% concentrado em backend, motores territoriais, dados, integrações e infraestrutura, conforme instruído (Antigravity segue responsável pela camada visual).

Como o próximo bloco proposto (Motor TSE, fase de mapeamento) não depende da carga restante de MG nem da camada de UX, **o projeto está liberado para seguir**.

---

## 8. Gate final

```
RMBH IDENTIFICADA: SIM (fonte: Wikipédia + Agência RMBH + validação cruzada com territories, 34/34 municípios confirmados)
PRÉ-CHECK EXECUTADO: SIM
MUNICÍPIOS JÁ EXISTENTES IGNORADOS: 3 (Belo Horizonte, Contagem, Itaguara)
MUNICÍPIOS PROCESSADOS: 31
BATCH SIZE: 5
CONCURRENCY: 1
PRIMEIRO BATCH VALIDADO ANTES DA CONTINUAÇÃO: SIM (5/5 completed, 154 indicadores/município, sem duplicação, 18,3s, sem timeout, checkpoint OK)
CARGA RMBH CONCLUÍDA: SIM (34/34 municípios com dados de segurança pública)
SUPABASE VALIDADO: SIM (fisicamente, 5.236 indicadores, 0 duplicação)
DUPLICAÇÃO: NÃO
CHECKPOINT: OK
SEGURO PARA CONTINUAR CARGAS PROGRESSIVAS: SIM
853 MUNICÍPIOS EXECUTADOS: NÃO
PRÓXIMO BLOCO: Bloco 5.1 — Fontes e Mapeamento do Motor TSE (dados eleitorais municipais), somente mapeamento/contrato, sem coleta real
LIBERADO PARA PRÓXIMO BLOCO: SIM
```

**Parando aqui, conforme instruído, aguardando avaliação deste relatório antes de qualquer carga territorial adicional.**
