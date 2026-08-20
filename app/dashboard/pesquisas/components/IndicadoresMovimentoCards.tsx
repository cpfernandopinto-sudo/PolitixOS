'use client';

import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';
import { TrendingUp, TrendingDown, Minus, Activity, Layers, ShieldCheck } from 'lucide-react';

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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Tendência do Líder */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-3.5 space-y-1.5 shadow-lg">
        <div className="flex items-center justify-between text-gray-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Tendência do Líder</span>
          <TrendingUp size={13} className="text-blue-400" />
        </div>
        <div>{renderMovementBadge(leaderMovement)}</div>
      </div>

      {/* 2. Movimento do 2º Colocado */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-3.5 space-y-1.5 shadow-lg">
        <div className="flex items-center justify-between text-gray-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Movimento 2º Colocado</span>
          <TrendingDown size={13} className="text-purple-400" />
        </div>
        <div>{renderMovementBadge(runnerUpMovement)}</div>
      </div>

      {/* 3. Gap Líder × 2º */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-3.5 space-y-1.5 shadow-lg">
        <div className="flex items-center justify-between text-gray-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Comportamento do Gap</span>
          <Activity size={13} className="text-blue-400" />
        </div>
        <div>{renderGapBadge(gapBehavior)}</div>
      </div>

      {/* 4. Volatilidade */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-3.5 space-y-1.5 shadow-lg">
        <div className="flex items-center justify-between text-gray-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Volatilidade</span>
          <Activity size={13} className="text-amber-400" />
        </div>
        <div>
          <span className="inline-block font-extrabold text-xs text-gray-200 font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded">
            {volatility}
          </span>
        </div>
      </div>

      {/* 5. Consistência entre Institutos */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-3.5 space-y-1.5 shadow-lg">
        <div className="flex items-center justify-between text-gray-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Consistência Institutos</span>
          <ShieldCheck size={13} className="text-emerald-400" />
        </div>
        <div>
          <span className="inline-block font-extrabold text-xs text-gray-200 font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded">
            {instituteConsistency}
          </span>
        </div>
      </div>

      {/* 6. Cobertura de Dados (Funil) */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-3.5 space-y-1.5 shadow-lg">
        <div className="flex items-center justify-between text-gray-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Funil de Dados</span>
          <Layers size={13} className="text-blue-400" />
        </div>
        <p className="text-[11px] font-mono text-gray-300 font-semibold truncate" title={`${totalPollsInSlice} registradas | ${pollsWithResultsCount} c/ resultado | ${pesquisasComparaveisCount} comparáveis`}>
          {totalPollsInSlice} reg · {pollsWithResultsCount} res · {pesquisasComparaveisCount} comp
        </p>
      </div>
    </div>
  );
}
