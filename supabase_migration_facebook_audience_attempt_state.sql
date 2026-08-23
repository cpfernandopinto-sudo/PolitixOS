-- PolitixOS — Facebook — Máquina de estados de tentativa do Comments Audience
--
-- Problema real (produção): um post cuja coleta/análise de comentários falha
-- não deixa NENHUM rastro no banco (nem facebook_comments, nem
-- facebook_audience_analysis são escritos). A view
-- facebook_posts_pending_audience só exclui um post quando existe uma linha
-- em facebook_audience_analysis — então um post que falhou reaparece como
-- elegível em TODA execução futura de /analyze, indefinidamente, mesmo que a
-- causa da falha nunca vá se resolver sozinha (ex.: post sem suporte a
-- comentários, erro 4xx do provider).
--
-- Migration ADITIVA: 5 colunas novas em facebook_audience_analysis (todas com
-- default seguro para as linhas já existentes — todas as linhas atuais são
-- sucessos reais, então status default 'SUCCESS' é correto para elas).
-- Nenhuma coluna removida, nenhum dado alterado, nenhuma linha apagada.

begin;

alter table public.facebook_audience_analysis
  add column if not exists status text not null default 'SUCCESS',
  add column if not exists error_code text null,
  add column if not exists error_message text null,
  add column if not exists attempt_count integer not null default 1,
  add column if not exists last_attempt_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'facebook_audience_analysis_status_check'
  ) then
    alter table public.facebook_audience_analysis
      add constraint facebook_audience_analysis_status_check
      check (status in ('SUCCESS', 'FAILED_RETRYABLE', 'FAILED_TERMINAL'));
  end if;
end $$;

comment on column public.facebook_audience_analysis.status is
  'SUCCESS: análise real concluída. FAILED_RETRYABLE: falha classificada como transitória (rate limit, timeout, rede, 5xx) — elegível para nova tentativa após cooldown, até attempt_count atingir o limite configurado. FAILED_TERMINAL: falha estrutural (4xx do provider, erro de integridade de tenant, ou limite de tentativas excedido) — nunca mais reaparece como elegível.';
comment on column public.facebook_audience_analysis.attempt_count is
  'Quantas vezes o pipeline de comments audience tentou processar este post (sucesso ou falha). Nunca decrementado.';
comment on column public.facebook_audience_analysis.last_attempt_at is
  'Timestamp da última tentativa (sucesso ou falha) — usado para aplicar cooldown entre tentativas de posts FAILED_RETRYABLE.';

-- View estendida: um post continua elegível se nunca foi tentado, OU se a
-- última tentativa foi classificada como FAILED_RETRYABLE (o cooldown e o
-- limite de tentativas são aplicados em código, não na view, para não
-- hardcodar esses valores em SQL).
create or replace view public.facebook_posts_pending_audience as
select
  sp.id,
  sp.target_id,
  sp.client_id,
  sp.platform,
  sp.content_origin,
  sp.caption,
  sp.like_count,
  sp.comment_count,
  sp.share_count,
  sp.view_count,
  sp.taken_at,
  sp.post_url,
  sp.content_type,
  sp.raw_json,
  sp.platform_post_id,
  faa.status as audience_status,
  faa.attempt_count as audience_attempt_count,
  faa.last_attempt_at as audience_last_attempt_at,
  faa.error_code as audience_error_code
from public.social_posts sp
left join public.facebook_audience_analysis faa on (faa.social_post_id = sp.id)
where sp.platform = 'facebook'
  and sp.platform_post_id is not null
  and (faa.id is null or faa.status = 'FAILED_RETRYABLE')
order by sp.taken_at desc;

comment on view public.facebook_posts_pending_audience is
  'Posts Facebook elegíveis para coleta/análise de comentários (audience intelligence): nunca tentados, ou última tentativa FAILED_RETRYABLE (cooldown/limite de tentativas aplicados em código). SUCCESS e FAILED_TERMINAL nunca reaparecem. Independente do estado de ai_analysis (sentimento do post).';

commit;

-- Rollback:
-- create or replace view public.facebook_posts_pending_audience as
-- select sp.id, sp.target_id, sp.client_id, sp.platform, sp.content_origin, sp.caption,
--   sp.like_count, sp.comment_count, sp.share_count, sp.view_count, sp.taken_at, sp.post_url,
--   sp.content_type, sp.raw_json, sp.platform_post_id
-- from public.social_posts sp
-- left join public.facebook_audience_analysis faa on (faa.social_post_id = sp.id)
-- where sp.platform = 'facebook' and sp.platform_post_id is not null and faa.id is null
-- order by sp.taken_at desc;
-- alter table public.facebook_audience_analysis drop constraint if exists facebook_audience_analysis_status_check;
-- alter table public.facebook_audience_analysis
--   drop column if exists status, drop column if exists error_code, drop column if exists error_message,
--   drop column if exists attempt_count, drop column if exists last_attempt_at;
