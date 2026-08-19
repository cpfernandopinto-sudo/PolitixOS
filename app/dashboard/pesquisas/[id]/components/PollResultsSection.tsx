'use client';

import type { ElectoralPollResult } from '@/lib/pesquisas/types';
import { BarChart3, AlertCircle } from 'lucide-react';

interface Props {
  results: ElectoralPollResult[];
}

export function PollResultsSection({ results }: Props) {
  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-400" />
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">Resultados de Intenção de Voto</h3>
        </div>
        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
          {results.length > 0 ? `${results.length} leituras` : 'Aguardando Integração'}
        </span>
      </div>

      {results.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
          <AlertCircle size={24} className="text-gray-500 mx-auto" />
          <p className="text-sm font-semibold text-gray-300">
            Resultados divulgados ainda não integrados para esta pesquisa.
          </p>
          <p className="text-xs text-gray-500 max-w-lg mx-auto leading-relaxed">
            O dataset oficial do TSE/PesqEle contém exclusivamente metadados de registro e metodologia. Os resultados de intenção de voto publicados serão integrados à medida que forem homologados.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors">
              <div>
                <span className="text-white font-medium">{r.candidateName}</span>
                <span className="text-gray-500 text-xs ml-2">
                  ({r.cenario}, {r.turno}º turno, {r.tipoPergunta})
                </span>
              </div>
              <span className="text-blue-400 font-extrabold text-base">{r.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
