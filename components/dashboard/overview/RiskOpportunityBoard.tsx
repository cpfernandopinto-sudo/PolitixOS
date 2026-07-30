'use client';

import { useState } from 'react';
import { AlertTriangle, TrendingUp, ExternalLink, Inbox } from 'lucide-react';
import type { RiskCard, OpportunityCard } from '@/lib/analytics/executive-summary';
import { SEVERITY_LABEL, type AlertSeverity } from '@/lib/config/alert-thresholds';

interface Props {
  risks: RiskCard[];
  opportunities: OpportunityCard[];
  /** Motivos determinísticos de ausência de oportunidade (vazio quando há oportunidades). Ver `explainOpportunityAbsence`. */
  opportunityAbsenceReasons?: string[];
  /**
   * Qual(is) painel(is) renderizar — 'both' (padrão, comportamento original,
   * os dois lado a lado), 'risks' (só Riscos, largura total) ou
   * 'opportunities' (só Oportunidades, largura total). Permite separar
   * visualmente Riscos de Oportunidades em posições diferentes da página
   * sem duplicar conteúdo (hotfix de apresentação) — nenhum dado muda.
   */
  variant?: 'both' | 'risks' | 'opportunities';
}

const INITIAL_VISIBLE = 3;

// Tratamento discreto (borda + texto), sem preenchimento sólido — evita que
// vários riscos críticos empilhados formem uma "mancha vermelha" na tela
// (ver docs/AUDITORIA_VISUAL_SPRINT_5.md, achado #2).
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

function RiskItem({ risk }: { risk: RiskCard }) {
  return (
    <div className={`bg-blue-400/[0.05] border border-blue-300/10 border-l-2 ${RISK_ACCENT_BORDER[risk.severidade]} rounded-lg p-4 space-y-2`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border bg-transparent ${RISK_SEVERITY_STYLES[risk.severidade]}`}>
          {SEVERITY_LABEL[risk.severidade]}
        </span>
        <span className="text-[10px] text-slate-600">{risk.entidade}</span>
      </div>
      {/* Descrição EXECUTIVA do risco (regra + entidade) — nunca o título de uma notícia/post. */}
      <p className="text-sm text-white font-medium line-clamp-2">{risk.descricao}</p>
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{risk.metricaAtual}</span>
        <span>{risk.referencia}</span>
      </div>
      {risk.evidencia && (
        <div className="pt-2 border-t border-blue-300/10 space-y-1">
          <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">Evidência principal</p>
          <p className="text-xs text-slate-400 italic line-clamp-2">&ldquo;{risk.evidencia.descricao}&rdquo;</p>
          {risk.evidencia.url && (
            <a
              href={risk.evidencia.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
            >
              Ver evidências <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function OpportunityItem({ opportunity }: { opportunity: OpportunityCard }) {
  return (
    <div className="bg-blue-400/[0.05] border border-blue-300/10 border-l-2 border-l-teal-500 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border border-teal-500/40 text-teal-300">
          {opportunity.prioridade === 'alta' ? 'Prioridade alta' : 'Prioridade média'}
        </span>
        <span className="text-[10px] text-slate-600">{opportunity.entidade}</span>
      </div>
      <p className="text-sm text-white font-medium line-clamp-2">{opportunity.descricao}</p>
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{opportunity.metricaAtual}</span>
        <span>{opportunity.referencia}</span>
      </div>
    </div>
  );
}

/**
 * Riscos e oportunidades prioritários, lado a lado em desktop (empilhados
 * em mobile via grid responsivo). Limita a 3 itens visíveis inicialmente,
 * com "Ver todos" revelando o restante já calculado no servidor (sem nova
 * consulta).
 */
export default function RiskOpportunityBoard({ risks, opportunities, opportunityAbsenceReasons = [], variant = 'both' }: Props) {
  const [showAllRisks, setShowAllRisks] = useState(false);
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);

  const showRisks = variant !== 'opportunities';
  const showOpportunities = variant !== 'risks';

  const visibleRisks = showAllRisks ? risks : risks.slice(0, INITIAL_VISIBLE);
  const visibleOpportunities = showAllOpportunities ? opportunities : opportunities.slice(0, INITIAL_VISIBLE);

  return (
    <div
      id="riscos-oportunidades"
      className={`grid grid-cols-1 ${showRisks && showOpportunities ? 'lg:grid-cols-2' : ''} gap-6 scroll-mt-20 h-full`}
    >
      {showRisks && (
        <div className="bg-[#0E1727] border border-blue-300/10 rounded-xl p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" /> Riscos Prioritários
            </h3>
            {risks.length > INITIAL_VISIBLE && (
              <button type="button" onClick={() => setShowAllRisks((v) => !v)} className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider">
                {showAllRisks ? 'Ver menos' : `Ver todos (${risks.length})`}
              </button>
            )}
          </div>
          {risks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-500 text-sm">
              <Inbox size={24} className="text-slate-600" />
              Nenhum risco prioritário no período selecionado.
            </div>
          ) : (
            <>
              <SeverityCountStrip risks={risks} />
              <div className="space-y-3">
                {visibleRisks.map((r) => <RiskItem key={r.id} risk={r} />)}
              </div>
            </>
          )}
        </div>
      )}

      {showOpportunities && (
        <div id="oportunidades" className="bg-[#0E1727] border border-blue-300/10 rounded-xl p-6 scroll-mt-20 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
              <TrendingUp size={16} className="text-teal-400" /> Oportunidades Prioritárias
            </h3>
            {opportunities.length > INITIAL_VISIBLE && (
              <button type="button" onClick={() => setShowAllOpportunities((v) => !v)} className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider">
                {showAllOpportunities ? 'Ver menos' : `Ver todas (${opportunities.length})`}
              </button>
            )}
          </div>
          {opportunities.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-sm">
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <Inbox size={24} className="text-slate-600" />
                Nenhuma oportunidade com regra objetiva identificada no período.
              </div>
              {opportunityAbsenceReasons.length > 0 && (
                <ul className="w-full text-xs text-slate-500 space-y-1.5 bg-blue-400/[0.03] border border-blue-300/10 rounded-lg p-3">
                  {opportunityAbsenceReasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-600 mt-1.5 shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleOpportunities.map((o) => <OpportunityItem key={o.id} opportunity={o} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
