-- WhatsApp Intelligence V1 (Sprint 13).
-- Fonte de verdade: docs/SPRINT_13_WHATSAPP_INTELLIGENCE_V1_ARQUITETURA_MESTRE.md (contrato Codex), secoes 3 e 4.
-- Reversible with: ver supabase_rollback_whatsapp_intelligence_v1.sql

create table if not exists public.whatsapp_instances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  provider text not null default 'zapi',
  provider_instance_id text not null,
  display_name text,
  phone_e164 text,
  status text not null default 'ACTIVE',
  last_webhook_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_instances_provider_lower_chk check (provider = lower(provider) and length(btrim(provider)) > 0),
  constraint whatsapp_instances_status_chk check (status in ('ACTIVE', 'INACTIVE', 'ERROR')),
  constraint whatsapp_instances_unique unique (client_id, provider, provider_instance_id),
  constraint whatsapp_instances_id_client_unique unique (id, client_id)
);

comment on table public.whatsapp_instances is
  'Conexao logica de WhatsApp por cliente. provider/provider_instance_id sao provider-agnostic por desenho (contrato Sprint 13 secao 3.1). Nunca armazenar token/secret aqui.';

create index if not exists idx_whatsapp_instances_client_status
  on public.whatsapp_instances (client_id, status);

create table if not exists public.whatsapp_chats (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  instance_id uuid not null,
  provider_chat_id text not null,
  chat_type text not null default 'UNKNOWN',
  name text,
  is_active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_chats_type_chk check (chat_type in ('GROUP', 'DIRECT', 'BROADCAST', 'UNKNOWN')),
  constraint whatsapp_chats_unique unique (instance_id, provider_chat_id),
  constraint whatsapp_chats_id_client_unique unique (id, client_id),
  constraint whatsapp_chats_instance_fk foreign key (instance_id, client_id)
    references public.whatsapp_instances (id, client_id) on delete restrict
);

comment on table public.whatsapp_chats is
  'Grupo ou conversa direta de uma instancia. FK composta (instance_id, client_id) impede cruzamento acidental de tenant (contrato secao 3.2).';

create index if not exists idx_whatsapp_chats_client_type_last_msg
  on public.whatsapp_chats (client_id, chat_type, last_message_at desc);
create index if not exists idx_whatsapp_chats_client_active
  on public.whatsapp_chats (client_id, is_active);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  instance_id uuid not null,
  chat_id uuid not null,
  provider_message_id text not null,
  provider_event_id text,
  sender_provider_id text,
  sender_name text,
  sender_phone_e164 text,
  message_type text not null default 'UNKNOWN',
  text text,
  caption text,
  media_url text,
  media_mime_type text,
  media_file_name text,
  media_size_bytes bigint,
  quoted_provider_message_id text,
  from_me boolean not null default false,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  analysis_status text not null default 'PENDING',
  analysis_attempts smallint not null default 0,
  analysis_error text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_messages_type_chk check (
    message_type in ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACT', 'SYSTEM', 'UNKNOWN')
  ),
  constraint whatsapp_messages_analysis_status_chk check (
    analysis_status in ('PENDING', 'PROCESSING', 'COMPLETED', 'SKIPPED', 'FAILED')
  ),
  constraint whatsapp_messages_attempts_chk check (analysis_attempts >= 0),
  constraint whatsapp_messages_media_size_chk check (media_size_bytes is null or media_size_bytes >= 0),
  constraint whatsapp_messages_unique unique (instance_id, provider_message_id),
  constraint whatsapp_messages_id_client_unique unique (id, client_id),
  constraint whatsapp_messages_instance_fk foreign key (instance_id, client_id)
    references public.whatsapp_instances (id, client_id) on delete restrict,
  constraint whatsapp_messages_chat_fk foreign key (chat_id, client_id)
    references public.whatsapp_chats (id, client_id) on delete restrict
);

comment on table public.whatsapp_messages is
  'Registro imutavel da mensagem recebida. UNIQUE(instance_id, provider_message_id) e a protecao atomica de deduplicacao (contrato secao 3.3/3.5). raw_payload nunca vai ao frontend.';

create index if not exists idx_whatsapp_messages_feed
  on public.whatsapp_messages (client_id, occurred_at desc, id desc);
create index if not exists idx_whatsapp_messages_client_chat_occurred
  on public.whatsapp_messages (client_id, chat_id, occurred_at desc);
create index if not exists idx_whatsapp_messages_client_status_occurred
  on public.whatsapp_messages (client_id, analysis_status, occurred_at);
create index if not exists idx_whatsapp_messages_client_sender
  on public.whatsapp_messages (client_id, sender_provider_id);

create table if not exists public.whatsapp_analysis (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  message_id uuid not null,
  schema_version text not null default '1.0',
  model_provider text not null,
  model_name text not null,
  prompt_version text not null,
  status text not null,
  theme text,
  subtheme text,
  sentiment text,
  sentiment_score numeric(5, 4),
  relevance text,
  ai_summary text,
  intent text,
  risk_level text,
  mentioned_candidates jsonb not null default '[]'::jsonb,
  mentioned_entities jsonb not null default '[]'::jsonb,
  mentioned_locations jsonb not null default '[]'::jsonb,
  confidence numeric(5, 4),
  raw_response jsonb,
  latency_ms integer,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint whatsapp_analysis_status_chk check (status in ('COMPLETED', 'FAILED')),
  constraint whatsapp_analysis_sentiment_chk check (
    sentiment is null or sentiment in ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED', 'UNKNOWN')
  ),
  constraint whatsapp_analysis_relevance_chk check (
    relevance is null or relevance in ('HIGH', 'MEDIUM', 'LOW', 'NONE')
  ),
  constraint whatsapp_analysis_risk_chk check (
    risk_level is null or risk_level in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE', 'UNKNOWN')
  ),
  constraint whatsapp_analysis_sentiment_score_chk check (sentiment_score is null or (sentiment_score >= -1 and sentiment_score <= 1)),
  constraint whatsapp_analysis_confidence_chk check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint whatsapp_analysis_latency_chk check (latency_ms is null or latency_ms >= 0),
  constraint whatsapp_analysis_candidates_arr_chk check (jsonb_typeof(mentioned_candidates) = 'array'),
  constraint whatsapp_analysis_entities_arr_chk check (jsonb_typeof(mentioned_entities) = 'array'),
  constraint whatsapp_analysis_locations_arr_chk check (jsonb_typeof(mentioned_locations) = 'array'),
  constraint whatsapp_analysis_unique unique (message_id, schema_version, prompt_version, model_name),
  constraint whatsapp_analysis_message_fk foreign key (message_id, client_id)
    references public.whatsapp_messages (id, client_id) on delete cascade
);

comment on table public.whatsapp_analysis is
  'Classificacao IA por mensagem (contrato secao 3.4/6). UNIQUE(message_id, schema_version, prompt_version, model_name) permite retry idempotente da mesma execucao logica.';

create index if not exists idx_whatsapp_analysis_client_analyzed
  on public.whatsapp_analysis (client_id, analyzed_at desc);
create index if not exists idx_whatsapp_analysis_client_sentiment
  on public.whatsapp_analysis (client_id, sentiment, analyzed_at desc);
create index if not exists idx_whatsapp_analysis_client_risk
  on public.whatsapp_analysis (client_id, risk_level, analyzed_at desc);
create index if not exists idx_whatsapp_analysis_client_relevance
  on public.whatsapp_analysis (client_id, relevance, analyzed_at desc);
create index if not exists idx_whatsapp_analysis_client_theme
  on public.whatsapp_analysis (client_id, theme, analyzed_at desc);

alter table public.whatsapp_instances enable row level security;
alter table public.whatsapp_chats enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_analysis enable row level security;

create policy service_role_full_access_whatsapp_instances on public.whatsapp_instances
  for all to service_role using (true) with check (true);
create policy service_role_full_access_whatsapp_chats on public.whatsapp_chats
  for all to service_role using (true) with check (true);
create policy service_role_full_access_whatsapp_messages on public.whatsapp_messages
  for all to service_role using (true) with check (true);
create policy service_role_full_access_whatsapp_analysis on public.whatsapp_analysis
  for all to service_role using (true) with check (true);

-- Hardening: sem policy para anon/authenticated, RLS ja bloqueia leitura/escrita,
-- mas revoke explicito tambem tira as 4 tabelas do schema GraphQL exposto
-- (lint pg_graphql_anon_table_exposed / pg_graphql_authenticated_table_exposed).
revoke all on public.whatsapp_instances from anon, authenticated;
revoke all on public.whatsapp_chats from anon, authenticated;
revoke all on public.whatsapp_messages from anon, authenticated;
revoke all on public.whatsapp_analysis from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC 1: ingestao idempotente da mensagem (contrato secao 2.3, 3.5, 4.1 passos 5-7).
-- Resolve instancia/client_id de forma confiavel a partir de (provider, provider_instance_id)
-- cadastrados previamente em whatsapp_instances — NUNCA confia em client_id vindo do payload externo.
-- ---------------------------------------------------------------------------
create or replace function public.ingest_whatsapp_message_v1(p_event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_provider text;
  v_provider_instance_id text;
  v_provider_message_id text;
  v_provider_chat_id text;
  v_chat_type text;
  v_chat_name text;
  v_occurred_at timestamptz;
  v_received_at timestamptz;
  v_from_me boolean;
  v_message_type text;
  v_text text;
  v_caption text;
  v_media_size_bytes bigint;
  v_client_id uuid;
  v_instance_id uuid;
  v_chat_id uuid;
  v_message_id uuid;
  v_status text;
  v_should_analyze boolean;
begin
  v_provider := lower(nullif(btrim(p_event->>'provider'), ''));
  v_provider_instance_id := nullif(btrim(p_event->>'provider_instance_id'), '');
  v_provider_message_id := nullif(btrim(p_event->>'provider_message_id'), '');
  v_provider_chat_id := nullif(btrim(p_event#>>'{chat,provider_chat_id}'), '');
  v_chat_type := upper(coalesce(nullif(btrim(p_event#>>'{chat,type}'), ''), 'UNKNOWN'));
  v_chat_name := nullif(btrim(p_event#>>'{chat,name}'), '');
  v_from_me := coalesce((p_event->>'from_me')::boolean, false);
  v_message_type := upper(coalesce(nullif(btrim(p_event#>>'{message,type}'), ''), 'UNKNOWN'));
  v_text := nullif(btrim(p_event#>>'{message,text}'), '');
  v_caption := nullif(btrim(p_event#>>'{message,caption}'), '');

  begin
    v_occurred_at := (p_event->>'occurred_at')::timestamptz;
  exception when others then
    v_occurred_at := null;
  end;
  begin
    v_received_at := coalesce((p_event->>'received_at')::timestamptz, now());
  exception when others then
    v_received_at := now();
  end;
  begin
    v_media_size_bytes := nullif(p_event#>>'{message,media,size_bytes}', '')::bigint;
  exception when others then
    v_media_size_bytes := null;
  end;

  if v_provider is null or v_provider_instance_id is null or v_provider_message_id is null
     or v_provider_chat_id is null or v_occurred_at is null then
    raise exception using errcode = 'P0001', message = 'WHATSAPP_EVENT_INVALID';
  end if;

  if v_chat_type not in ('GROUP', 'DIRECT', 'BROADCAST', 'UNKNOWN') then
    v_chat_type := 'UNKNOWN';
  end if;
  if v_message_type not in ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACT', 'SYSTEM', 'UNKNOWN') then
    v_message_type := 'UNKNOWN';
  end if;

  select id, client_id into v_instance_id, v_client_id
  from public.whatsapp_instances
  where provider = v_provider
    and provider_instance_id = v_provider_instance_id
    and status = 'ACTIVE';

  if not found then
    raise exception using errcode = 'P0001', message = 'WHATSAPP_INSTANCE_NOT_FOUND_OR_INACTIVE';
  end if;

  update public.whatsapp_instances
    set last_webhook_at = now(), updated_at = now()
    where id = v_instance_id;

  insert into public.whatsapp_chats (client_id, instance_id, provider_chat_id, chat_type, name, first_seen_at, last_message_at)
  values (v_client_id, v_instance_id, v_provider_chat_id, v_chat_type, v_chat_name, now(), v_occurred_at)
  on conflict (instance_id, provider_chat_id) do update set
    chat_type = excluded.chat_type,
    name = coalesce(excluded.name, public.whatsapp_chats.name),
    last_message_at = greatest(public.whatsapp_chats.last_message_at, excluded.last_message_at),
    updated_at = now()
  returning id into v_chat_id;

  insert into public.whatsapp_messages (
    client_id, instance_id, chat_id, provider_message_id, provider_event_id,
    sender_provider_id, sender_name, sender_phone_e164, message_type, text, caption,
    media_url, media_mime_type, media_file_name, media_size_bytes,
    quoted_provider_message_id, from_me, occurred_at, received_at, raw_payload
  )
  values (
    v_client_id, v_instance_id, v_chat_id, v_provider_message_id, nullif(btrim(p_event->>'event_id'), ''),
    nullif(btrim(p_event#>>'{sender,provider_sender_id}'), ''),
    nullif(btrim(p_event#>>'{sender,display_name}'), ''),
    nullif(btrim(p_event#>>'{sender,phone_e164}'), ''),
    v_message_type, v_text, v_caption,
    nullif(btrim(p_event#>>'{message,media,url}'), ''),
    nullif(btrim(p_event#>>'{message,media,mime_type}'), ''),
    nullif(btrim(p_event#>>'{message,media,file_name}'), ''),
    v_media_size_bytes,
    nullif(btrim(p_event#>>'{message,quoted_provider_message_id}'), ''),
    v_from_me,
    v_occurred_at,
    v_received_at,
    coalesce(p_event->'raw_payload', '{}'::jsonb)
  )
  on conflict (instance_id, provider_message_id) do nothing
  returning id into v_message_id;

  if v_message_id is null then
    v_status := 'DUPLICATE';
    v_should_analyze := false;
    select id into v_message_id
    from public.whatsapp_messages
    where instance_id = v_instance_id and provider_message_id = v_provider_message_id;
  else
    v_status := 'INSERTED';
    v_should_analyze := (not v_from_me) and v_message_type = 'TEXT' and v_text is not null;
    if not v_should_analyze then
      update public.whatsapp_messages
        set analysis_status = 'SKIPPED', updated_at = now()
        where id = v_message_id;
    end if;
  end if;

  return jsonb_build_object(
    'status', v_status,
    'instance_id', v_instance_id,
    'client_id', v_client_id,
    'chat_id', v_chat_id,
    'message_id', v_message_id,
    'should_analyze', v_should_analyze
  );
end;
$function$;

comment on function public.ingest_whatsapp_message_v1(jsonb) is
  'Ingestao idempotente do evento canonico whatsapp.message.received.v1 (contrato Sprint 13). Resolve client_id/instance_id internamente a partir de (provider, provider_instance_id) — nunca confia no client_id do payload.';

revoke all on function public.ingest_whatsapp_message_v1(jsonb) from public;
revoke all on function public.ingest_whatsapp_message_v1(jsonb) from anon;
revoke all on function public.ingest_whatsapp_message_v1(jsonb) from authenticated;
grant execute on function public.ingest_whatsapp_message_v1(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- RPC 2: claim atomico da mensagem para analise (contrato secao 3.5 ponto 5).
-- Evita dois classificadores simultaneos; incrementa analysis_attempts.
-- ---------------------------------------------------------------------------
create or replace function public.claim_whatsapp_message_for_analysis_v1(p_message_id uuid, p_max_attempts smallint default 3)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_attempts smallint;
begin
  update public.whatsapp_messages
    set analysis_status = 'PROCESSING',
        analysis_attempts = analysis_attempts + 1,
        updated_at = now()
    where id = p_message_id
      and analysis_status in ('PENDING', 'FAILED')
      and analysis_attempts < p_max_attempts
    returning analysis_attempts into v_attempts;

  if not found then
    return jsonb_build_object('claimed', false);
  end if;

  return jsonb_build_object('claimed', true, 'attempts', v_attempts);
end;
$function$;

comment on function public.claim_whatsapp_message_for_analysis_v1(uuid, smallint) is
  'Muda PENDING|FAILED -> PROCESSING de forma atomica e incrementa analysis_attempts, evitando classificacao concorrente da mesma mensagem.';

revoke all on function public.claim_whatsapp_message_for_analysis_v1(uuid, smallint) from public;
revoke all on function public.claim_whatsapp_message_for_analysis_v1(uuid, smallint) from anon;
revoke all on function public.claim_whatsapp_message_for_analysis_v1(uuid, smallint) from authenticated;
grant execute on function public.claim_whatsapp_message_for_analysis_v1(uuid, smallint) to service_role;

-- ---------------------------------------------------------------------------
-- RPC 3: persistencia da analise validada (contrato secao 3.5 ponto 6, secao 6).
-- ---------------------------------------------------------------------------
create or replace function public.persist_whatsapp_analysis_v1(p_message_id uuid, p_analysis jsonb, p_latency_ms integer default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_client_id uuid;
  v_analysis_id uuid;
begin
  select client_id into v_client_id from public.whatsapp_messages where id = p_message_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'WHATSAPP_MESSAGE_NOT_FOUND';
  end if;

  insert into public.whatsapp_analysis (
    client_id, message_id, schema_version, model_provider, model_name, prompt_version, status,
    theme, subtheme, sentiment, sentiment_score, relevance, ai_summary, intent, risk_level,
    mentioned_candidates, mentioned_entities, mentioned_locations, confidence, raw_response, latency_ms
  )
  values (
    v_client_id, p_message_id,
    coalesce(nullif(btrim(p_analysis->>'schema_version'), ''), '1.0'),
    coalesce(nullif(btrim(p_analysis->>'model_provider'), ''), 'google'),
    coalesce(nullif(btrim(p_analysis->>'model_name'), ''), 'unknown'),
    coalesce(nullif(btrim(p_analysis->>'prompt_version'), ''), 'whatsapp_mvp_v1'),
    'COMPLETED',
    nullif(btrim(p_analysis->>'theme'), ''),
    nullif(btrim(p_analysis->>'subtheme'), ''),
    upper(nullif(btrim(p_analysis->>'sentiment'), '')),
    nullif(p_analysis->>'sentiment_score', '')::numeric(5, 4),
    upper(nullif(btrim(p_analysis->>'relevance'), '')),
    nullif(btrim(p_analysis->>'summary'), ''),
    upper(nullif(btrim(p_analysis->>'intent'), '')),
    upper(nullif(btrim(p_analysis->>'risk_level'), '')),
    coalesce(p_analysis->'mentioned_candidates', '[]'::jsonb),
    coalesce(p_analysis->'mentioned_entities', '[]'::jsonb),
    coalesce(p_analysis->'mentioned_locations', '[]'::jsonb),
    nullif(p_analysis->>'confidence', '')::numeric(5, 4),
    p_analysis,
    p_latency_ms
  )
  on conflict (message_id, schema_version, prompt_version, model_name) do update set
    status = 'COMPLETED',
    theme = excluded.theme,
    subtheme = excluded.subtheme,
    sentiment = excluded.sentiment,
    sentiment_score = excluded.sentiment_score,
    relevance = excluded.relevance,
    ai_summary = excluded.ai_summary,
    intent = excluded.intent,
    risk_level = excluded.risk_level,
    mentioned_candidates = excluded.mentioned_candidates,
    mentioned_entities = excluded.mentioned_entities,
    mentioned_locations = excluded.mentioned_locations,
    confidence = excluded.confidence,
    raw_response = excluded.raw_response,
    latency_ms = excluded.latency_ms,
    analyzed_at = now()
  returning id into v_analysis_id;

  update public.whatsapp_messages
    set analysis_status = 'COMPLETED', analysis_error = null, updated_at = now()
    where id = p_message_id;

  return jsonb_build_object('analysis_id', v_analysis_id, 'message_id', p_message_id, 'status', 'COMPLETED');
end;
$function$;

comment on function public.persist_whatsapp_analysis_v1(uuid, jsonb, integer) is
  'Upsert idempotente da analise validada e marca a mensagem COMPLETED (contrato secao 3.5/6). Nao aceita analise sem os campos minimos.';

revoke all on function public.persist_whatsapp_analysis_v1(uuid, jsonb, integer) from public;
revoke all on function public.persist_whatsapp_analysis_v1(uuid, jsonb, integer) from anon;
revoke all on function public.persist_whatsapp_analysis_v1(uuid, jsonb, integer) from authenticated;
grant execute on function public.persist_whatsapp_analysis_v1(uuid, jsonb, integer) to service_role;

-- ---------------------------------------------------------------------------
-- RPC 4: falha de analise (contrato secao 3.5/4.2) — preserva a mensagem, nunca perde dado.
-- ---------------------------------------------------------------------------
create or replace function public.fail_whatsapp_analysis_v1(p_message_id uuid, p_error text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  update public.whatsapp_messages
    set analysis_status = 'FAILED',
        analysis_error = left(coalesce(p_error, 'unknown_error'), 500),
        updated_at = now()
    where id = p_message_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'WHATSAPP_MESSAGE_NOT_FOUND';
  end if;

  return jsonb_build_object('message_id', p_message_id, 'status', 'FAILED');
end;
$function$;

comment on function public.fail_whatsapp_analysis_v1(uuid, text) is
  'Marca FAILED preservando a mensagem para retry controlado (ate 3 tentativas via claim_whatsapp_message_for_analysis_v1).';

revoke all on function public.fail_whatsapp_analysis_v1(uuid, text) from public;
revoke all on function public.fail_whatsapp_analysis_v1(uuid, text) from anon;
revoke all on function public.fail_whatsapp_analysis_v1(uuid, text) from authenticated;
grant execute on function public.fail_whatsapp_analysis_v1(uuid, text) to service_role;
