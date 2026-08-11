import React from 'react';
import { Database, Clock, RefreshCw } from 'lucide-react';

interface WaitingDataProps {
  moduleName: string;
  expectedSource?: string;
}

export default function WaitingData({ moduleName, expectedSource }: WaitingDataProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 md:p-24 bg-[#0B0F19]/50 border border-white/5 rounded-2xl">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
        <div className="relative bg-[#111726] p-4 rounded-xl border border-white/10 shadow-xl">
          <Database size={32} className="text-slate-400" />
        </div>
      </div>
      
      <h3 className="text-xl md:text-2xl font-bold text-white mb-3 text-center">
        {moduleName} em Integração
      </h3>
      
      <p className="text-slate-400 text-center max-w-md mb-8 leading-relaxed">
        Os dados para este caderno estão na fila de processamento da esteira territorial. 
        O PolitixOS está conectando fontes oficiais para popular esta seção.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        {expectedSource && (
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-lg border border-white/5">
            <Clock size={16} className="text-amber-500" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Aguardando: {expectedSource}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2.5 rounded-lg border border-blue-500/20 text-blue-400">
          <RefreshCw size={16} className="animate-spin-slow" />
          <span className="text-xs font-bold uppercase tracking-wide">
            Carga Pendente
          </span>
        </div>
      </div>
    </div>
  );
}
