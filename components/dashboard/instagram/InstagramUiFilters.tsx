'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import type { InstagramUiContract } from '@/lib/types/instagram-ui';

type Props = { options: InstagramUiContract['filterOptions'] };

const SENTIMENT_OPTIONS: Array<[string, string]> = [
  ['all', 'Todos'],
  ['positivo', 'Positivo'],
  ['neutro', 'Neutro'],
  ['misto', 'Misto'],
  ['negativo', 'Negativo'],
];

export default function InstagramUiFilters({ options }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    startTransition(() => router.replace(`?${next.toString()}`, { scroll: false }));
  }

  const fields = (
    <>
      <FilterSelect
        label="Formato"
        value={searchParams.get('format') ?? 'all'}
        onChange={(value) => update({ format: value === 'all' ? null : value })}
        options={[['all', 'Todos os formatos'], ...options.formats.map((value) => [value, value] as [string, string])]}
      />
      <FilterSelect
        label="Risco"
        value={searchParams.get('risk') ?? 'all'}
        onChange={(value) => update({ risk: value === 'all' ? null : value })}
        options={[['all', 'Todos os riscos'], ...options.risks.map((value) => [value, value] as [string, string])]}
      />
      <FilterSelect
        label="Sentimento"
        value={searchParams.get('sentiment') ?? 'all'}
        onChange={(value) => update({ sentiment: value === 'all' ? null : value })}
        options={SENTIMENT_OPTIONS}
      />
      <button
        type="button"
        onClick={() => update({ format: null, risk: null, sentiment: null, topic: null })}
        className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 px-3 text-xs text-slate-300 hover:border-cyan-400/50 hover:text-white"
      >
        <RotateCcw size={14} /> Limpar Filtros
      </button>
    </>
  );

  return (
    <div
      className={`sticky top-0 z-30 border-b border-white/10 bg-[#070b14]/95 py-2.5 backdrop-blur ${pending ? 'opacity-70' : ''}`}
      aria-busy={pending}
    >
      <div className="hidden grid-cols-4 items-end gap-3 md:grid max-w-4xl">{fields}</div>
      <details className="md:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-200">
          <Filter size={16} /> Filtros Específicos
        </summary>
        <div className="mt-3 grid gap-3">{fields}</div>
      </details>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-slate-500">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-white/10 bg-[#0b1120] px-3 text-xs text-slate-200 outline-none focus:border-cyan-400"
      >
        {options.map(([optionValue, text]) => (
          <option key={optionValue} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

