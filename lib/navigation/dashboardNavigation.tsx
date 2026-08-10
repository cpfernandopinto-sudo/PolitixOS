import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Newspaper,
  UserPlus,
  Zap,
  FileSearch,
  AlertTriangle,
  Users,
  UserCog,
  Settings,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export type NavIconProps = { size?: number; className?: string };
export type NavIcon = ComponentType<NavIconProps>;

/**
 * Ícones dedicados de Instagram/X — mesmo desenho usado no Sidebar anterior
 * (components/Sidebar.tsx), reaproveitado aqui para não duplicar estilos
 * nem regredir a identidade visual dos itens de navegação.
 */
export function InstagramNavIcon({ size = 20, className = '' }: NavIconProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-md border-2 border-current ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="rounded-full border-2 border-current"
        style={{ width: Math.round(size * 0.42), height: Math.round(size * 0.42) }}
      />
      <span
        className="absolute rounded-full bg-current"
        style={{
          width: Math.max(3, Math.round(size * 0.14)),
          height: Math.max(3, Math.round(size * 0.14)),
          right: Math.round(size * 0.18),
          top: Math.round(size * 0.18),
        }}
      />
    </span>
  );
}

export function XNavIcon({ size = 20, className = '' }: NavIconProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md border border-current/35 font-black leading-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.78), lineHeight: 1 }}
      aria-hidden="true"
    >
      X
    </span>
  );
}

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
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Inteligência',
    items: [
      {
        label: 'Visão Geral',
        href: '/dashboard/overview',
        icon: LayoutDashboard,
        permission: 'dashboard',
        description: 'Centro executivo consolidado',
      },
      {
        label: 'Notícias',
        href: '/dashboard/noticias',
        icon: Newspaper,
        permission: 'noticias',
        description: 'Monitoramento e análise de risco',
      },
      {
        label: 'Instagram',
        href: '/dashboard/instagram',
        icon: InstagramNavIcon,
        permission: 'instagram',
        description: 'Análise de comentários e interações',
      },
      {
        label: 'X',
        href: '/dashboard/x',
        icon: XNavIcon,
        permission: 'x',
        description: 'Discurso político em tempo real',
      },
      {
        label: 'Investigações',
        href: '/dashboard/investigacoes',
        icon: FileSearch,
        permission: 'investigacoes',
        description: 'Dossiês e investigações profundas',
      },
    ],
  },
  {
    label: 'Monitoramento',
    items: [
      {
        label: 'Candidatos/Entidades',
        href: '/dashboard/candidatos',
        icon: UserPlus,
        permission: 'candidatos',
        description: 'Perfil de candidatos monitorados',
      },
      {
        label: 'Politix IA',
        href: '/dashboard/politix-ia',
        icon: Sparkles,
        permission: null,
        pageNotYetImplemented: true,
        description: 'Insights preditivos com IA',
      },
    ],
  },
  {
    label: 'Operação',
    items: [
      {
        label: 'Automação/Operação',
        href: '/dashboard/automacoes',
        icon: Zap,
        permission: 'automacoes',
        description: 'Integrações e alertas automáticos',
      },
    ],
  },
  {
    label: 'Sistema',
    items: [
      {
        label: 'Usuários',
        href: '/dashboard/usuarios',
        icon: UserCog,
        permission: null,
        adminOnly: true,
        description: 'Gestão de acessos',
      },
      {
        label: 'Auditoria',
        href: '/dashboard/auditoria',
        icon: ShieldCheck,
        permission: null,
        pageNotYetImplemented: true,
        description: 'Logs e conformidade',
      },
      {
        label: 'Configurações',
        href: '/dashboard/configuracoes',
        icon: Settings,
        permission: 'configuracoes',
        pageNotYetImplemented: true,
        description: 'Configurações do sistema',
      },
    ],
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
