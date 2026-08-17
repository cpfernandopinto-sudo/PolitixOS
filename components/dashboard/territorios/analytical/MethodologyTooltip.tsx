'use client';

import React, { useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';

export interface MethodologyTooltipProps {
  title: string;
  methodology?: string;
  unit?: string;
  period?: string;
  source?: string;
}

export default function MethodologyTooltip({
  title,
  methodology,
  unit,
  period,
  source,
}: MethodologyTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!methodology && !source && !unit) return null;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="p-0.5 text-slate-500 hover:text-cyan-400 rounded transition-colors focus:outline-none"
        aria-label={`Nota metodológica de ${title}`}
      >
        <HelpCircle size={13} />
      </button>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-[#0B0F19] border border-cyan-500/30 rounded-xl text-xs shadow-2xl z-50 space-y-1.5 backdrop-blur-md">
          <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono border-b border-white/5 pb-1">
            <Info size={12} />
            <span>{title}</span>
          </div>

          {methodology && (
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {methodology}
            </p>
          )}

          <div className="pt-1 text-[10px] text-slate-400 font-mono space-y-0.5 border-t border-white/5">
            {unit && <div><strong>Unidade:</strong> {unit}</div>}
            {period && <div><strong>Período:</strong> {period}</div>}
            {source && <div><strong>Fonte:</strong> {source}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
