import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, TrendChart, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { Users, UserPlus, Map, Activity } from 'lucide-react';

export default async function DemografiaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier || !dossier.demography) return null;

  const data = dossier.demography;

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <NotebookHeader 
        title="Demografia e População" 
        summary={data.executiveSummary} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ContextualKPI label="População Residente" indicator={data.population} icon={Users} />
        <ContextualKPI label="Densidade" indicator={data.density} icon={Map} />
        <ContextualKPI label="Urbanização" indicator={data.urbanization} icon={UserPlus} />
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Envelhecimento</span>
              <Activity size={16} className="text-slate-500" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white block mb-1">14,3%</span>
              <span className="text-xs font-semibold text-slate-400">da população acima de 60 anos</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 md:p-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
            Distribuição Etária
          </h4>
          <div className="flex h-48 items-end gap-2 px-2 pb-6 pt-10 border-b border-white/10 relative">
            {data.ageGroupDistrib.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                <div className="absolute -top-8 bg-[#0B0F19] border border-white/10 px-2 py-1 rounded text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {item.percentage}%
                </div>
                <div 
                  className="w-full bg-blue-500/20 hover:bg-cyan-400/40 rounded-t transition-all duration-300"
                  style={{ height: `${item.percentage * 3}%` }}
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-3">
                  {item.group}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {data.population.historicalSeries && (
          <TrendChart data={data.population.historicalSeries} title="Evolução Populacional" />
        )}
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
