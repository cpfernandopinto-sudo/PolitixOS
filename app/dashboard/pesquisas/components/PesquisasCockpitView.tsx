'use client';

import { useState, useMemo } from 'react';
import type { ElectoralPoll, ElectoralPollResultWithPoll, PesquisasKpis, PesquisasFilters } from '@/lib/pesquisas/types';
import { calculateCockpitMetrics, getCandidateRanking, getInstituteComparisonPoints } from '@/lib/pesquisas/cockpitAnalytics';

import { LineChart, AlertTriangle, ExternalLink } from 'lucide-react';
import CollectButton from '../CollectButton';
import { PesquisasFilterBar } from './PesquisasFilterBar';
import { ExecutiveKpiCards } from './ExecutiveKpiCards';
import { SegundoTurnoToggle } from './SegundoTurnoToggle';
import { EvolucaoTemporalChart } from './EvolucaoTemporalChart';
import { RankingCandidatos } from './RankingCandidatos';
import { ComparacaoInstitutos } from './ComparacaoInstitutos';
import { PerfilAmostralCard } from './PerfilAmostralCard';
import { IntencaoPorPerfilPlaceholder } from './IntencaoPorPerfilPlaceholder';
import { ListaPesquisasRecentes } from './ListaPesquisasRecentes';

interface Props {
  initialPolls: ElectoralPoll[];
  initialResults: ElectoralPollResultWithPoll[];
  kpis: PesquisasKpis;
  source: { portalUrl: string; sourceUrl: string };
  filterOptions: {
    ufs: string[];
    cargos: string[];
    institutos: string[];
  };
  isAdmin: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Nunca executado';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function PesquisasCockpitView({
  initialPolls,
  initialResults,
  kpis,
  source,
  filterOptions,
  isAdmin,
}: Props) {
  const isBlocked = kpis.sourceStatus === 'BLOCKED_BY_SOURCE_ACCESS';
  const neverRun = kpis.sourceStatus === 'NEVER_RUN';

  // Default filters prioritizes Brasilia presentation (P0: DF - Governador)
  const [filters, setFilters] = useState<PesquisasFilters>({
    uf: 'DF',
    cargo: 'Governador',
    period: null,
    instituto: null,
    turno: 1,
    tipoPergunta: 'estimulada',
    candidateNames: null,
  });

  // Filter polls according to active filters
  const filteredPolls = useMemo(() => {
    return initialPolls.filter((p) => {
      if (filters.uf && p.uf !== filters.uf && p.abrangencia !== filters.uf) return false;
      if (filters.cargo && p.cargo && !p.cargo.toLowerCase().includes(filters.cargo.toLowerCase())) return false;
      if (filters.instituto && p.instituto !== filters.instituto) return false;
      return true;
    });
  }, [initialPolls, filters.uf, filters.cargo, filters.instituto]);

  // Filter results according to active filters
  const filteredResults = useMemo(() => {
    return initialResults.filter((r) => {
      if (filters.turno && r.turno !== filters.turno) return false;
      if (filters.tipoPergunta && r.tipoPergunta !== filters.tipoPergunta) return false;

      if (filters.candidateNames && filters.candidateNames.length > 0) {
        if (!filters.candidateNames.includes(r.candidateName)) return false;
      }

      if (r.poll) {
        if (filters.uf && r.poll.uf !== filters.uf && r.poll.abrangencia !== filters.uf) return false;
        if (filters.cargo && r.poll.cargo && !r.poll.cargo.toLowerCase().includes(filters.cargo.toLowerCase())) return false;
        if (filters.instituto && r.poll.instituto !== filters.instituto) return false;
      }
      return true;
    });
  }, [initialResults, filters]);

  // Available candidate names for multi-select
  const availableCandidates = useMemo(() => {
    const set = new Set<string>();
    for (const r of initialResults) {
      if (r.candidateName) set.add(r.candidateName);
    }
    return Array.from(set).sort();
  }, [initialResults]);

  // Calculate executive metrics
  const metrics = useMemo(() => {
    return calculateCockpitMetrics(filteredPolls, filteredResults);
  }, [filteredPolls, filteredResults]);

  // Active poll for methodology profile
  const activePoll = useMemo(() => {
    if (filteredPolls.length > 0) return filteredPolls[0];
    return null;
  }, [filteredPolls]);

  // Candidate ranking for active scenario
  const candidateRanking = useMemo(() => {
    return getCandidateRanking(filteredResults, activePoll?.id);
  }, [filteredResults, activePoll]);

  // Institute comparison points
  const instituteComparisonPoints = useMemo(() => {
    return getInstituteComparisonPoints(filteredResults);
  }, [filteredResults]);

  return (
    <div className="space-y-6 pb-16">
      {/* Cabeçalho Executivo */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <LineChart size={28} className="text-blue-500" />
            Cockpit Executivo de Pesquisas Eleitorais
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Monitoramento de Inteligência Política — Prioridade Brasília / DF (Governador, Presidente & MG).
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>
              Fonte oficial: <a href={source.portalUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">TSE / PesqEle <ExternalLink size={11} /></a>
            </span>
            <span className="text-gray-700">•</span>
            <span>Última verificação: {formatDate(kpis.lastSyncAt)}</span>
          </div>
        </div>
        {isAdmin && <CollectButton />}
      </div>

      {/* Aviso de Fonte Indisponível (quando aplicável) */}
      {(isBlocked || neverRun) && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3.5">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-300 font-semibold">
              {neverRun ? 'Coleta ainda não executada' : 'Fonte oficial indisponível'}
            </p>
            <p className="text-amber-200/70 text-xs mt-1">
              {neverRun
                ? 'Nenhuma execução do coletor foi registrada ainda. Use "Verificar fonte oficial" para tentar.'
                : 'O Portal de Dados Abertos do TSE (dadosabertos.tse.jus.br) não respondeu à última tentativa de coleta. Os números abaixo refletem o que já está no banco.'}
            </p>
          </div>
        </div>
      )}

      {/* Barra de Filtros Executiva (Default DF / Governador) */}
      <PesquisasFilterBar
        filters={filters}
        onChange={setFilters}
        availableUfs={filterOptions.ufs}
        availableCargos={filterOptions.cargos}
        availableInstitutos={filterOptions.institutos}
        availableCandidates={availableCandidates}
      />

      {/* Alternador de Turno (1º Turno vs 2º Turno) */}
      <SegundoTurnoToggle
        turno={filters.turno ?? 1}
        onChange={(t) => setFilters({ ...filters, turno: t })}
      />

      {/* Grid de Cards Executivos */}
      <ExecutiveKpiCards metrics={metrics} />

      {/* Grid de Análise Temporal & Ranking (7/12 e 5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <EvolucaoTemporalChart
            results={filteredResults}
            hasSufficientSeries={metrics.hasSufficientSeries}
          />
        </div>
        <div className="lg:col-span-5">
          <RankingCandidatos
            ranking={candidateRanking}
            pollInstituto={activePoll?.instituto}
            pollDate={activePoll?.dataRegistro}
          />
        </div>
      </div>

      {/* Comparação entre Institutos */}
      <ComparacaoInstitutos comparisonPoints={instituteComparisonPoints} />

      {/* Perfil Metodológico da Amostra (Pesquisa Ativa) */}
      <PerfilAmostralCard poll={activePoll} />

      {/* Placeholder de Contrato para Intenção por Perfil (Crosstabs) */}
      <IntencaoPorPerfilPlaceholder />

      {/* Lista de Pesquisas Registradas */}
      <ListaPesquisasRecentes polls={filteredPolls} />
    </div>
  );
}
