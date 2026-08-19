'use client';

import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';
import { Award, ArrowUpRight, TrendingUp, Maximize2, Minimize2, Layers, Clock } from 'lucide-react';

interface Props {
  metrics: ExecutiveCockpitMetrics;
}

export function ExecutiveKpiCards({ metrics }: Props) {
  const {
    intencaoMaisRecente,
    gapConcorrente,
    variacaoAnterior,
    maximoPeriodo,
    minimoPeriodo,
    pesquisasComparaveisCount,
    lastUpdateDate,
    hasSufficientSeries,
  } = metrics;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {/* 1. Intenção Mais Recente */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Intenção Mais Recente</span>
          <Award size={14} className="text-blue-400" />
        </div>
        <div>
          {intencaoMaisRecente ? (
            <div>
              <p className="text-xl font-extrabold text-white">{intencaoMaisRecente.percentage}%</p>
              <p className="text-xs font-semibold text-blue-400 truncate mt-0.5" title={intencaoMaisRecente.candidateName}>
                {intencaoMaisRecente.candidateName}
              </p>
              <p className="text-[9px] text-gray-500 truncate mt-0.5">{intencaoMaisRecente.instituto}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 italic">Sem dados integrados</p>
              <p className="text-[9px] text-gray-600 mt-0.5">aguardando leituras</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Diferença para Concorrente */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Gap 2º Colocado</span>
          <ArrowUpRight size={14} className="text-blue-400" />
        </div>
        <div>
          {gapConcorrente ? (
            <div>
              <p className="text-xl font-extrabold text-emerald-400">+{gapConcorrente.gap} p.p.</p>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">
                vs. {gapConcorrente.runnerUp}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 italic">Sem histórico suficiente</p>
              <p className="text-[9px] text-gray-600 mt-0.5">mínimo 2 candidatos</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Variação vs. Anterior */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Variação Anterior</span>
          <TrendingUp size={14} className="text-blue-400" />
        </div>
        <div>
          {hasSufficientSeries && variacaoAnterior ? (
            <div>
              <p
                className={`text-xl font-extrabold ${
                  variacaoAnterior.diff > 0
                    ? 'text-emerald-400'
                    : variacaoAnterior.diff < 0
                    ? 'text-rose-400'
                    : 'text-gray-300'
                }`}
              >
                {variacaoAnterior.diff > 0 ? `+${variacaoAnterior.diff}` : variacaoAnterior.diff} p.p.
              </p>
              <p className="text-[9px] text-gray-500 mt-0.5">comparada à pesquisa anterior</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 italic">Sem histórico suficiente</p>
              <p className="text-[9px] text-gray-600 mt-0.5">requer 2+ pesquisas</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Máximo no Período */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Máximo no Período</span>
          <Maximize2 size={14} className="text-blue-400" />
        </div>
        <div>
          {hasSufficientSeries && maximoPeriodo ? (
            <div>
              <p className="text-xl font-extrabold text-white">{maximoPeriodo.percentage}%</p>
              <p className="text-[9px] text-gray-500 mt-0.5">{maximoPeriodo.pollDate ?? 'No período'}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 italic">Sem histórico suficiente</p>
              <p className="text-[9px] text-gray-600 mt-0.5">requer série temporal</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Mínimo no Período */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Mínimo no Período</span>
          <Minimize2 size={14} className="text-blue-400" />
        </div>
        <div>
          {hasSufficientSeries && minimoPeriodo ? (
            <div>
              <p className="text-xl font-extrabold text-white">{minimoPeriodo.percentage}%</p>
              <p className="text-[9px] text-gray-500 mt-0.5">{minimoPeriodo.pollDate ?? 'No período'}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 italic">Sem histórico suficiente</p>
              <p className="text-[9px] text-gray-600 mt-0.5">requer série temporal</p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Pesquisas Comparáveis */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Pesquisas Comparáveis</span>
          <Layers size={14} className="text-blue-400" />
        </div>
        <div>
          <p className="text-xl font-extrabold text-white">{pesquisasComparaveisCount}</p>
          <p className="text-[9px] text-gray-500 mt-0.5">no mesmo cenário</p>
        </div>
      </div>

      {/* 7. Última Atualização */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Última Atualização</span>
          <Clock size={14} className="text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white truncate">
            {lastUpdateDate ?? 'Não informada'}
          </p>
          <p className="text-[9px] text-gray-500 mt-0.5">registro oficial TSE</p>
        </div>
      </div>
    </div>
  );
}
