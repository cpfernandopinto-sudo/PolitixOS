'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OverviewKPI from './OverviewKPI';
import OverviewGauge from './OverviewGauge';
import OverviewAlerts from './OverviewAlerts';
import OverviewChannels from './OverviewChannels';
import OverviewStrategicMap from './OverviewStrategicMap';
import ReactECharts from 'echarts-for-react';
import { Newspaper, Hash, MessageSquare, Search } from 'lucide-react';

interface Props {
  initialData: {
    kpis: any;
    crisis: any;
    channels: any;
    alerts: any;
    topics: any;
    sentiment: any;
    risk: any;
    trend: any;
    actions: any;
    table: any;
  };
  candidates: { id: string; name: string }[];
  currentCandidate?: string | null;
  currentPeriod?: string | null;
}

export default function OverviewDashboardClient({ initialData, candidates, currentCandidate, currentPeriod }: Props) {
  console.log("[FRONT DATA]", initialData);
  const router = useRouter();
  const [candidate, setCandidate] = useState(currentCandidate || 'todos');
  const [period, setPeriod] = useState(currentPeriod || 'all');

  const applyFilters = (nextCandidate: string, nextPeriod: string) => {
    const params = new URLSearchParams();
    if (nextCandidate !== 'todos') params.set('candidate', nextCandidate);
    params.set('period', nextPeriod);
    router.push(`?${params.toString()}`);
  };

  // Charts
  const sentimentOption = {
    tooltip: { trigger: 'item' },
    series: [
      {
        name: 'Sentimento',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#1A1A1A', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: [
          { value: initialData.sentiment.positivo, name: 'Positivo', itemStyle: { color: '#22C55E' } },
          { value: initialData.sentiment.negativo, name: 'Negativo', itemStyle: { color: '#EF4444' } },
          { value: initialData.sentiment.neutro, name: 'Neutro', itemStyle: { color: '#2563EB' } },
          { value: initialData.sentiment.misto, name: 'Misto', itemStyle: { color: '#EAB308' } },
        ]
      }
    ]
  };

  const riskOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['Crítico', 'Alto', 'Médio', 'Baixo'], axisLabel: { color: '#666' } },
    yAxis: { type: 'value', axisLabel: { color: '#666' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
    series: [
      {
        data: [
          { value: initialData.risk.critico, itemStyle: { color: '#FF0000' } },
          { value: initialData.risk.alto, itemStyle: { color: '#EF4444' } },
          { value: initialData.risk.medio, itemStyle: { color: '#EAB308' } },
          { value: initialData.risk.baixo, itemStyle: { color: '#22C55E' } },
        ],
        type: 'bar',
        barWidth: '40%',
      }
    ]
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Visão Geral</h1>
          <p className="text-gray-500 mt-1">Consolidação estratégica de inteligência política multi-canal.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={candidate}
            onChange={(e) => {
              const nextCandidate = e.target.value;
              setCandidate(nextCandidate);
              applyFilters(nextCandidate, period);
            }}
            className="bg-[#1A1A1A] border border-white/10 text-white text-sm rounded-lg px-4 py-2.5 focus:border-cyan-500/50 outline-none transition-all"
          >
            <option value="todos">Todos os Candidatos</option>
            {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={period}
            onChange={(e) => {
              const nextPeriod = e.target.value;
              setPeriod(nextPeriod);
              applyFilters(candidate, nextPeriod);
            }}
            className="bg-[#1A1A1A] border border-white/10 text-white text-sm rounded-lg px-4 py-2.5 focus:border-cyan-500/50 outline-none transition-all"
          >
            <option value="all">Todo período</option>
            <option value="1">Últimas 24h</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <OverviewKPI {...initialData.kpis} />

      {/* Main Row: Gauge & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <OverviewGauge {...initialData.crisis} />
        </div>
        <div className="lg:col-span-2">
          <OverviewAlerts alerts={initialData.alerts} />
        </div>
      </div>

      {/* Topics & Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dominant Topics */}
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 h-full">
          <h3 className="text-white font-bold text-lg mb-6">Temas Dominantes</h3>
          <div className="space-y-4">
            {initialData.topics.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-32 text-xs text-gray-400 truncate">{t.tema}</div>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${t.sentimento > 0.2 ? 'bg-green-500' : t.sentimento < -0.2 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, (t.frequencia / initialData.topics[0].frequencia) * 100)}%` }}
                  ></div>
                </div>
                <div className="w-10 text-right text-xs font-bold text-white">{t.frequencia}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Dist */}
        <OverviewChannels data={initialData.channels} />
      </div>

      {/* Charts: Sentiment & Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-bold text-lg mb-6">Sentimento Consolidado</h3>
          <div className="h-[250px]">
            <ReactECharts option={sentimentOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-bold text-lg mb-6">Distribuição de Risco</h3>
          <div className="h-[250px]">
            <ReactECharts option={riskOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Strategic Actions */}
      <OverviewStrategicMap actions={initialData.actions} />

      {/* Executive Table */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">Tabela Executiva de Monitoramento</h3>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:border-cyan-500/50 outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Candidato</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Canal</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sentimento</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Risco</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Impacto</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialData.table.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-white">{row.candidato}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {row.canal === 'Notícias' ? <Newspaper size={14} className="text-blue-400" /> :
                        row.canal === 'Instagram' ? <Hash size={14} className="text-pink-400" /> :
                          <MessageSquare size={14} className="text-cyan-400" />}
                      {row.canal}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${row.sentimento?.toLowerCase() === 'positivo' ? 'bg-green-500/10 text-green-500' :
                        row.sentimento?.toLowerCase() === 'negativo' ? 'bg-red-500/10 text-red-500' :
                          'bg-blue-500/10 text-blue-500'
                      }`}>
                      {row.sentimento}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <span className={row.risco?.toLowerCase() === 'alto' ? 'text-red-500 font-bold' : 'text-gray-400'}>
                      {row.risco}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{row.impacto}</td>
                  <td className="px-6 py-4">
                    <button className="text-cyan-400 text-[10px] font-bold hover:text-cyan-300 transition-colors uppercase tracking-wider">
                      {row.ação}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
