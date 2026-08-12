import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI } from '@/components/dashboard/territorios/AnalyticalComponents';
import { Briefcase, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { LineChart, BarChart, HorizontalBarChart } from '@/components/dashboard/territorios/PolitixCharts';

export default async function EmpregoRendaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  // Fallback to loading/empty state if no data
  if (!dossier || !dossier.employment) return null;

  const data = dossier.employment;
  const isDemo = data.mode === 'demo';

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <NotebookHeader 
        title="Emprego e Renda" 
        summary={data.executiveSummary} 
      />
      {isDemo && (
        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-amber-400/90 leading-relaxed">
            <strong>Demonstrativo:</strong> Os indicadores do CAGED aguardam consolidação do fluxo de ingestão no Motor Econômico.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 mb-8">
        <ContextualKPI label="Estoque Formal" indicator={data.formalJobs} icon={Briefcase} />
        <ContextualKPI label="Saldo Empregos" indicator={data.balance} />
        <ContextualKPI label="Salário Médio" indicator={data.averageSalary} icon={DollarSign} />
        <ContextualKPI label="Renda per Capita" indicator={data.incomePerCapita} />
        
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full">
           <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maior Contratante</span>
             <TrendingUp size={14} className="text-emerald-500" />
           </div>
           <div className="flex items-end gap-3 mb-2 mt-auto">
             <span className="text-sm font-bold text-emerald-400 leading-tight">{data.topHiringSector || 'N/A'}</span>
           </div>
        </div>

        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full">
           <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maior Demissor</span>
             <TrendingDown size={14} className="text-rose-500" />
           </div>
           <div className="flex items-end gap-3 mb-2 mt-auto">
             <span className="text-sm font-bold text-rose-400 leading-tight">{data.topFiringSector || 'N/A'}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Saldo Mensal de Empregos */}
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Saldo Mensal (Admissões - Desligamentos)</h3>
          {data.monthlyBalance && data.monthlyBalance.length > 0 ? (
            <BarChart 
              data={data.monthlyBalance} 
              xAxisKey="period" 
              barKey="balance"
              name="Saldo"
              color="#10b981"
              height={300} 
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 text-xs">Sem dados históricos</div>
          )}
        </div>

        {/* Admissões vs Desligamentos */}
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Volume Mensal (Admissões vs Desligamentos)</h3>
          {data.monthlyBalance && data.monthlyBalance.length > 0 ? (
            <LineChart 
              data={data.monthlyBalance} 
              xAxisKey="period" 
              lineKeys={[
                { key: 'admissions', name: 'Admissões', color: '#10b981' },
                { key: 'dismissals', name: 'Desligamentos', color: '#f43f5e' }
              ]} 
              height={300} 
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 text-xs">Sem dados históricos</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
         <div className="surface-primary rounded-xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Saldo Acumulado por Setor</h3>
            {data.sectorBalance && data.sectorBalance.length > 0 ? (
              <HorizontalBarChart 
                data={data.sectorBalance} 
                yAxisKey="sector" 
                barKey="balance"
                name="Vagas"
                color="#3b82f6"
                height={250} 
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500 text-xs">Sem dados setoriais</div>
            )}
         </div>

         <div className="surface-primary rounded-xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Evolução da Remuneração Média</h3>
            {data.historicalSalary && data.historicalSalary.length > 0 ? (
              <LineChart 
                data={data.historicalSalary} 
                xAxisKey="period" 
                lineKeys={[
                  { key: 'value', name: 'Remuneração (R$)', color: '#0ea5e9' }
                ]} 
                height={250} 
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500 text-xs">Sem dados salariais</div>
            )}
         </div>
      </div>

    </div>
  );
}
