'use client';

import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  metrics: ExecutiveCockpitMetrics;
}

export function IndicadoresMovimentoCards({ metrics }: Props) {
  const {
    leaderMovement,
    runnerUpMovement,
    gapBehavior,
    volatility,
    instituteConsistency,
    totalPollsInSlice,
    pollsWithResultsCount,
    pesquisasComparaveisCount,
  } = metrics;

  const renderMovementBadge = (mov: 'UP' | 'DOWN' | 'STABLE' | 'UNAVAILABLE', labelUp = 'Crescimento', labelDown = 'Queda', labelStable = 'Estável') => {
    if (mov === 'UP') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-extrabold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
          <TrendingUp size={12} /> {labelUp}
        </span>
      );
    }
    if (mov === 'DOWN') {
      return (
        <span className="inline-flex items-center gap-1 text-rose-400 font-extrabold text-xs bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
          <TrendingDown size={12} /> {labelDown}
        </span>
      );
    }
    if (mov === 'STABLE') {
      return (
        <span className="inline-flex items-center gap-1 text-blue-400 font-extrabold text-xs bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
          <Minus size={12} /> {labelStable}
        </span>
      );
    }
    return <span className="text-gray-500 text-xs italic">Sem histórico</span>;
  };

  const renderGapBadge = (gb: 'EXPANDING' | 'NARROWING' | 'STABLE' | 'UNAVAILABLE') => {
    if (gb === 'EXPANDING') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-extrabold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
          <TrendingUp size={12} /> Ampliando
        </span>
      );
    }
    if (gb === 'NARROWING') {
      return (
        <span className="inline-flex items-center gap-1 text-amber-400 font-extrabold text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
          <TrendingDown size={12} /> Reduzindo
        </span>
      );
    }
    if (gb === 'STABLE') {
      return (
        <span className="inline-flex items-center gap-1 text-blue-400 font-extrabold text-xs bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
          <Minus size={12} /> Estável
        </span>
      );
    }
    return <span className="text-gray-500 text-xs italic">Sem histórico</span>;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 px-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
      {/* Líder */}
      <div className="flex items-center gap-1.5 text-[10px] shrink-0">
        <span className="text-slate-500 font-semibold uppercase tracking-wider">Líder</span>
        {renderMovementBadge(leaderMovement, '↑', '↓', '=')}
      </div>

      <span className="h-3 w-px bg-white/[0.1]" />

      {/* 2º Colocado */}
      <div className="flex items-center gap-1.5 text-[10px] shrink-0">
        <span className="text-slate-500 font-semibold uppercase tracking-wider">2º</span>
        {renderMovementBadge(runnerUpMovement, '↑', '↓', '=')}
      </div>

      <span className="h-3 w-px bg-white/[0.1]" />

      {/* Gap */}
      <div className="flex items-center gap-1.5 text-[10px] shrink-0">
        <span className="text-slate-500 font-semibold uppercase tracking-wider">Gap</span>
        {renderGapBadge(gapBehavior)}
      </div>

      <span className="h-3 w-px bg-white/[0.1]" />

      {/* Volatilidade */}
      <div className="flex items-center gap-1.5 text-[10px] shrink-0">
        <span className="text-slate-500 font-semibold uppercase tracking-wider">Volatilidade</span>
        <span className="font-bold text-[10px] text-slate-300 font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
          {volatility}
        </span>
      </div>

      <span className="h-3 w-px bg-white/[0.1]" />

      {/* Consistência */}
      <div className="flex items-center gap-1.5 text-[10px] shrink-0">
        <span className="text-slate-500 font-semibold uppercase tracking-wider">Institutos</span>
        <span className="font-bold text-[10px] text-slate-300 font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
          {instituteConsistency}
        </span>
      </div>

      <span className="h-3 w-px bg-white/[0.1]" />

      {/* Funil */}
      <div className="flex items-center gap-1 text-[10px] shrink-0 ml-auto text-slate-500 font-mono" title={`${totalPollsInSlice} registradas | ${pollsWithResultsCount} com resultado | ${pesquisasComparaveisCount} comparáveis`}>
        <span>{totalPollsInSlice} reg</span>
        <span className="text-slate-700">·</span>
        <span>{pollsWithResultsCount} res</span>
        <span className="text-slate-700">·</span>
        <span className="text-cyan-500 font-semibold">{pesquisasComparaveisCount} comp</span>
      </div>
    </div>
  );
}
