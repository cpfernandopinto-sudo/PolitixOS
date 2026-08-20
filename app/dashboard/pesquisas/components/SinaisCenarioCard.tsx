'use client';

import type { ScenarioSignal } from '@/lib/pesquisas/analyticsEngine';
import { AlertCircle, TrendingUp, TrendingDown, Minus, ShieldAlert } from 'lucide-react';

interface Props {
  signals: ScenarioSignal[];
}

export function SinaisCenarioCard({ signals }: Props) {
  const visibleSignals = signals.slice(0, 3);
  const hasData = visibleSignals.length > 0;

  return (
    <section className="bg-[#12192A] border border-white/5 rounded-2xl p-4.5 space-y-3 shadow-xl h-full flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 truncate">
            <ShieldAlert size={14} className="text-blue-500 shrink-0" /> Sinais do Cenário
          </h3>
          {hasData && (
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold shrink-0">
              {signals.length} Sinais
            </span>
          )}
        </div>

        {!hasData ? (
          <div className="py-6 text-center space-y-1">
            <p className="text-gray-400 text-xs font-medium">Sem sinais identificados no momento.</p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {visibleSignals.map((sig) => {
              const isSuccess = sig.severity === 'success';
              const isWarning = sig.severity === 'warning';
              const isAlert = sig.severity === 'alert';

              const icon = isSuccess ? (
                <TrendingUp size={13} className="text-emerald-400 shrink-0" />
              ) : isWarning ? (
                <TrendingDown size={13} className="text-rose-400 shrink-0" />
              ) : isAlert ? (
                <ShieldAlert size={13} className="text-amber-400 shrink-0" />
              ) : (
                <Minus size={13} className="text-blue-400 shrink-0" />
              );

              const borderColor = isSuccess
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : isWarning
                ? 'border-rose-500/20 bg-rose-500/5'
                : isAlert
                ? 'border-amber-500/20 bg-amber-500/5'
                : 'border-white/5 bg-white/5';

              return (
                <div key={sig.id} className={`p-2.5 rounded-xl border ${borderColor} space-y-0.5`}>
                  <div className="flex items-center gap-1.5">
                    {icon}
                    <span className="text-[11px] font-bold text-white truncate">{sig.title}</span>
                  </div>
                  <p className="text-[10px] text-gray-300 leading-snug truncate" title={sig.description}>
                    {sig.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
