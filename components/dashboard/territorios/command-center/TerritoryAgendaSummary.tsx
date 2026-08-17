'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { TerritoryAgendaItem } from '../intelligence/TerritoryAgendaPanel';

export interface TerritoryAgendaSummaryProps {
  municipioName: string;
  ibge: string;
  items: TerritoryAgendaItem[];
}

export default function TerritoryAgendaSummary({
  municipioName,
  ibge,
  items,
}: TerritoryAgendaSummaryProps) {
  const topItems = items.slice(0, 3);

  return (
    <div className="bg-[#111726] border border-cyan-500/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-cyan-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
            Pautas para Atuação no Território ({municipioName})
          </h4>
        </div>

        <Link
          href={`/dashboard/territorios/${ibge}/inteligencia-politica`}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold font-mono flex items-center gap-1"
        >
          <span>Ver Agenda Completa</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {topItems.map((item, idx) => (
          <div key={idx} className="p-3 bg-[#0B0F19] rounded-lg border border-white/5 space-y-1 text-xs">
            <span className="text-[9px] font-mono uppercase font-bold text-cyan-400 block">
              {item.type.replace('_', ' ')}
            </span>
            <h5 className="font-bold text-white tracking-tight">{item.title}</h5>
            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
