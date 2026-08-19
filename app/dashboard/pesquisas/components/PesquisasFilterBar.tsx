'use client';

import { Filter, RotateCcw, MapPin, Briefcase, Users, Calendar, Building2, Layers } from 'lucide-react';
import type { PesquisasFilters } from '@/lib/pesquisas/types';

interface Props {
  filters: PesquisasFilters;
  onChange: (newFilters: PesquisasFilters) => void;
  availableUfs: string[];
  availableCargos: string[];
  availableInstitutos: string[];
  availableCandidates: string[];
}

export function PesquisasFilterBar({
  filters,
  onChange,
  availableUfs,
  availableCargos,
  availableInstitutos,
  availableCandidates,
}: Props) {
  const handleUfChange = (uf: string) => {
    onChange({ ...filters, uf: uf === 'ALL' ? null : uf });
  };

  const handleCargoChange = (cargo: string) => {
    onChange({ ...filters, cargo: cargo === 'ALL' ? null : cargo });
  };

  const handleInstitutoChange = (inst: string) => {
    onChange({ ...filters, instituto: inst === 'ALL' ? null : inst });
  };

  const handlePeriodChange = (period: '30d' | '90d' | 'year' | 'all') => {
    onChange({ ...filters, period: period === 'all' ? null : period });
  };

  const handleCandidateToggle = (candidate: string) => {
    const current = filters.candidateNames ?? [];
    if (current.includes(candidate)) {
      const next = current.filter((c) => c !== candidate);
      onChange({ ...filters, candidateNames: next.length > 0 ? next : null });
    } else {
      onChange({ ...filters, candidateNames: [...current, candidate] });
    }
  };

  const handleReset = () => {
    onChange({
      uf: 'DF',
      cargo: 'Governador',
      period: null,
      instituto: null,
      turno: 1,
      tipoPergunta: 'estimulada',
      candidateNames: null,
    });
  };

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-blue-400" />
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">Barra de Análise Executiva</h3>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10"
        >
          <RotateCcw size={13} /> Padrão Brasília (DF - Governador)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        {/* Território (DF prioritário) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <MapPin size={12} className="text-blue-400" /> Território / UF
          </label>
          <select
            value={filters.uf ?? 'ALL'}
            onChange={(e) => handleUfChange(e.target.value)}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="DF">DF — Distrito Federal (Brasília P0)</option>
            <option value="BR">BR — Brasil (Presidência)</option>
            <option value="MG">MG — Minas Gerais</option>
            <option value="ALL">Todos os Territórios</option>
            {availableUfs
              .filter((uf) => !['DF', 'BR', 'MG'].includes(uf))
              .map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
          </select>
        </div>

        {/* Cargo */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Briefcase size={12} className="text-blue-400" /> Cargo Pesquisado
          </label>
          <select
            value={filters.cargo ?? 'ALL'}
            onChange={(e) => handleCargoChange(e.target.value)}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="Governador">Governador</option>
            <option value="Presidente">Presidente</option>
            <option value="Senador">Senador</option>
            <option value="ALL">Todos os Cargos</option>
            {availableCargos
              .filter((c) => !['Governador', 'Presidente', 'Senador'].includes(c))
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        </div>

        {/* Período */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar size={12} className="text-blue-400" /> Período
          </label>
          <select
            value={filters.period ?? 'all'}
            onChange={(e) => handlePeriodChange(e.target.value as '30d' | '90d' | 'year' | 'all')}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todo o Histórico 2026</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="year">Ano de 2026</option>
          </select>
        </div>

        {/* Instituto */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Building2 size={12} className="text-blue-400" /> Instituto
          </label>
          <select
            value={filters.instituto ?? 'ALL'}
            onChange={(e) => handleInstitutoChange(e.target.value)}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Todos os Institutos</option>
            {availableInstitutos.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo / Cenário */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Layers size={12} className="text-blue-400" /> Tipo de Pergunta
          </label>
          <select
            value={filters.tipoPergunta ?? 'estimulada'}
            onChange={(e) => onChange({ ...filters, tipoPergunta: e.target.value as 'estimulada' | 'espontanea' })}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="estimulada">Estimulada</option>
            <option value="espontanea">Espontânea</option>
          </select>
        </div>
      </div>

      {/* Candidatos (Multi-select Filter) quando disponíveis */}
      {availableCandidates.length > 0 && (
        <div className="pt-3 border-t border-white/5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
            <Users size={12} className="text-blue-400" /> Filtrar Candidatos (Multi-seleção)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {availableCandidates.map((candidate) => {
              const isSelected = (filters.candidateNames ?? []).includes(candidate);
              return (
                <button
                  key={candidate}
                  onClick={() => handleCandidateToggle(candidate)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white border border-blue-400'
                      : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {candidate} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
