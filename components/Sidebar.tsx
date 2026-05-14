'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Newspaper,
  AlertTriangle,
  Users,
  Settings,
  Hash,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Zap,
  UserCog,
  MessageSquare,
  Radio,
} from 'lucide-react';

export interface SidebarPermissions {
  role: string;
  permissions: string[];
}

interface NavItem {
  href: string;
  label: string;
  screenKey: string;
  icon: React.ReactNode;
  /** Se true, só admin vê */
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard/noticias',
    label: 'Radar de Notícias',
    screenKey: 'noticias',
    icon: <Newspaper size={20} className="shrink-0" />,
  },
  {
    href: '/dashboard/instagram',
    label: 'Radar Instagram',
    screenKey: 'instagram',
    icon: <Hash size={20} className="shrink-0" />,
  },
  {
    href: '/dashboard/x',
    label: 'Radar X',
    screenKey: 'x',
    icon: <Radio size={20} className="shrink-0" />,
  },
  {
    href: '/dashboard/candidatos',
    label: 'Candidatos',
    screenKey: 'candidatos',
    icon: <UserPlus size={20} className="shrink-0" />,
  },
  {
    href: '/dashboard/automacoes',
    label: 'Automação',
    screenKey: 'automacoes',
    icon: <Zap size={20} className="shrink-0" />,
  },
  {
    href: '/dashboard/gestao-crise',
    label: 'Gestão de Crise',
    screenKey: 'gestao_crise',
    icon: <AlertTriangle size={20} className="shrink-0" />,
  },
  {
    href: '/dashboard/apoiadores',
    label: 'Apoiadores',
    screenKey: 'apoiadores',
    icon: <Users size={20} className="shrink-0" />,
  },
];

interface Props {
  permissions: SidebarPermissions;
}

export default function Sidebar({ permissions }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('politixos_sidebar_collapsed');
    if (stored) setCollapsed(stored === 'true');
  }, []);

  const toggleSidebar = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem('politixos_sidebar_collapsed', String(newVal));
  };

  const isAdmin = permissions.role === 'admin';

  const canSee = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return false;
    if (isAdmin) return true;
    return permissions.permissions.includes(item.screenKey);
  };

  const isActive = (href: string) => pathname.startsWith(href);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active
      ? 'bg-blue-600/10 text-[#2563EB] border border-blue-500/20'
      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
    } ${collapsed ? 'justify-center' : ''}`;

  if (!mounted) return null;

  return (
    <aside
      className={`${collapsed ? 'w-20' : 'w-64'} h-screen sticky top-0 bg-[#0D0D0D] border-r border-white/5 flex flex-col z-50 transition-all duration-300`}
    >
      {/* Logo */}
      <div className={`p-6 flex items-center min-h-[80px] ${collapsed ? 'justify-center' : 'justify-start'}`}>
        <img
          src="/brand/PolitixOS.png"
          alt="PolitixOS"
          className={`${collapsed ? 'w-10' : 'w-full max-w-[160px]'} h-auto object-contain`}
        />
      </div>

      {/* Toggle */}
      <div className={`px-4 flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-x-hidden overflow-y-auto">
        {/* Visão Geral — só admin ou quem tem permissão dashboard */}
        {(isAdmin || permissions.permissions.includes('dashboard')) && (
          <Link
            href="/dashboard/overview"
            className={linkClass(pathname === '/dashboard' || pathname === '/dashboard/overview')}
            title="Visão Geral"
          >
            <LayoutDashboard size={20} className="shrink-0" />
            {!collapsed && <span className="font-medium whitespace-nowrap">Visão Geral</span>}
          </Link>
        )}

        {NAV_ITEMS.filter(canSee).map((item) => (
          <Link
            key={item.screenKey}
            href={item.href}
            className={linkClass(isActive(item.href))}
            title={item.label}
          >
            {item.icon}
            {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
          </Link>
        ))}

        {/* Usuários — apenas admin */}
        {isAdmin && (
          <Link
            href="/dashboard/usuarios"
            className={linkClass(pathname.startsWith('/dashboard/usuarios'))}
            title="Usuários"
          >
            <UserCog size={20} className="shrink-0" />
            {!collapsed && <span className="font-medium whitespace-nowrap">Usuários</span>}
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 space-y-2">
        {(isAdmin || permissions.permissions.includes('configuracoes')) && (
          <button
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors ${collapsed ? 'justify-center' : ''}`}
            title="Configurações"
          >
            <Settings size={20} className="shrink-0" />
            {!collapsed && <span className="font-medium whitespace-nowrap">Configurações</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
