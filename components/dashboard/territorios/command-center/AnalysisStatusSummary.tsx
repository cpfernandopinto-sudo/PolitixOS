'use client';

import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { DomainCoverage } from '../intelligence/AnalysisCoveragePanel';

export interface AnalysisStatusSummaryProps {
  domains: DomainCoverage[];
}

export default function AnalysisStatusSummary({ domains }: AnalysisStatusSummaryProps) {
  const availableCount = domains.filter((d) => d.status === 'DISPONIVEL').length;

  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <Layers size={16} className="text-cyan-400 shrink-0" />
        <span className="font-bold text-slate-300 uppercase tracking-widest font-mono text-[11px]">
          Sustentação por Domínios dos Motores:
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
        {domains.map((d) => {
          const isOk = d.status === 'DISPONIVEL';
          return (
            <span
              key={d.domain}
              className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
                isOk
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              }`}
            >
              {isOk ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
              <span>{d.domain}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
