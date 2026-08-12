import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { ShieldAlert, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { LineChart, HorizontalBarChart } from '@/components/dashboard/territorios/PolitixCharts';

export default async function SegurancaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier || !dossier.security) return null;

  const data = dossier.security;
  const historicalData = data.historicalSeries || [];

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <NotebookHeader
        title="Segurança Pública"
        summary={data.executiveSummary}
      />

      {/* Source Badge */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
          SEJUSP MG — DADOS REAIS
        </span>
        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <AlertTriangle size={11} /> BENCHMARKS DEMONSTRATIVOS
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 mb-8">
        <ContextualKPI label="Crimes Violentos" indicator={data.violentCrimes} icon={ShieldAlert} />
        <ContextualKPI label="Crimes Patrimoniais" indicator={data.propertyCrimes} />
        <ContextualKPI label="Homicídios" indicator={data.homicides} />
        <ContextualKPI label="Roubos" indicator={data.robberies} />
        <ContextualKPI label="Furtos" indicator={data.thefts} />
        <ContextualKPI label="Furtos de Veículos" indicator={data.vehicles} />
      </div>

      {/* Main evolution chart + High/Low crimes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 surface-primary rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Evolução Histórica — 2019 a 2024</h3>
            <div className="flex gap-1.5">
              {['12m', '24m', '5a', 'Tudo'].map((t, i) => (
                <span key={t} className={`px-2 py-1 border rounded text-[10px] cursor-pointer transition-all ${i === 3 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>{t}</span>
              ))}
            </div>
          </div>
          {historicalData.length > 0 ? (
            <LineChart
              data={historicalData}
              xAxisKey="period"
              lineKeys={[
                { key: 'violentos', name: 'Violentos', color: '#f43f5e' },
                { key: 'patrimoniais', name: 'Patrimoniais', color: '#eab308' },
                { key: 'homicidios', name: 'Homicídios', color: '#9f1239' },
                { key: 'veiculos', name: 'Roubo/Furto Veíc.', color: '#3b82f6' }
              ]}
              height={300}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 text-xs">Dados históricos não disponíveis</div>
          )}
        </div>

        {/* Crimes em Alta / Baixa */}
        <div className="space-y-4">
          <div className="surface-primary rounded-xl p-5 border border-white/5">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={14} /> Crimes em Alta
            </h4>
            <div className="space-y-3">
              {data.growingCrimes?.map((crime, idx) => (
                <div key={idx} className="flex justify-between items-center pb-2 border-b border-white/5 last:border-0 last:pb-0">
                  <span className="text-sm text-slate-300 font-medium">{crime.nature}</span>
                  <div className="text-right">
                    <span className="block text-sm font-bold text-white">{crime.count.toLocaleString()}</span>
                    <span className="text-[10px] text-rose-400 font-semibold">{crime.variation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="surface-primary rounded-xl p-5 border border-white/5">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingDown size={14} /> Crimes em Queda
            </h4>
            <div className="space-y-3">
              {data.fallingCrimes?.map((crime, idx) => (
                <div key={idx} className="flex justify-between items-center pb-2 border-b border-white/5 last:border-0 last:pb-0">
                  <span className="text-sm text-slate-300 font-medium">{crime.nature}</span>
                  <div className="text-right">
                    <span className="block text-sm font-bold text-white">{crime.count.toLocaleString()}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">{crime.variation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Benchmark + Ranking + Sazonalidade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Ranking */}
        <div className="lg:col-span-1 surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Ranking por Natureza</h3>
          {data.topNatureRanking && data.topNatureRanking.length > 0 ? (
            <HorizontalBarChart
              data={data.topNatureRanking}
              yAxisKey="nature"
              barKey="count"
              name="Ocorrências"
              color="#3b82f6"
              height={250}
            />
          ) : null}
        </div>

        {/* Sazonalidade mensal */}
        <div className="lg:col-span-1 surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Sazonalidade Mensal</h3>
          <p className="text-[11px] text-slate-500 mb-5 uppercase tracking-widest">Índice de ocorrências (média = 100)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-1.5">
            {data.seasonality?.map((s) => {
              const pct = Math.min(100, Math.max(0, s.index));
              const color = s.index > 105 ? '#f43f5e' : s.index > 95 ? '#eab308' : '#10b981';
              return (
                <div key={s.month} className="flex flex-col items-center gap-1">
                  <div className="w-full h-16 bg-white/5 rounded flex items-end overflow-hidden">
                    <div
                      className="w-full rounded-t transition-all"
                      style={{ height: `${pct}%`, backgroundColor: color + '80', border: `1px solid ${color}40` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold">{s.month.slice(0,3)}</span>
                  <span className="text-[9px] font-bold" style={{ color }}>{s.index}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-600 mt-3">
            Valores acima de 100 indicam sazonalidade superior à média anual.
          </p>
        </div>

        {/* Benchmark */}
        <div className="lg:col-span-1 surface-primary rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Benchmark — Taxa/100k</h3>
            <span className="text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded px-2 py-0.5 font-bold">DEMO</span>
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Crimes Violentos / 100k</p>
              {[
                { label: 'Contagem', value: data.benchmarks?.violentCrimesPer100k?.contagem ?? 199.4, color: 'bg-cyan-500' },
                { label: 'RMBH', value: data.benchmarks?.violentCrimesPer100k?.rmbh ?? 171.4, color: 'bg-white/50' },
                { label: 'MG', value: data.benchmarks?.violentCrimesPer100k?.mg ?? 199.8, color: 'bg-slate-600' },
              ].map(b => {
                const max = Math.max(data.benchmarks?.violentCrimesPer100k?.contagem ?? 200, data.benchmarks?.violentCrimesPer100k?.mg ?? 200) * 1.1;
                const pct = (b.value / max) * 100;
                return (
                  <div key={b.label} className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-slate-300 font-semibold">{b.label}</span>
                      <span className="text-[11px] text-white font-bold">{b.value}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Homicídios / 100k</p>
              {[
                { label: 'Contagem', value: data.benchmarks?.homicidesPer100k?.contagem ?? 13.7, color: 'bg-rose-500' },
                { label: 'RMBH', value: data.benchmarks?.homicidesPer100k?.rmbh ?? 14.1, color: 'bg-white/50' },
                { label: 'MG', value: data.benchmarks?.homicidesPer100k?.mg ?? 21.4, color: 'bg-slate-600' },
              ].map(b => {
                const max = 25;
                const pct = (b.value / max) * 100;
                return (
                  <div key={b.label} className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-slate-300 font-semibold">{b.label}</span>
                      <span className="text-[11px] text-white font-bold">{b.value}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
