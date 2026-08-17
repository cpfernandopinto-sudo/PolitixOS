'use client';

import React from 'react';
import { Award, ShieldAlert } from 'lucide-react';

export interface RankingPositionPanelProps {
  title: string;
  position: number;
  totalItems: number;
  cohortName: string;
  indicatorValue?: string | number;
  unit?: string;
  contextNote?: string;
}

export default function RankingPositionPanel({
  title,
  position,
  totalItems,
  cohortName,
  indicatorValue,
  unit,
  contextNote,
}: RankingPositionPanelProps) {
  const isTopTier = position <= Math.max(1, Math.round(totalItems * 0.2));

  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">
          {title}
        </span>
        <span className="text-[10px] text-slate-500 font-mono uppercase">
          {cohortName}
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <div className="flex items-center gap-1.5">
          <Award size={20} className={isTopTier ? 'text-amber-400' : 'text-cyan-400'} />
          <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
            {position}º
          </span>
          <span className="text-xs text-slate-400 font-mono">/ {totalItems}</span>
        </div>

        {indicatorValue !== undefined && (
          <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            Val: {indicatorValue} {unit}
          </span>
        )}
      </div>

      {contextNote && (
        <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-white/5">
          {contextNote}
        </p>
      )}
    </div>
  );
}
