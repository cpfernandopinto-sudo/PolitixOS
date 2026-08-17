'use client';

import React, { useState } from 'react';
import { ArrowUpDown, Database, Clock } from 'lucide-react';

export interface ColumnConfig<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface AnalyticalTableProps<T extends Record<string, unknown>> {
  title?: string;
  subtitle?: string;
  columns: ColumnConfig<T>[];
  data: T[];
  source?: string;
  period?: string;
  emptyText?: string;
}

export default function AnalyticalTable<T extends Record<string, unknown>>({
  title,
  subtitle,
  columns,
  data,
  source,
  period,
  emptyText = 'Nenhum dado encontrado para exibição.',
}: AnalyticalTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [data, sortKey, sortOrder]);

  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-4 md:p-6 space-y-4">
      {title && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>

          {period && (
            <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2.5 py-0.5 rounded border border-white/10 self-start sm:self-auto">
              Período: {period}
            </span>
          )}
        </div>
      )}

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                  className={`pb-2.5 px-2 ${col.sortable ? 'cursor-pointer hover:text-white select-none' : ''} ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    <span>{col.header}</span>
                    {col.sortable && <ArrowUpDown size={10} className="opacity-60" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center text-slate-500 text-xs italic">
                  {emptyText}
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  {columns.map((col) => {
                    const value = row[String(col.key)];
                    return (
                      <td
                        key={String(col.key)}
                        className={`py-2.5 px-2 text-slate-300 font-medium ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(row) : String(value ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {source && (
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <Database size={10} /> Fonte: {source}
          </span>
          {period && (
            <span className="flex items-center gap-1">
              <Clock size={10} /> {period}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
