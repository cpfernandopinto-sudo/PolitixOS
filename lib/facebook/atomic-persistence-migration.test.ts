import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), 'supabase_migration_facebook_atomic_tenant_persistence.sql'), 'utf8');

describe('Facebook atomic tenant persistence migration', () => {
  it('cria somente a RPC invoker com search_path fechado', () => {
    expect(sql).toContain('create or replace function public.persist_facebook_social_posts');
    expect(sql).toContain('security invoker');
    expect(sql).toContain("set search_path = ''");
    expect(sql).not.toMatch(/security\s+definer/i);
    expect(sql).not.toMatch(/alter\s+table/i);
    expect(sql).not.toMatch(/create\s+table/i);
  });

  it('mantém execução exclusiva do service role', () => {
    expect(sql).toContain('revoke all on function public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb) from public');
    expect(sql).toContain('revoke all on function public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb) from anon');
    expect(sql).toContain('revoke all on function public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb) from authenticated');
    expect(sql).toContain('grant execute on function public.persist_facebook_social_posts(uuid, uuid, uuid, jsonb) to service_role');
  });

  it('protege tenant e contexto no próprio conflito atômico', () => {
    expect(sql).toContain('on conflict (platform, platform_post_id) do update');
    expect(sql).toContain('social_posts.client_id = excluded.client_id');
    expect(sql).toContain('social_posts.target_id = excluded.target_id');
    expect(sql).toContain('social_posts.social_account_id = excluded.social_account_id');
    expect(sql).toContain('FACEBOOK_CROSS_TENANT_POST_CONFLICT');
    expect(sql).toContain('FACEBOOK_POST_CONTEXT_CONFLICT');
  });
});
