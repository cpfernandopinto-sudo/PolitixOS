import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { NotebookHeader, ContextualKPI } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { Briefcase, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { LineChart, BarChart, HorizontalBarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function EmpregoRendaEmpregoPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const data = dossier?.employment;
  const isDemo = Boolean(dossier && data);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Emprego e Renda Detalhado — ${cityName}`}
      description="Estoque de empregos formais, movimentação do Novo CAGED e remuneração média."
      engineName="Motor Economia / CAGED"
      status={data ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'MTE / CAGED (Demonstrativo — Fixture Contagem)' : 'MTE / Novo CAGED'}
    >
      {isDemo && data ? (
        <div className="space-y-6">
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
            <span>Selo de Transparência: Dados de emprego demonstrativos pré-carregados (Fixture Contagem).</span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase">DEMONSTRATIVO</span>
          </div>

          <NotebookHeader 
            title="Emprego e Renda" 
            summary={data.executiveSummary} 
          />

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 mb-8">
            <ContextualKPI label="Estoque Formal" indicator={data.formalJobs} icon={Briefcase} />
            <ContextualKPI label="Saldo Empregos" indicator={data.balance} />
            <ContextualKPI label="Salário Médio" indicator={data.averageSalary} icon={DollarSign} />
            <ContextualKPI label="Renda per Capita" indicator={data.incomePerCapita} />
            
            <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full">
               <div className="flex items-center justify-between mb-2 font-mono">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maior Contratante</span>
                 <TrendingUp size={14} className="text-emerald-500" />
               </div>
               <div className="flex items-end gap-3 mb-2 mt-auto">
                 <span className="text-sm font-bold text-emerald-400 leading-tight font-mono">{data.topHiringSector || 'N/A'}</span>
               </div>
            </div>

            <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full">
               <div className="flex items-center justify-between mb-2 font-mono">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maior Demissor</span>
                 <TrendingDown size={14} className="text-rose-500" />
               </div>
               <div className="flex items-end gap-3 mb-2 mt-auto">
                 <span className="text-sm font-bold text-rose-400 leading-tight font-mono">{data.topFiringSector || 'N/A'}</span>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor Economia / CAGED"
          title="Dados de Emprego Detalhado Ainda Não Consolidados"
          description={`As informações de emprego e renda para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
