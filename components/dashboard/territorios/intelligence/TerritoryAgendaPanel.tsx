'use client';

import React from 'react';
import { Calendar, HelpCircle, AlertCircle, Sparkles } from 'lucide-react';

export interface TerritoryAgendaItem {
  type: 'pauta_prioritaria' | 'ponto_atencao' | 'pergunta_chave' | 'oportunidade';
  title: string;
  detail: string;
  sourceDomain?: string;
}

export interface TerritoryAgendaPanelProps {
  municipioName: string;
  items: TerritoryAgendaItem[];
}

export default function TerritoryAgendaPanel({
  municipioName,
  items,
}: TerritoryAgendaPanelProps) {
  return (
    <div className="bg-[#111726] border border-cyan-500/30 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              <span>Agenda de Inteligência para Visita Territorial</span>
              <Sparkles size={14} className="text-cyan-400" />
            </h3>
            <span className="text-xs text-slate-400 font-mono">Briefing Executivo para Campo: {municipioName}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {items.map((item, idx) => {
          const isQuestion = item.type === 'pergunta_chave';
          const isWarning = item.type === 'ponto_atencao';

          return (
            <div
              key={idx}
              className="bg-[#0B0F19] p-4 rounded-xl border border-white/5 space-y-2 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold">
                <span className={`px-2 py-0.5 rounded border ${
                  isQuestion ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                  isWarning ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {item.type.replace('_', ' ')}
                </span>
                {item.sourceDomain && (
                  <span className="text-slate-500">{item.sourceDomain}</span>
                )}
              </div>

              <h4 className="text-xs font-bold text-white tracking-tight flex items-start gap-1.5">
                {isQuestion ? (
                  <HelpCircle size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                )}
                <span>{item.title}</span>
              </h4>

              <p className="text-xs text-slate-300 leading-relaxed pl-5">
                {item.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
