'use client';

import type { PriorityRacePoll } from '@/lib/pesquisas/results-repository';
import type { ElectoralPoll } from '@/lib/pesquisas/types';
import { isRealCandidate } from '@/lib/pesquisas/types';
import { explainComparabilityReason } from '@/lib/pesquisas/comparability';
import { selectPrimaryCenario } from '@/lib/pesquisas/scenarioSelection';
import { FileText, ArrowRight, Building2, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Props {
  polls: PriorityRacePoll[];
  latestPoll: ElectoralPoll | null;
  onNavigateToLista: () => void;
  referenceCandidate?: string | null;
}

/**
 * Bloco 9 do briefing Sprint 2B — antigo "Pesquisas Explicam o Cenário",
 * renomeado (a semântica de comparabilidade já havia sido corrigida na
 * Sprint 2A: badge nunca mais autorreferencia a pesquisa-âncora como
 * "comparável" a si mesma).
 */
export function HistoricoDasPesquisas({ polls, latestPoll, onNavigateToLista, referenceCandidate }: Props) {
  const topPolls = polls.slice(0, 3);

  if (topPolls.length === 0) return null;

  return (
    <section className="surface-primary p-4.5 space-y-3 h-full flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-white/5 flex-wrap gap-2">
          <div>
            <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 truncate">
              <FileText size={14} className="text-blue-500 shrink-0" /> Histórico das Pesquisas ({topPolls.length})
            </h3>
          </div>

          <button
            onClick={onNavigateToLista}
            className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:underline font-extrabold"
          >
            VER TODAS <ArrowRight size={11} />
          </button>
        </div>

        <div className="space-y-2 pt-1">
          {topPolls.map((poll) => {
            const t1 = poll.results.filter((r) => r.turno === 1);
            // Sprint 2A / P0.6: escolha determinística, não mais t1[0]?.cenario.
            const primaryCenario = selectPrimaryCenario(t1, referenceCandidate);
            const cenarioResults = t1
              .filter((r) => r.cenario === primaryCenario && isRealCandidate(r.candidateName))
              .sort((a, b) => b.percentage - a.percentage);

            const leader = cenarioResults[0] ?? null;
            const runnerUp = cenarioResults[1] ?? null;

            // P0.3/Decisão 5 da rodada: a pesquisa de referência (o próprio "latestPoll") nunca
            // pode ser rotulada como "comparável" a si mesma — isso é o que causava o badge
            // COMPARÁVEL na pesquisa mais recente ao mesmo tempo que o topo do Cockpit mostrava
            // "Comparáveis: 0". A auto-comparação vira um terceiro estado, "REFERÊNCIA ATUAL".
            const isReferencePoll = latestPoll !== null && poll.id === latestPoll.id;

            const latestPollResults = latestPoll ? polls.find((p) => p.id === latestPoll.id)?.results ?? [] : [];

            const compExplanation = isReferencePoll
              ? { isComparable: true, reason: 'Esta é a pesquisa/cenário de referência (leitura mais recente) — não é comparada consigo mesma.' }
              : explainComparabilityReason(latestPoll, poll, latestPollResults, poll.results);

            return (
              <div
                key={poll.id}
                className="bg-white/5 border border-white/5 hover:border-white/15 rounded-xl p-3 space-y-1.5 transition-colors"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-white font-bold text-xs flex items-center gap-1 truncate">
                    <Building2 size={12} className="text-blue-400 shrink-0" />
                    {poll.instituto ?? 'TSE'}
                  </span>

                  {isReferencePoll ? (
                    <span
                      className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded font-bold shrink-0"
                      title={compExplanation.reason}
                    >
                      REFERÊNCIA ATUAL
                    </span>
                  ) : compExplanation.isComparable ? (
                    <span
                      className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold shrink-0"
                      title={compExplanation.reason}
                    >
                      COMPARÁVEL PARA TENDÊNCIA
                    </span>
                  ) : (
                    <span
                      className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-bold shrink-0"
                      title={compExplanation.reason}
                    >
                      NÃO COMPARÁVEL PARA TENDÊNCIA
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>{poll.dataRegistro ?? 'N/A'}</span>
                  <span>TSE: {poll.tseRegistrationNumber}</span>
                </div>

                {primaryCenario && (
                  <div className="text-[10px] text-slate-500 truncate" title={primaryCenario}>
                    {primaryCenario}
                  </div>
                )}

                {cenarioResults.length > 0 && (
                  <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[11px]">
                    {leader && (
                      <span className="text-gray-200 truncate">
                        1º {leader.candidateName} <strong className="text-blue-400">{leader.percentage}%</strong>
                      </span>
                    )}
                    {runnerUp && (
                      <span className="text-gray-400 truncate text-[10px]">
                        2º {runnerUp.candidateName} {runnerUp.percentage}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
