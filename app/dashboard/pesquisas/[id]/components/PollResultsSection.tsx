'use client';

import type { ElectoralPollResult } from '@/lib/pesquisas/types';
import { isRealCandidate } from '@/lib/pesquisas/types';
import { BarChart3, AlertCircle, Layers } from 'lucide-react';
import BarChart from '@/components/charts/BarChart';

interface Props {
  results: ElectoralPollResult[];
}

export function PollResultsSection({ results }: Props) {
  if (results.length === 0) {
    return (
      <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Resultados de Intenção de Voto</h3>
          </div>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
            Aguardando Integração
          </span>
        </div>

        <div className="py-8 px-4 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
          <AlertCircle size={24} className="text-gray-500 mx-auto" />
          <p className="text-sm font-semibold text-gray-300">
            Resultados divulgados ainda não integrados para esta pesquisa.
          </p>
          <p className="text-xs text-gray-500 max-w-lg mx-auto leading-relaxed">
            O dataset oficial do TSE/PesqEle contém exclusivamente metadados de registro e metodologia. Os resultados de intenção de voto publicados serão integrados à medida que forem homologados.
          </p>
        </div>
      </div>
    );
  }

  // Separate 1º Turno vs 2º Turno
  const t1Results = results.filter((r) => r.turno === 1);
  const t2Results = results.filter((r) => r.turno === 2);

  // Group 1º turno by scenario
  const t1ByCenario = new Map<string, ElectoralPollResult[]>();
  for (const r of t1Results) {
    const list = t1ByCenario.get(r.cenario) ?? [];
    list.push(r);
    t1ByCenario.set(r.cenario, list);
  }

  // Primary scenario for 1st round
  const primaryCenarioKey = Array.from(t1ByCenario.keys())[0] ?? null;
  const primaryT1Results = primaryCenarioKey ? t1ByCenario.get(primaryCenarioKey) ?? [] : t1Results;

  const realCandidates = primaryT1Results.filter((r) => isRealCandidate(r.candidateName)).sort((a, b) => b.percentage - a.percentage);
  const nonCandidates = primaryT1Results.filter((r) => !isRealCandidate(r.candidateName)).sort((a, b) => b.percentage - a.percentage);

  // Group 2º turno by scenario
  const t2ByCenario = new Map<string, ElectoralPollResult[]>();
  for (const r of t2Results) {
    const list = t2ByCenario.get(r.cenario) ?? [];
    list.push(r);
    t2ByCenario.set(r.cenario, list);
  }

  const chartCategories = realCandidates.map((r) => r.candidateName).reverse();
  const chartValues = realCandidates.map((r) => r.percentage).reverse();

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-400" />
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">
            Resultados Oficiais de Intenção de Voto ({results.length} leituras)
          </h3>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded font-bold">
          Verificado / Homologado
        </span>
      </div>

      {/* 1º TURNO */}
      {realCandidates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider text-blue-400">
              1º Turno — Intenção de Voto ({primaryCenarioKey ?? 'Estimulada'})
            </h4>
            <span className="text-[10px] text-gray-400 font-mono">
              {results[0]?.tipoPergunta ? `Pergunta ${results[0].tipoPergunta}` : 'Estimulada'}
            </span>
          </div>

          <BarChart
            categories={chartCategories}
            values={chartValues}
            horizontal
            isPercent
            height={Math.max(160, realCandidates.length * 36)}
            gridLeft={150}
            labelWidth={135}
          />

          {/* Área complementar para Brancos, Nulos e Indecisos */}
          {nonCandidates.length > 0 && (
            <div className="pt-3 border-t border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Respostas Não-Candidatos
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
        </div>
      )}

      {/* 2º TURNO */}
      {t2ByCenario.size > 0 && (
        <div className="pt-4 border-t border-white/5 space-y-4">
          <h4 className="text-white font-bold text-xs uppercase tracking-wider text-blue-400 flex items-center gap-2">
            <Layers size={14} /> 2º Turno — Cenários de Confronto Directo
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from(t2ByCenario.entries()).map(([cenario, cenarioResults]) => {
              const sorted = [...cenarioResults].sort((a, b) => b.percentage - a.percentage);
              const topRealPct = sorted.find((r) => isRealCandidate(r.candidateName))?.percentage ?? 0;

              return (
                <div key={cenario} className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-2.5">
                  <p className="text-white text-xs font-bold truncate" title={cenario}>
                    {cenario}
                  </p>
                  <div className="space-y-2">
                    {sorted.map((r) => {
                      const isReal = isRealCandidate(r.candidateName);
                      const isLeader = isReal && r.percentage === topRealPct && topRealPct > 0;
                      return (
                        <div key={r.candidateName} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span className={isReal ? 'text-gray-200 font-medium truncate' : 'text-gray-500 text-[11px] truncate'}>
                              {r.candidateName}
                            </span>
                            {isLeader && (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold shrink-0">
                                VENCE
                              </span>
                            )}
                          </div>
                          <span className={isReal ? 'text-blue-400 font-extrabold font-mono text-sm shrink-0' : 'text-gray-500 font-mono text-xs shrink-0'}>
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
        </div>
      )}
    </div>
  );
}
