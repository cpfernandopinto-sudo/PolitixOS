-- ECO-03B1.5: infraestrutura operacional Novo CAGED. Sem alteração analítica.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('politixos-caged-raw', 'politixos-caged-raw', false, 1073741824, array['application/x-7z-compressed','application/json'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.source_collection_runs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid(),
  source text not null,
  scope text not null,
  declaration_month text,
  status text not null default 'pending' check (status in ('pending','running','partial','completed','failed')),
  workflow_name text,
  workflow_version text,
  started_at timestamptz,
  finished_at timestamptz,
  items_collected bigint not null default 0,
  items_processed bigint not null default 0,
  items_discarded bigint not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (declaration_month is null or declaration_month ~ '^20[0-9]{4}$')
);
create index if not exists idx_source_collection_runs_lookup on public.source_collection_runs (source, scope, declaration_month, created_at desc);
alter table public.source_collection_runs enable row level security;
revoke all on public.source_collection_runs from anon, authenticated;
grant all on public.source_collection_runs to service_role;

create table if not exists public.source_collection_leases (
  source text not null,
  scope text not null,
  declaration_month text not null check (declaration_month ~ '^20[0-9]{4}$'),
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  owner_id uuid not null,
  primary key (source, scope, declaration_month)
);
alter table public.source_collection_leases enable row level security;
revoke all on public.source_collection_leases from anon, authenticated;
grant all on public.source_collection_leases to service_role;

create or replace function public.acquire_source_collection_lease(
  p_source text, p_scope text, p_declaration_month text, p_owner_id uuid, p_ttl_seconds integer default 7200
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_declaration_month !~ '^20[0-9]{4}$' or p_ttl_seconds < 60 then return false; end if;
  delete from public.source_collection_leases
   where source=p_source and scope=p_scope and declaration_month=p_declaration_month and expires_at <= now();
  insert into public.source_collection_leases(source,scope,declaration_month,locked_at,expires_at,owner_id)
  values(p_source,p_scope,p_declaration_month,now(),now()+make_interval(secs=>p_ttl_seconds),p_owner_id)
  on conflict do nothing;
  return found;
end $$;
revoke all on function public.acquire_source_collection_lease(text,text,text,uuid,integer) from public, anon, authenticated;
grant execute on function public.acquire_source_collection_lease(text,text,text,uuid,integer) to service_role;

