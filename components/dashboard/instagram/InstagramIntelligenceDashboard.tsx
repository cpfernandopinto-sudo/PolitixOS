'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Heart, ImageOff,
  MessageCircle, Play, X, Zap, ShieldAlert, TrendingUp, Layers, CheckCircle2
} from 'lucide-react';
import DonutChart from '@/components/charts/DonutChart';
import LineChart from '@/components/charts/LineChart';
import type { InstagramMetric, InstagramUiContract, InstagramUiPost, InstagramUiComment } from '@/lib/types/instagram-ui';

const nf = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const sentimentColors: Record<string, string> = { positivo: '#22c55e', neutro: '#3b82f6', misto: '#eab308', negativo: '#ef4444' };

function metric(metricValue: InstagramMetric) {
  return metricValue.availability === 'AVAILABLE' ? nf.format(metricValue.value ?? 0) : '—';
}

function label(value: string | null) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : 'Sem análise';
}

function riskTone(value: string | null) {
  const normalized = value?.toLowerCase() ?? '';
  if (normalized.includes('alto') || normalized.includes('crít')) {
    return 'border-rose-500/40 bg-rose-500/15 text-rose-300 font-bold';
  }
  if (normalized.includes('médio') || normalized.includes('medio')) {
    return 'border-amber-500/40 bg-amber-500/15 text-amber-300 font-medium';
  }
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-medium';
}

function recommendedActionText(action: string | null | undefined, hasAnalysis: boolean) {
  if (action && action.trim().length > 0 && action.trim() !== 'Sem análise' && action.trim() !== '—') {
    return action;
  }
  if (!hasAnalysis) return 'ANÁLISE PENDENTE';
  return 'RECOMENDAÇÃO INDISPONÍVEL';
}

export default function InstagramIntelligenceDashboard({ contract }: { contract: InstagramUiContract }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPost, setSelectedPost] = useState<InstagramUiPost | null>(null);

  // --- Map of all posts by ID for quick lookup ---
  const allPostsMap = useMemo(() => {
    const map = new Map<string, InstagramUiPost>();
    contract.recentPosts.forEach((p) => map.set(p.id, p));
    contract.topPosts.items.forEach((p) => map.set(p.id, p));
    return map;
  }, [contract.recentPosts, contract.topPosts.items]);

  // --- Strategic Calculations ---
  const totalLikes = contract.performanceByType.reduce((sum, group) => sum + (group.likes.value ?? 0), 0);
  const totalPostComments = contract.performanceByType.reduce((sum, group) => sum + (group.comments.value ?? 0), 0);
  const dominantSentimentItem = contract.sentiment[0] ?? null;
  const dominantSentiment = dominantSentimentItem?.label ?? null;
  const topFormat = [...contract.performanceByType].sort((a, b) => (b.likes.value ?? 0) - (a.likes.value ?? 0))[0]?.type ?? null;
  const criticalCount = contract.risk.filter(({ label: item }) => /alto|crít/i.test(item)).reduce((sum, item) => sum + item.count, 0);
  const criticalPct = contract.summary.posts ? Math.round((criticalCount / contract.summary.posts) * 100) : 0;

  // --- Highest Risk Post for Crisis Alert ---
  const criticalPost = useMemo(() => {
    return contract.recentPosts.find((p) => /alto|crít/i.test(p.analysis.risk ?? '')) || contract.recentPosts[0] || null;
  }, [contract.recentPosts]);

  // --- Temporal Pressure Series (Social Pressure over Time) ---
  const pressureSeriesData = useMemo(() => {
    const dayMap: Record<string, { comments: number; engagement: number }> = {};
    contract.comments.recent.forEach((c) => {
      if (!c.publishedAt && !c.collectedAt) return;
      const dateStr = c.publishedAt || c.collectedAt;
      const day = new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dayMap[day]) dayMap[day] = { comments: 0, engagement: 0 };
      dayMap[day].comments++;
    });
    contract.recentPosts.forEach((p) => {
      if (!p.publishedAt && !p.collectedAt) return;
      const dateStr = p.publishedAt || p.collectedAt || '';
      const day = new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dayMap[day]) dayMap[day] = { comments: 0, engagement: 0 };
      const eng = (p.metrics.likes.value ?? 0) + (p.metrics.comments.value ?? 0);
      dayMap[day].engagement += eng;
    });
    const sorted = Object.entries(dayMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => {
        const [da, ma] = a.date.split('/').map(Number);
        const [db, mb] = b.date.split('/').map(Number);
        return (ma * 100 + da) - (mb * 100 + db);
      });
    return {
      dates: sorted.map((d) => d.date),
      comments: sorted.map((d) => d.comments),
      engagement: sorted.map((d) => d.engagement),
    };
  }, [contract.comments.recent, contract.recentPosts]);

  // --- Topic click handler ---
  function handleTopicClick(topicName: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set('topic', topicName);
    next.delete('page');
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  // --- Open Drawer from Comment Signal ---
  function handleOpenCommentContext(comment: InstagramUiComment) {
    const targetPost = allPostsMap.get(comment.postId);
    if (targetPost) {
      setSelectedPost(targetPost);
    } else {
      setSelectedPost({
        id: comment.postId,
        targetId: '',
        candidateName: comment.candidateName,
        contentType: 'IMAGE',
        caption: comment.postCaption || 'Publicação relacionada ao comentário',
        publishedAt: comment.publishedAt,
        collectedAt: comment.collectedAt,
        url: comment.postUrl,
        mediaUrl: null,
        metrics: {
          likes: { value: null, availability: 'UNAVAILABLE', source: null },
          comments: { value: null, availability: 'UNAVAILABLE', source: null },
          plays: { value: null, availability: 'UNAVAILABLE', source: null },
          views: { value: null, availability: 'UNAVAILABLE', source: null },
          reach: { value: null, availability: 'UNAVAILABLE', source: null },
          impressions: { value: null, availability: 'UNAVAILABLE', source: null },
          shares: { value: null, availability: 'UNAVAILABLE', source: null },
          saves: { value: null, availability: 'UNAVAILABLE', source: null },
        },
        analysis: {
          sentiment: null,
          risk: null,
          themes: [],
          summary: null,
          riskReason: null,
          recommendedAction: null,
        },
        reel: null,
        carousel: null,
        enrichment: { available: false, playCount: { value: null, availability: 'UNAVAILABLE', source: null }, durationSeconds: { value: null, availability: 'UNAVAILABLE', source: null }, hasAudio: null, audioAttribution: null },
      });
    }
  }

  if (contract.summary.posts === 0) return <EmptyState />;

  return (
    <div className="space-y-5 pb-12">
      {/* 03 — ALERTA PRIORITÁRIO (CRÍSE / ALTO RISCO) */}
      {criticalCount > 0 && criticalPost ? (
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
                  <span className="text-xs font-bold text-rose-300">
                    {criticalCount} {criticalCount === 1 ? 'publicação com risco elevado' : 'publicações com risco elevado'} ({criticalPct}% do escopo)
                  </span>
                </div>
                <h3 className="text-white font-bold text-sm md:text-base line-clamp-1">
                  {criticalPost.caption || 'Publicação sob monitoramento de risco'}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                  <span className="font-semibold text-cyan-300">{criticalPost.candidateName || 'Candidato'}</span>
                  <span>•</span>
                  <span>Formato: <strong className="text-white">{criticalPost.contentType}</strong></span>
                  <span>•</span>
                  <span>Interações: <strong className="text-white">{metric(criticalPost.metrics.likes)} likes, {metric(criticalPost.metrics.comments)} com.</strong></span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded border text-[9px] uppercase font-bold ${riskTone(criticalPost.analysis.risk)}`}>
                    Risco {label(criticalPost.analysis.risk)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPost(criticalPost)}
                className="px-4 py-2 rounded-lg bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors shadow-md uppercase tracking-wider flex items-center gap-1.5"
              >
                <Zap size={13} /> Análise de IA
              </button>
              {criticalPost.url ? (
                <a
                  href={criticalPost.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-200 text-xs font-medium hover:bg-white/10 transition-colors uppercase tracking-wider flex items-center gap-1.5"
                >
                  <ExternalLink size={13} /> Abrir Post
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* 04 — KPIS EXECUTIVOS (5 CARDS REUTILIZANDO SURFACE-PRIMARY DA OVERVIEW) */}
      <section aria-label="Indicadores principais" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi title="Posts monitorados" value={nf.format(contract.summary.posts)} detail={`${contract.summary.analyzedPosts} analisados por IA`} />
        <Kpi title="Interações totais" value={`${nf.format(totalLikes)} likes`} detail={`${nf.format(totalPostComments)} comentários`} />
        <Kpi title="Risco elevado" value={`${criticalPct}%`} detail={`${criticalCount} críticas`} tone={criticalCount ? 'rose' : 'cyan'} />
        <Kpi title="Sentimento dominante" value={label(dominantSentiment)} detail={`${dominantSentimentItem ? Math.round((dominantSentimentItem.count / (contract.summary.analyzedPosts || 1)) * 100) : 0}% da amostra`} />
        <Kpi title="Formato em destaque" value={topFormat ?? '—'} detail="Maior engajamento" />
      </section>

      {/* 05 — PANORAMA ANALÍTICO EXECUTIVO (4 CARDS COMPACTOS EM SURFACE-PRIMARY NA MESMA FILEIRA EM DESKTOP WIDESCREEN) */}
      <section aria-label="Panorama analítico executivo" className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title="Pressão Social" subtitle="Evolução temporal de engajamento e comentários no recorte ativo" className="min-h-[240px]">
          {pressureSeriesData.dates.length > 0 ? (
            <LineChart
              dates={pressureSeriesData.dates}
              seriesData={[
                { name: 'Volume de Comentários', data: pressureSeriesData.comments, color: '#00FFFF' },
                { name: 'Engajamento Total', data: pressureSeriesData.engagement, color: '#3B82F6' },
              ]}
              height={160}
            />
          ) : (
            <div className="flex h-36 flex-col items-center justify-center text-slate-500 text-xs gap-1.5">
              <TrendingUp size={24} className="opacity-30" />
              <span className="text-[11px]">Sem séries temporais disponíveis</span>
            </div>
          )}
        </Panel>

        <Panel title="Termômetro de Risco" subtitle="Índice sintético de vulnerabilidade política" className="min-h-[240px]">
          <RiskPanel contract={contract} />
        </Panel>

        <Panel title="Distribuição de Sentimento" subtitle="Percepção pública agregada entre os posts analisados" className="min-h-[240px]">
          <SentimentDistribution contract={contract} />
        </Panel>

        <Panel title="Temas do Instagram (IA)" subtitle="Ranking das pautas dominantes identificadas por IA" className="min-h-[240px]">
          <ThemesRanking themes={contract.themes} totalPosts={contract.summary.posts} onSelectTopic={handleTopicClick} />
        </Panel>
      </section>

      {/* 07 — PERFORMANCE POR FORMATO */}
      <Panel title="Performance por Formato" subtitle="Métricas desagregadas por formato; dados ausentes não são convertidos em zero">
        <Performance contract={contract} />
      </Panel>

      {/* 08 — MONITORAMENTO DE POSTS PRIORITÁRIOS */}
      <Panel title="Monitoramento de Posts Prioritários" subtitle="Conteúdos que exigem atenção estratégica rápida (Top por engajamento e risco)">
        <PriorityPostsTable posts={contract.topPosts.items.slice(0, 5)} onOpen={setSelectedPost} analyzedPostsCount={contract.summary.analyzedPosts} />
      </Panel>

      {/* 09 — FEED EXECUTIVO COMPACTO (4 COLUNAS DESKTOP) */}
      <Panel title="Feed Executivo" subtitle="Clique em qualquer publicação para abrir a investigação completa (4 colunas em widescreen)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {contract.recentPosts.map((post) => (
            <CompactPostCard key={post.id} post={post} onOpen={() => setSelectedPost(post)} />
          ))}
        </div>
      </Panel>

      {/* 10 — SINAIS RELEVANTES EM COMENTÁRIOS */}
      <Panel title="Sinais Relevantes em Comentários" subtitle="Comentários de destaque ordenados por likes — clique em 'Ver Contexto' para investigar o post">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {contract.comments.relevant.length > 0 ? (
            contract.comments.relevant.slice(0, 8).map((comment) => (
              <article key={comment.id} className="surface-primary p-3 flex flex-col justify-between hover:border-cyan-400/40 transition-all">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                    <span className="font-semibold text-slate-300">@{comment.author || 'usuário'}</span>
                    <span className="text-cyan-400 font-bold">{metric(comment.likeCount)} likes</span>
                  </div>
                  <p className="line-clamp-3 text-xs leading-4 text-slate-200 font-normal">
                    "{comment.text || 'Comentário sem texto.'}"
                  </p>
                  {comment.postCaption ? (
                    <p className="mt-2 line-clamp-2 border-l-2 border-cyan-400/50 pl-2 text-[10px] text-slate-400 italic">
                      Post: {comment.postCaption}
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 border-t border-white/5 pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">{comment.candidateName || '—'}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenCommentContext(comment)}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 uppercase tracking-wider"
                  >
                    Ver Contexto →
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-xs text-slate-500 italic">
              Nenhum comentário com sinal objetivo de relevância no recorte atual.
            </div>
          )}
        </div>
      </Panel>

      {/* 11 — ANÁLISE ESTRATÉGICA DOS POSTS */}
      <Panel title="Análise Estratégica dos Posts" subtitle="Tabela comparativa executiva com diagnósticos e recomendações de IA">
        <StrategicPostsTable posts={contract.recentPosts.slice(0, 15)} onOpen={setSelectedPost} analyzedPostsCount={contract.summary.analyzedPosts} />
      </Panel>

      {/* 12 — POST DETAIL & AI ANALYSIS DRAWER (OVERLAY REUTILIZADO) */}
      {selectedPost ? (
        <PostDrawer
          post={selectedPost}
          comments={contract.comments.recent.filter((comment) => comment.postId === selectedPost.id)}
          onClose={() => setSelectedPost(null)}
          analyzedPostsCount={contract.summary.analyzedPosts}
        />
      ) : null}
    </div>
  );
}

// --- SUBCOMPONENTS & HELPERS ---

function Kpi({ title, value, detail, tone = 'cyan' }: { title: string; value: string; detail: string; tone?: 'cyan' | 'rose' }) {
  return (
    <article className="surface-primary px-4 py-3.5 flex flex-col justify-between shadow-sm">
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

function RiskPanel({ contract }: { contract: InstagramUiContract }) {
  const total = contract.risk.reduce((sum, item) => sum + item.count, 0);
  const score = total
    ? Math.round(
        contract.risk.reduce(
          (sum, item) =>
            sum +
            item.count *
              (/alto|crít/i.test(item.label) ? 100 : /médio|medio/i.test(item.label) ? 50 : 15),
          0
        ) / total
      )
    : null;

  const statusLabel =
    score === null ? '—' : score > 80 ? 'CRÍTICO' : score > 60 ? 'ELEVADO' : score > 30 ? 'ATENÇÃO' : 'ESTÁVEL';
  const statusColor =
    score === null
      ? 'text-slate-400'
      : score > 80
      ? 'text-rose-400'
      : score > 60
      ? 'text-rose-300'
      : score > 30
      ? 'text-amber-400'
      : 'text-emerald-400';

  return (
    <div className="space-y-3 flex flex-col justify-between h-full py-1">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Índice Sintético</p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <strong className="text-2xl font-extrabold text-white">{score ?? '—'}</strong>
            {score !== null ? <span className="text-[10px] text-slate-400 font-semibold">/ 100</span> : null}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Status</span>
          <p className={`text-xs font-black tracking-wider uppercase ${statusColor}`}>{statusLabel}</p>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-500"
          style={{ width: `${score ?? 0}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/5 text-center">
        {contract.risk.map((item) => (
          <div key={item.label} className="p-1.5 rounded bg-white/[0.02] border border-white/5">
            <span className={`text-[9px] font-bold block ${riskTone(item.label)}`}>{label(item.label)}</span>
            <span className="text-[11px] font-bold text-white mt-0.5 block">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SentimentDistribution({ contract }: { contract: InstagramUiContract }) {
  const total = contract.sentiment.reduce((sum, item) => sum + item.count, 0);
  const sentimentData = contract.sentiment.map((item) => ({
    name: label(item.label),
    value: item.count,
    itemStyle: { color: sentimentColors[item.label.toLowerCase()] ?? '#3b82f6' },
  }));

  const maxItem = [...contract.sentiment].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="flex flex-col justify-between h-full py-1 space-y-2">
      <div className="grid grid-cols-2 items-center gap-2">
        <div>
          {sentimentData.length > 0 ? (
            <DonutChart data={sentimentData} height={115} />
          ) : (
            <div className="flex h-24 items-center justify-center text-[10px] text-slate-500">Sem dados</div>
          )}
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Predominante</span>
          <span className="text-sm font-black text-white mt-0.5 block truncate">{label(maxItem?.label)}</span>
          <span className="text-[10px] text-slate-400 font-semibold">
            {total ? Math.round(((maxItem?.count ?? 0) / total) * 100) : 0}% da amostra
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1.5 border-t border-white/5">
        {contract.sentiment.map((item) => (
          <div key={item.label} className="flex justify-between items-center text-[10px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sentimentColors[item.label.toLowerCase()] ?? '#3b82f6' }} />
              {label(item.label)}
            </span>
            <span className="font-bold text-white">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemesRanking({
  themes,
  totalPosts,
  onSelectTopic,
}: {
  themes: Array<{ label: string; count: number }>;
  totalPosts: number;
  onSelectTopic: (topic: string) => void;
}) {
  if (!themes.length) {
    return <div className="py-8 text-center text-xs text-slate-500 italic">Nenhum tema identificado.</div>;
  }

  const maxCount = themes[0]?.count || 1;
  const topThemes = themes.slice(0, 5);

  return (
    <div className="space-y-1.5 flex flex-col justify-between h-full py-0.5">
      {topThemes.map((theme) => {
        const pct = Math.min(100, Math.round((theme.count / maxCount) * 100));
        return (
          <button
            key={theme.label}
            type="button"
            onClick={() => onSelectTopic(theme.label)}
            className="w-full text-left group space-y-0.5 p-1 rounded hover:bg-white/5 transition-colors focus:outline-none"
          >
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-slate-200 group-hover:text-cyan-300 transition-colors truncate max-w-[120px]">{theme.label}</span>
              <span className="text-cyan-400 font-bold ml-1 shrink-0">{theme.count}</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
              <div
                className="h-full bg-cyan-400 group-hover:bg-cyan-300 transition-all duration-500 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Performance({ contract }: { contract: InstagramUiContract }) {
  const max = Math.max(
    1,
    ...contract.performanceByType.flatMap((group) => [
      group.likes.value ?? 0,
      group.comments.value ?? 0,
      group.plays.value ?? 0,
    ])
  );

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {contract.performanceByType.map((group) => (
        <div key={group.type} className="surface-primary p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              {group.type === 'REEL' ? <Play size={13} className="text-cyan-400" /> : group.type === 'CAROUSEL' ? <Layers size={13} className="text-purple-400" /> : null}
              {group.type}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{group.posts} posts</span>
          </div>
          <MetricBar label="Likes" value={group.likes} max={max} color="bg-fuchsia-400" />
          <MetricBar label="Comentários" value={group.comments} max={max} color="bg-cyan-400" />
          <MetricBar label="Plays" value={group.plays} max={max} color="bg-purple-400" />
        </div>
      ))}
    </div>
  );
}

function MetricBar({ label: barLabel, value, max, color }: { label: string; value: InstagramMetric; max: number; color: string }) {
  const width = value.availability === 'AVAILABLE' ? Math.max(4, ((value.value ?? 0) / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[70px_1fr_45px] items-center gap-2 text-[11px]">
      <span className="text-slate-400">{barLabel}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        {value.availability === 'AVAILABLE' ? <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} /> : null}
      </div>
      <span className="text-right text-slate-200 font-semibold">{metric(value)}</span>
    </div>
  );
}

function PriorityPostsTable({
  posts,
  onOpen,
  analyzedPostsCount,
}: {
  posts: InstagramUiPost[];
  onOpen: (post: InstagramUiPost) => void;
  analyzedPostsCount: number;
}) {
  if (!posts.length) return <div className="py-6 text-center text-xs text-slate-500 italic">Sem posts prioritários no momento.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <tr>
            <th className="p-2.5">Post</th>
            <th className="p-2.5">Candidato</th>
            <th className="p-2.5">Formato</th>
            <th className="p-2.5">Tema (IA)</th>
            <th className="p-2.5">Engajamento</th>
            <th className="p-2.5">Risco</th>
            <th className="p-2.5">Sentimento</th>
            <th className="p-2.5">Ação Recomendada</th>
            <th className="p-2.5 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {posts.map((p) => {
            const hasAnalysis = Boolean(p.analysis.sentiment || p.analysis.risk);
            const actionText = recommendedActionText(p.analysis.recommendedAction, hasAnalysis);
            return (
              <tr key={p.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => onOpen(p)}>
                <td className="p-2.5 max-w-[180px] font-semibold text-white truncate group-hover:text-cyan-300">
                  {p.caption || 'Sem legenda'}
                </td>
                <td className="p-2.5 font-semibold text-cyan-400 whitespace-nowrap">{p.candidateName || '—'}</td>
                <td className="p-2.5 whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded border border-cyan-400/20 bg-cyan-400/10 text-[10px] font-bold text-cyan-300">
                    {p.contentType}
                  </span>
                </td>
                <td className="p-2.5 max-w-[120px] truncate text-slate-300">
                  {p.analysis.themes.length > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="truncate max-w-[85px] font-medium">{p.analysis.themes[0]}</span>
                      {p.analysis.themes.length > 1 ? (
                        <span className="rounded bg-white/10 px-1 py-0.2 text-[9px] font-bold text-cyan-300 shrink-0">
                          +{p.analysis.themes.length - 1}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic text-[10px]">TEMA INDISPONÍVEL</span>
                  )}
                </td>
                <td className="p-2.5 font-bold text-white whitespace-nowrap">
                  {metric(p.metrics.likes)} likes / {metric(p.metrics.comments)} com.
                </td>
                <td className="p-2.5 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${riskTone(p.analysis.risk)}`}>
                    {label(p.analysis.risk)}
                  </span>
                </td>
                <td className="p-2.5 whitespace-nowrap font-medium text-slate-300">{label(p.analysis.sentiment)}</td>
                <td className="p-2.5 max-w-xs truncate text-slate-300 font-medium">
                  {actionText}
                </td>
                <td className="p-2.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(p);
                    }}
                    className="px-2.5 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-400 hover:text-black font-bold uppercase text-[10px] tracking-wider transition-all"
                  >
                    Detalhes
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

function CompactPostCard({ post, onOpen }: { post: InstagramUiPost; onOpen: () => void }) {
  return (
    <article className="group overflow-hidden surface-primary flex flex-col justify-between hover:border-cyan-400/40 transition-all">
      <Media post={post} />
      <button
        type="button"
        onClick={onOpen}
        className="p-3 text-left w-full focus:outline-none flex-1 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="rounded border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-cyan-300">
              {post.contentType}
            </span>
            <span className={`rounded border px-2 py-0.5 text-[9px] ${riskTone(post.analysis.risk)}`}>
              {label(post.analysis.risk)}
            </span>
          </div>
          <p className="line-clamp-2 text-xs leading-4 font-medium text-slate-200 min-h-[32px]">
            {post.caption || 'Publicação sem legenda.'}
          </p>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-1.5 text-[10px] text-slate-400">
          <span className="truncate max-w-[100px] font-semibold text-slate-300">{post.candidateName || '—'}</span>
          <span className="flex gap-2 font-bold">
            <i className="flex items-center gap-1 not-italic"><Heart size={11} className="text-slate-400" />{metric(post.metrics.likes)}</i>
            <i className="flex items-center gap-1 not-italic"><MessageCircle size={11} className="text-slate-400" />{metric(post.metrics.comments)}</i>
          </span>
        </div>
      </button>
    </article>
  );
}

function StrategicPostsTable({
  posts,
  onOpen,
  analyzedPostsCount,
}: {
  posts: InstagramUiPost[];
  onOpen: (post: InstagramUiPost) => void;
  analyzedPostsCount: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <tr>
            <th className="p-2.5">Data</th>
            <th className="p-2.5">Candidato</th>
            <th className="p-2.5">Conteúdo</th>
            <th className="p-2.5">Tema IA</th>
            <th className="p-2.5">Sentimento</th>
            <th className="p-2.5">Risco</th>
            <th className="p-2.5">Motivo Risco</th>
            <th className="p-2.5">Ação Recomendada</th>
            <th className="p-2.5 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {posts.map((p) => {
            const hasAnalysis = Boolean(p.analysis.sentiment || p.analysis.risk);
            const dateStr = p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('pt-BR') : '—';
            const actionText = recommendedActionText(p.analysis.recommendedAction, hasAnalysis);
            return (
              <tr key={p.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onOpen(p)}>
                <td className="p-2.5 whitespace-nowrap text-slate-400">{dateStr}</td>
                <td className="p-2.5 font-semibold text-cyan-400 whitespace-nowrap">{p.candidateName || '—'}</td>
                <td className="p-2.5 max-w-[200px] truncate font-medium text-white">{p.caption || 'Sem legenda'}</td>
                <td className="p-2.5 max-w-[120px] truncate text-slate-300">{p.analysis.themes[0] || '—'}</td>
                <td className="p-2.5 whitespace-nowrap">{label(p.analysis.sentiment)}</td>
                <td className="p-2.5 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${riskTone(p.analysis.risk)}`}>
                    {label(p.analysis.risk)}
                  </span>
                </td>
                <td className="p-2.5 max-w-xs truncate text-slate-400">{p.analysis.riskReason || '—'}</td>
                <td className="p-2.5 max-w-xs truncate text-slate-300 font-medium">{actionText}</td>
                <td className="p-2.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(p);
                    }}
                    className="text-cyan-400 font-bold uppercase text-[10px] tracking-wider hover:underline"
                  >
                    Ver Detalhes
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

function Media({ post }: { post: InstagramUiPost }) {
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const children = post.carousel?.children ?? [];
  const child = children[index];
  const source = child?.videoUrl ?? child?.imageUrl ?? post.mediaUrl;

  if (!source || failed) {
    return (
      <div className="flex aspect-video items-center justify-center bg-slate-950 text-slate-500">
        <ImageOff size={24} />
        <span className="ml-2 text-xs font-semibold">Mídia indisponível</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden bg-black">
      {post.contentType === 'REEL' || child?.videoUrl ? (
        <video src={source} controls preload="metadata" onError={() => setFailed(true)} className="h-full w-full object-contain" />
      ) : (
        <Image
          src={source}
          alt="Mídia da publicação"
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          onError={() => setFailed(true)}
          className="object-cover"
        />
      )}
      {children.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Mídia anterior"
            onClick={(event) => {
              event.stopPropagation();
              setIndex((current) => (current - 1 + children.length) % children.length);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Próxima mídia"
            onClick={(event) => {
              event.stopPropagation();
              setIndex((current) => (current + 1) % children.length);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
          >
            <ChevronRight size={16} />
          </button>
          <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[9px] font-bold text-white">
            {index + 1}/{children.length}
          </span>
        </>
      ) : null}
      {post.contentType === 'REEL' ? (
        <Play className="pointer-events-none absolute left-3 top-3 text-white drop-shadow" size={16} />
      ) : null}
    </div>
  );
}

function PostDrawer({
  post,
  comments,
  onClose,
  analyzedPostsCount,
}: {
  post: InstagramUiPost;
  comments: InstagramUiComment[];
  onClose: () => void;
  analyzedPostsCount: number;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const hasAnalysis = Boolean(post.analysis.sentiment || post.analysis.risk);
  const actionText = recommendedActionText(post.analysis.recommendedAction, hasAnalysis);

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
        aria-labelledby="instagram-post-title"
        className="ml-auto h-full w-full overflow-y-auto border-l border-white/10 bg-[#080d18] shadow-2xl sm:max-w-[768px]"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#080d18]/95 p-4 backdrop-blur">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-[.16em] text-cyan-400">Investigação de Inteligência</p>
            <h2 id="instagram-post-title" className="mt-0.5 text-sm font-bold text-white">
              {post.candidateName || 'Instagram Post'}
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
          <Media post={post} />

          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300">
                {post.contentType}
              </span>
              <span className={`rounded border px-2.5 py-1 text-[10px] ${riskTone(post.analysis.risk)}`}>
                Risco {label(post.analysis.risk)}
              </span>
              <span className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                Sentimento {label(post.analysis.sentiment)}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200 font-normal bg-white/[0.02] p-4 rounded-lg border border-white/5">
              {post.caption || 'Publicação sem legenda.'}
            </p>
            {post.url ? (
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:underline"
              >
                <ExternalLink size={13} /> Abrir Publicação Original no Instagram
              </a>
            ) : null}
          </section>

          <section className="grid grid-cols-3 gap-3">
            <Kpi title="Likes" value={metric(post.metrics.likes)} detail="Informado" />
            <Kpi title="Comentários" value={metric(post.metrics.comments)} detail="No post" />
            <Kpi title="Plays" value={metric(post.metrics.plays)} detail="Quando disponível" />
          </section>

          <AnalysisBlock title="Resumo de IA" text={post.analysis.summary} />
          <AnalysisBlock title="Motivo do Risco" text={post.analysis.riskReason} />

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-2">
              <Zap size={14} /> Protocolo & Ação Recomendada
            </h3>
            <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm font-bold text-cyan-200 leading-relaxed">
              {actionText}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Temas Detectados</h3>
            {post.analysis.themes.length ? (
              <div className="flex flex-wrap gap-2">
                {post.analysis.themes.map((theme) => (
                  <span key={theme} className="rounded bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-slate-300 font-medium">
                    {theme}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">TEMA INDISPONÍVEL</p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Comentários Coletados ({comments.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comments.length ? (
                comments.map((comment) => (
                  <article key={comment.id} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                    <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1">
                      <span>@{comment.author || 'usuário'}</span>
                      <span className="text-cyan-400">{metric(comment.likeCount)} likes</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-5">{comment.text || 'Comentário sem texto.'}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic py-4 text-center">Nenhum comentário disponível neste recorte.</p>
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

function EmptyState() {
  return (
    <div className="surface-primary px-6 py-20 text-center space-y-3">
      <ImageOff className="mx-auto text-slate-500" size={38} />
      <h2 className="text-base font-bold text-white">Nenhuma publicação encontrada</h2>
      <p className="text-sm text-slate-400 max-w-md mx-auto">
        Ajuste ou limpe os filtros locais ou globais para ampliar o recorte de monitoramento.
      </p>
    </div>
  );
}
