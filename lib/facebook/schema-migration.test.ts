import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), 'supabase_migration_facebook_chk_platform.sql'), 'utf8');

describe('Facebook chk_platform migration', () => {
  it('preserva todas as plataformas existentes e acrescenta somente facebook', () => {
    for (const platform of ['instagram', 'tiktok', 'youtube', 'x', 'facebook']) {
      expect(sql).toContain(`'${platform}'`);
    }
    expect(sql).toContain('drop constraint chk_platform');
    expect(sql).toContain('add constraint chk_platform');
    expect(sql).toContain('validate constraint chk_platform');
  });

  it('permanece limitada à constraint de social_posts', () => {
    expect(sql).not.toMatch(/\b(delete|truncate|update|insert)\b/i);
    expect(sql).not.toMatch(/alter\s+(view|function|policy|index)/i);
  });
});
