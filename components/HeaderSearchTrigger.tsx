'use client';

import { Search } from 'lucide-react';
import { OPEN_COMMAND_PALETTE_EVENT } from '@/components/CommandPalette';

export default function HeaderSearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT))}
      className="relative w-96 flex items-center bg-[#12192A] border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm text-gray-500 hover:border-white/10 focus:outline-none focus:border-[#2563EB]/50 transition-all text-left"
    >
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <span className="flex-1">Buscar notícias, candidatos ou temas…</span>
      <kbd className="hidden sm:inline text-[10px] text-gray-600 border border-white/10 rounded px-1.5 py-0.5 ml-2">
        ⌘K
      </kbd>
    </button>
  );
}
