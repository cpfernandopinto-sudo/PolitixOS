'use client';

import React from 'react';
import { Link2, Sparkles, ArrowRight } from 'lucide-react';

export interface CrossDomainPanelProps {
  title: string;
  domains: string[];
  description: string;
  finding?: string;
  impact?: string;
}

export default function CrossDomainPanel({
  title,
  domains,
  description,
  finding,
  impact,
}: CrossDomainPanelProps) {
  return (
    <div className="bg-[#12192A] border border-cyan-500/20 rounded-xl p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Link2 size={16} />
          </div>
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
            <span>{title}</span>
            <Sparkles size={13} />
          </h4>
        </div>

        {/* Domain Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {domains.map((dom, idx) => (
            <React.Fragment key={dom}>
              <span className="text-[10px] font-mono font-bold text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                {dom}
              </span>
              {idx < domains.length - 1 && <ArrowRight size={10} className="text-gray-600" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-[#0B0F19] p-3.5 rounded-xl border border-white/5">
        {description}
      </p>

      {(finding || impact) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
          {finding && (
            <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-lg">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Achado Cruzado</span>
              <span className="text-slate-200 font-medium">{finding}</span>
            </div>
          )}
          {impact && (
            <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-lg">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Impacto Político</span>
              <span className="text-cyan-300 font-medium">{impact}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
