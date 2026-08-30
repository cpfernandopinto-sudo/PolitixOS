'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, RefreshCw, X, SlidersHorizontal } from 'lucide-react';
import { useState, useTransition } from 'react';
import type { WhatsAppFiltersResponseDTO } from '@/lib/types/whatsapp';

interface Props {
  options: WhatsAppFiltersResponseDTO;
}

export default function WhatsAppFilterBar({ options }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const currentSearch = searchParams.get('q') || searchParams.get('search') || '';
  const currentGroup = searchParams.get('chat_id') || searchParams.get('group') || '';
  const currentTheme = searchParams.get('theme') || searchParams.get('topic') || '';
  const currentSentiment = searchParams.get('sentiment') || '';
  const currentRisk = searchParams.get('risk_level') || searchParams.get('risk') || '';
  const currentRelevance = searchParams.get('relevance') || '';
  const currentType = searchParams.get('message_type') || searchParams.get('type') || '';
  const currentStatus = searchParams.get('analysis_status') || '';
  const currentCandidate = searchParams.get('candidate') || '';
  const currentLocation = searchParams.get('location') || '';

  const [searchValue, setSearchValue] = useState(currentSearch);

  function updateParams(newParams: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val && val !== 'all' && val.trim() !== '') {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });

    // Reset cursor when applying new filters
    params.delete('cursor');

    startTransition(() => {
      router.push(`/dashboard/whatsapp?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ q: searchValue.trim() || null });
  }

  function clearAllFilters() {
    setSearchValue('');
    startTransition(() => {
      router.push('/dashboard/whatsapp');
    });
  }

  const activeFiltersCount = [
    currentSearch,
    currentGroup,
    currentTheme,
    currentSentiment,
    currentRisk,
    currentRelevance,
    currentType,
    currentStatus,
    currentCandidate,
    currentLocation,
  ].filter(Boolean).length;

  return (
    <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4 shadow-sm space-y-3">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Filter size={14} className="text-cyan-400" />
          <span>Filtros do WhatsApp</span>
          {activeFiltersCount > 0 && (
            <span className="rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold">
              {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
            </span>
          )}
          {isPending && <RefreshCw size={12} className="animate-spin text-cyan-400 ml-1" />}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium border transition ${
              showAdvanced
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'text-slate-400 border-white/10 hover:bg-white/5 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={12} />
            <span>Filtros Avançados</span>
          </button>

          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white transition"
            >
              <X size={12} />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Filter Inputs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative lg:col-span-2">
          <input
            type="text"
            placeholder="Buscar por texto, palavra-chave, resumo ou remetente..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
        </form>

        {/* Group Selector */}
        <select
          value={currentGroup}
          onChange={(e) => updateParams({ chat_id: e.target.value })}
          className="rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 px-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="">Grupo: Todos ({options.groups.length})</option>
          {options.groups.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>

        {/* Sentiment */}
        <select
          value={currentSentiment}
          onChange={(e) => updateParams({ sentiment: e.target.value })}
          className="rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 px-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="">Sentimento: Todos</option>
          <option value="POSITIVE">Positivo</option>
          <option value="NEUTRAL">Neutro</option>
          <option value="MIXED">Misto</option>
          <option value="NEGATIVE">Negativo</option>
        </select>
      </div>

      {/* Advanced Filters Row */}
      {showAdvanced && (
        <div className="grid grid-cols-1 gap-3 pt-2 border-t border-white/5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Theme */}
          <select
            value={currentTheme}
            onChange={(e) => updateParams({ theme: e.target.value })}
            className="rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 px-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Tema: Todos</option>
            {options.themes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.value} ({t.count})
              </option>
            ))}
          </select>

          {/* Risk Level */}
          <select
            value={currentRisk}
            onChange={(e) => updateParams({ risk_level: e.target.value })}
            className="rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 px-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Risco: Todos</option>
            <option value="LOW">Baixo</option>
            <option value="MEDIUM">Médio</option>
            <option value="HIGH">Alto</option>
            <option value="CRITICAL">Crítico</option>
          </select>

          {/* Relevance */}
          <select
            value={currentRelevance}
            onChange={(e) => updateParams({ relevance: e.target.value })}
            className="rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 px-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Relevância: Todas</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
          </select>

          {/* Message Type */}
          <select
            value={currentType}
            onChange={(e) => updateParams({ message_type: e.target.value })}
            className="rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 px-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Tipo: Todos</option>
            <option value="TEXT">Texto</option>
            <option value="AUDIO">Áudio</option>
            <option value="IMAGE">Imagem</option>
            <option value="VIDEO">Vídeo</option>
            <option value="DOCUMENT">Documento</option>
          </select>

          {/* Analysis Status */}
          <select
            value={currentStatus}
            onChange={(e) => updateParams({ analysis_status: e.target.value })}
            className="rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 px-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Status da IA: Todos</option>
            <option value="COMPLETED">Concluída</option>
            <option value="PROCESSING">Em Processamento</option>
            <option value="PENDING">Pendente</option>
            <option value="FAILED">Falha</option>
            <option value="SKIPPED">Ignorada</option>
          </select>
        </div>
      )}
    </div>
  );
}
