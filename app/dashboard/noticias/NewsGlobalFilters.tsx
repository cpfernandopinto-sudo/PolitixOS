'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Calendar, Filter, Loader2, MapPin, Search, Target, Type, X, ThumbsUp,
  ChevronDown, CalendarDays
} from 'lucide-react';
import clsx from 'clsx';

interface NewsGlobalFiltersProps {
  candidates: { id: string; name: string }[];
  cities: string[];
  sources: string[];
}

const SELECT_CLS =
  'appearance-none bg-[#0D0D0D] border border-white/5 rounded-lg py-2 pl-9 pr-8 text-sm text-gray-300 ' +
  'focus:outline-none focus:border-[#00FFFF]/50 hover:border-white/10 transition-all cursor-pointer ' +
  'disabled:opacity-50 disabled:cursor-not-allowed w-full lg:w-auto';

export default function NewsGlobalFilters({ candidates, cities, sources }: NewsGlobalFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const get = (key: string) => searchParams.get(key) ?? '';

  const [searchInput, setSearchInput] = useState(get('search'));
  const [showDates, setShowDates] = useState(get('period') === 'custom');

  useEffect(() => {
    setSearchInput(get('search'));
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== get('search')) {
        updateURL({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateURL = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [searchParams, pathname, router]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    startTransition(() => {
      router.push(pathname);
    });
  }, [pathname, router]);

  const hasActive = searchParams.size > 0;

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 mb-6 shadow-2xl">
      <div className="flex flex-wrap items-center gap-4">
        {/* Indicador de Status */}
        <div className="flex items-center gap-2 text-gray-400 border-r border-white/5 pr-4 shrink-0">
          {isPending ? (
            <Loader2 size={18} className="animate-spin text-[#00FFFF]" />
          ) : (
            <Filter size={18} className="text-[#00FFFF]/60" />
          )}
          <span className="text-xs font-bold uppercase tracking-widest">Filtros Globais</span>
        </div>

        <div className="flex-1 flex flex-wrap items-center gap-3">
          {/* Candidato */}
          <div className="relative group min-w-[160px]">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none" size={16} />
            <select
              value={get('candidateId')}
              onChange={(e) => updateURL({ candidateId: e.target.value })}
              className={SELECT_CLS}
            >
              <option value="">Candidato: Todos</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
          </div>

          {/* Cidade */}
          <div className="relative group min-w-[140px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none" size={16} />
            <select
              value={get('city')}
              onChange={(e) => updateURL({ city: e.target.value })}
              className={SELECT_CLS}
            >
              <option value="">Cidade: Todas</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
          </div>

          {/* Fonte */}
          <div className="relative group min-w-[140px]">
            <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none" size={16} />
            <select
              value={get('source')}
              onChange={(e) => updateURL({ source: e.target.value })}
              className={SELECT_CLS}
            >
              <option value="">Fonte: Todas</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
          </div>

          {/* Sentimento */}
          <div className="relative group min-w-[150px]">
            <ThumbsUp className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none" size={16} />
            <select
              value={get('sentiment')}
              onChange={(e) => updateURL({ sentiment: e.target.value })}
              className={SELECT_CLS}
            >
              <option value="">Sentimento: Todos</option>
              <option value="positivo">Positivo</option>
              <option value="neutro">Neutro</option>
              <option value="negativo">Negativo</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
          </div>

          {/* Período */}
          <div className="relative group min-w-[150px]">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none" size={16} />
            <select
              value={get('period')}
              onChange={(e) => {
                const val = e.target.value;
                setShowDates(val === 'custom');
                updateURL({
                  period: val,
                  startDate: val === 'custom' ? get('startDate') : null,
                  endDate: val === 'custom' ? get('endDate') : null
                });
              }}
              className={SELECT_CLS}
            >
              <option value="">Todo período</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="custom">Personalizado...</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
          </div>

          {/* Datas Customizadas */}
          {showDates && (
            <div className="flex items-center gap-2 bg-[#0D0D0D] border border-white/5 rounded-lg px-2 py-1 animate-in slide-in-from-left-2 duration-200">
              <input
                type="date"
                value={get('startDate')}
                onChange={(e) => updateURL({ startDate: e.target.value })}
                className="bg-transparent text-xs text-gray-300 focus:outline-none p-1"
              />
              <span className="text-gray-600 text-xs">até</span>
              <input
                type="date"
                value={get('endDate')}
                onChange={(e) => updateURL({ endDate: e.target.value })}
                className="bg-transparent text-xs text-gray-300 focus:outline-none p-1"
              />
            </div>
          )}

          {/* Busca */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none" size={16} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar notícia..."
              className={clsx(
                'bg-[#0D0D0D] border border-white/5 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-300',
                'placeholder:text-gray-600 focus:outline-none focus:border-[#00FFFF]/50',
                'hover:border-white/10 transition-all w-48'
              )}
            />
          </div>
        </div>

        {/* Limpar */}
        {hasActive && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-400/80 hover:text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-all uppercase tracking-tighter"
          >
            <X size={14} />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
