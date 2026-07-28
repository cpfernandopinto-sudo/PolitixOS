'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Newspaper, ExternalLink, ChevronLeft, ChevronRight, Inbox, ShieldAlert } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import type { UnifiedAlert } from '@/lib/queries/alerts';
import { SEVERITY_LABEL, type AlertSeverity } from '@/lib/config/alert-thresholds';

interface Props {
  alerts: UnifiedAlert[];
  errors: Array<{ origem: string; message: string }>;
}

const PAGE_SIZE = 10;

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critico: 'bg-red-500/10 text-red-400 border-red-500/30',
  alto: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  medio: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
};

const ORIGIN_LABEL: Record<string, string> = {
  noticias: 'Radar de Notícias',
  instagram: 'Radar Instagram',
  x: 'Radar X',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function AlertsList({ alerts, errors }: Props) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<UnifiedAlert | null>(null);

  const bySeverity = useMemo(() => {
    const counts: Record<AlertSeverity, number> = { critico: 0, alto: 0, medio: 0 };
    for (const a of alerts) counts[a.severidade]++;
    return counts;
  }, [alerts]);

  const totalPages = Math.max(1, Math.ceil(alerts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = alerts.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Resumo por severidade */}
      <div className="grid grid-cols-3 gap-4">
        {(['critico', 'alto', 'medio'] as AlertSeverity[]).map((sev) => (
          <div key={sev} className={`rounded-xl border p-4 ${SEVERITY_STYLES[sev]}`}>
            <div className="text-2xl font-bold">{bySeverity[sev]}</div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-80">{SEVERITY_LABEL[sev]}</div>
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-300 flex items-center gap-3">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            Não foi possível carregar alertas de: {errors.map((e) => ORIGIN_LABEL[e.origem] || e.origem).join(', ')}.
            Os demais canais continuam exibidos normalmente.
          </span>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-[#1A1A1A] border border-white/5 rounded-xl">
          <Inbox size={40} className="text-gray-600" />
          <p className="text-base font-medium text-gray-400">Nenhum alerta no momento</p>
          <p className="text-sm">Nenhuma regra foi disparada para o período e filtros selecionados.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {pageItems.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => setSelected(alert)}
                className="w-full text-left bg-[#1A1A1A] border border-white/5 hover:border-white/20 rounded-xl p-4 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${SEVERITY_STYLES[alert.severidade]}`}>
                        {SEVERITY_LABEL[alert.severidade]}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <Newspaper size={10} /> {ORIGIN_LABEL[alert.origem]}
                      </span>
                      <span className="text-[10px] text-gray-600">{alert.entidade}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                      {alert.titulo}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{alert.descricao}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-gray-500">{formatDate(alert.data)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500">
              Mostrando {currentPage * PAGE_SIZE + 1}–{Math.min(alerts.length, (currentPage + 1) * PAGE_SIZE)} de {alerts.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-gray-500">{currentPage + 1} / {totalPages}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.titulo || ''}
        subtitle={selected ? `${ORIGIN_LABEL[selected.origem]} · ${selected.entidade}` : undefined}
        footer={
          selected?.url ? (
            <a
              href={selected.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-500 text-black text-sm font-bold hover:bg-cyan-400 transition-colors"
            >
              Ver evidência original <ExternalLink size={14} />
            </a>
          ) : undefined
        }
      >
        {selected && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${SEVERITY_STYLES[selected.severidade]}`}>
                {SEVERITY_LABEL[selected.severidade]}
              </span>
              <span className="text-xs text-gray-500">{formatDate(selected.data)}</span>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Regra que disparou o alerta</h4>
              <div className="bg-white/5 border border-white/5 rounded-lg p-4 flex items-start gap-3">
                <ShieldAlert size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">{selected.nome}</p>
                  <p className="text-xs text-gray-400 mt-1">{selected.descricao}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/5 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Métrica atual</div>
                <div className="text-sm text-white font-medium">{selected.metricaAtual}</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Referência / threshold</div>
                <div className="text-sm text-white font-medium">{selected.referencia}</div>
              </div>
            </div>

            {!selected.url && (
              <p className="text-xs text-gray-500 italic">
                Este é um alerta agregado (calculado sobre um conjunto de itens do período), sem um único item de evidência para vincular.
              </p>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
