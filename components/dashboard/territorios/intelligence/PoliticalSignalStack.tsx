'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, Target, ShieldAlert, TrendingUp, RefreshCw, ArrowUpRight } from 'lucide-react';
import { SignalCategory } from '../analytical/SignalCard';

export type SignalPriority = 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO';

export interface PrioritizedSignal {
  id: string;
  category: SignalCategory;
  priority: SignalPriority;
  title: string;
  description: string;
  domains: string[];
  evidenceText?: string;
  sourceNotebookHref?: string;
  sourceNotebookLabel?: string;
}

interface Props {
  signals: PrioritizedSignal[];
  onOpenEvidence?: (signal: PrioritizedSignal) => void;
}

function getPriorityBadge(priority: SignalPriority) {
  switch (priority) {
    case 'CRÍTICO':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold';
    case 'ALTO':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold';
    case 'MÉDIO':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-semibold';
    case 'BAIXO':
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/40 font-semibold';
  }
}

function getCategoryMeta(category: SignalCategory) {
  switch (category) {
    case 'atencao':
      return { label: 'Ponto de Atenção', Icon: AlertCircle };
    case 'oportunidade':
      return { label: 'Oportunidade', Icon: Target };
    case 'risco':
      return { label: 'Risco', Icon: ShieldAlert };
    case 'mudanca':
      return { label: 'Mudança Recente', Icon: RefreshCw };
    case 'tendencia':
    default:
      return { label: 'Tendência', Icon: TrendingUp };
  }
}

export default function PoliticalSignalStack({ signals, onOpenEvidence }: Props) {
  if (!signals || signals.length === 0) {
    return (
      <div className="p-6 text-center border border-white/5 rounded-xl text-slate-500 text-xs italic">
        Nenhum sinal prioritário registrado para o território.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {signals.map((sig) => {
        const catMeta = getCategoryMeta(sig.category);
        const IconComp = catMeta.Icon;
        const priorityBadgeClass = getPriorityBadge(sig.priority);

        return (
          <div
            key={sig.id}
            className="bg-[#111726] border border-white/5 hover:border-cyan-500/30 rounded-xl p-5 transition-all space-y-3 group"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${priorityBadgeClass}`}>
                  Prioridade {sig.priority}
                </span>

                <span className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded flex items-center gap-1">
                  <IconComp size={10} />
                  {catMeta.label}
                </span>
              </div>

              {/* Domains */}
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                <span>Domínio:</span>
                <span className="text-slate-300 font-semibold">{sig.domains.join(' + ')}</span>
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                {sig.title}
              </h4>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed mt-1">
                {sig.description}
              </p>
            </div>

            {sig.evidenceText && (
              <div className="bg-[#0B0F19] p-3 rounded-lg border border-white/5 text-xs text-slate-400 font-mono">
                <strong className="text-slate-300">Evidência Base:</strong> {sig.evidenceText}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              {onOpenEvidence && (
                <button
                  type="button"
                  onClick={() => onOpenEvidence(sig)}
                  className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1 focus:outline-none"
                >
                  <span>Ver Evidências Detalhadas</span>
                </button>
              )}

              {sig.sourceNotebookHref && (
                <Link
                  href={sig.sourceNotebookHref}
                  className="text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1 ml-auto"
                >
                  <span>{sig.sourceNotebookLabel ?? 'Abrir Caderno'}</span>
                  <ArrowUpRight size={12} />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
