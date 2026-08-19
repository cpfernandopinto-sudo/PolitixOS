'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Users, Briefcase, ShieldAlert, Vote, Info } from 'lucide-react';

export interface MiniSparklinePoint {
  value: number;
}

export interface ExecutiveKpiItem {
  id: string;
  label: string;
  value: string;
  unit?: string;
  period?: string;
  deltaText?: string;
  deltaDirection?: 'up' | 'down' | 'neutral';
  sparklineData?: MiniSparklinePoint[];
  domain: 'Demografia' | 'Economia' | 'Segurança' | 'Eleitoral';
  status: 'real' | 'demo' | 'unavailable';
}

interface Props {
  kpis: ExecutiveKpiItem[];
}

const DOMAIN_ICONS = {
  Demografia: Users,
  Economia: Briefcase,
  Segurança: ShieldAlert,
  Eleitoral: Vote,
};

function MiniSparkline({ points, color = '#10b981' }: { points: MiniSparklinePoint[]; color?: string }) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;

  const width = 80;
  const height = 24;
  const step = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p.value - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
    </svg>
  );
}

export default function CommandCenterKpiStrip({ kpis }: Props) {
  if (kpis.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
          <span>Indicadores Executivos em Tempo Real</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">Consolidação Multi-Motor</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpis.map((item) => {
          const Icon = DOMAIN_ICONS[item.domain] ?? Info;
          const isUnavailable = item.status === 'unavailable';
          const isDemo = item.status === 'demo';

          return (
            <div
              key={item.id}
              className={`bg-[#111726] border rounded-xl p-4 space-y-3 shadow-md transition-all hover:border-white/20 ${
                isDemo
                  ? 'border-amber-500/30'
                  : isUnavailable
                  ? 'border-white/5 opacity-60'
                  : 'border-cyan-500/20'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 font-medium truncate uppercase tracking-wider text-[11px]">
                  {item.label}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isDemo && (
                    <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                      DEMO
                    </span>
                  )}
                  <div className="p-1 rounded bg-white/5 text-cyan-400">
                    <Icon size={14} />
                  </div>
                </div>
              </div>

              {/* Main Metric Value */}
              {isUnavailable ? (
                <div className="text-xs text-slate-500 font-mono py-1">Indisponível neste território</div>
              ) : (
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-xl md:text-2xl font-extrabold text-white font-mono tracking-tight leading-none">
                      {item.value}
                    </div>
                    {item.unit && <span className="text-[10px] text-slate-400 font-mono block mt-1">{item.unit}</span>}
                  </div>

                  {item.sparklineData && item.sparklineData.length >= 2 && (
                    <MiniSparkline
                      points={item.sparklineData}
                      color={
                        item.deltaDirection === 'down' && item.domain === 'Segurança'
                          ? '#10b981'
                          : item.deltaDirection === 'down'
                          ? '#f43f5e'
                          : '#10b981'
                      }
                    />
                  )}
                </div>
              )}

              {/* Footer Delta & Period */}
              {!isUnavailable && (item.deltaText || item.period) && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  {item.deltaText ? (
                    <span
                      className={`flex items-center gap-0.5 font-semibold ${
                        item.deltaDirection === 'up'
                          ? item.domain === 'Segurança'
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                          : item.deltaDirection === 'down'
                          ? item.domain === 'Segurança'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.deltaDirection === 'up' && <TrendingUp size={11} />}
                      {item.deltaDirection === 'down' && <TrendingDown size={11} />}
                      {item.deltaDirection === 'neutral' && <Minus size={11} />}
                      <span>{item.deltaText}</span>
                    </span>
                  ) : (
                    <span />
                  )}

                  {item.period && <span className="text-slate-500">{item.period}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
