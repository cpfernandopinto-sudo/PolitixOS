'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Filter, SlidersHorizontal, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  children: React.ReactNode;
  label?: string;
}

export function ChartFilterPopover({ children, label = 'Filtros' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
          isOpen 
            ? "bg-[#00FFFF]/10 border-[#00FFFF]/30 text-[#00FFFF]" 
            : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
        )}
      >
        <SlidersHorizontal size={12} />
        {label}
        <ChevronDown size={10} className={clsx("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-[#12192A] border border-white/10 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-100 p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Filter size={14} className="text-[#00FFFF]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Configurações Locais</span>
            </div>
            <div className="space-y-4">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
