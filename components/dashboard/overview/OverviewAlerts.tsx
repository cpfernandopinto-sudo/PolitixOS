'use client';

import { AlertTriangle, ExternalLink, Newspaper, Hash, MessageSquare } from 'lucide-react';

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

export default function OverviewAlerts({ alerts }: Props) {
  const getIcon = (canal: string) => {
    if (canal.includes('Notícias')) return <Newspaper size={16} className="text-blue-400" />;
    if (canal.includes('Instagram')) return <Hash size={16} className="text-pink-400" />;
    return <MessageSquare size={16} className="text-cyan-400" />;
  };

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold text-lg tracking-tight">Alertas Prioritários</h3>
        <AlertTriangle className="text-red-500" size={20} />
      </div>

      <div className="flex-1 space-y-4">
        {alerts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm italic">
            Nenhum alerta crítico no momento.
          </div>
        ) : (
          alerts.map((alert, i) => (
            <div
              key={i}
              className="group bg-white/5 border border-white/5 hover:border-red-500/30 rounded-lg p-4 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getIcon(alert.canal)}
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{alert.canal}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${alert.risco > 80 ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                    }`}>
                    RISCO: {alert.risco}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-200 line-clamp-2 mb-3 group-hover:text-white transition-colors">
                {alert.resumo}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[10px] text-gray-500">
                  {new Date(alert.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <a
                  href={alert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  ACESSAR ORIGEM <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
