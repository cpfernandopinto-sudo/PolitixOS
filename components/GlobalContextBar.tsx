'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Building2, Users2, Calendar, Database,
  Sparkles, RefreshCw, ChevronDown, Compass, Check
} from 'lucide-react';
import { findCurrentNavItem } from '@/lib/navigation/dashboardNavigation';
import { findAppScreenByRoute } from '@/lib/navigation/appScreens';
import {
  parseGlobalFilters,
  serializeGlobalFilters,
  GLOBAL_PERIODS,
  GLOBAL_PERIOD_LABELS,
  type GlobalPeriod,
} from '@/lib/filters/global';
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

const SELECT_CLASS =
  'bg-[#0B0F19] border border-white/[0.08] text-white text-[11px] font-semibold rounded-md ' +
  'pl-2.5 pr-6 h-7 focus:outline-none focus:border-cyan-400/50 hover:border-white/[0.18] ' +
  'transition-colors cursor-pointer shrink-0';

const KNOWN_MUNICIPALITIES: Record<string, { cityName: string; uf: string }> = {
  '3118601': { cityName: 'Contagem', uf: 'MG' },
  '3106200': { cityName: 'Belo Horizonte', uf: 'MG' },
  '3106705': { cityName: 'Betim', uf: 'MG' },
};

/** Resumo textual do trigger — nunca deixa o botão crescer indefinidamente (PARTE 5). */
function candidateSummaryLabel(selectedIds: string[], candidates: CandidateOption[]): string {
  if (selectedIds.length === 0) return 'Todos os Candidatos';
  if (selectedIds.length === 1) {
    const c = candidates.find((c) => c.id === selectedIds[0]);
    return c?.name ?? '1 candidato selecionado';
  }
  if (selectedIds.length === 2) {
    const names = selectedIds
      .map((id) => candidates.find((c) => c.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    if (names.length === 2) return `${names[0]} + ${names[1]}`;
  }
  return `${selectedIds.length} candidatos selecionados`;
}

export default function GlobalContextBar({ candidates, generatedAt }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [candidateMenuOpen, setCandidateMenuOpen] = useState(false);
  const candidateMenuRef = useRef<HTMLDivElement>(null);

  const currentModule = findCurrentNavItem(pathname);
  const currentScreen = findAppScreenByRoute(pathname === '/dashboard' ? '/dashboard/overview' : pathname);
  const supportsCandidate = currentScreen?.supportsGlobalCandidate ?? false;
  const supportsPeriod = currentScreen?.supportsGlobalPeriod ?? false;

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

  const filters = parseGlobalFilters(searchParams);
  const urlCandidateIds = filters.candidateMode === 'SELECTED' ? filters.candidateIds : [];

  // BUG (UX-ACCESS-FILTERS-01C): `selectedCandidateIds` não pode ser derivado
  // diretamente de `searchParams` a cada render. `router.replace` (abaixo)
  // navega via App Router — a URL só reflete a seleção DEPOIS que o
  // round-trip de navegação (busca de RSC no servidor) termina. Um segundo
  // clique (ex.: marcar Michelle) que chegue antes desse round-trip terminar
  // lia `selectedCandidateIds` ainda vazio/desatualizado e SUBSTITUÍA a
  // seleção em vez de somar a ela — na prática só o último clique "vencia",
  // exatamente o comportamento de single-select relatado. Correção: estado
  // local otimista, atualizado de forma síncrona no clique, resincronizado a
  // partir da URL somente quando ela muda por uma causa EXTERNA (mesmo
  // padrão syncKey já usado antes desta reescrita para candidato único).
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(urlCandidateIds);
  const [candidateSyncKey, setCandidateSyncKey] = useState(`${pathname}?${searchParams.toString()}`);
  const currentCandidateSyncKey = `${pathname}?${searchParams.toString()}`;
  if (candidateSyncKey !== currentCandidateSyncKey) {
    setCandidateSyncKey(currentCandidateSyncKey);
    setSelectedCandidateIds(urlCandidateIds);
  }

  // Fecha o dropdown de candidatos ao clicar fora ou pressionar Escape.
  useEffect(() => {
    if (!candidateMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (candidateMenuRef.current && !candidateMenuRef.current.contains(e.target as Node)) {
        setCandidateMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setCandidateMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [candidateMenuOpen]);

  const updateFilters = (next: Partial<{ candidateIds: string[]; period: GlobalPeriod }>) => {
    const nextCandidateIds = next.candidateIds !== undefined ? next.candidateIds : selectedCandidateIds;
    // Atualização local SÍNCRONA (fora de startTransition) — é isto que faz
    // o próximo clique compor sobre esta seleção em vez de ler o estado
    // desatualizado da URL enquanto a navegação anterior ainda está em voo.
    if (next.candidateIds !== undefined) setSelectedCandidateIds(nextCandidateIds);

    startTransition(() => {
      const nextState = {
        candidateMode: nextCandidateIds.length > 0 ? ('SELECTED' as const) : ('ALL_ALLOWED' as const),
        candidateIds: nextCandidateIds,
        period: next.period ?? filters.period,
      };
      const params = serializeGlobalFilters(nextState, searchParams);
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const toggleCandidate = (id: string) => {
    const next = selectedCandidateIds.includes(id)
      ? selectedCandidateIds.filter((c) => c !== id)
      : [...selectedCandidateIds, id];
    updateFilters({ candidateIds: next });
  };

  const selectAllCandidates = () => updateFilters({ candidateIds: [] });

  const handlePeriodChange = (newPeriod: string) => {
    updateFilters({ period: newPeriod as GlobalPeriod });
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
        {/* Candidatos Selector — multi-select com checkbox */}
        {supportsCandidate && candidates && candidates.length > 0 && (
          <div className="relative flex items-center" ref={candidateMenuRef}>
            <button
              type="button"
              onClick={() => setCandidateMenuOpen((v) => !v)}
              disabled={isPending}
              aria-haspopup="listbox"
              aria-expanded={candidateMenuOpen}
              className={`${SELECT_CLASS} pl-7 pr-6 flex items-center max-w-[220px]`}
            >
              <Users2 size={12} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <span className="truncate">{candidateSummaryLabel(selectedCandidateIds, candidates)}</span>
              <ChevronDown size={12} className="absolute right-2 text-slate-400 pointer-events-none" />
            </button>

            {candidateMenuOpen && (
              <div
                role="listbox"
                aria-multiselectable="true"
                className="absolute right-0 top-full mt-1.5 w-64 max-h-80 overflow-y-auto bg-[#0E1526] border border-white/10 rounded-lg shadow-2xl z-40 py-1"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedCandidateIds.length === 0}
                  onClick={selectAllCandidates}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-white hover:bg-white/5 transition-colors border-b border-white/5"
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    selectedCandidateIds.length === 0 ? 'bg-cyan-400 border-cyan-400' : 'border-white/20'
                  }`}>
                    {selectedCandidateIds.length === 0 && <Check size={10} className="text-[#0B0F19]" />}
                  </span>
                  Todos os Candidatos
                </button>
                {candidates.map((c) => {
                  const checked = selectedCandidateIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onClick={() => toggleCandidate(c.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] text-slate-200 hover:bg-white/5 transition-colors"
                    >
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        checked ? 'bg-cyan-400 border-cyan-400' : 'border-white/20'
                      }`}>
                        {checked && <Check size={10} className="text-[#0B0F19]" />}
                      </span>
                      <span className="truncate">{c.name} {c.party ? `(${c.party})` : ''}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Período Selector */}
        {supportsPeriod && (
          <div className="relative flex items-center">
            <Calendar size={12} className="absolute left-2.5 text-slate-400 pointer-events-none z-10" />
            <select
              value={filters.period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              disabled={isPending}
              className={`${SELECT_CLASS} pl-7`}
            >
              {GLOBAL_PERIODS.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'Período: Todos' : GLOBAL_PERIOD_LABELS[value]}
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
