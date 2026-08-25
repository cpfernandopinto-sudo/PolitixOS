'use client';

import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';
import { deriveTrendStatus } from '@/lib/pesquisas/analyticsEngine';
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';

interface Props {
  metrics: ExecutiveCockpitMetrics;
}

const trendVisual = {
  CRESCIMENTO: { cls: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: TrendingUp },
  QUEDA: { cls: 'text-rose-400', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', Icon: TrendingDown },
  ESTABILIDADE: { cls: 'text-cyan-400', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', Icon: Minus },
  INCONCLUSIVA: { cls: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', Icon: HelpCircle },
} as const;

/**
 * Bloco 6 do briefing Sprint 2B — nunca mostra ESTÁVEL como fallback (essa
 * era a Situação Analítica antiga, corrigida na Sprint 2A). Sem série,
 * mostra INCONCLUSIVO com o motivo, nunca esconde o bloco inteiro.
 *
 * Sprint 12, P4 — a cor do status é SEMPRE badge/ícone, nunca fundo do card
 * inteiro (o card usa `surface-primary` puro, igual ao resto do PolitixOS;
 * antes disso, INCONCLUSIVA pintava o card inteiro de âmbar/marrom).
 */
export function MovimentoEleitoral({ metrics }: Props) {
  const trend = deriveTrendStatus(metrics);
  const { cls, badge, Icon } = trendVisual[trend.status];
  const hasSeries = metrics.hasSufficientSeries && metrics.variacaoAnterior !== null;

  let periodDays: number | null = null;
  if (hasSeries && metrics.variacaoAnterior?.previousPollDate && metrics.lastUpdateDate) {
    const d1 = new Date(metrics.lastUpdateDate);
    const d2 = new Date(metrics.variacaoAnterior.previousPollDate);
    if (!Number.isNaN(d1.getTime()) && !Number.isNaN(d2.getTime())) {
      periodDays = Math.abs(Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  return (
    <section className="surface-primary p-4 space-y-2 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-xs uppercase tracking-wider">Movimento Eleitoral</h3>
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded border shrink-0 ${badge}`}>
          <Icon size={13} />
        </span>
      </div>

      {hasSeries && metrics.variacaoAnterior ? (
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div>
            <div className={`text-lg font-bold font-mono ${cls}`}>
              {metrics.variacaoAnterior.diff > 0 ? '+' : ''}
              {metrics.variacaoAnterior.diff} <span className="text-[10px] font-normal text-slate-500">p.p.</span>
            </div>
            <div className="text-[9px] text-slate-400 uppercase">Última variação</div>
          </div>
          <div>
            <div className={`text-sm font-bold font-mono ${cls}`}>{trend.status}</div>
            <div className="text-[9px] text-slate-400 uppercase">Movimento</div>
          </div>
          <div>
            <div className="text-sm font-bold font-mono text-white">{periodDays !== null ? `${periodDays} dias` : '—'}</div>
            <div className="text-[9px] text-slate-400 uppercase">Período</div>
          </div>
        </div>
      ) : (
        <div className="space-y-1 pt-1">
          <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded border font-mono ${badge}`}>
            {trend.status}
          </span>
          <p className="text-slate-400 text-[10px] leading-relaxed">{trend.reason}</p>
        </div>
      )}
    </section>
  );
}
