'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { findCurrentNavItem } from '@/lib/navigation/dashboardNavigation';

interface Candidate {
  id: string;
  name: string;
}

interface Props {
  candidates: Candidate[];
  generatedAt: string;
}

/**
 * Mapeamento de período entre o formato da Visão Geral/Global (1/7/30)
 * e o formato do Radar de Notícias (24h/7d/30d).
 */
const GLOBAL_TO_NOTICIAS_PERIOD: Record<string, string> = {
  '1': '24h',
  '7': '7d',
  '30': '30d',
};

/** Páginas que suportam o filtro `candidate` via searchParam. */
const PAGES_WITH_CANDIDATE = [
  '/dashboard/overview',
  '/dashboard/noticias',
  '/dashboard/instagram',
  '/dashboard/x',
];

/** Páginas que suportam o filtro `period` via searchParam. */
const PAGES_WITH_PERIOD = [
  '/dashboard/overview',
  '/dashboard/noticias',
  '/dashboard/instagram',
  '/dashboard/x',
];

const PERIOD_LABELS: Record<string, string> = {
  all: 'Todo período',
  '1': 'Últimas 24h',
  '7': 'Últimos 7 dias',
  '30': 'Últimos 30 dias',
};

/** Traduz period global → formato aceito pela página de destino. */
function translatePeriodForPath(period: string, targetPath: string): string {
  if (targetPath.startsWith('/dashboard/noticias')) {
    return GLOBAL_TO_NOTICIAS_PERIOD[period] ?? period;
  }
  return period;
}

/** Traduz period da página de destino → formato global. */
function normalizeIncomingPeriod(period: string | null): string {
  if (!period) return 'all';
  // Normaliza formatos do Notícias (24h/7d/30d) para global
  if (period === '24h') return '1';
  if (period === '7d') return '7';
  if (period === '30d') return '30';
  return period;
}

const selectCls =
  'appearance-none bg-[#0B0F19] border border-white/[0.08] text-white text-[11px] font-semibold rounded-md ' +
  'pl-2.5 pr-6 h-7 focus:outline-none focus:border-cyan-400/50 hover:border-white/[0.18] ' +
  'transition-colors cursor-pointer shrink-0';

export default function GlobalContextBar({ candidates, generatedAt }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentModule = findCurrentNavItem(pathname);
  const supportsCandidate = PAGES_WITH_CANDIDATE.some((p) => pathname.startsWith(p));
  const supportsPeriod = PAGES_WITH_PERIOD.some((p) => pathname.startsWith(p));

  // Ler candidato atual da URL (normalizar formatos)
  const rawCandidate = searchParams.get('candidate') ?? searchParams.get('candidateId') ?? '';
  const rawPeriod = normalizeIncomingPeriod(
    searchParams.get('period') ?? searchParams.get('startDate') ?? null
  );

  const [candidate, setCandidate] = useState(rawCandidate);
  const [period, setPeriod] = useState(rawPeriod);

  // Sync com URL quando pathname muda (navegação entre módulos)
  useEffect(() => {
    setCandidate(searchParams.get('candidate') ?? searchParams.get('candidateId') ?? '');
    setPeriod(normalizeIncomingPeriod(searchParams.get('period') ?? null));
  }, [pathname, searchParams]);

  const formattedTime = new Date(generatedAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const applyFilters = useCallback(
    (nextCandidate: string, nextPeriod: string) => {
      const params = new URLSearchParams(searchParams.toString());

      // Limpar params de candidato de todas as variantes
      params.delete('candidate');
      params.delete('candidateId');

      if (nextCandidate) {
        // Notícias usa candidateId; demais usam candidate
        if (pathname.startsWith('/dashboard/noticias')) {
          params.set('candidateId', nextCandidate);
        } else {
          params.set('candidate', nextCandidate);
        }
      }

      // Limpar período
      params.delete('period');
      if (nextPeriod && nextPeriod !== 'all') {
        params.set('period', translatePeriodForPath(nextPeriod, pathname));
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2">
      {/* Separador visual */}
      <span className="text-white/[0.12] select-none hidden lg:inline">|</span>

      {/* Nome do módulo atual */}
      {currentModule && (
        <span
          className="text-[12px] font-semibold text-slate-300 tracking-tight whitespace-nowrap hidden lg:inline"
          aria-label={`Módulo atual: ${currentModule.label}`}
        >
          {currentModule.label}
        </span>
      )}

      {/* Filtros globais — só aparecem em páginas que os suportam */}
      {(supportsCandidate || supportsPeriod) && (
        <>
          <span className="text-white/[0.10] select-none hidden xl:inline mx-1">·</span>

          {supportsCandidate && candidates.length > 0 && (
            <div className="relative hidden sm:block shrink-0">
              <select
                value={candidate}
                onChange={(e) => {
                  const val = e.target.value;
                  setCandidate(val);
                  applyFilters(val, period);
                }}
                className={selectCls}
                aria-label="Filtrar por candidato"
                title="Candidato"
              >
                <option value="">Todos os Candidatos</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={10}
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
          )}

          {supportsPeriod && (
            <div className="relative hidden sm:block shrink-0">
              <select
                value={period}
                onChange={(e) => {
                  const val = e.target.value;
                  setPeriod(val);
                  applyFilters(candidate, val);
                }}
                className={selectCls}
                aria-label="Filtrar por período"
                title="Período"
              >
                {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={10}
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
          )}
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Botão de refresh compacto com timestamp */}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isPending}
        aria-label={`Última atualização às ${formattedTime}. Clique para atualizar.`}
        title={`Última atualização: ${formattedTime}`}
        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors shrink-0 hidden md:flex"
      >
        <RefreshCw
          size={11}
          className={isPending ? 'animate-spin text-cyan-400' : ''}
          aria-hidden="true"
        />
        <span className={isPending ? 'text-cyan-400' : ''}>
          {isPending ? 'Atualizando…' : formattedTime}
        </span>
      </button>
    </div>
  );
}
