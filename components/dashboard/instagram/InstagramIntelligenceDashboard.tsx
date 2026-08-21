'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Heart, ImageOff, MessageCircle, Play, X } from 'lucide-react';
import DonutChart from '@/components/charts/DonutChart';
import type { InstagramMetric, InstagramUiContract, InstagramUiPost } from '@/lib/types/instagram-ui';

const nf = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const sentimentColors: Record<string, string> = { positivo: '#22c55e', neutro: '#64748b', negativo: '#f43f5e' };

function metric(metricValue: InstagramMetric) { return metricValue.availability === 'AVAILABLE' ? nf.format(metricValue.value ?? 0) : '—'; }
function label(value: string | null) { return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : 'Não analisado'; }
function riskTone(value: string | null) {
  const normalized = value?.toLowerCase() ?? '';
  return normalized.includes('alto') || normalized.includes('crít') ? 'border-rose-400/30 bg-rose-500/10 text-rose-300' : normalized.includes('médio') || normalized.includes('medio') ? 'border-amber-400/30 bg-amber-500/10 text-amber-300' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300';
}

export default function InstagramIntelligenceDashboard({ contract }: { contract: InstagramUiContract }) {
  const [selectedPost, setSelectedPost] = useState<InstagramUiPost | null>(null);
  const totalLikes = contract.performanceByType.reduce((sum, group) => sum + (group.likes.value ?? 0), 0);
  const totalPostComments = contract.performanceByType.reduce((sum, group) => sum + (group.comments.value ?? 0), 0);
  const dominantSentiment = contract.sentiment[0]?.label ?? null;
  const topFormat = [...contract.performanceByType].sort((a, b) => (b.likes.value ?? 0) - (a.likes.value ?? 0))[0]?.type ?? null;
  const criticalCount = contract.risk.filter(({ label: item }) => /alto|crít/i.test(item)).reduce((sum, item) => sum + item.count, 0);
  const criticalPct = contract.summary.posts ? Math.round((criticalCount / contract.summary.posts) * 100) : 0;

  if (contract.summary.posts === 0) return <EmptyState />;

  return (
    <div className="space-y-6 pb-12">
      {criticalCount > 0 ? <div role="alert" className="flex items-start gap-3 rounded-md border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"><AlertTriangle className="mt-0.5 shrink-0 text-rose-400" size={18} /><div><strong>{criticalCount} publicações com risco elevado</strong><p className="mt-1 text-xs text-rose-200/70">Priorize a leitura dos motivos e recomendações no detalhe das publicações.</p></div></div> : null}

      <section aria-label="Indicadores principais" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi title="Posts monitorados" value={nf.format(contract.summary.posts)} detail={`${contract.summary.analyzedPosts} analisados`} />
        <Kpi title="Interações do post" value={`${nf.format(totalLikes)} likes`} detail={`${nf.format(totalPostComments)} comentários declarados`} />
        <Kpi title="Risco elevado" value={`${criticalPct}%`} detail={`${criticalCount} publicações`} tone={criticalCount ? 'rose' : 'cyan'} />
        <Kpi title="Sentimento dominante" value={label(dominantSentiment)} detail="Entre posts analisados" />
        <Kpi title="Formato de destaque" value={topFormat ?? '—'} detail="Critério: likes" />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <Panel title="Performance por formato" subtitle="Métricas separadas; ausências não são convertidas em zero" className="xl:col-span-7"><Performance contract={contract} /></Panel>
        <Panel title="Pressão social e risco" subtitle="Distribuição observada no recorte atual" className="xl:col-span-5"><RiskPanel contract={contract} /></Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <Panel title="Feed executivo" subtitle="Clique em uma publicação para abrir a análise completa" className="xl:col-span-8">
          <div className="grid gap-4 sm:grid-cols-2">{contract.recentPosts.map((post) => <PostCard key={post.id} post={post} onOpen={() => setSelectedPost(post)} />)}</div>
        </Panel>
        <Panel title="Sinais relevantes em comentários" subtitle="Ordenação transparente por likes; sem inferência de risco" className="xl:col-span-4">
          <div className="space-y-3">{contract.comments.relevant.length ? contract.comments.relevant.slice(0, 8).map((comment) => <article key={comment.id} className="rounded-md border border-white/8 bg-white/[.025] p-3"><div className="flex items-center justify-between text-[11px] text-slate-500"><span>{comment.candidateName ?? 'Candidato não identificado'}</span><span>{metric(comment.likeCount)} likes</span></div><p className="mt-2 line-clamp-4 text-sm leading-5 text-slate-200">{comment.text || 'Comentário sem texto.'}</p>{comment.postCaption ? <p className="mt-2 line-clamp-2 border-l border-cyan-400/40 pl-2 text-[11px] text-slate-500">Post: {comment.postCaption}</p> : null}</article>) : <p className="py-10 text-center text-sm text-slate-500">Nenhum comentário com sinal objetivo de relevância.</p>}</div>
        </Panel>
      </section>

      {selectedPost ? <PostDrawer post={selectedPost} comments={contract.comments.recent.filter((comment) => comment.postId === selectedPost.id)} onClose={() => setSelectedPost(null)} /> : null}
    </div>
  );
}

function Kpi({ title, value, detail, tone = 'cyan' }: { title: string; value: string; detail: string; tone?: 'cyan' | 'rose' }) {
  return <article className="rounded-md border border-white/10 bg-[#0d1423] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">{title}</p><p className={`mt-3 text-xl font-semibold ${tone === 'rose' ? 'text-rose-300' : 'text-white'}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>;
}

function Panel({ title, subtitle, className = '', children }: { title: string; subtitle: string; className?: string; children: React.ReactNode }) {
  return <section className={`rounded-md border border-white/10 bg-[#0d1423] p-4 sm:p-5 ${className}`}><h2 className="text-sm font-semibold text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p><div className="mt-5">{children}</div></section>;
}

function Performance({ contract }: { contract: InstagramUiContract }) {
  const max = Math.max(1, ...contract.performanceByType.flatMap((group) => [group.likes.value ?? 0, group.comments.value ?? 0, group.plays.value ?? 0]));
  return <div className="space-y-5">{contract.performanceByType.map((group) => <div key={group.type}><div className="mb-2 flex items-center justify-between"><strong className="text-xs text-slate-200">{group.type}</strong><span className="text-[11px] text-slate-500">{group.posts} posts</span></div><MetricBar label="Likes" value={group.likes} max={max} color="bg-fuchsia-400" /><MetricBar label="Comentários" value={group.comments} max={max} color="bg-cyan-400" /><MetricBar label="Plays" value={group.plays} max={max} color="bg-violet-400" /></div>)}</div>;
}
function MetricBar({ label: barLabel, value, max, color }: { label: string; value: InstagramMetric; max: number; color: string }) {
  const width = value.availability === 'AVAILABLE' ? Math.max(2, ((value.value ?? 0) / max) * 100) : 0;
  return <div className="mb-1.5 grid grid-cols-[78px_1fr_52px] items-center gap-2 text-[11px]"><span className="text-slate-500">{barLabel}</span><div className="h-1.5 overflow-hidden rounded-full bg-white/5">{value.availability === 'AVAILABLE' ? <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} /> : null}</div><span className="text-right text-slate-300">{metric(value)}</span></div>;
}

function RiskPanel({ contract }: { contract: InstagramUiContract }) {
  const total = contract.risk.reduce((sum, item) => sum + item.count, 0);
  const score = total ? Math.round(contract.risk.reduce((sum, item) => sum + item.count * (/alto|crít/i.test(item.label) ? 100 : /médio|medio/i.test(item.label) ? 50 : 15), 0) / total) : null;
  const sentimentData = contract.sentiment.map((item) => ({ name: label(item.label), value: item.count, itemStyle: { color: sentimentColors[item.label.toLowerCase()] ?? '#22d3ee' } }));
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><div><p className="text-[10px] uppercase tracking-widest text-slate-500">Índice normalizado de risco</p><div className="mt-4 flex items-end gap-2"><strong className="text-4xl text-white">{score ?? '—'}</strong>{score !== null ? <span className="pb-1 text-xs text-slate-500">/ 100</span> : null}</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500" style={{ width: `${score ?? 0}%` }} /></div><div className="mt-4 space-y-2">{contract.risk.map((item) => <div key={item.label} className="flex justify-between text-xs"><span className={`rounded border px-2 py-0.5 ${riskTone(item.label)}`}>{label(item.label)}</span><span className="text-slate-400">{item.count}</span></div>)}</div></div><div><p className="text-[10px] uppercase tracking-widest text-slate-500">Sentimento</p>{sentimentData.length ? <DonutChart data={sentimentData} height={220} /> : <p className="py-20 text-center text-sm text-slate-500">Sem análise disponível</p>}</div></div>;
}

function PostCard({ post, onOpen }: { post: InstagramUiPost; onOpen: () => void }) {
  return <article className="group overflow-hidden rounded-md border border-white/10 bg-[#080d18]"><Media post={post} /><button type="button" onClick={onOpen} className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-400"><div className="p-4"><div className="flex items-center justify-between gap-3"><span className="rounded border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-cyan-300">{post.contentType}</span><span className={`rounded border px-2 py-0.5 text-[10px] ${riskTone(post.analysis.risk)}`}>{label(post.analysis.risk)}</span></div><p className="mt-3 line-clamp-3 min-h-15 text-sm leading-5 text-slate-200">{post.caption || 'Publicação sem legenda.'}</p><div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-slate-500"><span>{post.candidateName ?? 'Candidato não identificado'}</span><span className="flex gap-3"><i className="flex items-center gap-1 not-italic"><Heart size={13} />{metric(post.metrics.likes)}</i><i className="flex items-center gap-1 not-italic"><MessageCircle size={13} />{metric(post.metrics.comments)}</i></span></div></div></button></article>;
}

function Media({ post }: { post: InstagramUiPost }) {
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const children = post.carousel?.children ?? [];
  const child = children[index];
  const source = child?.videoUrl ?? child?.imageUrl ?? post.mediaUrl;
  if (!source || failed) return <div className="flex aspect-video items-center justify-center bg-slate-950 text-slate-600"><ImageOff size={28} /><span className="ml-2 text-xs">Mídia indisponível</span></div>;
  return <div className="relative aspect-video overflow-hidden bg-black">{post.contentType === 'REEL' || child?.videoUrl ? <video src={source} controls preload="metadata" onError={() => setFailed(true)} className="h-full w-full object-contain" /> : <Image src={source} alt="Mídia da publicação" fill unoptimized sizes="(max-width: 640px) 100vw, 50vw" onError={() => setFailed(true)} className="object-cover" />}{children.length > 1 ? <><button type="button" aria-label="Mídia anterior" onClick={(event) => { event.stopPropagation(); setIndex((current) => (current - 1 + children.length) % children.length); }} className="absolute left-2 top-1/2 rounded-full bg-black/70 p-1 text-white"><ChevronLeft size={18} /></button><button type="button" aria-label="Próxima mídia" onClick={(event) => { event.stopPropagation(); setIndex((current) => (current + 1) % children.length); }} className="absolute right-2 top-1/2 rounded-full bg-black/70 p-1 text-white"><ChevronRight size={18} /></button><span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] text-white">{index + 1}/{children.length}</span></> : null}{post.contentType === 'REEL' ? <Play className="pointer-events-none absolute left-3 top-3 text-white drop-shadow" size={18} /> : null}</div>;
}

function PostDrawer({ post, comments, onClose }: { post: InstagramUiPost; comments: InstagramUiContract['comments']['recent']; onClose: () => void }) {
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  return <div className="fixed inset-0 z-50 bg-black/65" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside role="dialog" aria-modal="true" aria-labelledby="instagram-post-title" className="ml-auto h-full w-full overflow-y-auto border-l border-white/10 bg-[#080d18] shadow-2xl sm:max-w-[768px]"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#080d18]/95 p-4 backdrop-blur"><div><p className="text-[10px] uppercase tracking-[.16em] text-cyan-400">Análise da publicação</p><h2 id="instagram-post-title" className="mt-1 text-sm font-semibold text-white">{post.candidateName ?? 'Instagram'}</h2></div><button type="button" aria-label="Fechar análise" onClick={onClose} className="rounded-md border border-white/10 p-2 text-slate-300 hover:text-white"><X size={18} /></button></header><div className="space-y-6 p-4 sm:p-6"><Media post={post} /><section><div className="flex flex-wrap gap-2"><span className="rounded border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-300">{post.contentType}</span><span className={`rounded border px-2 py-1 text-[10px] ${riskTone(post.analysis.risk)}`}>Risco {label(post.analysis.risk)}</span><span className="rounded border border-white/10 px-2 py-1 text-[10px] text-slate-400">Sentimento {label(post.analysis.sentiment)}</span></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-200">{post.caption || 'Publicação sem legenda.'}</p>{post.url ? <a href={post.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"><ExternalLink size={13} /> Abrir no Instagram</a> : null}</section><section className="grid grid-cols-3 gap-2"><Kpi title="Likes" value={metric(post.metrics.likes)} detail="Informado" /><Kpi title="Comentários" value={metric(post.metrics.comments)} detail="No post" /><Kpi title="Plays" value={metric(post.metrics.plays)} detail="Quando disponível" /></section><AnalysisBlock title="Resumo de IA" text={post.analysis.summary} /><AnalysisBlock title="Motivo do risco" text={post.analysis.riskReason} /><AnalysisBlock title="Ação recomendada" text={post.analysis.recommendedAction} />{post.analysis.themes.length ? <section><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Temas</h3><div className="mt-2 flex flex-wrap gap-2">{post.analysis.themes.map((theme) => <span key={theme} className="rounded bg-white/5 px-2 py-1 text-xs text-slate-300">{theme}</span>)}</div></section> : null}<section><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Comentários coletados</h3><div className="mt-3 space-y-2">{comments.length ? comments.map((comment) => <article key={comment.id} className="rounded-md border border-white/8 p-3"><div className="flex justify-between text-[11px] text-slate-500"><span>@{comment.author ?? 'usuário'}</span><span>{metric(comment.likeCount)} likes</span></div><p className="mt-2 text-sm text-slate-200">{comment.text || 'Comentário sem texto.'}</p></article>) : <p className="text-sm text-slate-500">Nenhum comentário disponível neste recorte.</p>}</div></section></div></aside></div>;
}

function AnalysisBlock({ title, text }: { title: string; text: string | null }) { return <section><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3><p className="mt-2 rounded-md border border-white/8 bg-white/[.025] p-3 text-sm leading-6 text-slate-300">{text ?? '—'}</p></section>; }
function EmptyState() { return <div className="rounded-md border border-dashed border-white/15 bg-[#0d1423] px-6 py-20 text-center"><ImageOff className="mx-auto text-slate-600" size={34} /><h2 className="mt-4 text-base font-semibold text-white">Nenhuma publicação encontrada</h2><p className="mt-2 text-sm text-slate-500">Ajuste ou limpe os filtros para ampliar o recorte.</p></div>; }
