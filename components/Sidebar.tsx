'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NAV_GROUPS, canSeeNavItem, type NavPermissions, type NavItem } from '@/lib/navigation/dashboardNavigation';
import { buildNavHref } from '@/lib/filters/global';

interface Props {
  permissions: NavPermissions;
}

export default function Sidebar({ permissions }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('politixos_sidebar_collapsed');
    setCollapsed(stored === null ? false : stored === 'true');
  }, []);

  const toggleSidebar = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem('politixos_sidebar_collapsed', String(newVal));
  };

  const isActive = (item: NavItem) => {
    if (item.href === '/dashboard/overview') {
      return pathname === '/dashboard' || pathname === '/dashboard/overview';
    }
    return pathname.startsWith(item.href);
  };

  const linkClass = (active: boolean) =>
    `relative flex items-center gap-3 px-3 py-2 rounded transition-all duration-200 ${
      active
        ? 'bg-cyan-400/10 text-cyan-400 font-semibold'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
    } ${collapsed ? 'justify-center' : ''}`;

  if (!mounted) return null;

  return (
    // SIDEBAR — apenas Navigation Area.
    // A Brand Area foi movida para o Header (full-width).
    // Não há mais pt-[72px] porque o header está ACIMA da linha sidebar+main
    // no layout (flex-col), não ao lado.
    <aside
      className={`hidden md:flex flex-col shrink-0 transition-all duration-300 z-40 ${
        collapsed ? 'w-20' : 'w-60'
      } h-full bg-[#0B0F19]`}
    >
      {/* NAVIGATION AREA — recolhível */}
      <nav
        className={`flex-1 flex flex-col bg-[#0B0F19] border-r border-white/[0.08] overflow-y-auto px-3 py-3 space-y-4 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-60'
        }`}
      >
        {/* Botão de controle da sidebar — pertence à Navigation Area, não à marca.
            Posicionado no topo do menu, claramente distante do logotipo. */}
        <div className={`flex ${collapsed ? 'justify-center' : 'justify-end'} pb-1`}>
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="p-1.5 rounded border border-white/[0.08] bg-white/[0.02] text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] hover:border-white/[0.15] transition-all focus-visible:outline-cyan-400"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => canSeeNavItem(item, permissions));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest select-none">
                  {group.label}
                </div>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  const href = item.pageNotYetImplemented
                    ? '#'
                    : buildNavHref(item.href, searchParams, {
                        supportsCandidate: item.supportsGlobalCandidate,
                        supportsPeriod: item.supportsGlobalPeriod,
                      });
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      className={`group ${linkClass(active)}`}
                      title={collapsed ? undefined : item.label}
                      onClick={(e) => {
                        if (item.pageNotYetImplemented) {
                          e.preventDefault();
                          alert(`Funcionalidade "${item.label}" em desenvolvimento.`);
                        }
                      }}
                    >
                      <Icon size={18} className="shrink-0" />

                      {/* Estado Compactado: exibe Tooltip flutuante e oculta texto */}
                      {collapsed ? (
                        <span className="absolute left-full ml-3 px-2 py-1 rounded bg-[#161B26] text-slate-200 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50 border border-white/[0.08]">
                          {item.label}
                        </span>
                      ) : (
                        <span className="text-xs tracking-wide whitespace-nowrap">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer operacional discreto (oculto quando colapsado) */}
      <div
        className={`bg-[#0B0F19] border-r border-white/[0.08] py-3 text-center text-[10px] text-slate-600 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-60'
        }`}
      >
        {!collapsed && <span>PolitixOS Premium v1.0</span>}
      </div>
    </aside>
  );
}
