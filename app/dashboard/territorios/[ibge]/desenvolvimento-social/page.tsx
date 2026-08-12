import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { LineChart, HorizontalBarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, TrendingDown, Users, Coins, Percent } from 'lucide-react';

export default async function DesenvolvimentoSocialPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier) return null;
  const data = dossier.socialDevelopment;
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
        title="Desenvolvimento Social"
        summary={data.executiveSummary}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        <ContextualKPI label="Pobreza" indicator={data.povertyRate} icon={TrendingDown} />
        <ContextualKPI label="Extrema Pobreza" indicator={data.extremePovertyRate} />
        <ContextualKPI label="CadÚnico" indicator={data.cadUnico} icon={Users} />
        <ContextualKPI label="Transferências" indicator={data.transfers} icon={Coins} />
        <ContextualKPI label="Gini" indicator={data.giniIndex} icon={Percent} />
        <ContextualKPI label="Vulnerabilidade" indicator={data.socialVulnerability} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Evolução: Taxa de Pobreza (%)</h3>
          <div className="h-[220px]">
            <LineChart
              data={data.historicalPoverty ?? []}
              xAxisKey="period"
              lineKeys={[{ key: 'value', name: 'Pobreza %', color: '#f43f5e' }]}
              height={220}
            />
          </div>
        </div>
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Evolução: CadÚnico (Famílias)</h3>
          <div className="h-[220px]">
            <LineChart
              data={data.historicalCadUnico ?? []}
              xAxisKey="period"
              lineKeys={[{ key: 'value', name: 'Famílias', color: '#f97316' }]}
              height={220}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Distribuição de Renda (SM)</h3>
          <div className="h-[200px]">
            <HorizontalBarChart
              data={data.incomeDistribution ?? []}
              yAxisKey="bracket"
              barKey="percentage"
              name="% Famílias"
              color="#8b5cf6"
              height={200}
            />
          </div>
        </div>

        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Benchmark (Desigualdade)</h3>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Taxa de Pobreza (%)</p>
              {[
                { label: 'Contagem', value: data.benchmarks?.poverty?.contagem ?? 0, color: 'bg-rose-500' },
                { label: 'RMBH', value: data.benchmarks?.poverty?.rmbh ?? 0, color: 'bg-white/50' },
                { label: 'MG', value: data.benchmarks?.poverty?.mg ?? 0, color: 'bg-slate-400' },
              ].map(b => (
                <div key={b.label} className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-300 dark:text-slate-300 font-medium">{b.label}</span>
                    <span className="text-xs text-white dark:text-white font-bold">{b.value}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Índice de Gini</p>
              {[
                { label: 'Contagem', value: data.benchmarks?.gini?.contagem ?? 0, color: 'bg-indigo-500' },
                { label: 'RMBH', value: data.benchmarks?.gini?.rmbh ?? 0, color: 'bg-white/50' },
                { label: 'MG', value: data.benchmarks?.gini?.mg ?? 0, color: 'bg-slate-400' },
              ].map(b => (
                <div key={b.label} className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-300 dark:text-slate-300 font-medium">{b.label}</span>
                    <span className="text-xs text-white dark:text-white font-bold">{b.value}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.value * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
