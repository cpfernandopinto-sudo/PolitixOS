import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), 'supabase_migration_social_accounts_platform_account_id.sql'), 'utf8');

describe('social_accounts platform account id migration', () => {
  it('é somente aditiva, nullable e multicanal', () => {
    expect(sql).toContain('add column if not exists platform_account_id text null');
    expect(sql).not.toMatch(/drop\s+(table|column)/i);
    expect(sql).not.toMatch(/not\s+null/i);
    expect(sql).not.toMatch(/alter\s+policy|create\s+policy/i);
    expect(sql).not.toContain('100064348075846');
  });
});
