'use client';

import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import clsx from 'clsx';
import {
  AlertTriangle, Target, Activity, ShieldAlert, Clock, TrendingUp,
  Minus, Zap, SearchX
} from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import GaugeChart from '@/components/charts/GaugeChart';
import LineChart from '@/components/charts/LineChart';
import DonutChart from '@/components/charts/DonutChart';
import KpiCard from '@/components/ui/KpiCard';
import Drawer from '@/components/ui/Drawer';
import SocialRankings, { type RankingBlock } from '@/components/dashboard/SocialRankings';

const MediaRenderer = ({ post }: { post: any }) => {
  const [mediaError, setMediaError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setMediaError(false);
    setImageError(false);
  }, [post.id]);

  const hasVideo = post.video_url || (post.image_url && post.image_url.includes('.mp4'));
  const mediaUrl = post.video_url || (hasVideo ? post.image_url : null);
  const imageUrl = post.thumbnail_url || post.image_url;

  return (
    <div className="w-full min-h-[200px] max-h-[420px] rounded-lg mb-6 flex flex-col items-center justify-center bg-[#0f172a] overflow-hidden relative group" onClick={(e) => e.stopPropagation()}>

      {mediaUrl && !mediaError && (
        <video
          controls
          playsInline
          preload="metadata"
          poster={imageUrl || undefined}
          className="max-h-[420px] w-auto max-w-full mx-auto rounded-lg bg-black object-contain"
          onError={(e) => {
            e.stopPropagation();
            setMediaError(true);
          }}
        >
          <source src={mediaUrl} />
        </video>
      )}

      {(mediaError || !mediaUrl) && (
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
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
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
                Mídia indisponível
              </p>
              <p className="text-gray-400 text-sm mb-5 text-center px-4 max-w-xs">
                A mídia deste post não pôde ser carregada.
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

const InstagramAlertCard = ({ post, onVerAnalise }: { post: any; onVerAnalise: () => void }) => {
  if (!post) return null;

  const isHighRisk = post.risk?.toLowerCase() === 'alto';

  return (
    <div className={clsx(
      "relative overflow-hidden rounded-xl border p-5 transition-all duration-300 mb-6",
      isHighRisk
        ? "bg-red-500/10 border-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.15)]"
        : "bg-white/5 border-white/10"
    )}>
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-5 flex-1 w-full">
          <div className={clsx(
            "p-4 rounded-2xl shrink-0 flex items-center justify-center",
            isHighRisk ? "bg-red-500 text-white animate-pulse" : "bg-[#00FFFF] text-black"
          )}>
            <AlertTriangle size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className={clsx(
                "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest",
                isHighRisk ? "bg-red-600 text-white" : "bg-[#00FFFF] text-black"
              )}>
                {isHighRisk ? 'Pico de Risco Detectado' : 'Atenção Operacional'}
              </span>
              <div className="flex items-center gap-1.5 text-gray-500 text-[10px] uppercase font-bold tracking-tight">
                <Clock size={12} />
                há {new Date(post.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <h3 className="text-white font-black text-lg md:text-xl line-clamp-1 mb-2 tracking-tight">
              {post.text || 'Post sem legenda'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-[#00FFFF]" />
                <span className="font-bold text-gray-300">{post.candidate_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-[#00FFFF]" />
                <span className="font-bold text-gray-300">{post.like_count + post.comment_count}</span> interações
              </div>
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className={isHighRisk ? "text-red-400" : "text-yellow-400"} />
                <span className={clsx("font-black uppercase tracking-tighter", isHighRisk ? "text-red-400" : "text-yellow-400")}>
                  Risco {post.risk}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "w-2 h-2 rounded-full",
                  post.sentiment === 'positivo' ? 'bg-green-500' : post.sentiment === 'negativo' ? 'bg-red-500' : 'bg-blue-500'
                )} />
                <span className="capitalize">{post.sentiment}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto">
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 lg:flex-none text-center px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-[0.1em]"
          >
            Abrir Post
          </a>
          <button
            onClick={onVerAnalise}
            className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-[#00FFFF] text-black text-xs font-black hover:bg-[#00FFFF]/80 transition-all uppercase tracking-[0.1em] shadow-[0_0_20px_rgba(0,255,255,0.3)]"
          >
            Análise IA
          </button>
        </div>
      </div>
    </div>
  );
};

export default function InstagramDashboard({ kpis, charts, posts, comments }: { kpis: any[], charts: any, posts: any[], comments: any[] }) {
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

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

  // --- Calculations ---
  const criticalPost = useMemo(() => {
    return [...posts]
      .filter(p => p.risk?.toLowerCase() === 'alto')
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
  }, [posts]);

  const riskScore = useMemo(() => {
    if (posts.length === 0) return 0;
    const high = posts.filter(p => p.risk?.toLowerCase() === 'alto').length;
    const medium = posts.filter(p => p.risk?.toLowerCase() === 'medio' || p.risk?.toLowerCase() === 'médio').length;
    return Math.round(((high * 100) + (medium * 50)) / posts.length);
  }, [posts]);

  const themesData = useMemo(() => {
    const themeCounts: Record<string, number> = {};
    posts.forEach(p => {
      if (p.topic && p.topic !== 'Sem análise') {
        themeCounts[p.topic] = (themeCounts[p.topic] || 0) + 1;
      }
    });
    return Object.entries(themeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [posts]);

  const pressureData = useMemo(() => {
    const dayMap: Record<string, { comments: number; engagement: number }> = {};
    comments.forEach(c => {
      if (!c.created_at) return;
      const day = new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dayMap[day]) dayMap[day] = { comments: 0, engagement: 0 };
      dayMap[day].comments++;
    });
    posts.forEach(p => {
      if (!p.created_at) return;
      const day = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dayMap[day]) dayMap[day] = { comments: 0, engagement: 0 };
      dayMap[day].engagement += (p.like_count + p.comment_count);
    });
    return Object.entries(dayMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => {
        const [da, ma] = a.date.split('/').map(Number);
        const [db, mb] = b.date.split('/').map(Number);
        return (ma * 100 + da) - (mb * 100 + db);
      });
  }, [comments, posts]);

  const topPostsUnified = useMemo(() => {
    return [...posts]
      .sort((a, b) => {
        const riskVal = (p: any) => p.risk?.toLowerCase() === 'alto' ? 100 : p.risk?.toLowerCase() === 'medio' ? 50 : 10;
        return riskVal(b) - riskVal(a) || (b.like_count + b.comment_count) - (a.like_count + a.comment_count);
      })
      .slice(0, 5);
  }, [posts]);

  const rankingBlocks: RankingBlock[] = useMemo(() => {
    const byEngagement = [...posts]
      .sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count))
      .slice(0, 5)
      .map((p) => ({ id: p.id, label: p.text || 'Post sem legenda', sublabel: p.candidate_name, value: p.like_count + p.comment_count }));

    const byComments = [...posts]
      .sort((a, b) => b.comment_count - a.comment_count)
      .slice(0, 5)
      .map((p) => ({ id: p.id, label: p.text || 'Post sem legenda', sublabel: p.candidate_name, value: p.comment_count }));

    const profileCounts = new Map<string, number>();
    posts.forEach((p) => {
      const name = p.candidate_name || '—';
      if (name === '—') return;
      profileCounts.set(name, (profileCounts.get(name) || 0) + 1);
    });
    const byActivity = Array.from(profileCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ id: name, label: name, value: count }));

    return [
      { title: 'Maior Engajamento Absoluto', formula: 'Soma de curtidas + comentários por post.', items: byEngagement, valueLabel: 'interações' },
      { title: 'Mais Comentados', formula: 'Volume bruto de comentários por post.', items: byComments, valueLabel: 'comentários' },
      { title: 'Perfis Mais Ativos', formula: 'Quantidade de posts publicados no período por candidato.', items: byActivity, valueLabel: 'posts' },
    ];
  }, [posts]);

  const dominantSentiment = useMemo(() => {
    const total = charts.sentimentData.reduce((acc: number, d: any) => acc + d.value, 0);
    if (total === 0) return { label: 'Sem dados', percentage: 0 };
    const max = [...charts.sentimentData].sort((a, b) => b.value - a.value)[0];
    return {
      label: max.name,
      percentage: Math.round((max.value / total) * 100),
      color: max.name === 'Positivo' ? '#22C55E' : max.name === 'Negativo' ? '#FF3B3B' : '#2563EB'
    };
  }, [charts.sentimentData]);

  return (
    <div className="space-y-6">
      {/* 1. HEADER – ALERTA INTELIGENTE */}
      <InstagramAlertCard
        post={criticalPost || posts[0]}
        onVerAnalise={() => setSelectedPost(criticalPost || posts[0])}
      />

      {/* 2. MÉTRICAS (CARDS SUPERIORES) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => {
          const isNegativeMetric = kpi.title.includes('Negativo') || kpi.title.includes('Risco');
          const status = isNegativeMetric && kpi.value > 0 ? 'danger' : kpi.title.includes('Positivo') ? 'success' : 'neutral';
          const StatusIcon = status === 'danger' ? AlertTriangle : status === 'success' ? TrendingUp : Minus;
          return (
            <div key={i} className="glass rounded-xl p-5 border-white/5 transition-all hover:scale-[1.02]">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">{kpi.title}</h3>
                <StatusIcon
                  size={14}
                  className={status === 'danger' ? 'text-red-400' : status === 'success' ? 'text-green-400' : 'text-gray-500'}
                />
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl md:text-3xl font-black text-white tracking-tighter">
                  {kpi.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2.5 RANKINGS EXECUTIVOS */}
      <SocialRankings blocks={rankingBlocks} />

      {/* 3. PRESSÃO SOCIAL + TERMÔMETRO DE RISCO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <ChartCard title="Pressão Social nas Últimas 24h">
            <LineChart
              dates={pressureData.map(d => d.date)}
              seriesData={[
                { name: 'Volume de Comentários', data: pressureData.map(d => d.comments), color: '#00FFFF' },
                { name: 'Engajamento Total', data: pressureData.map(d => d.engagement), color: '#2563EB' }
              ]}
            />
          </ChartCard>
        </div>
        <div className="lg:col-span-4">
          <ChartCard title="Termômetro de Risco" className="flex flex-col items-center justify-center pt-8">
            <GaugeChart score={riskScore} level={riskScore > 70 ? 'danger' : riskScore > 30 ? 'warning' : 'success'} />
            <div className="text-center mt-[-40px] pb-6">
              <div className={clsx(
                "text-4xl font-black mb-1 tracking-tighter",
                riskScore > 70 ? "text-red-500" : riskScore > 30 ? "text-yellow-500" : "text-green-500"
              )}>
                {riskScore}<span className="text-lg opacity-50 ml-1">/100</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Status: {riskScore > 70 ? 'Crítico' : riskScore > 30 ? 'Atenção' : 'Estável'}
              </p>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* 4. SENTIMENTO + TEMAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Evolução do Sentimento" className="relative">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-1/2">
              <DonutChart data={charts.sentimentData} />
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Sentimento Dominante</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dominantSentiment.color }} />
                  <span className="text-xl font-black text-white">{dominantSentiment.label}</span>
                  <span className="text-gray-400 text-sm font-bold">{dominantSentiment.percentage}%</span>
                </div>
              </div>
              <div className="space-y-2">
                {charts.sentimentData.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.itemStyle?.color }} />
                      <span className="text-gray-400">{d.name}</span>
                    </div>
                    <span className="text-white font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-white/5 text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2">
                <TrendingUp size={12} className={dominantSentiment.label === 'Negativo' ? 'text-red-400' : 'text-green-400'} />
                {dominantSentiment.label === 'Negativo' ? 'Tendência de risco alta' : 'Estabilidade nas menções'}
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Temas do Instagram (IA)">
          <div className="space-y-4 mt-2">
            {themesData.length > 0 ? (
              themesData.map((theme, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-white uppercase tracking-tight">{theme.name}</span>
                    <span className="text-[#00FFFF]">{theme.value} posts</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className="bg-gradient-to-r from-[#00FFFF]/60 to-[#00FFFF] h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,255,255,0.2)]"
                      style={{ width: `${Math.min(100, (theme.value / (posts.length || 1)) * 100 * 3)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 italic text-sm gap-3">
                <SearchX size={32} className="opacity-20" />
                Sem temas analisados no período
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* 5. BLOCO – TOP POSTS (UNIFICADO) */}
      <ChartCard title="Monitoramento de Posts Prioritários">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Post</th>
                <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Engajamento</th>
                <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Risco</th>
                <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Sentimento</th>
                <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topPostsUnified.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-4 py-4 max-w-xs">
                    <div className="font-bold text-white mb-1 truncate group-hover:text-[#00FFFF] transition-colors">{p.text || 'Sem legenda'}</div>
                    <div className="text-[10px] text-gray-500 uppercase font-black">{p.candidate_name}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white min-w-[30px]">{p.like_count + p.comment_count}</span>
                      <div className="flex-1 w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00FFFF]" style={{ width: `${Math.min(100, (p.like_count + p.comment_count) / 10)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-2 h-2 rounded-full",
                        p.risk?.toLowerCase() === 'alto' ? 'bg-red-500 animate-pulse' : p.risk?.toLowerCase() === 'medio' ? 'bg-yellow-500' : 'bg-green-500'
                      )} />
                      <span className={clsx(
                        "font-black uppercase text-[10px] tracking-widest",
                        p.risk?.toLowerCase() === 'alto' ? 'text-red-400' : p.risk?.toLowerCase() === 'medio' ? 'text-yellow-400' : 'text-green-400'
                      )}>{p.risk}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {getSentimentBadge(p.sentiment)}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setSelectedPost(p)}
                      className="text-[#00FFFF] text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      Detalhes <Zap size={10} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* 6. ANÁLISE ESTRATÉGICA (NÃO ALTERADA - REORGANIZADA PARA O FINAL) */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl overflow-hidden mt-6">
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <div className="w-1 h-6 bg-[#00FFFF] rounded-full shadow-[0_0_10px_#00FFFF]" />
          <h3 className="text-white font-black uppercase tracking-widest text-sm">Análise Estratégica dos Posts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Candidato</th>
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
                  <td className="px-4 py-3 whitespace-nowrap text-[#00FFFF] text-xs font-medium">
                    {p.candidate_name || '—'}
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
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    Nenhum post encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Termômetro dos Comentários (Opcional - mantido para consistência) */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl overflow-hidden mt-6">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-white font-medium">Monitoramento de Comentários em Tempo Real</h3>
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
                    <a href={c.post_url} target="_blank" rel="noreferrer" className="text-[#00FFFF] hover:underline" title={c.post_caption}>
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

      {/* Drawer de detalhe do post */}
      <Drawer
        open={selectedPost !== null}
        onClose={() => setSelectedPost(null)}
        title="Análise de Inteligência Estratégica"
        subtitle={selectedPost?.candidate_name && selectedPost.candidate_name !== '—' ? selectedPost.candidate_name : undefined}
        footer={
          selectedPost && (
            <a
              href={selectedPost.url}
              target="_blank"
              rel="noreferrer"
              className="px-8 py-3 bg-[#00FFFF] text-black font-black rounded-xl hover:bg-[#00FFFF]/80 transition-all uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(0,255,255,0.2)]"
            >
              Ver no Instagram
            </a>
          )
        }
      >
        {selectedPost && (
          <>
            <div className="flex flex-wrap gap-4 items-center">
              {getSentimentBadge(selectedPost.sentiment)}
              {getRiskBadge(selectedPost.risk)}
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase">
                <Activity size={14} /> <span className="text-white">{selectedPost.like_count + selectedPost.comment_count}</span> interações
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase">
                <Clock size={14} /> <span className="text-white">{selectedPost.created_at ? new Date(selectedPost.created_at).toLocaleDateString('pt-BR') : '—'}</span>
              </div>
            </div>

            <MediaRenderer post={selectedPost} />

            <div className="grid grid-cols-1 gap-8">
              <div>
                <h3 className="text-[10px] font-black text-gray-500 mb-2 uppercase tracking-[0.2em]">Conteúdo Base</h3>
                <div className="text-gray-200 bg-white/5 p-4 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed">{selectedPost.text || 'Sem texto'}</div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <h3 className="text-[10px] font-black text-gray-500 mb-2 uppercase tracking-[0.2em]">Tema Principal</h3>
                  <div className="text-white font-bold bg-[#00FFFF]/5 p-4 rounded-xl border border-[#00FFFF]/10 flex items-center gap-2">
                    <Zap size={16} className="text-[#00FFFF]" />
                    {selectedPost.topic}
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-gray-500 mb-2 uppercase tracking-[0.2em]">Justificativa de Risco</h3>
                  <div className="text-gray-300 bg-white/5 p-4 rounded-xl border border-white/5 italic">{selectedPost.riskReason}</div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black text-gray-500 mb-2 uppercase tracking-[0.2em]">Relatório Executivo</h3>
                <div className="text-gray-200 bg-white/5 p-5 rounded-xl border border-white/5 leading-relaxed">{selectedPost.summary}</div>
              </div>

              <div className="bg-[#00FFFF]/10 border border-[#00FFFF]/20 p-6 rounded-2xl">
                <h3 className="text-[10px] font-black text-[#00FFFF] mb-3 uppercase tracking-[0.2em]">Protocolo Recomendado</h3>
                <p className="text-[#00FFFF] font-bold text-lg leading-tight">{selectedPost.recommendedAction}</p>
              </div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
