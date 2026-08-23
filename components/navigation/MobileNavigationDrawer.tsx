'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import type { NavGroup } from '@/lib/navigation/dashboardNavigation';
import { buildNavHref } from '@/lib/filters/global';

interface Props {
  open: boolean;
  onClose: () => void;
  groups: NavGroup[];
  currentHref: string;
}

/**
 * Drawer mobile — mesma fonte de dados (groups) do mega dropdown desktop,
 * não duplica a lista de rotas em nenhum lugar.
 */
export default function MobileNavigationDrawer({ open, onClose, groups, currentHref }: Props) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] [animation:navmenu-fade-in_160ms_ease-out]"
      />
      <div className="absolute left-0 top-0 flex h-full w-[85%] max-w-[320px] flex-col border-r border-blue-300/10 bg-[#0D1526] shadow-[16px_0_48px_rgba(0,0,0,0.5)] [animation:navdrawer-in_180ms_ease-out]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
          <img
            src="/brand/politix.svg"
            alt="Politix"
            className="w-[140px] h-auto object-contain"
          />
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {groups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? 'mt-2 border-t border-white/[0.06] pt-2' : ''}>
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {group.label}
              </div>
              {group.items.map((item) => {
                const active = currentHref === item.href;
                const Icon = item.icon;
                const href = buildNavHref(item.href, searchParams, {
                  supportsCandidate: item.supportsGlobalCandidate,
                  supportsPeriod: item.supportsGlobalPeriod,
                });
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex h-[46px] items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150 ${
                      active
                        ? 'bg-blue-500/[0.08] text-white'
                        : 'text-slate-300 hover:bg-blue-500/[0.06] hover:text-white'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-cyan-400" />
                    )}
                    <Icon size={19} className={`shrink-0 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
