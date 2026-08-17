'use client';

import React from 'react';
import { DATA_STATUS_MAP, type DossierDataStatus } from '@/lib/territorios/dossier-helpers';
import TrendIndicator from './TrendIndicator';
import MethodologyTooltip from './MethodologyTooltip';

export interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  period?: string;
  source?: string;
  methodology?: string;
  variation?: string;
  trend?: 'up' | 'down' | 'stable' | 'unknown';
  context?: string;
  status?: DossierDataStatus;
  icon?: React.ElementType;
}

export default function MetricCard({
  label,
  value,
  unit,
  period,
  source,
  methodology,
  variation,
  trend,
  context,
  status = 'CONCLUIDO',
  icon: Icon,
}: MetricCardProps) {
  const statusMeta = DATA_STATUS_MAP[status] ?? DATA_STATUS_MAP.CONCLUIDO;
  const isAvailable = (status === 'CONCLUIDO' || status === 'PARCIAL') && value !== null && value !== undefined;

  return (
    <div className="bg-[#111726] border border-white/5 hover:border-cyan-500/30 rounded-xl p-4 md:p-5 transition-all flex flex-col justify-between h-full group">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">
              {label}
            </span>
            {methodology && <MethodologyTooltip title={label} methodology={methodology} unit={unit} period={period} source={source} />}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {status !== 'CONCLUIDO' && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusMeta.badgeBg} ${statusMeta.badgeText} ${statusMeta.badgeBorder}`}>
                {statusMeta.label}
              </span>
            )}
            {Icon && <Icon size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />}
          </div>
        </div>

        {/* Value Display */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2">
          {isAvailable ? (
            <>
              <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {value}
              </span>
              {unit && <span className="text-xs font-semibold text-slate-400 font-mono">{unit}</span>}
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-500 italic">
              {statusMeta.label}
            </span>
          )}

          {trend && isAvailable && (
            <TrendIndicator direction={trend} value={variation} label={period} />
          )}
        </div>

        {context && isAvailable && (
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
            {context}
          </p>
        )}
      </div>

      {/* Footer Metadata */}
      {(source || period) && (
        <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>{source ? `Fonte: ${source}` : ''}</span>
          <span>{period ? `Ref: ${period}` : ''}</span>
        </div>
      )}
    </div>
  );
}
