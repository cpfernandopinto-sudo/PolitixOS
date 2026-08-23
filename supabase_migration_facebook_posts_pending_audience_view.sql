-- PolitixOS — Facebook — Auditoria e correção do pipeline de comentários
-- Migration ADITIVA: nova view `facebook_posts_pending_audience`.
--
-- Por quê uma view separada de `facebook_posts_pending_analysis`: aquela
-- view exclui QUALQUER post que já tenha uma linha em `ai_analysis`
-- (content_type='post') — ou seja, uma vez que o sentimento do post é
-- analisado, o post nunca mais aparece nela. Isso torna impossível fazer
-- "atualização incremental de comentários" (post antigo, já analisado,
-- ganhando novos comentários) usando somente essa fila: a análise de
-- audiência (comentários) precisa da SUA PRÓPRIA fila de pendências,
-- independente do estado de `ai_analysis`.
--
-- Esta view resolve exatamente isso: retorna todo post Facebook que ainda
-- NÃO tem uma linha em `facebook_audience_analysis`, não importa se o
-- sentimento do post já foi analisado ou não. Cobre tanto "post novo" quanto
-- "post recente já existente" (seção 16 da auditoria) com uma única
-- estrutura, sem duplicar lógica.

begin;

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
  sp.platform_post_id
from public.social_posts sp
left join public.facebook_audience_analysis faa on (faa.social_post_id = sp.id)
where sp.platform = 'facebook'
  and sp.platform_post_id is not null
  and faa.id is null
order by sp.taken_at desc;

comment on view public.facebook_posts_pending_audience is
  'Posts Facebook ainda sem linha em facebook_audience_analysis (independente do estado de ai_analysis de sentimento do post) — fila de coleta/análise de comentários (audience intelligence). Consumidores devem filtrar client_id/target_id conforme o tenant/target autorizado.';

commit;

-- Rollback: drop view if exists public.facebook_posts_pending_audience;
