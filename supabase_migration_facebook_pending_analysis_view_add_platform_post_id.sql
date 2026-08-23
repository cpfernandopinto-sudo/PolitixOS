-- PolitixOS — Facebook — Auditoria e correção do pipeline de comentários
-- Migration ADITIVA: adiciona sp.platform_post_id à view existente
-- facebook_posts_pending_analysis (criada em
-- supabase_migration_facebook_pending_analysis_view.sql). Nenhuma coluna
-- removida, nenhum dado alterado. Necessário porque o consumidor de
-- comentários (lib/facebook/comments/*) precisa do ID externo do post do
-- Facebook (usado como `post_id` na chamada ao provider de comentários),
-- que a view anterior não expunha (só o UUID interno `sp.id`).
--
-- Nota: `platform_post_id` foi adicionado ao FINAL da lista de colunas, não
-- em ordem lógica — o Postgres rejeita `CREATE OR REPLACE VIEW` quando a
-- nova lista de colunas insere algo no meio (interpreta como rename de
-- coluna existente, erro 42P16). Aplicada e confirmada em produção
-- (projeto hhhwuajptkyposarfbzn) nesta mesma sessão.

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
  sp.raw_json,
  sp.platform_post_id
from public.social_posts sp
left join public.ai_analysis ai on (ai.content_id = sp.id and ai.content_type = 'post')
where sp.platform = 'facebook'
  and ai.id is null
order by sp.taken_at desc;

comment on view public.facebook_posts_pending_analysis is
  'Posts Facebook ainda sem linha em ai_analysis. Espelha o padrão de x_posts_pending_analysis; consumidores devem filtrar client_id/target_id conforme o tenant/target autorizado. platform_post_id adicionado (ao final da lista de colunas, restrição do Postgres para CREATE OR REPLACE VIEW) para permitir a coleta de comentários (lib/facebook/comments) usar o ID externo do post.';

commit;

-- Rollback: create or replace view public.facebook_posts_pending_analysis as
-- select sp.id, sp.target_id, sp.client_id, sp.platform, sp.content_origin,
--   sp.caption, sp.like_count, sp.comment_count, sp.share_count, sp.view_count,
--   sp.taken_at, sp.post_url, sp.content_type, sp.raw_json
-- from public.social_posts sp
-- left join public.ai_analysis ai on (ai.content_id = sp.id and ai.content_type = 'post')
-- where sp.platform = 'facebook' and ai.id is null
-- order by sp.taken_at desc;
