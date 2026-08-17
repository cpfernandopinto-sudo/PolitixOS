'use client';

import React from 'react';
import { Database, Clock, FileText, Info } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export interface SourceMetadataPanelProps {
  source?: string;
  dataset?: string;
  period?: string;
  lastUpdated?: string;
  unit?: string;
  methodology?: string;
  notes?: string;
  compact?: boolean;
}

export default function SourceMetadataPanel({
  source,
  dataset,
  period,
  lastUpdated,
  unit,
  methodology,
  notes,
  compact = false,
}: SourceMetadataPanelProps) {
  if (compact) {
    return (
      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          {source && (
            <span className="flex items-center gap-1">
              <Database size={10} className="text-slate-500" />
              <span>{source}</span>
              {dataset ? ` (${dataset})` : ''}
            </span>
          )}
          {unit && <span>· Unidade: {unit}</span>}
        </div>

        <div className="flex items-center gap-2">
          {period && <span>Ref: {period}</span>}
          {lastUpdated && (
            <span className="flex items-center gap-1">
              <Clock size={10} className="text-slate-500" />
              <span>Atualizado: {formatDate(lastUpdated)}</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-4 space-y-2 text-xs">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 font-mono">
          <Database size={13} className="text-cyan-400" />
          <span>Metadados & Transparência da Fonte</span>
        </h4>
        {period && (
          <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            Ano/Período: {period}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-slate-300 font-mono text-[11px]">
        {source && (
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Fonte Oficial</span>
            <span className="font-semibold text-white">{source}</span>
          </div>
        )}
        {dataset && (
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Conjunto de Dados</span>
            <span className="font-semibold text-white">{dataset}</span>
          </div>
        )}
        {unit && (
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Unidade de Medida</span>
            <span className="font-semibold text-white">{unit}</span>
          </div>
        )}
        {lastUpdated && (
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Data da Coleta</span>
            <span className="font-semibold text-white flex items-center gap-1">
              <Clock size={10} className="text-slate-500" /> {formatDate(lastUpdated, true)}
            </span>
          </div>
        )}
      </div>

      {methodology && (
        <div className="pt-2 border-t border-white/5 text-slate-400 text-[11px] leading-relaxed flex items-start gap-1.5">
          <FileText size={12} className="text-cyan-400 shrink-0 mt-0.5" />
          <span><strong>Metodologia:</strong> {methodology}</span>
        </div>
      )}

      {notes && (
        <div className="pt-1 text-slate-400 text-[11px] leading-relaxed flex items-start gap-1.5">
          <Info size={12} className="text-amber-400 shrink-0 mt-0.5" />
          <span><strong>Nota de Defasagem:</strong> {notes}</span>
        </div>
      )}
    </div>
  );
}
