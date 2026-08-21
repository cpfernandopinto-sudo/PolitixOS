import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Instagram route composition regression', () => {
  it('mantém o shell oficial no layout pai do dashboard', () => {
    const layout = source('app/dashboard/layout.tsx');
    expect(layout).toContain("import Sidebar from '@/components/Sidebar'");
    expect(layout).toContain("import Header from '@/components/Header'");
    expect(layout).toContain('<Sidebar permissions={navPermissions} />');
    expect(layout).toContain('{children}');
  });

  it('renderiza a UI Instagram sem importar ou reutilizar a Overview', () => {
    const page = source('app/dashboard/instagram/page.tsx');
    expect(page).toContain('InstagramIntelligenceDashboard');
    expect(page).toContain('getInstagramUiContract');
    expect(page).not.toMatch(/dashboard\/overview|Overview(?:KPI|Gauge|Channels|Page)/);
  });

  it('mantém o redirect da raiz do dashboard isolado da rota Instagram', () => {
    expect(source('app/dashboard/page.tsx')).toContain("redirect('/dashboard/overview')");
    expect(source('app/dashboard/instagram/page.tsx')).not.toContain("redirect('/dashboard/overview')");
  });
});
