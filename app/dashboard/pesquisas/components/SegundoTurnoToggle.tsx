'use client';

import { Layers } from 'lucide-react';

interface Props {
  turno: number;
  onChange: (turno: number) => void;
}

export function SegundoTurnoToggle({ turno, onChange }: Props) {
  return (
    <div className="surface-primary p-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2 text-xs text-gray-300 font-semibold px-2">
        <Layers size={15} className="text-blue-400" />
        <span>Cenário Eleitoral:</span>
      </div>

      <div className="flex items-center gap-2 bg-[#0b0f19] p-1 rounded-xl border border-white/5">
        <button
          onClick={() => onChange(1)}
          className={`text-xs px-4 py-1.5 rounded-lg font-bold transition-colors ${
            turno === 1
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          1º Turno (Geral)
        </button>
        <button
          onClick={() => onChange(2)}
          className={`text-xs px-4 py-1.5 rounded-lg font-bold transition-colors ${
            turno === 2
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          2º Turno (Simulação Directa)
        </button>
      </div>
    </div>
  );
}
