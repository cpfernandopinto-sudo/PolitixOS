'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
  Building2, Users2, Calendar, Database, 
  Sparkles, RefreshCw, ChevronDown, Compass
} from 'lucide-react';
import { findCurrentNavItem } from '@/lib/navigation/dashboardNavigation';
import type { DataSourceMode } from '@/lib/territorios/types';

export interface CandidateOption {
  id: string;
  name: string;
  party?: string;
}

interface Props {
  candidates?: CandidateOption[];
  generatedAt?: string;
}

const PAGES_WITH_CANDIDATE = ['/dashboard/candidatos', '/dashboard/overview'];
const PAGES_WITH_PERIOD = ['/dashboard/overview', '/dashboard/territorios', '/dashboard/noticias', '/dashboard/instagram', '/dashboard/x'];

const PERIOD_OPTIONS = [
  { value: '2024-R12', label: 'Últimos 12 meses (R12)', type: 'R12' },
  { value: '2024-YTD', label: 'Acumulado 2024 (YTD)', type: 'YTD' },
  { value: '2023-FULL', label: 'Ano Consolidado 2023', type: 'ANO' },
  { value: '2022-CENSO', label: 'Censo Demográfico 2022', type: 'CENSO' },
];

function normalizeIncomingPeriod(raw: string | null): string {
  if (!raw) return '2024-R12';
  const upper = raw.toUpperCase();
  if (upper.includes('12M') || upper.includes('R12')) return '2024-R12';
  if (upper.includes('YTD') || upper === '2024') return '2024-YTD';
  if (upper === '2023') return '2023-FULL';
  if (upper === '2022' || upper.includes('CENSO')) return '2022-CENSO';
  return '2024-R12';
}

const SELECT_CLASS =
  'bg-[#0B0F19] border border-white/[0.08] text-white text-[11px] font-semibold rounded-md ' +
  'pl-2.5 pr-6 h-7 focus:outline-none focus:border-cyan-400/50 hover:border-white/[0.18] ' +
  'transition-colors cursor-pointer shrink-0';

const KNOWN_MUNICIPALITIES: Record<string, { cityName: string; uf: string }> = {
  '3118601': { cityName: 'Contagem', uf: 'MG' },
  '3106200': { cityName: 'Belo Horizonte', uf: 'MG' },
  '3106705': { cityName: 'Betim', uf: 'MG' },
};

export default function GlobalContextBar({ candidates, generatedAt }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentModule = findCurrentNavItem(pathname);
  const supportsCandidate = PAGES_WITH_CANDIDATE.some((p: string) => pathname.startsWith(p));
  const supportsPeriod = PAGES_WITH_PERIOD.some((p: string) => pathname.startsWith(p));

  const isTerritory = pathname.startsWith('/dashboard/territorios');
  const ibgeMatch = pathname.match(/\/territorios\/(\d+)/);
  const ibgeCode = ibgeMatch ? ibgeMatch[1] : null;

  // Resolve territory header context dynamically without mandatory demo fixture
  const known = ibgeCode ? KNOWN_MUNICIPALITIES[ibgeCode] : null;
  const dossierHeader = isTerritory && ibgeCode ? {
    cityName: known?.cityName ?? `Município (${ibgeCode})`,
    uf: known?.uf ?? 'MG',
    ibgeCode,
    lastUpdated: generatedAt ?? new Date().toISOString(),
    isDemo: ibgeCode === '3118601',
    coverage: {
      ibge: 'real' as DataSourceMode,
      security: ibgeCode === '3118601' || ibgeCode === '3106200' || ibgeCode === '3106705' ? 'real' as DataSourceMode : 'unavailable' as DataSourceMode,
      health: 'partial' as DataSourceMode,
      electoral: 'real' as DataSourceMode,
      economy: ibgeCode === '3118601' || ibgeCode === '3106200' || ibgeCode === '3106705' ? 'real' as DataSourceMode : 'unavailable' as DataSourceMode,
    },
  } : null;

  // Ler candidato atual da URL (normalizar formatos)
  const rawCandidate = searchParams.get('candidate') ?? searchParams.get('candidateId') ?? '';
  const rawPeriod = normalizeIncomingPeriod(
    searchParams.get('period') ?? searchParams.get('startDate') ?? null
  );

  const [candidate, setCandidate] = useState(rawCandidate);
  const [period, setPeriod] = useState(rawPeriod);

  const [syncKey, setSyncKey] = useState(`${pathname}?${searchParams.toString()}`);
  const currentSyncKey = `${pathname}?${searchParams.toString()}`;
  if (syncKey !== currentSyncKey) {
    setSyncKey(currentSyncKey);
    setCandidate(searchParams.get('candidate') ?? searchParams.get('candidateId') ?? '');
    setPeriod(normalizeIncomingPeriod(searchParams.get('period') ?? searchParams.get('startDate') ?? null));
  }

  const handleCandidateChange = (newCandidateId: string) => {
    setCandidate(newCandidateId);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newCandidateId) {
        params.set('candidate', newCandidateId);
        params.delete('candidateId');
      } else {
        params.delete('candidate');
        params.delete('candidateId');
      }
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPeriod) {
        params.set('period', newPeriod);
        params.delete('startDate');
        params.delete('endDate');
      } else {
        params.delete('period');
      }
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="h-10 bg-[#0E1526]/90 border-b border-white/[0.08] px-4 md:px-6 flex items-center justify-between gap-4 text-xs font-mono select-none backdrop-blur-md sticky top-0 z-30">
      {/* Esquerda: Identificador do Módulo / Território */}
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0">
          {isTerritory ? (
            <Compass size={14} className="text-cyan-400" />
          ) : (
            <Building2 size={14} className="text-cyan-400" />
          )}
          <span className="font-bold text-white tracking-wide uppercase text-[11px]">
            {isTerritory ? 'Politix Territórios' : currentModule?.label ?? 'PolitixOS'}
          </span>
        </div>

        {dossierHeader && (
          <div className="flex items-center gap-2.5 border-l border-white/10 pl-3 overflow-hidden">
            <span className="font-bold text-cyan-300 truncate text-[11px]">
              {dossierHeader.cityName} <span className="text-slate-500 font-medium">— {dossierHeader.uf}</span>
            </span>
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400">
              <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10">IBGE: {dossierHeader.ibgeCode}</span>
            </div>
          </div>
        )}
      </div>

      {/* Direita: Controles / Badges de Disponibilidade */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Candidatos Selector */}
        {supportsCandidate && candidates && candidates.length > 0 && (
          <div className="relative flex items-center">
            <Users2 size={12} className="absolute left-2.5 text-slate-400 pointer-events-none z-10" />
            <select
              value={candidate}
              onChange={(e) => handleCandidateChange(e.target.value)}
              disabled={isPending}
              className={`${SELECT_CLASS} pl-7`}
            >
              <option value="">Todos os Candidatos</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.party ? `(${c.party})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 text-slate-400 pointer-events-none z-10" />
          </div>
        )}

        {/* Período Selector */}
        {supportsPeriod && (
          <div className="relative flex items-center">
            <Calendar size={12} className="absolute left-2.5 text-slate-400 pointer-events-none z-10" />
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              disabled={isPending}
              className={`${SELECT_CLASS} pl-7`}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 text-slate-400 pointer-events-none z-10" />
          </div>
        )}

        {/* Coverage Badges */}
        {dossierHeader && (
          <div className="flex items-center gap-2">
            {dossierHeader.isDemo && (
              <span className="px-1.5 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={9} /> DEMO
              </span>
            )}
            <div className="hidden md:flex items-center gap-1 border-l border-white/10 pl-2">
              <CoverageBadge label="IBGE" status={dossierHeader.coverage.ibge} />
              <CoverageBadge label="Seg." status={dossierHeader.coverage.security} />
              <CoverageBadge label="Saúde" status={dossierHeader.coverage.health} />
              <CoverageBadge label="TSE" status={dossierHeader.coverage.electoral} />
              <CoverageBadge label="Econ." status={dossierHeader.coverage.economy} />
            </div>
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-[10px] font-semibold text-slate-300 transition-colors uppercase tracking-widest ml-1 disabled:opacity-40"
            >
              <RefreshCw size={10} className={`${isPending ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
              <span className={isPending ? 'text-cyan-400' : ''}>{isPending ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CoverageBadge({ label, status }: { label: string; status: DataSourceMode }) {
  const isDemo = status === 'demo';
  const isAvailable = status === 'real';

  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-widest uppercase border ${
        isAvailable
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : isDemo
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          : 'bg-slate-500/10 text-slate-400 border-white/5'
      }`}
      title={isDemo ? 'Fonte Demonstrativa (Fixture)' : isAvailable ? 'Fonte Real Oficial' : 'Indisponível'}
    >
      <Database size={8} className="opacity-70" />
      {label}
    </div>
  );
}
