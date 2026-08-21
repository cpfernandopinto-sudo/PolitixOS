-- PolitixOS — Instagram Bloco 3A
-- Contrato canônico de conteúdo, classificação automática e backfill seguro.
-- Migration aditiva, nullable, reexecutável e sem alteração de identidade.

begin;

alter table public.social_posts
  add column if not exists content_type text;

comment on column public.social_posts.content_type is
  'Formato canônico do conteúdo Instagram: IMAGE, REEL, CAROUSEL, VIDEO ou OUTRO. NULL para canais não classificados.';

create or replace function public.classify_social_content_type(
  source_platform text,
  source_media_type text,
  source_raw_json jsonb
)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  with normalized as (
    select
      lower(btrim(coalesce(source_platform, ''))) as platform,
      lower(btrim(coalesce(
        nullif(source_media_type, ''),
        source_raw_json ->> 'media_type',
        source_raw_json ->> 'mediaType',
        ''
      ))) as media_type,
      lower(btrim(coalesce(
        source_raw_json ->> 'product_type',
        source_raw_json ->> 'productType',
        ''
      ))) as product_type
  )
  select case
    when platform <> 'instagram' then null
    when media_type in ('image', 'photo', '1') then 'IMAGE'
    when media_type in ('carousel', 'carousel_container', '8') then 'CAROUSEL'
    when media_type in ('video', '2') and product_type = 'clips' then 'REEL'
    when media_type in ('video', '2') then 'VIDEO'
    else 'OUTRO'
  end
  from normalized;
$$;

create or replace function public.sync_social_posts_content_type()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.content_type := public.classify_social_content_type(
    new.platform,
    new.media_type,
    new.raw_json
  );
  return new;
end;
$$;

drop trigger if exists trg_sync_social_posts_content_type on public.social_posts;

create trigger trg_sync_social_posts_content_type
before insert or update of platform, media_type, raw_json
on public.social_posts
for each row
execute function public.sync_social_posts_content_type();

update public.social_posts
set content_type = public.classify_social_content_type(platform, media_type, raw_json)
where platform = 'instagram'
  and content_type is distinct from public.classify_social_content_type(platform, media_type, raw_json);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.social_posts'::regclass
      and conname = 'social_posts_content_type_check'
  ) then
    alter table public.social_posts
      add constraint social_posts_content_type_check
      check (content_type is null or content_type in ('IMAGE', 'REEL', 'CAROUSEL', 'VIDEO', 'OUTRO'))
      not valid;
  end if;
end;
$$;

alter table public.social_posts
  validate constraint social_posts_content_type_check;

commit;

-- Rollback compensatório (executar somente em migration posterior, se necessário):
-- drop trigger if exists trg_sync_social_posts_content_type on public.social_posts;
-- drop function if exists public.sync_social_posts_content_type();
-- drop function if exists public.classify_social_content_type(text, text, jsonb);
-- alter table public.social_posts drop constraint if exists social_posts_content_type_check;
-- alter table public.social_posts drop column if exists content_type;
