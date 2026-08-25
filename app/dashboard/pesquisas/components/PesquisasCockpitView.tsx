'use client';

import { useState, useMemo } from 'react';
import type { ElectoralPoll, ElectoralPollResultWithPoll, PesquisasKpis, PesquisasFilters } from '@/lib/pesquisas/types';
import { calculateCockpitMetrics, getCandidateRanking, getInstituteComparisonPoints, getRaceCandidates } from '@/lib/pesquisas/cockpitAnalytics';
import { buildTemporalSeries } from '@/lib/pesquisas/results-repository';
import { calculateAnalyticalStatus, calculateScenarioSignals } from '@/lib/pesquisas/analyticsEngine';
import { isWithinPeriod, getPeriodAnchorDate } from '@/lib/pesquisas/periodFilter';
import { getObservedHistory } from '@/lib/pesquisas/observedHistory';

import { LineChart, AlertTriangle, ExternalLink } from 'lucide-react';
import CollectButton from '../CollectButton';
import { PesquisasFilterBar } from './PesquisasFilterBar';
import { ResumoEleitoral } from './ResumoEleitoral';
import { DiagnosticoPolitix } from './DiagnosticoPolitix';
import { CenarioEleitoralChart } from './CenarioEleitoralChart';
import { EvolucaoCandidatoChart } from './EvolucaoCandidatoChart';
import { RankingCandidatos } from './RankingCandidatos';
import { MovimentoEleitoral } from './MovimentoEleitoral';
import { GapEleitoral } from './GapEleitoral';
import { SegundoTurnoSection } from './SegundoTurnoSection';
import { SinaisCenarioCard } from './SinaisCenarioCard';
import { HistoricoDasPesquisas } from './HistoricoDasPesquisas';
import { CoberturaDosDados } from './CoberturaDosDados';
import { ComparacaoInstitutos } from './ComparacaoInstitutos';
import { PerfilAmostralCard } from './PerfilAmostralCard';
import { IntencaoPorPerfilPlaceholder } from './IntencaoPorPerfilPlaceholder';

import { PesquisasListView } from './PesquisasListView';
import { PesquisasComparativoView } from './PesquisasComparativoView';

/**
 * Sprint 2B, P0.1 — contrato do candidato do CONTEXTO GLOBAL do PolitixOS,
 * resolvido no servidor (app/dashboard/pesquisas/page.tsx) a partir de
 * lib/filters/global.ts (mesmo contrato que Visão Geral/Notícias/Instagram/X
 * já usam — nenhum estado global novo). `uf`/`cargo` vêm de
 * `targets.state`/`targets.poll_monitoring_office` quando configurados —
 * sem eles não dá para saber a que corrida o candidato pertence.
 */
export interface GlobalCandidateContext {
  candidateName: string;
  uf: string | null;
  cargo: string | null;
}

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
  globalCandidate: GlobalCandidateContext | null;
}

// Verifica se um resultado corresponde ao cargo selecionado (priorizando r.office). Função pura,
// sem dependência de estado do componente — hoisted para poder ser reaproveitada tanto no render
// quanto na resolução do estado inicial de filtros (Sprint 2B, P0.1).
function matchesCargo(r: ElectoralPollResultWithPoll, targetCargo?: string | null): boolean {
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

/**
 * Sprint 2B, P0.1 — resolve o estado inicial dos filtros a partir do
 * candidato do contexto global, sincronamente (sem efeito/re-render extra):
 *
 * CASO A: candidato global presente → semeia MODO CANDIDATO, na corrida
 *   (uf/cargo) do próprio candidato quando conhecida (`targets.state`/
 *   `poll_monitoring_office`) — sem isso, "abrir em modo Cleitinho" seria
 *   inútil sempre que ele não pertencesse à corrida padrão (DF/Governador).
 * CASO B: sem candidato global → comportamento de sempre (Todos os
 *   Candidatos, DF/Governador).
 * CASO C: candidato global não aparece em nenhum resultado da corrida
 *   resolvida (uf/cargo sem state/office no target, ou candidato realmente
 *   sem resultado ali) → cai para Todos os Candidatos, nunca deixa um nome
 *   "fantasma" selecionado. Checado aqui (não em useEffect) porque
 *   `allResults` já está disponível nas props no momento em que o estado é
 *   inicializado — evita o padrão de setState-dentro-de-effect.
 */
export function buildInitialFilters(
  globalCandidate: GlobalCandidateContext | null,
  allResults: ElectoralPollResultWithPoll[]
): PesquisasFilters {
  if (!globalCandidate) return DEFAULT_FILTERS;

  const base: PesquisasFilters = {
    ...DEFAULT_FILTERS,
    uf: globalCandidate.uf ?? DEFAULT_FILTERS.uf,
    cargo: globalCandidate.cargo ?? DEFAULT_FILTERS.cargo,
    candidateNames: [globalCandidate.candidateName],
  };

  const matchingResults = allResults.filter((r) => {
    if (!r.poll) return false;
    if (base.uf && r.poll.uf !== base.uf && r.poll.abrangencia !== base.uf) return false;
    return matchesCargo(r, base.cargo);
  });
  const candidatesInRace = getRaceCandidates(matchingResults);
  const isPresent = candidatesInRace.some((c) => c.toLowerCase() === globalCandidate.candidateName.toLowerCase());

  return isPresent ? base : { ...base, candidateNames: null };
}

export function PesquisasCockpitView({
  registeredPolls,
  allResults,
  filterOptions,
  kpis,
  source,
  isAdmin,
  globalCandidate,
}: Props) {
  const isBlocked = kpis.sourceStatus === 'BLOCKED_BY_SOURCE_ACCESS';
  const neverRun = kpis.sourceStatus === 'NEVER_RUN';

  const [activeTab, setActiveTab] = useState<'cockpit' | 'lista' | 'comparativo'>('cockpit');

  const [filters, setFilters] = useState<PesquisasFilters>(() => buildInitialFilters(globalCandidate, allResults));

  const handleResetDefault = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Derive reference candidate from candidate filter popover — null = MODO A (Todos os Candidatos).
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
      if (!isWithinPeriod(getPeriodAnchorDate(p), filters.period)) return false;
      return true;
    });
  }, [registeredPolls, filters.uf, filters.cargo, filters.instituto, filters.period]);

  // Filter results matching dynamic filters (NÃO remover concorrentes ao selecionar um candidato)
  const filteredResults = useMemo(() => {
    return allResults.filter((r) => {
      if (filters.turno && r.turno !== filters.turno) return false;
      if (filters.tipoPergunta && r.tipoPergunta !== filters.tipoPergunta) return false;
      if (!matchesCargo(r, filters.cargo)) return false;

      if (r.poll) {
        if (filters.uf && r.poll.uf !== filters.uf && r.poll.abrangencia !== filters.uf) return false;
        if (filters.instituto && r.poll.instituto !== filters.instituto) return false;
        if (!isWithinPeriod(getPeriodAnchorDate(r.poll), filters.period)) return false;
      }
      return true;
    });
  }, [allResults, filters.turno, filters.tipoPergunta, filters.uf, filters.cargo, filters.instituto, filters.period]);

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

  // Temporal series built via canonical buildTemporalSeries — matemática intocada.
  const temporalSeries = useMemo(() => {
    return buildTemporalSeries(priorityPollsForRace);
  }, [priorityPollsForRace]);

  // Candidate ranking for active result poll
  const rankingData = useMemo(() => {
    return getCandidateRanking(filteredResults, latestResultPoll?.id);
  }, [filteredResults, latestResultPoll]);

  // Operational analytical status (Estável / Atenção / Crítico / Inconclusivo)
  const analyticalStatus = useMemo(() => {
    return calculateAnalyticalStatus(rankingData, metrics, referenceCandidate);
  }, [rankingData, metrics, referenceCandidate]);

  // Scenario signals & alerts
  const scenarioSignals = useMemo(() => {
    return calculateScenarioSignals(metrics, temporalSeries, rankingData);
  }, [metrics, temporalSeries, rankingData]);

  const activeRaceLabel = `${filters.cargo ?? 'Governador'} — ${filters.uf ?? 'DF'}`;

  // Sujeito do Diagnóstico/Resumo/Evolução: o candidato selecionado no filtro, ou — em MODO A
  // (Todos os Candidatos) — o líder da pesquisa de referência. HISTÓRICO OBSERVADO fica sempre
  // escopado a esse sujeito (nunca mistura a faixa observada de um candidato com a de outro).
  const diagnosticSubject = referenceCandidate ?? metrics.intencaoMaisRecente?.candidateName ?? null;
  const observedHistory = useMemo(
    () => getObservedHistory(filteredResults, diagnosticSubject),
    [filteredResults, diagnosticSubject]
  );

  const resultsPollIds = useMemo(() => new Set(filteredResults.map((r) => r.pollId)), [filteredResults]);

  // Institute comparison points
  const instituteComparisonPoints = useMemo(() => {
    return getInstituteComparisonPoints(filteredResults);
  }, [filteredResults]);

  return (
    <div className="space-y-4 pb-16">
      {/* BLOCO 1 — Cabeçalho Ultra-Compacto */}
      <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3">
        <LineChart size={14} className="text-cyan-400 shrink-0" />
        <div className="leading-none">
          <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">Cockpit de Pesquisas</h1>
          <p className="text-[9px] text-slate-500 mt-0.5">Inteligência eleitoral baseada em levantamentos oficiais.</p>
        </div>
        <span className="h-3 w-px bg-white/[0.12] shrink-0" />
        <span className="text-[11px] font-bold text-cyan-300 leading-none">{activeRaceLabel}</span>
        {referenceCandidate && <span className="text-[10px] text-slate-500 leading-none hidden sm:inline">· {referenceCandidate}</span>}
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

      {/* BLOCO 2 — Barra de Filtros Dinâmicos Encadeados */}
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
          {/* BLOCO 3 — Resumo Eleitoral (MODO A ou B, conforme referenceCandidate) */}
          <ResumoEleitoral
            metrics={metrics}
            observedHistory={observedHistory}
            analyticalStatus={analyticalStatus}
            referenceCandidate={referenceCandidate}
          />

          {/* BLOCO 4 — Diagnóstico Politix (FATO / INTERPRETAÇÃO, 100% determinístico) */}
          <DiagnosticoPolitix metrics={metrics} observedHistory={observedHistory} raceLabel={activeRaceLabel} />

          {/* BLOCO 5 (2/3) — Evolução Eleitoral + BLOCO 8 (1/3) — Corrida Eleitoral / Ranking */}
          {/* items-start: conteúdo naturalmente assimétrico (gráfico de altura fixa vs. tabela de
              ranking que cresce com o nº de candidatos) — alinhamento superior evita esticar um
              card menor até virar espaço vazio artificial, sem forçar altura igual onde o conteúdo
              não é comparável em volume. */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2">
              {referenceCandidate ? (
                <EvolucaoCandidatoChart
                  candidateName={referenceCandidate}
                  observedHistory={observedHistory}
                  temporalSeries={temporalSeries}
                />
              ) : (
                <CenarioEleitoralChart results={filteredResults} referenceCandidate={referenceCandidate} />
              )}
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

          {/* BLOCO 6 — Movimento Eleitoral / BLOCO 7 — Gap Eleitoral / Sinais do Cenário */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MovimentoEleitoral metrics={metrics} />
            <GapEleitoral metrics={metrics} temporalSeries={temporalSeries} />
            <SinaisCenarioCard signals={scenarioSignals} />
          </div>

          {/* BLOCO 9 — Histórico das Pesquisas / Segundo Turno */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HistoricoDasPesquisas
              polls={priorityPollsForRace}
              latestPoll={latestResultPoll}
              onNavigateToLista={() => setActiveTab('lista')}
              referenceCandidate={referenceCandidate}
            />
            <SegundoTurnoSection results={filteredResults} />
          </div>

          {/* BLOCO 10 — Cobertura dos Dados */}
          <CoberturaDosDados
            registeredPolls={filteredRegisteredPolls}
            resultsPollIds={resultsPollIds}
            metrics={metrics}
            temporalSeries={temporalSeries}
          />

          {/* BLOCO 11 — Comparação Entre Institutos (matemática intocada) */}
          <ComparacaoInstitutos comparisonPoints={instituteComparisonPoints} />

          {/* BLOCO 12 — Metodologia (camada inferior, sem protagonismo) */}
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
