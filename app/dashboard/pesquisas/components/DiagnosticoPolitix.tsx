'use client';

import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';
import type { ObservedHistoryResult } from '@/lib/pesquisas/observedHistory';
import { generateDiagnosticoPolitix } from '@/lib/pesquisas/analyticsEngine';
import { Sparkles, CheckCircle2, Lightbulb } from 'lucide-react';

interface Props {
  metrics: ExecutiveCockpitMetrics;
  observedHistory: ObservedHistoryResult;
  raceLabel: string;
}

const trendCls = {
  CRESCIMENTO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  QUEDA: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  ESTABILIDADE: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  INCONCLUSIVA: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
} as const;

/**
 * Bloco 4 do briefing Sprint 2B — substitui o antigo "Leitura Executiva
 * Eleitoral" (PolitixAiCard/generatePolitixInsight, retirados desta tela).
 * FATO e INTERPRETAÇÃO vêm de `generateDiagnosticoPolitix` — puramente
 * determinístico, nenhum número é gerado por IA aqui.
 */
export function DiagnosticoPolitix({ metrics, observedHistory, raceLabel }: Props) {
  const diag = generateDiagnosticoPolitix(metrics, observedHistory);

  return (
    <section className="surface-primary p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-cyan-400" />
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">Diagnóstico Politix</h3>
          <span className="text-slate-500 text-xs">· {raceLabel}</span>
        </div>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border font-mono ${trendCls[diag.trend.status]}`}>
          TENDÊNCIA: {diag.trend.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
            <CheckCircle2 size={12} /> Fato
          </div>
          <ul className="space-y-1">
            {diag.fatos.map((f, i) => (
              <li key={i} className="text-slate-300 text-xs leading-normal">{f}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
            <Lightbulb size={12} /> Interpretação
          </div>
          <ul className="space-y-1">
            {diag.interpretacao.map((f, i) => (
              <li key={i} className="text-slate-300 text-xs leading-normal">{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
