'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import PoliticalSignalStack, { PrioritizedSignal } from '../intelligence/PoliticalSignalStack';

export interface PrioritySignalsSectionProps {
  signals: PrioritizedSignal[];
  ibge: string;
  onOpenEvidence?: (sig: PrioritizedSignal) => void;
}

export default function PrioritySignalsSection({
  signals,
  ibge,
  onOpenEvidence,
}: PrioritySignalsSectionProps) {
  const topSignals = signals.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
            Sinais Prioritários em Destaque (Top {topSignals.length})
          </h3>
        </div>

        <Link
          href={`/dashboard/territorios/${ibge}/inteligencia-politica`}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold font-mono flex items-center gap-1"
        >
          <span>Ver Todos os Sinais</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      <PoliticalSignalStack signals={topSignals} onOpenEvidence={onOpenEvidence} />
    </div>
  );
}
