'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, RefreshCw, X } from 'lucide-react';
import { useState, useTransition } from 'react';

export interface FacebookFilterBarProps {
  options: {
    accounts: Array<{ id: string; handle: string }>;
    topics: string[];
    sentiments: string[];
    risks: string[];
  };
}

export default function FacebookFilterBar({ options }: FacebookFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSentiment = searchParams.get('sentiment') ?? '';
  const currentRisk = searchParams.get('risk') ?? '';
  const currentTopic = searchParams.get('topic') ?? '';
  const currentSearch = searchParams.get('search') ?? '';

  const [searchValue, setSearchValue] = useState(currentSearch);

  function updateParams(newParams: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val && val !== 'all') {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });

    startTransition(() => {
      router.push(`/dashboard/facebook?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search: searchValue.trim() || null });
  }

  function clearAllFilters() {
    setSearchValue('');
    startTransition(() => {
      router.push('/dashboard/facebook');
    });
  }

  const hasActiveFilters = Boolean(currentSentiment || currentRisk || currentTopic || currentSearch);

  return (
    <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Filter size={14} className="text-cyan-400" />
          <span>Filtros do Facebook</span>
          {isPending && <RefreshCw size={12} className="animate-spin text-cyan-400 ml-1" />}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white transition"
          >
            <X size={12} />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative lg:col-span-2">
          <input
            type="text"
            placeholder="Buscar por texto, tema ou resumo..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
        </form>

        {/* Sentiment */}
        <select
          value={currentSentiment}
          onChange={(e) => updateParams({ sentiment: e.target.value })}
          className="rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 px-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="">Sentimento: Todos</option>
          <option value="positivo">Positivo</option>
          <option value="neutro">Neutro</option>
          <option value="misto">Misto</option>
          <option value="negativo">Negativo</option>
        </select>

        {/* Risk */}
        <select
          value={currentRisk}
          onChange={(e) => updateParams({ risk: e.target.value })}
          className="rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 px-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="">Risco Reputacional: Todos</option>
          <option value="baixo">Baixo</option>
          <option value="médio">Médio</option>
          <option value="alto">Alto / Crítico</option>
        </select>

        {/* Topic */}
        <select
          value={currentTopic}
          onChange={(e) => updateParams({ topic: e.target.value })}
          className="rounded-lg border border-[#2D3748] bg-[#0F131C] py-2 px-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="">Tema Dominante: Todos</option>
          {options.topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
