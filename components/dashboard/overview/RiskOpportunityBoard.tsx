'use client';

import { useState } from 'react';
import { AlertTriangle, TrendingUp, ExternalLink, Inbox } from 'lucide-react';
import type { RiskCard, OpportunityCard } from '@/lib/analytics/executive-summary';
import { SEVERITY_LABEL, type AlertSeverity } from '@/lib/config/alert-thresholds';

interface Props {
  risks: RiskCard[];
  opportunities: OpportunityCard[];
}

const INITIAL_VISIBLE = 3;

const RISK_SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critico: 'bg-red-500/10 text-red-400 border-red-500/30',
  alto: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  medio: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
};

function RiskItem({ risk }: { risk: RiskCard }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${RISK_SEVERITY_STYLES[risk.severidade]}`}>
          {SEVERITY_LABEL[risk.severidade]}
        </span>
        <span className="text-[10px] text-gray-600">{risk.entidade}</span>
      </div>
      <p className="text-sm text-white font-medium line-clamp-2">{risk.descricao}</p>
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>{risk.metricaAtual}</span>
        <span>{risk.referencia}</span>
      </div>
      {risk.evidencia?.url && (
        <a href={risk.evidencia.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider">
          Ver detalhes <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}

function OpportunityItem({ opportunity }: { opportunity: OpportunityCard }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border bg-green-500/10 text-green-400 border-green-500/30">
          {opportunity.prioridade === 'alta' ? 'Prioridade alta' : 'Prioridade média'}
        </span>
        <span className="text-[10px] text-gray-600">{opportunity.entidade}</span>
      </div>
      <p className="text-sm text-white font-medium line-clamp-2">{opportunity.descricao}</p>
      <div className="flex items-center justify-between text-[10px] text-gray-500">
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
export default function RiskOpportunityBoard({ risks, opportunities }: Props) {
  const [showAllRisks, setShowAllRisks] = useState(false);
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);

  const visibleRisks = showAllRisks ? risks : risks.slice(0, INITIAL_VISIBLE);
  const visibleOpportunities = showAllOpportunities ? opportunities : opportunities.slice(0, INITIAL_VISIBLE);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
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
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-500 text-sm">
            <Inbox size={24} className="text-gray-600" />
            Nenhum risco prioritário no período selecionado.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRisks.map((r) => <RiskItem key={r.id} risk={r} />)}
          </div>
        )}
      </div>

      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
            <TrendingUp size={16} className="text-green-400" /> Oportunidades Prioritárias
          </h3>
          {opportunities.length > INITIAL_VISIBLE && (
            <button type="button" onClick={() => setShowAllOpportunities((v) => !v)} className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider">
              {showAllOpportunities ? 'Ver menos' : `Ver todas (${opportunities.length})`}
            </button>
          )}
        </div>
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-500 text-sm">
            <Inbox size={24} className="text-gray-600" />
            Nenhuma oportunidade com regra objetiva identificada no período.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOpportunities.map((o) => <OpportunityItem key={o.id} opportunity={o} />)}
          </div>
        )}
      </div>
    </div>
  );
}
