import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const contentTypeSql = readFileSync(resolve(process.cwd(), 'supabase_migration_facebook_content_type_contract.sql'), 'utf8');
const pendingViewSql = readFileSync(resolve(process.cwd(), 'supabase_migration_facebook_pending_analysis_view.sql'), 'utf8');

describe('Facebook analytics migrations (Bloco 4)', () => {
  it('estende classify_social_content_type preservando o branch Instagram e o domínio de valores', () => {
    expect(contentTypeSql).toContain("when platform = 'instagram' then");
    expect(contentTypeSql).toContain("when platform = 'facebook' then");
    expect(contentTypeSql).not.toMatch(/alter\s+table/i);
    expect(contentTypeSql).not.toMatch(/create\s+table/i);
    expect(contentTypeSql).not.toMatch(/drop\s+column/i);
  });

  it('não altera o CHECK constraint nem o trigger existentes', () => {
    expect(contentTypeSql).not.toMatch(/social_posts_content_type_check/i);
    expect(contentTypeSql).not.toMatch(/trg_sync_social_posts_content_type/i);
  });

  it('cria facebook_posts_pending_analysis seguindo o padrão de x_posts_pending_analysis (uma view por plataforma)', () => {
    expect(pendingViewSql).toContain('create or replace view public.facebook_posts_pending_analysis');
    expect(pendingViewSql).toContain("sp.platform = 'facebook'");
    expect(pendingViewSql).toContain('left join public.ai_analysis ai on');
    expect(pendingViewSql).toContain('ai.id is null');
  });

  it('não toca em social_posts_pending_analysis nem em x_posts_pending_analysis (menções são apenas comentário/documentação)', () => {
    expect(pendingViewSql).not.toMatch(/(create or replace view|drop view|alter view)\s+public\.(social_posts_pending_analysis|x_posts_pending_analysis)/i);
    expect(pendingViewSql).not.toMatch(/alter\s+table/i);
  });
});
