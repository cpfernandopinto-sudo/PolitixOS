# Relatório — X Bloco X.2B — App/Data Contract

Data: 2026-08-21

Branch: `codex/x-bloco-x2b`

Decisão: **PASS WITH LIMITATIONS**

## 1. Schema audit

A auditoria foi feita contra o catálogo real do projeto Supabase `hhhwuajptkyposarfbzn`, sem DDL. Existem `social_posts`, `tweet_replies`, `ai_analysis`, `targets` e `social_accounts`. Não existem `monitored_targets` nem `social_post_targets`; `targets` é o conceito real de target monitorado.

Baseline X observado: 381 posts, 137 replies, zero `client_id` nulo nos posts X, zero identidade externa ausente, zero duplicidade por `(lower(platform), platform_post_id)`, zero reply órfã, zero divergência reply-target/post-target e zero divergência client entre post, target e conta social.

## 2. Tabelas

| Tabela | PK | Relações e identidade | Tenant/tempo | Observação |
|---|---|---|---|---|
| `social_posts` | `id` UUID | FK `target_id -> targets`, FK `social_account_id -> social_accounts`, FK `client_id -> clients`; unique `(platform, platform_post_id)` (dois índices equivalentes) e `post_url` | `client_id`, `target_id`, `taken_at`, `collected_at`; RLS ligada | `target_id` e `social_account_id` são obrigatórios |
| `tweet_replies` | `id` UUID | FK apenas em `post_id -> social_posts`; `tweet_reply_id` unique; `target_id` sem FK | sem `client_id`; `created_at_twitter`, `collected_at`; **RLS desligada** | sem parent/conversation estruturados |
| `ai_analysis` | `id` UUID | FK `target_id -> targets`, FK `client_id -> clients`; unique `(content_type, content_id)` | `client_id`, `target_id`, `created_at`, `updated_at`; RLS ligada | uma análise por conteúdo, não por associação target |
| `targets` | `id` UUID | FK `client_id -> clients` | `client_id`, `is_active`; RLS ligada | equivalente real de monitored target |
| `social_accounts` | `id` UUID | FK `target_id -> targets`, FK `client_id -> clients`; unique `(target_id, platform, handle)` e também `(platform, handle)` | `client_id`, `target_id`; RLS ligada | modelo de conta própria, target-bound |

Índices relevantes cobrem plataforma, target, client, data e post nas tabelas atuais. A duplicidade de índices unique em `social_posts` deve ser revisada separadamente, sem remoção neste bloco.

## 3. Contratos

Foi criada uma camada isolada em `lib/x/v2-contract.ts` com `XPost`, `XReply`, `XAuthor`, `XMetrics`, `XAIAnalysis`, `XCompleteness` e `XPage`. Ela não altera o contrato Legacy nem a UI.

## 4. Owned/external

Não há `source_type`, `content_origin` ou equivalente estruturado. O contrato aceita `OWNED`, `EXTERNAL`, `QUOTE` e `REPOST`; registros sem evidência permanecem `UNKNOWN`. Nenhuma origem foi inferida de texto ou target.

## 5. N:N

Não existe relação post-target N:N. Hoje `social_posts.target_id` permite apenas um target e é `NOT NULL`. O contrato aceita múltiplos `targetIds` e agrega associações sem duplicar a entidade. Persistência depende da proposta `social_post_targets`.

## 6. Replies

`tweet_replies` não tem `client_id`, `parent_reply_id` nem `conversation_id`; seu external ID real é `tweet_reply_id`. O mapper usa campos estruturados futuros e, quando presentes, os equivalentes do payload bruto. O escopo de tenant pode ser herdado do post no contrato, mas isso não substitui RLS/coluna persistida.

## 7. Metrics

Likes, replies, reposts, quotes, views e bookmarks usam `{ value, available }`. Ausência resulta em `null/false`; zero fornecido permanece `0/true`. `quoteCount` é aceito e `quotePosts` permanece `null` (indisponível).

## 8. IA

O schema real possui sentiment, risk level/reason, topics, summary, recommended action, public reaction, author tone, polarization, crisis temperature, strategic reading, engagement quality e confidence score. Todos foram incluídos; análise inexistente permanece `null`.

## 9. Search/mentions

O contrato de filtro contempla client, targets, período, origin, matched term, risk, sentiment e topic. Origin e matched term aparecem explicitamente como filtros não suportados pela persistência atual; não são ignorados silenciosamente.

## 10. Dedup

Identidade canônica: `platform + externalId`. Para X, o helper usa `x:${externalId}` e une targets/termos. Texto não participa da identidade. O banco já impede duplicidade por `(platform, platform_post_id)` e a auditoria encontrou zero duplicidades.

## 11. Completeness

`XPage` separa `totalAvailable`, `totalLoaded` e `isComplete`. Total analítico é entrada independente da página visual; o contrato não promove `items.length` a total global.

## 12. Pagination

O plano limita páginas a 100 itens, normaliza offset e prepara consultas server-side. Replies devem usar página para lista/drawer e contagem agregada para KPI. O Legacy ainda carrega no máximo 300 posts e 1.000 replies e calcula KPIs sobre esse recorte; isso permanece intacto, mas não pode ser reutilizado como total V2.

## 13. Tenant

O planejador exige `clientId` e intersecta targets solicitados com `allowedTargetIds`. Uma futura query deve aplicar ambos no servidor. Limitação crítica: `tweet_replies` não tem `client_id` e está com RLS desligada; o contrato herda escopo do post, porém a segurança persistente exige migration/policies revisadas.

## 14. Authors

`XAuthor` suporta externalUserId, username, displayName, followers e verified. O mapper lê o formato bruto disponível e não inventa valores. `social_accounts` não é solução adequada para autores externos porque exige target e tem unicidade global de handle.

## 15. Quotes

Contagem é independente da lista. `quotes` pode estar disponível enquanto `quotePosts` continua indisponível. Nenhum quote post é fabricado.

## 16. Testes

Cobertura direcionada: owned, external, unknown, múltiplos targets, matched terms, reply com/sem parent, métricas completas/ausentes/zero real, IA presente/ausente, dedup, tenant, paginação, completeness, volume acima do limite, quote count sem quote posts e autor externo.

## 17. Regressão

- Vitest direcionado (`v2-contract` + Legacy X): 14/14 testes passaram.
- Vitest completo: 1.193 testes passaram e 5 foram ignorados conforme configuração existente (133 arquivos passaram, 5 ignorados).
- TypeScript `--noEmit`: passou.
- ESLint dos arquivos X.2B: passou sem warnings.
- Production build (Next.js 16.2.6/Turbopack): passou; 22 páginas estáticas geradas e `/dashboard/x` preservada como rota dinâmica.

A UI e `lib/queries/x.ts` Legacy não foram alteradas.

## 18. Schema gaps

| Necessidade | Existe? | Bloqueia? | Migration? | Risco |
|---|---:|---:|---:|---|
| post-target N:N | Não | Search multi-target | Sim | Médio |
| reply `client_id` | Não | tenant/RLS V2 | Sim | Alto |
| parent reply | Não estruturado | hierarquia | Sim | Médio |
| conversation ID | Não estruturado | conversas | Sim | Médio |
| origin/source type | Não | filtro/confiabilidade | Sim | Médio |
| matched term | Não | filtro/explicabilidade | Sim | Médio |
| autor externo estruturado | Não | analytics de autor | Decisão pendente | Médio |
| quote posts | Provider não garante | lista de quotes | Não sem fonte | Baixo |
| RLS em replies | **Desligada** | segurança | Sim/policies | **Alto** |

## 19. Migrations propostas

`docs/PROPOSTA_MIGRATION_X_V2_RELACOES.md` contém proposta não aplicada: `content_origin`, `social_post_targets`, evolução de replies, índices e RLS. Policies ficaram intencionalmente sem implementação até revisão do padrão tenant oficial. Não há arquivo em `supabase/migrations`.

## 20. Dependências do Claude X.2A

O pipeline deve entregar external IDs reais, origem explícita baseada na rota/fonte, associações target + matched term, métricas com presença distinguível, autor externo e IDs de parent/conversation. A forma final do payload precisa ser reconciliada com estes mappers antes do cutover. Nenhum workflow foi inspecionado ou alterado nesta frente.

## 21. Riscos

1. RLS desligada em `tweet_replies` e ausência de `client_id`.
2. `target_id`/`social_account_id` obrigatórios em `social_posts` dificultam entidade externa neutra.
3. Uma análise unique por conteúdo pode não comportar interpretação específica por target.
4. O Legacy confunde página limitada com total em KPIs; mantido por freeze de compatibilidade.
5. Métricas atuais possuem default zero no banco; sem presença no raw, alguns zeros legados podem ser semanticamente ambíguos.

## 22. Decisão

**PASS WITH LIMITATIONS.** O contrato, mapeamento, dedup, paginação, completeness e tenant planning estão preparados e testáveis sem alterar produção. Persistência completa de Search/Mentions e segurança adequada de replies dependem de migration e policies aprovadas. Não houve migration, mudança de RLS, UI, n8n, deploy, merge ou cutover.
