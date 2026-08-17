'use client';

import React from 'react';
import { HelpCircle, Database, Layers, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface IntelligenceExplicabilityPanelProps {
  sourcesCount: number;
  evidenceCount: number;
  coverageRatio: string;
  methodologyNotes?: string[];
}

export default function IntelligenceExplicabilityPanel({
  sourcesCount,
  evidenceCount,
  coverageRatio,
  methodologyNotes = [
    'Normalização estatística por fontes oficiais primárias (IBGE, TSE, SEJUSP MG, DATASUS, SICONFI).',
    'Auditoria de consistência e reconciliação temporal de datasets.',
    'Cruzamento analítico fundamentado exclusivamente em evidências verificáveis.',
  ],
}: IntelligenceExplicabilityPanelProps) {
  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-cyan-400" />
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">
            Como chegamos a esta leitura? (Explicabilidade Metodológica)
          </h4>
        </div>

        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
          Transparência PolitixOS
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-[#0B0F19] border border-white/5 rounded-lg flex items-center gap-3">
          <Database size={18} className="text-slate-400 shrink-0" />
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block font-mono">Bases Primárias</span>
            <span className="text-sm font-bold text-white font-mono">{sourcesCount} Fontes Oficiais</span>
          </div>
        </div>

        <div className="p-3 bg-[#0B0F19] border border-white/5 rounded-lg flex items-center gap-3">
          <ShieldCheck size={18} className="text-cyan-400 shrink-0" />
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block font-mono">Evidências Auditadas</span>
            <span className="text-sm font-bold text-white font-mono">{evidenceCount} Métricas</span>
          </div>
        </div>

        <div className="p-3 bg-[#0B0F19] border border-white/5 rounded-lg flex items-center gap-3">
          <Layers size={18} className="text-emerald-400 shrink-0" />
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block font-mono">Taxa de Cobertura</span>
            <span className="text-sm font-bold text-white font-mono">{coverageRatio}</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/5 space-y-1.5 text-slate-300 leading-relaxed font-mono text-[11px]">
        <span className="text-[10px] font-bold uppercase text-slate-500 block">Regras Metodológicas Aplicadas:</span>
        <ul className="space-y-1">
          {methodologyNotes.map((note, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckCircle2 size={12} className="text-cyan-400 shrink-0 mt-0.5" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
