import { requireAuth } from '@/lib/auth/dal';
import SectionBoundary from '@/components/ui/SectionBoundary';
import { BlockSkeleton, KpiRowSkeleton } from '@/components/ui/BlockSkeleton';
import OverviewHeader from '@/components/dashboard/overview/OverviewHeader';
import OverviewKPI from '@/components/dashboard/overview/OverviewKPI';
import OverviewGauge from '@/components/dashboard/overview/OverviewGauge';
import OverviewAlerts from '@/components/dashboard/overview/OverviewAlerts';
import OverviewChannels from '@/components/dashboard/overview/OverviewChannels';
import OverviewStrategicMap from '@/components/dashboard/overview/OverviewStrategicMap';
import OverviewTopics from '@/components/dashboard/overview/OverviewTopics';
import OverviewSentiment from '@/components/dashboard/overview/OverviewSentiment';
import OverviewRisk from '@/components/dashboard/overview/OverviewRisk';
import OverviewExecutiveTable from '@/components/dashboard/overview/OverviewExecutiveTable';
import OverviewTimeline from '@/components/dashboard/overview/OverviewTimeline';
import {
  getOverviewKPIs,
  getCrisisOverview,
  getChannelDistribution,
  getPriorityAlerts,
  getDominantTopics,
  getSentimentOverview,
  getRiskOverview,
  getStrategicActions,
  getExecutiveTable,
  getOverviewFiltersOptions,
  getTimelineEvents,
  type OverviewFilters,
} from '@/lib/queries/overview';

export const metadata = {
  title: 'Visão Geral | PolitixOS',
  description: 'Consolidação executiva de inteligência política.',
};

// ─── Blocos independentes ────────────────────────────────────────────────────
// Cada bloco é um Server Component assíncrono próprio, envolto em
// SectionBoundary (Suspense + error boundary): a estrutura da página aparece
// imediatamente e cada bloco resolve (ou falha) sem travar os demais.
// Todos recebem o MESMO objeto `filters` — necessário para o React.cache()
// em lib/queries/overview.ts deduplicar as consultas por trás dos panos.

async function KPISection({ filters }: { filters: OverviewFilters }) {
  const kpis = await getOverviewKPIs(filters);
  return <OverviewKPI {...kpis} />;
}

async function CrisisSection({ filters }: { filters: OverviewFilters }) {
  const crisis = await getCrisisOverview(filters);
  return <OverviewGauge {...crisis} />;
}

async function AlertsSection({ filters }: { filters: OverviewFilters }) {
  const alerts = await getPriorityAlerts(filters);
  return <OverviewAlerts alerts={alerts} />;
}

async function TopicsSection({ filters }: { filters: OverviewFilters }) {
  const topics = await getDominantTopics(filters);
  return <OverviewTopics topics={topics} />;
}

async function ChannelsSection({ filters }: { filters: OverviewFilters }) {
  const channels = await getChannelDistribution(filters);
  return <OverviewChannels data={channels} />;
}

async function SentimentSection({ filters }: { filters: OverviewFilters }) {
  const sentiment = await getSentimentOverview(filters);
  return <OverviewSentiment sentiment={sentiment} />;
}

async function RiskSection({ filters }: { filters: OverviewFilters }) {
  const risk = await getRiskOverview(filters);
  return <OverviewRisk risk={risk} />;
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

export default async function OverviewPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireAuth();
  const searchParams = await props.searchParams;
  const readParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const allowedTargetIds = session.role === 'admin' ? null : session.allowedTargetIds ?? [];

  const requestedCandidate = readParam(searchParams.candidate);
  const requestedPeriod = readParam(searchParams.period);
  const period = ['all', '1', '7', '30'].includes(requestedPeriod || '') ? requestedPeriod : 'all';

  // Objeto de filtros único, reaproveitado (mesma referência) por todos os
  // blocos abaixo — é o que permite o React.cache() deduplicar as consultas.
  const filters: OverviewFilters = {
    candidate: requestedCandidate && !['todos', 'all'].includes(requestedCandidate) ? requestedCandidate : null,
    period,
    allowedTargetIds,
  };

  // Consulta leve e independente (não passa pelo fetchOverviewData pesado) —
  // necessária para o cabeçalho/filtros renderizarem com opções reais.
  const candidates = await getOverviewFiltersOptions(allowedTargetIds);

  const generatedAt = new Date().toISOString();

  return (
    <div className="space-y-6 pb-12">
      <OverviewHeader
        candidates={candidates}
        currentCandidate={filters.candidate}
        currentPeriod={filters.period}
        generatedAt={generatedAt}
      />

      {/* KPIs */}
      <SectionBoundary label="Indicadores executivos" fallback={<KpiRowSkeleton />} minHeight={112}>
        <KPISection filters={filters} />
      </SectionBoundary>

      {/* Main Row: Gauge & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SectionBoundary label="Termômetro de crise" fallback={<BlockSkeleton height={340} />} minHeight={340}>
            <CrisisSection filters={filters} />
          </SectionBoundary>
        </div>
        <div className="lg:col-span-2">
          <SectionBoundary label="Alertas prioritários" fallback={<BlockSkeleton height={340} />} minHeight={340}>
            <AlertsSection filters={filters} />
          </SectionBoundary>
        </div>
      </div>

      {/* Topics & Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBoundary label="Temas dominantes" fallback={<BlockSkeleton height={280} />} minHeight={280}>
          <TopicsSection filters={filters} />
        </SectionBoundary>
        <SectionBoundary label="Distribuição por canal" fallback={<BlockSkeleton height={280} />} minHeight={280}>
          <ChannelsSection filters={filters} />
        </SectionBoundary>
      </div>

      {/* Charts: Sentiment & Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBoundary label="Sentimento consolidado" fallback={<BlockSkeleton height={280} />} minHeight={280}>
          <SentimentSection filters={filters} />
        </SectionBoundary>
        <SectionBoundary label="Distribuição de risco" fallback={<BlockSkeleton height={280} />} minHeight={280}>
          <RiskSection filters={filters} />
        </SectionBoundary>
      </div>

      {/* Strategic Actions */}
      <SectionBoundary label="Mapa de ação estratégica" fallback={<BlockSkeleton height={220} />} minHeight={220}>
        <StrategicSection filters={filters} />
      </SectionBoundary>

      {/* Timeline consolidada */}
      <SectionBoundary label="Timeline consolidada" fallback={<BlockSkeleton height={320} />} minHeight={320}>
        <TimelineSection filters={filters} />
      </SectionBoundary>

      {/* Executive Table */}
      <SectionBoundary label="Tabela executiva" fallback={<BlockSkeleton height={360} />} minHeight={360}>
        <TableSection filters={filters} />
      </SectionBoundary>
    </div>
  );
}
