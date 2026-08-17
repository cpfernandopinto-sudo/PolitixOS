'use client';

import React from 'react';
import { ShieldAlert, Target } from 'lucide-react';

export interface RiskItem {
  id: string;
  title: string;
  detail: string;
  domain: string;
  priority: 'CRÍTICO' | 'ALTO' | 'MÉDIO';
}

export interface OpportunityItem {
  id: string;
  title: string;
  detail: string;
  domain: string;
  priority: 'ALTO' | 'MÉDIO' | 'BAIXO';
}

export interface RiskOpportunitySummaryProps {
  risks: RiskItem[];
  opportunities: OpportunityItem[];
}

export default function RiskOpportunitySummary({
  risks,
  opportunities,
}: RiskOpportunitySummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Risks Panel */}
      <div className="bg-[#111726] border border-rose-500/20 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-400" />
            <h4 className="text-xs font-bold text-rose-300 uppercase tracking-widest font-mono">
              Pontos de Risco e Atenção
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-500">{risks.length} Identificados</span>
        </div>

        <div className="space-y-2.5">
          {risks.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">Nenhum risco crítico registrado.</p>
          ) : (
            risks.slice(0, 3).map((r) => (
              <div key={r.id} className="p-3 bg-[#0B0F19] rounded-lg border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-rose-400 font-bold uppercase">{r.priority}</span>
                  <span className="text-slate-500">{r.domain}</span>
                </div>
                <h5 className="text-xs font-bold text-white">{r.title}</h5>
                <p className="text-[11px] text-slate-300 leading-relaxed">{r.detail}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Opportunities Panel */}
      <div className="bg-[#111726] border border-emerald-500/20 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-emerald-400" />
            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest font-mono">
              Oportunidades Estratégicas
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-500">{opportunities.length} Identificadas</span>
        </div>

        <div className="space-y-2.5">
          {opportunities.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">Nenhuma oportunidade mapeada.</p>
          ) : (
            opportunities.slice(0, 3).map((o) => (
              <div key={o.id} className="p-3 bg-[#0B0F19] rounded-lg border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-400 font-bold uppercase">{o.priority}</span>
                  <span className="text-slate-500">{o.domain}</span>
                </div>
                <h5 className="text-xs font-bold text-white">{o.title}</h5>
                <p className="text-[11px] text-slate-300 leading-relaxed">{o.detail}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
