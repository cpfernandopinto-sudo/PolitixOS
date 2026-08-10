'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

interface Props {
  candidates: { id: string; name: string }[];
  currentCandidate?: string | null;
  currentPeriod?: string | null;
  generatedAt: string;
}

const PERIOD_LABELS: Record<string, string> = {
  all: 'Todo período',
  '1': 'Últimas 24h',
  '7': 'Últimos 7 dias',
  '30': 'Últimos 30 dias',
};

export default function OverviewHeader({ candidates, currentCandidate, currentPeriod, generatedAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [candidate, setCandidate] = useState(currentCandidate || 'todos');
  const [period, setPeriod] = useState(currentPeriod || 'all');

  const applyFilters = (nextCandidate: string, nextPeriod: string) => {
    const params = new URLSearchParams();
    if (nextCandidate !== 'todos') params.set('candidate', nextCandidate);
    params.set('period', nextPeriod);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const formattedTime = new Date(generatedAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const selectClass = 'bg-[var(--surface-2)] border border-white/[0.08] text-white text-sm rounded px-4 h-10 focus:border-cyan-400/50 outline-none transition-all cursor-pointer';

  return (
    // Duas zonas (esquerda: identidade + período; direita: filtros + atualização)
    // numa única fileira com borda inferior
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
      {/* Zona esquerda — identidade da tela */}
      <div className="min-w-0">
        <p role="heading" aria-level={1} className="text-2xl md:text-[28px] font-bold text-white tracking-tight leading-tight">Visão Geral</p>
        <p className="text-cyan-400 text-[11px] font-semibold uppercase tracking-widest mt-1">Centro Executivo de Inteligência Política</p>
        <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">Consolidação estratégica de inteligência política multi-canal.</p>
        <p className="text-xs text-slate-500 mt-2">
          Período analisado: <span className="text-slate-300 font-medium">{PERIOD_LABELS[period] || 'Todo período'}</span>
        </p>
      </div>

      {/* Zona direita — filtros e atualização */}
      <div className="flex flex-col items-start lg:items-end gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={candidate}
            onChange={(e) => {
              const nextCandidate = e.target.value;
              setCandidate(nextCandidate);
              applyFilters(nextCandidate, period);
            }}
            className={selectClass}
          >
            <option value="todos">Todos os Candidatos</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={period}
            onChange={(e) => {
              const nextPeriod = e.target.value;
              setPeriod(nextPeriod);
              applyFilters(candidate, nextPeriod);
            }}
            className={selectClass}
          >
            {Object.entries(PERIOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 whitespace-nowrap">
          <span className={isPending ? 'text-cyan-400' : ''}>
            {isPending ? 'Atualizando…' : `Última atualização: ${formattedTime}`}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw size={12} className={isPending ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}
