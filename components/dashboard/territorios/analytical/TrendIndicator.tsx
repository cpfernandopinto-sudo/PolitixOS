'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';

export interface TrendIndicatorProps {
  direction: 'up' | 'down' | 'stable' | 'unknown';
  value?: string | number;
  label?: string;
  period?: string;
}

export default function TrendIndicator({
  direction,
  value,
  label,
  period,
}: TrendIndicatorProps) {
  let Icon = Minus;
  let bgClass = 'bg-slate-500/10';
  let textClass = 'text-slate-400';
  let defaultLabel = 'Estável';

  if (direction === 'up') {
    Icon = TrendingUp;
    bgClass = 'bg-cyan-500/10';
    textClass = 'text-cyan-400';
    defaultLabel = 'Alta';
  } else if (direction === 'down') {
    Icon = TrendingDown;
    bgClass = 'bg-blue-500/10';
    textClass = 'text-blue-400';
    defaultLabel = 'Queda';
  } else if (direction === 'unknown') {
    Icon = HelpCircle;
    bgClass = 'bg-slate-500/10';
    textClass = 'text-slate-500';
    defaultLabel = 'Indeterminado';
  }

  const displayLabel = label ?? value ?? defaultLabel;

  return (
    <div
      className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-white/5 ${bgClass} ${textClass}`}
      title={period ? `Período de tendência: ${period}` : undefined}
    >
      <Icon size={12} />
      <span>{displayLabel}</span>
      {value && label && <span className="opacity-80">({value})</span>}
    </div>
  );
}
