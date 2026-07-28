'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import ActiveFilterChips from '@/components/ui/ActiveFilterChips';

const FILTER_LABELS: Record<string, string> = {
  candidate: 'Candidato',
  period: 'Período',
  sentiment: 'Sentimento',
  risk: 'Risco',
  topic: 'Tema',
  post: 'Post',
};

const PERIOD_LABELS: Record<string, string> = {
  '1': 'Últimas 24h',
  '7': 'Últimos 7 dias',
  '30': 'Últimos 30 dias',
};

export default function InstagramFilterBar({ options }: { options: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val && val !== 'todos') {
      params.set(key, val);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  const chipLabel = (key: string, value: string) => {
    if (key === 'candidate') return options.candidates?.find((c: any) => c.id === value)?.name || value;
    if (key === 'period') return PERIOD_LABELS[value] || value;
    if (key === 'post') return options.posts?.find((p: any) => p.id === value)?.label || value;
    return value;
  };

  const chips = ['candidate', 'period', 'sentiment', 'risk', 'topic', 'post']
    .map((key) => {
      const value = searchParams.get(key);
      if (!value || value === 'todos') return null;
      return { key, label: `${FILTER_LABELS[key]}: ${chipLabel(key, value)}` };
    })
    .filter((c): c is { key: string; label: string } => c !== null);

  const clearAll = () => router.push(window.location.pathname);

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 mb-6 space-y-3">
      <div className="flex flex-wrap gap-4 items-center">
      <select
        className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        onChange={e => handleChange('candidate', e.target.value)}
        defaultValue={searchParams.get('candidate') || ''}
      >
        <option value="todos">Candidato: Todos</option>
        {(options.candidates || []).map((c: any) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <select
        className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        onChange={e => handleChange('period', e.target.value)}
        defaultValue={searchParams.get('period') || ''}
      >
        <option value="todos">Período: Todos</option>
        <option value="1">Últimas 24h</option>
        <option value="7">Últimos 7 dias</option>
        <option value="30">Últimos 30 dias</option>
      </select>

      <select
        className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        onChange={e => handleChange('sentiment', e.target.value)}
        defaultValue={searchParams.get('sentiment') || ''}
      >
        <option value="todos">Sentimento: Todos</option>
        <option value="positivo">Positivo</option>
        <option value="neutro">Neutro</option>
        <option value="negativo">Negativo</option>
      </select>

      <select
        className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        onChange={e => handleChange('risk', e.target.value)}
        defaultValue={searchParams.get('risk') || ''}
      >
        <option value="todos">Risco: Todos</option>
        <option value="baixo">Baixo</option>
        <option value="medio">Médio</option>
        <option value="alto">Alto</option>
      </select>

      <select
        className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        onChange={e => handleChange('topic', e.target.value)}
        defaultValue={searchParams.get('topic') || ''}
      >
        <option value="todos">Tema: Todos</option>
        {options.topics.map((t: string) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 max-w-[200px]"
        onChange={e => handleChange('post', e.target.value)}
        defaultValue={searchParams.get('post') || ''}
      >
        <option value="todos">Post: Todos</option>
        {options.posts.map((p: any) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      </div>

      <ActiveFilterChips
        chips={chips}
        onRemove={(key) => handleChange(key, 'todos')}
        onClearAll={clearAll}
      />
    </div>
  );
}
