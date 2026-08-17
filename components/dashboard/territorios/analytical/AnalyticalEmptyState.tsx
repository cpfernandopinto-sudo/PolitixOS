'use client';

import React from 'react';
import { Info, Clock, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

export type EmptyStateReason =
  | 'nao_coletado'
  | 'fonte_indisponivel'
  | 'em_processamento'
  | 'dados_parciais'
  | 'nao_aplicavel'
  | 'erro';

export interface AnalyticalEmptyStateProps {
  reason: EmptyStateReason;
  title?: string;
  description?: string;
  engineName?: string;
}

function getReasonMeta(reason: EmptyStateReason) {
  switch (reason) {
    case 'nao_coletado':
      return {
        title: 'Dados Ainda Não Coletados',
        description: 'Os indicadores deste módulo serão coletados e consolidados na primeira análise do município.',
        Icon: Info,
        iconClass: 'text-cyan-400',
        bgClass: 'bg-cyan-500/5',
        borderClass: 'border-cyan-500/20',
      };
    case 'em_processamento':
      return {
        title: 'Motor em Processamento',
        description: 'A inteligência territorial está coletando e estruturando as informações deste caderno.',
        Icon: Loader2,
        iconClass: 'text-cyan-400 animate-spin',
        bgClass: 'bg-cyan-500/5',
        borderClass: 'border-cyan-500/20',
      };
    case 'dados_parciais':
      return {
        title: 'Consolidação Parcial',
        description: 'Algumas fontes deste módulo estão prontas; outras aguardam a próxima rodada de atualização.',
        Icon: Clock,
        iconClass: 'text-amber-400',
        bgClass: 'bg-amber-500/5',
        borderClass: 'border-amber-500/20',
      };
    case 'fonte_indisponivel':
      return {
        title: 'Fonte Oficial Indisponível',
        description: 'A base oficial deste motor está temporariamente em manutenção ou com atualização pendente.',
        Icon: AlertTriangle,
        iconClass: 'text-amber-400',
        bgClass: 'bg-amber-500/5',
        borderClass: 'border-amber-500/20',
      };
    case 'nao_aplicavel':
      return {
        title: 'Indicador Não Aplicável',
        description: 'Este indicador não se aplica às características administrativas deste município.',
        Icon: HelpCircle,
        iconClass: 'text-slate-400',
        bgClass: 'bg-white/[0.02]',
        borderClass: 'border-white/5',
      };
    case 'erro':
    default:
      return {
        title: 'Informações Indisponíveis',
        description: 'Não foi possível recuperar os dados deste módulo no momento. Tente atualizar a análise.',
        Icon: AlertTriangle,
        iconClass: 'text-red-400',
        bgClass: 'bg-red-500/5',
        borderClass: 'border-red-500/20',
      };
  }
}

export default function AnalyticalEmptyState({
  reason,
  title,
  description,
  engineName,
}: AnalyticalEmptyStateProps) {
  const meta = getReasonMeta(reason);
  const IconComp = meta.Icon;

  return (
    <div className={`p-6 rounded-2xl border ${meta.bgClass} ${meta.borderClass} text-center space-y-3`}>
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
        <IconComp size={20} className={meta.iconClass} />
      </div>

      <div className="space-y-1 max-w-sm mx-auto">
        <h4 className="text-sm font-bold text-white tracking-tight">
          {title ?? meta.title}
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          {description ?? meta.description}
        </p>
      </div>

      {engineName && (
        <span className="inline-block text-[10px] font-mono text-slate-400 bg-white/5 px-2.5 py-0.5 rounded border border-white/10">
          {engineName}
        </span>
      )}
    </div>
  );
}
