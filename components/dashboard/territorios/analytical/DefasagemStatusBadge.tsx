'use client';

import React from 'react';
import { Clock, ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';

export type DefasagemType =
  | 'atual'
  | 'defasado_oficial'
  | 'serie_historica'
  | 'parcial'
  | 'indisponivel';

interface Props {
  type: DefasagemType;
  referenceYear?: string | number;
  collectionYear?: string | number;
  customLabel?: string;
}

export default function DefasagemStatusBadge({
  type,
  referenceYear,
  collectionYear,
  customLabel,
}: Props) {
  let label = customLabel;
  let bgClass = 'bg-slate-500/10';
  let textClass = 'text-slate-400';
  let borderClass = 'border-slate-500/20';
  let Icon = HelpCircle;

  switch (type) {
    case 'atual':
      label = label ?? (referenceYear ? `Dado Recente (${referenceYear})` : 'Dado Atualizado');
      bgClass = 'bg-emerald-500/10';
      textClass = 'text-emerald-400';
      borderClass = 'border-emerald-500/20';
      Icon = ShieldCheck;
      break;
    case 'defasado_oficial':
      label = label ?? (referenceYear && collectionYear ? `Ref. Oficial ${referenceYear} (Coleta ${collectionYear})` : 'Defasagem Estatística Oficial');
      bgClass = 'bg-cyan-500/10';
      textClass = 'text-cyan-400';
      borderClass = 'border-cyan-500/20';
      Icon = Clock;
      break;
    case 'serie_historica':
      label = label ?? (referenceYear ? `Série Histórica (${referenceYear})` : 'Série Histórica');
      bgClass = 'bg-blue-500/10';
      textClass = 'text-blue-400';
      borderClass = 'border-blue-500/20';
      Icon = Clock;
      break;
    case 'parcial':
      label = label ?? 'Consolidação Parcial';
      bgClass = 'bg-amber-500/10';
      textClass = 'text-amber-400';
      borderClass = 'border-amber-500/20';
      Icon = AlertCircle;
      break;
    case 'indisponivel':
    default:
      label = label ?? 'Dado Indisponível';
      bgClass = 'bg-slate-500/10';
      textClass = 'text-slate-400';
      borderClass = 'border-white/5';
      Icon = HelpCircle;
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${bgClass} ${textClass} ${borderClass}`}
      title={label}
    >
      <Icon size={11} />
      <span>{label}</span>
    </span>
  );
}
