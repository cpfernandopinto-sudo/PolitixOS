'use client';

import React, { useState, useMemo } from 'react';
import { ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import BadgeStatus from './BadgeStatus';
import type { Noticia, MencaoRow } from '@/lib/types/noticias';
import InvestigationButton from '@/components/investigations/InvestigationButton';

interface DataTableProps {
  data: Noticia[];
  rawRows?: MencaoRow[];
  onSelectNews?: (news: Noticia, raw?: MencaoRow) => void;
}

// Auxiliar para converter a data string formatada (dd/mm/yyyy hh:mm) em timestamp
function parseDate(dateStr: string): number {
  if (!dateStr || dateStr === '—') return 0;
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart) return 0;
  const [day, month, year] = datePart.split('/').map(Number);
  const [hour, minute] = (timePart || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
}

export default function DataTable({ data, rawRows, onSelectNews }: DataTableProps) {
  // Estados de ordenação
  const [sortField, setSortField] = useState<'data' | 'sentimento' | 'risco' | 'relevancia' | 'candidato' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Resetar página quando os dados mudarem (ex: filtros ativados)
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setCurrentPage(1);
  }

  // Handler de ordenação
  const handleSort = (field: 'data' | 'sentimento' | 'risco' | 'relevancia' | 'candidato') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Ícone indicador de ordenação nas colunas
  const renderSortIcon = (field: 'data' | 'sentimento' | 'risco' | 'relevancia' | 'candidato') => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="inline ml-1 text-slate-500 opacity-40 hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="inline ml-1 text-[#00FFFF]" />
    ) : (
      <ArrowDown size={12} className="inline ml-1 text-[#00FFFF]" />
    );
  };

  // Dados ordenados
  const sortedData = useMemo(() => {
    if (!sortField) return data;

    const sorted = [...data];
    sorted.sort((a, b) => {
      if (sortField === 'candidato') {
        const aName = a.candidato;
        const bName = b.candidato;
        if (!aName && !bName) return 0;
        if (!aName) return 1;
        if (!bName) return -1;
        const comp = aName.localeCompare(bName, 'pt-BR', { sensitivity: 'base' });
        return sortDirection === 'asc' ? comp : -comp;
      }

      let aVal: string | number = a[sortField] ?? '';
      let bVal: string | number = b[sortField] ?? '';

      if (sortField === 'data') {
        aVal = parseDate(a.data);
        bVal = parseDate(b.data);
      } else if (sortField === 'risco') {
        const riskWeights = { baixo: 0, médio: 1, alto: 2 };
        aVal = riskWeights[a.risco] ?? 0;
        bVal = riskWeights[b.risco] ?? 0;
      } else if (sortField === 'sentimento') {
        const sentimentWeights = { negativo: 0, neutro: 1, positivo: 2 };
        aVal = sentimentWeights[a.sentimento] ?? 0;
        bVal = sentimentWeights[b.sentimento] ?? 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, sortField, sortDirection]);

  // Dados paginados
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handleRowClick = (item: Noticia, raw?: MencaoRow) => {
    if (onSelectNews) {
      onSelectNews(item, raw);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-blue-300/10 bg-[#0E1727] overflow-hidden shadow-2xl flex flex-col">
      {/* Container com scroll vertical e header fixo */}
      <div className="w-full max-h-[520px] overflow-y-auto relative">
        <table className="w-full text-left border-collapse table-auto" style={{ minWidth: '1380px' }}>
          <thead>
            <tr className="sticky top-0 z-20 bg-[#0E1727] border-b border-blue-300/15 shadow-[0_1px_0_rgba(147,197,253,0.15)]">
              <th
                onClick={() => handleSort('data')}
                className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer select-none hover:text-white transition-colors"
                style={{ width: '140px', minWidth: '140px' }}
              >
                Data {renderSortIcon('data')}
              </th>
              <th
                className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none"
                style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }}
              >
                Fonte
              </th>
              <th
                onClick={() => handleSort('candidato')}
                className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer select-none hover:text-white transition-colors"
                style={{ width: '170px', minWidth: '170px', maxWidth: '170px' }}
              >
                Candidato {renderSortIcon('candidato')}
              </th>
              <th
                className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none"
                style={{ minWidth: '280px' }}
              >
                Título e Análise
              </th>
              <th
                onClick={() => handleSort('sentimento')}
                className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer select-none hover:text-white transition-colors"
                style={{ width: '100px', minWidth: '100px' }}
              >
                Sentimento {renderSortIcon('sentimento')}
              </th>
              <th
                onClick={() => handleSort('risco')}
                className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer select-none hover:text-white transition-colors"
                style={{ width: '100px', minWidth: '100px' }}
              >
                Risco {renderSortIcon('risco')}
              </th>
              <th
                className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none"
                style={{ width: '80px', minWidth: '80px' }}
              >
                Crise
              </th>
              <th
                onClick={() => handleSort('relevancia')}
                className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer select-none hover:text-white transition-colors"
                style={{ width: '110px', minWidth: '110px' }}
              >
                Relevância {renderSortIcon('relevancia')}
              </th>
              <th
                className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none text-right"
                style={{ width: '100px', minWidth: '100px' }}
              >
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => {
                const raw = rawRows?.find((r) => r.id === item.id || r.hash === item.id);
                const showInvestigate = !!raw;

                return (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    onClick={() => handleRowClick(item, raw)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleRowClick(item, raw);
                      }
                    }}
                    className="cursor-pointer hover:bg-white/[0.02] transition-colors group focus-visible:bg-blue-500/[0.06]"
                    aria-label={`Abrir detalhes: ${item.titulo}`}
                  >
                    <td className="p-3 text-xs text-slate-300 whitespace-nowrap" style={{ width: '140px', minWidth: '140px' }}>{item.data}</td>
                    <td className="p-3 text-xs text-slate-300 whitespace-nowrap" style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }}>
                      <span
                        title={item.fonte}
                        className="bg-blue-950/40 border border-blue-300/10 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-300 block truncate max-w-[130px]"
                      >
                        {item.fonte}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap" style={{ width: '170px', minWidth: '170px', maxWidth: '170px' }}>
                      <span
                        title={item.candidato || 'Não identificado'}
                        className="block max-w-[150px] truncate text-[11px] font-medium text-slate-300"
                      >
                        {item.candidato || 'Não identificado'}
                      </span>
                    </td>
                    <td className="p-3" style={{ minWidth: '280px' }}>
                      <p className="text-xs font-bold text-white mb-0.5 group-hover:text-[#00FFFF] transition-colors leading-snug">
                        {item.titulo}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 leading-normal">
                        {item.resumo}
                      </p>
                    </td>
                    <td className="p-3 whitespace-nowrap" style={{ width: '100px', minWidth: '100px' }}>
                      <BadgeStatus type="sentimento" value={item.sentimento} />
                    </td>
                    <td className="p-3 whitespace-nowrap" style={{ width: '100px', minWidth: '100px' }}>
                      <BadgeStatus type="risco" value={item.risco} />
                    </td>
                    <td className="p-3 whitespace-nowrap" style={{ width: '80px', minWidth: '80px' }}>
                      <BadgeStatus type="crise" value={item.crise} />
                    </td>
                    <td className="p-3 whitespace-nowrap" style={{ width: '110px', minWidth: '110px' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-black/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-[#00FFFF]"
                            style={{ width: `${(item.relevancia / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {item.relevancia.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-right" style={{ width: '100px', minWidth: '100px' }} onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir fonte original"
                          aria-label="Abrir fonte original"
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all"
                        >
                          <ExternalLink size={14} />
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
              })
            ) : (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500 italic text-sm">
                  Nenhum registro encontrado nesta página.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer com Paginação e Totalizadores */}
      <div className="p-3.5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0B1423]">
        <span className="text-xs text-slate-500">
          Mostrando {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} a{' '}
          {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length} registros
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-xs rounded-lg bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/15 text-slate-300 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all font-semibold uppercase tracking-wider"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-400 px-2 font-medium">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-xs rounded-lg bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/15 text-slate-300 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all font-semibold uppercase tracking-wider"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
