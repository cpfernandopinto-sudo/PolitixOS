'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Heart, ImageOff,
  MessageCircle, Repeat, ShieldAlert, TrendingUp, Layers, CheckCircle2,
  Zap, Info, User, Radio, FileText, BarChart2, ShieldCheck, Flame, X, MessageSquare, Search
} from 'lucide-react';
import DonutChart from '@/components/charts/DonutChart';
import LineChart from '@/components/charts/LineChart';

const nf = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const sentimentColors: Record<string, string> = { positivo: '#22c55e', neutro: '#3b82f6', misto: '#eab308', negativo: '#ef4444' };

function metric(value: number | null | undefined, available = true) {
  if (!available || value === null || value === undefined) return '—';
  return nf.format(value);
}

function label(value: string | null | undefined) {
  if (!value || value === 'Sem análise' || value === '—' || value === 'null' || value === 'undefined') return '—';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function riskTone(value: string | null | undefined) {
  const normalized = (value ?? '').toLowerCase();
  if (normalized.includes('alto') || normalized.includes('crít')) {
    return 'border-rose-500/40 bg-rose-500/15 text-rose-300 font-bold';
  }
  if (normalized.includes('médio') || normalized.includes('medio')) {
    return 'border-amber-500/40 bg-amber-500/15 text-amber-300 font-medium';
  }
  if (normalized.includes('baixo')) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-medium';
  }
  return 'border-white/10 bg-white/5 text-slate-400 font-medium';
}

function originBadge(origin: string | undefined) {
  const isOwned = origin === 'OWNED';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
        isOwned
          ? 'bg-cyan-500/15 border border-cyan-400/30 text-cyan-300'
          : 'bg-amber-500/15 border border-amber-400/30 text-amber-300'
      }`}
    >
      <Radio size={10} />
      {isOwned ? 'Próprio' : 'Externo'}
    </span>
  );
}

function recommendedActionText(action: string | null | undefined, hasAnalysis: boolean) {
  if (action && action.trim().length > 0 && action.trim() !== 'Sem análise' && action.trim() !== '—') {
    return action;
  }
  if (!hasAnalysis) return 'ANÁLISE PENDENTE';
  return 'RECOMENDAÇÃO INDISPONÍVEL';
}

function alertTitleText(post: any) {
  if (!post) return 'Publicação sob monitoramento de risco';
  const rawText = post.text || post.caption || post.summary || '';
  const cleanText = rawText.replace(/https?:\/\/t\.co\/\w+/gi, '').trim();
  if (cleanText.length > 0) return cleanText;
  if (post.summary && post.summary !== 'Sem análise' && !post.summary.includes('t.co')) return post.summary;
  return post.url || post.text || 'Publicação sob monitoramento de risco';
}

export default function XDashboard({
  kpis,
  charts,
  posts,
  analyticsPosts,
  replies,
  analyticsReplies,
  alert,
  completeness,
}: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  const activePosts = analyticsPosts && analyticsPosts.length > 0 ? analyticsPosts : posts || [];
  const activeReplies = analyticsReplies && analyticsReplies.length > 0 ? analyticsReplies : replies || [];

  // --- Map of posts by ID ---
  const postsById = useMemo(() => {
    const map = new Map<string, any>();
    activePosts.forEach((p: any) => map.set(p.id, p));
    return map;
  }, [activePosts]);

  // --- Owned vs External Split ---
  const ownedPosts = useMemo(() => activePosts.filter((p: any) => p.origin === 'OWNED'), [activePosts]);
  const externalPosts = useMemo(() => activePosts.filter((p: any) => p.origin === 'EXTERNAL'), [activePosts]);

  // --- Strategic Metrics ---
  const totalPostsCount = activePosts.length;
  const externalCount = externalPosts.length;
  const ownedCount = ownedPosts.length;
  const totalEngagement = activePosts.reduce((sum: number, p: any) => sum + (p.totalEngagement || p.engagement || 0), 0);

  const criticalPosts = useMemo(
    () => activePosts.filter((p: any) => /alto|crít/i.test(p.risk || p.risk_level || '')),
    [activePosts]
  );
  const criticalCount = criticalPosts.length;
  const criticalPct = totalPostsCount ? Math.round((criticalCount / totalPostsCount) * 100) : 0;

  // --- Dominant Sentiment ---
  const sentimentCounts = useMemo(() => {
    const map: Record<string, number> = { positivo: 0, neutro: 0, misto: 0, negativo: 0 };
    activePosts.forEach((p: any) => {
      const s = (p.sentiment || '').toLowerCase();
      if (map[s] !== undefined) map[s]++;
    });
    return map;
  }, [activePosts]);

  const dominantSentimentKey = useMemo(() => {
    let top = '—';
    let max = 0;
    Object.entries(sentimentCounts).forEach(([k, v]) => {
      if (v > max) {
        max = v;
        top = k;
      }
    });
    return top;
  }, [sentimentCounts]);

  // --- Temporal Pressure Series (OWNED vs EXTERNAL over Time) ---
  const pressureSeriesData = useMemo(() => {
    const dayMap: Record<string, { owned: number; external: number }> = {};
    activePosts.forEach((p: any) => {
      const dateStr = p.created_at || p.publishedAt || p.taken_at;
      if (!dateStr) return;
      const day = new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dayMap[day]) dayMap[day] = { owned: 0, external: 0 };
      if (p.origin === 'OWNED') dayMap[day].owned++;
      else dayMap[day].external++;
    });

    const sorted = Object.entries(dayMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => {
        const [da, ma] = a.date.split('/').map(Number);
        const [db, mb] = b.date.split('/').map(Number);
        return ma * 100 + da - (mb * 100 + db);
      });

    return {
      dates: sorted.map((d) => d.date),
      owned: sorted.map((d) => d.owned),
      external: sorted.map((d) => d.external),
    };
  }, [activePosts]);

  // --- Topics Breakdown (OWNED vs EXTERNAL) ---
  const ownedTopics = useMemo(() => {
    const counts = new Map<string, number>();
    ownedPosts.forEach((p: any) => {
      const topic = p.topic || p.ai_topic;
      if (topic && topic !== 'Sem análise' && topic !== '—') {
        counts.set(topic, (counts.get(topic) || 0) + 1);
      }
    });
    return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [ownedPosts]);

  const externalTopics = useMemo(() => {
    const counts = new Map<string, number>();
    externalPosts.forEach((p: any) => {
      const topic = p.topic || p.ai_topic;
      if (topic && topic !== 'Sem análise' && topic !== '—') {
        counts.set(topic, (counts.get(topic) || 0) + 1);
      }
    });
    return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [externalPosts]);

  // --- Objective Signal Cards ---
  const signalCards = useMemo(() => {
    const signals: Array<{ title: string; desc: string; type: 'danger' | 'warning' | 'info'; action: () => void }> = [];

    if (externalCount > ownedCount && externalCount > 0) {
      signals.push({
        title: 'Predomínio de Conversação Externa',
        desc: `${externalCount} menções de terceiros vs ${ownedCount} publicações próprias do candidato.`,
        type: 'warning',
        action: () => handleFilterUpdate({ origin: 'EXTERNAL' }),
      });
    }

    if (criticalCount > 0) {
      signals.push({
        title: 'Risco Elevado Identificado',
        desc: `${criticalCount} conteúdos com risco Alto ou Crítico detectados na amostra.`,
        type: 'danger',
        action: () => handleFilterUpdate({ risk: 'alto' }),
      });
    }

    const highPolarizationCount = activePosts.filter((p: any) => /alto|alta/i.test(p.polarizationLevel || p.polarization_level || '')).length;
    if (highPolarizationCount > 0) {
      signals.push({
        title: 'Polarização em Escalada',
        desc: `${highPolarizationCount} publicações apresentando elevado índice de polarização social.`,
        type: 'warning',
        action: () => setSelectedPost(activePosts.find((p: any) => /alto|alta/i.test(p.polarizationLevel || p.polarization_level || ''))),
      });
    }

    const divergencePost = activePosts.find((p: any) => p.divergenceFlag);
    if (divergencePost) {
      signals.push({
        title: 'Desconexão com o Público',
        desc: `Divergência detectada entre o tom do autor ("${divergencePost.authorTone}") e a reação pública ("${divergencePost.publicReaction}").`,
        type: 'danger',
        action: () => setSelectedPost(divergencePost),
      });
    }

    return signals.slice(0, 4);
  }, [externalCount, ownedCount, criticalCount, activePosts]);

  // --- Top Strategic Post for AI Analysis Section ---
  const strategicPost = useMemo(() => {
    return criticalPosts[0] || activePosts[0] || null;
  }, [criticalPosts, activePosts]);

  // --- Filter Helper ---
  function handleFilterUpdate(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([k, v]) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  // --- Empty State ---
  if (totalPostsCount === 0) {
    return (
      <div className="surface-primary px-6 py-20 text-center space-y-3">
        <ImageOff className="mx-auto text-slate-500" size={38} />
        <h2 className="text-base font-bold text-white">Nenhuma atividade do X encontrada para os filtros selecionados</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Ajuste ou limpe os filtros locais de origem, risco, sentimento ou tema para ampliar o recorte de monitoramento.
        </p>
      </div>
    );
  }

  const isPartialData = completeness?.posts && !completeness.posts.isComplete;
  const currentAlertPost = alert || criticalPosts[0];

  return (
    <div className="space-y-5 pb-12">
      {/* 01 — CABEÇALHO & DADOS PARCIAIS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">Social Intelligence</p>
          <h1 className="text-base font-bold text-white tracking-tight">X — Inteligência e Monitoramento</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoramento do discurso dos candidatos e da conversação política no X.
          </p>
        </div>

        {isPartialData ? (
          <div
            className="px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shrink-0"
            title="Base parcialmente carregada devido ao limite de amostragem da consulta"
          >
            <Info size={14} />
            <span>
              Dados Parciais ({completeness.posts.totalLoaded} de {completeness.posts.totalAvailable} disponíveis)
            </span>
          </div>
        ) : null}
      </div>

      {/* 02 — ALERTA PRIORITÁRIO DE CRISE / IMPACTO */}
      {currentAlertPost ? (
        <section aria-label="Alerta prioritário" className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-rose-900/20 to-[#161B26] p-4 shadow-md backdrop-blur">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2.5 rounded-lg bg-rose-500 text-white shrink-0 animate-pulse mt-0.5">
                <AlertTriangle size={22} />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-rose-600 text-white">
                    Alerta Crítico de Inteligência
                  </span>
                  {currentAlertPost.origin ? originBadge(currentAlertPost.origin) : null}
                  <span className="text-xs font-bold text-rose-300">
                    {criticalCount} {criticalCount === 1 ? 'publicação com risco elevado' : 'publicações com risco elevado'} ({criticalPct}% do escopo)
                  </span>
                </div>
                <h3 className="text-white font-bold text-sm md:text-base line-clamp-1">
                  {alertTitleText(currentAlertPost)}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                  <span className="font-semibold text-cyan-300">{currentAlertPost.candidate_name || 'Candidato'}</span>
                  <span>•</span>
                  <span>Autor: <strong className="text-white">@{currentAlertPost.author?.username || '—'}</strong></span>
                  <span>•</span>
                  <span>Engajamento: <strong className="text-white">{nf.format(currentAlertPost.totalEngagement || 0)} interações</strong></span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded border text-[9px] uppercase font-bold ${riskTone(currentAlertPost.risk)}`}>
                    Risco {label(currentAlertPost.risk)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPost(currentAlertPost)}
                className="px-4 py-2 rounded-lg bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors shadow-md uppercase tracking-wider flex items-center gap-1.5"
              >
                <Zap size={13} /> Análise de IA
              </button>
              {currentAlertPost.url ? (
                <a
                  href={currentAlertPost.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-200 text-xs font-medium hover:bg-white/10 transition-colors uppercase tracking-wider flex items-center gap-1.5"
                >
                  <ExternalLink size={13} /> Abrir no X
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* 03 — KPIS EXECUTIVOS (5 CARDS NORMATIZADOS COM A OVERVIEW) */}
      <section aria-label="Indicadores principais" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi title="Pressão Social (Volume)" value={nf.format(totalPostsCount)} detail={`${ownedCount} próprios • ${externalCount} externos`} />
        <Kpi title="Menções Externas" value={nf.format(externalCount)} detail={`${totalPostsCount ? Math.round((externalCount / totalPostsCount) * 100) : 0}% da conversação`} tone="cyan" />
        <Kpi title="Risco Elevado" value={`${criticalPct}%`} detail={`${criticalCount} publicações críticas`} tone={criticalCount ? 'rose' : 'cyan'} />
        <Kpi title="Sentimento Dominante" value={label(dominantSentimentKey)} detail={`${totalPostsCount && dominantSentimentKey !== '—' ? Math.round((sentimentCounts[dominantSentimentKey] / totalPostsCount) * 100) : 0}% da amostra`} />
        <Kpi title="Engajamento Total" value={nf.format(totalEngagement)} detail="Likes + Replies + Reposts" />
      </section>

      {/* 04 — GRÁFICO PROTAGONISTA: PRESSÃO SOCIAL NO PERÍODO (OWNED vs EXTERNAL) */}
      <Panel title="Pressão Social no Período" subtitle="Evolução temporal comparativa: Publicações do Candidato (OWNED) vs Menções Externas (EXTERNAL)">
        {pressureSeriesData.dates.length > 0 ? (
          <LineChart
            dates={pressureSeriesData.dates}
            seriesData={[
              { name: 'Publicações do Candidato (OWNED)', data: pressureSeriesData.owned, color: '#00FFFF' },
              { name: 'Menções Externas (EXTERNAL)', data: pressureSeriesData.external, color: '#F97316' },
            ]}
            height={180}
          />
        ) : (
          <div className="flex h-40 flex-col items-center justify-center text-slate-500 text-xs gap-1.5">
            <TrendingUp size={24} className="opacity-30" />
            <span>Sem séries temporais disponíveis no período selecionado</span>
          </div>
        )}
      </Panel>

      {/* 05 — DIAGNÓSTICO ANALÍTICO (4 CARDS COMPACTOS NA MESMA FILEIRA EM DESKTOP WIDESCREEN) */}
      <section aria-label="Diagnóstico analítico" className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title="Distribuição de Sentimento" subtitle="Percepção pública agregada" className="min-h-[240px]">
          <SentimentDistribution posts={activePosts} />
        </Panel>

        <Panel title="Distribuição de Risco" subtitle="Gravidade das ocorrências" className="min-h-[240px]">
          <RiskDistribution posts={activePosts} />
        </Panel>

        <Panel title="Nível de Polarização" subtitle="Intensidade de divergência" className="min-h-[240px]">
          <PolarizationBreakdown posts={activePosts} />
        </Panel>

        <Panel title="Temperatura de Crise" subtitle="Vulnerabilidade sintética" className="min-h-[240px]">
          <CrisisGauge posts={activePosts} charts={charts} />
        </Panel>
      </section>

      {/* 06 — TEMAS E NARRATIVAS (OWNED vs EXTERNAL LADO A LADO) */}
      <section aria-label="Temas e Narrativas" className="grid gap-3.5 md:grid-cols-2">
        <Panel title="O Candidato Fala Sobre (OWNED)" subtitle="Pautas dominantes nas publicações oficiais do candidato">
          <ThemeList items={ownedTopics} total={ownedCount} emptyText="Nenhum tema identificado nas publicações próprias." />
        </Panel>

        <Panel title="Falam Sobre o Candidato (EXTERNAL)" subtitle="Pautas dominantes na conversação de terceiros">
          <ThemeList items={externalTopics} total={externalCount} emptyText="Nenhum tema identificado nas menções externas." />
        </Panel>
      </section>

      {/* 07 — SINAIS RELEVANTES (CARDS CLICÁVEIS) */}
      {signalCards.length > 0 ? (
        <Panel title="Sinais Relevantes" subtitle="Alertas e anomalias detectadas no recorte (clique em qualquer sinal para investigar)">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {signalCards.map((sig, idx) => (
              <button
                key={idx}
                type="button"
                onClick={sig.action}
                className={`text-left p-3 rounded-lg border transition-all hover:scale-[1.01] focus:outline-none ${
                  sig.type === 'danger'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200 hover:border-rose-400'
                    : sig.type === 'warning'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:border-amber-400'
                    : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-1">
                  <Zap size={14} className="shrink-0" />
                  <span className="truncate">{sig.title}</span>
                </div>
                <p className="text-xs leading-4 font-normal text-slate-300 line-clamp-2">{sig.desc}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  Investigar Sinal →
                </span>
              </button>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* 08 — ANÁLISE ESTRATÉGICA (DOSSIÊ EXECUTIVO DE IA) */}
      {strategicPost ? (
        <Panel title="Análise Estratégica" subtitle="Leitura sintética do cenário e diagnósticos de inteligência da IA">
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/5 sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Leitura do Cenário</span>
                <p className="text-xs leading-5 text-slate-200 font-normal">
                  {strategicPost.strategicReading && strategicPost.strategicReading !== 'Sem análise'
                    ? strategicPost.strategicReading
                    : strategicPost.summary || 'Análise de cenário em processamento.'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tom do Autor</span>
                  <span className="text-xs font-bold text-cyan-300">{label(strategicPost.authorTone)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Reação do Público</span>
                  <span className="text-xs font-bold text-amber-300">{label(strategicPost.publicReaction)}</span>
                </div>
                {strategicPost.divergenceFlag ? (
                  <span className="inline-block px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-[9px] font-black uppercase text-rose-300">
                    🚨 Desconexão com o público
                  </span>
                ) : null}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-cyan-400/30 bg-cyan-400/10">
              <span className="text-[10px] font-black text-cyan-300 uppercase tracking-widest block mb-1">Protocolo & Ação Recomendada</span>
              <p className="text-xs font-bold text-white leading-relaxed">
                {recommendedActionText(strategicPost.recommendedAction, Boolean(strategicPost.sentiment || strategicPost.risk))}
              </p>
            </div>
          </div>
        </Panel>
      ) : null}

      {/* 09 — MONITORAMENTO PRIORITÁRIO (TABELA COMPACTA INVESTIGATIVA) */}
      <Panel title="Monitoramento Prioritário" subtitle="Tabela investigativa com diagnóstico executivo, origem e ações recomendadas">
        <PriorityTable posts={activePosts.slice(0, 15)} onOpen={setSelectedPost} />
      </Panel>

      {/* 10 — DRAWER INVESTIGATIVO (OVERLAY DE ANÁLISE DO POST) */}
      {selectedPost ? (
        <PostDrawer
          post={selectedPost}
          replies={activeReplies.filter((r: any) => r.post_id === selectedPost.id || r.postId === selectedPost.id)}
          onClose={() => setSelectedPost(null)}
        />
      ) : null}
    </div>
  );
}

// --- HELPERS & SUBCOMPONENTS ---

function Kpi({ title, value, detail, tone = 'cyan' }: { title: string; value: string; detail: string; tone?: 'cyan' | 'rose' }) {
  return (
    <article className="surface-primary px-3.5 py-3 shadow-sm flex flex-col justify-between">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{title}</p>
      <p className={`mt-1 text-xl font-black tracking-tight leading-none ${tone === 'rose' ? 'text-rose-400' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-[10px] text-slate-400 truncate">{detail}</p>
    </article>
  );
}

function Panel({ title, subtitle, className = '', children }: { title: string; subtitle?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`surface-primary p-5 h-full flex flex-col justify-between ${className}`}>
      <div className="mb-3">
        <h3 className="text-white font-bold text-base tracking-tight">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
      </div>
      <div className="flex-1 flex flex-col justify-center">{children}</div>
    </section>
  );
}

function SentimentDistribution({ posts }: { posts: any[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { positivo: 0, neutro: 0, misto: 0, negativo: 0 };
    posts.forEach((p) => {
      const s = (p.sentiment || '').toLowerCase();
      if (map[s] !== undefined) map[s]++;
    });
    return map;
  }, [posts]);

  const total = posts.length;
  const sentimentData = [
    { name: 'Positivo', value: counts.positivo, itemStyle: { color: sentimentColors.positivo } },
    { name: 'Neutro', value: counts.neutro, itemStyle: { color: sentimentColors.neutro } },
    { name: 'Misto', value: counts.misto, itemStyle: { color: sentimentColors.misto } },
    { name: 'Negativo', value: counts.negativo, itemStyle: { color: sentimentColors.negativo } },
  ];

  return (
    <div className="flex flex-col justify-between h-full py-1 space-y-2">
      <div className="flex justify-center">
        {total > 0 ? (
          <DonutChart data={sentimentData} height={115} />
        ) : (
          <div className="flex h-24 items-center justify-center text-[10px] text-slate-500">Sem dados</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1.5 border-t border-white/5">
        {sentimentData.map((item) => (
          <div key={item.name} className="flex justify-between items-center text-[10px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.itemStyle.color }} />
              {item.name}
            </span>
            <span className="font-bold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskDistribution({ posts }: { posts: any[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { baixo: 0, medio: 0, alto: 0, critico: 0 };
    posts.forEach((p) => {
      const r = (p.risk || p.risk_level || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (map[r] !== undefined) map[r]++;
    });
    return map;
  }, [posts]);

  const items = [
    { label: 'Baixo', count: counts.baixo, tone: 'emerald' },
    { label: 'Médio', count: counts.medio, tone: 'amber' },
    { label: 'Alto', count: counts.alto, tone: 'rose' },
    { label: 'Crítico', count: counts.critico, tone: 'rose' },
  ];

  return (
    <div className="space-y-3 flex flex-col justify-between h-full py-1">
      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <div key={it.label} className="p-2 rounded bg-white/[0.02] border border-white/5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">{it.label}</span>
            <span className="text-sm font-black text-white mt-0.5 block">{it.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PolarizationBreakdown({ posts }: { posts: any[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { baixa: 0, media: 0, alta: 0 };
    posts.forEach((p) => {
      const pol = (p.polarizationLevel || p.polarization_level || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (pol.includes('alto') || pol.includes('alta')) map.alta++;
      else if (pol.includes('medio') || pol.includes('media')) map.media++;
      else map.baixa++;
    });
    return map;
  }, [posts]);

  const total = posts.length || 1;

  return (
    <div className="space-y-2 flex flex-col justify-between h-full py-1">
      {[
        { label: 'Alta Polarização', count: counts.alta, color: 'bg-rose-500' },
        { label: 'Média Polarização', count: counts.media, color: 'bg-amber-500' },
        { label: 'Baixa Polarização', count: counts.baixa, color: 'bg-emerald-500' },
      ].map((item) => {
        const pct = Math.round((item.count / total) * 100);
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-[10px] font-semibold text-slate-300">
              <span>{item.label}</span>
              <span className="font-bold text-white">{item.count} ({pct}%)</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CrisisGauge({ posts, charts }: { posts: any[]; charts: any }) {
  const avgCrisis = useMemo(() => {
    if (!posts.length) return null;
    const validScores = posts
      .map((p) => p.crisisScore ?? p.crisisTemperature)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

    if (!validScores.length) return null;
    const sum = validScores.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / validScores.length);
  }, [posts]);

  const statusLabel =
    avgCrisis === null ? '—' : avgCrisis > 75 ? 'CRÍTICA' : avgCrisis > 50 ? 'QUENTE' : avgCrisis > 25 ? 'MORNA' : 'FRIA';
  const statusColor =
    avgCrisis === null
      ? 'text-slate-400'
      : avgCrisis > 75
      ? 'text-rose-400'
      : avgCrisis > 50
      ? 'text-amber-400'
      : 'text-emerald-400';

  return (
    <div className="flex flex-col justify-between h-full py-1 space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Score Sintético</span>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <strong className="text-2xl font-extrabold text-white">{avgCrisis !== null ? avgCrisis : '—'}</strong>
            <span className="text-[10px] text-slate-400 font-semibold">/ 100</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Status</span>
          <span className={`text-xs font-black tracking-wider uppercase ${statusColor}`}>{statusLabel}</span>
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-500"
          style={{ width: `${avgCrisis ?? 0}%` }}
        />
      </div>

      <p className="text-[10px] text-slate-500 italic text-center">
        Indicador sintético ponderado de risco, polarização e rejeição pública.
      </p>
    </div>
  );
}

function ThemeList({ items, total, emptyText }: { items: Array<{ label: string; count: number }>; total: number; emptyText: string }) {
  if (!items.length) {
    return <div className="py-6 text-center text-xs text-slate-500 italic">{emptyText}</div>;
  }

  const max = items[0]?.count || 1;

  return (
    <div className="space-y-2">
      {items.map((it) => {
        const pct = Math.min(100, Math.round((it.count / max) * 100));
        return (
          <div key={it.label} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-200 truncate max-w-[200px]">{it.label}</span>
              <span className="text-cyan-400 font-bold ml-2 shrink-0">{it.count} {it.count === 1 ? 'post' : 'posts'}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PriorityTable({ posts, onOpen }: { posts: any[]; onOpen: (p: any) => void }) {
  if (!posts.length) return <div className="py-6 text-center text-xs text-slate-500 italic">Nenhum conteúdo no recorte.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <tr>
            <th className="p-2.5">Origem</th>
            <th className="p-2.5">Conteúdo / Match</th>
            <th className="p-2.5">Autor</th>
            <th className="p-2.5">Tema (IA)</th>
            <th className="p-2.5">Sentimento</th>
            <th className="p-2.5">Risco</th>
            <th className="p-2.5">Polarização</th>
            <th className="p-2.5">Engajamento</th>
            <th className="p-2.5">Ação IA</th>
            <th className="p-2.5 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {posts.map((p) => {
            const hasAnalysis = Boolean(p.sentiment && p.sentiment !== 'Sem análise');
            const actionText = recommendedActionText(p.recommendedAction, hasAnalysis);
            const matchTerm = p.matchedTerms && p.matchedTerms.length > 0 ? p.matchedTerms[0] : null;

            return (
              <tr key={p.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => onOpen(p)}>
                <td className="p-2.5 whitespace-nowrap">{originBadge(p.origin)}</td>
                <td className="p-2.5 max-w-[220px]">
                  <p className="line-clamp-2 font-semibold text-white group-hover:text-cyan-300">{p.text || 'Sem texto'}</p>
                  {p.origin === 'EXTERNAL' && matchTerm ? (
                    <span className="text-[10px] text-amber-400 font-medium truncate block mt-0.5">
                      Encontrado por: "{matchTerm}"
                    </span>
                  ) : null}
                </td>
                <td className="p-2.5 whitespace-nowrap">
                  <span className="font-semibold text-cyan-400 block">@{p.author?.username || 'usuário'}</span>
                  <span className="text-[10px] text-slate-400 truncate block">{p.candidate_name}</span>
                </td>
                <td className="p-2.5 max-w-[110px] truncate text-slate-300 font-medium">
                  {p.topic && p.topic !== 'Sem análise' && p.topic !== '—' ? p.topic : <span className="text-slate-500 italic text-[10px]">—</span>}
                </td>
                <td className="p-2.5 whitespace-nowrap font-medium text-slate-300">{label(p.sentiment)}</td>
                <td className="p-2.5 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${riskTone(p.risk)}`}>
                    {label(p.risk)}
                  </span>
                </td>
                <td className="p-2.5 whitespace-nowrap text-slate-300 font-medium">{label(p.polarizationLevel || p.polarization_level)}</td>
                <td className="p-2.5 whitespace-nowrap font-bold text-white">
                  {nf.format(p.totalEngagement || p.engagement || 0)}
                </td>
                <td className="p-2.5 max-w-xs truncate text-slate-300 font-medium">{actionText}</td>
                <td className="p-2.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(p);
                    }}
                    className="px-2.5 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-400 hover:text-black font-bold uppercase text-[10px] tracking-wider transition-all"
                  >
                    Investigar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PostDrawer({ post, replies, onClose }: { post: any; replies: any[]; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const isOwned = post.origin === 'OWNED';
  const hasAnalysis = Boolean(post.sentiment && post.sentiment !== 'Sem análise');
  const actionText = recommendedActionText(post.recommendedAction, hasAnalysis);
  const matchTerm = post.matchedTerms && post.matchedTerms.length > 0 ? post.matchedTerms[0] : null;
  const assoc = post.targetAssociations && post.targetAssociations.length > 0 ? post.targetAssociations[0] : null;
  const crisisVal = post.crisisTemperature !== null && post.crisisTemperature !== undefined && post.crisisTemperature !== '' ? post.crisisTemperature : '—';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="x-post-title"
        className="ml-auto h-full w-full overflow-y-auto border-l border-white/10 bg-[#080d18] shadow-2xl sm:max-w-[768px]"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#080d18]/95 p-4 backdrop-blur">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-[.16em] text-cyan-400">Investigação X</span>
              {originBadge(post.origin)}
            </div>
            <h2 id="x-post-title" className="text-sm font-bold text-white flex items-center gap-2">
              @{post.author?.username || 'usuário'}
              <span className="text-xs font-normal text-slate-400">• {post.candidate_name}</span>
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fechar análise"
            onClick={onClose}
            className="rounded-md border border-white/10 p-2 text-slate-300 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          {/* COMO ENCONTRAMOS (AUDITORIA EXTERNAL) */}
          {post.origin === 'EXTERNAL' ? (
            <section className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
              <div className="font-bold uppercase tracking-wider text-[10px] text-amber-400 flex items-center gap-1.5">
                <Search size={13} /> Como Encontramos (Auditoria)
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Relacionado a: <strong className="text-white">{post.candidate_name}</strong></div>
                <div>Termo: <strong className="text-white">"{matchTerm || '—'}"</strong></div>
                <div>Origem: <strong className="text-white">{assoc?.discoverySource || 'Search / Mention'}</strong></div>
                <div>Match: <strong className="text-white">{assoc?.matchType || 'Keyword'}</strong></div>
              </div>
            </section>
          ) : null}

          {/* DIAGNÓSTICO SINTÉTICO */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded bg-white/[0.03] border border-white/5 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Sentimento</span>
              <span className="text-xs font-bold text-white block mt-0.5">{label(post.sentiment)}</span>
            </div>
            <div className="p-2.5 rounded bg-white/[0.03] border border-white/5 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Risco</span>
              <span className={`text-xs font-bold block mt-0.5 ${riskTone(post.risk)}`}>{label(post.risk)}</span>
            </div>
            <div className="p-2.5 rounded bg-white/[0.03] border border-white/5 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Polarização</span>
              <span className="text-xs font-bold text-white block mt-0.5">{label(post.polarizationLevel || post.polarization_level)}</span>
            </div>
            <div className="p-2.5 rounded bg-white/[0.03] border border-white/5 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Temperatura Crise</span>
              <span className="text-xs font-bold text-rose-300 block mt-0.5">{crisisVal}</span>
            </div>
          </section>

          {/* CONTEÚDO COMPLETO */}
          <section className="space-y-3">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200 font-normal bg-white/[0.02] p-4 rounded-lg border border-white/5">
              {post.text || 'Publicação sem texto.'}
            </p>

            {post.media && post.media.length > 0 ? (
              <div className="space-y-2">
                {post.media.map((m: any, idx: number) => (
                  <div key={idx} className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black">
                    {m.url ? (
                      <Image src={m.url} alt="Mídia da publicação" fill unoptimized className="object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500 text-xs">Mídia indisponível</div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {post.url ? (
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:underline"
              >
                <ExternalLink size={13} /> Abrir Publicação Original no X
              </a>
            ) : null}
          </section>

          {/* MÉTRICAS (EXIBIDAS SE AVAILABLE === TRUE) */}
          <section className="grid grid-cols-3 sm:grid-cols-6 gap-2 border-y border-white/5 py-3 text-center">
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Likes</span>
              <span className="text-xs font-bold text-white">{metric(post.metrics?.likes?.value, post.metrics?.likes?.available)}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Replies</span>
              <span className="text-xs font-bold text-white">{metric(post.metrics?.replies?.value, post.metrics?.replies?.available)}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Reposts</span>
              <span className="text-xs font-bold text-white">{metric(post.metrics?.reposts?.value, post.metrics?.reposts?.available)}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Quotes</span>
              <span className="text-xs font-bold text-white">{metric(post.metrics?.quotes?.value, post.metrics?.quotes?.available)}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Views</span>
              <span className="text-xs font-bold text-white">{metric(post.metrics?.views?.value, post.metrics?.views?.available)}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Bookmarks</span>
              <span className="text-xs font-bold text-white">{metric(post.metrics?.bookmarks?.value, post.metrics?.bookmarks?.available)}</span>
            </div>
          </section>

          {/* DIAGNÓSTICO ESTRATÉGICO DE IA */}
          <AnalysisBlock title="Resumo de IA" text={post.summary} />
          <AnalysisBlock title="Motivo do Risco" text={post.riskReason} />

          <section className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.025] border border-white/5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tom do Autor</span>
              <span className="text-xs font-bold text-cyan-300">{label(post.authorTone)}</span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.025] border border-white/5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Reação do Público</span>
              <span className="text-xs font-bold text-amber-300">{label(post.publicReaction)}</span>
            </div>
          </section>

          <AnalysisBlock title="Leitura Estratégica" text={post.strategicReading} />

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-2">
              <Zap size={14} /> Protocolo & Ação Recomendada
            </h3>
            <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm font-bold text-cyan-200 leading-relaxed">
              {actionText}
            </div>
          </section>

          {/* TEMAS DETECTADOS */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Temas Detectados</h3>
            {post.ai_topics && post.ai_topics.length ? (
              <div className="flex flex-wrap gap-2">
                {post.ai_topics.map((theme: string) => (
                  <span key={theme} className="rounded bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-slate-300 font-medium">
                    {theme}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Nenhum tema especificado.</p>
            )}
          </section>

          {/* CONVERSAÇÃO / SAMPLE DE REPLIES (PARA OWNED) */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Conversação & Respostas ({replies.length})</span>
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {replies.length ? (
                replies.map((reply) => (
                  <article key={reply.id} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                    <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1">
                      <span className="text-cyan-400">@{reply.user || reply.author?.username || 'usuário'}</span>
                      <span>{reply.created_at ? new Date(reply.created_at).toLocaleDateString('pt-BR') : '—'}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-5">{reply.text}</p>
                  </article>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic py-4 text-center">Nenhuma resposta/reply coletada neste recorte.</p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function AnalysisBlock({ title, text }: { title: string; text: string | null }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{title}</h3>
      <p className="rounded-lg border border-white/8 bg-white/[0.025] p-3.5 text-sm leading-6 text-slate-300 whitespace-pre-wrap">
        {text && text !== 'Sem análise' ? text : '—'}
      </p>
    </section>
  );
}
