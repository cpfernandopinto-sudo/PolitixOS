# POLITIX TERRITÓRIOS — Bloco 2.5: Identificação Segura do Supabase + Aplicação e Validação da Fundação Territorial

**Sprint 11 · Relatório técnico**
**Base:** [Bloco 1](docs/RELATORIO_TERRITORIOS_BLOCO1_FUNDACAO.md) e [Bloco 2](docs/RELATORIO_TERRITORIOS_BLOCO2_BANCO_FUNDACAO.md), homologados.
**Status:** banco identificado com segurança, migration aplicada e validada. Gate liberado para o Bloco 3 (Motor IBGE).

---

## 1. Como o projeto Supabase foi identificado

O bloqueio dos Blocos 1/2 era a ausência de `.env.local` **dentro do worktree isolado** onde aquele trabalho rodou. Neste bloco, a auditoria expandiu a busca para fora do worktree e encontrou, na raiz do checkout principal do repositório (`.../PolitixOS/`, o diretório do qual o worktree foi criado), dois artefatos que o worktree não herda (são `.gitignore`d, portanto nunca copiados para um worktree novo):

- `.env.local` — configuração real de desenvolvimento da aplicação, com `NEXT_PUBLIC_SUPABASE_URL`.
- `.vercel/project.json` — vínculo do checkout com o projeto Vercel `politix-os`.

Não foram necessárias variáveis de ambiente do shell, GitHub Actions ou outra fonte — o `.env.local` do próprio checkout de desenvolvimento já continha a URL.

## 2. Evidências utilizadas para confirmar que pertence ao PolitixOS

Quatro evidências independentes, todas convergentes:

1. **URL do Supabase no `.env.local` do checkout principal** → aponta para o projeto cujo ref é o identificado na Seção 3.
2. **`.vercel/project.json`** → `projectName: "politix-os"`, confirmando que este checkout é o deploy real do PolitixOS na Vercel (não um ambiente de outro cliente).
3. **Validação cruzada de schema** (Etapa 2, regra absoluta do bloco): o projeto candidato contém exatamente as tabelas que o código do PolitixOS espera — `targets`, `app_users`, `app_user_permissions`, `app_user_targets`, `investigations` (+ `investigation_sources/entities/timeline/queries`), `social_accounts`, `mentions` (com `hash` como chave primária, confirmando a estratégia de dedup já referenciada nos Blocos 1/2), `instagram_posts`, `instagram_comments`, `tweet_replies`, `ai_analysis`, `social_posts`, `collection_logs`. Contagens de linha são de uso real (7 `app_users`, 10 `targets`, 1.399 `mentions`, 101.844 `instagram_comments` etc.) — não é um projeto vazio de teste.
4. **Histórico de migrations do projeto** (`list_migrations`): nomes como `add_primary_key_mentions_hash`, `fix_active_candidates_keywords_and_city`, `create_tweet_replies_table`, `create_view_x_posts_pending_analysis` — vocabulário de domínio idêntico ao do PolitixOS, não genérico.

**Descarte de ambiguidade**: a conta Supabase acessível via MCP lista 3 projetos. Os outros dois (`Check-list Qualidade`, `biotech-compras`) têm `project_ref` diferentes do identificado aqui e nomes que não têm relação com PolitixOS — não há sobreposição nem risco de confusão entre eles.

Nenhum secret (chave anon, service role, `SESSION_SECRET`) foi lido ou exposto neste processo — apenas o valor da URL (que contém o ref, não é segredo) e nomes de variáveis.

## 3. project_ref/project_id identificado

```
project_ref: hhhwuajptkyposarfbzn
```
(Não é segredo — é o identificador público que compõe a própria URL do projeto, `https://hhhwuajptkyposarfbzn.supabase.co`.)

## 4. Schema encontrado antes da migration

17 tabelas + 3 views em `public`, todas do domínio PolitixOS (listadas na Seção 2). Nenhuma tabela territorial existia ainda. Tipos relevantes para a migration confirmados: `targets.id` e `app_users.id` são `uuid` — compatíveis com as foreign keys da migration territorial (`territory_briefings.target_id → targets.id`, `territory_briefings.requested_by → app_users.id`).

**Achado de segurança pré-existente, não relacionado a este bloco** (obrigatório reportar por instrução da própria ferramenta de auditoria): `get_advisors` acusa 7 tabelas com RLS **desabilitado** (não é "allow all" — é RLS off por completo): `targets`, `tweet_replies`, `investigations`, `investigation_sources`, `investigation_entities`, `investigation_timeline`, `investigation_queries`. Isso significa que essas tabelas são hoje totalmente acessíveis via anon key a quem tiver a chave pública. Não é uma regressão introduzida por este bloco — é um débito de segurança preexistente no schema atual do PolitixOS. **Não apliquei nenhuma remediação** (não era escopo, e o SQL de remediação da ferramenta pode bloquear acesso legítimo sem antes desenhar policies corretas). Fica registrado como recomendação para tratamento em bloco dedicado — não misturar com Territórios.

## 5. Resultado do pré-flight

Migration revisada linha a linha contra o schema real antes de aplicar:
- Sintaxe padrão PostgreSQL, sem extensões além das já habilitadas (`gen_random_uuid()` já em uso pelo schema existente).
- FKs para `targets(id)` e `app_users(id)` confirmadas compatíveis em tipo (`uuid`).
- Nenhuma colisão de nome com as 17 tabelas/3 views existentes.
- Estratégia de idempotência (índice único com `COALESCE`) revisada e mantida sem alteração — validada de fato no smoke test (Seção 12).
- RLS + policies "allow all" mantidas conforme homologado — decisão consciente e mais estrita que o padrão hoje usado em `targets`/`investigations` (que não têm RLS nenhum), portanto não piora a postura de segurança do projeto.
- Nenhuma tabela redesenhada: seguem as 5 aprovadas (`territories`, `territory_indicators`, `territory_evidence`, `territory_collection_runs`, `territory_briefings`), sem recriar `territory_demographics/health/security/elections/finance/news`.

## 6. Migration aplicada ou não

**APLICADA.** `apply_migration` executado com sucesso no projeto `hhhwuajptkyposarfbzn`, migration nomeada `territories_foundation`.

## 7. Se não aplicada, motivo exato

N/A — foi aplicada, com identidade do banco confirmada por múltiplas evidências convergentes e schema validado antes da execução.

## 8. Tabelas criadas

`territories`, `territory_indicators`, `territory_evidence`, `territory_collection_runs`, `territory_briefings` — confirmadas via `list_tables` pós-migration, todas com 0 linhas (catálogo vazio, como esperado — carga real fica para o Motor IBGE).

## 9. Constraints criadas

- `territories`: `codigo_ibge` `UNIQUE`; `uf char(2)` + `CHECK (char_length(uf) = 2)`.
- `territory_indicators`: `CHECK (valor IS NOT NULL OR valor_texto IS NOT NULL)`; FK `territory_id → territories.id ON DELETE CASCADE`.
- `territory_evidence`: FK `territory_id → territories.id ON DELETE CASCADE`.
- `territory_collection_runs`: `CHECK status IN ('pending','running','partial','completed','failed')`; FK `territory_id → territories.id ON DELETE CASCADE`.
- `territory_briefings`: `CHECK status IN ('nao_iniciado','coletando','processando','analisando','concluido','parcial','erro')`; FK `territory_id → territories.id ON DELETE CASCADE`, `target_id → targets.id ON DELETE SET NULL`, `requested_by → app_users.id ON DELETE SET NULL`.

Todas confirmadas presentes via `list_tables(verbose=true)` pós-migration (colunas, tipos, `check` expressions e `foreign_key_constraints` batem exatamente com o SQL aplicado).

## 10. Índices criados

Confirmados via aplicação sem erro (todos `if not exists`, idempotentes): `idx_territories_{codigo_ibge,uf,municipio,uf_municipio}`; `uq_territory_indicators_natural_key` (único, com `COALESCE`) + `idx_territory_indicators_{territory_id,categoria,fonte}`; `uq_territory_evidence_territory_hash` (único) + `idx_territory_evidence_{territory_id,source_type,published_at,tema}`; `idx_territory_collection_runs_{request_id,territory_id,source,status,created_at}`; `idx_territory_briefings_{territory_id,target_id,request_id,status,created_at}`.

## 11. RLS/policies validadas

`list_tables` pós-migration confirma `rls_enabled: true` nas 5 tabelas novas. Policies `allow_all_*` criadas pelo bloco `DO $$ ... $$` condicional (idempotente — não duplicaria se reaplicado). Autorização real permanece na aplicação (`requireAuth` + `allowedTargetIds`), como em todo o restante do projeto.

## 12. Resultado do smoke test

Executado dentro de uma única transação (`BEGIN ... ROLLBACK`), usando código `9999999`/`9999998`/`9999997` (fora da faixa real de códigos IBGE de 7 dígitos que começam por UF válida) para nunca colidir com dados reais do Motor IBGE:

- **INSERT + UPSERT em `territories`** por `codigo_ibge` → confirmado 1 única linha após duas inserções (idempotência da chave natural).
- **`territory_indicators`**: upsert pela chave natural com `COALESCE` → 1 única linha, com `valor` atualizado para o da segunda tentativa (200), confirmando que o índice único com `COALESCE` funciona como projetado.
- **`territory_evidence`**: duas inserções com o mesmo `(territory_id, source_hash)`, a segunda com `ON CONFLICT DO NOTHING` → 1 única linha (dedup funcionando).
- **`territory_collection_runs`**: INSERT com `status='pending'` → aceito.
- **`territory_briefings`**: INSERT com `target_id`/`requested_by` nulos → aceito, confirmando o caminho de "briefing genérico do território".
- Todas as asserções acima rodaram dentro de um bloco `DO $$ ... RAISE EXCEPTION ... END $$` — se qualquer contagem tivesse saído errada, a chamada inteira teria retornado erro. Retornou sucesso silencioso, confirmando todas as expectativas.
- **Testes negativos** (fora da transação principal, cada um isolado): `INSERT` com `uf='MGX'` (3 caracteres) → rejeitado pelo próprio tipo `character(2)` (`ERROR 22001: value too long for type character(2)`). `INSERT` em `territory_briefings` com `status='estado_invalido'` → rejeitado pela `CHECK` (`ERROR 23514: violates check constraint "territory_briefings_status_check"`). Ambos confirmam que as constraints bloqueiam de fato valores inválidos, não são apenas decorativas.

## 13. Confirmação de que nenhum dado fictício permaneceu

Após o `ROLLBACK` da transação principal e a rejeição dos dois testes negativos (que nunca chegaram a commitar nada), consulta final às 5 tabelas por `codigo_ibge IN ('9999997','9999998','9999999')` e pelos marcadores de teste (`fonte='TESTE'`, `source_hash='hash-teste-bloco25'`, `source='teste'`) retornou **0 linhas em todos os casos**. Nenhum dado de teste permanece no banco de produção.

## 14. Resultado de tsc

```
npx tsc --noEmit → OK, 0 erros
```

## 15. Resultado de vitest

```
npx vitest run → 25 arquivos de teste, 212 testes, 212 passando
(209 pré-existentes + 23 do Bloco 2 já contabilizados + 2 novos deste bloco: SCREEN_LABELS)
```

## 16. Resultado do build

```
npm run build → sucesso (Next.js 16.2.6 / Turbopack)
Rota /dashboard/territorios listada como "ƒ" (dinâmica); Proxy (Middleware) compilado sem erro.
```

## 17. Correção do SCREEN_LABELS

`app/dashboard/usuarios/UsuariosClient.tsx`: adicionada a entrada `territorios: 'Territórios'` em `SCREEN_LABELS` (antes ausente, caindo no fallback cru `?? key`). `SCREEN_LABELS` também passou a ser exportado (era `const` local) para permitir um teste direto sem precisar renderizar o componente inteiro (que tem formulários, `useActionState` e dependências pesadas de `lib/auth/actions`). Nenhuma outra alteração no componente. Teste novo: `app/dashboard/usuarios/UsuariosClient.test.ts` — confirma o rótulo de `territorios` e, como guarda de regressão, que **toda** `screen_key` em `ALL_SCREENS` tem rótulo correspondente (evita esse mesmo esquecimento se uma tela futura for adicionada sem atualizar o mapa).

## 18. Arquivos modificados

- `supabase_migration_territories_foundation.sql` — cabeçalho atualizado de "NÃO APLICADA" para "APLICADA", com data, `project_ref` e referência a este relatório.
- `app/dashboard/usuarios/UsuariosClient.tsx` — `SCREEN_LABELS` exportado + entrada `territorios: 'Territórios'` adicionada.

Nenhum arquivo de módulo existente foi alterado além desses dois pontos triviais e explicitamente autorizados pelo próprio escopo deste bloco (Etapa 8).

## 19. Riscos encontrados

1. **RLS desabilitado em 7 tabelas pré-existentes** (`targets`, `investigations` e relacionadas) — reportado na Seção 4, não corrigido (fora de escopo, requer desenho de policies e não pode ser aplicado às cegas). Recomendo um bloco dedicado a isso, fora da esteira de Territórios.
2. **`.env.local` só existe no checkout principal, não no worktree** — qualquer sessão futura que rode isolada num worktree novo vai reproduzir o mesmo bloqueio de identificação do Bloco 2 até alguém repetir esta descoberta (ou, melhor, documentar o `project_ref` — o que este relatório já faz).
3. **Catálogo territorial ainda vazio** — esperado e correto neste bloco, mas é a dependência direta e única do Bloco 3.

## 20. Pendências

- Popular `territories` via Motor IBGE (Bloco 3).
- Avaliar, em bloco separado, o tratamento do RLS desabilitado em `targets`/`investigations*` (Seção 4/19) — não é dívida criada por Territórios, mas foi descoberta durante esta auditoria e precisa de dono.
- `app/api/territorios/generate/route.ts` continua adiada (decisão do Bloco 2, sem mudança) até existir workflow n8n real para apontar.

## 21. Recomendação objetiva para o próximo bloco

Fundação de banco real, validada e sem dados fictícios remanescentes. O Bloco 3 (Motor IBGE) pode começar a escrever em `territories`/`territory_indicators`/`territory_collection_runs` usando exatamente os contratos já testados neste bloco (upsert por `codigo_ibge`, natural key com `COALESCE`, `collection_runs` por `request_id`). Recomendo que o Motor IBGE comece por um lote pequeno e controlado (ex.: só os municípios de MG, ou só 1 UF) antes da carga completa dos 5.570 municípios, para validar o pipeline real de ponta a ponta com volume baixo primeiro.

---

## QUADRO FINAL

```
PROJECT_ID/REF CONFIRMADO:              SIM — hhhwuajptkyposarfbzn
BANCO POLITIXOS CONFIRMADO:             SIM
MIGRATION VALIDADA:                     SIM
MIGRATION APLICADA:                     SIM
5 TABELAS TERRITORIAIS CONFIRMADAS:     SIM
SMOKE TEST:                             OK (insert/select/upsert/FK/idempotência/dedup validados; 2 testes negativos de constraint confirmados)
DADOS FICTÍCIOS REMANESCENTES:          NÃO
TSC:                                    OK
TESTES:                                 OK (212/212)
BUILD:                                  OK
PRONTO PARA MOTOR IBGE:                 SIM
```

**Gate respeitado nesta execução:** nenhuma integração externa foi implementada, nenhum município foi carregado, nenhum workflow n8n foi criado/alterado, nenhum dado fictício permaneceu no banco, nenhum outro módulo existente foi alterado além do ajuste trivial autorizado de `SCREEN_LABELS`, nenhum deploy em produção foi feito, nenhum commit/push automático foi realizado. Aguardando homologação humana antes do Bloco 3 (Motor IBGE).
