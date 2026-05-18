'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import BadgeStatus from './BadgeStatus';
import { Noticia } from '@/lib/queries/noticias';
import type { MencaoRow } from '@/lib/types/noticias';
import InvestigationButton from '@/components/investigations/InvestigationButton';

interface DataTableProps {
  data: Noticia[];
  rawRows?: MencaoRow[];
}

export default function DataTable({ data, rawRows }: DataTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/5 glass">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-[#12192A]/50">
            <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Data</th>
            <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Fonte</th>
            <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[250px]">Título e Análise</th>
            <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Sentimento</th>
            <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Risco</th>
            <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Crise</th>
            <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Relevância</th>
            <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((item) => {
            const raw = rawRows?.find(r => r.id === item.id || r.hash === item.id);
            const showInvestigate = !!raw;

            return (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4 text-sm text-gray-300 whitespace-nowrap">{item.data}</td>
                <td className="p-4 text-sm text-gray-300 whitespace-nowrap">
                  <span className="bg-white/5 px-2 py-1 rounded text-xs">{item.fonte}</span>
                </td>
                <td className="p-4 max-w-md">
                  <p className="text-sm font-semibold text-white mb-1 group-hover:text-[#00FFFF] transition-colors">{item.titulo}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{item.resumo}</p>
                </td>
                <td className="p-4 whitespace-nowrap">
                  <BadgeStatus type="sentimento" value={item.sentimento} />
                </td>
                <td className="p-4 whitespace-nowrap">
                  <BadgeStatus type="risco" value={item.risco} />
                </td>
                <td className="p-4 whitespace-nowrap">
                  <BadgeStatus type="crise" value={item.crise} />
                </td>
                <td className="p-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-[#0D0D0D] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00FFFF]"
                        style={{ width: `${(item.relevancia / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{item.relevancia.toFixed(1)}</span>
                  </div>
                </td>
                <td className="p-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2563EB]/20 transition-all group-hover:border-[#2563EB]/50 border border-transparent"
                    >
                      <ExternalLink size={16} />
                    </a>
                    {showInvestigate && raw && (
                      <InvestigationButton
                        mention={{
                          id: raw.id,
                          candidate_name: raw.candidate_name,
                          candidate_id: raw.candidate_name ?? raw.id,
                          original_title: raw.title ?? item.titulo,
                          original_summary: raw.ai_takeaways ?? raw.summary ?? item.resumo,
                          title: raw.title ?? item.titulo,
                          summary: raw.ai_takeaways ?? raw.summary ?? item.resumo,
                          url: raw.url ?? item.link,
                          source: raw.source,
                          published_at: raw.published_at,
                          city: raw.city,
                        }}
                      />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-[#12192A]/30">
        <span className="text-xs text-gray-500">Total: {data.length} registros</span>
      </div>
    </div>
  );
}
