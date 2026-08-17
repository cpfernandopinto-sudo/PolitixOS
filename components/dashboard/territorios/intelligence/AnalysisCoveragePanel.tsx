'use client';

import React from 'react';
import { Layers, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface DomainCoverage {
  domain: string;
  status: 'DISPONIVEL' | 'PARCIAL' | 'INDISPONIVEL';
  engineName: string;
}

export interface AnalysisCoveragePanelProps {
  domains: DomainCoverage[];
}

export default function AnalysisCoveragePanel({ domains }: AnalysisCoveragePanelProps) {
  const availableCount = domains.filter((d) => d.status === 'DISPONIVEL').length;
  const totalCount = domains.length;

  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-cyan-400" />
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            Cobertura da Análise Intersetorial
          </h4>
        </div>

        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">
          {availableCount} de {totalCount} Domínios
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
        {domains.map((d) => {
          const isOk = d.status === 'DISPONIVEL';
          const isPartial = d.status === 'PARCIAL';

          return (
            <div
              key={d.domain}
              className={`p-3 rounded-lg border flex flex-col justify-between text-xs space-y-1.5 ${
                isOk
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                  : isPartial
                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                  : 'bg-white/[0.02] border-white/5 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[10px]">{d.domain}</span>
                {isOk ? (
                  <CheckCircle2 size={12} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={12} className="text-amber-400" />
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-400 truncate">{d.engineName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
