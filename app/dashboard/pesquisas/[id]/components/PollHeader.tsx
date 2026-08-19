'use client';

import type { ElectoralPoll } from '@/lib/pesquisas/types';
import { ShieldCheck, CheckCircle2, AlertCircle, Building2, Calendar, MapPin, Briefcase } from 'lucide-react';

interface Props {
  poll: ElectoralPoll;
  hasResults: boolean;
}

export function PollHeader({ poll, hasResults }: Props) {
  const isPropria = poll.rawSourceRow?.ST_PESQUISA_PROPRIA === 'S';
  const rawDivulgacao = poll.rawSourceRow?.DT_DIVULGACAO;
  const divulgacaoDate = rawDivulgacao ? rawDivulgacao.split(' ')[0] : null;

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={13} />
            OFICIAL TSE
          </span>
          {isPropria && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Building2 size={13} />
              PESQUISA PRÓPRIA
            </span>
          )}
          {hasResults ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CheckCircle2 size={13} />
              RESULTADOS DISPONÍVEIS
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle size={13} />
              RESULTADOS PENDENTES
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 font-mono">
          Protocolo TSE: <strong className="text-gray-300 font-bold">{poll.tseRegistrationNumber}</strong>
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {poll.instituto ?? 'Instituto não informado'}
          </h1>
          <p className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Briefcase size={13} className="text-blue-400" /> Cargo(s): <strong className="text-gray-200 font-medium">{poll.cargo ?? 'Não informado'}</strong>
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} className="text-blue-400" /> Registro: <strong className="text-gray-200 font-medium">{poll.abrangencia ?? poll.uf ?? 'Brasil'}</strong>
            </span>
            {divulgacaoDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={13} className="text-blue-400" /> Divulgação prevista: <strong className="text-gray-200 font-medium">{divulgacaoDate}</strong>
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
