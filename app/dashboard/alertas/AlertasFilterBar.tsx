'use client';

import { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Filter, ChevronDown } from 'lucide-react';
import ActiveFilterChips from '@/components/ui/ActiveFilterChips';
import { SEVERITY_LABEL } from '@/lib/config/alert-thresholds';

interface Props {
  candidates: { id: string; name: string }[];
}

const SELECT_CLS =
  'appearance-none bg-[#0D0D0D] border border-white/5 rounded-lg py-2 pl-3 pr-8 text-sm text-gray-300 ' +
  'focus:outline-none focus:border-[#00FFFF]/50 hover:border-white/10 transition-all cursor-pointer w-full lg:w-auto';

const TYPE_LABELS: Record<string, string> = {
  noticias: 'Radar de Notícias',
  instagram: 'Radar Instagram',
  x: 'Radar X',
};

const PERIOD_LABELS: Record<string, string> = {
  all: 'Todo período',
  '1': 'Últimas 24h',
  '7': 'Últimos 7 dias',
  '30': 'Últimos 30 dias',
};

export default function AlertasFilterBar({ candidates }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = (key: string) => searchParams.get(key) ?? '';

  const updateURL = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const clearFilters = useCallback(() => router.push(pathname), [pathname, router]);

  const chips = [
    get('period') && get('period') !== 'all'
      ? { key: 'period', label: `Período: ${PERIOD_LABELS[get('period')] || get('period')}` }
      : null,
    get('severity')
      ? { key: 'severity', label: `Severidade: ${SEVERITY_LABEL[get('severity') as 'critico' | 'alto' | 'medio'] || get('severity')}` }
      : null,
    get('type') ? { key: 'type', label: `Canal: ${TYPE_LABELS[get('type')] || get('type')}` } : null,
    get('target')
      ? { key: 'target', label: `Candidato: ${candidates.find((c) => c.id === get('target'))?.name || get('target')}` }
      : null,
  ].filter((c): c is { key: string; label: string } => c !== null);

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-gray-400 border-r border-white/5 pr-4 shrink-0">
          <Filter size={16} className="text-[#00FFFF]/60" />
          <span className="text-xs font-bold uppercase tracking-widest">Filtros</span>
        </div>

        <div className="relative group min-w-[150px]">
          <select
            value={get('period') || 'all'}
            onChange={(e) => updateURL({ period: e.target.value === 'all' ? null : e.target.value })}
            className={SELECT_CLS}
          >
            {Object.entries(PERIOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
        </div>

        <div className="relative group min-w-[150px]">
          <select
            value={get('severity')}
            onChange={(e) => updateURL({ severity: e.target.value || null })}
            className={SELECT_CLS}
          >
            <option value="">Severidade: Todas</option>
            <option value="critico">Crítico</option>
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
        </div>

        <div className="relative group min-w-[170px]">
          <select
            value={get('type')}
            onChange={(e) => updateURL({ type: e.target.value || null })}
            className={SELECT_CLS}
          >
            <option value="">Canal: Todos</option>
            <option value="noticias">Radar de Notícias</option>
            <option value="instagram">Radar Instagram</option>
            <option value="x">Radar X</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
        </div>

        <div className="relative group min-w-[170px]">
          <select
            value={get('target')}
            onChange={(e) => updateURL({ target: e.target.value || null })}
            className={SELECT_CLS}
          >
            <option value="">Candidato: Todos</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
        </div>

        {chips.length > 0 && (
          <button
            onClick={clearFilters}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-400/80 hover:text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-all uppercase tracking-tighter"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <ActiveFilterChips
        chips={chips}
        onRemove={(key) => updateURL({ [key]: null })}
      />
    </div>
  );
}
