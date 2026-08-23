import React from 'react';
import { Compass } from 'lucide-react';
import { getAvailableUfs } from '@/lib/queries/territories';
import TerritoriosClient from './TerritoriosClient';

export const dynamic = 'force-dynamic';

export default async function TerritoriosPage() {
  const ufs = await getAvailableUfs();

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in">
      <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3">
        <Compass size={14} className="text-cyan-400 shrink-0" />
        <span className="text-[9px] font-bold uppercase tracking-[.2em] text-cyan-400 shrink-0">Inteligência Territorial</span>
        <span className="h-3 w-px bg-white/[0.12] shrink-0" />
        <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">Territórios &amp; Estratégia</h1>
        <span className="text-[10px] text-slate-500 leading-none hidden sm:inline">Inteligência territorial para preparação estratégica e tomada de decisão.</span>
      </div>

      <TerritoriosClient initialUfs={ufs} />
    </div>
  );
}
