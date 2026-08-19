'use client';

import { useState } from 'react';
import type { ElectoralPoll, ExtractedPollMetadata } from '@/lib/pesquisas/types';
import { BookOpen, ChevronDown, ChevronUp, FileText, CheckCircle, HelpCircle } from 'lucide-react';

interface Props {
  poll: ElectoralPoll;
  metadata: ExtractedPollMetadata;
}

export function PollMethodologySection({ poll, metadata }: Props) {
  const [showFull, setShowFull] = useState(false);

  const type = metadata.collectionType?.value ?? 'Não especificado';
  const method = metadata.samplingMethod?.value ?? 'Não especificado';
  const publicTarget = metadata.targetPublic?.value ?? 'Eleitores (16+ anos)';
  const coverage = poll.abrangencia ?? poll.uf ?? 'Brasil';
  const weighting = metadata.weightingInfo?.value;

  const rawText = poll.metodologia ?? poll.rawSourceRow?.DS_METODOLOGIA_PESQUISA;

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-blue-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Metodologia</h3>
          </div>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
            Resumo Executivo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Tipo de Coleta</span>
            <span className="font-semibold text-white block">{type}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Método Amostral</span>
            <span className="font-semibold text-white block truncate" title={method}>{method}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Público-Alvo</span>
            <span className="font-semibold text-white block">{publicTarget}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Abrangência de Registro</span>
            <span className="font-semibold text-white block truncate">{coverage}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 sm:col-span-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Ponderação Amostral</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {weighting?.used ? (
                <>
                  <CheckCircle size={13} className="text-emerald-400" />
                  <span className="font-semibold text-emerald-400">
                    Sim {weighting.variables.length > 0 ? `(${weighting.variables.join(', ')})` : ''}
                  </span>
                </>
              ) : (
                <>
                  <HelpCircle size={13} className="text-gray-500" />
                  <span className="text-gray-400">Não informado explicitamente no texto</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {rawText && (
        <div className="pt-3 border-t border-white/5 mt-4">
          <button
            onClick={() => setShowFull(!showFull)}
            className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg bg-white/5"
          >
            <span className="inline-flex items-center gap-1.5">
              <FileText size={13} className="text-blue-400" />
              {showFull ? 'Ocultar metodologia completa' : 'Ver metodologia completa (texto oficial TSE)'}
            </span>
            {showFull ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showFull && (
            <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/5 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
              {rawText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
