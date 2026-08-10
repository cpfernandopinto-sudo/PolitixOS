'use client';

import { Newspaper } from 'lucide-react';

interface ChannelData {
  noticias: { sentimento_medio: number; risco_medio: number; volume: number };
  instagram: { sentimento_medio: number; risco_medio: number; engajamento: number; volume: number };
  x: { sentimento_medio: number; risco_medio: number; polarização: number; volume: number; posts: any[] };
}

interface Props {
  data: ChannelData;
}

function XChannelIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded border border-current/35 font-black leading-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.78), lineHeight: 1 }}
      aria-hidden="true"
    >
      X
    </span>
  );
}

function InstagramChannelIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded border-2 border-current ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="rounded-full border-2 border-current"
        style={{ width: Math.round(size * 0.42), height: Math.round(size * 0.42) }}
      />
      <span
        className="absolute rounded-full bg-current"
        style={{
          width: Math.max(2, Math.round(size * 0.14)),
          height: Math.max(2, Math.round(size * 0.14)),
          right: Math.round(size * 0.18),
          top: Math.round(size * 0.18),
        }}
      />
    </span>
  );
}

interface ChannelRow {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  volume: number;
  sentimento: number;
  risco: number;
}

function sentimentClass(value: number) {
  if (value > 0.15) return 'text-green-400';
  if (value < -0.15) return 'text-red-400';
  return 'text-slate-400';
}

function riskClass(value: number) {
  if (value > 0.5) return 'text-orange-400';
  if (value > 0.25) return 'text-yellow-400';
  return 'text-slate-400';
}

/**
 * Painel executivo de "Distribuição por Canal" (recuperação de UX): total,
 * percentual de participação e barra comparativa por canal, ordenado do
 * maior para o menor volume — substitui o radar anterior.
 *
 * Usa exclusivamente dimensões com dado real e diretamente comparável entre
 * os três canais: `volume` (contagem de notícias/posts/posts no período —
 * já calculado em getChannelDistribution, mesmo campo para os três) para o
 * total/participação, e `sentimento_medio`/`risco_medio` como contexto
 * secundário por canal. "Alcance" e "Polarização" do modelo antigo não
 * voltam aqui: eram valores fixos/fabricados para Notícias e Instagram
 * (sem fonte real no Supabase para os três canais), removidos numa etapa
 * anterior desta mesma sprint por violarem a diretriz de não inventar
 * dados — decisão mantida.
 */
export default function OverviewChannels({ data }: Props) {
  const rows: ChannelRow[] = [
    {
      key: 'noticias',
      label: 'Notícias',
      icon: <Newspaper size={16} aria-hidden="true" />,
      color: '#2563EB',
      volume: data.noticias.volume,
      sentimento: data.noticias.sentimento_medio,
      risco: data.noticias.risco_medio,
    },
    {
      key: 'instagram',
      label: 'Instagram',
      icon: <InstagramChannelIcon size={15} />,
      color: '#E1306C',
      volume: data.instagram.volume,
      sentimento: data.instagram.sentimento_medio,
      risco: data.instagram.risco_medio,
    },
    {
      key: 'x',
      label: 'X (Twitter)',
      icon: <XChannelIcon size={15} />,
      color: '#22D3EE',
      volume: data.x.volume,
      sentimento: data.x.sentimento_medio,
      risco: data.x.risco_medio,
    },
  ].sort((a, b) => b.volume - a.volume);

  const total = rows.reduce((acc, r) => acc + r.volume, 0);

  return (
    <div className="surface-primary p-5 h-full flex flex-col">
      <h3 className="text-white font-bold text-base tracking-tight">Distribuição por Canal</h3>
      <p className="text-xs text-slate-500 mb-3">Volume, sentimento e risco por canal monitorado.</p>

      {total === 0 ? (
        <div className="flex-1 min-h-[260px] flex items-center justify-center text-slate-500 text-sm italic">
          Nenhum item monitorado no período selecionado.
        </div>
      ) : (
        <div className="flex-1 min-h-[260px] flex flex-col justify-center gap-4">
          {rows.map((r, i) => {
            const pct = Math.round((r.volume / total) * 100);
            return (
              <div key={r.key}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span style={{ color: r.color }}>{r.icon}</span>
                    <span className="text-sm font-semibold text-white truncate">{r.label}</span>
                    {i === 0 && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-sm">
                        Dominante
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-bold text-white">{r.volume.toLocaleString('pt-BR')}</span>
                    <span className="text-xs text-slate-500 ml-1">· {pct}%</span>
                  </div>
                </div>
                <div
                  className="w-full h-2 rounded bg-white/[0.04] overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Participação de ${r.label}`}
                >
                  <div className="h-full rounded transition-[width] duration-300 ease-out" style={{ width: `${pct}%`, backgroundColor: r.color }} />
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                  <span>
                    Sentimento <span className={`font-semibold ${sentimentClass(r.sentimento)}`}>{r.sentimento.toFixed(2)}</span>
                  </span>
                  <span>
                    Risco <span className={`font-semibold ${riskClass(r.risco)}`}>{Math.round(r.risco * 100)}%</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div className="pt-3 mt-1 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500">
          <span>Total consolidado</span>
          <span className="font-bold text-white">{total.toLocaleString('pt-BR')} itens</span>
        </div>
      )}
    </div>
  );
}
