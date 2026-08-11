# POLITIX TERRITÓRIOS — Bloco 3.1: Implantação Real do Workflow n8n — Motor IBGE

**Sprint 11 · Relatório técnico**
**Base:** Blocos 1, 2, 2.5 e 3, homologados. `project_ref` Supabase confirmado: `hhhwuajptkyposarfbzn`.
**Status:** workflow real criado e testado no n8n. **Inativo por decisão técnica** (não por impedimento de acesso) — ver Seção 6.

---

## 1. Acesso ao n8n confirmado

Diferente da sessão do Bloco 3, o MCP do n8n estava autorizado nesta sessão. Confirmado via `search_workflows`, que listou 12 workflows reais da conta, incluindo vários do PolitixOS e também de **outros clientes da mesma conta** (`Biotech Compras - Cotacao Inteligente IA`, `Atualizar Datas Omie (Logística)`, `chatboot pmc`, `Backup - Brudam...`) — mesma situação de conta compartilhada multi-cliente já observada no Supabase (Bloco 2.5). Nenhuma ação foi tomada sobre workflows de outros clientes.

## 2. Auditoria — workflow equivalente já existia?

`search_workflows` com as queries "territ" e "IBGE" retornou **0 resultados** — confirmado que não existia nenhum workflow de Territórios/IBGE antes deste bloco. Nenhum duplicado foi criado.

## 3. ACHADO CRÍTICO DE SEGURANÇA (pré-existente, não criado por este bloco)

Ao auditar o workflow **"PolitixOS - Investigação Profunda v3"** (`WNxhZHqesWZsRdXnghtjH`) — o único workflow PolitixOS com um padrão de webhook + chamada de API comparável ao que este bloco precisava construir — encontrei:

- A chave `service_role` do Supabase **em texto puro**, repetida em pelo menos 8 nós HTTP Request diferentes (headers `apikey` e `Authorization: Bearer`).
- A chave da API da OpenAI **em texto puro**, em 2 nós.
- A chave da API da Perplexity **em texto puro**, em 1 nó.
- Um segredo de autenticação do próprio webhook (`x-api-key`) **hardcoded dentro de um node de Code** (`const EXPECTED_KEY = '...'`), em vez de usar uma Credential do n8n.

**Nenhum desses valores foi reproduzido neste relatório, no workflow novo, ou em qualquer arquivo do repositório.** Não alterei o workflow "Investigação Profunda v3" (fora do escopo deste bloco e a instrução foi explícita: não alterar workflows existentes sem necessidade).

**Recomendação urgente, para ação humana separada:**
1. Rotacionar a chave `service_role` do Supabase, a chave da OpenAI e a chave da Perplexity usadas nesse workflow.
2. Migrar esse workflow para usar Credentials do n8n (Supabase credential nativa, `httpHeaderAuth`/`httpBearerAuth` para OpenAI/Perplexity) em vez de valores fixos nos nós.
3. Tratar isso com prioridade equivalente à do achado de RLS desabilitado do Bloco 2.5 — é exposição de credencial de bypass total do banco de produção.

Este achado **não foi replicado** no Motor IBGE: todos os segredos do workflow novo usam Credentials do n8n (Seção 5).

## 4. Workflow criado

- **Nome:** `POLITIX TERRITÓRIOS — IBGE`
- **ID:** `90k1yrgKsW7awDPb`
- **URL:** `https://n8n.srv1271569.hstgr.cloud/workflow/90k1yrgKsW7awDPb`
- **Projeto:** pessoal (Fernando Pinto) — a instância não tem projetos de equipe habilitados, então não havia escolha de pasta/projeto a fazer.
- **Nós:** 10 (Webhook, Validar Payload, Payload Válido?, Chamar PolitixOS, Montar Resposta Final, Responder - Resultado, Responder - Payload Inválido, Tratar Erro de Conexão, Responder - Erro Upstream, Sticky Note de arquitetura).

## 5. Arquitetura final

```
Webhook (POST, Header Auth) → Validar Payload (Code) → Payload Válido?
  ├── FALSO → Responder - Payload Inválido (400 ou 403 se mode=national)
  └── VERDADEIRO → Chamar PolitixOS (HTTP Request, Header Auth)
        ├── sucesso/HTTP → Montar Resposta Final (Code) → Responder - Resultado (200)
        └── erro de conexão/timeout → Tratar Erro de Conexão (Code) → Responder - Erro Upstream (502)
```

**Divisão de responsabilidades (Seção 2 do briefing) respeitada:** o n8n só orquestra — recebe, valida forma do payload, repassa. **Nenhuma lógica de chamada ao IBGE, normalização ou persistência foi duplicada dentro do n8n.** Toda essa regra continua vivendo exclusivamente em `runIbgeCollection` (PolitixOS), chamada via `/api/territorios/ibge/collect`. O n8n nunca acessa o Supabase diretamente.

**Validação de payload** (node "Validar Payload"): `request_id` opcional (repassado se vier, o PolitixOS gera se ausente — mesmo contrato do Bloco 3), `mode` obrigatório (`single`|`uf`), `uf` obrigatório quando `mode=uf`, `codigo_ibge` obrigatório quando `mode=single`, **`mode=national` explicitamente rejeitado com 403** — bloqueio em duas camadas (n8n E o próprio endpoint PolitixOS já bloqueia de novo), redundante de propósito.

## 6. Autenticação utilizada

- **Entrada (Webhook):** `authentication: 'headerAuth'`, credencial nativa do n8n (tipo `httpHeaderAuth`) — não código customizado de validação (diferente do padrão encontrado em Investigações, Seção 3).
- **Saída (Chamar PolitixOS):** `authentication: 'genericCredentialType'`, `genericAuthType: 'httpHeaderAuth'`, credencial nativa do n8n enviando o header `x-territorios-secret` — **lido diretamente do código-fonte atual de `app/api/territorios/ibge/collect/route.ts`** antes de configurar o nó (nome do header, contrato do body, códigos HTTP), não só do relatório do Bloco 3, conforme exigido.

**Segredos hardcoded:** **NENHUM.** Ambos os pontos usam `newCredential(...)` do SDK do n8n — a ferramenta MCP disponível **não expõe criação de credencial com valor de segredo** (por design de segurança: nenhuma ferramenta neste MCP escreve segredos, só referencia credenciais existentes ou cria o "slot" a ser preenchido). Isso significa que **a única etapa manual que restou é o usuário abrir os 2 nós no editor do n8n e criar/vincular uma credencial Header Auth em cada um** — não é "montar o workflow manualmente", é a etapa de entrada de segredo que nenhuma ferramenta automatizada deveria fazer por você mesmo se pudesse.

Ação necessária no n8n (2 credenciais, ~1 minuto cada):
1. Node **"Webhook - Solicitacao de Coleta"** → campo Credential → criar credencial tipo *Header Auth* → Nome do header: escolha livre (ex. `x-territorios-webhook-secret`) → Valor: uma string aleatória forte.
2. Node **"Chamar PolitixOS - Coletar IBGE"** → campo Credential (Header Auth) → Nome do header: **`x-territorios-secret`** (obrigatório, é o que a rota valida) → Valor: **o mesmo valor** que será configurado como `TERRITORIOS_IBGE_CALLBACK_SECRET` no ambiente do PolitixOS (Vercel).

## 7. Tratamento de erros

| Cenário | Camada | Resultado |
|---|---|---|
| `mode` ausente/inválido | n8n (Validar Payload) | 400, `INVALID_MODE`, sem chamar o PolitixOS |
| `mode=uf` sem `uf` / `mode=single` sem `codigo_ibge` | n8n (Validar Payload) | 400, `MISSING_UF`/`MISSING_CODIGO_IBGE` |
| `mode=national` | n8n (Validar Payload) | 403, `NATIONAL_LOAD_BLOCKED` — bloqueado antes de chamar o PolitixOS |
| Erro de conexão/timeout ao chamar o PolitixOS | n8n (branch de erro do HTTP Request, `onError: continueErrorOutput`) | 502, `overall_status: 'failed'`, mensagem de erro, sem crash da execução |
| PolitixOS responde HTTP não-2xx (401/403/422/429/5xx) | n8n (`neverError: true` + "Montar Resposta Final") | Resposta estruturada com `overall_status` deduzido, `response_status_code` refletindo o status real — não retry cego |
| PolitixOS responde sucesso mas com falhas parciais (`itemsFailed`/`itemsDiscarded` > 0) | n8n ("Montar Resposta Final") | `overall_status: 'partial'`, números reais repassados |
| PolitixOS responde sucesso total | n8n | `overall_status: 'completed'` |

**Retry:** não implementado como retry automático no nó HTTP (decisão consciente, documentada como pendência na Seção 11) — a resiliência a erros transitórios do IBGE em si já está implementada e testada no lado PolitixOS (`lib/territorios/ibge-client.ts`, Bloco 3); o salto n8n→PolitixOS roda sobre infraestrutura estável (não uma API terceira instável), então um retry dedicado aqui tem valor marginal menor. Nada de retry infinito em nenhum ponto.

## 8. Resultado do teste — Contagem

Testado via `test_workflow` (execução real dentro do n8n, com o nó HTTP Request "pinado" simulando a resposta que o PolitixOS real já devolveu para Contagem no Bloco 3 — `population_total` = 651.718, idêntico ao dado real gravado em produção):

```
Execução 24918 — mode=single, codigo_ibge=3118601
Payload Válido? → branch VERDADEIRO (após correção, ver Seção 9)
Resposta final: { response_status_code: 200, overall_status: "completed",
  request_id: "test-contagem-001", mode: "single", uf: "MG",
  items_expected: 1, items_received: 1, items_persisted: 1,
  items_discarded: 0, items_failed: 0 }
```

**Nota de transparência:** este teste comprova que a **lógica do workflow** (validação, branching, formatação de resposta) está correta usando o valor real de população que o PolitixOS já persistiu de verdade no Bloco 3. Não é uma chamada de rede real fim-a-fim n8n→PolitixOS→IBGE→Supabase nesta execução específica — isso depende do deploy (Seção 12/16). "Nenhuma duplicação em `territories`/`territory_indicators`" e "novo `collection_run` criado" continuam garantidos pela mesma implementação `runIbgeCollection` já testada e validada em produção no Bloco 3 (853/853 municípios, idempotência comprovada em 2 execuções) — este bloco não mudou essa lógica.

## 9. Resultado do teste — Minas Gerais

```
Execução 24919 — mode=uf, uf=MG (simulando o resultado real do Bloco 3: 853/853)
Resposta final: { response_status_code: 200, overall_status: "completed",
  request_id: "test-mg-001", mode: "uf", uf: "MG",
  items_expected: 853, items_received: 853, items_persisted: 853,
  items_discarded: 0, items_failed: 0 }
```

Bate exatamente com os números reais já obtidos no Bloco 3 (`itemsExpected: 853, itemsReceived: 853, itemsPersisted: 853, itemsDiscarded: 0, itemsFailed: 0`).

**Bug real encontrado e corrigido durante o teste:** a primeira execução (24917) revelou que a condição do node "Payload Válido?" (`type: 'boolean', operation: 'equal'`) avaliava **sempre falso**, mesmo com `valid: true` — o workflow inteiro cairia no branch de erro para toda requisição válida. Troquei para comparação `type: 'string', operation: 'equals'` com `typeValidation: 'loose'` (padrão documentado no SDK do n8n para esse tipo de cast) e testei de novo — confirmado corrigido (execução 24918 em diante, Seção 8). Registrado aqui porque é exatamente o tipo de bug que só um teste real (não só a criação do workflow) detecta — reforça por que os testes desta seção foram executados de verdade, não assumidos.

Testes adicionais executados (todos passando):
- **Payload inválido** (sem `mode`) → 400, `INVALID_MODE` (execução 24920).
- **`mode=national`** → 403, `NATIONAL_LOAD_BLOCKED` (execução 24921).
- **Resultado parcial simulado** (uf=SP, `itemsFailed=2`, `itemsDiscarded=3`) → `overall_status: "partial"` corretamente deduzido (execução 24922).

## 10. Dados antes/depois, idempotência, collection_runs

Sem mudança em relação ao Bloco 3 — este bloco **não tocou dados**, apenas construiu e testou o orquestrador n8n (que ainda não pode alcançar produção de verdade, Seção 12). Números reais e validados no Supabase de produção continuam sendo os do Bloco 3:

```
territories (uf=MG):            853 → 853 (2ª execução real, zero duplicação)
territory_indicators (uf=MG):   853 → 853 (zero duplicação, UPDATE em vez de INSERT)
territory_collection_runs:      855 → 1.708 (cresce por design — log de eventos)
```

## 11. Indicadores IBGE

Sem mudança — apenas `populacao_total` (IBGE/SIDRA 6579), como no Bloco 3. Este bloco não adicionou nem alterou indicadores.

## 12. Alteração necessária no PolitixOS

**Nenhuma alteração de código foi feita neste bloco** (confirmado: `git status` mostra exatamente os mesmos arquivos pendentes do Bloco 3, nenhum novo). Duas ações de **configuração** (não código) ficam pendentes, fora do escopo autorizado deste bloco (deploy proibido):

1. Fazer deploy do branch atual (com `app/api/territorios/ibge/collect/route.ts`) para que a URL real passe a existir em produção.
2. Configurar `TERRITORIOS_IBGE_CALLBACK_SECRET` no ambiente de produção (Vercel), com o **mesmo valor** colocado na credencial do node "Chamar PolitixOS" (Seção 6).

Só depois dessas duas ações a chamada n8n→PolitixOS deste workflow terá um destino real para acertar.

## 13. Riscos encontrados

1. **Segredos hardcoded no workflow "Investigação Profunda v3"** — crítico, pré-existente, detalhado na Seção 3. Ação humana necessária (rotação de chaves).
2. **Bug de condição booleana no IF do n8n** — encontrado e corrigido durante este bloco (Seção 9); registrado como lição para workflows futuros: preferir comparação `string`/`equals` com `typeValidation: loose` em vez de `boolean`/`equal` neste ambiente n8n, até confirmar a causa raiz exata do operador booleano.
3. **Estado de autenticação do webhook até a credencial ser criada** — com `authentication: 'headerAuth'` configurado mas nenhuma credencial ainda vinculada, não pude confirmar empiricamente (sem acionar o webhook de produção publicamente) se o n8n rejeita todas as chamadas nesse estado intermediário ou se há alguma janela de comportamento inesperado. Recomendo que, ao criar a credencial (Seção 6), o usuário faça um teste manual simples (uma chamada sem header, esperando 403) antes de considerar o webhook pronto para uso real.
4. **Retry não implementado no salto n8n→PolitixOS** — ver Seção 7/11, aceito como simplificação v1.

## 14. Pendências

- Deploy do endpoint + configuração do env var (Seção 12) — bloqueado por instrução explícita deste bloco, não por limitação técnica.
- Criar as 2 credenciais Header Auth no n8n (Seção 6).
- Preencher a URL real no node "Chamar PolitixOS" (hoje é um `placeholder()`).
- Validar o webhook com uma chamada HTTP real de ponta a ponta assim que as duas pendências acima forem resolvidas — só então "CONTAGEM VIA N8N"/"MG VIA N8N" poderão ser testados com tráfego de rede real (hoje testados com pin data, Seção 8/9).
- Rotação das chaves expostas em "Investigação Profunda v3" (Seção 3) — recomendo tratar como prioridade separada, não faz parte do escopo de Territórios.
- Ativação do workflow (Seção 15/16) — deixado inativo por decisão técnica, não por erro.

---

## ATIVAÇÃO DO WORKFLOW — decisão

O briefing autorizou ativar o workflow **se** ele estivesse "seguro, consistente" e os testes passassem. Os testes de lógica passaram integralmente (Seções 8–9). Mesmo assim, **optei por deixá-lo inativo**, por dois motivos concretos, não por excesso de cautela genérica:

1. A URL de destino (`Chamar PolitixOS`) é um placeholder — ativar não haveria diferença prática hoje (qualquer chamada real cairia no branch de erro 502), mas ativar antes da URL e das credenciais existirem cria uma falsa sensação de "pronto para uso".
2. Não pude confirmar empiricamente como o n8n se comporta com `headerAuth` configurado e credencial ainda não vinculada (Seção 13, risco 3) — prefiro que isso seja confirmado com um teste manual pelo usuário no momento em que a credencial for criada, antes de expor o webhook publicamente como ativo.

Ativar é uma ação de 1 clique no editor do n8n assim que as pendências da Seção 14 forem resolvidas — não fica bloqueado tecnicamente, só não foi acionado agora.

---

## ATUALIZAÇÃO PARA O NOTION

**Sprint 11 — itens concluídos (Bloco 3.1):**
- [x] Acesso ao n8n confirmado e auditado (12 workflows reais, nenhum duplicado de Territórios/IBGE).
- [x] Achado crítico de segurança reportado: segredos hardcoded em "Investigação Profunda v3" (ação humana pendente).
- [x] Workflow real `POLITIX TERRITÓRIOS — IBGE` criado no n8n (ID `90k1yrgKsW7awDPb`), 10 nós, arquitetura orquestrador-fino sem duplicar lógica de persistência.
- [x] Autenticação via Credentials nativas do n8n nos dois pontos (webhook de entrada e chamada de saída), zero segredo hardcoded no workflow novo.
- [x] Testes reais executados dentro do n8n (5 execuções): Contagem, MG (853/853), payload inválido, mode=national bloqueado, resultado parcial — todos corretos.
- [x] Bug real de condição booleana encontrado e corrigido durante o teste.
- [x] `tsc` e suíte de testes (245/245) confirmados sem regressão — nenhum código do PolitixOS alterado.

**Itens parciais:**
- [~] Workflow criado e testado, mas **inativo** e com URL placeholder — decisão técnica documentada, não um bloqueio.

**Itens pendentes:**
- [ ] Deploy do endpoint `/api/territorios/ibge/collect` em produção.
- [ ] Configurar `TERRITORIOS_IBGE_CALLBACK_SECRET` no Vercel.
- [ ] Criar as 2 credenciais Header Auth no n8n e preencher a URL real.
- [ ] Teste de ponta a ponta com tráfego de rede real (não pin data).
- [ ] Ativar o workflow.
- [ ] Rotacionar as 3 chaves expostas em "Investigação Profunda v3" e migrar esse workflow para Credentials.
- [ ] Motor DATASUS, Segurança, TSE, SICONFI, Perplexity, Notícias — não iniciados.

---

## QUADRO FINAL

```
N8N ACESSÍVEL:                          SIM
WORKFLOW IBGE EXISTENTE ANTES DO BLOCO:  NÃO
WORKFLOW IBGE CRIADO:                   SIM
WORKFLOW ID:                            90k1yrgKsW7awDPb
WORKFLOW ATIVO:                         NÃO (decisão técnica — ver seção "Ativação do Workflow")
WEBHOOK CONFIGURADO:                    SIM (POST /territorios/ibge/collect, Header Auth)
AUTENTICAÇÃO CONFIGURADA:               PARCIAL — nós usam Credential nativa (não hardcoded); valor da credencial ainda não preenchido pelo usuário (Seção 6)
SECRETS HARDCODED:                      NÃO (no workflow novo). SIM, criticamente, em workflow pré-existente não relacionado — reportado na Seção 3
CONTAGEM VIA N8N:                       TESTADO COM PIN DATA (lógica validada); NÃO testado com chamada de rede real (endpoint não implantado)
MG VIA N8N:                             TESTADO COM PIN DATA (853/853, lógica validada); NÃO testado com chamada de rede real
MUNICÍPIOS PROCESSADOS:                 853/853 (dado real do Bloco 3, reafirmado nos testes deste bloco via pin data)
IDEMPOTÊNCIA:                           Validada no Bloco 3 (853→853, 853→853); não re-testada aqui pois nenhum dado foi tocado
COLLECTION RUNS:                        1.708 registros reais (herdados do Bloco 3, sem mudança)
SUPABASE ACESSADO DIRETAMENTE PELO N8N: NÃO — persistência 100% no PolitixOS, como exigido
ALTERAÇÃO NO POLITIXOS NECESSÁRIA:      NÃO NESTE BLOCO (nenhuma alteração feita); configuração pendente para o próximo passo (deploy + env var, Seção 12)
TSC:                                    OK
TESTES:                                 OK (245/245, sem regressão)
BUILD:                                  OK (herdado do Bloco 3 — nenhum código mudou)
DEPLOY:                                 NÃO REALIZADO (fora de escopo)
PRONTO PARA MOTOR DATASUS:              NÃO AINDA — recomendo fechar a implantação real deste motor (deploy + credenciais + teste de rede real) antes de iniciar a próxima fonte, para que o padrão fique validado ponta a ponta pelo menos uma vez
```

**Gate respeitado nesta execução:** DATASUS, Segurança, TSE, SICONFI, Perplexity e Notícias não foram iniciados; nenhum deploy foi feito; nenhum commit/push automático foi realizado; nenhum workflow existente foi alterado (apenas auditado); nenhum dado fictício foi inserido em produção. Aguardando homologação humana.
