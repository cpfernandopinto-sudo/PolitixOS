import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { LineChart, HorizontalBarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, Droplets, Trash2, Wifi, Zap, HardHat } from 'lucide-react';

export default async function InfraestruturaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier) return null;
  const data = dossier.infrastructure;
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
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Evolução: Água</h3>
          <div className="h-[220px]">
            <LineChart
              data={data.historicalWater ?? []}
              xAxisKey="period"
              lineKeys={[{ key: 'value', name: 'Cobertura %', color: '#22d3ee' }]}
              height={220}
            />
          </div>
        </div>
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Evolução: Esgoto</h3>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Gap de Infraestrutura (Déficit %)</h3>
          <div className="h-[220px]">
            <HorizontalBarChart
              data={data.infrastructureGap ?? []}
              yAxisKey="area"
              barKey="gap"
              name="Gap %"
              color="#f43f5e"
              height={220}
            />
          </div>
        </div>

        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Benchmark (Saneamento)</h3>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Água Encanada</p>
              {[
                { label: 'Contagem', value: data.benchmarks?.water?.contagem ?? 0, color: 'bg-cyan-500' },
                { label: 'RMBH', value: data.benchmarks?.water?.rmbh ?? 0, color: 'bg-white/50' },
                { label: 'MG', value: data.benchmarks?.water?.mg ?? 0, color: 'bg-slate-400' },
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
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Esgotamento Sanitário</p>
              {[
                { label: 'Contagem', value: data.benchmarks?.sewage?.contagem ?? 0, color: 'bg-lime-500' },
                { label: 'RMBH', value: data.benchmarks?.sewage?.rmbh ?? 0, color: 'bg-white/50' },
                { label: 'MG', value: data.benchmarks?.sewage?.mg ?? 0, color: 'bg-slate-400' },
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
          </div>
        </div>
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
