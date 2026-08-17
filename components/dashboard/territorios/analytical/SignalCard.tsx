'use client';

import React from 'react';
import { AlertCircle, Target, ShieldAlert, TrendingUp, RefreshCw } from 'lucide-react';

export type SignalCategory = 'atencao' | 'oportunidade' | 'risco' | 'mudanca' | 'tendencia';

export interface SignalCardProps {
  category: SignalCategory;
  title: string;
  description: string;
  evidence?: string;
  source?: string;
  confidence?: 'ALTA' | 'MÉDIA' | 'BAIXA';
}

function getSignalMeta(category: SignalCategory) {
  switch (category) {
    case 'atencao':
      return { label: 'Ponto de Atenção', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', Icon: AlertCircle };
    case 'oportunidade':
      return { label: 'Oportunidade Estratégica', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', Icon: Target };
    case 'risco':
      return { label: 'Risco Territorial', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', Icon: ShieldAlert };
    case 'mudanca':
      return { label: 'Mudança Recente', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', Icon: RefreshCw };
    case 'tendencia':
    default:
      return { label: 'Tendência', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', Icon: TrendingUp };
  }
}

export default function SignalCard({
  category,
  title,
  description,
  evidence,
  source,
  confidence,
}: SignalCardProps) {
  const meta = getSignalMeta(category);
  const IconComp = meta.Icon;

  return (
    <div className="bg-[#111726] border border-white/5 hover:border-cyan-500/30 rounded-xl p-4 transition-all flex flex-col justify-between h-full space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${meta.bg} ${meta.text} ${meta.border}`}>
            <IconComp size={11} />
            {meta.label}
          </span>

          {confidence && (
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Confiança: {confidence}
            </span>
          )}
        </div>

        <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
        <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
      </div>

      {(evidence || source) && (
        <div className="pt-2 border-t border-white/5 space-y-1 text-[10px] text-slate-400 font-mono">
          {evidence && <div><strong>Evidência:</strong> {evidence}</div>}
          {source && <div><strong>Fonte:</strong> {source}</div>}
        </div>
      )}
    </div>
  );
}
