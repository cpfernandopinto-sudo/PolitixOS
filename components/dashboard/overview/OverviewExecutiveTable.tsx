'use client';

import { useMemo, useState } from 'react';
import { Newspaper, Search } from 'lucide-react';

interface Row {
  candidato: string;
  canal: string;
  sentimento: string;
  risco: string;
  impacto: string;
  ação: string;
  url?: string;
  source_url?: string;
  link?: string;
  post_url?: string;
  media_url?: string;
  permalink?: string;
  tweet_url?: string;
  raw_json?: unknown;
}

interface Props {
  rows: Row[];
}

function XChannelIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded border border-current/35 font-black leading-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.78), lineHeight: 1 }}
      aria-hidden="true"
    >
      X
    </span>
  );
}

function InstagramChannelIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded border-2 border-current ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="rounded-full border-2 border-current"
        style={{ width: Math.round(size * 0.42), height: Math.round(size * 0.42) }}
      />
      <span
        className="absolute rounded-full bg-current"
        style={{
          width: Math.max(2, Math.round(size * 0.14)),
          height: Math.max(2, Math.round(size * 0.14)),
          right: Math.round(size * 0.18),
          top: Math.round(size * 0.18),
        }}
      />
    </span>
  );
}

function getItemUrl(row: Row) {
  let rawJson = row.raw_json;
  if (typeof rawJson === 'string') {
    try {
      rawJson = JSON.parse(rawJson);
    } catch {
      rawJson = null;
    }
  }
  const parsedJson = rawJson as Record<string, unknown> | null;

  const candidateUrls = [
    row.url,
    row.source_url,
    row.link,
    row.post_url,
    row.media_url,
    row.permalink,
    row.tweet_url,
    parsedJson?.url,
    parsedJson?.source_url,
    parsedJson?.link,
    parsedJson?.post_url,
    parsedJson?.media_url,
    parsedJson?.permalink,
    parsedJson?.tweet_url,
  ];
  const url = candidateUrls.find((value) => typeof value === 'string' && value.trim() && value !== '#') as string | undefined;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function getActionLabel(row: Row) {
  const canal = row.canal?.toLowerCase() || '';
  if (canal.includes('notícia') || canal.includes('noticia')) return 'VER CLIPPING';
  if (canal.includes('instagram')) return 'VER POST';
  if (canal.includes('x') || canal.includes('twitter')) return 'VER ANÁLISE';
  return row['ação'] || 'VER ITEM';
}

function getChannelIcon(canal: string) {
  if (canal === 'Notícias') return <Newspaper size={14} className="text-blue-400" />;
  if (canal === 'Instagram') return <InstagramChannelIcon size={14} className="text-pink-400" />;
  return <XChannelIcon size={14} className="text-cyan-400" />;
}

function normalizeRiskLabel(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getRiskClass(value: string | null | undefined) {
  const risk = normalizeRiskLabel(value);
  if (risk === 'alto' || risk === 'critico') return 'text-red-500 font-bold';
  if (risk === 'medio') return 'text-yellow-400 font-bold';
  return 'text-gray-400';
}

export default function OverviewExecutiveTable({ rows }: Props) {
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.trim().toLowerCase();
    return rows.filter((row) =>
      [row.candidato, row.canal, row.sentimento, row.risco].some((field) => field?.toLowerCase().includes(term))
    );
  }, [rows, search]);

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-white font-bold text-lg">Tabela Executiva de Monitoramento</h3>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar..."
            className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:border-cyan-500/50 outline-none"
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="p-10 text-center text-gray-500 text-sm italic">
          Nenhum item para o período e filtros selecionados.
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="p-10 text-center text-gray-500 text-sm italic">
          Nenhum resultado para &quot;{search}&quot;.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5">
              <tr>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Candidato</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Canal</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sentimento</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Risco</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Impacto</th>
                <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRows.map((row, i) => {
                const actionUrl = getItemUrl(row);
                const actionLabel = getActionLabel(row);
                return (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-white">{row.candidato}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {getChannelIcon(row.canal)}
                        {row.canal}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        row.sentimento?.toLowerCase() === 'positivo' ? 'bg-green-500/10 text-green-500' :
                          row.sentimento?.toLowerCase() === 'negativo' ? 'bg-red-500/10 text-red-500' :
                            'bg-blue-500/10 text-blue-500'
                      }`}>
                        {row.sentimento}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <span className={getRiskClass(row.risco)}>{row.risco}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">{row.impacto}</td>
                    <td className="px-5 py-3">
                      {actionUrl ? (
                        <a
                          href={actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 text-[10px] font-bold hover:text-cyan-300 transition-colors uppercase tracking-wider"
                        >
                          {actionLabel}
                        </a>
                      ) : (
                        <span className="text-gray-600 text-[10px] font-bold uppercase tracking-wider cursor-not-allowed">
                          SEM LINK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
