# PolitixOS — Instagram
## Bloco 3B.6D — E2E Controlado

**Data:** 2026-08-22
**Agente:** Claude

---

## 1. Resumo executivo

Executei uma amostra real e controlada de 3 posts através de todo o pipeline: coleta RapidAPI → persistência → comentários → IA Gemini → `ai_analysis` → contrato da aplicação. O contrato (função real do Codex, não modificada) foi testado diretamente com dado real persistido por este mesmo run e devolveu corretamente todos os campos. A camada visual autenticada (dashboard/drawer) não pôde ser inspecionada — bati na tela de login (auth própria do PolitixOS, não Supabase Auth) e minha regra absoluta de segurança proíbe digitar senha, mesmo de teste — exatamente a mesma limitação que o 3B.6B já havia registrado por outro motivo (bloqueio de URL local). Nenhum cutover, nenhuma alteração de UX, Legacy, schema ou schedule automático.

**Decisão: PASS WITH LIMITATIONS.**

## 2. Baseline utilizado

Li integralmente `RELATORIO_INSTAGRAM_BLOCO3B6A_PIPELINE_SYNC_AI.md` e `RELATORIO_INSTAGRAM_BLOCO3B6B_APP_SCALE_CONTRACT.md` antes de executar. Não repeti as auditorias já concluídas (sync de nós, contrato de paginação/completeness) — usei-as como fato estabelecido.

## 3. Estado do V2

`IjcU6bLAWv4QJfJy`, 34 nós, `active:true` (publicado desde o Bloco 3B.4 — a mesma divergência já registrada no 3B.6A entre a premissa "não publicado" e a realidade), `availableInMCP:true`, `updatedAt` no início deste bloco: `2026-08-22T00:02:29.283Z`.

## 4. Estado do Legacy

`XaWHmrrnobud6La1`: `active:true`, `updatedAt:2026-08-21T03:07:33.630Z` — **idêntico** ao valor confirmado em todos os blocos anteriores, reconfirmado agora. Não tocado.

## 5. Schedule

6 horas, `triggerAtMinute:15`. Não alterado, não desligado.

## 6. Janela segura escolhida

**Não determinei o horário exato do próximo disparo automático** — o cálculo interno do agendador do n8n não é exposto pelas ferramentas disponíveis, e adivinhar seria contrário à disciplina de evidência deste projeto. Em vez de bloquear o bloco por essa incerteza, usei a proteção arquitetural já validada em blocos anteriores: alterei `ai_enabled` para `true` **somente no draft** (via `update_workflow`, sem `publish_workflow`) e executei o teste via `execute_workflow(mode:"manual")`. A versão **publicada/ativa** — a que o schedule realmente usa — nunca teve `ai_enabled` alterado, permanecendo `false` do início ao fim. Mesmo que o schedule tivesse disparado durante o teste, ele rodaria a versão publicada segura (sem IA), em uma execução n8n totalmente separada da minha — o mesmo padrão já comprovado seguro sob colisão real e não intencional no Bloco 3B.4 (zero duplicidade/nulo observados naquela ocasião). Ao final, revertive o draft para `ai_enabled:false` (limpeza, não estritamente necessária pois o publicado nunca mudou).

## 7. run_id

**Execução `27606`**, disparada às `2026-08-22T00:31:11.836Z` (início real do estágio posts), concluída `00:31:34.093Z` — **22,3s**. Todos os registros de `collection_logs` e `ai_analysis` desta seção carregam `metadata->>'execution_id' = '27606'` (para os logs) ou `created_at` correspondente à mesma janela (para `ai_analysis`, que não tem `execution_id` como coluna — rastreado por timestamp real).

## 8. Amostra

3 posts reais, mesma conta ativa (única existente), formatos disponíveis no momento: 2× REEL + 1× IMAGE (não havia CAROUSEL entre os 3 mais recentes reais — não ampliei a busca para forçar esse formato, conforme instruído).

| post_id | formato | likes | comments (rede) | comments (persistidos) |
|---|---|---:|---:|---:|
| `27966d2c-4499-4db1-9e60-46af1be68e9f` | IMAGE | 241.045 | 3.503 | 410 |
| `74f526a6-811c-413b-b686-de65f0de3ee3` | REEL | 54.988 | 0 | 0 |
| `ea84295d-07b2-45fd-804c-8390adcb5d9b` | REEL | 564.183 | 25.821 | 16 |

## 9. Coleta

Confirmado real via `/user/posts` (1 chamada RapidAPI, `calls_user_posts=1`). Os 3 `platform_post_id` reais persistidos: `3966600534580149086_454257644`, `3968186814355652622_3194535550`, `3379321492917997423_454257644` — todos com `client_id`/`target_id` corretos.

## 10. Persistência

`social_posts` — os 3 IDs confirmados existentes com `content_type` (classificador canônico do Bloco 3A), `client_id=f348bd17-...`, `target_id=7a7c0d0e-...`. Nenhuma falha de persistência de post nesta amostra — todos os 3 prosseguiram para a análise.

## 11. Comments

Vínculo `instagram_comments.post_id → social_posts.id` confirmado por junção real. **Distinção explícita, conforme pedido:** o `comment_count` reportado pela rede (3.503 / 0 / 25.821) é sistematicamente maior que o efetivamente coletado/persistido (410 / 0 / 16) — a API não devolve o total histórico completo, só uma amostra recente por chamada (comportamento conhecido desde o Bloco 3B.1, não uma falha desta execução). Critério de seleção: os comentários retornados pela chamada `/post/comments`, ordenados por `like_count desc`, até 80 usados no prompt da IA.

## 12. Replies

Nenhuma reply coletada nesta amostra (`parent_comment_id` nulo em 100% dos comentários dos 3 posts) — **não é falha**, é a limitação já conhecida (nenhum comentário desta amostra tinha `child_comment_count>0` no payload bruto). Paginação de 1 página, inalterada.

## 13. IA

3 chamadas reais ao Gemini (`ai_calls=3`), 0 falhas, 0 retries (nenhum 429/5xx real ocorreu). Input lógico por post: legenda + métricas + até 80 comentários reais (quando existiam) — para `74f526a6` (0 comentários), o prompt usou o texto padrão "Nenhum comentario capturado." e a análise seguiu baseada em legenda/métricas.

## 14. AI Analysis

Todos os 8 campos pedidos foram retornados, parseados, normalizados, persistidos e recuperáveis — confirmado por SQL direto após a execução, não presumido:

| post_id | sentiment | risk_level | risk_reason | ai_topics | summary | recommended_action | engagement_quality | polarization_level |
|---|---|---|---|---|---|---|---|---|
| `27966d2c` | positivo | baixo | `null` (sem risco relevante, corretamente) | 3 temas específicos | texto real, 180+ caracteres | texto real, específico | alta | alto |
| `74f526a6` | positivo | baixo | `null` | 4 temas específicos | texto real | texto real | baixa | alto |
| `ea84295d` | misto | medio | texto real (~140 caracteres, explica polarização) | 3 temas específicos | texto real, menciona "apropriação... para discussões políticas" | texto real | baixa | alto |

`client_id`/`target_id` corretos e idênticos aos dos posts de origem nas 3 linhas — **nenhum cruzamento de tenant, nenhuma análise associada a post errado** (verifiquei isso especificamente após uma suspeita inicial — seção 22).

## 15. Contrato

Testei a função real `buildInstagramUiContract` (código do Codex, não alterado) diretamente com o post e a análise reais de `27966d2c`, via script `tsx` temporário (criado, executado e removido — não commitado):

```json
{
  "id": "27966d2c-4499-4db1-9e60-46af1be68e9f",
  "candidate": "Michelle Bolsonaro",
  "format": "IMAGE",
  "sentiment": "positivo",
  "risk": "baixo",
  "riskReason": null,
  "themes": ["eleições", "apoio político", "mulheres na política"],
  "summary": "A postagem gerou uma percepção pública extremamente positiva, com forte apoio à chapa Michelle Bolsonaro e Bia Kicis.",
  "recommendedAction": "Continuar a estratégia de associação entre as candidatas e o Presidente Bolsonaro, capitalizando o apoio e a mobilização da base eleitoral."
}
```

**Idêntico, campo a campo, ao que está persistido no banco** (seção 14). `engagementQuality`/`polarizationLevel` existem no contrato (confirmado no código, Bloco 3B.6B) mas não fazem parte da UI ainda — não testados visualmente por não estarem expostos.

## 16. Dashboard

**NOT CONFIRMED — bloqueado por regra de segurança própria, não por limitação técnica.** Abri `/dashboard/instagram` real via browser; a aplicação exigiu login (autenticação própria do PolitixOS, cookie de sessão — não é Supabase Auth). Minha regra absoluta, já estabelecida e seguida em todo este projeto, proíbe digitar qualquer senha em qualquer formulário de login, mesmo de teste. Não tentei contornar. Fechei a aba sem prosseguir.

## 17. Drawer

**NOT CONFIRMED**, mesma razão da seção 16 — exige a mesma sessão autenticada.

## 18. Matriz E2E por post

| POST_ID | COLETA | PERSISTÊNCIA | COMMENTS | IA | AI_ANALYSIS | CONTRATO | DASHBOARD | DRAWER | TEMA | SENTIMENTO | RISCO | SUMMARY | RISK_REASON | RECOMMENDED_ACTION | ENGAGEMENT_QUALITY | POLARIZATION_LEVEL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `27966d2c` | PASS | PASS | PASS | PASS | PASS | PASS | NOT CONFIRMED | NOT CONFIRMED | 3 temas reais | positivo | baixo | presente, real | null (correto) | presente, real | alta | alto |
| `74f526a6` | PASS | PASS | PASS (0 reais, correto) | PASS | PASS | NOT TESTADO diretamente (mesma função, evidência por analogia) | NOT CONFIRMED | NOT CONFIRMED | 4 temas reais | positivo | baixo | presente, real | null (correto) | presente, real | baixa | alto |
| `ea84295d` | PASS | PASS | PASS | PASS | PASS | NOT TESTADO diretamente (idem) | NOT CONFIRMED | NOT CONFIRMED | 3 temas reais | misto | medio | presente, real | presente, real | presente, real | baixa | alto |

## 19. Consistência DB × Contract × UI

`DB.sentiment = contract.sentiment` ✅ (verificado, post `27966d2c`, idêntico). `DB.risk_level = contract.risk` ✅. `DB.ai_topics = contract.themes` ✅ (mesmo array, mesma ordem). `DB.recommended_action = contract.recommendedAction` ✅ (texto idêntico, sem transformação). `DB.summary = contract.summary` ✅. `DB.risk_reason = contract.riskReason` ✅ (`null` preservado como `null`, não virou string vazia nem texto fabricado). **`UI.*` não pôde ser comparado** (seção 16/17) — a cadeia DB→Contrato está provada; o último elo (Contrato→UI renderizada) permanece não confirmado por decisão de segurança, não por falha encontrada.

## 20. Custos/chamadas

Execução `27606`: **4 chamadas RapidAPI** (1 posts + 3 comments) + **3 chamadas Gemini**, 22,3s total, 0 retries.

Projeção simples (não é orçamento definitivo, preço não confirmado):

| Escala | RapidAPI (≈1,33/post) | Gemini (1/post analisado) |
|---|---:|---:|
| 1 post | ~1,3 | 1 |
| 100 posts | ~133 | 100 |
| 1.000 posts | ~1.330 | 1.000 |

## 21. Falhas

Nenhuma falha real ocorreu nesta execução. Não provoquei falha deliberada em API produtiva externa (RapidAPI/Gemini) para não gerar custo/risco desnecessário — a suíte de 12/12 testes unitários do subworkflow de retry (Bloco 3B.3.1) e a falha transitória real já observada organicamente no Bloco 3B.5 ("Shoot, IG is blocking us") permanecem a evidência válida do contrato `success/partial/error`.

## 22. Correções locais realizadas

**Nenhuma.** Durante a verificação inicial, notei que 2 dos 3 `content_id` que eu esperava (de uma suposição errada sobre quais seriam os "3 posts mais recentes") não tinham `ai_analysis` atualizado — investiguei antes de presumir bug, e descobri que a suposição estava errada: o pipeline buscou 3 posts reais diferentes dos que eu havia presumido (o conteúdo real da conta mudou entre blocos). Reconferindo com os IDs corretos (`27966d2c`, `74f526a6`, `ea84295d`, todos retornados pela própria execução `27606`), os 3 têm análise fresca e corretamente atribuída — **não era um bug de cross-contamination entre posts**, era uma suposição minha incorreta sobre a amostra, corrigida antes de eu reportar algo falso.

## 23. Limitações conhecidas (não bloqueiam, já registradas antes)

- Replies limitadas a 1 página (Bloco 3B.3.1/3B.3.2).
- Gemini sem retry dedicado (Bloco 3B.6A).
- `engagementQuality`/`polarizationLevel` no contrato mas não na UI (Bloco 3B.6B, deliberado).
- Verificação visual autenticada não realizada (Bloco 3B.6B por bloqueio de URL; aqui por regra de senha) — **duas causas diferentes, mesmo resultado prático**.

## 24. Débitos não tratados

- `SECURITY-DEBT-INSTAGRAM-OPENAI-LEGACY` (chave OpenAI hardcoded no Legacy) — não tocada, não impressa, não copiada.
- Estratégia acima de 10.000 posts (Bloco 3B.6B) — não impactou esta amostra de 3 posts.

## 25. Riscos

- A cadeia DB→UI real (renderização) permanece não comprovada por verificação automatizada — só por leitura de código (`ui-contract.ts` consome exatamente os campos que `instagram-ui.ts` expõe, que por sua vez usa exatamente os nomes de coluna reais de `ai_analysis`) e pelos 32/32 testes do Bloco 3B.6B. Recomendo que uma validação visual humana (não automatizada) feche esse último elo antes de qualquer decisão de cutover.
- Discrepância "V2 publicado" vs. premissa "V2 não publicado" continua sem resolução formal (herdada do 3B.6A).

## 26. Evidências

- Execução `27606` (real, `get_execution` direto do n8n).
- SQL direto em `social_posts`/`instagram_comments`/`ai_analysis` para os 3 `content_id`.
- Saída real de `buildInstagramUiContract()` rodada localmente com dado real.
- `search_workflows`/`get_workflow_details` para confirmar Legacy/V2 inalterados fora do escopo autorizado.

## 27. Decisão final

**PASS WITH LIMITATIONS.**

A cadeia POST→PERSISTÊNCIA→COMMENTS→IA→AI_ANALYSIS→CONTRATO está **provada de ponta a ponta com dado real e rastreável** (`run_id 27606`, 3 posts reais, todos os 8 campos de IA presentes/corretos/sem fabricação, zero cruzamento de tenant). O último elo (Contrato→Dashboard→Drawer renderizados) não foi verificado por decisão de segurança (não digitar senha), não por falha técnica encontrada — mesma limitação já registrada pelo Codex no 3B.6B por outro motivo. Nenhum critério de NO-GO ocorreu (sem mistura de tenant, sem recomendação fabricada, sem perda sistemática de campos, sem interferência no Legacy, sem necessidade de alterar schema).

Legacy intacto. Schedule inalterado. `ai_enabled` publicado permanece `false`. Nenhum cutover. Nenhuma alteração de UX.

Não avancei para o próximo bloco. Aguardando decisão humana.
