'use client';

import { useState, useMemo } from 'react';
import type { ElectoralPoll, ElectoralPollResultWithPoll, PesquisasKpis, PesquisasFilters } from '@/lib/pesquisas/types';
import { calculateCockpitMetrics, getCandidateRanking, getInstituteComparisonPoints, getRaceCandidates } from '@/lib/pesquisas/cockpitAnalytics';
import { buildTemporalSeries } from '@/lib/pesquisas/results-repository';
import { calculateAnalyticalStatus, calculateScenarioSignals, generatePolitixInsight } from '@/lib/pesquisas/analyticsEngine';

import { LineChart, AlertTriangle, ExternalLink } from 'lucide-react';
import CollectButton from '../CollectButton';
import { PesquisasFilterBar } from './PesquisasFilterBar';
import { ExecutiveSnapshotCards } from './ExecutiveSnapshotCards';
import { IndicadoresMovimentoCards } from './IndicadoresMovimentoCards';
import { PolitixAiCard } from './PolitixAiCard';
import { CenarioEleitoralChart } from './CenarioEleitoralChart';
import { RankingCandidatos } from './RankingCandidatos';
import { SegundoTurnoSection } from './SegundoTurnoSection';
import { EvolucaoTemporalChart } from './EvolucaoTemporalChart';
import { EvolucaoGapChart } from './EvolucaoGapChart';
import { SinaisCenarioCard } from './SinaisCenarioCard';
import { ComparacaoInstitutos } from './ComparacaoInstitutos';
import { PerfilAmostralCard } from './PerfilAmostralCard';
import { IntencaoPorPerfilPlaceholder } from './IntencaoPorPerfilPlaceholder';
import { PesquisasExplicamCenario } from './PesquisasExplicamCenario';

import { PesquisasListView } from './PesquisasListView';
import { PesquisasComparativoView } from './PesquisasComparativoView';

interface Props {
  registeredPolls: ElectoralPoll[];
  allResults: ElectoralPollResultWithPoll[];
  filterOptions: {
    ufs: string[];
    cargos: string[];
    institutos: string[];
  };
  kpis: PesquisasKpis;
  source: { portalUrl: string; sourceUrl: string };
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

const DEFAULT_FILTERS: PesquisasFilters = {
  uf: 'DF',
  cargo: 'Governador',
  period: 'all',
  instituto: null,
  turno: 1,
  tipoPergunta: 'estimulada',
  candidateNames: null,
};

export function PesquisasCockpitView({
  registeredPolls,
  allResults,
  filterOptions,
  kpis,
  source,
  isAdmin,
}: Props) {
  const isBlocked = kpis.sourceStatus === 'BLOCKED_BY_SOURCE_ACCESS';
  const neverRun = kpis.sourceStatus === 'NEVER_RUN';

  const [activeTab, setActiveTab] = useState<'cockpit' | 'lista' | 'comparativo'>('cockpit');

  const [filters, setFilters] = useState<PesquisasFilters>(DEFAULT_FILTERS);

  const handleResetDefault = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Derive reference candidate from candidate filter popover
  const referenceCandidate = useMemo(() => {
    if (filters.candidateNames && filters.candidateNames.length > 0) {
      return filters.candidateNames[0];
    }
    return null;
  }, [filters.candidateNames]);

  // Filter registered polls matching dynamic filters
  const filteredRegisteredPolls = useMemo(() => {
    return registeredPolls.filter((p) => {
      if (filters.uf && p.uf !== filters.uf && p.abrangencia !== filters.uf) return false;
      if (filters.cargo && p.cargo && !p.cargo.toLowerCase().includes(filters.cargo.toLowerCase())) return false;
      if (filters.instituto && p.instituto !== filters.instituto) return false;
      return true;
    });
  }, [registeredPolls, filters.uf, filters.cargo, filters.instituto]);

  // Helper para verificar se um resultado corresponde ao cargo selecionado (priorizando r.office)
  const matchesCargo = (r: ElectoralPollResultWithPoll, targetCargo?: string | null) => {
    if (!targetCargo) return true;
    const target = targetCargo.toLowerCase().trim();
    if (r.office) {
      const resOffice = r.office.toLowerCase().trim();
      return resOffice.includes(target) || target.includes(resOffice);
    }
    if (r.poll?.cargo) {
      return r.poll.cargo.toLowerCase().includes(target);
    }
    return true;
  };

  // Filter results matching dynamic filters (NÃO remover concorrentes ao selecionar um candidato)
  const filteredResults = useMemo(() => {
    return allResults.filter((r) => {
      if (filters.turno && r.turno !== filters.turno) return false;
      if (filters.tipoPergunta && r.tipoPergunta !== filters.tipoPergunta) return false;
      if (!matchesCargo(r, filters.cargo)) return false;

      if (r.poll) {
        if (filters.uf && r.poll.uf !== filters.uf && r.poll.abrangencia !== filters.uf) return false;
        if (filters.instituto && r.poll.instituto !== filters.instituto) return false;
      }
      return true;
    });
  }, [allResults, filters.turno, filters.tipoPergunta, filters.uf, filters.cargo, filters.instituto]);

  // Candidate names list for candidate filter popover (real candidates only for active UF + Cargo)
  const availableCandidates = useMemo(() => {
    const matchingResults = allResults.filter((r) => {
      if (!r.poll) return false;
      if (filters.uf && r.poll.uf !== filters.uf && r.poll.abrangencia !== filters.uf) return false;
      if (!matchesCargo(r, filters.cargo)) return false;
      return true;
    });
    return getRaceCandidates(matchingResults);
  }, [allResults, filters.uf, filters.cargo]);

  // Single context contract: latestResultPoll = poll with verified results for active slice
  const latestResultPoll = useMemo(() => {
    if (filteredResults.length > 0 && filteredResults[0].poll) return filteredResults[0].poll;
    if (filteredRegisteredPolls.length > 0) return filteredRegisteredPolls[0];
    return null;
  }, [filteredResults, filteredRegisteredPolls]);

  // Priority polls derived dynamically for active UF + Cargo
  const priorityPollsForRace = useMemo(() => {
    const pollMap = new Map<string, ElectoralPoll>();
    const resMap = new Map<string, ElectoralPollResultWithPoll[]>();

    for (const r of filteredResults) {
      if (r.poll) {
        pollMap.set(r.poll.id, r.poll);
        const list = resMap.get(r.poll.id) ?? [];
        list.push(r);
        resMap.set(r.poll.id, list);
      }
    }

    return Array.from(pollMap.values())
      .map((p) => ({ ...p, results: resMap.get(p.id) ?? [] }))
      .sort((a, b) => (b.dataRegistro ?? '').localeCompare(a.dataRegistro ?? ''));
  }, [filteredResults]);

  // Calculate executive KPI metrics passing referenceCandidate
  const metrics = useMemo(() => {
    return calculateCockpitMetrics(filteredRegisteredPolls, filteredResults, referenceCandidate);
  }, [filteredRegisteredPolls, filteredResults, referenceCandidate]);

  // Temporal series built via canonical buildTemporalSeries
  const temporalSeries = useMemo(() => {
    return buildTemporalSeries(priorityPollsForRace);
  }, [priorityPollsForRace]);

  // Candidate ranking for active result poll
  const rankingData = useMemo(() => {
    return getCandidateRanking(filteredResults, latestResultPoll?.id);
  }, [filteredResults, latestResultPoll]);

  // Operational analytical status (Estável / Atenção / Crítico)
  const analyticalStatus = useMemo(() => {
    return calculateAnalyticalStatus(rankingData, metrics, referenceCandidate);
  }, [rankingData, metrics, referenceCandidate]);

  // Scenario signals & alerts
  const scenarioSignals = useMemo(() => {
    return calculateScenarioSignals(metrics, temporalSeries, rankingData);
  }, [metrics, temporalSeries, rankingData]);

  // Politix AI Insight synthesis
  const activeRaceLabel = `${filters.cargo ?? 'Governador'} — ${filters.uf ?? 'DF'}`;
  const politixInsight = useMemo(() => {
    return generatePolitixInsight(activeRaceLabel, metrics, latestResultPoll, temporalSeries, rankingData);
  }, [activeRaceLabel, metrics, latestResultPoll, temporalSeries, rankingData]);

  // Institute comparison points
  const instituteComparisonPoints = useMemo(() => {
    return getInstituteComparisonPoints(filteredResults);
  }, [filteredResults]);

  return (
    <div className="space-y-4 pb-16">
      {/* Cabeçalho Ultra-Compacto */}
      <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3">
        <LineChart size={14} className="text-cyan-400 shrink-0" />
        <span className="text-[9px] font-bold uppercase tracking-[.2em] text-cyan-400 shrink-0 font-mono">Inteligência Eleitoral</span>
        <span className="h-3 w-px bg-white/[0.12] shrink-0" />
        <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">Cockpit de Pesquisas</h1>
        <span className="text-[10px] text-slate-500 leading-none hidden sm:inline">{activeRaceLabel}{referenceCandidate ? ` · ${referenceCandidate}` : ''}</span>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
            Fonte: <a href={source.portalUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">TSE <ExternalLink size={9} /></a>
            {' · '}{formatDate(kpis.lastSyncAt)}
          </span>
          {isAdmin && <CollectButton />}
        </div>
      </div>

      {/* Aviso de Fonte Indisponível (quando aplicável) */}
      {(isBlocked || neverRun) && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-amber-300 font-semibold">
              {neverRun ? 'Coleta ainda não executada' : 'Fonte oficial indisponível'}
            </p>
            <p className="text-amber-200/70 text-[11px] mt-0.5">
              {neverRun
                ? 'Nenhuma execução do coletor foi registrada ainda. Use "Verificar fonte oficial" para tentar.'
                : 'O Portal de Dados Abertos do TSE (dadosabertos.tse.jus.br) não respondeu à última tentativa de coleta. Os números abaixo refletem o que já está no banco.'}
            </p>
          </div>
        </div>
      )}

      {/* Barra de Filtros Dinâmicos Encadeados */}
      <PesquisasFilterBar
        filters={filters}
        onChange={setFilters}
        availableUfs={filterOptions.ufs}
        availableCargos={filterOptions.cargos}
        availableInstitutos={filterOptions.institutos}
        availableCandidates={availableCandidates}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onResetDefault={handleResetDefault}
      />

      {/* ABA 1: COCKPIT EXECUTIVO */}
      {activeTab === 'cockpit' && (
        <div className="space-y-4">
          {/* 1. Executive Snapshot Cards (8 KPIs Densos) */}
          <ExecutiveSnapshotCards metrics={metrics} statusResult={analyticalStatus} />

          {/* 2. Segunda Faixa: Indicadores de Movimento */}
          <IndicadoresMovimentoCards metrics={metrics} />

          {/* 3. Card Principal: Inteligência Politix IA (Síntese Curta Factual) */}
          <PolitixAiCard insight={politixInsight} raceLabel={activeRaceLabel} />

          {/* 4. GRADE DOS GRÁFICOS - LINHA 1 (2/3 Cenário Eleitoral + 1/3 Ranking) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <CenarioEleitoralChart results={filteredResults} referenceCandidate={referenceCandidate} />
            </div>
            <div className="lg:col-span-1">
              <RankingCandidatos
                realCandidates={rankingData.realCandidates}
                nonCandidates={rankingData.nonCandidates}
                cenarioLabel={latestResultPoll ? `${filters.cargo ?? latestResultPoll.cargo} — ${latestResultPoll.abrangencia ?? latestResultPoll.uf}` : null}
                pollInstituto={latestResultPoll?.instituto}
                pollDate={latestResultPoll?.dataRegistro}
                referenceCandidate={referenceCandidate}
              />
            </div>
          </div>

          {/* 5. GRADE DOS GRÁFICOS - LINHA 2 (2/3 Evolução Temporal + 1/3 Pesquisas Explicam) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <EvolucaoTemporalChart
                temporalSeries={temporalSeries}
                comparablePollsCount={metrics.pesquisasComparaveisCount}
              />
            </div>
            <div className="lg:col-span-1">
              <PesquisasExplicamCenario
                polls={priorityPollsForRace}
                latestPoll={latestResultPoll}
                onNavigateToLista={() => setActiveTab('lista')}
              />
            </div>
          </div>

          {/* 6. BLOCO TRIPLO - MESMA LINHA NO DESKTOP (3 Colunas: Gap, 2º Turno, Sinais) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EvolucaoGapChart temporalSeries={temporalSeries} />
            <SegundoTurnoSection results={filteredResults} />
            <SinaisCenarioCard signals={scenarioSignals} />
          </div>

          {/* 7. Comparação Entre Institutos */}
          <ComparacaoInstitutos comparisonPoints={instituteComparisonPoints} />

          {/* 8. Perfil da Amostra & Placeholder Crosstabs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PerfilAmostralCard poll={latestResultPoll} />
            <IntencaoPorPerfilPlaceholder />
          </div>
        </div>
      )}

      {/* ABA 2: BASE DE PESQUISAS (LISTA & TRIAGEM) */}
      {activeTab === 'lista' && (
        <PesquisasListView
          polls={filteredRegisteredPolls}
          allResults={allResults}
          kpis={kpis}
          activeCargo={filters.cargo}
        />
      )}

      {/* ABA 3: COMPARATIVO ENTRE INSTITUTOS */}
      {activeTab === 'comparativo' && (
        <PesquisasComparativoView results={filteredResults} referenceCandidate={referenceCandidate} />
      )}
    </div>
  );
}
