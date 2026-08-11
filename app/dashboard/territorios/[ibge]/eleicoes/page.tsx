import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, TrendChart, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { Users, TrendingUp, TrendingDown, Target } from 'lucide-react';

export default async function EleicoesPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier || !dossier.electoral) return null;

  const data = dossier.electoral;

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <NotebookHeader 
        title="Ambiente Eleitoral" 
        summary={data.executiveSummary} 
      />

      {/* Visão Macro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <ContextualKPI label="Eleitorado Apto" indicator={data.electorate} icon={Users} />
        <ContextualKPI label="Comparecimento Médio" indicator={data.participation} icon={TrendingUp} />
        <ContextualKPI label="Abstenção Média" indicator={data.abstention} icon={TrendingDown} />
      </div>

      {/* Diagnóstico Rápido e Histórico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#111726] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Target size={14} />
              Diagnóstico de Competitividade
            </h4>
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-slate-500 mb-1">Tendência Histórica</span>
                <p className="text-sm font-medium text-slate-300 leading-relaxed">
                  {data.historicalTrend}
                </p>
              </div>
              {data.competitiveness && (
                <div className="pt-4 border-t border-white/5">
                  <span className="block text-xs font-semibold text-slate-500 mb-1">Fragmentação</span>
                  <p className="text-sm font-bold text-white">
                    {data.competitiveness}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {data.electorate.historicalSeries && (
            <TrendChart data={data.electorate.historicalSeries} title="Evolução do Eleitorado" />
          )}
        </div>
      </div>

      {/* Inteligência */}
      <PolitixInsight insight={data.insight} />
    </div>
  );
}
