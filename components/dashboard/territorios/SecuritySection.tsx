import React from 'react';
import { SecurityNotebook } from '@/lib/territorios/types';
import { ShieldAlert, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function SecuritySection({ data }: { data: SecurityNotebook }) {
  const isDemo = data.mode === 'demo';

  return (
    <div className="surface-primary rounded-xl p-5 md:p-6 border border-white/5 relative h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          Segurança Pública
          {isDemo && <span className="text-[10px] font-medium text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded border border-white/5 uppercase">Demo</span>}
        </h3>
        <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 uppercase">
          {data.generalIndicator.value}
        </span>
      </div>

      <div className="flex-1 space-y-5">
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Principais Naturezas (Crimes Violentos)</h4>
          <div className="space-y-2.5">
            {data.topNatureRanking.map((item: { nature: string; count: number; variation: string }, idx: number) => {
              const isUp = item.variation.startsWith('+');
              const isDown = item.variation.startsWith('-');
              
              return (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-300 truncate">{item.nature}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 pl-4">
                    <span className="text-sm font-bold text-white">{item.count}</span>
                    <span className={`flex items-center gap-0.5 text-[11px] font-bold w-12 justify-end ${isUp ? 'text-rose-400' : isDown ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {isUp ? <ArrowUpRight size={12} /> : isDown ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                      {item.variation}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <ShieldAlert size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/70 leading-relaxed">
              <span className="font-bold text-amber-400">Leitura Estratégica:</span> {data.strategicReading}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
