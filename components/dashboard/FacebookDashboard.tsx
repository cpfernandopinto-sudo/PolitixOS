'use client';

import { useState } from 'react';
import {
  ThumbsUp, MessageSquare, Share2, ShieldAlert, Sparkles, TrendingUp,
  Layers, ExternalLink, Tag, AlertTriangle, Radio, CheckCircle2, ChevronRight
} from 'lucide-react';
import type { FacebookPostWithAnalysis } from '@/lib/queries/facebook';
import FacebookPostDrawer from './FacebookPostDrawer';

export interface FacebookDashboardProps {
  kpis: {
    totalPosts: number;
    analyzedPosts: number;
    totalEngagement: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    dominantSentiment: string;
    highRiskCount: number;
    avgEngagement: number;
    sentimentMap: Record<string, number>;
  };
  charts: {
    sentimentDistribution: Record<string, number>;
    reactionsBreakdown: Record<string, number>;
    topTopics: Array<{ name: string; count: number }>;
  };
  items: FacebookPostWithAnalysis[];
  alert: {
    postId: string;
    title: string;
    riskLevel: string;
    riskReason: string;
    recommendedAction: string;
    takenAt: string;
    postUrl: string;
  } | null;
  completeness: string;
}

const nf = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

function formatMetric(val: number | null | undefined) {
  if (val === null || val === undefined) return '—';
  return nf.format(val);
}

const sentimentColors: Record<string, { bg: string; text: string; border: string }> = {
  positivo: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  neutro: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  misto: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  negativo: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
};

export default function FacebookDashboard({
  kpis,
  charts,
  items,
  alert,
  completeness,
}: FacebookDashboardProps) {
  const [selectedItem, setSelectedItem] = useState<FacebookPostWithAnalysis | null>(null);

  const hasItems = items.length > 0;

  return (
    <div className="space-y-6">
      {/* High-Risk Critical Alert Banner */}
      {alert && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
              <ShieldAlert size={16} className="text-rose-400" />
              <span>Alerta de Risco Reputacional no Facebook</span>
            </div>
            <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase text-rose-300 border border-rose-500/30">
              {alert.riskLevel}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-white leading-snug">{alert.title}</p>
            <p className="text-xs text-rose-200/80">{alert.riskReason}</p>
          </div>

          {alert.recommendedAction && (
            <div className="rounded-lg bg-rose-900/30 p-3 border border-rose-500/20 text-xs text-rose-100">
              <span className="font-bold text-amber-300">Recomendação: </span>
              {alert.recommendedAction}
            </div>
          )}
        </div>
      )}

      {/* Executive KPIs Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Publicações</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-white">{formatMetric(kpis.totalPosts)}</span>
            <span className="text-[10px] font-medium text-slate-400">{kpis.analyzedPosts} analisadas</span>
          </div>
        </div>

        <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engajamento Total</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-cyan-400">{formatMetric(kpis.totalEngagement)}</span>
            <span className="text-[10px] font-medium text-slate-400">Média {formatMetric(kpis.avgEngagement)}/post</span>
          </div>
        </div>

        <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reações</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-400">{formatMetric(kpis.totalLikes)}</span>
            <ThumbsUp size={14} className="text-blue-400" />
          </div>
        </div>

        <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comentários</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-400">{formatMetric(kpis.totalComments)}</span>
            <MessageSquare size={14} className="text-purple-400" />
          </div>
        </div>

        <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compartilhamentos</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-400">{formatMetric(kpis.totalShares)}</span>
            <Share2 size={14} className="text-emerald-400" />
          </div>
        </div>

        <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sentimento</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black capitalize text-white">{kpis.dominantSentiment}</span>
            {kpis.highRiskCount > 0 && (
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">
                {kpis.highRiskCount} risco
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Cards Row: Sentiment Distribution & Top Topics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sentiment Distribution */}
        <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Distribuição de Sentimento</h3>
            <span className="text-xs text-slate-400">{kpis.analyzedPosts} análises</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(charts.sentimentDistribution).map(([sent, count]) => {
              const style = sentimentColors[sent] ?? sentimentColors.neutro;
              const pct = kpis.analyzedPosts > 0 ? Math.round((count / kpis.analyzedPosts) * 100) : 0;

              return (
                <div key={sent} className={`rounded-xl border p-3 ${style.bg} ${style.border}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 capitalize">{sent}</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className={`text-lg font-black ${style.text}`}>{count}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Topics */}
        <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Temas Dominantes</h3>
            <span className="text-xs text-slate-400">{charts.topTopics.length} identificados</span>
          </div>

          {charts.topTopics.length > 0 ? (
            <div className="space-y-2">
              {charts.topTopics.map((topic) => (
                <div key={topic.name} className="flex items-center justify-between rounded-lg bg-[#0F131C] p-2.5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Tag size={12} className="text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200">{topic.name}</span>
                  </div>
                  <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                    {topic.count} {topic.count === 1 ? 'post' : 'posts'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              Nenhum tema mapeado ainda.
            </div>
          )}
        </div>
      </div>

      {/* Posts Feed Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-tight">Publicações Coletadas ({items.length})</h3>
          <span className="text-xs text-slate-400">Clique em um post para abrir a análise detalhada</span>
        </div>

        {hasItems ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const { post, analysis } = item;
              const sentiment = (analysis?.sentiment ?? 'neutro').toLowerCase();
              const sentimentStyle = sentimentColors[sentiment] ?? sentimentColors.neutro;
              const risk = (analysis?.risk_level ?? 'baixo').toLowerCase();
              const isHighRisk = risk.includes('alto') || risk.includes('crít');

              return (
                <div
                  key={post.id}
                  onClick={() => setSelectedItem(item)}
                  className="surface-primary cursor-pointer rounded-xl border border-[#2D3748] bg-[#161B26] p-4 shadow-sm hover:border-cyan-500/50 hover:bg-[#1A202C] transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Date + Badges */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">
                        {post.taken_at
                          ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(post.taken_at))
                          : '—'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold capitalize ${sentimentStyle.bg} ${sentimentStyle.border} ${sentimentStyle.text}`}>
                          {analysis?.sentiment || 'Sem análise'}
                        </span>
                        {isHighRisk && (
                          <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-300">
                            Risco Alto
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Media Image Thumbnail if present */}
                    {(post.media_url || post.thumbnail_url) && (
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        <img
                          src={post.media_url || post.thumbnail_url || ''}
                          alt={post.caption ? post.caption.slice(0, 40) : 'Mídia da publicação no Facebook'}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).parentElement?.classList.add('hidden');
                          }}
                        />
                      </div>
                    )}

                    {/* Caption */}
                    <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                      {post.caption || 'Sem legenda'}
                    </p>

                    {/* AI Topic Pill */}
                    {analysis?.ai_topic && analysis.ai_topic !== 'Sem análise' && (
                      <div className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-0.5">
                        <Tag size={10} />
                        <span className="truncate max-w-[200px]">{analysis.ai_topic}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer: Metrics */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <ThumbsUp size={12} className="text-blue-400" />
                        <span>{formatMetric(post.like_count)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare size={12} className="text-purple-400" />
                        <span>{formatMetric(post.comment_count)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 size={12} className="text-emerald-400" />
                        <span>{formatMetric(post.share_count)}</span>
                      </div>
                    </div>

                    <ChevronRight size={14} className="text-slate-500" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <MessageSquare size={20} />
            </div>
            <h4 className="text-sm font-bold text-white">Nenhuma publicação encontrada</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Não foram encontradas publicações no Facebook para os filtros ou período selecionados.
            </p>
          </div>
        )}
      </div>

      {/* Post Detail Drawer Modal */}
      <FacebookPostDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
