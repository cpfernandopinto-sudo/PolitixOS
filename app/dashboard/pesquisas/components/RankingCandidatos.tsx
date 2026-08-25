'use client';

import type { CandidateRankingItem } from '@/lib/pesquisas/types';
import BarChart from '@/components/charts/BarChart';
import { Crown, Check } from 'lucide-react';

interface Props {
  realCandidates: CandidateRankingItem[];
  nonCandidates: CandidateRankingItem[];
  cenarioLabel?: string | null;
  pollInstituto?: string | null;
  pollDate?: string | null;
  referenceCandidate?: string | null;
}

export function RankingCandidatos({
  realCandidates,
  nonCandidates,
  cenarioLabel,
  pollInstituto,
  pollDate,
  referenceCandidate,
}: Props) {
  if (realCandidates.length === 0) {
    return (
      <section className="surface-primary p-5 space-y-3">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <Crown size={15} className="text-blue-500" /> Ranking Atual — Pesquisa mais recente
        </h3>
        <p className="text-gray-500 text-xs py-6 text-center italic">
          Nenhum candidato com resultado verificado nesta corrida para os filtros selecionados.
        </p>
      </section>
    );
  }

  // Reverse lists for ECharts horizontal bar chart (so #1 rank appears at the top)
  const categories = realCandidates.map((r) => r.candidateName).reverse();
  const values = realCandidates.map((r) => r.percentage).reverse();

  return (
    <section className="surface-primary p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <Crown size={15} className="text-cyan-400" /> Ranking Atual — Pesquisa mais recente
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {pollInstituto ? `${pollInstituto}` : 'TSE/PesqEle'}
            {pollDate ? ` (${pollDate})` : ''}
            {cenarioLabel ? ` · ${cenarioLabel}` : ''}
          </p>
        </div>
        <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-sm font-bold tracking-wider uppercase">
          {realCandidates.length} Candidatos
        </span>
      </div>

      {/* Gráfico Horizontal Aprovado */}
      <BarChart
        categories={categories}
        values={values}
        horizontal
        isPercent
        height={Math.max(180, realCandidates.length * 36)}
        gridLeft={150}
        labelWidth={135}
      />

      {/* Tabela de Posições e Percentuais de Todos os Candidatos Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 pt-2">
        {realCandidates.map((c, idx) => {
          const isRef = referenceCandidate && c.candidateName.toLowerCase() === referenceCandidate.toLowerCase();
          const diffToLeader = idx === 0 ? 0 : Math.round((c.percentage - realCandidates[0].percentage) * 10) / 10;

          return (
            <div
              key={c.candidateName}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                isRef
                  ? 'bg-blue-500/15 border-blue-500/40 shadow-lg shadow-blue-500/10'
                  : 'bg-white/5 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span className="font-mono font-bold text-gray-300">#{idx + 1}</span>
                {isRef && (
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 font-extrabold px-1.5 py-0.5 rounded">
                    ANALISADO
                  </span>
                )}
              </div>
              <div className="mt-1">
                <span className="text-xs font-bold text-white block truncate" title={c.candidateName}>
                  {c.candidateName}
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-base font-extrabold font-mono text-blue-400">{c.percentage}%</span>
                  {idx > 0 && (
                    <span className="text-[10px] text-gray-500 font-mono">{diffToLeader} p.p.</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Área Secundária para Categorias Não-Candidato (Brancos, Nulos, Indecisos) */}
      {nonCandidates.length > 0 && (
        <div className="pt-3 border-t border-white/5 space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Respostas Não-Candidatos (Área Complementar)
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            {nonCandidates.map((nc) => (
              <div
                key={nc.candidateName}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 flex items-center gap-2"
              >
                <span>{nc.candidateName}:</span>
                <span className="font-semibold text-gray-300 font-mono">{nc.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloco 8 do briefing Sprint 2B — nunca deixar o ranking ser confundido com uma média. */}
      <p className="text-[10px] text-slate-500 pt-2 border-t border-white/5">
        Resultados da pesquisa de referência. Não representa média de pesquisas.
      </p>
    </section>
  );
}
