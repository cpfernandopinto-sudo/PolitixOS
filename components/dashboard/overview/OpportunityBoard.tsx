'use client';

import { useState } from 'react';
import { TrendingUp, Inbox } from 'lucide-react';
import type { OpportunityCard } from '@/lib/analytics/executive-summary';

interface Props {
  opportunities: OpportunityCard[];
  /** Motivos determinísticos de ausência de oportunidade (vazio quando há oportunidades). Ver `explainOpportunityAbsence`. */
  opportunityAbsenceReasons?: string[];
}

const INITIAL_VISIBLE = 3;

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
 * Oportunidades Prioritárias. Antes convivia com Riscos Prioritários no mesmo
 * componente (`RiskOpportunityBoard`, com `variant`); os riscos foram
 * consolidados em `PriorityAlertsCenter` (Sprint UX — Etapa 4), que também
 * herdou o antigo `id="riscos-oportunidades"` — este componente manteve
 * apenas o `id="oportunidades"`, alvo real do link "Ver oportunidades" em
 * `lib/analytics/executive-narrative.ts`.
 */
export default function OpportunityBoard({ opportunities, opportunityAbsenceReasons = [] }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? opportunities : opportunities.slice(0, INITIAL_VISIBLE);

  return (
    <div id="oportunidades" className="surface-primary p-5 scroll-mt-20 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
          <TrendingUp size={16} className="text-teal-400" aria-hidden="true" /> Oportunidades Prioritárias
        </h3>
        {opportunities.length > INITIAL_VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/60 rounded"
          >
            {showAll ? 'Ver menos' : `Ver todas (${opportunities.length})`}
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
          {visible.map((o) => <OpportunityItem key={o.id} opportunity={o} />)}
        </div>
      )}
    </div>
  );
}
