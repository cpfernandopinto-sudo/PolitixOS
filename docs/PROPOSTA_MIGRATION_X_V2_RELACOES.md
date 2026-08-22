# Proposta de migration — X V2 (não aplicada)

Status: proposta para revisão humana. Nenhum SQL deste documento foi executado.

## Objetivo

Viabilizar posts externos relacionados a múltiplos targets, origem explícita, termos encontrados, hierarquia de replies e isolamento por tenant. A proposta é aditiva e preserva a identidade de `social_posts` por `(platform, platform_post_id)`.

## SQL proposto

```sql
begin;

alter table public.social_posts
  add column if not exists content_origin text null
  check (content_origin in ('OWNED', 'EXTERNAL', 'QUOTE', 'REPOST'));

create table if not exists public.social_post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  target_id uuid not null references public.targets(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  match_type text not null,
  match_term text null,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_social_post_targets_match
  on public.social_post_targets (post_id, target_id, match_type, coalesce(match_term, ''));
create index if not exists idx_social_post_targets_client_target
  on public.social_post_targets (client_id, target_id);
create index if not exists idx_social_post_targets_post
  on public.social_post_targets (post_id);

alter table public.tweet_replies add column if not exists client_id uuid null references public.clients(id);
alter table public.tweet_replies add column if not exists parent_reply_id uuid null references public.tweet_replies(id);
alter table public.tweet_replies add column if not exists conversation_id text null;
alter table public.tweet_replies add constraint tweet_replies_target_id_fkey
  foreign key (target_id) references public.targets(id) not valid;

create index if not exists idx_tweet_replies_client_post
  on public.tweet_replies (client_id, post_id);
create index if not exists idx_tweet_replies_parent
  on public.tweet_replies (parent_reply_id);
create index if not exists idx_tweet_replies_conversation
  on public.tweet_replies (conversation_id);

alter table public.social_post_targets enable row level security;
alter table public.tweet_replies enable row level security;

-- As policies devem reutilizar a função/padrão tenant oficial do projeto.
-- Não criar policy permissiva genérica. O desenho final depende de revisão
-- conjunta das policies existentes em targets/social_posts e do papel service.

commit;
```

## Etapas obrigatórias antes de aprovação

1. Definir o backfill de `content_origin`: somente evidência verificável pode produzir `OWNED` ou `EXTERNAL`; demais registros permanecem `NULL`/`UNKNOWN` na aplicação.
2. Preencher e validar `tweet_replies.client_id` por `post_id -> social_posts.client_id` antes de cogitar `NOT NULL`.
3. Popular `social_post_targets` com a associação legada sem duplicar posts.
4. Validar o FK de `tweet_replies.target_id` após conferir todos os registros.
5. Definir policies tenant e testá-las com dois clientes distintos antes de habilitar consumo pela aplicação.
6. Resolver a representação do autor externo. `social_accounts` é hoje target-bound e não deve ser reutilizada sem decisão arquitetural.
7. Decidir em fase posterior se `social_posts.target_id` e `social_account_id` poderão se tornar opcionais para posts externos. Isso não faz parte desta proposta inicial.

## Reversibilidade

Antes de adoção por consumidores, as colunas, índices e tabela novos podem ser removidos em ordem inversa. Após persistência real, rollback deve preservar/exportar as associações; não executar `DROP` automaticamente.
