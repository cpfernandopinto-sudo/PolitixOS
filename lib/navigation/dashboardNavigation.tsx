import { Sparkles, ShieldCheck } from 'lucide-react';
import { APP_SCREENS, type AppScreen } from './appScreens';
import type { NavIcon } from './navIcons';

export type { NavIcon, NavIconProps } from './navIcons';
export { InstagramNavIcon, XNavIcon, FacebookNavIcon, WhatsAppNavIcon } from './navIcons';

/**
 * Fonte única das rotas do dashboard — usada por ModuleSwitcher (desktop),
 * ModuleNavigationMenu (mega dropdown) e MobileNavigationDrawer (mobile).
 * Não duplicar esta lista em nenhum outro componente.
 *
 * `permission` é o `screen_key` verificado contra `session.permissions`
 * (admin sempre vê tudo, ver `canSeeNavItem`). `adminOnly` restringe além
 * disso — hoje só "Usuários" (não existe screen_key para ele em
 * `lib/auth/types.ts#ALL_SCREENS`, mesma regra do Sidebar anterior).
 */
export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  /** screen_key exigido, ou null se não há tela dedicada (ex.: Configurações). */
  permission: string | null;
  adminOnly?: boolean;
  description?: string;
  /** Item ainda sem página própria — preserva o link exatamente como estava
   *  no Sidebar anterior (não é uma remoção de rota, nem uma rota nova). */
  pageNotYetImplemented?: boolean;
  /** Repassados do catálogo — usados para decidir quais filtros globais preservar ao navegar (ver lib/filters/global.ts#buildNavHref). */
  supportsGlobalCandidate?: boolean;
  supportsGlobalPeriod?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Converte uma entrada do catálogo canônico (`lib/navigation/appScreens.ts`)
 * em um `NavItem`. `permission` reproduz a regra anterior: `null` para itens
 * `adminOnly` (não há screen_key grantável), a `key` do catálogo caso
 * contrário — inclusive para telas ainda não implementadas (ex.:
 * Configurações), preservando o comportamento pré-existente.
 */
function screenToNavItem(screen: AppScreen): NavItem {
  return {
    label: screen.label,
    href: screen.route,
    icon: screen.icon,
    permission: screen.adminOnly ? null : screen.key,
    adminOnly: screen.adminOnly,
    description: screen.description,
    pageNotYetImplemented: !screen.implemented,
    supportsGlobalCandidate: screen.supportsGlobalCandidate,
    supportsGlobalPeriod: screen.supportsGlobalPeriod,
  };
}

const byGroup = (group: string) => APP_SCREENS.filter((s) => s.group === group && s.showInNav);
const usuariosScreen = APP_SCREENS.find((s) => s.key === 'usuarios')!;
const configuracoesScreen = APP_SCREENS.find((s) => s.key === 'configuracoes')!;
const candidatosScreen = APP_SCREENS.find((s) => s.key === 'candidatos')!;

/**
 * "Politix IA" e "Auditoria" não têm screen_key nem página real — nunca
 * fizeram parte do catálogo de telas (não há o que proteger/conceder), mas
 * já existiam como placeholders "em breve" no menu antes desta unificação.
 * Preservados aqui como itens avulsos, na posição original.
 */
const POLITIX_IA_ITEM: NavItem = {
  label: 'Politix IA',
  href: '/dashboard/politix-ia',
  icon: Sparkles,
  permission: null,
  pageNotYetImplemented: true,
  description: 'Insights preditivos com IA',
};

const AUDITORIA_ITEM: NavItem = {
  label: 'Auditoria',
  href: '/dashboard/auditoria',
  icon: ShieldCheck,
  permission: null,
  pageNotYetImplemented: true,
  description: 'Logs e conformidade',
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Inteligência',
    items: byGroup('Inteligência').map(screenToNavItem),
  },
  {
    label: 'Monitoramento',
    items: [screenToNavItem(candidatosScreen), POLITIX_IA_ITEM],
  },
  {
    label: 'Operação',
    items: byGroup('Operação').map(screenToNavItem),
  },
  {
    label: 'Sistema',
    items: [screenToNavItem(usuariosScreen), AUDITORIA_ITEM, screenToNavItem(configuracoesScreen)],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export interface NavPermissions {
  role: string;
  permissions: string[];
}

export function canSeeNavItem(item: NavItem, perms: NavPermissions): boolean {
  const isAdmin = perms.role === 'admin';
  if (item.adminOnly) return isAdmin;
  if (isAdmin) return true;
  if (item.permission === null) return false;
  return perms.permissions.includes(item.permission);
}

/** Módulo atual a partir do pathname — usado pelo ModuleSwitcher para exibir
 *  ícone/nome corretos mesmo em sub-rotas (ex.: /dashboard/investigacoes/123). */
export function findCurrentNavItem(pathname: string): NavItem | undefined {
  if (pathname === '/dashboard' || pathname === '/dashboard/overview') {
    return ALL_NAV_ITEMS.find((i) => i.href === '/dashboard/overview');
  }
  return ALL_NAV_ITEMS.find((i) => pathname.startsWith(i.href));
}
