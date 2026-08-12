import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { LineChart, HorizontalBarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, GraduationCap, Users, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default async function EducacaoPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier) return null;
  const data = dossier.education;
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
        title="Educação Pública"
        summary={data.executiveSummary}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        <ContextualKPI label="IDEB Anos Iniciais" indicator={data.idebElementary} icon={GraduationCap} />
        <ContextualKPI label="IDEB Anos Finais" indicator={data.ideb} icon={GraduationCap} />
        <ContextualKPI label="Matrículas" indicator={data.enrollments} icon={Users} />
        <ContextualKPI label="Aprovação" indicator={data.approvalRate} icon={TrendingUp} />
        <ContextualKPI label="Abandono" indicator={data.dropoutRate} icon={TrendingDown} />
        <ContextualKPI label="Distorção I-S" indicator={data.ageDistortionRate} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Evolução: IDEB (Anos Finais)</h3>
          <div className="h-[220px]">
            <LineChart
              data={(data.historicalIdeb ?? []) as any[]}
              xAxisKey="period"
              lineKeys={[
                { key: 'value', name: 'Contagem', color: '#8b5cf6' },
                { key: 'mg', name: 'Minas Gerais', color: '#94a3b8' }
              ]}
              height={220}
            />
          </div>
        </div>
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Evolução: Matrículas</h3>
          <div className="h-[220px]">
            <LineChart
              data={(data.historicalEnrollments ?? []) as any[]}
              xAxisKey="period"
              lineKeys={[{ key: 'value', name: 'Matrículas', color: '#10b981' }]}
              height={220}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Matrículas por Etapa</h3>
          <div className="h-[200px]">
            <HorizontalBarChart
              data={(data.enrollmentsByLevel ?? []) as any[]}
              yAxisKey="level"
              barKey="value"
              name="Alunos"
              color="#0ea5e9"
              height={200}
            />
          </div>
        </div>

        <div className="surface-primary rounded-xl p-5 border border-white/5">
          <h3 className="text-base font-semibold text-white dark:text-white mb-4">Benchmark (IDEB)</h3>
          <div className="space-y-4 mt-6">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Anos Finais</p>
              {[
                { label: 'Contagem', value: data.benchmarks?.ideb?.contagem ?? 0, color: 'bg-indigo-500' },
                { label: 'Brasil', value: data.benchmarks?.ideb?.brazil ?? 0, color: 'bg-emerald-500' },
                { label: 'RMBH', value: data.benchmarks?.ideb?.rmbh ?? 0, color: 'bg-white/50' },
                { label: 'MG', value: data.benchmarks?.ideb?.mg ?? 0, color: 'bg-slate-400' },
              ].map(b => (
                <div key={b.label} className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-300 dark:text-slate-300 font-medium">{b.label}</span>
                    <span className="text-xs text-white dark:text-white font-bold">{b.value}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${b.color}`} style={{ width: `${(b.value / 6) * 100}%` }} />
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
