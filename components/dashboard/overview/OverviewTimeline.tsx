'use client';

import { useMemo, useState } from 'react';
import { Newspaper, ExternalLink, History } from 'lucide-react';
import type { TimelineEvent } from '@/lib/queries/overview';

interface Props {
  events: TimelineEvent[];
}

const INITIAL_VISIBLE = 15;
const STEP = 15;

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

const CHANNEL_ICON: Record<TimelineEvent['canal'], React.ReactNode> = {
  Notícias: <Newspaper size={14} className="text-blue-400" />,
  Instagram: <InstagramChannelIcon size={14} />,
  X: <XChannelIcon size={14} />,
};

export default function OverviewTimeline({ events }: Props) {
  const [filter, setFilter] = useState<'todos' | TimelineEvent['canal']>('todos');
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const filtered = useMemo(
    () => (filter === 'todos' ? events : events.filter((e) => e.canal === filter)),
    [events, filter]
  );

  const channels: Array<'todos' | TimelineEvent['canal']> = ['todos', 'Notícias', 'Instagram', 'X'];

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h3 className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
          <History size={18} className="text-cyan-400" />
          Timeline Consolidada
        </h3>
        <div className="flex items-center gap-1.5">
          {channels.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setFilter(c); setVisible(INITIAL_VISIBLE); }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                filter === c ? 'bg-cyan-500/15 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {c === 'todos' ? 'Todos' : c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm italic">
          Nenhum evento notável no período e filtros selecionados.
        </div>
      ) : (
        <>
          <ol className="space-y-3">
            {filtered.slice(0, visible).map((event) => (
              <li key={`${event.canal}:${event.id}`} className="flex items-start gap-3 border-l-2 border-white/5 pl-4 relative">
                <span
                  className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${
                    event.severidade === 'alta' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                />
                <div className="flex items-center gap-2 shrink-0 pt-0.5">{CHANNEL_ICON[event.canal]}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-200 truncate">{event.titulo}</p>
                  <span className="text-[10px] text-gray-500">
                    {new Date(event.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-gray-500 hover:text-cyan-400 transition-colors"
                    aria-label="Abrir evidência original"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </li>
            ))}
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
      )}
    </div>
  );
}
