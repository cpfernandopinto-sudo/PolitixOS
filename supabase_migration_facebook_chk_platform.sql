-- FACEBOOK BLOCO 2D: allow the canonical Facebook platform in social_posts.
-- Minimal scope: only public.social_posts.chk_platform is replaced.
begin;

do $$
declare
  current_definition text;
begin
  select pg_get_constraintdef(oid, true)
    into current_definition
  from pg_constraint
  where conrelid = 'public.social_posts'::regclass
    and conname = 'chk_platform'
    and contype = 'c';

  if current_definition is distinct from
    'CHECK (platform = ANY (ARRAY[''instagram''::text, ''tiktok''::text, ''youtube''::text, ''x''::text]))'
  then
    raise exception 'FACEBOOK_CHK_PLATFORM_PREFLIGHT_MISMATCH: %', current_definition;
  end if;

  if exists (
    select 1 from public.social_posts
    where platform not in ('instagram', 'tiktok', 'youtube', 'x')
  ) then
    raise exception 'FACEBOOK_CHK_PLATFORM_INVALID_EXISTING_ROWS';
  end if;
end;
$$;

alter table public.social_posts
  drop constraint chk_platform;

alter table public.social_posts
  add constraint chk_platform
  check (platform in ('instagram', 'tiktok', 'youtube', 'x', 'facebook'))
  not valid;

alter table public.social_posts
  validate constraint chk_platform;

commit;

-- Conceptual rollback (do not execute in this block):
-- 1. Confirm that no rows with platform = 'facebook' exist, or handle them
--    explicitly under a separately authorized data-change plan.
-- 2. In one transaction, replace chk_platform with the original definition:
--    CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'x')).
