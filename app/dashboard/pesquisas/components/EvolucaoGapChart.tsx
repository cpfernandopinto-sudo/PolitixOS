'use client';

import React from 'react';
import type { TemporalSeriesEntry } from '@/lib/pesquisas/results-repository';
import { ArrowUpRight } from 'lucide-react';

interface Props {
  temporalSeries: TemporalSeriesEntry[];
}

export function EvolucaoGapChart({ temporalSeries }: Props) {
  const sortedSeries = [...temporalSeries].sort(
    (a, b) => (b.points.at(-1)?.percentage ?? 0) - (a.points.at(-1)?.percentage ?? 0)
  );

  const leaderSeries = sortedSeries[0];
  const runnerUpSeries = sortedSeries[1];

  const gapPoints: { date: string | null; leaderPct: number; runnerPct: number; gap: number }[] = [];

  if (leaderSeries && runnerUpSeries) {
    for (let i = 0; i < leaderSeries.points.length; i++) {
      const pLeader = leaderSeries.points[i];
      const pRunner = runnerUpSeries.points[i];

      if (pLeader && pRunner) {
        const gap = Math.round((pLeader.percentage - pRunner.percentage) * 10) / 10;
        gapPoints.push({
          date: pLeader.date,
          leaderPct: pLeader.percentage,
          runnerPct: pRunner.percentage,
          gap,
        });
      }
    }
  }

  const hasData = gapPoints.length >= 2;
  const firstGap = hasData ? gapPoints[0].gap : 0;
  const lastGap = hasData ? gapPoints.at(-1)!.gap : 0;
  const gapDelta = Math.round((lastGap - firstGap) * 10) / 10;

  return (
    <section className="bg-[#12192A] border border-white/5 rounded-2xl p-4.5 space-y-3 shadow-xl h-full flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 truncate">
            <ArrowUpRight size={14} className="text-blue-500 shrink-0" /> Evolução do GAP (Líder × 2º)
          </h3>

          {hasData && (
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded border font-mono shrink-0 ${
                gapDelta > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : gapDelta < 0
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}
            >
              {gapDelta > 0 ? `+${gapDelta} p.p.` : gapDelta < 0 ? `${gapDelta} p.p.` : 'Estável'}
            </span>
          )}
        </div>

        {!hasData ? (
          <div className="py-6 text-center space-y-1">
            <p className="text-gray-400 text-xs font-medium">Evolução indisponível — não há 2 levantamentos metodologicamente comparáveis</p>
            <p className="text-gray-500 text-[10px]">O GAP atual (líder × 2º colocado) já é exibido acima nos indicadores principais — esta evolução mede como o GAP mudou entre leituras comparáveis, não substitui o GAP atual.</p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {gapPoints.map((pt, idx) => (
              <div
                key={idx}
                className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
              >
                <div className="truncate pr-2">
                  <span className="text-gray-400 font-mono text-[10px] block">
                    #{idx + 1} ({pt.date ?? 'N/A'})
                  </span>
                  <span className="text-gray-300 text-[11px] truncate block">
                    {pt.leaderPct}% vs {pt.runnerPct}%
                  </span>
                </div>
                <span className="text-sm font-extrabold text-blue-400 font-mono shrink-0">
                  +{pt.gap} p.p.
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {leaderSeries && runnerUpSeries && (
        <p className="text-[10px] text-gray-500 pt-2 border-t border-white/5 truncate">
          {leaderSeries.candidateName} vs {runnerUpSeries.candidateName}
        </p>
      )}
    </section>
  );
}
