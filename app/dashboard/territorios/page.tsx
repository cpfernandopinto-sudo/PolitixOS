import React from 'react';
import { Compass } from 'lucide-react';
import { getAvailableUfs } from '@/lib/queries/territories';
import TerritoriosClient from './TerritoriosClient';

export const dynamic = 'force-dynamic';

export default async function TerritoriosPage() {
  const ufs = await getAvailableUfs();

  return (
    <div className="space-y-8 p-4 md:p-6 lg:p-8 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0 mt-1 shadow-lg shadow-cyan-500/5">
          <Compass size={28} />
        </div>
        <div>
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
            Módulo Territórios & Strategia
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            POLITIX TERRITÓRIOS
          </h1>
          <p className="text-gray-300 text-sm md:text-base mt-1 max-w-3xl leading-relaxed">
            Inteligência territorial para preparação estratégica, leitura de cenário e tomada de decisão política.
          </p>
        </div>
      </div>

      <TerritoriosClient initialUfs={ufs} />
    </div>
  );
}
