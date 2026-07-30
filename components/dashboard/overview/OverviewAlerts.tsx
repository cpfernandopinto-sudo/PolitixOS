import { AlertTriangle, ExternalLink, Newspaper } from 'lucide-react';
import type { RiskCard } from '@/lib/analytics/executive-summary';
import { SEVERITY_LABEL } from '@/lib/config/alert-thresholds';

interface Props {
  /** Já em linguagem executiva (`formatExecutiveRisk`) — mesma fonte do board de Riscos Prioritários, sem consulta nova. */
  risks: RiskCard[];
}

// Hotfix de apresentação: reduzido de 5 para 3 — este é um resumo
// operacional compacto (Camada 2). O link "Ver todos" para a Central de
// Alertas foi removido nesta release porque esse módulo não foi transportado
// (ver docs/MATRIZ_INTEGRACAO_RADAR_REAL_OVERVIEW.md) — evita link morto.
const INITIAL_VISIBLE = 3;

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

const CHANNEL_ICON: Record<RiskCard['origem'], React.ReactNode> = {
  noticias: <Newspaper size={16} className="text-blue-400" />,
  instagram: <InstagramChannelIcon size={16} className="text-pink-400" />,
  x: <XChannelIcon size={16} className="text-cyan-400" />,
};

const CHANNEL_LABEL: Record<RiskCard['origem'], string> = {
  noticias: 'Notícias',
  instagram: 'Instagram',
  x: 'X (Twitter)',
};

/**
 * Resumo operacional de Alertas Prioritários — Camada 2 (sempre visível,
 * reintegrado no Sprint 6). Reaproveita os mesmos `risks` já calculados por
 * `getExecutiveOverviewData` (via `deriveRisksFromAlerts`/`formatExecutiveRisk`),
 * a MESMA fonte usada por `RiskOpportunityBoard` — nenhuma consulta nova e
 * nenhum critério de severidade paralelo.
 *
 * Corrige um bug real encontrado durante a reintegração: a versão anterior
 * deste bloco (`getPriorityAlerts`) usava o título bruto da notícia/post como
 * texto do alerta — o mesmo problema já corrigido no Sprint 5 para o board de
 * Riscos Prioritários, mas presente aqui até agora.
 */
export default function OverviewAlerts({ risks }: Props) {
  const visible = risks.slice(0, INITIAL_VISIBLE);

  return (
    <div className="bg-[#0E1727] border border-blue-300/10 rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-white font-bold text-lg tracking-tight">Alertas Prioritários</h3>
        <AlertTriangle className="text-red-500" size={20} />
      </div>
      <p className="text-xs text-slate-500 mb-5">Resumo operacional dos riscos mais recentes.</p>

      <div className="flex-1 space-y-4">
        {visible.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
            Nenhum alerta crítico no momento.
          </div>
        ) : (
          visible.map((risk) => (
            <div
              key={risk.id}
              className="group bg-blue-500/5 border border-blue-300/10 hover:border-red-500/30 rounded-lg p-4 transition-all"
            >
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {CHANNEL_ICON[risk.origem]}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{CHANNEL_LABEL[risk.origem]}</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${risk.severidade === 'critico' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                  {SEVERITY_LABEL[risk.severidade].toUpperCase()}
                </span>
              </div>

              {/* Descrição executiva (formatExecutiveRisk) — nunca o título bruto do item de origem. */}
              <p className="text-sm text-slate-200 line-clamp-2 mb-1 group-hover:text-white transition-colors">
                {risk.descricao}
              </p>
              <p className="text-[10px] text-slate-500 mb-3">{risk.metricaAtual}</p>

              <div className="flex items-center justify-between pt-2 border-t border-blue-300/10">
                <span className="text-[10px] text-slate-500">{risk.entidade}</span>
                {risk.evidencia?.url && (
                  <a
                    href={risk.evidencia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    VER EVIDÊNCIA <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
