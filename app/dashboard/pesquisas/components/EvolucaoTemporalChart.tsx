'use client';

import type { ElectoralPollResultWithPoll } from '@/lib/pesquisas/types';
import { TrendingUp, AlertCircle, Info } from 'lucide-react';

interface Props {
  results: ElectoralPollResultWithPoll[];
  hasSufficientSeries: boolean;
}

const CANDIDATE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

export function EvolucaoTemporalChart({ results, hasSufficientSeries }: Props) {
  if (!hasSufficientSeries || results.length === 0) {
    return (
      <div className="bg-[#12192A] border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">
              Evolução Temporal das Intenções de Voto
            </h3>
          </div>
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-medium">
            Série Incompleta
          </span>
        </div>

        <div className="py-12 px-4 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
          <AlertCircle size={28} className="text-amber-400/80 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-gray-200">
              Aguardando série histórica comparável (mínimo de 2 pesquisas)
            </h4>
            <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
              O gráfico de evolução temporal é renderizado exclusivamente quando existem 2 ou mais pesquisas registradas e comparáveis no mesmo cargo, território, turno e tipo de pergunta.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <Info size={12} className="text-blue-400" />
            Regra Metodológica: Impedir linhas artificiais entre pesquisas incomparáveis.
          </div>
        </div>
      </div>
    );
  }

  // Aggregate data points by poll/date
  const pollsMap = new Map<string, { date: string; institute: string; results: Map<string, number> }>();
  const candidateNamesSet = new Set<string>();

  for (const r of results) {
    const pollId = r.pollId;
    const date = r.poll?.dataRegistro ?? r.sourceDate ?? 'Não informada';
    const institute = r.poll?.instituto ?? 'Instituto';

    candidateNamesSet.add(r.candidateName);

    const entry = pollsMap.get(pollId) ?? { date, institute, results: new Map() };
    entry.results.set(r.candidateName, r.percentage);
    pollsMap.set(pollId, entry);
  }

  const seriesPoints = Array.from(pollsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const candidateList = Array.from(candidateNamesSet);

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-400" />
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">
            Evolução Temporal das Intenções de Voto
          </h3>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">
          {seriesPoints.length} Leituras Comparáveis
        </span>
      </div>

      {/* Legenda de Candidatos */}
      <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
        {candidateList.map((cand, idx) => {
          const color = CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length];
          return (
            <div key={cand} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-gray-200 font-medium">{cand}</span>
            </div>
          );
        })}
      </div>

      {/* Visualização de Série em Grid / Tabela Temporal */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px] space-y-4 pt-2">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider pb-2 border-b border-white/5">
            <span className="col-span-3">Data / Instituto</span>
            <span className="col-span-9">Intenção de Voto por Candidato</span>
          </div>

          {seriesPoints.map((pt, pIdx) => (
            <div key={pIdx} className="grid grid-cols-12 gap-2 items-center text-xs py-2 border-b border-white/5 last:border-0">
              <div className="col-span-3">
                <span className="font-semibold text-white block">{pt.date}</span>
                <span className="text-[10px] text-gray-400 block truncate">{pt.institute}</span>
              </div>
              <div className="col-span-9 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {candidateList.map((cand, cIdx) => {
                  const pct = pt.results.get(cand);
                  const color = CANDIDATE_COLORS[cIdx % CANDIDATE_COLORS.length];
                  return (
                    <div key={cand} className="p-2 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-gray-300 truncate" title={cand}>
                        {cand}
                      </span>
                      <span className="font-bold font-mono text-xs ml-2" style={{ color }}>
                        {pct !== undefined ? `${pct}%` : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
