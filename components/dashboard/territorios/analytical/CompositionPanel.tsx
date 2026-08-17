'use client';

import React from 'react';
import { PieChart } from 'lucide-react';
import { formatPercentage } from '@/lib/utils/formatters';

export interface CompositionItem {
  category: string;
  value: number;
  percentage?: number;
  color?: string;
}

export interface CompositionPanelProps {
  title: string;
  subtitle?: string;
  items: CompositionItem[];
  unit?: string;
  showBar?: boolean;
}

const DEFAULT_COLORS = ['#22d3ee', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#64748b'];

export default function CompositionPanel({
  title,
  subtitle,
  items,
  unit,
  showBar = true,
}: CompositionPanelProps) {
  const totalValue = items.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <PieChart size={15} className="text-cyan-400" />
            <span>{title}</span>
          </h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {showBar && totalValue > 0 && (
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex shadow-inner">
          {items.map((item, idx) => {
            const pct = item.percentage ?? (item.value / totalValue) * 100;
            const color = item.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            return (
              <div
                key={item.category}
                style={{ width: `${pct}%`, backgroundColor: color }}
                title={`${item.category}: ${pct.toFixed(1)}%`}
                className="h-full transition-all duration-300"
              />
            );
          })}
        </div>
      )}

      <div className="space-y-2.5 pt-1">
        {items.map((item, idx) => {
          const pct = item.percentage ?? (totalValue > 0 ? (item.value / totalValue) * 100 : 0);
          const color = item.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

          return (
            <div key={item.category} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-300 font-medium truncate">{item.category}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0 font-mono">
                <span className="text-white font-bold">{item.value.toLocaleString('pt-BR')} {unit}</span>
                <span className="text-slate-400 font-semibold w-12 text-right">{formatPercentage(pct)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
