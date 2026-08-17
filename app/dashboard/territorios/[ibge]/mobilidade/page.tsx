import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { LineChart, HorizontalBarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle } from 'lucide-react';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function MobilidadePage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const data = dossier?.mobility;
  const isDemo = Boolean(dossier && data);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Mobilidade Urbana e Trânsito — ${cityName}`}
      description="Frota de veículos, taxa de motorização, acidentabilidade, fluxo pendular e corredores viários."
      engineName="Motor Mobilidade"
      status={data ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'DENATRAN / IBGE (Demonstrativo — Fixture Contagem)' : 'DENATRAN / Secretaria de Mobilidade'}
    >
      {isDemo && data ? (
        <div className="space-y-6">
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
            <span>Selo de Transparência: Dados de mobilidade demonstrativos pré-carregados (Fixture Contagem).</span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase">DEMONSTRATIVO</span>
          </div>

          <NotebookHeader title="Mobilidade e Trânsito" summary={data.executiveSummary} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            <ContextualKPI label="Frota" indicator={data.fleet} />
            <ContextualKPI label="Motorização/1000" indicator={data.motorizationRate} />
            <ContextualKPI label="Acidentes/ano" indicator={data.accidents} />
            <ContextualKPI label="Fluxo Pendular" indicator={data.pendularFlow} />
            <ContextualKPI label="Transporte Coletivo" indicator={data.publicTransport} />
            <ContextualKPI label="Tempo Médio" indicator={data.avgCommute} />
          </div>

          <PolitixInsight insight={data.insight} />
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor Mobilidade"
          title="Dados de Mobilidade Urbana Ainda Não Consolidados"
          description={`As informações de frota e mobilidade urbana para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
