'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert, ExternalLink, Clock, ChevronLeft, ChevronDown, ChevronUp,
  Loader2, AlertTriangle, Users, Globe, Calendar, FileText, Search, BookOpen,
  Target, Zap
} from 'lucide-react';
import clsx from 'clsx';
import type {
  Investigation, InvestigationSource, InvestigationEntity,
  InvestigationTimeline, InvestigationQuery
} from '@/lib/types/investigations';
import { createClient } from '@/lib/supabaseClient';

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-500/15 text-green-400 border-green-500/25',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  critical: 'bg-red-500/15 text-red-400 border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
};
const RISK_LABELS: Record<string, string> = {
  low: 'Risco Baixo', medium: 'Risco Médio', high: 'Risco Alto', critical: 'Risco Crítico',
};
const STATUS_COLORS: Record<string, string> = {
  running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
};
const STATUS_LABELS: Record<string, string> = {
  running: 'Processando',
  completed: 'Concluído',
  error: 'Erro técnico',
};
const IMPACT_COLORS: Record<string, string> = {
  low: 'text-green-400', medium: 'text-yellow-400', high: 'text-orange-400', critical: 'text-red-400',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function formatDateShort(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

function getFullReportErrorMessage(report: unknown): string | null {
  if (!report) return null;

  let value = report;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return String(report);
    }
  }

  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const error = record.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return null;
}

function Section({
  title, icon, children, collapsible = false, defaultOpen = true,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  collapsible?: boolean; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass rounded-xl border border-white/5 overflow-hidden">
      <button
        className={clsx(
          'w-full flex items-center justify-between p-5 border-b border-white/5',
          collapsible ? 'cursor-pointer hover:bg-white/[0.02] transition-colors' : 'cursor-default'
        )}
        onClick={() => collapsible && setOpen(o => !o)}
        disabled={!collapsible}
      >
        <div className="flex items-center gap-3">
          <div className="text-purple-400">{icon}</div>
          <h2 className="text-white font-semibold text-base">{title}</h2>
        </div>
        {collapsible && (
          open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />
        )}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

interface Props {
  investigation: Investigation;
  sources: InvestigationSource[];
  entities: InvestigationEntity[];
  timeline: InvestigationTimeline[];
  queries: InvestigationQuery[];
}

export default function DossierClient({ investigation: initial, sources, entities, timeline, queries }: Props) {
  const router = useRouter();
  const [inv, setInv] = useState(initial);
  const [polling, setPolling] = useState(initial.status === 'running');
  const technicalError = inv.status === 'error' ? getFullReportErrorMessage(inv.full_report) : null;

  const poll = useCallback(async () => {
    const client = createClient();
    const { data } = await client
      .from('investigations')
      .select('*')
      .eq('id', inv.id)
      .single();

    if (data) {
      setInv(data as Investigation);
      if (data.status !== 'running') {
        setPolling(false);
        router.refresh();
      }
    }
  }, [inv.id, router]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [polling, poll]);

  useEffect(() => {
    setInv(initial);
    setPolling(initial.status === 'running');
  }, [initial]);

  if (polling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <Loader2 size={48} className="text-purple-400 animate-spin" />
        </div>
        <div className="text-center">
          <h2 className="text-white font-bold text-xl mb-2">Dossiê em Processamento</h2>
          <p className="text-gray-400 text-sm">
            A IA está analisando fontes e gerando o relatório estratégico.
          </p>
          <p className="text-gray-500 text-xs mt-2">Atualizando automaticamente a cada 5 segundos...</p>
        </div>
        <div className="glass rounded-xl border border-white/5 p-5 max-w-md w-full">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Notícia investigada</p>
          <p className="text-white text-sm font-medium line-clamp-3">{inv.original_title}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {inv.status === 'error' && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-200 font-semibold text-sm">A investigação registrou erro técnico</p>
            <p className="text-red-100/80 text-xs mt-1 leading-relaxed">
              {technicalError ?? 'O workflow marcou este dossiê como erro, mas os dados disponíveis continuam abaixo para análise.'}
            </p>
          </div>
        </div>
      )}

      {/* Header do Dossiê */}
      <div className="glass rounded-2xl border border-purple-500/15 p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {inv.risk_level && (
                <span className={clsx(
                  'text-xs font-black px-3 py-1 rounded-full border uppercase tracking-wider',
                  RISK_COLORS[inv.risk_level] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/25'
                )}>
                  {RISK_LABELS[inv.risk_level] ?? inv.risk_level}
                </span>
              )}
              {inv.crisis_potential && (
                <span className="text-xs font-bold px-3 py-1 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20 uppercase tracking-wider">
                  Crise: {inv.crisis_potential}
                </span>
              )}
              <span className={clsx(
                'text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider',
                STATUS_COLORS[inv.status] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
              )}>
                {STATUS_LABELS[inv.status] ?? inv.status}
              </span>
            </div>

            <h1 className="text-xl font-bold text-white leading-snug mb-3">
              {inv.original_title ?? '(sem título)'}
            </h1>

            <div className="flex items-center gap-6 text-sm text-gray-400 flex-wrap">
              {inv.candidate_name && (
                <span className="flex items-center gap-1.5">
                  <Target size={14} className="text-purple-400" />
                  <strong className="text-white">{inv.candidate_name}</strong>
                </span>
              )}
              {inv.source && (
                <span className="flex items-center gap-1.5">
                  <Globe size={14} className="text-gray-500" />
                  {inv.source}
                </span>
              )}
              {inv.investigation_topic && (
                <span className="text-gray-500">{inv.investigation_topic}</span>
              )}
              {inv.city && (
                <span className="text-gray-500">{inv.city}</span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-gray-500" />
                {formatDate(inv.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {inv.source_url && (
              <a
                href={inv.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
              >
                <ExternalLink size={13} />
                Fonte original
              </a>
            )}
            <Link
              href="/dashboard/investigacoes"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
            >
              <ChevronLeft size={13} />
              Voltar
            </Link>
          </div>
        </div>
      </div>

      {/* Resumo Executivo */}
      {inv.executive_summary && (
        <Section title="Resumo Executivo" icon={<FileText size={18} />}>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {inv.executive_summary}
          </p>
        </Section>
      )}

      {inv.original_summary && (
        <Section title="Resumo Original" icon={<FileText size={18} />} collapsible defaultOpen={false}>
          <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
            {inv.original_summary}
          </p>
        </Section>
      )}

      {/* Leitura Estratégica */}
      {inv.strategic_reading && (
        <Section title="Leitura Estratégica" icon={<BookOpen size={18} />}>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {inv.strategic_reading}
          </p>
        </Section>
      )}

      {/* Recomendações */}
      {inv.recommended_actions && (
        <Section title="Recomendações Estratégicas" icon={<Zap size={18} />}>
          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {inv.recommended_actions}
          </div>
        </Section>
      )}

      {/* Linha do Tempo */}
      {timeline.length > 0 && (
        <Section title={`Linha do Tempo (${timeline.length})`} icon={<Calendar size={18} />}>
          <div className="space-y-4">
            {timeline.map((event, i) => (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={clsx(
                    'w-3 h-3 rounded-full border-2 shrink-0 mt-0.5',
                    IMPACT_COLORS[event.impact_level ?? '']
                      ? 'border-current ' + IMPACT_COLORS[event.impact_level ?? '']
                      : 'border-gray-600 text-gray-600'
                  )} />
                  {i < timeline.length - 1 && (
                    <div className="w-px flex-1 bg-white/5 mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <span className="text-xs text-gray-500 font-medium">
                      {formatDate(event.event_datetime ?? event.event_date)}
                    </span>
                    {event.event_type && (
                      <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                        {event.event_type}
                      </span>
                    )}
                    {event.impact_level && (
                      <span className={clsx('text-[10px] font-bold uppercase tracking-wider', IMPACT_COLORS[event.impact_level])}>
                        Impacto: {event.impact_level}
                      </span>
                    )}
                  </div>
                  {event.event_title && (
                    <p className="text-white font-semibold text-sm mb-1">{event.event_title}</p>
                  )}
                  {event.event_description && (
                    <p className="text-gray-400 text-xs leading-relaxed">{event.event_description}</p>
                  )}
                  {event.source_url && (
                    <a
                      href={event.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#00FFFF] text-xs mt-1 hover:underline"
                    >
                      <ExternalLink size={10} />
                      Fonte
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Mapa de Atores */}
      {entities.length > 0 && (
        <Section title={`Mapa de Atores (${entities.length})`} icon={<Users size={18} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entities.map(entity => (
              <div key={entity.id} className="bg-white/[0.03] rounded-xl border border-white/5 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white font-semibold text-sm leading-tight">{entity.entity_name ?? '—'}</p>
                  {entity.entity_type && (
                    <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded uppercase font-bold shrink-0">
                      {entity.entity_type}
                    </span>
                  )}
                </div>
                {entity.entity_role && (
                  <p className="text-gray-400 text-xs">{entity.entity_role}</p>
                )}
                <div className="flex items-center gap-3 text-[11px]">
                  {entity.sentiment && (
                    <span className={clsx(
                      'font-bold',
                      entity.sentiment === 'positivo' ? 'text-green-400' :
                        entity.sentiment === 'negativo' ? 'text-red-400' : 'text-gray-400'
                    )}>
                      {entity.sentiment}
                    </span>
                  )}
                  {entity.relevance && (
                    <span className="text-gray-500">Relevância: {entity.relevance}</span>
                  )}
                </div>
                {entity.notes && (
                  <p className="text-gray-500 text-xs leading-relaxed">{entity.notes}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Fontes Consultadas */}
      {sources.length > 0 && (
        <Section title={`Fontes Consultadas (${sources.length})`} icon={<Globe size={18} />}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Título</th>
                  <th className="pb-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tipo</th>
                  <th className="pb-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Relevância</th>
                  <th className="pb-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Data</th>
                  <th className="pb-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {sources.map(src => (
                  <tr key={src.id}>
                    <td className="py-3 pr-4 max-w-xs">
                      <p className="text-white text-xs font-medium line-clamp-2">{src.source_title ?? '—'}</p>
                      {src.snippet && (
                        <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-2">{src.snippet}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {src.source_type && (
                        <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded uppercase font-bold">
                          {src.source_type}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {src.relevance_score != null && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${Math.min(100, src.relevance_score)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{src.relevance_score}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-xs text-gray-500">
                      {formatDateShort(src.fetched_at)}
                    </td>
                    <td className="py-3">
                      {src.source_url && (
                        <a
                          href={src.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center p-1.5 rounded text-gray-400 hover:text-[#00FFFF] transition-colors"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Queries Executadas */}
      {queries.length > 0 && (
        <Section title={`Queries Executadas (${queries.length})`} icon={<Search size={18} />} collapsible defaultOpen={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Query</th>
                  <th className="pb-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tipo</th>
                  <th className="pb-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Provider</th>
                  <th className="pb-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Status</th>
                  <th className="pb-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Uso</th>
                  <th className="pb-3 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {queries.map(q => (
                  <tr key={q.id}>
                    <td className="py-2 pr-4 max-w-sm">
                      <p className="text-gray-300 font-mono text-[11px] line-clamp-2">{q.query_text ?? '—'}</p>
                      {q.response_summary && (
                        <p className="text-gray-500 text-[11px] mt-1 line-clamp-2">{q.response_summary}</p>
                      )}
                      {q.error_message && (
                        <p className="text-red-300 text-[11px] mt-1 line-clamp-2">{q.error_message}</p>
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {q.query_type && (
                        <span className="bg-white/5 text-gray-400 px-2 py-0.5 rounded uppercase font-bold text-[10px]">
                          {q.query_type}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {q.query_provider && (
                        <span className="bg-white/5 text-gray-400 px-2 py-0.5 rounded uppercase font-bold text-[10px]">
                          {q.query_provider}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className={clsx(
                        'text-[10px] font-bold uppercase px-2 py-0.5 rounded',
                        q.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                          q.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                      )}>
                        {q.status ?? '—'}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                      {q.tokens_used != null || q.duration_ms != null ? (
                        <span>
                          {q.tokens_used != null ? `${q.tokens_used} tokens` : '—'}
                          {q.duration_ms != null ? ` · ${q.duration_ms}ms` : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2 text-gray-500 whitespace-nowrap">{formatDateShort(q.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Relatório Técnico Completo */}
      {inv.full_report != null && (
        <Section title="Relatório Técnico Completo" icon={<ShieldAlert size={18} />} collapsible defaultOpen={false}>
          <FullReportView report={inv.full_report} />
        </Section>
      )}
    </div>
  );
}

function FullReportView({ report }: { report: unknown }) {
  if (typeof report === 'string') {
    try {
      const parsed = JSON.parse(report);
      return <FullReportView report={parsed} />;
    } catch {
      return <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap break-words">{report}</pre>;
    }
  }

  if (Array.isArray(report)) {
    return (
      <div className="space-y-3">
        {report.map((item, i) => (
          <div key={i} className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
            <FullReportView report={item} />
          </div>
        ))}
      </div>
    );
  }

  if (report && typeof report === 'object') {
    const entries = Object.entries(report as Record<string, unknown>);
    return (
      <div className="space-y-4">
        {entries.map(([key, val]) => (
          <div key={key}>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
              {key.replace(/_/g, ' ')}
            </p>
            {typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' ? (
              <p className="text-gray-300 text-sm">{String(val)}</p>
            ) : (
              <div className="pl-3 border-l border-white/10">
                <FullReportView report={val} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-gray-400 text-sm">{String(report)}</p>;
}
