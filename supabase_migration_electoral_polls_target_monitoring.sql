-- PESQUISAS-N8N-01 — Monitoramento seletivo por candidato
--
-- Regra arquitetural do sprint: "o candidato monitorado determina quais
-- pesquisas entram; a corrida eleitoral determina quais resultados da
-- pesquisa são armazenados." Antes desta migration, o coletor
-- (lib/pesquisas/collector.ts) ingeria TODA pesquisa registrada no TSE,
-- sem relação com quem o PolitixOS efetivamente monitora.
--
-- `targets` não tem coluna estruturada de cargo/UF/ano — reaproveitamos o
-- que já existe (`state` como UF, `candidate_name`+`keywords` para match de
-- nome, `is_active` para status do candidato) e adicionamos só o mínimo:
-- o flag de monitoramento e o cargo específico monitorado (texto livre, no
-- mesmo vocabulário de electoral_polls.cargo/electoral_poll_results.office
-- — evita normalizar prematuramente sem evidência de cardinalidade real).
--
-- APLICADA em produção (hhhwuajptkyposarfbzn) em 2026-08-23 via Supabase MCP
-- (mcp__...__apply_migration, migration "electoral_polls_target_monitoring").

alter table public.targets
  add column if not exists poll_monitoring_enabled boolean not null default false,
  add column if not exists poll_monitoring_office text;

comment on column public.targets.poll_monitoring_enabled is 'Quando true, o coletor seletivo de Pesquisas Eleitorais (lib/pesquisas/monitoring.ts) considera este candidato ao decidir quais pesquisas do TSE/PesqEle são relevantes o suficiente para persistir. Default false — nunca liga automaticamente para candidatos existentes.';
comment on column public.targets.poll_monitoring_office is 'Cargo específico monitorado para pesquisas eleitorais (ex.: Governador, Senador), texto livre no mesmo vocabulário de electoral_polls.cargo / electoral_poll_results.office. Nulo enquanto poll_monitoring_enabled=false.';
