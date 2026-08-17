'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { CORE_DOSSIER_NOTEBOOKS } from '../navigation';

export interface TerritoryNotebookNavigatorProps {
  ibge: string;
}

export default function TerritoryNotebookNavigator({ ibge }: TerritoryNotebookNavigatorProps) {
  // Exclude Visão Geral (current main page)
  const thematicNotebooks = CORE_DOSSIER_NOTEBOOKS.filter((n) => n.id !== 'visao-geral');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
            Aprofundamento por Cadernos Temáticos
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">6 Cadernos Disponíveis</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {thematicNotebooks.map((nb) => {
          const href = `/dashboard/territorios/${ibge}${nb.href}`;
          const IconComp = nb.icon;

          return (
            <Link
              key={nb.id}
              href={href}
              className="bg-[#111726] border border-white/5 hover:border-cyan-500/30 rounded-xl p-4 transition-all hover:translate-y-[-2px] flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-cyan-400 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-colors">
                  <IconComp size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {nb.label}
                  </h4>
                  <span className="text-[10px] text-slate-400 block font-mono">Caderno {nb.label}</span>
                </div>
              </div>

              <ArrowUpRight size={14} className="text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0 ml-2" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
