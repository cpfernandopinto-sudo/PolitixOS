-- PolitixOS — Facebook — hardening das filas internas de análise.
--
-- As views são consumidas exclusivamente pelo backend com service_role.
-- `security_invoker` impede bypass silencioso do RLS das tabelas-base e as
-- revogações fecham o acesso direto via Data API para anon/authenticated.

begin;

alter view public.facebook_posts_pending_analysis
  set (security_invoker = true);

alter view public.facebook_posts_pending_audience
  set (security_invoker = true);

revoke all on public.facebook_posts_pending_analysis
  from public, anon, authenticated;
revoke all on public.facebook_posts_pending_audience
  from public, anon, authenticated;

grant select on public.facebook_posts_pending_analysis to service_role;
grant select on public.facebook_posts_pending_audience to service_role;

commit;

-- Rollback operacional (não executar automaticamente):
-- alter view public.facebook_posts_pending_analysis set (security_invoker = false);
-- alter view public.facebook_posts_pending_audience set (security_invoker = false);
-- grant select on public.facebook_posts_pending_analysis to anon, authenticated;
-- grant select on public.facebook_posts_pending_audience to anon, authenticated;
