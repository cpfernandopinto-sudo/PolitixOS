'use client';

import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';
import type { AnalyticalStatusResult } from '@/lib/pesquisas/analyticsEngine';
import KpiCard from '@/components/ui/KpiCard';
import { ShieldAlert, Crown, Target, Activity, Calendar } from 'lucide-react';

interface Props {
  metrics: ExecutiveCockpitMetrics;
  statusResult: AnalyticalStatusResult;
}

export function ExecutiveSnapshotCards({ metrics, statusResult }: Props) {
  const {
    intencaoMaisRecente,
    runnerUpResult,
    analyzedCandidateResult,
    gapConcorrente,
    variacaoAnterior,
    totalPollsInSlice,
    pesquisasComparaveisCount,
    lastUpdateDate,
    hasSufficientSeries,
  } = metrics;

  const lider = intencaoMaisRecente
    ? `${intencaoMaisRecente.candidateName} (${intencaoMaisRecente.percentage}%)`
    : 'Não disponível';

  const isAnalyzedNonLeader = analyzedCandidateResult !== null;

  const segundoOuAnalisadoTitle = isAnalyzedNonLeader
    ? `Candidato Analisado (#${analyzedCandidateResult.rank})`
    : '2º Colocado';

  const segundoOuAnalisadoVal = isAnalyzedNonLeader
    ? `${analyzedCandidateResult.candidateName} (${analyzedCandidateResult.percentage}%)`
    : runnerUpResult
    ? `${runnerUpResult.candidateName} (${runnerUpResult.percentage}%)`
    : 'Não disponível';

  const gapTitle = isAnalyzedNonLeader ? 'Distância p/ Líder' : 'Gap Líder × 2º';

  const gapStr = isAnalyzedNonLeader
    ? `-${analyzedCandidateResult.gapToLeader} p.p.`
    : gapConcorrente
    ? `+${gapConcorrente.gap} p.p.`
    : 'Não disponível';

  let tendenciaStr = 'Sem histórico comparável';
  if (hasSufficientSeries && variacaoAnterior) {
    tendenciaStr = variacaoAnterior.diff > 0
      ? `+${variacaoAnterior.diff} p.p.`
      : `${variacaoAnterior.diff} p.p.`;
  }

  const statusBadgeColor =
    statusResult.status === 'ESTÁVEL'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : statusResult.status === 'ATENÇÃO'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      : statusResult.status === 'CRÍTICO'
      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      : 'bg-gray-500/10 text-gray-400 border-gray-500/20';

  return (
    <div className="space-y-3">
      {/* LINHA 1: INDICADORES POLÍTICOS PRIMÁRIOS (Maior peso visual) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Líder Atual */}
        <div className="bg-[#12192A] border border-blue-500/30 rounded-xl p-4 space-y-1 shadow-xl">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Líder Atual</span>
            <Crown size={15} className="text-blue-400" />
          </div>
          <div className="text-lg font-extrabold text-white truncate" title={lider}>
            {lider}
          </div>
        </div>

        {/* 2. 2º Colocado / Candidato Analisado */}
        <div className="bg-[#12192A] border border-white/10 rounded-xl p-4 space-y-1 shadow-xl">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">{segundoOuAnalisadoTitle}</span>
            <Target size={15} className="text-purple-400" />
          </div>
          <div className="text-lg font-extrabold text-white truncate" title={segundoOuAnalisadoVal}>
            {segundoOuAnalisadoVal}
          </div>
        </div>

        {/* 3. Gap Líder x 2º / Distância p/ Líder */}
        <div className="bg-[#12192A] border border-white/10 rounded-xl p-4 space-y-1 shadow-xl">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">{gapTitle}</span>
            <Activity size={15} className="text-blue-400" />
          </div>
          <div className="text-lg font-extrabold font-mono text-blue-400">
            {gapStr}
          </div>
        </div>

        {/* 4. Situação Analítica */}
        <div className="bg-[#12192A] border border-white/10 rounded-xl p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Situação Analítica</span>
            <ShieldAlert size={15} className="text-amber-400" />
          </div>
          <div>
            <span
              className={`inline-block text-xs font-extrabold px-2.5 py-0.5 rounded border font-mono ${statusBadgeColor}`}
              title={statusResult.reason}
            >
              {statusResult.status}
            </span>
            <p className="text-[10px] text-gray-400 truncate mt-1" title={statusResult.reason}>
              {statusResult.reason}
            </p>
          </div>
        </div>
      </div>

      {/* LINHA 2: INDICADORES DE SUPORTE E CONFIABILIDADE (Peso secundário) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Variação Período" value={tendenciaStr} compact />
        <KpiCard title="No Período" value={totalPollsInSlice} compact />
        <KpiCard title="Comparáveis" value={pesquisasComparaveisCount} compact />
        <KpiCard
          title="Última Pesquisa"
          value={intencaoMaisRecente?.instituto ?? 'Não disponível'}
          compact
        />
      </div>
    </div>
  );
}
