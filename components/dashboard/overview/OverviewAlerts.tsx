'use client';

import { AlertTriangle, ExternalLink, Newspaper } from 'lucide-react';

interface Alert {
  canal: string;
  resumo: string;
  risco: number;
  impacto: number;
  data: string;
  url: string;
}

interface Props {
  alerts: Alert[];
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
          top: Math.round(size * 0.18)
        }}
      />
    </span>
  );
}

export default function OverviewAlerts({ alerts }: Props) {
  const visibleAlerts = alerts.slice(0, 3);
  const additionalAlerts = Math.max(alerts.length - visibleAlerts.length, 0);

  const getIcon = (canal: string) => {
    if (canal.includes('Notícias')) return <Newspaper size={16} className="text-blue-400" />;
    if (canal.includes('Instagram')) return <InstagramChannelIcon size={16} className="text-pink-400" />;
    return <XChannelIcon size={16} className="text-cyan-400" />;
  };

  return (
    <div className="glass h-[254px] rounded-2xl p-4 flex flex-col">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/15 bg-red-500/10">
            <AlertTriangle className="text-red-400" size={16} />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-white">Alertas Prioritários</h3>
            <p className="text-[10px] text-slate-500">Ocorrências que exigem atenção imediata</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-red-500/15 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-300">
            {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
          </span>
          {additionalAlerts > 0 && (
            <span className="hidden text-[10px] font-medium text-slate-500 xl:inline">
              +{additionalAlerts} no monitoramento
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] divide-y divide-white/[0.06]">
        {alerts.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            Nenhum alerta crítico no momento.
          </div>
        ) : (
          visibleAlerts.map((alert, i) => (
            <article
              key={i}
              className="group grid min-h-[55px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 transition-colors hover:bg-white/[0.035]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-[#111D30]">
                {getIcon(alert.canal)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold leading-4 text-slate-200 transition-colors group-hover:text-white">
                  {alert.resumo}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-500">
                  <span className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {alert.canal}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-slate-700" />
                  <time>
                    {new Date(alert.data).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </time>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`rounded-md border px-2 py-1 text-[9px] font-black ${alert.risco > 80
                  ? 'border-red-500/10 bg-red-500/10 text-red-400'
                  : 'border-orange-500/10 bg-orange-500/10 text-orange-400'
                  }`}>
                  {alert.risco}
                </span>
                {alert.url && (
                  <a
                    href={alert.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir origem de ${alert.resumo}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.06] text-cyan-400 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/10"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
