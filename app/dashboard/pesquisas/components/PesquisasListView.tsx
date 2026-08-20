'use client';

import { useState, useMemo } from 'react';
import type { ElectoralPoll, ElectoralPollResultWithPoll, PesquisasKpis } from '@/lib/pesquisas/types';
import { isRealCandidate } from '@/lib/pesquisas/types';
import { calculateAnalyticalStatus, type AnalyticalStatusResult } from '@/lib/pesquisas/analyticsEngine';
import { calculateCockpitMetrics, getCandidateRanking } from '@/lib/pesquisas/cockpitAnalytics';
import { Search, Filter, Building2, MapPin, Calendar, ExternalLink, ChevronRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import KpiCard from '@/components/ui/KpiCard';

interface Props {
  polls: ElectoralPoll[];
  allResults: ElectoralPollResultWithPoll[];
  kpis: PesquisasKpis;
}

export function PesquisasListView({ polls, allResults, kpis }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUf, setSelectedUf] = useState<string>('all');
  const [selectedCargo, setSelectedCargo] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Map results to polls
  const resultsByPoll = useMemo(() => {
    const map = new Map<string, ElectoralPollResultWithPoll[]>();
    for (const r of allResults) {
      const list = map.get(r.pollId) ?? [];
      list.push(r);
      map.set(r.pollId, list);
    }
    return map;
  }, [allResults]);

  // Derived filter options
  const ufs = useMemo(() => {
    const set = new Set<string>();
    for (const p of polls) if (p.uf) set.add(p.uf);
    return Array.from(set).sort();
  }, [polls]);

  const cargos = useMemo(() => {
    const set = new Set<string>();
    for (const p of polls) if (p.cargo) set.add(p.cargo);
    return Array.from(set).sort();
  }, [polls]);

  // Enriched polls with analytics status
  const enrichedPolls = useMemo(() => {
    return polls.map((poll) => {
      const pollResults = resultsByPoll.get(poll.id) ?? [];
      const hasResults = pollResults.length > 0;

      let statusResult: AnalyticalStatusResult = {
        status: 'SEM CLASSIFICAÇÃO',
        reason: 'Aguardando integração de resultados.',
        candidateName: null,
        gap: null,
        previousGap: null,
        diff: null,
      };

      let leaderName: string | null = null;
      let leaderPct: number | null = null;

      if (hasResults) {
        const ranking = getCandidateRanking(pollResults, poll.id);
        const metrics = calculateCockpitMetrics([poll], pollResults);
        statusResult = calculateAnalyticalStatus(ranking, metrics);
        leaderName = ranking.realCandidates[0]?.candidateName ?? null;
        leaderPct = ranking.realCandidates[0]?.percentage ?? null;
      }

      return {
        poll,
        hasResults,
        statusResult,
        leaderName,
        leaderPct,
      };
    });
  }, [polls, resultsByPoll]);

  // Filtered polls
  const filteredPolls = useMemo(() => {
    return enrichedPolls.filter(({ poll, statusResult }) => {
      if (selectedUf !== 'all' && poll.uf !== selectedUf && poll.abrangencia !== selectedUf) return false;
      if (selectedCargo !== 'all' && poll.cargo && !poll.cargo.toLowerCase().includes(selectedCargo.toLowerCase())) return false;
      if (selectedStatus !== 'all' && statusResult.status !== selectedStatus) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const instMatch = poll.instituto?.toLowerCase().includes(term);
        const regMatch = poll.tseRegistrationNumber?.toLowerCase().includes(term);
        const cargoMatch = poll.cargo?.toLowerCase().includes(term);
        const ufMatch = poll.uf?.toLowerCase().includes(term);
        if (!instMatch && !regMatch && !cargoMatch && !ufMatch) return false;
      }

      return true;
    });
  }, [enrichedPolls, selectedUf, selectedCargo, selectedStatus, searchTerm]);

  const countWithResults = useMemo(() => enrichedPolls.filter((p) => p.hasResults).length, [enrichedPolls]);
  const countPending = useMemo(() => enrichedPolls.filter((p) => !p.hasResults).length, [enrichedPolls]);

  return (
    <div className="space-y-6">
      {/* Header da Seção */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Base Oficial de Pesquisas Registradas ({polls.length})
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Triagem completa de levantamentos eleitorais homologados pelo TSE/PesqEle.
          </p>
        </div>
      </div>

      {/* Faixa de KPIs da Base */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard title="Total de Pesquisas" value={polls.length} compact />
        <KpiCard title="Com Resultados" value={countWithResults} status="success" compact />
        <KpiCard title="Aguardando Resultados" value={countPending} compact />
        <KpiCard title="Institutos Mapeados" value={kpis.institutesCount} compact />
        <KpiCard title="Última Atualização" value={kpis.lastRegistrationDate ?? 'Não informada'} compact />
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-[#12192A] border border-white/5 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Busca Textual */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por instituto, nº TSE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0b0f19] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* UF */}
          <select
            value={selectedUf}
            onChange={(e) => setSelectedUf(e.target.value)}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todas as UFs / Brasil</option>
            {ufs.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>

          {/* Cargo */}
          <select
            value={selectedCargo}
            onChange={(e) => setSelectedCargo(e.target.value)}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos os Cargos</option>
            {cargos.map((cargo) => (
              <option key={cargo} value={cargo}>
                {cargo}
              </option>
            ))}
          </select>

          {/* Situação Analítica */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todas as Situações</option>
            <option value="ESTÁVEL">ESTÁVEL</option>
            <option value="ATENÇÃO">ATENÇÃO</option>
            <option value="CRÍTICO">CRÍTICO</option>
            <option value="SEM CLASSIFICAÇÃO">SEM CLASSIFICAÇÃO</option>
          </select>
        </div>
      </div>

      {/* Tabela de Pesquisas */}
      <div className="bg-[#12192A] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        {filteredPolls.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs italic">
            Nenhuma pesquisa encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0f19] text-gray-400 uppercase text-[10px] font-bold tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">TSE / Instituto</th>
                  <th className="py-3 px-4">Cargo & UF</th>
                  <th className="py-3 px-4">Data Campo</th>
                  <th className="py-3 px-4">Líder Atual</th>
                  <th className="py-3 px-4">Resultado (%)</th>
                  <th className="py-3 px-4">Situação Analítica</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPolls.map(({ poll, hasResults, statusResult, leaderName, leaderPct }) => {
                  const statusBadgeColor =
                    statusResult.status === 'ESTÁVEL'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : statusResult.status === 'ATENÇÃO'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : statusResult.status === 'CRÍTICO'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-gray-500/10 text-gray-400 border-gray-500/20';

                  return (
                    <tr key={poll.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{poll.tseRegistrationNumber}</div>
                        <div className="text-[11px] text-gray-400">{poll.instituto ?? 'Instituto não informado'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-200 font-medium">{poll.cargo ?? 'Cargo não informado'}</div>
                        <div className="text-[11px] text-gray-500">{poll.abrangencia ?? poll.uf ?? 'Brasil'}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-mono text-[11px]">
                        {poll.campoFim ?? poll.dataRegistro ?? 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {leaderName ? (
                          <span className="text-blue-400 font-semibold">{leaderName}</span>
                        ) : (
                          <span className="text-gray-500 italic text-[11px]">Aguardando integração</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {leaderPct !== null ? (
                          <span className="text-white text-sm">{leaderPct}%</span>
                        ) : (
                          <span className="text-gray-500 italic text-[11px]">Aguardando</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded border font-mono ${statusBadgeColor}`}
                          title={statusResult.reason}
                        >
                          {statusResult.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/dashboard/pesquisas/${poll.id}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-white font-semibold hover:underline"
                        >
                          Ficha <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
