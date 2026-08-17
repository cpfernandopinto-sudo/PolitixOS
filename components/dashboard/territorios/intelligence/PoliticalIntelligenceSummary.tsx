'use client';

import React from 'react';
import { BrainCircuit, Sparkles, Clock, ShieldCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export interface PoliticalIntelligenceSummaryProps {
  headline: string;
  summaryParagraphs: string[];
  coverageRatio?: string; // ex: "5 de 5 motores"
  confidenceLevel?: 'ALTA' | 'MÉDIA' | 'BAIXA';
  analyzedAt?: string;
  phase?: string;
}

export default function PoliticalIntelligenceSummary({
  headline,
  summaryParagraphs,
  coverageRatio = '5 de 5 motores',
  confidenceLevel = 'ALTA',
  analyzedAt,
  phase = 'Consolidada',
}: PoliticalIntelligenceSummaryProps) {
  return (
    <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-6 md:p-8 relative overflow-hidden space-y-6 shadow-2xl">
      {/* Background Graphic Accent */}
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <BrainCircuit size={120} className="text-cyan-400" />
      </div>

      {/* Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <BrainCircuit size={20} />
          </div>
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <span>Síntese de Inteligência Política</span>
            <Sparkles size={14} />
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
            Cobertura: <strong className="text-white">{coverageRatio}</strong>
          </span>
          <span className="text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <ShieldCheck size={12} />
            Confiança: <strong>{confidenceLevel}</strong>
          </span>
          {phase && (
            <span className="text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
              {phase}
            </span>
          )}
        </div>
      </div>

      {/* Headline & Body */}
      <div className="space-y-3 max-w-4xl">
        <h3 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-snug">
          {headline}
        </h3>
        <div className="space-y-3 text-sm md:text-base text-slate-300 leading-relaxed font-medium">
          {summaryParagraphs.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* Footer Timestamp */}
      {analyzedAt && (
        <div className="pt-2 flex items-center justify-end text-xs text-slate-500 font-mono">
          <Clock size={12} className="mr-1.5" />
          <span>Data da Análise: {formatDate(analyzedAt, true)}</span>
        </div>
      )}
    </div>
  );
}
