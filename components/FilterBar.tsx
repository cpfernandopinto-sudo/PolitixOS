'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Calendar, Filter, Loader2, MapPin, Search, Target, Type, X, ThumbsUp } from 'lucide-react';

interface FilterBarProps {
  candidates: string[];
  cities: string[];
  sources: string[];
}

const SELECT_CLS =
  'appearance-none bg-[#0D0D0D] border border-white/5 rounded-lg py-2 pl-9 pr-6 text-sm text-gray-300 ' +
  'focus:outline-none focus:border-[#00FFFF]/50 hover:border-white/10 transition-all cursor-pointer ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export default function FilterBar({ candidates, cities, sources }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const get = (key: string) => searchParams.get(key) ?? '';

  // Estado local só para o campo de busca textual (debounce)
  const [searchInput, setSearchInput] = useState(get('search'));

  // Sincroniza input de busca quando URL muda externamente (ex: "Limpar")
  useEffect(() => {
    setSearchInput(get('search'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('search')]);

  // Atualiza URL com debounce de 400ms para busca textual
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = get('search');
      if (searchInput !== current) {
        pushFilter('search', searchInput);
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const pushFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    startTransition(() => {
      router.push(pathname);
    });
  }, [pathname, router]);

  const hasActive =
    !!get('candidate') ||
    !!get('city') ||
    !!get('source') ||
    !!get('sentiment') ||
    !!get('period') ||
    !!get('search');

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-wrap items-center gap-4 mb-6">
      {/* Título / indicador de carregamento */}
      <div className="flex items-center gap-2 text-gray-400 border-r border-white/5 pr-4 shrink-0">
        {isPending ? (
          <Loader2 size={18} className="animate-spin text-[#00FFFF]" />
        ) : (
          <Filter size={18} />
        )}
        <span className="text-sm font-medium">Filtros</span>
      </div>

      <div className="flex-1 flex flex-wrap items-center gap-3">
        {/* Candidato */}
        <div className="relative group">
          <Target
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none"
            size={16}
          />
          <select
            value={get('candidate')}
            onChange={(e) => pushFilter('candidate', e.target.value)}
            disabled={isPending}
            className={SELECT_CLS}
          >
            <option value="">Candidato: Todos</option>
            {candidates.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Cidade */}
        <div className="relative group">
          <MapPin
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none"
            size={16}
          />
          <select
            value={get('city')}
            onChange={(e) => pushFilter('city', e.target.value)}
            disabled={isPending}
            className={SELECT_CLS}
          >
            <option value="">Cidade: Todas</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Fonte */}
        <div className="relative group">
          <Type
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none"
            size={16}
          />
          <select
            value={get('source')}
            onChange={(e) => pushFilter('source', e.target.value)}
            disabled={isPending}
            className={SELECT_CLS}
          >
            <option value="">Fonte: Todas</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Sentimento */}
        <div className="relative group">
          <ThumbsUp
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none"
            size={16}
          />
          <select
            value={get('sentiment')}
            onChange={(e) => pushFilter('sentiment', e.target.value)}
            disabled={isPending}
            className={SELECT_CLS}
          >
            <option value="">Sentimento: Todos</option>
            <option value="positivo">Positivo</option>
            <option value="neutro">Neutro</option>
            <option value="negativo">Negativo</option>
          </select>
        </div>

        {/* Período */}
        <div className="relative group">
          <Calendar
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none"
            size={16}
          />
          <select
            value={get('period')}
            onChange={(e) => pushFilter('period', e.target.value)}
            disabled={isPending}
            className={SELECT_CLS}
          >
            <option value="">Período: Todos</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </div>

        {/* Busca textual */}
        <div className="relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors pointer-events-none"
            size={16}
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={isPending}
            placeholder="Buscar notícia..."
            className={
              'bg-[#0D0D0D] border border-white/5 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-300 ' +
              'placeholder:text-gray-600 focus:outline-none focus:border-[#00FFFF]/50 ' +
              'hover:border-white/10 transition-all w-44 disabled:opacity-50'
            }
          />
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center gap-2">
        {hasActive && (
          <button
            onClick={clearFilters}
            disabled={isPending}
            className={
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ' +
              'text-gray-400 hover:text-white hover:bg-white/5 border border-white/5 ' +
              'disabled:opacity-50 disabled:cursor-not-allowed'
            }
          >
            <X size={12} />
            Limpar
          </button>
        )}

        <button
          disabled={isPending}
          className={
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ' +
            'bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/20 hover:bg-[#00FFFF]/20 ' +
            'shadow-[0_0_15px_rgba(0,255,255,0.1)] uppercase tracking-wider'
          }
        >
          <Filter size={12} />
          Filtros Avançados
        </button>
      </div>
    </div>
  );
}
