import { requireAuth } from '@/lib/auth/dal';
import SectionBoundary from '@/components/ui/SectionBoundary';
import { BlockSkeleton, KpiRowSkeleton } from '@/components/ui/BlockSkeleton';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
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
import ExecutiveScenarioSummary from '@/components/dashboard/overview/ExecutiveScenarioSummary';
import PoliticalStatusCard from '@/components/dashboard/overview/PoliticalStatusCard';
import RiskOpportunityBoard from '@/components/dashboard/overview/RiskOpportunityBoard';
import KeyChanges from '@/components/dashboard/overview/KeyChanges';
import AttentionEntitiesThemes from '@/components/dashboard/overview/AttentionEntitiesThemes';
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
  getExecutiveOverviewData,
  type OverviewFilters,
} from '@/lib/queries/overview';

export const metadata = {
  title: 'Visão Geral | PolitixOS',
  description: 'Centro Executivo de Inteligência Política.',
};

// ─── Blocos do Centro Executivo (Sprint 3) ──────────────────────────────────
// Todos chamam getExecutiveOverviewData(filters), memoizada com
// React.cache() — mesma referência de `filters`, portanto uma única
// execução real por requisição, mesmo com vários blocos independentes.

async function SynthesisSection({ filters }: { filters: OverviewFilters }) {
  const { synthesis } = await getExecutiveOverviewData(filters);
  return <ExecutiveScenarioSummary synthesis={synthesis} />;
}

async function PoliticalStatusSection({ filters }: { filters: OverviewFilters }) {
  const { politicalStatus } = await getExecutiveOverviewData(filters);
  return <PoliticalStatusCard status={politicalStatus} />;
}

async function RiskOpportunitySection({ filters }: { filters: OverviewFilters }) {
  const { risks, opportunities } = await getExecutiveOverviewData(filters);
  return <RiskOpportunityBoard risks={risks} opportunities={opportunities} />;
}

async function KeyChangesSection({ filters }: { filters: OverviewFilters }) {
  const { keyChanges } = await getExecutiveOverviewData(filters);
  return <KeyChanges changes={keyChanges} />;
}

async function AttentionSection({ filters }: { filters: OverviewFilters }) {
  const { entities, themes } = await getExecutiveOverviewData(filters);
  return <AttentionEntitiesThemes entities={entities} themes={themes} />;
}

// ─── Blocos já existentes (Fases 1-2) — preservados ─────────────────────────

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
      {/* 1. Cabeçalho executivo */}
      <OverviewHeader
        candidates={candidates}
        currentCandidate={filters.candidate}
        currentPeriod={filters.period}
        generatedAt={generatedAt}
      />

      {/* 2-3. Síntese do cenário + Estado político (lado a lado em desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <SectionBoundary label="Síntese do cenário" fallback={<BlockSkeleton height={280} />} minHeight={280}>
            <SynthesisSection filters={filters} />
          </SectionBoundary>
        </div>
        <div className="lg:col-span-1">
          <SectionBoundary label="Estado político" fallback={<BlockSkeleton height={280} />} minHeight={280}>
            <PoliticalStatusSection filters={filters} />
          </SectionBoundary>
        </div>
      </div>

      {/* 4. Riscos e oportunidades prioritários */}
      <SectionBoundary label="Riscos e oportunidades" fallback={<BlockSkeleton height={320} />} minHeight={320}>
        <RiskOpportunitySection filters={filters} />
      </SectionBoundary>

      {/* 5. Mudanças mais relevantes */}
      <SectionBoundary label="Mudanças relevantes" fallback={<BlockSkeleton height={180} />} minHeight={180}>
        <KeyChangesSection filters={filters} />
      </SectionBoundary>

      {/* 6. Entidades e temas em atenção */}
      <SectionBoundary label="Entidades e temas em atenção" fallback={<BlockSkeleton height={320} />} minHeight={320}>
        <AttentionSection filters={filters} />
      </SectionBoundary>

      {/* 7. Timeline consolidada */}
      <SectionBoundary label="Timeline consolidada" fallback={<BlockSkeleton height={320} />} minHeight={320}>
        <TimelineSection filters={filters} />
      </SectionBoundary>

      {/* 8. Evidências e análises complementares — recolhível por padrão.
          Reaproveita os mesmos dados já buscados (fetchOverviewData
          cacheado); "carregamento diferido" aqui é de EXIBIÇÃO, não de
          consulta — os dados já seriam buscados de qualquer forma pelos
          blocos acima que compartilham o mesmo cache. */}
      <CollapsibleSection
        title="Análises Complementares"
        subtitle="Detalhamento por canal, sentimento, risco, temas e ações recomendadas"
      >
        <SectionBoundary label="Indicadores executivos" fallback={<KpiRowSkeleton />} minHeight={112}>
          <KPISection filters={filters} />
        </SectionBoundary>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SectionBoundary label="Termômetro de crise" fallback={<BlockSkeleton height={340} />} minHeight={340}>
              <CrisisSection filters={filters} />
            </SectionBoundary>
          </div>
          <div className="lg:col-span-2">
            <SectionBoundary label="Alertas prioritários (por risco/impacto)" fallback={<BlockSkeleton height={340} />} minHeight={340}>
              <AlertsSection filters={filters} />
            </SectionBoundary>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionBoundary label="Temas dominantes" fallback={<BlockSkeleton height={280} />} minHeight={280}>
            <TopicsSection filters={filters} />
          </SectionBoundary>
          <SectionBoundary label="Distribuição por canal" fallback={<BlockSkeleton height={280} />} minHeight={280}>
            <ChannelsSection filters={filters} />
          </SectionBoundary>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionBoundary label="Sentimento consolidado" fallback={<BlockSkeleton height={280} />} minHeight={280}>
            <SentimentSection filters={filters} />
          </SectionBoundary>
          <SectionBoundary label="Distribuição de risco" fallback={<BlockSkeleton height={280} />} minHeight={280}>
            <RiskSection filters={filters} />
          </SectionBoundary>
        </div>

        <SectionBoundary label="Mapa de ação estratégica" fallback={<BlockSkeleton height={220} />} minHeight={220}>
          <StrategicSection filters={filters} />
        </SectionBoundary>
      </CollapsibleSection>

      {/* 9. Tabela executiva — posição secundária, ao final */}
      <SectionBoundary label="Tabela executiva" fallback={<BlockSkeleton height={360} />} minHeight={360}>
        <TableSection filters={filters} />
      </SectionBoundary>
    </div>
  );
}
