'use client';

import { useState } from 'react';
import type { ElectoralPoll } from '@/lib/pesquisas/types';
import { FileText, ChevronRight, MapPin, Calendar, Building2 } from 'lucide-react';
import Link from 'next/link';

interface Props {
  polls: ElectoralPoll[];
}

export function ListaPesquisasRecentes({ polls }: Props) {
  const [showAll, setShowAll] = useState(false);

  const visiblePolls = showAll ? polls : polls.slice(0, 5);

  return (
    <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-400" />
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">
            Pesquisas Registradas no TSE ({polls.length})
          </h3>
        </div>
        {polls.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-blue-400 hover:underline font-semibold"
          >
            {showAll ? 'Mostrar 5 mais recentes' : `Ver todas (${polls.length})`}
          </button>
        )}
      </div>

      {polls.length === 0 ? (
        <p className="text-gray-500 text-xs py-6 text-center italic">
          Nenhuma pesquisa registrada no banco para os filtros selecionados.
        </p>
      ) : (
        <div className="space-y-2">
          {visiblePolls.map((poll) => (
            <Link
              key={poll.id}
              href={`/dashboard/pesquisas/${poll.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-colors group text-xs"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold truncate">
                    {poll.instituto ?? 'Instituto não informado'}
                  </span>
                  <span className="text-gray-400 font-medium truncate">
                    — {poll.cargo ?? 'Cargo não informado'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Building2 size={11} className="text-blue-400" /> TSE: <strong className="text-gray-300">{poll.tseRegistrationNumber}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} className="text-blue-400" /> UE: <strong className="text-gray-300">{poll.abrangencia ?? poll.uf ?? 'Brasil'}</strong>
                  </span>
                  {poll.campoFim && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} className="text-blue-400" /> Campo: <strong className="text-gray-300">{poll.campoFim}</strong>
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
