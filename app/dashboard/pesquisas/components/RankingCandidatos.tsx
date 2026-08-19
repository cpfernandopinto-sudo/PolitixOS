'use client';

import type { CandidateRankingItem } from '@/lib/pesquisas/types';
import { Award, Info } from 'lucide-react';

interface Props {
  ranking: CandidateRankingItem[];
  pollInstituto?: string | null;
  pollDate?: string | null;
}

export function RankingCandidatos({ ranking, pollInstituto, pollDate }: Props) {
  const maxPct = Math.max(...ranking.map((r) => r.percentage), 100);

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-blue-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">
              Ranking de Intenção de Voto
            </h3>
          </div>
          {pollDate && (
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
              {pollDate}
            </span>
          )}
        </div>

        {ranking.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <p className="text-xs text-gray-400 font-medium">
              Nenhum resultado de intenção de voto integrado para esta pesquisa.
            </p>
            <p className="text-[10px] text-gray-500">
              O dataset oficial TSE contém os metadados de registro.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ranking.map((item, idx) => {
              const widthPct = Math.min(Math.max((item.percentage / maxPct) * 100, 5), 100);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors space-y-1.5 group relative"
                  title={`${item.candidateName}: ${item.percentage}% ${item.isLeader ? '(Líder na pesquisa)' : ''}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-gray-500 font-mono font-bold text-xs shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-white font-semibold truncate" title={item.candidateName}>
                        {item.candidateName}
                      </span>
                      {item.isLeader && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold shrink-0">
                          LÍDER
                        </span>
                      )}
                    </div>
                    <span className="font-extrabold text-blue-400 font-mono text-sm shrink-0">
                      {item.percentage}%
                    </span>
                  </div>

                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.isLeader ? 'bg-blue-500' : 'bg-slate-600'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pollInstituto && (
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
          <span>Instituto: <strong className="text-gray-300">{pollInstituto}</strong></span>
          <span className="inline-flex items-center gap-1">
            <Info size={11} className="text-blue-400" /> Dado Oficial Registrado
          </span>
        </div>
      )}
    </div>
  );
}
