import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { HeartPulse, Stethoscope, Building2, Bed, Activity, UserPlus } from 'lucide-react';
import { LineChart, HorizontalBarChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function SaudePage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const data = dossier?.health;
  const isDemo = Boolean(dossier && data);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Saúde Pública: Capacidade e Pressão Assistencial — ${cityName}`}
      description="Infraestrutura de saúde, leitos UTI, cobertura da atenção básica e capacidade assistencial."
      engineName="Motor Saúde / CNES"
      status={data ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'CNES / DATASUS (Demonstrativo — Fixture Contagem)' : 'CNES / DATASUS (Ministério da Saúde)'}
    >
      {isDemo && data ? (
        <div className="space-y-8">
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
            <span>Selo de Transparência: Dados de saúde demonstrativos pré-carregados (Fixture Contagem).</span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase">DEMONSTRATIVO</span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            <ContextualKPI label="Cobertura ESF" indicator={data.basicCoverage} icon={HeartPulse} />
            <ContextualKPI label="Leitos/1k hab" indicator={data.beds} icon={Bed} />
            <ContextualKPI label="UTI/1k hab" indicator={data.utiBeds} />
            <ContextualKPI label="Médicos/10k hab" indicator={data.doctors} icon={Stethoscope} />
            <ContextualKPI label="Internações" indicator={data.internations} icon={Activity} />
            <ContextualKPI label="Mortalidade" indicator={data.mortality} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Evolução Cobertura ESF</h3>
              {data.historicalBasicCoverage && data.historicalBasicCoverage.length > 0 ? (
                <LineChart
                  data={data.historicalBasicCoverage}
                  xAxisKey="period"
                  lineKeys={[{ key: 'value', name: 'Cobertura %', color: '#10b981' }]}
                  height={200}
                />
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem dados históricos</div>
              )}
            </div>

            <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Médicos por 10k Hab</h3>
              {data.historicalDoctors && data.historicalDoctors.length > 0 ? (
                <LineChart
                  data={data.historicalDoctors}
                  xAxisKey="period"
                  lineKeys={[{ key: 'value', name: 'Médicos', color: '#3b82f6' }]}
                  height={200}
                />
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem dados históricos</div>
              )}
            </div>

            <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Leitos por 1k Hab</h3>
              {data.historicalBeds && data.historicalBeds.length > 0 ? (
                <LineChart
                  data={data.historicalBeds}
                  xAxisKey="period"
                  lineKeys={[{ key: 'value', name: 'Leitos', color: '#f43f5e' }]}
                  height={200}
                />
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem dados históricos</div>
              )}
            </div>
          </div>

          {data.insight && <PolitixInsight insight={data.insight} />}
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor Saúde / CNES"
          title="Dados de Saúde Pública Ainda Não Consolidados"
          description={`As informações de infraestrutura de saúde e leitos CNES para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
