'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TERRITORY_GROUPS, getActiveGroup } from './navigation';

export default function TerritorySubmenu({ ibge }: { ibge: string }) {
  const pathname = usePathname();
  const activeGroup = getActiveGroup(pathname, ibge);

  // Se não tem grupo, ou se é Visão Geral, não renderiza o submenu
  if (!activeGroup || activeGroup.label === 'Visão Geral') {
    return null;
  }

  return (
    <div className="w-full bg-[var(--background)] sticky top-0 z-30 border-b border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col pt-2 pb-0">
          <nav className="flex items-center gap-7 overflow-x-auto custom-scrollbar no-scrollbar pb-0">
            {activeGroup.items.map((item) => {
              const itemPath = item.href === '' ? `/dashboard/territorios/${ibge}` : `/dashboard/territorios/${ibge}${item.href}`;
              const isActive = pathname === itemPath;

              return (
                <Link
                  key={item.href}
                  href={itemPath}
                  className={`relative pb-2 text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-cyan-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-cyan-400" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
