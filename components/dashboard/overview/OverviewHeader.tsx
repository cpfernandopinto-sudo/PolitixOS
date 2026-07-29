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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Visão Geral</h1>
          <p className="text-cyan-400/80 text-sm font-semibold uppercase tracking-widest mt-1">Centro Executivo de Inteligência Política</p>
          <p className="text-gray-500 mt-1">Consolidação estratégica de inteligência política multi-canal.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={candidate}
            onChange={(e) => {
              const nextCandidate = e.target.value;
              setCandidate(nextCandidate);
              applyFilters(nextCandidate, period);
            }}
            className="bg-[#1A1A1A] border border-white/10 text-white text-sm rounded-lg px-4 py-2.5 focus:border-cyan-500/50 outline-none transition-all"
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
            className="bg-[#1A1A1A] border border-white/10 text-white text-sm rounded-lg px-4 py-2.5 focus:border-cyan-500/50 outline-none transition-all"
          >
            {Object.entries(PERIOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 border-b border-white/5 pb-4">
        <span>
          Período analisado: <span className="text-gray-300 font-medium">{PERIOD_LABELS[period] || 'Todo período'}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className={isPending ? 'text-cyan-400' : ''}>
            {isPending ? 'Atualizando…' : `Última atualização: ${formattedTime}`}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
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
