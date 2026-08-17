'use client';

import React from 'react';
import { Briefcase, UserPlus, UserMinus, Scale, Clock, AlertCircle } from 'lucide-react';
import type { CagedEmploymentViewModel } from '@/lib/territorios/intelligence/frontend-adapters';
import DefasagemStatusBadge from './DefasagemStatusBadge';

export interface CagedEmploymentSectionProps {
  cagedData: CagedEmploymentViewModel;
}

export default function CagedEmploymentSection({ cagedData }: CagedEmploymentSectionProps) {
  const { period, totalAdmissions, totalDismissals, totalBalance, sectors, pendingMetrics } = cagedData;

  const isBalancePositive = totalBalance >= 0;

  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Briefcase size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">
                Dinâmica do Emprego Formal (Novo CAGED)
              </h3>
              <DefasagemStatusBadge type="atual" referenceYear={period} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Fluxo mensal de admissões, desligamentos e saldo por setor de atividade econômica.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20 self-start sm:self-auto">
          Fonte: MTE / Novo CAGED
        </span>
      </div>

      {/* 3 Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Admissões */}
        <div className="bg-[#0B0F19] border border-white/5 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider font-bold">Admissões Totais</span>
            <UserPlus size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {totalAdmissions.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-500 block font-mono">Trabalhadores admitidos</span>
        </div>

        {/* Desligamentos */}
        <div className="bg-[#0B0F19] border border-white/5 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider font-bold">Desligamentos Totais</span>
            <UserMinus size={14} className="text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {totalDismissals.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-500 block font-mono">Trabalhadores desligados</span>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-[#0B0F19] border border-cyan-500/20 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-cyan-400">Saldo Líquido</span>
            <Scale size={14} className="text-cyan-400" />
          </div>
          <div className={`text-2xl font-extrabold font-mono ${isBalancePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isBalancePositive ? `+${totalBalance.toLocaleString('pt-BR')}` : totalBalance.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-500 block font-mono">Admissões menos desligamentos</span>
        </div>
      </div>

      {/* 5 Sectors Table / Heatmap */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">
          Desempenho por Cinco Setores Econômicos
        </h4>

        <div className="overflow-x-auto border border-white/5 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0B0F19] text-slate-400 text-[10px] uppercase border-b border-white/5">
              <tr>
                <th className="p-3">Setor de Atividade</th>
                <th className="p-3 text-right">Admissões</th>
                <th className="p-3 text-right">Desligamentos</th>
                <th className="p-3 text-right">Saldo Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {sectors.map((sec) => {
                const secBalancePositive = sec.balance >= 0;
                return (
                  <tr key={sec.sector} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-semibold text-white">{sec.sector}</td>
                    <td className="p-3 text-right">{sec.admissions.toLocaleString('pt-BR')}</td>
                    <td className="p-3 text-right">{sec.dismissals.toLocaleString('pt-BR')}</td>
                    <td className={`p-3 text-right font-bold ${secBalancePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {secBalancePositive ? `+${sec.balance.toLocaleString('pt-BR')}` : sec.balance.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Methodology Badges */}
      {pendingMetrics && pendingMetrics.length > 0 && (
        <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1 text-slate-500 font-bold">
            <Clock size={10} /> Métricas em Validação Metodológica:
          </span>
          {pendingMetrics.map((pm) => (
            <span key={pm.name} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400" title="Metodologia oficial de cálculo em homologação pelo motor de dados">
              {pm.name}: <strong className="text-amber-400 font-mono font-normal">METHODOLOGY_PENDING</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
