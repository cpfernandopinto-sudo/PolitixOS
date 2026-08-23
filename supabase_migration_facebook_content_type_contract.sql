-- PolitixOS — Facebook Bloco 4
-- Estende o contrato canônico de content_type para suportar Facebook.
-- Migration aditiva: não altera a coluna, o CHECK constraint (mesmo domínio de
-- valores IMAGE/REEL/CAROUSEL/VIDEO/OUTRO já é suficiente) nem o trigger.
-- A lógica do Instagram permanece byte-a-byte idêntica; apenas um novo branch
-- para platform = 'facebook' é adicionado antes do fallback NULL.

begin;

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
    when platform = 'instagram' then (
      case
        when media_type in ('image', 'photo', '1') then 'IMAGE'
        when media_type in ('carousel', 'carousel_container', '8') then 'CAROUSEL'
        when media_type in ('video', '2') and product_type = 'clips' then 'REEL'
        when media_type in ('video', '2') then 'VIDEO'
        else 'OUTRO'
      end
    )
    when platform = 'facebook' then (
      case
        when media_type in ('image', 'photo') then 'IMAGE'
        when media_type = 'reel' then 'REEL'
        when media_type in ('album', 'carousel') then 'CAROUSEL'
        when media_type = 'video' then 'VIDEO'
        else 'OUTRO'
      end
    )
    else null
  end
  from normalized;
$$;

comment on function public.classify_social_content_type(text, text, jsonb) is
  'Formato canônico do conteúdo por plataforma (hoje: Instagram e Facebook). NULL para canais não classificados.';

-- Backfill: somente linhas Facebook (Instagram já está correto e o CREATE OR
-- REPLACE não muda o resultado do branch Instagram, portanto nenhum backfill
-- ali é necessário).
update public.social_posts
set content_type = public.classify_social_content_type(platform, media_type, raw_json)
where platform = 'facebook'
  and content_type is distinct from public.classify_social_content_type(platform, media_type, raw_json);

commit;

-- Rollback compensatório (executar somente em migration posterior, se necessário):
-- restaurar a definição anterior de classify_social_content_type (somente
-- branch Instagram, else null) via supabase_migration_instagram_content_type_contract.sql
-- e rodar o mesmo backfill acima trocando platform = 'facebook' por 'instagram'
-- não é necessário pois o branch anterior já cobria isso.
