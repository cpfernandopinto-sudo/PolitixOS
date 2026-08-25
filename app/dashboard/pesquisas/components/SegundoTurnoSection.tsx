'use client';

import type { ElectoralPollResultWithPoll } from '@/lib/pesquisas/types';
import { isRealCandidate } from '@/lib/pesquisas/types';
import { Layers } from 'lucide-react';

interface Props {
  results: ElectoralPollResultWithPoll[];
}

export function SegundoTurnoSection({ results }: Props) {
  const t2Results = results.filter((r) => r.turno === 2);

  // Group by cenario
  const byCenario = new Map<string, ElectoralPollResultWithPoll[]>();
  for (const r of t2Results) {
    const list = byCenario.get(r.cenario) ?? [];
    list.push(r);
    byCenario.set(r.cenario, list);
  }

  const hasData = byCenario.size > 0;

  return (
    <section className="surface-primary p-4.5 space-y-3 h-full flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 truncate">
            <Layers size={14} className="text-blue-500 shrink-0" /> Cenários de 2º Turno
          </h3>
          {hasData && (
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold shrink-0">
              {byCenario.size} Simulações
            </span>
          )}
        </div>

        {!hasData ? (
          <div className="py-6 text-center space-y-1">
            <p className="text-gray-400 text-xs font-medium">Nenhum cenário de 2º turno disponível no recorte atual.</p>
            <p className="text-gray-500 text-[10px]">Simulações pareadas não registradas nesta pesquisa.</p>
          </div>
        ) : (
          <div className="space-y-2 pt-1 max-h-56 overflow-y-auto pr-1">
            {Array.from(byCenario.entries()).map(([cenario, cenarioResults]) => {
              const sorted = [...cenarioResults].sort((a, b) => b.percentage - a.percentage);
              const topRealCandidatePct = sorted.find((r) => isRealCandidate(r.candidateName))?.percentage ?? 0;

              return (
                <div key={cenario} className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1.5">
                  <p className="text-white text-[11px] font-bold truncate" title={cenario}>
                    {cenario}
                  </p>
                  <div className="space-y-1">
                    {sorted.map((r) => {
                      const isReal = isRealCandidate(r.candidateName);
                      const isLeader = isReal && r.percentage === topRealCandidatePct && topRealCandidatePct > 0;
                      return (
                        <div key={r.candidateName} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <span className={isReal ? 'text-gray-200 font-medium truncate text-[11px]' : 'text-gray-500 text-[10px] truncate'}>
                              {r.candidateName}
                            </span>
                            {isLeader && (
                              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold shrink-0">
                                VENCE
                              </span>
                            )}
                          </div>
                          <span className={isReal ? 'text-blue-400 font-extrabold font-mono text-xs shrink-0' : 'text-gray-500 font-mono text-[11px] shrink-0'}>
                            {r.percentage}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
