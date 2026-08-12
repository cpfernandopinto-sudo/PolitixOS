import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { HeartPulse, Stethoscope, Building2, Bed, Activity, UserPlus, AlertTriangle } from 'lucide-react';
import { LineChart, HorizontalBarChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';

export default async function SaudePage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier || !dossier.health) return null;

  const data = dossier.health;
  const isDemo = data.mode === 'demo';

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <NotebookHeader 
        title="Saúde Pública: Capacidade e Pressão Assistencial" 
        summary={data.executiveSummary} 
      />
      {isDemo && (
        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-amber-400/90 leading-relaxed">
            <strong>Demonstrativo:</strong> Os dados de saúde são simulados para validação da arquitetura e aguardam integração completa com as bases do DATASUS.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 mb-8">
        <ContextualKPI label="Cobertura ESF" indicator={data.basicCoverage} icon={HeartPulse} />
        <ContextualKPI label="Leitos/1k hab" indicator={data.beds} icon={Bed} />
        <ContextualKPI label="UTI/1k hab" indicator={data.utiBeds} />
        <ContextualKPI label="Médicos/10k hab" indicator={data.doctors} icon={Stethoscope} />
        <ContextualKPI label="Internações" indicator={data.internations} icon={Activity} />
        <ContextualKPI label="Mortalidade" indicator={data.mortality} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Evolução Cobertura ESF</h3>
          {data.historicalBasicCoverage && data.historicalBasicCoverage.length > 0 ? (
            <LineChart 
              data={data.historicalBasicCoverage} 
              xAxisKey="period" 
              lineKeys={[{ key: 'value', name: 'Cobertura %', color: '#10b981' }]} 
              height={200} 
            />
          ) : (
             <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">Sem dados históricos</div>
          )}
        </div>
        
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Médicos por 10k Hab</h3>
          {data.historicalDoctors && data.historicalDoctors.length > 0 ? (
            <LineChart 
              data={data.historicalDoctors} 
              xAxisKey="period" 
              lineKeys={[{ key: 'value', name: 'Médicos', color: '#3b82f6' }]} 
              height={200} 
            />
          ) : (
             <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">Sem dados históricos</div>
          )}
        </div>
        
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Leitos por 1k Hab</h3>
          {data.historicalBeds && data.historicalBeds.length > 0 ? (
            <LineChart 
              data={data.historicalBeds} 
              xAxisKey="period" 
              lineKeys={[{ key: 'value', name: 'Leitos', color: '#f43f5e' }]} 
              height={200} 
            />
          ) : (
             <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">Sem dados históricos</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Internações - Histórico</h3>
          {data.historicalInternations && data.historicalInternations.length > 0 ? (
            <BarChart 
              data={data.historicalInternations} 
              xAxisKey="period" 
              barKey="value"
              name="Internações"
              color="#eab308"
              height={250} 
            />
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-500 text-xs">Sem dados para histórico</div>
          )}
        </div>
        
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Principais Causas de Internação</h3>
          {data.topInternationCauses && data.topInternationCauses.length > 0 ? (
             <HorizontalBarChart 
               data={data.topInternationCauses}
               yAxisKey="cause"
               barKey="value"
               name="Ocorrências"
               color="#f59e0b"
               height={250}
             />
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-500 text-xs">Sem dados de causas</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
         <div className="surface-primary rounded-xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Capacidade vs Demanda (Proxy)</h3>
            <div className="text-xs text-slate-400 mb-4">Gráfico comparativo ilustrando o gargalo assistencial por nível de atenção.</div>
            {data.capacityVsDemand && data.capacityVsDemand.length > 0 ? (
              <div className="space-y-4 pt-2">
                {data.capacityVsDemand.map((item, idx: number) => {
                  const capacityPct = Math.min(item.capacity, 100);
                  const demandPct = Math.min(item.demand, 100);
                  const overload = demandPct > capacityPct;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>{item.category}</span>
                        {overload && <span className="text-rose-400">Sobrecarga</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#111726] rounded-full overflow-hidden flex">
                          <div className="h-full bg-emerald-500" style={{ width: `${capacityPct}%` }} title="Capacidade" />
                        </div>
                        <span className="text-[10px] w-6 text-emerald-400">{capacityPct}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#111726] rounded-full overflow-hidden flex">
                          <div className="h-full bg-rose-500" style={{ width: `${demandPct}%` }} title="Demanda" />
                        </div>
                        <span className="text-[10px] w-6 text-rose-400">{demandPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-slate-500 text-xs">Dados insuficientes</div>
            )}
         </div>

         <div className="surface-primary rounded-xl p-6 border border-white/5 flex flex-col justify-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Estrutura Física</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#111726] border border-white/5 rounded-lg">
                <Building2 className="text-slate-400 mb-2" size={20} />
                <span className="block text-2xl font-bold text-white">{data.establishments}</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Estabel.</span>
              </div>
              <div className="p-4 bg-[#111726] border border-white/5 rounded-lg">
                <HeartPulse className="text-emerald-400 mb-2" size={20} />
                <span className="block text-2xl font-bold text-white">{data.ubs}</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Unidades Básicas</span>
              </div>
              <div className="p-4 bg-[#111726] border border-white/5 rounded-lg">
                <Building2 className="text-blue-400 mb-2" size={20} />
                <span className="block text-2xl font-bold text-white">{data.hospitals}</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Hospitais</span>
              </div>
              <div className="p-4 bg-[#111726] border border-white/5 rounded-lg">
                <UserPlus className="text-purple-400 mb-2" size={20} />
                <span className="block text-2xl font-bold text-white">{data.specialists}</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Especialistas</span>
              </div>
            </div>
         </div>
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
