'use client';

import { ExternalLink, ThumbsUp, MessageSquare, Share2, ShieldAlert, Sparkles, Tag, AlertCircle } from 'lucide-react';
import type { FacebookPostWithAnalysis } from '@/lib/queries/facebook';
import Drawer from '@/components/ui/Drawer';

interface FacebookPostDrawerProps {
  item: FacebookPostWithAnalysis | null;
  onClose: () => void;
}

const sentimentBadges: Record<string, { bg: string; border: string; text: string }> = {
  positivo: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  neutro: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  misto: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  negativo: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
};

export default function FacebookPostDrawer({ item, onClose }: FacebookPostDrawerProps) {
  if (!item) return null;

  const { post, analysis, audience } = item;
  const commentsPublic = post.comment_count ?? 0;
  const commentsCollected = post.comments_collected ?? 0;
  const sentiment = (analysis?.sentiment ?? 'neutro').toLowerCase();
  const sentimentStyle = sentimentBadges[sentiment] ?? sentimentBadges.neutro;

  const risk = (analysis?.risk_level ?? 'baixo').toLowerCase();
  const isHighRisk = risk.includes('alto') || risk.includes('crít');

  // Breakdown of reactions if available
  const reactionsBreakdown = post.raw_json?.reactions_breakdown as Record<string, number> | undefined;

  const titleText = 'Detalhamento da Publicação Facebook';
  const subtitleText = post.taken_at
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(post.taken_at))
    : 'Data não informada';

  const badge = (
    <span className="rounded-md bg-blue-600/20 px-2 py-0.5 text-blue-400 border border-blue-500/30 font-bold text-xs uppercase tracking-wider">
      Facebook
    </span>
  );

  return (
    <Drawer
      open={Boolean(item)}
      onClose={onClose}
      title={titleText}
      subtitle={subtitleText}
      badge={badge}
    >
      <div className="space-y-6">
        {/* Post Caption & External Link */}
        <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/5 pb-2">
            <span className="font-semibold text-slate-300">Publicação no Facebook</span>
            {post.post_url && (
              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:underline font-medium"
              >
                Ver no Facebook
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Post Media Image/Thumbnail */}
          {(post.media_url || post.thumbnail_url) && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/60">
              <img
                src={post.media_url || post.thumbnail_url || ''}
                alt="Mídia da publicação no Facebook"
                className="h-full w-full object-contain"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).parentElement?.classList.add('hidden');
                }}
              />
            </div>
          )}

          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
            {post.caption || 'Sem legenda disponível.'}
          </p>

          {/* Engagement Metrics */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/5 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ThumbsUp size={14} className="text-blue-400" />
              <span className="font-bold text-white">{post.like_count ?? 0}</span> reações
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare size={14} className="text-cyan-400" />
              <span className="font-bold text-white">{post.comment_count ?? 0}</span> comentários
            </div>
            <div className="flex items-center gap-1.5">
              <Share2 size={14} className="text-purple-400" />
              <span className="font-bold text-white">{post.share_count ?? 0}</span> compartilhamentos
            </div>
          </div>

          {/* Reactions Breakdown Pills */}
          {reactionsBreakdown && Object.keys(reactionsBreakdown).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {Object.entries(reactionsBreakdown).map(([r, count]) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-slate-300"
                >
                  <span>{r}</span>
                  <span className="font-bold text-white">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* AI Intelligence Analysis Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Análise de Inteligência (Gemini)</span>
          </div>

          {analysis ? (
            <div className="space-y-4">
              {/* Badges Bar */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className={`rounded-xl border p-3 ${sentimentStyle.bg} ${sentimentStyle.border}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sentimento</span>
                  <p className={`text-sm font-extrabold capitalize ${sentimentStyle.text}`}>
                    {analysis.sentiment || '—'}
                  </p>
                </div>

                <div
                  className={`rounded-xl border p-3 ${
                    isHighRisk
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risco Reputacional</span>
                  <p className="text-sm font-extrabold capitalize">
                    {analysis.risk_level || 'Baixo'}
                  </p>
                </div>

                <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-3 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confiança</span>
                  <p className="text-sm font-extrabold text-white">
                    {analysis.confidence_score !== undefined && analysis.confidence_score !== null
                      ? `${Math.round(analysis.confidence_score * 100)}%`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* AI Summary */}
              {analysis.summary && (
                <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-4 space-y-1">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Resumo Executivo</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{analysis.summary}</p>
                </div>
              )}

              {/* AI Topic & Keywords */}
              <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-4 space-y-3">
                {analysis.ai_topic && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tema Dominante</span>
                    <p className="text-xs font-bold text-cyan-300 mt-0.5">{analysis.ai_topic}</p>
                  </div>
                )}

                {analysis.ai_keywords && analysis.ai_keywords.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Palavras-Chave</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {analysis.ai_keywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300"
                        >
                          <Tag size={10} className="text-slate-500" />
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Risk Reason if High Risk */}
              {isHighRisk && analysis.risk_reason && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                    <ShieldAlert size={14} />
                    <span>Motivo do Risco</span>
                  </div>
                  <p className="text-xs text-rose-200 leading-relaxed">{analysis.risk_reason}</p>
                </div>
              )}

              {/* Strategic Reading & Recommended Action */}
              {analysis.strategic_reading && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Leitura Estratégica</h4>
                  <p className="text-xs text-cyan-100/90 leading-relaxed">{analysis.strategic_reading}</p>
                </div>
              )}

              {analysis.recommended_action && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Recomendação de Ação</h4>
                  <p className="text-xs text-amber-100/90 leading-relaxed">{analysis.recommended_action}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-6 text-center text-slate-400">
              <AlertCircle size={24} className="mx-auto text-slate-500 mb-2" />
              <p className="text-xs font-medium">Análise de IA pendente ou indisponível para este conteúdo.</p>
            </div>
          )}
        </div>

        {/* Comments Coverage Transparency — nunca insinuar que 100% dos comentários públicos foram analisados */}
        {commentsPublic > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <MessageSquare size={14} />
              <span>Cobertura de Comentários</span>
            </div>
            <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Públicos</p>
                  <p className="text-sm font-extrabold text-white">{commentsPublic.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Coletados</p>
                  <p className="text-sm font-extrabold text-white">{commentsCollected.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Analisados</p>
                  <p className="text-sm font-extrabold text-white">{(audience?.commentsAnalyzed ?? 0).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              {audience?.audienceSentiment && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sentimento da Audiência (comentários reais)</span>
                  <p className="text-xs font-bold text-slate-200 capitalize">{audience.audienceSentiment.toLowerCase()}</p>
                  {audience.messageAudienceDivergence && (
                    <p className="text-xs text-slate-400 leading-relaxed">{audience.messageAudienceDivergence}</p>
                  )}
                </div>
              )}
              {commentsCollected > 0 && (
                <p className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
                  A análise utiliza uma amostra dos comentários coletados; os totais público, coletado e analisado podem ser diferentes.
                </p>
              )}
              {commentsCollected === 0 && (
                <p className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">Comentários individuais ainda não foram coletados para este post.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
