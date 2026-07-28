import { BarChart3 } from 'lucide-react';
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
  getOverviewFiltersOptions,
  getTimelineEvents,
  getExecutiveOverviewData,
  type OverviewFilters,
} from '@/lib/queries/overview';

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
  const kpis = await getOverviewKPIs(filters);
  return <OverviewKPI {...kpis} />;
}

async function SynthesisSection({ filters }: { filters: OverviewFilters }) {
  const { synthesis } = await getExecutiveOverviewData(filters);
  return (
    <div className="surface-hero p-6 h-full">
      <h2 className="text-white font-bold text-lg tracking-tight mb-4">Síntese do Cenário</h2>
      <ExecutiveScenarioSummary synthesis={synthesis} />
    </div>
  );
}

async function PoliticalStatusSection({ filters }: { filters: OverviewFilters }) {
  const { politicalStatus } = await getExecutiveOverviewData(filters);
  return <PoliticalStatusCard status={politicalStatus} />;
}

// ─── Camada 2 — análise e contexto estratégico (sempre visível) ────────────

async function CrisisSection({ filters }: { filters: OverviewFilters }) {
  const crisis = await getCrisisOverview(filters);
  return <OverviewGauge {...crisis} />;
}

async function AlertsSection({ filters }: { filters: OverviewFilters }) {
  // Reaproveita os MESMOS `risks` (já em linguagem executiva via
  // formatExecutiveRisk) usados pelo board de Riscos Prioritários — nenhuma
  // consulta nova, nenhum critério de severidade paralelo. Substitui a
  // antiga getPriorityAlerts (removida), que usava título bruto como texto
  // do alerta.
  const { risks } = await getExecutiveOverviewData(filters);
  return <OverviewAlerts risks={risks} />;
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

// ─── Camada 3 — investigação e aprofundamento ───────────────────────────────

async function RiskOpportunitySection({ filters }: { filters: OverviewFilters }) {
  const { risks, opportunities, opportunityAbsenceReasons } = await getExecutiveOverviewData(filters);
  return <RiskOpportunityBoard risks={risks} opportunities={opportunities} opportunityAbsenceReasons={opportunityAbsenceReasons} />;
}

async function KeyChangesSection({ filters }: { filters: OverviewFilters }) {
  const { keyChanges } = await getExecutiveOverviewData(filters);
  return <KeyChanges changes={keyChanges} />;
}

async function AttentionSection({ filters }: { filters: OverviewFilters }) {
  const { entities, themes } = await getExecutiveOverviewData(filters);
  return <AttentionEntitiesThemes entities={entities} themes={themes} />;
}

async function TimelineSection({ filters }: { filters: OverviewFilters }) {
  const events = await getTimelineEvents(filters);
  return <OverviewTimeline events={events} />;
}

async function StrategicSection({ filters }: { filters: OverviewFilters }) {
  const actions = await getStrategicActions(filters);
  return <OverviewStrategicMap actions={actions} />;
}

async function TableSection({ filters }: { filters: OverviewFilters }) {
  const table = await getExecutiveTable(filters);
  return <OverviewExecutiveTable rows={table} />;
}

/**
 * Divisor visual que introduz os quatro gráficos estratégicos (Camada 2).
 * Nome deliberadamente distinto de "Leitura Analítica Assistida" (bloco de
 * IA, mais abaixo) para não gerar ambiguidade — ver
 * docs/AUDITORIA_VISUAL_SPRINT_5.md, seção de reintegração.
 */
function PanoramaAnaliticoHeader() {
  return (
    <div className="flex items-center gap-3 pt-2">
      <BarChart3 size={18} className="text-cyan-400 shrink-0" />
      <div>
        <h2 className="text-white font-bold text-base tracking-tight">Panorama Analítico</h2>
        <p className="text-xs text-gray-500">Temas, canais, percepção e risco consolidados.</p>
      </div>
      <div className="flex-1 h-px bg-white/5 ml-2" />
    </div>
  );
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
      {/* 1. Cabeçalho e filtros */}
      <OverviewHeader
        candidates={candidates}
        currentCandidate={filters.candidate}
        currentPeriod={filters.period}
        generatedAt={generatedAt}
      />

      {/* 2. Narrativa executiva — determinística, sem IA. Sempre antes da
          síntese, resume o que aconteceu, por que merece atenção e onde
          clicar a seguir. */}
      <SectionBoundary label="Narrativa executiva" fallback={<BlockSkeleton height={120} />} minHeight={120}>
        <NarrativeSection filters={filters} />
      </SectionBoundary>

      {/* 3. Cards executivos — Score de Saúde, Temperatura, Tendência,
          Alertas Ativos, Volume Total. Sempre visíveis (Camada 1), nunca
          escondidos em seção recolhida. */}
      <SectionBoundary label="Indicadores executivos" fallback={<KpiRowSkeleton />} minHeight={112}>
        <KPISection filters={filters} />
      </SectionBoundary>

      {/* 4-5. Síntese do cenário + Estado político (lado a lado em desktop) —
          já inclui risco/oportunidade/mudança principais como tiles. */}
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

      {/* 6. Termômetro de Crise Master + Alertas Prioritários — Camada 2,
          sempre visível. Termômetro menor à esquerda, Alertas ocupando maior
          largura em desktop; empilhados em mobile. */}
      <div id="crisis-alerts" className="grid grid-cols-1 lg:grid-cols-3 gap-6 scroll-mt-20">
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

      {/* 7. Faixa "Panorama Analítico" — introduz os 4 gráficos estratégicos. */}
      <PanoramaAnaliticoHeader />

      {/* 8-11. Grid de 4 gráficos, ordem de prioridade: Temas Dominantes,
          Sentimento Consolidado, Distribuição de Risco (3 colunas em telas
          largas) — Distribuição por Canal (radar) em linha própria, largura
          total, para não perder legibilidade em telas menores. Sempre
          visíveis, nunca recolhidos por padrão. */}
      <div id="analytics-grid" className="space-y-6 scroll-mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <SectionBoundary label="Temas dominantes" fallback={<BlockSkeleton height={280} />} minHeight={280}>
            <TopicsSection filters={filters} />
          </SectionBoundary>
          <SectionBoundary label="Sentimento consolidado" fallback={<BlockSkeleton height={280} />} minHeight={280}>
            <SentimentSection filters={filters} />
          </SectionBoundary>
          <SectionBoundary label="Distribuição de risco" fallback={<BlockSkeleton height={280} />} minHeight={280}>
            <RiskSection filters={filters} />
          </SectionBoundary>
        </div>
        <SectionBoundary label="Distribuição por canal" fallback={<BlockSkeleton height={340} />} minHeight={340}>
          <ChannelsSection filters={filters} />
        </SectionBoundary>
      </div>

      {/* 12. Riscos e oportunidades completos — Camada 3. */}
      <SectionBoundary label="Riscos e oportunidades" fallback={<BlockSkeleton height={320} />} minHeight={320}>
        <RiskOpportunitySection filters={filters} />
      </SectionBoundary>

      {/* Mudanças mais relevantes — complementa Riscos/Oportunidades. */}
      <div id="mudancas-relevantes" className="scroll-mt-20">
        <SectionBoundary label="Mudanças relevantes" fallback={<BlockSkeleton height={180} />} minHeight={180}>
          <KeyChangesSection filters={filters} />
        </SectionBoundary>
      </div>

      {/* 13. Entidades e temas em atenção. */}
      <SectionBoundary label="Entidades e temas em atenção" fallback={<BlockSkeleton height={320} />} minHeight={320}>
        <AttentionSection filters={filters} />
      </SectionBoundary>

      {/* 14. Timeline consolidada. */}
      <div id="timeline" className="scroll-mt-20">
        <SectionBoundary label="Timeline consolidada" fallback={<BlockSkeleton height={320} />} minHeight={320}>
          <TimelineSection filters={filters} />
        </SectionBoundary>
      </div>

      {/* 15. Leitura Analítica Assistida por IA — claramente identificada
          como IA, sempre depois da síntese/timeline determinísticas, nunca
          antes. Não busca dados no mount (só ao clicar "Gerar leitura
          analítica") — não é um Server Component. */}
      <AssistedInsight candidate={filters.candidate ?? null} period={filters.period ?? 'all'} isAdmin={session.role === 'admin'} />

      {/* 16. Análises complementares — só itens realmente secundários
          (ações recomendadas). Os gráficos estratégicos (KPIs, Termômetro,
          Alertas, Temas, Canais, Sentimento, Risco) NÃO ficam mais aqui —
          foram promovidos para a Camada 2, sempre visível (ver auditoria). */}
      <CollapsibleSection
        title="Análises Complementares"
        subtitle="Ações recomendadas com base nos itens de maior risco monitorados"
      >
        <SectionBoundary label="Mapa de ação estratégica" fallback={<BlockSkeleton height={220} />} minHeight={220}>
          <StrategicSection filters={filters} />
        </SectionBoundary>
      </CollapsibleSection>

      {/* 17. Tabela executiva — posição secundária, ao final. */}
      <SectionBoundary label="Tabela executiva" fallback={<BlockSkeleton height={360} />} minHeight={360}>
        <TableSection filters={filters} />
      </SectionBoundary>
    </div>
  );
}
