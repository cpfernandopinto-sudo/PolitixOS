-- Facebook Bloco 3: native provider/account identifier for operational collection.
-- Additive, nullable and backward-compatible for every existing platform.

alter table public.social_accounts
  add column if not exists platform_account_id text null;

comment on column public.social_accounts.platform_account_id is
  'Native account identifier supplied by the platform/provider (for example, Facebook Page ID). Nullable when unavailable.';
