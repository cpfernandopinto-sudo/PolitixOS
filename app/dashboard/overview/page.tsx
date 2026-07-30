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
    <div className="surface-hero p-5 h-full">
      {/* Não é <h2>: mesma razão do PanoramaAnaliticoHeader acima. text-lg
          iguala o peso visual de "Termômetro de Crise Master"/"Estado
          Político" (ambos h3 text-lg) na mesma fileira — nenhum dos três
          deve dominar só pela tipografia. */}
      <p role="heading" aria-level={2} className="text-white font-bold text-lg tracking-tight mb-3">Síntese do Cenário</p>
      <ExecutiveScenarioSummary synthesis={synthesis} compact />
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

async function RiskOpportunitySection({
  filters,
  variant = 'both',
}: {
  filters: OverviewFilters;
  variant?: 'both' | 'risks' | 'opportunities';
}) {
  const { risks, opportunities, opportunityAbsenceReasons } = await getExecutiveOverviewData(filters);
  return (
    <RiskOpportunityBoard
      risks={risks}
      opportunities={opportunities}
      opportunityAbsenceReasons={opportunityAbsenceReasons}
      variant={variant}
    />
  );
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
    <div className="flex items-center gap-2">
      <BarChart3 size={16} className="text-cyan-400 shrink-0" />
      {/* Não é <h2>: .dashboard-main h2 (compartilhada com o Radar) força
          clamp(1.55rem,2.1vw,2rem) — bem acima da meta de 22-24px aqui. */}
      <p role="heading" aria-level={2} className="text-[22px] text-white font-bold tracking-tight">Panorama Analítico</p>
      <span className="text-xs text-slate-500 hidden sm:inline">— Temas, canais, percepção e risco consolidados.</span>
      <div className="flex-1 h-px bg-blue-500/5 ml-2" />
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

      {/* 2. Cards executivos — Score de Saúde, Temperatura, Tendência,
          Alertas Ativos, Volume Total. Sempre visíveis (Camada 1), nunca
          escondidos em seção recolhida. */}
      <SectionBoundary label="Indicadores executivos" fallback={<KpiRowSkeleton />} minHeight={112}>
        <KPISection filters={filters} />
      </SectionBoundary>

      {/* 3. Panorama Analítico — imediatamente abaixo dos 5 cards (ordem
          final obrigatória do hotfix de apresentação). 4 gráficos lado a
          lado em desktop largo (xl:grid-cols-4), 2x2 em notebook/tablet
          (md:grid-cols-2), 1 coluna em mobile. */}
      <PanoramaAnaliticoHeader />
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

      {/* Narrativa executiva — determinística, sem IA. Resume o que
          aconteceu, por que merece atenção e onde clicar a seguir. */}
      <SectionBoundary label="Narrativa executiva" fallback={<BlockSkeleton height={120} />} minHeight={120}>
        <NarrativeSection filters={filters} />
      </SectionBoundary>

      {/* 4. LINHA de Diagnóstico Executivo: Síntese (compacta) | Termômetro
          de Crise Master | Estado Político, mesma altura, 3 colunas em
          desktop. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <SectionBoundary label="Síntese do cenário" fallback={<BlockSkeleton height={280} />} minHeight={280}>
          <SynthesisSection filters={filters} />
        </SectionBoundary>
        <SectionBoundary label="Termômetro de crise" fallback={<BlockSkeleton height={280} />} minHeight={280}>
          <CrisisSection filters={filters} />
        </SectionBoundary>
        <SectionBoundary label="Estado político" fallback={<BlockSkeleton height={280} />} minHeight={280}>
          <PoliticalStatusSection filters={filters} />
        </SectionBoundary>
      </div>

      {/* 5. Mudanças Mais Relevantes — imediatamente após a linha de
          Diagnóstico, antes de Riscos/Alertas/Entidades/Timeline. */}
      <div id="mudancas-relevantes" className="scroll-mt-20">
        <SectionBoundary label="Mudanças relevantes" fallback={<BlockSkeleton height={180} />} minHeight={180}>
          <KeyChangesSection filters={filters} />
        </SectionBoundary>
      </div>

      {/* 6. LINHA de Ação Imediata: Riscos Prioritários | Alertas
          Prioritários — só essas duas colunas (Oportunidades Prioritárias
          já aparece compacta na Síntese acima, e em detalhe em "Análises
          Complementares", sem duplicar aqui). */}
      <div id="crisis-alerts" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch scroll-mt-20">
        <SectionBoundary label="Riscos prioritários" fallback={<BlockSkeleton height={340} />} minHeight={340}>
          <RiskOpportunitySection filters={filters} variant="risks" />
        </SectionBoundary>
        <SectionBoundary label="Alertas prioritários" fallback={<BlockSkeleton height={340} />} minHeight={340}>
          <AlertsSection filters={filters} />
        </SectionBoundary>
      </div>

      {/* 7. Entidades e temas em atenção. */}
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

      {/* 16. Análises complementares — só itens realmente secundários. Os
          gráficos estratégicos (KPIs, Termômetro, Alertas, Temas, Canais,
          Sentimento, Risco) NÃO ficam mais aqui — promovidos para o
          Panorama Analítico. Oportunidades Prioritárias (lista completa)
          fica aqui — a Síntese acima já mostra só a principal, sem
          duplicar Riscos (que tem sua própria linha, "Ação Imediata"). */}
      <CollapsibleSection
        title="Análises Complementares"
        subtitle="Oportunidades detalhadas e ações recomendadas com base nos itens de maior risco monitorados"
      >
        <SectionBoundary label="Oportunidades prioritárias" fallback={<BlockSkeleton height={220} />} minHeight={220}>
          <RiskOpportunitySection filters={filters} variant="opportunities" />
        </SectionBoundary>
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
