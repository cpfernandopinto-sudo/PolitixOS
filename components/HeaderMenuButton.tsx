'use client';

import { Menu } from 'lucide-react';
import { useMobileSidebar } from '@/components/MobileSidebarContext';

/**
 * Botão de menu, visível só abaixo de `lg` — abre o overlay de navegação
 * mobile (ver `components/Sidebar.tsx`). Em desktop a sidebar fixa já está
 * sempre visível, então este botão fica oculto.
 */
export default function HeaderMenuButton() {
  const { setOpen } = useMobileSidebar();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Abrir menu de navegação"
      className="lg:hidden shrink-0 p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
    >
      <Menu size={22} />
    </button>
  );
}
