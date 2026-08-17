'use client';

import React, { useState } from 'react';
import { Lightbulb, AlertTriangle, ShieldCheck, ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import type { InterpretationViewModel } from '@/lib/territorios/intelligence/frontend-adapters';

export interface InterpretationCardProps {
  interpretation?: InterpretationViewModel;
  interpretations?: InterpretationViewModel[];
  onOpenEvidence?: (evidenceRefs: string[]) => void;
}

export function ZeroInterpretationState() {
  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 text-center space-y-2">
      <div className="flex items-center justify-center gap-2 text-slate-400">
        <Info size={16} className="text-cyan-400" />
        <span className="text-xs font-bold font-mono uppercase tracking-widest text-slate-300">
          Status da Camada de Interpretação (L4)
        </span>
      </div>
      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
        Nenhuma interpretação validada está disponível para este conjunto de evidências. Os indicadores primários e gráficos permanecem totalmente acessíveis para análise.
      </p>
    </div>
  );
}

export default function InterpretationCard({
  interpretation,
  interpretations,
  onOpenEvidence,
}: InterpretationCardProps) {
  const [showMetadata, setShowMetadata] = useState(false);

  const items = interpretations ?? (interpretation ? [interpretation] : []);

  if (items.length === 0) {
    return <ZeroInterpretationState />;
  }

  return (
    <div className="space-y-4">
      {items.map((interp) => (
        <div
          key={interp.id}
          className="bg-[#111726] border border-cyan-500/20 hover:border-cyan-500/40 rounded-xl p-5 md:p-6 space-y-4 transition-all"
        >
          {/* Header Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Lightbulb size={16} />
              </span>
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono block">
                  Interpretação Analítica (L4)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Origem: {interp.originLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold uppercase">
                {interp.confidence.level} CONFIANÇA
              </span>
              <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                {interp.domains.join(' + ')}
              </span>
            </div>
          </div>

          {/* Core Statement (Reading) */}
          <div className="space-y-2">
            <p className="text-sm md:text-base font-semibold text-white leading-relaxed tracking-tight">
              {interp.statement}
            </p>
          </div>

          {/* Caveats / Ressalvas Metodológicas */}
          {interp.caveats && interp.caveats.length > 0 && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-mono font-bold text-[10px] uppercase text-amber-400">
                <AlertTriangle size={12} />
                <span>Ressalvas Metodológicas</span>
              </div>
              <ul className="space-y-0.5 list-disc list-inside text-amber-200/90 leading-relaxed text-[11px]">
                {interp.caveats.map((caveat, idx) => (
                  <li key={idx}>{caveat}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Action & Provenance Toggle */}
          <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between text-xs gap-2">
            {onOpenEvidence && interp.evidenceRefs.length > 0 ? (
              <button
                type="button"
                onClick={() => onOpenEvidence(interp.evidenceRefs)}
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 focus:outline-none transition-colors"
              >
                <span>Ver Rastreabilidade de Evidências ({interp.evidenceRefs.length})</span>
                <ArrowRight size={12} />
              </button>
            ) : (
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <ShieldCheck size={12} className="text-cyan-400" />
                Lineage auditável ({interp.evidenceRefs.length} evidências)
              </span>
            )}

            {interp.modelProvenanceText && (
              <button
                type="button"
                onClick={() => setShowMetadata(!showMetadata)}
                className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 underline underline-offset-2"
              >
                <Info size={10} />
                {showMetadata ? 'Ocultar Provenance' : 'Auditabilidade de IA'}
              </button>
            )}
          </div>

          {/* Provenance Metadata Collapsible Panel */}
          {showMetadata && interp.modelProvenanceText && (
            <div className="p-2.5 bg-[#0B0F19] border border-white/5 rounded-lg text-[10px] font-mono text-slate-400 leading-tight">
              <span className="text-slate-300 font-bold block mb-0.5">Metadados de Execução do Provedor:</span>
              {interp.modelProvenanceText}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
