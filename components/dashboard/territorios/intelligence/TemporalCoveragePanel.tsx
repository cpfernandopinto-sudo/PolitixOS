'use client';

import React from 'react';
import { Clock, Info } from 'lucide-react';

export interface TemporalDomainInfo {
  domain: string;
  referenceYear: string;
  source: string;
  lagNote?: string;
}

export type TemporalDomainCoverage = TemporalDomainInfo;

export interface TemporalCoveragePanelProps {
  temporalDomains: TemporalDomainInfo[];
}

export default function TemporalCoveragePanel({ temporalDomains }: TemporalCoveragePanelProps) {
  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-cyan-400" />
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            Base Temporal da Análise Multi-Fonte
          </h4>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          Transparência de Períodos
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
        {temporalDomains.map((t) => (
          <div
            key={t.domain}
            className="p-3 bg-[#0B0F19] border border-white/5 rounded-lg space-y-1 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {t.domain}
              </span>
              <span className="text-xs font-bold font-mono text-cyan-400">{t.referenceYear}</span>
            </div>

            <span className="text-[10px] text-slate-500 block truncate">{t.source}</span>

            {t.lagNote && (
              <span className="text-[9px] text-amber-400/90 block leading-tight pt-1 flex items-center gap-1 font-mono">
                <Info size={9} /> {t.lagNote}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
