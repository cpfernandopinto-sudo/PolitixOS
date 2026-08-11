-- ============================================================================
-- Migration (APLICADA): territories_foundation
-- ============================================================================
-- Sprint 11 — Politix Territórios, Bloco 2 (Fundação do Banco Territorial),
-- aplicada no Bloco 2.5 (Identificação Segura do Supabase + Aplicação e
-- Validação da Fundação Territorial).
--
-- STATUS: aplicada em 2026-08-11 no projeto Supabase do PolitixOS
-- (project_ref hhhwuajptkyposarfbzn), após confirmação inequívoca via schema
-- (targets/app_users/app_user_permissions/investigations, histórico de
-- migrations do próprio domínio) — ver
-- docs/RELATORIO_TERRITORIOS_BLOCO2_5_SUPABASE.md para as evidências e o
-- smoke test pós-aplicação. Este arquivo é mantido como fonte de verdade do
-- schema para reaplicação idempotente (ex.: ambiente novo) — todos os
-- `create table/index if not exists` seguem sendo seguros de re-executar.
--
-- Cria a fundação territorial homologada no Bloco 1:
--   territories, territory_indicators, territory_evidence,
--   territory_collection_runs, territory_briefings
--
-- Fora de escopo deste bloco (ver relatório): nenhuma integração externa
-- (IBGE/DATASUS/Segurança/TSE/SICONFI/Perplexity/Notícias), nenhum dado
-- carregado, nenhum workflow n8n.
--
-- Convenções seguidas (mesmo padrão de supabase_migration_access_control.sql
-- e supabase_migration_executive_ai_insights.sql):
--   - SQL idempotente (create table/index if not exists);
--   - RLS habilitado com policy "allow all" — autorização real acontece na
--     aplicação (Server Actions), não no Postgres. O projeto usa autenticação
--     própria via JWT em cookie, não Supabase Auth (ver lib/auth/*). O client
--     nunca acessa estas tabelas diretamente com a anon key para escrita;
--     leituras públicas (dados territoriais globais) via anon key são
--     aceitáveis pois não carregam dado sensível por si só.
--   - texto livre em vez de enum Postgres para campos como `categoria`,
--     `fonte`, `tema`, `status` — mesma filosofia de `platform`/`source` já
--     usada em `social_accounts`/`mencoes`. Estados de `status` são
--     restringidos por CHECK textual (não enum) para não travar schema.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────
-- 1. TABELA: territories
--    Catálogo GLOBAL de municípios. codigo_ibge é o identificador
--    territorial principal (chave natural). Não é multi-tenant —
--    um município é o mesmo para todos os clientes/usuários.
-- ──────────────────────────────────────────────────────────────
create table if not exists territories (
  id           uuid        primary key default gen_random_uuid(),
  codigo_ibge  text        not null unique,
  uf           char(2)     not null check (char_length(uf) = 2),
  municipio    text        not null,
  regiao       text,
  geometria    jsonb,
  metadata     jsonb       not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_territories_codigo_ibge
  on territories (codigo_ibge);

create index if not exists idx_territories_uf
  on territories (uf);

create index if not exists idx_territories_municipio
  on territories (municipio);

-- Índice composto: suporta o fluxo de seleção UF → Município da tela inicial.
create index if not exists idx_territories_uf_municipio
  on territories (uf, municipio);

-- ──────────────────────────────────────────────────────────────
-- 2. TABELA: territory_indicators
--    Contrato único de indicador territorial (população, crimes,
--    eleitorado, receita, etc.) — GLOBAL, com histórico por período.
--
--    IDEMPOTÊNCIA: uma UNIQUE simples sobre colunas nullable
--    (periodo_inicio/periodo_fim) NÃO garante idempotência no Postgres,
--    porque NULL nunca é igual a NULL em uma constraint UNIQUE — cada
--    upsert de um indicador "sem período" criaria uma linha nova.
--    Solução adotada: índice UNIQUE sobre expressão com COALESCE,
--    colapsando NULL em um sentinela determinístico. Isso inclui
--    source_dataset na chave natural (não apenas `fonte`), porque a
--    mesma fonte pode publicar o mesmo indicador a partir de datasets
--    diferentes para o mesmo período (ex.: IBGE/SIDRA vs. IBGE/Censo) —
--    tratar isso como a mesma linha seria uma colisão indevida.
-- ──────────────────────────────────────────────────────────────
create table if not exists territory_indicators (
  id                 uuid        primary key default gen_random_uuid(),
  territory_id       uuid        not null references territories(id) on delete cascade,
  categoria          text        not null, -- 'demografia' | 'saude' | 'seguranca' | 'eleicoes' | 'financas' | ...
  indicador          text        not null, -- chave estável, ex: 'populacao_total'
  valor              numeric,
  valor_texto        text,
  unidade            text,
  periodo_inicio     date,
  periodo_fim        date,
  granularidade      text        not null default 'municipal', -- 'municipal' | 'estadual' | 'nacional'
  fonte              text        not null, -- 'IBGE' | 'DATASUS' | 'TSE' | 'SICONFI' | ...
  source_dataset     text,       -- dataset/origem exata dentro da fonte, ex: 'SIDRA_6579'
  source_record_id   text,       -- identificador do registro na fonte original, quando existir
  source_updated_at  timestamptz, -- data de atualização informada pela própria fonte (não collected_at)
  metodologia        text,
  metadata           jsonb       not null default '{}',
  collected_at       timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (valor is not null or valor_texto is not null)
);

-- Chave natural de idempotência (ver nota acima sobre COALESCE em vez de
-- UNIQUE simples). Sentinelas ('' / '0001-01-01') nunca colidem com valores
-- reais de fonte/dataset/data usados pelas integrações futuras.
create unique index if not exists uq_territory_indicators_natural_key
  on territory_indicators (
    territory_id,
    categoria,
    indicador,
    fonte,
    coalesce(source_dataset, ''),
    coalesce(periodo_inicio, '0001-01-01'::date),
    coalesce(periodo_fim, '0001-01-01'::date)
  );

create index if not exists idx_territory_indicators_territory_id
  on territory_indicators (territory_id);

create index if not exists idx_territory_indicators_categoria
  on territory_indicators (categoria);

create index if not exists idx_territory_indicators_fonte
  on territory_indicators (fonte);

-- ──────────────────────────────────────────────────────────────
-- 3. TABELA: territory_evidence
--    Contrato único de evidência territorial (notícias, achados
--    Perplexity, dados oficiais brutos, etc.) — GLOBAL, histórico.
--    Absorve os conceitos de `territory_news`/`territory_topics`
--    do desenho conceitual do Bloco 1 (homologado): notícia territorial
--    é evidência com source_type='news'; tema/subtema cobrem taxonomia
--    sem precisar de tabela própria neste momento.
-- ──────────────────────────────────────────────────────────────
create table if not exists territory_evidence (
  id                  uuid        primary key default gen_random_uuid(),
  territory_id        uuid        not null references territories(id) on delete cascade,
  source_type         text        not null, -- 'news' | 'perplexity' | 'official_data' | 'social' | ...
  source_name         text,
  source_url          text,
  source_external_id  text,       -- identificador próprio da fonte (id do artigo/registro/documento), quando existir
  source_hash         text        not null, -- hash estável para dedup (mesmo espírito de mencoes.hash)
  published_at        timestamptz,
  collected_at        timestamptz not null default now(),
  tema                text,
  subtema             text,
  title               text,
  summary             text,
  raw_reference       jsonb,
  confidence          numeric,
  metadata            jsonb       not null default '{}',
  created_at          timestamptz not null default now()
);

-- Deduplicação principal: território + hash de conteúdo da fonte.
create unique index if not exists uq_territory_evidence_territory_hash
  on territory_evidence (territory_id, source_hash);

create index if not exists idx_territory_evidence_territory_id
  on territory_evidence (territory_id);

create index if not exists idx_territory_evidence_source_type
  on territory_evidence (source_type);

create index if not exists idx_territory_evidence_published_at
  on territory_evidence (published_at);

create index if not exists idx_territory_evidence_tema
  on territory_evidence (tema);

-- ──────────────────────────────────────────────────────────────
-- 4. TABELA: territory_collection_runs
--    Execução de cada motor de coleta (observabilidade). Registro
--    append-only por motor × execução do orquestrador n8n.
-- ──────────────────────────────────────────────────────────────
create table if not exists territory_collection_runs (
  id                uuid        primary key default gen_random_uuid(),
  territory_id      uuid        not null references territories(id) on delete cascade,
  request_id        uuid        not null, -- correlaciona todos os motores de uma mesma execução do orquestrador
  source            text        not null, -- 'ibge' | 'datasus' | 'seguranca' | 'tse' | 'siconfi' | 'perplexity' | 'noticias'
  status             text        not null default 'pending'
                       check (status in ('pending', 'running', 'partial', 'completed', 'failed')),
  workflow_name      text,       -- nome do workflow n8n que produziu a execução
  workflow_version   text,       -- versão do workflow n8n, para rastreabilidade de mudanças no motor
  started_at         timestamptz,
  finished_at        timestamptz,
  items_collected    integer     not null default 0,
  items_processed    integer     not null default 0,
  items_discarded    integer     not null default 0,
  error_message      text,
  metadata           jsonb       not null default '{}',
  created_at         timestamptz not null default now()
);

create index if not exists idx_territory_collection_runs_request_id
  on territory_collection_runs (request_id);

create index if not exists idx_territory_collection_runs_territory_id
  on territory_collection_runs (territory_id);

create index if not exists idx_territory_collection_runs_source
  on territory_collection_runs (source);

create index if not exists idx_territory_collection_runs_status
  on territory_collection_runs (status);

create index if not exists idx_territory_collection_runs_created_at
  on territory_collection_runs (created_at desc);

-- ──────────────────────────────────────────────────────────────
-- 5. TABELA: territory_briefings
--    Briefing territorial gerado. target_id é NULLABLE: briefing
--    genérico do território (sem candidato associado) quando null;
--    quando preenchido, a aplicação deve respeitar allowedTargetIds
--    do usuário (mesmo padrão já usado em todo o restante do projeto).
--    Sem UNIQUE proposital: cada geração é um novo registro, o
--    histórico de briefings de um território nunca é sobrescrito.
-- ──────────────────────────────────────────────────────────────
create table if not exists territory_briefings (
  id               uuid        primary key default gen_random_uuid(),
  territory_id     uuid        not null references territories(id) on delete cascade,
  target_id        uuid        references targets(id) on delete set null,
  requested_by     uuid        references app_users(id) on delete set null,
  request_id       uuid        not null,
  status            text        not null default 'nao_iniciado'
                       check (status in (
                         'nao_iniciado', 'coletando', 'processando',
                         'analisando', 'concluido', 'parcial', 'erro'
                       )),
  content          jsonb,
  model            text,
  prompt_version   text,
  generated_at     timestamptz,
  expires_at       timestamptz,
  error_message    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_territory_briefings_territory_id
  on territory_briefings (territory_id);

create index if not exists idx_territory_briefings_target_id
  on territory_briefings (target_id);

create index if not exists idx_territory_briefings_request_id
  on territory_briefings (request_id);

create index if not exists idx_territory_briefings_status
  on territory_briefings (status);

create index if not exists idx_territory_briefings_created_at
  on territory_briefings (created_at desc);

-- ──────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
--    Habilita RLS e cria políticas "allow all" — mesma convenção de
--    supabase_migration_access_control.sql. A validação real de acesso
--    (allowedTargetIds, admin bypass) acontece nas Server Actions.
-- ──────────────────────────────────────────────────────────────
alter table territories               enable row level security;
alter table territory_indicators      enable row level security;
alter table territory_evidence        enable row level security;
alter table territory_collection_runs enable row level security;
alter table territory_briefings       enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'territories' and policyname = 'allow_all_territories'
  ) then
    execute $policy$
      create policy "allow_all_territories"
        on territories for all
        using (true)
        with check (true)
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'territory_indicators' and policyname = 'allow_all_territory_indicators'
  ) then
    execute $policy$
      create policy "allow_all_territory_indicators"
        on territory_indicators for all
        using (true)
        with check (true)
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'territory_evidence' and policyname = 'allow_all_territory_evidence'
  ) then
    execute $policy$
      create policy "allow_all_territory_evidence"
        on territory_evidence for all
        using (true)
        with check (true)
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'territory_collection_runs' and policyname = 'allow_all_territory_collection_runs'
  ) then
    execute $policy$
      create policy "allow_all_territory_collection_runs"
        on territory_collection_runs for all
        using (true)
        with check (true)
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'territory_briefings' and policyname = 'allow_all_territory_briefings'
  ) then
    execute $policy$
      create policy "allow_all_territory_briefings"
        on territory_briefings for all
        using (true)
        with check (true)
    $policy$;
  end if;
end$$;

comment on table territories is
  'Catálogo global de municípios (Politix Territórios). codigo_ibge é a chave natural.';
comment on table territory_indicators is
  'Contrato único de indicador territorial — substitui as tabelas territory_demographics/health/security/elections/finance do desenho conceitual inicial (consolidação homologada no Bloco 1).';
comment on table territory_evidence is
  'Contrato único de evidência territorial (notícias, achados de pesquisa, dados oficiais brutos). Absorve territory_news/territory_topics do desenho conceitual inicial.';
comment on table territory_collection_runs is
  'Execução de cada motor de coleta territorial (observabilidade do orquestrador n8n). request_id correlaciona todos os motores de uma mesma geração de briefing.';
comment on table territory_briefings is
  'Briefing territorial gerado. target_id nullable: null = briefing genérico do território; preenchido = escopo de candidato, sujeito a allowedTargetIds na aplicação.';
