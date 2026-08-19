'use client';

import { useState } from 'react';
import type { ElectoralPoll, ExtractedPollMetadata } from '@/lib/pesquisas/types';
import { ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, FileText, UserCheck } from 'lucide-react';

interface Props {
  poll: ElectoralPoll;
  metadata: ExtractedPollMetadata;
}

export function PollQualityControl({ poll, metadata }: Props) {
  const [showFull, setShowFull] = useState(false);

  const rawControl = poll.rawSourceRow?.DS_SISTEMA_CONTROLE;
  const estatistico = poll.rawSourceRow?.NM_ESTATISTICO_RESP;
  const conre = poll.rawSourceRow?.CD_CONRE;

  const controlData = metadata.qualityControl?.value;
  const checkpoints = controlData?.checkpoints ?? [];

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Controle de Qualidade</h3>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">
            Auditoria de Campo
          </span>
        </div>

        {/* Responsável Técnico */}
        {(estatistico || conre) && (
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <UserCheck size={15} className="text-blue-400" />
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Estatístico Responsável</span>
                <span className="font-semibold text-white">{estatistico ?? 'Não informado'}</span>
              </div>
            </div>
            {conre && (
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-medium">
                CONRE: {conre}
              </span>
            )}
          </div>
        )}

        {/* Checkpoints */}
        {checkpoints.length > 0 ? (
          <div className="space-y-2">
            {checkpoints.map((cp, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-gray-200 leading-snug">{cp}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic py-2">
            Sem detalhamento de controle de qualidade no registro oficial.
          </p>
        )}
      </div>

      {rawControl && (
        <div className="pt-3 border-t border-white/5 mt-4">
          <button
            onClick={() => setShowFull(!showFull)}
            className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg bg-white/5"
          >
            <span className="inline-flex items-center gap-1.5">
              <FileText size={13} className="text-blue-400" />
              {showFull ? 'Ocultar procedimento completo' : 'Ver procedimento completo (texto oficial TSE)'}
            </span>
            {showFull ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showFull && (
            <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/5 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
              {rawControl}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
