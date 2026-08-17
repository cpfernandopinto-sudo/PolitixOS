'use client';

import React from 'react';
import { Target, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { SignalPriority } from './PoliticalSignalStack';

export interface StrategicRecommendation {
  id: string;
  title: string;
  action: string;
  rationale: string;
  priority: SignalPriority;
  domains: string[];
  evidenceSummary?: string;
  caveat?: string;
}

export interface StrategicRecommendationCardProps {
  recommendation: StrategicRecommendation;
  onOpenEvidence?: () => void;
}

export default function StrategicRecommendationCard({
  recommendation,
  onOpenEvidence,
}: StrategicRecommendationCardProps) {
  const isHigh = recommendation.priority === 'CRÍTICO' || recommendation.priority === 'ALTO';

  return (
    <div className="bg-[#111726] border border-cyan-500/20 hover:border-cyan-500/40 rounded-xl p-5 space-y-4 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Target size={16} />
          </span>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">
            Recomendação Estratégica
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className={`px-2 py-0.5 rounded border uppercase font-bold ${
            isHigh ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
          }`}>
            Prioridade {recommendation.priority}
          </span>
          <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
            {recommendation.domains.join(' + ')}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-base font-bold text-white tracking-tight">{recommendation.title}</h4>
        <div className="p-3 bg-[#0B0F19] rounded-lg border border-white/5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-cyan-400 font-mono block">Ação Sugerida</span>
          <p className="text-xs text-slate-200 font-semibold leading-relaxed">{recommendation.action}</p>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        <strong>Justificativa:</strong> {recommendation.rationale}
      </p>

      {recommendation.caveat && (
        <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
          <span><strong>Ressalva Metodológica:</strong> {recommendation.caveat}</span>
        </div>
      )}

      {onOpenEvidence && (
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onOpenEvidence}
            className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 focus:outline-none"
          >
            <span>Ver Rastreabilidade de Evidências</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
