'use client';

import { useState, useMemo } from 'react';
import type { ElectoralPollResultWithPoll, ElectoralPoll } from '@/lib/pesquisas/types';
import { isRealCandidate } from '@/lib/pesquisas/types';
import { Columns3, AlertTriangle, ArrowRightLeft, Building2, Calendar, FileCheck } from 'lucide-react';

interface Props {
  results: ElectoralPollResultWithPoll[];
  referenceCandidate?: string | null;
}

interface PollGroup {
  pollId: string;
  poll: ElectoralPoll;
  cenario: string;
  results: ElectoralPollResultWithPoll[];
}

export function PesquisasComparativoView({ results, referenceCandidate }: Props) {
  // Group results by pollId + cenario
  const pollGroupsMap = new Map<string, PollGroup>();

  for (const r of results) {
    if (!r.poll) continue;
    const key = `${r.pollId}::${r.cenario}`;
    const existing = pollGroupsMap.get(key) ?? {
      pollId: r.pollId,
      poll: r.poll,
      cenario: r.cenario,
      results: [],
    };
    existing.results.push(r);
    pollGroupsMap.set(key, existing);
  }

  const pollGroups = Array.from(pollGroupsMap.values()).sort(
    (a, b) => (b.poll.dataRegistro ?? '').localeCompare(a.poll.dataRegistro ?? '')
  );

  const availablePollCount = pollGroups.length;

  const [selectedGroupAId, setSelectedGroupAId] = useState<string>(pollGroups[0] ? `${pollGroups[0].pollId}::${pollGroups[0].cenario}` : '');
  const [selectedGroupBId, setSelectedGroupBId] = useState<string>(pollGroups[1] ? `${pollGroups[1].pollId}::${pollGroups[1].cenario}` : (pollGroups[0] ? `${pollGroups[0].pollId}::${pollGroups[0].cenario}` : ''));

  const groupA = useMemo(() => {
    return pollGroups.find((g) => `${g.pollId}::${g.cenario}` === selectedGroupAId) ?? pollGroups[0] ?? null;
  }, [pollGroups, selectedGroupAId]);

  const groupB = useMemo(() => {
    return pollGroups.find((g) => `${g.pollId}::${g.cenario}` === selectedGroupBId) ?? pollGroups[1] ?? pollGroups[0] ?? null;
  }, [pollGroups, selectedGroupBId]);

  // Handle empty or 1-poll states (Seção 12)
  if (availablePollCount === 0) {
    return (
      <div className="surface-primary p-8 text-center space-y-3">
        <AlertTriangle size={32} className="text-amber-400 mx-auto" />
        <h3 className="text-white font-bold text-base">Nenhuma pesquisa com resultados integrada neste recorte.</h3>
        <p className="text-gray-400 text-xs max-w-md mx-auto">
          Ajuste os filtros de UF, Cargo, Instituto ou Período para localizar levantamentos com resultados verificados no TSE.
        </p>
      </div>
    );
  }

  if (availablePollCount === 1) {
    return (
      <div className="surface-primary p-8 text-center space-y-3">
        <FileCheck size={32} className="text-blue-400 mx-auto" />
        <h3 className="text-white font-bold text-base">Existe apenas 1 pesquisa com resultados integrada neste recorte.</h3>
        <p className="text-gray-400 text-xs max-w-md mx-auto">
          São necessárias pelo menos 2 pesquisas com resultados verificados para realizar a comparação técnica entre levantamentos/institutos.
        </p>
      </div>
    );
  }

  // Extract all candidates present in either Group A or Group B
  const candidateSet = new Set<string>();
  if (groupA) {
    groupA.results.filter((r) => isRealCandidate(r.candidateName)).forEach((r) => candidateSet.add(r.candidateName));
  }
  if (groupB) {
    groupB.results.filter((r) => isRealCandidate(r.candidateName)).forEach((r) => candidateSet.add(r.candidateName));
  }

  const allCandidatesInRace = Array.from(candidateSet);

  return (
    <div className="space-y-6">
      {/* Seleção Lado a Lado de Levantamentos */}
      <div className="surface-primary p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-wrap gap-2">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <Columns3 size={15} className="text-blue-500" /> Ferramenta Comparativa entre Institutos ({availablePollCount} disponíveis)
          </h3>
          <span className="text-[10px] text-gray-400">
            Selecione 2 pesquisas registradas para comparar intenção de voto e metodologia.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Seletor Pesquisa A */}
          <div className="space-y-1.5 bg-white/5 p-3.5 rounded-xl border border-white/5">
            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
              Pesquisa / Instituto A
            </label>
            <select
              value={selectedGroupAId}
              onChange={(e) => setSelectedGroupAId(e.target.value)}
              className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
            >
              {pollGroups.map((g) => (
                <option key={`${g.pollId}::${g.cenario}`} value={`${g.pollId}::${g.cenario}`}>
                  {g.poll.instituto ?? 'TSE'} — {g.poll.dataRegistro ?? 'N/A'} (TSE: {g.poll.tseRegistrationNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Seletor Pesquisa B */}
          <div className="space-y-1.5 bg-white/5 p-3.5 rounded-xl border border-white/5">
            <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
              Pesquisa / Instituto B
            </label>
            <select
              value={selectedGroupBId}
              onChange={(e) => setSelectedGroupBId(e.target.value)}
              className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
            >
              {pollGroups.map((g) => (
                <option key={`${g.pollId}::${g.cenario}`} value={`${g.pollId}::${g.cenario}`}>
                  {g.poll.instituto ?? 'TSE'} — {g.poll.dataRegistro ?? 'N/A'} (TSE: {g.poll.tseRegistrationNumber})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ficha Metodológica Comparada */}
      {groupA && groupB && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Ficha A */}
          <div className="bg-[var(--surface-2)] border border-blue-500/30 rounded-md p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-extrabold text-blue-400 flex items-center gap-1.5">
                <Building2 size={14} /> {groupA.poll.instituto ?? 'Instituto A'}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">TSE: {groupA.poll.tseRegistrationNumber}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
              <div><span className="text-gray-500 block text-[10px]">Data de Registro</span> {groupA.poll.dataRegistro ?? 'N/A'}</div>
              <div><span className="text-gray-500 block text-[10px]">Amostra</span> {groupA.poll.amostra ?? 'N/A'} entrevistas</div>
              <div><span className="text-gray-500 block text-[10px]">Margem de Erro</span> ±{groupA.poll.margemErro ?? 'N/A'} p.p.</div>
              <div><span className="text-gray-500 block text-[10px]">Nível Confiança</span> {groupA.poll.nivelConfianca ?? 'N/A'}%</div>
            </div>
          </div>

          {/* Card Ficha B */}
          <div className="bg-[var(--surface-2)] border border-purple-500/30 rounded-md p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-extrabold text-purple-400 flex items-center gap-1.5">
                <Building2 size={14} /> {groupB.poll.instituto ?? 'Instituto B'}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">TSE: {groupB.poll.tseRegistrationNumber}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
              <div><span className="text-gray-500 block text-[10px]">Data de Registro</span> {groupB.poll.dataRegistro ?? 'N/A'}</div>
              <div><span className="text-gray-500 block text-[10px]">Amostra</span> {groupB.poll.amostra ?? 'N/A'} entrevistas</div>
              <div><span className="text-gray-500 block text-[10px]">Margem de Erro</span> ±{groupB.poll.margemErro ?? 'N/A'} p.p.</div>
              <div><span className="text-gray-500 block text-[10px]">Nível Confiança</span> {groupB.poll.nivelConfianca ?? 'N/A'}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela Comparativa de Todos os Candidatos da Corrida */}
      {groupA && groupB && (
        <div className="surface-primary p-5 space-y-4">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <ArrowRightLeft size={15} className="text-blue-500" /> Intenção de Voto Comparada (Todos os Candidatos)
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-gray-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-4 rounded-l-xl">Candidato</th>
                  <th className="py-2.5 px-4 text-right text-blue-400">{groupA.poll.instituto ?? 'Pesquisa A'} (%)</th>
                  <th className="py-2.5 px-4 text-right text-purple-400">{groupB.poll.instituto ?? 'Pesquisa B'} (%)</th>
                  <th className="py-2.5 px-4 text-right rounded-r-xl">Variação (Delta p.p.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {allCandidatesInRace.map((candName) => {
                  const resA = groupA.results.find((r) => r.candidateName.toLowerCase() === candName.toLowerCase());
                  const resB = groupB.results.find((r) => r.candidateName.toLowerCase() === candName.toLowerCase());

                  const pctA = resA ? resA.percentage : null;
                  const pctB = resB ? resB.percentage : null;

                  const delta = pctA !== null && pctB !== null ? Math.round((pctA - pctB) * 10) / 10 : null;
                  const isRef = referenceCandidate && candName.toLowerCase() === referenceCandidate.toLowerCase();

                  return (
                    <tr
                      key={candName}
                      className={`hover:bg-white/5 transition-colors ${
                        isRef ? 'bg-blue-500/10 font-bold' : ''
                      }`}
                    >
                      <td className="py-3 px-4 flex items-center gap-2">
                        <span>{candName}</span>
                        {isRef && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 font-extrabold px-1.5 py-0.5 rounded">
                            ANALISADO
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-blue-400">
                        {pctA !== null ? `${pctA}%` : <span className="text-gray-500 italic">N/A</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-purple-400">
                        {pctB !== null ? `${pctB}%` : <span className="text-gray-500 italic">N/A</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold">
                        {delta !== null ? (
                          <span
                            className={
                              delta > 0
                                ? 'text-emerald-400'
                                : delta < 0
                                ? 'text-rose-400'
                                : 'text-gray-400'
                            }
                          >
                            {delta > 0 ? `+${delta}` : delta} p.p.
                          </span>
                        ) : (
                          <span className="text-gray-500 italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
