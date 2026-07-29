'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  ExternalLink,
  Newspaper,
  ShieldAlert,
  Sparkles,
  Tag,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import type { MencaoRow, Noticia } from '@/lib/types/noticias';
import BadgeStatus from '@/components/ui/BadgeStatus';

interface Props {
  selection: { news: Noticia; raw?: MencaoRow } | null;
  onClose: () => void;
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'string' ? item : JSON.stringify(item))
      .filter(Boolean);
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return stringList(parsed);
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

export default function NewsDetailModal({ selection, onClose }: Props) {
  const news = selection?.news ?? null;
  const raw = selection?.raw;

  useEffect(() => {
    if (!news) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [news, onClose]);

  if (!news || typeof document === 'undefined') return null;

  const strategicSummary =
    raw?.summary && raw.summary !== raw.title
      ? raw.summary
      : null;
  const recommendedAction =
    raw?.ai_takeaways && raw.ai_takeaways !== raw.title
      ? raw.ai_takeaways
      : null;
  const topics = stringList(raw?.ai_topics);
  const riskFlags = stringList(raw?.ai_risk_flags);
  const relevance = raw?.local_relevance ?? news.relevancia * 10;
  const hasAnalysis = Boolean(
    strategicSummary ||
    recommendedAction ||
    topics.length ||
    riskFlags.length ||
    (raw && raw.ai_sentiment !== null),
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-[#03060c]/85 px-4 pb-6 pt-[88px] backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-detail-title"
        className="flex max-h-[calc(100dvh-112px)] w-full max-w-3xl flex-col overflow-y-auto rounded-2xl border border-white/10 bg-[#0e1727] shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/[0.07] bg-[#0e1727]/95 p-5 backdrop-blur-xl md:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-2.5 text-blue-300">
              <Newspaper size={20} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
                Inteligência de notícia
              </p>
              <h2 id="news-detail-title" className="text-lg font-bold leading-snug text-white md:text-xl">
                {news.titulo}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes da notícia"
            className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X size={19} />
          </button>
        </header>

        <div className="space-y-6 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeStatus type="sentimento" value={news.sentimento} />
            <BadgeStatus type="risco" value={news.risco} />
            <BadgeStatus type="crise" value={news.crise} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              <CalendarDays size={13} />
              {news.data}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              {news.fonte}
            </span>
            {raw?.candidate_name && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                <UserRound size={13} />
                {raw.candidate_name}
              </span>
            )}
            {raw?.city && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                {raw.city}
              </span>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <Sparkles size={13} className="text-cyan-400" />
              Síntese estratégica
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-4 text-sm leading-7 text-slate-200 md:p-5">
              {strategicSummary || (
                <span className="text-slate-400">
                  Esta notícia ainda não possui resumo editorial disponível.
                </span>
              )}
            </div>
          </div>

          {recommendedAction && (
            <div className="relative overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-400/[0.12] via-blue-500/[0.08] to-transparent p-5 shadow-[0_16px_45px_rgba(6,182,212,0.08)] md:p-6">
              <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="relative">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  <span className="rounded-lg bg-cyan-300/10 p-2">
                    <Zap size={15} />
                  </span>
                  Ação sugerida pela IA
                </div>
                <p className="text-base font-semibold leading-7 text-white md:text-lg">
                  {recommendedAction}
                </p>
              </div>
            </div>
          )}

          {(topics.length > 0 || riskFlags.length > 0) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {topics.length > 0 && (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    <Tag size={13} className="text-cyan-400" />
                    Temas identificados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <span key={topic} className="rounded-lg bg-cyan-400/[0.08] px-2.5 py-1 text-xs text-cyan-200">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {riskFlags.length > 0 && (
                <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.04] p-4">
                  <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-300">
                    <ShieldAlert size={13} />
                    Sinais reais de risco
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {riskFlags.map((flag) => (
                      <span key={flag} className="rounded-lg bg-rose-400/10 px-2.5 py-1 text-xs text-rose-200">
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Relevância</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/30">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    style={{ width: `${Math.min(100, relevance)}%` }}
                  />
                </div>
                <strong className="text-lg text-white">{(relevance / 10).toFixed(1)}</strong>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Leitura operacional</p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldAlert size={16} className={news.crise ? 'text-rose-400' : 'text-emerald-400'} />
                {!hasAnalysis
                  ? 'Aguardando análise'
                  : riskFlags.length > 0 || news.crise
                    ? 'Requer avaliação prioritária'
                    : 'Monitoramento regular'}
              </p>
            </div>
          </div>
        </div>

        <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-white/[0.07] bg-[#0e1727]/95 p-4 backdrop-blur-xl sm:flex-row sm:justify-end md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 hover:bg-white/5 hover:text-white"
          >
            Fechar
          </button>
          <a
            href={news.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-blue-400"
          >
            Abrir fonte original
            <ExternalLink size={14} />
          </a>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
