'use client';

import React from 'react';
import { GitCompare } from 'lucide-react';

export interface ComparisonRow {
  label: string;
  municipioValue: number | string;
  rmbhValue?: number | string;
  mgValue?: number | string;
  brazilValue?: number | string;
  previousValue?: number | string;
  unit?: string;
}

export interface ComparisonPanelProps {
  title: string;
  subtitle?: string;
  rows: ComparisonRow[];
  municipioName?: string;
}

export default function ComparisonPanel({
  title,
  subtitle,
  rows,
  municipioName = 'Município',
}: ComparisonPanelProps) {
  const hasRmbh = rows.some((r) => r.rmbhValue !== undefined);
  const hasMg = rows.some((r) => r.mgValue !== undefined);
  const hasBrazil = rows.some((r) => r.brazilValue !== undefined);
  const hasPrevious = rows.some((r) => r.previousValue !== undefined);

  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 md:p-6 space-y-4 overflow-x-auto">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <GitCompare size={15} className="text-cyan-400" />
            <span>{title}</span>
          </h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <table className="w-full text-left text-xs whitespace-nowrap">
        <thead>
          <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
            <th className="pb-2.5 font-bold">Indicador</th>
            <th className="pb-2.5 text-cyan-400 font-extrabold">{municipioName}</th>
            {hasPrevious && <th className="pb-2.5">Anterior</th>}
            {hasRmbh && <th className="pb-2.5">RMBH (Média)</th>}
            {hasMg && <th className="pb-2.5">MG (Média)</th>}
            {hasBrazil && <th className="pb-2.5">Brasil (Média)</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => (
            <tr key={row.label} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 font-medium text-slate-300">{row.label}</td>
              <td className="py-2.5 font-bold text-white text-sm font-mono">
                {row.municipioValue} {row.unit}
              </td>
              {hasPrevious && (
                <td className="py-2.5 font-mono text-slate-400">
                  {row.previousValue ?? '—'} {row.unit}
                </td>
              )}
              {hasRmbh && (
                <td className="py-2.5 font-mono text-slate-400">
                  {row.rmbhValue ?? '—'} {row.unit}
                </td>
              )}
              {hasMg && (
                <td className="py-2.5 font-mono text-slate-400">
                  {row.mgValue ?? '—'} {row.unit}
                </td>
              )}
              {hasBrazil && (
                <td className="py-2.5 font-mono text-slate-400">
                  {row.brazilValue ?? '—'} {row.unit}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
