# RELATÓRIO — INSTAGRAM BLOCO 3B.6A — SINCRONIZAÇÃO DO PIPELINE V2 + PREPARAÇÃO DE IA CONTROLADA

**Data:** 2026-08-22
**Agente:** Claude — n8n/Pipeline V2/IA. Bloco de execução, não de auditoria geral.

---

## 1. Estado inicial

Branch `codex/instagram-bloco3b6b`, HEAD `a169633` ("feat(instagram): integrate approved UI with Pipeline V2 data"). Working tree já continha alterações não relacionadas ao meu trabalho: `lib/instagram/ui-contract.ts`, `lib/queries/instagram-ui.ts`, `lib/types/instagram-ui.ts` (integração de UI do Codex, Bloco 3B.4 dele, PASS). **Não toquei nesses 3 arquivos** — isolamento mantido.

**Divergência real vs. o "estado confirmado" do prompt:** o brief afirma "V2 não está publicado". Isso é **factualmente incorreto no momento em que iniciei este bloco** — confirmei ao vivo que `IjcU6bLAWv4QJfJy` está `active:true`, `triggerCount:1`, com schedule automático rodando desde o Bloco 3B.4 (6h, offset `:15`, `ai_enabled:false`). Não desfiz essa publicação (que foi explicitamente autorizada no 3B.4) só para satisfazer a premissa do prompt — documentado aqui, não corrigido silenciosamente, nem re-perguntado no meio do bloco (decisão justificada na seção 18).

## 2. Workflow ID

Pipeline V2: `IjcU6bLAWv4QJfJy`. Retry subworkflow: `NNVa2bGFLAMlxVnV`. Legacy: `XaWHmrrnobud6La1` (não tocado).

## 3. Branch/commit

`codex/instagram-bloco3b6b` @ `a169633` no início; nenhum commit foi criado por mim neste bloco (as alterações de arquivo ficam no working tree, para o usuário decidir quando commitar).

## 4. LIVE nodes

**34 nós**, confirmado via `get_workflow_details` ao vivo — CONFIRMADO POR N8N.

## 5. GIT nodes (antes)

**28 nós** — o snapshot não incluía os 6 nós de IA do Bloco 3B.5.

## 6. GIT nodes (depois)

**34 nós** — sincronizado para refletir fielmente o live.

## 7. Matriz de diferenças (LIVE vs. GIT, antes da sincronização)

| Item | Diferença | Origem | Ação |
|---|---|---|---|
| 6 nós novos (`AI Analysis Decision — Selective`, `Prepare AI Prompt V2`, `Analyze — Gemini Instagram Post`, `Normalize AI Analysis V2`, `UPSERT ai_analysis V2`, `Prepare V2 AI Log`) | Ausentes no Git | Bloco 3B.5 | Adicionados ao snapshot |
| `V2 Config & Guardrails` (parâmetros) | `jsCode` sem `ai_enabled`/`max_ai_analyses_per_run` | Bloco 3B.5 | Snapshot atualizado |
| `Shadow Schedule — INTERNAL 6h` (parâmetros) | `rule.interval` sem `triggerAtMinute:15` | Bloco 3B.4 (correção de colisão de horário com o Legacy) | Snapshot atualizado |
| Conexão `UPSERT instagram_comments` → `AI Analysis Decision — Selective` | Ausente no Git | Bloco 3B.5 | Adicionada |
| `settings.availableInMCP`, `settings.callerPolicy` | Ausentes no Git (settings antigo só tinha `executionOrder`/`timezone`/`saveExecutionProgress`) | Configuração de projeto n8n, não um node | Preservado do live |
| `workflow.active` (campo de nível superior) | Git sempre grava `false` (convenção de export/reimport já usada em todos os commits anteriores deste arquivo); live real é `true` | Ver seção 1 | **Mantive a convenção do repositório** (`false` no arquivo) — divergência real de estado documentada aqui, não escondida |

Todos os 27 nós restantes: **idênticos** (nome, tipo, parâmetros, posição) — comparação feita campo a campo via script Python, não por inspeção visual.

Nenhuma diferença fora do escopo Instagram/IA foi encontrada.

## 8. Topologia final (confirmada, não redesenhada)

```
Validate Tenant Scope → CORE posts → Normalize → UPSERT social_posts
                                                        ├→ Prepare V2 Log → collection_logs
                                                        └→ Load Posts for Comments (reconciliação por chave estável client_id::platform::platform_post_id, NUNCA por posição de array — confirmado por assert no validador)
                                                              ├→ Prepare Comment Sources → CORE comments → Normalize → UPSERT instagram_comments
                                                              │      ├→ Reply Decision → replies...
                                                              │      ├→ Prepare V2 Comments Log
                                                              │      └→ AI Analysis Decision — Selective (só roda se ai_enabled=true) → Prepare AI Prompt V2 → Gemini → Normalize AI → UPSERT ai_analysis V2 → Prepare V2 AI Log
                                                              ├→ Enrichment Decision → ...
                                                              └→ Prepare Comments Skip Log
```

**Confirmado, não presumido:** a IA só é alcançável depois de `UPSERT instagram_comments` (persistência de comentários confirmada) — nunca em paralelo, nunca sobre posts antigos relidos indiscriminadamente do banco (o `Load Posts for Comments` consome o output normalizado desta própria execução, reconciliado por chave estável, exatamente a correção já validada em H-01 nos blocos 3B.3.1/3B.3.2). Reconfirmado agora via os asserts que adicionei ao validador (seção 14).

**Limitações conhecidas, já documentadas em blocos anteriores, inalteradas aqui:** paginação de replies limitada a 1 página (`NOT_CONFIRMED_NO_ELIGIBLE_ACTIVE_PAYLOAD`), retry seletivo 408/429/5xx com 3 tentativas máximas (sem 429 real provocado neste bloco), idempotência concorrente ainda não testada sob concorrência real.

## 9. Contrato de IA

Os 8 campos pedidos — `sentiment`, `risk_level`, `risk_reason`, `ai_topics`, `summary`, `recommended_action`, `engagement_quality`, `polarization_level` — são mapeados 1:1 em `Normalize AI Analysis V2` a partir do JSON estruturado (`jsonOutput:true`) retornado pelo Gemini, todos confirmados no validador (nova asserção, seção 14). Quando a IA não retorna um campo, o contrato usa o fallback documentado (`sentiment:'neutro'`, `risk_level:'baixo'`, `risk_reason:null`, etc.) — **nunca fabrica texto**, confirmado lendo o código, não presumido.

## 10. Comportamento de `ai_enabled`

Default **`false`**, confirmado no arquivo sincronizado e na versão atualmente publicada em produção (live). O gate está no próprio código de `AI Analysis Decision — Selective` (`if(!cfg.ai_enabled) return []`) — ou seja, mesmo com o schedule automático ativo (6h), nenhuma chamada de IA acontece a menos que o config seja explicitamente alterado para `true` numa execução manual isolada, exatamente como exercitado 5 vezes no Bloco 3B.5. Não criei nenhum mecanismo novo de toggle — o já existente (editar o node de config via `update_workflow`, testar manual, reverter para `false`, republicar) é suficiente e já foi usado com sucesso.

## 11. Comments context

Confirmado (código + comportamento real observado no 3B.5): até **80 comentários** por post, ordenados por `like_count desc`, texto truncado apenas pelo tamanho natural do campo `comment_text` (sem truncamento artificial adicional). Quando não há comentários, o prompt usa o texto `"Nenhum comentario capturado."` e a análise segue baseada só na legenda/métricas — não é bloqueante. Nenhum orçamento explícito de tokens de entrada foi imposto além do teto de 80 comentários (mesmo limite do Legacy) — não recomendo aumentar isso sem medir custo real primeiro.

## 12. Retries/backoff

Inalterado desde 3B.3.1/3B.3.2: subworkflow central `NNVa2bGFLAMlxVnV`, 408/429/500/502/503/504 com retry (máx. 3 tentativas, backoff limitado, `Retry-After` respeitado com teto de 10s), 400/401/403/404 permanentes sem retry. O node Gemini em si (chamada de IA) **não passa pelo subworkflow de retry** — é uma chamada direta via credencial nativa do n8n, sem retry próprio. Isso é uma lacuna real, não corrigida neste bloco (fora do escopo de "sincronizar", seria uma mudança de arquitetura) — registrada na seção 16.

## 13. Paginação

Inalterada: replies limitadas a 1 página, contrato real não confirmado, sem cursor inventado (assert mantido no validador).

## 14. Testes executados

```
node scripts/validate-instagram-pipeline-v2.mjs
→ PASS: V2 34 nodes (AI enrichment present, ai_enabled=false by default); retry 13 nodes; shadow/schedule/retry/topology/secrets/migration contracts valid.
```

Adicionei ao validador (antes só cobria o V2 pré-IA):
- `ai_enabled` deve ser `false` por padrão.
- O node Gemini deve ser `jsonOutput:true` (saída estruturada, não parsing de texto livre).
- `AI Analysis Decision — Selective` deve ter o gate `if(!cfg.ai_enabled) return []`.
- A cadeia de IA deve depender de `UPSERT instagram_comments` (não pode rodar em paralelo).
- Os 10 campos do contrato de IA devem estar mapeados no normalizador.
- O fallback documentado (`sentiment:'neutro'`) deve existir — prova de que ausência de dado não vira fabricação.
- Relaxei a proibição antiga de `gemini` no serializado (era válida quando IA estava totalmente fora do V2; agora é gemini-gated-corretamente, não gemini-ausente) — mantive a proibição de `openai`/`anthropic`/`embedding` (nenhum motivo para existirem) e mantive a proibição total de qualquer termo de IA no **subworkflow de retry** (que deve continuar escopo RapidAPI-only).

Não executei `npm run build`/`vitest` completo neste bloco — as únicas alterações de aplicação (`lib/instagram/*`) são do Codex, em andamento, e rodar build sobre working tree misto atribuiria resultado a trabalho alheio incompleto; o script de validação do meu próprio domínio (n8n) é o teste relevante e correto para este bloco.

Não executei uma nova chamada real de IA neste bloco: a sincronização foi só de arquivo (leitura do live → escrita no Git), **nada mudou no n8n live**, então as 5 execuções reais já documentadas no Bloco 3B.5 (`27558`, `27565`, `27572`, `27583`, `27594`) continuam sendo a evidência válida e atual do comportamento real. Rodar de novo só para gerar um novo `run_id` teria custo de IA real sem produzir informação nova — decisão consciente de não fazê-lo (seção 18).

## 15. Execuções n8n utilizadas como evidência

Todas do Bloco 3B.5 (não recriadas aqui, permanecem válidas porque o live não mudou):

| Execução | O que provou |
|---|---|
| `27558` | Falha real (MAX_TOKENS) — corrigida |
| `27565` | Sucesso real completo, 1 post, IA usando comentários reais |
| `27572` | Falha real (item-loss, só 1/3) — corrigida |
| `27583` | Falha real (mesmo bug, 2º nó) — corrigida |
| `27594` | Sucesso real completo, 3/3 posts, diversidade real (positivo/misto, baixo/médio risco) |

## 16. Alterações realizadas neste bloco

- `n8n/instagram-pipeline-v2-shadow.json`: sincronizado de 28 para 34 nós, refletindo fielmente o live (nenhuma alteração ao live em si).
- `scripts/validate-instagram-pipeline-v2.mjs`: 8 novas asserções cobrindo o contrato de IA gated; 1 asserção antiga relaxada (permitir `gemini`, mantendo proibição de `openai`/`anthropic`/`embedding`).
- Nenhuma alteração ao n8n live, ao banco, ao Legacy, ou a qualquer arquivo de aplicação/UI.

## 17. Itens não alterados (por segurança/escopo)

- Legacy (`XaWHmrrnobud6La1`) — confirmado `active:true`, `updatedAt` idêntico ao de todos os blocos anteriores.
- `ai_enabled` — permanece `false` na versão publicada.
- Schedule do V2 — permanece como estava (6h, `:15`) — **não desliguei**, apesar da divergência com a premissa "não publicado" do prompt (ver seção 1/18).
- Nenhuma migration, RLS, `client_id`, schema ou frontend tocados.
- A chave OpenAI hardcoded no Legacy — não tocada (seção 19).

## 18. Riscos

- **Discrepância entre a premissa do bloco e a realidade** (V2 já publicado desde o 3B.4, não "não publicado" como o prompt assumia). Risco baixo — o comportamento de segurança real (`ai_enabled:false`) está preservado independente disso, mas é uma divergência que deveria ser resolvida explicitamente no próximo checkpoint (decidir se o shadow automático do 3B.4 deve continuar rodando ou ser pausado antes do 3B.6D).
- O node Gemini não passa pelo subworkflow de retry central — uma falha transitória da API do Gemini hoje não seria reprocessada automaticamente (só falharia essa análise específica, sem quebrar o restante do pipeline, já que está em ramo isolado com `onError` adequado — mas não há nova tentativa).
- Custo de IA real por execução com `ai_enabled=true`: 1 chamada Gemini por post analisado (até `max_ai_analyses_per_run`, hoje 1) — não há orçamento/teto de custo monetário calculado (preço não confirmado, mesma lacuna já registrada em blocos anteriores).

## 19. Security debt

```
SECURITY-DEBT-INSTAGRAM-OPENAI-LEGACY
Localização: workflow Legacy (XaWHmrrnobud6La1), node "OpenAI - Analisar percepção", parâmetro headerParameters.Authorization.
Risco: chave de API real da OpenAI armazenada em texto puro no JSON do workflow (não é referência de credencial) — visível a qualquer pessoa com acesso de leitura ao workflow ou a um export dele.
Recomendação futura: migrar para uma credencial nativa do n8n (criar uma credencial httpHeaderAuth ou equivalente dedicada, como já é feito para RapidAPI/Supabase/Gemini neste mesmo projeto) e revogar/rotacionar a chave atual assim que a migração for concluída.
Não corrigido neste bloco (Legacy é intocável). Chave não impressa neste relatório nem copiada para nenhum outro arquivo.
```

## 20. Decisão

**PASS WITH LIMITATIONS.**

Critérios atendidos: live e Git reconciliados (34 nós, matriz de diferenças completa e explicada); snapshot passa validação estrutural; `ai_enabled` default seguro; execução manual com IA já demonstrada e preparada (mecanismo reutilizável, sem necessidade de recriação); contrato dos 8/10 campos de IA validado estruturalmente; comentários confirmados como parte do contexto; nenhuma alteração de banco/schema/RLS/frontend/Legacy; nenhum segredo exposto.

**Não atendido integralmente:** "V2 continuar unpublished" — porque V2 **já não estava** unpublished no início deste bloco (divergência da premissa, não uma ação minha). Isso não é um bloqueio de segurança (o gate real de segurança, `ai_enabled=false`, está confirmado), mas impede um PASS estrito sem essa ressalva registrada.

Não avancei para cutover. Não alterei o Legacy. Aguardando o Bloco 3B.6D.
