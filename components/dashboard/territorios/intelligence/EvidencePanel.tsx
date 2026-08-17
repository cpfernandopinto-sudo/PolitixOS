'use client';

import React from 'react';
import { X, Database, Info, ShieldCheck, Hash } from 'lucide-react';

export interface EvidenceDetail {
  id: string;
  evidenceHash?: string | null;
  label: string;
  value: string | number;
  unit?: string;
  period?: string;
  source: string;
  dataset?: string;
  domain: string;
  description?: string;
  methodology?: string;
}

export interface EvidencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  evidences: EvidenceDetail[];
}

export default function EvidencePanel({
  isOpen,
  onClose,
  title,
  evidences,
}: EvidencePanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-fade-in">
      <div className="w-full max-w-xl bg-[#0B0F19] border-l border-cyan-500/30 h-full flex flex-col justify-between p-6 overflow-y-auto space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono font-bold uppercase tracking-widest">
              <ShieldCheck size={14} />
              <span>Evidence Trace — Rastreabilidade PolitixOS</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">{title}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg bg-white/5 border border-white/10 transition-colors"
            aria-label="Fechar painel de evidências"
          >
            <X size={18} />
          </button>
        </div>

        {/* Evidence Items */}
        <div className="space-y-4 flex-1">
          <p className="text-xs text-slate-300">
            <strong>"Por que o PolitixOS está dizendo isso?"</strong> Abaixo estão listadas as métricas primárias e fontes oficiais que fundamentam este achado analítico.
          </p>

          {evidences.map((ev) => (
            <div
              key={ev.id}
              className="bg-[#111726] border border-white/5 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {ev.domain}
                </span>
                {ev.period && (
                  <span className="text-[10px] font-mono text-slate-400">Ref: {ev.period}</span>
                )}
              </div>

              <div>
                <span className="text-xs text-slate-400 block font-medium">{ev.label}</span>
                <span className="text-xl font-bold text-white font-mono">
                  {ev.value} {ev.unit}
                </span>
              </div>

              {ev.description && (
                <p className="text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-2">
                  {ev.description}
                </p>
              )}

              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono gap-2">
                <span className="flex items-center gap-1">
                  <Database size={10} /> Fonte: {ev.source} {ev.dataset ? `(${ev.dataset})` : ''}
                </span>
                {ev.evidenceHash && (
                  <span className="flex items-center gap-1 text-slate-400 font-mono" title={`Hash: ${ev.evidenceHash}`}>
                    <Hash size={10} /> {ev.evidenceHash.length > 16 ? `${ev.evidenceHash.substring(0, 16)}...` : ev.evidenceHash}
                  </span>
                )}
                {ev.methodology && (
                  <span className="flex items-center gap-1 text-slate-400" title={ev.methodology}>
                    <Info size={10} /> Metodologia disponível
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Transparência da Leitura Política</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
