import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { HeartPulse, AlertTriangle } from 'lucide-react';
import { ChangeAnalysis } from '@/components/dashboard/territorios/CockpitComponents';

export default async function SaudePage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier || !dossier.health) return null;

  const data = dossier.health;

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <NotebookHeader 
        title="Saúde Pública" 
        summary={data.executiveSummary} 
      />

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ContextualKPI indicator={data.basicCoverage} icon={HeartPulse} label="Cobertura Básica (ESF)" />
        
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Demanda Hospitalar</span>
            <AlertTriangle size={16} className="text-slate-500" />
          </div>
          <div className="flex items-end gap-3 mb-4 mt-auto">
            <span className="text-2xl md:text-3xl font-bold text-amber-400">{data.hospitalDemand}</span>
          </div>
        </div>
      </div>

      <ChangeAnalysis 
        worsening={data.mainPressurePoints}
      />

      {/* Estrutura e Pressões */}
      <div className="grid grid-cols-1 gap-6 mb-8 mt-8">
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 md:p-6 flex flex-col justify-center">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Leitura Assistencial</h4>
          <p className="text-sm font-medium text-slate-300 leading-relaxed">
            {data.statusQualitative}
          </p>
        </div>
      </div>

      {/* Inteligência */}
      <PolitixInsight insight={data.insight} />
    </div>
  );
}
