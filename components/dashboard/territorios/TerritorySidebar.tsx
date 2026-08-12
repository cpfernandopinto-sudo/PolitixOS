'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TERRITORY_GROUPS } from './navigation';

export default function TerritorySidebar({ ibge }: { ibge: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // localStorage não existe durante SSR/primeira renderização — não é
  // possível derivar este estado durante o render (causaria erro de
  // hydration). Ler o valor uma única vez após o mount é o uso legítimo
  // de efeito para sincronizar com um sistema externo (browser storage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const stored = localStorage.getItem('politixos_territory_sidebar_collapsed');
    if (stored) {
      setCollapsed(stored === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem('politixos_territory_sidebar_collapsed', String(newVal));
  };

  const linkClass = (active: boolean) =>
    `relative flex items-center gap-3 px-2 py-2 rounded transition-colors duration-200 ${
      active
        ? 'text-cyan-400 font-medium'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
    }`;

  if (!mounted) return <aside className="w-[190px] bg-[var(--background)] border-r border-white/5 hidden md:block shrink-0 h-full" />;

  return (
    <aside
      className={`bg-[var(--background)] border-r border-white/5 hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out h-full overflow-y-auto custom-scrollbar ${
        collapsed ? 'w-[56px]' : 'w-[190px]'
      }`}
    >
      {/* Header */}
      <div className={`flex ${collapsed ? 'justify-center' : 'justify-between'} items-center px-3 py-4 sticky top-0 bg-[var(--background)] z-10`}>
        {!collapsed && (
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase pl-1">
            Cadernos
          </span>
        )}
        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expandir cadernos' : 'Recolher cadernos'}
          title={collapsed ? 'Abrir cadernos' : 'Recolher menu'}
          className={`p-1 rounded border border-transparent hover:border-white/[0.08] hover:bg-white/[0.02] text-slate-500 hover:text-slate-300 transition-all ${collapsed ? '' : 'mr-1'}`}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-1.5 py-1 pb-6">
        <div className="space-y-5">
          {TERRITORY_GROUPS.map((group) => {
            // Se for Visão Geral e estivermos no item único, não precisa de título extra se quisermos manter clean,
            // mas o user pediu para manter "VISÃO, TERRITÓRIO, POLÍTICA...".
            // Para "Visão Geral", o grupo.items tem só 1.
            return (
              <div key={group.label} className="space-y-1">
                {!collapsed && (
                  <div className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 select-none">
                    {group.label}
                  </div>
                )}
                
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const itemPath = item.href === '' ? `/dashboard/territorios/${ibge}` : `/dashboard/territorios/${ibge}${item.href}`;
                    const isActive = pathname === itemPath;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={itemPath}
                        className={`group ${linkClass(isActive)} ${collapsed ? 'justify-center !px-0' : ''}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon size={16} className={isActive ? 'text-cyan-400 shrink-0' : 'text-slate-500 shrink-0 group-hover:text-slate-300 transition-colors'} />
                        
                        {collapsed ? (
                          <span className="absolute left-full ml-3 px-2 py-1 rounded bg-[#161B26] text-slate-200 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50 border border-white/[0.08]">
                            {item.label}
                          </span>
                        ) : (
                          <span className="text-[12px] tracking-wide whitespace-nowrap leading-tight">{item.label}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
