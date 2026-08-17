import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { LineChart, HorizontalBarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, Droplets, Trash2, Wifi, Zap, HardHat } from 'lucide-react';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function InfraestruturaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const data = dossier?.infrastructure;
  const isDemo = Boolean(dossier && data);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Infraestrutura Urbana e Saneamento — ${cityName}`}
      description="Cobertura de água, esgoto, coleta de lixo, iluminação pública, pavimentação e déficit de infraestrutura."
      engineName="Motor Infraestrutura / SNIS"
      status={data ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'SNIS / IBGE (Demonstrativo — Fixture Contagem)' : 'SNIS (Sistema Nacional de Informações sobre Saneamento)'}
    >
      {isDemo && data ? (
        <div className="space-y-6">
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
            <span>Selo de Transparência: Dados de infraestrutura demonstrativos pré-carregados (Fixture Contagem).</span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase">DEMONSTRATIVO</span>
          </div>

          <NotebookHeader
            title="Infraestrutura Urbana"
            summary={data.executiveSummary}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            <ContextualKPI label="Água" indicator={data.waterCoverage} icon={Droplets} />
            <ContextualKPI label="Esgoto" indicator={data.sewageCoverage} />
            <ContextualKPI label="Coleta de Lixo" indicator={data.garbageCollection} icon={Trash2} />
            <ContextualKPI label="Pavimentação" indicator={data.pavement} icon={HardHat} />
            <ContextualKPI label="Iluminação" indicator={data.streetLighting} icon={Zap} />
            <ContextualKPI label="Internet" indicator={data.internetCoverage} icon={Wifi} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="surface-primary rounded-xl p-5 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Evolução: Água</h3>
              <div className="h-[220px]">
                <LineChart
                  data={data.historicalWater ?? []}
                  xAxisKey="period"
                  lineKeys={[{ key: 'value', name: 'Cobertura %', color: '#22d3ee' }]}
                  height={220}
                />
              </div>
            </div>
            <div className="surface-primary rounded-xl p-5 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Evolução: Esgoto</h3>
              <div className="h-[220px]">
                <LineChart
                  data={data.historicalSewage ?? []}
                  xAxisKey="period"
                  lineKeys={[{ key: 'value', name: 'Cobertura %', color: '#a3e635' }]}
                  height={220}
                />
              </div>
            </div>
          </div>

          <PolitixInsight insight={data.insight} />
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor Infraestrutura / SNIS"
          title="Dados de Infraestrutura Ainda Não Consolidados"
          description={`As informações de saneamento e infraestrutura do SNIS para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
