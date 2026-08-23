-- PolitixOS — Facebook Bloco 4
-- Cria facebook_posts_pending_analysis seguindo exatamente o precedente já
-- estabelecido por x_posts_pending_analysis: uma view por plataforma, em vez
-- de alargar social_posts_pending_analysis (que é Instagram-only e nem sequer
-- expõe platform/raw_json). Instagram e X não são tocados.

begin;

create or replace view public.facebook_posts_pending_analysis as
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
  sp.raw_json
from public.social_posts sp
left join public.ai_analysis ai on (ai.content_id = sp.id and ai.content_type = 'post')
where sp.platform = 'facebook'
  and ai.id is null
order by sp.taken_at desc;

comment on view public.facebook_posts_pending_analysis is
  'Posts Facebook ainda sem linha em ai_analysis. Espelha o padrão de x_posts_pending_analysis; consumidores devem filtrar client_id/target_id conforme o tenant/target autorizado.';

commit;

-- Rollback: drop view if exists public.facebook_posts_pending_analysis;
