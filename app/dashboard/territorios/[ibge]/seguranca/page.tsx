import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight, TrendChart } from '@/components/dashboard/territorios/AnalyticalComponents';
import { ShieldAlert, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ChangeAnalysis } from '@/components/dashboard/territorios/CockpitComponents';

export default async function SegurancaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier || !dossier.security) return null;

  const data = dossier.security;

  // Gerando os dados mockados de mudanças da página de segurança com base nas trends
  const worseningItems = data.topNatureRanking
    .filter(item => item.trend === 'up')
    .map(item => `${item.nature} (${item.variation})`);

  const improvingItems = data.topNatureRanking
    .filter(item => item.trend === 'down')
    .map(item => `${item.nature} (${item.variation})`);

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <NotebookHeader 
        title="Segurança Pública" 
        summary={data.executiveSummary} 
      />

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {data.generalIndicator && (
          <ContextualKPI indicator={data.generalIndicator} icon={ShieldAlert} label="Status Geral" />
        )}
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Leitura Estratégica</h4>
            <p className="text-sm font-medium text-slate-300 leading-relaxed">
              {data.strategicReading}
            </p>
          </div>
        </div>
      </div>

      <ChangeAnalysis 
        worsening={worseningItems}
        improving={improvingItems}
      />

      {/* Histórico e Naturezas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 mt-8">
        {data.monthlyEvolution && (
          <TrendChart data={data.monthlyEvolution} title="Evolução de Ocorrências (6 Meses)" />
        )}
        
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 md:p-6 flex flex-col">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Principais Naturezas (Crimes Violentos)</h4>
          <div className="space-y-3">
            {data.topNatureRanking.map((item, idx) => {
              return (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500 w-4">{idx + 1}</span>
                    <span className="text-sm font-semibold text-slate-200">{item.nature}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-white">{item.count}</span>
                    <div className={`flex items-center gap-1 text-xs font-bold w-16 justify-end ${
                      item.trend === 'up' ? 'text-rose-400' :
                      item.trend === 'down' ? 'text-emerald-400' :
                      'text-slate-400'
                    }`}>
                      {item.trend === 'up' && <TrendingUp size={12} />}
                      {item.trend === 'down' && <TrendingDown size={12} />}
                      {item.trend === 'stable' && <Minus size={12} />}
                      {item.variation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inteligência */}
      <PolitixInsight insight={data.insight} />
    </div>
  );
}
