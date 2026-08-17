'use client';

import React from 'react';
import { Zap, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';

export interface TerritorySituationSummaryProps {
  headline: string;
  summaryText: string;
  keyFinding?: string;
  statusText?: string;
}

export default function TerritorySituationSummary({
  headline,
  summaryText,
  keyFinding,
  statusText = 'Análise Concluída',
}: TerritorySituationSummaryProps) {
  return (
    <div className="bg-[#111726] border border-cyan-500/30 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Zap size={16} />
          </div>
          <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <span>Leitura Territorial em 30 Segundos</span>
            <Sparkles size={13} />
          </h2>
        </div>

        <span className="text-[10px] font-mono font-bold text-slate-300 bg-white/5 px-2.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
          <ShieldCheck size={11} className="text-emerald-400" />
          {statusText}
        </span>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg md:text-xl font-extrabold text-white tracking-tight leading-snug">
          {headline}
        </h3>
        <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
          {summaryText}
        </p>
      </div>

      {keyFinding && (
        <div className="p-3 bg-[#0B0F19] border border-white/5 rounded-xl text-xs text-slate-300 flex items-start gap-2">
          <AlertCircle size={14} className="text-cyan-400 shrink-0 mt-0.5" />
          <span><strong>Achado Central:</strong> {keyFinding}</span>
        </div>
      )}
    </div>
  );
}
