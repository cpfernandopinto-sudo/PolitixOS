-- ============================================================
-- PolitixOS — Controle de Acesso Multiusuário
-- Execute INTEIRO no Supabase → SQL Editor → Run
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. TABELA: app_users
--    Usuários da aplicação (independente do Supabase Auth)
-- ──────────────────────────────────────────────────────────────
create table if not exists app_users (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  email          text        not null unique,
  password_hash  text        not null,
  role           text        not null check (role in ('admin', 'gestor', 'visualizador')),
  is_active      boolean     not null default true,
  created_at     timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- 2. TABELA: app_user_targets
--    Candidatos (targets) que cada usuário tem permissão de ver
-- ──────────────────────────────────────────────────────────────
create table if not exists app_user_targets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references app_users(id)  on delete cascade,
  target_id  uuid not null references targets(id)    on delete cascade,
  unique (user_id, target_id)
);

-- ──────────────────────────────────────────────────────────────
-- 3. TABELA: app_user_permissions
--    Telas que cada usuário pode acessar
-- ──────────────────────────────────────────────────────────────
create table if not exists app_user_permissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app_users(id) on delete cascade,
  screen_key  text not null,
  can_access  boolean not null default true,
  unique (user_id, screen_key)
);

-- ──────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
--    Habilita RLS nas três tabelas e cria políticas permissivas.
--    A validação real de acesso acontece no servidor (Server Actions).
--    O projeto usa a service_role key no backend, então "allow all"
--    é seguro aqui — o cliente nunca acessa essas tabelas diretamente.
-- ──────────────────────────────────────────────────────────────
alter table app_users            enable row level security;
alter table app_user_targets     enable row level security;
alter table app_user_permissions enable row level security;

-- Política: allow all (acesso controlado pelo servidor, não pelo RLS)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'app_users' and policyname = 'allow_all_app_users'
  ) then
    execute $policy$
      create policy "allow_all_app_users"
        on app_users for all
        using (true)
        with check (true)
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'app_user_targets' and policyname = 'allow_all_app_user_targets'
  ) then
    execute $policy$
      create policy "allow_all_app_user_targets"
        on app_user_targets for all
        using (true)
        with check (true)
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'app_user_permissions' and policyname = 'allow_all_app_user_permissions'
  ) then
    execute $policy$
      create policy "allow_all_app_user_permissions"
        on app_user_permissions for all
        using (true)
        with check (true)
    $policy$;
  end if;
end$$;

-- ──────────────────────────────────────────────────────────────
-- 5. ÍNDICES (performance)
-- ──────────────────────────────────────────────────────────────
create index if not exists idx_app_users_email
  on app_users (email);

create index if not exists idx_app_user_targets_user_id
  on app_user_targets (user_id);

create index if not exists idx_app_user_permissions_user_id
  on app_user_permissions (user_id);

-- ──────────────────────────────────────────────────────────────
-- 6. SEED: Primeiro usuário ADMIN
--
--    Email:  admin@politixos.com
--    Senha:  Admin@2025!
--
--    Hash gerado com scrypt (Node.js crypto) — algoritmo idêntico
--    ao usado pelo backend em lib/auth/password.ts.
--
--    ⚠️  Altere a senha imediatamente após o primeiro acesso
--        usando a tela /dashboard/usuarios → Alterar Senha.
-- ──────────────────────────────────────────────────────────────
insert into app_users (name, email, password_hash, role, is_active)
values (
  'Administrador',
  'admin@politixos.com',
  '39f68ba3c341caf663c734e3f4ac8824:152c34f99294701a68b369a406c95559d928bf7de51c645b28dff62feb666ea066209c3efce2a4ce0f66a185d5e655962603602379500e7f2d0888ab8c5dcff7',
  'admin',
  true
)
on conflict (email) do nothing;

-- ──────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL — deve retornar 1 linha (o admin)
-- ──────────────────────────────────────────────────────────────
select id, name, email, role, is_active, created_at
from app_users
order by created_at;
