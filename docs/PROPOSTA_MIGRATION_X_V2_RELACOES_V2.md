# Proposta final de migration — X V2 — relações V2

Status: **Phases 1–5 executadas no X.2D.1; Phase 6 operacional não executada**. Documento preservado como especificação e evidência da migration aprovada.

## SECURITY PHASING REVISION X.2D.1

Revisão humana aprovada após o security gate do X.2D: por estar no schema público, `social_post_targets` deve nascer protegida. Sua criação, `ENABLE ROW LEVEL SECURITY`, grant CRUD à service role e policy service-role-only passam a ocorrer na **mesma transação da Phase 1**, sem janela operacional persistente sem RLS. Nenhuma decisão arquitetural foi alterada. `tweet_replies`, por já existir, continua recebendo RLS e policy atomicamente apenas na Phase 5, depois do backfill e das constraints válidas.

Esta versão substitui conceitualmente `PROPOSTA_MIGRATION_X_V2_RELACOES.md`. O desenho mantém `social_posts` como entidade canônica única e usa `social_post_targets` como verdade para associações externas. Cada fase deve ser executada e validada separadamente; não há um `BEGIN/COMMIT` único para todo o plano.

## Decisões

- `social_posts.social_account_id` e `target_id` tornam-se nullable. Posts próprios mantêm ambos; posts externos usam ambos como `NULL` e são associados somente por `social_post_targets`.
- `content_origin` usa `CHECK` e `NULL` significa origem ainda desconhecida. Não existe valor fabricado `UNKNOWN` no banco.
- `social_post_targets` guarda `match_type`, `match_term` e `discovery_source`. `created_at` já representa o momento da descoberta; `confidence` e `query_id` não entram sem consumidor comprovado.
- `tweet_replies` recebe tenant, parent externo, parent local opcional e conversation. O ID externo do parent é persistido mesmo quando o UUID local ainda não existe.
- O unique index existente `uq_ai_analysis_content(content_type, content_id)` é preservado. Não criar outro índice de IA.
- A aplicação e o pipeline usam service role server-side. `anon` e `authenticated` não recebem policies diretas; a ausência de policy continua negando acesso, como nas tabelas compartilhadas atuais.

## Pré-checks read-only

Executar e arquivar os resultados imediatamente antes da migration:

```sql
-- Identidade e nulidade dos posts.
select lower(platform) platform, platform_post_id, count(*)
from public.social_posts
group by 1, 2 having count(*) > 1;

select count(*) filter (where client_id is null) null_client,
       count(*) filter (where target_id is null) null_target,
       count(*) filter (where social_account_id is null) null_account
from public.social_posts;

-- Consistência post/target/account por tenant.
select count(*) filter (where t.id is null) orphan_target,
       count(*) filter (where sa.id is null) orphan_account,
       count(*) filter (where p.client_id is distinct from t.client_id) target_client_mismatch,
       count(*) filter (where p.client_id is distinct from sa.client_id) account_client_mismatch,
       count(*) filter (where sa.target_id is distinct from p.target_id) account_target_mismatch
from public.social_posts p
left join public.targets t on t.id = p.target_id
left join public.social_accounts sa on sa.id = p.social_account_id;

-- Replies e tenant derivável.
select count(*) filter (where p.id is null) orphan_post,
       count(*) filter (where t.id is null) orphan_target,
       count(*) filter (where r.target_id is distinct from p.target_id) reply_post_target_mismatch,
       count(*) filter (where p.client_id is null) parent_without_client,
       count(*) filter (where p.client_id is distinct from t.client_id) reply_target_client_mismatch
from public.tweet_replies r
left join public.social_posts p on p.id = r.post_id
left join public.targets t on t.id = r.target_id;

-- IA: constraint e índice são coisas distintas.
select conname, contype, pg_get_constraintdef(oid)
from pg_constraint where conrelid = 'public.ai_analysis'::regclass;

select indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename = 'ai_analysis';

select content_type, content_id, count(*)
from public.ai_analysis group by 1, 2 having count(*) > 1;

-- Análises sem conteúdo correspondente devem ser investigadas, não apagadas.
select a.id, a.client_id, a.content_type, a.content_id
from public.ai_analysis a
left join public.social_posts p on a.content_type = 'post' and p.id = a.content_id
where a.content_type = 'post' and p.id is null;
```

Condições para prosseguir: zero duplicidade de identidade externa; zero reply órfã; zero mismatch de tenant; zero duplicidade de `(content_type, content_id)`. Análises órfãs preexistentes não bloqueiam esta migration, mas exigem ticket separado e não podem ser removidas automaticamente.

## Phase 1 — additive columns/tables

Aplicar em transações curtas. A remoção de `NOT NULL` é backward-compatible para registros existentes, embora não seja estritamente aditiva.

```sql
begin;

alter table public.social_posts
  add column if not exists content_origin text null;

alter table public.social_posts
  add constraint social_posts_content_origin_check
  check (content_origin in ('OWNED', 'EXTERNAL', 'QUOTE', 'REPOST')) not valid;

alter table public.social_posts alter column social_account_id drop not null;
alter table public.social_posts alter column target_id drop not null;

create unique index if not exists uq_social_posts_id_client
  on public.social_posts (id, client_id);
create unique index if not exists uq_targets_id_client
  on public.targets (id, client_id);

create table public.social_post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  target_id uuid not null,
  client_id uuid not null references public.clients(id),
  match_type text not null,
  match_term text not null default '',
  discovery_source text not null,
  created_at timestamptz not null default now(),
  constraint social_post_targets_post_client_fkey
    foreign key (post_id, client_id)
    references public.social_posts(id, client_id) on delete cascade,
  constraint social_post_targets_target_client_fkey
    foreign key (target_id, client_id)
    references public.targets(id, client_id) on delete cascade,
  constraint social_post_targets_match_type_check
    check (match_type in ('owned', 'mention_of_target', 'term_in_text', 'weak_or_unverified')),
  constraint social_post_targets_source_check
    check (discovery_source in ('owned_profile', 'search', 'mention')),
  constraint social_post_targets_identity_key
    unique (post_id, target_id, match_type, match_term)
);

create index idx_social_post_targets_client_target
  on public.social_post_targets (client_id, target_id, created_at desc);
create index idx_social_post_targets_post
  on public.social_post_targets (post_id);

alter table public.social_post_targets enable row level security;

grant select, insert, update, delete on public.social_post_targets to service_role;

create policy service_role_full_access_social_post_targets
  on public.social_post_targets for all to service_role
  using (true) with check (true);

alter table public.tweet_replies
  add column if not exists client_id uuid null references public.clients(id),
  add column if not exists parent_reply_external_id text null,
  add column if not exists parent_reply_id uuid null,
  add column if not exists conversation_id text null;

commit;
```

## Phase 2 — backfill

O backfill de `OWNED` usa prova estrutural: plataforma X, conta existente, mesma plataforma, mesmo target e mesmo client. O baseline auditado contém 384/384 posts X que satisfazem essas condições.

```sql
begin;

update public.social_posts p
set content_origin = 'OWNED'
from public.social_accounts sa
where lower(p.platform) in ('x', 'twitter')
  and p.content_origin is null
  and sa.id = p.social_account_id
  and lower(sa.platform) in ('x', 'twitter')
  and sa.target_id = p.target_id
  and sa.client_id = p.client_id;

insert into public.social_post_targets
  (post_id, target_id, client_id, match_type, match_term, discovery_source)
select p.id, p.target_id, p.client_id, 'owned', '', 'owned_profile'
from public.social_posts p
where lower(p.platform) in ('x', 'twitter')
  and p.content_origin = 'OWNED'
  and p.target_id is not null
  and p.client_id is not null
on conflict (post_id, target_id, match_type, match_term) do nothing;

update public.tweet_replies r
set client_id = p.client_id,
    parent_reply_external_id = coalesce(
      r.parent_reply_external_id,
      nullif(r.raw_json->>'_v2_reply_to_status_id', '')
    ),
    conversation_id = coalesce(
      r.conversation_id,
      nullif(r.raw_json->>'_v2_conversation_id', '')
    )
from public.social_posts p
where p.id = r.post_id
  and r.client_id is null;

-- Liga parent local somente quando o external ID já existe no mesmo tenant.
update public.tweet_replies child
set parent_reply_id = parent.id
from public.tweet_replies parent
where child.parent_reply_id is null
  and child.parent_reply_external_id = parent.tweet_reply_id
  and child.client_id = parent.client_id;

commit;
```

## Phase 3 — validation

```sql
select content_origin, count(*)
from public.social_posts where lower(platform) in ('x', 'twitter') group by 1;

select count(*) owned_without_relation
from public.social_posts p
where lower(p.platform) in ('x', 'twitter') and p.content_origin = 'OWNED'
and not exists (
  select 1 from public.social_post_targets spt
  where spt.post_id = p.id and spt.target_id = p.target_id
    and spt.client_id = p.client_id and spt.match_type = 'owned'
);

select count(*) replies_without_client
from public.tweet_replies where client_id is null;

select count(*) reply_cross_tenant
from public.tweet_replies r
join public.social_posts p on p.id = r.post_id
where r.client_id is distinct from p.client_id;

select post_id, target_id, match_type, match_term, count(*)
from public.social_post_targets group by 1,2,3,4 having count(*) > 1;
```

Todos os resultados de erro devem ser zero antes da Phase 4.

## Phase 4 — constraints and indexes

```sql
begin;

alter table public.social_posts
  validate constraint social_posts_content_origin_check;

alter table public.tweet_replies
  alter column client_id set not null;

create unique index if not exists uq_tweet_replies_id_client
  on public.tweet_replies (id, client_id);

alter table public.tweet_replies
  add constraint tweet_replies_post_client_fkey
  foreign key (post_id, client_id)
  references public.social_posts(id, client_id) on delete cascade not valid;

alter table public.tweet_replies
  add constraint tweet_replies_target_client_fkey
  foreign key (target_id, client_id)
  references public.targets(id, client_id) on delete cascade not valid;

alter table public.tweet_replies
  add constraint tweet_replies_parent_client_fkey
  foreign key (parent_reply_id, client_id)
  references public.tweet_replies(id, client_id)
  on delete set null (parent_reply_id) not valid;

alter table public.tweet_replies validate constraint tweet_replies_post_client_fkey;
alter table public.tweet_replies validate constraint tweet_replies_target_client_fkey;
alter table public.tweet_replies validate constraint tweet_replies_parent_client_fkey;

create index if not exists idx_tweet_replies_client_post_created
  on public.tweet_replies (client_id, post_id, created_at_twitter desc);
create index if not exists idx_tweet_replies_parent
  on public.tweet_replies (parent_reply_id);
create index if not exists idx_tweet_replies_parent_external
  on public.tweet_replies (client_id, parent_reply_external_id)
  where parent_reply_external_id is not null;
create index if not exists idx_tweet_replies_conversation
  on public.tweet_replies (client_id, conversation_id)
  where conversation_id is not null;

commit;
```

## Phase 5 — RLS/policy de `tweet_replies`

`social_post_targets` já nasce protegida atomicamente na Phase 1. O padrão real encontrado em `social_posts`, `instagram_comments` e `ai_analysis` é acesso direto apenas à `service_role`; não há policy para `anon` ou `authenticated`. A aplicação lê server-side e aplica `client_id + allowedTargetIds`. Para a tabela preexistente `tweet_replies`, habilitação e policy ocorrem na mesma transação, sem policy genérica autenticada.

```sql
begin;

alter table public.tweet_replies enable row level security;

drop policy if exists service_role_full_access_tweet_replies
  on public.tweet_replies;
create policy service_role_full_access_tweet_replies
  on public.tweet_replies for all to service_role
  using (true) with check (true);

commit;
```

Leitura/escrita direta por `anon` e `authenticated`: negada pela ausência de policy. Backend/n8n: service role. Usuários autenticados acessam dados somente por rotas/queries server-side que resolvam client e targets autorizados.

Supabase passou a não expor automaticamente tabelas SQL novas no Data API em projetos/configurações recentes. Antes da Phase 6, confirmar explicitamente nas configurações do Data API que `public.social_post_targets` está exposta ao PostgREST para a service role; o `GRANT` acima é necessário, mas exposição e RLS são controles distintos.

## Phase 6 — application enablement

Somente após todas as validações:

1. atualizar o X V2 para persistir external post com `target_id=NULL`, `social_account_id=NULL`, `client_id` obrigatório e `content_origin='EXTERNAL'`;
2. gravar uma associação por target/match com upsert na constraint `social_post_targets_identity_key`;
3. alterar AI de INSERT para UPSERT em `content_type,content_id`, preservando/verificando `client_id` e `target_id` do conteúdo;
4. passar `client_id`, parent external e conversation em replies;
5. habilitar a query V2 somente depois de testes cross-tenant e regressão Instagram/Legacy;
6. manter schedule, cutover e AI desativados até autorização própria.

## Pós-checks

```sql
-- RLS e policies.
select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('tweet_replies', 'social_post_targets');

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('tweet_replies', 'social_post_targets');

-- Backfills e isolamento.
select count(*) from public.social_posts
where lower(platform) in ('x','twitter') and content_origin = 'OWNED';
select count(*) from public.social_post_targets where match_type = 'owned';
select count(*) from public.tweet_replies where client_id is null;

select count(*) cross_tenant
from public.social_post_targets spt
join public.social_posts p on p.id = spt.post_id
join public.targets t on t.id = spt.target_id
where spt.client_id is distinct from p.client_id
   or spt.client_id is distinct from t.client_id;

-- Idempotência: repetir o INSERT de associação deve manter a contagem.
-- AI: executar UPSERT controlado em ambiente aprovado e confirmar uma linha por
-- (content_type, content_id), usando uq_ai_analysis_content.

-- Parent/conversation.
select count(*) parent_cross_tenant
from public.tweet_replies c join public.tweet_replies p on p.id = c.parent_reply_id
where c.client_id is distinct from p.client_id;
select count(*) from public.tweet_replies where conversation_id is not null;
```

Testes obrigatórios após aplicação: sessão anon sem acesso; sessão authenticated sem acesso direto; service role CRUD controlado; dois tenants com targets distintos; external post relacionado a dois targets do mesmo tenant; tentativa cross-tenant rejeitada pelos FKs compostos; regressão de leitura Instagram e X Legacy.

## Rollback por fase

- **Antes de Phase 2:** remover tabela/colunas/índices novos é tecnicamente reversível, após confirmar zero consumidores.
- **Após Phase 2 e antes de external writes:** pode-se remover backfill de associação e voltar `target_id/social_account_id` a `NOT NULL` somente se os checks confirmarem zero nulos.
- **Após Phase 4:** remover constraints e índices novos em ordem inversa; não remover dados.
- **Após Phase 5:** desabilitar o consumidor antes de alterar policies. Não desligar RLS para restaurar comportamento antigo; corrigir policy.
- **Após Phase 6 / primeiro external post real:** ponto de não-retorno operacional. Não usar `DROP`, não voltar `NOT NULL` e não apagar associações. Rollback passa a ser desligar a feature/pipeline, preservar dados e publicar migration corretiva forward-only.

Nenhum comando de rollback deste documento deve ser automatizado.
