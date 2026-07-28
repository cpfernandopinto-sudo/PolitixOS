'use client';

import { LayoutGrid, TableProperties } from 'lucide-react';

interface Props {
  value: 'feed' | 'table';
  onChange: (value: 'feed' | 'table') => void;
}

/** Alternância Feed/Tabela, reutilizável entre módulos. */
export default function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center bg-[#0D0D0D] border border-white/10 rounded-lg p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange('feed')}
        aria-pressed={value === 'feed'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
          value === 'feed' ? 'bg-cyan-500/15 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <LayoutGrid size={13} /> Feed
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={value === 'table'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
          value === 'table' ? 'bg-cyan-500/15 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <TableProperties size={13} /> Tabela
      </button>
    </div>
  );
}
