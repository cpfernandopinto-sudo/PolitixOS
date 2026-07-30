'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import ModuleNavigationMenu from './ModuleNavigationMenu';
import { findCurrentNavItem, type NavGroup } from '@/lib/navigation/dashboardNavigation';

interface Props {
  groups: NavGroup[];
}

const MENU_ID = 'module-navigation-menu';

export default function ModuleSwitcher({ groups }: Props) {
  const pathname = usePathname();
  const currentItem = findCurrentNavItem(pathname);
  const [open, setOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fecha o menu ao trocar de rota — ajuste de estado durante o render
  // (padrão recomendado pelo React) em vez de setState dentro de um efeito.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const Icon = currentItem?.icon;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={MENU_ID}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-[40px] items-center gap-2 rounded-xl border px-4 transition-colors duration-150 ${
          open
            ? 'border-cyan-400/25 bg-blue-500/[0.12] text-white'
            : 'border-cyan-400/[0.12] bg-[#0E1727] text-slate-200 hover:border-cyan-400/20 hover:bg-blue-500/[0.08]'
        }`}
      >
        {Icon && <Icon size={18} className="shrink-0 text-cyan-400" />}
        <span className="whitespace-nowrap text-sm font-medium">{currentItem?.label ?? 'Módulos'}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ModuleNavigationMenu
          id={MENU_ID}
          groups={groups}
          currentHref={currentItem?.href ?? ''}
          onNavigate={() => setOpen(false)}
        />
      )}
    </div>
  );
}
