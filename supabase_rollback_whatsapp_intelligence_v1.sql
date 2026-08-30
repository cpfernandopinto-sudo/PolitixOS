-- Rollback for supabase_migration_whatsapp_intelligence_v1.sql
-- Procedimento de emergencia recomendado (contrato Sprint 13 secao 7.1): antes de rodar isto,
-- prefira desativar o webhook n8n e marcar a instancia como INACTIVE
-- (update public.whatsapp_instances set status = 'INACTIVE' where provider = 'zapi';).
-- Este script so deve ser executado se a remocao completa do schema for realmente necessaria.

drop function if exists public.fail_whatsapp_analysis_v1(uuid, text);
drop function if exists public.persist_whatsapp_analysis_v1(uuid, jsonb, integer);
drop function if exists public.claim_whatsapp_message_for_analysis_v1(uuid, smallint);
drop function if exists public.ingest_whatsapp_message_v1(jsonb);

drop table if exists public.whatsapp_analysis;
drop table if exists public.whatsapp_messages;
drop table if exists public.whatsapp_chats;
drop table if exists public.whatsapp_instances;
