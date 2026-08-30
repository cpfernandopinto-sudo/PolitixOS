import { describe, it, expect } from 'vitest';
import { ALL_SCREENS } from '@/lib/auth/types';
import { ALL_NAV_ITEMS, canSeeNavItem, NAV_GROUPS } from './dashboardNavigation';

describe('Estrutura de grupos de navegação (NAV_GROUPS)', () => {
  it('contém exatamente os 6 grupos na ordem esperada', () => {
    const groupLabels = NAV_GROUPS.map((g) => g.label);
    expect(groupLabels).toEqual([
      'Inteligência',
      'Monitoramento de Canais',
      'Inteligência Estratégica',
      'Gestão',
      'Operação',
      'Sistema',
    ]);
  });

  it('agrupa os itens de navegação corretamente em cada grupo', () => {
    const byLabel = (label: string) => NAV_GROUPS.find((g) => g.label === label)?.items.map((i) => i.label);

    expect(byLabel('Inteligência')).toEqual(['Visão Geral']);
    expect(byLabel('Monitoramento de Canais')).toEqual(['Notícias', 'Instagram', 'Facebook', 'X', 'WhatsApp']);
    expect(byLabel('Inteligência Estratégica')).toEqual(['Pesquisas Eleitorais', 'Territórios', 'Investigações']);
    expect(byLabel('Gestão')).toEqual(['Candidatos/Entidades', 'Politix IA']);
    expect(byLabel('Operação')).toEqual(['Automação/Operação']);
    expect(byLabel('Sistema')).toEqual(['Usuários', 'Auditoria', 'Configurações']);
  });
});

describe('Permissão da tela Territórios (screen_key = territorios)', () => {
  it('ALL_SCREENS inclui "territorios"', () => {
    expect(ALL_SCREENS).toContain('territorios');
  });

  it('o item de navegação "Territórios" existe no grupo Inteligência Estratégica com permission "territorios"', () => {
    const group = NAV_GROUPS.find((g) => g.label === 'Inteligência Estratégica');
    const item = group?.items.find((i) => i.href === '/dashboard/territorios');
    expect(item).toBeDefined();
    expect(item?.permission).toBe('territorios');
    expect(item?.adminOnly).toBeFalsy();
    expect(item?.pageNotYetImplemented).toBeFalsy();
  });

  it('admin sempre vê o item, mesmo sem "territorios" em permissions (bypass)', () => {
    const item = ALL_NAV_ITEMS.find((i) => i.href === '/dashboard/territorios')!;
    expect(canSeeNavItem(item, { role: 'admin', permissions: [] })).toBe(true);
  });

  it('gestor/visualizador NÃO vê o item por padrão — precisa de concessão explícita', () => {
    const item = ALL_NAV_ITEMS.find((i) => i.href === '/dashboard/territorios')!;
    expect(canSeeNavItem(item, { role: 'gestor', permissions: [] })).toBe(false);
    expect(canSeeNavItem(item, { role: 'visualizador', permissions: ['noticias'] })).toBe(false);
  });

  it('gestor com "territorios" concedido explicitamente vê o item', () => {
    const item = ALL_NAV_ITEMS.find((i) => i.href === '/dashboard/territorios')!;
    expect(canSeeNavItem(item, { role: 'gestor', permissions: ['territorios'] })).toBe(true);
  });
});
