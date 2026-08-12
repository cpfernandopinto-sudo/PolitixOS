import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { LineChart, HorizontalBarChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, Briefcase, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

export default async function EmpregoRendaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier) return null;
  const data = dossier.employment;
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
        title="Emprego e Renda"
        summary={data.executiveSummary}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        <ContextualKPI label="Empregos Formais" indicator={data.formalJobs} icon={Briefcase} />
        <ContextualKPI label="Saldo 12m" indicator={data.balance} icon={TrendingUp} />
        <ContextualKPI label="Admissões" indicator={{ value: data.admissions ?? 0 }} icon={TrendingUp} />
        <ContextualKPI label="Desligamentos" indicator={{ value: data.dismissals ?? 0 }} icon={TrendingDown} />
        <ContextualKPI label="Remuneração Média" indicator={data.averageSalary} icon={DollarSign} />
        <ContextualKPI label="Renda per Capita" indicator={data.incomePerCapita} icon={Wallet} />
      </div>

      <div className="surface-primary rounded-xl p-5 border border-white/5">
        <h3 className="text-base font-semibold text-white dark:text-white mb-4">Saldo Mensal de Empregos</h3>
        <div className="h-[250px]">
          <BarChart
            data={data.monthlyBalance ?? []}
            xAxisKey="period"
            barKey="balance"
            name="Saldo"
            color="#10b981"
            height={250}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Admissões vs Desligamentos</h3>
          <div className="h-[220px]">
            <LineChart
              data={data.monthlyBalance ?? []}
              xAxisKey="period"
              lineKeys={[
                { key: 'admissions', name: 'Admissões', color: '#10b981' },
                { key: 'dismissals', name: 'Desligamentos', color: '#f43f5e' }
              ]}
              height={220}
            />
          </div>
        </div>
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Saldo por Setor</h3>
          <div className="h-[220px]">
            <HorizontalBarChart
              data={data.sectorBalance ?? []}
              yAxisKey="sector"
              barKey="balance"
              name="Saldo"
              color="#3b82f6"
              height={220}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Evolução da Remuneração</h3>
          <div className="h-[220px]">
            <LineChart
              data={data.historicalSalary ?? []}
              xAxisKey="period"
              lineKeys={[{ key: 'value', name: 'Remuneração (R$)', color: '#8b5cf6' }]}
              height={220}
            />
          </div>
        </div>
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Evolução do Estoque Formal</h3>
          <div className="h-[220px]">
            <LineChart
              data={data.historicalFormalJobs ?? []}
              xAxisKey="period"
              lineKeys={[{ key: 'value', name: 'Estoque Formal', color: '#0ea5e9' }]}
              height={220}
            />
          </div>
        </div>
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
