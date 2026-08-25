'use client';

import { useState, useRef, useEffect } from 'react';
import { Filter, Users, ChevronDown, RotateCcw, Check, LayoutDashboard, ListFilter, Columns3, Building2, MapPin } from 'lucide-react';
import type { PesquisasFilters } from '@/lib/pesquisas/types';

interface Props {
  filters: PesquisasFilters;
  onChange: (newFilters: PesquisasFilters) => void;
  availableUfs: string[];
  availableCargos: string[];
  availableInstitutos: string[];
  availableCandidates: string[];
  activeTab: 'cockpit' | 'lista' | 'comparativo';
  onTabChange: (tab: 'cockpit' | 'lista' | 'comparativo') => void;
  onResetDefault: () => void;
}

export function PesquisasFilterBar({
  filters,
  onChange,
  availableUfs,
  availableCargos,
  availableInstitutos,
  availableCandidates,
  activeTab,
  onTabChange,
  onResetDefault,
}: Props) {
  const [showCandidateDropdown, setShowCandidateDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sprint 2B / P0.2: mesmo padrão já estável usado em components/GlobalContextBar.tsx (dropdown
  // de candidatos do cabeçalho global, em produção em toda a aplicação) — fecha ao clicar fora E
  // ao pressionar Escape (o dropdown artesanal anterior só tratava clique fora).
  useEffect(() => {
    if (!showCandidateDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCandidateDropdown(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowCandidateDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCandidateDropdown]);

  const selectedCandidates = filters.candidateNames ?? [];

  const handleCandidateToggle = (candidate: string) => {
    if (selectedCandidates.includes(candidate)) {
      const next = selectedCandidates.filter((c) => c !== candidate);
      onChange({ ...filters, candidateNames: next.length > 0 ? next : null });
    } else {
      onChange({ ...filters, candidateNames: [...selectedCandidates, candidate] });
    }
  };

  const handleSelectAllCandidates = () => {
    onChange({ ...filters, candidateNames: null });
  };

  const candidateButtonLabel =
    selectedCandidates.length === 0
      ? 'Todos os candidatos'
      : selectedCandidates.length === 1
      ? selectedCandidates[0]
      : selectedCandidates.length === 2
      ? `${selectedCandidates[0]} + ${selectedCandidates[1]}`
      : `${selectedCandidates.length} candidatos`;

  return (
    <div className="surface-primary p-5 space-y-4">
      {/* Navegação Principal em 3 Áreas: Cockpit | Base de Pesquisas | Comparativo */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTabChange('cockpit')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              activeTab === 'cockpit'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <LayoutDashboard size={15} /> Cockpit Executivo
          </button>
          <button
            onClick={() => onTabChange('lista')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              activeTab === 'lista'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <ListFilter size={15} /> Base de Pesquisas
          </button>
          <button
            onClick={() => onTabChange('comparativo')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              activeTab === 'comparativo'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Columns3 size={15} /> Comparativo
          </button>
        </div>

        <button
          onClick={onResetDefault}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
        >
          <RotateCcw size={12} /> Resetar DF / Governador (Brasília P0)
        </button>
      </div>

      {/* FILTROS DINÂMICOS ENCADEADOS (Seção 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 text-xs">
        {/* 1. UF / Abrangência */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <MapPin size={12} className="text-blue-400" /> UF / Abrangência
          </label>
          <select
            value={filters.uf ?? 'BR'}
            onChange={(e) => onChange({ ...filters, uf: e.target.value, candidateNames: null })}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="BR">Brasil (BR)</option>
            {availableUfs.filter((u) => u !== 'BR').map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Cargo */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cargo</label>
          <select
            value={filters.cargo ?? 'Governador'}
            onChange={(e) => onChange({ ...filters, cargo: e.target.value, candidateNames: null })}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            {availableCargos.map((cargo) => (
              <option key={cargo} value={cargo}>
                {cargo}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Candidatos (Popover Multi-Select) */}
        <div className="space-y-1 relative" ref={dropdownRef}>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Users size={12} className="text-blue-400" /> Candidato(s)
          </label>
          <button
            type="button"
            onClick={() => setShowCandidateDropdown((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={showCandidateDropdown}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white font-medium flex items-center justify-between hover:border-white/20 transition-colors"
          >
            <span className="truncate">{candidateButtonLabel}</span>
            <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1" />
          </button>

          {showCandidateDropdown && (
            <div
              role="listbox"
              aria-multiselectable="true"
              className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#0d1322] border border-white/15 rounded-xl shadow-2xl p-3 space-y-2 max-h-60 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px]">
                <span className="text-gray-400">Filtrar candidatos</span>
                <button
                  type="button"
                  onClick={handleSelectAllCandidates}
                  className="text-blue-400 hover:underline text-[10px] font-bold"
                >
                  Selecionar Todos
                </button>
              </div>

              {availableCandidates.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2 text-center">Nenhum candidato nesta corrida.</p>
              ) : (
                <div className="space-y-1">
                  {availableCandidates.map((cand) => {
                    const isChecked = selectedCandidates.length === 0 || selectedCandidates.includes(cand);
                    return (
                      <button
                        key={cand}
                        type="button"
                        role="option"
                        aria-selected={isChecked}
                        onClick={() => handleCandidateToggle(cand)}
                        className="w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs text-gray-200 text-left"
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isChecked
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'border-white/20 bg-black/20'
                          }`}
                        >
                          {isChecked && <Check size={12} />}
                        </span>
                        <span className="truncate">{cand}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Instituto (Novo Filtro Obrigatório - Seção 1) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Building2 size={12} className="text-blue-400" /> Instituto
          </label>
          <select
            value={filters.instituto ?? 'all'}
            onChange={(e) => onChange({ ...filters, instituto: e.target.value === 'all' ? null : e.target.value })}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos os Institutos</option>
            {availableInstitutos.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Período */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Período</label>
          <select
            value={filters.period ?? 'all'}
            onChange={(e) => onChange({ ...filters, period: e.target.value as PesquisasFilters['period'] })}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todo o Histórico</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="60d">Últimos 60 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="year">Ano de 2026</option>
          </select>
        </div>

        {/* 6. Turno */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Turno</label>
          <select
            value={filters.turno ?? 1}
            onChange={(e) => onChange({ ...filters, turno: parseInt(e.target.value, 10) })}
            className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value={1}>1º Turno</option>
            <option value={2}>2º Turno</option>
          </select>
        </div>

        {/* 7. Tipo de Pergunta */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tipo</label>
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
    </div>
  );
}
