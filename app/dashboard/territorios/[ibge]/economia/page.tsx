import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { Landmark, TrendingUp, Building2 } from 'lucide-react';
import { ChangeAnalysis } from '@/components/dashboard/territorios/CockpitComponents';

export default async function EconomiaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier || !dossier.economy) return null;

  const data = dossier.economy;

  // Extraindo informacoes para o ChangeAnalysis a partir dos trends/dados qualitativos
  let improving = [];
  let worsening = [];
  if(data.employmentTrend.includes('Crescimento') || data.employmentTrend.includes('Alta')) improving.push(`Emprego Formal (${data.employmentTrend})`);
  else if(data.employmentTrend.includes('Queda') || data.employmentTrend.includes('Baixa')) worsening.push(`Emprego Formal (${data.employmentTrend})`);

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <NotebookHeader 
        title="Economia e Vocação" 
        summary={data.executiveSummary} 
      />

      {/* Visão Macro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors flex flex-col h-full col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Atividade Principal</span>
            <Landmark size={16} className="text-slate-500" />
          </div>
          <div className="flex items-end gap-3 mb-4 mt-auto">
            <span className="text-xl md:text-2xl font-bold text-white">{data.mainActivity}</span>
          </div>
        </div>
        
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Emprego Formal</span>
            <TrendingUp size={16} className="text-slate-500" />
          </div>
          <div className="flex items-end gap-3 mb-4 mt-auto">
            <span className="text-xl font-bold text-emerald-400">{data.employmentTrend}</span>
          </div>
        </div>

        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dependência do Setor Público</span>
            <Building2 size={16} className="text-slate-500" />
          </div>
          <div className="flex items-end gap-3 mb-4 mt-auto">
            <span className="text-xl font-bold text-slate-200">{data.dependencyOnPublicServices}</span>
          </div>
        </div>
      </div>

      <ChangeAnalysis 
        improving={improving}
        worsening={worsening}
      />

      {/* Estrutura Econômica */}
      <div className="bg-[#111726] border border-white/5 rounded-xl p-5 md:p-6 mb-8 mt-8">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Setores Predominantes</h4>
        <div className="flex flex-wrap gap-3">
          {data.predominantSectors.map((sec, i) => (
            <div key={i} className="px-5 py-3 bg-white/5 border border-white/5 rounded-lg text-sm font-semibold text-cyan-400 hover:bg-cyan-500/10 transition-colors">
              {sec}
            </div>
          ))}
        </div>
      </div>

      {/* Inteligência */}
      <PolitixInsight insight={data.insight} />
    </div>
  );
}
