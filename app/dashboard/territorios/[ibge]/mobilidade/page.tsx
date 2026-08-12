import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { LineChart, HorizontalBarChart, MapPlaceholder } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle } from 'lucide-react';

export default async function MobilidadePage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier) return null;
  const data = dossier.mobility;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <NotebookHeader title="Mobilidade e Trânsito" summary={data.executiveSummary} />
      
      <div className="mb-6 flex items-center gap-3">
        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <AlertTriangle size={11} /> MVP • DADOS DEMONSTRATIVOS
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        <ContextualKPI label="Frota" indicator={data.fleet} />
        <ContextualKPI label="Motorização/1000" indicator={data.motorizationRate} />
        <ContextualKPI label="Acidentes/ano" indicator={data.accidents} />
        <ContextualKPI label="Fluxo Pendular" indicator={data.pendularFlow} />
        <ContextualKPI label="Transporte Coletivo" indicator={data.publicTransport} />
        <ContextualKPI label="Tempo Médio" indicator={data.avgCommute} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Evolução da Frota</h3>
          <LineChart data={data.historicalFleet ?? []} xAxisKey="period" lineKeys={[{key:'value',name:'Veículos',color:'#3b82f6'}]} height={220} />
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Acidentes de Trânsito</h3>
          <LineChart data={data.historicalAccidents ?? []} xAxisKey="period" lineKeys={[{key:'value',name:'Acidentes',color:'#f43f5e'}]} height={220} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Fluxo Pendular</h3>
          <HorizontalBarChart data={data.pendularInOut ?? []} yAxisKey="direction" barKey="value" name="Trabalhadores" color="#8b5cf6" height={160} />
        </div>
        
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Corredores Estratégicos</h3>
          <div className="space-y-3">
            {data.strategicCorridors?.map((corridor, idx: number) => {
              let colorClass = "bg-white/50/10 text-slate-400 border-slate-500/20";
              if (corridor.status === "CONGESTIONADO") colorClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
              else if (corridor.status === "INTENSO") colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
              else if (corridor.status === "MODERADO") colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
              
              return (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-slate-800/50 bg-slate-900/30">
                  <span className="text-sm text-slate-200">{corridor.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colorClass}`}>
                    {corridor.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
        <MapPlaceholder title="Densidade de Tráfego" height={250} />
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
