import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { Sparkline } from '@/components/dashboard/territorios/PolitixCharts';
import { Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import React from 'react';

export default async function CockpitPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;

  if (!dossier) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <Zap className="w-5 h-5 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Cockpit de Inteligência Territorial</h1>
      </div>

      {/* 6 MINI KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'População', value: '621.865', data: [600, 610, 615, 621], color: '#3b82f6' },
          { label: 'Crime (Ocorrências)', value: '1.240', data: [1500, 1300, 1250, 1240], color: '#f43f5e' },
          { label: 'Saúde (Cobertura)', value: '72%', data: [55, 60, 65, 72], color: '#10b981' },
          { label: 'PIB (R$ Bi)', value: '34.5', data: [24, 28, 30, 34], color: '#8b5cf6' },
          { label: 'Emprego (Saldo)', value: '2.140', data: [200, 205, 210, 215], color: '#06b6d4' },
          { label: 'Comparecimento', value: '78%', data: [82, 75, 79, 78], color: '#f59e0b' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-[#111726] border border-white/5 rounded-xl p-4 flex flex-col hover:border-white/10 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</span>
            <span className="text-xl font-bold text-white mb-3">{kpi.value}</span>
            <div className="h-10 mt-auto">
              <Sparkline data={kpi.data} color={kpi.color} />
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-[#111726] border border-white/5 rounded-xl p-6 md:p-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">O Território em 60 Segundos</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            {dossier.diagnostic?.diagnosis || "Contagem apresenta forte expansão no setor logístico e industrial, gerando saldos positivos de emprego. Contudo, há uma pressão significativa sobre os serviços de saúde na região central e demandas urgentes de pavimentação nas zonas limítrofes com Belo Horizonte. O cenário político aponta para uma eleição focada em infraestrutura e eficiência administrativa."}
          </p>
        </section>
        
        <section className="bg-[#111726] border border-white/5 rounded-xl p-6 md:p-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Pressões e Ativos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-2">Ponto de Risco</span>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">Sobrecarga no atendimento de urgência (UPAs) com tempo de espera 30% acima da média da RMBH.</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2">Ativo Estratégico</span>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">Polo industrial revitalizado atraindo 3 novas multinacionais no último semestre.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-[#111726] border border-white/5 rounded-xl p-6 md:p-8">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">O Que Mudou Recentemente</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(dossier.diagnostic?.whatChanged || [
            { description: "Aumento de 12% no saldo de empregos formais na construção civil.", trend: 'up' },
            { description: "Piora de 5% no índice de criminalidade na região metropolitana.", trend: 'down' },
            { description: "Manutenção da frota de ônibus sem alterações estruturais.", trend: 'stable' }
          ] as any[]).map((item, idx) => (
            <div key={idx} className="flex gap-3 items-start bg-white/5 p-4 rounded-lg border border-white/5">
              {item.trend === 'up' ? <TrendingUp size={16} className="text-emerald-400 mt-0.5 shrink-0" /> :
               item.trend === 'down' ? <TrendingDown size={16} className="text-rose-400 mt-0.5 shrink-0" /> :
               <Minus size={16} className="text-slate-400 mt-0.5 shrink-0" />}
              <span className="text-xs text-slate-300 leading-relaxed">{item.description}</span>
            </div>
          ))}
        </div>
      </section>
      
      <section className="bg-[#111726] border border-white/5 rounded-xl p-6 md:p-8 overflow-x-auto">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Benchmark Metropolitano</h2>
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              <th className="pb-3 font-semibold">Indicador</th>
              <th className="pb-3 font-semibold text-cyan-400">Contagem</th>
              <th className="pb-3 font-semibold">RMBH (Média)</th>
              <th className="pb-3 font-semibold">MG (Média)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <tr className="text-slate-200">
              <td className="py-3 font-medium text-slate-400">PIB per Capita</td>
              <td className="py-3 font-bold text-white">R$ 55.400</td>
              <td className="py-3">R$ 48.200</td>
              <td className="py-3">R$ 42.100</td>
            </tr>
            <tr className="text-slate-200">
              <td className="py-3 font-medium text-slate-400">Homicídios / 100k</td>
              <td className="py-3 font-bold text-white">14.2</td>
              <td className="py-3">18.5</td>
              <td className="py-3">22.4</td>
            </tr>
            <tr className="text-slate-200">
              <td className="py-3 font-medium text-slate-400">Cobertura ESF</td>
              <td className="py-3 font-bold text-white">72%</td>
              <td className="py-3">68%</td>
              <td className="py-3">75%</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
