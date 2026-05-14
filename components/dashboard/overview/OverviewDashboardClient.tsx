'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OverviewKPI from './OverviewKPI';
import OverviewGauge from './OverviewGauge';
import OverviewAlerts from './OverviewAlerts';
import OverviewChannels from './OverviewChannels';
import OverviewStrategicMap from './OverviewStrategicMap';
import ReactECharts from 'echarts-for-react';
import { Newspaper, Search } from 'lucide-react';

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

function XChannelIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded border border-current/35 font-black leading-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.78), lineHeight: 1 }}
      aria-hidden="true"
    >
      X
    </span>
  );
}

function InstagramChannelIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded border-2 border-current ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="rounded-full border-2 border-current"
        style={{ width: Math.round(size * 0.42), height: Math.round(size * 0.42) }}
      />
      <span
        className="absolute rounded-full bg-current"
        style={{
          width: Math.max(2, Math.round(size * 0.14)),
          height: Math.max(2, Math.round(size * 0.14)),
          right: Math.round(size * 0.18),
          top: Math.round(size * 0.18)
        }}
      />
    </span>
  );
}

export default function OverviewDashboardClient({ initialData, candidates, currentCandidate, currentPeriod }: Props) {
  console.log("[FRONT DATA]", initialData);
  const router = useRouter();
  const [candidate, setCandidate] = useState(currentCandidate || 'todos');
  const [period, setPeriod] = useState(currentPeriod || 'all');
  const sentimentItems = [
    { value: initialData.sentiment.positivo, name: 'Positivo', color: '#22C55E' },
    { value: initialData.sentiment.negativo, name: 'Negativo', color: '#EF4444' },
    { value: initialData.sentiment.neutro, name: 'Neutro', color: '#2563EB' },
    { value: initialData.sentiment.misto, name: 'Misto', color: '#EAB308' },
  ];
  const sentimentTotal = sentimentItems.reduce((acc, item) => acc + item.value, 0);

  const getItemUrl = (row: any) => {
    let rawJson = row.raw_json;
    if (typeof rawJson === 'string') {
      try {
        rawJson = JSON.parse(rawJson);
      } catch {
        rawJson = null;
      }
    }

    const candidateUrls = [
      row.url,
      row.source_url,
      row.link,
      row.post_url,
      row.media_url,
      row.permalink,
      row.tweet_url,
      rawJson?.url,
      rawJson?.source_url,
      rawJson?.link,
      rawJson?.post_url,
      rawJson?.media_url,
      rawJson?.permalink,
      rawJson?.tweet_url,
    ];
    const url = candidateUrls.find((value) => typeof value === 'string' && value.trim() && value !== '#');
    if (!url) return null;

    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
    } catch {
      return null;
    }
  };

  const getActionLabel = (row: any) => {
    const canal = row.canal?.toLowerCase() || '';
    if (canal.includes('notícia') || canal.includes('noticia')) return 'VER CLIPPING';
    if (canal.includes('instagram')) return 'VER POST';
    if (canal.includes('x') || canal.includes('twitter')) return 'VER ANÁLISE';
    return row.ação || 'VER ITEM';
  };

  const getChannelIcon = (canal: string) => {
    if (canal === 'Notícias') return <Newspaper size={14} className="text-blue-400" />;
    if (canal === 'Instagram') return <InstagramChannelIcon size={14} className="text-pink-400" />;
    return <XChannelIcon size={14} className="text-cyan-400" />;
  };

  const normalizeRiskLabel = (value: string | null | undefined) =>
    (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const getRiskClass = (value: string | null | undefined) => {
    const risk = normalizeRiskLabel(value);
    if (risk === 'alto' || risk === 'critico') return 'text-red-500 font-bold';
    if (risk === 'medio') return 'text-yellow-400 font-bold';
    if (risk === 'baixo') return 'text-gray-400';
    return 'text-gray-400';
  };

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
          ...sentimentItems.map(item => ({
            value: item.value,
            name: item.name,
            itemStyle: { color: item.color }
          })),
        ]
      }
    ]
  };

  const riskOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 8, top: 12, bottom: 18, containLabel: true },
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
        barWidth: '46%',
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
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5">
          <h3 className="text-white font-bold text-lg mb-3">Sentimento Consolidado</h3>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)] gap-4 items-center">
            <div className="h-[220px]">
              <ReactECharts option={sentimentOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
              {sentimentItems.map(item => {
                const pct = sentimentTotal > 0 ? Math.round((item.value / sentimentTotal) * 100) : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-medium text-gray-300 truncate">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">{item.value}</div>
                      <div className="text-[10px] text-gray-500">{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5">
          <h3 className="text-white font-bold text-lg mb-3">Distribuição de Risco</h3>
          <div className="h-[258px]">
            <ReactECharts option={riskOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Strategic Actions */}
      <OverviewStrategicMap actions={initialData.actions} />

      {/* Executive Table */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Candidato</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Canal</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sentimento</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Risco</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Impacto</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialData.table.map((row: any, i: number) => {
                const actionUrl = getItemUrl(row);
                const actionLabel = getActionLabel(row);
                return (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-white">{row.candidato}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {getChannelIcon(row.canal)}
                        {row.canal}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${row.sentimento?.toLowerCase() === 'positivo' ? 'bg-green-500/10 text-green-500' :
                          row.sentimento?.toLowerCase() === 'negativo' ? 'bg-red-500/10 text-red-500' :
                            'bg-blue-500/10 text-blue-500'
                        }`}>
                        {row.sentimento}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <span className={getRiskClass(row.risco)}>
                        {row.risco}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">{row.impacto}</td>
                    <td className="px-5 py-3">
                      {actionUrl ? (
                        <a
                          href={actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 text-[10px] font-bold hover:text-cyan-300 transition-colors uppercase tracking-wider"
                        >
                          {actionLabel}
                        </a>
                      ) : (
                        <span className="text-gray-600 text-[10px] font-bold uppercase tracking-wider cursor-not-allowed">
                          SEM LINK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
