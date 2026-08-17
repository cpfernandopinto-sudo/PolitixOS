'use client';

import React from 'react';
import { Zap, ShieldAlert, Target, Compass } from 'lucide-react';
import { PrioritizedSignal } from './PoliticalSignalStack';
import { StrategicRecommendation } from './StrategicRecommendationCard';

export interface ExecutiveBriefingProps {
  municipioName: string;
  synthesisHeadline: string;
  criticalSignals: PrioritizedSignal[];
  topRecommendations: StrategicRecommendation[];
}

export default function ExecutiveBriefing({
  municipioName,
  synthesisHeadline,
  criticalSignals,
  topRecommendations,
}: ExecutiveBriefingProps) {
  return (
    <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
            <Zap size={20} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
              Modo Leitura Rápida
            </span>
            <h3 className="text-lg md:text-xl font-extrabold text-white">
              Briefing Executivo de Inteligência — {municipioName}
            </h3>
          </div>
        </div>
      </div>

      {/* Synthesis */}
      <div className="p-4 bg-[#111726] border border-white/5 rounded-xl space-y-1">
        <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Síntese Estratégica</span>
        <p className="text-sm md:text-base font-semibold text-white leading-relaxed">
          {synthesisHeadline}
        </p>
      </div>

      {/* Grid Signals & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Critical Signals */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <ShieldAlert size={14} className="text-amber-400" />
            <span>Sinais Críticos (Top 3)</span>
          </h4>
          <div className="space-y-2">
            {criticalSignals.slice(0, 3).map((sig) => (
              <div key={sig.id} className="p-3 bg-[#111726] border border-white/5 rounded-lg space-y-1">
                <span className="text-[10px] font-mono font-bold text-rose-400">{sig.priority} · {sig.domains.join('+')}</span>
                <h5 className="text-xs font-bold text-white">{sig.title}</h5>
                <p className="text-[11px] text-slate-300 line-clamp-2">{sig.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Recommendations */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <Target size={14} className="text-cyan-400" />
            <span>Recomendações Prioritárias</span>
          </h4>
          <div className="space-y-2">
            {topRecommendations.slice(0, 2).map((rec) => (
              <div key={rec.id} className="p-3 bg-[#111726] border border-white/5 rounded-lg space-y-1">
                <span className="text-[10px] font-mono font-bold text-cyan-400">Prioridade {rec.priority}</span>
                <h5 className="text-xs font-bold text-white">{rec.title}</h5>
                <p className="text-[11px] text-slate-300 font-semibold">{rec.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
