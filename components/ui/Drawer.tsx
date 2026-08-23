'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
  badge?: React.ReactNode;
}

/**
 * Drawer lateral canônico e acessível do PolitixOS.
 *
 * - Renderiza via `createPortal` em `document.body` com `z-[150]` (independente do stacking context da página).
 * - Ancorado à direita, ocupando entre 38% e 45% da tela em desktop/notebook (`max-w-[45vw]`), mantendo o contexto do dashboard visível ao fundo.
 * - Backdrop moderado (`bg-black/60 backdrop-blur-sm`) que escurece o fundo sem ocultá-lo.
 * - Header fixo no topo (`sticky top-0 z-10 backdrop-blur-md bg-[#0F131C]/95`) com botão [X] visível, acessível e com hover.
 * - Corpo com scroll interno independente (`flex-1 overflow-y-auto`).
 * - Suporta fechamento por botão [X], tecla `Escape` e clique no backdrop.
 */
export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClassName,
  badge,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    // Trava do scroll do body enquanto aberto
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const closeButton = panelRef.current?.querySelector<HTMLElement>('[data-drawer-close]');
    closeButton?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener('keydown', handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Largura lateral responsiva (38% a 45% da tela em desktop)
  const panelWidthClass =
    widthClassName ?? 'w-full sm:w-[480px] lg:w-[540px] xl:w-[600px] sm:max-w-[45vw]';

  return createPortal(
    <div className="fixed inset-0 z-[150] flex justify-end" role="presentation">
      {/* Backdrop Moderado para preservar visualização do dashboard ao fundo */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Painel Lateral (Drawer) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Painel de detalhes'}
        className={`relative h-full ${panelWidthClass} bg-[#0F131C] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200`}
      >
        {/* Header Fixo Sticky */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-white/10 bg-[#0F131C]/95 backdrop-blur-md">
          <div className="min-w-0 flex-1 space-y-0.5">
            {badge && <div className="flex items-center gap-2 mb-1">{badge}</div>}
            {typeof title === 'string' ? (
              <h2 className="text-base font-bold text-white tracking-tight truncate">{title}</h2>
            ) : (
              title
            )}
            {subtitle && (
              typeof subtitle === 'string' ? (
                <p className="text-xs text-slate-400 truncate">{subtitle}</p>
              ) : (
                subtitle
              )
            )}
          </div>

          {/* Botão Fechar [X] */}
          <button
            type="button"
            data-drawer-close
            onClick={onClose}
            aria-label="Fechar painel"
            className="shrink-0 p-2 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo com Scroll Interno Independente */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">{children}</div>

        {/* Footer Sticky (Opcional) */}
        {footer && (
          <div className="p-4 sm:p-5 border-t border-white/10 sticky bottom-0 bg-[#0F131C]/95 backdrop-blur-md flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
