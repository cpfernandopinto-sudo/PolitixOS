'use client';

import { X } from 'lucide-react';

export interface FilterChip {
  key: string;
  label: string;
}

interface Props {
  chips: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
}

/**
 * Chips de filtros ativos, reutilizável entre módulos (Notícias, Instagram,
 * X, Central de Alertas). Não decide o que é um filtro válido — recebe a
 * lista já resolvida pelo componente de filtros do módulo.
 */
export default function ActiveFilterChips({ chips, onRemove, onClearAll }: Props) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filtros ativos:</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove(chip.key)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/20 hover:bg-[#00FFFF]/20 transition-colors"
        >
          {chip.label}
          <X size={12} />
        </button>
      ))}
      {onClearAll && chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-bold text-red-400/80 hover:text-red-400 transition-colors underline underline-offset-2"
        >
          Limpar todos
        </button>
      )}
    </div>
  );
}
