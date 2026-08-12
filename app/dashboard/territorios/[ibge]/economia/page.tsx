import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { Landmark, TrendingUp, PieChart, ActivitySquare, AlertTriangle } from 'lucide-react';
import { LineChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';

export default async function EconomiaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier || !dossier.economy) return null;

  const data = dossier.economy;
  const isDemo = data.mode === 'demo';

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <NotebookHeader 
        title="Atividade Econômica e Vocação" 
        summary={data.executiveSummary} 
      />
      {isDemo && (
        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-amber-400/90 leading-relaxed">
            <strong>Demonstrativo:</strong> Os indicadores econômicos aguardam integração das bases municipais mais recentes (IBGE/Contas Regionais).
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 mb-8">
        <ContextualKPI label="PIB Total" indicator={data.gdp} icon={Landmark} />
        <ContextualKPI label="PIB per Capita" indicator={data.gdpPerCapita} icon={TrendingUp} />
        <ContextualKPI label="Valor Adicionado" indicator={data.valueAdded} icon={ActivitySquare} />
        
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full col-span-2 md:col-span-3 lg:col-span-3">
           <div className="flex items-center justify-between mb-4">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Motor Principal</span>
             <PieChart size={16} className="text-slate-500" />
           </div>
           <div className="flex items-end gap-3 mb-2 mt-auto">
             <span className="text-xl md:text-2xl font-bold text-white">{data.mainActivity}</span>
           </div>
           <div className="pt-4 border-t border-white/5 mt-auto flex gap-2 overflow-x-auto pb-1">
             {data.predominantSectors?.map((sec, idx) => (
                <span key={idx} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-semibold text-slate-300 break-words line-clamp-2">
                  {sec}
                </span>
             ))}
           </div>
        </div>
      </div>

      {/* CAMADA "LEITURA EM 30 SEGUNDOS" */}
      <div className="mb-8 p-5 md:p-6 bg-cyan-950/10 border border-cyan-500/10 rounded-xl">
        <h3 className="text-[10px] font-bold text-cyan-500 tracking-widest uppercase mb-4 flex items-center gap-2">
          <ActivitySquare size={14} /> Leitura Econômica em 30 Segundos
        </h3>
        <ul className="space-y-3 text-[13px] text-slate-300">
          <li className="flex items-start gap-2.5">
            <span className="text-cyan-500/50 mt-0.5">•</span> 
            <span>O <strong>PIB Total</strong> atinge <strong>{data.gdp.value}</strong>, gerando um <strong>Valor Adicionado</strong> expressivo de <strong>{data.valueAdded.value}</strong>.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-cyan-500/50 mt-0.5">•</span> 
            <span>O motor econômico gravita em torno de <strong>{data.mainActivity}</strong>, exigindo atenção à matriz tributária.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-cyan-500/50 mt-0.5">•</span> 
            <span>A dependência da máquina pública é <strong>{data.dependencyOnPublicServices}</strong>, o que sinaliza resiliência e forte peso da iniciativa privada.</span>
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Evolução PIB */}
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Evolução do PIB (10 Anos)</h3>
          {data.historicalGdp && data.historicalGdp.length > 0 ? (
            <LineChart 
              data={data.historicalGdp} 
              xAxisKey="period" 
              lineKeys={[{ key: 'value', name: 'PIB (Bi R$)', color: '#10b981' }]} 
              height={300} 
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 text-xs">Sem dados históricos</div>
          )}
        </div>

        {/* Evolução Setorial */}
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Composição Setorial - Histórico</h3>
          {data.historicalSectorComposition && data.historicalSectorComposition.length > 0 ? (
            <LineChart 
              data={data.historicalSectorComposition} 
              xAxisKey="period" 
              lineKeys={[
                { key: 'industry', name: 'Indústria (%)', color: '#f59e0b' },
                { key: 'services', name: 'Serviços (%)', color: '#3b82f6' },
                { key: 'public', name: 'Adm Pública (%)', color: '#8b5cf6' }
              ]} 
              height={300} 
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 text-xs">Sem dados históricos</div>
          )}
          <p className="mt-4 text-[11.5px] text-slate-400 border-t border-white/5 pt-4 leading-relaxed">
            <strong className="text-slate-300">O que observar:</strong> Serviços ganharam participação enquanto a indústria perdeu peso relativo ao longo da década. Apesar disso, o setor industrial permanece o ativo estratégico central para emprego de maior qualificação.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
         <div className="surface-primary rounded-xl p-6 border border-white/5 col-span-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">PIB per Capita - Histórico</h3>
            {data.historicalGdpPerCapita && data.historicalGdpPerCapita.length > 0 ? (
              <BarChart 
                data={data.historicalGdpPerCapita} 
                xAxisKey="period" 
                barKey="value"
                name="R$"
                color="#0ea5e9"
                height={250} 
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500 text-xs">Sem dados</div>
            )}
         </div>

         <div className="surface-primary rounded-xl p-6 border border-white/5 flex flex-col justify-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Benchmark e Dependência</h3>
            <div className="space-y-6">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Dependência do Setor Público</span>
                <span className={`text-xl font-bold ${
                  data.dependencyOnPublicServices === 'BAIXA' ? 'text-emerald-400' :
                  data.dependencyOnPublicServices === 'MODERADA' ? 'text-amber-400' : 'text-rose-400'
                }`}>{data.dependencyOnPublicServices}</span>
                <p className="text-[10px] text-slate-500 mt-1">Economias com dependência BAIXA são sustentadas pela livre iniciativa e indústria.</p>
              </div>
              <div className="h-px w-full bg-white/5" />
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Participação RMBH (Estimativa)</span>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center text-sm font-bold text-white">12%</div>
                  <p className="text-xs text-slate-400 flex-1">Forte peso industrial puxando a média regional.</p>
                </div>
              </div>
            </div>
         </div>
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
