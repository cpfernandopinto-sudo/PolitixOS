import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { Users, TrendingUp, MapPin, ActivitySquare, AlertTriangle } from 'lucide-react';
import { LineChart, PopulationPyramid } from '@/components/dashboard/territorios/PolitixCharts';

export default async function DemografiaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier || !dossier.demography) return null;

  const data = dossier.demography;
  const isDemo = data.mode === 'demo';

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <NotebookHeader 
        title="Demografia e Estrutura Social" 
        summary={data.executiveSummary} 
      />
      {isDemo && (
        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-amber-400/90 leading-relaxed">
            <strong>Demonstrativo:</strong> Os dados demográficos foram populados para ilustrar a arquitetura e aguardam integração do Censo 2022.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 mb-8">
        <ContextualKPI label="População Total" indicator={data.population} icon={Users} />
        <ContextualKPI label="Densidade" indicator={data.density} icon={MapPin} />
        <ContextualKPI label="Taxa de Urbanização" indicator={data.urbanization} />
        <ContextualKPI label="Índ. Envelhecimento" indicator={data.agingIndex} icon={ActivitySquare} />
        <ContextualKPI label="Razão Dependência" indicator={data.dependencyRatio} />
        
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full">
           <div className="flex items-center justify-between mb-4">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cresc. Intercensitário</span>
             <TrendingUp size={16} className="text-slate-500" />
           </div>
           <div className="flex items-end gap-3 mb-2 mt-auto">
             <span className="text-2xl md:text-3xl font-bold text-white">{data.intercensalGrowth || 'N/A'}</span>
           </div>
           <div className="pt-4 border-t border-white/5 mt-auto">
             <span className="text-[11px] font-semibold text-slate-400">Entre 2010 e 2022</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Evolução Populacional */}
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Evolução Populacional</h3>
          {data.historicalPopulation && data.historicalPopulation.length > 0 ? (
            <LineChart 
              data={data.historicalPopulation} 
              xAxisKey="period" 
              lineKeys={[{ key: 'value', name: 'Habitantes', color: '#22d3ee' }]} 
              height={350} 
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-slate-500 text-xs">Sem dados históricos</div>
          )}
        </div>

        {/* Pirâmide Etária */}
        <div className="surface-primary rounded-xl p-6 border border-white/5 relative">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Estrutura Etária</h3>
          <p className="text-xs text-slate-400 mb-6">Distribuição populacional (Homens vs Mulheres)</p>
          {data.ageGroupDistrib && data.ageGroupDistrib.length > 0 ? (
            <PopulationPyramid 
               data={data.ageGroupDistrib}
               ageKey="group"
               maleKey="male"
               femaleKey="female"
               height={350}
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-slate-500 text-xs">Sem dados etários</div>
          )}
        </div>
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
