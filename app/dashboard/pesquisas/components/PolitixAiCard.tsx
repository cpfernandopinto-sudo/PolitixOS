'use client';

import type { PolitixAiInsight } from '@/lib/pesquisas/analyticsEngine';
import { Sparkles, CheckCircle2, TrendingUp, ShieldAlert, Compass, Clock } from 'lucide-react';

interface Props {
  insight: PolitixAiInsight;
  raceLabel: string;
}

export function PolitixAiCard({ insight, raceLabel }: Props) {
  return (
    <section className="surface-primary p-5 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Executivo */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              Leitura Executiva Eleitoral <span className="text-cyan-400 font-mono text-xs">· Politix IA</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">{raceLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-sm font-mono">
            <Clock size={11} className="text-cyan-400" />
            {insight.supportingPollsCount} pesquisas comparáveis
          </span>
        </div>
      </div>

      {/* Síntese Principal */}
      <div className="text-slate-100 text-xs md:text-sm leading-relaxed font-medium bg-black/30 p-4 rounded-lg border border-cyan-500/20">
        "{insight.narrative}"
      </div>

      {/* 4 Dimensões da Leitura Executiva (Grid 2x2 no Desktop, 1 Coluna no Mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* 1. CENÁRIO ATUAL */}
        <div className="bg-white/[0.02] border border-white/[0.08] hover:border-cyan-500/20 rounded-lg p-3.5 space-y-1.5 transition-colors">
          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 size={13} className="shrink-0" /> Cenário Atual
          </div>
          <p className="text-slate-300 text-xs leading-normal">{insight.cenarioAtual}</p>
        </div>

        {/* 2. PRINCIPAL MOVIMENTO */}
        <div className="bg-white/[0.02] border border-white/[0.08] hover:border-emerald-500/20 rounded-lg p-3.5 space-y-1.5 transition-colors">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <TrendingUp size={13} className="shrink-0" /> Principal Movimento
          </div>
          <p className="text-slate-300 text-xs leading-normal">{insight.principalMovimento}</p>
        </div>

        {/* 3. RISCO / OPORTUNIDADE */}
        <div className="bg-white/[0.02] border border-white/[0.08] hover:border-amber-500/20 rounded-lg p-3.5 space-y-1.5 transition-colors">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert size={13} className="shrink-0" /> Risco / Oportunidade
          </div>
          <p className="text-slate-300 text-xs leading-normal">{insight.riscoOportunidade}</p>
        </div>

        {/* 4. ORIENTAÇÃO ESTRATÉGICA */}
        <div className="bg-white/[0.02] border border-white/[0.08] hover:border-purple-500/20 rounded-lg p-3.5 space-y-1.5 transition-colors">
          <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold uppercase tracking-wider">
            <Compass size={13} className="shrink-0" /> Orientação Estratégica
          </div>
          <p className="text-slate-300 text-xs leading-normal">{insight.orientacaoEstrategica}</p>
        </div>
      </div>
    </section>
  );
}
