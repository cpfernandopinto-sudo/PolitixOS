-- ============================================================================
-- Migration (NÃO APLICADA): executive_ai_insights
-- ============================================================================
-- Sprint 4 — persistência da Leitura Analítica Assistida.
--
-- STATUS: preparada para revisão, mas NÃO executada contra o banco de
-- produção. O serviço atual (lib/ai/analytics-service.ts) usa cache em
-- memória do processo (MVP) — reinicia a cada deploy/restart do servidor.
-- Esta migration é o próximo passo natural para persistência real, mas
-- alterar o schema de produção requer confirmação explícita antes de
-- aplicar (ver docs/METODOLOGIA_IA_ANALITICA.md, seção "Persistência").
--
-- Antes de aplicar:
--   1. Revisar com o time se `context_hash` deve ser globalmente único ou
--      único por `target_scope` (hoje a leitura já reflete apenas os
--      candidatos permitidos ao usuário, então duas pessoas com o mesmo
--      escopo e mesmos filtros produzem o MESMO hash — cache compartilhável
--      entre usuários com o mesmo escopo é intencional, não um vazamento).
--   2. Definir política de expiração/retenção (campo expires_at abaixo é
--      um ponto de partida, não uma decisão final).
--   3. Confirmar RLS: leitura deve respeitar o mesmo `allowedTargetIds` já
--      aplicado na Visão Geral — a tabela por si só não impõe isso; a
--      aplicação continua sendo a camada de autorização (mesmo padrão já
--      usado em todo o restante do projeto, que não usa RLS do Supabase
--      Auth porque a autenticação é própria, via JWT em cookie).
-- ============================================================================

create table if not exists executive_ai_insights (
  id uuid primary key default gen_random_uuid(),
  context_hash text not null,
  target_scope text[], -- null = admin (sem restrição); lista de target_ids permitidos, espelhando allowedTargetIds
  filters jsonb not null, -- { candidate, period } — apenas para depuração/auditoria, não é a chave de cache
  output jsonb not null, -- AnalyticsInsightOutput validado (ver lib/ai/analytics-schema.ts)
  model text not null,
  prompt_version text not null,
  methodology_version text not null,
  status text not null default 'disponivel', -- 'disponivel' | 'erro'
  error text,
  generated_at timestamptz not null default now(),
  expires_at timestamptz, -- null = sem expiração automática (invalidado só por mudança de hash)
  created_at timestamptz not null default now()
);

create index if not exists executive_ai_insights_context_hash_idx
  on executive_ai_insights (context_hash);

create index if not exists executive_ai_insights_generated_at_idx
  on executive_ai_insights (generated_at desc);

comment on table executive_ai_insights is
  'Cache persistente da Leitura Analítica Assistida (Sprint 4). Chave de reuso é context_hash — mesmo hash reaproveita o registro mais recente em vez de gerar novamente.';
