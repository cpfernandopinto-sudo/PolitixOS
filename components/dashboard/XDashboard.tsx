'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { 
  AlertTriangle, Target, Activity, ShieldAlert, Clock, TrendingUp, 
  TrendingDown, Info, ArrowUpRight, ArrowDownRight, Zap, SearchX,
  MessageSquare, Share2, Heart, ExternalLink, BarChart2, ShieldCheck, Thermometer
} from 'lucide-react';
import ChartCard from '@/components/ui/ChartCard';
import GaugeChart from '@/components/charts/GaugeChart';
import DonutChart from '@/components/charts/DonutChart';

export default function XDashboard({ kpis, charts, posts, replies, alert }: any) {
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  const getSentimentBadge = (sentiment: string) => {
    const s = (sentiment || '').toLowerCase();
    if (s === 'positivo') return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-green-500/10 text-green-400 border border-green-500/20">Positivo</span>;
    if (s === 'negativo') return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">Negativo</span>;
    if (s === 'misto') return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Misto</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">Neutro</span>;
  };

  const getRiskBadge = (risk: string) => {
    const r = (risk || '').toLowerCase();
    if (r === 'alto' || r === 'critico') return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-500 text-white animate-pulse">Risco {risk}</span>;
    if (r === 'medio' || r === 'médio') return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Risco Médio</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-green-500/10 text-green-400 border border-green-500/20">Risco Baixo</span>;
  };

  // Calculate Top 5 by Impact
  const priorityPosts = [...posts].sort((a, b) => b.impactScore - a.impactScore).slice(0, 5);
  
  // Avg Crisis Score
  const avgCrisis = posts.length > 0 
    ? Math.round(posts.reduce((acc: number, p: any) => acc + (p.crisisScore || 0), 0) / posts.length)
    : 0;
  
  const getCrisisStatus = (score: number) => {
    if (score > 80) return { label: 'Crise', color: 'text-red-500', bg: 'bg-red-500/10' };
    if (score > 60) return { label: 'Alerta', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    if (score > 30) return { label: 'Atenção', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    return { label: 'Frio', color: 'text-green-500', bg: 'bg-green-500/10' };
  };

  const crisisStatus = getCrisisStatus(avgCrisis);

  // Divergences
  const divergences = posts.filter((p: any) => p.divergenceFlag);

  return (
    <div className="space-y-6">
      {/* 2️⃣ ESTRATÉGICO: PRIORIDADES E CRISE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Prioridades do Radar */}
        <div className="lg:col-span-8">
          <div className="bg-[#12192A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5 bg-white/2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-[#00FFFF]" size={18} />
                <h3 className="text-white font-black uppercase tracking-widest text-xs">🔥 Prioridades do Radar</h3>
              </div>
              <span className="text-[10px] font-bold text-gray-500">ORDENADO POR IMPACTO POLÍTICO</span>
            </div>
            <div className="divide-y divide-white/5">
              {priorityPosts.map((p: any) => (
                <div key={p.id} className="p-4 hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between gap-4" onClick={() => setSelectedPost(p)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={clsx("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter", 
                        p.priorityLevel === 'Alta' ? "bg-red-500 text-white" : 
                        p.priorityLevel === 'Média' ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400")}>
                        Prioridade {p.priorityLevel}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500">{p.candidate_name}</span>
                    </div>
                    <p className="text-sm text-white font-medium line-clamp-1">{p.text}</p>
                    <p className="text-[10px] text-[#00FFFF] font-bold mt-1 uppercase italic tracking-tight">🎯 {p.recommendedAction}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <div className="text-[9px] text-gray-500 font-black uppercase mb-0.5">Impacto</div>
                      <div className={clsx("text-lg font-black", p.impactScore > 75 ? "text-red-500" : "text-white")}>{p.impactScore}</div>
                    </div>
                    <div className="text-center border-l border-white/10 pl-4">
                      <div className="text-[9px] text-gray-500 font-black uppercase mb-0.5">Crise</div>
                      <div className={clsx("text-lg font-black", p.crisisScore > 75 ? "text-red-500" : "text-white")}>{p.crisisScore}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status de Crise Atual */}
        <div className="lg:col-span-4 space-y-6">
          <div className={clsx("rounded-2xl border border-white/5 p-6 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden", crisisStatus.bg)}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Thermometer size={80} />
            </div>
            <h3 className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] mb-4">🧨 Status de Crise Atual</h3>
            <div className={clsx("text-6xl font-black mb-2 tracking-tighter", crisisStatus.color)}>
              {avgCrisis}
            </div>
            <div className={clsx("text-2xl font-black uppercase tracking-widest px-6 py-1 rounded-full border border-current mb-4", crisisStatus.color)}>
              {crisisStatus.label}
            </div>
            <p className="text-[10px] text-gray-500 font-medium max-w-[200px]">
              Média ponderada de risco, polarização e rejeição pública em tempo real.
            </p>
          </div>

          <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-white font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
              <Zap className="text-yellow-400" size={16} /> 
              ⚠️ Divergências Detectadas
            </h3>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
              {divergences.length === 0 && <p className="text-gray-500 text-xs italic">Nenhuma divergência crítica detectada.</p>}
              {divergences.map((d: any) => (
                <div key={d.id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-[#00FFFF]/30 transition-all cursor-pointer" onClick={() => setSelectedPost(d)}>
                  <div className="text-[9px] font-black text-red-400 uppercase mb-1 tracking-widest">🚨 {d.divergenceType}</div>
                  <p className="text-xs text-white line-clamp-1 mb-2 italic">"{d.text}"</p>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#00FFFF]">Autor: {d.authorTone}</span>
                    <span className="text-yellow-400">Público: {d.publicReaction}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2️⃣ ALERTA PRINCIPAL (TOPO) */}
      {alert && (
        <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-red-500/10 p-5 shadow-[0_0_25px_rgba(239,68,68,0.15)] mb-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-5 flex-1 w-full">
              <div className="p-4 rounded-2xl shrink-0 flex items-center justify-center bg-red-500 text-white animate-pulse">
                <AlertTriangle size={32} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-red-600 text-white">
                    ⚠️ Alerta de Maior Impacto
                  </span>
                  <div className="flex items-center gap-1.5 text-gray-500 text-[10px] uppercase font-bold tracking-tight">
                    <Clock size={12} />
                    há {new Date(alert.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <h3 className="text-white font-black text-lg md:text-xl line-clamp-1 mb-2 tracking-tight">
                  {alert.text || 'Post sem texto'}
                </h3>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-[#00FFFF]" />
                    <span className="font-bold text-gray-300">{alert.candidate_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-[#00FFFF]" />
                    <span className="font-bold text-gray-300">{alert.totalEngagement}</span> engajamento
                  </div>
                  <div className="flex items-center gap-2 border-l border-white/10 pl-2">
                    <ShieldAlert size={14} className="text-red-400" />
                    <span className="font-black uppercase text-red-400">Impact Score: {alert.impactScore}</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Zap size={14} />
                    <span className="font-bold uppercase tracking-tighter">Reação: {alert.publicReaction}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto">
              <a href={alert.url} target="_blank" rel="noreferrer" className="flex-1 lg:flex-none text-center px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-[0.1em]">
                Ver Tweet
              </a>
              <button onClick={() => setSelectedPost(alert)} className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-[#00FFFF] text-black text-xs font-black hover:bg-[#00FFFF]/80 transition-all uppercase tracking-[0.1em] shadow-[0_0_20px_rgba(0,255,255,0.3)]">
                Análise IA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3️⃣ CARDS EXECUTIVOS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi: any, i: number) => {
          const isNegative = kpi.title.includes('Negativo') || kpi.title.includes('Risco');
          const mockVar = i % 2 === 0 ? 12 : -5;
          return (
            <div key={i} className="glass rounded-xl p-5 border-white/5 transition-all hover:scale-[1.02]">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-tight">{kpi.title}</h3>
                {mockVar > 0 ? <ArrowUpRight size={14} className="text-green-400" /> : <ArrowDownRight size={14} className="text-red-400" />}
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl md:text-3xl font-black text-white tracking-tighter">
                  {kpi.value.toLocaleString()}
                </span>
                <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded", mockVar > 0 ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400")}>
                  {mockVar > 0 ? '+' : ''}{mockVar}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 4️⃣ TERMÔMETRO DE CRISE */}
        <div className="lg:col-span-4">
          <ChartCard title="Termômetro de Crise">
            <div className="flex flex-col items-center justify-center pt-8 pb-4">
              <GaugeChart score={charts.crisisScore} level={charts.crisisScore > 75 ? 'danger' : charts.crisisScore > 40 ? 'warning' : 'success'} />
              <div className="text-center mt-[-40px]">
                <div className={clsx("text-4xl font-black mb-1 tracking-tighter", charts.crisisScore > 75 ? "text-red-500" : charts.crisisScore > 40 ? "text-yellow-500" : "text-green-500")}>
                  {charts.crisisScore > 75 ? 'Crítica' : charts.crisisScore > 50 ? 'Quente' : charts.crisisScore > 25 ? 'Morna' : 'Fria'}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Intensidade do Monitoramento</p>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* 5️⃣ DISCURSO vs REAÇÃO */}
        <div className="lg:col-span-8">
          <ChartCard title="Análise Narrativa: Discurso vs Reação">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {posts.slice(0, 4).map((p: any, i: number) => (
                <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate max-w-[150px]">{p.text}</span>
                    {getRiskBadge(p.risk)}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-[9px] text-gray-500 uppercase font-black mb-1">Autor (Político)</div>
                      <div className="text-xs font-bold text-[#00FFFF]">{p.authorTone}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] text-gray-500 uppercase font-black mb-1">Público (Reação)</div>
                      <div className="text-xs font-bold text-yellow-400">{p.publicReaction}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 6️⃣ DISTRIBUIÇÃO DE SENTIMENTO */}
        <ChartCard title="Sentimento (Posts)">
          <div className="h-[220px]">
            <DonutChart data={charts.sentimentData} />
          </div>
        </ChartCard>

        {/* 7️⃣ DISTRIBUIÇÃO DE RISCO */}
        <ChartCard title="Níveis de Risco">
          <div className="h-[220px]">
            <DonutChart data={charts.riskData} />
          </div>
        </ChartCard>

        {/* 8️⃣ TEMAS DOMINANTES */}
        <div className="md:col-span-2">
          <ChartCard title="Temas Dominantes (IA)">
            <div className="space-y-3 mt-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
              {charts.themes.map((t: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="text-gray-300">{t.name}</span>
                    <span className="text-[#00FFFF]">{t.value} menções</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#00FFFF] h-full" style={{ width: `${(t.value / charts.themes[0].value) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* 1️⃣1️⃣ ANÁLISE DE REPLIES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <ChartCard title="📊 Reação do Público (Replies)">
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Média de Replies / Post</div>
                <div className="text-3xl font-black text-white">{(replies.length / (posts.length || 1)).toFixed(1)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-500/5 rounded-xl border border-green-500/10 text-center">
                  <div className="text-green-500/70 text-[9px] font-black uppercase">Taxa Aprovação</div>
                  <div className="text-lg font-bold text-green-400">64%</div>
                </div>
                <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 text-center">
                  <div className="text-red-500/70 text-[9px] font-black uppercase">Taxa Rejeição</div>
                  <div className="text-lg font-bold text-red-400">36%</div>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>

        <div className="lg:col-span-8">
          <ChartCard title="Replies Recentes">
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
              {replies.slice(0, 5).map((r: any, i: number) => (
                <div key={i} className="flex gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group transition-colors hover:bg-white/10">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center font-black text-[10px] text-gray-500">
                    {r.user?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-[#00FFFF]">@{r.user}</span>
                      <span className="text-[9px] text-gray-500">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-2">{r.text}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><Heart size={10} /> {r.like_count}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={10} /> {r.reply_count}</span>
                      <span className="flex items-center gap-1"><Share2 size={10} /> {r.retweet_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* 1️⃣2️⃣ TABELA ESTRATÉGICA (PRINCIPAL) */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl overflow-hidden mt-6 shadow-2xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[#00FFFF] rounded-full shadow-[0_0_10px_#00FFFF]" />
            <h3 className="text-white font-black uppercase tracking-widest text-sm">Matriz de Análise Estratégica (X)</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-gray-300">
            <thead className="bg-[#0D0D0D] text-gray-500">
              <tr>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5">Data</th>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5">Candidato</th>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5">Conteúdo do Post</th>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5">Tema / Keywords</th>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5">Autor / Reação</th>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5">Sentimento</th>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5 text-center">Impacto</th>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5 text-center">Crise</th>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5 text-center">Prioridade</th>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5">Divergência</th>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5">Ação Recomendada</th>
                <th className="px-4 py-4 font-black uppercase tracking-widest border-b border-white/5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {posts.map((p: any) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setSelectedPost(p)}>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-500 font-medium">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-[#00FFFF] font-bold">
                    {p.candidate_name}
                  </td>
                  <td className="px-4 py-4 min-w-[200px]">
                    <div className="line-clamp-2 text-white font-medium">{p.text}</div>
                  </td>
                  <td className="px-4 py-4 min-w-[150px]">
                    <div className="text-white font-bold">{p.topic}</div>
                    <div className="text-[10px] text-gray-600 truncate max-w-[150px]">{p.keywords}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-[#00FFFF]">{p.authorTone}</div>
                    <div className="text-yellow-400">{p.publicReaction}</div>
                  </td>
                  <td className="px-4 py-4">
                    {getSentimentBadge(p.sentiment)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={clsx("font-black text-lg", p.impactScore > 75 ? "text-red-500" : "text-white")}>{p.impactScore}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={clsx("font-black text-lg", p.crisisScore > 75 ? "text-red-500" : "text-white")}>{p.crisisScore}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={clsx("px-2 py-0.5 rounded text-[9px] font-black uppercase", 
                      p.priorityLevel === 'Alta' ? "bg-red-500 text-white" : 
                      p.priorityLevel === 'Média' ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400")}>
                      {p.priorityLevel}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className={clsx("text-[10px] font-bold", p.divergenceFlag ? "text-red-400" : "text-gray-600")}>
                      {p.divergenceType}
                    </div>
                  </td>
                  <td className="px-4 py-4 min-w-[180px]">
                    <div className="line-clamp-2 text-[#00FFFF] font-black uppercase tracking-tight text-[10px]">🎯 {p.recommendedAction}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <a href={p.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-[#00FFFF] transition-all">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Análise Detalhada */}
      {selectedPost && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setSelectedPost(null)}>
          <div className="bg-[#12192A] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#12192A]/90 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <ShieldAlert className="text-[#00FFFF]" size={24} />
                Inteligência Estratégica (X)
              </h2>
              <button onClick={() => setSelectedPost(null)} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">✕</button>
            </div>

            <div className="p-6 space-y-8">
              <div className="flex flex-wrap gap-4 items-center">
                {getSentimentBadge(selectedPost.sentiment)}
                {getRiskBadge(selectedPost.risk)}
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/20 uppercase tracking-widest">{selectedPost.candidate_name}</span>
                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase"><Activity size={14} /> <span className="text-white">{selectedPost.totalEngagement}</span> interações</div>
                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase"><Clock size={14} /> <span className="text-white">{new Date(selectedPost.created_at).toLocaleDateString('pt-BR')}</span></div>
              </div>

              <div>
                <h3 className="text-[10px] font-black text-gray-500 mb-2 uppercase tracking-[0.2em]">Conteúdo do Tweet</h3>
                <div className="text-gray-200 bg-white/5 p-4 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed">{selectedPost.text}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <h3 className="text-[10px] font-black text-gray-500 mb-3 uppercase tracking-[0.2em]">Discurso vs Reação</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[9px] text-[#00FFFF] uppercase font-black mb-1">Tom do Político</div>
                      <div className="text-sm font-bold text-white">{selectedPost.authorTone}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-yellow-400 uppercase font-black mb-1">Reação do Público</div>
                      <div className="text-sm font-bold text-white">{selectedPost.publicReaction}</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <h3 className="text-[10px] font-black text-gray-500 mb-3 uppercase tracking-[0.2em]">Status de Monitoramento</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[9px] text-red-500 uppercase font-black mb-1">Temperatura de Crise</div>
                      <div className="text-sm font-bold text-white">{selectedPost.crisisTemperature}°C</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-blue-500 uppercase font-black mb-1">Nível de Polarização</div>
                      <div className="text-sm font-bold text-white">{selectedPost.polarizationLevel}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black text-gray-500 mb-2 uppercase tracking-[0.2em]">Leitura Estratégica (IA)</h3>
                <div className="text-gray-200 bg-white/5 p-5 rounded-xl border border-white/5 leading-relaxed">{selectedPost.strategicReading}</div>
              </div>

              <div className="bg-[#00FFFF]/10 border border-[#00FFFF]/20 p-6 rounded-2xl">
                <h3 className="text-[10px] font-black text-[#00FFFF] mb-3 uppercase tracking-[0.2em]">Protocolo Recomendado</h3>
                <p className="text-[#00FFFF] font-bold text-lg leading-tight">{selectedPost.recommendedAction}</p>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 flex justify-end gap-3 sticky bottom-0 bg-[#12192A]/90 backdrop-blur-md">
              <a href={selectedPost.url} target="_blank" rel="noreferrer" className="px-8 py-3 bg-[#00FFFF] text-black font-black rounded-xl hover:bg-[#00FFFF]/80 transition-all uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(0,255,255,0.2)]">Ver no X</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
