'use client';

import React from 'react';
import { Database, Clock, Sparkles, Loader2, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DATA_STATUS_MAP, type DossierDataStatus } from '@/lib/territorios/dossier-helpers';

interface Props {
  title: string;
  description: string;
  engineName: string;
  status: DossierDataStatus;
  sourceName?: string;
  lastUpdated?: string;
  children?: React.ReactNode;
}

export default function DossierNotebookContainer({
  title,
  description,
  engineName,
  status,
  sourceName,
  lastUpdated,
  children,
}: Props) {
  const statusMeta = DATA_STATUS_MAP[status] ?? DATA_STATUS_MAP.SEM_DADOS;
  const isReady = (status === 'CONCLUIDO' || status === 'PARCIAL') && children;
  const isLoading = status === 'LOADING' || status === 'COLETANDO' || status === 'PROCESSANDO' || status === 'ANALISANDO';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Notebook Header Banner */}
      <div className="bg-[#0B0F19] border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {engineName}
              </span>
              {sourceName && (
                <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                  <Database size={10} className="text-gray-500" /> Fonte: {sourceName}
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {title}
            </h2>
            <p className="text-xs md:text-sm text-gray-300 mt-1 max-w-3xl leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg border ${statusMeta.badgeBg} ${statusMeta.badgeText} ${statusMeta.badgeBorder}`}
            >
              {isLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : status === 'CONCLUIDO' ? (
                <ShieldCheck size={13} />
              ) : status === 'ERRO' ? (
                <AlertTriangle size={13} />
              ) : (
                <Clock size={13} />
              )}
              <span>{statusMeta.label}</span>
            </span>

            {lastUpdated && (
              <span className="text-[11px] text-gray-500 font-mono">
                Ref: {lastUpdated}
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 italic">
          {statusMeta.description}
        </p>
      </div>

      {/* Main Notebook Content or Neutral State Card */}
      {isReady ? (
        <div className="space-y-6">{children}</div>
      ) : (
        <div className="bg-[#12192A] border border-white/10 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            {isLoading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : status === 'ERRO' ? (
              <AlertTriangle size={24} className="text-red-400" />
            ) : (
              <Info size={24} />
            )}
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-white tracking-tight">
              {status === 'COLETA_NECESSARIA' || status === 'SEM_DADOS'
                ? 'Caderno em Preparação'
                : status === 'ERRO'
                ? 'Informação Indisponível'
                : 'Processando Dados do Território'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {statusMeta.description}
            </p>
          </div>

          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono bg-cyan-500/5 px-3 py-1.5 rounded-lg border border-cyan-500/10">
              <Sparkles size={12} />
              <span>Orquestração territorial PolitixOS — {engineName}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
