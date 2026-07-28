'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Newspaper,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Zap,
  UserCog,
  FileSearch,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useMobileSidebar } from '@/components/MobileSidebarContext';

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

function XChannelIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
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

function InstagramChannelIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
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
          top: Math.round(size * 0.18)
        }}
      />
    </span>
  );
}

// Agrupamento por seção. Apenas módulos com página real implementada entram
// aqui — "Gestão de Crise" e "Apoiadores" foram removidos por não possuírem
// rota funcional (levavam a 404).
interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Inteligência',
    items: [
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
        icon: <InstagramChannelIcon size={20} />,
      },
      {
        href: '/dashboard/x',
        label: 'Radar X',
        screenKey: 'x',
        icon: <XChannelIcon size={20} />,
      },
      {
        href: '/dashboard/investigacoes',
        label: 'Investigações',
        screenKey: 'investigacoes',
        icon: <FileSearch size={20} className="shrink-0" />,
      },
      {
        href: '/dashboard/alertas',
        label: 'Central de Alertas',
        screenKey: 'alertas',
        icon: <AlertTriangle size={20} className="shrink-0" />,
      },
      {
        href: '/dashboard/candidatos',
        label: 'Candidatos',
        screenKey: 'candidatos',
        icon: <UserPlus size={20} className="shrink-0" />,
      },
    ],
  },
  {
    label: 'Administração',
    items: [
      {
        href: '/dashboard/automacoes',
        label: 'Automação',
        screenKey: 'automacoes',
        icon: <Zap size={20} className="shrink-0" />,
      },
    ],
  },
];

interface Props {
  permissions: SidebarPermissions;
}

interface NavListProps {
  permissions: SidebarPermissions;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}

/**
 * Lista de navegação compartilhada entre a sidebar fixa (desktop, `lg:` e
 * acima) e o overlay mobile — evita duplicar a árvore de itens/permissões
 * em dois lugares.
 */
function SidebarNavList({ permissions, pathname, collapsed, onNavigate }: NavListProps) {
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

  return (
    <>
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-x-hidden overflow-y-auto">
        {(isAdmin || permissions.permissions.includes('dashboard')) && (
          <div className="space-y-2">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Painel</p>
            )}
            <Link
              href="/dashboard/overview"
              className={linkClass(pathname === '/dashboard' || pathname === '/dashboard/overview')}
              title="Visão Geral"
              onClick={onNavigate}
            >
              <LayoutDashboard size={20} className="shrink-0" />
              {!collapsed && <span className="font-medium whitespace-nowrap">Visão Geral</span>}
            </Link>
          </div>
        )}

        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(canSee);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="space-y-2 pt-3">
              {!collapsed && (
                <p className="px-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest">{group.label}</p>
              )}
              {visibleItems.map((item) => (
                <Link
                  key={item.screenKey}
                  href={item.href}
                  className={linkClass(isActive(item.href))}
                  title={item.label}
                  onClick={onNavigate}
                >
                  {item.icon}
                  {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                </Link>
              ))}
            </div>
          );
        })}

        {isAdmin && (
          <div className="space-y-2 pt-3">
            <Link
              href="/dashboard/usuarios"
              className={linkClass(pathname.startsWith('/dashboard/usuarios'))}
              title="Usuários"
              onClick={onNavigate}
            >
              <UserCog size={20} className="shrink-0" />
              {!collapsed && <span className="font-medium whitespace-nowrap">Usuários</span>}
            </Link>
          </div>
        )}
      </nav>

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
    </>
  );
}

export default function Sidebar({ permissions }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { open: mobileOpen, setOpen: setMobileOpen } = useMobileSidebar();

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('politixos_sidebar_collapsed');
    setCollapsed(stored === null ? true : stored === 'true');
  }, []);

  // Fecha o overlay mobile com Esc e ao trocar de rota.
  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, setMobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleSidebar = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem('politixos_sidebar_collapsed', String(newVal));
  };

  if (!mounted) return null;

  return (
    <>
      {/* Desktop (lg e acima): sidebar fixa, recolhível, mesmo comportamento
          de sempre. Abaixo de lg ela NUNCA ocupa espaço fixo — ver overlay
          mobile abaixo (docs/AUDITORIA_VISUAL_SPRINT_5.md, achado #7). */}
      <aside
        className={`hidden lg:flex ${collapsed ? 'w-20' : 'w-64'} h-screen sticky top-0 bg-[#0D0D0D] border-r border-white/5 flex-col z-50 transition-all duration-300`}
      >
        <div className={`p-6 flex items-center min-h-[80px] ${collapsed ? 'justify-center' : 'justify-start'}`}>
          <img
            src="/brand/PolitixOS.png"
            alt="PolitixOS"
            className={`${collapsed ? 'w-10' : 'w-full max-w-[160px]'} h-auto object-contain`}
          />
        </div>

        <div className={`px-4 flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <SidebarNavList permissions={permissions} pathname={pathname} collapsed={collapsed} />
      </aside>

      {/* Mobile (< lg): overlay acionado pelo botão de menu no cabeçalho
          (components/HeaderMenuButton.tsx via MobileSidebarContext). Nunca
          reduz a largura do conteúdo principal quando fechado. */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[200] flex" role="presentation">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="relative h-full w-[280px] max-w-[80vw] bg-[#0D0D0D] border-r border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200"
          >
            <div className="p-6 flex items-center justify-between min-h-[80px]">
              <img src="/brand/PolitixOS.png" alt="PolitixOS" className="w-full max-w-[140px] h-auto object-contain" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="shrink-0 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <SidebarNavList permissions={permissions} pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
