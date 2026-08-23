import { BarChart3, Layers } from 'lucide-react';
import { requireAuth, getAllowedTargetIds } from '@/lib/auth/dal';
import { redirect } from 'next/navigation';
import SectionBoundary from '@/components/ui/SectionBoundary';
import { BlockSkeleton, KpiRowSkeleton } from '@/components/ui/BlockSkeleton';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import OverviewKPI from '@/components/dashboard/overview/OverviewKPI';
import OverviewGauge from '@/components/dashboard/overview/OverviewGauge';
import PriorityAlertsCenter from '@/components/dashboard/overview/PriorityAlertsCenter';
import OverviewChannels from '@/components/dashboard/overview/OverviewChannels';
import OverviewStrategicMap from '@/components/dashboard/overview/OverviewStrategicMap';
import OverviewTopics from '@/components/dashboard/overview/OverviewTopics';
import OverviewSentiment from '@/components/dashboard/overview/OverviewSentiment';
import OverviewRisk from '@/components/dashboard/overview/OverviewRisk';
import OverviewExecutiveTable from '@/components/dashboard/overview/OverviewExecutiveTable';
import OverviewTimeline from '@/components/dashboard/overview/OverviewTimeline';
import ExecutiveScenarioSummary from '@/components/dashboard/overview/ExecutiveScenarioSummary';
import OpportunityBoard from '@/components/dashboard/overview/OpportunityBoard';
import KeyChanges from '@/components/dashboard/overview/KeyChanges';
import AssistedInsight from '@/components/dashboard/overview/AssistedInsight';
import ExecutiveNarrative from '@/components/dashboard/overview/ExecutiveNarrative';
import { buildExecutiveNarrative } from '@/lib/analytics/executive-narrative';
import {
  getOverviewKPIs,
  getCrisisOverview,
  getChannelDistribution,
  getDominantTopics,
  getSentimentOverview,
  getRiskOverview,
  getStrategicActions,
  getExecutiveTable,
  getTimelineEvents,
  getExecutiveOverviewData,
  getOverviewPesquisasSignal,
  type OverviewFilters,
} from '@/lib/queries/overview';
import { parseGlobalFilters, getEffectiveCandidateIds, searchParamsToURLSearchParams } from '@/lib/filters/global';

export const metadata = {
  title: 'Visão Geral | PolitixOS',
  description: 'Centro Executivo de Inteligência Política.',
};

// ─── Camada 1 — leitura executiva imediata ──────────────────────────────────
// Todos chamam getExecutiveOverviewData(filters), memoizada com
// React.cache() — mesma referência de `filters`, portanto uma única
// execução real por requisição, mesmo com vários blocos independentes.

async function NarrativeSection({ filters }: { filters: OverviewFilters }) {
  const { politicalStatus, risks, opportunities, keyChanges, entities, themes } = await getExecutiveOverviewData(filters);
  const narrative = buildExecutiveNarrative({
    politicalStatus,
    primaryRisk: risks[0] ?? null,
    primaryOpportunity: opportunities[0] ?? null,
    keyChanges,
    topEntity: entities[0] ?? null,
    topTheme: themes[0] ?? null,
  });
  return <ExecutiveNarrative narrative={narrative} />;
}

async function KPISection({ filters }: { filters: OverviewFilters }) {
  const [kpis, { politicalStatus }, pesquisasSignal] = await Promise.all([
    getOverviewKPIs(filters),
    getExecutiveOverviewData(filters),
    getOverviewPesquisasSignal(filters),
  ]);
  return <OverviewKPI {...kpis} politicalStatus={politicalStatus} pesquisasSignal={pesquisasSignal} />;
}

async function SynthesisSection({ filters }: { filters: OverviewFilters }) {
  const { synthesis } = await getExecutiveOverviewData(filters);
  return (
    <div className="surface-primary p-4 h-full">
      <p role="heading" aria-level={2} className="text-white font-bold text-lg tracking-tight mb-2">Síntese do Cenário</p>
      <ExecutiveScenarioSummary synthesis={synthesis} compact layout="grid" />
    </div>
  );
}

async function CrisisSection({ filters }: { filters: OverviewFilters }) {
  const crisis = await getCrisisOverview(filters);
  return <OverviewGauge {...crisis} />;
}

async function PriorityAlertsSection({ filters }: { filters: OverviewFilters }) {
  const { risks } = await getExecutiveOverviewData(filters);
  return <PriorityAlertsCenter risks={risks} activeCandidateId={filters.candidate} period={filters.period} />;
}

async function TopicsSection({ filters }: { filters: OverviewFilters }) {
  const topics = await getDominantTopics(filters);
  return <OverviewTopics topics={topics} />;
}

async function SentimentSection({ filters }: { filters: OverviewFilters }) {
  const sentiment = await getSentimentOverview(filters);
  return <OverviewSentiment sentiment={sentiment} />;
}

async function RiskSection({ filters }: { filters: OverviewFilters }) {
  const risk = await getRiskOverview(filters);
  return <OverviewRisk risk={risk} />;
}

async function ChannelsSection({ filters }: { filters: OverviewFilters }) {
  const channels = await getChannelDistribution(filters);
  return <OverviewChannels data={channels} />;
}

async function KeyChangesSection({ filters }: { filters: OverviewFilters }) {
  const { keyChanges } = await getExecutiveOverviewData(filters);
  return <KeyChanges changes={keyChanges} />;
}

// ─── Camada 3 — análises aprofundadas e tabelas de apoio ──────────────────

async function OpportunitySection({ filters }: { filters: OverviewFilters }) {
  const { opportunities } = await getExecutiveOverviewData(filters);
  return <OpportunityBoard opportunities={opportunities} />;
}

async function StrategicSection({ filters }: { filters: OverviewFilters }) {
  const actions = await getStrategicActions(filters);
  return <OverviewStrategicMap actions={actions} />;
}

async function TableSection({ filters }: { filters: OverviewFilters }) {
  const table = await getExecutiveTable(filters);
  return <OverviewExecutiveTable rows={table} />;
}

async function TimelineSection({ filters }: { filters: OverviewFilters }) {
  const events = await getTimelineEvents(filters);
  return <OverviewTimeline events={events} />;
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OverviewPage({ searchParams }: Props) {
  const session = await requireAuth();

  const hasAccess = session.role === 'admin' || session.permissions.includes('dashboard');
  if (!hasAccess) {
    redirect('/dashboard/sem-permissao');
  }

  const resolvedSearchParams = await searchParams;
  const urlParams = searchParamsToURLSearchParams(resolvedSearchParams);
  const globalFilters = parseGlobalFilters(urlParams);

  const allowedTargetIds = await getAllowedTargetIds();
  const candidateIds = getEffectiveCandidateIds(globalFilters, allowedTargetIds);

  const filters: OverviewFilters = {
    candidateIds,
    candidate: candidateIds && candidateIds.length === 1 ? candidateIds[0] : null,
    period: globalFilters.period,
    allowedTargetIds,
  };

  return (
    <div className="space-y-6 pb-12">
      <SectionBoundary label="Indicadores executivos" fallback={<KpiRowSkeleton />} minHeight={112}>
        <KPISection filters={filters} />
      </SectionBoundary>

      {/* PRIMEIRA DOBRA EXECUTIVA UNIFICADA */}
      <div 
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[var(--exec-cols)] gap-3 xl:gap-4 items-stretch mb-5"
        style={{ '--exec-cols': 'minmax(0, 1.7fr) minmax(0, 1.05fr) minmax(0, 1fr) minmax(0, 1.15fr)' } as React.CSSProperties}
      >
        <div className="flex flex-col min-w-0">
          <SectionBoundary label="Leitura executiva" fallback={<BlockSkeleton height={240} />} minHeight={240}>
            <NarrativeSection filters={filters} />
          </SectionBoundary>
        </div>
        <div className="flex flex-col min-w-0">
          <SectionBoundary label="Termômetro de crise" fallback={<BlockSkeleton height={240} />} minHeight={240}>
            <CrisisSection filters={filters} />
          </SectionBoundary>
        </div>
        <div className="flex flex-col min-w-0" id="mudancas-relevantes">
          <SectionBoundary label="Mudanças relevantes" fallback={<BlockSkeleton height={240} />} minHeight={240}>
            <KeyChangesSection filters={filters} />
          </SectionBoundary>
        </div>
        <div className="flex flex-col min-w-0">
          <SectionBoundary label="Síntese do cenário" fallback={<BlockSkeleton height={240} />} minHeight={240}>
            <SynthesisSection filters={filters} />
          </SectionBoundary>
        </div>
      </div>

      <div id="analytics-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch scroll-mt-20">
        <SectionBoundary label="Temas dominantes" fallback={<BlockSkeleton height={300} />} minHeight={300}>
          <TopicsSection filters={filters} />
        </SectionBoundary>
        <SectionBoundary label="Sentimento consolidado" fallback={<BlockSkeleton height={300} />} minHeight={300}>
          <SentimentSection filters={filters} />
        </SectionBoundary>
        <SectionBoundary label="Distribuição de risco" fallback={<BlockSkeleton height={300} />} minHeight={300}>
          <RiskSection filters={filters} />
        </SectionBoundary>
        <SectionBoundary label="Distribuição por canal" fallback={<BlockSkeleton height={300} />} minHeight={300}>
          <ChannelsSection filters={filters} />
        </SectionBoundary>
      </div>

      <div id="riscos-oportunidades" className="scroll-mt-20">
        <SectionBoundary label="Centro de alertas prioritários" fallback={<BlockSkeleton height={340} />} minHeight={340}>
          <PriorityAlertsSection filters={filters} />
        </SectionBoundary>
      </div>

      <div id="timeline" className="scroll-mt-20">
        <SectionBoundary label="Timeline consolidada" fallback={<BlockSkeleton height={320} />} minHeight={320}>
          <TimelineSection filters={filters} />
        </SectionBoundary>
      </div>

      <AssistedInsight candidate={filters.candidate ?? null} period={filters.period ?? 'all'} isAdmin={session.role === 'admin'} />

      <CollapsibleSection
        icon={<Layers size={16} />}
        title="Análises Complementares"
        subtitle="Tabelas detalhadas e informações de apoio"
        anchorIds={['oportunidades']}
      >
        <SectionBoundary label="Oportunidades prioritárias" fallback={<BlockSkeleton height={220} />} minHeight={220}>
          <OpportunitySection filters={filters} />
        </SectionBoundary>
        <SectionBoundary label="Mapa de ação estratégica" fallback={<BlockSkeleton height={220} />} minHeight={220}>
          <StrategicSection filters={filters} />
        </SectionBoundary>
        <SectionBoundary label="Tabela executiva" fallback={<BlockSkeleton height={360} />} minHeight={360}>
          <TableSection filters={filters} />
        </SectionBoundary>
      </CollapsibleSection>
    </div>
  );
}
