begin;

create table if not exists public.facebook_comments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  target_id uuid not null references public.targets(id) on delete cascade,
  platform text not null default 'facebook' check (platform = 'facebook'),
  social_post_id uuid not null references public.social_posts(id) on delete cascade,
  external_post_id text not null,
  external_comment_id text not null,
  legacy_comment_id text null,
  parent_comment_external_id text null,
  depth integer not null default 0 check (depth >= 0),
  text text null,
  author_id text null,
  author_name text null,
  author_profile_url text null,
  author_profile_image text null,
  published_at timestamptz null,
  reactions_count integer null check (reactions_count >= 0),
  replies_count integer null check (replies_count >= 0),
  content_type text not null check (content_type in ('TEXTUAL','EMOJI_ONLY','STICKER','GIF','IMAGE_ONLY','EMPTY')),
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facebook_comments_client_external_key unique (client_id, external_comment_id)
);

create index if not exists idx_facebook_comments_client_post_published on public.facebook_comments (client_id, social_post_id, published_at desc);
create index if not exists idx_facebook_comments_target on public.facebook_comments (target_id);
create index if not exists idx_facebook_comments_parent_external on public.facebook_comments (client_id, parent_comment_external_id) where parent_comment_external_id is not null;

create or replace function public.validate_facebook_comment_scope()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.social_posts p
    where p.id = new.social_post_id and p.client_id = new.client_id and p.target_id = new.target_id
      and p.platform = 'facebook' and p.platform_post_id = new.external_post_id
  ) then
    raise exception 'FACEBOOK_COMMENT_SCOPE_CONFLICT';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_validate_facebook_comment_scope on public.facebook_comments;
create trigger trg_validate_facebook_comment_scope before insert or update on public.facebook_comments
for each row execute function public.validate_facebook_comment_scope();
revoke execute on function public.validate_facebook_comment_scope() from public, anon, authenticated;

alter table public.facebook_comments enable row level security;
drop policy if exists service_role_full_access_facebook_comments on public.facebook_comments;
create policy service_role_full_access_facebook_comments on public.facebook_comments for all to service_role using (true) with check (true);
revoke all on table public.facebook_comments from anon, authenticated;
grant select, insert, update, delete on table public.facebook_comments to service_role;

create table if not exists public.facebook_audience_analysis (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  target_id uuid not null references public.targets(id) on delete cascade,
  social_post_id uuid not null references public.social_posts(id) on delete cascade,
  platform text not null default 'facebook' check (platform = 'facebook'),
  post_sentiment text null check (post_sentiment in ('POSITIVE','NEGATIVE','NEUTRAL','MIXED')),
  audience_sentiment text null check (audience_sentiment in ('POSITIVE','NEGATIVE','NEUTRAL','MIXED')),
  audience_sentiment_score numeric null check (audience_sentiment_score between -1 and 1),
  positive_comments integer not null default 0 check (positive_comments >= 0),
  neutral_comments integer not null default 0 check (neutral_comments >= 0),
  negative_comments integer not null default 0 check (negative_comments >= 0),
  mixed_comments integer not null default 0 check (mixed_comments >= 0),
  support_level text null, rejection_level text null, polarization_level text null,
  dominant_audience_themes text[] not null default '{}', reputational_risk text null,
  crisis_signals text[] not null default '{}', political_opportunity text null,
  message_audience_divergence text null, executive_summary text null, strategic_reading text null, recommended_action text null,
  confidence numeric null check (confidence between 0 and 1),
  comments_analyzed integer not null default 0 check (comments_analyzed >= 0),
  comments_available boolean not null default false,
  raw_ai_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint facebook_audience_analysis_client_post_key unique (client_id, social_post_id)
);

create index if not exists idx_facebook_audience_analysis_target on public.facebook_audience_analysis (client_id, target_id, updated_at desc);
create or replace function public.validate_facebook_audience_scope()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.social_posts p
    where p.id = new.social_post_id and p.client_id = new.client_id and p.target_id = new.target_id and p.platform = 'facebook'
  ) then
    raise exception 'FACEBOOK_AUDIENCE_SCOPE_CONFLICT';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_validate_facebook_audience_scope on public.facebook_audience_analysis;
create trigger trg_validate_facebook_audience_scope before insert or update on public.facebook_audience_analysis
for each row execute function public.validate_facebook_audience_scope();
revoke execute on function public.validate_facebook_audience_scope() from public, anon, authenticated;
alter table public.facebook_audience_analysis enable row level security;
drop policy if exists service_role_full_access_facebook_audience_analysis on public.facebook_audience_analysis;
create policy service_role_full_access_facebook_audience_analysis on public.facebook_audience_analysis for all to service_role using (true) with check (true);
revoke all on table public.facebook_audience_analysis from anon, authenticated;
grant select, insert, update, delete on table public.facebook_audience_analysis to service_role;

commit;
