'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect } from 'react';
import { Filter, RotateCcw, Search, X } from 'lucide-react';

export default function XFilterBar({ options }: { options: { candidates: Array<{ id: string; name: string }>; topics: string[] } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');

  useEffect(() => {
    setSearchValue(searchParams.get('search') || '');
  }, [searchParams]);

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value && value !== 'todos' && value !== 'ALL') next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    startTransition(() => router.replace(`?${next.toString()}`, { scroll: false }));
  }

  function handleSearchSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    update({ search: searchValue.trim() || null });
  }

  const fields = (
    <>
      <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar conteúdos, autores ou termos..."
          className="h-9 w-full rounded-md border border-white/10 bg-[#0b1120] pl-9 pr-8 text-xs text-slate-200 outline-none focus:border-cyan-400"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        {searchValue ? (
          <button
            type="button"
            onClick={() => {
              setSearchValue('');
              update({ search: null });
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X size={13} />
          </button>
        ) : null}
      </form>

      <FilterSelect
        label="Origem"
        value={searchParams.get('origin') ?? 'todos'}
        onChange={(val) => update({ origin: val })}
        options={[
          ['todos', 'Todas as origens'],
          ['OWNED', 'Publicações do Candidato'],
          ['EXTERNAL', 'Menções Externas'],
        ]}
      />

      <FilterSelect
        label="Sentimento"
        value={searchParams.get('sentiment') ?? 'todos'}
        onChange={(val) => update({ sentiment: val })}
        options={[
          ['todos', 'Todos os sentimentos'],
          ['positivo', 'Positivo'],
          ['neutro', 'Neutro'],
          ['misto', 'Misto'],
          ['negativo', 'Negativo'],
        ]}
      />

      <FilterSelect
        label="Risco"
        value={searchParams.get('risk') ?? 'todos'}
        onChange={(val) => update({ risk: val })}
        options={[
          ['todos', 'Todos os riscos'],
          ['baixo', 'Baixo'],
          ['medio', 'Médio'],
          ['alto', 'Alto'],
          ['critico', 'Crítico'],
        ]}
      />

      {options.topics.length > 0 ? (
        <FilterSelect
          label="Tema"
          value={searchParams.get('topic') ?? 'todos'}
          onChange={(val) => update({ topic: val })}
          options={[
            ['todos', 'Todos os temas'],
            ...options.topics.map((t) => [t, t] as [string, string]),
          ]}
        />
      ) : null}

      <button
        type="button"
        onClick={() => {
          setSearchValue('');
          update({ origin: null, sentiment: null, risk: null, topic: null, search: null });
        }}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-white/10 px-3 text-xs text-slate-300 hover:border-cyan-400/50 hover:text-white transition-colors whitespace-nowrap shrink-0"
      >
        <RotateCcw size={13} /> Limpar Filtros
      </button>
    </>
  );

  return (
    <div
      className={`border-b border-white/10 py-2.5 ${pending ? 'opacity-70' : ''}`}
      aria-busy={pending}
    >
      <div className="hidden flex-wrap items-end gap-3 md:flex">{fields}</div>
      <details className="md:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-slate-200">
          <Filter size={15} /> Filtros do Módulo X
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
    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
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
