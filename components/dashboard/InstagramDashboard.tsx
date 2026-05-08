'use client';

import ReactECharts from 'echarts-for-react';

export default function InstagramDashboard({ kpis, charts, feed }: { kpis: any[], charts: any, feed: any[] }) {
  const optionByDay = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: charts.byDay.map((d: any) => d.date) },
    yAxis: { type: 'value' },
    series: [{ data: charts.byDay.map((d: any) => d.count), type: 'line', smooth: true, lineStyle: { color: '#00FFFF' } }],
    backgroundColor: 'transparent',
    textStyle: { color: '#fff' }
  };

  const optionSentiment = {
    tooltip: { trigger: 'item' },
    series: [{ type: 'pie', radius: ['40%', '70%'], data: charts.sentimentData }],
    backgroundColor: 'transparent',
    textStyle: { color: '#fff' }
  };

  const optionTopics = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: charts.topTopics.map((d: any) => d.name).reverse() },
    series: [{ type: 'bar', data: charts.topTopics.map((d: any) => d.value).reverse(), itemStyle: { color: '#8B5CF6' } }],
    backgroundColor: 'transparent',
    textStyle: { color: '#fff' }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-[#12192A] border border-white/5 rounded-xl p-4">
            <h3 className="text-gray-400 text-sm mb-1">{kpi.title}</h3>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#12192A] border border-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-4">Comentários por Dia</h3>
          <ReactECharts option={optionByDay} style={{ height: 250 }} />
        </div>
        <div className="bg-[#12192A] border border-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-4">Sentimento</h3>
          <ReactECharts option={optionSentiment} style={{ height: 250 }} />
        </div>
        <div className="bg-[#12192A] border border-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-4">Top Temas</h3>
          <ReactECharts option={optionTopics} style={{ height: 250 }} />
        </div>
      </div>

      {/* Feed Table */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-white font-medium">Últimos Comentários</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Comentário</th>
                <th className="px-4 py-3 font-medium">Sentimento</th>
                <th className="px-4 py-3 font-medium">Risco</th>
                <th className="px-4 py-3 font-medium">Tema Principal</th>
                <th className="px-4 py-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {feed.slice(0, 50).map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{c.text}</td>
                  <td className="px-4 py-3 capitalize">{c.sentiment}</td>
                  <td className="px-4 py-3 capitalize">{c.risk}</td>
                  <td className="px-4 py-3 truncate max-w-[120px]">
                    {c.topics.length > 0 ? c.topics[0] : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <a href={c.post_url} target="_blank" rel="noreferrer" className="text-[#00FFFF] hover:underline">Ver Post</a>
                  </td>
                </tr>
              ))}
              {feed.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nenhum comentário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
