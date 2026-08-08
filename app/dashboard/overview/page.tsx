import { BarChart3, Layers } from 'lucide-react';
import { requireAuth } from '@/lib/auth/dal';
import SectionBoundary from '@/components/ui/SectionBoundary';
import { BlockSkeleton, KpiRowSkeleton } from '@/components/ui/BlockSkeleton';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import OverviewHeader from '@/components/dashboard/overview/OverviewHeader';
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
import PoliticalStatusCard from '@/components/dashboard/overview/PoliticalStatusCard';
import OpportunityBoard from '@/components/dashboard/overview/OpportunityBoard';
import KeyChanges from '@/components/dashboard/overview/KeyChanges';
import AttentionEntitiesStrip from '@/components/dashboard/overview/AttentionEntitiesStrip';
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
    // surface-primary (nível 2 do design system) — um nível abaixo do
    // surface-hero da Leitura Executiva ao lado (nível 1), para que a
    // leitura interpretativa tenha mais destaque visual que os fatos
    // estruturados da Síntese, sem deixar de ter presença própria.
    <div className="surface-primary p-4 h-full">
      {/* Não é <h2>: mesma razão do PanoramaAnaliticoHeader acima. text-lg
          iguala o peso visual de "Termômetro de Crise Master"/"Estado
          Político" na mesma página — nenhum título deve dominar só pela
          tipografia. */}
      <p role="heading" aria-level={2} className="text-white font-bold text-lg tracking-tight mb-2">Síntese do Cenário</p>
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

async function PriorityAlertsSection({ filters }: { filters: OverviewFilters }) {
  // Centro de Alertas Prioritários (Sprint UX — Etapa 4): consolida os
  // antigos "Riscos Prioritários" e "Alertas Prioritários", que liam os
  // MESMOS `risks` (já em linguagem executiva via formatExecutiveRisk) e
  // mostravam a mesma informação em dois cartões lado a lado — nenhuma
  // consulta nova, nenhum critério de severidade paralelo.
  const { risks } = await getExecutiveOverviewData(filters);
  return <PriorityAlertsCenter risks={risks} activeCandidateId={filters.candidate} period={filters.period} />;
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

async function OpportunitySection({ filters }: { filters: OverviewFilters }) {
  const { opportunities, opportunityAbsenceReasons } = await getExecutiveOverviewData(filters);
  return <OpportunityBoard opportunities={opportunities} opportunityAbsenceReasons={opportunityAbsenceReasons} />;
}

async function KeyChangesSection({ filters }: { filters: OverviewFilters }) {
  const { keyChanges } = await getExecutiveOverviewData(filters);
  return <KeyChanges changes={keyChanges} />;
}

async function AttentionSection({ filters }: { filters: OverviewFilters }) {
  // `themes` continua calculado dentro de getExecutiveOverviewData (usado na
  // síntese executiva) — só não é mais repassado para este componente, que
  // agora mostra só a faixa compacta de entidades (Sprint UX — Etapa 1;
  // painel de Temas em Atenção removido por duplicar Temas Dominantes).
  const { entities } = await getExecutiveOverviewData(filters);
  return <AttentionEntitiesStrip entities={entities} />;
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
      <BarChart3 size={16} className="text-cyan-400 shrink-0" aria-hidden="true" />
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

      {/* Entidades em atenção — faixa compacta (Sprint UX, Etapa 1),
          promovida para logo após o Panorama Analítico (Sprint UX, Etapa 2):
          precisa vir antes da nova linha Síntese+Leitura Executiva, que por
          sua vez precisa vir antes de Termômetro/Estado Político. */}
      <SectionBoundary label="Entidades em atenção" fallback={<BlockSkeleton height={72} />} minHeight={72}>
        <AttentionSection filters={filters} />
      </SectionBoundary>

      {/* 4. LINHA Síntese do Cenário + Leitura Executiva (Sprint UX, Etapa 2).
          Síntese ~42%, Leitura Executiva ~58% — a leitura interpretativa tem
          mais largura que os fatos estruturados. Substitui o antigo par
          "Narrativa executiva" (bloco isolado, largura total, acima) +
          "Síntese do cenário" (1/3 da linha de diagnóstico, abaixo) — mesmos
          dados (`synthesis` e `narrative`), só a composição visual muda. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5">
          <SectionBoundary label="Síntese do cenário" fallback={<BlockSkeleton height={220} />} minHeight={220}>
            <SynthesisSection filters={filters} />
          </SectionBoundary>
        </div>
        <div className="lg:col-span-7">
          <SectionBoundary label="Leitura executiva" fallback={<BlockSkeleton height={220} />} minHeight={220}>
            <NarrativeSection filters={filters} />
          </SectionBoundary>
        </div>
      </div>

      {/* 4b. LINHA de Diagnóstico: Termômetro de Crise Master | Estado
          Político, mesma altura — os dois cards agora leem como um único
          painel de diagnóstico dividido em dois módulos (Sprint UX — Etapa
          3: mesmo padding/borda/raio nos dois componentes). 40/60 em
          desktop largo (Estado Político tem mais conteúdo textual), 50/50
          em tablet, empilhado em mobile (Termômetro primeiro). */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 items-stretch">
        <div className="xl:col-span-2">
          <SectionBoundary label="Termômetro de crise" fallback={<BlockSkeleton height={280} />} minHeight={280}>
            <CrisisSection filters={filters} />
          </SectionBoundary>
        </div>
        <div className="xl:col-span-3">
          <SectionBoundary label="Estado político" fallback={<BlockSkeleton height={280} />} minHeight={280}>
            <PoliticalStatusSection filters={filters} />
          </SectionBoundary>
        </div>
      </div>

      {/* 5. Mudanças Mais Relevantes — imediatamente após a linha de
          Diagnóstico, antes de Riscos/Alertas/Entidades/Timeline. */}
      <div id="mudancas-relevantes" className="scroll-mt-20">
        <SectionBoundary label="Mudanças relevantes" fallback={<BlockSkeleton height={180} />} minHeight={180}>
          <KeyChangesSection filters={filters} />
        </SectionBoundary>
      </div>

      {/* 6. Centro de Alertas Prioritários (Sprint UX — Etapa 4): consolida
          os antigos "Riscos Prioritários" e "Alertas Prioritários" — os dois
          liam os MESMOS `risks` e mostravam a mesma informação em dois
          cartões lado a lado (duplicação confirmada em código, não só
          visual). Card único, largura total (Oportunidades Prioritárias já
          aparece compacta na Síntese acima, e em detalhe em "Análises
          Complementares", sem duplicar aqui). Mantém o id
          "riscos-oportunidades", alvo real do link "Ver riscos" em
          lib/analytics/executive-narrative.ts. */}
      <div id="riscos-oportunidades" className="scroll-mt-20">
        <SectionBoundary label="Centro de alertas prioritários" fallback={<BlockSkeleton height={340} />} minHeight={340}>
          <PriorityAlertsSection filters={filters} />
        </SectionBoundary>
      </div>

      {/* 14. Timeline consolidada. */}
      <div id="timeline" className="scroll-mt-20">
        <SectionBoundary label="Timeline consolidada" fallback={<BlockSkeleton height={320} />} minHeight={320}>
          <TimelineSection filters={filters} />
        </SectionBoundary>
      </div>

      {/* 15. Relatório Executivo com IA — CTA compacto, sempre depois da
          síntese/timeline determinísticas, nunca antes (Sprint UX — Etapa
          5: deixou de ser um card grande permanente; agora abre em Drawer,
          só quando o usuário clica). Não busca dados no mount — não é um
          Server Component. */}
      <AssistedInsight candidate={filters.candidate ?? null} period={filters.period ?? 'all'} isAdmin={session.role === 'admin'} />

      {/* 16. Análises complementares — só itens realmente secundários. Os
          gráficos estratégicos (KPIs, Termômetro, Alertas, Temas, Canais,
          Sentimento, Risco) NÃO ficam mais aqui — promovidos para o
          Panorama Analítico. Oportunidades Prioritárias (lista completa)
          fica aqui — a Síntese acima já mostra só a principal, sem
          duplicar Riscos (que tem sua própria linha, "Ação Imediata").
          Sprint UX — Etapa 6: a Tabela Executiva passou a viver dentro
          deste accordion (antes era uma seção própria, sempre visível, ao
          final da página) — fecha o arco narrativo da metade inferior em
          "Resumo Executivo → Indicadores → Alertas → Timeline → Relatório
          Executivo IA → Análises Complementares", sem um bloco extra solto
          depois do accordion. */}
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
