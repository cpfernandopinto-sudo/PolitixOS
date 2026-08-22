-- Facebook Bloco 2E: atomic tenant-safe persistence on the consolidated post key.
-- Additive and reversible with:
--   drop function if exists public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb);

create or replace function public.persist_facebook_social_posts(
  p_client_id uuid,
  p_target_id uuid,
  p_social_account_id uuid,
  p_rows jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_input_count integer;
  v_persisted_count integer;
  v_has_cross_tenant_conflict boolean;
begin
  if p_client_id is null or p_target_id is null or p_social_account_id is null then
    raise exception using errcode = 'P0001', message = 'FACEBOOK_TENANT_CONTEXT_MISSING';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = 'P0001', message = 'FACEBOOK_POST_BATCH_INVALID';
  end if;

  v_input_count := jsonb_array_length(p_rows);
  if v_input_count = 0 then
    return 0;
  end if;
  if v_input_count > 100 then
    raise exception using errcode = 'P0001', message = 'FACEBOOK_POST_BATCH_TOO_LARGE';
  end if;

  if not exists (
    select 1
    from public.targets t
    where t.id = p_target_id
      and t.client_id = p_client_id
      and coalesce(t.is_active, true)
  ) or not exists (
    select 1
    from public.social_accounts a
    where a.id = p_social_account_id
      and a.target_id = p_target_id
      and a.client_id = p_client_id
      and a.platform = 'facebook'
      and a.is_active
  ) then
    raise exception using errcode = 'P0001', message = 'FACEBOOK_TENANT_CONTEXT_INVALID';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) item
    where nullif(btrim(item->>'platform_post_id'), '') is null
  ) then
    raise exception using errcode = 'P0001', message = 'FACEBOOK_POST_BATCH_INVALID';
  end if;

  if (
    select count(distinct item->>'platform_post_id')
    from jsonb_array_elements(p_rows) item
  ) <> v_input_count then
    raise exception using errcode = 'P0001', message = 'FACEBOOK_POST_BATCH_DUPLICATE_ID';
  end if;

  with input_rows as (
    select *
    from jsonb_to_recordset(p_rows) as r(
      platform_post_id text,
      post_url text,
      caption text,
      media_type text,
      media_url text,
      like_count integer,
      comment_count integer,
      share_count integer,
      view_count integer,
      taken_at timestamptz,
      collected_at timestamptz,
      content_type text,
      content_origin text,
      raw_json jsonb
    )
  ), persisted as (
    insert into public.social_posts (
      client_id, target_id, social_account_id, platform, platform_post_id,
      post_url, caption, media_type, media_url, like_count, comment_count,
      share_count, view_count, taken_at, collected_at, content_type,
      content_origin, raw_json
    )
    select
      p_client_id, p_target_id, p_social_account_id, 'facebook', r.platform_post_id,
      r.post_url, r.caption, r.media_type, r.media_url, r.like_count,
      r.comment_count, r.share_count, r.view_count, r.taken_at,
      coalesce(r.collected_at, now()), r.content_type, r.content_origin, r.raw_json
    from input_rows r
    on conflict (platform, platform_post_id) do update set
      post_url = excluded.post_url,
      caption = excluded.caption,
      media_type = excluded.media_type,
      media_url = excluded.media_url,
      like_count = excluded.like_count,
      comment_count = excluded.comment_count,
      share_count = excluded.share_count,
      view_count = excluded.view_count,
      taken_at = excluded.taken_at,
      collected_at = excluded.collected_at,
      content_type = excluded.content_type,
      content_origin = excluded.content_origin,
      raw_json = excluded.raw_json
    where social_posts.client_id = excluded.client_id
      and social_posts.target_id = excluded.target_id
      and social_posts.social_account_id = excluded.social_account_id
    returning 1
  )
  select count(*) into v_persisted_count from persisted;

  if v_persisted_count <> v_input_count then
    select coalesce(bool_or(sp.client_id is distinct from p_client_id), false)
      into v_has_cross_tenant_conflict
    from public.social_posts sp
    join jsonb_array_elements(p_rows) item
      on sp.platform = 'facebook'
     and sp.platform_post_id = item->>'platform_post_id';

    if v_has_cross_tenant_conflict then
      raise exception using errcode = 'P0001', message = 'FACEBOOK_CROSS_TENANT_POST_CONFLICT';
    end if;
    raise exception using errcode = 'P0001', message = 'FACEBOOK_POST_CONTEXT_CONFLICT';
  end if;

  return v_persisted_count;
end;
$function$;

comment on function public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb) is
  'Atomically persists Facebook posts without permitting the consolidated key to change tenant, target, or social account ownership.';

revoke all on function public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb) from public;
revoke all on function public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb) from anon;
revoke all on function public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb) from authenticated;
grant execute on function public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb) to service_role;
