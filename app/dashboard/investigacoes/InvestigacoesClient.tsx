'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, FileSearch, ShieldAlert, Clock, ExternalLink,
  Filter, ChevronRight, AlertTriangle
} from 'lucide-react';
import type { Investigation } from '@/lib/types/investigations';
import clsx from 'clsx';

interface Props {
  investigations: Investigation[];
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-500/15 text-green-400 border-green-500/25',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  critical: 'bg-red-500/15 text-red-400 border-red-500/25',
};

const RISK_LABELS: Record<string, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  critical: 'Crítico',
};

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  completed: 'bg-green-500/15 text-green-400 border-green-500/25',
  error: 'bg-red-500/15 text-red-400 border-red-500/25',
  partial: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
};

const STATUS_LABELS: Record<string, string> = {
  running: 'Processando',
  completed: 'Concluído',
  error: 'Erro',
  partial: 'Concluído com ressalvas',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

/**
 * Estado exibido na lista — só de apresentação, nunca escrito de volta ao
 * banco. Uma investigação com status técnico `error` NUNCA deve aparecer
 * como "Concluído": quando há conteúdo parcial (resumo ou relatório bruto),
 * ela é rotulada como "Concluído com ressalvas" (visível, mas sinalizada);
 * sem nenhum conteúdo, continua como "Erro".
 */
function getDisplayStatus(inv: Investigation): 'running' | 'completed' | 'error' | 'partial' {
  if (inv.status === 'error') {
    return (inv.executive_summary || inv.full_report != null) ? 'partial' : 'error';
  }
  return inv.status;
}

export default function InvestigacoesClient({ investigations }: Props) {
  const [search, setSearch] = useState('');
  const [filterCandidate, setFilterCandidate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterCrisis, setFilterCrisis] = useState('');

  const candidates = useMemo(() => {
    const names = [...new Set(investigations.map(i => i.candidate_name).filter(Boolean))];
    return names as string[];
  }, [investigations]);

  const filtered = useMemo(() => {
    return investigations.filter(inv => {
      const q = search.toLowerCase();
      if (q && ![inv.original_title, inv.candidate_name, inv.source, inv.city].some(
        f => f?.toLowerCase().includes(q)
      )) return false;
      if (filterCandidate && inv.candidate_name !== filterCandidate) return false;
      if (filterStatus && getDisplayStatus(inv) !== filterStatus) return false;
      if (filterRisk && inv.risk_level !== filterRisk) return false;
      if (filterCrisis && inv.crisis_potential !== filterCrisis) return false;
      return true;
    });
  }, [investigations, search, filterCandidate, filterStatus, filterRisk, filterCrisis]);

  const hasFilters = search || filterCandidate || filterStatus || filterRisk || filterCrisis;
  const clearFilters = () => {
    setSearch('');
    setFilterCandidate('');
    setFilterStatus('');
    setFilterRisk('');
    setFilterCrisis('');
  };

  if (investigations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-gray-500">
        <FileSearch size={56} className="text-gray-600" />
        <p className="text-lg font-medium text-gray-400">Nenhuma investigação encontrada</p>
        <p className="text-sm text-center max-w-sm">
          Inicie uma investigação a partir de uma notícia crítica no Radar de Notícias.
        </p>
        <Link
          href="/dashboard/noticias"
          className="mt-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
        >
          Ir para Radar de Notícias
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="glass rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-500" />
          <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Filtros</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-gray-400 hover:text-white transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, candidato, fonte..."
              className="w-full bg-[#0D0D0D] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <select
            value={filterCandidate}
            onChange={e => setFilterCandidate(e.target.value)}
            className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="">Todos os candidatos</option>
            {candidates.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="">Todos os status</option>
            <option value="running">Processando</option>
            <option value="completed">Concluído</option>
            <option value="partial">Concluído com ressalvas</option>
            <option value="error">Erro</option>
          </select>

          <select
            value={filterRisk}
            onChange={e => setFilterRisk(e.target.value)}
            className="bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="">Todos os riscos</option>
            <option value="low">Baixo</option>
            <option value="medium">Médio</option>
            <option value="high">Alto</option>
            <option value="critical">Crítico</option>
          </select>
        </div>
      </div>

      {/* Contagem */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {filtered.length} investigação{filtered.length !== 1 ? 'ões' : ''}
          {hasFilters ? ' encontrada' + (filtered.length !== 1 ? 's' : '') : ' no total'}
        </p>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
          <Search size={40} className="text-gray-600" />
          <p className="text-base font-medium text-gray-400">Nenhum resultado para os filtros aplicados</p>
          <button onClick={clearFilters} className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => {
            const displayStatus = getDisplayStatus(inv);
            return (
            <div
              key={inv.id}
              className="glass rounded-xl border border-white/5 p-5 hover:border-purple-500/20 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {inv.risk_level && (
                      <span className={clsx(
                        'text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider',
                        RISK_COLORS[inv.risk_level] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/25'
                      )}>
                        {RISK_LABELS[inv.risk_level] ?? inv.risk_level}
                      </span>
                    )}
                    <span className={clsx(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                      STATUS_COLORS[displayStatus] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/25'
                    )}>
                      {STATUS_LABELS[displayStatus] ?? displayStatus}
                    </span>
                    {inv.crisis_potential && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20 uppercase tracking-wider">
                        Crise: {inv.crisis_potential}
                      </span>
                    )}
                  </div>

                  <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2 group-hover:text-purple-300 transition-colors">
                    {inv.original_title ?? '(sem título)'}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                    {inv.candidate_name && (
                      <span className="flex items-center gap-1">
                        <ShieldAlert size={11} className="text-gray-500" />
                        {inv.candidate_name}
                      </span>
                    )}
                    {inv.source && (
                      <span className="flex items-center gap-1">
                        <ExternalLink size={11} className="text-gray-500" />
                        {inv.source}
                      </span>
                    )}
                    {inv.city && (
                      <span className="text-gray-500">{inv.city}</span>
                    )}
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock size={11} />
                      {formatDate(inv.created_at)}
                    </span>
                  </div>

                  {inv.executive_summary && (
                    <p className="text-gray-500 text-xs mt-2 line-clamp-2 leading-relaxed">
                      {inv.executive_summary}
                    </p>
                  )}
                </div>

                <Link
                  href={`/dashboard/investigacoes/${inv.id}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 text-purple-400 hover:text-purple-300 text-xs font-semibold transition-all"
                >
                  Abrir dossiê
                  <ChevronRight size={13} />
                </Link>
              </div>

              {inv.status === 'running' && (
                <div className="mt-3 flex items-center gap-2 text-xs text-blue-400 bg-blue-500/5 border border-blue-500/15 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} className="animate-pulse" />
                  Dossiê em processamento — os dados serão atualizados automaticamente.
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
