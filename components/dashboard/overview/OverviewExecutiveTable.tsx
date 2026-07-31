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
  return 'text-slate-400';
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
    <div className="surface-primary overflow-hidden">
      <div className="p-4 border-b border-blue-300/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-white font-bold text-base tracking-tight">Tabela Executiva de Monitoramento</h3>
          <p className="text-xs text-slate-500 mt-0.5">Itens do período e filtros selecionados, com ação direta para a fonte.</p>
        </div>
        <label className="relative shrink-0">
          <span className="sr-only">Pesquisar na tabela</span>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar candidato, canal, sentimento…"
            className="w-full sm:w-64 bg-black/20 border border-blue-300/15 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none transition-colors focus:border-cyan-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/40"
          />
        </label>
      </div>
      {rows.length === 0 ? (
        <div className="p-10 text-center text-slate-500 text-sm italic">
          Nenhum item para o período e filtros selecionados.
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="p-10 text-center text-slate-500 text-sm italic">
          Nenhum resultado para &quot;{search}&quot;.
        </div>
      ) : (
        <div className="relative">
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-left">
              <thead className="bg-blue-500/5 sticky top-0 z-[1] backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidato</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Canal</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sentimento</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risco</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impacto</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRows.map((row, i) => {
                  const actionUrl = getItemUrl(row);
                  const actionLabel = getActionLabel(row);
                  return (
                    <tr key={i} className="hover:bg-blue-500/5 transition-colors">
                      <td className="px-4 py-2 text-sm font-medium text-white">{row.candidato}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {getChannelIcon(row.canal)}
                          {row.canal}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          row.sentimento?.toLowerCase() === 'positivo' ? 'bg-green-500/10 text-green-500' :
                            row.sentimento?.toLowerCase() === 'negativo' ? 'bg-red-500/10 text-red-500' :
                              'bg-blue-500/10 text-blue-500'
                        }`}>
                          {row.sentimento}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <span className={getRiskClass(row.risco)}>{row.risco}</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-400">{row.impacto}</td>
                      <td className="px-4 py-2">
                        {actionUrl ? (
                          <a
                            href={actionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 text-[10px] font-bold hover:text-cyan-300 transition-colors uppercase tracking-wider focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/60 rounded"
                          >
                            {actionLabel}
                          </a>
                        ) : (
                          <span className="text-slate-600 text-[10px] font-bold uppercase tracking-wider cursor-not-allowed">
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
          {/* Fade nas extremidades do scroll vertical — sensação de componente premium, puramente visual. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#101827] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#101827] to-transparent" />
        </div>
      )}
    </div>
  );
}
