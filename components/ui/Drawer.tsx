'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Drawer lateral genérico e acessível, reutilizável em qualquer módulo
 * (notícias, Instagram, X, alertas, ...).
 *
 * - Fecha com Esc.
 * - Focus trap simples (Tab/Shift+Tab não escapam do drawer).
 * - Devolve o foco ao elemento que abriu o drawer ao fechar.
 * - Preserva o scroll da tela por trás (não usa scroll lock destrutivo).
 * - Em mobile ocupa quase toda a tela; em desktop é um painel lateral.
 *
 * Sprint UX — Etapa 7: renderiza via `createPortal` direto em `document.body`.
 * Antes, o Drawer montava no lugar (dentro da árvore da página), o que o
 * prendia dentro do stacking context implícito criado por
 * `.dashboard-main > *` (animação de entrada com `animation-fill-mode: both`
 * em `app/globals.css`) — por isso o cabeçalho ficava visualmente atrás da
 * barra superior (`z-index: 40`, sticky) mesmo o Drawer tendo `z-[150]`: os
 * dois z-index nunca chegavam a ser comparados diretamente, porque viviam em
 * stacking contexts diferentes. O portal resolve isso movendo o Drawer para
 * fora dessa árvore, sem tocar na animação global (usada por outras páginas)
 * nem em nenhuma lógica de conteúdo — focus trap, Esc, clique fora e retorno
 * de foco continuam exatamente iguais, pois operam sobre refs/DOM, não sobre
 * a posição do componente na árvore React.
 */
export default function Drawer({ open, onClose, title, subtitle, children, footer }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

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
      window.removeEventListener('keydown', handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative h-full w-full sm:w-[480px] lg:w-[560px] bg-[#12192A] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-white/5 sticky top-0 bg-[#12192A]/95 backdrop-blur-md z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white tracking-tight truncate">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            data-drawer-close
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="shrink-0 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>

        {footer && (
          <div className="p-6 border-t border-white/5 sticky bottom-0 bg-[#12192A]/95 backdrop-blur-md flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
