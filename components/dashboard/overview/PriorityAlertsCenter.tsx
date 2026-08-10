'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, ExternalLink, Inbox, Newspaper } from 'lucide-react';
import type { RiskCard } from '@/lib/analytics/executive-summary';
import { SEVERITY_LABEL, type AlertSeverity } from '@/lib/config/alert-thresholds';

interface Props {
  /** Já em linguagem executiva (`formatExecutiveRisk`) — mesma fonte usada antes por Riscos Prioritários e Alertas Prioritários, sem consulta nova. */
  risks: RiskCard[];
  /** Candidato (target_id) já filtrado na Visão Geral, quando houver — reaproveitado como está, nunca resolvido a partir do nome. */
  activeCandidateId?: string | null;
  period?: string | null;
}

const INITIAL_VISIBLE = 3;

const ORIGIN_ROUTE: Record<RiskCard['origem'], string> = {
  noticias: '/dashboard/noticias',
  instagram: '/dashboard/instagram',
  x: '/dashboard/x',
};

const RISK_SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critico: 'text-red-400 border-red-500/40',
  alto: 'text-orange-400 border-orange-500/40',
  medio: 'text-yellow-400 border-yellow-500/40',
};

const RISK_ACCENT_BORDER: Record<AlertSeverity, string> = {
  critico: 'border-l-red-500',
  alto: 'border-l-orange-500',
  medio: 'border-l-yellow-500',
};

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

const CHANNEL_ICON: Record<RiskCard['origem'], React.ReactNode> = {
  noticias: <Newspaper size={14} className="text-blue-400" />,
  instagram: <InstagramChannelIcon size={14} className="text-pink-400" />,
  x: <XChannelIcon size={14} className="text-cyan-400" />,
};

const CHANNEL_LABEL: Record<RiskCard['origem'], string> = {
  noticias: 'Notícias',
  instagram: 'Instagram',
  x: 'X (Twitter)',
};

/**
 * Deep link para o módulo Radar de origem — usa só parâmetros reais já
 * suportados por essas páginas (nunca um ID fabricado):
 * - Notícias: `candidate` casa por `candidate_name` (lib/queries/noticias.ts)
 *   — o nome da entidade do risco é exatamente esse valor.
 * - Instagram/X: `candidate` casa por `target_id` (lib/queries/instagram.ts,
 *   lib/queries/x.ts) — o risco não carrega esse ID, então só é aplicado
 *   quando a própria Visão Geral já está filtrada por essa entidade (o
 *   `target_id` já validado do filtro ativo, não uma suposição a partir do
 *   nome).
 */
function buildInternalHref(risk: RiskCard, activeCandidateId: string | null | undefined, period: string | null | undefined): string {
  const base = ORIGIN_ROUTE[risk.origem];
  const params = new URLSearchParams();

  if (risk.origem === 'noticias') {
    if (risk.entidade) params.set('candidate', risk.entidade);
  } else if (activeCandidateId) {
    params.set('candidate', activeCandidateId);
  }

  if (period && period !== 'all') params.set('period', period);

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function SeverityCountStrip({ risks }: { risks: RiskCard[] }) {
  const counts = risks.reduce<Record<AlertSeverity, number>>(
    (acc, r) => ({ ...acc, [r.severidade]: acc[r.severidade] + 1 }),
    { critico: 0, alto: 0, medio: 0 }
  );
  const parts = (['critico', 'alto', 'medio'] as AlertSeverity[])
    .filter((s) => counts[s] > 0)
    .map((s) => `${counts[s]} ${SEVERITY_LABEL[s].toLowerCase()}${counts[s] > 1 ? 's' : ''}`);

  if (parts.length === 0) return null;
  return <p className="text-[11px] text-slate-500 mb-3">{parts.join(' · ')}</p>;
}

function AlertCard({ risk, activeCandidateId, period }: { risk: RiskCard; activeCandidateId?: string | null; period?: string | null }) {
  const href = buildInternalHref(risk, activeCandidateId, period);

  return (
    <div className={`bg-white/[0.02] border border-white/[0.08] border-l-2 ${RISK_ACCENT_BORDER[risk.severidade]} rounded p-3.5`}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {CHANNEL_ICON[risk.origem]}
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{CHANNEL_LABEL[risk.origem]}</span>
        </div>
        <span className={`shrink-0 text-[9px] font-bold px-1 py-[1px] rounded-sm uppercase tracking-wide border bg-transparent ${RISK_SEVERITY_STYLES[risk.severidade]}`}>
          {SEVERITY_LABEL[risk.severidade]}
        </span>
      </div>

      {/* Bloco descritivo — o título (descrição executiva) é sempre o elemento textual de maior peso do card. */}
      <div className="mb-2.5">
        {/* Descrição executiva (formatExecutiveRisk) — nunca o título bruto do item de origem. */}
        <p className="text-sm text-white font-semibold leading-snug line-clamp-2">{risk.descricao}</p>
        <p className="text-[10px] text-slate-500 mt-1">{risk.entidade}</p>
        {risk.evidencia && (
          <p className="text-xs text-slate-400 italic line-clamp-2 mt-1.5">&ldquo;{risk.evidencia.descricao}&rdquo;</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-white/[0.05]">
        <Link
          href={href}
          className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/60 rounded"
        >
          Ver análise no PolitixOS <ArrowRight size={10} aria-hidden="true" />
        </Link>
        {risk.evidencia?.url && (
          <a
            href={risk.evidencia.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] font-normal text-slate-600 hover:text-slate-400 transition-colors"
          >
            Fonte original <ExternalLink size={8} aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Centro de Alertas Prioritários (Sprint UX — Etapa 4). Consolida os antigos
 * "Riscos Prioritários" (RiskOpportunityBoard, variant='risks') e "Alertas
 * Prioritários" (OverviewAlerts) em um único painel: os dois liam os MESMOS
 * `risks` (via getExecutiveOverviewData) e mostravam a mesma informação em
 * dois cartões lado a lado — duplicação confirmada em código, não apenas
 * visual.
 *
 * Ação primária de cada item passa a ser um deep link interno para o módulo
 * Radar de origem (ver `buildInternalHref`), em vez de só a fonte externa —
 * "Fonte original" continua disponível, com hierarquia visual claramente
 * secundária (refinamento visual pós-Etapa 4).
 */
export default function PriorityAlertsCenter({ risks, activeCandidateId, period }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? risks : risks.slice(0, INITIAL_VISIBLE);

  return (
    <div className="surface-primary p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" aria-hidden="true" /> Centro de Alertas Prioritários
        </h3>
        {risks.length > INITIAL_VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/60 rounded"
          >
            {showAll ? 'Ver menos' : `Ver todos (${risks.length})`}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-3">Riscos e alertas mais recentes, com ação direta para a análise interna.</p>

      {risks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm">
          <Inbox size={24} className="text-slate-600" aria-hidden="true" />
          Nenhum alerta crítico no momento.
        </div>
      ) : (
        <>
          <SeverityCountStrip risks={risks} />
          {/* Último card ímpar (linha incompleta) ocupa a linha inteira em vez de
              sobrar isolado ao lado de um espaço vazio — puramente CSS, não
              altera quantidade, ordenação nem dados. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 [&>*:last-child:nth-child(odd)]:lg:col-span-2">
            {visible.map((risk) => (
              <AlertCard key={risk.id} risk={risk} activeCandidateId={activeCandidateId} period={period} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
