'use client';

import { useState } from 'react';
import type { ExtractedPollMetadata } from '@/lib/pesquisas/types';
import { MapPin, Info, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface Props {
  metadata: ExtractedPollMetadata;
  rawDadoMunicipio: string | null;
}

export function PollTerritorialCoverage({ metadata, rawDadoMunicipio }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  const coverage = metadata.territorialCoverage?.value;
  const status = coverage?.status ?? 'none';
  const details = coverage?.details;

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-blue-400" />
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">Cobertura Territorial</h3>
        </div>
        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
          {status === 'structured' ? 'Dados Estruturados' : status === 'pending' ? 'Complementação Regimental' : 'Sem Informação'}
        </span>
      </div>

      {status === 'structured' && details && details.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Municípios / Regiões com detalhamento registrado:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {details.map((loc, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs text-white font-medium flex items-center gap-2">
                <MapPin size={13} className="text-blue-400 shrink-0" />
                <span className="truncate">{loc}</span>
              </div>
            ))}
          </div>
        </div>
      ) : status === 'pending' ? (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
          <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300">
              Detalhamento territorial previsto para complementação do registro.
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              O instituto declarou o registro nos termos da Resolução TSE nº 23.600/2019 (art. 2º, §7º), com previsão de anexação detalhada da lista de bairros/municípios em momento posterior.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-gray-500 italic">
          Não há informação de bairros ou municípios específicos no registro oficial do TSE.
        </div>
      )}

      {rawDadoMunicipio && (
        <div className="pt-2 border-t border-white/5">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg bg-white/5"
          >
            <span className="inline-flex items-center gap-1.5">
              <FileText size={13} className="text-blue-400" />
              {showRaw ? 'Ocultar texto original de DS_DADO_MUNICIPIO' : 'Ver texto original de DS_DADO_MUNICIPIO'}
            </span>
            {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showRaw && (
            <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/5 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
              {rawDadoMunicipio}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
