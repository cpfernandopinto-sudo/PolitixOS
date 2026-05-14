'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function XFilterBar({ options }: { options: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');

  const handleChange = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val && val !== 'todos') {
      params.set(key, val);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  const handleSearch = () => {
    handleChange('search', searchValue);
  };

  useEffect(() => {
    setSearchValue(searchParams.get('search') || '');
  }, [searchParams]);

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-wrap gap-4 items-center mb-6">
      <div className="flex-1 min-w-[200px] relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar posts..."
          className="w-full bg-[#0D0D0D] border border-white/10 rounded-lg pl-10 pr-10 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#00FFFF]/50"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        {searchValue && (
          <button onClick={() => { setSearchValue(''); handleChange('search', ''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      <select
        className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        onChange={e => handleChange('candidate', e.target.value)}
        value={searchParams.get('candidate') || 'todos'}
      >
        <option value="todos">Candidato: Todos</option>
        {(options.candidates || []).map((c: any) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <select
        className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        onChange={e => handleChange('period', e.target.value)}
        value={searchParams.get('period') || 'todos'}
      >
        <option value="todos">Período: Todos</option>
        <option value="1">Últimas 24h</option>
        <option value="7">Últimos 7 dias</option>
        <option value="30">Últimos 30 dias</option>
      </select>

      <select
        className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        onChange={e => handleChange('sentiment', e.target.value)}
        value={searchParams.get('sentiment') || 'todos'}
      >
        <option value="todos">Sentimento: Todos</option>
        <option value="positivo">Positivo</option>
        <option value="neutro">Neutro</option>
        <option value="negativo">Negativo</option>
      </select>

      <select
        className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        onChange={e => handleChange('risk', e.target.value)}
        value={searchParams.get('risk') || 'todos'}
      >
        <option value="todos">Risco: Todos</option>
        <option value="baixo">Baixo</option>
        <option value="medio">Médio</option>
        <option value="alto">Alto</option>
        <option value="critico">Crítico</option>
      </select>

      <select
        className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        onChange={e => handleChange('topic', e.target.value)}
        value={searchParams.get('topic') || 'todos'}
      >
        <option value="todos">Tema: Todos</option>
        {options.topics.map((t: string) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
