'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { NavGroup } from '@/lib/navigation/dashboardNavigation';

interface Props {
  id: string;
  groups: NavGroup[];
  currentHref: string;
  onNavigate: () => void;
}

/**
 * Painel do mega dropdown (desktop). O posicionamento (absolute/top/left) é
 * responsabilidade do componente pai (ModuleSwitcher) — este componente só
 * cuida do conteúdo, semântica de menu e navegação por teclado.
 *
 * Fase 2 de refinamento: descrição só aparece no item ativo (reduz altura
 * total do painel); nos demais itens com descrição, ela vira tooltip nativo
 * (`title`) — acessível via hover e leitores de tela sem biblioteca nova.
 */
export default function ModuleNavigationMenu({ id, groups, currentHref, onNavigate }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (items.length === 0) return;
    e.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') items[(currentIndex + 1 + items.length) % items.length].focus();
    else if (e.key === 'ArrowUp') items[(currentIndex - 1 + items.length) % items.length].focus();
    else if (e.key === 'Home') items[0].focus();
    else if (e.key === 'End') items[items.length - 1].focus();
  }

  return (
    <div
      ref={menuRef}
      id={id}
      role="menu"
      aria-label="Módulos do PolitixOS"
      onKeyDown={handleKeyDown}
      className="absolute left-0 top-[calc(100%+8px)] z-50 w-[292px] max-h-[calc(100vh-96px)] overflow-y-auto rounded-xl border border-blue-300/10 bg-[#0D1526]/98 p-[10px] shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-sm [animation:navmenu-in_160ms_ease-out]"
    >
      {groups.map((group, gi) => (
        <div key={group.label} className={gi > 0 ? 'mt-1.5 border-t border-white/[0.06] pt-1.5' : ''}>
          <div className="px-2 pb-0.5 pt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {group.label}
          </div>
          {group.items.map((item) => {
            const active = currentHref === item.href;
            const Icon = item.icon;
            const showDescription = active && item.description;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                aria-current={active ? 'page' : undefined}
                title={!active && item.description ? item.description : undefined}
                onClick={onNavigate}
                className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${
                  showDescription ? 'items-start py-2' : 'h-10'
                } ${
                  active
                    ? 'bg-blue-500/[0.08] text-white'
                    : 'text-slate-300 hover:bg-blue-500/[0.06] hover:text-white'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-cyan-400" />
                )}
                <Icon size={18} className={`shrink-0 ${showDescription ? 'mt-0.5' : ''} ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="min-w-0">
                  <span className="block truncate font-medium leading-tight">{item.label}</span>
                  {showDescription && (
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">{item.description}</span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
