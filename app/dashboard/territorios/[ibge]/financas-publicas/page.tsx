import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { LineChart, HorizontalBarChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, Landmark, PiggyBank, Briefcase, ActivitySquare } from 'lucide-react';

export default async function FinancasPublicasPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier) return null;
  const data = dossier.publicFinances;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20 gap-1.5">
          <AlertTriangle size={14} />
          MVP • DADOS DEMONSTRATIVOS
        </span>
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

      <div className="surface-primary rounded-xl p-5 border border-white/5">
        <h3 className="text-base font-semibold text-white dark:text-white mb-4 flex items-center gap-2">
          <ActivitySquare size={16} className="text-indigo-500" />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 surface-primary rounded-xl p-5 border border-white/5 flex flex-col justify-center items-center text-center">
          <PiggyBank size={32} className="text-cyan-500 mb-4" />
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Autonomia Fiscal</h3>
          <div className="text-4xl font-bold text-white dark:text-white mb-2">{data.fiscalAutonomy?.value ?? 'N/D'}</div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 px-4">
            Proporção das receitas geradas no próprio município em relação à receita total. Reflete a independência de transferências externas.
          </p>
        </div>

        <div className="lg:col-span-1 surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Investimento (R$ Mi)</h3>
          <div className="h-[220px]">
            <BarChart
              data={data.historicalInvestment ?? []}
              xAxisKey="period"
              barKey="value"
              name="Investimento"
              color="#22d3ee"
              height={220}
            />
          </div>
        </div>

        <div className="lg:col-span-1 surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Despesas por Função</h3>
          <div className="h-[260px]">
            <HorizontalBarChart
              data={data.spendingByFunction ?? []}
              yAxisKey="function"
              barKey="value"
              name="R$ Mi"
              color="#8b5cf6"
              height={260}
            />
          </div>
        </div>
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
