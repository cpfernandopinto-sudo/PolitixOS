'use client';

import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';
import type { TemporalSeriesEntry } from '@/lib/pesquisas/results-repository';
import { EvolucaoGapChart } from './EvolucaoGapChart';
import { Activity } from 'lucide-react';

interface Props {
  metrics: ExecutiveCockpitMetrics;
  temporalSeries: TemporalSeriesEntry[];
}

/**
 * Bloco 7 do briefing Sprint 2B — "GAP ELEITORAL". GAP ATUAL (snapshot da
 * pesquisa de referência, sempre disponível quando há líder+2º) fica
 * separado visualmente da EVOLUÇÃO DO GAP (`EvolucaoGapChart`, matemática
 * intocada desde a rodada anterior — só reaproveitada aqui, não reescrita).
 */
export function GapEleitoral({ metrics, temporalSeries }: Props) {
  return (
    <div className="h-full flex flex-col gap-3">
      <section className="surface-primary p-3.5 space-y-1.5 shrink-0">
        <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Activity size={13} className="text-cyan-400" /> Gap Atual
        </h3>
        {metrics.gapConcorrente ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs">
              <div className="text-white font-semibold truncate">{metrics.gapConcorrente.leader}</div>
              <div className="text-slate-500 font-mono text-[10px]">
                {metrics.intencaoMaisRecente?.percentage ?? metrics.analyzedCandidateResult?.percentage}%
              </div>
            </div>
            <div className="text-2xl font-bold text-cyan-400 font-mono shrink-0">
              +{metrics.gapConcorrente.gap} <span className="text-xs font-normal text-slate-500">p.p.</span>
            </div>
            <div className="text-xs text-right">
              <div className="text-white font-semibold truncate">{metrics.gapConcorrente.runnerUp}</div>
              <div className="text-slate-500 font-mono text-[10px]">{metrics.runnerUpResult?.percentage}%</div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-xs italic py-1">Não disponível — menos de 2 candidatos reais na pesquisa de referência.</p>
        )}
      </section>

      <EvolucaoGapChart temporalSeries={temporalSeries} />
    </div>
  );
}
