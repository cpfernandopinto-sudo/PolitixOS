-- ============================================================
-- PolitixOS — Multi-user Access Control Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Tabela de usuários da aplicação
create table if not exists app_users (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null unique,
  password_hash  text not null,
  role           text not null check (role in ('admin','gestor','visualizador')),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- 2. Candidatos permitidos por usuário
create table if not exists app_user_targets (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references app_users(id) on delete cascade,
  target_id uuid not null references targets(id) on delete cascade,
  unique (user_id, target_id)
);

-- 3. Permissões de tela por usuário
create table if not exists app_user_permissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app_users(id) on delete cascade,
  screen_key  text not null,
  can_access  boolean not null default true,
  unique (user_id, screen_key)
);

-- ============================================================
-- Row Level Security
-- As tabelas usam anon key (client-side) → habilitar RLS
-- com política permissiva para leitura (a validação real
-- acontece no servidor via Server Actions / Route Handlers)
-- ============================================================
alter table app_users           enable row level security;
alter table app_user_targets    enable row level security;
alter table app_user_permissions enable row level security;

-- Permitir tudo via service_role (usado no servidor pelo anon key da env)
-- NOTA: Neste projeto o NEXT_PUBLIC_SUPABASE_ANON_KEY contém a service_role key,
-- então qualquer policy "allow all" funciona. Ajuste conforme necessário.
create policy "allow_all_app_users"
  on app_users for all using (true) with check (true);

create policy "allow_all_app_user_targets"
  on app_user_targets for all using (true) with check (true);

create policy "allow_all_app_user_permissions"
  on app_user_permissions for all using (true) with check (true);

-- ============================================================
-- Seed: primeiro usuário admin
-- Senha: Admin@2025!  (hash gerado com scrypt via Node.js)
-- Para gerar um novo hash, use o endpoint /api/auth/hash ou
-- rode: node -e "require('crypto').scrypt('SuaSenha', 'salt_fixo', 64, (e,k)=>console.log(k.toString('hex')))"
--
-- O hash abaixo é apenas um placeholder — a senha real será
-- definida pelo primeiro login ou pela tela de Usuários.
-- Substitua pelo hash gerado após rodar o seed script.
-- ============================================================
-- insert into app_users (name, email, password_hash, role, is_active)
-- values ('Administrador', 'admin@politixos.com', '<HASH_AQUI>', 'admin', true);
