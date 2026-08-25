'use client';

import { Users, AlertCircle, PieChart, ShieldAlert } from 'lucide-react';

export function IntencaoPorPerfilPlaceholder() {
  return (
    <div className="surface-primary p-5 space-y-4 h-full flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <PieChart size={16} className="text-blue-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">
              Intenção de Voto por Perfil Demográfico (Crosstabs)
            </h3>
          </div>
          <span className="text-[10px] bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded font-medium">
            Contrato Preparado (Futuro)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 opacity-60">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Intenção por Sexo</span>
            <span className="text-xs text-gray-400 font-mono">--% / --%</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Intenção por Idade</span>
            <span className="text-xs text-gray-400 font-mono">--% por faixa</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Intenção por Renda</span>
            <span className="text-xs text-gray-400 font-mono">--% por faixa SM</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Intenção por Instrução</span>
            <span className="text-xs text-gray-400 font-mono">--% por escolaridade</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs text-amber-400 font-semibold">
          <ShieldAlert size={16} />
          <span>Aguardando integração de fonte oficial com matriz de cruzamento demográfico.</span>
        </div>
        <p className="text-xs text-gray-400 max-w-xl mx-auto leading-relaxed">
          O dataset oficial de registro de pesquisas do TSE (PesqEle) contém o perfil da amostra coletada, mas não divulga o resultado de intenção de voto cruzado por estratos demográficos. NENHUM DADO MOCK É EXIBIDO nesta seção em conformidade com as regras de integridade do PolitixOS.
        </p>
      </div>
    </div>
  );
}
