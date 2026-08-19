'use client';

import { useState } from 'react';
import type { ElectoralPoll } from '@/lib/pesquisas/types';
import { ExternalLink, Database, Code, FileText, X } from 'lucide-react';

interface Props {
  poll: ElectoralPoll;
}

export function PollFooterAuditing({ poll }: Props) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [showFullMethod, setShowFullMethod] = useState(false);

  const dtGeracao = poll.rawSourceRow?.DT_GERACAO;
  const hhGeracao = poll.rawSourceRow?.HH_GERACAO;
  const geracaoStr = dtGeracao ? `${dtGeracao}${hhGeracao ? ` às ${hhGeracao}` : ''}` : 'Não informado';

  const rawMethod = poll.metodologia ?? poll.rawSourceRow?.DS_METODOLOGIA_PESQUISA;

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl text-xs text-gray-400">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gray-300 font-semibold">
            <Database size={14} className="text-blue-400" />
            <span>Auditoria & Proveniência dos Dados</span>
          </div>
          <p className="text-[11px] text-gray-400">
            Fonte: <strong className="text-gray-200">{poll.source}</strong> ({poll.sourceDataset}) · Registro TSE: <strong className="text-gray-200">{poll.tseRegistrationNumber}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {poll.sourceUrl && (
            <a
              href={poll.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition-colors font-medium text-xs"
            >
              Consultar registro original <ExternalLink size={12} />
            </a>
          )}
          {rawMethod && (
            <button
              onClick={() => setShowFullMethod(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors font-medium text-xs"
            >
              <FileText size={12} /> Ver metodologia completa
            </button>
          )}
          {poll.rawSourceRow && (
            <button
              onClick={() => setShowRawJson(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors font-medium text-xs"
            >
              <Code size={12} /> Ver dados originais (JSON)
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-400">
        <span>Geração da base TSE: <strong>{geracaoStr}</strong></span>
        <span>Ingestão no PolitixOS: <strong>{new Date(poll.ingestedAt ?? poll.createdAt).toLocaleString('pt-BR')}</strong></span>
      </div>

      {/* Modal / Dialog para Dados Originais JSON */}
      {showRawJson && poll.rawSourceRow && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12192A] border border-white/10 rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Code size={16} className="text-blue-400" />
                Dados Originais Brutos (TSE / PesqEle CSV Row)
              </h3>
              <button onClick={() => setShowRawJson(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-black/50 p-4 rounded-xl font-mono text-[11px] text-emerald-400 border border-white/5 leading-relaxed">
              <pre>{JSON.stringify(poll.rawSourceRow, null, 2)}</pre>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowRawJson(false)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Metodologia Completa */}
      {showFullMethod && rawMethod && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12192A] border border-white/10 rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <FileText size={16} className="text-blue-400" />
                Metodologia Oficial Registrada no TSE
              </h3>
              <button onClick={() => setShowFullMethod(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-black/50 p-4 rounded-xl text-xs text-gray-200 leading-relaxed border border-white/5 whitespace-pre-wrap font-sans">
              {rawMethod}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowFullMethod(false)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
