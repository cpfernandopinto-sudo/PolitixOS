'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, RefreshCw, Clock, Layers, ArrowLeftRight } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export interface ExecutiveTerritoryHeaderProps {
  cityName: string;
  uf: string;
  regionName?: string;
  statusLabel?: string;
  statusType?: 'CONCLUIDO' | 'PARCIAL' | 'PROCESSANDO' | 'COLETA_NECESSARIA' | 'STALE' | 'ERRO';
  lastUpdated?: string;
  coverageText?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function ExecutiveTerritoryHeader({
  cityName,
  uf,
  regionName,
  statusLabel = 'Dossiê Consolidado',
  statusType = 'CONCLUIDO',
  lastUpdated,
  coverageText = '5 de 5 Domínios',
  onRefresh,
  isRefreshing = false,
}: ExecutiveTerritoryHeaderProps) {
  let badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (statusType === 'PARCIAL') badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (statusType === 'PROCESSANDO' || statusType === 'COLETA_NECESSARIA') badgeBg = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  if (statusType === 'STALE') badgeBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (statusType === 'ERRO') badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/20';

  return (
    <div className="bg-[#0f172a] border border-cyan-500/20 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Territory Identity */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-cyan-500/10 text-cyan-400 px-2.5 py-0.5 rounded border border-cyan-500/20">
              Command Center Territorial
            </span>
            {regionName && (
              <span className="text-xs text-slate-400 font-mono">
                · {regionName}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{cityName}</span>
            <span className="text-cyan-400 font-mono font-light">/ {uf}</span>
          </h1>
        </div>

        {/* Action Controls & Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={`px-3 py-1 rounded-lg border font-bold ${badgeBg}`}>
              {statusLabel}
            </span>

            <span className="text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-lg flex items-center gap-1">
              <Layers size={13} className="text-cyan-400" />
              {coverageText}
            </span>
          </div>

          {/* Action to switch city */}
          <Link
            href="/dashboard/territorios"
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeftRight size={13} />
            <span>Trocar Cidade</span>
          </Link>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/20 transition-colors disabled:opacity-50"
              title="Atualizar análise territorial"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {lastUpdated && (
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <Clock size={11} className="text-slate-500" />
            <span>Última Consolidação: {formatDate(lastUpdated, true)}</span>
          </span>
          <span className="text-slate-500">Politix Territórios · Leitura Executiva em 30 Segundos</span>
        </div>
      )}
    </div>
  );
}
