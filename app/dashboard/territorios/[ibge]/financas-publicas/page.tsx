import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { LineChart, HorizontalBarChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, Landmark, PiggyBank, Briefcase, ActivitySquare } from 'lucide-react';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function FinancasPublicasPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const data = dossier?.publicFinances;
  const isDemo = Boolean(dossier && data);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Finanças Públicas e Execução Orçamentária — ${cityName}`}
      description="Receita total, despesas por função, autonomia fiscal, investimentos e dados do SICONFI."
      engineName="Motor SICONFI"
      status={data ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'Tesouro Nacional / SICONFI (Demonstrativo — Fixture Contagem)' : 'Tesouro Nacional / SICONFI DCA'}
    >
      {isDemo && data ? (
        <div className="space-y-6">
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
            <span>Selo de Transparência: Dados fiscais demonstrativos pré-carregados (Fixture Contagem).</span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase">DEMONSTRATIVO</span>
          </div>

          <NotebookHeader
            title="Finanças Públicas"
            summary={data.executiveSummary}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            <ContextualKPI label="Receita Total" indicator={data.revenue} icon={Landmark} />
            <ContextualKPI label="Receita Própria" indicator={data.ownRevenue} />
            <ContextualKPI label="Despesa Total" indicator={data.expenditure} />
            <ContextualKPI label="Investimento" indicator={data.investment} />
            <ContextualKPI label="Pessoal e Encarg." indicator={data.personnelExpenditure} icon={Briefcase} />
            <ContextualKPI label="Dívida Consol." indicator={data.debt} />
          </div>

          <div className="surface-primary rounded-xl p-5 border border-white/5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
              <ActivitySquare size={16} className="text-indigo-400" />
              Evolução: Receita vs Despesa
            </h3>
            <div className="h-[300px]">
              <LineChart
                data={data.historicalRevenue ?? []}
                xAxisKey="period"
                lineKeys={[
                  { key: 'revenue', name: 'Receita', color: '#10b981' },
                  { key: 'expenditure', name: 'Despesa', color: '#f43f5e' }
                ]}
                height={300}
              />
            </div>
          </div>

          <PolitixInsight insight={data.insight} />
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor SICONFI"
          title="Dados Fiscais SICONFI Ainda Não Consolidados"
          description={`As informações de execução orçamentária do SICONFI para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
