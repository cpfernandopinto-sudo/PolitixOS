'use client';

import ReactECharts from 'echarts-for-react';

export default function InstagramDashboard({ kpis, charts, posts, comments }: { kpis: any[], charts: any, posts: any[], comments: any[] }) {
  const optionSentiment = {
    tooltip: { trigger: 'item' },
    series: [{ type: 'pie', radius: ['40%', '70%'], data: charts.sentimentData }],
    backgroundColor: 'transparent',
    textStyle: { color: '#fff' }
  };

  const optionByDay = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: charts.byDay.map((d: any) => d.date) },
    yAxis: { type: 'value' },
    series: [{ data: charts.byDay.map((d: any) => d.count), type: 'line', smooth: true, lineStyle: { color: '#00FFFF' } }],
    backgroundColor: 'transparent',
    textStyle: { color: '#fff' }
  };

  const optionEng = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: charts.topEng.map((d: any) => d.name).reverse() },
    series: [{ type: 'bar', data: charts.topEng.map((d: any) => d.value).reverse(), itemStyle: { color: '#00FFFF' } }],
    backgroundColor: 'transparent',
    textStyle: { color: '#fff' }
  };

  const optionTopRisk = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: charts.topRisk.map((d: any) => d.name).reverse() },
    series: [{ type: 'bar', data: charts.topRisk.map((d: any) => d.value).reverse(), itemStyle: { color: '#FF3B3B' } }],
    backgroundColor: 'transparent',
    textStyle: { color: '#fff' }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-[#12192A] border border-white/5 rounded-xl p-4">
            <h3 className="text-gray-400 text-xs md:text-sm mb-1">{kpi.title}</h3>
            <p className="text-xl md:text-2xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#12192A] border border-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-4">Comentários por Dia</h3>
          <ReactECharts option={optionByDay} style={{ height: 220 }} />
        </div>
        <div className="bg-[#12192A] border border-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-4">Sentimento (Posts)</h3>
          <ReactECharts option={optionSentiment} style={{ height: 220 }} />
        </div>
        <div className="bg-[#12192A] border border-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-4">Top Posts (Engajamento)</h3>
          <ReactECharts option={optionEng} style={{ height: 220 }} />
        </div>
        <div className="bg-[#12192A] border border-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-4">Top Posts (Risco)</h3>
          <ReactECharts option={optionTopRisk} style={{ height: 220 }} />
        </div>
      </div>

      {/* Análise Estratégica dos Posts */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl overflow-hidden mt-6">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-white font-medium">Análise Estratégica dos Posts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Texto / Legenda</th>
                <th className="px-4 py-3 font-medium">Sentimento IA</th>
                <th className="px-4 py-3 font-medium">Risco IA</th>
                <th className="px-4 py-3 font-medium">Engajamento</th>
                <th className="px-4 py-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {posts.slice(0, 20).map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 max-w-sm truncate">{p.text}</td>
                  <td className="px-4 py-3 capitalize">{p.sentiment}</td>
                  <td className="px-4 py-3 capitalize">{p.risk}</td>
                  <td className="px-4 py-3">{p.like_count + p.comment_count}</td>
                  <td className="px-4 py-3">
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-[#00FFFF] hover:underline">Ver</a>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nenhum post encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Termômetro dos Comentários */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl overflow-hidden mt-6">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-white font-medium">Termômetro dos Comentários</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Comentário</th>
                <th className="px-4 py-3 font-medium">Post Relacionado</th>
                <th className="px-4 py-3 font-medium">Sentimento</th>
                <th className="px-4 py-3 font-medium">Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {comments.slice(0, 50).map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{c.text}</td>
                  <td className="px-4 py-3 truncate max-w-[150px]">
                    <a href={c.post_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline" title={c.post_caption}>
                      {c.post_caption}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono">—</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">—</td>
                </tr>
              ))}
              {comments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
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
