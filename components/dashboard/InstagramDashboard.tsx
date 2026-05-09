'use client';

import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

const MediaRenderer = ({ post }: { post: any }) => {
  const [mediaError, setMediaError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setMediaError(false);
    setImageError(false);
  }, [post.id]);

  const hasVideo = post.media_type === 'VIDEO' || !!post.video_url;
  const mediaUrl = post.video_url || post.image_url;
  const imageUrl = post.thumbnail_url || post.image_url;

  return (
    <div className="w-full min-h-[200px] max-h-[420px] rounded-lg mb-6 flex flex-col items-center justify-center bg-[#0f172a] overflow-hidden relative group" onClick={(e) => e.stopPropagation()}>
      
      {hasVideo && !mediaError && (
        <>
          {/* O vídeo provavelmente está em codec não compatível com Chrome/Firefox. A solução definitiva é converter no pipeline n8n para MP4 H.264/AAC. */}
          <video
            controls
            playsInline
            preload="metadata"
            poster={imageUrl}
            className="max-h-[420px] w-auto max-w-full mx-auto rounded-lg bg-black object-contain"
            onCanPlay={() => setMediaError(false)}
            onLoadedMetadata={() => setMediaError(false)}
            onError={(e) => {
              e.stopPropagation();
              setMediaError(true);
            }}
          >
            <source src={mediaUrl} />
          </video>
        </>
      )}

      {(mediaError || !hasVideo) && (
        <>
          {imageUrl && !imageError ? (
            <div className="relative w-full flex flex-col items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imageUrl} 
                alt="Post media" 
                className="w-full max-h-[420px] object-contain rounded-lg" 
                loading="lazy"
                onError={(e) => {
                   e.stopPropagation();
                   setImageError(true);
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none group-hover:bg-black/40 transition-all rounded-lg">
                <a href={post.url} target="_blank" rel="noreferrer" className="px-5 py-2 bg-black/60 hover:bg-[#00FFFF] text-white hover:text-black border border-white/20 hover:border-[#00FFFF] rounded-lg text-sm transition-all shadow-lg font-medium pointer-events-auto backdrop-blur-md flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Abrir post original
                </a>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6 bg-[#0f172a]">
              <div className="text-gray-400 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-gray-200 text-base mb-1 font-bold text-center">
                {mediaError ? 'Não foi possível reproduzir este vídeo neste navegador.' : 'Mídia indisponível'}
              </p>
              <p className="text-gray-400 text-sm mb-5 text-center px-4 max-w-xs">
                {mediaError ? 'O arquivo pode estar em formato incompatível. Abra o post original.' : 'Não foi possível carregar a prévia visual.'}
              </p>
              <a href={post.url} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-sm transition-colors shadow-lg backdrop-blur-sm font-medium">
                Abrir post original
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default function InstagramDashboard({ kpis, charts, posts, comments }: { kpis: any[], charts: any, posts: any[], comments: any[] }) {
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPost(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getSentimentBadge = (sentiment: string) => {
    const s = (sentiment || '').toLowerCase();
    if (s === 'positivo') return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 capitalize">{sentiment}</span>;
    if (s === 'neutro') return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 capitalize">{sentiment}</span>;
    if (s === 'misto') return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20 capitalize">{sentiment}</span>;
    if (s === 'negativo') return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 capitalize">{sentiment}</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20 capitalize">{sentiment}</span>;
  };

  const getRiskBadge = (risk: string) => {
    const r = (risk || '').toLowerCase();
    if (r === 'baixo') return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 capitalize">{risk}</span>;
    if (r === 'médio' || r === 'medio') return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20 capitalize">{risk}</span>;
    if (r === 'alto') return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/20 capitalize">{risk}</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20 capitalize">{risk}</span>;
  };

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
                <th className="px-4 py-3 font-medium">Tema (IA)</th>
                <th className="px-4 py-3 font-medium">Sentimento (IA)</th>
                <th className="px-4 py-3 font-medium">Risco (IA)</th>
                <th className="px-4 py-3 font-medium">Motivo do Risco</th>
                <th className="px-4 py-3 font-medium">Resumo IA</th>
                <th className="px-4 py-3 font-medium">Ação Recomendada</th>
                <th className="px-4 py-3 font-medium">Engajamento</th>
                <th className="px-4 py-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {posts.slice(0, 20).map((p) => (
                <tr 
                  key={p.id} 
                  className={`cursor-pointer hover:bg-white/10 transition-colors ${p.risk?.toLowerCase() === 'alto' ? 'border-l-2 border-l-[#dc2626]' : ''}`}
                  onClick={() => setSelectedPost(p)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 min-w-[150px]">
                    <div className="line-clamp-2 text-ellipsis overflow-hidden" title={p.text}>{p.text}</div>
                  </td>
                  <td className="px-4 py-3 min-w-[100px]">
                    <div className="line-clamp-2 text-ellipsis overflow-hidden" title={p.topic}>{p.topic}</div>
                  </td>
                  <td className="px-4 py-3">{getSentimentBadge(p.sentiment)}</td>
                  <td className="px-4 py-3">{getRiskBadge(p.risk)}</td>
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="line-clamp-2 text-ellipsis overflow-hidden" title={p.riskReason}>{p.riskReason}</div>
                  </td>
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="line-clamp-2 text-ellipsis overflow-hidden" title={p.summary}>{p.summary}</div>
                  </td>
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="line-clamp-2 text-ellipsis overflow-hidden" title={p.recommendedAction}>{p.recommendedAction}</div>
                  </td>
                  <td className="px-4 py-3">{p.like_count + p.comment_count}</td>
                  <td className="px-4 py-3">
                    <a href={p.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#00FFFF] hover:underline">Ver</a>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
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

      {/* Modal do Post */}
      {selectedPost && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="bg-[#12192A] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#12192A]/90 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold text-white">Análise Detalhada</h2>
              <button 
                onClick={() => setSelectedPost(null)}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-3 items-center">
                {getSentimentBadge(selectedPost.sentiment)}
                {getRiskBadge(selectedPost.risk)}
                <span className="text-gray-400 text-sm">
                  Engajamento: <span className="text-white font-medium">{selectedPost.like_count + selectedPost.comment_count}</span>
                </span>
                <span className="text-gray-400 text-sm">
                  Data: <span className="text-white font-medium">{selectedPost.created_at ? new Date(selectedPost.created_at).toLocaleDateString('pt-BR') : '—'}</span>
                </span>
              </div>

              <MediaRenderer post={selectedPost} />

              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Texto do Post</h3>
                <p className="text-gray-200 bg-white/5 p-4 rounded-lg whitespace-pre-wrap">{selectedPost.text || 'Sem texto'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Tema (IA)</h3>
                  <p className="text-gray-200 bg-white/5 p-3 rounded-lg">{selectedPost.topic}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Motivo do Risco</h3>
                  <p className="text-gray-200 bg-white/5 p-3 rounded-lg">{selectedPost.riskReason}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Resumo IA</h3>
                <p className="text-gray-200 bg-white/5 p-4 rounded-lg">{selectedPost.summary}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Ação Recomendada</h3>
                <p className="text-[#00FFFF] bg-[#00FFFF]/10 border border-[#00FFFF]/20 p-4 rounded-lg">{selectedPost.recommendedAction}</p>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 flex justify-end">
              <a 
                href={selectedPost.url} 
                target="_blank" 
                rel="noreferrer" 
                className="px-6 py-2 bg-[#00FFFF] text-black font-medium rounded-lg hover:bg-[#00FFFF]/80 transition-colors"
              >
                Ver Post Original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
