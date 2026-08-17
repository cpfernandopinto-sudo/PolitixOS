'use client';

import React from 'react';
import { BrainCircuit, Sparkles, AlertCircle, Database, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export interface EvidenceItem {
  dataset: string;
  source: string;
  period: string;
}

export interface AIInsightPanelProps {
  title: string;
  paragraphs: string[];
  evidences?: EvidenceItem[];
  sources?: string[];
  analyzedAt?: string;
  phase?: string;
  typeBadge?: string;
  confidenceLevel?: 'ALTA' | 'MÉDIA' | 'BAIXA';
}

export default function AIInsightPanel({
  title,
  paragraphs,
  evidences,
  sources,
  analyzedAt,
  phase,
  typeBadge,
  confidenceLevel,
}: AIInsightPanelProps) {
  return (
    <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-5 md:p-6 space-y-4 relative overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <BrainCircuit size={80} className="text-cyan-400" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <BrainCircuit size={18} />
          </div>
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
            <span>Síntese de Inteligência IA</span>
            <Sparkles size={14} />
          </h3>
          {typeBadge && (
            <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded border border-white/10">
              {typeBadge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          {confidenceLevel && (
            <span className="text-slate-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">
              Confiança: <strong className="text-cyan-300">{confidenceLevel}</strong>
            </span>
          )}
          {phase && (
            <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              {phase}
            </span>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="space-y-3">
        <h4 className="text-lg font-bold text-white tracking-tight">{title}</h4>
        <div className="space-y-2.5 text-xs md:text-sm text-slate-300 leading-relaxed">
          {paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      </div>

      {/* Evidences & Sources */}
      {((evidences && evidences.length > 0) || (sources && sources.length > 0)) && (
        <div className="pt-4 border-t border-white/5 space-y-2 text-xs">
          <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <AlertCircle size={12} className="text-cyan-400" />
            <span>Evidências e Fontes Relacionadas</span>
          </h5>

          {evidences && (
            <ul className="space-y-1.5 font-mono text-[11px] text-slate-400">
              {evidences.map((ev, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="text-cyan-500">•</span>
                  <span>{ev.dataset} ({ev.source}, {ev.period})</span>
                </li>
              ))}
            </ul>
          )}

          {sources && (
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono pt-1">
              <Database size={10} />
              <span>Bases: {sources.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {analyzedAt && (
        <div className="pt-2 flex items-center justify-end text-[10px] text-slate-500 font-mono">
          <Clock size={10} className="mr-1" />
          <span>Análise gerada em: {formatDate(analyzedAt, true)}</span>
        </div>
      )}
    </div>
  );
}
