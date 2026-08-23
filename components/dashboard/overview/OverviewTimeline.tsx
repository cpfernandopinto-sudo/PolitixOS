'use client';

import { useEffect, useMemo, useState } from 'react';
import { Newspaper, ExternalLink, History, ChevronRight } from 'lucide-react';
import type { TimelineEvent } from '@/lib/queries/overview';
import { groupTimelineEvents } from '@/lib/analytics/timeline-grouping';

interface Props {
  events: TimelineEvent[];
}

const INITIAL_VISIBLE = 15;
const STEP = 15;
const MODE_STORAGE_KEY = 'politixos_timeline_mode';

type Mode = 'cronologica' | 'agrupada';

function resolveMode(stored: string | null): Mode {
  return stored === 'cronologica' || stored === 'agrupada' ? stored : 'cronologica';
}

function XChannelIcon({ size = 14 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded border border-current/35 font-black leading-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.78), lineHeight: 1 }}
      aria-hidden="true"
    >
      X
    </span>
  );
}

function InstagramChannelIcon({ size = 14 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded border-2 border-current"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="rounded-full border-2 border-current" style={{ width: Math.round(size * 0.42), height: Math.round(size * 0.42) }} />
    </span>
  );
}

function FacebookChannelIcon({ size = 14 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-current font-black leading-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.7), lineHeight: 1 }}
      aria-hidden="true"
    >
      f
    </span>
  );
}

const CHANNEL_ICON: Record<TimelineEvent['canal'], React.ReactNode> = {
  Notícias: <Newspaper size={14} className="text-blue-400" />,
  Instagram: <InstagramChannelIcon size={14} />,
  X: <XChannelIcon size={14} />,
  Facebook: <FacebookChannelIcon size={14} />,
};

const SEVERITY_LABEL: Record<TimelineEvent['severidade'], string> = { alta: 'Alta', media: 'Média' };

function EventRow({ event }: { event: TimelineEvent }) {
  return (
    <li className="flex items-start gap-3 border-l-2 border-white/[0.08] pl-4 py-1.5 relative hover:bg-white/[0.02] rounded-r transition-colors">
      <span className={`absolute -left-[5px] top-3 w-2 h-2 rounded-full ${event.severidade === 'alta' ? 'bg-red-500' : 'bg-yellow-500'}`} />
      <div className="flex items-center gap-2 shrink-0 pt-0.5">{CHANNEL_ICON[event.canal]}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-200 truncate">{event.titulo}</p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="text-[10px] text-slate-500">
            {new Date(event.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${event.severidade === 'alta' ? 'text-red-400' : 'text-yellow-500'}`}>
            {SEVERITY_LABEL[event.severidade]}
          </span>
          {event.entidade && <span className="text-[10px] text-slate-600">· {event.entidade}</span>}
          {event.tema && <span className="text-[10px] text-slate-600">· {event.tema}</span>}
        </div>
      </div>
      {event.url && (
        <a href={event.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-500 hover:text-cyan-400 transition-colors" aria-label="Abrir evidência original">
          <ExternalLink size={13} />
        </a>
      )}
    </li>
  );
}

/**
 * Timeline consolidada da Visão Geral — modo cronológico (já existente) e
 * modo agrupado por tema (Sprint 3, via groupTimelineEvents, determinístico
 * e sem IA generativa). Alternar entre modos é 100% client-side sobre os
 * mesmos `events` recebidos por prop — nenhuma nova consulta.
 */
export default function OverviewTimeline({ events }: Props) {
  const [filter, setFilter] = useState<'todos' | TimelineEvent['canal']>('todos');
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const [mode, setMode] = useState<Mode>('cronologica');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Lê a preferência salva só após montar (localStorage não existe no
    // render do servidor) — evita mismatch de hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(resolveMode(localStorage.getItem(MODE_STORAGE_KEY)));
  }, []);

  const handleModeChange = (next: Mode) => {
    setMode(next);
    localStorage.setItem(MODE_STORAGE_KEY, next);
  };

  const filtered = useMemo(
    () => (filter === 'todos' ? events : events.filter((e) => e.canal === filter)),
    [events, filter]
  );

  const groups = useMemo(() => groupTimelineEvents(filtered), [filtered]);

  const channels: Array<'todos' | TimelineEvent['canal']> = ['todos', 'Notícias', 'Instagram', 'X', 'Facebook'];

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="surface-primary p-5 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
          <History size={16} className="text-cyan-400" />
          Timeline Consolidada
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center bg-white/[0.02] border border-white/[0.08] rounded p-1 gap-1">
            <button
              type="button"
              onClick={() => handleModeChange('cronologica')}
              aria-pressed={mode === 'cronologica'}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${mode === 'cronologica' ? 'bg-cyan-400/15 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Cronológica
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('agrupada')}
              aria-pressed={mode === 'agrupada'}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${mode === 'agrupada' ? 'bg-cyan-400/15 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Agrupada por tema
            </button>
          </div>
          <div className="flex items-center gap-1">
            {channels.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setFilter(c); setVisible(INITIAL_VISIBLE); }}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  filter === c ? 'bg-cyan-400/15 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {c === 'todos' ? 'Todos' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-slate-500 text-sm italic">
          Nenhum evento notável no período e filtros selecionados.
        </div>
      ) : mode === 'cronologica' ? (
        <>
          <ol className="space-y-3">
            {filtered.slice(0, visible).map((event) => <EventRow key={`${event.canal}:${event.id}`} event={event} />)}
          </ol>
          {visible < filtered.length && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + STEP)}
              className="mt-4 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
            >
              Ver mais ({filtered.length - visible} restantes)
            </button>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {groups.slice(0, visible).map((group) => {
            const isExpanded = expandedGroups.has(group.chave);
            const canais = Array.from(new Set(group.eventos.map((e) => e.canal)));
            return (
              <div
                key={group.chave}
                className={`border border-white/[0.08] border-l-2 rounded overflow-hidden ${
                  group.severidadeMax === 'alta' ? 'border-l-red-500' : 'border-l-yellow-500'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.chave)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight size={14} className={`text-slate-500 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${group.severidadeMax === 'alta' ? 'text-red-400' : 'text-yellow-500'}`}>
                      {SEVERITY_LABEL[group.severidadeMax]}
                    </span>
                    <span className="text-sm text-white font-medium truncate">{group.tema}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-500">
                    <div className="hidden sm:flex items-center gap-1">{canais.map((c) => <span key={c}>{CHANNEL_ICON[c]}</span>)}</div>
                    {group.entidadesAssociadas.length > 0 && (
                      <span className="hidden md:inline truncate max-w-[160px]">
                        {group.entidadesAssociadas.slice(0, 2).join(', ')}
                        {group.entidadesAssociadas.length > 2 ? ` +${group.entidadesAssociadas.length - 2}` : ''}
                      </span>
                    )}
                    {group.sentimentoPredominante && <span>Sentimento: {group.sentimentoPredominante}</span>}
                    <span className="bg-white/[0.04] px-1.5 py-0.5 rounded font-bold text-slate-300">{group.quantidade} evento{group.quantidade > 1 ? 's' : ''}</span>
                  </div>
                </button>
                {isExpanded && (
                  <ol className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.08]">
                    {group.eventos.map((event) => <EventRow key={`${event.canal}:${event.id}`} event={event} />)}
                  </ol>
                )}
              </div>
            );
          })}
          {visible < groups.length && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + STEP)}
              className="mt-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
            >
              Ver mais ({groups.length - visible} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
