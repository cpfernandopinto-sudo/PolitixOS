'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import type { InstagramUiContract } from '@/lib/types/instagram-ui';

type Props = { options: InstagramUiContract['filterOptions'] };

export default function InstagramUiFilters({ options }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const selected = new Set((searchParams.get('candidates') ?? '').split(',').filter(Boolean));

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
      <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[.12em] text-slate-500">
        Candidatos
        <select
          aria-label="Candidatos"
          multiple
          value={[...selected]}
          onChange={(event) => {
            const ids = [...event.currentTarget.selectedOptions].map((option) => option.value);
            update({ candidates: ids.join(',') || null, mode: ids.length ? 'selected' : null, candidate: null, candidateId: null });
          }}
          className="mt-1 h-10 w-full min-w-44 rounded-md border border-white/10 bg-[#0b1120] px-3 text-xs normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-400"
        >
          {options.candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select>
      </label>
      <FilterSelect label="Período" value={searchParams.get('period') ?? 'all'} onChange={(value) => update({ period: value === 'all' ? null : value })} options={[['all', 'Todo o período'], ['1', '24 horas'], ['7', '7 dias'], ['30', '30 dias']]} />
      <FilterSelect label="Formato" value={searchParams.get('format') ?? 'all'} onChange={(value) => update({ format: value === 'all' ? null : value })} options={[['all', 'Todos'], ...options.formats.map((value) => [value, value] as [string, string])]} />
      <FilterSelect label="Risco" value={searchParams.get('risk') ?? 'all'} onChange={(value) => update({ risk: value === 'all' ? null : value })} options={[['all', 'Todos'], ...options.risks.map((value) => [value, value] as [string, string])]} />
      <button type="button" onClick={() => update({ candidates: null, mode: null, candidate: null, candidateId: null, period: null, format: null, risk: null })} className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 px-3 text-xs text-slate-300 hover:border-cyan-400/50 hover:text-white">
        <RotateCcw size={14} /> Limpar
      </button>
    </>
  );

  return (
    <div className={`sticky top-0 z-30 border-b border-white/10 bg-[#070b14]/95 py-3 backdrop-blur ${pending ? 'opacity-70' : ''}`} aria-busy={pending}>
      <div className="hidden grid-cols-[minmax(176px,1.6fr)_repeat(3,minmax(130px,1fr))_auto] gap-3 xl:grid">{fields}</div>
      <details className="xl:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-200"><Filter size={16} /> Filtros da análise</summary>
        <div className="mt-3 grid gap-3">{fields}</div>
      </details>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-slate-500">
      {label}
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-[#0b1120] px-3 text-xs normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-400">
        {options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}
      </select>
    </label>
  );
}
