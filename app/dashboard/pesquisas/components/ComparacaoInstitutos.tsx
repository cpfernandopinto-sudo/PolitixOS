'use client';

import type { InstituteComparisonPoint } from '@/lib/pesquisas/types';
import { Building2, Info, Users, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Props {
  comparisonPoints: InstituteComparisonPoint[];
}

export function ComparacaoInstitutos({ comparisonPoints }: Props) {
  if (comparisonPoints.length === 0) {
    return (
      <div className="surface-primary p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-blue-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">
              Comparação Entre Institutos
            </h3>
          </div>
        </div>
        <div className="py-8 px-4 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs text-gray-500 italic">
          Nenhuma comparação de institutos disponível para os filtros selecionados.
        </div>
      </div>
    );
  }

  // Extract all candidate names across comparison points
  const candidateSet = new Set<string>();
  for (const point of comparisonPoints) {
    for (const res of point.results) {
      candidateSet.add(res.candidateName);
    }
  }
  const candidateList = Array.from(candidateSet);

  return (
    <div className="surface-primary p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-blue-400" />
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">
            Comparação Entre Institutos
          </h3>
        </div>
        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
          {comparisonPoints.length} Institutos
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Instituto / Registro</th>
              <th className="py-2.5 px-3">Data / Amostra</th>
              {candidateList.map((cand) => (
                <th key={cand} className="py-2.5 px-3 text-right">
                  {cand}
                </th>
              ))}
              <th className="py-2.5 px-3 text-right">Ficha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {comparisonPoints.map((point) => {
              const resMap = new Map(point.results.map((r) => [r.candidateName, r.percentage]));
              return (
                <tr key={`${point.pollId}-${point.cenario}`} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-semibold text-white block">{point.institute}</span>
                    <span className="text-[10px] text-gray-400 font-mono block">
                      TSE: {point.registrationNumber}
                    </span>
                    {point.cenario && (
                      <span className="text-[10px] text-blue-400/80 block mt-0.5">{point.cenario}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-gray-300 block">{point.fieldDate ?? 'Não informada'}</span>
                    <span className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                      <Users size={10} className="text-blue-400" />{' '}
                      {point.sampleSize ? `${point.sampleSize.toLocaleString('pt-BR')} entr.` : 'N/I'}
                    </span>
                  </td>
                  {candidateList.map((cand) => {
                    const pct = resMap.get(cand);
                    return (
                      <td key={cand} className="py-3 px-3 text-right font-mono font-bold text-blue-400">
                        {pct !== undefined ? `${pct}%` : '-'}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/dashboard/pesquisas/${point.pollId}`}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                    >
                      Ficha <ExternalLink size={11} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-gray-400 flex items-center gap-2">
        <Info size={14} className="text-blue-400 shrink-0" />
        <span>
          <strong className="text-gray-300">Comparação Objetiva:</strong> Os números refletem as pesquisas divulgadas oficialmente sem emissão de score ou ranking moral de institutos.
        </span>
      </div>
    </div>
  );
}
